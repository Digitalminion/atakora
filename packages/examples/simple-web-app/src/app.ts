import { App, SubscriptionStack, ResourceGroupStack, Subscription, Geography, Organization, Project, Environment, Instance } from '@atakora/cdk';
import { VirtualNetworks, Subnets } from '@atakora/cdk/network';
import { StorageAccounts, StorageAccountSkuName, StorageAccountKind, TlsVersion } from '@atakora/cdk/storage';
import { ServerFarms, Sites, ServerFarmSkuName, ServerFarmKind, MinTlsVersion, FtpsState } from '@atakora/cdk/web';
import { ArmServers, ArmDatabases, SqlServerVersion, PublicNetworkAccess, DatabaseSkuTier } from '@atakora/cdk/sql';
import { Components, ApplicationType } from '@atakora/cdk/insights';

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
const app = new App();

// Determine environment from environment variable
const environment = process.env.ENVIRONMENT || 'dev';
const location = process.env.AZURE_LOCATION || 'eastus2';

// Create subscription stack
const subscriptionStack = new SubscriptionStack(app, 'SimpleWebAppFoundation', {
  subscription: Subscription.fromId(process.env.AZURE_SUBSCRIPTION_ID || '00000000-0000-0000-0000-000000000000'),
  geography: Geography.fromValue(location),
  organization: Organization.fromValue('contoso'),
  project: new Project('webapp'),
  environment: Environment.fromValue(environment === 'prod' ? 'prod' : 'nonprod'),
  instance: Instance.fromNumber(1),
});

// Environment-specific configuration
const config = {
  dev: {
    appServicePlanSku: ServerFarmSkuName.B1,
    sqlDatabaseTier: DatabaseSkuTier.BASIC,
    storageSku: StorageAccountSkuName.STANDARD_LRS,
  },
  staging: {
    appServicePlanSku: ServerFarmSkuName.S1,
    sqlDatabaseTier: DatabaseSkuTier.STANDARD,
    storageSku: StorageAccountSkuName.STANDARD_GRS,
  },
  prod: {
    appServicePlanSku: ServerFarmSkuName.P1V3,
    sqlDatabaseTier: DatabaseSkuTier.STANDARD,
    storageSku: StorageAccountSkuName.STANDARD_GRS,
  },
}[environment] || {
  appServicePlanSku: ServerFarmSkuName.B1,
  sqlDatabaseTier: DatabaseSkuTier.BASIC,
  storageSku: StorageAccountSkuName.STANDARD_LRS,
};

// Create the main infrastructure stack
const stack = new ResourceGroupStack(subscriptionStack, 'WebAppStack', {
  resourceGroup: {
    resourceGroupName: `rg-webapp-${environment}`,
    location: location,
  },
  tags: {
    environment: environment,
    application: 'simple-web-app',
    managedBy: 'atakora',
  },
});

// Virtual Network for secure communication
const vnet = new VirtualNetworks(stack, 'AppVNet', {
  virtualNetworkName: `vnet-webapp-${environment}`,
  addressSpace: ['10.0.0.0/16'],
  tags: {
    purpose: 'web-app-networking',
  },
});

// Subnet for App Service integration
const appSubnet = new Subnets(vnet, 'AppSubnet', {
  name: 'snet-app',
  addressPrefix: '10.0.1.0/24',
  delegations: [
    {
      name: 'app-service-delegation',
      serviceName: 'Microsoft.Web/serverFarms',
    },
  ],
});

// Storage Account for static files, logs, and backups
const storage = new StorageAccounts(stack, 'AppStorage', {
  storageAccountName: `stwebapp${environment}${Math.random().toString(36).slice(2, 8)}`.toLowerCase(),
  sku: config.storageSku,
  kind: StorageAccountKind.STORAGE_V2,
  minimumTlsVersion: TlsVersion.TLS1_2,
  enableBlobPublicAccess: false,
  tags: {
    purpose: 'web-app-storage',
  },
});

// SQL Server for database
const sqlServer = new ArmServers(stack, 'SqlServer', {
  serverName: `sql-webapp-${environment}-${Math.random().toString(36).slice(2, 8)}`.toLowerCase(),
  location: location,
  administratorLogin: process.env.SQL_ADMIN_USERNAME || 'sqladmin',
  administratorLoginPassword: process.env.SQL_ADMIN_PASSWORD || 'P@ssw0rd1234!',
  version: SqlServerVersion.V12_0,
  minimalTlsVersion: '1.2',
  publicNetworkAccess: PublicNetworkAccess.ENABLED,
  tags: {
    purpose: 'web-app-database',
  },
});

// SQL Database for application data
const database = new ArmDatabases(stack, 'AppDatabase', {
  serverName: sqlServer.serverName,
  databaseName: 'webapp-db',
  location: location,
  sku: {
    tier: config.sqlDatabaseTier,
  },
  maxSizeBytes: 2147483648, // 2 GB
  collation: 'SQL_Latin1_General_CP1_CI_AS',
  tags: {
    purpose: 'application-data',
  },
});

// Application Insights for monitoring
const appInsights = new Components(stack, 'AppInsights', {
  name: `ai-webapp-${environment}`,
  location: location,
  applicationType: ApplicationType.WEB,
  kind: 'web',
  tags: {
    purpose: 'application-monitoring',
  },
});

// App Service Plan
const appServicePlan = new ServerFarms(stack, 'AppServicePlan', {
  planName: `asp-webapp-${environment}`,
  location: location,
  sku: config.appServicePlanSku,
  kind: ServerFarmKind.LINUX,
  reserved: true, // Required for Linux
  tags: {
    purpose: 'web-app-hosting',
  },
});

// Web App
const webApp = new Sites(stack, 'WebApp', {
  siteName: `webapp-${environment}-${Math.random().toString(36).slice(2, 8)}`.toLowerCase(),
  location: location,
  serverFarmId: appServicePlan.planId,
  httpsOnly: true,
  linuxFxVersion: 'NODE|18-lts',
  alwaysOn: environment === 'prod',
  http20Enabled: true,
  minTlsVersion: MinTlsVersion.TLS_1_2,
  ftpsState: FtpsState.DISABLED,
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
      value: storage.storageAccountName,
    },
  ],
  connectionStrings: [
    {
      name: 'DefaultConnection',
      value: `Server=tcp:${sqlServer.serverName}.database.windows.net,1433;Database=${database.databaseName};User ID=${sqlServer.administratorLogin};Password=${sqlServer.administratorLoginPassword};Encrypt=true;Connection Timeout=30;`,
      type: 'SQLAzure' as any,
    },
  ],
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
- Storage Account: ${storage.storageAccountName}
- SQL Server: ${sqlServer.serverName}
- SQL Database: ${database.databaseName}
- Application Insights: ai-webapp-${environment}
- App Service Plan: asp-webapp-${environment}
- Web App: ${webApp.siteName}

Next Steps:
1. Set environment variables (see .env.example)
2. Run: npm run deploy
3. Access your web app at: https://${webApp.siteName}.azurewebsites.net

=======================================================
`);
