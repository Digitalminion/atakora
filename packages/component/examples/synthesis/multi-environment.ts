/**
 * Example: Multi-Environment Synthesis
 *
 * Demonstrates configuring a backend for multiple environments
 * with environment-specific optimizations.
 */

import { defineBackend, defineSchema, defineAuth } from '@atakora/component';
import { storage, compute } from '@atakora/component/builders';
import { a, c, auth } from '@atakora/component';

// Schema (same across all environments)
const schema = defineSchema({
  schema: a.schema({
    User: c.model({
      id: a.id(),
      email: a.string().email().required()
    }),
    Product: c.model({
      id: a.id(),
      name: a.string().required(),
      price: a.number().required()
    })
  })
});

// Authentication (same across all environments)
const authentication = defineAuth({
  Primary: auth.entra()
    .tenant(process.env.AZURE_TENANT_ID!)
    .clientId(process.env.AZURE_CLIENT_ID!)
});

// Environment configuration helper
interface EnvironmentConfig {
  databaseMode: 'Serverless' | 'Provisioned';
  databaseThroughput?: { mode: 'autoscale' | 'manual'; maxRU?: number; RU?: number };
  multiRegion?: { regions: string[]; writeRegion: string };
  functionPlan: 'Consumption' | 'Premium';
  functionSku?: string;
  storageRedundancy: 'Standard_LRS' | 'Standard_ZRS' | 'Standard_GRS';
  enableMonitoring: boolean;
  enableNetworking: boolean;
}

const envConfigs: Record<string, EnvironmentConfig> = {
  development: {
    databaseMode: 'Serverless',
    functionPlan: 'Consumption',
    storageRedundancy: 'Standard_LRS',
    enableMonitoring: false,
    enableNetworking: false
  },
  staging: {
    databaseMode: 'Serverless',
    functionPlan: 'Premium',
    functionSku: 'EP1',
    storageRedundancy: 'Standard_ZRS',
    enableMonitoring: true,
    enableNetworking: false
  },
  production: {
    databaseMode: 'Provisioned',
    databaseThroughput: { mode: 'autoscale', maxRU: 20000 },
    multiRegion: {
      regions: ['eastus', 'westus'],
      writeRegion: 'eastus'
    },
    functionPlan: 'Premium',
    functionSku: 'EP2',
    storageRedundancy: 'Standard_GRS',
    enableMonitoring: true,
    enableNetworking: true
  }
};

// Get current environment
const environment = (process.env.NODE_ENV || 'development') as keyof typeof envConfigs;
const config = envConfigs[environment];

// Create backend with environment-specific features
const backend = defineBackend({
  schema,
  authentication,
  settings: {
    name: 'multi-env-app',
    environment,
    region: process.env.AZURE_REGION || 'eastus',
    features: {
      monitoring: config.enableMonitoring,
      networking: config.enableNetworking,
      performance: environment === 'production'
    }
  }
});

// Apply environment-specific storage configuration
const dbBuilder = storage.cosmosDb()
  .name(`multi-env-app-${environment}-db`)
  .mode(config.databaseMode);

if (config.databaseThroughput) {
  dbBuilder.throughput(config.databaseThroughput);
}

if (config.multiRegion) {
  dbBuilder.multiRegion(config.multiRegion);
}

backend.storage.database.attach(dbBuilder);

// Apply environment-specific blob storage
backend.storage.blobs.attach(
  storage.blobStorage()
    .name(`multienvapp${environment}`)
    .sku(config.storageRedundancy)
    .accessTier('Hot')
);

// Apply environment-specific function app configuration
const funcBuilder = compute.functionApp()
  .name(`multi-env-app-${environment}`)
  .plan(config.functionPlan)
  .runtime('node', '20');

if (config.functionSku) {
  funcBuilder.sku(config.functionSku);
}

if (config.functionPlan === 'Premium') {
  funcBuilder
    .alwaysOn(true)
    .preWarmedInstances(environment === 'production' ? 5 : 2)
    .maxInstances(environment === 'production' ? 20 : 10);
}

backend.compute.functionApp.attach(funcBuilder);

export { backend };

/**
 * Usage:
 *
 * Development:
 *   NODE_ENV=development atakora synth
 *
 * Staging:
 *   NODE_ENV=staging atakora synth
 *
 * Production:
 *   NODE_ENV=production atakora synth
 */
