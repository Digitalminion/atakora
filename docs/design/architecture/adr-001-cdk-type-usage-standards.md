# ADR-001: CDK Type Usage Standards

## Context

Our CDK implementation has evolved organically with inconsistent patterns for type definitions. The architectural analysis revealed that approximately 22.5% of CDK resource type files are not utilizing the centralized schema types from `@atakora/lib`, leading to:

- **Type duplication**: Same enums defined in multiple places
- **Maintenance burden**: Updates needed in multiple locations
- **Type safety gaps**: String literals instead of enum constants
- **Inconsistent patterns**: Different approaches across resources
- **Developer confusion**: Unclear when to use schema vs local types

The schema package (`packages/lib/src/schema/microsoft/`) contains curated type definitions generated from ARM specifications, providing a single source of truth for Azure resource types. However, adoption has been inconsistent.

## Decision

We will enforce a standardized approach to type usage in CDK constructs:

### 1. **Enum Types MUST Use Schema Imports**

All enum types (SKUs, tiers, kinds, etc.) must be imported from `@atakora/lib` schema when available:

```typescript
// ✅ CORRECT
import { schema } from '@atakora/lib';

export const StorageAccountSkuName = schema.storage.StorageAccountSkuName;
export type StorageAccountSkuName = typeof StorageAccountSkuName[keyof typeof StorageAccountSkuName];
```

```typescript
// ❌ INCORRECT
export enum StorageAccountSkuName {
  STANDARD_LRS = 'Standard_LRS',
  STANDARD_GRS = 'Standard_GRS'
}
```

### 2. **Interfaces Can Be Defined Locally**

Interfaces representing property bags or configurations can be defined in the type files, but MUST reference schema enums:

```typescript
// ✅ CORRECT
export interface StorageAccountSku {
  readonly name: StorageAccountSkuName; // References schema enum
}
```

### 3. **Type File Structure**

Each CDK resource should have a corresponding `-types.ts` file following this structure:

```typescript
/**
 * Type definitions for [Resource] constructs.
 *
 * @packageDocumentation
 */

import { schema } from '@atakora/lib';

// 1. Import and re-export enum types from schema
export const EnumName = schema.namespace.EnumName;
export type EnumName = typeof EnumName[keyof typeof EnumName];

// 2. Define local interfaces using schema types
export interface ArmResourceProps {
  // L1 properties (direct ARM mapping)
}

export interface ResourceProps {
  // L2 properties (developer-friendly)
}

export interface IResource {
  // Resource interface for references
}
```

### 4. **Schema Coverage Requirements**

Before creating any local type definitions:

1. **Check schema availability**: Verify if types exist in `packages/lib/src/schema/microsoft/`
2. **Request schema generation**: If types don't exist, create a ticket for Felix to generate them
3. **Document gaps**: Note in comments if using local types due to missing schema

### 5. **Migration Strategy**

For existing non-compliant code:

1. **Prioritize high-use resources**: Network, Storage, Compute resources first
2. **Maintain backward compatibility**: Use type aliases during migration
3. **Update incrementally**: One resource type per PR to ease review
4. **Add tests**: Verify type compatibility after migration

## Alternatives Considered

### Alternative 1: Keep Status Quo
- **Pros**: No migration effort required
- **Cons**: Continued type duplication, maintenance burden, inconsistency
- **Rejected because**: Technical debt will compound over time

### Alternative 2: Generate All Types Locally
- **Pros**: Full control over type definitions
- **Cons**: Massive duplication, no single source of truth
- **Rejected because**: Violates DRY principle, increases maintenance

### Alternative 3: Use Raw ARM Types Directly
- **Pros**: Direct mapping to ARM
- **Cons**: Poor developer experience, verbose, not TypeScript-idiomatic
- **Rejected because**: CDK aims to provide better DevEx than raw ARM

## Consequences

### Positive Consequences

1. **Type Safety**: Compile-time verification of valid enum values
2. **Single Source of Truth**: One location for each type definition
3. **Better IDE Support**: Auto-completion and inline documentation
4. **Easier Updates**: ARM spec changes only need schema regeneration
5. **Consistency**: Predictable patterns across all resources
6. **Reduced Bundle Size**: Shared enum definitions instead of duplicates

### Negative Consequences

1. **Migration Effort**: ~11 type files need updating
2. **Schema Dependencies**: CDK depends on schema package being up-to-date
3. **Learning Curve**: Developers need to understand the pattern
4. **Potential Blocking**: Missing schema types can block CDK development

### Mitigation Strategies

- **Automated checks**: Add linting rules to enforce schema imports
- **Documentation**: Clear examples in developer guide
- **Schema CI/CD**: Automate schema generation from ARM specs
- **Escape hatch**: Allow temporary local types with TODO comments

## Success Criteria

Success will be measured by:

1. **100% enum compliance**: All enum types imported from schema (where available)
2. **No duplicate definitions**: Same type not defined in multiple places
3. **Test coverage**: Type usage verified in unit tests
4. **Developer satisfaction**: Reduced confusion and faster development
5. **Build metrics**: No increase in build times or bundle size
6. **Zero type errors**: No runtime type mismatches

### Validation Approach

1. **Static analysis**: ESLint rule to detect local enum definitions
2. **Build-time checks**: TypeScript strict mode enforcement
3. **Code review checklist**: Type usage verification
4. **Quarterly audit**: Review compliance across codebase

## Implementation Timeline

1. **Week 1**: Update high-priority resources (Network, Storage)
2. **Week 2**: Update remaining non-compliant resources
3. **Week 3**: Add linting rules and CI checks
4. **Week 4**: Documentation and team training

## References

- [Type Compliance Analysis Report](../analysis/cdk-type-compliance-analysis.md)
- [Azure ARM Schema Documentation](https://docs.microsoft.com/en-us/azure/templates/)
- [TypeScript Handbook - Enums](https://www.typescriptlang.org/docs/handbook/enums.html)

---

**Status**: Proposed
**Date**: 2025-10-13
**Author**: Becky (Staff Architect)
**Reviewers**: Devon (Developer), Felix (Schema Validator)