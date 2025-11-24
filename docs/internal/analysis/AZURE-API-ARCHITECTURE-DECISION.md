# Azure API Architecture Decision

**Author:** Becky (Staff Architect)
**Date:** 2025-11-23
**Status:** Recommended

## Executive Summary

This document analyzes Azure API architecture options for our schema-first backend system and provides a recommended approach. The decision compares three primary architectures for exposing auto-generated CRUD operations from Cosmos DB.

**Recommendation:** **Option A (API Management + Azure Functions)** with progressive enhancement to add GraphQL in Phase 2.

---

## 1. Context

### 1.1 Requirements

**Functional Requirements:**
- Auto-generate REST/GraphQL APIs from schema models
- CRUD operations for each model (create, read, update, delete, list)
- Authentication and authorization
- Rate limiting and throttling
- Caching for performance
- API versioning
- Schema documentation (OpenAPI/GraphQL)

**Non-Functional Requirements:**
- Serverless (no infrastructure management)
- Cost-effective for development
- Scalable for production
- Government cloud support
- Type-safe end-to-end
- Developer-friendly local testing

### 1.2 AWS Amplify Comparison

**AWS Amplify Gen 2 uses:**
- AppSync (managed GraphQL service)
- Lambda (serverless compute)
- DynamoDB (NoSQL database)

**Azure equivalents:**
- API Management (API gateway) + Functions (compute) = AppSync equivalent
- Azure Functions = Lambda equivalent
- Cosmos DB = DynamoDB equivalent

---

## 2. Option A: API Management + Azure Functions (Recommended)

### 2.1 Architecture

```
Client Request
    ↓
API Management (Gateway)
├─ Authentication (JWT validation, API keys)
├─ Rate limiting (per subscription)
├─ Caching (response cache)
├─ Request transformation
├─ Logging and monitoring
└─ Policy enforcement
    ↓
Azure Functions (Compute Layer)
├─ HTTP triggers (REST endpoints)
├─ CRUD operation handlers
├─ Business logic
├─ Validation
└─ Authorization checks
    ↓
Cosmos DB (Data Layer)
├─ Containers per model
├─ Partition keys
└─ Indexing policies
```

### 2.2 Pros

**API Management Benefits:**
- ✅ **Centralized API gateway** - Single entry point for all APIs
- ✅ **Built-in authentication** - OAuth 2.0, JWT validation, API keys, mutual TLS
- ✅ **Rate limiting** - Per-subscription quotas and throttling
- ✅ **Response caching** - Improve performance without changing functions
- ✅ **Request/response transformation** - Modify requests/responses without code changes
- ✅ **Versioning support** - Side-by-side API versions
- ✅ **Developer portal** - Auto-generated API documentation
- ✅ **Analytics** - Built-in request analytics and monitoring
- ✅ **Policy engine** - XML-based policies for cross-cutting concerns
- ✅ **Government cloud support** - Available in Azure Government
- ✅ **Consumption tier** - Pay-per-call pricing for development

**Azure Functions Benefits:**
- ✅ **Serverless** - No infrastructure management
- ✅ **Auto-scaling** - Scales automatically with load
- ✅ **HTTP triggers** - Native REST support
- ✅ **Local development** - Functions Core Tools for local testing
- ✅ **Language flexibility** - TypeScript, JavaScript, Python, C#
- ✅ **Integration bindings** - Native Cosmos DB bindings
- ✅ **Consumption plan** - Pay-per-execution
- ✅ **Durable Functions** - Stateful workflows if needed
- ✅ **Government cloud support** - Full support

**Combined Benefits:**
- ✅ **Separation of concerns** - API Management handles cross-cutting, Functions handle business logic
- ✅ **Independent scaling** - API Management and Functions scale separately
- ✅ **Best practices** - Follows Azure recommended architecture
- ✅ **Cost-effective** - Consumption tiers for both services

### 2.3 Cons

**Complexity:**
- ⚠️ **Two services to manage** - API Management + Functions (vs single service)
- ⚠️ **Policy configuration** - XML policies have learning curve
- ⚠️ **More ARM resources** - More complex ARM templates

**Cost:**
- ⚠️ **Consumption tier limits** - 1M calls/month free, then $0.035 per 10K calls
- ⚠️ **Developer tier minimum** - $50/month for features like custom domains
- ⚠️ **Standard tier** - $680/month for production features

**Performance:**
- ⚠️ **Extra hop** - Request goes through API Management then Functions
- ⚠️ **Cold start** - Consumption plan has cold start latency

### 2.4 Cost Analysis

**Development Environment (Consumption tiers):**
```
API Management Consumption: $0.035 per 10K calls (first 1M free)
Azure Functions Consumption: $0.20 per 1M executions (first 1M free)
Cosmos DB Serverless: $0.25 per 1M RU (pay-per-use)

Example: 100K requests/month
- API Management: Free (under 1M)
- Functions: Free (under 1M)
- Cosmos DB: ~$5/month
Total: ~$5/month
```

**Production Environment (Standard tiers):**
```
API Management Standard: $680/month (base) + $0.30 per 10K calls
Azure Functions Premium EP1: $182/month + execution costs
Cosmos DB Provisioned: $24/month (400 RU/s) to $2,400/month (40K RU/s)

Example: 10M requests/month
- API Management: $680 + $300 = $980/month
- Functions Premium: $182 + minimal execution costs
- Cosmos DB: $240/month (4K RU/s autoscale)
Total: ~$1,400/month
```

### 2.5 Government Cloud Support

- ✅ **API Management** - Fully supported in Azure Government
- ✅ **Azure Functions** - Fully supported in Azure Government
- ✅ **Cosmos DB** - Fully supported in Azure Government
- ✅ **Entra ID** - Fully supported in Azure Government

**Verdict:** Full government cloud support.

### 2.6 Implementation Complexity

**ARM Template Generation:**
```typescript
// High-level synthesis pseudo-code
function synthesizeBackend(schema: SchemaObject, stack: Stack) {
  // 1. API Management instance
  const apim = new ApiManagementService(stack, 'ApiManagement', {
    name: 'apim-org-myapp-dev-eus-01',
    sku: { name: 'Consumption', capacity: 0 },
    publisherEmail: 'admin@example.com',
    publisherName: 'my-app'
  });

  // 2. API definition
  const api = new ApiManagementApi(stack, 'Api', {
    apiManagementService: apim,
    displayName: 'My App API',
    path: 'api',
    protocols: ['https']
  });

  // 3. For each CRUD model
  for (const modelName of getCrudModelNames(schema)) {
    // Generate 5 operations (get, list, create, update, delete)
    const operations = generateCrudOperations(modelName);

    for (const op of operations) {
      // 4. Create API operation
      new ApiManagementOperation(stack, `${op.id}Operation`, {
        api,
        operationId: op.id,
        method: op.method,
        urlTemplate: op.path
      });

      // 5. Create Azure Function
      new AzureFunction(stack, `${op.id}Function`, {
        functionApp,
        name: op.id,
        route: op.path,
        methods: [op.method],
        handler: generateFunctionCode(op, modelName)
      });

      // 6. Create operation policy (links APIM to Function)
      new ApiManagementOperationPolicy(stack, `${op.id}Policy`, {
        operation: op,
        backend: functionBackend,
        policies: {
          auth: { validateJwt: true },
          rateLimit: { calls: 100, renewalPeriod: 60 },
          cache: { duration: 60 }
        }
      });
    }
  }
}
```

**Complexity: Medium** (3-4 days for initial implementation)

### 2.7 REST Implementation

**Generated Endpoints:**
```
GET    /api/users         → listUsers()
GET    /api/users/{id}    → getUser(id)
POST   /api/users         → createUser(input)
PUT    /api/users/{id}    → updateUser(id, input)
PATCH  /api/users/{id}    → updateUser(id, input) [partial]
DELETE /api/users/{id}    → deleteUser(id)
```

**OpenAPI Spec (auto-generated):**
```yaml
openapi: 3.0.0
info:
  title: My App API
  version: 1.0.0
servers:
  - url: https://apim-org-myapp-dev-eus-01.azure-api.net/api
paths:
  /users:
    get:
      operationId: listUsers
      summary: List all users
      responses:
        '200':
          description: List of users
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserConnection'
    post:
      operationId: createUser
      summary: Create a new user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserInput'
      responses:
        '201':
          description: User created
```

### 2.8 GraphQL Implementation (Phase 2)

**Option A.1: GraphQL Passthrough**
```
Client (GraphQL query)
    ↓
API Management (/graphql endpoint)
    ↓
Azure Functions (Apollo Server)
    ↓
Cosmos DB
```

**Function Code:**
```typescript
// functions/graphql/index.ts
import { ApolloServer } from '@apollo/server';
import { startServerAndCreateHandler } from '@as-integrations/azure-functions';
import { typeDefs, resolvers } from './schema';

const server = new ApolloServer({
  typeDefs,
  resolvers
});

export default startServerAndCreateHandler(server);
```

**Auto-generated Schema:**
```graphql
type User {
  id: ID!
  email: String!
  name: String!
}

type Query {
  getUser(id: ID!): User
  listUsers(limit: Int): [User!]!
}

type Mutation {
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, input: UpdateUserInput!): User!
  deleteUser(id: ID!): Boolean!
}
```

**Complexity: High** (5-7 days for GraphQL support)

### 2.9 Recommendation

**Phase 1: REST only (2 weeks)**
- Implement API Management + Functions for REST
- Generate OpenAPI specification
- Basic CRUD operations

**Phase 2: Add GraphQL (1 week)**
- Add GraphQL endpoint to API Management
- Generate GraphQL schema from models
- Implement Apollo Server in Functions

**Rationale:**
- REST is simpler to implement (80% of value for 20% of effort)
- REST is well-understood by developers
- GraphQL can be added later without breaking REST
- Both can coexist (users choose what they prefer)

---

## 3. Option B: Azure Functions Only (No API Management)

### 3.1 Architecture

```
Client Request
    ↓
Azure Functions (Direct HTTP trigger)
├─ Authentication (custom middleware)
├─ Rate limiting (custom logic or Redis)
├─ Caching (custom logic or Redis)
├─ CRUD handlers
└─ Validation
    ↓
Cosmos DB
```

### 3.2 Pros

- ✅ **Simpler architecture** - One service instead of two
- ✅ **Lower cost** - No API Management fees
- ✅ **Faster development** - Less configuration
- ✅ **Direct control** - All logic in Functions

### 3.3 Cons

- ❌ **No centralized gateway** - Each function is separate endpoint
- ❌ **Manual auth** - Must implement JWT validation in every function
- ❌ **Manual rate limiting** - Requires Redis or custom solution
- ❌ **No caching** - Must implement caching manually
- ❌ **No developer portal** - Manual API documentation
- ❌ **Harder to version** - Must implement versioning in code
- ❌ **More code** - Repeat auth/rate limiting/caching logic

### 3.4 Cost Analysis

**Development:**
```
Azure Functions Consumption: $0.20 per 1M executions (first 1M free)
Cosmos DB Serverless: $0.25 per 1M RU
Redis Cache (if needed): $20/month (Basic tier)

Example: 100K requests/month
- Functions: Free
- Cosmos DB: ~$5/month
- Redis: $20/month (if rate limiting needed)
Total: ~$25/month (5x more than Option A for dev)
```

**Verdict:** More expensive than Option A for development due to Redis requirement for rate limiting/caching.

### 3.5 Recommendation

**NOT RECOMMENDED**

**Reasons:**
- Loses centralized API management features
- More expensive due to Redis requirement
- More code to maintain (auth/rate limiting/caching)
- Less Azure-idiomatic (API Management is the recommended pattern)
- Harder to add features (versioning, transformations, policies)

---

## 4. Option C: Container Apps + Functions (Over-Engineered)

### 4.1 Architecture

```
Client Request
    ↓
Azure Container Apps (GraphQL Server)
├─ Apollo Server (always-on)
├─ GraphQL schema
└─ Resolvers call Functions or direct Cosmos
    ↓
Azure Functions (Business Logic)
    ↓
Cosmos DB
```

### 4.2 Pros

- ✅ **Always-on GraphQL server** - No cold start for GraphQL
- ✅ **Better for complex GraphQL** - DataLoader, batching, subscriptions
- ✅ **Microservices architecture** - Container Apps for frontend, Functions for backend

### 4.3 Cons

- ❌ **Over-complicated** - Too many moving parts for CRUD
- ❌ **Higher cost** - Container Apps minimum $30/month (vs Consumption free tier)
- ❌ **More deployment complexity** - Docker images + Functions
- ❌ **Overkill for CRUD** - Not necessary for simple operations

### 4.4 Cost Analysis

```
Container Apps: $30/month minimum (0.5 vCPU, 1 GB)
Azure Functions: $0.20 per 1M executions
Cosmos DB: $0.25 per 1M RU

Example: 100K requests/month
- Container Apps: $30/month
- Functions: Free
- Cosmos DB: ~$5/month
Total: ~$35/month (7x more than Option A)
```

### 4.5 Recommendation

**NOT RECOMMENDED** for initial implementation.

**Reconsider if:**
- Real-time subscriptions are critical (SignalR alternative exists)
- GraphQL batching/DataLoader is required
- Complex business logic needs always-on service

---

## 5. Decision Matrix

| Criteria | Option A (APIM + Functions) | Option B (Functions Only) | Option C (Containers + Functions) |
|----------|----------------------------|---------------------------|----------------------------------|
| **Cost (Dev)** | ✅ $5/month | ⚠️ $25/month | ❌ $35/month |
| **Cost (Prod)** | ⚠️ $1,400/month | ✅ $200/month | ❌ $2,000/month |
| **Complexity** | ⚠️ Medium | ✅ Low | ❌ High |
| **Features** | ✅ Full (auth, rate limit, cache, versioning) | ❌ Limited (manual implementation) | ✅ Full (but overkill) |
| **Gov Cloud** | ✅ Full support | ✅ Full support | ⚠️ Container Apps limited |
| **Scalability** | ✅ Excellent | ✅ Good | ✅ Excellent |
| **Cold Start** | ⚠️ Moderate | ⚠️ Moderate | ✅ None |
| **GraphQL** | ✅ Via Functions | ✅ Via Functions | ✅ Native |
| **REST** | ✅ Native | ✅ Native | ⚠️ Manual |
| **Type Safety** | ✅ TypeScript | ✅ TypeScript | ✅ TypeScript |
| **Local Dev** | ⚠️ Emulators | ✅ Functions Core Tools | ❌ Docker required |
| **Maintenance** | ⚠️ Two services | ✅ One service | ❌ Three services |
| **Azure Best Practice** | ✅ Recommended pattern | ⚠️ Valid but limited | ❌ Over-engineered |

**Winner: Option A (API Management + Functions)**

---

## 6. Recommended Architecture

### 6.1 Phase 1: REST API (MVP)

```
Schema Definition (TypeScript)
    ↓
Backend Definition
    ↓
Synthesis Process
    ↓
├─ API Management Instance
│  └─ REST API with operations
├─ Azure Functions
│  ├─ GET /users (listUsers)
│  ├─ GET /users/{id} (getUser)
│  ├─ POST /users (createUser)
│  ├─ PUT /users/{id} (updateUser)
│  └─ DELETE /users/{id} (deleteUser)
└─ Cosmos DB
   └─ Users container
    ↓
ARM Templates + Function Code + OpenAPI Spec
```

### 6.2 Phase 2: GraphQL API (Progressive Enhancement)

```
Same as Phase 1, plus:
    ↓
API Management
├─ REST API (/api/users)
└─ GraphQL API (/graphql)
    ↓
Azure Functions
├─ REST handlers (from Phase 1)
└─ GraphQL handler (Apollo Server)
    ↓
Cosmos DB
```

### 6.3 Generated Artifacts

**Phase 1 Output:**
```
arm.out/
├─ my-app.json (ARM template)
│  ├─ API Management service
│  ├─ API Management API
│  ├─ API Management operations
│  ├─ Function App
│  ├─ Cosmos DB
│  └─ Storage Account
├─ openapi.yaml (API spec)
└─ functions/
   ├─ package.json
   ├─ getUser/index.ts
   ├─ listUsers/index.ts
   ├─ createUser/index.ts
   ├─ updateUser/index.ts
   └─ deleteUser/index.ts
```

**Phase 2 Output (additional):**
```
arm.out/
├─ graphql-schema.graphql
└─ functions/
   └─ graphql/
      ├─ index.ts (Apollo Server)
      ├─ schema.ts (auto-generated)
      └─ resolvers.ts (auto-generated)
```

---

## 7. Implementation Plan

### 7.1 Phase 1: REST API (2 weeks)

**Week 1: API Management + Infrastructure**
1. Implement ApiManagementService construct
2. Implement ApiManagementApi construct
3. Implement ApiManagementOperation construct
4. Generate API operations from schema models
5. Configure API Management policies

**Week 2: Function Generation**
1. Implement function code templates
2. Generate CRUD functions for each model
3. Configure Function App settings
4. Package functions for deployment
5. End-to-end testing

**Deliverables:**
- REST API endpoints for all CRUD models
- OpenAPI specification
- Deployable ARM templates
- Function code

### 7.2 Phase 2: GraphQL API (1 week)

**Days 1-3: Schema Generation**
1. Generate GraphQL schema from models
2. Generate resolver functions
3. Configure Apollo Server

**Days 4-5: Integration**
1. Add GraphQL endpoint to API Management
2. Configure GraphQL policies
3. Test GraphQL queries

**Deliverables:**
- GraphQL schema file
- GraphQL endpoint
- Both REST and GraphQL working

### 7.3 Success Criteria

**Phase 1:**
```bash
# REST API works
curl https://apim-org-myapp-dev-eus-01.azure-api.net/api/users
# Returns: { "items": [], "hasMore": false }

# CRUD operations work
curl -X POST https://apim.../api/users -d '{"email":"test@example.com","name":"Test"}'
# Returns: { "id": "...", "email": "test@example.com", "name": "Test", ... }
```

**Phase 2:**
```graphql
# GraphQL queries work
query {
  listUsers {
    id
    email
    name
  }
}

# GraphQL mutations work
mutation {
  createUser(input: { email: "test@example.com", name: "Test" }) {
    id
    email
    name
  }
}
```

---

## 8. Trade-Offs Analysis

### 8.1 Why API Management is Worth It

**Initial Complexity:**
- ⚠️ More ARM resources to generate
- ⚠️ Policy configuration learning curve
- ⚠️ Two services to coordinate

**Long-Term Benefits:**
- ✅ **Security** - Built-in auth, rate limiting, IP filtering
- ✅ **Performance** - Response caching without code changes
- ✅ **Observability** - Analytics, logging, monitoring
- ✅ **Flexibility** - Add backends, transform requests, version APIs
- ✅ **Documentation** - Auto-generated developer portal
- ✅ **Future-proof** - Add OAuth, custom domains, products, etc.

**Verdict:** Worth the initial complexity for production-grade API.

### 8.2 Why REST Before GraphQL

**REST Benefits:**
- ✅ Simpler to implement (HTTP triggers native in Functions)
- ✅ Better caching (HTTP caching headers)
- ✅ Well-understood by most developers
- ✅ Easier debugging (direct HTTP calls)
- ✅ Smaller bundle size (no GraphQL server)

**GraphQL Benefits:**
- ✅ Flexible queries (client specifies fields)
- ✅ Single endpoint (no multiple requests)
- ✅ Type-safe queries (GraphQL schema)
- ✅ Real-time subscriptions (via extensions)

**Verdict:** Start with REST (80% use cases), add GraphQL for advanced scenarios.

---

## 9. Final Recommendation

### 9.1 Architecture Choice

**Recommended: Option A (API Management + Azure Functions)**

**Rationale:**
1. **Best practice** - Follows Azure recommended architecture
2. **Feature-rich** - Auth, rate limiting, caching out-of-the-box
3. **Government cloud** - Full support
4. **Cost-effective** - Consumption tier for development
5. **Scalable** - Production-ready with Standard tier
6. **Future-proof** - Easy to add features (versioning, transformations)

### 9.2 Implementation Approach

**Phase 1: REST (MVP)**
- API Management Consumption tier
- Azure Functions Consumption plan
- Cosmos DB Serverless
- OpenAPI specification generation
- CRUD operations for all models

**Phase 2: GraphQL (Enhancement)**
- Add GraphQL endpoint
- Apollo Server in Functions
- GraphQL schema generation
- Coexist with REST

### 9.3 Timeline

- **Phase 1:** 2 weeks (REST API)
- **Phase 2:** 1 week (GraphQL)
- **Total:** 3 weeks to feature parity with Amplify

### 9.4 Cost Projection

**Development:**
- ~$5/month (free tiers for APIM + Functions)

**Production:**
- ~$1,400/month for 10M requests/month
- Scales linearly with usage

---

## 10. Success Criteria

**How we'll validate this decision:**

1. ✅ **Auto-generation works** - Schema → API + Functions
2. ✅ **CRUD operations work** - All 5 operations per model
3. ✅ **Authentication works** - JWT validation via API Management
4. ✅ **Rate limiting works** - 100 calls/minute per subscription
5. ✅ **Caching works** - 60-second response cache
6. ✅ **OpenAPI spec generated** - Valid OpenAPI 3.0
7. ✅ **Developer portal works** - Auto-generated docs
8. ✅ **Government cloud works** - Deploys to Azure Government
9. ✅ **Local testing works** - Functions Core Tools
10. ✅ **Production-ready** - Scales to millions of requests

**Target: 10/10 success criteria met.**

---

## 11. Alternatives Considered and Rejected

### 11.1 Azure Static Web Apps with Functions (Backend for Frontend)

**Why rejected:**
- Optimized for static sites, not APIs
- Functions are limited (no consumption tier)
- No API Management features
- Better suited for JAMstack than backend APIs

### 11.2 Azure App Service with Express.js

**Why rejected:**
- Always-on (not serverless)
- Higher cost ($55/month minimum)
- No auto-scaling like Functions
- Manual deployment of Express app

### 11.3 Azure Kubernetes Service (AKS)

**Why rejected:**
- Massive overkill for CRUD APIs
- $150/month minimum (cluster cost)
- Complex deployment (Kubernetes manifests)
- Not serverless

---

## 12. Conclusion

**Decision: API Management + Azure Functions**

**Justification:**
- Best balance of features, cost, and complexity
- Follows Azure best practices
- Production-ready from day one
- Progressive enhancement path (REST → GraphQL)
- Full government cloud support

**Next steps:**
1. Implement BackendSynthesizer (orchestrates generation)
2. Implement ApiSynthesizer (generates API Management resources)
3. Implement FunctionSynthesizer (generates function code)
4. Test end-to-end deployment
5. Validate all success criteria

**Expected outcome:** Schema-first backend system with auto-generated REST APIs matching AWS Amplify Gen 2 capabilities for Azure.
