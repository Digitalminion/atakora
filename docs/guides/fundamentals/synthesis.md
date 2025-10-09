# How Code Becomes ARM Templates

[Getting Started](../../getting-started/README.md) > [Guides](../README.md) > [Fundamentals](./README.md) > Synthesis

The synthesis process transforms your TypeScript infrastructure code into deployable Azure Resource Manager (ARM) templates. Understanding this process helps you write better infrastructure code and troubleshoot issues.

## Overview

Synthesis is the process of converting the construct tree into ARM template JSON files. When you call `app.synth()`, Atakora walks the construct tree, collects all resources, resolves dependencies, and generates ARM templates ready for deployment.

```typescript
import { AzureApp, ResourceGroupStack } from '@atakora/lib';
import { VirtualNetworks, StorageAccounts } from '@atakora/cdk/network';

const app = new AzureApp({
  organization: 'Contoso',
  project: 'WebApp',
});

const stack = new ResourceGroupStack(app, 'Infrastructure', {
  resourceGroupName: 'rg-webapp-prod',
  location: 'eastus2',
});

const vnet = new VirtualNetworks(stack, 'MainVNet', {
  virtualNetworkName: 'vnet-main-prod',
  addressSpace: { addressPrefixes: ['10.0.0.0/16'] },
});

const storage = new StorageAccounts(stack, 'AppStorage', {
  storageAccountName: 'stappprodstorage',
  sku: { name: 'Standard_GRS' },
  kind: 'StorageV2',
});

// Synthesize to ARM templates
app.synth();

// Output written to ./arm.out/
// - infrastructure.template.json
// - infrastructure.parameters.json
// - manifest.json
```

## The Synthesis Pipeline

Synthesis happens in distinct phases:

```
┌──────────────────────────────────────────────┐
│ 1. PREPARE: Build Construct Tree            │
│    Your code creates the tree structure      │
└────────────────┬─────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────┐
│ 2. VALIDATE: Pre-Synthesis Validation       │
│    - Naming conventions                      │
│    - Required properties                     │
│    - Resource constraints                    │
└────────────────┬─────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────┐
│ 3. TRAVERSE: Walk the Construct Tree        │
│    - Depth-first traversal                   │
│    - Collect all resources                   │
│    - Build dependency graph                  │
└────────────────┬─────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────┐
│ 4. TRANSFORM: Convert to ARM Resources      │
│    - Call toArmTemplate() on each resource   │
│    - Resolve references                      │
│    - Generate resource IDs                   │
└────────────────┬─────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────┐
│ 5. ASSEMBLE: Create ARM Templates           │
│    - Group resources by stack                │
│    - Add parameters and variables            │
│    - Include outputs                         │
│    - Order resources by dependencies         │
└────────────────┬─────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────┐
│ 6. EMIT: Write Files                        │
│    - Write template.json files               │
│    - Write parameters.json files             │
│    - Write manifest.json                     │
└──────────────────────────────────────────────┘
```

### Phase 1: Prepare

During code execution, you build the construct tree:

```typescript
const app = new AzureApp({...});              // Root node
const stack = new ResourceGroupStack(app,...);  // Stack node
const vnet = new VirtualNetworks(stack,...);     // Resource node
const subnet = new Subnets(vnet,...);            // Child resource node
```

The tree structure is fully built before synthesis begins.

### Phase 2: Validate

Before synthesis, Atakora validates the construct tree:

```typescript
// Validation checks include:
// - All required properties are provided
// - Resource names follow Azure naming rules
// - Resource names don't exceed length limits
// - Resource types are valid
// - Dependencies are resolvable
```

If validation fails, synthesis stops and errors are reported:

```
Error: Validation failed for resource 'Storage'
  Resource Type: Microsoft.Storage/storageAccounts
  Issue: Storage account name 'My-Storage-Account' contains invalid characters
  Allowed: Lowercase letters and numbers only
  Suggestion: Use 'mystorageaccount' instead
```

### Phase 3: Traverse

Atakora walks the construct tree depth-first, visiting every node:

```
App
└── Stack (visit)
    ├── VirtualNetwork (visit)
    │   └── Subnet (visit)
    └── StorageAccount (visit)
```

During traversal, Atakora:
- Collects all resources
- Builds a dependency graph
- Identifies stack boundaries
- Prepares for transformation

### Phase 4: Transform

Each resource is transformed into ARM template format:

```typescript
// Your TypeScript code
const storage = new StorageAccounts(stack, 'Storage', {
  storageAccountName: 'stappdata',
  sku: { name: 'Standard_GRS' },
  kind: 'StorageV2',
  enableHttpsTrafficOnly: true,
});

// Becomes ARM template JSON
{
  "type": "Microsoft.Storage/storageAccounts",
  "apiVersion": "2023-01-01",
  "name": "stappdata",
  "location": "[parameters('location')]",
  "sku": {
    "name": "Standard_GRS"
  },
  "kind": "StorageV2",
  "properties": {
    "supportsHttpsTrafficOnly": true,
    "minimumTlsVersion": "TLS1_2"
  }
}
```

### Phase 5: Assemble

Resources are assembled into complete ARM templates:

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "location": {
      "type": "string",
      "defaultValue": "eastus2"
    }
  },
  "variables": {},
  "resources": [
    {
      "type": "Microsoft.Network/virtualNetworks",
      "apiVersion": "2023-05-01",
      "name": "vnet-main-prod",
      ...
    },
    {
      "type": "Microsoft.Storage/storageAccounts",
      "apiVersion": "2023-01-01",
      "name": "stappprodstorage",
      "dependsOn": [
        "[resourceId('Microsoft.Network/virtualNetworks', 'vnet-main-prod')]"
      ],
      ...
    }
  ],
  "outputs": {
    "storageAccountId": {
      "type": "string",
      "value": "[resourceId('Microsoft.Storage/storageAccounts', 'stappprodstorage')]"
    }
  }
}
```

### Phase 6: Emit

ARM templates are written to the output directory:

```
arm.out/
├── infrastructure.template.json      # ARM template
├── infrastructure.parameters.json    # Parameter values
└── manifest.json                     # Deployment metadata
```

## Output Structure

### Template Files

Each stack produces a template file:

**infrastructure.template.json**:
```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {...},
  "variables": {...},
  "resources": [...],
  "outputs": {...}
}
```

### Parameter Files

Parameter values are stored separately:

**infrastructure.parameters.json**:
```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "location": {
      "value": "eastus2"
    }
  }
}
```

### Manifest File

The manifest contains deployment metadata:

**manifest.json**:
```json
{
  "version": "1.0.0",
  "stacks": {
    "Infrastructure": {
      "type": "resource-group",
      "resourceGroupName": "rg-webapp-prod",
      "location": "eastus2",
      "template": "infrastructure.template.json",
      "parameters": "infrastructure.parameters.json",
      "dependencies": []
    }
  },
  "synthesizedAt": "2025-01-15T10:30:00.000Z"
}
```

## Dependency Resolution

Atakora automatically tracks and resolves dependencies between resources.

### Automatic Dependencies

Dependencies are detected from resource references:

```typescript
const vnet = new VirtualNetworks(stack, 'VNet', {
  virtualNetworkName: 'vnet-main',
  addressSpace: { addressPrefixes: ['10.0.0.0/16'] },
});

const subnet = new Subnets(vnet, 'Subnet', {
  subnetName: 'snet-app',
  addressPrefix: '10.0.1.0/24',
});

const webApp = new Sites(stack, 'WebApp', {
  siteName: 'webapp-main',
  serverFarmId: '/subscriptions/.../serverfarms/asp-main',
  virtualNetworkSubnetId: subnet.id, // Dependency!
});

// ARM template includes:
// webApp depends on subnet
// subnet depends on vnet
```

Generated ARM template:

```json
{
  "resources": [
    {
      "type": "Microsoft.Network/virtualNetworks",
      "name": "vnet-main",
      ...
    },
    {
      "type": "Microsoft.Network/virtualNetworks/subnets",
      "name": "vnet-main/snet-app",
      "dependsOn": [
        "[resourceId('Microsoft.Network/virtualNetworks', 'vnet-main')]"
      ],
      ...
    },
    {
      "type": "Microsoft.Web/sites",
      "name": "webapp-main",
      "dependsOn": [
        "[resourceId('Microsoft.Network/virtualNetworks/subnets', 'vnet-main', 'snet-app')]"
      ],
      ...
    }
  ]
}
```

### Dependency Order

Resources are ordered in the ARM template based on their dependencies:

```
Deployment Order:
1. VirtualNetwork (no dependencies)
2. Subnet (depends on VirtualNetwork)
3. NetworkSecurityGroup (no dependencies)
4. StorageAccount (no dependencies)
5. WebApp (depends on Subnet)
```

### Circular Dependencies

Atakora detects and prevents circular dependencies:

```typescript
// This would cause an error:
const resourceA = new Resource(stack, 'A', {
  dependsOn: resourceB.id,
});

const resourceB = new Resource(stack, 'B', {
  dependsOn: resourceA.id, // Circular dependency!
});

// Error: Circular dependency detected
//   Resource A depends on Resource B
//   Resource B depends on Resource A
```

## Parameters and Variables

### Parameters

Parameters allow runtime configuration of templates:

```typescript
const stack = new ResourceGroupStack(app, 'Infrastructure', {
  resourceGroupName: 'rg-webapp-prod',
  location: 'eastus2', // Becomes a parameter
});

// Generated parameter:
{
  "parameters": {
    "location": {
      "type": "string",
      "defaultValue": "eastus2",
      "metadata": {
        "description": "Azure region for resources"
      }
    }
  }
}
```

### Variables

Variables are computed values used in the template:

```typescript
// Atakora automatically creates variables for:
// - Resource IDs
// - Computed names
// - Derived values

{
  "variables": {
    "storageAccountName": "[concat('stapp', parameters('environment'))]",
    "vnetId": "[resourceId('Microsoft.Network/virtualNetworks', 'vnet-main')]"
  }
}
```

## Outputs

Export resource properties for use by other systems:

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
```

Generated outputs:

```json
{
  "outputs": {
    "StorageAccountName": {
      "type": "string",
      "value": "[variables('storageAccountName')]",
      "metadata": {
        "description": "The name of the storage account"
      }
    },
    "StorageAccountId": {
      "type": "string",
      "value": "[resourceId('Microsoft.Storage/storageAccounts', variables('storageAccountName'))]",
      "metadata": {
        "description": "The resource ID of the storage account"
      }
    }
  }
}
```

## Synthesis Configuration

### Output Directory

Specify where ARM templates are written:

```typescript
const app = new AzureApp({
  organization: 'Contoso',
  project: 'WebApp',
  outdir: './infrastructure-output', // Custom output directory
});
```

### Validation Settings

Configure validation behavior:

```typescript
const app = new AzureApp({
  organization: 'Contoso',
  project: 'WebApp',
  validation: {
    enabled: true,        // Enable validation
    strictMode: false,    // Warnings as errors
    skipNaming: false,    // Skip naming validation
  },
});
```

## Running Synthesis

### Programmatic Synthesis

Call `synth()` in your code:

```typescript
const app = new AzureApp({...});

// Build your infrastructure
const stack = new ResourceGroupStack(app, 'Infrastructure', {...});
// ... add resources ...

// Synthesize
app.synth();
```

### CLI Synthesis

Use the Atakora CLI:

```bash
# Synthesize all stacks
npx atakora synth

# Synthesize a specific stack
npx atakora synth Infrastructure

# Synthesize with validation disabled
npx atakora synth --no-validation

# Synthesize to a custom directory
npx atakora synth --output ./custom-output
```

### Watch Mode

Automatically re-synthesize on file changes:

```bash
npx atakora synth --watch
```

## Troubleshooting Synthesis

### Validation Errors

**Problem**: Synthesis fails with validation errors.

**Solution**: Review the error message and fix the reported issue:

```
Error: Validation failed for resource 'Storage'
  Resource Type: Microsoft.Storage/storageAccounts
  Property: storageAccountName
  Value: 'My-Storage'
  Issue: Storage account names must be 3-24 characters, lowercase letters and numbers only

Fix: Change 'My-Storage' to 'mystorage'
```

### Missing Dependencies

**Problem**: Resources are not created in the correct order.

**Solution**: Ensure resources reference each other properly:

```typescript
// Incorrect: No dependency established
const webApp = new Sites(stack, 'WebApp', {
  siteName: 'webapp-main',
  serverFarmId: '/subscriptions/.../serverfarms/asp-main',
});

// Correct: Dependency through reference
const webApp = new Sites(stack, 'WebApp', {
  siteName: 'webapp-main',
  serverFarmId: appServicePlan.id, // References the resource
});
```

### Synthesis Errors

**Problem**: Synthesis fails with an error.

**Solution**: Check the error message and ensure:
- All required properties are provided
- Resource names are valid
- Dependencies are not circular
- The construct tree is valid

## Best Practices

### 1. Validate Early and Often

Run synthesis frequently during development to catch errors early:

```bash
# Run synthesis after each change
npm run synth
```

### 2. Review Generated Templates

Periodically review the generated ARM templates to ensure they match your expectations:

```bash
# Synthesize and view the template
npm run synth
cat arm.out/infrastructure.template.json | jq .
```

### 3. Use Outputs for Integration

Export important resource properties as outputs for use in CI/CD or other systems:

```typescript
new Output(stack, 'WebAppUrl', {
  value: webApp.defaultHostName,
  description: 'The default hostname of the web app',
});
```

### 4. Organize by Stack

Use multiple stacks to organize resources logically and control synthesis granularity:

```typescript
// Separate stacks for different concerns
const networkStack = new ResourceGroupStack(app, 'Network', {...});
const dataStack = new ResourceGroupStack(app, 'Data', {...});
const appStack = new ResourceGroupStack(app, 'Application', {...});

// Synthesize only what changed
// npx atakora synth Application
```

## See Also

- **[App and Stacks](./app-and-stacks.md)** - Understanding the construct tree
- **[Resources](./resources.md)** - Working with Azure resources
- **[Deployment](./deployment.md)** - Deploying synthesized templates to Azure
- **[Debugging Synthesis](../../troubleshooting/debugging-synthesis.md)** - Troubleshoot synthesis issues
- **[ARM Template Output Reference](../../reference/arm-template-output.md)** - Understanding generated templates

---

**Next**: Learn about [deploying to Azure](./deployment.md)
