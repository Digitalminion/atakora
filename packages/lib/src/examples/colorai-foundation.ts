/**
 * Example: ColorAI Foundation Stack
 *
 * @remarks
 * This example demonstrates the ColorAI reference architecture foundation layer.
 * It creates the core infrastructure following the production pattern from
 * avient-colorai-azure-config-nonprod.
 *
 * This example creates:
 * - 5 Resource Groups (foundation, connectivity, data, application, monitoring)
 * - 1 Virtual Network with 4 subnets
 * - 4 Network Security Groups
 * - 1 Log Analytics Workspace
 * - 5 Private DNS Zones
 *
 * @packageDocumentation
 */

import {
  App,
  SubscriptionStack,
  ResourceGroup,
  VirtualNetwork,
  Subnet,
  NetworkSecurityGroup,
  LogAnalyticsWorkspace,
  PrivateDnsZone,
  VirtualNetworkLink,
  Subscription,
  Geography,
  Organization,
  Project,
  Environment,
  Instance,
  SecurityRuleProtocol,
  SecurityRuleAccess,
  SecurityRuleDirection,
  WorkspaceSku,
} from '../index';

/**
 * Creates the ColorAI foundation infrastructure.
 *
 * @remarks
 * This example follows the ColorAI production architecture:
 *
 * **Resource Groups (5)**:
 * - Foundation: Core networking resources
 * - Connectivity: Ingress/gateway resources
 * - Data: Data services (Storage, Cosmos, etc.)
 * - Application: Application hosting (App Services, Functions)
 * - Monitoring: Observability and monitoring
 *
 * **Virtual Network**:
 * - Address space: 10.4.0.0/16 (nonprod example)
 * - Subnets:
 *   - Gateway (10.4.0.0/24) - Application Gateway
 *   - Application (10.4.1.0/24) - App Service integration
 *   - Data (10.4.2.0/24) - Data services
 *   - Private Endpoints (10.4.10.0/24) - Private endpoints
 *
 * **Private DNS Zones**:
 * - privatelink.blob.core.windows.net (Storage)
 * - privatelink.vaultcore.azure.net (Key Vault)
 * - privatelink.documents.azure.com (Cosmos DB)
 * - privatelink.search.windows.net (Azure Search)
 * - privatelink.openai.azure.com (OpenAI)
 *
 * @example
 * ```typescript
 * import { createColorAIFoundation } from './examples/colorai-foundation';
 *
 * const app = createColorAIFoundation();
 * await app.synth();
 * ```
 */
export function createColorAIFoundation(): App {
  // Initialize the app
  const app = new App();

  // Create foundation stack with ColorAI context
  const foundation = new SubscriptionStack(app, 'Foundation', {
    subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
    geography: Geography.fromValue('eastus'),
    organization: Organization.fromValue('digital-products'),
    project: new Project('colorai'),
    environment: Environment.fromValue('nonprod'),
    instance: Instance.fromNumber(1),
    tags: {
      managed_by: 'atakora',
      project: 'colorai',
      environment: 'nonprod',
      cost_center: 'engineering',
    },
  });

  // ============================================================================
  // Resource Groups (5 total)
  // ============================================================================

  const foundationRG = new ResourceGroup(foundation, 'FoundationRG', {
    tags: { purpose: 'networking' },
  });

  const connectivityRG = new ResourceGroup(foundation, 'ConnectivityRG', {
    tags: { purpose: 'ingress-gateway' },
  });

  const dataRG = new ResourceGroup(foundation, 'DataRG', {
    tags: { purpose: 'data-services' },
  });

  const applicationRG = new ResourceGroup(foundation, 'ApplicationRG', {
    tags: { purpose: 'application-hosting' },
  });

  const monitoringRG = new ResourceGroup(foundation, 'MonitoringRG', {
    tags: { purpose: 'observability' },
  });

  // ============================================================================
  // Log Analytics Workspace (shared monitoring)
  // ============================================================================

  const logAnalytics = new LogAnalyticsWorkspace(foundationRG, 'LogWorkspace', {
    sku: WorkspaceSku.PER_GB_2018,
    retentionInDays: 30,
    tags: { tier: 'monitoring' },
  });

  // ============================================================================
  // Network Security Groups (4 - one per subnet)
  // ============================================================================

  // Gateway NSG - for Application Gateway
  const gatewayNSG = new NetworkSecurityGroup(foundationRG, 'GatewayNSG', {
    securityRules: [
      {
        name: 'allow-https-inbound',
        priority: 1000,
        access: SecurityRuleAccess.ALLOW,
        direction: SecurityRuleDirection.INBOUND,
        protocol: SecurityRuleProtocol.TCP,
        sourcePortRange: '*',
        destinationPortRange: '443',
        sourceAddressPrefix: 'Internet',
        destinationAddressPrefix: '*',
        description: 'Allow HTTPS traffic from Internet to Application Gateway',
      },
      {
        name: 'allow-http-inbound',
        priority: 1010,
        access: SecurityRuleAccess.ALLOW,
        direction: SecurityRuleDirection.INBOUND,
        protocol: SecurityRuleProtocol.TCP,
        sourcePortRange: '*',
        destinationPortRange: '80',
        sourceAddressPrefix: 'Internet',
        destinationAddressPrefix: '*',
        description: 'Allow HTTP traffic (will be redirected to HTTPS)',
      },
      {
        name: 'allow-gateway-manager',
        priority: 1020,
        access: SecurityRuleAccess.ALLOW,
        direction: SecurityRuleDirection.INBOUND,
        protocol: SecurityRuleProtocol.TCP,
        sourcePortRange: '*',
        destinationPortRange: '65200-65535',
        sourceAddressPrefix: 'GatewayManager',
        destinationAddressPrefix: '*',
        description: 'Allow Gateway Manager traffic',
      },
    ],
    tags: { tier: 'connectivity' },
  });

  // Application NSG - for App Service integration
  const appServiceNSG = new NetworkSecurityGroup(foundationRG, 'AppServiceNSG', {
    securityRules: [
      {
        name: 'allow-gateway-to-app',
        priority: 1000,
        access: SecurityRuleAccess.ALLOW,
        direction: SecurityRuleDirection.INBOUND,
        protocol: SecurityRuleProtocol.TCP,
        sourcePortRange: '*',
        destinationPortRange: '443',
        sourceAddressPrefix: '10.4.0.0/24', // Gateway subnet
        destinationAddressPrefix: '*',
        description: 'Allow traffic from Application Gateway to App Services',
      },
    ],
    tags: { tier: 'application' },
  });

  // Data NSG - for data services subnet
  const dataNSG = new NetworkSecurityGroup(foundationRG, 'DataNSG', {
    securityRules: [
      {
        name: 'allow-app-to-data',
        priority: 1000,
        access: SecurityRuleAccess.ALLOW,
        direction: SecurityRuleDirection.INBOUND,
        protocol: SecurityRuleProtocol.TCP,
        sourcePortRange: '*',
        destinationPortRange: '443',
        sourceAddressPrefix: '10.4.1.0/24', // App subnet
        destinationAddressPrefix: '*',
        description: 'Allow traffic from App subnet to data services',
      },
    ],
    tags: { tier: 'data' },
  });

  // Private Endpoints NSG - for private endpoint subnet
  const privateEndpointNSG = new NetworkSecurityGroup(foundationRG, 'PrivateEndpointNSG', {
    securityRules: [
      {
        name: 'allow-vnet-to-private-endpoints',
        priority: 1000,
        access: SecurityRuleAccess.ALLOW,
        direction: SecurityRuleDirection.INBOUND,
        protocol: SecurityRuleProtocol.TCP,
        sourcePortRange: '*',
        destinationPortRange: '443',
        sourceAddressPrefix: 'VirtualNetwork',
        destinationAddressPrefix: '*',
        description: 'Allow VNet traffic to private endpoints',
      },
    ],
    tags: { tier: 'networking' },
  });

  // ============================================================================
  // Virtual Network with Subnets
  // ============================================================================

  const mainVNet = new VirtualNetwork(foundationRG, 'MainVNet', {
    addressSpace: '10.4.0.0/16',
    tags: { tier: 'networking' },
  });

  // Gateway Subnet - for Application Gateway
  const gatewaySubnet = new Subnet(mainVNet, 'GatewaySubnet', {
    addressPrefix: '10.4.0.0/24',
    networkSecurityGroup: { id: gatewayNSG.networkSecurityGroupId },
  });

  // Application Subnet - for App Service VNet integration
  const appSubnet = new Subnet(mainVNet, 'ApplicationSubnet', {
    addressPrefix: '10.4.1.0/24',
    networkSecurityGroup: { id: appServiceNSG.networkSecurityGroupId },
    delegations: [
      {
        name: 'app-service-delegation',
        serviceName: 'Microsoft.Web/serverFarms',
      },
    ],
  });

  // Data Subnet - for data services
  const dataSubnet = new Subnet(mainVNet, 'DataSubnet', {
    addressPrefix: '10.4.2.0/24',
    networkSecurityGroup: { id: dataNSG.networkSecurityGroupId },
  });

  // Private Endpoints Subnet
  const privateEndpointSubnet = new Subnet(mainVNet, 'PrivateEndpointSubnet', {
    addressPrefix: '10.4.10.0/24',
    networkSecurityGroup: { id: privateEndpointNSG.networkSecurityGroupId },
  });

  // ============================================================================
  // Private DNS Zones (5 - for Azure services)
  // ============================================================================

  const blobDnsZone = new PrivateDnsZone(foundationRG, 'BlobDnsZone', {
    zoneName: 'privatelink.blob.core.windows.net',
    tags: { service: 'storage' },
  });

  const keyVaultDnsZone = new PrivateDnsZone(foundationRG, 'KeyVaultDnsZone', {
    zoneName: 'privatelink.vaultcore.azure.net',
    tags: { service: 'keyvault' },
  });

  const cosmosDnsZone = new PrivateDnsZone(foundationRG, 'CosmosDnsZone', {
    zoneName: 'privatelink.documents.azure.com',
    tags: { service: 'cosmos' },
  });

  const searchDnsZone = new PrivateDnsZone(foundationRG, 'SearchDnsZone', {
    zoneName: 'privatelink.search.windows.net',
    tags: { service: 'search' },
  });

  const openAIDnsZone = new PrivateDnsZone(foundationRG, 'OpenAIDnsZone', {
    zoneName: 'privatelink.openai.azure.com',
    tags: { service: 'openai' },
  });

  // Link Private DNS Zones to VNet
  new VirtualNetworkLink(blobDnsZone, 'BlobDnsLink', {
    privateDnsZoneName: blobDnsZone.zoneName,
    virtualNetwork: mainVNet,
    registrationEnabled: false,
    tags: { service: 'storage' },
  });

  new VirtualNetworkLink(keyVaultDnsZone, 'KeyVaultDnsLink', {
    privateDnsZoneName: keyVaultDnsZone.zoneName,
    virtualNetwork: mainVNet,
    registrationEnabled: false,
    tags: { service: 'keyvault' },
  });

  new VirtualNetworkLink(cosmosDnsZone, 'CosmosDnsLink', {
    privateDnsZoneName: cosmosDnsZone.zoneName,
    virtualNetwork: mainVNet,
    registrationEnabled: false,
    tags: { service: 'cosmos' },
  });

  new VirtualNetworkLink(searchDnsZone, 'SearchDnsLink', {
    privateDnsZoneName: searchDnsZone.zoneName,
    virtualNetwork: mainVNet,
    registrationEnabled: false,
    tags: { service: 'search' },
  });

  new VirtualNetworkLink(openAIDnsZone, 'OpenAIDnsLink', {
    privateDnsZoneName: openAIDnsZone.zoneName,
    virtualNetwork: mainVNet,
    registrationEnabled: false,
    tags: { service: 'openai' },
  });

  // ============================================================================
  // Output Summary
  // ============================================================================

  console.log('ColorAI Foundation Infrastructure Created:');
  console.log('\nResource Groups (5):');
  console.log(`  ✓ ${foundationRG.resourceGroupName} (networking)`);
  console.log(`  ✓ ${connectivityRG.resourceGroupName} (ingress-gateway)`);
  console.log(`  ✓ ${dataRG.resourceGroupName} (data-services)`);
  console.log(`  ✓ ${applicationRG.resourceGroupName} (application-hosting)`);
  console.log(`  ✓ ${monitoringRG.resourceGroupName} (observability)`);

  console.log('\nNetworking:');
  console.log(`  ✓ VNet: ${mainVNet.virtualNetworkName} (10.4.0.0/16)`);
  console.log(`  ✓ Gateway Subnet: ${gatewaySubnet.subnetName} (10.4.0.0/24)`);
  console.log(`  ✓ Application Subnet: ${appSubnet.subnetName} (10.4.1.0/24)`);
  console.log(`  ✓ Data Subnet: ${dataSubnet.subnetName} (10.4.2.0/24)`);
  console.log(`  ✓ Private Endpoint Subnet: ${privateEndpointSubnet.subnetName} (10.4.10.0/24)`);

  console.log('\nNetwork Security Groups (4):');
  console.log(`  ✓ ${gatewayNSG.networkSecurityGroupName} (gateway)`);
  console.log(`  ✓ ${appServiceNSG.networkSecurityGroupName} (app-service)`);
  console.log(`  ✓ ${dataNSG.networkSecurityGroupName} (data)`);
  console.log(`  ✓ ${privateEndpointNSG.networkSecurityGroupName} (private-endpoints)`);

  console.log('\nMonitoring:');
  console.log(`  ✓ Log Analytics: ${logAnalytics.workspaceName}`);

  console.log('\nPrivate DNS Zones (5):');
  console.log(`  ✓ ${blobDnsZone.zoneName} (Storage)`);
  console.log(`  ✓ ${keyVaultDnsZone.zoneName} (Key Vault)`);
  console.log(`  ✓ ${cosmosDnsZone.zoneName} (Cosmos DB)`);
  console.log(`  ✓ ${searchDnsZone.zoneName} (Azure Search)`);
  console.log(`  ✓ ${openAIDnsZone.zoneName} (OpenAI)`);

  return app;
}

/**
 * Main execution (for standalone testing).
 */
if (require.main === module) {
  const app = createColorAIFoundation();
  console.log('\n✓ Foundation stack created successfully');
  console.log('  Run synthesis to generate ARM templates');
}
