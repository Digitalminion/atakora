# Atakora Gen 2 Architecture

**Navigation**: [Docs Home](../../../README.md) > [Architecture](../../README.md) > [Design](../README.md) > Gen 2

---

## Overview

Atakora Gen 2 represents a complete redesign of the backend component API focused on **radical simplicity**, **exceptional developer experience**, and **production-ready defaults**.

**Goal**: Make defining Azure infrastructure as simple as defining API routes in Next.js.

**Status**: Design Phase
**Target Release**: Q1 2025

## Core Principles

1. **Zero Boilerplate** - No manual App/Stack creation, no configuration passing
2. **Convention Over Configuration** - Smart defaults for everything
3. **Secure by Default** - Production-grade security out of the box
4. **Compliant by Design** - Automatic governance and audit logging
5. **Progressive Disclosure** - Simple tasks are simple, complex tasks are possible

## Architecture Documents

### 1. Foundation: Core Architecture

**[Atakora Gen 2 Design](./ATAKORA-GEN2-Design.md)** - The foundation document

Defines the core vision and architecture:

- `defineBackend()` - Single function that does everything
- Component self-description via `componentType` property
- Automatic App/SubscriptionStack creation
- Configuration from `.atakora/manifest.json`

**Read this first** to understand the Gen 2 vision.

---

### 2. Component API

**[Unified `define*` API Pattern](./ATAKORA-GEN2-Define-Api.md)**

Consistent API across all component types:

- `defineCrudApi()` - CRUD API endpoints
- `defineFunction()` - Azure Functions
- `defineQueueProcessor()` - Queue-triggered processors
- `defineEventHandler()` - Event-driven handlers
- `defineInfrastructure()` - Infrastructure resources

**Read this** to understand how to define components.

---

### 3. Data Layer

**[Universal Data Layer](./ATAKORA-GEN2-Data-Layer.md)**

Unified schema system supporting both CRUD and GraphQL:

- `a.schema()` - Universal schema definition
- `c.model()` - Simple CRUD REST APIs
- `g.model()` - Full GraphQL with resolvers
- Unified authorization system
- Custom mutations with Azure Function handlers

**Read this** to understand data modeling and API generation.

---

### 4. Infrastructure

**[Default Backend Infrastructure](./ATAKORA-GEN2-Default-Backend-Infrastructure.md)**

What gets provisioned automatically with `defineBackend()`:

- Essential components (Function App, Storage, Cosmos, etc.)
- Highly recommended components (VNet, APIM, Service Bus)
- Optional components (Redis, CDN, B2C)
- Cost estimates and environment-specific sizing

**Read this** to understand default infrastructure and customization.

---

### 5. Tagging & Metadata

**[Dynamic Rule-Driven Tagging System](./ATAKORA-GEN2-Dynamic-Tagging-System.md)**

Comprehensive tagging that cascades from manifest to resources:

- Dynamic manifest tags (any field becomes a tag)
- Package-level tags
- Backend instance hash
- Component grouping
- Rule-driven tag application

**Read this** to understand the sophisticated tagging system.

---

### 6. Governance & Compliance

**[Governance, Compliance & Policy Management](./ATAKORA-GEN2-Governance-Compliance.md)**

Automatic governance and compliance:

- Azure Policy integration
- Comprehensive audit logging
- Compliance framework policies (SOC 2, HIPAA, PCI DSS)
- Environment-specific enforcement
- Automated reporting

**Read this** to understand governance and compliance requirements.

---

### 7. Authentication & Authorization

**[Authentication & Authorization](./ATAKORA-GEN2-Authentication.md)**

Zero-config authentication with declarative authorization:

- Zero-config Entra ID
- Multi-provider support
- Declarative authorization rules
- Strongly-typed user context
- Granular control (model, field, operation level)

**Read this** to understand authentication integration and authorization patterns.

---

### 8. Additional Topics

| Document                                                                         | Description                                 |
| -------------------------------------------------------------------------------- | ------------------------------------------- |
| [Deployment & State Management](./ATAKORA-GEN2-Deployment-State-Management.md)   | Deployment orchestration and state tracking |
| [Secrets & Config Management](./ATAKORA-GEN2-Secrets-Config-Management.md)       | Secrets management and configuration        |
| [Type Generation & IntelliSense](./ATAKORA-GEN2-Type-Generation-Intellisense.md) | Type generation and IDE support             |
| [Networking & Security](./ATAKORA-GEN2-Networking-Security.md)                   | Network isolation and security patterns     |

## Quick Start (Gen 2 Preview)

### 1. Initialize Project

```bash
atakora init
```

Creates `.atakora/manifest.json`:

```json
{
  "version": "2.0.0",
  "project": "colorai",
  "organization": "digitalproducts",
  "environment": "nonprod",
  "geography": "eastus2"
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
export const feedbackApi = defineCrudApi({
  name: 'feedback',
  entityName: 'Feedback',
  schema: {
    rating: { type: 'number', required: true },
    comment: 'string',
  },
});
```

### 4. Deploy

```bash
atakora synth
atakora deploy
```

**Done!** You now have a production-ready backend.

## Key Benefits

### Developer Experience

| Metric               | Gen 1  | Gen 2    | Improvement   |
| -------------------- | ------ | -------- | ------------- |
| Lines of boilerplate | 80-100 | <10      | 90% reduction |
| Time to add CRUD API | 15 min | <5 min   | 66% faster    |
| Time to add function | 10 min | <3 min   | 70% faster    |
| Onboarding time      | 2 days | <4 hours | 75% faster    |

### Security & Compliance

- **Secure by default**: All resources use managed identity, private endpoints in prod
- **Compliant from day 1**: SOC 2, HIPAA, PCI DSS policies enforced automatically
- **Complete audit trail**: Every operation logged to Log Analytics
- **Cost transparency**: Automatic cost allocation by project/team

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

- Type system and configuration infrastructure
- Component self-identification

### Phase 2: Backend Auto-Initialization (Weeks 3-4)

- `defineBackend()` implementation
- Default infrastructure provisioning

### Phase 3: Unified API Pattern (Weeks 5-6)

- All `define*` functions
- Template variable resolution

### Phase 4: Data Layer (Weeks 7-8)

- Schema builder
- CRUD and GraphQL generation

### Phase 5: Governance & Compliance (Weeks 9-10)

- Azure Policy integration
- Audit logging and reporting

### Phase 6: CLI & Generators (Weeks 11-12)

- CLI updates for Gen 2
- Code generators

### Phase 7: Testing & Refinement (Weeks 13-14)

- Comprehensive testing
- Performance optimization

### Phase 8: Documentation & Migration (Weeks 15-16)

- Complete documentation
- Migration guide and tools

## Migration Strategy

### Side-by-Side Compatibility

Gen 1 and Gen 2 can coexist in the same codebase:

```typescript
// Gen 1 (still supported)
const app = new App();
const stack = new SubscriptionStack(app, 'ColorAI', { ... });

// Gen 2 (new pattern)
const backend = defineBackend({
  feedbackApi,
});
```

### Automatic Migration Tool

```bash
atakora migrate gen2
```

Converts Gen 1 patterns to Gen 2 automatically.

### Deprecation Timeline

- **Q1 2025**: Gen 2 released, Gen 1 supported
- **Q2 2025**: Gen 1 marked as deprecated
- **Q3 2025**: Gen 1 documentation archived
- **Q4 2025**: Gen 1 removed from codebase

**6-month migration window** with automated tooling.

## Success Metrics

### Target Metrics (6 months post-release)

- **Internal adoption**: 100% of new projects using Gen 2
- **Migration rate**: >75% of existing projects migrated
- **Developer satisfaction**: >4.5/5 rating
- **Time to first deployment**: <30 minutes
- **Documentation completeness**: 100%

### ROI Calculation

**Time Savings**: $260,000/year
**Reduced Incidents**: $36,000/year
**Faster Onboarding**: $12,000/year

**Total ROI**: $308,000/year
**Implementation Cost**: $100,000
**Payback Period**: 4 months

## Contributing

This is the design phase. We're actively seeking feedback on:

1. API design - Is `defineBackend()` intuitive?
2. Default infrastructure - Are the defaults appropriate?
3. Governance - Do the automatic policies meet compliance needs?
4. Migration strategy - Is the migration path clear?

**Provide feedback**: Create an issue or discussion in the repo.

## See Also

- [Architecture Decisions](../../decisions/) - Related ADRs
- [Current Architecture](../../README.md) - Gen 1 architecture
- [Internal Planning](../../../internal/) - Implementation tracking

---

**Last Updated**: 2025-10-28
**Status**: Design Phase
**Version**: 2.0.0-design
**Maintainers**: Architecture Team
