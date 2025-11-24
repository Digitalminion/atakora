# 5-Minute Quickstart

[Home](../README.md) > [Getting Started](./README.md) > Quickstart

Deploy your first Azure infrastructure with Atakora in under 5 minutes.

## What You'll Build

In this quickstart, you'll create and deploy:
- A resource group to organize your resources
- A storage account for data storage
- Proper tagging and naming conventions

## Step 1: Create a New Project

```bash
# Create a new directory for your project
mkdir my-first-infrastructure
cd my-first-infrastructure

# Initialize an Atakora project
atakora init
```

When prompted, provide:
- **Project name**: my-first-infrastructure
- **Azure region**: eastus (or your preferred region)
- **Environment**: dev

This creates:
```
my-first-infrastructure/
├── src/
│   └── index.ts          # Your infrastructure code
├── package.json          # Project dependencies
├── tsconfig.json         # TypeScript configuration
└── atakora.config.js     # Atakora configuration
```

## Step 2: Write Your Infrastructure

Open `src/index.ts` and replace its contents with:

```typescript
import { App, Stack } from '@atakora/cdk';
import { ResourceGroup } from '@atakora/cdk/resourcegroup';
import { StorageAccount } from '@atakora/cdk/storage';

// Create an Atakora app
const app = new App();

// Define a stack (a collection of Azure resources)
const stack = new Stack(app, 'quickstart-stack', {
  env: {
    region: 'eastus',
    subscription: process.env.AZURE_SUBSCRIPTION_ID
  }
});

// Create a resource group
const resourceGroup = new ResourceGroup(stack, 'rg', {
  name: 'rg-quickstart-dev',
  location: 'eastus'
});

// Create a storage account
const storage = new StorageAccount(stack, 'storage', {
  resourceGroupName: resourceGroup.name,
  accountName: 'stquickstart' + Date.now(), // Ensure unique name
  location: 'eastus',
  sku: {
    name: 'Standard_LRS'
  },
  kind: 'StorageV2',
  tags: {
    environment: 'dev',
    project: 'quickstart'
  }
});

// Output the storage account name
stack.addOutput('StorageAccountName', storage.accountName);
stack.addOutput('StorageAccountPrimaryEndpoint', storage.primaryEndpoints.blob);

// Synthesize the app (generate ARM templates)
app.synth();
```

## Step 3: Install Dependencies

```bash
# Install the Atakora CDK package
npm install @atakora/cdk
```

## Step 4: Synthesize ARM Templates

Convert your TypeScript code to ARM templates:

```bash
atakora synth
```

This creates an `arm.out/` directory containing:
- ARM templates for your resources
- Parameter files for configuration
- Metadata for deployment

Review what will be deployed:

```bash
atakora diff
```

## Step 5: Deploy to Azure

Deploy your infrastructure:

```bash
atakora deploy
```

You'll see:
- Resources being created in real-time
- Progress indicators for each resource
- Final outputs with your storage account details

## Step 6: Verify Deployment

Check your resources in Azure:

```bash
# List resources in your resource group
az resource list --resource-group rg-quickstart-dev --output table

# Get storage account details
az storage account show --name <your-storage-account-name> --resource-group rg-quickstart-dev
```

Or view in the Azure Portal:
1. Navigate to [portal.azure.com](https://portal.azure.com)
2. Search for "rg-quickstart-dev"
3. View your deployed resources

## Clean Up Resources

When you're done experimenting, clean up to avoid charges:

```bash
# Delete all resources in the stack
atakora destroy

# Confirm when prompted
```

## What You Learned

In just 5 minutes, you:
- Created an Atakora project
- Defined infrastructure as TypeScript code
- Synthesized ARM templates
- Deployed resources to Azure
- Cleaned up resources

## Common Patterns

### Adding More Resources

```typescript
import { VirtualNetwork } from '@atakora/cdk/network';

// Add a virtual network to your stack
const vnet = new VirtualNetwork(stack, 'vnet', {
  resourceGroupName: resourceGroup.name,
  vnetName: 'vnet-quickstart',
  location: 'eastus',
  addressSpace: {
    addressPrefixes: ['10.0.0.0/16']
  }
});
```

### Using Environment Variables

```typescript
// Make your stack reusable across environments
const environment = process.env.ENVIRONMENT || 'dev';

const storage = new StorageAccount(stack, 'storage', {
  accountName: `st${environment}${Date.now()}`,
  tags: {
    environment: environment
  }
});
```

### Multiple Stacks

```typescript
// Create separate stacks for different purposes
const networkStack = new Stack(app, 'network-stack');
const storageStack = new Stack(app, 'storage-stack');
```

## Next Steps

Ready to learn more? Continue with:

- **[Build Your First Stack](./003-YOUR-FIRST-STACK.md)** - Deep dive into Apps, Stacks, and Resources
- **[Azure Functions Apps](./004-FUNCTIONS-APP.md)** - Deploy serverless functions
- **[Explore Examples](../examples/README.md)** - See real-world patterns

## Troubleshooting

**Deployment Failed?**
- Check [Deployment Failures Guide](../troubleshooting/DEPLOYMENT-FAILURES.md)
- Verify Azure credentials: `az account show`
- Check resource quotas in your subscription

**Synthesis Issues?**
- See [Debugging Synthesis](../troubleshooting/DEBUGGING-SYNTHESIS.md)
- Ensure all imports are correct
- Check TypeScript compilation: `npx tsc --noEmit`

---

**Questions?** Check the [FAQ](../troubleshooting/COMMON-ISSUES.md) or browse [all documentation](../README.md)