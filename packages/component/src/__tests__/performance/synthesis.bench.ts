/**
 * Synthesis Performance Benchmarks
 *
 * @remarks
 * Measures performance of the synthesis pipeline.
 * Tests resource generation, validation, and output creation.
 *
 * @module @atakora/component/__tests__/performance/synthesis
 */

import { bench, describe } from 'vitest';
import {
  createMinimalBackend,
  createStandardBackend,
  createComplexBackend,
  createProductionBackend,
} from '../fixtures/backends';
import {
  createMockSynthesisContext,
  simulateResourceSynthesis,
} from '../helpers/integration-helpers';

// ============================================================================
// Synthesis Context Creation
// ============================================================================

describe('Synthesis Context Creation', () => {
  bench('create synthesis context for minimal backend', () => {
    const backend = createMinimalBackend();
    createMockSynthesisContext(backend);
  });

  bench('create synthesis context for standard backend', () => {
    const backend = createStandardBackend();
    createMockSynthesisContext(backend);
  });

  bench('create synthesis context for complex backend', () => {
    const backend = createComplexBackend();
    createMockSynthesisContext(backend);
  });

  bench('create synthesis context for production backend', () => {
    const backend = createProductionBackend();
    createMockSynthesisContext(backend);
  });
});

// ============================================================================
// Resource Synthesis Performance
// ============================================================================

describe('Single Resource Synthesis', () => {
  const backend = createMinimalBackend();
  const context = createMockSynthesisContext(backend);

  bench('synthesize storage account', () => {
    simulateResourceSynthesis(
      context,
      'Microsoft.Storage/storageAccounts',
      'teststorage',
      {
        sku: { name: 'Standard_LRS' },
        kind: 'StorageV2',
      }
    );
  });

  bench('synthesize cosmos db account', () => {
    simulateResourceSynthesis(
      context,
      'Microsoft.DocumentDB/databaseAccounts',
      'testcosmos',
      {
        databaseAccountOfferType: 'Standard',
        locations: [{ locationName: 'eastus' }],
      }
    );
  });

  bench('synthesize function app', () => {
    simulateResourceSynthesis(
      context,
      'Microsoft.Web/sites',
      'testfunctionapp',
      {
        kind: 'functionapp',
        serverFarmId: '/subscriptions/test/resourceGroups/test/providers/Microsoft.Web/serverfarms/test',
      }
    );
  });
});

describe('Batch Resource Synthesis', () => {
  bench('synthesize 10 storage accounts', () => {
    const backend = createMinimalBackend();
    const context = createMockSynthesisContext(backend);

    for (let i = 0; i < 10; i++) {
      simulateResourceSynthesis(
        context,
        'Microsoft.Storage/storageAccounts',
        `storage${i}`,
        {
          sku: { name: 'Standard_LRS' },
          kind: 'StorageV2',
        }
      );
    }
  });

  bench('synthesize complete infrastructure stack', () => {
    const backend = createStandardBackend();
    const context = createMockSynthesisContext(backend);

    // Storage Account
    simulateResourceSynthesis(
      context,
      'Microsoft.Storage/storageAccounts',
      'storage',
      {
        sku: { name: 'Standard_LRS' },
        kind: 'StorageV2',
      }
    );

    // Cosmos DB
    simulateResourceSynthesis(
      context,
      'Microsoft.DocumentDB/databaseAccounts',
      'cosmos',
      {
        databaseAccountOfferType: 'Standard',
        locations: [{ locationName: 'eastus' }],
      }
    );

    // App Service Plan
    simulateResourceSynthesis(
      context,
      'Microsoft.Web/serverfarms',
      'appserviceplan',
      {
        sku: { name: 'Y1', tier: 'Dynamic' },
      }
    );

    // Function App
    simulateResourceSynthesis(
      context,
      'Microsoft.Web/sites',
      'functionapp',
      {
        kind: 'functionapp',
        serverFarmId: '/subscriptions/test/resourceGroups/test/providers/Microsoft.Web/serverfarms/appserviceplan',
      }
    );
  });

  bench('synthesize production infrastructure stack', () => {
    const backend = createProductionBackend();
    const context = createMockSynthesisContext(backend);

    // Core infrastructure (20+ resources)
    const resources = [
      { type: 'Microsoft.Storage/storageAccounts', name: 'storage' },
      { type: 'Microsoft.DocumentDB/databaseAccounts', name: 'cosmos' },
      { type: 'Microsoft.Web/serverfarms', name: 'plan' },
      { type: 'Microsoft.Web/sites', name: 'functionapp' },
      { type: 'Microsoft.Network/virtualNetworks', name: 'vnet' },
      { type: 'Microsoft.Network/networkSecurityGroups', name: 'nsg' },
      { type: 'Microsoft.OperationalInsights/workspaces', name: 'logs' },
      { type: 'Microsoft.Insights/components', name: 'appinsights' },
      { type: 'Microsoft.Cdn/profiles', name: 'cdn' },
      { type: 'Microsoft.Cache/redis', name: 'cache' },
      { type: 'Microsoft.KeyVault/vaults', name: 'keyvault' },
      { type: 'Microsoft.Network/applicationGateways', name: 'appgateway' },
      { type: 'Microsoft.Network/frontDoors', name: 'frontdoor' },
      { type: 'Microsoft.Network/ddosProtectionPlans', name: 'ddos' },
      { type: 'Microsoft.Insights/metricAlerts', name: 'alert1' },
      { type: 'Microsoft.Insights/metricAlerts', name: 'alert2' },
      { type: 'Microsoft.Insights/metricAlerts', name: 'alert3' },
      { type: 'Microsoft.Insights/actionGroups', name: 'actiongroup' },
      { type: 'Microsoft.Security/securityContacts', name: 'securitycontact' },
      { type: 'Microsoft.Authorization/roleAssignments', name: 'roleassignment' },
    ];

    resources.forEach((resource) => {
      simulateResourceSynthesis(context, resource.type, resource.name, {});
    });
  });
});

// ============================================================================
// Resource Lookup Performance
// ============================================================================

describe('Resource Lookup', () => {
  const backend = createProductionBackend();
  const context = createMockSynthesisContext(backend);

  // Create 100 resources
  for (let i = 0; i < 100; i++) {
    simulateResourceSynthesis(
      context,
      'Microsoft.Storage/storageAccounts',
      `storage${i}`,
      { sku: { name: 'Standard_LRS' } }
    );
  }

  bench('lookup single resource', () => {
    context.resources.get('Microsoft.Storage/storageAccounts/storage50');
  });

  bench('lookup 10 resources', () => {
    for (let i = 0; i < 10; i++) {
      context.resources.get(`Microsoft.Storage/storageAccounts/storage${i}`);
    }
  });

  bench('iterate all resources', () => {
    for (const [key, value] of context.resources.entries()) {
      const _ = value;
    }
  });
});

// ============================================================================
// Large Schema Synthesis
// ============================================================================

describe('Large Schema Synthesis', () => {
  bench('synthesize resources for 20+ model schema', () => {
    const backend = createProductionBackend();
    const context = createMockSynthesisContext(backend);

    // Create containers for all CRUD models
    const models = Object.keys(backend.schema.models);
    models.forEach((modelName) => {
      simulateResourceSynthesis(
        context,
        'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers',
        modelName,
        {
          partitionKey: {
            paths: ['/id'],
            kind: 'Hash',
          },
        }
      );
    });
  });

  bench('synthesize complete backend with 20+ models', () => {
    const backend = createProductionBackend();
    const context = createMockSynthesisContext(backend);

    // Core infrastructure
    simulateResourceSynthesis(
      context,
      'Microsoft.Storage/storageAccounts',
      'storage',
      {}
    );
    simulateResourceSynthesis(
      context,
      'Microsoft.DocumentDB/databaseAccounts',
      'cosmos',
      {}
    );
    simulateResourceSynthesis(context, 'Microsoft.Web/serverfarms', 'plan', {});
    simulateResourceSynthesis(context, 'Microsoft.Web/sites', 'functionapp', {});

    // Model-specific resources
    const models = Object.keys(backend.schema.models);
    models.forEach((modelName) => {
      // Container
      simulateResourceSynthesis(
        context,
        'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers',
        modelName,
        {}
      );

      // Function
      simulateResourceSynthesis(
        context,
        'Microsoft.Web/sites/functions',
        `${modelName}Function`,
        {}
      );
    });
  });
});
