# Naming Conventions Guide

**Navigation**: [Docs Home](../README.md) > [Guides](./README.md) > Naming Conventions

---

## Overview

Atakora provides a comprehensive naming convention system for generating Azure-compliant resource names. The system handles resource-specific constraints, automatic truncation, validation, and supports both standard and custom organizational patterns.

## Why Naming Matters

Consistent, well-structured resource names provide:

1. **Clarity**: Understand resource purpose at a glance
2. **Organization**: Group related resources logically
3. **Governance**: Enforce organizational standards
4. **Automation**: Programmatic resource discovery
5. **Compliance**: Meet Azure naming requirements

## Default Naming Pattern

### Standard Format

```
{prefix}-{purpose}-{org}-{project}-{env}-{geo}-{instance}
```

**Example**:
```
vnet-data-digital-minion-authr-nonprod-eastus-01
```

### Components

| Component | Description | Example | Required |
|-----------|-------------|---------|----------|
| **prefix** | Resource type abbreviation | `vnet`, `st`, `kv` | Yes |
| **purpose** | Resource-specific purpose | `data`, `api`, `frontend` | Optional |
| **org** | Organization name | `digital-minion`, `dm` | Yes |
| **project** | Project identifier | `authr`, `webapp` | Yes |
| **env** | Environment | `nonprod`, `prod` | Yes |
| **geo** | Geography/region | `eastus`, `usgovvirginia` | Yes |
| **instance** | Instance number | `01`, `02` | Yes |

## Resource Name Generator

### Basic Usage

```typescript
import { ResourceNameGenerator } from '@atakora/lib/naming';

const generator = new ResourceNameGenerator();

const vnetName = generator.generateName({
  resourceType: 'vnet',
  organization: 'digital-minion',
  project: 'authr',
  environment: 'nonprod',
  geography: 'eastus',
  instance: '01'
});

// Result: "vnet-digital-minion-authr-nonprod-eastus-01"
```

### With Purpose

```typescript
const subnetName = generator.generateName({
  resourceType: 'subnet',
  organization: 'digital-minion',
  project: 'authr',
  purpose: 'data',           // Add purpose
  environment: 'nonprod',
  geography: 'eastus',
  instance: '01'
});

// Result: "subnet-data-digital-minion-authr-nonprod-eastus-01"
```

### Custom Conventions

```typescript
const generator = new ResourceNameGenerator({
  separator: '_',              // Use underscore instead of hyphen
  maxLength: 50,              // Custom max length
  patterns: {
    storage: 'stor',          // Custom prefix for storage
    keyvault: 'vault'         // Custom prefix for key vault
  }
});

const storageName = generator.generateName({
  resourceType: 'storage',
  organization: 'dm',
  project: 'authr',
  environment: 'nonprod',
  geography: 'eus',
  instance: '01'
});

// Result: "stor_dm_authr_nonprod_eus_01"
```

## Resource Type Prefixes

### Default Prefixes

| Resource Type | Prefix | Example Name |
|---------------|--------|--------------|
| Resource Group | `rg` | `rg-digital-minion-authr-nonprod-eastus-01` |
| Virtual Network | `vnet` | `vnet-digital-minion-authr-nonprod-eastus-01` |
| Subnet | `subnet` | `subnet-data-digital-minion-authr-nonprod-eastus-01` |
| Storage Account | `st` | `stdmauthrnonprodeus01` (special case) |
| Key Vault | `kv` | `kv-digital-minion-authr-nonprod-eastus-01` |
| Function App | `func` | `func-api-digital-minion-authr-nonprod-eastus-01` |
| App Service | `app` | `app-web-digital-minion-authr-nonprod-eastus-01` |
| Cosmos DB | `cosmos` | `cosmos-digital-minion-authr-nonprod-eastus-01` |
| SQL Database | `sql` | `sql-digital-minion-authr-nonprod-eastus-01` |
| Network Security Group | `nsg` | `nsg-data-digital-minion-authr-nonprod-eastus-01` |

### Customizing Prefixes

```typescript
const generator = new ResourceNameGenerator({
  patterns: {
    'virtualMachine': 'vm',
    'loadBalancer': 'lb',
    'publicIp': 'pip',
    'networkInterface': 'nic'
  }
});
```

## Special Case Resources

### Storage Accounts

**Azure Constraints**:
- 3-24 characters
- Lowercase letters and numbers only
- No hyphens or special characters
- Globally unique across all of Azure

**Atakora Handling**:
```typescript
const storageName = generator.generateName({
  resourceType: 'storage',
  organization: 'dp',           // Use abbreviations
  project: 'authr',
  environment: 'nonprod',
  geography: 'eus',            // Abbreviated region
  instance: '01'
});

// Result: "stdpauthrnonprodeus01"
// - Automatically removes hyphens
// - Forces lowercase
// - Truncates to 24 chars if needed
```

**Tips for Storage Names**:
```typescript
// Use short abbreviations
organization: 'dm'      // instead of 'digital-minion'
geography: 'eus'        // instead of 'eastus'
environment: 'np'       // instead of 'nonprod'

// Add purpose for multiple storage accounts
purpose: 'data'         // stdatadmauthrpeus01
purpose: 'logs'         // stlogsdmauthrpeus01
```

### Key Vault

**Azure Constraints**:
- 3-24 characters
- Alphanumeric and hyphens
- Must start with letter
- Must end with letter or digit
- No consecutive hyphens
- Globally unique

**Atakora Handling**:
```typescript
const kvName = generator.generateName({
  resourceType: 'keyvault',
  organization: 'dm',
  project: 'authr',
  purpose: 'secrets',
  environment: 'nonprod',
  geography: 'eus',
  instance: '01'
});

// Result: "kv-secrets-dm-authr-nonprod-eus-01"
// - Forces lowercase
// - Truncates to 24 chars if needed
// - Validates pattern requirements
```

### Cosmos DB

**Azure Constraints**:
- 3-44 characters
- Lowercase letters, numbers, hyphens
- Must start and end with letter or number
- Globally unique

**Atakora Handling**:
```typescript
const cosmosName = generator.generateName({
  resourceType: 'cosmos',
  organization: 'digital-minion',
  project: 'authr',
  purpose: 'users',
  environment: 'nonprod',
  geography: 'eastus',
  instance: '01'
});

// Result: "cosmos-users-digital-minion-authr-nonprod-eastus-01"
// - Forces lowercase
// - Validates pattern
// - Truncates to 44 chars if needed
```

## Validation

### Validate Names

```typescript
const result = generator.validateName('my-storage-123', 'storage');

if (!result.isValid) {
  console.error('Validation errors:', result.errors);
  // ["Resource name 'my-storage-123' does not match required pattern for storage"]
}

if (result.warnings.length > 0) {
  console.warn('Warnings:', result.warnings);
  // ["Storage account names must be globally unique across Azure"]
}
```

### Validate Parameters

```typescript
import { validateGenerationParams } from '@atakora/lib/naming';

const result = validateGenerationParams({
  resourceType: 'storage',
  organization: 'dp',
  project: 'authr',
  // Missing environment, geography, instance
});

console.log(result.errors);
// [
//   "Required parameter 'environment' is missing or empty",
//   "Required parameter 'geography' is missing or empty",
//   "Required parameter 'instance' is missing or empty"
// ]
```

### Check Truncation

```typescript
const longName = 'very-long-storage-account-name-that-exceeds-limit';

if (generator.willTruncate(longName, 'storage')) {
  console.warn(`Name will be truncated to 24 characters`);
  // Name will be truncated to: "very-long-storage-accoun"
}
```

## Scoped Naming

Different deployment scopes use different naming patterns.

### Deployment Scopes

```typescript
import { DeploymentScope } from '@atakora/lib';

// Tenant scope: {prefix}-{purpose}
// Management Group: {prefix}-{org}-{purpose}
// Subscription: {prefix}-{org}-{project}-{purpose}-{env}-{geo}-{instance}
// Resource Group: Same as Subscription
```

### Subscription-Scoped Resources

**Most common scope**

```typescript
const rgName = generator.generateForScope({
  scope: DeploymentScope.Subscription,
  resourceType: 'rg',
  organization: 'digital-minion',
  project: 'authr',
  purpose: 'data',
  environment: 'nonprod',
  geography: 'eastus',
  instance: '01'
});

// Result: "rg-digital-minion-authr-data-nonprod-eastus-01"
```

### Management Group

**No geography/instance needed**

```typescript
const mgName = generator.generateForScope({
  scope: DeploymentScope.ManagementGroup,
  resourceType: 'mg',
  organization: 'digital-minion',
  purpose: 'platform'
});

// Result: "mg-digital-minion-platform"
```

### Tenant-Scoped

**Minimal naming**

```typescript
const policyName = generator.generateForScope({
  scope: DeploymentScope.Tenant,
  resourceType: 'policy',
  purpose: 'tagging'
});

// Result: "policy-tagging"
```

## Naming Service

The `NamingService` provides construct-aware naming with automatic purpose extraction.

### Constructor-Based Naming

```typescript
import { NamingService } from '@atakora/lib/naming';
import { VirtualNetwork } from '@atakora/cdk/network';
import { Construct, Stack } from '@atakora/lib';

class MyStack extends Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const naming = new NamingService(this, {
      organization: 'digital-minion',
      project: 'authr',
      environment: 'nonprod',
      geography: 'eastus',
      instance: '01'
    });

    // Automatically extracts purpose from construct ID
    const vnet = new VirtualNetwork(this, 'DataNetwork', {
      name: naming.generateName('vnet', 'DataNetwork'),
      // Generates: "vnet-data-network-digital-minion-authr-nonprod-eastus-01"
    });
  }
}
```

### Purpose Extraction

The service extracts purpose from construct IDs:

```typescript
// Construct ID: "ApiGateway" → purpose: "api-gateway"
// Construct ID: "UserDatabase" → purpose: "user-database"
// Construct ID: "FrontendStorage" → purpose: "frontend-storage"

const apiName = naming.generateName('func', 'ApiGateway');
// Result: "func-api-gateway-digital-minion-authr-nonprod-eastus-01"
```

### Service Abbreviations

Common service words are abbreviated:

| Full Word | Abbreviation |
|-----------|--------------|
| Database | db |
| Storage | stor |
| Network | net |
| Gateway | gw |
| Service | svc |
| Application | app |
| Function | func |

```typescript
// Construct ID: "UserDatabaseService"
// Extracted: "user-db-svc"

const dbName = naming.generateName('sql', 'UserDatabaseService');
// Result: "sql-user-db-svc-digital-minion-authr-nonprod-eastus-01"
```

## Azure Naming Rules

### Character Constraints

| Resource Type | Valid Characters | Case Sensitive |
|---------------|------------------|----------------|
| Resource Group | Alphanumeric, underscore, parentheses, hyphen, period | No |
| Storage Account | Lowercase letters, numbers | No |
| Key Vault | Alphanumeric, hyphens | No |
| Virtual Network | Alphanumeric, hyphen, period, underscore | No |
| Function App | Alphanumeric, hyphens | No |

### Length Constraints

| Resource Type | Min Length | Max Length | Global Uniqueness |
|---------------|------------|------------|-------------------|
| Resource Group | 1 | 90 | No |
| Storage Account | 3 | 24 | Yes |
| Key Vault | 3 | 24 | Yes |
| Virtual Network | 2 | 64 | No |
| Cosmos DB | 3 | 44 | Yes |
| Function App | 2 | 60 | Yes |
| SQL Server | 1 | 63 | Yes |

### Pattern Requirements

**Storage Account**:
- Must be lowercase
- Only alphanumeric
- No hyphens

**Key Vault**:
- Must start with letter
- Must end with letter or digit
- No consecutive hyphens

**Resource Group**:
- Cannot end with period
- Alphanumeric, underscore, parentheses, hyphen, period allowed

## Government Cloud Considerations

### Region Abbreviations

```typescript
// Commercial Cloud
geography: 'eastus'    // East US
geography: 'westus'    // West US
geography: 'centralus' // Central US

// Government Cloud
geography: 'usgovvirginia'  // US Gov Virginia
geography: 'usgovarizona'   // US Gov Arizona
geography: 'usdodeast'      // US DoD East
geography: 'usdodcentral'   // US DoD Central

// Use abbreviations for storage accounts
geography: 'usgv'   // US Gov Virginia
geography: 'usga'   // US Gov Arizona
```

### Compliance Tags

Government cloud often requires specific naming patterns:

```typescript
const generator = new ResourceNameGenerator({
  patterns: {
    // IL4 workloads
    'storageIL4': 'stil4',
    'cosmosIL4': 'cosmosil4',

    // IL5 workloads
    'storageIL5': 'stil5',
    'cosmosIL5': 'cosmosil5'
  }
});

const il4Storage = generator.generateName({
  resourceType: 'storageIL4',
  organization: 'dod',
  project: 'classified',
  environment: 'prod',
  geography: 'usdodeast',
  instance: '01'
});
// Result: "stil4dodclassifiedprodusdodeast01"
```

## Best Practices

### 1. Use Abbreviations for Long Names

```typescript
// ✗ Avoid - exceeds storage limit
organization: 'digital-minion-engineering'

// ✓ Better
organization: 'dm-eng'
```

### 2. Consistent Environment Names

```typescript
// ✓ Use standard environment names
environment: 'dev'
environment: 'test'
environment: 'stage'
environment: 'prod'

// Or combined
environment: 'nonprod'  // dev, test, stage
environment: 'prod'     // production only
```

### 3. Purpose Over Generic Names

```typescript
// ✗ Avoid
purpose: 'storage1'
purpose: 'storage2'

// ✓ Better
purpose: 'data'
purpose: 'logs'
purpose: 'backups'
```

### 4. Numbered Instances

```typescript
// ✓ Use consistent numbering
instance: '01'  // Not '1'
instance: '02'  // Not '2'
instance: '10'  // Easy to sort
```

### 5. Validate Before Deployment

```typescript
// Always validate generated names
const name = generator.generateName(params);
const validation = generator.validateName(name, params.resourceType);

if (!validation.isValid) {
  throw new Error(`Invalid name: ${validation.errors.join(', ')}`);
}
```

### 6. Document Conventions

```typescript
// Create naming convention document
const conventions = {
  organization: 'dm',      // Digital Minion
  environments: {
    nonprod: 'nonprod',    // Dev, Test, Stage
    prod: 'prod'           // Production
  },
  regions: {
    primary: 'eastus',
    secondary: 'westus',
    gov: 'usgovvirginia'
  },
  purposes: {
    data: 'data',          // Data tier resources
    app: 'app',            // Application tier
    web: 'web'             // Web tier
  }
};
```

## Common Patterns

### Multi-Tier Application

```typescript
const naming = new NamingService(stack, {
  organization: 'dm',
  project: 'webapp',
  environment: 'prod',
  geography: 'eastus',
  instance: '01'
});

// Web tier
const webStorage = naming.generateName('storage', 'WebAssets');
// "stwebasssetsdmwebappprodeasus01"

const webApp = naming.generateName('app', 'WebFrontend');
// "app-web-frontend-dm-webapp-prod-eastus-01"

// Application tier
const apiFunc = naming.generateName('func', 'ApiGateway');
// "func-api-gateway-dm-webapp-prod-eastus-01"

// Data tier
const database = naming.generateName('sql', 'UserDatabase');
// "sql-user-database-dm-webapp-prod-eastus-01"

const dataStorage = naming.generateName('storage', 'DataLake');
// "stdatalakedmwebappprodeasus01"
```

### Multi-Region Deployment

```typescript
// Primary region
const primaryNaming = new NamingService(stack, {
  organization: 'dm',
  project: 'authr',
  environment: 'prod',
  geography: 'eastus',
  instance: '01'
});

// Secondary region
const secondaryNaming = new NamingService(stack, {
  organization: 'dm',
  project: 'authr',
  environment: 'prod',
  geography: 'westus',
  instance: '01'
});

const primaryDb = primaryNaming.generateName('cosmos', 'UserData');
// "cosmos-user-data-dm-authr-prod-eastus-01"

const secondaryDb = secondaryNaming.generateName('cosmos', 'UserData');
// "cosmos-user-data-dm-authr-prod-westus-01"
```

### Environment-Specific Resources

```typescript
const environments = ['dev', 'test', 'stage', 'prod'];

const resourceNames = environments.map(env => {
  const naming = new NamingService(stack, {
    organization: 'dm',
    project: 'authr',
    environment: env,
    geography: 'eastus',
    instance: '01'
  });

  return {
    env,
    storage: naming.generateName('storage', 'AppData'),
    database: naming.generateName('cosmos', 'UserData')
  };
});

// [
//   { env: 'dev', storage: 'stappdatadmauthdeveasus01', ... },
//   { env: 'test', storage: 'stappdatadmauthtesteasus01', ... },
//   { env: 'stage', storage: 'stappdatadmauthstageeasus01', ... },
//   { env: 'prod', storage: 'stappdatadmauthprodeasus01', ... }
// ]
```

## Troubleshooting

### Name Too Long

**Problem**: Generated name exceeds Azure limit

**Solution**:
```typescript
// Check if name will be truncated
if (generator.willTruncate(name, resourceType)) {
  console.warn('Name will be truncated');
}

// Use shorter components
organization: 'dm'          // instead of 'digital-minion'
geography: 'eus'            // instead of 'eastus'
purpose: 'api'              // instead of 'api-gateway'
```

### Invalid Characters

**Problem**: Name contains invalid characters for resource type

**Solution**:
```typescript
// Check validation result
const result = generator.validateName(name, resourceType);
console.log(result.errors);

// For storage accounts, avoid hyphens
// Resource type 'storage' automatically removes hyphens
```

### Not Globally Unique

**Problem**: Storage/Key Vault/Cosmos name already exists globally

**Solution**:
```typescript
// Add unique suffix
additionalSuffix: crypto.randomBytes(4).toString('hex')

// Or increment instance
instance: '02'  // Try next instance number

// Or add more specific purpose
purpose: 'user-data-prod'
```

### Inconsistent Naming

**Problem**: Names don't follow organizational standards

**Solution**:
```typescript
// Create shared naming configuration
const namingConfig = {
  separator: '-',
  patterns: { /* your patterns */ },
  maxLengths: { /* your limits */ }
};

// Use across all stacks
const generator = new ResourceNameGenerator(namingConfig);
```

## API Reference

### ResourceNameGenerator

Full API documentation: [Naming API Reference](../reference/api/lib/naming.md)

**Methods**:
- `generateName(params)` - Generate resource name
- `validateName(name, type)` - Validate name
- `getPattern(type)` - Get resource prefix
- `getMaxLength(type)` - Get max length
- `willTruncate(name, type)` - Check if truncation needed
- `generateForScope(params)` - Scope-aware generation

### NamingService

**Methods**:
- `generateName(type, constructId)` - Generate from construct
- `extractPurpose(constructId)` - Extract purpose from ID
- `getAbbreviations()` - Get service abbreviations

## See Also

- [Azure Naming Best Practices](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/azure-best-practices/naming-and-tagging)
- [Resource Naming Rules](https://learn.microsoft.com/azure/azure-resource-manager/management/resource-name-rules)
- [Naming API Reference](../reference/naming-conventions.md)
- [Stack Guide](./fundamentals/app-and-stacks.md)

---

**Last Updated**: 2025-10-10
**Version**: 1.0.0+
