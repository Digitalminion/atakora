# Design Documentation

**Navigation**: [Docs Home](../../README.md) > [Architecture](../README.md) > Design

---

## Overview

Technical design specifications and implementation plans for Atakora.

## Design Documents

### Core Infrastructure

- **[Project Structure Spec](../../design/architecture/project-structure-spec.md)** - Monorepo organization and package layout
- **[CDK Migration Review](../../design/architecture/cdk-migration-review.md)** - Migration from @atakora/lib to @atakora/cdk
- **[CDK Implementation Gap Analysis](../../design/architecture/cdk-implementation-gap-analysis.md)** - Feature completeness assessment
- **[CDK Reexport Implementation Plan](../../design/architecture/cdk-reexport-implementation-plan.md)** - Package structure optimization
- **[Industry Pattern Comparison](../../design/architecture/industry-pattern-comparison.md)** - CDK pattern comparisons across AWS, Azure, GCP

### Validation System

- **[Validation Integration Plan](../../design/architecture/validation-integration-plan.md)** - Schema validation implementation
- **[Validation Success Metrics](../../design/architecture/validation-success-metrics.md)** - Quality and performance targets
- **[Validation Task Breakdown](../../design/architecture/validation-task-breakdown.md)** - Implementation phases

### Azure Functions Support

- **[Azure Functions Architecture (ADR-006)](../../design/architecture/adr-006-azure-functions-architecture.md)** - Amplify-style pattern with handler.ts + resource.ts
- **[Azure Functions API Design](../../design/architecture/azure-functions-api-design.md)** - Complete TypeScript API specification
- **[Azure Functions API Examples](../../design/architecture/azure-functions-api-design-examples.md)** - Working code samples
- **[Azure Functions Synthesis Integration](../../design/architecture/azure-functions-synthesis-integration.md)** - Discovery and build pipeline
- **[Azure Functions Implementation Roadmap](../../design/architecture/azure-functions-implementation-roadmap.md)** - 8-week implementation plan
- **[Azure Functions Parallelization Analysis](../../design/architecture/azure-functions-parallelization-analysis.md)** - 5-agent parallel development strategy
- **[Resource Object Pattern (ADR-007)](../../design/architecture/adr-007-resource-object-pattern.md)** - Resource configuration pattern
- **[Resolver Auto-Detection (ADR-009)](../../design/architecture/adr-009-resolver-auto-detection.md)** - Function discovery mechanism

### API & GraphQL Support

- **[API Stack Architecture (ADR-010)](../../design/architecture/adr-010-api-stack-architecture.md)** - API infrastructure pattern
- **[GraphQL Resolver Architecture (ADR-011)](../../design/architecture/adr-011-graphql-resolver-architecture.md)** - GraphQL integration design
- **[GraphQL Advanced Features (ADR-012)](../../design/architecture/adr-012-graphql-advanced-features.md)** - Advanced GraphQL capabilities

### Security & Access Control

- **[Azure RBAC Grant Pattern (ADR-013)](../../design/architecture/adr-013-azure-rbac-grant-pattern.md)** - AWS CDK-inspired grant methods for Azure
- **[Azure RBAC API Design](../../design/architecture/azure-rbac-api-design.md)** - Complete TypeScript API for role assignments
- **[Azure RBAC vs AWS CDK Comparison](../../design/architecture/azure-rbac-aws-cdk-comparison.md)** - Pattern comparison and adaptation strategy

### Package Distribution

- **[NPM Package Distribution (ADR-005)](../../design/architecture/adr-005-npm-package-distribution.md)** - Package publishing strategy
- **[Documentation Split Strategy (ADR-004)](../../design/architecture/adr-004-documentation-split-strategy.md)** - Documentation organization
- **[Lib Internal CDK Exports (ADR-004)](../../design/architecture/adr-004-lib-internal-cdk-exports.md)** - Internal package architecture
- **[NPM Distribution Tasks](../../design/architecture/charlie-npm-distribution-tasks.md)** - Implementation task breakdown

## Post-Mortems

- **[Deployment Post-Mortem 001](../../adr/DEPLOYMENT-POST-MORTEM-001.md)** - Lessons learned from deployment issues
- **[Architectural Recommendations 001](../../adr/ARCHITECTURAL-RECOMMENDATIONS-001.md)** - System improvements

## See Also

- [Architecture Overview](../README.md)
- [API Reference](../../reference/api/README.md)
- [Contributing Guide](../../contributing/README.md)

---

**Last Updated**: 2025-10-10
