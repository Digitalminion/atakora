# Your First Stack

[Home](../README.md) > [Getting Started](./README.md) > Your First Stack

Build a complete infrastructure stack and learn Atakora's core concepts.

## What You'll Learn

- **Apps and Stacks** - How Atakora organizes infrastructure
- **Resources** - Building blocks of your infrastructure
- **Dependencies** - How resources reference each other
- **Best Practices** - Patterns for maintainable infrastructure

## Core Concepts

### App
The top-level container for your infrastructure. An App can contain multiple Stacks.

### Stack
A collection of Azure resources that are deployed together. Think of it as a deployment unit.

### Resource
An Azure service like a storage account, virtual network, or database.

## Project Structure

Let's build a real-world stack with networking, storage, and compute resources:

```bash
mkdir infrastructure-stack
cd infrastructure-stack
atakora init
```

## The Complete Stack

Create `src/index.ts`:

```typescript
import { App, Stack } from '@atakora/cdk';
import { ResourceGroup } from '@atakora/cdk/resourcegroup';
import { StorageAccount, BlobContainer } from '@atakora/cdk/storage';
import { VirtualNetwork, Subnet, NetworkSecurityGroup } from '@atakora/cdk/network';
import { AppServicePlan, WebApp } from '@atakora/cdk/web';

// Initialize the app
const app = new App();

// Create a stack for our infrastructure
const stack = new Stack(app, 'production-stack', {
  env: {
    region: 'eastus',
    subscription: process.env.AZURE_SUBSCRIPTION_ID
  },
  description: 'Production infrastructure stack'
});

// ========================================
// Base Resources
// ========================================

// Resource group to contain all resources
const resourceGroup = new ResourceGroup(stack, 'rg', {
  name: 'rg-production-eastus',
  location: 'eastus',
  tags: {
    environment: 'production',
    owner: 'platform-team',
    costCenter: 'engineering'
  }
});

// ========================================
// Networking Layer
// ========================================

// Virtual network for network isolation
const vnet = new VirtualNetwork(stack, 'vnet', {
  resourceGroupName: resourceGroup.name,
  vnetName: 'vnet-production',
  location: resourceGroup.location,
  addressSpace: {
    addressPrefixes: ['10.0.0.0/16']
  },
  tags: resourceGroup.tags
});

// Subnet for web applications
const webSubnet = new Subnet(stack, 'web-subnet', {
  resourceGroupName: resourceGroup.name,
  vnetName: vnet.name,
  subnetName: 'subnet-web',
  addressPrefix: '10.0.1.0/24'
});

// Subnet for data layer
const dataSubnet = new Subnet(stack, 'data-subnet', {
  resourceGroupName: resourceGroup.name,
  vnetName: vnet.name,
  subnetName: 'subnet-data',
  addressPrefix: '10.0.2.0/24'
});

// Network security group for web tier
const webNsg = new NetworkSecurityGroup(stack, 'web-nsg', {
  resourceGroupName: resourceGroup.name,
  nsgName: 'nsg-web-production',
  location: resourceGroup.location,
  securityRules: [
    {
      name: 'AllowHTTPS',
      priority: 100,
      direction: 'Inbound',
      access: 'Allow',
      protocol: 'Tcp',
      sourcePortRange: '*',
      destinationPortRange: '443',
      sourceAddressPrefix: 'Internet',
      destinationAddressPrefix: '*'
    },
    {
      name: 'AllowHTTP',
      priority: 101,
      direction: 'Inbound',
      access: 'Allow',
      protocol: 'Tcp',
      sourcePortRange: '*',
      destinationPortRange: '80',
      sourceAddressPrefix: 'Internet',
      destinationAddressPrefix: '*'
    }
  ],
  tags: resourceGroup.tags
});

// Associate NSG with web subnet
webSubnet.associateNetworkSecurityGroup(webNsg);

// ========================================
// Storage Layer
// ========================================

// Storage account for application data
const storage = new StorageAccount(stack, 'storage', {
  resourceGroupName: resourceGroup.name,
  accountName: 'stproduction' + Date.now(),
  location: resourceGroup.location,
  sku: {
    name: 'Standard_GRS' // Geo-redundant storage for production
  },
  kind: 'StorageV2',
  accessTier: 'Hot',
  minimumTlsVersion: 'TLS1_2',
  supportsHttpsTrafficOnly: true,
  tags: resourceGroup.tags
});

// Blob containers for different data types
const documentsContainer = new BlobContainer(stack, 'documents', {
  resourceGroupName: resourceGroup.name,
  storageAccountName: storage.accountName,
  containerName: 'documents',
  publicAccess: 'None'
});

const imagesContainer = new BlobContainer(stack, 'images', {
  resourceGroupName: resourceGroup.name,
  storageAccountName: storage.accountName,
  containerName: 'images',
  publicAccess: 'Blob' // Allow public read access to images
});

const backupsContainer = new BlobContainer(stack, 'backups', {
  resourceGroupName: resourceGroup.name,
  storageAccountName: storage.accountName,
  containerName: 'backups',
  publicAccess: 'None'
});

// ========================================
// Compute Layer
// ========================================

// App Service Plan for hosting web applications
const appServicePlan = new AppServicePlan(stack, 'app-plan', {
  resourceGroupName: resourceGroup.name,
  planName: 'plan-production',
  location: resourceGroup.location,
  sku: {
    name: 'P1v2',
    tier: 'PremiumV2',
    size: 'P1v2',
    family: 'Pv2',
    capacity: 2 // Number of instances
  },
  kind: 'Linux',
  reserved: true, // Required for Linux
  tags: resourceGroup.tags
});

// Web application
const webApp = new WebApp(stack, 'web-app', {
  resourceGroupName: resourceGroup.name,
  siteName: 'app-production-' + Date.now(),
  location: resourceGroup.location,
  serverFarmId: appServicePlan.id,
  siteConfig: {
    linuxFxVersion: 'NODE|18-lts',
    alwaysOn: true,
    http20Enabled: true,
    minTlsVersion: '1.2',
    appSettings: [
      {
        name: 'STORAGE_CONNECTION_STRING',
        value: storage.primaryConnectionString
      },
      {
        name: 'ENVIRONMENT',
        value: 'production'
      }
    ]
  },
  httpsOnly: true,
  tags: resourceGroup.tags
});

// Configure web app to use the virtual network
webApp.addVnetIntegration({
  subnetId: webSubnet.id
});

// ========================================
// Outputs
// ========================================

// Export important values for reference
stack.addOutput('ResourceGroupName', resourceGroup.name);
stack.addOutput('VirtualNetworkName', vnet.name);
stack.addOutput('StorageAccountName', storage.accountName);
stack.addOutput('WebAppUrl', `https://${webApp.defaultHostName}`);
stack.addOutput('StoragePrimaryEndpoint', storage.primaryEndpoints.blob);

// Synthesize the application
app.synth();
```

## Understanding the Code

### 1. Resource Dependencies

Resources automatically handle dependencies. When you reference `resourceGroup.name` in another resource, Atakora ensures the resource group is created first.

```typescript
const storage = new StorageAccount(stack, 'storage', {
  resourceGroupName: resourceGroup.name, // Creates dependency
  // ...
});
```

### 2. Resource Naming

Use consistent naming conventions:
- **Resource Groups**: `rg-{purpose}-{environment}-{region}`
- **Storage Accounts**: `st{purpose}{unique}` (no hyphens allowed)
- **Virtual Networks**: `vnet-{purpose}-{environment}`
- **Web Apps**: `app-{purpose}-{environment}`

### 3. Tagging Strategy

Apply consistent tags for cost tracking and management:

```typescript
const commonTags = {
  environment: 'production',
  owner: 'platform-team',
  costCenter: 'engineering',
  project: 'main-app'
};
```

### 4. Security Best Practices

Always enable security features:
- TLS 1.2 minimum
- HTTPS only for web apps
- Private containers for sensitive data
- Network security groups for access control

## Deploy Your Stack

```bash
# Install dependencies
npm install @atakora/cdk

# Synthesize ARM templates
atakora synth

# Review what will be deployed
atakora diff

# Deploy to Azure
atakora deploy
```

## Verify Deployment

```bash
# Check all resources were created
az resource list --resource-group rg-production-eastus --output table

# Test the web app
curl https://<your-web-app-url>

# Check storage account
az storage account show \
  --name <your-storage-account> \
  --resource-group rg-production-eastus
```

## Working with Multiple Environments

Create environment-specific stacks:

```typescript
const environment = process.env.ENVIRONMENT || 'dev';

const stack = new Stack(app, `${environment}-stack`, {
  env: {
    region: 'eastus',
    subscription: process.env.AZURE_SUBSCRIPTION_ID
  }
});

const resourceGroup = new ResourceGroup(stack, 'rg', {
  name: `rg-${environment}-eastus`,
  tags: {
    environment: environment
  }
});
```

Deploy different environments:

```bash
# Development
ENVIRONMENT=dev atakora deploy

# Staging
ENVIRONMENT=staging atakora deploy

# Production
ENVIRONMENT=prod atakora deploy
```

## Stack Organization Patterns

### Pattern 1: Single Stack
All resources in one stack - good for simple applications.

### Pattern 2: Layer-Based Stacks
```typescript
const networkStack = new Stack(app, 'network-stack');
const dataStack = new Stack(app, 'data-stack');
const computeStack = new Stack(app, 'compute-stack');
```

### Pattern 3: Environment-Based Stacks
```typescript
const devStack = new Stack(app, 'dev-stack');
const stagingStack = new Stack(app, 'staging-stack');
const prodStack = new Stack(app, 'prod-stack');
```

## Best Practices

### 1. Use Constants for Configuration

```typescript
const config = {
  location: 'eastus',
  environment: 'production',
  tags: {
    environment: 'production',
    owner: 'platform-team'
  }
};
```

### 2. Validate Resource Names

```typescript
function createStorageAccountName(prefix: string): string {
  // Storage account names must be 3-24 characters, lowercase letters and numbers only
  const unique = Date.now().toString(36);
  const name = `${prefix}${unique}`.toLowerCase().substring(0, 24);
  return name.replace(/[^a-z0-9]/g, '');
}
```

### 3. Handle Secrets Properly

Never hardcode secrets. Use Key Vault or environment variables:

```typescript
import { KeyVault } from '@atakora/cdk/keyvault';

const keyVault = new KeyVault(stack, 'keyvault', {
  resourceGroupName: resourceGroup.name,
  vaultName: 'kv-production',
  location: resourceGroup.location
});

// Reference secrets in app configuration
webApp.addAppSetting('DB_PASSWORD', keyVault.secretReference('db-password'));
```

## Clean Up

```bash
# Remove all resources
atakora destroy

# Verify resources are deleted
az group exists --name rg-production-eastus
```

## Next Steps

You've learned the fundamentals! Continue with:

- **[Azure Functions Apps](./04-Functions-App.md)** - Build serverless applications
- **[Advanced Patterns](./05-Next-Steps.md)** - Multi-region, high availability
- **[Real-World Examples](../examples/README.md)** - Production-ready patterns

## Troubleshooting

**Resource Already Exists?**
- Use unique names with timestamps or random suffixes
- Check existing resources: `az resource list`

**Deployment Timeout?**
- Some resources take longer (databases, large VMs)
- Increase timeout: `atakora deploy --timeout 30`

**Validation Errors?**
- Check [Common Validation Errors](../guides/validation/Common-Errors.md)
- Validate templates: `atakora validate`

---

**Need help?** See [Troubleshooting Guide](../troubleshooting/COMMON-ISSUES.md) or check [all documentation](../README.md)