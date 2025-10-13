# ADR-001: Azure ARM Schema Type System Architecture

## Context

The Azure ARM template generator project requires a comprehensive type system to represent all Azure resource types and their properties. We've analyzed 26 Microsoft Azure namespace directories in `packages/lib/src/schema/microsoft/` and found that only 7 namespaces currently have type definitions implemented, totaling 159 interface definitions.

Current state:
- 26 total namespaces representing major Azure service categories
- 7 namespaces with implemented types (27% coverage)
- 159 total type interfaces defined
- 19 namespaces awaiting implementation

The type system needs to:
1. Provide complete type safety for ARM template generation
2. Support both Government and Commercial cloud environments
3. Enable progressive enhancement (simple to complex scenarios)
4. Maintain clear mapping to ARM JSON output
5. Support schema validation and IntelliSense

## Decision

We will implement a structured, phased approach to schema type implementation with the following architecture:

### 1. Type System Structure

Each namespace follows a consistent structure:
```
microsoft/{namespace}/
  ├── types.ts    # Core type/interface definitions
  ├── enums.ts    # Enumeration values for properties
  └── index.ts    # Public API exports
```

### 2. Type Definition Patterns

All types follow these patterns:
- **Interfaces over Types**: Use `interface` for object shapes (extensible)
- **Readonly Properties**: All properties marked `readonly` for immutability
- **Optional vs Required**: Clear distinction using TypeScript's `?` operator
- **JSDoc Comments**: Comprehensive documentation including ARM API versions

Example pattern:
```typescript
/**
 * Storage Account configuration.
 *
 * @remarks
 * Represents Microsoft.Storage/storageAccounts resource type.
 * API Version: 2023-01-01
 */
export interface StorageAccountProperties {
  /**
   * Account SKU configuration.
   */
  readonly sku: Sku;

  /**
   * Account kind.
   * @default 'StorageV2'
   */
  readonly kind?: StorageKind;
}
```

### 3. Implementation Priority

Based on usage patterns and Azure service dependencies:

**Phase 1 - Core Infrastructure (High Priority)**
- Microsoft.Network (29 types) - Networking foundation
- Microsoft.Storage (21 types) - Storage services
- Microsoft.Web (29 types) - App Service/Functions
- Microsoft.Sql (21 types) - Database services

**Phase 2 - Supporting Services (Medium Priority)**
- Microsoft.Insights (29 types) - Monitoring/diagnostics
- Microsoft.ServiceBus (21 types) - Messaging
- Microsoft.DocumentDB (10 types) - Cosmos DB

**Phase 3 - Specialized Services (Low Priority)**
- Remaining 19 namespaces without current implementations

### 4. Type Safety Guarantees

Each type must provide:
- **Compile-time validation**: TypeScript compiler catches type errors
- **Runtime validation**: Optional JSON schema generation for validation
- **ARM compliance**: Types match ARM template JSON structure exactly
- **Government cloud compatibility**: Conditional properties for Gov vs Commercial

## Alternatives Considered

### Alternative 1: Monolithic Type File
Single large types file containing all Azure resource types.
- **Pros**: Single source of truth, easier to search
- **Cons**: Poor modularity, difficult to maintain, slow IDE performance

### Alternative 2: Auto-Generated from Azure Schemas
Generate TypeScript types from Azure's OpenAPI/Swagger definitions.
- **Pros**: Always up-to-date, comprehensive coverage
- **Cons**: Poor developer experience, excessive complexity, includes deprecated APIs

### Alternative 3: Runtime Type Validation Only
Use libraries like Zod or io-ts for runtime validation without static types.
- **Pros**: Runtime guarantees, simpler implementation
- **Cons**: No compile-time safety, poor IDE support, performance overhead

## Consequences

### Positive Consequences
1. **Type Safety**: Full TypeScript type checking for ARM templates
2. **Developer Experience**: IntelliSense and auto-completion in IDEs
3. **Modularity**: Each namespace can be developed/tested independently
4. **Documentation**: Types serve as living documentation
5. **Progressive Enhancement**: Start simple, add complexity as needed
6. **Clear ARM Mapping**: 1:1 correspondence between types and ARM JSON

### Negative Consequences
1. **Implementation Effort**: 159+ types to implement across 26 namespaces
2. **Maintenance Burden**: Must track Azure API changes and updates
3. **Version Management**: Different API versions may require type variants
4. **Testing Complexity**: Each type needs comprehensive test coverage

### Trade-offs
- **Completeness vs Pragmatism**: Implementing most-used services first
- **Type Safety vs Flexibility**: Strict types may limit dynamic scenarios
- **Performance vs Safety**: Runtime validation adds overhead

## Success Criteria

The schema type system will be considered successful when:

1. **Coverage Metrics**:
   - 100% of Phase 1 namespaces implemented (4 namespaces, ~100 types)
   - 80% of all ARM resource types covered within 6 months
   - Zero type-related runtime errors in production

2. **Developer Metrics**:
   - TypeScript compilation with `strict: true` passes
   - IDE auto-completion works for all implemented types
   - Documentation generated from types is comprehensive

3. **Quality Metrics**:
   - Each type has corresponding unit tests
   - ARM template generation validated against Azure
   - Government cloud compatibility verified

4. **Performance Metrics**:
   - Type checking completes in < 10 seconds
   - No noticeable IDE lag with full type system loaded

## Implementation Roadmap

### Sprint 1-2: Foundation
- Implement core pattern for type definitions
- Complete Microsoft.Storage namespace (21 types)
- Establish testing framework

### Sprint 3-4: Networking
- Complete Microsoft.Network namespace (29 types)
- Add Government cloud conditional types

### Sprint 5-6: Compute & Web
- Complete Microsoft.Web namespace (29 types)
- Complete Microsoft.Sql namespace (21 types)

### Sprint 7-8: Monitoring & Messaging
- Complete Microsoft.Insights namespace (29 types)
- Complete Microsoft.ServiceBus namespace (21 types)
- Complete Microsoft.DocumentDB namespace (10 types)

### Sprint 9+: Remaining Services
- Implement remaining 19 namespaces based on customer demand

## References

- Azure Resource Manager documentation: https://docs.microsoft.com/en-us/azure/azure-resource-manager/
- TypeScript Handbook: https://www.typescriptlang.org/docs/handbook/
- ARM Template reference: https://docs.microsoft.com/en-us/azure/templates/