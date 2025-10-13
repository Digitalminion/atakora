# Backend Pattern Implementation Guide

## Executive Summary

The `defineBackend()` pattern provides a sophisticated resource orchestration system for @atakora/component that enables efficient resource sharing while maintaining component independence and type safety. This guide provides implementation teams with a complete roadmap for building this system.

## Architecture Overview

### Core Concept

Instead of each component creating its own Azure resources, components declare their requirements and the backend orchestrator provisions shared resources intelligently.

**Traditional Approach:**
- 5 CrudApi components = 5 Cosmos DB accounts + 5 Function Apps + 5 Storage Accounts

**Backend Pattern:**
- 5 CrudApi components = 1 Cosmos DB account + 1 Function App + 1 Storage Account

### Three-Phase Process

1. **Definition Phase**: Components are defined with configuration but not instantiated
2. **Orchestration Phase**: Backend analyzes requirements and provisions shared resources
3. **Initialization Phase**: Components are initialized with injected shared resources

## Implementation Work Packages

### Package 1: Core Infrastructure (Week 1)

**Owner: Devon**

**Files to Create:**
- `packages/component/src/backend/index.ts` - Main exports
- `packages/component/src/backend/interfaces.ts` - Type definitions
- `packages/component/src/backend/backend.ts` - Backend class implementation
- `packages/component/src/backend/registry.ts` - Provider registry

**Key Tasks:**
1. Implement IResourceRequirement hierarchy
2. Create Backend base class with component management
3. Build provider registry system
4. Implement requirement analyzer

**Dependencies:** None (can start immediately)

### Package 2: Resource Providers (Week 1-2)

**Owner: Grace**

**Files to Create:**
- `packages/component/src/backend/providers/cosmos-provider.ts`
- `packages/component/src/backend/providers/functions-provider.ts`
- `packages/component/src/backend/providers/storage-provider.ts`
- `packages/component/src/backend/providers/base-provider.ts`

**Key Tasks:**
1. Create base provider abstract class
2. Implement Cosmos DB provider with database/container merging
3. Implement Function App provider with environment variable merging
4. Implement Storage Account provider with container organization
5. Create provider test suite

**Dependencies:** Package 1 interfaces

### Package 3: Configuration Merger (Week 1)

**Owner: Felix**

**Files to Create:**
- `packages/component/src/backend/merger/index.ts`
- `packages/component/src/backend/merger/strategies.ts`
- `packages/component/src/backend/merger/validators.ts`

**Key Tasks:**
1. Implement merge strategies (union, intersection, maximum, priority)
2. Create conflict resolution system
3. Build validation framework
4. Add type-safe merging utilities

**Dependencies:** Package 1 interfaces

### Package 4: Component Updates (Week 2)

**Owner: Devon**

**Files to Update:**
- `packages/component/src/crud/crud-api.ts`
- `packages/component/src/functions/functions-app.ts`
- `packages/component/src/web/static-site.ts`
- `packages/component/src/data/data-stack.ts`

**Key Tasks:**
1. Add static `define()` method to each component
2. Implement `getRequirements()` method
3. Update constructors to support resource injection
4. Maintain backward compatibility

**Example Update for CrudApi:**
```typescript
export class CrudApi extends Construct implements IBackendComponent<CrudApiProps> {
  // Existing constructor for backward compatibility
  constructor(scope: Construct, id: string, props: CrudApiProps) {
    super(scope, id);
    if (isBackendManaged(scope)) {
      // New path: expect resources to be injected
      this.initializeWithInjectedResources(scope);
    } else {
      // Old path: create own resources (current behavior)
      this.createOwnResources(props);
    }
  }

  // New static factory for backend pattern
  static define(id: string, config: CrudApiProps): IComponentDefinition<CrudApiProps> {
    return {
      componentId: id,
      componentType: 'CrudApi',
      config,
      factory: (scope, id, config, resources) => {
        const instance = new CrudApi(scope, id, config);
        instance.useSharedResources(resources);
        return instance;
      }
    };
  }

  getRequirements(): IResourceRequirement[] {
    // Return Cosmos DB and Function App requirements
  }
}
```

**Dependencies:** Packages 1, 2, 3 complete

### Package 5: DefineBackend Function (Week 2)

**Owner: Grace**

**Files to Create:**
- `packages/component/src/backend/define-backend.ts`
- `packages/component/src/backend/builder.ts`

**Key Tasks:**
1. Implement main `defineBackend()` function
2. Create builder pattern alternative
3. Add TypeScript type inference
4. Support both object and builder syntax

**Dependencies:** Packages 1-4 complete

### Package 6: Testing Suite (Week 2-3)

**Owner: Charlie**

**Files to Create:**
- `packages/component/test/backend/backend.test.ts`
- `packages/component/test/backend/providers.test.ts`
- `packages/component/test/backend/merger.test.ts`
- `packages/component/test/backend/integration.test.ts`

**Key Tasks:**
1. Unit tests for all backend classes
2. Provider integration tests
3. Configuration merging tests
4. End-to-end scenario tests
5. Performance benchmarks

**Dependencies:** Packages 1-5 complete

### Package 7: Documentation (Week 3)

**Owner: Ella**

**Files to Create:**
- `packages/component/docs/backend-pattern.md`
- `packages/component/docs/migration-guide.md`
- `packages/component/docs/examples/`
- API documentation updates

**Key Tasks:**
1. Write conceptual documentation
2. Create migration guide from old pattern
3. Document all examples
4. Update component documentation

**Dependencies:** Implementation complete

## Key Implementation Decisions

### 1. Resource Key Format

Use consistent key format: `{resourceType}:{requirementKey}`

Examples:
- `cosmos:shared-database`
- `functions:api-functions`
- `storage:static-content`

### 2. Requirement Priority

Higher priority wins conflicts:
- Default: 10
- Component-specific: 20
- User-override: 30

### 3. Resource Limits

Respect Azure limits:
- Max 200 functions per Function App
- Max 25 databases per Cosmos account
- Max 250 storage containers per account

When limits exceeded, provision additional resources with suffix:
- `cosmos:shared-database-2`
- `functions:api-functions-2`

### 4. Environment Variable Namespacing

Prevent conflicts with prefixing:
```typescript
// Component: UserApi
USER_API_COSMOS_ENDPOINT
USER_API_DATABASE_NAME

// Component: ProductApi
PRODUCT_API_COSMOS_ENDPOINT
PRODUCT_API_DATABASE_NAME
```

### 5. Backward Compatibility

Use scope inspection to determine mode:
```typescript
function isBackendManaged(scope: Construct): boolean {
  return scope.node.tryGetContext('backend-managed') === true;
}
```

## Testing Strategy

### Unit Tests
- Each provider tested independently
- Merger strategies tested with various inputs
- Component requirement generation tested

### Integration Tests
```typescript
it('should share Cosmos DB across multiple CrudApis', () => {
  const backend = defineBackend({
    userApi: CrudApi.define('UserApi', config1),
    productApi: CrudApi.define('ProductApi', config2)
  });

  backend.initialize(scope);

  // Assert single Cosmos DB account created
  const cosmosAccounts = backend.resources.filter(r => r.type === 'cosmos');
  expect(cosmosAccounts).toHaveLength(1);
});
```

### Performance Tests
- Measure CDK synthesis time with/without backend pattern
- Target: < 5% overhead for typical applications

## Migration Path

### Phase 1: Opt-in (Months 1-3)
- Backend pattern available but optional
- Documentation and examples published
- Early adopters provide feedback

### Phase 2: Recommended (Months 4-6)
- Backend pattern becomes recommended approach
- Templates and scaffolding updated
- Deprecation warnings added to old pattern

### Phase 3: Default (Months 7-12)
- New projects default to backend pattern
- Migration tooling provided
- Old pattern still supported

### Phase 4: Deprecation (Month 13+)
- Old pattern officially deprecated
- Clear migration path documented
- Support timeline communicated

## Success Metrics

1. **Resource Reduction**: 80% fewer Azure resources for multi-component apps
2. **Cost Savings**: 60% reduction in base infrastructure costs
3. **Developer Adoption**: 90% of new projects using pattern within 6 months
4. **Performance**: No measurable CDK synthesis overhead (< 5%)
5. **Quality**: Zero breaking changes during migration
6. **Documentation**: 100% API coverage with examples

## Risk Mitigation

### Risk 1: Breaking Changes
**Mitigation**: Comprehensive backward compatibility layer

### Risk 2: Complex Debugging
**Mitigation**: Detailed logging and resource tracing

### Risk 3: Resource Limit Exceeded
**Mitigation**: Automatic resource splitting with clear naming

### Risk 4: Configuration Conflicts
**Mitigation**: Clear priority system and conflict resolution

### Risk 5: Performance Impact
**Mitigation**: Lazy loading and caching strategies

## Next Steps

1. **Week 1**: Start parallel work on Packages 1, 2, 3
2. **Week 2**: Begin Package 4 (component updates) and Package 5 (defineBackend)
3. **Week 2-3**: Testing and documentation
4. **Week 4**: Integration, polish, and release preparation

## Questions for Team Review

1. Should we support custom resource providers from day one?
2. What should be the default behavior for configuration conflicts?
3. Should we provide a migration tool or manual migration guide?
4. How should we handle cross-region deployments?
5. Should the backend pattern support runtime configuration changes?

## Conclusion

The `defineBackend()` pattern represents a significant evolution in how we handle infrastructure composition. By centralizing resource management while maintaining component independence, we achieve better resource utilization, cost efficiency, and developer experience. The phased implementation approach ensures we can deliver value incrementally while maintaining stability.