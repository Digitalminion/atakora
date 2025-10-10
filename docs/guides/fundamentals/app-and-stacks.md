# App and Stacks

[Getting Started](../../getting-started/README.md) > [Guides](../README.md) > [Fundamentals](./README.md) > App and Stacks

Understanding the construct tree is fundamental to working with Atakora. The App and Stack pattern provides the foundation for organizing your infrastructure code into logical, deployable units.

## Overview

Every Atakora application starts with an `AzureApp` at the root and contains one or more stacks that represent deployment scopes in Azure. This hierarchical structure - known as the construct tree - enables context inheritance, dependency management, and organized infrastructure definitions.

```
AzureApp (root)
└── ResourceGroupStack (deployment unit)
    ├── VirtualNetwork (resource)
    │   └── Subnet (child resource)
    └── StorageAccount (resource)
```

## The AzureApp

The `AzureApp` is the root container for all your infrastructure. It represents your entire infrastructure as code application and provides the entry point for synthesis.

### Creating an App

```typescript
import { AzureApp } from '@atakora/lib';

const app = new AzureApp({
  organization: 'Contoso',
  project: 'ECommercePlatform',
});
```

### App Configuration

```typescript
const app = new AzureApp({
  // Required: Organization name for resource naming
  organization: 'Contoso',

  // Required: Project name for resource naming
  project: 'ECommercePlatform',

  // Optional: Output directory for synthesized templates
  outdir: './infrastructure-output',

  // Optional: Enable validation during synthesis
  validation: {
    enabled: true,
    strictMode: false,
  },
});
```

**Configuration Properties**:

- **organization**: Your organization identifier, used in resource naming conventions
- **project**: The project name, used in resource naming conventions
- **outdir**: Where ARM templates will be written (default: `./arm.out`)
- **validation**: Controls validation behavior during synthesis

### App Lifecycle

```typescript
// 1. Create the app
const app = new AzureApp({
  organization: 'Contoso',
  project: 'Platform',
});

// 2. Add stacks and resources
const stack = new ResourceGroupStack(app, 'Foundation', {
  resourceGroupName: 'rg-platform-prod',
  location: 'eastus2'
});

// 3. Synthesize to ARM templates
app.synth();

// Output is written to ./arm.out/
// - foundation.template.json
// - foundation.parameters.json
// - manifest.json
```

## Understanding Stacks

Stacks represent deployment units in Azure. Each stack maps to either a subscription-level deployment or a resource group deployment. Stacks are where you add your Azure resources.

### Stack Types

Atakora provides two primary stack types:

#### ResourceGroupStack

Deploys resources within a specific resource group. This is the most common stack type for application infrastructure.

```typescript
import { AzureApp, ResourceGroupStack } from '@atakora/lib';

const app = new AzureApp({
  organization: 'Contoso',
  project: 'WebApp',
});

const stack = new ResourceGroupStack(app, 'Application', {
  // Required: Name of the resource group
  resourceGroupName: 'rg-webapp-prod',

  // Required: Azure region
  location: 'eastus2',

  // Optional: Subscription ID (uses current context if omitted)
  subscriptionId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',

  // Optional: Resource tags
  tags: {
    environment: 'production',
    costCenter: '1234',
    managedBy: 'atakora',
  },
});
```

**When to use ResourceGroupStack**:
- Deploying application infrastructure (networks, storage, compute)
- Resources scoped to a specific resource group
- Most common use case (95% of scenarios)

#### SubscriptionStack

Deploys resources at the subscription level. Used for foundational resources that span multiple resource groups.

```typescript
import { AzureApp, SubscriptionStack } from '@atakora/lib';

const app = new AzureApp({
  organization: 'Contoso',
  project: 'Platform',
});

const stack = new SubscriptionStack(app, 'Foundation', {
  // Required: Subscription ID
  subscriptionId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',

  // Required: Deployment location
  location: 'eastus2',

  // Optional: Resource tags
  tags: {
    environment: 'production',
    purpose: 'foundational-resources',
  },
});
```

**When to use SubscriptionStack**:
- Creating resource groups themselves
- Subscription-level policies and RBAC
- Foundational infrastructure (management groups, policies)
- Azure Blueprints and governance resources

### Stack Context

Stacks carry context that flows down to all child resources. This context is used for auto-naming, tagging, and deployment configuration.

```typescript
const stack = new ResourceGroupStack(app, 'Application', {
  resourceGroupName: 'rg-webapp-prod',
  location: 'eastus2',
  tags: {
    environment: 'production',
    project: 'WebApp',
  },
});

// All resources in this stack inherit the context
const storage = new StorageAccounts(stack, 'AppStorage', {
  // location: inherited from stack ('eastus2')
  // tags: inherited and can be extended
  tags: {
    purpose: 'application-data', // Merged with stack tags
  },
});
```

**Context Properties**:
- **location**: Azure region for all resources
- **subscriptionId**: Target subscription
- **tags**: Resource tags (inherited and merged)
- **naming**: Naming convention configuration

## The Construct Tree

The construct tree is a hierarchical structure where every resource knows its parent and children. This enables powerful features like dependency tracking, context inheritance, and automated validation.

### Tree Structure

```
AzureApp
├── ResourceGroupStack: "NetworkInfra"
│   ├── VirtualNetworks: "MainVNet"
│   │   ├── Subnets: "WebTier"
│   │   ├── Subnets: "AppTier"
│   │   └── Subnets: "DataTier"
│   └── NetworkSecurityGroups: "AppNSG"
└── ResourceGroupStack: "DataInfra"
    ├── StorageAccounts: "DataLake"
    └── CosmosDB: "UserDatabase"
```

### Parent-Child Relationships

Every construct has a scope (parent) and an id:

```typescript
// Scope: app, ID: "Infrastructure"
const stack = new ResourceGroupStack(app, 'Infrastructure', {
  resourceGroupName: 'rg-infra-prod',
  location: 'eastus2',
});

// Scope: stack, ID: "MainVNet"
const vnet = new VirtualNetworks(stack, 'MainVNet', {
  virtualNetworkName: 'vnet-main',
  addressSpace: { addressPrefixes: ['10.0.0.0/16'] },
});

// Scope: vnet, ID: "WebSubnet"
const subnet = new Subnets(vnet, 'WebSubnet', {
  subnetName: 'snet-web',
  addressPrefix: '10.0.1.0/24',
});
```

The tree structure enables:
- **Context Inheritance**: Child resources inherit configuration from parents
- **Dependency Resolution**: Automatic ordering of resource deployments
- **Resource References**: Children can reference parent properties
- **Validation**: Tree traversal enables comprehensive validation

### Accessing Tree Properties

```typescript
// Get the app from any construct
const app = stack.node.root;

// Get the parent
const parentStack = vnet.node.scope;

// Get all children
const children = vnet.node.children;

// Get a specific child by ID
const webSubnet = vnet.node.findChild('WebSubnet');

// Get the construct path
const path = subnet.node.path;
// Example: "Infrastructure/MainVNet/WebSubnet"

// Check if this is the root
const isRoot = app.node.root === app; // true
```

## Working with Multiple Stacks

Real-world applications often use multiple stacks to organize infrastructure logically and enable independent deployments.

### Organizing by Environment

```typescript
const app = new AzureApp({
  organization: 'Contoso',
  project: 'WebApp',
});

// Development stack
const devStack = new ResourceGroupStack(app, 'Development', {
  resourceGroupName: 'rg-webapp-dev',
  location: 'eastus2',
  tags: { environment: 'development' },
});

// Production stack
const prodStack = new ResourceGroupStack(app, 'Production', {
  resourceGroupName: 'rg-webapp-prod',
  location: 'eastus2',
  tags: { environment: 'production' },
});

// Resources in development
const devStorage = new StorageAccounts(devStack, 'AppStorage', {
  sku: { name: 'Standard_LRS' }, // Cheaper tier for dev
});

// Resources in production
const prodStorage = new StorageAccounts(prodStack, 'AppStorage', {
  sku: { name: 'Premium_LRS' }, // Premium tier for prod
  enableHttpsTrafficOnly: true,
});
```

### Organizing by Layer

```typescript
const app = new AzureApp({
  organization: 'Contoso',
  project: 'ECommerce',
});

// Network layer
const networkStack = new ResourceGroupStack(app, 'Network', {
  resourceGroupName: 'rg-ecommerce-network-prod',
  location: 'eastus2',
});

const vnet = new VirtualNetworks(networkStack, 'MainVNet', {
  addressSpace: { addressPrefixes: ['10.0.0.0/16'] },
});

// Data layer
const dataStack = new ResourceGroupStack(app, 'Data', {
  resourceGroupName: 'rg-ecommerce-data-prod',
  location: 'eastus2',
});

const database = new CosmosDB(dataStack, 'OrdersDB', {
  databaseAccountOfferType: 'Standard',
});

// Application layer
const appStack = new ResourceGroupStack(app, 'Application', {
  resourceGroupName: 'rg-ecommerce-app-prod',
  location: 'eastus2',
});

const webApp = new Sites(appStack, 'WebApp', {
  serverFarmId: '/subscriptions/.../serverfarms/asp-main',
});
```

### Cross-Stack References

Resources in one stack can reference resources in another stack:

```typescript
// Network stack
const networkStack = new ResourceGroupStack(app, 'Network', {
  resourceGroupName: 'rg-network-prod',
  location: 'eastus2',
});

const vnet = new VirtualNetworks(networkStack, 'MainVNet', {
  addressSpace: { addressPrefixes: ['10.0.0.0/16'] },
});

const subnet = new Subnets(vnet, 'AppSubnet', {
  addressPrefix: '10.0.1.0/24',
});

// Application stack references network resources
const appStack = new ResourceGroupStack(app, 'Application', {
  resourceGroupName: 'rg-app-prod',
  location: 'eastus2',
});

const webApp = new Sites(appStack, 'WebApp', {
  virtualNetworkSubnetId: subnet.id, // Cross-stack reference
  serverFarmId: '/subscriptions/.../serverfarms/asp-main',
});
```

## Stack Dependencies

Atakora automatically tracks dependencies between stacks based on resource references. This ensures stacks are deployed in the correct order.

### Automatic Dependency Detection

```typescript
// Stack A creates a VNet
const networkStack = new ResourceGroupStack(app, 'Network', {
  resourceGroupName: 'rg-network',
  location: 'eastus2',
});

const vnet = new VirtualNetworks(networkStack, 'VNet', {
  addressSpace: { addressPrefixes: ['10.0.0.0/16'] },
});

// Stack B references the VNet
const appStack = new ResourceGroupStack(app, 'Application', {
  resourceGroupName: 'rg-app',
  location: 'eastus2',
});

// This creates an automatic dependency: Application depends on Network
const integration = new VirtualNetworkIntegration(appStack, 'VNetInt', {
  virtualNetworkId: vnet.id,
});

// Deployment order: Network → Application
```

### Explicit Dependencies

You can also declare explicit dependencies when automatic detection isn't sufficient:

```typescript
const foundationStack = new ResourceGroupStack(app, 'Foundation', {
  resourceGroupName: 'rg-foundation',
  location: 'eastus2',
});

const appStack = new ResourceGroupStack(app, 'Application', {
  resourceGroupName: 'rg-app',
  location: 'eastus2',
});

// Explicitly declare that Application depends on Foundation
appStack.addDependency(foundationStack);

// Deployment order: Foundation → Application
```

## Common Patterns

### Single-Stack Application

For simple applications, a single stack is often sufficient:

```typescript
import { AzureApp, ResourceGroupStack } from '@atakora/lib';
import { VirtualNetworks } from '@atakora/cdk/network';
import { StorageAccounts } from '@atakora/cdk/storage';
import { Sites } from '@atakora/cdk/web';

const app = new AzureApp({
  organization: 'Contoso',
  project: 'SimpleWebApp',
});

const stack = new ResourceGroupStack(app, 'Infrastructure', {
  resourceGroupName: 'rg-webapp-prod',
  location: 'eastus2',
});

// Network
const vnet = new VirtualNetworks(stack, 'VNet', {
  addressSpace: { addressPrefixes: ['10.0.0.0/16'] },
});

// Storage
const storage = new StorageAccounts(stack, 'Storage', {
  sku: { name: 'Standard_LRS' },
});

// Web app
const webApp = new Sites(stack, 'WebApp', {
  serverFarmId: '/subscriptions/.../serverfarms/asp-main',
});

app.synth();
```

### Multi-Environment Pattern

Deploy to multiple environments using separate stacks:

```typescript
import { AzureApp, ResourceGroupStack } from '@atakora/lib';

const app = new AzureApp({
  organization: 'Contoso',
  project: 'Platform',
});

function createEnvironmentStack(
  app: AzureApp,
  environment: string,
  config: EnvironmentConfig
): ResourceGroupStack {
  const stack = new ResourceGroupStack(app, environment, {
    resourceGroupName: `rg-platform-${environment}`,
    location: config.location,
    tags: {
      environment: environment,
      costCenter: config.costCenter,
    },
  });

  // Create environment-specific resources
  new StorageAccounts(stack, 'Storage', {
    sku: { name: config.storageSku },
  });

  return stack;
}

// Create stacks for each environment
createEnvironmentStack(app, 'dev', {
  location: 'eastus2',
  costCenter: '1234',
  storageSku: 'Standard_LRS',
});

createEnvironmentStack(app, 'staging', {
  location: 'eastus2',
  costCenter: '1234',
  storageSku: 'Standard_GRS',
});

createEnvironmentStack(app, 'prod', {
  location: 'eastus2',
  costCenter: '5678',
  storageSku: 'Premium_LRS',
});

app.synth();
```

### Shared Infrastructure Pattern

Create a shared stack for resources used across multiple applications:

```typescript
const app = new AzureApp({
  organization: 'Contoso',
  project: 'Enterprise',
});

// Shared network infrastructure
const sharedStack = new ResourceGroupStack(app, 'Shared', {
  resourceGroupName: 'rg-shared-prod',
  location: 'eastus2',
  tags: { purpose: 'shared-infrastructure' },
});

const sharedVNet = new VirtualNetworks(sharedStack, 'SharedVNet', {
  addressSpace: { addressPrefixes: ['10.0.0.0/8'] },
});

// Application A uses shared infrastructure
const appAStack = new ResourceGroupStack(app, 'ApplicationA', {
  resourceGroupName: 'rg-app-a-prod',
  location: 'eastus2',
});

const appASubnet = new Subnets(sharedVNet, 'AppASubnet', {
  addressPrefix: '10.1.0.0/16',
});

// Application B uses shared infrastructure
const appBStack = new ResourceGroupStack(app, 'ApplicationB', {
  resourceGroupName: 'rg-app-b-prod',
  location: 'eastus2',
});

const appBSubnet = new Subnets(sharedVNet, 'AppBSubnet', {
  addressPrefix: '10.2.0.0/16',
});

app.synth();
```

## Best Practices

### 1. One App Per Repository

Create a single `AzureApp` instance per infrastructure repository. This represents your entire infrastructure as code project.

```typescript
// Good: Single app instance
const app = new AzureApp({
  organization: 'Contoso',
  project: 'Platform',
});

// All stacks belong to this app
const stack1 = new ResourceGroupStack(app, 'Network', {...});
const stack2 = new ResourceGroupStack(app, 'Data', {...});
```

### 2. Organize Stacks by Lifecycle

Group resources that are deployed and updated together into the same stack:

```typescript
// Network infrastructure (changes infrequently)
const networkStack = new ResourceGroupStack(app, 'Network', {...});

// Application infrastructure (changes frequently)
const appStack = new ResourceGroupStack(app, 'Application', {...});

// Data infrastructure (changes infrequently, but independently)
const dataStack = new ResourceGroupStack(app, 'Data', {...});
```

### 3. Use Descriptive Stack Names

Stack names should clearly indicate their purpose:

```typescript
// Good: Clear purpose
new ResourceGroupStack(app, 'NetworkInfrastructure', {...});
new ResourceGroupStack(app, 'ApplicationTier', {...});
new ResourceGroupStack(app, 'DataPlatform', {...});

// Avoid: Unclear purpose
new ResourceGroupStack(app, 'Stack1', {...});
new ResourceGroupStack(app, 'Resources', {...});
```

### 4. Leverage Context Inheritance

Set common configuration at the stack level rather than repeating it for each resource:

```typescript
// Good: Set tags at stack level
const stack = new ResourceGroupStack(app, 'Application', {
  resourceGroupName: 'rg-app-prod',
  location: 'eastus2',
  tags: {
    environment: 'production',
    costCenter: '1234',
    managedBy: 'atakora',
  },
});

// All resources inherit these tags automatically
const storage = new StorageAccounts(stack, 'Storage', {
  // tags are inherited
});

// Avoid: Repeating tags for every resource
const storage = new StorageAccounts(stack, 'Storage', {
  tags: {
    environment: 'production',
    costCenter: '1234',
    managedBy: 'atakora',
  },
});
```

### 5. Keep Stacks Focused

Each stack should have a clear, single purpose. Avoid creating monolithic stacks that contain unrelated resources.

```typescript
// Good: Focused stacks
const identityStack = new ResourceGroupStack(app, 'Identity', {...});
const dataStack = new ResourceGroupStack(app, 'Data', {...});
const computeStack = new ResourceGroupStack(app, 'Compute', {...});

// Avoid: Monolithic stack
const everythingStack = new ResourceGroupStack(app, 'Everything', {...});
// Contains identity, data, compute, networking, monitoring, etc.
```

## Troubleshooting

### Stack Not Found During Synthesis

**Problem**: Reference to a stack that doesn't exist or hasn't been created yet.

**Solution**: Ensure all stacks are created before calling `app.synth()`:

```typescript
const app = new AzureApp({...});

const stack = new ResourceGroupStack(app, 'MyStack', {...});

// Create all resources before synthesizing
const resource = new StorageAccounts(stack, 'Storage', {...});

// Synthesize after all stacks and resources are defined
app.synth();
```

### Circular Dependencies

**Problem**: Stack A depends on Stack B, and Stack B depends on Stack A.

**Solution**: Refactor to remove circular dependencies or combine into a single stack:

```typescript
// Problem: Circular dependency
const stackA = new ResourceGroupStack(app, 'A', {...});
const stackB = new ResourceGroupStack(app, 'B', {...});

const resourceA = new Resource(stackA, 'ResA', {
  dependsOn: resourceB.id, // A → B
});

const resourceB = new Resource(stackB, 'ResB', {
  dependsOn: resourceA.id, // B → A (circular!)
});

// Solution: Combine into one stack
const stack = new ResourceGroupStack(app, 'Combined', {...});

const resourceA = new Resource(stack, 'ResA', {...});
const resourceB = new Resource(stack, 'ResB', {
  dependsOn: resourceA.id, // Clear dependency order
});
```

### Context Not Inherited

**Problem**: Child resources don't have access to stack context.

**Solution**: Ensure resources are created with the correct scope (parent):

```typescript
// Correct: vnet is a child of stack
const vnet = new VirtualNetworks(stack, 'VNet', {...});

// Incorrect: vnet is created with wrong scope
const vnet = new VirtualNetworks(app, 'VNet', {...}); // Wrong parent!
```

## See Also

- **[Resources](./resources.md)** - Learn about Azure resources and how to use them
- **[Synthesis](./synthesis.md)** - Understand how the construct tree becomes ARM templates
- **[Deployment](./deployment.md)** - Deploy your infrastructure to Azure
- **[Organizing Projects](../workflows/organizing-projects.md)** - Multi-package project structure
- **[Multi-Region Setup Tutorial](../tutorials/multi-region-setup.md)** - Deploy across multiple Azure regions

---

**Next**: Learn about [working with Azure resources](./resources.md)
