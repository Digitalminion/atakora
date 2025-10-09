# Naming Conventions Reference

**Navigation**: [Docs Home](../README.md) > [Reference](./README.md) > Naming Conventions

---

## Overview

Atakora uses a consistent, context-aware naming convention system for all Azure resources. Names include organizational context (organization, project, environment) and follow Azure naming rules and best practices.

## Standard Naming Pattern

```
{prefix}-{identifier}-{environment}-{location}
```

### Components

| Component | Description | Examples | Required |
|-----------|-------------|----------|----------|
| `prefix` | Resource type abbreviation | `rg`, `vnet`, `st` | Yes |
| `identifier` | Resource-specific identifier | `myapp`, `backend` | Yes |
| `environment` | Deployment environment | `dev`, `staging`, `prod` | Yes |
| `location` | Azure region abbreviation | `eastus`, `westus2` | Yes |

### Examples

```
rg-myapp-prod-eastus              # Resource Group
vnet-myapp-prod-eastus            # Virtual Network
stmyappprod                       # Storage Account (no hyphens)
kv-myapp-prod-eastus              # Key Vault
app-myapp-prod-eastus             # App Service
```

## Resource Type Prefixes

### Networking

| Resource Type | Prefix | Example Name |
|---------------|--------|--------------|
| Virtual Network | `vnet` | `vnet-myapp-prod-eastus` |
| Subnet | `snet` | `snet-web-prod-eastus` |
| Network Security Group | `nsg` | `nsg-web-prod-eastus` |
| Public IP Address | `pip` | `pip-appgw-prod-eastus` |
| Application Gateway | `agw` | `agw-myapp-prod-eastus` |
| Private Endpoint | `pep` | `pep-storage-prod-eastus` |

### Storage

| Resource Type | Prefix | Example Name |
|---------------|--------|--------------|
| Storage Account | `st` | `stmyappprod` (no hyphens) |
| Blob Container | n/a | `assets`, `logs` |
| File Share | n/a | `shares`, `config` |

### Web & Compute

| Resource Type | Prefix | Example Name |
|---------------|--------|--------------|
| App Service Plan | `plan` | `plan-myapp-prod-eastus` |
| Web App | `app` | `app-myapp-prod-eastus` |
| Function App | `func` | `func-processor-prod-eastus` |
| Virtual Machine | `vm` | `vm-web01-prod-eastus` |

### Data

| Resource Type | Prefix | Example Name |
|---------------|--------|--------------|
| SQL Server | `sql` | `sql-myapp-prod-eastus` |
| SQL Database | `sqldb` | `sqldb-orders-prod` |
| Cosmos DB Account | `cosmos` | `cosmos-myapp-prod-eastus` |

### Security

| Resource Type | Prefix | Example Name |
|---------------|--------|--------------|
| Key Vault | `kv` | `kv-myapp-prod-eastus` |
| Managed Identity | `id` | `id-myapp-prod-eastus` |

### Management

| Resource Type | Prefix | Example Name |
|---------------|--------|--------------|
| Resource Group | `rg` | `rg-myapp-prod-eastus` |
| Log Analytics Workspace | `log` | `log-myapp-prod-eastus` |
| Application Insights | `appi` | `appi-myapp-prod-eastus` |

## Special Cases

### Storage Account Names

Storage accounts have strict naming requirements:
- 3-24 characters
- Lowercase letters and numbers only
- Must be globally unique

**Pattern**: `st{identifier}{environment}`

**Examples**:
```
stmyappprod           # Production storage
stmyappdev            # Development storage
stmyappstagingdata    # Staging data storage
```

### Key Vault Names

Key Vaults must be globally unique and 3-24 characters:

**Pattern**: `kv-{identifier}-{environment}-{location}`

**Examples**:
```
kv-myapp-prod-eastus
kv-backend-staging-westus2
```

### Resource Groups

Resource groups organize resources by environment and location:

**Pattern**: `rg-{identifier}-{environment}-{location}`

**Examples**:
```
rg-myapp-prod-eastus
rg-backend-dev-westus2
rg-shared-prod-eastus
```

## Auto-Generated Names

Atakora automatically generates compliant names when you don't specify one:

```typescript
// Name auto-generated based on context
const vnet = new VirtualNetwork(this, 'VNet', {
  addressSpace: { addressPrefixes: ['10.0.0.0/16'] }
});
// Generated name: vnet-myapp-prod-eastus

// Explicit name (overrides auto-generation)
const storage = new StorageAccount(this, 'Storage', {
  name: 'stcustomname'
});
```

## Naming Context

Context is derived from the Stack:

```typescript
class MyStack extends Stack {
  constructor(scope: App, id: string) {
    super(scope, id, {
      environment: 'production',  // Used in names
      location: 'eastus'          // Used in names
    });

    // Resources inherit context
    const rg = new ResourceGroup(this, 'ResourceGroup', {
      // Auto-generated: rg-myapp-production-eastus
    });
  }
}
```

## Environment Abbreviations

Standard environment names are abbreviated:

| Full Name | Abbreviation | Usage |
|-----------|--------------|-------|
| `development` | `dev` | Development environment |
| `staging` | `staging` | Staging/pre-production |
| `production` | `prod` | Production environment |

Custom environments use full name:
```typescript
environment: 'qa'        // qa-myapp-qa-eastus
environment: 'uat'       // rg-myapp-uat-eastus
```

## Location Abbreviations

Common Azure regions:

| Full Name | Abbreviation | Example |
|-----------|--------------|---------|
| `eastus` | `eastus` | `rg-myapp-prod-eastus` |
| `westus2` | `westus2` | `rg-myapp-prod-westus2` |
| `centralus` | `centralus` | `rg-myapp-prod-centralus` |
| `northeurope` | `northeurope` | `rg-myapp-prod-northeurope` |
| `westeurope` | `westeurope` | `rg-myapp-prod-westeurope` |

Government Cloud regions:
| Full Name | Abbreviation | Example |
|-----------|--------------|---------|
| `usgovvirginia` | `usgovvirginia` | `rg-myapp-prod-usgovvirginia` |
| `usgovtexas` | `usgovtexas` | `rg-myapp-prod-usgovtexas` |

## Validation Rules

Atakora validates names against Azure requirements:

### General Rules

- Length: Resource-specific (3-260 characters depending on type)
- Characters: Letters, numbers, hyphens (varies by resource)
- Case: Lowercase (most resources)
- Uniqueness: Global or within resource group (varies)

### Resource-Specific Validation

**Virtual Network**:
- 2-64 characters
- Alphanumerics, hyphens, underscores, periods
- Must start with alphanumeric
- Must end with alphanumeric or underscore

**Storage Account**:
- 3-24 characters
- Lowercase letters and numbers only
- Globally unique

**Key Vault**:
- 3-24 characters
- Alphanumerics and hyphens
- Must start with letter
- Must end with letter or number
- Globally unique

## Custom Naming Strategies

Override default naming for specific needs:

### Custom Prefix

```typescript
const vnet = new VirtualNetwork(this, 'VNet', {
  name: 'custom-vnet-name',  // Fully custom
  addressSpace: { addressPrefixes: ['10.0.0.0/16'] }
});
```

### Conditional Naming

```typescript
const isProd = this.environment === 'production';

const storage = new StorageAccount(this, 'Storage', {
  name: isProd ? 'stprodstorage' : 'stdevstorage'
});
```

### Naming Helper

```typescript
import { generateResourceName } from '@atakora/lib/utils';

const name = generateResourceName(
  'virtualNetwork',
  'MyVNet',
  this.environment,
  this.location
);
// Returns: vnet-myvnet-prod-eastus
```

## Best Practices

### Use Descriptive Identifiers

```typescript
// Good: Clear purpose
new VirtualNetwork(this, 'AppVNet', { ... });
new VirtualNetwork(this, 'DataVNet', { ... });

// Better: Even more descriptive
new VirtualNetwork(this, 'FrontendVNet', { ... });
new VirtualNetwork(this, 'BackendVNet', { ... });
```

### Consistent Casing

Use consistent casing in construct IDs:

```typescript
// Good: PascalCase for construct IDs
new ResourceGroup(this, 'ResourceGroup', { ... });
new VirtualNetwork(this, 'VNet', { ... });
new StorageAccount(this, 'Storage', { ... });
```

### Multi-Instance Resources

For multiple instances, use descriptive suffixes:

```typescript
new Subnet(this, 'WebSubnet', {
  virtualNetwork: vnet,
  addressPrefix: '10.0.1.0/24'
});

new Subnet(this, 'AppSubnet', {
  virtualNetwork: vnet,
  addressPrefix: '10.0.2.0/24'
});

new Subnet(this, 'DataSubnet', {
  virtualNetwork: vnet,
  addressPrefix: '10.0.3.0/24'
});
```

### Global Uniqueness

For globally unique resources, include additional context:

```typescript
// Storage accounts must be globally unique
const storage = new StorageAccount(this, 'Storage', {
  name: `st${organizationPrefix}${projectName}${environment}`
});
// Example: stdpmyappprod
```

## Troubleshooting

### Name Already Exists

**Error**: Resource name already in use

**Solutions**:
1. Use different identifier
2. Add instance suffix
3. Use different location

```typescript
// Add instance suffix
const storage = new StorageAccount(this, 'Storage', {
  name: 'stmyappprod01'  // Add '01'
});
```

### Name Too Long

**Error**: Name exceeds maximum length

**Solutions**:
1. Abbreviate identifier
2. Shorten environment/location
3. Use custom name

```typescript
// Abbreviate
const storage = new StorageAccount(this, 'Storage', {
  name: 'stmyprod'  // Shortened from 'stmyapplicationprod'
});
```

### Invalid Characters

**Error**: Name contains invalid characters

**Solutions**:
1. Remove special characters
2. Use only allowed characters for resource type
3. Check Azure naming rules

```typescript
// Remove underscores for storage
const storage = new StorageAccount(this, 'Storage', {
  name: 'stmyappprod'  // No underscores or hyphens
});
```

## See Also

- [Resource Fundamentals](../guides/fundamentals/resources.md)
- [Azure Naming Rules](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-best-practices/resource-naming)
- [Organizing Projects](../guides/workflows/organizing-projects.md)

---

**Last Updated**: 2025-10-08
**Version**: 1.0.0
