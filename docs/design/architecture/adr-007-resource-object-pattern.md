# ADR-007: Resource Object Pattern for GraphQL/REST API Management

## Context

We are implementing a GraphQL/REST API stack system for Azure API Management that requires a clear, type-safe pattern for defining API resources. These resources need to be self-describing, include backend configuration, and support both GraphQL and REST paradigms while maintaining developer ergonomics.

The current Azure API Management constructs in our CDK focus on infrastructure deployment, but we need a higher-level abstraction for defining API resources that can:
- Auto-generate endpoints and field names from resource definitions
- Support both REST collections and GraphQL fields
- Handle pluralization correctly (including edge cases)
- Configure backend service connections
- Provide type safety throughout the entire chain
- Enable field-level configuration and resolvers

## Decision

We will implement a **class-based Resource pattern with immutable getters** that encapsulates all resource configuration and metadata. This pattern provides type safety, auto-configuration capabilities, and clear extension points while maintaining predictability.

### Core Resource Pattern

```typescript
// Base resource class with generic type parameter for data shape
abstract class ApiResource<T = any> {
  // Immutable configuration
  protected readonly _name: string;
  protected readonly _endpoint: string;
  protected readonly _idField: string;
  protected readonly _fields: Map<string, FieldConfig>;
  protected readonly _pluralizer: IPluralizer;

  constructor(name: string, config?: ResourceConfig) {
    this._name = name;
    this._idField = config?.idField ?? 'id';
    this._pluralizer = config?.pluralizer ?? new SmartPluralizer();
    this._endpoint = config?.endpoint ?? this._pluralizer.pluralize(name);
    this._fields = new Map();
  }

  // Immutable getters for resource metadata
  get name(): string { return this._name; }
  get fieldName(): string { return this._name.charAt(0).toLowerCase() + this._name.slice(1); }
  get collectionFieldName(): string { return this._pluralizer.pluralize(this.fieldName); }
  get endpoint(): string { return this._endpoint; }
  get collectionEndpoint(): string { return `/${this.endpoint}`; }
  get itemEndpoint(): string { return `/${this.endpoint}/{${this._idField}}`; }
  get idField(): string { return this._idField; }
}
```

### Implementation Example

```typescript
// Product resource with full configuration
class ProductResource extends ApiResource<Product> {
  constructor() {
    super('product', {
      idField: 'productId',
      endpoint: 'products', // optional override
      pluralizer: new SmartPluralizer() // handles product -> products
    });

    // Configure fields
    this.field('productId', {
      type: 'string',
      description: 'Unique product identifier',
      required: true
    });

    this.field('name', {
      type: 'string',
      description: 'Product display name',
      required: true,
      validation: { minLength: 1, maxLength: 100 }
    });

    this.field('inventory', {
      type: 'object',
      resolver: this.resolveInventory,
      description: 'Real-time inventory information'
    });
  }

  // Custom resolver for complex fields
  private async resolveInventory(product: Product, context: ApiContext) {
    return context.dataSources.inventory.getByProductId(product.productId);
  }
}

// Usage in API stack
const api = new GraphQLApiStack(stack, 'API', {
  resources: [
    new ProductResource(),
    new InventoryResource(),
    new EmployeeResource()
  ]
});
```

## Alternatives Considered

### Alternative 1: Plain Object Configuration

```typescript
const productResource = {
  name: 'product',
  endpoint: 'products',
  idField: 'productId',
  fields: {
    productId: { type: 'string', required: true },
    name: { type: 'string', required: true },
    inventory: { type: 'object', resolver: resolveInventory }
  }
};
```

**Rejected because:**
- No type safety for field definitions
- No validation at configuration time
- Difficult to extend with custom logic
- No encapsulation of related behaviors
- Harder to test in isolation

### Alternative 2: Builder Pattern

```typescript
const productResource = ResourceBuilder.create('product')
  .withIdField('productId')
  .withEndpoint('products')
  .addField('productId', { type: 'string', required: true })
  .addField('name', { type: 'string', required: true })
  .build();
```

**Rejected because:**
- More verbose for common cases
- Doesn't leverage TypeScript's class features
- Harder to create reusable resource types
- Less intuitive for developers familiar with OOP patterns

### Alternative 3: Functional Composition

```typescript
const productResource = composeResource(
  withName('product'),
  withIdField('productId'),
  withFields({
    productId: stringField({ required: true }),
    name: stringField({ required: true })
  }),
  withResolver('inventory', resolveInventory)
);
```

**Rejected because:**
- Less familiar pattern for most developers
- More complex mental model
- Harder to debug and trace
- Doesn't align with existing CDK patterns

## Pluralization Strategy

### Smart Pluralization with Override Support

```typescript
interface IPluralizer {
  pluralize(singular: string): string;
  singularize(plural: string): string;
}

class SmartPluralizer implements IPluralizer {
  private readonly rules: Array<[RegExp, string]> = [
    [/person$/i, 'people'],
    [/child$/i, 'children'],
    [/mouse$/i, 'mice'],
    [/(x|ch|ss|sh)$/i, '$1es'],
    [/([^aeiou]|qu)y$/i, '$1ies'],
    [/(?:([^f])fe|([lr])f)$/i, '$1$2ves'],
    [/sis$/i, 'ses'],
    [/([ti])um$/i, '$1a'],
    [/s$/i, 's'],
    [/$/, 's']
  ];

  private readonly uncountable = new Set([
    'sheep', 'fish', 'deer', 'moose', 'series', 'species', 'money', 'data'
  ]);

  private readonly irregular = new Map([
    ['person', 'people'],
    ['man', 'men'],
    ['woman', 'women'],
    ['child', 'children'],
    ['tooth', 'teeth'],
    ['foot', 'feet'],
    ['goose', 'geese']
  ]);

  pluralize(singular: string): string {
    const lower = singular.toLowerCase();

    if (this.uncountable.has(lower)) return singular;
    if (this.irregular.has(lower)) return this.irregular.get(lower)!;

    for (const [rule, replacement] of this.rules) {
      if (rule.test(singular)) {
        return singular.replace(rule, replacement);
      }
    }

    return singular + 's';
  }
}
```

## Field Configuration

### Field Metadata and Resolvers

```typescript
interface FieldConfig {
  type: GraphQLType | 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  required?: boolean;
  deprecated?: string; // deprecation reason
  directives?: FieldDirective[];
  resolver?: FieldResolver;
  validation?: ValidationRule;
  defaultValue?: any;
}

interface FieldDirective {
  name: string;
  args?: Record<string, any>;
}

type FieldResolver<T = any, R = any> = (
  parent: T,
  args: Record<string, any>,
  context: ApiContext
) => Promise<R> | R;
```

## ID Field Strategy

### Multiple ID Strategy Support

```typescript
type IdStrategy =
  | { type: 'uuid' }
  | { type: 'integer'; autoIncrement?: boolean }
  | { type: 'string'; pattern?: RegExp }
  | { type: 'composite'; fields: string[] };

class ApiResource<T> {
  constructor(
    name: string,
    config?: ResourceConfig & { idStrategy?: IdStrategy }
  ) {
    // Configure ID field based on strategy
    this.configureIdField(config?.idStrategy);
  }

  private configureIdField(strategy?: IdStrategy) {
    switch (strategy?.type) {
      case 'composite':
        this._idField = strategy.fields.join('_');
        break;
      case 'uuid':
        this.field(this._idField, {
          type: 'string',
          validation: { pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i }
        });
        break;
      // ... other strategies
    }
  }
}
```

## Naming Convention Analysis

The chosen getter names are designed for clarity and consistency:

- **`name`**: The resource type name (e.g., "Product")
- **`fieldName`**: Singular GraphQL field name (e.g., "product")
- **`collectionFieldName`**: Plural GraphQL field name (e.g., "products")
- **`endpoint`**: REST endpoint segment (e.g., "products")
- **`collectionEndpoint`**: Full REST collection path (e.g., "/products")
- **`itemEndpoint`**: REST item path template (e.g., "/products/{productId}")
- **`idField`**: Name of the ID field (e.g., "productId")

These names clearly communicate their purpose and follow established conventions from popular GraphQL/REST frameworks.

## Consequences

### Positive Consequences

1. **Type Safety**: Full TypeScript type inference from resource definition to API usage
2. **Auto-Configuration**: Sensible defaults with override capability
3. **Encapsulation**: Related logic stays together in resource classes
4. **Testability**: Resources can be unit tested in isolation
5. **Extensibility**: Easy to add custom behaviors via inheritance
6. **Predictability**: Immutable getters prevent accidental modifications
7. **Framework Alignment**: Patterns similar to popular frameworks (NestJS, TypeORM)

### Negative Consequences

1. **Learning Curve**: Developers need to understand the resource class pattern
2. **Boilerplate**: More initial code compared to plain objects
3. **Runtime Overhead**: Class instances have slight memory overhead
4. **Migration Effort**: Existing code needs refactoring to new pattern

### Trade-offs

1. **Flexibility vs Structure**: Less flexible than plain objects but more maintainable
2. **Performance vs Safety**: Small runtime cost for type safety and validation
3. **Simplicity vs Power**: More complex than configuration but enables advanced features
4. **Convention vs Configuration**: Relies on conventions that may not suit all use cases

## Success Criteria

This architecture decision will be considered successful when:

1. **Developer Productivity**: Resource definition time decreases by 50%
2. **Type Safety**: Zero runtime type errors in resource field access
3. **Pluralization Accuracy**: 95%+ correct automatic pluralization
4. **Extension Usage**: 80%+ of resources use standard pattern without custom overrides
5. **Test Coverage**: Resource classes achieve 90%+ unit test coverage
6. **Documentation**: All resources are self-documenting via TypeScript types

## Implementation Concerns

### Performance Considerations

- Lazy initialization of fields map to reduce memory usage
- Caching of computed getter values where appropriate
- Efficient pluralization lookup using Map/Set structures

### Backward Compatibility

- Provide migration utilities for existing plain object configurations
- Support both patterns during transition period
- Clear deprecation timeline for old patterns

### Validation Integration

- Resources should integrate with existing validation pipeline
- Field validation should occur at both configuration and runtime
- Clear error messages pointing to specific field issues

### Government vs Commercial Cloud

- Resource patterns must work in both environments
- No hardcoded endpoints or assumptions about cloud environment
- Configuration should support environment-specific overrides

## Related Decisions

- **ADR-004**: CDK package structure influences how resources are organized
- **ADR-006**: Azure Functions architecture may use similar resource patterns
- **Future ADR**: GraphQL schema generation will build on this resource pattern

## References

- [TypeGraphQL Resource Pattern](https://typegraphql.com/)
- [NestJS GraphQL Resources](https://docs.nestjs.com/graphql/resolvers)
- [REST API Design Best Practices](https://docs.microsoft.com/en-us/azure/architecture/best-practices/api-design)
- [Pluralization Libraries Comparison](https://github.com/blakeembrey/pluralize)

## Status

Proposed - Awaiting review and implementation