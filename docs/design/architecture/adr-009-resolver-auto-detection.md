# ADR-009: GraphQL Resolver Auto-Detection and Smart Defaults

## Context

GraphQL resolvers in Azure API Management need to map GraphQL fields to backend REST API endpoints. Currently, developers must manually configure field names, paths, ID mappings, and response transformations for each resolver. This leads to repetitive configuration code that follows predictable patterns in 90% of cases.

We need a system that automatically detects and configures resolvers based on Resource object patterns while providing clear override mechanisms for edge cases. The goal is "convention over configuration" that reduces boilerplate while maintaining flexibility.

### Current Pain Points

1. **Manual Field Configuration**: Every resolver requires explicit field name mapping
2. **Path Generation**: Developers manually construct REST paths for each resolver
3. **ID Field Detection**: Parent-child relationships require manual ID field mapping
4. **Response Mapping**: Scalar field extraction from nested responses needs explicit configuration
5. **Inconsistent Patterns**: Different developers implement similar patterns differently

### Requirements

- Automatic detection must be predictable and debuggable
- Override mechanisms must be discoverable and intuitive
- Error messages must clearly indicate what auto-detection attempted
- System must handle common patterns (90% of cases) automatically
- Edge cases must be possible through explicit configuration

## Decision

We will implement a multi-layered auto-detection system with the following components:

### 1. Field Name Detection

**Convention**: Resource class names automatically map to lowercase-first GraphQL field names.

```typescript
// Detection Rules
class Inventory extends Resource { }     // -> field: 'inventory'
class UserProfile extends Resource { }   // -> field: 'userProfile'
class APIGateway extends Resource { }    // -> field: 'apiGateway'
class IPAddress extends Resource { }     // -> field: 'ipAddress'

// Acronym Handling Rules:
// - Standalone acronyms: lowercase entirely (API -> api)
// - Leading acronyms in compounds: lowercase (APIGateway -> apiGateway)
// - Embedded acronyms: preserve case (UserAPI -> userAPI)
// - Multiple consecutive capitals: treat as acronym (IPAddress -> ipAddress)
```

**Rationale**: This follows JavaScript/TypeScript naming conventions and GraphQL best practices.

### 2. ID Field Detection Strategy

**Convention**: Automatically detect ID fields in parent objects using pattern matching.

```typescript
// Detection Priority Order:
// 1. Exact match: {resourceName}Id (e.g., userId for User)
// 2. Suffix match: *{ResourceName}Id (e.g., customerId maps to User)
// 3. Generic ID: id (if parent contains single 'id' field)
// 4. Explicit override required

// Examples:
interface Order {
  userId: string;      // Auto-detected for User resolver
  productId: string;   // Auto-detected for Product resolver
  warehouseId: string; // Auto-detected for Warehouse resolver
}

// Ambiguity Handling:
interface Order {
  userId: string;
  customerId: string;  // Both could map to User
  // Resolution: Exact match wins (userId), warning logged
}
```

**Multiple ID Fields Handling**:
- Exact match takes precedence
- Warn when multiple possible matches exist
- Require explicit override when ambiguous

### 3. Path Generation Rules

**Convention**: REST paths are generated based on resolver context and relationships.

```typescript
// Path Generation Decision Tree:
//
// Root Query Field?
//   YES -> /{pluralResourceName}/{id}
//   NO  -> Is it a nested relationship?
//     YES -> Has parent ID field for this resource?
//       YES -> /{pluralResourceName}/{parentIdField}
//       NO  -> /{pluralResourceName}?parentId={parent.id}
//     NO  -> /{pluralResourceName}/{parent.id}/subresource

// Examples:
Query.product         -> /products/{id}
Product.inventory     -> /inventories/{productId}  // if Inventory has productId
Product.reviews       -> /reviews?productId={id}    // if Review has no productId
Order.user           -> /users/{userId}             // detected from Order.userId
User.manager         -> /users/{managerId}          // self-referential
```

**Pluralization Rules**:
- Standard English pluralization (product -> products)
- Maintain custom plurals dictionary (person -> people, inventory -> inventories)
- Support explicit plural overrides

### 4. Response Field Mapping

**Convention**: Automatically map common scalar field patterns.

```typescript
// Auto-Detection Dictionary:
const commonMappings = {
  // Field Name -> Common Response Patterns
  'count': ['total', 'count', 'totalCount', 'itemCount'],
  'inventory': ['stockLevel', 'availableQuantity', 'quantity'],
  'price': ['amount', 'price', 'cost', 'value'],
  'status': ['state', 'status', 'condition'],
  'name': ['title', 'name', 'displayName'],
  'description': ['summary', 'description', 'details'],
  'isActive': ['enabled', 'active', 'isActive', 'isEnabled'],
};

// Detection Process:
// 1. Check if field name exists in response
// 2. Check commonMappings for alternatives
// 3. Check for nested object with matching field
// 4. Require explicit mapping

// Example:
// Product.inventory (Int) checks response for:
// 1. response.inventory
// 2. response.stockLevel (from dictionary)
// 3. response.inventory.available
// 4. Explicit responseField required
```

### 5. Override Mechanism

**Convention**: Explicit overrides always take precedence over auto-detection.

```typescript
interface ResolverConfig {
  // All optional - auto-detected if not provided
  field?: string;           // Override field name
  path?: string;            // Override path template
  idField?: string;         // Override ID field detection
  responseField?: string;   // Override response mapping
  method?: 'GET' | 'POST'; // Override HTTP method

  // Disable auto-detection
  autoDetect?: boolean;     // Default: true
}

// Example: Override when conventions don't match
new ProductInventoryResolver(product, inventory, {
  idField: 'sku',          // Use SKU instead of productId
  path: '/stock/{sku}',    // Custom path
  responseField: 'data.available_units', // Nested response
});
```

### 6. Edge Case Handling

**Self-Referential Types**:
```typescript
// User.manager: User
// Auto-detect: /users/{managerId} if User has managerId field
// Fallback: Require explicit configuration
```

**Many-to-Many Relationships**:
```typescript
// Product.categories: Category[]
// Auto-detect: /products/{id}/categories (junction endpoint)
// Alternative: /categories?productId={id} (filtered list)
// Decision: Prefer junction endpoint pattern
```

**Polymorphic Types**:
```typescript
// Content.author: User | Organization
// Resolution: Require explicit type discriminator
// Error: "Polymorphic field 'author' requires explicit type configuration"
```

**Union Types**:
```typescript
// SearchResult: Product | Category | Brand
// Resolution: Not supported by auto-detection
// Error: "Union type 'SearchResult' requires manual resolver configuration"
```

## Alternatives Considered

### Alternative 1: Attribute-Based Configuration
Use decorators/attributes on Resource classes to define resolver behavior.

**Pros**:
- Explicit and discoverable
- Type-safe with TypeScript decorators
- Co-located with resource definition

**Cons**:
- Requires modifying Resource classes
- More verbose for common cases
- Couples resources to GraphQL concerns

### Alternative 2: Configuration Files
Use separate YAML/JSON files to define resolver mappings.

**Pros**:
- Separation of concerns
- Easy to generate/modify programmatically
- Language-agnostic

**Cons**:
- Additional files to maintain
- Can get out of sync with code
- Less discoverable

### Alternative 3: Runtime Introspection
Use runtime reflection to analyze resource relationships.

**Pros**:
- Very automatic
- No configuration needed

**Cons**:
- Less predictable
- Harder to debug
- Performance overhead
- Limited by TypeScript's runtime capabilities

## Consequences

### Positive Consequences

1. **Reduced Boilerplate**: 90% of resolvers work with zero configuration
2. **Consistent Patterns**: Enforces naming and structure conventions
3. **Faster Development**: Less configuration code to write and maintain
4. **Predictable Behavior**: Clear rules make behavior easy to understand
5. **Progressive Enhancement**: Start simple, add complexity only when needed

### Negative Consequences

1. **Learning Curve**: Developers must learn the conventions
2. **Magic Behavior**: Auto-detection might seem like "magic" to newcomers
3. **Override Complexity**: Edge cases require understanding both auto-detection and overrides
4. **Naming Constraints**: Resources must follow naming conventions for best results
5. **Debugging Overhead**: Need good error messages to explain what was auto-detected

### Trade-offs

- **Convention vs Flexibility**: We optimize for common cases at the cost of some flexibility
- **Simplicity vs Power**: Simple cases are very simple, complex cases require more work
- **Discoverability vs Automation**: Auto-detection is less explicit but more efficient

## Success Criteria

1. **Adoption Rate**: 80%+ of resolvers use auto-detection without overrides
2. **Error Clarity**: Developers can diagnose auto-detection issues within 2 minutes
3. **Configuration Reduction**: 70% less resolver configuration code compared to manual approach
4. **Pattern Consistency**: All team members follow same resolver patterns
5. **Edge Case Support**: 100% of valid GraphQL schemas can be implemented (with overrides if needed)

## Implementation Checklist

- [ ] Implement field name detection with acronym handling
- [ ] Create ID field detection with priority rules
- [ ] Build path generation with decision tree
- [ ] Implement response field mapping with dictionary
- [ ] Add override mechanism with validation
- [ ] Create detailed error messages for failed detection
- [ ] Write comprehensive unit tests for all patterns
- [ ] Document detection rules in developer guide
- [ ] Add debug mode to show detection decisions
- [ ] Create migration guide for existing resolvers

## Example Implementation

```typescript
// Automatic detection example
class OrderResolver extends GraphQLResolver {
  constructor(private order: Order, private user: User) {
    super();
    // Auto-detects:
    // - field: 'user'
    // - path: '/users/{userId}'
    // - idField: 'userId' (from Order.userId)
    // - method: 'GET'
  }
}

// Override example
class ProductInventoryResolver extends GraphQLResolver {
  constructor(private product: Product, private inventory: Inventory) {
    super({
      field: 'stockInfo',           // Override field name
      path: '/inventory/v2/{sku}',  // Custom API path
      idField: 'productSku',        // Different ID field
      responseField: 'data.stock.available', // Nested response
    });
  }
}

// Debug output example
// [Resolver Auto-Detection] Product.inventory
//   ✓ Field name: 'inventory' (from class Inventory)
//   ✓ Path: '/inventories/{productId}' (detected productId in Inventory)
//   ✓ ID field: 'productId' (exact match in parent)
//   ✓ Response field: 'stockLevel' (from dictionary mapping)
```

## Related Decisions

- ADR-001: Authentication and Authorization Patterns
- ADR-003: Resource Naming Conventions
- ADR-006: Azure Functions Architecture
- ADR-007: API Management Integration Patterns (future)

## References

- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [REST to GraphQL Migration Patterns](https://www.apollographql.com/docs/apollo-server/migration/rest/)
- [Azure API Management GraphQL Support](https://docs.microsoft.com/en-us/azure/api-management/graphql-api)