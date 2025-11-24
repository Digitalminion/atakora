/**
 * Tests for Production Environment Defaults
 *
 * @group unit
 * @group backend
 * @group defaults
 */

import { describe, it, expect } from 'vitest';
import {
  getProductionDefaults,
  getProductionDefaultsWithOverrides,
  validateProductionDefaults,
} from './production';
import type { BackendDefaults } from './types';

describe('Production Defaults', () => {
  describe('getProductionDefaults', () => {
    it('should return complete production defaults', () => {
      const defaults = getProductionDefaults();

      expect(defaults).toBeDefined();
      expect(defaults.storage).toBeDefined();
      expect(defaults.compute).toBeDefined();
      expect(defaults.network).toBeDefined();
      expect(defaults.monitoring).toBeDefined();
      expect(defaults.performance).toBeDefined();
    });

    it('should configure zone-redundant storage', () => {
      const defaults = getProductionDefaults();

      expect(defaults.storage.account.sku).toBe('Standard_ZRS');
      expect(defaults.storage.account.tier).toBe('Hot');
    });

    it('should configure autoscale database with appropriate throughput', () => {
      const defaults = getProductionDefaults();

      expect(defaults.storage.database.mode).toBe('Autoscale');
      expect(defaults.storage.database.throughput).toBeDefined();
      expect(defaults.storage.database.throughput?.min).toBe(4000);
      expect(defaults.storage.database.throughput?.max).toBe(40000);
    });

    it('should enable continuous backup', () => {
      const defaults = getProductionDefaults();

      expect(defaults.storage.database.backup).toBeDefined();
      expect(defaults.storage.database.backup?.enabled).toBe(true);
      expect(defaults.storage.database.backup?.type).toBe('Continuous');
      expect(defaults.storage.database.backup?.retention).toBe(30);
    });

    it('should configure multi-region deployment', () => {
      const defaults = getProductionDefaults();

      expect(defaults.storage.database.multiRegion).toBeDefined();
      expect(defaults.storage.database.multiRegion).toHaveLength(2);
      expect(defaults.storage.database.multiRegion).toContain('eastus');
      expect(defaults.storage.database.multiRegion).toContain('westus');
    });

    it('should enable analytical store', () => {
      const defaults = getProductionDefaults();

      expect(defaults.storage.database.enableAnalyticalStore).toBe(true);
    });

    it('should disable public network access', () => {
      const defaults = getProductionDefaults();

      expect(defaults.storage.database.publicNetworkAccess).toBe('Disabled');
    });

    it('should configure Premium EP2 function app', () => {
      const defaults = getProductionDefaults();

      expect(defaults.compute.functionApp.plan.type).toBe('Premium');
      expect(defaults.compute.functionApp.plan.sku).toBe('EP2');
    });

    it('should enable always on for function app', () => {
      const defaults = getProductionDefaults();

      expect(defaults.compute.functionApp.alwaysOn).toBe(true);
    });

    it('should configure high availability with min 2 instances', () => {
      const defaults = getProductionDefaults();

      expect(defaults.compute.functionApp.minInstances).toBe(2);
      expect(defaults.compute.functionApp.maxInstances).toBe(20);
    });

    it('should configure health check endpoint', () => {
      const defaults = getProductionDefaults();

      expect(defaults.compute.functionApp.healthCheck).toBe('/api/health');
    });

    it('should configure VNet with appropriate address space', () => {
      const defaults = getProductionDefaults();

      expect(defaults.network).toBeDefined();
      expect(defaults.network?.vnet.addressSpace).toBe('10.0.0.0/16');
    });

    it('should configure multiple subnets', () => {
      const defaults = getProductionDefaults();

      expect(defaults.network?.vnet.subnets).toBeDefined();
      expect(defaults.network?.vnet.subnets).toHaveLength(3);

      const subnets = defaults.network?.vnet.subnets || [];
      expect(subnets.find((s) => s.name === 'functions')).toBeDefined();
      expect(subnets.find((s) => s.name === 'data')).toBeDefined();
      expect(subnets.find((s) => s.name === 'gateway')).toBeDefined();
    });

    it('should enable DDoS protection', () => {
      const defaults = getProductionDefaults();

      expect(defaults.network?.vnet.enableDdosProtection).toBe(true);
    });

    it('should configure WAF in prevention mode', () => {
      const defaults = getProductionDefaults();

      expect(defaults.network?.waf).toBeDefined();
      expect(defaults.network?.waf?.enabled).toBe(true);
      expect(defaults.network?.waf?.mode).toBe('Prevention');
    });

    it('should configure OWASP 3.2 rule set', () => {
      const defaults = getProductionDefaults();

      expect(defaults.network?.waf?.ruleSet.type).toBe('OWASP');
      expect(defaults.network?.waf?.ruleSet.version).toBe('3.2');
    });

    it('should enable standard DDoS protection plan', () => {
      const defaults = getProductionDefaults();

      expect(defaults.network?.ddos).toBeDefined();
      expect(defaults.network?.ddos?.enabled).toBe(true);
      expect(defaults.network?.ddos?.plan).toBe('Standard');
    });

    it('should configure 100% sampling for monitoring', () => {
      const defaults = getProductionDefaults();

      expect(defaults.monitoring?.appInsights.samplingPercentage).toBe(100);
    });

    it('should configure 90-day retention', () => {
      const defaults = getProductionDefaults();

      expect(defaults.monitoring?.appInsights.retentionDays).toBe(90);
      expect(defaults.monitoring?.logAnalytics?.retentionDays).toBe(90);
    });

    it('should enable live metrics and profiler', () => {
      const defaults = getProductionDefaults();

      expect(defaults.monitoring?.appInsights.enableLiveMetrics).toBe(true);
      expect(defaults.monitoring?.appInsights.enableProfiler).toBe(true);
      expect(defaults.monitoring?.appInsights.enableSnapshotDebugger).toBe(true);
    });

    it('should configure alert thresholds', () => {
      const defaults = getProductionDefaults();

      expect(defaults.monitoring?.alerts?.responseTime).toBeDefined();
      expect(defaults.monitoring?.alerts?.responseTime?.warning).toBe(1000);
      expect(defaults.monitoring?.alerts?.responseTime?.critical).toBe(3000);

      expect(defaults.monitoring?.alerts?.errorRate).toBeDefined();
      expect(defaults.monitoring?.alerts?.errorRate?.warning).toBe(1);
      expect(defaults.monitoring?.alerts?.errorRate?.critical).toBe(5);

      expect(defaults.monitoring?.alerts?.availability).toBeDefined();
      expect(defaults.monitoring?.alerts?.availability?.warning).toBe(99.9);
      expect(defaults.monitoring?.alerts?.availability?.critical).toBe(99.5);
    });

    it('should enable CDN', () => {
      const defaults = getProductionDefaults();

      expect(defaults.performance?.cdn).toBeDefined();
      expect(defaults.performance?.cdn?.enabled).toBe(true);
      expect(defaults.performance?.cdn?.profile).toBe('Standard_Microsoft');
    });

    it('should enable compression', () => {
      const defaults = getProductionDefaults();

      expect(defaults.performance?.cdn?.compression).toBe(true);
    });

    it('should enable Redis cache', () => {
      const defaults = getProductionDefaults();

      expect(defaults.performance?.cache).toBeDefined();
      expect(defaults.performance?.cache?.enabled).toBe(true);
      expect(defaults.performance?.cache?.sku.tier).toBe('Standard');
    });

    it('should configure LRU eviction policy', () => {
      const defaults = getProductionDefaults();

      expect(defaults.performance?.cache?.evictionPolicy).toBe('allkeys-lru');
    });

    it('should disable non-SSL port for security', () => {
      const defaults = getProductionDefaults();

      expect(defaults.performance?.cache?.enableNonSslPort).toBe(false);
    });

    it('should enforce TLS 1.2', () => {
      const defaults = getProductionDefaults();

      expect(defaults.performance?.cache?.minimumTlsVersion).toBe('1.2');
    });

    it('should configure rate limiting', () => {
      const defaults = getProductionDefaults();

      expect(defaults.performance?.rateLimit).toBeDefined();
      expect(defaults.performance?.rateLimit?.enabled).toBe(true);
      expect(defaults.performance?.rateLimit?.requestsPerMinute).toBe(1000);
      expect(defaults.performance?.rateLimit?.burstSize).toBe(100);
    });

    it('should enable per-client rate limits', () => {
      const defaults = getProductionDefaults();

      expect(defaults.performance?.rateLimit?.enablePerClientLimits).toBe(true);
    });

    it('should configure block duration', () => {
      const defaults = getProductionDefaults();

      expect(defaults.performance?.rateLimit?.blockDuration).toBe(300);
    });
  });

  describe('getProductionDefaultsWithOverrides', () => {
    it('should return base defaults when no overrides provided', () => {
      const defaults = getProductionDefaultsWithOverrides({});
      const baseDefaults = getProductionDefaults();

      expect(defaults).toEqual(baseDefaults);
    });

    it('should override storage account configuration', () => {
      const overrides: Partial<BackendDefaults> = {
        storage: {
          account: {
            sku: 'Standard_GRS',
            tier: 'Cool',
            enableHttpsOnly: true,
          },
          database: getProductionDefaults().storage.database,
        },
      };

      const defaults = getProductionDefaultsWithOverrides(overrides);

      expect(defaults.storage.account.sku).toBe('Standard_GRS');
      expect(defaults.storage.account.tier).toBe('Cool');
    });

    it('should override database configuration', () => {
      const overrides: Partial<BackendDefaults> = {
        storage: {
          account: getProductionDefaults().storage.account,
          database: {
            mode: 'Provisioned',
            consistency: 'Strong',
            throughput: { min: 10000, max: 100000 },
          },
        },
      };

      const defaults = getProductionDefaultsWithOverrides(overrides);

      expect(defaults.storage.database.mode).toBe('Provisioned');
      expect(defaults.storage.database.consistency).toBe('Strong');
      expect(defaults.storage.database.throughput?.min).toBe(10000);
    });

    it('should override compute configuration', () => {
      const overrides: Partial<BackendDefaults> = {
        compute: {
          functionApp: {
            plan: { type: 'Premium', sku: 'EP3' },
            runtime: { runtime: 'node', version: '20' },
            alwaysOn: true,
            minInstances: 5,
            maxInstances: 50,
          },
        },
      };

      const defaults = getProductionDefaultsWithOverrides(overrides);

      expect(defaults.compute.functionApp.plan.sku).toBe('EP3');
      expect(defaults.compute.functionApp.minInstances).toBe(5);
      expect(defaults.compute.functionApp.maxInstances).toBe(50);
    });

    it('should override network configuration', () => {
      const overrides: Partial<BackendDefaults> = {
        network: undefined,
      };

      const defaults = getProductionDefaultsWithOverrides(overrides);

      expect(defaults.network).toBeUndefined();
    });
  });

  describe('validateProductionDefaults', () => {
    it('should validate correct production defaults', () => {
      const defaults = getProductionDefaults();
      const validation = validateProductionDefaults(defaults);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should error on LRS storage', () => {
      const defaults = getProductionDefaults();
      const invalidDefaults: BackendDefaults = {
        ...defaults,
        storage: {
          ...defaults.storage,
          account: {
            ...defaults.storage.account,
            sku: 'Standard_LRS',
          },
        },
      };

      const validation = validateProductionDefaults(invalidDefaults);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        'Production storage must use zone-redundant (ZRS) or geo-redundant (GRS) SKU'
      );
    });

    it('should error on serverless database', () => {
      const defaults = getProductionDefaults();
      const invalidDefaults: BackendDefaults = {
        ...defaults,
        storage: {
          ...defaults.storage,
          database: {
            ...defaults.storage.database,
            mode: 'Serverless',
          },
        },
      };

      const validation = validateProductionDefaults(invalidDefaults);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        'Production database should use Provisioned or Autoscale mode, not Serverless'
      );
    });

    it('should error on disabled backup', () => {
      const defaults = getProductionDefaults();
      const invalidDefaults: BackendDefaults = {
        ...defaults,
        storage: {
          ...defaults.storage,
          database: {
            ...defaults.storage.database,
            backup: {
              enabled: false,
            },
          },
        },
      };

      const validation = validateProductionDefaults(invalidDefaults);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Production database must have backup enabled');
    });

    it('should warn on consumption plan', () => {
      const defaults = getProductionDefaults();
      const warnDefaults: BackendDefaults = {
        ...defaults,
        compute: {
          functionApp: {
            ...defaults.compute.functionApp,
            plan: { type: 'Consumption' },
          },
        },
      };

      const validation = validateProductionDefaults(warnDefaults);

      expect(validation.warnings).toContain(
        'Production should use Premium or Dedicated plan for better performance'
      );
    });

    it('should warn on low minimum instances', () => {
      const defaults = getProductionDefaults();
      const warnDefaults: BackendDefaults = {
        ...defaults,
        compute: {
          functionApp: {
            ...defaults.compute.functionApp,
            minInstances: 1,
          },
        },
      };

      const validation = validateProductionDefaults(warnDefaults);

      expect(validation.warnings).toContain(
        'Production should have at least 2 minimum instances for high availability'
      );
    });

    it('should warn on missing network configuration', () => {
      const defaults = getProductionDefaults();
      const warnDefaults: BackendDefaults = {
        ...defaults,
        network: undefined,
      };

      const validation = validateProductionDefaults(warnDefaults);

      expect(validation.warnings).toContain(
        'Production should configure network isolation for security'
      );
    });

    it('should warn on WAF detection mode', () => {
      const defaults = getProductionDefaults();
      const warnDefaults: BackendDefaults = {
        ...defaults,
        network: {
          ...defaults.network!,
          waf: {
            enabled: true,
            mode: 'Detection',
            ruleSet: { type: 'OWASP', version: '3.2' },
          },
        },
      };

      const validation = validateProductionDefaults(warnDefaults);

      expect(validation.warnings).toContain(
        'Production WAF should use Prevention mode, not Detection mode'
      );
    });

    it('should error on missing monitoring', () => {
      const defaults = getProductionDefaults();
      const invalidDefaults: BackendDefaults = {
        ...defaults,
        monitoring: undefined,
      };

      const validation = validateProductionDefaults(invalidDefaults);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Production must have monitoring configured');
    });

    it('should warn on low sampling percentage', () => {
      const defaults = getProductionDefaults();
      const warnDefaults: BackendDefaults = {
        ...defaults,
        monitoring: {
          ...defaults.monitoring!,
          appInsights: {
            ...defaults.monitoring!.appInsights,
            samplingPercentage: 25,
          },
        },
      };

      const validation = validateProductionDefaults(warnDefaults);

      expect(validation.warnings).toContain(
        'Production should have at least 50% telemetry sampling'
      );
    });
  });
});
