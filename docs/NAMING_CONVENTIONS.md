# Naming Conventions Guide

## Table of Contents

- [Overview](#overview)
- [Naming Pattern](#naming-pattern)
- [Context Components](#context-components)
- [Resource Type Prefixes](#resource-type-prefixes)
- [Special Cases](#special-cases)
- [Configuration](#configuration)
- [Validation Rules](#validation-rules)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

## Overview

The Azure ARM Priv library uses a consistent, context-aware naming convention system inspired by the ColorAI PowerShell implementation and Azure Cloud Adoption Framework best practices.

### Key Principles

1. **Consistency**: All resources follow the same naming pattern
2. **Context-Aware**: Names include organizational context (org, project, environment)
3. **Type-Safe**: Validated at compile-time and runtime
4. **Azure-Compliant**: Respects Azure naming rules and length limits
5. **Predictable**: Easy to understand and reason about

### Benefits

- Instant identification of resource purpose, environment, and owner
- Simplified resource management and cost tracking
- Reduced naming conflicts
- Automated compliance with organizational standards

## Naming Pattern

### Standard Pattern

```
{prefix}-{org}-{project}-{resource_id}-{environment}-{geography}-{instance}
```

### Component Breakdown

| Component     | Description                    | Example       | Required |
| ------------- | ------------------------------ | ------------- | -------- |
| `prefix`      | Resource type abbreviation     | `rg`, `vnet`  | Yes      |
| `org`         | Organization identifier        | `dp`, `fin`   | Yes      |
| `project`     | Project name                   | `colorai`     | Yes      |
| `resource_id` | Unique resource identifier     | `networkrg`   | Yes      |
| `environment` | Environment type               | `nonprod`     | Yes      |
| `geography`   | Azure region abbreviation      | `eus`, `wus2` | Yes      |
| `instance`    | Instance number (multi-region) | `01`, `02`    | Yes      |

### Separator

Default separator: `-` (hyphen)

Can be customized per stack or globally (see [Configuration](#configuration)).

### Example Names

```
rg-dp-colorai-networkrg-nonprod-eus-00        # Resource Group
vnet-dp-colorai-mainvnet-nonprod-eus-00       # Virtual Network
stdpcoloraiappstoragnonprodeus01              # Storage Account (no hyphens)
kv-dp-colorai-appkv-nonprod-eus-00            # Key Vault
st-dp-colorai-datastorage-production-wus2-02  # Storage (production, west us 2, instance 2)
```

## Context Components

### Organization

Identifies the organizational unit or business area.

**Format**: Short abbreviation (2-4 characters)
**Examples**:

- `dp` - Digital Products
- `fin` - Finance
- `hr` - Human Resources
- `it` - Information Technology

**Usage**:

```typescript
import { Organization } from '@atakora/lib';

const org = Organization.fromValue('dp');
```

### Project

The project or application name.

**Format**: Lowercase, alphanumeric (no special characters)
**Examples**:

- `colorai`
- `salesportal`
- `inventory`

**Usage**:

```typescript
import { Project } from '@atakora/lib';

const project = new Project('colorai');
```

### Environment

Indicates the deployment environment.

**Valid Values**:

- `nonprod` - Non-production (dev, test, staging)
- `production` - Production

**Usage**:

```typescript
import { Environment } from '@atakora/lib';

const env = Environment.fromValue('nonprod');
```

### Geography

Azure region where the resource is deployed.

**Format**: Azure region abbreviation
**Common Values**:

- `eus` - East US
- `eus2` - East US 2
- `wus` - West US
- `wus2` - West US 2
- `cus` - Central US
- `neu` - North Europe
- `weu` - West Europe

**Usage**:

```typescript
import { Geography } from '@atakora/lib';

const geo = Geography.fromValue('eastus');
// Automatically abbreviates to 'eus' in naming
```

### Instance

Instance number for multi-region or multi-instance deployments.

**Format**: Two-digit number (`01`, `02`, `03`, ...)
**Purpose**: Distinguish multiple instances in the same region or different regions

**Usage**:

```typescript
import { Instance } from '@atakora/lib';

const instance = Instance.fromNumber(1);
// Automatically formats to '01'
```

### Resource ID

The unique identifier for this specific resource within the project.

**Format**: Derived from the construct ID (sanitized)
**Rules**:

- Lowercase
- Alphanumeric + hyphens
- Descriptive of resource purpose

**Example**:

```typescript
new ResourceGroup(stack, 'NetworkRG', {
  /* ... */
});
// resource_id becomes 'networkrg'

new VirtualNetwork(rg, 'MainVNet', {
  /* ... */
});
// resource_id becomes 'mainvnet'
```

## Resource Type Prefixes

### Default Prefixes

Based on [Azure Cloud Adoption Framework abbreviations](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-best-practices/resource-abbreviations).

#### Core Infrastructure

| Resource Type          | Prefix     | Example                                    |
| ---------------------- | ---------- | ------------------------------------------ |
| Resource Group         | `rg`       | `rg-dp-colorai-networkrg-nonprod-eus-00`   |
| Landing Zone RG        | `rg-lz`    | `rg-lz-dp-platform-nonprod-eus-00`         |
| Platform RG            | `rg-pl`    | `rg-pl-dp-shared-nonprod-eus-00`           |
| Stack                  | `stk`      | `stk-dp-colorai-foundation-nonprod-eus-00` |
| Virtual Network        | `vnet`     | `vnet-dp-colorai-main-nonprod-eus-00`      |
| Subnet                 | `snet`     | `snet-dp-colorai-app-nonprod-eus-00`       |
| Network Security Group | `nsg`      | `nsg-dp-colorai-app-nonprod-eus-00`        |
| Public IP              | `pip`      | `pip-dp-colorai-gateway-nonprod-eus-00`    |
| Private Endpoint       | `pe`       | `pe-dp-colorai-storage-nonprod-eus-00`     |
| Private Link Service   | `pls`      | `pls-dp-colorai-app-nonprod-eus-00`        |
| DNS Zone Link          | `dns-link` | `dns-link-dp-colorai-vnet-nonprod-eus-00`  |

#### Compute Services

| Resource Type       | Prefix | Example                              |
| ------------------- | ------ | ------------------------------------ |
| App Service         | `app`  | `app-dp-colorai-api-nonprod-eus-00`  |
| App Service Plan    | `asp`  | `asp-dp-colorai-main-nonprod-eus-00` |
| Application Gateway | `agw`  | `agw-dp-colorai-main-nonprod-eus-00` |
| WAF Policy          | `waf`  | `waf-dp-colorai-main-nonprod-eus-00` |

#### Data Services

| Resource Type   | Prefix   | Example                                      |
| --------------- | -------- | -------------------------------------------- |
| Storage Account | `st`     | `stdpcoloraiappstoragnonprodeus01` (special) |
| Key Vault       | `kv`     | `kv-dp-colorai-app-nonprod-eus-00`           |
| Cosmos DB       | `cosmos` | `cosmos-dp-colorai-main-nonprod-eus-00`      |
| Azure Search    | `srch`   | `srch-dp-colorai-main-nonprod-eus-00`        |

#### AI Services

| Resource Type | Prefix | Example                              |
| ------------- | ------ | ------------------------------------ |
| OpenAI        | `oai`  | `oai-dp-colorai-main-nonprod-eus-00` |

#### API Services

| Resource Type  | Prefix | Example                               |
| -------------- | ------ | ------------------------------------- |
| API Management | `apim` | `apim-dp-colorai-main-nonprod-eus-00` |

#### Monitoring Services

| Resource Type           | Prefix  | Example                                   |
| ----------------------- | ------- | ----------------------------------------- |
| Log Analytics Workspace | `law`   | `law-dp-colorai-main-nonprod-eus-00`      |
| Application Insights    | `ai`    | `ai-dp-colorai-main-nonprod-eus-00`       |
| Action Group            | `ag`    | `ag-dp-colorai-alerts-nonprod-eus-00`     |
| Dashboard               | `dash`  | `dash-dp-colorai-overview-nonprod-eus-00` |
| Alert                   | `alert` | `alert-dp-colorai-cpu-nonprod-eus-00`     |

#### External Services

| Resource Type | Prefix | Example                             |
| ------------- | ------ | ----------------------------------- |
| Snowflake     | `sf`   | `sf-dp-colorai-main-nonprod-eus-00` |

### Customizing Prefixes

Override default prefixes per stack:

```typescript
const stack = new SubscriptionStack(app, 'MyStack', {
  subscription: Subscription.fromId('...'),
  geography: Geography.fromValue('eastus'),
  organization: Organization.fromValue('dp'),
  project: new Project('colorai'),
  environment: Environment.fromValue('nonprod'),
  instance: Instance.fromNumber(1),
  namingConventions: {
    patterns: {
      storage: 'stor', // Override 'st' with 'stor'
      keyvault: 'vault', // Override 'kv' with 'vault'
    },
  },
});
```

## Special Cases

### Storage Accounts

Storage accounts have unique Azure naming constraints:

**Constraints**:

- 3-24 characters
- Lowercase letters and numbers only
- No hyphens or special characters
- Globally unique across all of Azure

**Handling**:

- Hyphens are automatically removed
- Name is forced to lowercase
- Total length is strictly enforced

**Example**:

```
Standard pattern:    st-dp-colorai-appstorage-nonprod-eus-00
Storage account:     stdpcoloraiappstoragnonprodeus01
```

**Code**:

```typescript
new StorageAccount(rg, 'AppStorage', {
  // Name automatically formatted for storage account rules
  accountName: 'appstorage', // Becomes 'stdpcoloraiappstoragnonprodeus01'
});
```

### Key Vaults

Key Vaults have specific naming requirements:

**Constraints**:

- 3-24 characters
- Alphanumeric and hyphens only
- Must start with a letter
- Globally unique across all of Azure

**Handling**:

- Name is forced to lowercase
- Validated to start with a letter
- Length strictly enforced

**Example**:

```typescript
new KeyVault(rg, 'AppKeyVault', {
  // Name: kv-dp-colorai-appkeyvault-nonprod-eus-00
});
```

### Resource Groups

Resource groups have generous length limits (90 characters) and fewer restrictions.

**Constraints**:

- 1-90 characters
- Alphanumeric, underscores, hyphens, periods, parentheses
- Cannot end with a period

**Example**:

```typescript
new ResourceGroup(stack, 'NetworkRG', {
  // Name: rg-dp-colorai-networkrg-nonprod-eus-00
});
```

## Configuration

### Global Configuration

Set default conventions for all stacks:

```typescript
import { DEFAULT_CONVENTIONS, mergeConventions } from '@atakora/lib/naming';

// Override globally
const customConventions = mergeConventions({
  separator: '_', // Use underscore instead of hyphen
  maxLength: 50, // Global max length
  patterns: {
    storage: 'stor',
    vnet: 'network',
  },
  maxLengths: {
    rg: 60, // Override RG max length
  },
});
```

### Per-Stack Configuration

Override conventions for a specific stack:

```typescript
const stack = new SubscriptionStack(app, 'MyStack', {
  subscription: Subscription.fromId('...'),
  geography: Geography.fromValue('eastus'),
  organization: Organization.fromValue('dp'),
  project: new Project('colorai'),
  environment: Environment.fromValue('nonprod'),
  instance: Instance.fromNumber(1),
  namingConventions: {
    separator: '_',
    patterns: {
      storage: 'stor',
    },
  },
});
```

### Per-Resource Override

For complete control, use L1 constructs with explicit names:

```typescript
new ArmResourceGroup(stack, 'CustomRG', {
  resourceGroupName: 'my-custom-name', // Exact name, no auto-generation
  location: 'eastus',
});
```

## Validation Rules

### Compile-Time Validation

TypeScript ensures:

- Required context properties are provided
- Types are correct
- Resource properties match ARM schema

### Runtime Validation

The naming system validates:

1. **Length Constraints**: Names do not exceed Azure limits
2. **Character Rules**: Only allowed characters for each resource type
3. **Pattern Compliance**: Names follow the standard pattern
4. **Uniqueness**: Names are unique within their scope

### Validation Errors

**Example Error**:

```
Error: Resource name exceeds maximum length
  Resource Type: Microsoft.Storage/storageAccounts
  Generated Name: stdpcoloraiverylongnamethatexceedslimitnonprodeus01
  Actual Length: 56
  Maximum Length: 24
  Suggestion: Shorten the resource ID or use a shorter project name
```

## Examples

### Basic Resource Group

```typescript
import { App, SubscriptionStack, ResourceGroup } from '@atakora/lib';

const app = new App();

const stack = new SubscriptionStack(app, 'Foundation', {
  subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
  geography: Geography.fromValue('eastus'),
  organization: Organization.fromValue('dp'),
  project: new Project('colorai'),
  environment: Environment.fromValue('nonprod'),
  instance: Instance.fromNumber(1),
});

const rg = new ResourceGroup(stack, 'NetworkRG');
// Generated name: rg-dp-colorai-networkrg-nonprod-eus-00
```

### Multi-Region Deployment

```typescript
// East US - Instance 1
const eastStack = new SubscriptionStack(app, 'EastStack', {
  subscription: Subscription.fromId('...'),
  geography: Geography.fromValue('eastus'),
  organization: Organization.fromValue('dp'),
  project: new Project('colorai'),
  environment: Environment.fromValue('production'),
  instance: Instance.fromNumber(1),
});

const eastRG = new ResourceGroup(eastStack, 'NetworkRG');
// Generated name: rg-dp-colorai-networkrg-production-eus-01

// West US - Instance 2
const westStack = new SubscriptionStack(app, 'WestStack', {
  subscription: Subscription.fromId('...'),
  geography: Geography.fromValue('westus2'),
  organization: Organization.fromValue('dp'),
  project: new Project('colorai'),
  environment: Environment.fromValue('production'),
  instance: Instance.fromNumber(2),
});

const westRG = new ResourceGroup(westStack, 'NetworkRG');
// Generated name: rg-dp-colorai-networkrg-production-wus2-02
```

### Complex Infrastructure

```typescript
const stack = new SubscriptionStack(app, 'Infrastructure', {
  subscription: Subscription.fromId('...'),
  geography: Geography.fromValue('eastus'),
  organization: Organization.fromValue('dp'),
  project: new Project('colorai'),
  environment: Environment.fromValue('nonprod'),
  instance: Instance.fromNumber(1),
});

// Resource Group: rg-dp-colorai-networkrg-nonprod-eus-00
const networkRG = new ResourceGroup(stack, 'NetworkRG');

// Virtual Network: vnet-dp-colorai-mainvnet-nonprod-eus-00
const vnet = new VirtualNetwork(networkRG, 'MainVNet', {
  addressSpace: '10.0.0.0/16',
});

// Subnet: snet-dp-colorai-appsubnet-nonprod-eus-00
const appSubnet = new Subnet(vnet, 'AppSubnet', {
  addressPrefix: '10.0.1.0/24',
});

// NSG: nsg-dp-colorai-appnsg-nonprod-eus-00
const appNSG = new NetworkSecurityGroup(networkRG, 'AppNSG');

// Resource Group: rg-dp-colorai-datarg-nonprod-eus-00
const dataRG = new ResourceGroup(stack, 'DataRG');

// Storage Account: stdpcoloraiappstoragnonprodeus01
const storage = new StorageAccount(dataRG, 'AppStorage');

// Key Vault: kv-dp-colorai-appkv-nonprod-eus-00
const keyVault = new KeyVault(dataRG, 'AppKV');

// Cosmos DB: cosmos-dp-colorai-maindb-nonprod-eus-00
const cosmosDB = new CosmosDB(dataRG, 'MainDB');
```

### Custom Naming Convention

```typescript
const stack = new SubscriptionStack(app, 'CustomStack', {
  subscription: Subscription.fromId('...'),
  geography: Geography.fromValue('eastus'),
  organization: Organization.fromValue('fin'), // Finance organization
  project: new Project('reporting'),
  environment: Environment.fromValue('production'),
  instance: Instance.fromNumber(1),
  namingConventions: {
    separator: '_', // Use underscore
    patterns: {
      storage: 'stor', // Custom prefix
      keyvault: 'vault',
    },
    maxLengths: {
      rg: 50, // Custom limit
    },
  },
});

const rg = new ResourceGroup(stack, 'DataRG');
// Generated name: rg_fin_reporting_datarg_production_eus_01

const storage = new StorageAccount(rg, 'MainStorage');
// Generated name: storfinreportingmainstoragproductioneus01
```

## Troubleshooting

### Name Too Long

**Problem**: Generated name exceeds Azure resource limit

**Solutions**:

1. Shorten the resource ID (construct ID)
2. Use a shorter project name
3. Use a shorter organization abbreviation
4. Override the naming convention for that resource type

**Example**:

```typescript
// Problem: Very long construct ID
new ResourceGroup(stack, 'VeryLongDescriptiveResourceGroupName');
// Name might exceed 90 characters

// Solution: Shorter ID
new ResourceGroup(stack, 'DataRG');
```

### Invalid Characters

**Problem**: Resource name contains invalid characters

**Solution**: The library automatically sanitizes names, but ensure construct IDs use alphanumeric characters and hyphens only.

**Example**:

```typescript
// Avoid special characters in construct IDs
new ResourceGroup(stack, 'Network-RG'); // OK
new ResourceGroup(stack, 'Network_RG'); // OK
new ResourceGroup(stack, 'Network@RG'); // Avoid
```

### Name Collision

**Problem**: Two resources with the same generated name

**Solution**: Ensure unique construct IDs within the same scope.

**Example**:

```typescript
// Problem: Same ID in same scope
const rg1 = new ResourceGroup(stack, 'NetworkRG');
const rg2 = new ResourceGroup(stack, 'NetworkRG'); // ERROR: Duplicate ID

// Solution: Unique IDs
const rg1 = new ResourceGroup(stack, 'NetworkRG');
const rg2 = new ResourceGroup(stack, 'ApplicationRG');
```

### Geography Not Abbreviating

**Problem**: Full region name used instead of abbreviation

**Solution**: Ensure you use `Geography.fromValue()` which automatically abbreviates.

**Example**:

```typescript
// Correct
const geo = Geography.fromValue('eastus'); // Abbreviates to 'eus'

// If you need custom abbreviations, override the geography mapping
```

## Best Practices

1. **Use Descriptive IDs**: Construct IDs should clearly indicate the resource's purpose
2. **Stay Consistent**: Use the same naming pattern across all projects
3. **Validate Early**: Run synthesis to catch naming issues during development
4. **Document Overrides**: If you override naming conventions, document why
5. **Test Multi-Region**: Ensure names remain unique across regions
6. **Consider Length**: Keep project names and construct IDs reasonably short
7. **Use L2 Constructs**: Let the library handle naming automatically when possible
8. **Override Sparingly**: Only use explicit names (L1 constructs) when necessary

## Related Documentation

- [Architecture Guide](./ARCHITECTURE.md)
- [Adding Resources Guide](./ADDING_RESOURCES.md)
- [Best Practices](./BEST_PRACTICES.md)

## References

- [Azure Resource Naming Rules](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules)
- [Azure Cloud Adoption Framework - Naming Conventions](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-best-practices/resource-naming)
- [Azure Cloud Adoption Framework - Abbreviation Examples](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-best-practices/resource-abbreviations)

---

**Maintained by**: Team Azure ARM Priv
**Last Updated**: 2025-10-04
