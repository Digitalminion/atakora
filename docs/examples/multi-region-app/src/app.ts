import { AzureApp, ResourceGroupStack } from '@atakora/lib';
import { VirtualNetworks, Subnets, TrafficManagerProfiles, Endpoints as TrafficManagerEndpoints } from '@atakora/cdk/network';
import { StorageAccounts, BlobContainers } from '@atakora/cdk/storage';
import { ServerFarms, Sites } from '@atakora/cdk/web';
import { Components } from '@atakora/cdk/insights';

/**
 * Multi-Region Application Example
 *
 * This example demonstrates a globally distributed web application with:
 * - Deployment to multiple Azure regions
 * - Azure Traffic Manager for global load balancing
 * - Regional App Services for low latency
 * - Geo-redundant storage with read access
 * - Centralized monitoring with Application Insights
 */

// Configuration
const app = new AzureApp({
  organization: process.env.ORGANIZATION || 'Contoso',
  project: process.env.PROJECT || 'MultiRegionApp',
});

const environment = process.env.ENVIRONMENT || 'prod';
const primaryRegion = process.env.PRIMARY_REGION || 'eastus2';
const secondaryRegion = process.env.SECONDARY_REGION || 'westus2';

// Define regions to deploy to
const regions = [
  { name: 'primary', location: primaryRegion, priority: 1 },
  { name: 'secondary', location: secondaryRegion, priority: 2 },
];

// Global resources stack (Traffic Manager, monitoring)
const globalStack = new ResourceGroupStack(app, 'GlobalStack', {
  resourceGroupName: `rg-multiregion-global-${environment}`,
  location: primaryRegion, // Traffic Manager is global, but stack needs a location
  tags: {
    environment: environment,
    application: 'multi-region-app',
    scope: 'global',
    managedBy: 'atakora',
  },
});

// Centralized Application Insights for all regions
const globalAppInsights = new Components(globalStack, 'GlobalAppInsights', {
  resourceName: `ai-multiregion-${environment}`,
  applicationType: 'web',
  kind: 'web',
  tags: {
    scope: 'global',
  },
});

// Traffic Manager Profile for global load balancing
const trafficManager = new TrafficManagerProfiles(globalStack, 'TrafficManager', {
  profileName: `tm-multiregion-${environment}`,
  trafficRoutingMethod: 'Priority', // Failover: primary region first
  dnsConfig: {
    relativeName: `multiregion-${environment}-${Math.random().toString(36).slice(2, 6)}`,
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
  tags: {
    purpose: 'global-load-balancing',
  },
});

// Deploy to each region
const regionalEndpoints: any[] = [];

regions.forEach((region) => {
  // Regional stack
  const regionalStack = new ResourceGroupStack(app, `${region.name}Stack`, {
    resourceGroupName: `rg-multiregion-${region.name}-${environment}`,
    location: region.location,
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
    addressSpace: {
      addressPrefixes: [region.name === 'primary' ? '10.0.0.0/16' : '10.1.0.0/16'],
    },
    tags: {
      region: region.name,
    },
  });

  // App Service subnet
  const appSubnet = new Subnets(regionalStack, 'AppSubnet', {
    virtualNetworkName: vnet.name,
    subnetName: 'snet-app',
    addressPrefix: region.name === 'primary' ? '10.0.1.0/24' : '10.1.1.0/24',
    delegations: [
      {
        name: 'app-service-delegation',
        properties: {
          serviceName: 'Microsoft.Web/serverFarms',
        },
      },
    ],
  });

  // Regional Storage Account (GRS for primary, LRS for secondary)
  const storage = new StorageAccounts(regionalStack, 'RegionalStorage', {
    accountName: `stmr${region.name}${environment}${Math.random().toString(36).slice(2, 6)}`.toLowerCase(),
    sku: {
      name: region.name === 'primary' ? 'Standard_GZRS' : 'Standard_LRS',
    },
    kind: 'StorageV2',
    enableHttpsTrafficOnly: true,
    minimumTlsVersion: 'TLS1_2',
    allowBlobPublicAccess: false,
    tags: {
      region: region.name,
      purpose: 'regional-storage',
    },
  });

  // Blob container for application data
  new BlobContainers(regionalStack, 'DataContainer', {
    accountName: storage.name,
    containerName: 'app-data',
    publicAccess: 'None',
  });

  // Regional App Service Plan
  const appServicePlan = new ServerFarms(regionalStack, 'RegionalAppPlan', {
    name: `asp-multiregion-${region.name}-${environment}`,
    sku: {
      name: 'P1v3',
      tier: 'PremiumV3',
      capacity: 2,
    },
    kind: 'linux',
    reserved: true,
    tags: {
      region: region.name,
    },
  });

  // Regional Web App
  const webApp = new Sites(regionalStack, 'RegionalWebApp', {
    name: `webapp-mr-${region.name}-${environment}-${Math.random().toString(36).slice(2, 6)}`.toLowerCase(),
    serverFarmId: appServicePlan.id,
    httpsOnly: true,
    clientAffinityEnabled: false,
    siteConfig: {
      linuxFxVersion: 'NODE|18-lts',
      alwaysOn: true,
      http20Enabled: true,
      minTlsVersion: '1.2',
      ftpsState: 'Disabled',
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
          value: storage.name,
        },
        {
          name: 'STORAGE_CONNECTION_STRING',
          value: storage.primaryConnectionString,
        },
      ],
      healthCheckPath: '/health',
    },
    virtualNetworkSubnetId: appSubnet.id,
    tags: {
      region: region.name,
      purpose: 'regional-web-app',
    },
  });

  // Add this region's web app as Traffic Manager endpoint
  regionalEndpoints.push({
    name: `${region.name}-endpoint`,
    webAppId: webApp.id,
    webAppName: webApp.name,
    location: region.location,
    priority: region.priority,
  });
});

// Create Traffic Manager endpoints for each regional web app
regionalEndpoints.forEach((endpoint) => {
  new TrafficManagerEndpoints(globalStack, `${endpoint.name}Endpoint`, {
    profileName: trafficManager.name,
    endpointName: endpoint.name,
    type: 'Microsoft.Network/trafficManagerProfiles/azureEndpoints',
    endpointLocation: endpoint.location,
    targetResourceId: endpoint.webAppId,
    priority: endpoint.priority,
    endpointStatus: 'Enabled',
  });
});

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
- Traffic Manager: ${trafficManager.name}.trafficmanager.net
- Application Insights: ai-multiregion-${environment}

Regional Deployments:
${regions.map(r => `  ${r.name.toUpperCase()} (${r.location}):
    - Resource Group: rg-multiregion-${r.name}-${environment}
    - Web App: webapp-mr-${r.name}-${environment}-######
    - Storage: stmr${r.name}${environment}######
    - App Service Plan: asp-multiregion-${r.name}-${environment}
  `).join('\n')}

Traffic Routing:
- Method: Priority (Failover)
- Primary: ${regions[0].name} (Priority ${regions[0].priority})
- Secondary: ${regions[1].name} (Priority ${regions[1].priority})

Access URL:
https://${trafficManager.name}.trafficmanager.net

Next Steps:
1. Set environment variables (see .env.example)
2. Run: npm run deploy
3. Access application via Traffic Manager URL
4. Test failover by stopping primary region app

=============================================================
`);
