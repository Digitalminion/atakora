import {
  App,
  SubscriptionStack,
  type IResourceGroup,
  Subscription,
  Geography,
  Organization,
  Project,
  Environment,
  Instance,
  ResourceGroupStack,
} from '@atakora/cdk';
import { ResourceGroups } from '@atakora/cdk/resources';
import { DatabaseAccounts } from '@atakora/cdk/documentdb';

import { logAnalytics } from './log-analytics/resource';
import { vnet } from './networking/resource';
// import { dataServices } from './data/resource';    // REMOVED: Backend pattern creates Cosmos DB
// import { functionsApp } from './functions/resource'; // REMOVED: Backend pattern creates Function App
import { createCrudBackend } from './crud-backend';

/**
 * ColorAI Backend Configuration
 *
 * @remarks
 * This file orchestrates the Azure infrastructure for ColorAI.
 * Environment is determined by the AZURE_ENVIRONMENT variable (set by CI/CD or CLI).
 *
 * Architecture:
 * 1. App (root construct)
 * 2. SubscriptionStack (environment-specific)
 * 3. Platform ResourceGroup (single RG for all resources)
 * 4. Foundation ResourceGroupStack (deployment cluster)
 *    ├── Log Analytics Workspace
 *    ├── Virtual Network (with subnets and NSGs)
 *    ├── Data Services (Storage, Key Vault, Cosmos DB, Search, OpenAI)
 *    │   └── Each with Private Endpoint and Private DNS Zone
 *    └── Functions App (Azure Functions serverless compute)
 *        ├── App Service Plan (Consumption/Premium)
 *        ├── Storage Account (dedicated for function runtime - auto-created)
 *        └── Function App (with System-Assigned Managed Identity)
 *
 * Note: Per ADR-001, Functions App creates its own dedicated storage account
 *       separate from application data storage for proper isolation.
 */

// Read environment configuration from environment variables or use defaults
const environmentName = process.env.AZURE_ENVIRONMENT ?? process.env.NODE_ENV ?? 'nonprod';
const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID ?? '00000000-0000-0000-0000-000000000000';
const tenantId = process.env.AZURE_TENANT_ID ?? '00000000-0000-0000-0000-000000000000';
const geography = process.env.AZURE_GEOGRAPHY ?? 'eastus2';
const instanceNumber = parseInt(process.env.AZURE_INSTANCE ?? '6', 10);

// Step 1: Create App (root construct)
const app = new App();

// Step 2: Create subscription stack (environment-agnostic)
const stack = new SubscriptionStack(app, 'ColorAI', {
  subscription: Subscription.fromId(subscriptionId),
  geography: Geography.fromValue(geography),
  organization: new Organization({
    value: 'Digital Products',
    resourceName: 'digitalproducts',
  }),
  project: new Project('colorai'),
  environment: Environment.fromValue(environmentName),
  instance: Instance.fromNumber(instanceNumber),
});

// Step 3: Create the single platform resource group
// Generated name: rg-pl-digitalproducts-colorai-{env}-{geo}-{inst}
const platformRG: IResourceGroup = new ResourceGroups(stack, 'pl', {
  tags: {
    purpose: 'platform-infrastructure',
    environment: environmentName,
  },
});

// Step 4: Create foundation ResourceGroupStack for deployment ordering
// Resources created within this stack will be deployed as a unit
const foundation = new ResourceGroupStack(stack, 'Foundation', {
  resourceGroup: platformRG,
});

// Step 5: Deploy CRUD APIs with Backend Pattern FIRST
// IMPORTANT: Backend must be added to stack BEFORE any other resources to properly
// mark the scope as backend-managed. This prevents components from creating their
// own resources in traditional mode.
//
// Uses the new backend pattern from @atakora/component to efficiently share
// resources across multiple CRUD APIs. This replaces the commented-out
// FeedbackCrud and LabDatasetCrud with a modern, resource-efficient approach.
const crudBackend = createCrudBackend({
  geography,
  environmentName,
  databaseName: 'colorai-db',
  enableMonitoring: false, // Disable component-level monitoring (use shared monitoring below)
  logRetentionInDays: 90,
  tags: {
    purpose: 'crud-apis',
    environment: environmentName,
  },
});

// Add backend to foundation stack FIRST before adding other resources
crudBackend.addToStack(foundation);

// Step 6: Deploy foundation resources within the foundation stack
// These resources are created AFTER the backend to avoid interfering with
// backend-managed scope detection
const logAnalyticsWorkspace = logAnalytics(foundation, platformRG);
const virtualNetwork = vnet(foundation, platformRG);

// Step 7: Deploy data services (COMMENTED OUT - Backend pattern creates Cosmos DB)
// Each service creates its own Private Endpoint and Private DNS Zone
// Get the private endpoint subnet from the virtual network
// const privateEndpointSubnet = virtualNetwork.getSubnet('PrivateEndpointSubnet');
// if (!privateEndpointSubnet) {
//   throw new Error(
//     'PrivateEndpointSubnet not found in virtual network. Ensure the subnet is created in networking/resource.ts'
//   );
// }

// REMOVED: Backend pattern creates its own Cosmos DB
// The createCrudBackend() call above creates a shared Cosmos DB account
// with containers for each CRUD API. Creating a separate Cosmos DB here
// would be a duplicate resource.
//
// If you need other data services (Storage, KeyVault, Search, OpenAI),
// uncomment and modify dataServices() to exclude Cosmos DB.
// const data = dataServices(
//   foundation,
//   platformRG,
//   privateEndpointSubnet,
//   logAnalyticsWorkspace.id,
//   tenantId
// );

// Step 8: Deploy Functions App (COMMENTED OUT - Backend pattern creates Function App)
// REMOVED: Backend pattern creates its own Function App
// The createCrudBackend() call above creates a shared Function App
// with all CRUD operations. Creating a separate Function App here
// would be a duplicate resource.
//
// Per ADR-001 (Azure Functions App Storage Separation), the Functions App
// creates its own dedicated storage account for runtime operations.
// This ensures proper isolation from application data storage.
// const functions = functionsApp(
//   foundation,
//   platformRG,
//   logAnalyticsWorkspace.id
// );

// Exports
export {
  app,
  stack,
  platformRG,
  foundation,
  logAnalyticsWorkspace,
  virtualNetwork,
  // data,        // REMOVED: Backend pattern creates its own Cosmos DB
  // functions,   // REMOVED: Backend pattern creates its own Function App
  crudBackend,
};

// Export CRUD APIs for easy access
export const feedbackApi = crudBackend.components.feedbackApi;
export const labDatasetApi = crudBackend.components.labDatasetApi;
