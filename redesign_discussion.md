# Atakora Gen 2 Redesign - Discussion Context

**Created**: 2025-10-14
**Status**: Design Phase - Architecture Complete
**Purpose**: Context document for continuing Gen 2 redesign discussion across sessions

---

## Summary

We've completed the architectural design for **Atakora Gen 2** - a complete redesign of the backend component API focused on radical simplicity and exceptional developer experience.

**Core Goal**: Make defining Azure infrastructure as simple as defining API routes in Next.js.

**Current Status**: All major architectural documents are complete. Ready to discuss implementation priorities and remaining design gaps.

---

## What We've Designed

### ✅ 1. Core Architecture (`defineBackend()`)

**Document**: [`docs/design/architecture/atakora-gen2-design.md`](./docs/design/architecture/atakora-gen2-design.md)

**The Foundation**: Single `defineBackend()` function that eliminates all boilerplate.

```typescript
// packages/backend/src/index.ts
import { defineBackend } from '@atakora/component';
import { feedbackApi } from './data/crud/feedback/resource';

const backend = defineBackend({
  feedbackApi,
});

export { backend };
```

**Key Innovations:**
- Zero boilerplate - no manual App/SubscriptionStack creation
- Component self-description via `componentType` property
- Automatic configuration from `.atakora/manifest.json`
- Convention over configuration

---

### ✅ 2. Unified API Pattern (`define*` functions)

**Document**: [`docs/design/architecture/atakora-gen2-define-api.md`](./docs/design/architecture/atakora-gen2-define-api.md)

**All components use consistent `define*` pattern:**

- `defineCrudApi()` - CRUD REST endpoints
- `defineFunction()` - Azure Functions
- `defineQueueProcessor()` - Queue processors
- `defineEventHandler()` - Event handlers
- `defineInfrastructure()` - Custom infrastructure
- `defineData()` - Universal schema (CRUD + GraphQL)

**Example:**
```typescript
export const confirmPasswordReset = defineFunction({
  name: 'confirm-password-reset',
  entry: './handler.ts',
  runtime: 20,
  trigger: { type: 'http', methods: ['POST'] },
  environment: {
    SUBSCRIPTION_ID: '${azure.subscriptionId}',
    USER_POOL_ID: '${backend.userPool.id}',
  },
});
```

**Benefits**: Predictable learning curve, consistent imports, better autocomplete

---

### ✅ 3. Universal Data Layer

**Document**: [`docs/design/architecture/atakora-gen2-data-layer.md`](./docs/design/architecture/atakora-gen2-data-layer.md)

**Single schema supporting both CRUD REST APIs and GraphQL:**

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

**Key Features:**
- `a.schema()` - Universal schema builder
- `c.model()` - Auto-generates CRUD REST endpoints
- `g.model()` - Full GraphQL with resolvers
- Unified authorization system
- Custom mutations with Azure Function handlers

---

### ✅ 4. Default Infrastructure

**Document**: [`docs/design/architecture/atakora-gen2-default-backend-infrastructure.md`](./docs/design/architecture/atakora-gen2-default-backend-infrastructure.md)

**Everything `defineBackend()` provisions automatically:**

**Essential (Always Provisioned):**
1. ✅ Function App (Consumption/Premium based on environment)
2. ✅ Storage Account (with containers and queues)
3. ✅ Cosmos DB (Serverless/Autoscale)
4. ✅ Application Insights
5. ✅ Log Analytics Workspace
6. ✅ Key Vault (soft delete, purge protection)
7. ✅ Managed Identity
8. ✅ RBAC assignments

**Highly Recommended (Production):**
9. ⚠️ VNet + Private Endpoints
10. ⚠️ API Management
11. ⚠️ Service Bus

**Optional (Opt-In):**
12. 🔘 Redis Cache
13. 🔘 CDN
14. 🔘 Azure AD B2C
15. 🔘 Container Registry

**Cost Estimates:**
- Dev: ~$25-100/month
- Prod: ~$3,500-4,000/month

---

### ✅ 5. Dynamic Tagging System

**Document**: [`docs/design/architecture/atakora-gen2-dynamic-tagging-system.md`](./docs/design/architecture/atakora-gen2-dynamic-tagging-system.md)

**Comprehensive rule-driven tagging that cascades from manifest to resources:**

**Tag Cascade Hierarchy:**
1. Organization/Subscription
2. **Synthesis Run** (unique ID for each synthesis run)
3. Manifest (ALL fields → tags dynamically)
4. Package (backend, frontend, ml-pipeline)
5. Backend Instance (unique hash)
6. Stack (default, logging, network)
7. Component Instance (CRUD API, function)
8. Resource (only `resource-purpose` tag)

**Key Features:**
- **Dynamic manifest tags** - Add ANY field to manifest.json, it becomes a tag
- **Synthesis run ID** - Groups all resources deployed together
- **Package-level tags** - Different tags for different packages
- **Backend instance hash** - Query all resources for a backend
- **Component grouping** - Find all resources for a component
- **Rule-driven** - Custom tagging rules with conditions

**Example:**
```json
// .atakora/manifest.json
{
  "project": "colorai",
  "environment": "nonprod",
  "team": "data-platform",        // ← Custom field
  "support-tier": "premium",      // ← Custom field
  "sla": "99.9"                   // ← Custom field
}
```

All fields automatically become `atakora:*` tags on every resource!

**Recent Decision**: Resource-level tags simplified to only include `resource-purpose`. Azure already knows resource type, and config details belong in properties.

---

### ✅ 6. Governance & Compliance

**Document**: [`docs/design/architecture/atakora-gen2-governance-compliance.md`](./docs/design/architecture/atakora-gen2-governance-compliance.md)

**Automatic governance, compliance, and audit logging:**

**Azure Policy Integration:**
- Built-in policies (HTTPS, TLS 1.2, managed identity, encryption)
- Custom policies (naming, private endpoints in prod)
- Compliance frameworks (SOC 2, HIPAA, PCI DSS)
- Environment-specific enforcement (audit in dev, deny in prod)

**Comprehensive Audit Logging:**
- Activity logs (subscription operations)
- Resource logs (Cosmos, Storage, Key Vault, Functions)
- Pre-built KQL queries
- Automated daily/weekly reports

**Example:**
```typescript
const backend = defineBackend({
  feedbackApi,
}, {
  governance: {
    costCenter: 'ENG-001',
    dataClassification: 'confidential',
    complianceFrameworks: ['SOC2', 'HIPAA'],
    policies: {
      'disable-public-network-access': { effect: 'Deny' },
    },
    audit: {
      retentionDays: 365,
      reports: [{ name: 'daily-access-report', schedule: 'daily' }],
    },
  },
});
```

---

### ✅ 7. Authentication & Authorization

**Document**: [`docs/design/architecture/atakora-gen2-authentication.md`](./docs/design/architecture/atakora-gen2-authentication.md)

**Zero-config authentication with Entra ID, declarative authorization:**

**Authentication Providers:**
1. ✅ **Entra ID (Azure AD)** - Default, zero config
2. ✅ **Custom JWT** - Auth0, Firebase, Okta
3. ✅ **API Keys** - Service-to-service
4. ✅ **Managed Identity** - Azure resources

**Authorization Patterns:**
```typescript
export const data = defineData({
  schema: a.schema({
    Feedback: c.model({
      rating: a.number().required(),
    }).authorization(allow => [
      allow.owner(),              // Only owner
      allow.groups(['admins']),   // Admins
      allow.guest().read(),       // Public read
      allow.custom(({ user, record, operation }) => {
        // Complex logic
      }),
    ]),
  }),
});
```

**Key Features:**
- Entra ID works out of the box (auto app registration)
- User context in all functions (`context.user`)
- Field-level authorization
- Operation-level authorization (different rules for create/read/update/delete)
- Type-safe user object
- Generated client SDK with automatic auth

**Security:**
- Token validation, HTTPS only, strict CORS, rate limiting
- Secrets in Key Vault
- Managed identity for service-to-service

---

## Documentation Structure

**Master Index**: [`docs/design/architecture/README.md`](./docs/design/architecture/README.md)

**All Documents:**
1. [`atakora-gen2-design.md`](./docs/design/architecture/atakora-gen2-design.md) - Core architecture
2. [`atakora-gen2-define-api.md`](./docs/design/architecture/atakora-gen2-define-api.md) - Unified API pattern
3. [`atakora-gen2-data-layer.md`](./docs/design/architecture/atakora-gen2-data-layer.md) - Universal data layer
4. [`atakora-gen2-default-backend-infrastructure.md`](./docs/design/architecture/atakora-gen2-default-backend-infrastructure.md) - Default infrastructure
5. [`atakora-gen2-dynamic-tagging-system.md`](./docs/design/architecture/atakora-gen2-dynamic-tagging-system.md) - Tagging system
6. [`atakora-gen2-governance-compliance.md`](./docs/design/architecture/atakora-gen2-governance-compliance.md) - Governance
7. [`atakora-gen2-authentication.md`](./docs/design/architecture/atakora-gen2-authentication.md) - Authentication
8. [`atakora-gen2-secrets-config-management.md`](./docs/design/architecture/atakora-gen2-secrets-config-management.md) - Secrets & Config Management
9. [`atakora-gen2-type-generation-intellisense.md`](./docs/design/architecture/atakora-gen2-type-generation-intellisense.md) - Type Generation & IntelliSense
10. [`atakora-gen2-deployment-state-management.md`](./docs/design/architecture/atakora-gen2-deployment-state-management.md) - Deployment & State Management

All documents are complete and comprehensive.

---

## What We Haven't Designed Yet

### 🔲 1. Local Development & Testing (HIGH PRIORITY)

**The Gap**: Developers need to run/test backend locally before deploying.

**Questions:**
- How do developers run the backend locally?
- Hot reload during development?
- Local emulators for Cosmos/Storage/Functions?
- Environment switching (local → dev → staging → prod)?
- How to mock/stub Azure services for unit tests?

**Proposal**: `atakora dev` command that:
- Spins up local emulators (Azurite, Cosmos emulator)
- Runs functions locally with hot reload
- Provides local endpoint for testing
- Uses local configuration

**Status**: Not yet designed

---

### ✅ 2. Deployment & State Management

**Document**: [`docs/design/architecture/atakora-gen2-deployment-state-management.md`](./docs/design/architecture/atakora-gen2-deployment-state-management.md)

**Azure-native deployment with intelligent state tracking:**

**Core Features:**
- **Three-layer state system** - Azure Deployment History + Synthesis Run ID tags + Storage cache
- **Synthesis run ID** - Unique ID per deployment (`synth-20251014-153000-a8b2c4`)
- **Per-function bundling** - esbuild bundles each function separately for optimal cold starts
- **Output structure** - `arm.out/<backend-name>/<synth-run-id>/`
- **Blob lease locking** - Prevents concurrent deployments safely
- **Phased deployment** - Infrastructure → Functions → Configuration

**Deployment Flow:**
```bash
atakora deploy --env nonprod

1. Pre-flight validation (auth, secrets, locks)
2. Synthesis (templates, bundling, packaging)
3. Change detection and diff preview
4. Acquire deployment lock
5. Deploy in phases (infra, functions, config)
6. Tag resources, save outputs, release lock
```

**Commands:**
```bash
atakora deploy --env nonprod
atakora diff --env nonprod
atakora rollback --to <synth-run-id> --env nonprod
atakora drift --env nonprod
atakora deployments list --env nonprod
```

**Key Decisions:**
- No external state files (uses Azure Deployment History)
- v1: Full redeployment (ARM idempotency)
- v2: Incremental deployment with resource hashing
- Per-function bundling for optimal performance
- Clear error messages with actionable resolution steps

---

### ✅ 3. Secrets & Configuration Management

**Document**: [`docs/design/architecture/atakora-gen2-secrets-config-management.md`](./docs/design/architecture/atakora-gen2-secrets-config-management.md)

**Key Vault-first approach with automatic provisioning:**

**Core Features:**
- **Key Vault always provisioned** - Part of every backend
- **Type-safe secret access** - `getSecret()` with autocomplete
- **Local .env for development** - Simple workflow with `.env.local`
- **CLI for production secrets** - `atakora secrets set/get/list/validate`
- **Managed Identity first** - Minimize secrets through RBAC
- **Automatic validation** - Check required secrets before deployment

**Example:**
```typescript
const backend = defineBackend({
  feedbackApi,
}, {
  secrets: {
    SENDGRID_API_KEY: { required: true },
    STRIPE_SECRET_KEY: { required: true },
    SLACK_WEBHOOK_URL: { required: false },
  },
  config: {
    maxUploadSizeMb: 10,
    allowedOrigins: ['https://app.colorai.com'],
  },
});
```

**CLI Commands:**
```bash
atakora secrets set SENDGRID_API_KEY --env nonprod
atakora secrets list --env nonprod
atakora secrets validate --env nonprod
atakora secrets generate ENCRYPTION_KEY --type aes-256 --env nonprod
```

**Security:**
- RBAC-based access (developers can't access prod secrets)
- All operations audit logged
- Soft delete and purge protection
- Secrets never appear in command history

---

### ✅ 4. Type Generation & IntelliSense

**Document**: [`docs/design/architecture/atakora-gen2-type-generation-intellisense.md`](./docs/design/architecture/atakora-gen2-type-generation-intellisense.md)

**Enterprise multi-backend type generation with full IntelliSense:**

**Core Innovation:**
Unlike AWS Amplify (single backend only), Atakora supports **multiple independent backends from one frontend** with full type safety.

**Generated Per Backend:**
- `outputs.json` - Runtime config (endpoints, auth, introspection)
- `types.d.ts` - TypeScript interfaces for all models, functions, secrets, config
- `client.ts` - Type-safe client with CRUD operations
- `hooks.ts` - (Optional) React Query hooks

**Multi-Backend Example:**
```typescript
// Frontend talks to 3 backends with full type safety
import { userService } from '@my-org/user-service-client';
import { orderService } from '@my-org/order-service-client';
import { inventoryService } from '@my-org/inventory-service-client';

// Single Entra ID token works for all backends
const user = await userService.models.User.get('current');
const orders = await orderService.models.Order.list({ userId: user.id });
const products = await inventoryService.models.Product.list({ inStock: true });
```

**Key Features:**
- **Auto-generation during synthesis** - No manual codegen commands
- **Watch mode** - `atakora dev --watch` regenerates on changes
- **IntelliSense everywhere** - Schemas, secrets, config, backend resources
- **Committed to repo** - Types work immediately after `git clone`
- **Framework agnostic** - Works with React, Vue, Angular, vanilla TS

**Comparison to Amplify:**
- ✅ Multi-backend support (Amplify: single backend only)
- ✅ Shared authentication across backends
- ✅ Monorepo-friendly (workspace protocol)
- ✅ Independent deployment per backend

---

### 🔲 5. Networking & Security (MEDIUM PRIORITY)

**The Gap**: How to configure VNet, private endpoints, firewall?

**Questions:**
- VNet integration patterns?
- Private endpoints (when/how)?
- Firewall rules?
- Network isolation between environments?
- DDoS protection?
- WAF integration?

**Considerations:**
- Defaults in production?
- Optional in dev?
- Configuration in `defineBackend()`?

**Status**: Mentioned in default infrastructure but not fully designed

---

### 🔲 6. Performance & Scaling (LOW PRIORITY)

**The Gap**: How to optimize performance and scaling?

**Questions:**
- Cold start mitigation?
- Connection pooling for Cosmos?
- Caching layer (Redis)?
- Rate limiting per API?
- Auto-scaling rules?
- Performance budgets?

**Status**: Not yet designed

---

### 🔲 7. Resource Lifecycle & Cleanup (LOW PRIORITY)

**The Gap**: How to clean up old resources?

**Questions:**
- Resource naming conventions?
- Orphaned resource cleanup (old synthesis runs)?
- Resource locking (prevent deletion in prod)?
- Cost alerts and budgets?

**Considerations:**
- Synthesis run ID tagging helps identify old resources
- Automatic cleanup policies?
- Manual approval for cleanup in prod?

**Status**: Partially addressed by tagging system

---

### 🔲 8. Migration & Versioning (LOW PRIORITY)

**The Gap**: How to migrate from Gen 1 to Gen 2?

**Questions:**
- Gen 1 → Gen 2 migration path?
- Breaking changes strategy?
- How to version the backend itself?
- Database migrations (schema changes)?

**Considerations:**
- Migration tool: `atakora migrate gen2`
- Side-by-side compatibility?
- 6-month deprecation window?

**Status**: High-level strategy in README, details not designed

---

### 🔲 9. Error Messages & DX Polish (LOW PRIORITY)

**The Gap**: What do users see when things fail?

**Questions:**
- Error messages when synthesis fails?
- Error messages when deployment fails?
- Helpful suggestions?
- Validation before deployment?

**Status**: Not yet designed

---

### 🔲 10. Observability Deep Dive (LOW PRIORITY)

**The Gap**: Beyond default App Insights, what observability features?

**Questions:**
- Distributed tracing across services?
- Correlation IDs?
- Structured logging?
- Debugging deployed functions?
- Custom dashboards?

**Considerations:**
- App Insights is provisioned by default
- Need patterns for correlation
- Pre-built dashboards?

**Status**: Mentioned in default infrastructure but not fully designed

---

## Key Decisions Made

### 1. Tagging Simplification
**Decision**: Resource-level tags only include `resource-purpose`, not type or config details.

**Rationale**: Azure already knows resource type. Configuration belongs in resource properties, not tags.

**User Feedback**: "I think of these only purpose is really valuable the rest is on the resource"

---

### 2. Synthesis Run ID
**Decision**: Every synthesis run gets a unique ID shared across all resources.

**Format**: `synth-20251014-153000-b8d4e2a1`

**Rationale**: Track which resources were deployed together, enable rollback, find orphaned resources.

**User Feedback**: "I would like to see a unique id for the run this could be the full string that we generate during synthesis"

---

### 3. Zero-Config Entra ID
**Decision**: Entra ID authentication works out of the box with automatic app registration.

**Rationale**: Most common case should require zero configuration. Advanced users can customize.

---

### 4. Declarative Authorization
**Decision**: Authorization rules defined in schema, not scattered in code.

**Rationale**: Single source of truth, enforced consistently across all endpoints.

---

## Implementation Roadmap (16 Weeks)

**Phase 1 (Weeks 1-2)**: Foundation - Type system, componentType
**Phase 2 (Weeks 3-4)**: Backend auto-initialization, default infrastructure
**Phase 3 (Weeks 5-6)**: Unified API pattern (all define* functions)
**Phase 4 (Weeks 7-8)**: Data layer (CRUD + GraphQL)
**Phase 5 (Weeks 9-10)**: Governance & compliance
**Phase 6 (Weeks 11-12)**: CLI & generators
**Phase 7 (Weeks 13-14)**: Testing & refinement
**Phase 8 (Weeks 15-16)**: Documentation & migration

**Current Status**: Design phase complete, ready for implementation

---

## ROI & Success Metrics

**Time Savings**: $260,000/year (10 hours/week per developer)
**Reduced Incidents**: $36,000/year (better security, observability)
**Faster Onboarding**: $12,000/year (2 days → 4 hours)

**Total ROI**: $308,000/year
**Implementation Cost**: $100,000 (16 weeks)
**Payback Period**: 4 months

**Target Metrics (6 months post-release):**
- 100% of new projects using Gen 2
- >75% of existing projects migrated
- >4.5/5 developer satisfaction
- <30 minutes from init to deployed backend

---

## Next Discussion Topics

**Recommended Priority:**

1. **Local Development** (HIGHEST) - Can't ship without good dev experience
   - Design `atakora dev` command
   - Emulator strategy
   - Hot reload approach

2. **Type Generation** (HIGH) - Critical for DX
   - Auto-generate types from schema
   - Client SDK generation
   - IntelliSense for `backend.*` references

3. **Secrets Management** (HIGH) - Blocking for deployments
   - How to provide secrets
   - Environment-specific secrets
   - Rotation strategy

4. **Deployment & State** (MEDIUM) - Can start simple
   - State tracking approach
   - Incremental deployments
   - Rollback strategy

**Alternative**: Pick any undesigned area from the list above based on current priorities.

---

## How to Continue This Discussion

**Context**: All architectural design is complete. We have 7 comprehensive documents covering the core Gen 2 vision.

**Where We Left Off**: Just finished authentication/authorization design. Discussing what gaps remain and what to design next.

**Recommended Prompt**:

```
I'd like to continue the Atakora Gen 2 redesign discussion. We've completed all the major architectural documents (7 total).

Here's what's designed:
1. ✅ Core architecture (defineBackend)
2. ✅ Unified API pattern (define* functions)
3. ✅ Universal data layer (CRUD + GraphQL)
4. ✅ Default infrastructure
5. ✅ Dynamic tagging system
6. ✅ Governance & compliance
7. ✅ Authentication & authorization
8. ✅ Secrets & configuration management

Here's what we haven't designed yet:
1. 🔲 Local development & testing
2. 🔲 Deployment & state management
3. 🔲 Networking & security details
4. 🔲 Performance & scaling
5. 🔲 Resource lifecycle & cleanup
6. 🔲 Migration tooling details
7. 🔲 Error messages & DX polish
8. 🔲 Observability deep dive

I'd like to design [PICK ONE OR SAY "your recommendation"].

Please read redesign_discussion.md for full context.
```

**All documentation is in**: `docs/design/architecture/`

**Master index**: `docs/design/architecture/README.md`

---

## Files Modified in This Session

### Created:
- `docs/design/architecture/atakora-gen2-design.md`
- `docs/design/architecture/atakora-gen2-define-api.md`
- `docs/design/architecture/atakora-gen2-data-layer.md`
- `docs/design/architecture/atakora-gen2-default-backend-infrastructure.md`
- `docs/design/architecture/atakora-gen2-governance-compliance.md`
- `docs/design/architecture/atakora-gen2-dynamic-tagging-system.md`
- `docs/design/architecture/atakora-gen2-authentication.md`
- `docs/design/architecture/atakora-gen2-secrets-config-management.md`
- `docs/design/architecture/atakora-gen2-type-generation-intellisense.md`
- `docs/design/architecture/atakora-gen2-deployment-state-management.md`
- `docs/design/architecture/README.md`
- `redesign_discussion.md` (this file)

### Modified:
- `redesign_discussion.md` (updated with all design completions)
- `docs/design/architecture/atakora-gen2-data-layer.md` (added TODO for enhanced validation)

---

**Last Updated**: 2025-10-14
**Session**: Atakora Gen 2 Architecture Design
**Status**: Design Phase Complete - 10 Major Documents
