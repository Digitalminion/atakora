# ADR-004: @atakora/lib as Internal-Only Package with CDK Re-exports

**Status**: Proposed
**Date**: 2025-10-10
**Author**: Becky (Staff Architect)
**Deciders**: Architecture Team
**Context**: Framework API Surface and Package Boundaries

---

## Context

The Atakora framework currently consists of three packages with unclear boundaries regarding user-facing APIs:

- **`@atakora/lib`**: Contains framework core (Construct, Resource, Stack classes), validation, synthesis, and naming utilities
- **`@atakora/cdk`**: Contains Azure resource constructs organized by Microsoft.* namespaces
- **`@atakora/cli`**: Contains CLI tooling for deployment and management

Currently, the CDK package imports directly from `@atakora/lib`:
```typescript
import { Construct, Resource } from '@atakora/lib';
import type { ArmResource } from '@atakora/lib';
```

This creates several architectural issues:

### 1. Unclear API Boundaries

Users are confused about what to import from where:
- Should they import `Construct` from `@atakora/lib` or should it be available from CDK?
- Is `@atakora/lib` a public API or internal framework code?
- What happens when lib's internal APIs change?

### 2. Coupling to Internal Implementation

When users import directly from `@atakora/lib`, they:
- Depend on internal implementation details
- May use unstable APIs not intended for public consumption
- Create tight coupling to framework internals

### 3. Inconsistent Developer Experience

Compare to established patterns:
- **AWS CDK v2**: Users import everything from `aws-cdk-lib`, never from internal packages
- **Angular**: Users import from `@angular/core`, `@angular/common`, not from internal packages
- **.NET**: Users reference public assemblies, internal assemblies are marked as internal

### 4. Version Management Complexity

With direct lib imports, users must:
- Manage version compatibility between lib and CDK
- Understand which lib APIs are stable vs internal
- Deal with breaking changes in "internal" APIs they shouldn't be using

## Decision

We will establish `@atakora/lib` as an **internal-only shared package** and have `@atakora/cdk` serve as the **single public API surface** for infrastructure code.

### Package Boundaries

```
┌─────────────────────────────────────────────────────────┐
│                     USER CODE                           │
│                                                         │
│  import { App, Stack } from '@atakora/cdk';           │
│  import { VirtualNetworks } from '@atakora/cdk/network';│
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   @atakora/cdk                          │
│                  (PUBLIC API)                           │
│                                                         │
│  • Re-exports framework classes from lib               │
│  • Contains all Azure resource constructs              │
│  • Single installation: npm install @atakora/cdk       │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   @atakora/lib                          │
│               (INTERNAL ONLY)                           │
│                                                         │
│  • Framework core (Construct, Resource, Stack)         │
│  • Validation framework                                │
│  • Synthesis engine                                    │
│  • Naming conventions                                  │
│  • Shared by both CDK and CLI packages                │
└─────────────────────────────────────────────────────────┘
```

### Re-Export Strategy

#### 1. Root CDK Exports (`@atakora/cdk`)

The root `@atakora/cdk` module will re-export all framework classes that users need:

**`packages/cdk/index.ts`**:
```typescript
/**
 * Atakora CDK - Azure Infrastructure as Code
 *
 * This is the main entry point for the Atakora CDK.
 * Import framework classes and utilities from here.
 * Import Azure resources from their respective namespaces.
 *
 * @packageDocumentation
 */

// Re-export framework classes from @atakora/lib
export {
  // Core constructs
  Construct,
  Node,
  App,

  // Stack types
  SubscriptionStack,
  ResourceGroupStack,

  // Base resource class
  Resource,

  // Naming components
  Organization,
  Project,
  Environment,
  Instance,
  Geography,
  Subscription,
  DeploymentScope,

  // Identity
  ManagedIdentityType,
  createSystemAssignedIdentity,
  createUserAssignedIdentity,
  createSystemAndUserAssignedIdentity,

  // Validation
  ValidationResult,
  ValidationError,
  ValidationSeverity,

  // Utilities
  constructIdToPurpose,
  generateResourceName,
} from '@atakora/lib';

// Re-export types
export type {
  // Core types
  IConstruct,
  AppProps,
  SubscriptionStackProps,
  ResourceGroupStackProps,
  ResourceProps,
  ArmResource,

  // Identity types
  ManagedServiceIdentity,
  UserAssignedIdentityValue,
  IIdentityResource,
  IdentityResourceProps,

  // Context types
  UserProfile,
  ProjectConfig,

  // Validation types
  ValidationContext,
  ResourceValidator,
} from '@atakora/lib';

// Type-only exports for synthesis (advanced users)
export type {
  CloudAssembly,
  StackManifest,
  ArmTemplate,
} from '@atakora/lib';
```

#### 2. Package.json Configuration

**`packages/cdk/package.json`**:
```json
{
  "name": "@atakora/cdk",
  "version": "1.0.0",
  "description": "Azure CDK - Infrastructure as Code for Azure Resource Manager",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.js"
    },
    "./network": {
      "types": "./dist/network/index.d.ts",
      "import": "./dist/network/index.js",
      "require": "./dist/network/index.js"
    },
    "./storage": {
      "types": "./dist/storage/index.d.ts",
      "import": "./dist/storage/index.js",
      "require": "./dist/storage/index.js"
    }
    // ... other namespaces
  },
  "dependencies": {
    "@atakora/lib": "^1.0.0"
  }
}
```

**`packages/lib/package.json`** (mark as internal):
```json
{
  "name": "@atakora/lib",
  "version": "1.0.0",
  "description": "Internal framework for Atakora CDK - NOT FOR DIRECT USE",
  "private": false,  // Still publishable, but documented as internal
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "keywords": ["internal", "framework", "atakora-internal"]
}
```

### User Import Patterns

#### Before (Current - Problematic)
```typescript
// Users importing from multiple packages
import { App, SubscriptionStack } from '@atakora/lib';
import { VirtualNetworks } from '@atakora/cdk/network';
import { constructIdToPurpose } from '@atakora/lib';

// Problem: Users depend on internal lib APIs
```

#### After (New - Clean)
```typescript
// All framework imports from root CDK
import { App, SubscriptionStack, constructIdToPurpose } from '@atakora/cdk';

// Resource imports from namespace subpaths
import { VirtualNetworks, NetworkSecurityGroups } from '@atakora/cdk/network';
import { StorageAccounts } from '@atakora/cdk/storage';

// Clear, consistent, single package to install
```

### Implementation Plan

#### Phase 1: Add Re-exports to CDK (Week 1)

1. Create `packages/cdk/index.ts` with framework re-exports
2. Update `packages/cdk/package.json` with root export
3. Test that imports work from both patterns temporarily
4. Update CDK's internal imports to use relative paths where possible

#### Phase 2: Update Documentation (Week 1)

1. Update all examples to import from `@atakora/cdk`
2. Add clear documentation about import patterns
3. Create migration guide for existing users
4. Add warnings to `@atakora/lib` README

#### Phase 3: Migrate CDK Internal Imports (Week 2)

1. Update all CDK resource files to import from CDK root where needed
2. Use relative imports for internal CDK utilities
3. Only import from `@atakora/lib` for truly shared functionality

#### Phase 4: Add Deprecation Notices (Week 3)

1. Add JSDoc `@deprecated` tags to lib exports
2. Add console warnings for direct lib imports (development mode)
3. Update lib package.json description to indicate internal use

#### Phase 5: Enforcement (Future - v2.0)

1. Consider making `@atakora/lib` truly private
2. Or use export maps to hide internal APIs
3. Breaking change for v2.0

### Success Criteria

1. **Single Package Installation**
   - Users only need `npm install @atakora/cdk`
   - No direct `@atakora/lib` installation required

2. **Clear Import Paths**
   - Framework classes: `import { App, Stack } from '@atakora/cdk'`
   - Resources: `import { VirtualNetworks } from '@atakora/cdk/network'`
   - No imports from `@atakora/lib` in user code

3. **IDE Autocomplete**
   - IntelliSense suggests `@atakora/cdk` imports
   - Clear descriptions indicate this is the public API

4. **Documentation Consistency**
   - All examples use CDK imports
   - Clear guidance on import patterns
   - Migration guide available

5. **Version Simplification**
   - Users manage one version: `@atakora/cdk`
   - Internal lib version managed by CDK

## Alternatives Considered

### Alternative 1: Keep Current Pattern (Direct lib imports)

**Structure**: Users import from both `@atakora/lib` and `@atakora/cdk`

**Pros**:
- No migration needed
- Users have direct access to all APIs

**Cons**:
- Unclear boundaries between public and internal APIs
- Users couple to internal implementation details
- Version management complexity
- Inconsistent with industry patterns

**Verdict**: ❌ Rejected - Creates long-term maintenance burden and poor DX

### Alternative 2: Monorepo with Everything in CDK

**Structure**: Merge lib into CDK, single package for everything

**Pros**:
- Truly single package
- No internal/external distinction needed

**Cons**:
- CLI would need to depend on CDK (includes all resources)
- Loses separation between framework and resources
- Harder to maintain framework/resource boundary
- Large package size for CLI users

**Verdict**: ❌ Rejected - Violates separation of concerns

### Alternative 3: Namespace-Specific Core Exports

**Structure**: Each namespace re-exports its own core needs
```typescript
import { Construct, Resource } from '@atakora/cdk/network';
```

**Pros**:
- Each namespace is self-contained

**Cons**:
- Massive duplication of exports
- Confusing where to import framework classes from
- Inconsistent import patterns

**Verdict**: ❌ Rejected - Poor developer experience

## Consequences

### Positive

1. **Clear API Surface**
   - Single public package: `@atakora/cdk`
   - Obvious what's public vs internal
   - Consistent with AWS CDK v2 pattern

2. **Better Encapsulation**
   - Internal lib changes don't break user code
   - Freedom to refactor lib internals
   - Clear versioning boundary

3. **Improved Developer Experience**
   - Single package to install
   - Clear, consistent import patterns
   - Better IDE autocomplete

4. **Simplified Version Management**
   - Users manage one version
   - CDK controls lib version compatibility
   - No version conflicts

5. **Future Flexibility**
   - Can make lib truly private later
   - Can reorganize internals without breaking users
   - Clear migration path

### Negative

1. **Migration Required**
   - Existing users must update imports
   - Documentation must be updated
   - Examples need revision

2. **Increased CDK Size**
   - CDK bundle includes re-exported symbols
   - Slightly larger package size
   - Mitigated by tree-shaking

3. **Duplicate Type Exports**
   - Some types exported from both lib and CDK
   - Potential for confusion during migration
   - Resolved with clear documentation

### Neutral

1. **Build Complexity**
   - CDK build depends on lib build
   - Need to ensure proper build order
   - Standard monorepo concern

2. **Testing Requirements**
   - Need to test re-exports work correctly
   - Integration tests for import patterns
   - One-time setup cost

## Implementation Checklist

- [ ] Create `packages/cdk/index.ts` with framework re-exports
- [ ] Update `packages/cdk/package.json` with root export configuration
- [ ] Add TypeScript path mapping for better internal imports
- [ ] Update all CDK resource files to use new import pattern
- [ ] Create migration guide document
- [ ] Update getting-started documentation
- [ ] Update all code examples in documentation
- [ ] Add deprecation notices to `@atakora/lib` README
- [ ] Add JSDoc `@deprecated` tags to lib public exports (Phase 2)
- [ ] Update lib package.json description to indicate internal use
- [ ] Create ESLint rule to prevent lib imports in user code
- [ ] Add integration tests for import patterns
- [ ] Verify tree-shaking with bundle analyzer
- [ ] Update CLI to handle new patterns if needed
- [ ] Publish updated packages with clear release notes

## Migration Guide for Users

### Step 1: Update Package Installation

**Before**:
```bash
npm install @atakora/lib @atakora/cdk
```

**After**:
```bash
npm install @atakora/cdk
```

### Step 2: Update Imports

**Framework Imports**:
```typescript
// Before
import { App, SubscriptionStack } from '@atakora/lib';

// After
import { App, SubscriptionStack } from '@atakora/cdk';
```

**Utility Imports**:
```typescript
// Before
import { constructIdToPurpose } from '@atakora/lib';

// After
import { constructIdToPurpose } from '@atakora/cdk';
```

**Type Imports**:
```typescript
// Before
import type { ArmResource, ValidationResult } from '@atakora/lib';

// After
import type { ArmResource, ValidationResult } from '@atakora/cdk';
```

### Step 3: Automated Migration

We will provide a codemod for automatic migration:
```bash
npx @atakora/cdk-migrate update-imports
```

This will:
- Update all imports from `@atakora/lib` to `@atakora/cdk`
- Preserve type-only imports
- Update package.json dependencies

## Related Decisions

- **ADR-003**: CDK Package Architecture - Defines namespace organization
- **ADR-001**: Validation Architecture - Validation framework remains in lib
- **ADR-002**: Manifest Schema - CLI uses lib internally, not affected

## References

- [AWS CDK v2 Architecture](https://docs.aws.amazon.com/cdk/v2/guide/home.html)
- [Angular Package Format](https://angular.io/guide/angular-package-format)
- [Node.js Package Exports](https://nodejs.org/api/packages.html#package-entry-points)
- [TypeScript Module Resolution](https://www.typescriptlang.org/docs/handbook/module-resolution.html)

---

## Approval

**Status**: Awaiting Review
**Review Date**: Pending
**Reviewers**: Architecture Team

### Architectural Principles Validation

- ✅ **Type Safety**: Maintains full type safety through re-exports
- ✅ **Progressive Enhancement**: Start simple (re-exports), add complexity later (enforcement)
- ✅ **Gov vs Commercial**: No impact on cloud targeting
- ✅ **Clear ARM Output**: No change to synthesis or ARM generation
- ✅ **Document Why**: Clear rationale for encapsulation and API boundaries

---

**Next Steps**:
1. Review and approve this ADR
2. Implement Phase 1 (re-exports)
3. Update documentation
4. Communicate changes to users
5. Monitor adoption and feedback