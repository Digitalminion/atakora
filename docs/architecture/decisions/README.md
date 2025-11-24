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
| [ADR-029](./ADR-029-CLI-SYNTHESIS-INTEGRATION-GAP.md) | CLI Synthesis Integration Gap  | 2025-11 | In Progress |

### Component Architecture & Implementation (030-055)

| ADR                                                  | Title                                   | Date    | Status      |
| ---------------------------------------------------- | --------------------------------------- | ------- | ----------- |
| [ADR-030](./ADR-030-COMPONENT-AUTH-SYSTEM.md)        | Component Auth System                   | 2025-11 | Accepted    |
| [ADR-031](./ADR-031-FLUENT-QUEUE-API.md)             | Fluent Queue API                        | 2025-11 | Accepted    |
| [ADR-032](./ADR-032-FUNCTION-INFRASTRUCTURE-SEPARATION.md) | Function Infrastructure Separation | 2025-11 | Accepted    |
| [ADR-033](./ADR-033-IMPLEMENTATION-SUMMARY.md)       | Implementation Summary                  | 2025-11 | Accepted    |
| [ADR-034](./ADR-034-SETTER-STYLE-BACKEND-API.md)     | Setter Style Backend API                | 2025-11 | Accepted    |
| [ADR-035](./ADR-035-UNIFIED-EVENTS-NAMESPACE.md)     | Unified Events Namespace                | 2025-11 | Accepted    |
| [ADR-036](./ADR-036-ATTACHMENT-POINT-IMPLEMENTATION.md) | Attachment Point Implementation      | 2025-11 | Accepted    |
| [ADR-038](./ADR-038-COMPONENT-SYNTHESIS-CDK-INTEGRATION.md) | Component Synthesis CDK Integration | 2025-11 | Accepted    |
| [ADR-039](./ADR-039-EXAMPLE-PACKAGES-LINTING-AUDIT.md) | Example Packages Linting Audit        | 2025-11 | Accepted    |
| [ADR-040](./ADR-040-FLUENT-API-UTILITIES-LOCATION.md) | Fluent API Utilities Location          | 2025-11 | Accepted    |
| [ADR-041](./ADR-041-POST-CRASH-ARCHITECTURAL-ASSESSMENT.md) | Post-Crash Architectural Assessment | 2025-11 | Accepted    |
| [ADR-042](./ADR-042-SYSTEM-STATE-ASSESSMENT.md)      | System State Assessment                 | 2025-11 | Accepted    |
| [ADR-043](./ADR-043-4-HOUR-PROGRESS-ASSESSMENT.md)   | 4-Hour Progress Assessment              | 2025-11 | Accepted    |
| [ADR-044](./ADR-044-CLI-SYNTHESIS-IMPLEMENTATION-PLAN.md) | CLI Synthesis Implementation Plan   | 2025-11 | Accepted    |
| [ADR-045](./ADR-045-SERVICE-REGISTRY-INJECTION.md)   | Service Registry Injection              | 2025-11 | Accepted    |
| [ADR-046](./ADR-046-SIMPLE-USE-CASE-PARITY.md)       | Simple Use Case Parity                  | 2025-11 | Accepted    |
| [ADR-047](./ADR-047-SYNTHESIS-STRATEGY.md)           | Synthesis Strategy                      | 2025-11 | Accepted    |
| [ADR-048](./ADR-048-COMPONENT-API-FUNCTION-SCHEMA-LAYERS.md) | Component API Function Schema Layers | 2025-11 | Accepted |
| [ADR-049](./ADR-049-FUNCTION-CONTEXT-ARCHITECTURE.md) | Function Context Architecture          | 2025-11 | Accepted    |
| [ADR-050](./ADR-050-MULTI-REGION-DEPLOYMENT.md)      | Multi-Region Deployment                 | 2025-11 | Accepted    |
| [ADR-051](./ADR-051-BUILDER-VALIDATION-STRATEGY.md)  | Builder Validation Strategy             | 2025-11 | Accepted    |
| [ADR-052](./ADR-052-GOVERNMENT-CLOUD-COMPLIANCE.md)  | Government Cloud Compliance             | 2025-11 | Accepted    |
| [ADR-053](./ADR-053-LINKED-TEMPLATE-ARCHITECTURE.md) | Linked Template Architecture            | 2025-11 | Accepted    |
| [ADR-054](./ADR-054-AUTHENTICATION-MIDDLEWARE-PATTERN.md) | Authentication Middleware Pattern   | 2025-11 | Accepted    |
| [ADR-055](./ADR-055-CIRCULAR-DEPENDENCY-RESOLUTION-AUDIT.md) | Circular Dependency Resolution Audit | 2025-11 | Accepted |

### Later Implementation Decisions (056-081)

| ADR                                                  | Title                                   | Date    | Status      |
| ---------------------------------------------------- | --------------------------------------- | ------- | ----------- |
| [ADR-056](./ADR-056-COMPONENT-AUTH-SYSTEM.md)        | Component Auth System                   | 2025-11 | Accepted    |
| [ADR-057](./ADR-057-FLUENT-QUEUE-API.md)             | Fluent Queue API                        | 2025-11 | Accepted    |
| [ADR-058](./ADR-058-FUNCTION-INFRASTRUCTURE-SEPARATION.md) | Function Infrastructure Separation | 2025-11 | Accepted    |
| [ADR-059](./ADR-059-IMPLEMENTATION-SUMMARY.md)       | Implementation Summary                  | 2025-11 | Accepted    |
| [ADR-060](./ADR-060-SETTER-STYLE-BACKEND-API.md)     | Setter Style Backend API                | 2025-11 | Accepted    |
| [ADR-061](./ADR-061-UNIFIED-EVENTS-NAMESPACE.md)     | Unified Events Namespace                | 2025-11 | Accepted    |
| [ADR-062](./ADR-062-ATTACHMENT-POINT-IMPLEMENTATION.md) | Attachment Point Implementation      | 2025-11 | Accepted    |
| [ADR-063](./ADR-063-CLI-SYNTHESIS-INTEGRATION-GAP.md) | CLI Synthesis Integration Gap         | 2025-11 | Accepted    |
| [ADR-064](./ADR-064-COMPONENT-SYNTHESIS-CDK-INTEGRATION.md) | Component Synthesis CDK Integration | 2025-11 | Accepted    |
| [ADR-065](./ADR-065-EXAMPLE-PACKAGES-LINTING-AUDIT.md) | Example Packages Linting Audit        | 2025-11 | Accepted    |
| [ADR-066](./ADR-066-FLUENT-API-UTILITIES-LOCATION.md) | Fluent API Utilities Location          | 2025-11 | Accepted    |
| [ADR-067](./ADR-067-POST-CRASH-ARCHITECTURAL-ASSESSMENT.md) | Post-Crash Architectural Assessment | 2025-11 | Accepted    |
| [ADR-068](./ADR-068-SYSTEM-STATE-ASSESSMENT.md)      | System State Assessment                 | 2025-11 | Accepted    |
| [ADR-069](./ADR-069-4-HOUR-PROGRESS-ASSESSMENT.md)   | 4-Hour Progress Assessment              | 2025-11 | Accepted    |
| [ADR-070](./ADR-070-CLI-SYNTHESIS-IMPLEMENTATION-PLAN.md) | CLI Synthesis Implementation Plan   | 2025-11 | Accepted    |
| [ADR-071](./ADR-071-SERVICE-REGISTRY-INJECTION.md)   | Service Registry Injection              | 2025-11 | Accepted    |
| [ADR-072](./ADR-072-SIMPLE-USE-CASE-PARITY.md)       | Simple Use Case Parity                  | 2025-11 | Accepted    |
| [ADR-073](./ADR-073-SYNTHESIS-STRATEGY.md)           | Synthesis Strategy                      | 2025-11 | Accepted    |
| [ADR-074](./ADR-074-COMPONENT-API-FUNCTION-SCHEMA-LAYERS.md) | Component API Function Schema Layers | 2025-11 | Accepted |
| [ADR-075](./ADR-075-FUNCTION-CONTEXT-ARCHITECTURE.md) | Function Context Architecture          | 2025-11 | Accepted    |
| [ADR-076](./ADR-076-MULTI-REGION-DEPLOYMENT.md)      | Multi-Region Deployment                 | 2025-11 | Accepted    |
| [ADR-077](./ADR-077-BUILDER-VALIDATION-STRATEGY.md)  | Builder Validation Strategy             | 2025-11 | Accepted    |
| [ADR-078](./ADR-078-GOVERNMENT-CLOUD-COMPLIANCE.md)  | Government Cloud Compliance             | 2025-11 | Accepted    |
| [ADR-079](./ADR-079-LINKED-TEMPLATE-ARCHITECTURE.md) | Linked Template Architecture            | 2025-11 | Accepted    |
| [ADR-080](./ADR-080-AUTHENTICATION-MIDDLEWARE-PATTERN.md) | Authentication Middleware Pattern   | 2025-11 | Accepted    |
| [ADR-081](./ADR-081-CIRCULAR-DEPENDENCY-RESOLUTION-AUDIT.md) | Circular Dependency Resolution Audit | 2025-11 | Accepted |

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

**2025-11-24**: Third major ADR consolidation

- Moved 26 additional ADRs from `/docs/design/architecture/` to `/docs/architecture/decisions/`
- Renumbered conflicting ADRs (020-028) to new sequence (056-081)
- Capitalized all ADR filenames to match standard format (ADR-XXX-TITLE.md)
- Updated ADR index with new entries
- Total of 81 ADRs now in consolidated location

**2025-11-24**: Second major ADR consolidation

- Moved 26 ADRs from `/docs/design/architecture/` to `/docs/architecture/decisions/`
- Renumbered conflicting ADRs (020-028) to new sequence (030-055)
- Capitalized all ADR filenames to match standard format (ADR-XXX-TITLE.md)
- Removed duplicate ADR-037 (same as ADR-029)
- Updated all cross-references

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
**Total ADRs**: 81
**Status**: 80 Accepted, 1 In Progress (ADR-029)
