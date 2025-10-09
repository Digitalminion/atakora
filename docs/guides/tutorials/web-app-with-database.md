# Tutorial: Web Application with Database

[Getting Started](../../getting-started/README.md) > [Guides](../README.md) > [Tutorials](./README.md) > Web App with Database

Build a complete, production-ready web application infrastructure with Azure App Service, Azure SQL Database, virtual network integration, and monitoring.

## What You'll Build

By the end of this tutorial, you'll have deployed:

- **Azure App Service** (Linux, Node.js) with auto-scaling
- **Azure SQL Database** with private endpoint
- **Virtual Network** with subnet segmentation
- **Application Insights** for monitoring and diagnostics
- **Key Vault** for secrets management
- **Storage Account** for static assets and logs
- **Private DNS** for private endpoint resolution

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Virtual Network                       │
│                     10.0.0.0/16                         │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Web Subnet  │  │  Data Subnet │  │  Mgmt Subnet │ │
│  │ 10.0.1.0/24  │  │ 10.0.2.0/24  │  │ 10.0.3.0/24  │ │
│  │              │  │              │  │              │ │
│  │ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌──────────┐ │ │
│  │ │ App Svc  │ │  │ │ SQL DB   │ │  │ │ Key Vault│ │ │
│  │ │          │ │  │ │ (Private)│ │  │ │          │ │ │
│  │ └──────────┘ │  │ └──────────┘ │  │ └──────────┘ │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
           │                                     │
           ▼                                     ▼
    ┌─────────────┐                       ┌─────────────┐
    │ App Insights│                       │   Storage   │
    │             │                       │   Account   │
    └─────────────┘                       └─────────────┘
```

## Prerequisites

- **Atakora CLI** installed and configured
- **Azure subscription** with Contributor access
- **Node.js 18+** installed locally
- **Azure CLI** authenticated (`az login`)
- **Basic understanding** of Azure networking and App Service

## Step 1: Project Setup

Create a new Atakora project:

```bash
# Create project directory
mkdir webapp-tutorial && cd webapp-tutorial

# Initialize Atakora project
atakora init

# Install dependencies
npm install
```

**Project structure**:
```
webapp-tutorial/
├── package.json
├── tsconfig.json
├── main.ts
└── arm.out/
```

## Step 2: Define Infrastructure Code

Create the main infrastructure file:

```typescript
// main.ts
import { AzureApp, ResourceGroupStack, Output } from '@atakora/lib';
import {
  VirtualNetworks,
  Subnets,
  NetworkSecurityGroups,
  PrivateDnsZones,
  PrivateDnsZoneVirtualNetworkLinks,
} from '@atakora/cdk/network';
import {
  StorageAccounts,
  BlobServices,
  BlobContainers,
} from '@atakora/cdk/storage';
import {
  ServerFarms,
  Sites,
  SiteConfig,
} from '@atakora/cdk/web';
import {
  Servers as SqlServers,
  Databases as SqlDatabases,
  PrivateEndpoints,
} from '@atakora/cdk/sql';
import {
  Vaults as KeyVaults,
  Secrets,
} from '@atakora/cdk/keyvault';
import {
  Components as AppInsights,
} from '@atakora/cdk/insights';

// Configuration
const config = {
  organization: 'Contoso',
  project: 'WebApp',
  environment: process.env.ENVIRONMENT || 'dev',
  location: 'eastus2',

  // Resource naming
  resourceGroup: 'rg-webapp-tutorial',

  // Database configuration
  sqlAdminUsername: 'sqladmin',
  databaseName: 'appdb',

  // App Service configuration
  appServiceSku: 'P1v3',
  nodeVersion: '18-lts',
};

// Create application
const app = new AzureApp({
  organization: config.organization,
  project: config.project,
});

// Create resource group stack
const stack = new ResourceGroupStack(app, 'Infrastructure', {
  resourceGroupName: config.resourceGroup,
  location: config.location,
  tags: {
    environment: config.environment,
    project: config.project,
    managedBy: 'atakora',
  },
});

// 1. Virtual Network
const vnet = new VirtualNetworks(stack, 'VNet', {
  virtualNetworkName: 'vnet-webapp',
  addressSpace: {
    addressPrefixes: ['10.0.0.0/16'],
  },
});

// 2. Subnets
const webSubnet = new Subnets(vnet, 'WebSubnet', {
  subnetName: 'snet-web',
  addressPrefix: '10.0.1.0/24',
  delegations: [
    {
      name: 'appservice-delegation',
      properties: {
        serviceName: 'Microsoft.Web/serverFarms',
      },
    },
  ],
});

const dataSubnet = new Subnets(vnet, 'DataSubnet', {
  subnetName: 'snet-data',
  addressPrefix: '10.0.2.0/24',
  privateEndpointNetworkPolicies: 'Disabled',
});

const mgmtSubnet = new Subnets(vnet, 'MgmtSubnet', {
  subnetName: 'snet-mgmt',
  addressPrefix: '10.0.3.0/24',
});

// 3. Network Security Groups
const webNsg = new NetworkSecurityGroups(stack, 'WebNSG', {
  networkSecurityGroupName: 'nsg-web',
  securityRules: [
    {
      name: 'AllowHTTPS',
      priority: 100,
      direction: 'Inbound',
      access: 'Allow',
      protocol: 'Tcp',
      sourcePortRange: '*',
      destinationPortRange: '443',
      sourceAddressPrefix: 'Internet',
      destinationAddressPrefix: '*',
    },
    {
      name: 'AllowHTTP',
      priority: 110,
      direction: 'Inbound',
      access: 'Allow',
      protocol: 'Tcp',
      sourcePortRange: '*',
      destinationPortRange: '80',
      sourceAddressPrefix: 'Internet',
      destinationAddressPrefix: '*',
    },
  ],
});

// 4. Storage Account
const storage = new StorageAccounts(stack, 'Storage', {
  storageAccountName: `stwebapp${config.environment}`,
  sku: { name: 'Standard_GRS' },
  kind: 'StorageV2',
  enableHttpsTrafficOnly: true,
  minimumTlsVersion: 'TLS1_2',
  allowBlobPublicAccess: false,
});

const blobService = new BlobServices(storage, 'BlobService', {
  deleteRetentionPolicy: {
    enabled: true,
    days: 7,
  },
});

const assetsContainer = new BlobContainers(blobService, 'AssetsContainer', {
  containerName: 'assets',
  publicAccess: 'None',
});

const logsContainer = new BlobContainers(blobService, 'LogsContainer', {
  containerName: 'logs',
  publicAccess: 'None',
});

// 5. Application Insights
const appInsights = new AppInsights(stack, 'AppInsights', {
  componentName: 'ai-webapp',
  applicationType: 'web',
  kind: 'web',
  retentionInDays: 90,
});

// 6. Key Vault
const keyVault = new KeyVaults(stack, 'KeyVault', {
  vaultName: `kv-webapp-${config.environment}`,
  sku: {
    family: 'A',
    name: 'standard',
  },
  enabledForDeployment: true,
  enabledForTemplateDeployment: true,
  enableSoftDelete: true,
  softDeleteRetentionInDays: 90,
  enablePurgeProtection: true,
  networkAcls: {
    defaultAction: 'Deny',
    bypass: 'AzureServices',
    virtualNetworkRules: [
      {
        id: mgmtSubnet.id,
        ignoreMissingVnetServiceEndpoint: false,
      },
    ],
  },
});

// 7. SQL Server
const sqlServer = new SqlServers(stack, 'SqlServer', {
  serverName: `sql-webapp-${config.environment}`,
  administratorLogin: config.sqlAdminUsername,
  administratorLoginPassword: '${SQL_ADMIN_PASSWORD}', // From Key Vault
  version: '12.0',
  minimalTlsVersion: '1.2',
  publicNetworkAccess: 'Disabled', // Private endpoint only
});

// 8. SQL Database
const sqlDatabase = new SqlDatabases(sqlServer, 'Database', {
  databaseName: config.databaseName,
  sku: {
    name: 'S1',
    tier: 'Standard',
  },
  maxSizeBytes: 268435456000, // 250 GB
  zoneRedundant: false,
});

// 9. Private DNS Zone for SQL
const sqlPrivateDnsZone = new PrivateDnsZones(stack, 'SqlPrivateDnsZone', {
  privateZoneName: 'privatelink.database.windows.net',
});

const sqlDnsLink = new PrivateDnsZoneVirtualNetworkLinks(
  sqlPrivateDnsZone,
  'SqlDnsLink',
  {
    virtualNetworkLinkName: 'vnet-link',
    registrationEnabled: false,
    virtualNetwork: {
      id: vnet.id,
    },
  }
);

// 10. Private Endpoint for SQL
const sqlPrivateEndpoint = new PrivateEndpoints(stack, 'SqlPrivateEndpoint', {
  privateEndpointName: 'pe-sql',
  subnet: {
    id: dataSubnet.id,
  },
  privateLinkServiceConnections: [
    {
      name: 'sql-connection',
      privateLinkServiceId: sqlServer.id,
      groupIds: ['sqlServer'],
    },
  ],
});

// 11. App Service Plan
const appServicePlan = new ServerFarms(stack, 'AppServicePlan', {
  serverFarmName: 'asp-webapp',
  sku: {
    name: config.appServiceSku,
    tier: 'PremiumV3',
    capacity: 1,
  },
  kind: 'linux',
  reserved: true,
});

// 12. Web App
const webApp = new Sites(stack, 'WebApp', {
  siteName: `webapp-${config.environment}`,
  serverFarmId: appServicePlan.id,
  httpsOnly: true,
  clientAffinityEnabled: false,

  siteConfig: {
    linuxFxVersion: `NODE|${config.nodeVersion}`,
    alwaysOn: true,
    http20Enabled: true,
    minTlsVersion: '1.2',
    ftpsState: 'Disabled',

    // Application settings
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
        name: 'APPLICATIONINSIGHTS_CONNECTION_STRING',
        value: appInsights.connectionString,
      },
      {
        name: 'STORAGE_CONNECTION_STRING',
        value: storage.primaryConnectionString,
      },
      {
        name: 'KEY_VAULT_URL',
        value: `https://${keyVault.vaultName}.vault.azure.net/`,
      },
    ],

    // Database connection string (uses Key Vault reference)
    connectionStrings: [
      {
        name: 'Database',
        connectionString: `@Microsoft.KeyVault(SecretUri=https://${keyVault.vaultName}.vault.azure.net/secrets/SqlConnectionString)`,
        type: 'SQLAzure',
      },
    ],
  },

  // Virtual Network integration
  virtualNetworkSubnetId: webSubnet.id,

  identity: {
    type: 'SystemAssigned',
  },
});

// 13. Outputs
new Output(stack, 'WebAppUrl', {
  value: `https://${webApp.siteName}.azurewebsites.net`,
  description: 'Web application URL',
});

new Output(stack, 'SqlServerFqdn', {
  value: `${sqlServer.serverName}.database.windows.net`,
  description: 'SQL Server FQDN',
});

new Output(stack, 'StorageAccountName', {
  value: storage.storageAccountName,
  description: 'Storage account name',
});

new Output(stack, 'AppInsightsInstrumentationKey', {
  value: appInsights.instrumentationKey,
  description: 'Application Insights instrumentation key',
});

new Output(stack, 'KeyVaultUrl', {
  value: `https://${keyVault.vaultName}.vault.azure.net/`,
  description: 'Key Vault URL',
});

// Synthesize
app.synth();
```

## Step 3: Review and Validate

Before deploying, validate your infrastructure:

```bash
# Synthesize ARM templates
npm run synth

# Validate templates
atakora validate

# Preview changes
atakora diff Infrastructure
```

**Expected output**:
```
Stack: Infrastructure

Resources
[+] Microsoft.Network/virtualNetworks vnet-webapp
[+] Microsoft.Network/virtualNetworks/subnets snet-web
[+] Microsoft.Network/virtualNetworks/subnets snet-data
[+] Microsoft.Network/virtualNetworks/subnets snet-mgmt
[+] Microsoft.Network/networkSecurityGroups nsg-web
[+] Microsoft.Storage/storageAccounts stwebappdev
[+] Microsoft.Insights/components ai-webapp
[+] Microsoft.KeyVault/vaults kv-webapp-dev
[+] Microsoft.Sql/servers sql-webapp-dev
[+] Microsoft.Sql/servers/databases appdb
[+] Microsoft.Network/privateEndpoints pe-sql
[+] Microsoft.Web/serverfarms asp-webapp
[+] Microsoft.Web/sites webapp-dev

Total: 13 resources to create
```

## Step 4: Deploy Infrastructure

Deploy the infrastructure to Azure:

```bash
# Set SQL admin password (store in Key Vault in production)
export SQL_ADMIN_PASSWORD='YourStrongPassword123!'

# Deploy
atakora deploy Infrastructure --require-approval
```

**Deployment process**:
1. Creates resource group
2. Deploys virtual network and subnets
3. Creates storage account
4. Deploys monitoring (Application Insights)
5. Creates Key Vault
6. Deploys SQL Server and database
7. Creates private endpoint and DNS
8. Deploys App Service plan
9. Creates and configures web app

**Estimated deployment time**: 15-20 minutes

## Step 5: Store Secrets in Key Vault

After deployment, store the SQL connection string in Key Vault:

```bash
# Get SQL Server name
SQL_SERVER=$(az deployment group show \
  --resource-group rg-webapp-tutorial \
  --name Infrastructure \
  --query 'properties.outputs.SqlServerFqdn.value' \
  --output tsv)

# Create connection string
CONNECTION_STRING="Server=tcp:$SQL_SERVER,1433;Initial Catalog=appdb;Persist Security Info=False;User ID=sqladmin;Password=$SQL_ADMIN_PASSWORD;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"

# Store in Key Vault
az keyvault secret set \
  --vault-name kv-webapp-dev \
  --name SqlConnectionString \
  --value "$CONNECTION_STRING"
```

## Step 6: Configure Web App Access to Key Vault

Grant the web app's managed identity access to Key Vault:

```bash
# Get web app managed identity
WEBAPP_IDENTITY=$(az webapp show \
  --resource-group rg-webapp-tutorial \
  --name webapp-dev \
  --query 'identity.principalId' \
  --output tsv)

# Grant access to Key Vault secrets
az keyvault set-policy \
  --name kv-webapp-dev \
  --object-id $WEBAPP_IDENTITY \
  --secret-permissions get list
```

## Step 7: Deploy Application Code

Create a sample Node.js application:

```javascript
// app.js
const express = require('express');
const sql = require('mssql');
const appInsights = require('applicationinsights');

// Initialize Application Insights
if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
  appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
    .setAutoDependencyCorrelation(true)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .start();
}

const app = express();
const port = process.env.PORT || 3000;

// Database connection pool
const dbConfig = {
  connectionString: process.env.SQLAZURECONNSTR_Database,
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Home endpoint
app.get('/', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query('SELECT @@VERSION as version');

    res.json({
      message: 'Web App with Database Tutorial',
      database: 'Connected',
      version: result.recordset[0].version,
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({
      message: 'Database connection failed',
      error: err.message,
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
```

```json
// package.json
{
  "name": "webapp-tutorial",
  "version": "1.0.0",
  "description": "Web app with database tutorial",
  "main": "app.js",
  "scripts": {
    "start": "node app.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mssql": "^10.0.1",
    "applicationinsights": "^2.9.1"
  }
}
```

Deploy the application:

```bash
# Create deployment package
zip -r app.zip app.js package.json

# Deploy to App Service
az webapp deployment source config-zip \
  --resource-group rg-webapp-tutorial \
  --name webapp-dev \
  --src app.zip
```

## Step 8: Initialize Database Schema

Create the database schema:

```sql
-- schema.sql
CREATE TABLE Users (
  Id INT PRIMARY KEY IDENTITY(1,1),
  Username NVARCHAR(100) NOT NULL,
  Email NVARCHAR(255) NOT NULL,
  CreatedAt DATETIME2 DEFAULT GETUTCDATE()
);

CREATE INDEX IX_Users_Email ON Users(Email);

-- Insert sample data
INSERT INTO Users (Username, Email) VALUES
  ('john.doe', 'john@example.com'),
  ('jane.smith', 'jane@example.com');
```

Run migrations:

```bash
# Connect to SQL Database via private endpoint (from VNet or VPN)
sqlcmd -S sql-webapp-dev.database.windows.net \
  -d appdb \
  -U sqladmin \
  -P $SQL_ADMIN_PASSWORD \
  -i schema.sql
```

## Step 9: Test the Application

Test the deployed application:

```bash
# Get web app URL
WEBAPP_URL=$(az deployment group show \
  --resource-group rg-webapp-tutorial \
  --name Infrastructure \
  --query 'properties.outputs.WebAppUrl.value' \
  --output tsv)

# Test health endpoint
curl $WEBAPP_URL/health

# Test database connection
curl $WEBAPP_URL/
```

**Expected response**:
```json
{
  "message": "Web App with Database Tutorial",
  "database": "Connected",
  "version": "Microsoft SQL Azure (RTM) - 12.0..."
}
```

## Step 10: Configure Auto-Scaling

Add auto-scaling rules to the App Service Plan:

```bash
# Create auto-scale rule
az monitor autoscale create \
  --resource-group rg-webapp-tutorial \
  --resource asp-webapp \
  --resource-type Microsoft.Web/serverFarms \
  --name autoscale-webapp \
  --min-count 1 \
  --max-count 5 \
  --count 1

# Scale out rule (CPU > 70%)
az monitor autoscale rule create \
  --resource-group rg-webapp-tutorial \
  --autoscale-name autoscale-webapp \
  --condition "Percentage CPU > 70 avg 5m" \
  --scale out 1

# Scale in rule (CPU < 30%)
az monitor autoscale rule create \
  --resource-group rg-webapp-tutorial \
  --autoscale-name autoscale-webapp \
  --condition "Percentage CPU < 30 avg 10m" \
  --scale in 1
```

## Step 11: Monitor the Application

View application metrics and logs:

```bash
# View Application Insights
az portal open \
  --resource-group rg-webapp-tutorial \
  --resource ai-webapp

# View live metrics
az monitor app-insights metrics show \
  --app ai-webapp \
  --resource-group rg-webapp-tutorial \
  --metrics "requests/count" "requests/duration"

# Query application logs
az monitor app-insights query \
  --app ai-webapp \
  --resource-group rg-webapp-tutorial \
  --analytics-query "requests | where timestamp > ago(1h) | summarize count() by resultCode"
```

## Enhancements

### Add Caching with Azure Cache for Redis

```typescript
import { Redis } from '@atakora/cdk/cache';

const redis = new Redis(stack, 'Redis', {
  redisName: 'redis-webapp',
  sku: {
    name: 'Premium',
    family: 'P',
    capacity: 1,
  },
  enableNonSslPort: false,
  minimumTlsVersion: '1.2',
  subnetId: dataSubnet.id,
});

// Add connection string to web app
// In siteConfig.appSettings:
{
  name: 'REDIS_CONNECTION_STRING',
  value: redis.connectionString,
}
```

### Add CDN for Static Assets

```typescript
import { Profiles, Endpoints } from '@atakora/cdk/cdn';

const cdnProfile = new Profiles(stack, 'CdnProfile', {
  profileName: 'cdn-webapp',
  sku: { name: 'Standard_Microsoft' },
});

const cdnEndpoint = new Endpoints(cdnProfile, 'CdnEndpoint', {
  endpointName: 'webapp-assets',
  originHostHeader: `${storage.storageAccountName}.blob.core.windows.net`,
  origins: [
    {
      name: 'storage-origin',
      hostName: `${storage.storageAccountName}.blob.core.windows.net`,
    },
  ],
  isHttpAllowed: false,
  isHttpsAllowed: true,
});
```

### Add Backup and Disaster Recovery

```typescript
// SQL Database backup
const sqlDatabase = new SqlDatabases(sqlServer, 'Database', {
  databaseName: config.databaseName,
  sku: {
    name: 'S1',
    tier: 'Standard',
  },
  // Enable backup
  backupRetentionDays: 35,
  geoBackupEnabled: true,
});

// App Service backup
// In Sites configuration:
{
  backupConfiguration: {
    backupName: 'webapp-backup',
    enabled: true,
    storageAccountUrl: `${storage.primaryBlobEndpoint}backups`,
    backupSchedule: {
      frequencyInterval: 1,
      frequencyUnit: 'Day',
      keepAtLeastOneBackup: true,
      retentionPeriodInDays: 30,
    },
  },
}
```

## Cleanup

Remove all resources when done:

```bash
# Delete resource group and all resources
az group delete --name rg-webapp-tutorial --yes --no-wait
```

## Troubleshooting

### Web App Cannot Connect to SQL Database

**Issue**: Private endpoint connectivity problems.

**Solution**:
```bash
# Verify private endpoint status
az network private-endpoint show \
  --resource-group rg-webapp-tutorial \
  --name pe-sql

# Check DNS resolution from web app
az webapp ssh --resource-group rg-webapp-tutorial --name webapp-dev
# Inside web app shell:
nslookup sql-webapp-dev.database.windows.net
```

### Key Vault Access Denied

**Issue**: Web app cannot read secrets from Key Vault.

**Solution**:
```bash
# Verify managed identity is enabled
az webapp identity show \
  --resource-group rg-webapp-tutorial \
  --name webapp-dev

# Check Key Vault access policy
az keyvault show \
  --name kv-webapp-dev \
  --query 'properties.accessPolicies'
```

### Application Insights Not Receiving Data

**Issue**: No telemetry in Application Insights.

**Solution**:
```bash
# Verify connection string
az webapp config appsettings list \
  --resource-group rg-webapp-tutorial \
  --name webapp-dev \
  --query "[?name=='APPLICATIONINSIGHTS_CONNECTION_STRING']"

# Check Application Insights ingestion
az monitor app-insights component show \
  --app ai-webapp \
  --resource-group rg-webapp-tutorial
```

## Best Practices

1. **Use private endpoints** for database and storage to enhance security
2. **Enable managed identity** instead of connection strings when possible
3. **Store secrets in Key Vault**, reference them from app settings
4. **Implement health check endpoints** for monitoring
5. **Enable Application Insights** for comprehensive diagnostics
6. **Configure auto-scaling** based on application metrics
7. **Use virtual network integration** to secure backend communication
8. **Enable backup** for both database and application
9. **Implement proper logging** and monitoring
10. **Follow least-privilege access** for all service principals

## Next Steps

- **[Multi-Region Setup](./multi-region-setup.md)** - Deploy across multiple Azure regions
- **[CI/CD Pipeline](./ci-cd-pipeline.md)** - Automate deployments
- **[Managing Secrets](../workflows/managing-secrets.md)** - Advanced secrets management
- **[Testing Infrastructure](../workflows/testing-infrastructure.md)** - Test your infrastructure code

## See Also

- **[Deployment Guide](../fundamentals/deployment.md)** - Deployment fundamentals
- **[Web Resources API](../../reference/api/cdk/web.md)** - App Service API reference
- **[Network Resources API](../../reference/api/cdk/network.md)** - Networking API reference
- **[Common Issues](../../troubleshooting/common-issues.md)** - Troubleshooting guide

---

**Congratulations!** You've built a complete, production-ready web application infrastructure with database, networking, and monitoring.
