# Atakora System Design

**Version:** 1.0.0
**Date:** 2025-11-22
**Architect:** Becky (Staff Architect)
**Status:** Living Document

---

## Executive Summary

Atakora is a TypeScript-first Azure backend framework that enables developers to define cloud backends using schema definitions rather than imperative infrastructure code. The system automatically synthesizes ARM templates, handles authentication, manages data storage, and provides a complete development-to-deployment pipeline.

**Key Capabilities:**
- Schema-centric backend definition with full type inference
- Multi-provider authentication (Entra ID, API Keys, Custom)
- Automatic ARM template synthesis from backend definitions
- Progressive enhancement via attachment points
- Service registry for dependency injection
- Support for Azure Commercial and Government clouds
- Multi-region deployment support

---

## System Overview

### Goals

1. **Developer Productivity:** Define backends in minutes, not days
2. **Type Safety:** End-to-end TypeScript type inference
3. **Best Practices:** Security, compliance, and performance baked in
4. **Flexibility:** Simple defaults with progressive customization
5. **Azure Native:** First-class Azure integration

### Non-Goals

1. **Multi-Cloud:** Azure-specific, not cloud-agnostic
2. **Custom Runtime:** Leverage Azure Functions, not custom runtime
3. **ORM:** Use Cosmos DB SDK directly, not abstraction layer

---

## Architecture Principles

### 1. Schema-Centric Design

Everything starts with the schema. Models drive infrastructure.

```typescript
// Schema defines data
const schema = defineSchema({
  schema: a.schema({
    User: c.model({ ... }),
    Post: c.model({ ... }),
  }),
});

// Schema drives synthesis
// → User model → Cosmos DB container
// → Post model → Cosmos DB container
// → CRUD functions → Function App functions
```

### 2. Progressive Enhancement

Start simple, add complexity as needed.

```typescript
// Level 1: Minimal backend
const backend = defineBackend({
  schema,
  settings: { name: 'my-app' },
});

// Level 2: Add authentication
const backend = defineBackend({
  schema,
  authentication: defineAuth({ ... }),
  settings: { name: 'my-app' },
});

// Level 3: Customize infrastructure
backend.storage.database.attach({ throughput: 2000 });
backend.monitoring.appInsights.attach({ retention: 90 });
```

### 3. Type Safety Everywhere

TypeScript inference provides IDE autocomplete and compile-time validation.

```typescript
// Type inference from schema
const user = await context.database.User.get(id);
//    ^? { id: string; email: string; name: string }

// Type-safe service access
const generator = context.services.reportGenerator;
//    ^? ReportGeneratorService
```

### 4. Immutability

Backend objects and configurations are immutable.

```typescript
const backend = defineBackend({ ... });
// backend is frozen, cannot be modified directly

// Attachments create new immutable configs
backend.storage.database.attach({ ... });
// Original default preserved, attachment stored separately
```

### 5. Explicit Over Implicit

No magic, no hidden transformations. What you see is what you get.

```typescript
// Explicit authentication
authentication: defineAuth({
  Primary: auth.entra().tenant('...').clientId('...'),
})

// Explicit service registration
services: {
  reportGenerator: (context) => new ReportGeneratorService(),
}

// Explicit customization
backend.storage.database.attach({ throughput: 2000 });
```

---

## Component Architecture

### Package Structure

```
atakora/
├── packages/
│   ├── component/          # User-facing API
│   │   ├── schema/         # Schema definition API
│   │   ├── auth/           # Authentication API
│   │   ├── backend/        # Backend definition API
│   │   ├── functions/      # Function definition API
│   │   └── validation/     # Validation framework
│   │
│   ├── lib/                # Infrastructure synthesis
│   │   ├── synthesis/      # ARM template generation
│   │   ├── validators/     # ARM validators
│   │   ├── naming/         # Resource naming
│   │   └── utils/          # Shared utilities
│   │
│   └── cli/                # Command-line interface
│       ├── commands/       # CLI commands
│       └── utils/          # CLI utilities
│
└── docs/                   # Documentation
    ├── design/             # Design docs and ADRs
    └── api/                # API reference
```

### Component Package (User-Facing API)

**Responsibility:** Provide developer-friendly API for backend definition

**Key Modules:**
- `schema/`: Define data models (CRUD, Event, Function)
- `auth/`: Configure authentication providers
- `backend/`: Assemble schema + auth + settings
- `backend/attachment-point`: Progressive customization
- `functions/`: Define custom functions (future)
- `validation/`: Runtime data validation

**Dependencies:**
- Zero runtime dependencies
- Dev dependencies: TypeScript, Vitest

### Lib Package (Infrastructure Synthesis)

**Responsibility:** Generate ARM templates from backend definitions

**Key Modules:**
- `synthesis/backend/`: Backend-to-ARM adapter
- `synthesis/resources/`: Resource synthesizers (Cosmos, Functions, etc.)
- `validators/`: ARM template validation
- `naming/`: Azure resource naming conventions
- `deployment/`: Azure deployment orchestration

**Dependencies:**
- `@azure/arm-*`: Azure SDK for resource management
- ARM template validation libraries

### CLI Package

**Responsibility:** Command-line interface for development and deployment

**Key Commands:**
- `atakora init`: Create new backend project
- `atakora synth`: Generate ARM templates
- `atakora deploy`: Deploy to Azure
- `atakora diff`: Show deployment changes
- `atakora destroy`: Remove deployed resources

---

## Data Architecture

### Schema Types

#### 1. CRUD Models (c.model)

**Purpose:** Persistent data entities with CRUD operations

**Synthesis:**
- Cosmos DB container per model
- Partition key inferred or explicit
- Indexes based on field types
- CRUD function endpoints

**Example:**
```typescript
User: c.model({
  id: a.id(),
  email: a.string().email(),
  name: a.string(),
  createdAt: a.datetime().default('now'),
})
  .authorization(allow => [allow.owner('id')])

// Synthesizes to:
// - Cosmos container "users"
// - Partition key: /id
// - Indexes: email, name
// - Functions: getUser, listUsers, createUser, updateUser, deleteUser
```

#### 2. Event Models (e.model)

**Purpose:** Event-driven messaging and asynchronous processing

**Synthesis:**
- Service Bus queue per event
- Dead-letter queue
- Event handler function

**Example:**
```typescript
NotificationSent: e.model({
  id: a.id(),
  userId: a.string(),
  message: a.string(),
  sentAt: a.datetime(),
})

// Synthesizes to:
// - Service Bus queue "notification-sent"
// - Queue trigger function
// - Dead-letter queue for failures
```

#### 3. Function Models (f.model)

**Purpose:** Custom business logic with defined inputs/outputs

**Synthesis:**
- HTTP-triggered Azure Function
- Input/output validation

**Example:**
```typescript
GenerateReport: f.model({
  input: a.object({
    datasetId: a.string(),
    format: a.enum(['pdf', 'excel']),
  }),
  output: a.object({
    reportUrl: a.string(),
    generatedAt: a.datetime(),
  }),
})

// Synthesizes to:
// - HTTP trigger function /functions/generate-report
// - Request validation
// - Response typing
```

### Data Flow

```
┌─────────────┐
│   Client    │
│ Application │
└──────┬──────┘
       │ HTTP/HTTPS
       ▼
┌──────────────────┐
│  Traffic Manager │ (Multi-region)
│  / Front Door    │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Function App    │
│  (with Auth)     │
└──────┬───────────┘
       │
       ├──────────────────┐
       │                  │
       ▼                  ▼
┌────────────┐     ┌────────────┐
│  Cosmos DB │     │ Service Bus│
│ (CRUD data)│     │  (Events)  │
└────────────┘     └────────────┘
       │                  │
       │                  │
       ▼                  ▼
┌────────────────────────────┐
│   Application Insights     │
│  (Logging & Monitoring)    │
└────────────────────────────┘
```

---

## Security Architecture

### Defense in Depth

Multiple layers of security:

1. **Network Layer:**
   - VNet integration (optional)
   - Private endpoints
   - Network Security Groups
   - Azure Firewall

2. **Identity Layer:**
   - Entra ID authentication
   - Managed identity for services
   - API key rotation
   - MFA enforcement

3. **Application Layer:**
   - Input validation
   - Authorization rules
   - Rate limiting
   - CORS policies

4. **Data Layer:**
   - Encryption at rest (AES-256)
   - Encryption in transit (TLS 1.2+)
   - KeyVault for secrets
   - Row-level security

5. **Monitoring Layer:**
   - Security audit logs
   - Threat detection
   - Anomaly detection
   - Compliance reporting

### Authentication Flow

```
┌─────────┐
│ Client  │
└────┬────┘
     │ 1. Request with token
     ▼
┌──────────────────┐
│ Function App     │
│ ┌──────────────┐ │
│ │Auth Middleware│ │
│ └───────┬────┘  │
│         │        │
│ 2. Extract token│
│         │        │
│ 3. Validate     │
│    with provider│
│         │        │
└─────────┼────────┘
          │
     ┌────▼────┐
     │ Entra ID│ (JWT validation)
     └────┬────┘
          │
     ┌────▼────┐
     │ API Keys│ (Key lookup in KeyVault)
     └────┬────┘
          │
     ┌────▼────┐
     │ Custom  │ (Custom validation logic)
     └────┬────┘
          │
          │ 4. Create user context
          ▼
┌──────────────────┐
│ User Context     │
│ - userId         │
│ - email          │
│ - roles          │
└──────────────────┘
          │
          │ 5. Authorization check
          ▼
┌──────────────────┐
│ Function Handler │
└──────────────────┘
```

### Authorization Model

**Model-Level Authorization:**
```typescript
User: c.model({ ... })
  .authorization(allow => [
    allow.owner('id'),           // User can access own data
    allow.group('Admin').read(), // Admins can read all
    allow.public().read(),       // Anyone can read
  ])
```

**Field-Level Authorization:**
```typescript
User: c.model({
  email: a.string().authorize(allow => [allow.owner()]),
  privateNotes: a.string().authorize(allow => [allow.owner()]),
})
```

**Runtime Enforcement:**
```typescript
// Automatic enforcement in generated functions
async function getUser(id, context) {
  const user = await db.User.get(id);

  // Check authorization
  if (!canAccess(context.user, user, 'read')) {
    throw new ForbiddenError();
  }

  return user;
}
```

---

## Deployment Architecture

### Single-Region Deployment

```
┌────────────────────────────────────────────────┐
│              Azure Region (East US)             │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │         Resource Group                    │  │
│  │                                           │  │
│  │  ┌────────────┐      ┌────────────┐      │  │
│  │  │ Function   │      │  Cosmos DB │      │  │
│  │  │    App     │◄────▶│  Account   │      │  │
│  │  └─────┬──────┘      └────────────┘      │  │
│  │        │                                  │  │
│  │  ┌─────▼──────┐      ┌────────────┐      │  │
│  │  │  Storage   │      │  KeyVault  │      │  │
│  │  │  Account   │      │            │      │  │
│  │  └────────────┘      └────────────┘      │  │
│  │                                           │  │
│  │  ┌────────────┐      ┌────────────┐      │  │
│  │  │Application │      │Service Bus │      │  │
│  │  │ Insights   │      │ Namespace  │      │  │
│  │  └────────────┘      └────────────┘      │  │
│  └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
```

### Multi-Region Deployment (Active-Active)

```
┌──────────────────┐         ┌──────────────────┐
│   East US        │         │  West Europe     │
│  ┌────────────┐  │         │  ┌────────────┐  │
│  │ Function   │  │         │  │ Function   │  │
│  │    App     │  │         │  │    App     │  │
│  └─────┬──────┘  │         │  └─────┬──────┘  │
│        │         │         │        │         │
│  ┌─────▼──────┐  │         │  ┌─────▼──────┐  │
│  │  Cosmos    │◄─┼─────────┼─▶│  Cosmos    │  │
│  │  (Primary) │  │Replicate│  │ (Replica)  │  │
│  └────────────┘  │         │  └────────────┘  │
└────────┬─────────┘         └─────────┬────────┘
         │                             │
         │    ┌─────────────────┐      │
         └───▶│Traffic Manager  │◄─────┘
              │ (Performance)   │
              └─────────────────┘
```

### Government Cloud Deployment

```
┌────────────────────────────────────────────────┐
│     Azure Government (US Gov Virginia)         │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │    FedRAMP High Compliant Resources       │  │
│  │                                           │  │
│  │  ┌────────────┐      ┌────────────┐      │  │
│  │  │ Function   │      │  Cosmos DB │      │  │
│  │  │   App      │      │  (FIPS 140-2)     │  │
│  │  │ (TLS 1.2+) │      │            │      │  │
│  │  └────────────┘      └────────────┘      │  │
│  │         │                    │            │  │
│  │         └────────┬───────────┘            │  │
│  │                  │                        │  │
│  │            ┌─────▼──────┐                 │  │
│  │            │  KeyVault  │                 │  │
│  │            │(HSM-backed)│                 │  │
│  │            └────────────┘                 │  │
│  │                                           │  │
│  │  ┌──────────────────────────────┐        │  │
│  │  │    Log Analytics Workspace   │        │  │
│  │  │   (90-day retention)         │        │  │
│  │  └──────────────────────────────┘        │  │
│  │                                           │  │
│  │  No Public Endpoints - Private Only      │  │
│  └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
```

---

## Scalability Considerations

### Vertical Scaling

**Function App:**
- Consumption Plan: Auto-scale (0-200 instances)
- Premium Plan: 1-100 instances with always-on
- Dedicated Plan: Fixed capacity

**Cosmos DB:**
- Manual throughput: 400-100,000 RU/s per container
- Autoscale: Automatically scale between min/max
- Serverless: Pay-per-request (good for dev/test)

### Horizontal Scaling

**Multi-Region:**
- Deploy to multiple Azure regions
- Traffic Manager routes to nearest/healthiest region
- Cosmos DB replicates data across regions

**Partitioning:**
- Cosmos DB partitioned by key (e.g., userId)
- Service Bus partitioned queues
- Storage Account geo-replication

### Performance Optimization

**Caching:**
- Redis Cache (optional via attachment)
- CDN for static assets (optional)
- Function-level in-memory caching

**Database:**
- Efficient indexing based on query patterns
- Partition key selection critical
- Connection pooling in Function App

**Network:**
- VNet integration reduces latency
- Private endpoints avoid internet hops
- Regional deployment co-location

---

## Monitoring and Observability

### Telemetry Stack

```
Application Logs
      │
      ▼
┌──────────────────┐
│ Application      │
│   Insights       │
└────────┬─────────┘
         │
    ┌────┴──────────────────┐
    │                       │
    ▼                       ▼
┌─────────────┐      ┌─────────────┐
│Log Analytics│      │   Metrics   │
│  Workspace  │      │  Dashboard  │
└──────┬──────┘      └──────┬──────┘
       │                    │
       ▼                    ▼
┌─────────────────────────────┐
│    Azure Monitor Alerts     │
└─────────────────────────────┘
```

### Metrics Collected

**Application Metrics:**
- Request rate, duration, success rate
- Exception rate and types
- Dependency calls (Cosmos, Service Bus)
- Custom metrics (business KPIs)

**Infrastructure Metrics:**
- Function App CPU, memory, instances
- Cosmos DB RU consumption, latency
- Storage Account transactions, latency
- Network throughput

**Security Metrics:**
- Authentication failures
- Authorization violations
- Suspicious activity patterns
- Token expiration events

### Logging Strategy

**Log Levels:**
- Verbose: Development debugging
- Info: Normal operation events
- Warning: Recoverable issues
- Error: Failed operations
- Critical: System failures

**Structured Logging:**
```typescript
context.log.info('User created', {
  userId: user.id,
  email: user.email,
  source: 'signup-flow',
  timestamp: new Date().toISOString(),
});
```

**Log Retention:**
- Development: 7 days
- Staging: 30 days
- Production: 90 days
- Government: 180 days (compliance)

---

## Testing Strategy

### Unit Tests

**Coverage Target:** 90%+

**Test Framework:** Vitest

**What to Test:**
- Schema field validation
- Authentication provider logic
- Attachment point operations
- Service factory instantiation
- Validation rules

**Example:**
```typescript
describe('AttachmentPoint', () => {
  it('should attach custom configuration', () => {
    const point = createAttachmentPoint(backend, 'storage.database', {});
    point.attach({ throughput: 2000 });
    expect(point.isAttached()).toBe(true);
    expect(point.getConfig().throughput).toBe(2000);
  });
});
```

### Integration Tests

**Coverage Target:** Key user flows

**What to Test:**
- Backend definition to ARM synthesis
- Multi-provider authentication
- Attachment merging with defaults
- Service registry resolution

**Example:**
```typescript
describe('Backend to ARM Synthesis', () => {
  it('should synthesize CRUD backend', async () => {
    const backend = defineBackend({ ... });
    const template = await synthesize(backend);
    expect(template.resources).toContainEqual(
      expect.objectContaining({
        type: 'Microsoft.DocumentDB/databaseAccounts',
      })
    );
  });
});
```

### End-to-End Tests

**Coverage Target:** Critical deployment paths

**What to Test:**
- Full backend deployment to Azure
- Authentication flow with real tokens
- Data CRUD operations
- Multi-region failover

**Example:**
```typescript
describe('E2E Deployment', () => {
  it('should deploy and function correctly', async () => {
    const backend = defineBackend({ ... });
    await deploy(backend, testResourceGroup);

    // Test deployed endpoint
    const response = await fetch(functionUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(200);
  });
});
```

---

## Related Documentation

- [Architecture Decision Records](./decisions/)
- [API Reference](../reference/api/)
- [Migration Guides](../guides/migration/)
- [Examples](../../examples/)

---

**Document Status:** Living Document
**Last Updated:** 2025-11-22
**Next Review:** 2025-12-22
