# Azure Functions App Guide

[Home](../README.md) > [Getting Started](./README.md) > Azure Functions App

Deploy serverless Azure Functions Apps with automatic storage provisioning and best practices.

## What You'll Learn

- Creating Functions Apps with different runtimes
- Understanding automatic storage provisioning
- Choosing the right hosting plan
- Managing environment variables and secrets
- Monitoring and debugging functions

## Prerequisites

- Completed [Installation](./01-Installation.md)
- Basic understanding of serverless concepts
- Azure subscription with Functions App quota

## Quick Example

```typescript
import { App, Stack } from '@atakora/cdk';
import { ResourceGroup } from '@atakora/cdk/resourcegroup';
import { FunctionApp } from '@atakora/cdk/web';

const app = new App();
const stack = new Stack(app, 'functions-stack');

const resourceGroup = new ResourceGroup(stack, 'rg', {
  name: 'rg-functions-dev',
  location: 'eastus'
});

// Functions App with automatic storage provisioning
const functionsApp = new FunctionApp(stack, 'func-app', {
  resourceGroupName: resourceGroup.name,
  functionAppName: 'func-myapi-dev',
  location: 'eastus',
  runtime: 'node',
  runtimeVersion: '18'
});

app.synth();
```

## Supported Runtimes

### Node.js Functions

```typescript
const nodeFunc = new FunctionApp(stack, 'node-func', {
  resourceGroupName: resourceGroup.name,
  functionAppName: 'func-node-app',
  location: 'eastus',
  runtime: 'node',
  runtimeVersion: '18',
  appSettings: {
    NODE_ENV: 'production',
    API_KEY: process.env.API_KEY
  }
});
```

### Python Functions

```typescript
const pythonFunc = new FunctionApp(stack, 'python-func', {
  resourceGroupName: resourceGroup.name,
  functionAppName: 'func-python-app',
  location: 'eastus',
  runtime: 'python',
  runtimeVersion: '3.9',
  appSettings: {
    PYTHON_ENABLE_DEBUG_LOGGING: '1'
  }
});
```

### .NET Functions

```typescript
const dotnetFunc = new FunctionApp(stack, 'dotnet-func', {
  resourceGroupName: resourceGroup.name,
  functionAppName: 'func-dotnet-app',
  location: 'eastus',
  runtime: 'dotnet',
  runtimeVersion: '6',
  appSettings: {
    FUNCTIONS_WORKER_RUNTIME: 'dotnet-isolated'
  }
});
```

### Java Functions

```typescript
const javaFunc = new FunctionApp(stack, 'java-func', {
  resourceGroupName: resourceGroup.name,
  functionAppName: 'func-java-app',
  location: 'eastus',
  runtime: 'java',
  runtimeVersion: '11',
  appSettings: {
    JAVA_OPTS: '-Xmx1024m'
  }
});
```

### PowerShell Functions

```typescript
const powershellFunc = new FunctionApp(stack, 'ps-func', {
  resourceGroupName: resourceGroup.name,
  functionAppName: 'func-powershell-app',
  location: 'eastus',
  runtime: 'powershell',
  runtimeVersion: '7.2'
});
```

## Hosting Plans

### Consumption Plan (Serverless)

Best for: Variable traffic, cost optimization, getting started

```typescript
const consumptionFunc = new FunctionApp(stack, 'consumption-func', {
  resourceGroupName: resourceGroup.name,
  functionAppName: 'func-consumption',
  location: 'eastus',
  hostingPlan: 'Consumption',
  runtime: 'node',
  runtimeVersion: '18'
});
```

**Characteristics:**
- Pay per execution
- Auto-scaling
- 5-minute timeout default (max 10 minutes)
- Cold starts possible

### Premium Plan

Best for: Production workloads, no cold starts, VNet integration

```typescript
const premiumFunc = new FunctionApp(stack, 'premium-func', {
  resourceGroupName: resourceGroup.name,
  functionAppName: 'func-premium',
  location: 'eastus',
  hostingPlan: 'Premium',
  planSku: 'EP1', // Elastic Premium 1
  runtime: 'node',
  runtimeVersion: '18',
  preWarmedInstances: 1,
  maximumElasticWorkerCount: 20
});
```

**Characteristics:**
- No cold starts with pre-warmed instances
- VNet connectivity
- Unlimited execution duration
- More CPU and memory options

### Dedicated Plan (App Service)

Best for: Predictable billing, existing App Service resources

```typescript
import { AppServicePlan } from '@atakora/cdk/web';

// Create App Service Plan first
const appPlan = new AppServicePlan(stack, 'app-plan', {
  resourceGroupName: resourceGroup.name,
  planName: 'plan-dedicated',
  location: 'eastus',
  sku: {
    name: 'S1',
    tier: 'Standard'
  }
});

// Use with Functions App
const dedicatedFunc = new FunctionApp(stack, 'dedicated-func', {
  resourceGroupName: resourceGroup.name,
  functionAppName: 'func-dedicated',
  location: 'eastus',
  serverFarmId: appPlan.id,
  runtime: 'node',
  runtimeVersion: '18',
  alwaysOn: true // Keep warm
});
```

## Storage Architecture

### Automatic Storage Provisioning

Atakora automatically creates and configures storage for Functions Apps:

```typescript
const functionsApp = new FunctionApp(stack, 'func', {
  resourceGroupName: resourceGroup.name,
  functionAppName: 'func-auto-storage',
  location: 'eastus',
  runtime: 'node',
  runtimeVersion: '18'
  // Storage account created automatically!
});

// Access the auto-created storage
console.log('Storage account:', functionsApp.storageAccountName);
console.log('Storage connection:', functionsApp.storageConnectionString);
```

### Custom Storage Account

Use your own storage account:

```typescript
import { StorageAccount } from '@atakora/cdk/storage';

const customStorage = new StorageAccount(stack, 'custom-storage', {
  resourceGroupName: resourceGroup.name,
  accountName: 'stfunctions' + Date.now(),
  location: 'eastus',
  sku: { name: 'Standard_LRS' }
});

const functionsApp = new FunctionApp(stack, 'func', {
  resourceGroupName: resourceGroup.name,
  functionAppName: 'func-custom-storage',
  location: 'eastus',
  runtime: 'node',
  runtimeVersion: '18',
  storageAccountName: customStorage.accountName,
  storageAccountKey: customStorage.primaryAccessKey
});
```

## Environment Configuration

### Application Settings

```typescript
const functionsApp = new FunctionApp(stack, 'func', {
  resourceGroupName: resourceGroup.name,
  functionAppName: 'func-configured',
  location: 'eastus',
  runtime: 'node',
  runtimeVersion: '18',
  appSettings: {
    // Custom settings
    API_ENDPOINT: 'https://api.example.com',
    CACHE_DURATION: '300',
    FEATURE_FLAG: 'enabled',

    // Connection strings
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_CONNECTION: process.env.REDIS_CONNECTION,

    // Azure services
    COSMOS_ENDPOINT: cosmosDb.documentEndpoint,
    STORAGE_CONTAINER: blobContainer.name
  }
});
```

### Using Key Vault for Secrets

```typescript
import { KeyVault, Secret } from '@atakora/cdk/keyvault';

const keyVault = new KeyVault(stack, 'kv', {
  resourceGroupName: resourceGroup.name,
  vaultName: 'kv-functions',
  location: 'eastus'
});

const apiKeySecret = new Secret(stack, 'api-key', {
  resourceGroupName: resourceGroup.name,
  vaultName: keyVault.name,
  secretName: 'api-key',
  value: process.env.SECRET_API_KEY
});

const functionsApp = new FunctionApp(stack, 'func', {
  resourceGroupName: resourceGroup.name,
  functionAppName: 'func-secure',
  location: 'eastus',
  runtime: 'node',
  runtimeVersion: '18',
  identity: {
    type: 'SystemAssigned'
  },
  appSettings: {
    API_KEY: `@Microsoft.KeyVault(SecretUri=${apiKeySecret.secretUri})`
  }
});

// Grant Functions App access to Key Vault
keyVault.grantSecretsRead(functionsApp.identity.principalId);
```

## Networking and Security

### VNet Integration

```typescript
import { VirtualNetwork, Subnet } from '@atakora/cdk/network';

const vnet = new VirtualNetwork(stack, 'vnet', {
  resourceGroupName: resourceGroup.name,
  vnetName: 'vnet-functions',
  location: 'eastus',
  addressSpace: {
    addressPrefixes: ['10.0.0.0/16']
  }
});

const functionSubnet = new Subnet(stack, 'func-subnet', {
  resourceGroupName: resourceGroup.name,
  vnetName: vnet.name,
  subnetName: 'subnet-functions',
  addressPrefix: '10.0.1.0/24',
  delegations: [{
    name: 'delegation',
    serviceName: 'Microsoft.Web/serverFarms'
  }]
});

const secureFunc = new FunctionApp(stack, 'secure-func', {
  resourceGroupName: resourceGroup.name,
  functionAppName: 'func-vnet-integrated',
  location: 'eastus',
  hostingPlan: 'Premium', // VNet requires Premium or Dedicated
  runtime: 'node',
  runtimeVersion: '18',
  vnetSubnetId: functionSubnet.id
});
```

### Private Endpoints

```typescript
const privateFunc = new FunctionApp(stack, 'private-func', {
  resourceGroupName: resourceGroup.name,
  functionAppName: 'func-private',
  location: 'eastus',
  hostingPlan: 'Premium',
  runtime: 'node',
  runtimeVersion: '18',
  publicNetworkAccess: 'Disabled'
});

// Create private endpoint for internal access only
const privateEndpoint = new PrivateEndpoint(stack, 'pe', {
  resourceGroupName: resourceGroup.name,
  privateEndpointName: 'pe-functions',
  location: 'eastus',
  subnet: privateSubnet,
  privateLinkServiceConnections: [{
    name: 'functions',
    privateLinkServiceId: privateFunc.id,
    groupIds: ['sites']
  }]
});
```

## Monitoring and Diagnostics

### Application Insights Integration

```typescript
import { ApplicationInsights } from '@atakora/cdk/insights';

const appInsights = new ApplicationInsights(stack, 'insights', {
  resourceGroupName: resourceGroup.name,
  name: 'ai-functions',
  location: 'eastus',
  applicationType: 'web'
});

const monitoredFunc = new FunctionApp(stack, 'monitored-func', {
  resourceGroupName: resourceGroup.name,
  functionAppName: 'func-monitored',
  location: 'eastus',
  runtime: 'node',
  runtimeVersion: '18',
  appSettings: {
    APPINSIGHTS_INSTRUMENTATIONKEY: appInsights.instrumentationKey,
    APPLICATIONINSIGHTS_CONNECTION_STRING: appInsights.connectionString
  }
});
```

### Diagnostic Settings

```typescript
const diagnosticFunc = new FunctionApp(stack, 'diagnostic-func', {
  resourceGroupName: resourceGroup.name,
  functionAppName: 'func-diagnostic',
  location: 'eastus',
  runtime: 'node',
  runtimeVersion: '18',
  diagnosticSettings: {
    workspaceId: logAnalyticsWorkspace.id,
    logs: [
      { category: 'FunctionAppLogs', enabled: true },
      { category: 'AllMetrics', enabled: true }
    ],
    metrics: [
      { category: 'AllMetrics', enabled: true }
    ]
  }
});
```

## Complete Production Example

```typescript
import { App, Stack } from '@atakora/cdk';
import { ResourceGroup } from '@atakora/cdk/resourcegroup';
import { FunctionApp } from '@atakora/cdk/web';
import { ApplicationInsights } from '@atakora/cdk/insights';
import { KeyVault } from '@atakora/cdk/keyvault';
import { CosmosDBAccount, SqlDatabase, SqlContainer } from '@atakora/cdk/documentdb';

const app = new App();
const stack = new Stack(app, 'production-functions');

// Resource Group
const rg = new ResourceGroup(stack, 'rg', {
  name: 'rg-functions-prod',
  location: 'eastus',
  tags: {
    environment: 'production',
    application: 'api'
  }
});

// Monitoring
const insights = new ApplicationInsights(stack, 'insights', {
  resourceGroupName: rg.name,
  name: 'ai-functions-prod',
  location: rg.location
});

// Secrets Management
const keyVault = new KeyVault(stack, 'kv', {
  resourceGroupName: rg.name,
  vaultName: 'kv-functions-prod',
  location: rg.location
});

// Database
const cosmosDb = new CosmosDBAccount(stack, 'cosmos', {
  resourceGroupName: rg.name,
  accountName: 'cosmos-functions-prod',
  location: rg.location,
  consistencyPolicy: {
    defaultConsistencyLevel: 'Session'
  }
});

const database = new SqlDatabase(stack, 'database', {
  resourceGroupName: rg.name,
  accountName: cosmosDb.name,
  databaseName: 'production'
});

const container = new SqlContainer(stack, 'container', {
  resourceGroupName: rg.name,
  accountName: cosmosDb.name,
  databaseName: database.name,
  containerName: 'data',
  partitionKey: {
    paths: ['/partitionKey'],
    kind: 'Hash'
  }
});

// Functions App - API
const apiFunc = new FunctionApp(stack, 'api-func', {
  resourceGroupName: rg.name,
  functionAppName: 'func-api-prod',
  location: rg.location,
  hostingPlan: 'Premium',
  planSku: 'EP1',
  runtime: 'node',
  runtimeVersion: '18',
  preWarmedInstances: 2,
  identity: {
    type: 'SystemAssigned'
  },
  appSettings: {
    // Monitoring
    APPINSIGHTS_INSTRUMENTATIONKEY: insights.instrumentationKey,

    // Database
    COSMOS_ENDPOINT: cosmosDb.documentEndpoint,
    COSMOS_KEY: cosmosDb.primaryMasterKey,
    COSMOS_DATABASE: database.name,
    COSMOS_CONTAINER: container.name,

    // Configuration
    ENVIRONMENT: 'production',
    LOG_LEVEL: 'info',

    // Secrets from Key Vault
    JWT_SECRET: `@Microsoft.KeyVault(SecretUri=https://${keyVault.name}.vault.azure.net/secrets/jwt-secret)`,
    API_KEY: `@Microsoft.KeyVault(SecretUri=https://${keyVault.name}.vault.azure.net/secrets/api-key)`
  },
  cors: {
    allowedOrigins: ['https://app.example.com'],
    supportCredentials: true
  },
  httpsOnly: true,
  minTlsVersion: '1.2'
});

// Functions App - Background Jobs
const jobsFunc = new FunctionApp(stack, 'jobs-func', {
  resourceGroupName: rg.name,
  functionAppName: 'func-jobs-prod',
  location: rg.location,
  hostingPlan: 'Premium',
  planSku: 'EP1',
  runtime: 'python',
  runtimeVersion: '3.9',
  identity: {
    type: 'SystemAssigned'
  },
  appSettings: {
    APPINSIGHTS_INSTRUMENTATIONKEY: insights.instrumentationKey,
    COSMOS_ENDPOINT: cosmosDb.documentEndpoint,
    COSMOS_KEY: cosmosDb.primaryMasterKey,
    SCHEDULE_CLEANUP: '0 0 2 * * *', // 2 AM daily
    SCHEDULE_REPORTS: '0 0 8 * * MON' // 8 AM Mondays
  }
});

// Grant Key Vault access
keyVault.grantSecretsRead(apiFunc.identity.principalId);

// Outputs
stack.addOutput('APIEndpoint', `https://${apiFunc.defaultHostName}`);
stack.addOutput('JobsEndpoint', `https://${jobsFunc.defaultHostName}`);
stack.addOutput('MonitoringDashboard', `https://portal.azure.com/#resource${insights.id}/overview`);

app.synth();
```

## Deployment

```bash
# Deploy the Functions App infrastructure
atakora deploy

# Deploy function code (using Azure Functions Core Tools)
cd ./functions
func azure functionapp publish func-api-prod

# Or using ZIP deployment
az functionapp deployment source config-zip \
  --resource-group rg-functions-prod \
  --name func-api-prod \
  --src functions.zip
```

## Testing Your Functions

### Local Development

```bash
# Install Azure Functions Core Tools
npm install -g azure-functions-core-tools@4

# Run functions locally
func start

# Test locally
curl http://localhost:7071/api/health
```

### Remote Testing

```bash
# Get function URL with key
az functionapp function show \
  --resource-group rg-functions-prod \
  --name func-api-prod \
  --function-name HealthCheck \
  --query invokeUrlTemplate

# Test the deployed function
curl https://func-api-prod.azurewebsites.net/api/health?code=<function-key>
```

## Best Practices

### 1. Use Appropriate Hosting Plans

- **Development**: Consumption plan for cost savings
- **Production API**: Premium plan for consistent performance
- **Background Jobs**: Consumption or Dedicated based on frequency

### 2. Implement Health Checks

```typescript
// health.ts
export async function healthCheck(context, req) {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0',
    checks: {
      database: await checkDatabase(),
      storage: await checkStorage()
    }
  };

  context.res = {
    status: 200,
    body: health
  };
}
```

### 3. Structure Function Projects

```
functions/
├── host.json           # Global configuration
├── local.settings.json # Local development settings
├── package.json        # Dependencies
├── api/               # HTTP triggered functions
│   ├── health/
│   ├── users/
│   └── orders/
├── jobs/              # Timer triggered functions
│   ├── cleanup/
│   └── reports/
└── shared/            # Shared code
    ├── database.ts
    └── auth.ts
```

### 4. Handle Secrets Properly

- Never commit secrets to source control
- Use Key Vault references in production
- Use local.settings.json for local development (git-ignored)

### 5. Implement Retry Logic

```typescript
const retryOptions = {
  maxRetries: 3,
  delayMs: 1000,
  maxDelayMs: 5000
};

functionsApp.setRetryPolicy('ServiceBusQueueTrigger', retryOptions);
```

## Troubleshooting

### Function Not Triggering

1. Check Application Insights for errors
2. Verify trigger configuration in function.json
3. Check connection strings and permissions
4. Review function app logs: `az functionapp log tail --name func-name --resource-group rg-name`

### Cold Start Issues

- Use Premium plan with pre-warmed instances
- Implement warmup triggers
- Optimize function initialization code
- Use Application Insights to measure cold start duration

### Storage Issues

- Verify storage account exists and is accessible
- Check firewall rules on storage account
- Ensure connection string is correct
- Verify storage account is in same region (for performance)

## Next Steps

You've mastered Azure Functions Apps! Continue with:

- **[Next Steps](./05-Next-Steps.md)** - Advanced patterns and workflows
- **[Functions Examples](../examples/Basic-Functions.md)** - More function patterns
- **[API Examples](../examples/REST-API.md)** - Building complete APIs

---

**Need help?** Check [Functions Troubleshooting](../troubleshooting/Functions-Issues.md) or browse [all guides](../guides/README.md)