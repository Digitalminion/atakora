# Azure Functions App - Basic Usage Examples

## Overview

This guide provides complete, working examples for common Azure Functions App scenarios. All examples use the `FunctionsApp` construct which automatically creates dedicated storage for the Functions runtime.

## Prerequisites

```typescript
import { App } from '@atakora/cdk';
import { ResourceGroupStack } from '@atakora/cdk';
import { FunctionsApp, FunctionRuntime } from '@atakora/component/functions';
```

## Example 1: Simple Serverless API

Create a basic Functions App for a serverless API endpoint.

```typescript
import { App, ResourceGroupStack } from '@atakora/cdk';
import { FunctionsApp, FunctionRuntime } from '@atakora/component/functions';

const app = new App();

// Create resource group stack
const stack = new ResourceGroupStack(app, 'ServerlessApiStack', {
  resourceGroupName: 'rg-serverless-api-prod',
  location: 'eastus'
});

// Create Functions App - storage is automatically created
const apiApp = new FunctionsApp(stack, 'Api', {
  runtime: FunctionRuntime.NODE,
  runtimeVersion: '20',
  environment: {
    NODE_ENV: 'production',
    LOG_LEVEL: 'info'
  }
});

// The Functions App now has:
// - apiApp.functionApp: The Function App resource
// - apiApp.storage: Dedicated storage account (automatically created)
// - apiApp.plan: App Service Plan (automatically created)

app.synth();
```

**What gets created:**
- App Service Plan (Consumption Y1 tier)
- Storage Account (Standard_LRS, dedicated for Functions runtime)
- Function App (Node.js 20 runtime)
- System-assigned Managed Identity

## Example 2: Premium Functions App with Custom Configuration

Create a premium Functions App for production workloads requiring low latency.

```typescript
import { App, ResourceGroupStack } from '@atakora/cdk';
import {
  FunctionsApp,
  FunctionRuntime,
  FunctionAppPresets
} from '@atakora/component/functions';

const app = new App();

const stack = new ResourceGroupStack(app, 'PremiumApiStack', {
  resourceGroupName: 'rg-premium-api-prod',
  location: 'eastus2'
});

// Create premium Functions App with EP1 plan
const premiumApp = new FunctionsApp(stack, 'PremiumApi', {
  name: 'func-premium-api-prod',
  runtime: FunctionRuntime.NODE,
  runtimeVersion: '20',
  plan: FunctionAppPresets.PREMIUM_EP1.plan,
  environment: {
    NODE_ENV: 'production',
    LOG_LEVEL: 'info',
    MAX_CONNECTIONS: '100'
  },
  enableMonitoring: true,
  httpsOnly: true,
  tags: {
    environment: 'production',
    costCenter: 'engineering',
    project: 'premium-api'
  }
});

// Add additional environment variables after creation
premiumApp.addEnvironmentVariables({
  CACHE_TTL: '3600',
  API_VERSION: 'v2'
});

app.synth();
```

**What gets created:**
- App Service Plan (Elastic Premium EP1 tier)
- Storage Account (Standard_LRS, dedicated for Functions runtime)
- Function App (Node.js 20 runtime)
- System-assigned Managed Identity
- Application Insights (when monitoring is enabled)

**Key benefits of Premium plan:**
- No cold starts
- VNet integration capability
- Unlimited execution duration
- Pre-warmed instances

## Example 3: Multiple Functions Apps in One Stack

Create multiple Functions Apps for different purposes, each with isolated storage.

```typescript
import { App, ResourceGroupStack } from '@atakora/cdk';
import { FunctionsApp, FunctionRuntime } from '@atakora/component/functions';
import { StorageAccounts, StorageAccountSkuName } from '@atakora/cdk/storage';

const app = new App();

const stack = new ResourceGroupStack(app, 'MultiAppStack', {
  resourceGroupName: 'rg-multi-app-prod',
  location: 'westus2'
});

// Application data storage - separate from Functions runtime storage
const appDataStorage = new StorageAccounts(stack, 'AppData', {
  location: 'westus2',
  sku: StorageAccountSkuName.STANDARD_GRS, // Geo-redundant for data
  kind: 'StorageV2',
  tags: {
    purpose: 'application-data'
  }
});

// Public-facing API Functions App
const apiApp = new FunctionsApp(stack, 'PublicApi', {
  runtime: FunctionRuntime.NODE,
  runtimeVersion: '20',
  environment: {
    NODE_ENV: 'production',
    // Pass application data storage connection
    APP_STORAGE_CONNECTION: appDataStorage.connectionString
  },
  tags: {
    purpose: 'public-api'
  }
});

// Background processing Functions App
const backgroundApp = new FunctionsApp(stack, 'BackgroundJobs', {
  runtime: FunctionRuntime.PYTHON,
  runtimeVersion: '3.11',
  environment: {
    ENVIRONMENT: 'production',
    // Pass application data storage connection
    APP_STORAGE_CONNECTION: appDataStorage.connectionString
  },
  tags: {
    purpose: 'background-processing'
  }
});

// Internal admin Functions App
const adminApp = new FunctionsApp(stack, 'AdminApi', {
  runtime: FunctionRuntime.NODE,
  runtimeVersion: '20',
  environment: {
    NODE_ENV: 'production',
    ADMIN_ONLY: 'true',
    // Pass application data storage connection
    APP_STORAGE_CONNECTION: appDataStorage.connectionString
  },
  tags: {
    purpose: 'internal-admin'
  }
});

// Four separate storage accounts:
// 1. appDataStorage - For application business data
// 2. apiApp.storage - For Public API Functions runtime
// 3. backgroundApp.storage - For Background Jobs Functions runtime
// 4. adminApp.storage - For Admin API Functions runtime

app.synth();
```

**Architecture benefits:**
- Clear separation between application data and Functions runtime storage
- Each Functions App has isolated runtime storage
- Functions Apps can scale independently
- Security boundaries between different app purposes

## Example 4: Python Data Processing Function

Create a Python Functions App for data processing workloads.

```typescript
import { App, ResourceGroupStack } from '@atakora/cdk';
import { FunctionsApp, FunctionRuntime } from '@atakora/component/functions';

const app = new App();

const stack = new ResourceGroupStack(app, 'DataProcessingStack', {
  resourceGroupName: 'rg-data-processing-prod',
  location: 'centralus'
});

const dataProcessor = new FunctionsApp(stack, 'DataProcessor', {
  runtime: FunctionRuntime.PYTHON,
  runtimeVersion: '3.11',
  environment: {
    PYTHONPATH: '/home/site/wwwroot',
    ENVIRONMENT: 'production',
    BATCH_SIZE: '100',
    PROCESSING_TIMEOUT: '300'
  },
  tags: {
    workloadType: 'data-processing',
    runtime: 'python'
  }
});

// Access the storage account properties if needed
console.log(`Functions runtime storage: ${dataProcessor.storage.storageAccountName}`);
console.log(`Function App URL: https://${dataProcessor.defaultHostName}`);

app.synth();
```

## Example 5: .NET Functions App

Create a .NET Functions App for enterprise applications.

```typescript
import { App, ResourceGroupStack } from '@atakora/cdk';
import { FunctionsApp, FunctionRuntime } from '@atakora/component/functions';

const app = new App();

const stack = new ResourceGroupStack(app, 'EnterpriseApiStack', {
  resourceGroupName: 'rg-enterprise-api-prod',
  location: 'eastus2'
});

const enterpriseApi = new FunctionsApp(stack, 'EnterpriseApi', {
  runtime: FunctionRuntime.DOTNET,
  runtimeVersion: '8.0',
  environment: {
    ASPNETCORE_ENVIRONMENT: 'Production',
    LOG_LEVEL: 'Information',
    CONNECTION_TIMEOUT: '30'
  },
  enableMonitoring: true,
  tags: {
    framework: 'dotnet',
    version: '8.0'
  }
});

app.synth();
```

## Example 6: Development Environment Setup

Create a development environment with appropriate configuration.

```typescript
import { App, ResourceGroupStack } from '@atakora/cdk';
import { FunctionsApp, FunctionRuntime } from '@atakora/component/functions';

const app = new App();

const stack = new ResourceGroupStack(app, 'DevStack', {
  resourceGroupName: 'rg-myapp-dev',
  location: 'eastus'
});

const devApp = new FunctionsApp(stack, 'DevApi', {
  runtime: FunctionRuntime.NODE,
  runtimeVersion: '20',
  environment: {
    NODE_ENV: 'development',
    LOG_LEVEL: 'debug',
    ENABLE_DEBUG: 'true',
    DEV_TOOLS_ENABLED: 'true'
  },
  enableMonitoring: true,
  tags: {
    environment: 'development',
    autoShutdown: 'true'
  }
});

// Add development-specific environment variables
devApp.addEnvironmentVariable('LOCAL_DEBUG_PORT', '9229');
devApp.addEnvironmentVariable('ENABLE_CORS', 'true');

app.synth();
```

## Example 7: Environment Variables Management

Comprehensive example of managing environment variables.

```typescript
import { App, ResourceGroupStack } from '@atakora/cdk';
import { FunctionsApp, FunctionRuntime } from '@atakora/component/functions';
import { KeyVault } from '@atakora/cdk/keyvault';

const app = new App();

const stack = new ResourceGroupStack(app, 'ConfigStack', {
  resourceGroupName: 'rg-config-example-prod',
  location: 'eastus2'
});

// Create Key Vault for secrets
const keyVault = new KeyVault(stack, 'Secrets', {
  location: 'eastus2',
  // ... Key Vault configuration
});

const functionsApp = new FunctionsApp(stack, 'Api', {
  runtime: FunctionRuntime.NODE,
  runtimeVersion: '20',
  // Set initial environment variables
  environment: {
    NODE_ENV: 'production',
    LOG_LEVEL: 'info',
    API_VERSION: 'v1'
  }
});

// Add individual environment variables
functionsApp.addEnvironmentVariable('FEATURE_FLAG_NEW_UI', 'true');
functionsApp.addEnvironmentVariable('MAX_RETRY_ATTEMPTS', '3');

// Add multiple environment variables at once
functionsApp.addEnvironmentVariables({
  CACHE_ENABLED: 'true',
  CACHE_TTL: '3600',
  RATE_LIMIT: '1000'
});

// Reference Key Vault secrets
functionsApp.addEnvironmentVariable(
  'DATABASE_CONNECTION',
  `@Microsoft.KeyVault(SecretUri=${keyVault.vaultUri}/secrets/db-connection)`
);

functionsApp.addEnvironmentVariable(
  'API_KEY',
  `@Microsoft.KeyVault(SecretUri=${keyVault.vaultUri}/secrets/api-key)`
);

app.synth();
```

## Example 8: Accessing Storage Properties

Example showing how to access the automatically created storage account.

```typescript
import { App, ResourceGroupStack } from '@atakora/cdk';
import { FunctionsApp, FunctionRuntime } from '@atakora/component/functions';

const app = new App();

const stack = new ResourceGroupStack(app, 'StorageAccessStack', {
  resourceGroupName: 'rg-storage-access-prod',
  location: 'eastus'
});

const functionsApp = new FunctionsApp(stack, 'Api', {
  runtime: FunctionRuntime.NODE,
  runtimeVersion: '20'
});

// Access storage account properties
const storageId = functionsApp.storage.storageAccountId;
const storageName = functionsApp.storage.storageAccountName;
const storageEndpoints = functionsApp.storage.primaryEndpoints;

// Access Function App properties
const appName = functionsApp.functionAppName;
const appId = functionsApp.functionAppId;
const hostName = functionsApp.defaultHostName;

// Log or use these properties
console.log(`Function App: ${appName}`);
console.log(`URL: https://${hostName}`);
console.log(`Runtime Storage: ${storageName}`);

// Note: You typically don't need to access storage properties
// The FunctionsApp construct handles all storage configuration automatically

app.synth();
```

## Example 9: Shared Resource Group with Other Services

Example showing Functions Apps alongside other Azure resources.

```typescript
import { App, ResourceGroupStack } from '@atakora/cdk';
import { FunctionsApp, FunctionRuntime } from '@atakora/component/functions';
import { StorageAccounts, StorageAccountSkuName } from '@atakora/cdk/storage';
import { SqlServer } from '@atakora/cdk/sql';
import { CosmosDbAccount } from '@atakora/cdk/cosmosdb';

const app = new App();

const stack = new ResourceGroupStack(app, 'FullStackApp', {
  resourceGroupName: 'rg-fullstack-prod',
  location: 'eastus2'
});

// Application database
const database = new SqlServer(stack, 'Database', {
  location: 'eastus2',
  // ... database configuration
});

// Application data storage (separate from Functions runtime)
const dataStorage = new StorageAccounts(stack, 'AppData', {
  location: 'eastus2',
  sku: StorageAccountSkuName.STANDARD_GRS,
  kind: 'StorageV2'
});

// NoSQL database for documents
const cosmosDb = new CosmosDbAccount(stack, 'Documents', {
  location: 'eastus2',
  // ... Cosmos DB configuration
});

// API Functions App (gets its own dedicated runtime storage)
const apiApp = new FunctionsApp(stack, 'Api', {
  runtime: FunctionRuntime.NODE,
  runtimeVersion: '20',
  environment: {
    NODE_ENV: 'production',
    // Connect to shared services
    DATABASE_SERVER: database.fullyQualifiedDomainName,
    DATA_STORAGE_CONNECTION: dataStorage.connectionString,
    COSMOS_ENDPOINT: cosmosDb.documentEndpoint
  }
});

// Background processing Functions App (gets its own dedicated runtime storage)
const workerApp = new FunctionsApp(stack, 'Worker', {
  runtime: FunctionRuntime.NODE,
  runtimeVersion: '20',
  environment: {
    NODE_ENV: 'production',
    // Connect to same shared services
    DATABASE_SERVER: database.fullyQualifiedDomainName,
    DATA_STORAGE_CONNECTION: dataStorage.connectionString
  }
});

// Resource breakdown:
// - 1 SQL Server (shared)
// - 1 Application data storage account (shared)
// - 1 Cosmos DB account (shared)
// - 2 Functions Apps
// - 2 Dedicated Functions runtime storage accounts (one per Functions App)
// - 2 App Service Plans (one per Functions App)

app.synth();
```

## Common Patterns

### Pattern: Conditional Configuration Based on Environment

```typescript
const environment = process.env.ENVIRONMENT || 'dev';

const functionsApp = new FunctionsApp(stack, 'Api', {
  runtime: FunctionRuntime.NODE,
  runtimeVersion: '20',
  plan: environment === 'production'
    ? FunctionAppPresets.PREMIUM_EP1.plan
    : FunctionAppPresets.CONSUMPTION.plan,
  environment: {
    NODE_ENV: environment === 'production' ? 'production' : 'development',
    LOG_LEVEL: environment === 'production' ? 'info' : 'debug'
  },
  tags: {
    environment: environment
  }
});
```

### Pattern: Regional Deployment

```typescript
const regions = ['eastus2', 'westus2', 'centralus'];

regions.forEach(region => {
  const regionalStack = new ResourceGroupStack(app, `Stack-${region}`, {
    resourceGroupName: `rg-api-prod-${region}`,
    location: region
  });

  const regionalApp = new FunctionsApp(regionalStack, 'Api', {
    runtime: FunctionRuntime.NODE,
    runtimeVersion: '20',
    environment: {
      NODE_ENV: 'production',
      REGION: region
    },
    tags: {
      region: region
    }
  });
});
```

## What You Should NOT Do

### Anti-Pattern: Trying to Pass Storage

```typescript
// WRONG - This parameter has been removed
const storage = new StorageAccounts(stack, 'Storage', { ... });

const functionsApp = new FunctionsApp(stack, 'Api', {
  runtime: FunctionRuntime.NODE,
  existingStorage: storage  // ERROR: This parameter doesn't exist
});
```

### Anti-Pattern: Creating Storage Separately

```typescript
// WRONG - Don't pre-create storage for Functions
const funcStorage = new StorageAccounts(stack, 'FuncStorage', { ... });

// The FunctionsApp creates storage automatically - no need to create it yourself
```

## See Also

- [Functions Storage Guide](../guides/functions-storage.md) - Detailed explanation of why Functions Apps need dedicated storage
- [Getting Started with Functions Apps](../getting-started/functions-app.md) - Step-by-step tutorial
- [Azure Functions Best Practices](https://learn.microsoft.com/azure/azure-functions/functions-best-practices)
