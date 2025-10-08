# Your First Stack

[Home](../README.md) > [Getting Started](./README.md) > Your First Stack

Build a complete infrastructure stack with best practices. This tutorial takes you beyond the quickstart to create production-ready infrastructure with networking, security, and storage.

## What You'll Build

A production-ready infrastructure stack with:

- Resource Group for resource organization
- Virtual Network with multiple subnets
- Network Security Group with security rules
- Storage Account with blob containers
- Proper tagging and naming conventions
- Resource dependencies and references

**Estimated time**: 20 minutes

## Prerequisites

- Completed the [5-Minute Quickstart](./quickstart.md) or familiar with Atakora basics
- Atakora CLI installed
- Azure CLI authenticated
- Active Azure subscription

## Project Structure Overview

An Atakora project follows this structure:

```
my-infrastructure/
├── .atakora/
│   ├── manifest.json          # Project configuration
│   └── arm.out/               # Generated ARM templates
├── packages/
│   └── platform/              # Infrastructure package
│       ├── bin/
│       │   └── app.ts        # Entry point - your infrastructure code
│       ├── lib/               # Reusable constructs (optional)
│       ├── test/              # Unit tests (optional)
│       ├── package.json
│       └── tsconfig.json
├── package.json               # Workspace configuration
└── tsconfig.json              # TypeScript configuration
```

**Key concepts:**

- **App** - Root container for all infrastructure (one per project)
- **Stack** - Deployment unit that maps to an ARM deployment
- **Resources** - Azure resources like VNets, Storage Accounts, etc.
- **Constructs** - Reusable infrastructure components

## Step 1: Initialize the Project

Create a new project or use an existing one:

```bash
# Create new project
mkdir production-infrastructure
cd production-infrastructure
npx atakora init

# Or use existing project from quickstart
cd my-infrastructure
```

**Configure project settings** when prompted:

```
? Organization name: Contoso
? Project name: ProductionPlatform
? First package name: networking
```

**Install dependencies:**

```bash
npm install
```

## Step 2: Understanding Apps and Stacks

Open `packages/networking/bin/app.ts`. You'll see the basic structure:

```typescript
import { AzureApp, SubscriptionStack } from '@atakora/lib';

const app = new AzureApp({
  organization: 'Contoso',
  project: 'ProductionPlatform',
});

const stack = new SubscriptionStack(app, 'Main', {
  subscriptionId: process.env.AZURE_SUBSCRIPTION_ID!,
  environment: 'nonprod',
  instance: 1,
});

app.synth();
```

**AzureApp** is the root of your infrastructure:
- Contains all stacks
- Handles synthesis (converting TypeScript to ARM templates)
- Organization and project names are used in resource naming

**SubscriptionStack** defines a deployment scope:
- Maps to an Azure subscription-level deployment
- Has an environment (nonprod, prod, sandbox, gov)
- Has an instance number (for deploying multiple copies)
- Can create resource groups and resources

## Step 3: Choose Your Stack Type

Atakora provides different stack types for different deployment scopes:

### ResourceGroupStack (Recommended for Beginners)

Deploys to a specific resource group:

```typescript
import { AzureApp, ResourceGroupStack } from '@atakora/lib';

const app = new AzureApp({
  organization: 'Contoso',
  project: 'ProductionPlatform',
});

const stack = new ResourceGroupStack(app, 'NetworkStack', {
  resourceGroupName: 'rg-platform-networking',
  location: 'eastus2',
  tags: {
    environment: 'production',
    owner: 'platform-team',
    costCenter: 'infrastructure'
  }
});
```

**When to use:**
- Most common use case
- Resources belong to a single resource group
- Simpler permissions model

### SubscriptionStack

Deploys at subscription level (can create resource groups):

```typescript
import { AzureApp, SubscriptionStack } from '@atakora/lib';

const app = new AzureApp({
  organization: 'Contoso',
  project: 'ProductionPlatform',
});

const stack = new SubscriptionStack(app, 'Foundation', {
  subscriptionId: process.env.AZURE_SUBSCRIPTION_ID!,
  environment: 'prod',
  instance: 1,
});
```

**When to use:**
- Need to create resource groups
- Deploy subscription-level resources (policies, role assignments)
- Multi-resource-group infrastructure

For this tutorial, we'll use **ResourceGroupStack** for simplicity.

## Step 4: Define Your Infrastructure

Replace the contents of `packages/networking/bin/app.ts` with this complete infrastructure:

```typescript
import { AzureApp, ResourceGroupStack } from '@atakora/lib';
import {
  VirtualNetworks,
  Subnets,
  NetworkSecurityGroups,
  SecurityRules
} from '@atakora/cdk/network';
import {
  StorageAccounts,
  BlobContainers
} from '@atakora/cdk/storage';

// Create the Atakora application
const app = new AzureApp({
  organization: 'Contoso',
  project: 'ProductionPlatform',
});

// Define the stack - deploys to a resource group
const stack = new ResourceGroupStack(app, 'NetworkStack', {
  resourceGroupName: 'rg-platform-networking',
  location: 'eastus2',
  tags: {
    environment: 'production',
    owner: 'platform-team',
    managedBy: 'atakora'
  }
});

// Virtual Network - the foundation of network infrastructure
const vnet = new VirtualNetworks(stack, 'PlatformVNet', {
  virtualNetworkName: 'vnet-platform-prod',
  addressSpace: {
    addressPrefixes: ['10.0.0.0/16']
  },
  tags: {
    purpose: 'platform-networking'
  }
});

// Application Subnet - for application workloads
const appSubnet = new Subnets(stack, 'AppSubnet', {
  virtualNetworkName: vnet.name,
  subnetName: 'snet-applications',
  addressPrefix: '10.0.1.0/24'
});

// Data Subnet - for databases and data services
const dataSubnet = new Subnets(stack, 'DataSubnet', {
  virtualNetworkName: vnet.name,
  subnetName: 'snet-data',
  addressPrefix: '10.0.2.0/24'
});

// Management Subnet - for bastion, monitoring, etc.
const mgmtSubnet = new Subnets(stack, 'MgmtSubnet', {
  virtualNetworkName: vnet.name,
  subnetName: 'snet-management',
  addressPrefix: '10.0.3.0/24'
});

// Network Security Group - controls inbound and outbound traffic
const appNsg = new NetworkSecurityGroups(stack, 'AppNSG', {
  networkSecurityGroupName: 'nsg-app-subnet',
  location: 'eastus2',
  tags: {
    subnet: 'applications'
  }
});

// Security Rule - Allow HTTPS inbound
const httpsRule = new SecurityRules(stack, 'AllowHTTPS', {
  networkSecurityGroupName: appNsg.name,
  securityRuleName: 'AllowHTTPS',
  priority: 100,
  direction: 'Inbound',
  access: 'Allow',
  protocol: 'Tcp',
  sourcePortRange: '*',
  destinationPortRange: '443',
  sourceAddressPrefix: 'Internet',
  destinationAddressPrefix: '*',
  description: 'Allow HTTPS traffic from Internet'
});

// Security Rule - Allow HTTP inbound (redirect to HTTPS in practice)
const httpRule = new SecurityRules(stack, 'AllowHTTP', {
  networkSecurityGroupName: appNsg.name,
  securityRuleName: 'AllowHTTP',
  priority: 110,
  direction: 'Inbound',
  access: 'Allow',
  protocol: 'Tcp',
  sourcePortRange: '*',
  destinationPortRange: '80',
  sourceAddressPrefix: 'Internet',
  destinationAddressPrefix: '*',
  description: 'Allow HTTP traffic from Internet'
});

// Storage Account - for application data, logs, backups
const storage = new StorageAccounts(stack, 'PlatformStorage', {
  accountName: 'stplatformprod001',
  location: 'eastus2',
  sku: {
    name: 'Standard_GRS'  // Geo-redundant storage for production
  },
  kind: 'StorageV2',
  minimumTlsVersion: 'TLS1_2',
  allowBlobPublicAccess: false,  // Security best practice
  enableHttpsTrafficOnly: true,   // Require HTTPS
  tags: {
    purpose: 'platform-storage'
  }
});

// Blob Container - for application logs
const logsContainer = new BlobContainers(stack, 'LogsContainer', {
  accountName: storage.name,
  containerName: 'logs',
  publicAccess: 'None'
});

// Blob Container - for application data
const dataContainer = new BlobContainers(stack, 'DataContainer', {
  accountName: storage.name,
  containerName: 'app-data',
  publicAccess: 'None'
});

// Blob Container - for backups
const backupsContainer = new BlobContainers(stack, 'BackupsContainer', {
  accountName: storage.name,
  containerName: 'backups',
  publicAccess: 'None'
});

// Synthesize ARM templates
app.synth();
```

## Step 5: Understanding the Code

Let's break down what each section does:

### Virtual Network

```typescript
const vnet = new VirtualNetworks(stack, 'PlatformVNet', {
  virtualNetworkName: 'vnet-platform-prod',
  addressSpace: {
    addressPrefixes: ['10.0.0.0/16']  // 65,536 IP addresses
  }
});
```

The virtual network provides:
- Isolated network environment in Azure
- Address space for subnets
- Foundation for network security

### Subnets

```typescript
const appSubnet = new Subnets(stack, 'AppSubnet', {
  virtualNetworkName: vnet.name,  // Reference to VNet
  subnetName: 'snet-applications',
  addressPrefix: '10.0.1.0/24'    // 256 IP addresses
});
```

**Note the dependency**: `virtualNetworkName: vnet.name`

This creates a reference from the subnet to the VNet. Atakora automatically:
- Orders resources correctly in ARM template
- Creates proper `dependsOn` relationships
- Handles resource ID references

### Network Security Groups

```typescript
const appNsg = new NetworkSecurityGroups(stack, 'AppNSG', {
  networkSecurityGroupName: 'nsg-app-subnet',
  location: 'eastus2'
});

const httpsRule = new SecurityRules(stack, 'AllowHTTPS', {
  networkSecurityGroupName: appNsg.name,  // Reference to NSG
  securityRuleName: 'AllowHTTPS',
  priority: 100,
  direction: 'Inbound',
  access: 'Allow',
  protocol: 'Tcp',
  destinationPortRange: '443'
});
```

Security rules define traffic filtering:
- Lower priority numbers are evaluated first
- Rules cascade (first match wins)
- Inbound and outbound rules are separate

### Storage Account

```typescript
const storage = new StorageAccounts(stack, 'PlatformStorage', {
  accountName: 'stplatformprod001',  // Must be globally unique
  sku: {
    name: 'Standard_GRS'  // Geo-redundant storage
  },
  minimumTlsVersion: 'TLS1_2',
  enableHttpsTrafficOnly: true  // Security best practice
});
```

**Production best practices:**
- Use GRS (Geo-Redundant Storage) for durability
- Require TLS 1.2 minimum
- Enforce HTTPS-only traffic
- Disable public blob access by default

## Step 6: Set Environment Variables

Before synthesis, set required environment variables:

```bash
export AZURE_SUBSCRIPTION_ID=$(az account show --query id --output tsv)
```

**Optional**: Set default location if not specified in code:

```bash
export AZURE_LOCATION="eastus2"
```

## Step 7: Synthesize ARM Templates

Generate ARM templates from your TypeScript code:

```bash
npm run synth
```

**Expected output:**

```
✓ Compiled TypeScript
✓ Synthesized 1 stack
✓ Validated templates

Stacks:
  ✓ NetworkStack (11 resources)

Output: .atakora/arm.out/networking/
```

**View the generated template:**

```bash
cat .atakora/arm.out/networking/NetworkStack.json
```

You'll see:
- All 11 resources defined
- Proper `dependsOn` relationships
- Resource IDs correctly referenced
- Parameters and variables

## Step 8: Validate Before Deployment

Before deploying to Azure, validate the template:

```bash
npm run synth -- --validate-only
```

This checks:
- ARM schema compliance
- Resource type correctness
- Required properties present
- Location constraints
- Naming conventions

**If validation fails**, review error messages and fix issues in your code.

## Step 9: Preview Changes

See what will be deployed without actually deploying:

```bash
npm run deploy -- --dry-run
```

**Expected output:**

```
Stack: NetworkStack
Location: eastus2

Resources to create:
  + Microsoft.Network/virtualNetworks (vnet-platform-prod)
  + Microsoft.Network/virtualNetworks/subnets (snet-applications)
  + Microsoft.Network/virtualNetworks/subnets (snet-data)
  + Microsoft.Network/virtualNetworks/subnets (snet-management)
  + Microsoft.Network/networkSecurityGroups (nsg-app-subnet)
  + Microsoft.Network/networkSecurityGroups/securityRules (AllowHTTPS)
  + Microsoft.Network/networkSecurityGroups/securityRules (AllowHTTP)
  + Microsoft.Storage/storageAccounts (stplatformprod001)
  + Microsoft.Storage/storageAccounts/blobServices/containers (logs)
  + Microsoft.Storage/storageAccounts/blobServices/containers (app-data)
  + Microsoft.Storage/storageAccounts/blobServices/containers (backups)
```

## Step 10: Deploy to Azure

Deploy your infrastructure:

```bash
npm run deploy
```

**Deployment progress:**

```
Deploying stack: NetworkStack
Location: eastus2

? Proceed with deployment? (Y/n) y

✓ Template validation passed
→ Deployment started
→ Creating resource group...
→ Creating virtual network...
→ Creating subnets...
→ Creating network security group...
→ Creating security rules...
→ Creating storage account...
→ Creating blob containers...
✓ Deployment succeeded

Deployment details:
  Resource Group: rg-platform-networking
  Resources: 11 created
  Duration: 2 minutes 15 seconds
```

## Step 11: Verify Deployment

Check deployed resources in Azure Portal:

1. Navigate to https://portal.azure.com
2. Search for "rg-platform-networking"
3. View resources: VNet, Subnets, NSG, Storage Account

**Or use Azure CLI:**

```bash
# List all resources
az resource list \
  --resource-group rg-platform-networking \
  --output table

# View virtual network details
az network vnet show \
  --resource-group rg-platform-networking \
  --name vnet-platform-prod \
  --output json

# View storage account
az storage account show \
  --resource-group rg-platform-networking \
  --name stplatformprod001 \
  --output table
```

## Step 12: Make Changes and Redeploy

Infrastructure-as-code allows you to iterate easily. Let's add another subnet:

**Edit `bin/app.ts`** and add:

```typescript
// Services Subnet - for shared services
const servicesSubnet = new Subnets(stack, 'ServicesSubnet', {
  virtualNetworkName: vnet.name,
  subnetName: 'snet-services',
  addressPrefix: '10.0.4.0/24'
});
```

**Synthesize again:**

```bash
npm run synth
```

**Preview changes:**

```bash
npm run diff
```

**Expected output:**

```
Stack: NetworkStack

Resources to add:
  + Microsoft.Network/virtualNetworks/subnets (snet-services)

Resources to modify:
  (none)

Resources to remove:
  (none)
```

**Deploy the change:**

```bash
npm run deploy
```

Only the new subnet will be created. Existing resources remain unchanged.

## Best Practices Applied

This tutorial demonstrates several best practices:

### Naming Conventions

- **Resource groups**: `rg-{purpose}-{environment}`
- **Virtual networks**: `vnet-{purpose}-{environment}`
- **Subnets**: `snet-{purpose}`
- **Storage accounts**: `st{purpose}{environment}{instance}`
- **NSGs**: `nsg-{associated-resource}`

See [Naming Conventions Reference](../reference/naming-conventions.md) for complete guide.

### Tagging Strategy

```typescript
tags: {
  environment: 'production',
  owner: 'platform-team',
  managedBy: 'atakora',
  costCenter: 'infrastructure'
}
```

Consistent tagging enables:
- Cost tracking and allocation
- Resource organization
- Automated governance
- Easy identification of ownership

### Security Defaults

- Minimum TLS version: 1.2
- HTTPS-only storage access
- Public blob access disabled
- Network security groups on subnets

### Resource Organization

- Logical subnet separation (app, data, management)
- Security rules with descriptive names
- Separate blob containers for different purposes

## Common Patterns

### Resource References

When one resource depends on another, use the resource's properties:

```typescript
const vnet = new VirtualNetworks(stack, 'VNet', { /* ... */ });

const subnet = new Subnets(stack, 'Subnet', {
  virtualNetworkName: vnet.name,  // Reference VNet by name
  // ...
});
```

Atakora automatically:
- Creates `dependsOn` relationships
- Generates proper resource IDs
- Orders deployment correctly

### Conditional Resources

Create resources based on environment:

```typescript
const isProd = process.env.ENVIRONMENT === 'production';

const storage = new StorageAccounts(stack, 'Storage', {
  accountName: 'stplatform001',
  sku: {
    name: isProd ? 'Standard_GRS' : 'Standard_LRS'
  }
});
```

### Resource Loops

Create multiple similar resources:

```typescript
const subnetConfigs = [
  { name: 'app', prefix: '10.0.1.0/24' },
  { name: 'data', prefix: '10.0.2.0/24' },
  { name: 'mgmt', prefix: '10.0.3.0/24' }
];

subnetConfigs.forEach((config, index) => {
  new Subnets(stack, `Subnet${index}`, {
    virtualNetworkName: vnet.name,
    subnetName: `snet-${config.name}`,
    addressPrefix: config.prefix
  });
});
```

## Testing Your Infrastructure

While not covered in this tutorial, you can unit test infrastructure code:

```typescript
// test/network-stack.test.ts
import { AzureApp, ResourceGroupStack } from '@atakora/lib';
import { VirtualNetworks } from '@atakora/cdk/network';

test('VNet has correct address space', () => {
  const app = new AzureApp({
    organization: 'Test',
    project: 'Test'
  });

  const stack = new ResourceGroupStack(app, 'Test', {
    resourceGroupName: 'test-rg',
    location: 'eastus2'
  });

  const vnet = new VirtualNetworks(stack, 'VNet', {
    virtualNetworkName: 'vnet-test',
    addressSpace: {
      addressPrefixes: ['10.0.0.0/16']
    }
  });

  const template = app.synth();
  expect(template).toHaveResource('Microsoft.Network/virtualNetworks', {
    properties: {
      addressSpace: {
        addressPrefixes: ['10.0.0.0/16']
      }
    }
  });
});
```

See [Testing Infrastructure Guide](../guides/workflows/testing-infrastructure.md) for details.

## Clean Up

When done experimenting, delete the resource group:

```bash
az group delete --name rg-platform-networking --yes --no-wait
```

**Warning**: This deletes all resources in the resource group!

## Next Steps

You now understand how to build production-ready infrastructure with Atakora. Continue learning:

**Core Concepts:**
- [App and Stacks](../guides/fundamentals/app-and-stacks.md) - Deep dive into the construct tree
- [Resources](../guides/fundamentals/resources.md) - Working with Azure resources
- [Synthesis](../guides/fundamentals/synthesis.md) - How TypeScript becomes ARM templates

**Workflows:**
- [Organizing Projects](../guides/workflows/organizing-projects.md) - Multi-package projects
- [Testing Infrastructure](../guides/workflows/testing-infrastructure.md) - Unit testing
- [Deploying Environments](../guides/workflows/deploying-environments.md) - Dev, staging, prod

**Tutorials:**
- [Web App with Database](../guides/tutorials/web-app-with-database.md) - Complete app deployment
- [Multi-Region Setup](../guides/tutorials/multi-region-setup.md) - Cross-region infrastructure
- [CI/CD Pipeline](../guides/tutorials/ci-cd-pipeline.md) - Automate deployments

**Reference:**
- [Network Resources API](../reference/api/cdk/network.md) - All network resources
- [Storage Resources API](../reference/api/cdk/storage.md) - All storage resources
- [CLI Commands](../reference/cli/README.md) - Complete CLI reference

## Troubleshooting

### TypeScript Errors

**Problem**: Import statements show errors

**Solution**: Run `npm install` to install dependencies

### Storage Account Name Taken

**Problem**: Storage account name already exists globally

**Solution**: Change the name to something unique:

```typescript
accountName: 'stplatformprod' + Math.random().toString(36).slice(2, 8)
```

### Resource Dependencies Not Working

**Problem**: Resources deploy in wrong order

**Solution**: Ensure you're using resource properties for references:

```typescript
// Correct
virtualNetworkName: vnet.name

// Incorrect (hardcoded string doesn't create dependency)
virtualNetworkName: 'vnet-platform-prod'
```

### Validation Errors

See [Common Validation Errors](../guides/validation/common-errors.md) for solutions.

---

**Previous**: [Quickstart](./quickstart.md) | **Next**: [Next Steps](./next-steps.md)
