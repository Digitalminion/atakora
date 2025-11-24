/**
 * Integration Tests for Monitoring with Function Configuration
 *
 * @remarks
 * Tests the complete integration of monitoring features with
 * the function configuration builder.
 */

import { describe, it, expect } from 'vitest';
import { configureFunction } from './configure-function';
import { greaterThan, lessThan } from '../common/threshold';
import { minutes, seconds } from '../common/duration';

describe('Function Monitoring Integration', () => {
  describe('Complete Configuration', () => {
    it('configures function with monitoring, metrics, and tracing', () => {
      const config = configureFunction('GenerateReport')
        .memory(1024)
        .timeout(minutes(10))
        .monitoring((alerts) =>
          alerts
            .onExecutionTime(greaterThan(minutes(8)))
            .withEmail('platform-team@company.com')
            .warn()

            .onFailureRate(greaterThan(0.05))
            .error()
        )
        .withMetrics()
        .withTracing()
        ._build();

      expect(config.name).toBe('GenerateReport');
      expect(config.memory).toBe(1024);
      expect(config.timeout).toBe(600000); // 10 minutes

      expect(config.monitoring).toBeDefined();
      expect(config.monitoring?.metrics).toBe(true);
      expect(config.monitoring?.tracing).toBe(true);
      expect(config.monitoring?.alerts).toHaveLength(2);

      expect(config.monitoring?.alerts?.[0]).toMatchObject({
        metric: 'executionTime',
        value: 480000,
        condition: 'greaterThan',
        severity: 'warn',
      });
      expect(config.monitoring?.alerts?.[0].actions).toHaveLength(1);
      expect(config.monitoring?.alerts?.[0].actions?.[0].target).toBe('platform-team@company.com');

      expect(config.monitoring?.alerts?.[1]).toMatchObject({
        metric: 'failureRate',
        value: 0.05,
        condition: 'greaterThan',
        severity: 'error',
      });
    });

    it('configures complex monitoring with multiple alert types', () => {
      const config = configureFunction('TransformData')
        .memory(2048)
        .timeout(minutes(15))
        .monitoring((alerts) =>
          alerts
            .onExecutionTime(greaterThan(minutes(12)))
            .warn()

            .onMemoryUsage(greaterThan(1800))
            .warn()

            .onFailureRate(greaterThan(0.02))
            .withEmail('data-platform@company.com')
            .withWebhook('https://api.company.com/alerts')
            .critical()
        )
        .withMetrics()
        .withTracing()
        ._build();

      expect(config.monitoring?.alerts).toHaveLength(3);

      // Execution time alert
      expect(config.monitoring?.alerts?.[0]).toMatchObject({
        metric: 'executionTime',
        value: 720000, // 12 minutes
        severity: 'warn',
      });

      // Memory usage alert
      expect(config.monitoring?.alerts?.[1]).toMatchObject({
        metric: 'memoryUsage',
        value: 1800,
        severity: 'warn',
      });

      // Failure rate alert with actions
      expect(config.monitoring?.alerts?.[2]).toMatchObject({
        metric: 'failureRate',
        value: 0.02,
        severity: 'critical',
      });
      expect(config.monitoring?.alerts?.[2].actions).toHaveLength(2);
      expect(config.monitoring?.alerts?.[2].actions?.[0].type).toBe('email');
      expect(config.monitoring?.alerts?.[2].actions?.[1].type).toBe('webhook');
    });
  });

  describe('Monitoring Only (No Alerts)', () => {
    it('enables metrics without alerts', () => {
      const config = configureFunction('QuickFunction').withMetrics()._build();

      expect(config.monitoring?.metrics).toBe(true);
      expect(config.monitoring?.tracing).toBeUndefined();
      expect(config.monitoring?.alerts).toBeUndefined();
    });

    it('enables tracing without alerts', () => {
      const config = configureFunction('TracedFunction').withTracing()._build();

      expect(config.monitoring?.tracing).toBe(true);
      expect(config.monitoring?.metrics).toBeUndefined();
      expect(config.monitoring?.alerts).toBeUndefined();
    });

    it('enables both metrics and tracing', () => {
      const config = configureFunction('MonitoredFunction').withMetrics().withTracing()._build();

      expect(config.monitoring?.metrics).toBe(true);
      expect(config.monitoring?.tracing).toBe(true);
      expect(config.monitoring?.alerts).toBeUndefined();
    });
  });

  describe('Alerts Only (No Metrics/Tracing)', () => {
    it('configures alerts without metrics or tracing', () => {
      const config = configureFunction('AlertOnlyFunction')
        .monitoring((alerts) => alerts.onExecutionTime(greaterThan(minutes(5))).warn())
        ._build();

      expect(config.monitoring?.alerts).toHaveLength(1);
      expect(config.monitoring?.metrics).toBeUndefined();
      expect(config.monitoring?.tracing).toBeUndefined();
    });
  });

  describe('Alert Severity Levels', () => {
    it('creates info level alert', () => {
      const config = configureFunction('InfoAlertFunction')
        .monitoring((alerts) => alerts.onExecutionTime(greaterThan(seconds(30))).info())
        ._build();

      expect(config.monitoring?.alerts?.[0].severity).toBe('info');
    });

    it('creates warn level alert', () => {
      const config = configureFunction('WarnAlertFunction')
        .monitoring((alerts) => alerts.onExecutionTime(greaterThan(minutes(5))).warn())
        ._build();

      expect(config.monitoring?.alerts?.[0].severity).toBe('warn');
    });

    it('creates error level alert', () => {
      const config = configureFunction('ErrorAlertFunction')
        .monitoring((alerts) => alerts.onFailureRate(greaterThan(0.05)).error())
        ._build();

      expect(config.monitoring?.alerts?.[0].severity).toBe('error');
    });

    it('creates critical level alert', () => {
      const config = configureFunction('CriticalAlertFunction')
        .monitoring((alerts) => alerts.onFailureRate(greaterThan(0.1)).critical())
        ._build();

      expect(config.monitoring?.alerts?.[0].severity).toBe('critical');
    });
  });

  describe('Alert Actions', () => {
    it('adds email action', () => {
      const config = configureFunction('EmailAlertFunction')
        .monitoring((alerts) =>
          alerts
            .onExecutionTime(greaterThan(minutes(5)))
            .withEmail('team@company.com')
            .warn()
        )
        ._build();

      expect(config.monitoring?.alerts?.[0].actions).toHaveLength(1);
      expect(config.monitoring?.alerts?.[0].actions?.[0]).toMatchObject({
        type: 'email',
        target: 'team@company.com',
      });
    });

    it('adds multiple email actions', () => {
      const config = configureFunction('MultiEmailFunction')
        .monitoring((alerts) =>
          alerts
            .onExecutionTime(greaterThan(minutes(5)))
            .withEmail('team@company.com')
            .withEmail('ops@company.com')
            .warn()
        )
        ._build();

      expect(config.monitoring?.alerts?.[0].actions).toHaveLength(2);
    });

    it('adds webhook action', () => {
      const config = configureFunction('WebhookAlertFunction')
        .monitoring((alerts) =>
          alerts
            .onFailureRate(greaterThan(0.05))
            .withWebhook('https://api.company.com/alerts')
            .critical()
        )
        ._build();

      expect(config.monitoring?.alerts?.[0].actions?.[0]).toMatchObject({
        type: 'webhook',
        target: 'https://api.company.com/alerts',
      });
    });

    it('adds SMS action', () => {
      const config = configureFunction('SMSAlertFunction')
        .monitoring((alerts) =>
          alerts.onFailureRate(greaterThan(0.1)).withSMS('+1234567890').critical()
        )
        ._build();

      expect(config.monitoring?.alerts?.[0].actions?.[0]).toMatchObject({
        type: 'sms',
        target: '+1234567890',
      });
    });

    it('adds mixed actions', () => {
      const config = configureFunction('MixedActionsFunction')
        .monitoring((alerts) =>
          alerts
            .onExecutionTime(greaterThan(minutes(10)))
            .withEmail('team@company.com')
            .withWebhook('https://api.company.com/alerts')
            .withSMS('+1234567890')
            .critical()
        )
        ._build();

      expect(config.monitoring?.alerts?.[0].actions).toHaveLength(3);
      expect(config.monitoring?.alerts?.[0].actions?.[0].type).toBe('email');
      expect(config.monitoring?.alerts?.[0].actions?.[1].type).toBe('webhook');
      expect(config.monitoring?.alerts?.[0].actions?.[2].type).toBe('sms');
    });
  });

  describe('Threshold Types', () => {
    it('uses numeric thresholds', () => {
      const config = configureFunction('NumericThresholdFunction')
        .monitoring((alerts) =>
          alerts
            .onExecutionTime(greaterThan(600000)) // 10 minutes in ms
            .warn()
        )
        ._build();

      expect(config.monitoring?.alerts?.[0].value).toBe(600000);
    });

    it('uses Duration thresholds', () => {
      const config = configureFunction('DurationThresholdFunction')
        .monitoring((alerts) => alerts.onExecutionTime(greaterThan(minutes(10))).warn())
        ._build();

      expect(config.monitoring?.alerts?.[0].value).toBe(600000);
    });

    it('uses greaterThan operator', () => {
      const config = configureFunction('GreaterThanFunction')
        .monitoring((alerts) => alerts.onExecutionTime(greaterThan(minutes(5))).warn())
        ._build();

      expect(config.monitoring?.alerts?.[0].condition).toBe('greaterThan');
    });

    it('uses lessThan operator', () => {
      const config = configureFunction('LessThanFunction')
        .monitoring((alerts) => alerts.onExecutionTime(lessThan(seconds(30))).info())
        ._build();

      expect(config.monitoring?.alerts?.[0].condition).toBe('lessThan');
    });
  });

  describe('Metric Types', () => {
    it('monitors execution time', () => {
      const config = configureFunction('ExecutionTimeFunction')
        .monitoring((alerts) => alerts.onExecutionTime(greaterThan(minutes(5))).warn())
        ._build();

      expect(config.monitoring?.alerts?.[0].metric).toBe('executionTime');
    });

    it('monitors memory usage', () => {
      const config = configureFunction('MemoryUsageFunction')
        .monitoring((alerts) => alerts.onMemoryUsage(greaterThan(1800)).warn())
        ._build();

      expect(config.monitoring?.alerts?.[0].metric).toBe('memoryUsage');
    });

    it('monitors failure rate', () => {
      const config = configureFunction('FailureRateFunction')
        .monitoring((alerts) => alerts.onFailureRate(greaterThan(0.05)).error())
        ._build();

      expect(config.monitoring?.alerts?.[0].metric).toBe('failureRate');
    });
  });
});
