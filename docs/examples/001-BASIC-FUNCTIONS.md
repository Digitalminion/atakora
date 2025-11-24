# Basic Azure Functions Examples

[Home](../README.md) > [Examples](./README.md) > Basic Functions

Complete, working examples for Azure Functions Apps covering common scenarios.

## Overview

These examples demonstrate how to create and configure Azure Functions Apps using Atakora. Each example includes automatic storage provisioning and best practices.

## Prerequisites

```bash
# Install Atakora CLI
npm install -g @atakora/cli

# Verify installation
atakora --version
```

## Example 1: Simple HTTP API

Create a basic Functions App for REST API endpoints.

### Code

```typescript
import { App, Stack } from '@atakora/cdk';
import { ResourceGroup } from '@atakora/cdk/resourcegroup';
import { FunctionApp } from '@atakora/cdk/web';

const app = new App();
const stack = new Stack(app, 'api-stack');

// Create resource group
const resourceGroup = new ResourceGroup(stack, 'rg', {
  name: 'rg-api-functions-dev',
  location: 'eastus',
  tags: {
    environment: 'development',
    project: 'api'
  }
});

// Create Functions App with automatic storage
const apiFunc = new FunctionApp(stack, 'api-func', {
  resourceGroupName: resourceGroup.name,
  functionAppName: 'func-api-dev-' + Date.now(),
  location: 'eastus',
  runtime: 'node',
  runtimeVersion: '18',
  appSettings: {
    NODE_ENV: 'development',
    LOG_LEVEL: 'debug',
    API_VERSION: '1.0.0'
  }
});

// Output the function URL
stack.addOutput('FunctionAppUrl', `https://${apiFunc.defaultHostName}`);
stack.addOutput('StorageAccount', apiFunc.storageAccountName);

app.synth();
```

### Deployment

```bash
# Deploy the infrastructure
atakora deploy

# Deploy function code (example)
func azure functionapp publish <function-app-name>
```

### Cost Estimate
- Consumption plan: ~$0 (pay per execution)
- Storage: ~$0.10/month

## Example 2: Scheduled Background Jobs

Functions App for scheduled tasks and background processing.

### Code

```typescript
import { App, Stack } from '@atakora/cdk';
import { ResourceGroup } from '@atakora/cdk/resourcegroup';
import { FunctionApp } from '@atakora/cdk/web';
import { ApplicationInsights } from '@atakora/cdk/insights';

const app = new App();
const stack = new Stack(app, 'jobs-stack');

const resourceGroup = new ResourceGroup(stack, 'rg', {
  name: 'rg-jobs-functions-prod',
  location: 'eastus'
});

// Add monitoring
const insights = new ApplicationInsights(stack, 'insights', {
  resourceGroupName: resourceGroup.name,
  name: 'ai-jobs-functions',
  location: 'eastus',
  applicationType: 'web'
});

// Create Functions App for background jobs
const jobsFunc = new FunctionApp(stack, 'jobs-func', {
  resourceGroupName: resourceGroup.name,
  functionAppName: 'func-jobs-prod-' + Date.now(),
  location: 'eastus',
  runtime: 'python',
  runtimeVersion: '3.9',
  appSettings: {
    // Monitoring
    APPINSIGHTS_INSTRUMENTATIONKEY: insights.instrumentationKey,

    // Job schedules (cron expressions)
    CLEANUP_SCHEDULE: '0 0 2 * * *',        // 2 AM daily
    REPORT_SCHEDULE: '0 0 8 * * MON',       // 8 AM Mondays
    BACKUP_SCHEDULE: '0 0 */6 * * *',       // Every 6 hours

    // Job configuration
    RETENTION_DAYS: '30',
    BATCH_SIZE: '100',
    MAX_RETRIES: '3'
  }
});

stack.addOutput('FunctionAppName', jobsFunc.functionAppName);
stack.addOutput('MonitoringDashboard', `https://portal.azure.com/#resource${insights.id}/overview`);

app.synth();
```

### Sample Timer Function

```python
# cleanup/__init__.py
import datetime
import logging
import azure.functions as func

def main(mytimer: func.TimerRequest) -> None:
    utc_timestamp = datetime.datetime.utcnow().replace(
        tzinfo=datetime.timezone.utc).isoformat()

    if mytimer.past_due:
        logging.info('The timer is past due!')

    logging.info('Python timer trigger function ran at %s', utc_timestamp)

    # Your cleanup logic here
    cleanup_old_data()

def cleanup_old_data():
    # Implementation
    pass
```

### Cost Estimate
- Consumption plan: ~$5-10/month (depending on executions)
- Application Insights: ~$2/month

## Example 3: Premium Functions with VNet Integration

Production-grade Functions App with network security.

### Code

```typescript
import { App, Stack } from '@atakora/cdk';
import { ResourceGroup } from '@atakora/cdk/resourcegroup';
import { FunctionApp, AppServicePlan } from '@atakora/cdk/web';
import { VirtualNetwork, Subnet } from '@atakora/cdk/network';
import { StorageAccount } from '@atakora/cdk/storage';

const app = new App();
const stack = new Stack(app, 'secure-functions-stack');

const resourceGroup = new ResourceGroup(stack, 'rg', {
  name: 'rg-secure-functions-prod',
  location: 'eastus'
});

// Create VNet for network isolation
const vnet = new VirtualNetwork(stack, 'vnet', {
  resourceGroupName: resourceGroup.name,
  vnetName: 'vnet-functions-prod',
  location: 'eastus',
  addressSpace: {
    addressPrefixes: ['10.0.0.0/16']
  }
});

// Subnet for Functions
const functionSubnet = new Subnet(stack, 'function-subnet', {
  resourceGroupName: resourceGroup.name,
  vnetName: vnet.name,
  subnetName: 'snet-functions',
  addressPrefix: '10.0.1.0/24',
  delegations: [{
    name: 'functionDelegation',
    serviceName: 'Microsoft.Web/serverFarms'
  }]
});

// Premium App Service Plan
const premiumPlan = new AppServicePlan(stack, 'premium-plan', {
  resourceGroupName: resourceGroup.name,
  planName: 'plan-functions-premium',
  location: 'eastus',
  sku: {
    name: 'EP1',
    tier: 'ElasticPremium',
    size: 'EP1',
    family: 'EP',
    capacity: 1
  },
  kind: 'elastic',
  maximumElasticWorkerCount: 20
});

// Custom storage with network restrictions
const secureStorage = new StorageAccount(stack, 'secure-storage', {
  resourceGroupName: resourceGroup.name,
  accountName: 'stsecure' + Date.now(),
  location: 'eastus',
  sku: {
    name: 'Standard_LRS'
  },
  kind: 'StorageV2',
  minimumTlsVersion: 'TLS1_2',
  supportsHttpsTrafficOnly: true,
  networkAcls: {
    defaultAction: 'Deny',
    virtualNetworkRules: [{
      virtualNetworkResourceId: `${vnet.id}/subnets/${functionSubnet.name}`,
      action: 'Allow'
    }]
  }
});

// Premium Functions App with VNet integration
const secureFunc = new FunctionApp(stack, 'secure-func', {
  resourceGroupName: resourceGroup.name,
  functionAppName: 'func-secure-prod-' + Date.now(),
  location: 'eastus',
  serverFarmId: premiumPlan.id,
  storageAccountName: secureStorage.accountName,
  storageAccountAccessKey: secureStorage.primaryAccessKey,
  runtime: 'dotnet',
  runtimeVersion: '6',
  siteConfig: {
    vnetRouteAllEnabled: true,
    alwaysOn: true,
    preWarmedInstanceCount: 1,
    ftpsState: 'Disabled',
    minTlsVersion: '1.2',
    http20Enabled: true
  },
  httpsOnly: true,
  virtualNetworkSubnetId: functionSubnet.id,
  identity: {
    type: 'SystemAssigned'
  },
  appSettings: {
    FUNCTIONS_WORKER_RUNTIME: 'dotnet-isolated',
    WEBSITE_CONTENTOVERVNET: '1',
    WEBSITE_DNS_SERVER: '168.63.129.16'
  }
});

stack.addOutput('FunctionAppUrl', `https://${secureFunc.defaultHostName}`);
stack.addOutput('VNetName', vnet.name);
stack.addOutput('PlanName', premiumPlan.name);

app.synth();
```

### Cost Estimate
- Premium Plan (EP1): ~$150/month
- VNet: ~$5/month
- Storage: ~$5/month
- Total: ~$160/month

## Example 4: Multi-Language Functions in One App

Functions App supporting multiple runtimes through custom handlers.

### Code

```typescript
import { App, Stack } from '@atakora/cdk';
import { ResourceGroup } from '@atakora/cdk/resourcegroup';
import { FunctionApp } from '@atakora/cdk/web';
import { CosmosDBAccount, SqlDatabase, SqlContainer } from '@atakora/cdk/documentdb';

const app = new App();
const stack = new Stack(app, 'multi-runtime-stack');

const resourceGroup = new ResourceGroup(stack, 'rg', {
  name: 'rg-multi-functions-dev',
  location: 'eastus'
});

// Shared database for all functions
const cosmos = new CosmosDBAccount(stack, 'cosmos', {
  resourceGroupName: resourceGroup.name,
  accountName: 'cosmos-functions-' + Date.now(),
  location: 'eastus',
  consistencyPolicy: {
    defaultConsistencyLevel: 'Session'
  },
  capabilities: [
    { name: 'EnableServerless' }
  ]
});

const database = new SqlDatabase(stack, 'database', {
  resourceGroupName: resourceGroup.name,
  accountName: cosmos.name,
  databaseName: 'functionsdb'
});

const container = new SqlContainer(stack, 'container', {
  resourceGroupName: resourceGroup.name,
  accountName: cosmos.name,
  databaseName: database.name,
  containerName: 'data',
  partitionKey: {
    paths: ['/id'],
    kind: 'Hash'
  }
});

// Node.js Functions App
const nodeFunc = new FunctionApp(stack, 'node-func', {
  resourceGroupName: resourceGroup.name,
  functionAppName: 'func-node-dev-' + Date.now(),
  location: 'eastus',
  runtime: 'node',
  runtimeVersion: '18',
  appSettings: {
    COSMOS_ENDPOINT: cosmos.documentEndpoint,
    COSMOS_KEY: cosmos.primaryMasterKey,
    COSMOS_DATABASE: database.name,
    COSMOS_CONTAINER: container.name,
    FUNCTION_TYPE: 'nodejs'
  }
});

// Python Functions App
const pythonFunc = new FunctionApp(stack, 'python-func', {
  resourceGroupName: resourceGroup.name,
  functionAppName: 'func-python-dev-' + Date.now(),
  location: 'eastus',
  runtime: 'python',
  runtimeVersion: '3.9',
  appSettings: {
    COSMOS_ENDPOINT: cosmos.documentEndpoint,
    COSMOS_KEY: cosmos.primaryMasterKey,
    COSMOS_DATABASE: database.name,
    COSMOS_CONTAINER: container.name,
    FUNCTION_TYPE: 'python'
  }
});

// .NET Functions App
const dotnetFunc = new FunctionApp(stack, 'dotnet-func', {
  resourceGroupName: resourceGroup.name,
  functionAppName: 'func-dotnet-dev-' + Date.now(),
  location: 'eastus',
  runtime: 'dotnet',
  runtimeVersion: '6',
  appSettings: {
    COSMOS_ENDPOINT: cosmos.documentEndpoint,
    COSMOS_KEY: cosmos.primaryMasterKey,
    COSMOS_DATABASE: database.name,
    COSMOS_CONTAINER: container.name,
    FUNCTION_TYPE: 'dotnet'
  }
});

stack.addOutput('NodeFunctionUrl', `https://${nodeFunc.defaultHostName}`);
stack.addOutput('PythonFunctionUrl', `https://${pythonFunc.defaultHostName}`);
stack.addOutput('DotNetFunctionUrl', `https://${dotnetFunc.defaultHostName}`);
stack.addOutput('CosmosEndpoint', cosmos.documentEndpoint);

app.synth();
```

### Cost Estimate
- 3x Consumption Functions: ~$0 (pay per use)
- Cosmos DB Serverless: ~$0.25 per million RUs
- Storage (3 accounts): ~$0.30/month

## Example 5: Event-Driven Processing

Functions triggered by Azure services.

### Code

```typescript
import { App, Stack } from '@atakora/cdk';
import { ResourceGroup } from '@atakora/cdk/resourcegroup';
import { FunctionApp } from '@atakora/cdk/web';
import { StorageAccount, BlobContainer, Queue } from '@atakora/cdk/storage';
import { ServiceBusNamespace, ServiceBusQueue, ServiceBusTopic } from '@atakora/cdk/servicebus';
import { EventHubNamespace, EventHub } from '@atakora/cdk/eventhub';

const app = new App();
const stack = new Stack(app, 'event-driven-stack');

const resourceGroup = new ResourceGroup(stack, 'rg', {
  name: 'rg-events-prod',
  location: 'eastus'
});

// Storage triggers
const eventStorage = new StorageAccount(stack, 'event-storage', {
  resourceGroupName: resourceGroup.name,
  accountName: 'stevents' + Date.now(),
  location: 'eastus',
  sku: { name: 'Standard_LRS' }
});

const inputContainer = new BlobContainer(stack, 'input', {
  resourceGroupName: resourceGroup.name,
  storageAccountName: eventStorage.accountName,
  containerName: 'input-files'
});

const processQueue = new Queue(stack, 'process-queue', {
  resourceGroupName: resourceGroup.name,
  storageAccountName: eventStorage.accountName,
  queueName: 'processing-queue'
});

// Service Bus for messaging
const serviceBus = new ServiceBusNamespace(stack, 'servicebus', {
  resourceGroupName: resourceGroup.name,
  namespaceName: 'sb-events-' + Date.now(),
  location: 'eastus',
  sku: {
    name: 'Standard',
    tier: 'Standard'
  }
});

const ordersQueue = new ServiceBusQueue(stack, 'orders-queue', {
  resourceGroupName: resourceGroup.name,
  namespaceName: serviceBus.name,
  queueName: 'orders',
  maxDeliveryCount: 5,
  defaultMessageTimeToLive: 'PT1H'
});

const eventsTopic = new ServiceBusTopic(stack, 'events-topic', {
  resourceGroupName: resourceGroup.name,
  namespaceName: serviceBus.name,
  topicName: 'events',
  defaultMessageTimeToLive: 'PT30M'
});

// Event Hub for streaming
const eventHub = new EventHubNamespace(stack, 'eventhub', {
  resourceGroupName: resourceGroup.name,
  namespaceName: 'eh-events-' + Date.now(),
  location: 'eastus',
  sku: {
    name: 'Standard',
    tier: 'Standard',
    capacity: 1
  }
});

const telemetryHub = new EventHub(stack, 'telemetry', {
  resourceGroupName: resourceGroup.name,
  namespaceName: eventHub.name,
  eventHubName: 'telemetry',
  partitionCount: 4,
  messageRetentionInDays: 1
});

// Event-driven Functions App
const eventFunc = new FunctionApp(stack, 'event-func', {
  resourceGroupName: resourceGroup.name,
  functionAppName: 'func-events-prod-' + Date.now(),
  location: 'eastus',
  runtime: 'node',
  runtimeVersion: '18',
  appSettings: {
    // Storage connections
    STORAGE_CONNECTION_STRING: eventStorage.primaryConnectionString,
    INPUT_CONTAINER: inputContainer.name,
    PROCESS_QUEUE: processQueue.name,

    // Service Bus connection
    SERVICEBUS_CONNECTION_STRING: serviceBus.defaultPrimaryConnectionString,
    ORDERS_QUEUE: ordersQueue.name,
    EVENTS_TOPIC: eventsTopic.name,

    // Event Hub connection
    EVENTHUB_CONNECTION_STRING: eventHub.defaultPrimaryConnectionString,
    TELEMETRY_HUB: telemetryHub.name,

    // Processing configuration
    BATCH_SIZE: '10',
    MAX_WAIT_TIME: '60',
    RETRY_COUNT: '3'
  }
});

stack.addOutput('FunctionAppName', eventFunc.functionAppName);
stack.addOutput('StorageAccount', eventStorage.accountName);
stack.addOutput('ServiceBusNamespace', serviceBus.name);
stack.addOutput('EventHubNamespace', eventHub.name);

app.synth();
```

### Sample Trigger Functions

```javascript
// Blob trigger
module.exports = async function (context, myBlob) {
    context.log(`Processing blob: ${context.bindingData.name}, Size: ${myBlob.length}`);
    // Process the blob
};

// Queue trigger
module.exports = async function (context, myQueueItem) {
    context.log('Processing queue message:', myQueueItem);
    // Process the message
};

// Service Bus trigger
module.exports = async function (context, mySbMsg) {
    context.log('Processing Service Bus message:', mySbMsg);
    // Process the message
};

// Event Hub trigger
module.exports = async function (context, eventHubMessages) {
    context.log(`Processing ${eventHubMessages.length} events`);
    eventHubMessages.forEach(message => {
        // Process each event
    });
};
```

### Cost Estimate
- Functions (Consumption): ~$10/month
- Storage: ~$5/month
- Service Bus: ~$10/month
- Event Hub: ~$25/month
- Total: ~$50/month

## Testing Your Functions

### Local Testing

```bash
# Install Azure Functions Core Tools
npm install -g azure-functions-core-tools@4

# Create a new function project
func init MyFunctionApp --typescript

# Add a new function
func new --name HttpExample --template "HTTP trigger"

# Run locally
func start

# Test locally
curl http://localhost:7071/api/HttpExample
```

### Integration Testing

```typescript
// test-function.ts
import axios from 'axios';

async function testFunction() {
  const functionUrl = process.env.FUNCTION_URL;
  const functionKey = process.env.FUNCTION_KEY;

  const response = await axios.get(`${functionUrl}/api/health`, {
    headers: {
      'x-functions-key': functionKey
    }
  });

  console.log('Response:', response.data);
}

testFunction();
```

## Best Practices

### 1. Use Application Settings

```typescript
const functionApp = new FunctionApp(stack, 'func', {
  // ...
  appSettings: {
    // Environment-specific settings
    API_ENDPOINT: process.env.API_ENDPOINT,
    DATABASE_URL: process.env.DATABASE_URL,

    // Feature flags
    FEATURE_NEW_API: 'enabled',

    // Performance tuning
    FUNCTIONS_WORKER_PROCESS_COUNT: '4',
    WEBSITE_MAX_DYNAMIC_APPLICATION_SCALE_OUT: '10'
  }
});
```

### 2. Enable Monitoring

```typescript
import { ApplicationInsights } from '@atakora/cdk/insights';

const insights = new ApplicationInsights(stack, 'insights', {
  resourceGroupName: resourceGroup.name,
  name: 'ai-functions',
  location: 'eastus'
});

const functionApp = new FunctionApp(stack, 'func', {
  // ...
  appSettings: {
    APPINSIGHTS_INSTRUMENTATIONKEY: insights.instrumentationKey,
    APPLICATIONINSIGHTS_CONNECTION_STRING: insights.connectionString
  }
});
```

### 3. Implement Health Checks

```javascript
// health/index.js
module.exports = async function (context, req) {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: await checkDatabase(),
      storage: await checkStorage(),
      dependencies: await checkDependencies()
    }
  };

  context.res = {
    status: 200,
    body: health
  };
};
```

### 4. Use Managed Identity

```typescript
const functionApp = new FunctionApp(stack, 'func', {
  // ...
  identity: {
    type: 'SystemAssigned'
  }
});

// Grant permissions to other resources
storage.grantBlobDataContributor(functionApp.identity.principalId);
keyVault.grantSecretsRead(functionApp.identity.principalId);
```

## Clean Up

```bash
# Remove all resources
atakora destroy

# Verify deletion
az group exists --name rg-api-functions-dev
```

## Variations

### Using Docker Containers

```typescript
const containerFunc = new FunctionApp(stack, 'container-func', {
  resourceGroupName: resourceGroup.name,
  functionAppName: 'func-container',
  location: 'eastus',
  kind: 'functionapp,linux,container',
  siteConfig: {
    linuxFxVersion: 'DOCKER|myregistry.azurecr.io/myfunction:latest'
  }
});
```

### Durable Functions

```typescript
const durableFunc = new FunctionApp(stack, 'durable-func', {
  resourceGroupName: resourceGroup.name,
  functionAppName: 'func-durable',
  location: 'eastus',
  runtime: 'node',
  runtimeVersion: '18',
  appSettings: {
    'AzureWebJobsStorage': storage.primaryConnectionString,
    'FUNCTIONS_WORKER_RUNTIME': 'node',
    'WEBSITE_NODE_DEFAULT_VERSION': '~18',
    'DurableFunctionsHubStorage': durableStorage.primaryConnectionString
  }
});
```

## Next Steps

- Explore [REST API Examples](./REST-API.md) for API Management integration
- Review [Microservices Examples](./Microservices.md) for distributed architectures
- Check [Advanced Patterns](../guides/patterns/README.md) for production best practices

---

**Need help?** See [Functions Troubleshooting](../troubleshooting/Functions-Issues.md) or [Common Issues](../troubleshooting/Common-Issues.md)