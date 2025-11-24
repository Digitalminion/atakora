# Architectural Decision Records (ADR)

**Navigation**: [Docs Home](../../README.md) > [Architecture](../README.md) > Decisions

---

## Overview

This directory contains Architectural Decision Records (ADRs) documenting significant architectural and design decisions for the Atakora project. All ADRs have been consolidated into a single, continuous sequence for easy navigation and reference.

**Last Consolidation**: 2025-10-28

## Complete ADR Index

### Core Infrastructure & Validation (001-005)

| ADR                                                  | Title                                        | Date    | Status      |
| ---------------------------------------------------- | -------------------------------------------- | ------- | ----------- |
| [ADR-001](./ADR-001-FUNCTIONS-STORAGE-SEPARATION.md) | Azure Functions App Storage Separation       | 2024-10 | Accepted ⭐ |
| [ADR-002](./ADR-002-VALIDATION-ARCHITECTURE.md)      | Multi-Layer Validation Architecture          | 2024-10 | Accepted    |
| [ADR-003](./ADR-003-MANIFEST-SCHEMA.md)              | Manifest Schema & Multi-Package Architecture | 2024-10 | Accepted    |
| [ADR-004](./ADR-004-CDK-PACKAGE-ARCHITECTURE.md)     | CDK Package Architecture                     | 2024-10 | Accepted    |
| [ADR-005](./ADR-005-CROSS-RESOURCE-REFERENCES.md)    | Cross-Resource References                    | 2024-10 | Accepted    |

### Package Distribution & Type System (006-008)

| ADR                                                  | Title                        | Date    | Status   |
| ---------------------------------------------------- | ---------------------------- | ------- | -------- |
| [ADR-006](./ADR-006-NPM-PACKAGE-DISTRIBUTION.md)     | NPM Package Distribution     | 2024-10 | Accepted |
| [ADR-007](./ADR-007-AZURE-FUNCTIONS-ARCHITECTURE.md) | Azure Functions Architecture | 2024-10 | Accepted |
| [ADR-008](./ADR-008-RESOURCE-OBJECT-PATTERN.md)      | Resource Object Pattern      | 2024-10 | Accepted |

### Deployment & Resolution (009-010)

| ADR                                              | Title                    | Date    | Status   |
| ------------------------------------------------ | ------------------------ | ------- | -------- |
| [ADR-009](./ADR-009-DEPLOYMENT-ORCHESTRATION.md) | Deployment Orchestration | 2024-10 | Accepted |
| [ADR-010](./ADR-010-RESOLVER-AUTO-DETECTION.md)  | Resolver Auto-Detection  | 2024-10 | Accepted |

### API Architecture (011-016)

| ADR                                                   | Title                         | Date    | Status   |
| ----------------------------------------------------- | ----------------------------- | ------- | -------- |
| [ADR-011](./ADR-011-API-STACK-ARCHITECTURE.md)        | API Stack Architecture        | 2024-10 | Accepted |
| [ADR-012](./ADR-012-GRAPHQL-RESOLVER-ARCHITECTURE.md) | GraphQL Resolver Architecture | 2024-10 | Accepted |
| [ADR-013](./ADR-013-GRAPHQL-ADVANCED-FEATURES.md)     | GraphQL Advanced Features     | 2024-10 | Accepted |
| [ADR-014](./ADR-014-AZURE-RBAC-GRANT-PATTERN.md)      | Azure RBAC Grant Pattern      | 2024-10 | Accepted |
| [ADR-015](./ADR-015-REST-API-ARCHITECTURE.md)         | REST API Architecture         | 2024-10 | Accepted |
| [ADR-016](./ADR-016-REST-ADVANCED-FEATURES.md)        | REST Advanced Features        | 2024-10 | Accepted |

### Synthesis Pipeline (017-019)

| ADR                                                    | Title                            | Date    | Status      |
| ------------------------------------------------------ | -------------------------------- | ------- | ----------- |
| [ADR-017](./ADR-017-LINKED-TEMPLATES-DEFAULT.md)       | Linked Templates as Default      | 2024-10 | Accepted ⭐ |
| [ADR-018](./ADR-018-BACKEND-API-REDESIGN.md)           | Backend API Redesign             | 2024-10 | Accepted ⭐ |
| [ADR-019](./ADR-019-SYNTHESIS-PIPELINE-REFACTORING.md) | Context-Aware Synthesis Pipeline | 2024-10 | Accepted ⭐ |

### Networking, Security & Advanced Patterns (020-026)

| ADR                                                  | Title                          | Date    | Status   |
| ---------------------------------------------------- | ------------------------------ | ------- | -------- |
| [ADR-020](./ADR-020-NETWORKING-SECURITY-STRATEGY.md) | Networking & Security Strategy | 2024-10 | Accepted |
| [ADR-021](./ADR-021-DEFINE-BACKEND-PATTERN.md)       | DefineBackend Pattern          | 2024-10 | Accepted |
| [ADR-022](./ADR-022-CDK-TYPE-USAGE-STANDARDS.md)     | CDK Type Usage Standards       | 2024-10 | Accepted |
| [ADR-023](./ADR-023-SCHEMA-TYPE-STRUCTURE.md)        | Schema Type Structure          | 2024-10 | Accepted |
| [ADR-024](./ADR-024-DOCUMENTATION-SPLIT-STRATEGY.md) | Documentation Split Strategy   | 2024-10 | Accepted |
| [ADR-025](./ADR-025-LIB-INTERNAL-CDK-EXPORTS.md)     | Lib Internal CDK Exports       | 2024-10 | Accepted |
| [ADR-026](./ADR-026-UNIFIED-CRUD-DEFINITION.md)      | Unified CRUD Definition        | 2024-10 | Accepted |
| [ADR-027](./ADR-027-QUEUE-PROCESSOR-PATTERN.md)      | Queue Processor Pattern        | 2024-10 | Accepted |
| [ADR-028](./ADR-028-TRIGGER-PATTERN-CONSISTENCY.md)  | Trigger Pattern Consistency    | 2024-10 | Accepted |

⭐ = Referenced in AGENT.md project documentation

### Supporting Documentation

Located in `supporting/` subdirectory:

| Document                                                                                  | Description                               |
| ----------------------------------------------------------------------------------------- | ----------------------------------------- |
| [BACKEND-API-REDESIGN-DX-ANALYSIS.md](./supporting/BACKEND-API-REDESIGN-DX-ANALYSIS.md)   | Developer Experience analysis for ADR-018 |
| [ARCHITECTURAL-RECOMMENDATIONS-001.md](./supporting/ARCHITECTURAL-RECOMMENDATIONS-001.md) | Initial architectural guidance            |
| [DEPLOYMENT-POST-MORTEM-001.md](./supporting/DEPLOYMENT-POST-MORTEM-001.md)               | Lessons learned from deployment           |
| [BACKEND-ARCHITECTURE-DESIGN.md](./supporting/BACKEND-ARCHITECTURE-DESIGN.md)             | Backend architecture design notes         |
| [BACKEND-IMPLEMENTATION-GUIDE.md](./supporting/BACKEND-IMPLEMENTATION-GUIDE.md)           | Backend implementation guidance           |
| [BACKEND-EXAMPLES.ts](./supporting/BACKEND-EXAMPLES.ts)                                   | Backend code examples                     |
| [BACKEND-INTERFACES.ts](./supporting/BACKEND-INTERFACES.ts)                               | Backend interface definitions             |

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

**Last Updated**: 2025-11-24
**Total ADRs**: 29
**Status**: All Accepted
