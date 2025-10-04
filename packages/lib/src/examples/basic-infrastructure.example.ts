/**
 * Example: Basic Azure Infrastructure Setup
 *
 * @remarks
 * This example demonstrates how to use the Azure ARM construct library
 * to create a basic infrastructure setup with auto-naming and sensible defaults.
 *
 * This is a reference implementation showing the intended usage patterns.
 * It's not meant to be executed, but serves as documentation and validation
 * of the API design.
 *
 * @packageDocumentation
 */

import {
  App,
  SubscriptionStack,
  ResourceGroup,
  VirtualNetwork,
  Subscription,
  Geography,
  Organization,
  Project,
  Environment,
  Instance,
} from '../index';

/**
 * Creates a basic infrastructure setup following Azure best practices.
 *
 * @remarks
 * This example creates:
 * - 1 Subscription Stack (foundation)
 * - 2 Resource Groups (network, application)
 * - 1 Virtual Network with multiple address spaces
 *
 * All names are auto-generated using the naming convention system.
 * Tags are inherited and merged through the hierarchy.
 */
export function createBasicInfrastructure(): App {
  // Initialize the app (root of construct tree)
  const app = new App();

  // Create subscription stack with organizational context
  const foundation = new SubscriptionStack(app, 'Foundation', {
    subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
    geography: Geography.fromValue('eastus'),
    organization: Organization.fromValue('digital-products'),
    project: new Project('colorai'),
    environment: Environment.fromValue('nonprod'),
    instance: Instance.fromNumber(1),
    tags: {
      managed_by: 'azure-arm-priv',
      cost_center: '1234',
      department: 'engineering',
    },
  });

  // Create resource groups with auto-generated names
  // Name will be: "rg-dp-colorai-networkrg-nonprod-eus-01"
  const networkRG = new ResourceGroup(foundation, 'NetworkRG', {
    tags: {
      purpose: 'networking',
    },
  });

  // Name will be: "rg-dp-colorai-applicationrg-nonprod-eus-01"
  const appRG = new ResourceGroup(foundation, 'ApplicationRG', {
    tags: {
      purpose: 'applications',
    },
  });

  // Create virtual network in network resource group
  // Name will be: "vnet-dp-colorai-mainvnet-nonprod-eus-01"
  const vnet = new VirtualNetwork(networkRG, 'MainVNet', {
    addressSpace: '10.0.0.0/16',
    dnsServers: ['10.0.0.4', '10.0.0.5'],
    tags: {
      tier: 'infrastructure',
    },
  });

  console.log('Infrastructure created:');
  console.log(`  Subscription Stack: ${foundation.node.id}`);
  console.log(`  Network RG: ${networkRG.resourceGroupName}`);
  console.log(`  Application RG: ${appRG.resourceGroupName}`);
  console.log(`  VNet: ${vnet.virtualNetworkName}`);
  console.log(`  VNet Address Space: ${vnet.addressSpace.addressPrefixes.join(', ')}`);

  return app;
}

/**
 * Creates a ColorAI-style infrastructure setup.
 *
 * @remarks
 * This example follows the ColorAI reference architecture:
 * - 5 Resource Groups (foundation, connectivity, data, application, monitoring)
 * - 1 Virtual Network with 4 subnets (gateway, application, data, private-endpoints)
 * - All resources follow the naming convention
 * - Tags are properly inherited and merged
 */
export function createColorAIInfrastructure(): App {
  const app = new App();

  // Create foundation stack
  const foundation = new SubscriptionStack(app, 'Foundation', {
    subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
    geography: Geography.fromValue('eastus'),
    organization: Organization.fromValue('digital-products'),
    project: new Project('colorai'),
    environment: Environment.fromValue('nonprod'),
    instance: Instance.fromNumber(1),
    tags: {
      managed_by: 'terraform',
      project: 'colorai',
      environment: 'nonprod',
    },
  });

  // Create 5 resource groups following ColorAI pattern
  const foundationRG = new ResourceGroup(foundation, 'FoundationRG', {
    tags: { purpose: 'foundation-resources' },
  });

  const connectivityRG = new ResourceGroup(foundation, 'ConnectivityRG', {
    tags: { purpose: 'networking' },
  });

  const dataRG = new ResourceGroup(foundation, 'DataRG', {
    tags: { purpose: 'data-storage' },
  });

  const applicationRG = new ResourceGroup(foundation, 'ApplicationRG', {
    tags: { purpose: 'applications' },
  });

  const monitoringRG = new ResourceGroup(foundation, 'MonitoringRG', {
    tags: { purpose: 'monitoring-logging' },
  });

  // Create main virtual network in connectivity RG
  const mainVNet = new VirtualNetwork(connectivityRG, 'MainVNet', {
    addressSpace: '10.0.0.0/16',
    tags: {
      tier: 'connectivity',
    },
  });

  // Future: Add subnets using helper method when available
  // const gatewaySubnet = mainVNet.addSubnet({
  //   name: 'subnet-gateway',
  //   addressPrefix: '10.0.0.0/24'
  // });

  console.log('ColorAI Infrastructure created:');
  console.log(`  Resource Groups: 5`);
  console.log(`    - ${foundationRG.resourceGroupName}`);
  console.log(`    - ${connectivityRG.resourceGroupName}`);
  console.log(`    - ${dataRG.resourceGroupName}`);
  console.log(`    - ${applicationRG.resourceGroupName}`);
  console.log(`    - ${monitoringRG.resourceGroupName}`);
  console.log(`  VNet: ${mainVNet.virtualNetworkName}`);
  console.log(`  VNet Location: ${mainVNet.location}`);

  return app;
}

/**
 * Creates multi-region infrastructure.
 *
 * @remarks
 * Demonstrates how to create resources across multiple Azure regions.
 */
export function createMultiRegionInfrastructure(): App {
  const app = new App();

  // East US stack
  const eastStack = new SubscriptionStack(app, 'EastStack', {
    subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
    geography: Geography.fromValue('eastus'),
    organization: Organization.fromValue('digital-products'),
    project: new Project('colorai'),
    environment: Environment.fromValue('production'),
    instance: Instance.fromNumber(1),
  });

  // West US stack
  const westStack = new SubscriptionStack(app, 'WestStack', {
    subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
    geography: Geography.fromValue('westus2'),
    organization: Organization.fromValue('digital-products'),
    project: new Project('colorai'),
    environment: Environment.fromValue('production'),
    instance: Instance.fromNumber(2),
  });

  // Create resources in East US
  const eastNetworkRG = new ResourceGroup(eastStack, 'NetworkRG');
  const eastVNet = new VirtualNetwork(eastNetworkRG, 'MainVNet', {
    addressSpace: '10.0.0.0/16',
  });

  // Create resources in West US
  const westNetworkRG = new ResourceGroup(westStack, 'NetworkRG');
  const westVNet = new VirtualNetwork(westNetworkRG, 'MainVNet', {
    addressSpace: '10.1.0.0/16',
  });

  console.log('Multi-Region Infrastructure created:');
  console.log(`  East US:`);
  console.log(`    - RG: ${eastNetworkRG.resourceGroupName}`);
  console.log(`    - VNet: ${eastVNet.virtualNetworkName} (${eastVNet.addressSpace.addressPrefixes[0]})`);
  console.log(`  West US:`);
  console.log(`    - RG: ${westNetworkRG.resourceGroupName}`);
  console.log(`    - VNet: ${westVNet.virtualNetworkName} (${westVNet.addressSpace.addressPrefixes[0]})`);

  return app;
}

/**
 * Creates infrastructure with explicit naming (L1 constructs).
 *
 * @remarks
 * Demonstrates using L1 constructs for maximum control over resource properties.
 */
export function createExplicitInfrastructure(): App {
  const app = new App();

  const stack = new SubscriptionStack(app, 'Stack', {
    subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
    geography: Geography.fromValue('eastus'),
    organization: Organization.fromValue('digital-products'),
    project: new Project('colorai'),
    environment: Environment.fromValue('nonprod'),
    instance: Instance.fromNumber(1),
  });

  // Use L1 constructs for explicit control
  const { ArmResourceGroup, ArmVirtualNetwork } = require('../resources');

  const rg = new ArmResourceGroup(stack, 'ExplicitRG', {
    resourceGroupName: 'rg-explicit-name',
    location: 'eastus',
    tags: {
      created_by: 'l1-construct',
    },
  });

  const vnet = new ArmVirtualNetwork(rg, 'ExplicitVNet', {
    virtualNetworkName: 'vnet-explicit-name',
    location: 'eastus',
    resourceGroupName: 'rg-explicit-name',
    addressSpace: {
      addressPrefixes: ['10.0.0.0/16', '10.1.0.0/16'],
    },
    subnets: [
      {
        name: 'subnet-app',
        addressPrefix: '10.0.1.0/24',
      },
      {
        name: 'subnet-data',
        addressPrefix: '10.0.2.0/24',
      },
    ],
    dhcpOptions: {
      dnsServers: ['10.0.0.4', '10.0.0.5'],
    },
    enableDdosProtection: true,
    tags: {
      created_by: 'l1-construct',
    },
  });

  console.log('Explicit Infrastructure created (L1 constructs):');
  console.log(`  RG: ${rg.resourceGroupName}`);
  console.log(`  VNet: ${vnet.virtualNetworkName}`);
  console.log(`  Subnets: ${vnet.subnets?.length || 0}`);

  return app;
}

// Note: These examples are for documentation purposes
// Actual execution would require Grace's synthesis pipeline to generate ARM templates
