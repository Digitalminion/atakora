# ADR-001: DefineBackend Pattern for Resource Sharing and Component Composition

## Context

The @atakora/component package provides high-level infrastructure components like CrudApi, FunctionsApp, StaticSiteWithCdn, and DataStack. Currently, each component instance provisions its own underlying Azure resources (Cosmos DB, Function Apps, Storage Accounts, etc.), leading to:

1. **Resource Proliferation**: Multiple Cosmos DB accounts, Function Apps, and Storage Accounts for what should be a single application
2. **Cost Inefficiency**: Each resource has base costs regardless of usage
3. **Management Overhead**: More resources to monitor, secure, and maintain
4. **Violation of Best Practices**: Azure recommends consolidating resources where appropriate
5. **Complex Networking**: Each resource needs its own network configuration
6. **Inconsistent Configuration**: Different components might configure similar resources differently

We need a pattern that allows components to share underlying infrastructure while maintaining clear separation of concerns, type safety, and developer experience.

## Decision

Implement a `defineBackend()` function that acts as a resource orchestrator and dependency injection container for components. The pattern will:

1. **Use a Resource Requirements Protocol** where components declare their infrastructure needs through typed interfaces
2. **Implement a Two-Phase Initialization** where components are first analyzed for requirements, then initialized with shared resources
3. **Provide a Backend Construct** that manages the lifecycle of shared resources and component initialization
4. **Support Progressive Enhancement** allowing simple usage to start and complex scenarios to emerge naturally
5. **Maintain Type Safety** throughout with full TypeScript inference

### Architecture Overview

```typescript
// Phase 1: Component Declaration (Requirements Gathering)
const userApi = CrudApi.define('UserApi', {
  entityName: 'User',
  schema: { /* ... */ }
});

const productApi = CrudApi.define('ProductApi', {
  entityName: 'Product',
  schema: { /* ... */ }
});

// Phase 2: Backend Definition (Resource Orchestration)
const backend = defineBackend({
  userApi,
  productApi,
  // Additional configuration
  monitoring: true,
  networking: 'isolated'
});

// Phase 3: Stack Integration (CDK Synthesis)
backend.addToStack(stack);
```

## Alternatives Considered

### Alternative 1: Factory Pattern with Central Registry
```typescript
const factory = new ComponentFactory();
factory.register('cosmosDb', sharedCosmosDb);
const userApi = factory.createCrudApi('UserApi', props);
```

**Rejected because:**
- Requires pre-creating and registering all shared resources
- Loses type inference between components and resources
- Difficult to determine what resources are needed upfront
- Creates tight coupling between components and factory

### Alternative 2: Inheritance-Based Sharing
```typescript
class SharedResourceStack extends ResourceGroupStack {
  cosmosDb: DatabaseAccounts;
  functionApp: FunctionsApp;
}
const userApi = new CrudApi(sharedStack, 'UserApi', props);
```

**Rejected because:**
- Forces all components into the same stack
- Limits flexibility in resource organization
- Breaks single responsibility principle
- Makes testing and modularity difficult

### Alternative 3: Global Resource Pool
```typescript
ResourcePool.register('cosmos-primary', cosmosDb);
const userApi = new CrudApi(stack, 'UserApi', {
  cosmosDb: ResourcePool.get('cosmos-primary')
});
```

**Rejected because:**
- Creates global state and coupling
- Makes testing difficult
- Resource lifecycle management becomes unclear
- No compile-time guarantees about resource availability

## Consequences

### Positive Consequences

1. **Resource Efficiency**: Single Cosmos DB, Function App, and Storage Account serve multiple components
2. **Cost Optimization**: Reduced base costs and better resource utilization
3. **Simplified Management**: Fewer resources to monitor and secure
4. **Consistent Configuration**: Shared resources have unified configuration
5. **Type Safety**: Full TypeScript inference throughout the process
6. **Progressive Enhancement**: Simple cases remain simple, complex cases are possible
7. **Clear Separation**: Components declare needs, backend provides resources
8. **Testability**: Components can be tested independently with mock resources

### Negative Consequences

1. **Additional Abstraction**: One more concept for developers to learn
2. **Migration Effort**: Existing components need updates to support the pattern
3. **Complexity for Simple Cases**: Single component apps have slight overhead
4. **Resource Limits**: Need to handle Azure resource limits when sharing
5. **Configuration Conflicts**: Must resolve when components need different settings

### Trade-offs

1. **Flexibility vs Simplicity**: More flexible but requires understanding the two-phase pattern
2. **Resource Efficiency vs Independence**: Better resource usage but components are less independent
3. **Type Safety vs Runtime Discovery**: Compile-time safety requires more upfront type definitions
4. **Convention vs Configuration**: Relies on sensible defaults that might not fit all cases

## Success Criteria

The implementation will be considered successful when:

1. **Resource Reduction**: 80% reduction in number of Azure resources for multi-component apps
2. **Developer Experience**: New users can adopt pattern in under 10 minutes
3. **Type Safety**: No runtime errors due to missing resources
4. **Performance**: No measurable overhead in CDK synthesis time
5. **Adoption**: 90% of new projects using the pattern within 6 months
6. **Backward Compatibility**: Existing components work without modification
7. **Test Coverage**: 95% code coverage with integration tests
8. **Documentation**: Complete examples for all common scenarios

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- Resource requirement interfaces
- Backend construct base class
- Resource provider registry

### Phase 2: Component Integration (Week 2)
- Update CrudApi to support pattern
- Update FunctionsApp to support pattern
- Create shared resource providers

### Phase 3: Advanced Features (Week 3)
- Configuration merging strategies
- Resource limit handling
- Monitoring and diagnostics integration

### Phase 4: Migration and Documentation (Week 4)
- Migration guide for existing components
- Complete API documentation
- Example applications

## Related Decisions

- Will influence: Future component design patterns
- Depends on: CDK construct lifecycle management
- Related to: Azure resource naming conventions