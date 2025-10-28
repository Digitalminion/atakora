# Internal Planning & Analysis Documents

**Navigation**: [Docs Home](../README.md) > Internal

---

## Overview

This directory contains **internal planning artifacts, task breakdowns, analysis reports, and project management documents**. These files are for project team use and are not intended as user-facing documentation.

**Distinction from Architecture Documentation:**
- `/docs/architecture/` - User-facing architecture decisions and designs
- `/docs/internal/` - Internal planning, tasks, and project management

## Directory Structure

### `/planning/` - Project Planning Documents

Task breakdowns, implementation checklists, and coordination plans:

- `REST-API-TASK-BREAKDOWN.md` - REST API implementation tasks
- `backend-project-organization.md` - Backend package organization
- `build-configuration-guide.md` - Build system configuration
- `documentation-coordination-plan.md` - Documentation coordination
- `documentation-tasks.md` - Documentation task tracking
- `npm-distribution-implementation-checklist.md` - NPM distribution tasks
- `package-size-budget.md` - Package size management
- `schema-implementation-summary.md` - Schema implementation status
- `schema-implementation-template.md` - Schema implementation template

### `/analysis/` - Technical Analysis Reports

Deep-dive analysis and gap assessments:

- `cdk-type-compliance-analysis.md` - CDK type system compliance review
- `type-compliance-tickets-summary.md` - Type compliance ticket tracking
- `cdk-implementation-gap-analysis.md` - CDK implementation gaps
- `cdk-migration-review.md` - CDK migration assessment
- `infrastructure-documentation-summary.md` - Infrastructure docs audit

### `/tasks/` - Task Tracking & Implementation

Specific task tracking and implementation summaries:

- `TASK_UPDATE_REPORT.md` - Task status updates
- `charlie-npm-distribution-tasks.md` - NPM distribution tasks (agent: charlie)
- `validation-task-breakdown.md` - Validation implementation tasks
- `functions-storage-fix-summary.md` - Functions storage fix tracking
- `cdk-reexport-implementation-plan.md` - CDK re-export plan
- `validation-integration-plan.md` - Validation integration
- `azure-functions-implementation-roadmap.md` - Functions roadmap
- `linked-templates-implementation-roadmap.md` - Linked templates roadmap
- `REST-API-FINAL-SUMMARY.md` - REST API completion summary
- `validation-success-metrics.md` - Validation success metrics

### `/migration/` - Migration Status Reports

CDK migration tracking and status:

- `cdk-migration-summary.md` - Overall migration summary
- `migration-complete.md` - Migration completion report
- `network-migration-status.md` - Network package migration
- `storage-migration-status.md` - Storage package migration
- `web-migration-status.md` - Web package migration
- `week-0-setup.md` - Migration week 0 setup

## Usage Guidelines

### For Project Team

Use these documents to:
- Track implementation progress
- Coordinate across agents (Devon, Charlie, Felix, etc.)
- Plan sprints and milestones
- Document technical decisions during implementation
- Analyze gaps and plan improvements

### Document Lifecycle

1. **Planning** - Created during feature/epic planning
2. **Active** - Updated during implementation
3. **Complete** - Marked complete when work finishes
4. **Archive** - Moved to archive after 6 months (future)

### Creating New Internal Documents

**When to create an internal document vs ADR:**

| Document Type | Location | Purpose |
|---------------|----------|---------|
| Architecture Decision | `/docs/architecture/decisions/` | Long-term architectural decisions |
| Design Document | `/docs/architecture/design/` | Technical design specifications |
| Task Breakdown | `/docs/internal/planning/` | Sprint/epic task breakdowns |
| Analysis Report | `/docs/internal/analysis/` | Technical analysis and assessments |
| Implementation Status | `/docs/internal/tasks/` | Task tracking and progress |
| Migration Status | `/docs/internal/migration/` | Package migration tracking |

## See Also

- [Architecture Decisions](../architecture/decisions/) - ADRs
- [Design Documentation](../architecture/design/) - Technical designs
- [Contributor Guide](../contributor/) - How to contribute

---

**Last Updated**: 2025-10-28
**Purpose**: Internal project management and planning
