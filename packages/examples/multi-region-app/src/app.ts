import { App, SubscriptionStack, ResourceGroupStack, Subscription, Geography, Organization, Project, Environment, Instance } from '@atakora/cdk';
import { VirtualNetworks, Subnets } from '@atakora/cdk/network';
import { StorageAccounts, StorageAccountSkuName, StorageAccountKind, TlsVersion } from '@atakora/cdk/storage';
import { ServerFarms, Sites, ServerFarmSkuName, ServerFarmKind, MinTlsVersion, FtpsState } from '@atakora/cdk/web';
import { Components, ApplicationType } from '@atakora/cdk/insights';

/**
 * Multi-Region Application Example
 *
 * This example demonstrates a globally distributed web application with:
 * - Deployment to multiple Azure regions
 * - Regional App Services for low latency
 * - Geo-redundant storage with read access
 * - Centralized monitoring with Application Insights
 *
 * NOTE: Traffic Manager integration commented out (construct not yet implemented)
 */

// Configuration
const app = new App();

const environment = process.env.ENVIRONMENT || 'prod';
const primaryRegion = process.env.PRIMARY_REGION || 'eastus2';
const secondaryRegion = process.env.SECONDARY_REGION || 'westus2';

// Create subscription stack
const subscriptionStack = new SubscriptionStack(app, 'MultiRegionAppFoundation', {
  subscription: Subscription.fromId(process.env.AZURE_SUBSCRIPTION_ID || '00000000-0000-0000-0000-000000000000'),
  geography: Geography.fromValue(primaryRegion),
  organization: Organization.fromValue('contoso'),
  project: new Project('multiregion'),
  environment: Environment.fromValue('prod'),
  instance: Instance.fromNumber(1),
});

// Define regions to deploy to
const regions = [
  { name: 'primary', location: primaryRegion, priority: 1 },
  { name: 'secondary', location: secondaryRegion, priority: 2 },
];

// Global resources stack (Traffic Manager, monitoring)
const globalStack = new ResourceGroupStack(subscriptionStack, 'GlobalStack', {
  resourceGroup: {
    resourceGroupName: `rg-multiregion-global-${environment}`,
    location: primaryRegion, // Traffic Manager is global, but stack needs a location
  },
  tags: {
    environment: environment,
    application: 'multi-region-app',
    scope: 'global',
    managedBy: 'atakora',
  },
});

// Centralized Application Insights for all regions
const globalAppInsights = new Components(globalStack, 'GlobalAppInsights', {
  name: `ai-multiregion-${environment}`,
  location: primaryRegion,
  applicationType: ApplicationType.WEB,
  kind: 'web',
  tags: {
    scope: 'global',
  },
});

// TODO: Traffic Manager Profile for global load balancing
// Uncomment when TrafficManagerProfiles construct is implemented
// const trafficManager = new TrafficManagerProfiles(globalStack, 'TrafficManager', {
//   profileName: `tm-multiregion-${environment}`,
//   trafficRoutingMethod: 'Priority',
//   dnsConfig: {
//     relativeName: `multiregion-${environment}-${Math.random().toString(36).slice(2, 6)}`,
//     ttl: 60,
//   },
//   monitorConfig: {
//     protocol: 'HTTPS',
//     port: 443,
//     path: '/health',
//     intervalInSeconds: 30,
//     toleratedNumberOfFailures: 3,
//     timeoutInSeconds: 10,
//   },
//   tags: {
//     purpose: 'global-load-balancing',
//   },
// });

// Deploy to each region
const regionalEndpoints: any[] = [];

regions.forEach((region) => {
  // Regional stack
  const regionalStack = new ResourceGroupStack(subscriptionStack, `${region.name}Stack`, {
    resourceGroup: {
      resourceGroupName: `rg-multiregion-${region.name}-${environment}`,
      location: region.location,
    },
    tags: {
      environment: environment,
      application: 'multi-region-app',
      region: region.name,
      managedBy: 'atakora',
    },
  });

  // Regional Virtual Network
  const vnet = new VirtualNetworks(regionalStack, 'RegionalVNet', {
    virtualNetworkName: `vnet-multiregion-${region.name}`,
    addressSpace: [region.name === 'primary' ? '10.0.0.0/16' : '10.1.0.0/16'],
    tags: {
      region: region.name,
    },
  });

  // App Service subnet
  const appSubnet = new Subnets(vnet, 'AppSubnet', {
    name: 'snet-app',
    addressPrefix: region.name === 'primary' ? '10.0.1.0/24' : '10.1.1.0/24',
    delegations: [
      {
        name: 'app-service-delegation',
        serviceName: 'Microsoft.Web/serverFarms',
      },
    ],
  });

  // Regional Storage Account (GRS for primary, LRS for secondary)
  const storage = new StorageAccounts(regionalStack, 'RegionalStorage', {
    storageAccountName: `stmr${region.name}${environment}${Math.random().toString(36).slice(2, 6)}`.toLowerCase(),
    sku: region.name === 'primary' ? StorageAccountSkuName.STANDARD_GZRS : StorageAccountSkuName.STANDARD_LRS,
    kind: StorageAccountKind.STORAGE_V2,
    minimumTlsVersion: TlsVersion.TLS1_2,
    enableBlobPublicAccess: false,
    tags: {
      region: region.name,
      purpose: 'regional-storage',
    },
  });

  // Regional App Service Plan
  const appServicePlan = new ServerFarms(regionalStack, 'RegionalAppPlan', {
    planName: `asp-multiregion-${region.name}-${environment}`,
    location: region.location,
    sku: ServerFarmSkuName.P1V3,
    kind: ServerFarmKind.LINUX,
    reserved: true,
    capacity: 2,
    tags: {
      region: region.name,
    },
  });

  // Regional Web App
  const webApp = new Sites(regionalStack, 'RegionalWebApp', {
    siteName: `webapp-mr-${region.name}-${environment}-${Math.random().toString(36).slice(2, 6)}`.toLowerCase(),
    location: region.location,
    serverFarmId: appServicePlan.planId,
    httpsOnly: true,
    linuxFxVersion: 'NODE|18-lts',
    alwaysOn: true,
    http20Enabled: true,
    minTlsVersion: MinTlsVersion.TLS_1_2,
    ftpsState: FtpsState.DISABLED,
    healthCheckPath: '/health',
    appSettings: [
      {
        name: 'APPINSIGHTS_INSTRUMENTATIONKEY',
        value: globalAppInsights.instrumentationKey,
      },
      {
        name: 'APPLICATIONINSIGHTS_CONNECTION_STRING',
        value: globalAppInsights.connectionString,
      },
      {
        name: 'ApplicationInsightsAgent_EXTENSION_VERSION',
        value: '~3',
      },
      {
        name: 'NODE_ENV',
        value: 'production',
      },
      {
        name: 'REGION',
        value: region.name,
      },
      {
        name: 'STORAGE_ACCOUNT_NAME',
        value: storage.storageAccountName,
      },
    ],
    tags: {
      region: region.name,
      purpose: 'regional-web-app',
    },
  });

  // Add this region's web app as Traffic Manager endpoint
  regionalEndpoints.push({
    name: `${region.name}-endpoint`,
    webAppId: webApp.siteId,
    webAppName: webApp.siteName,
    location: region.location,
    priority: region.priority,
  });
});

// TODO: Create Traffic Manager endpoints for each regional web app
// Uncomment when TrafficManagerEndpoints construct is implemented
// regionalEndpoints.forEach((endpoint) => {
//   new TrafficManagerEndpoints(globalStack, `${endpoint.name}Endpoint`, {
//     profileName: trafficManager.name,
//     endpointName: endpoint.name,
//     type: 'Microsoft.Network/trafficManagerProfiles/azureEndpoints',
//     endpointLocation: endpoint.location,
//     targetResourceId: endpoint.webAppId,
//     priority: endpoint.priority,
//     endpointStatus: 'Enabled',
//   });
// });

// Synthesize ARM templates
app.synth();

console.log(`
=============================================================
Multi-Region Application Infrastructure Synthesized
=============================================================
Environment: ${environment}
Primary Region: ${primaryRegion}
Secondary Region: ${secondaryRegion}

Global Resources:
- Application Insights: ai-multiregion-${environment}
- (Traffic Manager: Pending implementation)

Regional Deployments:
${regions.map(r => `  ${r.name.toUpperCase()} (${r.location}):
    - Resource Group: rg-multiregion-${r.name}-${environment}
    - Web App: webapp-mr-${r.name}-${environment}-######
    - Storage: stmr${r.name}${environment}######
    - App Service Plan: asp-multiregion-${r.name}-${environment}
  `).join('\n')}

Note: Traffic Manager integration commented out pending construct implementation.
Regional web apps are deployed independently. Add Traffic Manager manually or
wait for TrafficManagerProfiles construct to be implemented.

Next Steps:
1. Set environment variables (see .env.example)
2. Run: npm run deploy
3. Access each regional web app directly
4. (Future) Configure Traffic Manager for global routing

=============================================================
`);
