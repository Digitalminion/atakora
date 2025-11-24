/**
 * Development Defaults Tests
 *
 * Validates that development environment defaults meet the requirements:
 * - Serverless/consumption tier (cost-optimized)
 * - Minimal resources
 * - No unnecessary features
 * - No network isolation
 * - Minimal monitoring (10% sampling)
 *
 * @module @atakora/component/backend/defaults
 */

import { describe, it, expect } from 'vitest';
import {
  getDevelopmentDefaults,
  isDevelopment,
  getDevelopmentDefaultsWithOverrides,
} from './development';
import type { BackendDefaults } from './base';

describe('Development Defaults', () => {
  describe('getDevelopmentDefaults', () => {
    let defaults: BackendDefaults;

    beforeEach(() => {
      defaults = getDevelopmentDefaults();
    });

    describe('Storage Configuration', () => {
      it('should use locally redundant storage (Standard_LRS)', () => {
        expect(defaults.storage.account.sku).toBe('Standard_LRS');
      });

      it('should use Hot tier for storage', () => {
        expect(defaults.storage.account.tier).toBe('Hot');
      });

      it('should enforce HTTPS only', () => {
        expect(defaults.storage.account.httpsOnly).toBe(true);
      });

      it('should use minimum TLS 1.2', () => {
        expect(defaults.storage.account.minimumTlsVersion).toBe('1.2');
      });

      it('should use Serverless Cosmos DB mode', () => {
        expect(defaults.storage.database.mode).toBe('Serverless');
      });

      it('should use Session consistency level', () => {
        expect(defaults.storage.database.consistency).toBe('Session');
      });

      it('should disable backups in development', () => {
        expect(defaults.storage.database.backup.enabled).toBe(false);
      });

      it('should not enable multi-region', () => {
        expect(defaults.storage.database.multiRegion).toBe(false);
      });

      it('should not enable analytical store', () => {
        expect(defaults.storage.database.analyticalStore).toBe(false);
      });

      it('should not have throughput settings (serverless)', () => {
        expect(defaults.storage.database.throughput).toBeUndefined();
      });
    });

    describe('Compute Configuration', () => {
      it('should use Consumption Function App plan', () => {
        expect(defaults.compute.functionApp.plan).toBe('Consumption');
      });

      it('should use Node.js runtime', () => {
        expect(defaults.compute.functionApp.runtime).toBe('node');
      });

      it('should use Node.js 20', () => {
        expect(defaults.compute.functionApp.runtimeVersion).toBe('20');
      });

      it('should disable always-on (not available in Consumption)', () => {
        expect(defaults.compute.functionApp.scaling.alwaysOn).toBe(false);
      });

      it('should not have min/max instances (Consumption handles this)', () => {
        expect(defaults.compute.functionApp.scaling.minInstances).toBeUndefined();
        expect(defaults.compute.functionApp.scaling.maxInstances).toBeUndefined();
      });

      it('should not have health check endpoint', () => {
        expect(defaults.compute.functionApp.healthCheck).toBeUndefined();
      });

      it('should not have Premium SKU', () => {
        expect(defaults.compute.functionApp.sku).toBeUndefined();
      });
    });

    describe('Network Configuration', () => {
      it('should not have network isolation in development', () => {
        expect(defaults.network).toBeUndefined();
      });
    });

    describe('Monitoring Configuration', () => {
      it('should enable Application Insights', () => {
        expect(defaults.monitoring?.appInsights.enabled).toBe(true);
      });

      it('should use 10% sampling for cost optimization', () => {
        expect(defaults.monitoring?.appInsights.samplingPercentage).toBe(10);
      });

      it('should use 30 days retention', () => {
        expect(defaults.monitoring?.appInsights.retentionDays).toBe(30);
      });

      it('should disable live metrics', () => {
        expect(defaults.monitoring?.appInsights.liveMetrics).toBe(false);
      });

      it('should disable profiler', () => {
        expect(defaults.monitoring?.appInsights.profiler).toBe(false);
      });

      it('should not have Log Analytics', () => {
        expect(defaults.monitoring?.logAnalytics).toBeUndefined();
      });

      it('should not have alerts', () => {
        expect(defaults.monitoring?.alerts).toBeUndefined();
      });
    });

    describe('Performance Configuration', () => {
      it('should not have performance features', () => {
        expect(defaults.performance).toBeUndefined();
      });
    });

    describe('Cost Optimization Validation', () => {
      it('should use cost-optimized settings throughout', () => {
        // Storage: LRS (cheapest redundancy)
        expect(defaults.storage.account.sku).toBe('Standard_LRS');

        // Database: Serverless (pay per request)
        expect(defaults.storage.database.mode).toBe('Serverless');

        // Compute: Consumption (pay per execution)
        expect(defaults.compute.functionApp.plan).toBe('Consumption');

        // Monitoring: Minimal sampling
        expect(defaults.monitoring?.appInsights.samplingPercentage).toBe(10);

        // No expensive features
        expect(defaults.network).toBeUndefined();
        expect(defaults.performance).toBeUndefined();
        expect(defaults.monitoring?.logAnalytics).toBeUndefined();
      });
    });
  });

  describe('isDevelopment', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalEnvironment = process.env.ENVIRONMENT;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
      process.env.ENVIRONMENT = originalEnvironment;
    });

    it('should return true for NODE_ENV=development', () => {
      process.env.NODE_ENV = 'development';
      expect(isDevelopment()).toBe(true);
    });

    it('should return true for NODE_ENV=dev', () => {
      process.env.NODE_ENV = 'dev';
      expect(isDevelopment()).toBe(true);
    });

    it('should return true for NODE_ENV=local', () => {
      process.env.NODE_ENV = 'local';
      expect(isDevelopment()).toBe(true);
    });

    it('should return true for ENVIRONMENT=development', () => {
      delete process.env.NODE_ENV;
      process.env.ENVIRONMENT = 'development';
      expect(isDevelopment()).toBe(true);
    });

    it('should return false for NODE_ENV=production', () => {
      process.env.NODE_ENV = 'production';
      expect(isDevelopment()).toBe(false);
    });

    it('should return false for NODE_ENV=staging', () => {
      process.env.NODE_ENV = 'staging';
      expect(isDevelopment()).toBe(false);
    });

    it('should default to true when no environment is set', () => {
      delete process.env.NODE_ENV;
      delete process.env.ENVIRONMENT;
      expect(isDevelopment()).toBe(true);
    });

    it('should be case-insensitive', () => {
      process.env.NODE_ENV = 'DEVELOPMENT';
      expect(isDevelopment()).toBe(true);

      process.env.NODE_ENV = 'Dev';
      expect(isDevelopment()).toBe(true);
    });
  });

  describe('getDevelopmentDefaultsWithOverrides', () => {
    it('should allow overriding storage SKU', () => {
      const custom = getDevelopmentDefaultsWithOverrides({
        storage: {
          account: {
            sku: 'Standard_ZRS',
            tier: 'Hot',
            httpsOnly: true,
            minimumTlsVersion: '1.2',
          },
          database: {
            mode: 'Serverless',
            consistency: 'Session',
            backup: { enabled: false },
          },
        },
      });

      expect(custom.storage.account.sku).toBe('Standard_ZRS');
      // Other settings should remain
      expect(custom.storage.account.tier).toBe('Hot');
      expect(custom.storage.database.mode).toBe('Serverless');
    });

    it('should allow overriding database consistency', () => {
      const custom = getDevelopmentDefaultsWithOverrides({
        storage: {
          database: {
            consistency: 'Strong',
          },
        },
      });

      expect(custom.storage.database.consistency).toBe('Strong');
      // Other settings should remain
      expect(custom.storage.database.mode).toBe('Serverless');
      expect(custom.storage.database.backup.enabled).toBe(false);
    });

    it('should allow enabling backups', () => {
      const custom = getDevelopmentDefaultsWithOverrides({
        storage: {
          database: {
            backup: {
              enabled: true,
              type: 'Periodic',
              retentionDays: 7,
            },
          },
        },
      });

      expect(custom.storage.database.backup.enabled).toBe(true);
      expect(custom.storage.database.backup.type).toBe('Periodic');
      expect(custom.storage.database.backup.retentionDays).toBe(7);
    });

    it('should allow overriding compute scaling', () => {
      const custom = getDevelopmentDefaultsWithOverrides({
        compute: {
          functionApp: {
            scaling: {
              minInstances: 1,
              maxInstances: 5,
              alwaysOn: false,
            },
          },
        },
      });

      expect(custom.compute.functionApp.scaling.minInstances).toBe(1);
      expect(custom.compute.functionApp.scaling.maxInstances).toBe(5);
      // Other settings should remain
      expect(custom.compute.functionApp.plan).toBe('Consumption');
    });

    it('should allow adding network configuration', () => {
      const custom = getDevelopmentDefaultsWithOverrides({
        network: {
          vnet: {
            enabled: true,
            addressSpace: '10.0.0.0/16',
            subnets: [
              {
                name: 'test',
                addressRange: '10.0.1.0/24',
              },
            ],
          },
          waf: {
            enabled: false,
          },
          ddos: {
            enabled: false,
          },
        },
      });

      expect(custom.network).toBeDefined();
      expect(custom.network?.vnet.enabled).toBe(true);
      expect(custom.network?.vnet.addressSpace).toBe('10.0.0.0/16');
    });

    it('should allow increasing monitoring sampling', () => {
      const custom = getDevelopmentDefaultsWithOverrides({
        monitoring: {
          appInsights: {
            samplingPercentage: 100,
          },
        },
      });

      expect(custom.monitoring?.appInsights.samplingPercentage).toBe(100);
      // Other settings should remain
      expect(custom.monitoring?.appInsights.enabled).toBe(true);
      expect(custom.monitoring?.appInsights.retentionDays).toBe(30);
    });

    it('should preserve defaults when no overrides provided', () => {
      const custom = getDevelopmentDefaultsWithOverrides({});
      const defaults = getDevelopmentDefaults();

      expect(custom).toEqual(defaults);
    });
  });

  describe('Immutability', () => {
    it('should return a new object each time', () => {
      const defaults1 = getDevelopmentDefaults();
      const defaults2 = getDevelopmentDefaults();

      expect(defaults1).not.toBe(defaults2);
      expect(defaults1).toEqual(defaults2);
    });

    it('should not share nested objects', () => {
      const defaults1 = getDevelopmentDefaults();
      const defaults2 = getDevelopmentDefaults();

      expect(defaults1.storage).not.toBe(defaults2.storage);
      expect(defaults1.storage.account).not.toBe(defaults2.storage.account);
      expect(defaults1.storage.database).not.toBe(defaults2.storage.database);
    });
  });
});
