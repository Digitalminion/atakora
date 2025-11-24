# Azure RBAC Design Documentation

**Navigation**: [Architecture](../../README.md) > [Design](../README.md) > RBAC

---

## Overview

Design specifications for Azure Role-Based Access Control (RBAC) implementation in Atakora. These documents detail how to implement AWS CDK-inspired grant patterns for Azure resources.

## Design Documents

- [Azure RBAC API Design](./AZURE-RBAC-API-Design.md) - Complete TypeScript API for role assignments
- [Azure RBAC AWS CDK Comparison](./AZURE-RBAC-AWS-CDK-Comparison.md) - Pattern comparison and adaptation strategy
- [Azure RBAC Implementation Plan](./AZURE-RBAC-Implementation-Plan.md) - Phased implementation approach

## Key Concepts

### Grant Pattern
Inspired by AWS CDK's grant methods, providing intuitive APIs like:
```typescript
storageAccount.grantRead(identity);
keyVault.grantSecretRead(functionApp);
```

### Role Assignment Scope
RBAC assignments can be scoped to:
- Resource level
- Resource group level
- Subscription level

### Built-in vs Custom Roles
The design supports both:
- Azure built-in roles (Reader, Contributor, etc.)
- Custom role definitions

## See Also

- [ADR-014: Azure RBAC Grant Pattern](../../decisions/ADR-014-AZURE-RBAC-GRANT-PATTERN.md)
- [RBAC Migration Guide](../../../../guides/rbac-migration.md)

---

**Last Updated**: 2025-11-24