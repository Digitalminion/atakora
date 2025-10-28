# Architectural Decision Records (ADR)

**Navigation**: [Docs Home](../../README.md) > [Architecture](../README.md) > Decisions

---

## Overview

This directory contains Architectural Decision Records (ADRs) documenting significant architectural and design decisions for the Atakora project. All ADRs have been consolidated into a single, continuous sequence for easy navigation and reference.

**Last Consolidation**: 2025-10-28

## Complete ADR Index

### Core Infrastructure & Validation (001-005)

| ADR | Title | Date | Status |
|-----|-------|------|--------|
| [ADR-001](./adr-001-functions-storage-separation.md) | Azure Functions App Storage Separation | 2024-10 | Accepted ⭐ |
| [ADR-002](./adr-002-validation-architecture.md) | Multi-Layer Validation Architecture | 2024-10 | Accepted |
| [ADR-003](./adr-003-manifest-schema.md) | Manifest Schema & Multi-Package Architecture | 2024-10 | Accepted |
| [ADR-004](./adr-004-cdk-package-architecture.md) | CDK Package Architecture | 2024-10 | Accepted |
| [ADR-005](./adr-005-cross-resource-references.md) | Cross-Resource References | 2024-10 | Accepted |

### Package Distribution & Type System (006-008)

| ADR | Title | Date | Status |
|-----|-------|------|--------|
| [ADR-006](./adr-006-npm-package-distribution.md) | NPM Package Distribution | 2024-10 | Accepted |
| [ADR-007](./adr-007-azure-functions-architecture.md) | Azure Functions Architecture | 2024-10 | Accepted |
| [ADR-008](./adr-008-resource-object-pattern.md) | Resource Object Pattern | 2024-10 | Accepted |

### Deployment & Resolution (009-010)

| ADR | Title | Date | Status |
|-----|-------|------|--------|
| [ADR-009](./adr-009-deployment-orchestration.md) | Deployment Orchestration | 2024-10 | Accepted |
| [ADR-010](./adr-010-resolver-auto-detection.md) | Resolver Auto-Detection | 2024-10 | Accepted |

### API Architecture (011-016)

| ADR | Title | Date | Status |
|-----|-------|------|--------|
| [ADR-011](./adr-011-api-stack-architecture.md) | API Stack Architecture | 2024-10 | Accepted |
| [ADR-012](./adr-012-graphql-resolver-architecture.md) | GraphQL Resolver Architecture | 2024-10 | Accepted |
| [ADR-013](./adr-013-graphql-advanced-features.md) | GraphQL Advanced Features | 2024-10 | Accepted |
| [ADR-014](./adr-014-azure-rbac-grant-pattern.md) | Azure RBAC Grant Pattern | 2024-10 | Accepted |
| [ADR-015](./adr-015-rest-api-architecture.md) | REST API Architecture | 2024-10 | Accepted |
| [ADR-016](./adr-016-rest-advanced-features.md) | REST Advanced Features | 2024-10 | Accepted |

### Synthesis Pipeline (017-019)

| ADR | Title | Date | Status |
|-----|-------|------|--------|
| [ADR-017](./adr-017-linked-templates-default.md) | Linked Templates as Default | 2024-10 | Accepted ⭐ |
| [ADR-018](./adr-018-backend-api-redesign.md) | Backend API Redesign | 2024-10 | Accepted ⭐ |
| [ADR-019](./adr-019-synthesis-pipeline-refactoring.md) | Context-Aware Synthesis Pipeline | 2024-10 | Accepted ⭐ |

### Networking, Security & Advanced Patterns (020-026)

| ADR | Title | Date | Status |
|-----|-------|------|--------|
| [ADR-020](./adr-020-networking-security-strategy.md) | Networking & Security Strategy | 2024-10 | Accepted |
| [ADR-021](./adr-021-define-backend-pattern.md) | DefineBackend Pattern | 2024-10 | Accepted |
| [ADR-022](./adr-022-cdk-type-usage-standards.md) | CDK Type Usage Standards | 2024-10 | Accepted |
| [ADR-023](./adr-023-schema-type-structure.md) | Schema Type Structure | 2024-10 | Accepted |
| [ADR-024](./adr-024-documentation-split-strategy.md) | Documentation Split Strategy | 2024-10 | Accepted |
| [ADR-025](./adr-025-lib-internal-cdk-exports.md) | Lib Internal CDK Exports | 2024-10 | Accepted |
| [ADR-026](./adr-026-unified-crud-definition.md) | Unified CRUD Definition | 2024-10 | Accepted |
| [ADR-027](./adr-027-queue-processor-pattern.md) | Queue Processor Pattern | 2024-10 | Accepted |
| [ADR-028](./adr-028-trigger-pattern-consistency.md) | Trigger Pattern Consistency | 2024-10 | Accepted |

⭐ = Referenced in CLAUDE.md project documentation

### Supporting Documentation

Located in `supporting/` subdirectory:

| Document | Description |
|----------|-------------|
| [backend-api-redesign-dx-analysis.md](./supporting/backend-api-redesign-dx-analysis.md) | Developer Experience analysis for ADR-018 |
| [ARCHITECTURAL-RECOMMENDATIONS-001.md](./supporting/ARCHITECTURAL-RECOMMENDATIONS-001.md) | Initial architectural guidance |
| [DEPLOYMENT-POST-MORTEM-001.md](./supporting/DEPLOYMENT-POST-MORTEM-001.md) | Lessons learned from deployment |
| [backend-architecture-design.md](./supporting/backend-architecture-design.md) | Backend architecture design notes |
| [backend-implementation-guide.md](./supporting/backend-implementation-guide.md) | Backend implementation guidance |
| [backend-examples.ts](./supporting/backend-examples.ts) | Backend code examples |
| [backend-interfaces.ts](./supporting/backend-interfaces.ts) | Backend interface definitions |

## Decision Process

1. **Proposal**: Create ADR with problem statement and options
2. **Discussion**: Team reviews and provides feedback
3. **Decision**: Team agrees on solution
4. **Implementation**: Changes are made
5. **Review**: Assess decision effectiveness

## ADR Template

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

## Key Architectural Decisions

### Functions Storage Separation (ADR-001)

**Decision**: Azure Functions Apps must use dedicated storage accounts for runtime operations, separate from application data storage.

**Rationale**:
- Clear separation of concerns (runtime vs application data)
- Better security boundaries
- Performance isolation
- Simplified configuration

### Validation Architecture (ADR-002)

**Decision**: Implement 5-layer validation architecture catching errors at compile-time, build-time, and synthesis-time.

**Rationale**:
- Compile-time safety via TypeScript
- Fast feedback during development
- Precise, context-specific error messages
- Prevents deployment failures

### Manifest Schema (ADR-003)

**Decision**: Use `.atakora/manifest.json` for project configuration supporting multi-package workspaces.

**Rationale**:
- Single source of truth for package metadata
- Enables multi-package workspaces
- Git-friendly versioning
- npm workspace compatibility

### Linked Templates Default (ADR-017)

**Decision**: Make linked templates the default and only approach for ARM template synthesis.

**Rationale**:
- Solves 4MB ARM template size limit
- Enables scaling to hundreds of functions
- Hides complexity from developers
- Uses Azure Blob Storage for artifacts

### Backend API Redesign (ADR-018)

**Decision**: Implement Gen 2 backend API with radical simplification and zero boilerplate.

**Rationale**:
- 90% reduction in boilerplate code
- Exceptional developer experience
- Production-ready defaults
- Secure by default

### Context-Aware Synthesis Pipeline (ADR-019)

**Decision**: Separate metadata collection from ARM generation, allowing context-aware resource synthesis.

**Rationale**:
- Fixes cross-template reference failures
- Resources know their deployment context
- Enables correct ARM expression generation
- No post-generation fix-ups needed

## Consolidation History

**2025-10-28**: Major ADR consolidation
- Merged ADRs from `/docs/architecture/decisions/` and `/docs/design/architecture/`
- Created single continuous sequence (001-026)
- Resolved 5 ADR-001 conflicts
- Moved internal planning artifacts to `/docs/internal/`
- Organized design documents by topic

**Previous numbering conflicts resolved:**
- Multiple adr-001 files consolidated
- Multiple adr-003, adr-004 files renumbered
- adr-017 supplement moved to supporting/

## See Also

- [Architecture Overview](../README.md)
- [Design Documentation](../design/)
- [Contributing Guide](../../contributor/README.md)
- [Internal Planning Artifacts](../../internal/)

---

**Last Updated**: 2025-10-28
**Total ADRs**: 28
**Status**: All Accepted
