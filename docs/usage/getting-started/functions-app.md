# Getting Started with Azure Functions Apps

## Introduction

Azure Functions Apps enable you to run serverless functions in Azure without managing infrastructure. The `FunctionsApp` construct in Atakora makes it easy to deploy Functions Apps by automatically handling all the required dependencies, including dedicated storage for the Functions runtime.

## What is a Functions App?

An Azure Functions App is a hosting container for your serverless functions. Think of it as an apartment building where each function is a unit. The Functions App provides:

- **Runtime Environment**: Node.js, Python, .NET, Java, or PowerShell
- **Execution Context**: Isolated environment for your code to run
- **Trigger Management**: Automatic handling of HTTP requests, timers, queues, and other triggers
- **Scaling**: Automatic scaling based on load
- **State Management**: Built-in coordination for distributed execution

## Prerequisites

Before you start, ensure you have:

1. Atakora CDK installed: `npm install @atakora/cdk @atakora/component`
2. Azure credentials configured
3. Basic understanding of TypeScript and Azure concepts

## Your First Functions App

Let's create a simple Functions App step by step.

### Step 1: Set Up Your Project

Create a new TypeScript file for your infrastructure code:

```typescript
// src/infrastructure/app.ts
import { App } from '@atakora/cdk';
import { ResourceGroupStack } from '@atakora/cdk';
import { FunctionsApp, FunctionRuntime } from '@atakora/component/functions';
```

### Step 2: Create the App and Stack

```typescript
const app = new App();

const stack = new ResourceGroupStack(app, 'MyFirstFunctionsStack', {
  resourceGroupName: 'rg-my-first-functions-dev',
  location: 'eastus'
});
```

### Step 3: Create the Functions App

```typescript
const functionsApp = new FunctionsApp(stack, 'MyApi', {
  runtime: FunctionRuntime.NODE,
  runtimeVersion: '20',
  environment: {
    NODE_ENV: 'development'
  }
});
```

### Step 4: Synthesize

```typescript
app.synth();
```

### Complete Example

Here's the complete code:

```typescript
import { App } from '@atakora/cdk';
import { ResourceGroupStack } from '@atakora/cdk';
import { FunctionsApp, FunctionRuntime } from '@atakora/component/functions';

const app = new App();

const stack = new ResourceGroupStack(app, 'MyFirstFunctionsStack', {
  resourceGroupName: 'rg-my-first-functions-dev',
  location: 'eastus'
});

const functionsApp = new FunctionsApp(stack, 'MyApi', {
  runtime: FunctionRuntime.NODE,
  runtimeVersion: '20',
  environment: {
    NODE_ENV: 'development'
  }
});

console.log(`Function App URL: https://${functionsApp.defaultHostName}`);

app.synth();
```

### What Gets Created

When you deploy this stack, Atakora creates:

1. **Resource Group**: `rg-my-first-functions-dev`
2. **App Service Plan**: A consumption (serverless) plan for running functions
3. **Storage Account**: Dedicated storage for Functions runtime operations
4. **Function App**: The actual Functions App named based on your construct ID
5. **Managed Identity**: A system-assigned identity for secure access to other Azure resources

## Understanding Storage

One of the most important concepts to understand: **each Functions App automatically creates its own dedicated storage account**.

### Why Dedicated Storage?

The storage account is used by the Functions runtime for:

- Storing your function code and deployment packages
- Managing triggers and coordination between scaled instances
- Tracking execution history and state
- Handling distributed locks and leases

This storage is separate from any application data storage you might need. Here's an example showing both:

```typescript
import { StorageAccounts, StorageAccountSkuName } from '@atakora/cdk/storage';

// Storage for your application's data (documents, files, etc.)
const appDataStorage = new StorageAccounts(stack, 'AppData', {
  location: 'eastus',
  sku: StorageAccountSkuName.STANDARD_GRS,
  kind: 'StorageV2'
});

// Functions App (automatically creates runtime storage)
const functionsApp = new FunctionsApp(stack, 'Api', {
  runtime: FunctionRuntime.NODE,
  runtimeVersion: '20',
  environment: {
    // Pass your app data storage connection to functions
    APP_STORAGE_CONNECTION: appDataStorage.connectionString
  }
});

// Two separate storage accounts:
// 1. appDataStorage - for your business data
// 2. functionsApp.storage - for Functions runtime (automatic)
```

**Key Takeaway**: Don't try to provide storage to the FunctionsApp construct. It creates its own dedicated storage automatically, and that's exactly what you want.

## Choosing a Runtime

Atakora supports all Azure Functions runtimes:

### Node.js

```typescript
const nodeApp = new FunctionsApp(stack, 'NodeApi', {
  runtime: FunctionRuntime.NODE,
  runtimeVersion: '20',  // or '18'
  environment: {
    NODE_ENV: 'production'
  }
});
```

**Best for**: REST APIs, web hooks, lightweight data processing

### Python

```typescript
const pythonApp = new FunctionsApp(stack, 'PythonProcessor', {
  runtime: FunctionRuntime.PYTHON,
  runtimeVersion: '3.11',  // or '3.9', '3.10'
  environment: {
    PYTHONPATH: '/home/site/wwwroot'
  }
});
```

**Best for**: Data science, machine learning, batch processing

### .NET

```typescript
const dotnetApp = new FunctionsApp(stack, 'DotNetApi', {
  runtime: FunctionRuntime.DOTNET,
  runtimeVersion: '8.0',  // or '6.0', '7.0'
  environment: {
    ASPNETCORE_ENVIRONMENT: 'Production'
  }
});
```

**Best for**: Enterprise applications, high-performance APIs

### Java

```typescript
const javaApp = new FunctionsApp(stack, 'JavaApi', {
  runtime: FunctionRuntime.JAVA,
  runtimeVersion: '17',  // or '11'
  environment: {
    JAVA_OPTS: '-XX:MaxRAM=512m'
  }
});
```

**Best for**: Enterprise applications, existing Java codebases

### PowerShell

```typescript
const powershellApp = new FunctionsApp(stack, 'AutomationScripts', {
  runtime: FunctionRuntime.POWERSHELL,
  runtimeVersion: '7.2',
  environment: {
    PSModulePath: '/home/site/wwwroot/modules'
  }
});
```

**Best for**: Azure automation, administrative tasks

## Choosing a Hosting Plan

Azure Functions offers three hosting plan types. By default, you get a consumption (serverless) plan, but you can choose a different plan for specific needs.

### Consumption Plan (Default)

```typescript
const consumptionApp = new FunctionsApp(stack, 'ServerlessApi', {
  runtime: FunctionRuntime.NODE,
  // No plan specified = Consumption plan
});
```

**Characteristics**:
- Pay only for execution time
- Automatic scaling (0 to 200 instances)
- 5-minute timeout (configurable up to 10 minutes)
- Cold starts when scaling from zero

**Best for**: Event-driven workloads, infrequent usage, variable load

### Premium Plan

```typescript
import { FunctionAppPresets } from '@atakora/component/functions';

const premiumApp = new FunctionsApp(stack, 'PremiumApi', {
  runtime: FunctionRuntime.NODE,
  plan: FunctionAppPresets.PREMIUM_EP1.plan
});
```

**Characteristics**:
- Pre-warmed instances (no cold starts)
- VNet integration
- Unlimited execution duration
- More CPU and memory options

**Best for**: Production APIs, always-on workloads, VNet connectivity needed

### Dedicated Plan

```typescript
const dedicatedApp = new FunctionsApp(stack, 'DedicatedApi', {
  runtime: FunctionRuntime.NODE,
  plan: FunctionAppPresets.DEDICATED_P1V2.plan
});
```

**Characteristics**:
- Dedicated virtual machines
- Predictable performance
- Fixed monthly cost
- Run other App Service apps on same plan

**Best for**: Long-running processes, predictable costs, existing App Service infrastructure

## Environment Variables

Functions often need configuration through environment variables.

### Setting Variables at Creation

```typescript
const functionsApp = new FunctionsApp(stack, 'Api', {
  runtime: FunctionRuntime.NODE,
  environment: {
    NODE_ENV: 'production',
    LOG_LEVEL: 'info',
    API_VERSION: 'v1'
  }
});
```

### Adding Variables After Creation

```typescript
// Add a single variable
functionsApp.addEnvironmentVariable('FEATURE_FLAG', 'enabled');

// Add multiple variables
functionsApp.addEnvironmentVariables({
  CACHE_TTL: '3600',
  MAX_CONNECTIONS: '100',
  TIMEOUT: '30'
});
```

### Using Secrets from Key Vault

```typescript
import { KeyVault } from '@atakora/cdk/keyvault';

const keyVault = new KeyVault(stack, 'Secrets', {
  location: 'eastus',
  // ... Key Vault configuration
});

const functionsApp = new FunctionsApp(stack, 'Api', {
  runtime: FunctionRuntime.NODE,
  environment: {
    // Reference Key Vault secret
    DATABASE_PASSWORD: `@Microsoft.KeyVault(SecretUri=${keyVault.vaultUri}/secrets/db-password)`,
    API_KEY: `@Microsoft.KeyVault(SecretUri=${keyVault.vaultUri}/secrets/api-key)`
  }
});
```

## Accessing Function App Properties

After creating a Functions App, you can access various properties:

```typescript
const functionsApp = new FunctionsApp(stack, 'Api', {
  runtime: FunctionRuntime.NODE
});

// Function App name
console.log(`Name: ${functionsApp.functionAppName}`);

// Default hostname (URL)
console.log(`URL: https://${functionsApp.defaultHostName}`);

// Resource ID
console.log(`Resource ID: ${functionsApp.functionAppId}`);

// Location
console.log(`Location: ${functionsApp.location}`);

// Storage account (automatically created)
console.log(`Runtime Storage: ${functionsApp.storage.storageAccountName}`);

// App Service Plan
console.log(`Plan ID: ${functionsApp.plan.planId}`);
```

## Adding Monitoring

Enable Application Insights for monitoring and diagnostics:

```typescript
const functionsApp = new FunctionsApp(stack, 'Api', {
  runtime: FunctionRuntime.NODE,
  enableMonitoring: true  // This is default
});
```

When monitoring is enabled, Application Insights automatically tracks:
- Function executions
- Request duration
- Success/failure rates
- Exceptions and errors
- Custom metrics and traces

## Tagging Resources

Add tags for organization, cost tracking, and governance:

```typescript
const functionsApp = new FunctionsApp(stack, 'Api', {
  runtime: FunctionRuntime.NODE,
  tags: {
    environment: 'production',
    costCenter: 'engineering',
    project: 'customer-api',
    owner: 'platform-team',
    criticality: 'high'
  }
});
```

Tags are applied to all resources created by the FunctionsApp construct (App Service Plan, Storage Account, and Function App).

## Next Steps

Now that you understand the basics:

1. **Deploy Your First Function**: Write actual function code and deploy it to your Functions App
2. **Add Triggers**: Configure HTTP, timer, queue, or event triggers
3. **Connect to Other Services**: Integrate with databases, storage, and other Azure services
4. **Set Up CI/CD**: Automate deployments with GitHub Actions or Azure DevOps
5. **Monitor and Debug**: Use Application Insights to troubleshoot and optimize

## Common Patterns

### Development, Staging, and Production

```typescript
const environments = ['dev', 'staging', 'prod'];

environments.forEach(env => {
  const stack = new ResourceGroupStack(app, `FunctionsStack-${env}`, {
    resourceGroupName: `rg-api-${env}`,
    location: 'eastus'
  });

  const functionsApp = new FunctionsApp(stack, 'Api', {
    runtime: FunctionRuntime.NODE,
    runtimeVersion: '20',
    plan: env === 'prod'
      ? FunctionAppPresets.PREMIUM_EP1.plan
      : FunctionAppPresets.CONSUMPTION.plan,
    environment: {
      NODE_ENV: env === 'prod' ? 'production' : 'development',
      ENVIRONMENT: env
    },
    tags: {
      environment: env
    }
  });
});
```

### Multi-Region Deployment

```typescript
const regions = ['eastus2', 'westus2'];

regions.forEach(region => {
  const stack = new ResourceGroupStack(app, `Stack-${region}`, {
    resourceGroupName: `rg-api-prod-${region}`,
    location: region
  });

  const functionsApp = new FunctionsApp(stack, 'Api', {
    runtime: FunctionRuntime.NODE,
    environment: {
      REGION: region
    },
    tags: {
      region: region
    }
  });
});
```

## Troubleshooting

### Deployment Takes a Long Time

Functions Apps require several resources to be created. Initial deployment typically takes 3-5 minutes. This is normal.

### Function App Fails to Start

Check that:
1. The runtime version is compatible with your function code
2. Environment variables are set correctly
3. Required connection strings are provided
4. Application Insights is configured if monitoring is enabled

### Cannot Find Storage Account

The storage account is automatically created - you don't need to create it. If you need to access it, use:

```typescript
const storageAccountName = functionsApp.storage.storageAccountName;
```

## Best Practices

1. **Use Environment Variables**: Don't hardcode configuration in your function code
2. **Enable Monitoring**: Always use Application Insights in production
3. **Tag Resources**: Use consistent tagging for cost tracking and organization
4. **Choose the Right Plan**: Start with Consumption, move to Premium if needed
5. **Separate Environments**: Use different resource groups for dev/staging/prod
6. **Use Key Vault**: Store secrets in Key Vault, not environment variables directly
7. **Don't Share Storage**: Each Functions App automatically gets its own storage - that's correct

## Learn More

- [Functions Storage Guide](../guides/functions-storage.md) - Deep dive into storage architecture
- [Basic Usage Examples](../examples/functions-basic-usage.md) - Complete working examples
- [Azure Functions Documentation](https://learn.microsoft.com/azure/azure-functions/)

## Getting Help

If you encounter issues:

1. Check the error message carefully
2. Review the [troubleshooting section](#troubleshooting)
3. Consult the [examples](../examples/functions-basic-usage.md)
4. Check Azure portal for resource status
5. Review Application Insights logs

Remember: The FunctionsApp construct handles complexity for you. Trust its defaults, especially around storage provisioning, and only customize when you have specific requirements.
