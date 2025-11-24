# ADR-024: Component API + Function + Schema Layers

**Status:** Approved
**Date:** 2025-11-23
**Author:** Becky (Staff Architect)
**Deciders:** Architecture Team
**Related ADRs:** ADR-020 (Component Auth System), ADR-021 (Component Synthesis CDK Integration), ADR-023 (Synthesis Strategy)

## Context

### Problem Statement

Our current implementation has a critical gap: we successfully define schemas and backends in TypeScript, but we **do not auto-generate the API layer, function layer, or schema files** that make schema-first development productive.

**Current State:**
```typescript
// User defines schema
const schema = defineSchema({ models: { User, Project } });

// User defines backend
const backend = defineBackend({ schema, auth, settings });

// ❌ NOTHING HAPPENS - no API, no functions, no endpoints
```

**Desired State (like AWS Amplify):**
```typescript
// User defines schema
const schema = defineSchema({ models: { User, Project } });

// User defines backend
const backend = defineBackend({ schema, auth, settings });

// ✅ AUTO-GENERATES:
// - API Management + REST endpoints
// - Azure Functions (CRUD operations)
// - OpenAPI specification
// - GraphQL schema (optional)
// - TypeScript client types
```

### Comparison to AWS Amplify Gen 2

**What Amplify auto-generates:**
1. AppSync GraphQL API
2. DynamoDB tables
3. Lambda resolver functions
4. CRUD operations (queries, mutations)
5. Authorization rules
6. GraphQL schema file

**What we currently generate:**
1. ✅ Cosmos DB containers (equivalent to DynamoDB tables)
2. ❌ No API Management (equivalent to AppSync)
3. ❌ No Azure Functions (equivalent to Lambda resolvers)
4. ❌ No CRUD operations
5. ❌ No authorization integration
6. ❌ No schema files

**Gap:** We're missing 5 out of 6 core capabilities.

### Why This Matters

**User Experience Impact:**
- ❌ Users must manually write API code
- ❌ Users must manually write function code
- ❌ Users must manually configure authentication
- ❌ Users must manually document APIs
- ❌ Users don't get the schema-first development experience

**Value Proposition Lost:**
- The entire promise of schema-first development is auto-generation
- Without auto-generation, we're just a schema validation library
- Competitors (Amplify, Supabase, Firebase) provide full auto-generation

---

## Decision

We will implement three missing layers to achieve feature parity with AWS Amplify Gen 2:

### 1. API Layer (API Management Generation)

**What:** Auto-generate Azure API Management resources from schema models

**Components:**
- API Management service instance
- API definition (REST API)
- Operations for each CRUD model (GET, POST, PUT, DELETE)
- Operation policies (authentication, rate limiting, caching)
- Backend configuration (connects to Azure Functions)

**Why:** API Management provides the equivalent of AWS AppSync/API Gateway
- Centralized API gateway
- Built-in authentication (JWT validation)
- Rate limiting and throttling
- Response caching
- API versioning
- Developer portal

### 2. Function Layer (CRUD Function Generation)

**What:** Auto-generate Azure Function code from schema models

**Components:**
- Function App configuration (app settings, connection strings)
- CRUD function code for each model:
  - `getModel` - Fetch single document by ID
  - `listModels` - List documents with pagination
  - `createModel` - Create new document with validation
  - `updateModel` - Update existing document
  - `deleteModel` - Delete document by ID
- Authentication middleware (JWT validation)
- Validation logic (from schema field types)
- Error handling and logging

**Why:** Azure Functions provide serverless compute like AWS Lambda
- Serverless (no infrastructure management)
- Auto-scaling
- Pay-per-execution
- Native Cosmos DB integration
- TypeScript support

### 3. Schema Layer (API Documentation Generation)

**What:** Auto-generate API schema files from schema models

**Components:**
- OpenAPI 3.0 specification (REST API)
- GraphQL schema (Phase 2 - optional)
- TypeScript client types
- Input/output type definitions

**Why:** Schema files provide API documentation and client SDK generation
- OpenAPI enables Postman/Swagger integration
- GraphQL schema enables GraphQL client tools
- TypeScript types enable type-safe API clients
- Auto-generated documentation

---

## Alternatives Considered

### Alternative 1: Functions Only (No API Management)

**Architecture:** Azure Functions with HTTP triggers directly exposed

**Pros:**
- Simpler (one service instead of two)
- Lower cost (~$5/month vs ~$5/month - same)

**Cons:**
- No centralized gateway
- No built-in rate limiting
- No response caching
- No API versioning
- Manual authentication in each function
- No developer portal
- Requires Redis for rate limiting (~$20/month extra)

**Decision:** REJECTED - Loses too many critical features, actually more expensive

### Alternative 2: Container Apps + Functions

**Architecture:** Azure Container Apps for GraphQL server, Functions for resolvers

**Pros:**
- Always-on GraphQL server (no cold start)
- Better for complex GraphQL (DataLoader, subscriptions)

**Cons:**
- Over-complicated for CRUD
- Higher cost (~$30/month minimum)
- More deployment complexity (Docker images)
- Overkill for basic operations

**Decision:** REJECTED - Unnecessary complexity for MVP, can add later if needed

### Alternative 3: Manual CDK Usage (No Auto-Generation)

**Architecture:** Users manually write CDK constructs for API + Functions

**Pros:**
- Full control
- No magic
- Users learn CDK

**Cons:**
- ❌ Defeats the purpose of schema-first development
- ❌ Users must write 100+ lines of boilerplate per model
- ❌ No differentiation from competitors
- ❌ Not aligned with Amplify's value proposition

**Decision:** REJECTED - This is the status quo, which is the problem we're solving

### Alternative 4: GraphQL First (Instead of REST)

**Architecture:** Generate GraphQL API instead of REST

**Pros:**
- Flexible queries
- Type-safe
- Modern

**Cons:**
- More complex to implement
- Requires GraphQL server (Apollo, Yoga)
- Larger bundle size
- Steeper learning curve

**Decision:** DEFERRED to Phase 2
- Start with REST (simpler, faster to implement)
- Add GraphQL later (progressive enhancement)
- Let users choose what they prefer

---

## Implementation Architecture

### Synthesis Orchestration

```typescript
// packages/component/src/synthesis/backend-synthesizer.ts

export class BackendSynthesizer {
  constructor(
    private dataSynthesizer: DataSynthesizer,
    private apiSynthesizer: ApiSynthesizer,
    private functionSynthesizer: FunctionSynthesizer,
    private schemaSynthesizer: SchemaSynthesizer,
    private authIntegrator: AuthIntegrator
  ) {}

  synthesize(backend: BackendObject): SynthesisResult {
    // Create CDK App + Stack
    const app = new App();
    const stack = new Stack(app, backend.settings.name);

    // 1. Generate data layer (Cosmos DB + containers)
    const dataResources = this.dataSynthesizer.synthesize(
      backend.schema,
      stack
    );

    // 2. Generate API layer (API Management + operations)
    const apiResources = this.apiSynthesizer.synthesize(
      backend.schema,
      stack,
      dataResources
    );

    // 3. Generate function layer (Functions + code)
    const functionResources = this.functionSynthesizer.synthesize(
      backend.schema,
      stack,
      dataResources,
      apiResources
    );

    // 4. Generate schema files (OpenAPI/GraphQL)
    const schemaFiles = this.schemaSynthesizer.generate(
      backend.schema,
      apiResources
    );

    // 5. Apply authentication
    this.authIntegrator.integrate(
      backend.authentication,
      functionResources,
      apiResources
    );

    // 6. Synthesize to ARM templates
    return app.synth();
  }
}
```

### File Structure

```
packages/component/src/synthesis/
├─ backend-synthesizer.ts       # Main orchestrator
├─ data-synthesizer.ts          # Cosmos DB generation
├─ api-synthesizer.ts           # API Management generation
├─ function-synthesizer.ts      # Function code generation
├─ schema-synthesizer.ts        # OpenAPI/GraphQL generation
└─ auth-integrator.ts           # Authentication middleware
```

---

## Consequences

### Positive

1. **Feature Parity with Amplify**
   - Users get full schema → infrastructure auto-generation
   - Competitive with AWS Amplify Gen 2, Supabase, Firebase

2. **Productivity Gain**
   - Users write ~10 lines (schema) instead of ~500 lines (manual CDK)
   - 50x reduction in boilerplate code
   - Faster time to production

3. **Best Practices Enforced**
   - Auto-generated code follows Azure best practices
   - Consistent error handling, validation, logging
   - Security by default (auth, rate limiting)

4. **Type Safety End-to-End**
   - Schema types → Function types → API types → Client types
   - Compile-time validation across entire stack

5. **Progressive Enhancement**
   - Start with defaults (CRUD operations)
   - Customize via attachment points
   - Override individual functions if needed

### Negative

1. **Increased Complexity**
   - More code to maintain (synthesizers, templates)
   - More moving parts (API Management + Functions)
   - Harder to debug generated code

   **Mitigation:**
   - Clear separation of concerns (synthesizers)
   - Well-tested code generation templates
   - Debug mode that shows generated code

2. **Implementation Effort**
   - ~7 weeks to implement all layers
   - Requires coordination across multiple agents

   **Mitigation:**
   - Phased implementation (MVP first)
   - Clear task breakdown per phase
   - Parallel work where possible

3. **Cost Implications**
   - API Management adds $50-680/month (vs free Functions only)

   **Mitigation:**
   - Consumption tier for development (free up to 1M calls)
   - Clear cost documentation
   - Users can opt-out via configuration

4. **Learning Curve**
   - Users must understand generated infrastructure
   - Debugging requires knowledge of API Management + Functions

   **Mitigation:**
   - Excellent documentation
   - Debug mode with detailed logs
   - Examples and tutorials

### Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Function templates too complex | Medium | High | Start simple, iterate based on feedback |
| API Management configuration wrong | Low | High | Follow Azure best practices, test thoroughly |
| Auth integration breaks | Low | Critical | Integration tests with real Entra ID |
| Performance issues (cold start) | Medium | Medium | Premium plan for production, document trade-offs |
| User confusion with generated code | High | Medium | Debug mode, clear documentation, examples |

---

## Implementation Plan

### Phase 1: Data Layer (Week 1-2) - ✅ COMPLETE

**Status:** Already implemented
**Deliverables:**
- Schema → Cosmos DB containers
- ARM template generation
- Deployment validation

### Phase 2: API Layer (Week 3-4)

**Goal:** Auto-generate API Management resources
**Priority:** 🔴 CRITICAL

**Tasks:**
1. Implement `ApiSynthesizer` class
2. Generate API Management instance (L2 construct)
3. Generate API operations for each CRUD model
4. Configure operation policies (auth, rate limiting, caching)
5. Generate OpenAPI specification
6. Integration tests

**Success Criteria:**
- ARM template includes API Management service
- CRUD operations for each model (5 per model)
- Policies correctly configured
- OpenAPI spec validates
- Can deploy to Azure

### Phase 3: Function Layer (Week 5-6)

**Goal:** Auto-generate function code
**Priority:** 🔴 CRITICAL

**Tasks:**
1. Implement `FunctionSynthesizer` class
2. Create function code templates (get, list, create, update, delete)
3. Generate validation logic from schema fields
4. Configure Function App settings (Cosmos connection strings)
5. Implement `AuthIntegrator` class
6. Generate auth middleware
7. Package functions for deployment
8. Integration tests

**Success Criteria:**
- Function code generated in `functions/` directory
- Code compiles with TypeScript
- Validation logic matches schema
- App settings include Cosmos connection
- Auth middleware validates JWT tokens
- Functions can be deployed

### Phase 4: End-to-End Testing (Week 7)

**Goal:** Validate complete flow
**Priority:** 🔴 CRITICAL

**Tasks:**
1. Deploy generated infrastructure to Azure (dev environment)
2. Test CRUD operations via API
3. Validate authentication (JWT tokens)
4. Validate rate limiting
5. Performance testing (latency, throughput)
6. Error handling validation
7. Documentation updates

**Success Criteria:**
- Successful deployment to Azure
- All CRUD operations return correct results
- Authentication blocks unauthorized requests
- Rate limiting throttles excessive requests
- Latency < 500ms for cached responses
- Error messages are clear and actionable

### Phase 5: GraphQL Support (Week 8) - OPTIONAL

**Goal:** Add GraphQL endpoint
**Priority:** 🟢 MEDIUM

**Tasks:**
1. Implement GraphQL schema generation
2. Create Apollo Server function template
3. Generate GraphQL resolvers
4. Add GraphQL endpoint to API Management
5. Update documentation

**Success Criteria:**
- GraphQL schema file generated
- GraphQL queries work
- Coexists with REST API
- Type-safe GraphQL client

---

## Success Metrics

### Quantitative

1. **Code Reduction**
   - Target: 95% reduction in boilerplate (500 lines → 10 lines)
   - Measure: Lines of code comparison (manual vs auto-generated)

2. **Time to Production**
   - Target: 80% faster (2 days → 4 hours)
   - Measure: Time from schema definition to deployed API

3. **API Coverage**
   - Target: 100% CRUD coverage
   - Measure: All models have 5 operations (get, list, create, update, delete)

4. **Test Coverage**
   - Target: 90%+ test coverage for synthesizers
   - Measure: Code coverage reports

5. **Performance**
   - Target: < 500ms API response time (cached)
   - Measure: API latency benchmarks

### Qualitative

1. **Developer Experience**
   - Target: "It just works"
   - Measure: User feedback, documentation clarity

2. **Type Safety**
   - Target: Compile-time validation across entire stack
   - Measure: TypeScript errors caught before runtime

3. **Maintainability**
   - Target: Easy to understand generated code
   - Measure: Code review feedback, debug session success rate

---

## Migration Path

### Existing Users (Manual CDK)

**Before:**
```typescript
const app = new App();
const stack = new Stack(app, 'MyStack');

// Manual CDK construction
const cosmos = new CosmosDBAccount(stack, 'DB', { ... });
const database = new CosmosDBDatabase(stack, 'Database', { account: cosmos });
const container = new CosmosDBContainer(stack, 'Users', { database, ... });
const apim = new ApiManagementService(stack, 'APIM', { ... });
// ... 100+ more lines

app.synth();
```

**After (Auto-Generated):**
```typescript
const schema = defineSchema({
  schema: a.schema({
    User: c.model({
      id: a.id(),
      email: a.string().email().required(),
      name: a.string().required()
    })
  })
});

const backend = defineBackend({
  schema,
  authentication,
  settings: { name: 'my-app' }
});

backend.synth(); // Auto-generates everything
```

**Migration Strategy:**
1. Keep existing manual CDK code working (no breaking changes)
2. Add auto-generation as opt-in feature
3. Provide migration guide for manual → auto-generated
4. Support hybrid approach (auto-generated + customization)

### New Users

**Recommended Path:**
1. Start with auto-generation (define schema + backend)
2. Customize via attachment points if needed
3. Override individual operations for custom logic
4. Keep manual CDK for advanced scenarios

---

## Related Decisions

### ADR-020: Component Auth System
- **Relationship:** Auth definition feeds into AuthIntegrator
- **Impact:** Authentication middleware generated from auth definition

### ADR-021: Component Synthesis CDK Integration
- **Relationship:** Synthesis orchestration builds on CDK integration
- **Impact:** BackendSynthesizer uses CDK constructs

### ADR-023: Synthesis Strategy
- **Relationship:** Synthesis strategy defined overall approach
- **Impact:** This ADR implements the synthesis strategy for Component package

---

## Future Enhancements

### Phase 6: Advanced Features (Future)

1. **Custom Resolvers**
   - Allow users to override default CRUD functions
   - Provide hooks for custom business logic

2. **Relationships**
   - Auto-generate join queries for `a.ref()` fields
   - Support nested queries (User → Projects)

3. **Subscriptions (Real-time)**
   - Use SignalR for real-time updates
   - Auto-generate subscription endpoints

4. **Batching and Caching**
   - DataLoader-style batching
   - Intelligent caching strategies

5. **Multi-Region Deployment**
   - Auto-configure Cosmos multi-region
   - API Management multi-region routing

---

## Approval

**Decision Date:** 2025-11-23
**Status:** ✅ APPROVED

**Approved By:**
- Becky (Staff Architect) - Recommends approval
- Pending: Architecture team review

**Implementation:**
- Assigned to: Devon (Backend), Grace (Synthesis), Felix (Schemas)
- Start Date: Upon approval
- Target Completion: 7 weeks (8 weeks with GraphQL)

---

## References

- [AWS Amplify Gen 2 Documentation](https://docs.amplify.aws/)
- [Azure API Management Best Practices](https://learn.microsoft.com/en-us/azure/api-management/api-management-howto-policies)
- [Azure Functions TypeScript Guide](https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node)
- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- [GraphQL Schema Language](https://graphql.org/learn/schema/)
- ADR-020: Component Auth System
- ADR-021: Component Synthesis CDK Integration
- ADR-023: Synthesis Strategy
