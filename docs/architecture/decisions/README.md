# Architectural Decision Records (ADR)

**Navigation**: [Docs Home](../../README.md) > [Architecture](../README.md) > Decisions

---

## Overview

This directory contains Architectural Decision Records (ADRs) documenting significant architectural and design decisions for the Atakora project.

## ADR Index

### Active Decisions

#### Core Infrastructure (001-004)

| ADR | Title | Date | Status |
|-----|-------|------|--------|
| [ADR-001](./adr-001-validation-architecture.md) | Validation Architecture | 2024-10 | Accepted |
| [ADR-002](./adr-002-manifest-schema.md) | Manifest Schema | 2024-10 | Accepted |
| [ADR-003](./adr-003-cdk-package-architecture.md) | CDK Package Architecture | 2024-10 | Accepted |
| [ADR-004](./adr-004-cross-resource-references.md) | Cross-Resource References | 2024-10 | Accepted |

#### Package Distribution & Documentation (005)

| ADR | Title | Date | Status |
|-----|-------|------|--------|
| [ADR-005](../../design/architecture/adr-005-npm-package-distribution.md) | NPM Package Distribution | 2024-10 | Accepted |

#### Azure Functions Support (006-009)

| ADR | Title | Date | Status |
|-----|-------|------|--------|
| [ADR-006](../../design/architecture/adr-006-azure-functions-architecture.md) | Azure Functions Architecture | 2024-10 | Accepted |
| [ADR-007](../../design/architecture/adr-007-resource-object-pattern.md) | Resource Object Pattern | 2024-10 | Accepted |
| [ADR-009](../../design/architecture/adr-009-resolver-auto-detection.md) | Resolver Auto-Detection | 2024-10 | Accepted |

#### API & GraphQL Support (010-012)

| ADR | Title | Date | Status |
|-----|-------|------|--------|
| [ADR-010](../../design/architecture/adr-010-api-stack-architecture.md) | API Stack Architecture | 2024-10 | Accepted |
| [ADR-011](../../design/architecture/adr-011-graphql-resolver-architecture.md) | GraphQL Resolver Architecture | 2024-10 | Accepted |
| [ADR-012](../../design/architecture/adr-012-graphql-advanced-features.md) | GraphQL Advanced Features | 2024-10 | Accepted |

#### Security & Access Control (013)

| ADR | Title | Date | Status |
|-----|-------|------|--------|
| [ADR-013](../../design/architecture/adr-013-azure-rbac-grant-pattern.md) | Azure RBAC Grant Pattern | 2024-10 | Accepted |

### Supporting Documentation

| Document | Title | Description |
|----------|-------|-------------|
| [ARCHITECTURAL-RECOMMENDATIONS-001](./ARCHITECTURAL-RECOMMENDATIONS-001.md) | Architectural Recommendations | Initial architectural guidance |
| [DEPLOYMENT-POST-MORTEM-001](./DEPLOYMENT-POST-MORTEM-001.md) | Deployment Post-Mortem | Lessons learned from deployment |

### Decision Process

1. **Proposal**: Create ADR with problem statement and options
2. **Discussion**: Team reviews and provides feedback
3. **Decision**: Team agrees on solution
4. **Implementation**: Changes are made
5. **Review**: Assess decision effectiveness

### ADR Template

Use this template for new ADRs:

```markdown
# ADR-XXX: Title

## Status
[Proposed | Accepted | Deprecated | Superseded by ADR-YYY]

## Context
What is the issue we're facing?

## Decision
What decision did we make?

## Consequences
What are the positive and negative outcomes?

## Alternatives Considered
What other options did we evaluate?
```

## Key Decisions

### Validation Architecture (ADR-001)

**Decision**: Use schema-driven validation with JSON Schema

**Rationale**:
- Leverages official ARM schemas
- Enables compile-time and runtime validation
- Provides clear error messages

### Manifest Schema (ADR-002)

**Decision**: Use `.atakora/manifest.json` for project configuration

**Rationale**:
- Single source of truth for package metadata
- Enables multi-package workspaces
- Git-friendly versioning

### CDK Package Architecture (ADR-003)

**Decision**: Split monolithic library into service-specific namespaces

**Rationale**:
- Reduces bundle size through tree-shaking
- Improves IDE performance
- Aligns with Azure service organization

### Cross-Resource References (ADR-004)

**Decision**: Use TypeScript object references, resolve at synthesis

**Rationale**:
- Type-safe references
- No string-based IDs
- Automatic dependency tracking

### Azure Functions Architecture (ADR-006)

**Decision**: Adopt AWS Amplify Gen 2 pattern with handler.ts + resource.ts separation

**Rationale**:
- Clean separation of runtime code from infrastructure configuration
- Auto-discovery through filesystem scanning
- Type-safe environment variable flow
- Developer-friendly local development experience

### Azure RBAC Grant Pattern (ADR-013)

**Decision**: Implement AWS CDK-style grant methods for Azure role assignments

**Rationale**:
- Familiar developer experience for AWS CDK users
- Semantic, resource-specific permission methods
- Automatic managed identity enablement
- Type-safe principal and role handling

## See Also

- [Architecture Overview](../README.md)
- [Design Documentation](../../design/architecture/)
- [Contributing Guide](../../contributing/README.md)

---

**Last Updated**: 2025-10-10
