# Azure Functions Design Documentation

**Navigation**: [Architecture](../../README.md) > [Design](../README.md) > Functions

---

## Overview

Design specifications and implementation details for Azure Functions support in Atakora. These documents define how functions are discovered, synthesized, and deployed using ARM templates.

## Design Documents

### Core Design
- [Azure Functions API Design](./AZURE-FUNCTIONS-API-Design.md) - Complete TypeScript API specification
- [Azure Functions API Design Examples](./AZURE-FUNCTIONS-API-Design-Examples.md) - Working code samples and patterns
- [Function Deployment Pattern](./FUNCTION-DEPLOYMENT-PATTERN.md) - Deployment strategies and best practices

### Integration & Synthesis
- [Azure Functions Synthesis Integration](./AZURE-FUNCTIONS-Synthesis-Integration.md) - Discovery and build pipeline
- [Azure Functions Parallelization Analysis](./AZURE-FUNCTIONS-Parallelization-Analysis.md) - Multi-agent development strategy
- [Functions Storage Provisioning](./FUNCTIONS-STORAGE-PROVISIONING.md) - Storage account management for functions

## Key Design Decisions

### Handler Pattern
Functions follow an Amplify-inspired pattern with separate handler and resource files:
- `handler.ts` - Function implementation
- `resource.ts` - Infrastructure configuration

### Auto-Discovery
Functions are automatically discovered during synthesis through directory scanning and convention-based patterns.

### Storage Separation
Each function app uses a dedicated storage account for runtime operations, separate from application data storage (see ADR-001).

## See Also

- [ADR-007: Azure Functions Architecture](../../decisions/ADR-007-AZURE-FUNCTIONS-ARCHITECTURE.md)
- [ADR-001: Functions Storage Separation](../../decisions/ADR-001-FUNCTIONS-STORAGE-SEPARATION.md)
- [Functions Guide](../../../../guides/azure-functions.md)

---

**Last Updated**: 2025-11-24