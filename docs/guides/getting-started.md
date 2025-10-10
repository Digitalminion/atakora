# Getting Started with Atakora

[Home](../README.md) > [Guides](./README.md) > Getting Started

## What is Atakora?

Atakora is a TypeScript-first infrastructure-as-code framework for Azure. Write your infrastructure in type-safe TypeScript and synthesize it into ARM (Azure Resource Manager) templates for deployment.

With Atakora, you get:

- **Type Safety**: Catch configuration errors at compile time, not deployment time
- **IntelliSense**: Full IDE autocomplete and documentation while writing infrastructure code
- **Reusability**: Create and share infrastructure patterns using standard TypeScript modules
- **Testability**: Unit test your infrastructure code like any other TypeScript project
- **Multi-Package Support**: Organize large infrastructure projects into manageable packages

## Installation

Install Atakora globally to access the CLI:

```bash
npm install -g @atakora/cli @atakora/cdk
```

Or use it directly with npx (no installation required):

```bash
npx @atakora/cli init
```

## Initialize a New Project

Create a new Atakora project in your current directory:

```bash
npx atakora init
```

The interactive setup will prompt you for:

1. **Organization name** - Your organization or team name (default: "Digital Minion")
2. **Project name** - The name of your infrastructure project (default: "Atakora")
3. **First package name** - The name of your initial infrastructure package (default: "backend")

Example interaction:

```
? Organization name: Contoso
? Project name: ProductionInfra
? First package name: networking
```

### What Gets Created

The init command generates a complete project structure:

```
ProductionInfra/
├── .atakora/
│   └── manifest.json           # Project configuration
├── packages/
│   └── networking/              # Your first infrastructure package
│       ├── bin/
│       │   └── app.ts          # Infrastructure entry point
│       ├── package.json        # Package dependencies
│       └── tsconfig.json       # TypeScript configuration
├── .gitignore                  # Ignores node_modules, .atakora/arm.out
├── package.json                # Root workspace configuration
├── tsconfig.json               # Root TypeScript configuration
└── README.md                   # Project documentation
```

**Key directories:**

- `.atakora/` - Atakora configuration and generated ARM templates
- `packages/networking/` - Your infrastructure code (can have multiple packages)
- `packages/networking/bin/app.ts` - The main entry point where you define your infrastructure

## Write Your Infrastructure

After initialization, edit your infrastructure code in `packages/networking/bin/app.ts`:

```typescript
import { App, SubscriptionStack } from '@atakora/cdk';
import { ResourceGroups } from '@atakora/cdk/resources';

// Create the Atakora application
const app = new App({
  organization: 'Contoso',
  project: 'ProductionInfra',
});

// Define a stack scoped to your Azure subscription
const foundation = new SubscriptionStack(app, 'Foundation', {
  subscriptionId: process.env.AZURE_SUBSCRIPTION_ID!,
  environment: 'nonprod',
  instance: 1,
});

// Add resources to your stack
const rg = new ResourceGroups(foundation, 'Platform', {
  tags: {
    purpose: 'infrastructure',
    environment: 'nonprod',
  },
});

// Synthesize the infrastructure to ARM templates
app.synth();
```

### Understanding the Code

**App**: The root construct that contains all your infrastructure. The organization and project names are used in naming conventions throughout your infrastructure.

**SubscriptionStack**: A deployment scope that maps to an Azure subscription. The stack:

- Requires an Azure subscription ID (typically from an environment variable)
- Has an environment (`nonprod`, `prod`, `sandbox`, `gov`)
- Has an instance number for deploying multiple copies

**ResourceGroups**: An Azure resource group that will contain other Azure resources. Resources are organized in a construct tree where each resource has a parent.

**app.synth()**: Generates ARM templates from your TypeScript code. Must be called at the end of your infrastructure definition.

## Set Your Subscription ID

Before synthesizing, set your Azure subscription ID as an environment variable:

**Linux/macOS:**

```bash
export AZURE_SUBSCRIPTION_ID="12345678-1234-1234-1234-123456789012"
```

**Windows PowerShell:**

```powershell
$env:AZURE_SUBSCRIPTION_ID="12345678-1234-1234-1234-123456789012"
```

**Windows Command Prompt:**

```cmd
set AZURE_SUBSCRIPTION_ID=12345678-1234-1234-1234-123456789012
```

You can find your subscription ID by running:

```bash
az account show --query id --output tsv
```

## Synthesize ARM Templates

From your project root, synthesize your infrastructure to ARM templates:

```bash
npm run synth
```

This command:

1. Compiles your TypeScript code
2. Executes `bin/app.ts`
3. Generates ARM templates in `.atakora/arm.out/networking/`

### Synthesized Output

After synthesis, you'll find:

```
.atakora/
└── arm.out/
    └── networking/
        ├── Foundation.json      # ARM template for Foundation stack
        └── manifest.json        # Deployment metadata
```

The `Foundation.json` file contains the complete ARM template ready for deployment to Azure.

## Deploy to Azure

Once you've synthesized your templates, you can deploy them using Azure CLI:

```bash
az deployment sub create \
  --location eastus \
  --template-file .atakora/arm.out/networking/Foundation.json \
  --parameters subscriptionId=$AZURE_SUBSCRIPTION_ID
```

Or use the Atakora deploy command:

```bash
npm run deploy
```

The deployment command will:

1. Validate your ARM templates
2. Show a preview of changes
3. Deploy to your Azure subscription
4. Display deployment status and results

## Adding More Resources

Expand your infrastructure by adding more resources to the stack:

```typescript
import { App, SubscriptionStack } from '@atakora/cdk';
import { ResourceGroups } from '@atakora/cdk/resources';
import { VirtualNetworks, Subnets } from '@atakora/cdk/network';

const app = new App({
  organization: 'Contoso',
  project: 'ProductionInfra',
});

const foundation = new SubscriptionStack(app, 'Foundation', {
  subscriptionId: process.env.AZURE_SUBSCRIPTION_ID!,
  environment: 'nonprod',
  instance: 1,
});

const rg = new ResourceGroups(foundation, 'Platform', {
  tags: { purpose: 'infrastructure' },
});

// Add a virtual network
const vnet = new VirtualNetworks(foundation, 'MainVNet', {
  resourceGroup: rg,
  addressPrefixes: ['10.0.0.0/16'],
});

// Add subnets
const appSubnet = new Subnets(foundation, 'AppSubnet', {
  virtualNetwork: vnet,
  addressPrefix: '10.0.1.0/24',
});

const dataSubnet = new Subnets(foundation, 'DataSubnet', {
  virtualNetwork: vnet,
  addressPrefix: '10.0.2.0/24',
});

app.synth();
```

After modifying your code, run `npm run synth` again to regenerate the ARM templates.

## Project Workflow

Your typical workflow with Atakora:

1. **Write** infrastructure code in TypeScript
2. **Synthesize** to generate ARM templates (`npm run synth`)
3. **Review** the generated ARM templates in `.atakora/arm.out/`
4. **Deploy** to Azure (`npm run deploy`)
5. **Iterate** - make changes and repeat

## Next Steps

Now that you have a basic project set up, explore these topics:

- **[Multi-Package Projects](./multi-package-projects.md)** - Organize infrastructure by teams, environments, or deployment boundaries
- **[Manifest Schema](../reference/manifest-schema.md)** - Understand the project configuration file
- **[CLI Commands](../reference/cli-commands.md)** - Learn all available commands and options
- **Resource Library** - Explore all available Azure resources (coming soon)
- **Testing Infrastructure** - Unit test your infrastructure code (coming soon)

## Common Issues

### TypeScript Compilation Errors

If you see TypeScript errors, ensure you've installed dependencies:

```bash
npm install
```

### Subscription ID Not Set

If synthesis fails with "AZURE_SUBSCRIPTION_ID is undefined", make sure you've exported the environment variable in your current shell session.

### Package Not Found

If you see "Package not found" errors, verify your `.atakora/manifest.json` has the correct package configuration.

## Getting Help

- Check the [CLI Commands Reference](../reference/cli-commands.md) for detailed command documentation
- Review [Common Validation Errors](./common-validation-errors.md) for troubleshooting guidance
- See [Error Code Reference](../reference/error-codes.md) for detailed error explanations

## Example Projects

Browse example projects to see Atakora in action:

- **Simple Web App** - Basic app service with database (coming soon)
- **Multi-Tier Application** - VNet, subnets, app services, and SQL database (coming soon)
- **Hub-Spoke Network** - Enterprise networking pattern (coming soon)

---

**Previous**: [Guides Home](./README.md) | **Next**: [Multi-Package Projects](./multi-package-projects.md)
