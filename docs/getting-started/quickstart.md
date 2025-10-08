# 5-Minute Quickstart

[Home](../README.md) > [Getting Started](./README.md) > Quickstart

Deploy your first Azure infrastructure with Atakora in under 5 minutes. This quickstart gets you from zero to deployed infrastructure fast.

## What You'll Build

A simple infrastructure stack containing:
- Resource Group for organizing resources
- Virtual Network with address space
- Storage Account for data storage

All defined in type-safe TypeScript, synthesized to ARM templates, and deployed to Azure.

## Prerequisites

Before starting, ensure you have:

- [x] Atakora CLI installed (`npm install -g @atakora/cli @atakora/lib`)
- [x] Azure CLI installed and authenticated (`az login`)
- [x] Active Azure subscription
- [x] Node.js 18+ installed

**Not set up yet?** See the [Installation Guide](./installation.md).

## Step 1: Initialize a Project

Create a new directory and initialize an Atakora project:

```bash
# Create project directory
mkdir my-infrastructure
cd my-infrastructure

# Initialize Atakora project
npx atakora init
```

**Interactive prompts:**

```
? Organization name: MyCompany
? Project name: MyInfrastructure
? First package name: platform
```

**What happens:**
- Creates `.atakora/manifest.json` with project configuration
- Generates `packages/platform/` with TypeScript infrastructure code
- Sets up workspace with TypeScript compiler and npm scripts
- Creates `.gitignore` to exclude build artifacts

## Step 2: Set Your Subscription ID

Set your Azure subscription ID as an environment variable:

```bash
# Get your subscription ID
export AZURE_SUBSCRIPTION_ID=$(az account show --query id --output tsv)

# Or manually set it
export AZURE_SUBSCRIPTION_ID="12345678-1234-1234-1234-123456789012"
```

**Windows PowerShell:**
```powershell
$env:AZURE_SUBSCRIPTION_ID = (az account show --query id --output tsv)
```

**Windows Command Prompt:**
```cmd
for /f "delims=" %i in ('az account show --query id --output tsv') do set AZURE_SUBSCRIPTION_ID=%i
```

## Step 3: Install Dependencies

Install project dependencies:

```bash
npm install
```

This installs:
- `@atakora/lib` - Core framework
- `constructs` - Construct library
- TypeScript compiler and type definitions

## Step 4: Define Your Infrastructure

Edit `packages/platform/bin/app.ts` with this infrastructure code:

```typescript
import { AzureApp, ResourceGroupStack } from '@atakora/lib';
import { VirtualNetworks } from '@atakora/cdk/network';
import { StorageAccounts } from '@atakora/cdk/storage';

// Create the Atakora application
const app = new AzureApp({
  organization: 'MyCompany',
  project: 'MyInfrastructure',
});

// Define a stack for our infrastructure
const stack = new ResourceGroupStack(app, 'Platform', {
  resourceGroupName: 'rg-quickstart-demo',
  location: 'eastus2',
  tags: {
    environment: 'demo',
    purpose: 'quickstart',
  }
});

// Add a virtual network
const vnet = new VirtualNetworks(stack, 'VNet', {
  virtualNetworkName: 'vnet-quickstart',
  addressSpace: {
    addressPrefixes: ['10.0.0.0/16']
  },
  subnets: [
    {
      name: 'default',
      addressPrefix: '10.0.1.0/24'
    }
  ]
});

// Add a storage account
const storage = new StorageAccounts(stack, 'Storage', {
  accountName: 'stquickstartdemo001',
  sku: {
    name: 'Standard_LRS'
  },
  kind: 'StorageV2'
});

// Synthesize ARM templates
app.synth();
```

**Understanding the code:**

- `AzureApp` - Root container for all infrastructure
- `ResourceGroupStack` - Deployment scope (creates and deploys to a resource group)
- `VirtualNetworks` - Azure Virtual Network resource
- `StorageAccounts` - Azure Storage Account resource
- `app.synth()` - Generates ARM templates from your TypeScript code

## Step 5: Synthesize ARM Templates

Generate ARM templates from your TypeScript code:

```bash
npm run synth
```

**What happens:**

1. TypeScript compiler checks your code for errors
2. Your infrastructure code executes
3. ARM templates are generated in `.atakora/arm.out/platform/`

**Expected output:**

```
✓ Compiled TypeScript
✓ Synthesized 1 stack
✓ Validated templates

Stacks:
  ✓ Platform (3 resources)

Output: .atakora/arm.out/platform/
```

**View the generated templates:**

```bash
# Linux/macOS
cat .atakora/arm.out/platform/Platform.json

# Windows
type .atakora\arm.out\platform\Platform.json
```

You'll see a complete ARM template with your resources defined!

## Step 6: Deploy to Azure

Deploy your infrastructure to Azure:

```bash
npm run deploy
```

This command:
1. Validates ARM templates
2. Shows preview of resources to be created
3. Deploys to your Azure subscription
4. Reports deployment status

**Expected output:**

```
Deploying stack: Platform
Location: eastus2

Resources to create:
  + Microsoft.Network/virtualNetworks (vnet-quickstart)
  + Microsoft.Storage/storageAccounts (stquickstartdemo001)

? Proceed with deployment? (Y/n)
```

Type `y` and press Enter to deploy.

**Deployment progress:**

```
✓ Template validation passed
→ Deployment started
→ Creating resource group...
→ Creating virtual network...
→ Creating storage account...
✓ Deployment succeeded

Deployment details:
  Resource Group: rg-quickstart-demo
  Resources: 3 created
  Duration: 45 seconds
```

## Step 7: Verify in Azure Portal

View your deployed resources in the Azure Portal:

1. Navigate to: https://portal.azure.com
2. Search for "rg-quickstart-demo"
3. View resources: Virtual Network and Storage Account

Or check via Azure CLI:

```bash
# List resources in the resource group
az resource list \
  --resource-group rg-quickstart-demo \
  --output table
```

## What You Just Did

Congratulations! You've successfully:

- Created an Atakora project with TypeScript infrastructure code
- Defined Azure resources using type-safe constructs
- Synthesized ARM templates from TypeScript
- Deployed infrastructure to Azure
- Verified resources in the Azure Portal

## Next Steps

### Modify Your Infrastructure

Try adding more resources to your stack. Edit `bin/app.ts`:

```typescript
// Add a subnet
const appSubnet = new Subnets(stack, 'AppSubnet', {
  virtualNetworkName: vnet.name,
  subnetName: 'app-subnet',
  addressPrefix: '10.0.2.0/24'
});
```

Then re-synthesize and deploy:

```bash
npm run synth
npm run deploy
```

### Clean Up Resources

When you're done experimenting, delete the resource group:

```bash
az group delete --name rg-quickstart-demo --yes --no-wait
```

### Learn More

Now that you have the basics, dive deeper:

**Essential Reading:**
- [Your First Stack](./your-first-stack.md) - Detailed tutorial with best practices
- [App and Stacks](../guides/fundamentals/app-and-stacks.md) - Understanding the construct tree
- [Synthesis Process](../guides/fundamentals/synthesis.md) - How code becomes ARM templates

**Common Workflows:**
- [Adding Resources](../guides/workflows/adding-resources.md) - How to add and configure resources
- [Multi-Package Projects](../guides/workflows/organizing-projects.md) - Organize large infrastructure
- [Deploying Environments](../guides/workflows/deploying-environments.md) - Dev, staging, prod strategies

**Reference Documentation:**
- [CLI Commands](../reference/cli/README.md) - Complete command reference
- [Network Resources API](../reference/api/cdk/network.md) - VNet, Subnet, NSG, etc.
- [Storage Resources API](../reference/api/cdk/storage.md) - Storage Accounts, Blob Containers, etc.

**Examples:**
- [Simple Web App](../examples/simple-web-app/README.md) - App Service with database
- [Multi-Region Application](../examples/multi-region-app/README.md) - Cross-region deployment

## Troubleshooting

### TypeScript Compilation Errors

**Problem**: Errors during `npm run synth`

**Solution**:
- Check TypeScript syntax in `bin/app.ts`
- Ensure all imports are correct
- Run `npm install` to verify dependencies

### Storage Account Name Conflicts

**Problem**: Storage account name already taken

**Solution**: Storage account names must be globally unique. Change the name:

```typescript
const storage = new StorageAccounts(stack, 'Storage', {
  accountName: 'stquickstart' + Math.random().toString(36).slice(2, 8),
  // ... rest of config
});
```

### Subscription ID Not Set

**Problem**: Error "AZURE_SUBSCRIPTION_ID is undefined"

**Solution**: Export the environment variable in your current shell:

```bash
export AZURE_SUBSCRIPTION_ID=$(az account show --query id --output tsv)
```

### Deployment Fails: Insufficient Permissions

**Problem**: Deployment fails with authorization error

**Solution**: Ensure you have Contributor or Owner role on the subscription:

```bash
az role assignment list --assignee $(az account show --query user.name -o tsv) --output table
```

### More Help

- [Common Issues](../troubleshooting/common-issues.md)
- [Common Validation Errors](../guides/validation/common-errors.md)
- [Error Code Reference](../reference/error-codes.md)

## Quick Reference

**Project structure:**
```
my-infrastructure/
├── .atakora/
│   ├── manifest.json          # Project config
│   └── arm.out/               # Generated templates
├── packages/
│   └── platform/
│       ├── bin/
│       │   └── app.ts        # Your infrastructure code
│       ├── package.json
│       └── tsconfig.json
├── package.json
└── tsconfig.json
```

**Common commands:**
```bash
npm run synth        # Generate ARM templates
npm run deploy       # Deploy to Azure
npm run build        # Compile TypeScript only
atakora diff         # Show infrastructure changes
```

**Environment variables:**
```bash
AZURE_SUBSCRIPTION_ID    # Required: Your Azure subscription
AZURE_LOCATION          # Optional: Default deployment location
```

---

**Previous**: [Installation](./installation.md) | **Next**: [Your First Stack](./your-first-stack.md)
