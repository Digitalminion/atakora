/**
 * Backend Creation Performance Benchmarks
 *
 * @remarks
 * Measures performance of backend creation across different configurations.
 * Establishes baseline performance metrics for CI/CD monitoring.
 *
 * Run with: npm run test:bench
 *
 * @module @atakora/component/__tests__/performance/backend-creation
 */

import { bench, describe } from 'vitest';
import {
  createMinimalBackend,
  createStandardBackend,
  createComplexBackend,
  createProductionBackend,
  createGovernmentBackend,
} from '../fixtures/backends';

// ============================================================================
// Backend Creation Benchmarks
// ============================================================================

describe('Backend Creation Performance', () => {
  bench('create minimal backend (1 model, no auth)', () => {
    createMinimalBackend();
  });

  bench('create standard backend (4 models, basic auth)', () => {
    createStandardBackend();
  });

  bench('create complex backend (12 models, multi-auth)', () => {
    createComplexBackend();
  });

  bench('create production backend (20+ models, full auth)', () => {
    createProductionBackend();
  });

  bench('create government backend (compliance features)', () => {
    createGovernmentBackend();
  });
});

// ============================================================================
// Backend Creation with Features
// ============================================================================

describe('Backend Creation with Features', () => {
  bench('minimal backend + monitoring', () => {
    const backend = createMinimalBackend();
    // Access monitoring attachment points
    if (backend.monitoring) {
      backend.monitoring.appInsights.getConfig();
    }
  });

  bench('minimal backend + networking', () => {
    const backend = createMinimalBackend();
    // Access network attachment points
    if (backend.network) {
      backend.network.vnet.getConfig();
    }
  });

  bench('minimal backend + performance', () => {
    const backend = createMinimalBackend();
    // Access performance attachment points
    if (backend.performance) {
      backend.performance.cdn.getConfig();
    }
  });

  bench('production backend with all features', () => {
    const backend = createProductionBackend();
    // Access all feature attachment points
    if (backend.monitoring) {
      backend.monitoring.appInsights.getConfig();
    }
    if (backend.network) {
      backend.network.vnet.getConfig();
    }
    if (backend.performance) {
      backend.performance.cdn.getConfig();
    }
  });
});

// ============================================================================
// Repeated Creation (Cache Effectiveness)
// ============================================================================

describe('Repeated Backend Creation', () => {
  bench('create 10 minimal backends', () => {
    for (let i = 0; i < 10; i++) {
      createMinimalBackend();
    }
  });

  bench('create 10 standard backends', () => {
    for (let i = 0; i < 10; i++) {
      createStandardBackend();
    }
  });

  bench('create 10 complex backends', () => {
    for (let i = 0; i < 10; i++) {
      createComplexBackend();
    }
  });
});

// ============================================================================
// Attachment Point Access Performance
// ============================================================================

describe('Attachment Point Access', () => {
  const backend = createProductionBackend();

  bench('access storage attachment points', () => {
    backend.storage.account.getConfig();
    backend.storage.database.getConfig();
    backend.storage.blobs.getConfig();
  });

  bench('access compute attachment points', () => {
    backend.compute.functionApp.getConfig();
  });

  bench('access all monitoring attachment points', () => {
    if (backend.monitoring) {
      backend.monitoring.appInsights.getConfig();
      backend.monitoring.logAnalytics.getConfig();
      backend.monitoring.alerts.getConfig();
      backend.monitoring.diagnostics.getConfig();
      backend.monitoring.metrics.getConfig();
      backend.monitoring.tracing.getConfig();
      backend.monitoring.queryPacks.getConfig();
    }
  });

  bench('access all network attachment points', () => {
    if (backend.network) {
      backend.network.vnet.getConfig();
      backend.network.primary.getConfig();
      backend.network.firewall.getConfig();
      backend.network.waf.getConfig();
      backend.network.ddos.getConfig();
    }
  });

  bench('access all performance attachment points', () => {
    if (backend.performance) {
      backend.performance.cdn.getConfig();
      backend.performance.cache.getConfig();
      backend.performance.rateLimit.getConfig();
      backend.performance.compression.getConfig();
    }
  });
});

// ============================================================================
// Schema Model Access Performance
// ============================================================================

describe('Schema Model Access', () => {
  const backend = createProductionBackend();

  bench('access single schema model', () => {
    backend.schema.models.User;
  });

  bench('access all schema models', () => {
    Object.keys(backend.schema.models).forEach((modelName) => {
      backend.schema.models[modelName];
    });
  });

  bench('iterate through all models', () => {
    for (const [name, model] of Object.entries(backend.schema.models)) {
      // Access model properties
      const _ = model;
    }
  });
});

// ============================================================================
// Metadata Access Performance
// ============================================================================

describe('Metadata Access', () => {
  const backend = createProductionBackend();

  bench('access backend metadata', () => {
    backend._metadata;
  });

  bench('access all metadata properties', () => {
    backend._metadata.version;
    backend._metadata.createdAt;
    backend._metadata.environment;
    backend._metadata.modelCount;
    backend._metadata.hasAuthentication;
    backend._metadata.enabledFeatures;
  });

  bench('access settings', () => {
    backend.settings;
  });

  bench('access all settings properties', () => {
    backend.settings.name;
    backend.settings.region;
    backend.settings.resourceGroup;
    backend.settings.tags;
    backend.settings.features;
  });
});
