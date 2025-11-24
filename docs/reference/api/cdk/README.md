# CDK Package API Reference

Complete API documentation for the `@atakora/cdk` package - Azure resource constructs organized by service namespace.

## Overview

The CDK package provides L1 and L2 constructs for Azure resources, following AWS CDK patterns but designed specifically for Azure ARM templates. Each service has its own namespace for clean imports.

## Import Pattern

```typescript
// Import from service-specific namespaces
import { VirtualNetwork, Subnet } from '@atakora/cdk/network';
import { StorageAccount, BlobContainer } from '@atakora/cdk/storage';
import { FunctionApp } from '@atakora/cdk/web';
import { KeyVault, Secret } from '@atakora/cdk/keyvault';
```

## Service Namespaces

### Core Infrastructure

| Namespace | Import Path | Documentation | Resources |
|-----------|------------|---------------|-----------|
| Resources | `@atakora/cdk/resources` | [RESOURCES.md](./RESOURCES.md) | ResourceGroup |
| Managed Identity | `@atakora/cdk/managedidentity` | [MANAGED-IDENTITY.md](./MANAGED-IDENTITY.md) | UserAssignedIdentity, SystemAssignedIdentity |
| Authorization | `@atakora/cdk/authorization` | [AUTHORIZATION.md](./AUTHORIZATION.md) | RoleAssignment, RoleDefinition |
| RBAC Grants | `@atakora/cdk/rbac` | [RBAC-GRANTS.md](./RBAC-GRANTS.md) | Grant patterns for type-safe permissions |

### Networking

| Namespace | Import Path | Documentation | Resources |
|-----------|------------|---------------|-----------|
| Network | `@atakora/cdk/network` | [NETWORK.md](./NETWORK.md) | VirtualNetwork, Subnet, NetworkSecurityGroup, PrivateEndpoint, ApplicationGateway, LoadBalancer, PublicIPAddress |

### Storage & Data

| Namespace | Import Path | Documentation | Resources |
|-----------|------------|---------------|-----------|
| Storage | `@atakora/cdk/storage` | [STORAGE.md](./STORAGE.md) | StorageAccount, BlobContainer, Queue, Table, FileShare |
| SQL | `@atakora/cdk/sql` | [SQL.md](./SQL.md) | SqlServer, SqlDatabase, SqlElasticPool |
| Document DB | `@atakora/cdk/documentdb` | [DOCUMENT-DB.md](./DOCUMENT-DB.md) | CosmosAccount, CosmosDatabase, CosmosContainer |

### Compute & Web

| Namespace | Import Path | Documentation | Resources |
|-----------|------------|---------------|-----------|
| Web | `@atakora/cdk/web` | [WEB.md](./WEB.md) | AppServicePlan, WebApp, FunctionApp, StaticWebApp |

### Security

| Namespace | Import Path | Documentation | Resources |
|-----------|------------|---------------|-----------|
| Key Vault | `@atakora/cdk/keyvault` | [KEY-VAULT.md](./KEY-VAULT.md) | KeyVault, Secret, Key, Certificate |

### Monitoring & Management

| Namespace | Import Path | Documentation | Resources |
|-----------|------------|---------------|-----------|
| Insights | `@atakora/cdk/insights` | [INSIGHTS.md](./INSIGHTS.md) | ApplicationInsights, MetricAlert, ActionGroup, AutoscaleSetting |
| Operational Insights | `@atakora/cdk/operationalinsights` | [OPERATIONAL-INSIGHTS.md](./OPERATIONAL-INSIGHTS.md) | LogAnalyticsWorkspace, LogAnalyticsSolution |

### Integration & AI

| Namespace | Import Path | Documentation | Resources |
|-----------|------------|---------------|-----------|
| API Management | `@atakora/cdk/apimanagement` | [API-MANAGEMENT.md](./API-MANAGEMENT.md) | ApiManagementService, Api, ApiOperation, Product, Subscription |
| Cognitive Services | `@atakora/cdk/cognitiveservices` | [COGNITIVE-SERVICES.md](./COGNITIVE-SERVICES.md) | CognitiveServicesAccount, OpenAIAccount |

## Construct Levels

### L1 Constructs (Arm Prefix)

Direct ARM template mapping with full control:

```typescript
import { ArmStorageAccount } from '@atakora/cdk/storage';

new ArmStorageAccount(this, 'Storage', {
  name: 'stmyappprod',
  location: 'eastus',
  kind: 'StorageV2',
  sku: {
    name: 'Standard_LRS'
  },
  properties: {
    accessTier: 'Hot',
    supportsHttpsTrafficOnly: true,
    minimumTlsVersion: 'TLS1_2'
  }
});
```

### L2 Constructs (No Prefix)

Higher-level abstractions with sensible defaults:

```typescript
import { StorageAccount } from '@atakora/cdk/storage';

new StorageAccount(this, 'Storage', {
  // Defaults: StorageV2, Standard_LRS, Hot tier, HTTPS only
  resourceGroup: rg
});
```

## Common Patterns

### Resource Group Pattern

All resources require a resource group:

```typescript
import { ResourceGroup } from '@atakora/cdk/resources';
import { StorageAccount } from '@atakora/cdk/storage';

const rg = new ResourceGroup(this, 'RG', {
  location: 'eastus'
});

const storage = new StorageAccount(this, 'Storage', {
  resourceGroup: rg // Required for L2 constructs
});
```

### Managed Identity Pattern

Grant resources identity-based access:

```typescript
import { UserAssignedIdentity } from '@atakora/cdk/managedidentity';
import { FunctionApp } from '@atakora/cdk/web';

const identity = new UserAssignedIdentity(this, 'Identity', {
  resourceGroup: rg
});

const funcApp = new FunctionApp(this, 'FunctionApp', {
  resourceGroup: rg,
  identity: {
    type: 'UserAssigned',
    userAssignedIdentities: {
      [identity.id]: {}
    }
  }
});
```

### RBAC Pattern

Type-safe permission grants:

```typescript
import { grantStorageBlobDataContributor } from '@atakora/cdk/rbac';

// Grant function app access to storage
grantStorageBlobDataContributor(storage, funcApp.identity);
```

### Private Endpoint Pattern

Secure resources with private endpoints:

```typescript
import { PrivateEndpoint } from '@atakora/cdk/network';

const endpoint = new PrivateEndpoint(this, 'StorageEndpoint', {
  resourceGroup: rg,
  subnet: privateSubnet,
  privateLinkServiceId: storage.id,
  groupIds: ['blob']
});
```

## Property Resolution

Properties are resolved during synthesis:

```typescript
const storage = new StorageAccount(this, 'Storage', {
  resourceGroup: rg
});

// These properties are tokens that resolve at synthesis
console.log(storage.name); // Token<string>
console.log(storage.id); // Token<string>
console.log(storage.primaryEndpoints); // Token<Endpoints>

// Use in other resources
const container = new BlobContainer(this, 'Container', {
  storageAccount: storage, // Pass the whole object
  name: 'data'
});
```

## Validation

All constructs validate configuration:

```typescript
// ❌ Missing required property
new VirtualNetwork(this, 'VNet', {
  // Error: addressSpace is required
});

// ❌ Invalid value
new StorageAccount(this, 'Storage', {
  kind: 'Invalid' // Error: Invalid storage account kind
});

// ✅ Valid configuration
new VirtualNetwork(this, 'VNet', {
  resourceGroup: rg,
  addressSpace: {
    addressPrefixes: ['10.0.0.0/16']
  }
});
```

## Tagging

Tags are inherited and merged:

```typescript
const stack = new Stack(app, 'MyStack', {
  tags: {
    Environment: 'Production',
    Owner: 'TeamA'
  }
});

const rg = new ResourceGroup(stack, 'RG', {
  location: 'eastus',
  tags: {
    Project: 'MyApp' // Merged with stack tags
  }
});

// Result: { Environment: 'Production', Owner: 'TeamA', Project: 'MyApp' }
```

## Government Cloud

Most constructs support Azure Government:

```typescript
const stack = new Stack(app, 'GovStack', {
  environment: {
    name: 'AzureUSGovernment'
  }
});

// Resources automatically use government endpoints
const storage = new StorageAccount(stack, 'Storage', {
  resourceGroup: rg
  // Endpoints: *.blob.core.usgovcloudapi.net
});
```

## Best Practices

1. **Use L2 Constructs**: Start with L2 constructs for better defaults
2. **Group by Service**: Import from service namespaces
3. **Validate Early**: Let constructs catch configuration errors
4. **Use References**: Pass construct objects, not string IDs
5. **Tag Resources**: Apply tags at stack level for consistency
6. **Handle Secrets**: Use Key Vault for sensitive values
7. **Test Synthesis**: Validate generated templates before deployment

## Type Definitions

Each service exports TypeScript interfaces:

```typescript
// Property interfaces
export interface StorageAccountProps {
  readonly resourceGroup?: IResourceGroup;
  readonly name?: string;
  readonly kind?: StorageAccountKind;
  readonly sku?: StorageAccountSku;
  // ...
}

// Resource interfaces
export interface IStorageAccount {
  readonly id: string;
  readonly name: string;
  readonly primaryEndpoints: StorageAccountEndpoints;
  // ...
}

// Enums
export enum StorageAccountKind {
  Storage = 'Storage',
  StorageV2 = 'StorageV2',
  BlobStorage = 'BlobStorage'
}
```

## Error Handling

Constructs throw descriptive errors:

```typescript
try {
  new StorageAccount(this, 'Storage', {
    name: 'invalid name!' // Contains invalid characters
  });
} catch (error) {
  // Error: Storage account name must be 3-24 characters,
  // lowercase letters and numbers only
}
```

## Related Documentation

- [Core Library Reference](../core/README.md) - Base constructs
- [Backend Reference](../../backend/README.md) - High-level backend patterns
- [Getting Started](../../../getting-started/README.md) - Quick start guide
- [Examples](../../../examples/README.md) - Complete examples