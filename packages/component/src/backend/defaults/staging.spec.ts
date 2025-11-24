/**
 * Staging Defaults Tests
 *
 * Validates that staging environment defaults meet the requirements:
 * - Similar to production but scaled down
 * - Lower scale (min 1 instance, max 10)
 * - Shorter retention (30 days vs 90 days)
 * - Single region (no multi-region)
 * - Lower throughput limits
 *
 * @module @atakora/component/backend/defaults
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getStagingDefaults, isStaging, getStagingDefaultsWithOverrides } from './staging';
import type { BackendDefaults } from './base';

describe('Staging Defaults', () => {
  describe('getStagingDefaults', () => {
    let defaults: BackendDefaults;

    beforeEach(() => {
      defaults = getStagingDefaults();
    });

    describe('Storage Configuration', () => {
      it('should use zone redundant storage (Standard_ZRS)', () => {
        expect(defaults.storage.account.sku).toBe('Standard_ZRS');
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

      it('should use Autoscale Cosmos DB mode', () => {
        expect(defaults.storage.database.mode).toBe('Autoscale');
      });

      it('should use Session consistency level', () => {
        expect(defaults.storage.database.consistency).toBe('Session');
      });

      it('should enable backups', () => {
        expect(defaults.storage.database.backup.enabled).toBe(true);
      });

      it('should use Periodic backup type', () => {
        expect(defaults.storage.database.backup.type).toBe('Periodic');
      });

      it('should use 7 days backup retention', () => {
        expect(defaults.storage.database.backup.retentionDays).toBe(7);
      });

      it('should backup every 4 hours', () => {
        expect(defaults.storage.database.backup.intervalMinutes).toBe(240);
      });

      it('should have lower throughput than production', () => {
        expect(defaults.storage.database.throughput?.min).toBe(1000);
        expect(defaults.storage.database.throughput?.max).toBe(10000);
      });

      it('should not enable multi-region', () => {
        expect(defaults.storage.database.multiRegion).toBe(false);
      });

      it('should not enable analytical store', () => {
        expect(defaults.storage.database.analyticalStore).toBe(false);
      });
    });

    describe('Compute Configuration', () => {
      it('should use Premium Function App plan', () => {
        expect(defaults.compute.functionApp.plan).toBe('Premium');
      });

      it('should use EP1 SKU (smallest Premium)', () => {
        expect(defaults.compute.functionApp.sku).toBe('EP1');
      });

      it('should use Node.js runtime', () => {
        expect(defaults.compute.functionApp.runtime).toBe('node');
      });

      it('should use Node.js 20', () => {
        expect(defaults.compute.functionApp.runtimeVersion).toBe('20');
      });

      it('should enable always-on', () => {
        expect(defaults.compute.functionApp.scaling.alwaysOn).toBe(true);
      });

      it('should have min 1 instance', () => {
        expect(defaults.compute.functionApp.scaling.minInstances).toBe(1);
      });

      it('should have max 10 instances', () => {
        expect(defaults.compute.functionApp.scaling.maxInstances).toBe(10);
      });

      it('should have health check endpoint', () => {
        expect(defaults.compute.functionApp.healthCheck).toBe('/api/health');
      });
    });

    describe('Network Configuration', () => {
      it('should have network isolation', () => {
        expect(defaults.network).toBeDefined();
      });

      it('should enable VNet', () => {
        expect(defaults.network?.vnet.enabled).toBe(true);
      });

      it('should use different address space from production', () => {
        expect(defaults.network?.vnet.addressSpace).toBe('10.1.0.0/16');
      });

      it('should have functions subnet', () => {
        const subnets = defaults.network?.vnet.subnets;
        expect(subnets).toBeDefined();
        const functionsSubnet = subnets?.find((s) => s.name === 'functions');
        expect(functionsSubnet).toBeDefined();
        expect(functionsSubnet?.addressRange).toBe('10.1.1.0/24');
      });

      it('should have data subnet', () => {
        const subnets = defaults.network?.vnet.subnets;
        const dataSubnet = subnets?.find((s) => s.name === 'data');
        expect(dataSubnet).toBeDefined();
        expect(dataSubnet?.addressRange).toBe('10.1.2.0/24');
      });

      it('should have service endpoints on subnets', () => {
        const subnets = defaults.network?.vnet.subnets;
        const functionsSubnet = subnets?.find((s) => s.name === 'functions');
        expect(functionsSubnet?.serviceEndpoints).toContain('Microsoft.Storage');
        expect(functionsSubnet?.serviceEndpoints).toContain('Microsoft.AzureCosmosDB');
      });

      it('should enable WAF', () => {
        expect(defaults.network?.waf.enabled).toBe(true);
      });

      it('should use WAF in Detection mode (not Prevention)', () => {
        expect(defaults.network?.waf.mode).toBe('Detection');
      });

      it('should use OWASP rule set', () => {
        expect(defaults.network?.waf.ruleSet).toBe('OWASP');
        expect(defaults.network?.waf.ruleSetVersion).toBe('3.2');
      });

      it('should disable DDoS protection (cost savings)', () => {
        expect(defaults.network?.ddos.enabled).toBe(false);
      });
    });

    describe('Monitoring Configuration', () => {
      it('should enable Application Insights', () => {
        expect(defaults.monitoring?.appInsights.enabled).toBe(true);
      });

      it('should use 100% sampling', () => {
        expect(defaults.monitoring?.appInsights.samplingPercentage).toBe(100);
      });

      it('should use 30 days retention (shorter than prod)', () => {
        expect(defaults.monitoring?.appInsights.retentionDays).toBe(30);
      });

      it('should enable live metrics', () => {
        expect(defaults.monitoring?.appInsights.liveMetrics).toBe(true);
      });

      it('should disable profiler (cost savings)', () => {
        expect(defaults.monitoring?.appInsights.profiler).toBe(false);
      });

      it('should enable Log Analytics', () => {
        expect(defaults.monitoring?.logAnalytics?.enabled).toBe(true);
      });

      it('should use 30 days retention for Log Analytics', () => {
        expect(defaults.monitoring?.logAnalytics?.retentionDays).toBe(30);
      });

      it('should use PerGB2018 SKU', () => {
        expect(defaults.monitoring?.logAnalytics?.sku).toBe('PerGB2018');
      });

      it('should have alerts configured', () => {
        expect(defaults.monitoring?.alerts).toBeDefined();
      });

      it('should have relaxed alert thresholds compared to prod', () => {
        // More lenient than production
        expect(defaults.monitoring?.alerts?.responseTime?.warning).toBe(1500);
        expect(defaults.monitoring?.alerts?.responseTime?.critical).toBe(5000);
        expect(defaults.monitoring?.alerts?.errorRate?.warning).toBe(2);
        expect(defaults.monitoring?.alerts?.errorRate?.critical).toBe(10);
        expect(defaults.monitoring?.alerts?.availability?.warning).toBe(99.5);
        expect(defaults.monitoring?.alerts?.availability?.critical).toBe(99.0);
      });
    });

    describe('Performance Configuration', () => {
      it('should not have performance features (unlike prod)', () => {
        expect(defaults.performance).toBeUndefined();
      });
    });

    describe('Production Similarity Validation', () => {
      it('should use production-like infrastructure types', () => {
        // Same infrastructure types as prod, just scaled down
        expect(defaults.storage.database.mode).toBe('Autoscale'); // Not Serverless
        expect(defaults.compute.functionApp.plan).toBe('Premium'); // Not Consumption
        expect(defaults.network).toBeDefined(); // Has network isolation
        expect(defaults.monitoring?.logAnalytics).toBeDefined(); // Has Log Analytics
      });

      it('should be scaled down from production', () => {
        // Lower scale than production would have
        expect(defaults.storage.database.throughput?.max).toBeLessThan(40000);
        expect(defaults.compute.functionApp.scaling.maxInstances).toBeLessThan(20);
        expect(defaults.monitoring?.appInsights.retentionDays).toBeLessThan(90);
      });
    });
  });

  describe('isStaging', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalEnvironment = process.env.ENVIRONMENT;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
      process.env.ENVIRONMENT = originalEnvironment;
    });

    it('should return true for NODE_ENV=staging', () => {
      process.env.NODE_ENV = 'staging';
      expect(isStaging()).toBe(true);
    });

    it('should return true for NODE_ENV=stage', () => {
      process.env.NODE_ENV = 'stage';
      expect(isStaging()).toBe(true);
    });

    it('should return true for NODE_ENV=test', () => {
      process.env.NODE_ENV = 'test';
      expect(isStaging()).toBe(true);
    });

    it('should return true for ENVIRONMENT=staging', () => {
      delete process.env.NODE_ENV;
      process.env.ENVIRONMENT = 'staging';
      expect(isStaging()).toBe(true);
    });

    it('should return false for NODE_ENV=production', () => {
      process.env.NODE_ENV = 'production';
      expect(isStaging()).toBe(false);
    });

    it('should return false for NODE_ENV=development', () => {
      process.env.NODE_ENV = 'development';
      expect(isStaging()).toBe(false);
    });

    it('should be case-insensitive', () => {
      process.env.NODE_ENV = 'STAGING';
      expect(isStaging()).toBe(true);

      process.env.NODE_ENV = 'Stage';
      expect(isStaging()).toBe(true);
    });
  });

  describe('getStagingDefaultsWithOverrides', () => {
    it('should allow overriding storage SKU', () => {
      const custom = getStagingDefaultsWithOverrides({
        storage: {
          account: {
            sku: 'Standard_LRS',
          },
        },
      });

      expect(custom.storage.account.sku).toBe('Standard_LRS');
      // Other settings should remain
      expect(custom.storage.account.tier).toBe('Hot');
      expect(custom.storage.database.mode).toBe('Autoscale');
    });

    it('should allow overriding throughput limits', () => {
      const custom = getStagingDefaultsWithOverrides({
        storage: {
          database: {
            throughput: {
              min: 2000,
              max: 20000,
            },
          },
        },
      });

      expect(custom.storage.database.throughput?.min).toBe(2000);
      expect(custom.storage.database.throughput?.max).toBe(20000);
      // Other settings should remain
      expect(custom.storage.database.mode).toBe('Autoscale');
      expect(custom.storage.database.backup.enabled).toBe(true);
    });

    it('should allow overriding compute scaling', () => {
      const custom = getStagingDefaultsWithOverrides({
        compute: {
          functionApp: {
            scaling: {
              minInstances: 2,
              maxInstances: 20,
              alwaysOn: true,
            },
          },
        },
      });

      expect(custom.compute.functionApp.scaling.minInstances).toBe(2);
      expect(custom.compute.functionApp.scaling.maxInstances).toBe(20);
      // Other settings should remain
      expect(custom.compute.functionApp.plan).toBe('Premium');
      expect(custom.compute.functionApp.sku).toBe('EP1');
    });

    it('should allow overriding network configuration', () => {
      const custom = getStagingDefaultsWithOverrides({
        network: {
          vnet: {
            addressSpace: '10.2.0.0/16',
          },
        },
      });

      expect(custom.network?.vnet.addressSpace).toBe('10.2.0.0/16');
      // Other settings should remain
      expect(custom.network?.vnet.enabled).toBe(true);
      expect(custom.network?.waf.enabled).toBe(true);
    });

    it('should allow enabling DDoS protection', () => {
      const custom = getStagingDefaultsWithOverrides({
        network: {
          ddos: {
            enabled: true,
            plan: 'Standard',
          },
        },
      });

      expect(custom.network?.ddos.enabled).toBe(true);
      expect(custom.network?.ddos.plan).toBe('Standard');
    });

    it('should allow overriding monitoring retention', () => {
      const custom = getStagingDefaultsWithOverrides({
        monitoring: {
          appInsights: {
            retentionDays: 60,
          },
          logAnalytics: {
            retentionDays: 60,
          },
        },
      });

      expect(custom.monitoring?.appInsights.retentionDays).toBe(60);
      expect(custom.monitoring?.logAnalytics?.retentionDays).toBe(60);
    });

    it('should allow overriding alert thresholds', () => {
      const custom = getStagingDefaultsWithOverrides({
        monitoring: {
          alerts: {
            responseTime: {
              warning: 1000,
              critical: 3000,
            },
          },
        },
      });

      expect(custom.monitoring?.alerts?.responseTime?.warning).toBe(1000);
      expect(custom.monitoring?.alerts?.responseTime?.critical).toBe(3000);
      // Other thresholds should remain
      expect(custom.monitoring?.alerts?.errorRate?.warning).toBe(2);
    });

    it('should preserve defaults when no overrides provided', () => {
      const custom = getStagingDefaultsWithOverrides({});
      const defaults = getStagingDefaults();

      expect(custom).toEqual(defaults);
    });
  });

  describe('Immutability', () => {
    it('should return a new object each time', () => {
      const defaults1 = getStagingDefaults();
      const defaults2 = getStagingDefaults();

      expect(defaults1).not.toBe(defaults2);
      expect(defaults1).toEqual(defaults2);
    });

    it('should not share nested objects', () => {
      const defaults1 = getStagingDefaults();
      const defaults2 = getStagingDefaults();

      expect(defaults1.storage).not.toBe(defaults2.storage);
      expect(defaults1.compute).not.toBe(defaults2.compute);
      expect(defaults1.network).not.toBe(defaults2.network);
      expect(defaults1.monitoring).not.toBe(defaults2.monitoring);
    });
  });
});
