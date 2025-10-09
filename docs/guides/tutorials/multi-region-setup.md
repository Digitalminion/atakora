# Tutorial: Multi-Region Setup

[Getting Started](../../getting-started/README.md) > [Guides](../README.md) > [Tutorials](./README.md) > Multi-Region Setup

Build a globally distributed application with active-active deployment across multiple Azure regions, including Traffic Manager for load distribution and Azure Front Door for content delivery.

## What You'll Build

A multi-region infrastructure with:

- **Three Azure regions** (East US 2, West US 2, Central US)
- **Traffic Manager** for global load balancing
- **Azure Front Door** for CDN and WAF
- **Cosmos DB** with multi-region writes
- **Regional App Services** with auto-scaling
- **Shared monitoring** with Log Analytics workspace
- **Cross-region replication** for storage and databases

## Architecture

```
                    ┌─────────────────┐
                    │  Traffic Manager │
                    │  (Global LB)     │
                    └────────┬─────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
      ┌─────▼─────┐    ┌─────▼─────┐   ┌─────▼─────┐
      │  East US 2 │    │  West US 2 │   │Central US │
      │            │    │            │   │           │
      │ App Service│    │ App Service│   │App Service│
      │  Storage   │    │  Storage   │   │ Storage   │
      │            │    │            │   │           │
      └────────────┘    └────────────┘   └───────────┘
            │                │                │
            └────────────────┼────────────────┘
                             │
                    ┌────────▼─────────┐
                    │   Cosmos DB      │
                    │ (Multi-Region)   │
                    │ Replication      │
                    └──────────────────┘
```

## Prerequisites

- **Atakora CLI** installed
- **Azure subscription** with access to multiple regions
- **Understanding** of global distribution patterns
- **Traffic Manager** knowledge helpful

## Step 1: Define Multi-Region Configuration

Create configuration for each region:

```typescript
// config.ts
export interface RegionConfig {
  name: string;
  location: string;
  priority: number; // For Traffic Manager
  storageReplication: string;
  appServiceSku: string;
}

export const regions: RegionConfig[] = [
  {
    name: 'primary',
    location: 'eastus2',
    priority: 1,
    storageReplication: 'GRS',
    appServiceSku: 'P1v3',
  },
  {
    name: 'secondary',
    location: 'westus2',
    priority: 2,
    storageReplication: 'GRS',
    appServiceSku: 'P1v3',
  },
  {
    name: 'tertiary',
    location: 'centralus',
    priority: 3,
    storageReplication: 'LRS',
    appServiceSku: 'S1',
  },
];

export const globalConfig = {
  organization: 'Contoso',
  project: 'GlobalApp',
  environment: process.env.ENVIRONMENT || 'prod',

  // Global resources
  trafficManagerDns: 'globalapp-contoso',
  cosmosDbName: 'globalapp-cosmos',

  // Monitoring
  logAnalyticsWorkspace: 'law-globalapp',
};
```

## Step 2: Create Infrastructure Code

```typescript
// main.ts
import { AzureApp, ResourceGroupStack, Output } from '@atakora/lib';
import { regions, globalConfig } from './config';
import {
  VirtualNetworks,
  Subnets,
  TrafficManagerProfiles,
  TrafficManagerEndpoints,
} from '@atakora/cdk/network';
import {
  StorageAccounts,
  BlobServices,
} from '@atakora/cdk/storage';
import {
  ServerFarms,
  Sites,
} from '@atakora/cdk/web';
import {
  DatabaseAccounts as CosmosAccounts,
  SqlDatabases as CosmosDatabases,
} from '@atakora/cdk/cosmos';
import {
  Workspaces as LogAnalyticsWorkspaces,
  Components as AppInsights,
} from '@atakora/cdk/insights';
import {
  Profiles as FrontDoorProfiles,
  AFDEndpoints,
  OriginGroups,
  Origins,
  Routes,
} from '@atakora/cdk/cdn';

const app = new AzureApp({
  organization: globalConfig.organization,
  project: globalConfig.project,
});

// Global resource group for shared resources
const globalStack = new ResourceGroupStack(app, 'Global', {
  resourceGroupName: `rg-${globalConfig.project.toLowerCase()}-global`,
  location: 'eastus2', // Primary region for global resources
  tags: {
    environment: globalConfig.environment,
    scope: 'global',
  },
});

// Shared Log Analytics Workspace
const logAnalytics = new LogAnalyticsWorkspaces(globalStack, 'LogAnalytics', {
  workspaceName: globalConfig.logAnalyticsWorkspace,
  sku: {
    name: 'PerGB2018',
  },
  retentionInDays: 90,
});

// Cosmos DB with multi-region writes
const cosmosDb = new CosmosAccounts(globalStack, 'CosmosDb', {
  databaseAccountName: globalConfig.cosmosDbName,
  databaseAccountOfferType: 'Standard',
  enableMultipleWriteLocations: true,
  enableAutomaticFailover: true,
  consistencyPolicy: {
    defaultConsistencyLevel: 'Session',
    maxIntervalInSeconds: 5,
    maxStalenessPrefix: 100,
  },
  locations: regions.map((region, index) => ({
    locationName: region.location,
    failoverPriority: index,
    isZoneRedundant: region.name === 'primary',
  })),
});

// Cosmos SQL Database
const cosmosDatabase = new CosmosDatabases(cosmosDb, 'AppDatabase', {
  databaseName: 'appdb',
  options: {
    throughput: 400,
  },
});

// Traffic Manager Profile
const trafficManager = new TrafficManagerProfiles(globalStack, 'TrafficManager', {
  profileName: `tm-${globalConfig.project.toLowerCase()}`,
  trafficRoutingMethod: 'Performance', // Route to closest region
  dnsConfig: {
    relativeName: globalConfig.trafficManagerDns,
    ttl: 60,
  },
  monitorConfig: {
    protocol: 'HTTPS',
    port: 443,
    path: '/health',
    intervalInSeconds: 30,
    toleratedNumberOfFailures: 3,
    timeoutInSeconds: 10,
  },
});

// Azure Front Door Profile
const frontDoor = new FrontDoorProfiles(globalStack, 'FrontDoor', {
  profileName: `fd-${globalConfig.project.toLowerCase()}`,
  sku: {
    name: 'Premium_AzureFrontDoor',
  },
});

const frontDoorEndpoint = new AFDEndpoints(frontDoor, 'Endpoint', {
  endpointName: 'globalapp',
  enabledState: 'Enabled',
});

// Regional stacks and resources
const regionalResources: Array<{
  region: RegionConfig;
  stack: ResourceGroupStack;
  webApp: Sites;
  storage: StorageAccounts;
}> = [];

regions.forEach((region, index) => {
  // Regional resource group
  const regionalStack = new ResourceGroupStack(app, region.name, {
    resourceGroupName: `rg-${globalConfig.project.toLowerCase()}-${region.location}`,
    location: region.location,
    tags: {
      environment: globalConfig.environment,
      region: region.name,
      priority: region.priority.toString(),
    },
  });

  // Regional VNet
  const vnet = new VirtualNetworks(regionalStack, 'VNet', {
    virtualNetworkName: `vnet-${region.location}`,
    addressSpace: {
      addressPrefixes: [`10.${index}.0.0/16`],
    },
  });

  const appSubnet = new Subnets(vnet, 'AppSubnet', {
    subnetName: 'snet-app',
    addressPrefix: `10.${index}.1.0/24`,
    delegations: [
      {
        name: 'appservice-delegation',
        properties: {
          serviceName: 'Microsoft.Web/serverFarms',
        },
      },
    ],
  });

  // Regional storage with geo-replication
  const storage = new StorageAccounts(regionalStack, 'Storage', {
    storageAccountName: `st${globalConfig.project.toLowerCase()}${region.location.replace(/[^a-z0-9]/g, '')}`,
    sku: {
      name: region.storageReplication,
    },
    kind: 'StorageV2',
    enableHttpsTrafficOnly: true,
    minimumTlsVersion: 'TLS1_2',
  });

  // Regional App Insights
  const appInsights = new AppInsights(regionalStack, 'AppInsights', {
    componentName: `ai-${region.location}`,
    applicationType: 'web',
    workspaceResourceId: logAnalytics.id, // Shared workspace
  });

  // Regional App Service Plan
  const appServicePlan = new ServerFarms(regionalStack, 'AppServicePlan', {
    serverFarmName: `asp-${region.location}`,
    sku: {
      name: region.appServiceSku,
      tier: region.appServiceSku.startsWith('P') ? 'PremiumV3' : 'Standard',
      capacity: region.name === 'primary' ? 3 : 2,
    },
    kind: 'linux',
    reserved: true,
  });

  // Regional Web App
  const webApp = new Sites(regionalStack, 'WebApp', {
    siteName: `webapp-${globalConfig.project.toLowerCase()}-${region.location}`,
    serverFarmId: appServicePlan.id,
    httpsOnly: true,
    clientAffinityEnabled: false,

    siteConfig: {
      linuxFxVersion: 'NODE|18-lts',
      alwaysOn: true,
      http20Enabled: true,
      minTlsVersion: '1.2',

      appSettings: [
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION',
          value: '~18',
        },
        {
          name: 'NODE_ENV',
          value: 'production',
        },
        {
          name: 'AZURE_REGION',
          value: region.location,
        },
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING',
          value: appInsights.connectionString,
        },
        {
          name: 'COSMOS_ENDPOINT',
          value: cosmosDb.documentEndpoint,
        },
        {
          name: 'STORAGE_CONNECTION_STRING',
          value: storage.primaryConnectionString,
        },
      ],
    },

    virtualNetworkSubnetId: appSubnet.id,

    identity: {
      type: 'SystemAssigned',
    },
  });

  // Traffic Manager endpoint for this region
  new TrafficManagerEndpoints(trafficManager, `Endpoint-${region.name}`, {
    endpointName: region.location,
    type: 'AzureEndpoints',
    targetResourceId: webApp.id,
    endpointStatus: 'Enabled',
    weight: region.name === 'primary' ? 100 : 50,
    priority: region.priority,
  });

  // Store regional resources
  regionalResources.push({
    region,
    stack: regionalStack,
    webApp,
    storage,
  });

  // Regional outputs
  new Output(regionalStack, 'WebAppUrl', {
    value: `https://${webApp.siteName}.azurewebsites.net`,
    description: `Web app URL for ${region.location}`,
  });

  new Output(regionalStack, 'StorageAccountName', {
    value: storage.storageAccountName,
    description: `Storage account for ${region.location}`,
  });
});

// Azure Front Door Origin Group
const originGroup = new OriginGroups(frontDoor, 'OriginGroup', {
  originGroupName: 'webapp-origins',
  loadBalancingSettings: {
    sampleSize: 4,
    successfulSamplesRequired: 3,
    additionalLatencyInMilliseconds: 50,
  },
  healthProbeSettings: {
    probePath: '/health',
    probeRequestType: 'GET',
    probeProtocol: 'Https',
    probeIntervalInSeconds: 30,
  },
});

// Add each region as Front Door origin
regionalResources.forEach(({ region, webApp }) => {
  new Origins(originGroup, `Origin-${region.name}`, {
    originName: region.location,
    hostName: `${webApp.siteName}.azurewebsites.net`,
    httpPort: 80,
    httpsPort: 443,
    originHostHeader: `${webApp.siteName}.azurewebsites.net`,
    priority: region.priority,
    weight: region.name === 'primary' ? 1000 : 500,
    enabledState: 'Enabled',
  });
});

// Front Door Route
new Routes(frontDoorEndpoint, 'DefaultRoute', {
  routeName: 'default-route',
  originGroupId: originGroup.id,
  supportedProtocols: ['Https'],
  patternsToMatch: ['/*'],
  forwardingProtocol: 'HttpsOnly',
  httpsRedirect: 'Enabled',
});

// Global outputs
new Output(globalStack, 'TrafficManagerUrl', {
  value: `http://${globalConfig.trafficManagerDns}.trafficmanager.net`,
  description: 'Global Traffic Manager URL',
});

new Output(globalStack, 'FrontDoorUrl', {
  value: `https://globalapp-${frontDoor.profileName}.azurefd.net`,
  description: 'Azure Front Door URL',
});

new Output(globalStack, 'CosmosDbEndpoint', {
  value: cosmosDb.documentEndpoint,
  description: 'Cosmos DB endpoint',
});

// Synthesize
app.synth();
```

## Step 3: Deploy Multi-Region Infrastructure

Deploy in stages to manage dependencies:

```bash
# Stage 1: Deploy global resources
atakora deploy Global

# Stage 2: Deploy regional resources (can be parallel)
atakora deploy primary &
atakora deploy secondary &
atakora deploy tertiary &
wait

# Verify deployments
atakora diff --all
```

**Deployment time**: 30-45 minutes for all regions

## Step 4: Configure Cosmos DB RBAC

Grant web apps access to Cosmos DB:

```bash
# For each region's web app
for REGION in eastus2 westus2 centralus; do
  WEBAPP_IDENTITY=$(az webapp show \
    --resource-group rg-globalapp-${REGION} \
    --name webapp-globalapp-${REGION} \
    --query 'identity.principalId' \
    --output tsv)

  # Grant Cosmos DB Data Contributor role
  az cosmosdb sql role assignment create \
    --account-name globalapp-cosmos \
    --resource-group rg-globalapp-global \
    --scope "/" \
    --principal-id $WEBAPP_IDENTITY \
    --role-definition-id "00000000-0000-0000-0000-000000000002"
done
```

## Step 5: Test Global Distribution

Test each regional endpoint:

```bash
# Test primary region
curl https://webapp-globalapp-eastus2.azurewebsites.net/health

# Test secondary region
curl https://webapp-globalapp-westus2.azurewebsites.net/health

# Test tertiary region
curl https://webapp-globalapp-centralus.azurewebsites.net/health

# Test Traffic Manager (routes to nearest region)
curl http://globalapp-contoso.trafficmanager.net/health

# Test Front Door
curl https://globalapp-fd-globalapp.azurefd.net/health
```

## Step 6: Simulate Regional Failover

Test failover scenarios:

```bash
# Stop primary region web app
az webapp stop \
  --resource-group rg-globalapp-eastus2 \
  --name webapp-globalapp-eastus2

# Traffic Manager automatically fails over to secondary
# Wait 30-60 seconds for health probe to detect failure

# Test Traffic Manager (should route to westus2)
curl http://globalapp-contoso.trafficmanager.net/health

# Restart primary region
az webapp start \
  --resource-group rg-globalapp-eastus2 \
  --name webapp-globalapp-eastus2
```

## Step 7: Monitor Global Performance

View performance across regions:

```bash
# Application Insights cross-region query
az monitor app-insights query \
  --apps ai-eastus2 ai-westus2 ai-centralus \
  --analytics-query "
    requests
    | where timestamp > ago(1h)
    | summarize
        RequestCount = count(),
        AvgDuration = avg(duration),
        P95Duration = percentile(duration, 95)
      by cloud_RoleInstance, bin(timestamp, 5m)
    | order by timestamp desc
  "

# Traffic Manager metrics
az monitor metrics list \
  --resource /subscriptions/{sub}/resourceGroups/rg-globalapp-global/providers/Microsoft.Network/trafficManagerProfiles/tm-globalapp \
  --metric "QpsByEndpoint" "ProbeAgentCurrentEndpointStateByProfileResourceId"
```

## Best Practices for Multi-Region

### 1. Use Performance Routing

```typescript
const trafficManager = new TrafficManagerProfiles(stack, 'TM', {
  trafficRoutingMethod: 'Performance', // Routes to closest region
});
```

### 2. Implement Health Checks

```typescript
{
  monitorConfig: {
    protocol: 'HTTPS',
    port: 443,
    path: '/health',
    intervalInSeconds: 30,
    toleratedNumberOfFailures: 3,
  },
}
```

### 3. Enable Cosmos DB Multi-Region Writes

```typescript
const cosmosDb = new CosmosAccounts(stack, 'CosmosDb', {
  enableMultipleWriteLocations: true,
  enableAutomaticFailover: true,
  consistencyPolicy: {
    defaultConsistencyLevel: 'Session',
  },
});
```

### 4. Use GRS Storage for Critical Data

```typescript
const storage = new StorageAccounts(stack, 'Storage', {
  sku: {
    name: 'Standard_GRS', // Geo-redundant
  },
});
```

### 5. Implement Circuit Breaker Pattern

```javascript
// app.js
const CircuitBreaker = require('opossum');

const dbQuery = async (query) => {
  // Database query logic
};

const breaker = new CircuitBreaker(dbQuery, {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
});

breaker.fallback(() => {
  // Return cached data or degraded response
  return { status: 'degraded', data: cachedData };
});
```

### 6. Configure Auto-Scaling Per Region

```bash
# Primary region: higher capacity
az monitor autoscale create \
  --resource-group rg-globalapp-eastus2 \
  --resource asp-eastus2 \
  --min-count 2 \
  --max-count 10 \
  --count 3

# Secondary regions: lower baseline
az monitor autoscale create \
  --resource-group rg-globalapp-westus2 \
  --resource asp-westus2 \
  --min-count 1 \
  --max-count 5 \
  --count 2
```

## Cost Optimization

### 1. Use Different SKUs by Region

```typescript
// config.ts
{
  name: 'primary',
  appServiceSku: 'P1v3', // Higher tier for primary
},
{
  name: 'secondary',
  appServiceSku: 'S1', // Lower tier for backup
}
```

### 2. Implement Reserved Capacity

```bash
# Purchase reserved instances for primary region
az reservations reservation-order purchase \
  --reservation-order-id {order-id} \
  --sku P1v3 \
  --location eastus2 \
  --term P1Y
```

### 3. Use Cosmos DB Autoscale

```typescript
const cosmosDatabase = new CosmosDatabases(cosmosDb, 'AppDatabase', {
  databaseName: 'appdb',
  options: {
    autoscaleSettings: {
      maxThroughput: 4000,
    },
  },
});
```

## Troubleshooting

### Traffic Manager Not Routing Correctly

```bash
# Check endpoint health
az network traffic-manager endpoint show \
  --resource-group rg-globalapp-global \
  --profile-name tm-globalapp \
  --name eastus2 \
  --type azureEndpoints

# Test DNS resolution
nslookup globalapp-contoso.trafficmanager.net
```

### Cosmos DB Replication Lag

```bash
# Monitor replication metrics
az monitor metrics list \
  --resource {cosmos-db-resource-id} \
  --metric "ReplicationLatency"
```

### Front Door Health Probe Failures

```bash
# Check origin health
az afd origin show \
  --resource-group rg-globalapp-global \
  --profile-name fd-globalapp \
  --origin-group-name webapp-origins \
  --origin-name eastus2
```

## Next Steps

- **[CI/CD Pipeline](./ci-cd-pipeline.md)** - Automate multi-region deployments
- **[Government Cloud Deployment](./government-cloud-deployment.md)** - Deploy to Azure Government
- **[Organizing Projects](../workflows/organizing-projects.md)** - Structure large projects
- **[Deployment Failures](../../troubleshooting/deployment-failures.md)** - Common issues

## See Also

- **[Deployment Guide](../fundamentals/deployment.md)** - Deployment fundamentals
- **[Network Resources API](../../reference/api/cdk/network.md)** - Networking reference
- **[Common Issues](../../troubleshooting/common-issues.md)** - Troubleshooting

---

**Congratulations!** You've built a globally distributed, highly available application infrastructure.
