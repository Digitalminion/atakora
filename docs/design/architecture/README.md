# Atakora Gen 2 Architecture Documentation

**Status**: Design Phase
**Created**: 2025-10-14
**Target Release**: Q1 2025

## Overview

Atakora Gen 2 represents a complete redesign of the backend component API focused on **radical simplicity**, **exceptional developer experience**, and **production-ready defaults**.

**Goal**: Make defining Azure infrastructure as simple as defining API routes in Next.js.

## Core Principles

1. **Zero Boilerplate** - No manual App/Stack creation, no configuration passing
2. **Convention Over Configuration** - Smart defaults for everything
3. **Secure by Default** - Production-grade security out of the box
4. **Compliant by Design** - Automatic governance and audit logging
5. **Progressive Disclosure** - Simple tasks are simple, complex tasks are possible

## Architecture Documents

### 1. Core Architecture

#### [Atakora Gen 2 - Backend API Redesign](./atakora-gen2-design.md)

**The foundation document.** Defines the core vision and architecture.

**Key Concepts:**
- `defineBackend()` - Single function that does everything
- Component self-description via `componentType` property
- Automatic App/SubscriptionStack creation
- Configuration from `.atakora/manifest.json`

**The Ideal Experience:**
```typescript
// packages/backend/src/index.ts
import { defineBackend } from '@atakora/component';
import { feedbackApi } from './data/crud/feedback/resource';
import { processUploadFunction } from './functions/process-upload/resource';

const backend = defineBackend({
  feedbackApi,
  processUploadFunction,
});

export { backend };
```

**That's it.** No App, no SubscriptionStack, no manual configuration.

**Read this first** to understand the Gen 2 vision.

---

### 2. Component API Pattern

#### [Atakora Gen 2 - Unified `define*` API Pattern](./atakora-gen2-define-api.md)

**Defines the consistent API across all component types.**

**Key Concepts:**
- `defineCrudApi()` - CRUD API endpoints
- `defineFunction()` - Azure Functions
- `defineQueueProcessor()` - Queue-triggered processors
- `defineEventHandler()` - Event-driven handlers
- `defineInfrastructure()` - Infrastructure resources

**Benefits:**
- Predictable learning curve (learn once, use everywhere)
- Consistent imports
- Uniform configuration structure
- Better IDE autocomplete

**Example:**
```typescript
export const confirmPasswordReset = defineFunction({
  name: 'confirm-password-reset',
  entry: './handler.ts',
  runtime: 20,

  trigger: {
    type: 'http',
    authLevel: 'function',
    methods: ['POST'],
    route: 'auth/confirm-reset',
  },

  environment: {
    SUBSCRIPTION_ID: '${azure.subscriptionId}',
    USER_POOL_ID: '${backend.userPool.id}',
  },
});
```

**Read this** to understand how to define components.

---

### 3. Data Layer

#### [Atakora Gen 2 - Universal Data Layer](./atakora-gen2-data-layer.md)

**Defines unified schema system supporting both CRUD and GraphQL.**

**Key Concepts:**
- `a.schema()` - Universal schema definition
- `c.model()` - Simple CRUD REST APIs (auto-generated endpoints)
- `g.model()` - Full GraphQL with resolvers and subscriptions
- Unified authorization system (`allow.owner()`, `allow.groups()`)
- Custom mutations with Azure Function handlers

**Example:**
```typescript
export const data = defineData({
  schema: a.schema({
    // CRUD model - generates REST endpoints
    Organization: c.model({
      displayName: a.string().required(),
      created: a.datetime(),
    }).authorization(allow => [
      allow.owner(),
      allow.groups(['admins']),
    ]),

    // GraphQL model - full GraphQL schema
    Person: g.model({
      firstName: a.string().required(),
      lastName: a.string().required(),
      email: a.email().required(),
    }).authorization(allow => [allow.owner()]),
  }),

  mutations: {
    initiatePasswordReset: a.mutation()
      .arguments({ email: a.string().required() })
      .handler(a.handler.function(initPasswordReset))
      .authorization(allow => [allow.guest()]),
  },
});
```

**Read this** to understand data modeling and API generation.

---

### 4. Default Infrastructure

#### [Atakora Gen 2 - Default Backend Infrastructure](./atakora-gen2-default-backend-infrastructure.md)

**Defines what gets provisioned automatically with `defineBackend()`.**

**Essential Components (Always Provisioned):**
1. ✅ **Function App** - Serverless compute (Consumption in dev, Premium in prod)
2. ✅ **Storage Account** - Blobs, queues, tables (with pre-configured containers)
3. ✅ **Cosmos DB** - NoSQL database (Serverless in dev, Autoscale in prod)
4. ✅ **Application Insights** - APM and monitoring
5. ✅ **Log Analytics** - Centralized logging with 30/90-day retention
6. ✅ **Key Vault** - Secrets management (soft delete, purge protection)
7. ✅ **Managed Identity** - Passwordless authentication
8. ✅ **RBAC** - Least privilege access to all resources

**Highly Recommended (Production Defaults):**
9. ⚠️ **VNet + Private Endpoints** - Network isolation (prod only by default)
10. ⚠️ **API Management** - Rate limiting, caching, API gateway
11. ⚠️ **Service Bus** - Reliable messaging (better than Storage Queues)

**Optional (Opt-In):**
12. 🔘 **Redis Cache** - Session state, distributed caching
13. 🔘 **CDN** - Global content delivery
14. 🔘 **Azure AD B2C** - User authentication
15. 🔘 **Container Registry** - Custom container images

**Cost Estimates:**
- Dev: ~$25-100/month
- Prod: ~$3,500-4,000/month (includes APIM Premium)

**Read this** to understand default infrastructure and customization options.

---

### 5. Dynamic Tagging System

#### [Atakora Gen 2 - Dynamic Rule-Driven Tagging System](./atakora-gen2-dynamic-tagging-system.md)

**Defines comprehensive, rule-driven tagging that cascades from manifest to resources.**

**Tag Cascade Hierarchy:**
1. **Organization/Subscription** - Tenant, subscription-level tags
2. **Manifest (Project)** - ALL fields in manifest.json automatically become tags (dynamic!)
3. **Package** - Package-specific tags (backend, frontend, ml-pipeline)
4. **Backend Instance** - Unique hash for this backend deployment
5. **Stack** - Stack identifier (default, logging, network)
6. **Component Instance** - CRUD API, Function, etc. with unique hash
7. **Resource** - Individual resource metadata

**Key Features:**
- **Dynamic Manifest Tags** - Add ANY field to manifest.json, it becomes a tag
- **Package-Level Tags** - Different tags for backend vs frontend packages
- **Backend Instance Hash** - Query all resources for a specific backend
- **Component Grouping** - Find all resources created by a component
- **Rule-Driven** - Define custom tagging rules with conditions and transforms
- **Relationship Tracking** - Understand which resources work together

**Example:**
```json
// .atakora/manifest.json
{
  "project": "colorai",
  "environment": "nonprod",
  "team": "data-platform",        // ← Custom field
  "support-tier": "premium",      // ← Custom field
  "sla": "99.9",                  // ← Custom field

  "packages": {
    "backend": {
      "tags": {
        "layer": "backend",
        "runtime": "node20"
      }
    }
  }
}
```

All fields automatically become tags on every resource!

**Read this** to understand the sophisticated tagging system and cascade strategies.

---

### 6. Governance & Compliance

#### [Atakora Gen 2 - Governance, Compliance & Policy Management](./atakora-gen2-governance-compliance.md)

**Defines automatic governance, compliance, and audit logging.**

**Azure Policy Integration:**
- Built-in policies (HTTPS, TLS 1.2, managed identity, encryption)
- Custom policies (naming conventions, private endpoints in prod)
- Compliance framework policies (SOC 2, HIPAA, PCI DSS)
- Environment-specific enforcement (audit in dev, deny in prod)

**Comprehensive Audit Logging:**
- Activity logs (subscription-level operations)
- Resource logs (Cosmos, Storage, Key Vault, Functions)
- Pre-built KQL queries for common audits
- Automated daily/weekly reports

**Compliance Frameworks:**
- **SOC 2 Type II** - Access controls, encryption, change management
- **HIPAA** - Security management, workforce security, data protection
- **PCI DSS** - Network security, encryption, logging and monitoring

**Example:**
```typescript
const backend = defineBackend({
  feedbackApi,
}, {
  governance: {
    costCenter: 'ENG-001',
    businessUnit: 'AI Research',
    budgetOwner: 'engineering-lead@company.com',
    dataClassification: 'confidential',
    containsPII: true,
    complianceFrameworks: ['SOC2', 'HIPAA'],

    policies: {
      'disable-public-network-access': { effect: 'Deny' },
      custom: [
        { name: 'require-cost-center-tag', effect: 'Deny' },
      ],
    },

    audit: {
      retentionDays: 365,
      reports: [
        { name: 'daily-access-report', schedule: 'daily' },
      ],
    },
  },
});
```

**Read this** to understand governance, compliance, and audit requirements.

---

### 7. Authentication & Authorization

#### [Atakora Gen 2 - Authentication & Authorization](./atakora-gen2-authentication.md)

**Defines zero-config authentication with Entra ID and declarative authorization.**

**Key Concepts:**
- **Zero-config Entra ID** - Works out of the box with automatic app registration
- **Declarative authorization** - Rules defined in schema, not scattered in code
- **Multi-provider support** - Entra ID, custom JWT, API keys, managed identity
- **User context** - Strongly-typed user object available in all functions
- **Granular control** - Model-level, field-level, and operation-level rules

**Authentication Providers:**
1. ✅ **Entra ID (Azure AD)** - Default, zero configuration
2. ✅ **Custom JWT** - Auth0, Firebase, Okta, etc.
3. ✅ **API Keys** - Service-to-service authentication
4. ✅ **Managed Identity** - Azure resource authentication

**Authorization Patterns:**
```typescript
export const data = defineData({
  schema: a.schema({
    // Owner-based authorization
    Feedback: c.model({
      rating: a.number().required(),
      comment: a.string(),
    }).authorization(allow => [
      allow.owner(),              // Only owner can access
      allow.groups(['admins']),   // Admins can access all
    ]),

    // Guest access
    BlogPost: c.model({
      title: a.string().required(),
      content: a.string(),
    }).authorization(allow => [
      allow.guest().read(),         // Public read access
      allow.groups(['authors']),    // Authors can write
    ]),

    // Custom authorization
    Project: c.model({
      name: a.string().required(),
    }).authorization(allow => [
      allow.custom(({ user, record, operation }) => {
        // Complex business logic here
      }),
    ]),
  }),

  mutations: {
    // Public mutation (unauthenticated)
    initiatePasswordReset: a.mutation()
      .arguments({ email: a.string().required() })
      .handler(a.handler.function(resetPasswordFunction))
      .authorization(allow => [allow.guest()]),
  },
});
```

**Security Best Practices:**
- ✅ Token validation (signature, issuer, audience, expiration)
- ✅ HTTPS only with TLS 1.2+
- ✅ Strict CORS configuration
- ✅ Rate limiting per user
- ✅ Secrets in Key Vault
- ✅ Field-level authorization
- ✅ Managed identity for service-to-service

**Read this** to understand authentication integration and authorization patterns.

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

**Goal**: Set up type system and configuration infrastructure

- [ ] Move config utilities from CLI to `@atakora/lib`
  - `packages/lib/src/config/manifest-reader.ts`
  - `packages/lib/src/config/config-loader.ts`
  - `packages/lib/src/config/types.ts`
- [ ] Add `componentType` property to all components
  - `CrudApi` → `componentType = 'crud-api'`
  - `AzureFunction` → `componentType = 'azure-function'`
  - `QueueProcessor` → `componentType = 'queue-processor'`
- [ ] Create component type system
  - `packages/component/src/types.ts`
- [ ] Update tests for all changes

**Deliverable**: Components can self-identify their type

---

### Phase 2: Backend Auto-Initialization (Weeks 3-4)

**Goal**: Implement `defineBackend()` with default infrastructure

- [ ] Implement `defineBackend()` function
  - Automatic App/SubscriptionStack creation
  - Auto-load configuration from `.atakora/manifest.json`
  - Component routing based on `componentType`
- [ ] Create default infrastructure
  - Function App (environment-specific sizing)
  - Storage Account (with containers and queues)
  - Cosmos DB (Serverless/Autoscale based on environment)
- [ ] Implement observability defaults
  - Application Insights creation
  - Log Analytics workspace
  - Diagnostic settings for all resources
- [ ] Implement security defaults
  - Key Vault creation
  - Managed Identity configuration
  - RBAC assignments
- [ ] Add `backend.createStack()` for additional stacks
- [ ] Implement automatic tagging
  - Identity tags (project, environment, component)
  - Organization tags (cost-center, business-unit)
  - Lifecycle tags (created-by, created-date)

**Deliverable**: `defineBackend({ feedbackApi })` creates complete backend

---

### Phase 3: Unified API Pattern (Weeks 5-6)

**Goal**: Implement all `define*` functions

- [ ] Implement `defineCrudApi()`
  - Schema to Cosmos container
  - Auto-generate REST endpoints
  - Authorization middleware
- [ ] Implement `defineFunction()`
  - Support all trigger types (HTTP, blob, queue, timer)
  - Binding configuration
  - Template variable resolution
- [ ] Implement `defineQueueProcessor()`
  - Queue trigger configuration
  - Batch size and visibility timeout
- [ ] Implement `defineEventHandler()`
  - Event Grid integration
  - Event filtering
- [ ] Implement `defineInfrastructure()`
  - Wrapper for CDK resources
  - Stack placement guidance
- [ ] Add template variable resolution
  - `${azure.subscriptionId}`
  - `${backend.cosmos.endpoint}`
  - `${backend.functionApp.url}`

**Deliverable**: All component types use consistent `define*` pattern

---

### Phase 4: Data Layer (Weeks 7-8)

**Goal**: Implement universal schema with CRUD and GraphQL

- [ ] Implement schema builder
  - Field types (`a.string()`, `a.datetime()`, `a.email()`)
  - Relationships (`a.belongsTo()`, `a.hasMany()`)
  - Validation (`.required()`, `.min()`, `.max()`)
- [ ] Implement model builders
  - `c.model()` for CRUD REST APIs
  - `g.model()` for GraphQL
- [ ] Generate CRUD REST endpoints from `c.model()`
  - POST /api/{resource} - Create
  - GET /api/{resource}/:id - Read
  - GET /api/{resource} - List (with filters)
  - PATCH /api/{resource}/:id - Update
  - DELETE /api/{resource}/:id - Delete
- [ ] Generate GraphQL schema from `g.model()`
  - Type definitions
  - Query resolvers
  - Mutation resolvers
  - Subscription resolvers
- [ ] Implement authorization system
  - `allow.owner()`, `allow.groups()`, `allow.guest()`
  - Field-level authorization
  - Operation-level authorization
- [ ] Wire custom mutations to Azure Functions

**Deliverable**: `defineData()` generates both CRUD and GraphQL APIs

---

### Phase 5: Governance & Compliance (Weeks 9-10)

**Goal**: Implement automatic governance and compliance

- [ ] Implement Azure Policy integration
  - Built-in policy assignments
  - Custom policy definitions
  - Framework-specific policies (SOC 2, HIPAA, PCI DSS)
- [ ] Configure comprehensive audit logging
  - Activity logs to Log Analytics
  - Resource diagnostic settings
  - Pre-built KQL queries
- [ ] Implement automated reporting
  - Daily access reports
  - Weekly compliance reports
  - Policy violation alerts
- [ ] Create compliance dashboards
  - Policy compliance view
  - Security alerts
  - Cost by cost-center
- [ ] Add environment-specific policy enforcement
  - Audit mode in dev
  - Deny mode in prod

**Deliverable**: Every backend is compliant by default

---

### Phase 6: CLI & Generators (Weeks 11-12)

**Goal**: Update CLI for Gen 2 experience

- [ ] Update `atakora init` to create `.atakora/manifest.json`
- [ ] Create `atakora add-crud <name>` generator
  - Generate `resource.ts` with `defineCrudApi()`
  - Auto-update `index.ts` with import and component
- [ ] Create `atakora add-function <name>` generator
  - Generate `resource.ts` with `defineFunction()`
  - Generate `handler.ts` with template code
  - Auto-update `index.ts`
- [ ] Create `atakora add-data` generator
  - Generate `schema/resource.ts` with `defineData()`
  - Add example models (both CRUD and GraphQL)
- [ ] Update `atakora synth` for Gen 2
  - Detect Gen 2 backends automatically
  - Call `backend.synth()` instead of `app.synth()`
- [ ] Create migration tool: `atakora migrate gen2`
  - Scan for Gen 1 patterns
  - Generate Gen 2 equivalents
  - Automated import/export updates

**Deliverable**: CLI generators make Gen 2 effortless

---

### Phase 7: Testing & Refinement (Weeks 13-14)

**Goal**: Comprehensive testing and bug fixes

- [ ] Unit tests for all `define*` functions
- [ ] Integration tests for backend initialization
- [ ] End-to-end tests for full deployment
- [ ] Performance testing and optimization
- [ ] Security review
- [ ] Cost optimization review
- [ ] Developer feedback integration

**Deliverable**: Production-ready Gen 2

---

### Phase 8: Documentation & Migration (Weeks 15-16)

**Goal**: Complete documentation and migration guide

- [ ] Create comprehensive getting started guide
- [ ] Document all `define*` functions with examples
- [ ] Create migration guide from Gen 1 to Gen 2
- [ ] Create video tutorials
- [ ] Update all example projects to Gen 2
- [ ] Create troubleshooting guide
- [ ] Document breaking changes

**Deliverable**: Complete Gen 2 documentation

---

## Quick Start (Gen 2)

### 1. Initialize Project

```bash
atakora init
```

This creates `.atakora/manifest.json`:
```json
{
  "version": "2.0.0",
  "project": "colorai",
  "organization": "digitalproducts",
  "environment": "nonprod",
  "geography": "eastus2",
  "subscriptionId": "...",
  "tenantId": "...",
  "instance": 6
}
```

### 2. Create Backend

```typescript
// packages/backend/src/index.ts
import { defineBackend } from '@atakora/component';

const backend = defineBackend({});

export { backend };
```

This automatically provisions:
- Function App
- Storage Account
- Cosmos DB
- Application Insights
- Log Analytics
- Key Vault
- Managed Identity + RBAC

### 3. Add CRUD API

```bash
atakora add-crud feedback
```

```typescript
// packages/backend/src/data/crud/feedback/resource.ts (auto-generated)
import { defineCrudApi } from '@atakora/component';

export const feedbackApi = defineCrudApi({
  name: 'feedback',
  entityName: 'Feedback',
  schema: {
    rating: { type: 'number', required: true },
    comment: 'string',
  },
});
```

```typescript
// packages/backend/src/index.ts (auto-updated)
import { defineBackend } from '@atakora/component';
import { feedbackApi } from './data/crud/feedback/resource';

const backend = defineBackend({
  feedbackApi,  // ← Auto-added
});

export { backend };
```

### 4. Add Function

```bash
atakora add-function process-upload
```

```typescript
// packages/backend/src/functions/process-upload/resource.ts (auto-generated)
import { defineFunction } from '@atakora/component';

export const processUploadFunction = defineFunction({
  name: 'process-upload',
  entry: './handler.ts',
  runtime: 20,

  trigger: {
    type: 'blob',
    path: 'uploads/{name}',
  },

  environment: {
    COSMOS_ENDPOINT: '${backend.cosmos.endpoint}',
  },
});
```

### 5. Deploy

```bash
atakora synth
atakora deploy
```

**Done!** You now have a production-ready backend with:
- ✅ CRUD REST API for feedback
- ✅ Blob-triggered function
- ✅ Complete observability (App Insights + Log Analytics)
- ✅ Secure secrets management (Key Vault)
- ✅ Automatic tagging and governance
- ✅ Audit logging enabled
- ✅ RBAC configured

---

## Key Benefits

### Developer Experience

| Metric | Gen 1 | Gen 2 | Improvement |
|--------|-------|-------|-------------|
| Lines of boilerplate | 80-100 | <10 | 90% reduction |
| Time to add CRUD API | 15 min | <5 min | 66% faster |
| Time to add function | 10 min | <3 min | 70% faster |
| Onboarding time | 2 days | <4 hours | 75% faster |

### Code Quality

- **Merge conflict rate**: -90% (less boilerplate = fewer conflicts)
- **Type safety**: 100% (no `any` types)
- **Test coverage**: >85%

### Security & Compliance

- **Secure by default**: All resources use managed identity, private endpoints in prod
- **Compliant from day 1**: SOC 2, HIPAA, PCI DSS policies enforced automatically
- **Complete audit trail**: Every operation logged to Log Analytics
- **Cost transparency**: Automatic cost allocation by project/team

### Production Readiness

- **Observability**: Application Insights + Log Analytics configured automatically
- **Backup & DR**: Continuous backup for Cosmos DB
- **High Availability**: Multi-region ready, autoscale configured
- **Monitoring**: Default alerts for errors, latency, throttling

---

## Migration Strategy

### Side-by-Side Compatibility

Gen 1 and Gen 2 can coexist in the same codebase:

```typescript
// Gen 1 (still supported)
const app = new App();
const stack = new SubscriptionStack(app, 'ColorAI', { ... });
const crudBackend = createCrudBackend({ ... });

// Gen 2 (new pattern)
const backend = defineBackend({
  feedbackApi,
});
```

### Automatic Migration Tool

```bash
atakora migrate gen2
```

Scans your codebase and converts:
- `CrudApi.define()` → `defineCrudApi()`
- `AzureFunction.define()` → `defineFunction()`
- Manual App/Stack creation → `defineBackend()`

### Deprecation Timeline

- **Q1 2025**: Gen 2 released, Gen 1 supported
- **Q2 2025**: Gen 1 marked as deprecated
- **Q3 2025**: Gen 1 documentation archived
- **Q4 2025**: Gen 1 removed from codebase

**6-month migration window** with automated tooling.

---

## Success Metrics

### Target Metrics (6 months post-release)

- **Internal adoption**: 100% of new projects using Gen 2
- **Migration rate**: >75% of existing projects migrated
- **Developer satisfaction**: >4.5/5 rating
- **Time to first deployment**: <30 minutes (from init to deployed backend)
- **Documentation completeness**: 100% (all features documented with examples)

### ROI Calculation

**Time Savings:**
- 10 hours/week saved per developer (less boilerplate, fewer bugs)
- 5 developers = 50 hours/week = 2,600 hours/year
- At $100/hour = **$260,000/year in time savings**

**Reduced Incidents:**
- Secure by default = fewer security incidents
- Better observability = faster MTTR
- Estimated 20 hours/month saved on troubleshooting
- At $150/hour (incident response) = **$36,000/year**

**Faster Onboarding:**
- 2 days → 4 hours = 1.5 days saved per new developer
- 10 new developers/year = 15 days saved
- At $800/day = **$12,000/year**

**Total ROI: $308,000/year**

**Implementation Cost: $100,000** (16 weeks of development)

**Payback Period: 4 months**

---

## Contributing

This is the design phase. We're actively seeking feedback on:

1. API design - Is `defineBackend()` intuitive?
2. Default infrastructure - Are the defaults appropriate?
3. Governance - Do the automatic policies meet your compliance needs?
4. Migration strategy - Is the migration path clear?

**Provide feedback**: Create an issue or discussion in the repo.

---

## Next Steps

1. ✅ Review this documentation map
2. ✅ Approve Gen 2 architecture design
3. 🔲 Begin Phase 1 implementation (Foundation)
4. 🔲 Weekly check-ins on progress
5. 🔲 User testing at Week 8 milestone (after Data Layer)
6. 🔲 Release Gen 2 Alpha at Week 14
7. 🔲 Production release at Week 16

---

## Document Index

| Document | Purpose | Status |
|----------|---------|--------|
| [README.md](./README.md) | This document - architecture map | ✅ Complete |
| [atakora-gen2-design.md](./atakora-gen2-design.md) | Core Gen 2 architecture | ✅ Complete |
| [atakora-gen2-define-api.md](./atakora-gen2-define-api.md) | Unified `define*` API pattern | ✅ Complete |
| [atakora-gen2-data-layer.md](./atakora-gen2-data-layer.md) | Universal data layer (CRUD + GraphQL) | ✅ Complete |
| [atakora-gen2-default-backend-infrastructure.md](./atakora-gen2-default-backend-infrastructure.md) | Default infrastructure components | ✅ Complete |
| [atakora-gen2-dynamic-tagging-system.md](./atakora-gen2-dynamic-tagging-system.md) | Dynamic rule-driven tagging system | ✅ Complete |
| [atakora-gen2-governance-compliance.md](./atakora-gen2-governance-compliance.md) | Governance, compliance, audit logging | ✅ Complete |
| [atakora-gen2-authentication.md](./atakora-gen2-authentication.md) | Authentication & authorization | ✅ Complete |

---

**Last Updated**: 2025-10-14
**Version**: 2.0.0-design
**Maintainers**: Architecture Team
