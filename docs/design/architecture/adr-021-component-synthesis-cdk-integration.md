# ADR-021: Component Synthesis CDK Integration

**Status**: Approved
**Date**: 2025-11-22
**Authors**: Becky (Staff Architect)
**Deciders**: Architecture Team
**Related ADRs**: ADR-020 (Component Auth System)

## Context

The component package's synthesis pipeline currently **manually constructs ARM JSON objects** instead of using the CDK construct system that exists in the `@atakora/cdk` package. This approach was likely implemented as a stopgap during early development when the CDK and lib packages were not yet mature.

### Current Implementation

The `ResourceMapper` class in `packages/component/src/synthesis/resource-mapper.ts` manually builds ARM JSON:

```typescript
resources.push({
  type: 'Microsoft.DocumentDB/databaseAccounts',
  apiVersion: '2023-04-15',
  name: accountName,
  location: context.region,
  tags: context.tags,
  kind: 'GlobalDocumentDB',
  properties: {
    databaseAccountOfferType: 'Standard',
    consistencyPolicy: {
      defaultConsistencyLevel: config.consistencyLevel || 'Session',
    },
    // ... 30+ lines of manual property construction
  }
});
```

This manual approach creates several problems:

1. **Logic Duplication** - Resource configuration logic exists in both ResourceMapper (component) and CDK constructs (cdk)
2. **Lost Type Safety** - Manual ARM JSON bypasses TypeScript's type system
3. **No Validation** - CDK construct validation is not utilized
4. **No RBAC Support** - Cannot use `.grantRead()` or `.grantWrite()` methods
5. **Fragile Dependencies** - Manual `dependsOn` arrays are error-prone
6. **Hardcoded API Versions** - API versions scattered throughout code
7. **Maintenance Burden** - Changes must be made in two places (component + cdk)

### What Exists in CDK Package

The `@atakora/cdk` package has complete L2 constructs for all resources the component package needs:

- **Cosmos DB**: `DatabaseAccounts`, `SqlDatabases`, `SqlContainers`
- **Storage**: `StorageAccounts`
- **Key Vault**: `Vaults`
- **Web/Functions**: `ServerFarms`, `Sites`
- **Monitoring**: `Components` (Application Insights)
- **Networking**: `VirtualNetworks`

These constructs provide:
- Type-safe configuration via TypeScript interfaces
- Automatic naming with uniqueness guarantees
- Built-in validation rules
- RBAC support via `.grantRead()` and `.grantWrite()`
- Automatic dependency tracking via construct tree
- Sensible defaults per resource type
- Centralized ARM API versions

### What Exists in Lib Package

The `@atakora/lib` package has a complete synthesis system:

- **App**: Root of construct tree
- **Stack**: Container for resources (ResourceGroupStack, SubscriptionStack)
- **Synthesizer**: Orchestrates four-phase synthesis pipeline:
  1. Prepare - Traverse construct tree, collect resources
  2. Transform - Convert constructs to ARM JSON, resolve dependencies
  3. Validate - Run validation pipeline (schema, naming, limits, ARM resources)
  4. Assembly - Write templates to disk, generate manifest
- **CloudAssembly**: Rich output format with templates, metadata, function packages

### The Problem

The component package is working **against the grain** of the established architecture:

1. Duplicates logic that exists in CDK constructs
2. Bypasses lib's synthesis system and validation
3. Returns raw ARM JSON instead of CloudAssembly
4. Cannot leverage construct tree benefits (RBAC, dependencies, validation)
5. Requires maintaining two implementations of the same resources

This creates technical debt and limits the component package's capabilities.

## Decision

**We will refactor the component synthesis pipeline to use CDK constructs and the lib synthesis system.**

Specifically:

1. **Replace ResourceMapper with BackendResourceMapper** that creates CDK constructs instead of manual ARM JSON
2. **Integrate with lib's App and Stack system** to create a proper construct tree
3. **Use lib's Synthesizer** to generate CloudAssembly output
4. **Leverage CDK constructs** for all resource creation (Cosmos DB, Storage, Function Apps, etc.)
5. **Maintain backward compatibility** for backend definition API

### New Architecture

```
Backend Definition (defineBackend)
       ↓
BackendSynthesizer.synthesize()
       ↓
Create App + ResourceGroupStack
       ↓
BackendResourceMapper.synthesizeBackendToStack()
  ↓ (creates CDK constructs)
Construct Tree
       ↓
App.synth() → lib's Synthesizer
  ↓ (4-phase synthesis pipeline)
CloudAssembly
       ↓
Return to user
```

### Key Changes

**Before**:
```typescript
const synthesizer = new BackendSynthesizer();
const result = await synthesizer.synthesize(backend);
// result: { template: ARMTemplate, context, analysis, resourceCount }
```

**After**:
```typescript
const synthesizer = new BackendSynthesizer();
const assembly = await synthesizer.synthesize(backend);
// assembly: CloudAssembly with stacks, manifest, metadata, functions
const template = assembly.stacks.get(backend.settings.name);
```

## Alternatives Considered

### Alternative 1: Keep Manual ARM JSON, Add Validation

**Approach**: Keep ResourceMapper but add validation similar to lib's

**Pros**:
- Minimal code changes
- No dependency on CDK constructs
- Full control over ARM JSON

**Cons**:
- Still duplicates logic between component and CDK
- Still no type safety
- Still no RBAC support
- Still no dependency tracking
- Validation logic duplicated from lib

**Rejected because**: Doesn't solve the root problem of duplication and missed benefits

### Alternative 2: Create Component-Specific Constructs

**Approach**: Create new constructs in component package instead of using CDK

**Pros**:
- Component package is self-contained
- Can tailor constructs to backend needs

**Cons**:
- Triples the duplication (component, CDK, and component-specific constructs)
- Fragments the construct ecosystem
- More code to maintain
- Doesn't leverage existing CDK investment

**Rejected because**: Creates even more duplication and fragmentation

### Alternative 3: Generate ARM JSON from CDK Constructs

**Approach**: Use CDK constructs internally but extract ARM JSON before synthesis

**Pros**:
- Gets type safety from constructs
- Can still return raw ARM JSON

**Cons**:
- Misses out on lib's validation pipeline
- Misses out on CloudAssembly benefits
- Awkward API (create constructs just to extract JSON)
- Still doesn't get RBAC grants or dependency tracking

**Rejected because**: Gets type safety but misses most other benefits

### Alternative 4: Parallel Implementation (Chosen)

**Approach**: Create BackendResourceMapper using CDK constructs, integrate with lib synthesis

**Pros**:
- Eliminates duplication - single source of truth in CDK constructs
- Gets all CDK construct benefits (type safety, validation, RBAC, dependencies)
- Gets all lib synthesis benefits (validation pipeline, CloudAssembly, metadata)
- Maintains backward compatibility for backend definition API
- Aligns with established architecture patterns
- Reduces maintenance burden

**Cons**:
- Return type changes from SynthesisResult to CloudAssembly (breaking change)
- Requires understanding construct tree and synthesis system
- Initial implementation effort

**Chosen because**: Provides maximum benefit for reasonable implementation cost

## Consequences

### Positive Consequences

1. **Single Source of Truth** - Resource configurations only in CDK constructs
2. **Type Safety** - All resource properties have TypeScript types
3. **Automatic Validation** - Lib's validation pipeline catches errors before deployment
4. **RBAC Support** - Can use `.grantRead()` and `.grantWrite()` for automatic permissions
5. **Dependency Tracking** - Construct tree automatically tracks dependencies
6. **Better Output** - CloudAssembly includes templates, metadata, function packages
7. **Maintainability** - Changes to Azure APIs only require updating CDK constructs
8. **Consistency** - Component package aligns with lib/CDK architecture patterns
9. **Extensibility** - Can leverage future CDK features (aspects, escape hatches, etc.)

### Negative Consequences

1. **Breaking Change** - Return type changes from `SynthesisResult` to `CloudAssembly`
   - **Mitigation**: Provide helper function to extract template for backward compatibility
   - **Mitigation**: Document migration path clearly

2. **Learning Curve** - Developers must understand construct tree and synthesis system
   - **Mitigation**: Document architecture thoroughly
   - **Mitigation**: Provide examples and migration guides

3. **Initial Implementation Effort** - Requires refactoring ResourceMapper
   - **Mitigation**: Phase implementation - create new, deprecate old, remove old
   - **Mitigation**: Comprehensive testing to ensure equivalence

4. **Dependency on CDK/Lib** - Component package more tightly coupled to CDK/lib
   - **Mitigation**: This is intentional - leverage shared architecture
   - **Note**: Component package already depends on lib for naming

### Migration Impact

**For Backend Users**:
- Backend definition API unchanged (no migration needed)
- Attachment point API unchanged (no migration needed)
- Synthesis API mostly unchanged (options same)
- Output format changes (migration guide provided)

**For Maintainers**:
- Must understand construct tree and synthesis system
- Changes to resources go through CDK constructs
- Validation is automatic via lib
- Testing ensures ARM output equivalence

**For Advanced Users**:
- Can customize constructs if needed
- Can use RBAC grants
- Can access construct tree
- Can use CDK aspects (future)

## Implementation Plan

### Phase 1: Create New Implementation

**Tasks**:
1. Create `BackendResourceMapper` class using CDK constructs
2. Update `BackendSynthesizer` to create App + Stack
3. Integrate with lib's Synthesizer
4. Add comprehensive tests
5. Verify ARM output matches current implementation

**Success Criteria**:
- All existing backend definitions synthesize successfully
- Generated ARM templates are equivalent to current
- Tests pass with >= 80% coverage

### Phase 2: Deprecate Old Implementation

**Tasks**:
1. Mark `ResourceMapper` as deprecated
2. Update documentation to reference new architecture
3. Create migration guide
4. Add warnings to deprecated code

**Success Criteria**:
- Documentation updated
- Migration guide available
- Deprecation warnings clear

### Phase 3: Remove Old Implementation

**Tasks**:
1. Remove `ResourceMapper` class
2. Remove duplicate ARM type definitions
3. Clean up unused imports
4. Remove deprecation warnings

**Success Criteria**:
- Old code removed
- No regressions
- Documentation updated

## Success Criteria

### Functional Criteria

1. All existing backend definitions synthesize successfully
2. Generated ARM templates are functionally equivalent to current implementation
3. Validation catches more errors than current implementation
4. RBAC grants create correct role assignments
5. Dependencies are resolved correctly

### Quality Criteria

1. Code coverage >= 80% for BackendResourceMapper
2. Zero regressions in existing tests
3. Documentation includes architecture diagrams and examples
4. Migration guide is clear and complete

### Performance Criteria

1. Synthesis time <= current implementation + 10%
2. Memory usage <= current implementation + 20%
3. Template size approximately equivalent

## Monitoring and Validation

### How We'll Know This Decision Was Correct

**Positive Indicators**:
1. Reduced bug reports related to ARM template generation
2. Faster development of new resource types
3. Increased test coverage
4. Easier to add features (e.g., RBAC, custom validation)
5. Code is easier to understand and maintain

**Negative Indicators** (would require revisiting):
1. Significant performance degradation
2. Frequent bugs in synthesis pipeline
3. Developers struggle to understand construct tree
4. Customers report breaking changes not documented

### Validation Checkpoints

**3 Months Post-Implementation**:
- Review bug reports related to synthesis
- Survey developers on ease of maintenance
- Measure synthesis performance
- Review test coverage

**6 Months Post-Implementation**:
- Evaluate time to implement new features
- Review customer feedback on CloudAssembly output
- Assess if RBAC grants are being used
- Determine if additional documentation needed

## Related Decisions

### Dependencies

- **ADR-020: Component Auth System** - Sets pattern for component package architecture
- **lib Synthesis Pipeline** - Provides synthesis infrastructure
- **CDK L2 Constructs** - Provides resource implementations

### Future Decisions

- **ADR-022: Component Multi-Stack Support** - May need to support splitting backends across stacks
- **ADR-023: Component CDK Aspects** - May want to support cross-cutting concerns via aspects
- **ADR-024: Component Custom Resources** - May need to support custom ARM resources

## References

### Documentation

- [Current State Analysis](./synthesis-current-state-analysis.md)
- [Architecture Design](./synthesis-cdk-integration-design.md)
- [Implementation Plan](./synthesis-cdk-integration-implementation-plan.md)

### Code References

**Component Package**:
- `packages/component/src/synthesis/backend-synthesizer.ts` - Main orchestrator
- `packages/component/src/synthesis/resource-mapper.ts` - Current implementation (to be replaced)
- `packages/component/src/synthesis/types.ts` - Synthesis types

**CDK Package**:
- `packages/cdk/src/documentdb/*` - Cosmos DB constructs
- `packages/cdk/src/storage/*` - Storage constructs
- `packages/cdk/src/web/*` - Web/Function App constructs
- `packages/cdk/src/keyvault/*` - Key Vault constructs

**Lib Package**:
- `packages/lib/src/core/app.ts` - App class
- `packages/lib/src/core/resource-group-stack.ts` - ResourceGroupStack class
- `packages/lib/src/synthesis/synthesizer.ts` - Synthesis orchestrator

### External References

- [Azure ARM Template Documentation](https://docs.microsoft.com/en-us/azure/azure-resource-manager/templates/)
- [Azure CDK Patterns](https://docs.aws.amazon.com/cdk/latest/guide/home.html) (inspiration)

## Notes

### Design Principles Applied

1. **Type Safety and Immutability** - TypeScript interfaces ensure compile-time type checking
2. **Progressive Enhancement** - Start with simple implementation, add features as needed
3. **Gov vs Commercial Cloud** - CDK constructs handle cloud differences
4. **Clear ARM JSON Output** - No magic, CloudAssembly shows exactly what will be deployed
5. **Document the Why** - This ADR explains rationale, not just what

### Open Questions

1. **Naming Context** - Should we create SubscriptionStack parent for full naming context?
   - **Decision**: Start with ResourceGroupStack, enhance later if needed

2. **Custom Resource Support** - How to handle resources not in CDK?
   - **Decision**: Future ADR, can use escape hatches if needed

3. **Multi-Stack Support** - Should backends support multiple stacks?
   - **Decision**: Future enhancement, single stack sufficient for now

## Approval

**Approved by**: Becky (Staff Architect)
**Date**: 2025-11-22
**Implementation Start**: TBD (assigned to Devon)
**Expected Completion**: TBD

## Changelog

- **2025-11-22**: Initial ADR created by Becky
