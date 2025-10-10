# ADR-010: API Stack Architecture for Azure API Management

## Context

We are creating high-level stack constructs that bundle Azure API Management APIs with resolvers, policies, and configuration. These stacks need to provide a consistent, type-safe abstraction over API Management while respecting the unique characteristics of different API types (REST, GraphQL, WebSocket, SOAP).

The current implementation shows an `ApiStackBase` class example with policy aggregation and a fluent API for adding policies. The architecture needs to:

1. Support multiple API types with their unique requirements
2. Provide a consistent developer experience across API types
3. Enable policy composition and reuse
4. Support both simple and complex scenarios through progressive enhancement
5. Maintain clear boundaries between responsibilities
6. Enable future extensibility for new API types

Current challenges include:
- GraphQL APIs have schema-based definitions while REST APIs use OpenAPI or operation-based definitions
- Some API types (GraphQL synthetic mode) don't require backend URLs while others do
- Policy management needs to be both declarative (props) and programmatic (fluent API)
- Resolver patterns differ significantly between API types

## Decision

We will implement a three-layer architecture for API stacks:

### 1. Base Stack Pattern

```typescript
abstract class ApiStackBase extends Construct {
  protected readonly apiManagementService: IService;
  protected readonly policyDocument: PolicyDocument;
  protected api?: IServiceApi;

  // Template method pattern for API creation
  protected abstract createApi(props: ApiStackBaseProps): IServiceApi;

  // Common policy building from props
  protected buildPoliciesFromProps(props: ApiStackBaseProps): void;

  // Policy application after API creation
  protected applyPolicyDocument(): void;

  // Fluent API for policy addition
  public addInboundPolicy(...policies: IPolicy[]): this;
  public addBackendPolicy(...policies: IPolicy[]): this;
  public addOutboundPolicy(...policies: IPolicy[]): this;
  public addOnErrorPolicy(...policies: IPolicy[]): this;
}
```

**Responsibilities of the base class:**
- Policy document management and aggregation
- Common policy patterns (CORS, rate limiting, JWT validation, etc.)
- Fluent API for programmatic policy addition
- Template method pattern for API creation
- Lifecycle management (create API, build policies, apply policies)

### 2. Specialized Stack Implementations

Each API type gets its own stack class that extends the base:

```typescript
class RestApiStack extends ApiStackBase {
  protected createApi(props: RestApiStackProps): IServiceApi {
    // REST-specific API creation
    // Handle OpenAPI import OR operation definitions
  }

  // REST-specific methods
  public addOperation(method: HttpMethod, path: string, props: OperationProps): this;
  public importOpenApiSpec(spec: string | OpenApiDefinition): this;
}

class GraphQLApiStack extends ApiStackBase {
  protected createApi(props: GraphQLApiStackProps): IServiceApi {
    // GraphQL-specific API creation
    // Handle schema, resolvers, synthetic vs pass-through mode
  }

  // GraphQL-specific methods
  public addResolver(resolver: GraphQLResolver): this;
  public setAuthorizationRules(rules: AuthorizationRule[]): this;
}

class WebSocketApiStack extends ApiStackBase {
  // Future implementation
}

class SoapApiStack extends ApiStackBase {
  // Future implementation
}
```

### 3. Stack Responsibilities

The architecture clearly delineates responsibilities:

| Responsibility | Owner | Rationale |
|---|---|---|
| API Creation | Specialized Stack | Each API type has unique creation requirements |
| Policy Aggregation | Base Stack | Common pattern across all API types |
| Policy Generation | PolicyDocument | Single responsibility for XML generation |
| Resolver Management | Specialized Stack | Resolvers differ significantly per API type |
| Service Configuration | Base Stack Props | Common configuration like CORS, rate limiting |
| Versioning | External (ApiVersionSet) | Separate concern, composed with stacks |
| Products | External (Product) | Separate concern, associated post-creation |
| Subscriptions | External (Subscription) | Separate concern, managed independently |

### 4. Schema Definition Approach

We embrace the natural differences between API types:

**GraphQL**: Schema-first approach
```typescript
interface GraphQLApiStackProps {
  schema: GraphQLSchema | string;  // SDL or schema object
  resolvers?: GraphQLResolver[];   // Optional for synthetic mode
  serviceUrl?: string;              // Optional for synthetic mode
}
```

**REST**: Dual approach supporting both OpenAPI and programmatic
```typescript
interface RestApiStackProps {
  // Option 1: OpenAPI import
  openApiSpec?: string | OpenApiDefinition;

  // Option 2: Programmatic operations
  operations?: RestOperation[];

  serviceUrl: string;  // Always required for REST
}
```

### 5. Resolver Registration Strategy

Resolvers are passed as configuration during stack creation, with optional programmatic addition:

```typescript
// Initial resolvers via props
const stack = new GraphQLApiStack(scope, 'API', {
  resolvers: [resolver1, resolver2]
});

// Programmatic addition (for dynamic scenarios)
stack.addResolver(resolver3);
```

**Design decisions:**
- Resolvers are configuration, not child constructs (they don't have their own ARM resources)
- Ordering is preserved based on array order and addition sequence
- Dependencies between resolvers are handled by the GraphQL runtime, not our constructs

### 6. Policy Integration Pattern

Three levels of policy management:

1. **Declarative (Props)**: Common policies configured via props
2. **Programmatic (Fluent API)**: Custom policies added via methods
3. **Direct Access (Advanced)**: PolicyDocument exposed for complex scenarios

```typescript
class ApiStackBase {
  // Level 1: Props-based
  constructor(props: { enableCors?: boolean; rateLimit?: RateLimitConfig }) {
    if (props.enableCors) this.policyDocument.addInbound(cors());
    if (props.rateLimit) this.policyDocument.addInbound(rateLimit(props.rateLimit));
  }

  // Level 2: Fluent API
  public addInboundPolicy(policy: IPolicy): this {
    this.policyDocument.addInbound(policy);
    return this;
  }

  // Level 3: Direct access (protected, for advanced scenarios)
  protected get policies(): PolicyDocument {
    return this.policyDocument;
  }
}
```

**Conflict resolution:**
- Policies are applied in order: Stack defaults → Props-based → Programmatic
- No automatic deduplication (explicit is better than implicit)
- Validation happens at synthesis time

### 7. Service URL Strategy

Different API types have different backend requirements:

| API Type | Service URL | Rationale |
|---|---|---|
| REST | Required | REST APIs always proxy to a backend |
| GraphQL (Pass-through) | Required | Proxies GraphQL to backend service |
| GraphQL (Synthetic) | Optional | API Management executes resolvers |
| WebSocket | Required | WebSocket connections need backend |
| SOAP | Required | SOAP services need backend endpoint |

### 8. Stack Composition Patterns

Stacks are composable but not through inheritance:

```typescript
// API Federation via shared service
const apimService = new ApiManagementService(scope, 'APIM', props);

const userApi = new RestApiStack(scope, 'UserAPI', {
  apiManagementService: apimService,
  path: 'users'
});

const productApi = new GraphQLApiStack(scope, 'ProductAPI', {
  apiManagementService: apimService,
  path: 'graphql/products'
});

// Cross-stack references via interfaces
const subscription = new Subscription(scope, 'Sub', {
  apis: [userApi.api, productApi.api]
});
```

**Design principles:**
- Stacks share the parent API Management service
- No direct stack-to-stack dependencies
- Cross-references use interface types (IServiceApi)
- Federation patterns handled by API Management runtime

## Alternatives Considered

### Alternative 1: Single Unified Stack Class

A single `ApiStack` class that handles all API types through configuration:

```typescript
class ApiStack extends Construct {
  constructor(props: { type: 'REST' | 'GraphQL' | 'WebSocket'; ... })
}
```

**Rejected because:**
- Would require complex conditional logic throughout
- Poor TypeScript type discrimination
- Difficult to maintain as new API types are added
- Violates open-closed principle

### Alternative 2: Composition Over Inheritance

Using composition with strategy pattern instead of inheritance:

```typescript
class ApiStack extends Construct {
  constructor(props: { strategy: IApiStrategy; ... })
}
```

**Rejected because:**
- Adds unnecessary indirection
- Makes the API less discoverable
- Inheritance is appropriate here (genuine IS-A relationship)
- Template method pattern fits our needs perfectly

### Alternative 3: Resolvers as Child Constructs

Making resolvers full constructs with their own lifecycle:

```typescript
const resolver = new GraphQLResolver(stack, 'Resolver', props);
```

**Rejected because:**
- Resolvers don't map to ARM resources
- Would complicate the synthesis process
- Resolvers are configuration, not infrastructure
- Would create unnecessary construct tree complexity

## Consequences

### Positive Consequences

1. **Clear separation of concerns**: Each layer has well-defined responsibilities
2. **Type safety**: TypeScript can properly discriminate between stack types
3. **Progressive enhancement**: Start simple, add complexity as needed
4. **Extensibility**: New API types can be added without modifying existing code
5. **Testability**: Each stack type can be tested independently
6. **Developer experience**: Intuitive API with good IntelliSense support

### Negative Consequences

1. **More classes**: Separate class per API type increases codebase size
2. **Learning curve**: Developers need to understand which stack to use
3. **Potential duplication**: Some logic might be duplicated across stack types
4. **Migration complexity**: Changing API types requires stack replacement

### Trade-offs

1. **Flexibility vs Simplicity**: We optimize for flexibility over having a single simple class
2. **Type Safety vs Dynamic Configuration**: We choose compile-time type safety over runtime flexibility
3. **Explicit vs Implicit**: We prefer explicit API type selection over automatic detection
4. **Composition Boundaries**: We limit composition to avoid circular dependencies

## Success Criteria

The architecture will be considered successful when:

1. **Developer Productivity**: Creating an API with policies takes < 20 lines of code
2. **Type Safety**: TypeScript catches all invalid configurations at compile time
3. **Extensibility**: Adding WebSocket support requires no changes to existing stacks
4. **Policy Reuse**: Common policy patterns can be shared across stack types
5. **Testing**: 100% of public API surface has unit tests
6. **Documentation**: Each stack type has complete TSDoc documentation
7. **Performance**: Stack construction adds < 10ms overhead vs direct construct usage

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
- Implement PolicyDocument with XML generation
- Create ApiStackBase with policy aggregation
- Implement common policy builders (CORS, rate limit, JWT)

### Phase 2: REST Stack (Week 2)
- Implement RestApiStack with OpenAPI support
- Add operation-based API definition
- Create REST-specific policy patterns

### Phase 3: GraphQL Stack (Week 3)
- Implement GraphQLApiStack with schema support
- Add resolver management
- Implement synthetic vs pass-through modes

### Phase 4: Validation & Testing (Week 4)
- Add comprehensive unit tests
- Create integration tests with API Management
- Validate Government cloud compatibility

### Future Phases
- WebSocket stack implementation
- SOAP stack implementation
- API federation patterns
- Advanced policy composition

## Related Decisions

- **ADR-006**: Azure Functions Architecture - Similar pattern for function apps
- **ADR-004**: Lib/CDK Separation - Stacks belong in lib, L1/L2 constructs in CDK
- **ADR-005**: NPM Package Distribution - Stack classes exported from @atakora/lib

## References

- [Azure API Management REST API Reference](https://docs.microsoft.com/en-us/rest/api/apimanagement/)
- [API Management Policy Reference](https://docs.microsoft.com/en-us/azure/api-management/api-management-policies)
- [GraphQL in API Management](https://docs.microsoft.com/en-us/azure/api-management/graphql-api)
- [Template Method Pattern](https://refactoring.guru/design-patterns/template-method)