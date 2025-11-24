/**
 * Attachment Point Validation Performance Benchmarks
 *
 * @remarks
 * Measures performance of attachment point operations.
 * Tests attach, detach, validation, and configuration retrieval.
 *
 * @module @atakora/component/__tests__/performance/attachment-validation
 */

import { bench, describe } from 'vitest';
import { createProductionBackend } from '../fixtures/backends';

// ============================================================================
// Attachment Point Operations
// ============================================================================

describe('Attachment Point Basic Operations', () => {
  const backend = createProductionBackend();

  bench('check if attachment point is attached', () => {
    backend.storage.account.isAttached();
  });

  bench('get default configuration', () => {
    backend.storage.account.getConfig();
  });

  bench('attach custom configuration', () => {
    backend.storage.account.attach({
      sku: 'Premium_LRS',
      enableHttpsTrafficOnly: true,
    });
  });

  bench('attach and reset cycle', () => {
    backend.storage.account.attach({
      sku: 'Premium_LRS',
    });
    backend.storage.account.reset();
  });
});

// ============================================================================
// Multiple Attachment Points
// ============================================================================

describe('Multiple Attachment Point Operations', () => {
  const backend = createProductionBackend();

  bench('attach to 10 attachment points', () => {
    backend.storage.account.attach({ sku: 'Premium_LRS' });
    backend.storage.database.attach({ throughput: 1000 });
    backend.storage.blobs.attach({ publicAccess: 'None' });
    backend.compute.functionApp.attach({ runtime: 'node' });

    if (backend.monitoring) {
      backend.monitoring.appInsights.attach({ samplingPercentage: 100 });
      backend.monitoring.logAnalytics.attach({ retentionDays: 90 });
      backend.monitoring.alerts.attach({ enabled: true });
      backend.monitoring.diagnostics.attach({ enabled: true });
      backend.monitoring.metrics.attach({ enabled: true });
      backend.monitoring.tracing.attach({ enabled: true });
    }
  });

  bench('reset 10 attachment points', () => {
    backend.storage.account.reset();
    backend.storage.database.reset();
    backend.storage.blobs.reset();
    backend.compute.functionApp.reset();

    if (backend.monitoring) {
      backend.monitoring.appInsights.reset();
      backend.monitoring.logAnalytics.reset();
      backend.monitoring.alerts.reset();
      backend.monitoring.diagnostics.reset();
      backend.monitoring.metrics.reset();
      backend.monitoring.tracing.reset();
    }
  });

  bench('get config from 10 attachment points', () => {
    backend.storage.account.getConfig();
    backend.storage.database.getConfig();
    backend.storage.blobs.getConfig();
    backend.compute.functionApp.getConfig();

    if (backend.monitoring) {
      backend.monitoring.appInsights.getConfig();
      backend.monitoring.logAnalytics.getConfig();
      backend.monitoring.alerts.getConfig();
      backend.monitoring.diagnostics.getConfig();
      backend.monitoring.metrics.getConfig();
      backend.monitoring.tracing.getConfig();
    }
  });
});

// ============================================================================
// Configuration Validation
// ============================================================================

describe('Configuration Validation', () => {
  const backend = createProductionBackend();

  bench('validate storage account config', () => {
    const config = {
      sku: 'Premium_LRS',
      enableHttpsTrafficOnly: true,
      minimumTlsVersion: 'TLS1_2',
      allowBlobPublicAccess: false,
    };
    backend.storage.account.attach(config);
  });

  bench('validate cosmos db config', () => {
    const config = {
      throughput: 1000,
      autoscale: true,
      maxThroughput: 10000,
      enableFreeTier: false,
    };
    backend.storage.database.attach(config);
  });

  bench('validate function app config', () => {
    const config = {
      runtime: 'node',
      runtimeVersion: '18',
      enableApplicationInsights: true,
      alwaysOn: true,
    };
    backend.compute.functionApp.attach(config);
  });
});

// ============================================================================
// Concurrent Attachment Operations
// ============================================================================

describe('Concurrent Attachment Operations', () => {
  bench('attach to all storage attachment points', () => {
    const backend = createProductionBackend();

    backend.storage.account.attach({ sku: 'Premium_LRS' });
    backend.storage.database.attach({ throughput: 1000 });
    backend.storage.blobs.attach({ publicAccess: 'None' });
  });

  bench('attach to all compute attachment points', () => {
    const backend = createProductionBackend();

    backend.compute.functionApp.attach({ runtime: 'node' });
  });

  bench('attach to all monitoring attachment points', () => {
    const backend = createProductionBackend();

    if (backend.monitoring) {
      backend.monitoring.appInsights.attach({ samplingPercentage: 100 });
      backend.monitoring.logAnalytics.attach({ retentionDays: 90 });
      backend.monitoring.alerts.attach({ enabled: true });
      backend.monitoring.diagnostics.attach({ enabled: true });
      backend.monitoring.metrics.attach({ enabled: true });
      backend.monitoring.tracing.attach({ enabled: true });
      backend.monitoring.queryPacks.attach({ enabled: true });
    }
  });

  bench('attach to all network attachment points', () => {
    const backend = createProductionBackend();

    if (backend.network) {
      backend.network.vnet.attach({ addressSpace: '10.0.0.0/16' });
      backend.network.primary.attach({ addressPrefix: '10.0.1.0/24' });
      backend.network.firewall.attach({ enabled: true });
      backend.network.waf.attach({ enabled: true });
      backend.network.ddos.attach({ enabled: true });
    }
  });

  bench('attach to all performance attachment points', () => {
    const backend = createProductionBackend();

    if (backend.performance) {
      backend.performance.cdn.attach({ enabled: true });
      backend.performance.cache.attach({ enabled: true });
      backend.performance.rateLimit.attach({ enabled: true });
      backend.performance.compression.attach({ enabled: true });
    }
  });
});

// ============================================================================
// Attachment State Management
// ============================================================================

describe('Attachment State Management', () => {
  bench('check attachment state for all points', () => {
    const backend = createProductionBackend();

    backend.storage.account.isAttached();
    backend.storage.database.isAttached();
    backend.storage.blobs.isAttached();
    backend.compute.functionApp.isAttached();

    if (backend.monitoring) {
      backend.monitoring.appInsights.isAttached();
      backend.monitoring.logAnalytics.isAttached();
      backend.monitoring.alerts.isAttached();
      backend.monitoring.diagnostics.isAttached();
      backend.monitoring.metrics.isAttached();
      backend.monitoring.tracing.isAttached();
      backend.monitoring.queryPacks.isAttached();
    }

    if (backend.network) {
      backend.network.vnet.isAttached();
      backend.network.primary.isAttached();
      backend.network.firewall.isAttached();
      backend.network.waf.isAttached();
      backend.network.ddos.isAttached();
    }

    if (backend.performance) {
      backend.performance.cdn.isAttached();
      backend.performance.cache.isAttached();
      backend.performance.rateLimit.isAttached();
      backend.performance.compression.isAttached();
    }
  });

  bench('repeated attach/reset cycles', () => {
    const backend = createProductionBackend();

    for (let i = 0; i < 10; i++) {
      backend.storage.account.attach({ sku: 'Premium_LRS' });
      backend.storage.account.reset();
    }
  });

  bench('rapid configuration changes', () => {
    const backend = createProductionBackend();

    backend.storage.account.attach({ sku: 'Standard_LRS' });
    backend.storage.account.attach({ sku: 'Premium_LRS' });
    backend.storage.account.attach({ sku: 'Standard_GRS' });
    backend.storage.account.attach({ sku: 'Premium_ZRS' });
    backend.storage.account.reset();
  });
});
