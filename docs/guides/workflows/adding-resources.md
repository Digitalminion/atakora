# Adding Resources to Your Infrastructure

[Getting Started](../../getting-started/README.md) > [Guides](../README.md) > [Workflows](./README.md) > **Adding Resources**

---

This guide walks you through the complete process of adding Azure resources to your infrastructure. You'll learn how to choose the right constructs, configure them properly, manage dependencies, and validate your changes before deployment.

## Table of Contents

- [Understanding Resource Addition](#understanding-resource-addition)
- [Basic Resource Addition](#basic-resource-addition)
- [Configuring Resource Properties](#configuring-resource-properties)
- [Managing Resource Dependencies](#managing-resource-dependencies)
- [Working with Resource Outputs](#working-with-resource-outputs)
- [Naming and Conventions](#naming-and-conventions)
- [Validation and Testing](#validation-and-testing)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

## Understanding Resource Addition

When you add a resource to your Atakora infrastructure, several things happen:

1. **Construct Creation**: You instantiate a construct representing the Azure resource
2. **Configuration**: You provide properties that define the resource's behavior
3. **Tree Registration**: The construct adds itself to the construct tree
4. **Synthesis**: During `atakora synth`, the construct generates ARM template JSON
5. **Deployment**: The ARM template is deployed to Azure via subscription deployment

Understanding this flow helps you make informed decisions about resource configuration and organization.

## Basic Resource Addition

### Step 1: Import the Construct

First, import the construct you need from `@atakora/lib`:

```typescript
import { Stack, StorageAccount, AppServicePlan, WebApp } from '@atakora/lib';
```

### Step 2: Add to Your Stack

Add the resource within your stack definition:

```typescript
import { Stack, ResourceGroup, StorageAccount } from '@atakora/lib';

export class MyInfrastructureStack extends Stack {
  constructor() {
    super('my-infrastructure');

    // Create resource group
    const rg = new ResourceGroup(this, 'main-rg', {
      location: 'eastus',
      tags: {
        environment: 'production',
        project: 'myapp'
      }
    });

    // Add storage account
    const storage = new StorageAccount(this, 'app-storage', {
      resourceGroup: rg,
      location: rg.location,
      sku: {
        name: 'Standard_LRS'
      },
      kind: 'StorageV2',
      properties: {
        accessTier: 'Hot',
        supportsHttpsTrafficOnly: true,
        minimumTlsVersion: 'TLS1_2'
      }
    });
  }
}
```

### Step 3: Verify the Addition

Preview your changes before deployment:

```bash
# Synthesize to see the ARM template
atakora synth

# Compare against deployed infrastructure
atakora diff

# View the specific changes
atakora diff --verbose
```

## Configuring Resource Properties

### Understanding Property Types

Atakora constructs accept properties through their constructor. Properties fall into several categories:

#### Required Properties

These must be provided for the resource to be created:

```typescript
const webApp = new WebApp(this, 'my-webapp', {
  resourceGroup: rg,        // Required: where to deploy
  location: 'eastus',       // Required: Azure region
  serverFarmId: plan.id     // Required: hosting plan reference
});
```

#### Optional Properties

These have defaults but can be overridden:

```typescript
const storage = new StorageAccount(this, 'storage', {
  resourceGroup: rg,
  location: 'eastus',
  sku: { name: 'Standard_LRS' },  // Optional: defaults to Standard_LRS
  kind: 'StorageV2',               // Optional: defaults to StorageV2
  properties: {
    supportsHttpsTrafficOnly: true // Optional: defaults to true
  }
});
```

#### Nested Properties

Many resources have complex nested property structures:

```typescript
const webApp = new WebApp(this, 'webapp', {
  resourceGroup: rg,
  location: 'eastus',
  serverFarmId: plan.id,
  properties: {
    siteConfig: {
      nodeVersion: '18-lts',
      alwaysOn: true,
      http20Enabled: true,
      minTlsVersion: '1.2',
      appSettings: [
        { name: 'WEBSITE_NODE_DEFAULT_VERSION', value: '18-lts' },
        { name: 'NODE_ENV', value: 'production' }
      ]
    },
    httpsOnly: true,
    clientAffinityEnabled: false
  }
});
```

### Property Discovery

To find available properties for a resource:

1. **TypeScript IntelliSense**: Use your IDE's autocomplete
2. **Source Code**: Check the construct definition in `@atakora/lib`
3. **Azure Documentation**: Reference the ARM template schema
4. **Examples**: Look at [example projects](../../examples/README.md)

### Type Safety

Atakora provides full TypeScript type definitions:

```typescript
// ✅ Type-safe: IDE will suggest valid SKU names
const storage = new StorageAccount(this, 'storage', {
  resourceGroup: rg,
  location: 'eastus',
  sku: {
    name: 'Standard_LRS' // Type-checked against valid SKU values
  }
});

// ❌ Type error: invalid SKU name
const storage = new StorageAccount(this, 'storage', {
  resourceGroup: rg,
  location: 'eastus',
  sku: {
    name: 'Invalid_SKU' // TypeScript compilation error
  }
});
```

## Managing Resource Dependencies

### Explicit Dependencies

When one resource depends on another, Atakora automatically manages deployment order:

```typescript
// Resource group must exist before storage
const rg = new ResourceGroup(this, 'rg', {
  location: 'eastus'
});

// Storage account references resource group
// Atakora ensures rg deploys first
const storage = new StorageAccount(this, 'storage', {
  resourceGroup: rg,  // Explicit dependency
  location: rg.location
});

// Web app depends on app service plan
const plan = new AppServicePlan(this, 'plan', {
  resourceGroup: rg,
  location: 'eastus',
  sku: { name: 'B1', tier: 'Basic' }
});

const webApp = new WebApp(this, 'webapp', {
  resourceGroup: rg,
  location: 'eastus',
  serverFarmId: plan.id  // Explicit dependency
});
```

### Implicit Dependencies

Dependencies are created automatically when you reference resource properties:

```typescript
const vnet = new VirtualNetwork(this, 'vnet', {
  resourceGroup: rg,
  location: 'eastus',
  properties: {
    addressSpace: {
      addressPrefixes: ['10.0.0.0/16']
    }
  }
});

const subnet = new Subnet(this, 'subnet', {
  resourceGroup: rg,
  virtualNetworkName: vnet.name,  // Implicit dependency
  properties: {
    addressPrefix: '10.0.1.0/24'
  }
});

// Network interface depends on subnet
const nic = new NetworkInterface(this, 'nic', {
  resourceGroup: rg,
  location: 'eastus',
  properties: {
    ipConfigurations: [{
      name: 'ipconfig1',
      properties: {
        subnet: {
          id: subnet.id  // Implicit dependency through reference
        }
      }
    }]
  }
});
```

### Manual Dependencies

In rare cases, you might need to add manual dependencies:

```typescript
const roleAssignment = new RoleAssignment(this, 'role', {
  scope: storage.id,
  roleDefinitionId: 'roleDefId',
  principalId: 'principalId'
});

// Ensure role assignment happens after storage is fully configured
roleAssignment.node.addDependency(storage);
```

## Working with Resource Outputs

### Accessing Resource Properties

All constructs expose properties you can reference:

```typescript
const storage = new StorageAccount(this, 'storage', {
  resourceGroup: rg,
  location: 'eastus'
});

// Access properties
console.log(storage.name);      // e.g., "storage-abc123"
console.log(storage.id);        // Full Azure resource ID
console.log(storage.location);  // "eastus"
```

### Using Outputs in Other Resources

Pass resource references to configure relationships:

```typescript
const plan = new AppServicePlan(this, 'plan', {
  resourceGroup: rg,
  location: 'eastus',
  sku: { name: 'B1', tier: 'Basic' }
});

const webApp = new WebApp(this, 'webapp', {
  resourceGroup: rg,
  location: plan.location,      // Reference plan's location
  serverFarmId: plan.id,        // Reference plan's ID
  properties: {
    siteConfig: {
      appSettings: [
        {
          name: 'STORAGE_ACCOUNT_NAME',
          value: storage.name   // Reference storage account name
        }
      ]
    }
  }
});
```

### Exporting Stack Outputs

Export values you'll need to reference from other stacks or externally:

```typescript
export class MyStack extends Stack {
  public readonly storageAccountName: string;
  public readonly webAppUrl: string;

  constructor() {
    super('my-stack');

    const storage = new StorageAccount(this, 'storage', {
      resourceGroup: rg,
      location: 'eastus'
    });

    const webApp = new WebApp(this, 'webapp', {
      resourceGroup: rg,
      location: 'eastus',
      serverFarmId: plan.id
    });

    // Export for external use
    this.storageAccountName = storage.name;
    this.webAppUrl = `https://${webApp.name}.azurewebsites.net`;
  }
}
```

## Naming and Conventions

### Logical Names vs Azure Names

Atakora distinguishes between logical names (for TypeScript) and Azure resource names:

```typescript
// 'my-storage' is the logical ID in the construct tree
// The actual Azure name is generated with a hash for uniqueness
const storage = new StorageAccount(this, 'my-storage', {
  resourceGroup: rg,
  location: 'eastus'
});

// Actual Azure name: "mystorage-abc123def456" (lowercase, no hyphens, unique hash)
console.log(storage.name);
```

### Customizing Azure Names

Override the generated name when needed:

```typescript
const storage = new StorageAccount(this, 'my-storage', {
  resourceGroup: rg,
  location: 'eastus',
  name: 'mycompanystorage2024'  // Custom Azure name
});
```

**Important**: Custom names must:
- Be globally unique (for resources like Storage Accounts)
- Follow Azure naming rules (length, allowed characters)
- Remain stable across deployments

### Naming Best Practices

```typescript
// ✅ Good: Descriptive logical IDs
const apiStorage = new StorageAccount(this, 'api-storage', {...});
const webPlan = new AppServicePlan(this, 'web-plan', {...});

// ✅ Good: Include environment in logical ID
const prodDb = new SqlServer(this, 'prod-sql-server', {...});

// ❌ Avoid: Generic IDs that don't indicate purpose
const storage1 = new StorageAccount(this, 'storage1', {...});
const resource = new WebApp(this, 'resource', {...});

// ✅ Good: Use consistent prefixes for related resources
const appPlan = new AppServicePlan(this, 'app-plan', {...});
const appWebsite = new WebApp(this, 'app-website', {...});
const appStorage = new StorageAccount(this, 'app-storage', {...});
```

See [Naming Conventions](../../reference/naming-conventions.md) for comprehensive guidance.

## Validation and Testing

### Pre-Deployment Validation

Always validate before deploying:

```bash
# Run validation checks
atakora synth

# Preview changes
atakora diff

# Verify specific resources
atakora diff --resource-types "Microsoft.Storage/*"
```

### Unit Testing

Test your infrastructure code:

```typescript
import { describe, it, expect } from 'vitest';
import { MyInfrastructureStack } from './my-infrastructure';

describe('MyInfrastructureStack', () => {
  it('creates storage account with correct properties', () => {
    const stack = new MyInfrastructureStack();
    const template = stack.toTemplate();

    const storageResources = template.resources.filter(
      r => r.type === 'Microsoft.Storage/storageAccounts'
    );

    expect(storageResources).toHaveLength(1);
    expect(storageResources[0].properties.supportsHttpsTrafficOnly).toBe(true);
    expect(storageResources[0].properties.minimumTlsVersion).toBe('TLS1_2');
  });

  it('configures web app with HTTPS only', () => {
    const stack = new MyInfrastructureStack();
    const template = stack.toTemplate();

    const webApps = template.resources.filter(
      r => r.type === 'Microsoft.Web/sites'
    );

    expect(webApps[0].properties.httpsOnly).toBe(true);
  });
});
```

See [Testing Infrastructure](./testing-infrastructure.md) for comprehensive testing strategies.

## Common Patterns

### Adding Storage to Existing Infrastructure

```typescript
export class ExistingStack extends Stack {
  constructor() {
    super('existing-stack');

    // Existing resources
    const rg = new ResourceGroup(this, 'rg', {
      location: 'eastus'
    });

    const webApp = new WebApp(this, 'webapp', {
      resourceGroup: rg,
      location: 'eastus',
      serverFarmId: plan.id
    });

    // NEW: Add storage account
    const storage = new StorageAccount(this, 'new-storage', {
      resourceGroup: rg,
      location: rg.location,
      sku: { name: 'Standard_LRS' },
      kind: 'StorageV2'
    });

    // NEW: Configure web app to use storage
    const storageConnection = `DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=...`;

    // Update web app configuration
    webApp.addProperty('siteConfig.appSettings', [
      { name: 'STORAGE_CONNECTION', value: storageConnection }
    ]);
  }
}
```

### Adding Multiple Related Resources

```typescript
export class WebAppWithDatabaseStack extends Stack {
  constructor() {
    super('webapp-db-stack');

    const rg = new ResourceGroup(this, 'rg', {
      location: 'eastus'
    });

    // Add SQL Server
    const sqlServer = new SqlServer(this, 'sql-server', {
      resourceGroup: rg,
      location: rg.location,
      properties: {
        administratorLogin: 'sqladmin',
        administratorLoginPassword: '${secretRef:sqlPassword}',
        version: '12.0'
      }
    });

    // Add SQL Database
    const database = new SqlDatabase(this, 'sql-db', {
      resourceGroup: rg,
      location: rg.location,
      serverName: sqlServer.name,
      sku: {
        name: 'S0',
        tier: 'Standard'
      }
    });

    // Add App Service Plan
    const plan = new AppServicePlan(this, 'plan', {
      resourceGroup: rg,
      location: rg.location,
      sku: { name: 'P1v2', tier: 'PremiumV2' }
    });

    // Add Web App with database connection
    const webApp = new WebApp(this, 'webapp', {
      resourceGroup: rg,
      location: rg.location,
      serverFarmId: plan.id,
      properties: {
        siteConfig: {
          connectionStrings: [{
            name: 'DefaultConnection',
            connectionString: `Server=${sqlServer.fullyQualifiedDomainName};Database=${database.name};User Id=sqladmin;Password=...`,
            type: 'SQLAzure'
          }]
        }
      }
    });
  }
}
```

### Adding Resources Conditionally

```typescript
export class ConditionalStack extends Stack {
  constructor(config: { enableCache: boolean; environment: string }) {
    super('conditional-stack');

    const rg = new ResourceGroup(this, 'rg', {
      location: 'eastus'
    });

    // Always create web app
    const webApp = new WebApp(this, 'webapp', {
      resourceGroup: rg,
      location: rg.location,
      serverFarmId: plan.id
    });

    // Conditionally add Redis cache
    if (config.enableCache) {
      const cache = new RedisCache(this, 'redis', {
        resourceGroup: rg,
        location: rg.location,
        sku: {
          name: config.environment === 'production' ? 'Premium' : 'Basic',
          family: config.environment === 'production' ? 'P' : 'C',
          capacity: config.environment === 'production' ? 1 : 0
        }
      });

      webApp.addAppSetting('REDIS_HOST', cache.hostName);
      webApp.addAppSetting('REDIS_PORT', '6380');
    }

    // Production-only monitoring
    if (config.environment === 'production') {
      const insights = new ApplicationInsights(this, 'appinsights', {
        resourceGroup: rg,
        location: rg.location,
        kind: 'web'
      });

      webApp.addAppSetting('APPINSIGHTS_INSTRUMENTATIONKEY', insights.instrumentationKey);
    }
  }
}
```

## Troubleshooting

### Common Issues

#### Resource Name Already Exists

**Problem**: Deployment fails with "resource name already exists"

```
Error: The storage account name 'mystorage' is already taken.
```

**Solution**: Either use the existing resource or choose a unique name:

```typescript
// Option 1: Reference existing resource
const existingStorage = StorageAccount.fromName(this, 'storage', 'mystorage');

// Option 2: Use unique name
const storage = new StorageAccount(this, 'storage', {
  resourceGroup: rg,
  location: 'eastus',
  name: 'mystorage-prod-2024'  // More specific name
});

// Option 3: Let Atakora generate unique name
const storage = new StorageAccount(this, 'storage', {
  resourceGroup: rg,
  location: 'eastus'
  // No name specified - auto-generated with hash
});
```

#### Circular Dependencies

**Problem**: Resources depend on each other creating a cycle

```
Error: Circular dependency detected: webApp -> storage -> webApp
```

**Solution**: Break the cycle by restructuring or using manual configuration:

```typescript
// ❌ Circular: web app creates storage, storage references web app
const webApp = new WebApp(this, 'webapp', {...});
const storage = new StorageAccount(this, 'storage', {
  resourceGroup: rg,
  location: 'eastus',
  tags: { createdBy: webApp.name }  // Creates dependency
});
webApp.addAppSetting('STORAGE_NAME', storage.name);  // Creates reverse dependency

// ✅ Fixed: Remove circular reference
const storage = new StorageAccount(this, 'storage', {
  resourceGroup: rg,
  location: 'eastus'
  // No reference to web app
});
const webApp = new WebApp(this, 'webapp', {...});
webApp.addAppSetting('STORAGE_NAME', storage.name);  // One-way dependency
```

#### Invalid Property Values

**Problem**: Deployment fails due to invalid property

```
Error: The value 'invalid' is not valid for property 'sku.name'
```

**Solution**: Check TypeScript types and Azure documentation:

```typescript
// ❌ Invalid SKU
const storage = new StorageAccount(this, 'storage', {
  sku: { name: 'invalid' }
});

// ✅ Valid SKU from type definition
const storage = new StorageAccount(this, 'storage', {
  sku: {
    name: 'Standard_LRS'  // TypeScript will validate this
  }
});
```

#### Missing Required Dependencies

**Problem**: Resource requires another resource that doesn't exist

```
Error: App Service Plan not found
```

**Solution**: Ensure dependencies are created first:

```typescript
// ❌ Missing dependency
const webApp = new WebApp(this, 'webapp', {
  resourceGroup: rg,
  location: 'eastus',
  serverFarmId: '/subscriptions/.../plans/non-existent'
});

// ✅ Create dependency first
const plan = new AppServicePlan(this, 'plan', {
  resourceGroup: rg,
  location: 'eastus',
  sku: { name: 'B1', tier: 'Basic' }
});

const webApp = new WebApp(this, 'webapp', {
  resourceGroup: rg,
  location: 'eastus',
  serverFarmId: plan.id  // Reference created resource
});
```

### Getting Help

When you encounter issues:

1. **Check Synthesis Output**: Review the generated ARM template for issues
   ```bash
   atakora synth --verbose
   ```

2. **Compare Changes**: See what's different from current deployment
   ```bash
   atakora diff --verbose
   ```

3. **Validate Locally**: Run validation without deploying
   ```bash
   atakora synth --validate
   ```

4. **Review Documentation**: Check [resource-specific guides](../../getting-started/common-resources/README.md)

5. **Consult Examples**: Look at [working examples](../../examples/README.md)

## Next Steps

- **[Testing Infrastructure](./testing-infrastructure.md)**: Add tests for your new resources
- **[Managing Secrets](./managing-secrets.md)**: Secure sensitive resource properties
- **[Deploying Environments](./deploying-environments.md)**: Deploy your updated infrastructure

## Related Documentation

- [Core Concepts](../core-concepts/README.md) - Understanding constructs and stacks
- [Common Resources](../../getting-started/common-resources/README.md) - Resource-specific guides
- [Naming Conventions](../../reference/naming-conventions.md) - Resource naming rules
- [Troubleshooting](../../troubleshooting/common-issues.md) - Solutions to common problems

---

**Feedback**: Found an issue or have a suggestion? [Open an issue](https://github.com/your-org/atakora/issues) on GitHub.
