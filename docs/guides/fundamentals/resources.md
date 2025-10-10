# Working with Azure Resources

[Getting Started](../../getting-started/README.md) > [Guides](../README.md) > [Fundamentals](./README.md) > Resources

Learn how to create, configure, and manage Azure resources using Atakora's type-safe, developer-friendly API.

## Overview

Resources are the building blocks of your Azure infrastructure. Atakora provides strongly-typed constructs for Azure resources that offer IntelliSense support, compile-time validation, and sensible defaults.

```typescript
import { AzureApp, ResourceGroupStack } from '@atakora/lib';
import { VirtualNetworks } from '@atakora/cdk/network';
import { StorageAccounts } from '@atakora/cdk/storage';

const app = new AzureApp({
  organization: 'Contoso',
  project: 'WebApp',
});

const stack = new ResourceGroupStack(app, 'Infrastructure', {
  resourceGroupName: 'rg-webapp-prod',
  location: 'eastus2',
});

// Create a virtual network
const vnet = new VirtualNetworks(stack, 'MainVNet', {
  virtualNetworkName: 'vnet-main-prod',
  addressSpace: {
    addressPrefixes: ['10.0.0.0/16'],
  },
});

// Create a storage account
const storage = new StorageAccounts(stack, 'AppStorage', {
  storageAccountName: 'stappprodstorage',
  sku: {
    name: 'Standard_GRS',
  },
  kind: 'StorageV2',
});
```

## Resource Structure

### Every Resource Has

1. **A Scope**: The parent construct (usually a stack or another resource)
2. **An ID**: A unique identifier within its scope
3. **Properties**: Configuration specific to the resource type
4. **A Resource Type**: The Azure Resource Manager type (e.g., `Microsoft.Network/virtualNetworks`)

```typescript
const vnet = new VirtualNetworks(
  stack,          // ← scope (parent)
  'MainVNet',     // ← id (unique within scope)
  {               // ← properties
    virtualNetworkName: 'vnet-main-prod',
    addressSpace: {
      addressPrefixes: ['10.0.0.0/16'],
    },
  }
);

console.log(vnet.type); // 'Microsoft.Network/virtualNetworks'
```

## Creating Resources

### Basic Resource Creation

```typescript
import { Sites } from '@atakora/cdk/web';

const webApp = new Sites(stack, 'WebApp', {
  siteName: 'webapp-contoso-prod',
  serverFarmId: '/subscriptions/.../serverfarms/asp-main',
  httpsOnly: true,
  siteConfig: {
    nodeVersion: '18-lts',
    alwaysOn: true,
  },
});
```

### Resources with Child Resources

Many Azure resources have child resources (subnets within a VNet, container groups within a storage account, etc.):

```typescript
const vnet = new VirtualNetworks(stack, 'MainVNet', {
  virtualNetworkName: 'vnet-main',
  addressSpace: { addressPrefixes: ['10.0.0.0/16'] },
});

// Subnet is a child of the VNet
const webSubnet = new Subnets(vnet, 'WebSubnet', {
  subnetName: 'snet-web',
  addressPrefix: '10.0.1.0/24',
});

const appSubnet = new Subnets(vnet, 'AppSubnet', {
  subnetName: 'snet-app',
  addressPrefix: '10.0.2.0/24',
});

const dataSubnet = new Subnets(vnet, 'DataSubnet', {
  subnetName: 'snet-data',
  addressPrefix: '10.0.3.0/24',
  serviceEndpoints: [
    { service: 'Microsoft.Storage' },
    { service: 'Microsoft.Sql' },
  ],
});
```

### Resources with Dependencies

Resources can depend on other resources. Atakora tracks these dependencies automatically:

```typescript
// Create a storage account
const storage = new StorageAccounts(stack, 'Storage', {
  storageAccountName: 'stappdata',
  sku: { name: 'Standard_LRS' },
});

// Create a web app that uses the storage account
const webApp = new Sites(stack, 'WebApp', {
  siteName: 'webapp-main',
  serverFarmId: '/subscriptions/.../serverfarms/asp-main',
  siteConfig: {
    appSettings: [
      {
        name: 'STORAGE_CONNECTION_STRING',
        value: storage.primaryConnectionString, // Dependency!
      },
    ],
  },
});

// Atakora ensures storage is created before webApp
```

## Resource Properties

### Required vs. Optional Properties

TypeScript enforces required properties at compile time:

```typescript
// ✓ Correct: All required properties provided
const storage = new StorageAccounts(stack, 'Storage', {
  storageAccountName: 'stappdata',     // Required
  sku: { name: 'Standard_LRS' },       // Required
  kind: 'StorageV2',                   // Required
});

// ✗ Error: Missing required properties
const storage = new StorageAccounts(stack, 'Storage', {
  // TypeScript error: missing storageAccountName, sku, kind
});
```

### Property Types

Properties are strongly typed based on Azure ARM schemas:

```typescript
import { StorageAccounts, SkuName, Kind } from '@atakora/cdk/storage';

const storage = new StorageAccounts(stack, 'Storage', {
  storageAccountName: 'stappdata',

  // Enum type - only valid values accepted
  sku: {
    name: SkuName.STANDARD_GRS, // or 'Standard_GRS'
  },

  // Enum type
  kind: Kind.STORAGE_V2, // or 'StorageV2'

  // Boolean type
  enableHttpsTrafficOnly: true,

  // Complex object type
  networkRuleSet: {
    defaultAction: 'Deny',
    bypass: 'AzureServices',
    ipRules: [
      { value: '203.0.113.0/24', action: 'Allow' },
    ],
    virtualNetworkRules: [
      { id: webSubnet.id, action: 'Allow' },
    ],
  },
});
```

### Default Values

Many properties have sensible defaults and can be omitted:

```typescript
const storage = new StorageAccounts(stack, 'Storage', {
  storageAccountName: 'stappdata',
  sku: { name: 'Standard_LRS' },
  kind: 'StorageV2',
  // Defaults applied:
  // - enableHttpsTrafficOnly: true
  // - minimumTlsVersion: 'TLS1_2'
  // - allowBlobPublicAccess: false
  // - supportsHttpsTrafficOnly: true
});
```

## Common Resource Types

### Network Resources

```typescript
import {
  VirtualNetworks,
  Subnets,
  NetworkSecurityGroups,
  SecurityRules,
  PublicIPAddresses,
} from '@atakora/cdk/network';

// Virtual Network
const vnet = new VirtualNetworks(stack, 'VNet', {
  virtualNetworkName: 'vnet-main',
  addressSpace: {
    addressPrefixes: ['10.0.0.0/16'],
  },
});

// Subnet
const subnet = new Subnets(vnet, 'Subnet', {
  subnetName: 'snet-app',
  addressPrefix: '10.0.1.0/24',
});

// Network Security Group
const nsg = new NetworkSecurityGroups(stack, 'NSG', {
  networkSecurityGroupName: 'nsg-app',
  securityRules: [
    {
      name: 'AllowHTTPS',
      priority: 100,
      direction: 'Inbound',
      access: 'Allow',
      protocol: 'Tcp',
      sourcePortRange: '*',
      destinationPortRange: '443',
      sourceAddressPrefix: '*',
      destinationAddressPrefix: '*',
    },
  ],
});

// Public IP Address
const publicIp = new PublicIPAddresses(stack, 'PublicIP', {
  publicIpAddressName: 'pip-gateway',
  publicIPAllocationMethod: 'Static',
  sku: { name: 'Standard' },
});
```

### Storage Resources

```typescript
import {
  StorageAccounts,
  BlobServices,
  BlobContainers,
  FileShares,
} from '@atakora/cdk/storage';

// Storage Account
const storage = new StorageAccounts(stack, 'Storage', {
  storageAccountName: 'stappdata',
  sku: { name: 'Standard_GRS' },
  kind: 'StorageV2',
  enableHttpsTrafficOnly: true,
});

// Blob Service
const blobService = new BlobServices(storage, 'BlobService', {
  // Properties for blob service
  deleteRetentionPolicy: {
    enabled: true,
    days: 7,
  },
});

// Blob Container
const container = new BlobContainers(blobService, 'DataContainer', {
  containerName: 'application-data',
  publicAccess: 'None',
});

// File Share
const fileShare = new FileShares(storage, 'ConfigShare', {
  shareName: 'config',
  shareQuota: 100, // GB
});
```

### Web Resources

```typescript
import {
  ServerFarms,
  Sites,
  SiteConfig,
} from '@atakora/cdk/web';

// App Service Plan
const appServicePlan = new ServerFarms(stack, 'AppServicePlan', {
  serverFarmName: 'asp-webapp',
  sku: {
    name: 'P1v3',
    tier: 'PremiumV3',
    capacity: 2,
  },
  kind: 'linux',
  reserved: true, // Required for Linux
});

// Web App
const webApp = new Sites(stack, 'WebApp', {
  siteName: 'webapp-contoso',
  serverFarmId: appServicePlan.id,
  httpsOnly: true,
  siteConfig: {
    linuxFxVersion: 'NODE|18-lts',
    alwaysOn: true,
    http20Enabled: true,
    minTlsVersion: '1.2',
    ftpsState: 'Disabled',
    appSettings: [
      { name: 'WEBSITE_NODE_DEFAULT_VERSION', value: '~18' },
      { name: 'NODE_ENV', value: 'production' },
    ],
    connectionStrings: [
      {
        name: 'Database',
        connectionString: 'Server=...;Database=...;',
        type: 'SQLAzure',
      },
    ],
  },
});
```

## Resource References

### Using Resource IDs

Resources expose their Azure Resource ID through the `id` property:

```typescript
const vnet = new VirtualNetworks(stack, 'VNet', {
  virtualNetworkName: 'vnet-main',
  addressSpace: { addressPrefixes: ['10.0.0.0/16'] },
});

console.log(vnet.id);
// /subscriptions/{subscription-id}/resourceGroups/{rg-name}/providers/Microsoft.Network/virtualNetworks/vnet-main

// Use the ID to reference the resource
const subnet = new Subnets(vnet, 'Subnet', {
  subnetName: 'snet-app',
  addressPrefix: '10.0.1.0/24',
});

const webApp = new Sites(stack, 'WebApp', {
  siteName: 'webapp-main',
  serverFarmId: '/subscriptions/.../serverfarms/asp-main',
  virtualNetworkSubnetId: subnet.id, // Reference the subnet
});
```

### Importing Existing Resources

Reference resources that already exist in Azure:

```typescript
import { VirtualNetworks } from '@atakora/cdk/network';

// Reference an existing VNet by ID
const existingVNetId = '/subscriptions/xxx/resourceGroups/rg-shared/providers/Microsoft.Network/virtualNetworks/vnet-shared';

const webApp = new Sites(stack, 'WebApp', {
  siteName: 'webapp-main',
  serverFarmId: '/subscriptions/.../serverfarms/asp-main',
  virtualNetworkSubnetId: `${existingVNetId}/subnets/snet-app`,
});
```

## Resource Configuration Patterns

### Environment-Specific Configuration

Use configuration objects to manage environment differences:

```typescript
interface EnvironmentConfig {
  storageSku: string;
  appServicePlanSku: string;
  enableBackups: boolean;
}

const envConfigs: Record<string, EnvironmentConfig> = {
  dev: {
    storageSku: 'Standard_LRS',
    appServicePlanSku: 'B1',
    enableBackups: false,
  },
  prod: {
    storageSku: 'Standard_GRS',
    appServicePlanSku: 'P1v3',
    enableBackups: true,
  },
};

const environment = process.env.ENVIRONMENT || 'dev';
const config = envConfigs[environment];

const storage = new StorageAccounts(stack, 'Storage', {
  storageAccountName: `stapp${environment}`,
  sku: { name: config.storageSku },
  kind: 'StorageV2',
});

const appServicePlan = new ServerFarms(stack, 'AppServicePlan', {
  serverFarmName: `asp-${environment}`,
  sku: { name: config.appServicePlanSku },
});
```

### Conditional Resources

Create resources conditionally based on configuration:

```typescript
const enableMonitoring = process.env.ENABLE_MONITORING === 'true';

if (enableMonitoring) {
  const logAnalytics = new Workspaces(stack, 'LogAnalytics', {
    workspaceName: 'law-app-monitoring',
    sku: { name: 'PerGB2018' },
  });

  const appInsights = new Components(stack, 'AppInsights', {
    componentName: 'ai-app',
    applicationType: 'web',
    workspaceResourceId: logAnalytics.id,
  });
}
```

### Resource Collections

Create multiple similar resources using loops:

```typescript
const regions = ['eastus2', 'westus2', 'centralus'];

regions.forEach((region, index) => {
  const regionalStack = new ResourceGroupStack(app, `Region${index}`, {
    resourceGroupName: `rg-app-${region}`,
    location: region,
  });

  const storage = new StorageAccounts(regionalStack, 'Storage', {
    storageAccountName: `stapp${region.replace(/[^a-z0-9]/g, '')}`,
    sku: { name: 'Standard_GRS' },
    kind: 'StorageV2',
  });

  const webApp = new Sites(regionalStack, 'WebApp', {
    siteName: `webapp-${region}`,
    serverFarmId: '/subscriptions/.../serverfarms/asp-main',
  });
});
```

## Resource Outputs

### Accessing Resource Properties

Resources expose properties that can be used by other resources or outputs:

```typescript
const storage = new StorageAccounts(stack, 'Storage', {
  storageAccountName: 'stappdata',
  sku: { name: 'Standard_LRS' },
  kind: 'StorageV2',
});

// Access resource properties
console.log(storage.name); // 'stappdata'
console.log(storage.id); // Full Azure Resource ID
console.log(storage.type); // 'Microsoft.Storage/storageAccounts'

// Use in other resources
const webApp = new Sites(stack, 'WebApp', {
  siteName: 'webapp-main',
  serverFarmId: '/subscriptions/.../serverfarms/asp-main',
  siteConfig: {
    appSettings: [
      {
        name: 'STORAGE_ACCOUNT_NAME',
        value: storage.name,
      },
    ],
  },
});
```

### Stack Outputs

Export resource properties as stack outputs:

```typescript
import { Output } from '@atakora/lib';

const storage = new StorageAccounts(stack, 'Storage', {
  storageAccountName: 'stappdata',
  sku: { name: 'Standard_LRS' },
  kind: 'StorageV2',
});

new Output(stack, 'StorageAccountName', {
  value: storage.name,
  description: 'The name of the storage account',
});

new Output(stack, 'StorageAccountId', {
  value: storage.id,
  description: 'The resource ID of the storage account',
});

// Outputs appear in ARM template and deployment results
```

## Resource Tags

### Adding Tags

Tags help organize and track resources for cost management, ownership, and automation:

```typescript
const storage = new StorageAccounts(stack, 'Storage', {
  storageAccountName: 'stappdata',
  sku: { name: 'Standard_LRS' },
  kind: 'StorageV2',
  tags: {
    environment: 'production',
    costCenter: '1234',
    owner: 'platform-team',
    application: 'ecommerce',
  },
});
```

### Inheriting Tags from Stack

Tags set at the stack level are automatically inherited:

```typescript
const stack = new ResourceGroupStack(app, 'Infrastructure', {
  resourceGroupName: 'rg-app-prod',
  location: 'eastus2',
  tags: {
    environment: 'production',
    managedBy: 'atakora',
  },
});

// Inherits tags from stack
const storage = new StorageAccounts(stack, 'Storage', {
  storageAccountName: 'stappdata',
  sku: { name: 'Standard_LRS' },
  kind: 'StorageV2',
  // Additional resource-specific tags
  tags: {
    purpose: 'application-data',
  },
});

// Merged tags:
// - environment: production (from stack)
// - managedBy: atakora (from stack)
// - purpose: application-data (resource-specific)
```

## Best Practices

### 1. Use Descriptive IDs

Resource IDs should clearly indicate the resource's purpose:

```typescript
// Good
const webAppStorage = new StorageAccounts(stack, 'WebAppStorage', {...});
const configFileShare = new FileShares(storage, 'ConfigFileShare', {...});

// Avoid
const storage1 = new StorageAccounts(stack, 'Storage1', {...});
const share = new FileShares(storage, 'Share', {...});
```

### 2. Group Related Resources

Keep related resources in the same stack or close together in code:

```typescript
// Network infrastructure together
const vnet = new VirtualNetworks(stack, 'VNet', {...});
const subnet = new Subnets(vnet, 'Subnet', {...});
const nsg = new NetworkSecurityGroups(stack, 'NSG', {...});

// Storage resources together
const storage = new StorageAccounts(stack, 'Storage', {...});
const container = new BlobContainers(storage, 'Container', {...});
const fileShare = new FileShares(storage, 'FileShare', {...});
```

### 3. Validate Configuration

Add validation to catch configuration errors early:

```typescript
function createStorageAccount(
  stack: ResourceGroupStack,
  environment: string
): StorageAccounts {
  if (!['dev', 'staging', 'prod'].includes(environment)) {
    throw new Error(`Invalid environment: ${environment}`);
  }

  const skuMap = {
    dev: 'Standard_LRS',
    staging: 'Standard_GRS',
    prod: 'Premium_LRS',
  };

  return new StorageAccounts(stack, 'Storage', {
    storageAccountName: `stapp${environment}`,
    sku: { name: skuMap[environment] },
    kind: 'StorageV2',
  });
}
```

### 4. Use Type-Safe Enums

Prefer enums over string literals for better type safety:

```typescript
import { SkuName, Kind } from '@atakora/cdk/storage';

// Good: Type-safe enum
const storage = new StorageAccounts(stack, 'Storage', {
  storageAccountName: 'stappdata',
  sku: { name: SkuName.STANDARD_GRS },
  kind: Kind.STORAGE_V2,
});

// Acceptable: String literal (still type-checked)
const storage = new StorageAccounts(stack, 'Storage', {
  storageAccountName: 'stappdata',
  sku: { name: 'Standard_GRS' },
  kind: 'StorageV2',
});
```

### 5. Document Complex Configurations

Add comments to explain non-obvious configuration:

```typescript
const webApp = new Sites(stack, 'WebApp', {
  siteName: 'webapp-main',
  serverFarmId: appServicePlan.id,

  // Enable virtual network integration for secure access to backend services
  virtualNetworkSubnetId: subnet.id,

  siteConfig: {
    // Use Node.js 18 LTS for long-term support
    linuxFxVersion: 'NODE|18-lts',

    // Keep the app always warm to avoid cold starts
    alwaysOn: true,

    // Require TLS 1.2 or higher for security compliance
    minTlsVersion: '1.2',
  },
});
```

## Troubleshooting

### Property Not Found

**Problem**: TypeScript error saying a property doesn't exist.

**Solution**: Check that you're using the correct property name from the Azure ARM schema. Property names are case-sensitive and must match exactly.

```typescript
// ✗ Error: Property 'enableHttpsTrafficOnly' does not exist
const storage = new StorageAccounts(stack, 'Storage', {
  storageAccountName: 'stappdata',
  sku: { name: 'Standard_LRS' },
  kind: 'StorageV2',
  enableHttpsTrafficOnly: true, // ← Check spelling and casing
});
```

### Invalid Property Value

**Problem**: Runtime error about invalid property value.

**Solution**: Ensure values match the allowed values from the Azure ARM schema. Use enums when available.

```typescript
// ✗ Error: Invalid SKU name
const storage = new StorageAccounts(stack, 'Storage', {
  storageAccountName: 'stappdata',
  sku: { name: 'Standard_XYZ' }, // Invalid SKU
  kind: 'StorageV2',
});

// ✓ Correct: Valid SKU
const storage = new StorageAccounts(stack, 'Storage', {
  storageAccountName: 'stappdata',
  sku: { name: 'Standard_LRS' }, // Valid SKU
  kind: 'StorageV2',
});
```

### Resource Dependency Issues

**Problem**: Resources are created in the wrong order.

**Solution**: Ensure resources reference each other properly. Atakora automatically tracks dependencies based on references.

```typescript
// Automatic dependency: subnet depends on vnet
const vnet = new VirtualNetworks(stack, 'VNet', {...});
const subnet = new Subnets(vnet, 'Subnet', {...}); // vnet created first

// Automatic dependency: webApp depends on subnet
const webApp = new Sites(stack, 'WebApp', {
  virtualNetworkSubnetId: subnet.id, // subnet created first
});
```

## See Also

- **[App and Stacks](./app-and-stacks.md)** - Understanding the construct tree
- **[Synthesis](./synthesis.md)** - How resources become ARM templates
- **[Network Resources API](../../reference/api/cdk/network.md)** - Network resource reference
- **[Storage Resources API](../../reference/api/cdk/storage.md)** - Storage resource reference
- **[Web Resources API](../../reference/api/cdk/web.md)** - Web resource reference
- **[Adding Resources Guide](../workflows/adding-resources.md)** - How to add new resource types

---

**Next**: Learn about [synthesis and template generation](./synthesis.md)
