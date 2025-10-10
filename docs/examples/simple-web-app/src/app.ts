import { AzureApp, ResourceGroupStack } from '@atakora/lib';
import { VirtualNetworks, Subnets } from '@atakora/cdk/network';
import { StorageAccounts, BlobContainers } from '@atakora/cdk/storage';
import { ServerFarms, Sites } from '@atakora/cdk/web';
import { Servers, Databases } from '@atakora/cdk/sql';
import { Components } from '@atakora/cdk/insights';

/**
 * Simple Web App Example
 *
 * This example demonstrates a complete web application infrastructure with:
 * - App Service with staging slot
 * - SQL Database for data storage
 * - Storage Account for static files
 * - Application Insights for monitoring
 * - Virtual Network integration for security
 */

// Create the Atakora application
const app = new AzureApp({
  organization: process.env.ORGANIZATION || 'Contoso',
  project: process.env.PROJECT || 'SimpleWebApp',
});

// Determine environment from environment variable
const environment = process.env.ENVIRONMENT || 'dev';
const location = process.env.AZURE_LOCATION || 'eastus2';

// Environment-specific configuration
const config = {
  dev: {
    appServicePlanSku: 'B1',
    sqlDatabaseSku: 'Basic',
    storageSku: 'Standard_LRS',
  },
  staging: {
    appServicePlanSku: 'S1',
    sqlDatabaseSku: 'S0',
    storageSku: 'Standard_GRS',
  },
  prod: {
    appServicePlanSku: 'P1v3',
    sqlDatabaseSku: 'S1',
    storageSku: 'Standard_GRS',
  },
}[environment] || {
  appServicePlanSku: 'B1',
  sqlDatabaseSku: 'Basic',
  storageSku: 'Standard_LRS',
};

// Create the main infrastructure stack
const stack = new ResourceGroupStack(app, 'WebAppStack', {
  resourceGroupName: `rg-webapp-${environment}`,
  location: location,
  tags: {
    environment: environment,
    application: 'simple-web-app',
    managedBy: 'atakora',
  },
});

// Virtual Network for secure communication
const vnet = new VirtualNetworks(stack, 'AppVNet', {
  virtualNetworkName: `vnet-webapp-${environment}`,
  addressSpace: {
    addressPrefixes: ['10.0.0.0/16'],
  },
  tags: {
    purpose: 'web-app-networking',
  },
});

// Subnet for App Service integration
const appSubnet = new Subnets(stack, 'AppSubnet', {
  virtualNetworkName: vnet.name,
  subnetName: 'snet-app',
  addressPrefix: '10.0.1.0/24',
  delegations: [
    {
      name: 'app-service-delegation',
      properties: {
        serviceName: 'Microsoft.Web/serverFarms',
      },
    },
  ],
});

// Storage Account for static files, logs, and backups
const storage = new StorageAccounts(stack, 'AppStorage', {
  accountName: `stwebapp${environment}${Math.random().toString(36).slice(2, 8)}`.toLowerCase(),
  sku: {
    name: config.storageSku,
  },
  kind: 'StorageV2',
  enableHttpsTrafficOnly: true,
  minimumTlsVersion: 'TLS1_2',
  allowBlobPublicAccess: false,
  tags: {
    purpose: 'web-app-storage',
  },
});

// Blob container for uploaded files
const filesContainer = new BlobContainers(stack, 'FilesContainer', {
  accountName: storage.name,
  containerName: 'files',
  publicAccess: 'None',
});

// Blob container for application logs
const logsContainer = new BlobContainers(stack, 'LogsContainer', {
  accountName: storage.name,
  containerName: 'logs',
  publicAccess: 'None',
});

// SQL Server for database
const sqlServer = new Servers(stack, 'SqlServer', {
  serverName: `sql-webapp-${environment}-${Math.random().toString(36).slice(2, 8)}`.toLowerCase(),
  administratorLogin: process.env.SQL_ADMIN_USERNAME || 'sqladmin',
  administratorLoginPassword: process.env.SQL_ADMIN_PASSWORD || 'P@ssw0rd1234!',
  version: '12.0',
  minimalTlsVersion: '1.2',
  publicNetworkAccess: 'Enabled',
  tags: {
    purpose: 'web-app-database',
  },
});

// SQL Database for application data
const database = new Databases(stack, 'AppDatabase', {
  serverName: sqlServer.name,
  databaseName: 'webapp-db',
  sku: {
    name: config.sqlDatabaseSku,
  },
  maxSizeBytes: 2147483648, // 2 GB
  collation: 'SQL_Latin1_General_CP1_CI_AS',
  tags: {
    purpose: 'application-data',
  },
});

// Application Insights for monitoring
const appInsights = new Components(stack, 'AppInsights', {
  resourceName: `ai-webapp-${environment}`,
  applicationType: 'web',
  kind: 'web',
  tags: {
    purpose: 'application-monitoring',
  },
});

// App Service Plan
const appServicePlan = new ServerFarms(stack, 'AppServicePlan', {
  name: `asp-webapp-${environment}`,
  sku: {
    name: config.appServicePlanSku,
  },
  kind: 'linux',
  reserved: true, // Required for Linux
  tags: {
    purpose: 'web-app-hosting',
  },
});

// Web App
const webApp = new Sites(stack, 'WebApp', {
  name: `webapp-${environment}-${Math.random().toString(36).slice(2, 8)}`.toLowerCase(),
  serverFarmId: appServicePlan.id,
  httpsOnly: true,
  clientAffinityEnabled: false,
  siteConfig: {
    linuxFxVersion: 'NODE|18-lts',
    alwaysOn: environment === 'prod',
    http20Enabled: true,
    minTlsVersion: '1.2',
    ftpsState: 'Disabled',
    appSettings: [
      {
        name: 'APPINSIGHTS_INSTRUMENTATIONKEY',
        value: appInsights.instrumentationKey,
      },
      {
        name: 'APPLICATIONINSIGHTS_CONNECTION_STRING',
        value: appInsights.connectionString,
      },
      {
        name: 'ApplicationInsightsAgent_EXTENSION_VERSION',
        value: '~3',
      },
      {
        name: 'NODE_ENV',
        value: environment === 'prod' ? 'production' : 'development',
      },
      {
        name: 'STORAGE_ACCOUNT_NAME',
        value: storage.name,
      },
      {
        name: 'STORAGE_CONNECTION_STRING',
        value: storage.primaryConnectionString,
      },
    ],
    connectionStrings: [
      {
        name: 'DefaultConnection',
        connectionString: `Server=tcp:${sqlServer.name}.database.windows.net,1433;Database=${database.name};User ID=${sqlServer.administratorLogin};Password=${sqlServer.administratorLoginPassword};Encrypt=true;Connection Timeout=30;`,
        type: 'SQLAzure',
      },
    ],
  },
  virtualNetworkSubnetId: appSubnet.id,
  tags: {
    purpose: 'web-application',
  },
});

// Synthesize ARM templates
app.synth();

console.log(`
=======================================================
Simple Web App Infrastructure Synthesized
=======================================================
Environment: ${environment}
Location: ${location}

Resources Created:
- Resource Group: rg-webapp-${environment}
- Virtual Network: vnet-webapp-${environment}
- Storage Account: ${storage.name}
- SQL Server: ${sqlServer.name}
- SQL Database: ${database.name}
- Application Insights: ai-webapp-${environment}
- App Service Plan: asp-webapp-${environment}
- Web App: ${webApp.name}

Next Steps:
1. Set environment variables (see .env.example)
2. Run: npm run deploy
3. Access your web app at: https://${webApp.name}.azurewebsites.net

=======================================================
`);
