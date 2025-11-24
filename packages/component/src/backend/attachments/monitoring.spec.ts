/**
 * Monitoring Attachments Tests
 *
 * @module @atakora/component/backend/attachments/monitoring
 */

import { describe, it, expect } from 'vitest';
import {
  validateAppInsightsConfig,
  validateLogAnalyticsConfig,
  validateAlertsConfig,
  createDefaultAppInsightsConfig,
  createDefaultLogAnalyticsConfig,
  createDefaultAlertsConfig,
  type AppInsightsConfig,
  type LogAnalyticsConfig,
  type AlertsConfig,
} from './monitoring';

describe('Monitoring Attachments', () => {
  describe('validateAppInsightsConfig()', () => {
    it('should validate valid config', () => {
      const config: AppInsightsConfig = {
        samplingPercentage: 100,
        retentionDays: 90,
      };

      const errors = validateAppInsightsConfig(config);
      expect(errors).toEqual([]);
    });

    it('should error on negative sampling percentage', () => {
      const config: AppInsightsConfig = {
        samplingPercentage: -10,
        retentionDays: 90,
      };

      const errors = validateAppInsightsConfig(config);
      expect(errors.some((e) => e.includes('0 and 100'))).toBe(true);
    });

    it('should error on sampling percentage over 100', () => {
      const config: AppInsightsConfig = {
        samplingPercentage: 150,
        retentionDays: 90,
      };

      const errors = validateAppInsightsConfig(config);
      expect(errors.some((e) => e.includes('0 and 100'))).toBe(true);
    });

    it('should error on retention days below 30', () => {
      const config: AppInsightsConfig = {
        samplingPercentage: 100,
        retentionDays: 20,
      };

      const errors = validateAppInsightsConfig(config);
      expect(errors.some((e) => e.includes('30 and 730'))).toBe(true);
    });

    it('should error on retention days above 730', () => {
      const config: AppInsightsConfig = {
        samplingPercentage: 100,
        retentionDays: 800,
      };

      const errors = validateAppInsightsConfig(config);
      expect(errors.some((e) => e.includes('30 and 730'))).toBe(true);
    });

    it('should validate name length', () => {
      const config: AppInsightsConfig = {
        name: 'a'.repeat(300),
        samplingPercentage: 100,
        retentionDays: 90,
      };

      const errors = validateAppInsightsConfig(config);
      expect(errors.some((e) => e.includes('1 and 255'))).toBe(true);
    });
  });

  describe('validateLogAnalyticsConfig()', () => {
    it('should validate valid config', () => {
      const config: LogAnalyticsConfig = {
        sku: 'PerGB2018',
        retentionDays: 90,
      };

      const errors = validateLogAnalyticsConfig(config);
      expect(errors).toEqual([]);
    });

    it('should error on Free SKU with non-7-day retention', () => {
      const config: LogAnalyticsConfig = {
        sku: 'Free',
        retentionDays: 30,
      };

      const errors = validateLogAnalyticsConfig(config);
      expect(errors.some((e) => e.includes('7 days'))).toBe(true);
    });

    it('should allow 7 days for Free SKU', () => {
      const config: LogAnalyticsConfig = {
        sku: 'Free',
        retentionDays: 7,
      };

      const errors = validateLogAnalyticsConfig(config);
      expect(errors).toEqual([]);
    });

    it('should error on retention below 30 for paid SKU', () => {
      const config: LogAnalyticsConfig = {
        sku: 'PerGB2018',
        retentionDays: 20,
      };

      const errors = validateLogAnalyticsConfig(config);
      expect(errors.some((e) => e.includes('30 and 730'))).toBe(true);
    });

    it('should error on retention above 730 for paid SKU', () => {
      const config: LogAnalyticsConfig = {
        sku: 'PerGB2018',
        retentionDays: 800,
      };

      const errors = validateLogAnalyticsConfig(config);
      expect(errors.some((e) => e.includes('30 and 730'))).toBe(true);
    });

    it('should error on daily quota for non-PerGB2018 SKU', () => {
      const config: LogAnalyticsConfig = {
        sku: 'Free',
        retentionDays: 7,
        dailyQuotaGb: 5,
      };

      const errors = validateLogAnalyticsConfig(config);
      expect(errors.some((e) => e.includes('PerGB2018'))).toBe(true);
    });

    it('should allow daily quota for PerGB2018', () => {
      const config: LogAnalyticsConfig = {
        sku: 'PerGB2018',
        retentionDays: 90,
        dailyQuotaGb: 5,
      };

      const errors = validateLogAnalyticsConfig(config);
      expect(errors).toEqual([]);
    });

    it('should validate workspace name', () => {
      const config: LogAnalyticsConfig = {
        name: 'ab',
        sku: 'PerGB2018',
        retentionDays: 90,
      };

      const errors = validateLogAnalyticsConfig(config);
      expect(errors.some((e) => e.includes('4 and 63'))).toBe(true);
    });
  });

  describe('validateAlertsConfig()', () => {
    it('should skip validation when disabled', () => {
      const config: AlertsConfig = {
        enabled: false,
      };

      const errors = validateAlertsConfig(config);
      expect(errors).toEqual([]);
    });

    it('should validate threshold configurations', () => {
      const config: AlertsConfig = {
        enabled: true,
        responseTime: {
          critical: 3000,
          windowMinutes: 5,
        },
        errorRate: {
          warning: 5, // Should be less than critical
          critical: 3,
        },
      };

      const errors = validateAlertsConfig(config);
      expect(errors.some((e) => e.includes('less than critical'))).toBe(true);
    });

    it('should validate custom alerts', () => {
      const config: AlertsConfig = {
        enabled: true,
        customAlerts: [
          {
            name: '',
            metricName: 'test',
            severity: 1,
            threshold: {
              critical: 100,
            },
            operator: 'GreaterThan',
          },
        ],
      };

      const errors = validateAlertsConfig(config);
      expect(errors.some((e) => e.includes('must have a name'))).toBe(true);
    });

    it('should validate action groups', () => {
      const config: AlertsConfig = {
        enabled: true,
        actionGroups: [
          {
            name: 'test',
            shortName: 'test-too-long',
          },
        ],
      };

      const errors = validateAlertsConfig(config);
      expect(errors.some((e) => e.includes('12 characters'))).toBe(true);
    });

    it('should require at least one receiver', () => {
      const config: AlertsConfig = {
        enabled: true,
        actionGroups: [
          {
            name: 'test',
            shortName: 'test',
          },
        ],
      };

      const errors = validateAlertsConfig(config);
      expect(errors.some((e) => e.includes('at least one receiver'))).toBe(true);
    });

    it('should validate valid alerts config', () => {
      const config: AlertsConfig = {
        enabled: true,
        responseTime: {
          warning: 1000,
          critical: 3000,
          windowMinutes: 5,
          frequencyMinutes: 1,
        },
        actionGroups: [
          {
            name: 'alerts',
            shortName: 'alerts',
            emailReceivers: [
              {
                name: 'admin',
                emailAddress: 'admin@example.com',
              },
            ],
          },
        ],
      };

      const errors = validateAlertsConfig(config);
      expect(errors).toEqual([]);
    });

    it('should validate frequency vs window', () => {
      const config: AlertsConfig = {
        enabled: true,
        responseTime: {
          critical: 3000,
          windowMinutes: 5,
          frequencyMinutes: 10, // Cannot be greater than window
        },
      };

      const errors = validateAlertsConfig(config);
      expect(errors.some((e) => e.includes('Frequency'))).toBe(true);
    });
  });

  describe('createDefaultAppInsightsConfig()', () => {
    it('should create development defaults', () => {
      const config = createDefaultAppInsightsConfig('development');

      expect(config.samplingPercentage).toBe(10);
      expect(config.retentionDays).toBe(30);
      expect(config.enableLiveMetrics).toBe(false);
      expect(config.enableProfiler).toBe(false);
    });

    it('should create staging defaults', () => {
      const config = createDefaultAppInsightsConfig('staging');

      expect(config.samplingPercentage).toBe(100);
      expect(config.retentionDays).toBe(30);
      expect(config.enableLiveMetrics).toBe(true);
      expect(config.enableProfiler).toBe(false);
    });

    it('should create production defaults', () => {
      const config = createDefaultAppInsightsConfig('production');

      expect(config.samplingPercentage).toBe(100);
      expect(config.retentionDays).toBe(90);
      expect(config.enableLiveMetrics).toBe(true);
      expect(config.enableProfiler).toBe(true);
      expect(config.enableSnapshot).toBe(true);
    });

    it('should merge overrides', () => {
      const config = createDefaultAppInsightsConfig('production', {
        samplingPercentage: 50,
        retentionDays: 120,
      });

      expect(config.samplingPercentage).toBe(50);
      expect(config.retentionDays).toBe(120);
    });
  });

  describe('createDefaultLogAnalyticsConfig()', () => {
    it('should create development defaults', () => {
      const config = createDefaultLogAnalyticsConfig('development');

      expect(config.sku).toBe('PerGB2018');
      expect(config.retentionDays).toBe(30);
      expect(config.resourceAccessMode).toBe('workspace');
    });

    it('should create staging defaults', () => {
      const config = createDefaultLogAnalyticsConfig('staging');

      expect(config.sku).toBe('PerGB2018');
      expect(config.retentionDays).toBe(30);
      expect(config.resourceAccessMode).toBe('resource');
      expect(config.dataSources).toBeDefined();
    });

    it('should create production defaults', () => {
      const config = createDefaultLogAnalyticsConfig('production');

      expect(config.sku).toBe('PerGB2018');
      expect(config.retentionDays).toBe(90);
      expect(config.resourceAccessMode).toBe('resource');
      expect(config.dataSources).toContain('PerformanceCounter');
    });

    it('should merge overrides', () => {
      const config = createDefaultLogAnalyticsConfig('production', {
        retentionDays: 120,
        dailyQuotaGb: 10,
      });

      expect(config.retentionDays).toBe(120);
      expect(config.dailyQuotaGb).toBe(10);
    });
  });

  describe('createDefaultAlertsConfig()', () => {
    it('should create development defaults', () => {
      const config = createDefaultAlertsConfig('development');

      expect(config.enabled).toBe(false);
    });

    it('should create staging defaults', () => {
      const config = createDefaultAlertsConfig('staging');

      expect(config.enabled).toBe(true);
      expect(config.responseTime).toBeDefined();
      expect(config.errorRate).toBeDefined();
      expect(config.availability).toBeDefined();
    });

    it('should create production defaults', () => {
      const config = createDefaultAlertsConfig('production');

      expect(config.enabled).toBe(true);
      expect(config.responseTime?.warning).toBe(1000);
      expect(config.responseTime?.critical).toBe(3000);
      expect(config.cpuUsage).toBeDefined();
      expect(config.memoryUsage).toBeDefined();
    });

    it('should merge overrides', () => {
      const config = createDefaultAlertsConfig('production', {
        responseTime: {
          warning: 500,
          critical: 2000,
          windowMinutes: 10,
        },
      });

      expect(config.responseTime?.warning).toBe(500);
      expect(config.responseTime?.critical).toBe(2000);
    });
  });
});
