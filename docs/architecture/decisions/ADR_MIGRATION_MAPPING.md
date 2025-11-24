# ADR Migration Mapping
**Date**: 2025-11-24
**Migration**: From `/docs/design/architecture/` to `/docs/architecture/decisions/`

## ADR Number Mapping

| Old Location & Number | New Location & Number | Title |
|----------------------|----------------------|-------|
| `docs/design/architecture/adr-020-component-auth-system.md` | `docs/architecture/decisions/ADR-030-COMPONENT-AUTH-SYSTEM.md` | Component Auth System |
| `docs/design/architecture/adr-020-fluent-queue-api.md` | `docs/architecture/decisions/ADR-031-FLUENT-QUEUE-API.md` | Fluent Queue API |
| `docs/design/architecture/adr-020-function-infrastructure-separation.md` | `docs/architecture/decisions/ADR-032-FUNCTION-INFRASTRUCTURE-SEPARATION.md` | Function Infrastructure Separation |
| `docs/design/architecture/adr-020-implementation-summary.md` | `docs/architecture/decisions/ADR-033-IMPLEMENTATION-SUMMARY.md` | Implementation Summary |
| `docs/design/architecture/adr-020-setter-style-backend-api.md` | `docs/architecture/decisions/ADR-034-SETTER-STYLE-BACKEND-API.md` | Setter Style Backend API |
| `docs/design/architecture/adr-020-unified-events-namespace.md` | `docs/architecture/decisions/ADR-035-UNIFIED-EVENTS-NAMESPACE.md` | Unified Events Namespace |
| `docs/design/architecture/adr-021-attachment-point-implementation.md` | `docs/architecture/decisions/ADR-036-ATTACHMENT-POINT-IMPLEMENTATION.md` | Attachment Point Implementation |
| `docs/design/architecture/adr-021-cli-synthesis-integration-gap.md` | **REMOVED - Duplicate of ADR-029** | CLI Synthesis Integration Gap |
| `docs/design/architecture/adr-021-component-synthesis-cdk-integration.md` | `docs/architecture/decisions/ADR-038-COMPONENT-SYNTHESIS-CDK-INTEGRATION.md` | Component Synthesis CDK Integration |
| `docs/design/architecture/adr-021-example-packages-linting-audit.md` | `docs/architecture/decisions/ADR-039-EXAMPLE-PACKAGES-LINTING-AUDIT.md` | Example Packages Linting Audit |
| `docs/design/architecture/adr-021-fluent-api-utilities-location.md` | `docs/architecture/decisions/ADR-040-FLUENT-API-UTILITIES-LOCATION.md` | Fluent API Utilities Location |
| `docs/design/architecture/adr-021-post-crash-architectural-assessment.md` | `docs/architecture/decisions/ADR-041-POST-CRASH-ARCHITECTURAL-ASSESSMENT.md` | Post-Crash Architectural Assessment |
| `docs/design/architecture/adr-021-system-state-assessment.md` | `docs/architecture/decisions/ADR-042-SYSTEM-STATE-ASSESSMENT.md` | System State Assessment |
| `docs/design/architecture/adr-022-4-hour-progress-assessment.md` | `docs/architecture/decisions/ADR-043-4-HOUR-PROGRESS-ASSESSMENT.md` | 4-Hour Progress Assessment |
| `docs/design/architecture/adr-022-cli-synthesis-implementation-plan.md` | `docs/architecture/decisions/ADR-044-CLI-SYNTHESIS-IMPLEMENTATION-PLAN.md` | CLI Synthesis Implementation Plan |
| `docs/design/architecture/adr-022-service-registry-injection.md` | `docs/architecture/decisions/ADR-045-SERVICE-REGISTRY-INJECTION.md` | Service Registry Injection |
| `docs/design/architecture/adr-023-simple-use-case-parity.md` | `docs/architecture/decisions/ADR-046-SIMPLE-USE-CASE-PARITY.md` | Simple Use Case Parity |
| `docs/design/architecture/adr-023-synthesis-strategy.md` | `docs/architecture/decisions/ADR-047-SYNTHESIS-STRATEGY.md` | Synthesis Strategy |
| `docs/design/architecture/adr-024-component-api-function-schema-layers.md` | `docs/architecture/decisions/ADR-048-COMPONENT-API-FUNCTION-SCHEMA-LAYERS.md` | Component API Function Schema Layers |
| `docs/design/architecture/adr-024-function-context-architecture.md` | `docs/architecture/decisions/ADR-049-FUNCTION-CONTEXT-ARCHITECTURE.md` | Function Context Architecture |
| `docs/design/architecture/adr-024-multi-region-deployment.md` | `docs/architecture/decisions/ADR-050-MULTI-REGION-DEPLOYMENT.md` | Multi-Region Deployment |
| `docs/design/architecture/adr-025-builder-validation-strategy.md` | `docs/architecture/decisions/ADR-051-BUILDER-VALIDATION-STRATEGY.md` | Builder Validation Strategy |
| `docs/design/architecture/adr-025-government-cloud-compliance.md` | `docs/architecture/decisions/ADR-052-GOVERNMENT-CLOUD-COMPLIANCE.md` | Government Cloud Compliance |
| `docs/design/architecture/adr-026-linked-template-architecture.md` | `docs/architecture/decisions/ADR-053-LINKED-TEMPLATE-ARCHITECTURE.md` | Linked Template Architecture |
| `docs/design/architecture/adr-027-authentication-middleware-pattern.md` | `docs/architecture/decisions/ADR-054-AUTHENTICATION-MIDDLEWARE-PATTERN.md` | Authentication Middleware Pattern |
| `docs/design/architecture/adr-028-circular-dependency-resolution-audit.md` | `docs/architecture/decisions/ADR-055-CIRCULAR-DEPENDENCY-RESOLUTION-AUDIT.md` | Circular Dependency Resolution Audit |

## Cross-Reference Update Guide

When updating references in other documents:

### Old Reference Format → New Reference Format

- `adr-020` → `ADR-030` through `ADR-035` (depending on specific topic)
- `adr-021` → `ADR-036` through `ADR-042` (depending on specific topic)
- `adr-022` → `ADR-043` through `ADR-045` (depending on specific topic)
- `adr-023` → `ADR-046` through `ADR-047` (depending on specific topic)
- `adr-024` → `ADR-048` through `ADR-050` (depending on specific topic)
- `adr-025` → `ADR-051` through `ADR-052` (depending on specific topic)
- `adr-026` → `ADR-053`
- `adr-027` → `ADR-054`
- `adr-028` → `ADR-055`

## Notes

- ADR-037 was removed as it was a duplicate of ADR-029
- All ADRs have been capitalized to match the standard format: `ADR-XXX-TITLE.md`
- The original ADRs 020-028 in `/docs/architecture/decisions/` remain unchanged
- The new ADRs from `/docs/design/architecture/` have been renumbered to 030-055