/**
 * Tests for Monitoring Builders
 *
 * @remarks
 * Comprehensive tests for monitoring configuration including alerts,
 * metrics, and tracing for Azure Functions.
 */

import { describe, it, expect } from 'vitest';
import { MonitoringBuilder, AlertRuleBuilder } from './monitoring';
import { greaterThan, lessThan } from '../common/threshold';
import { minutes, seconds } from '../common/duration';

describe('MonitoringBuilder', () => {
  describe('Alert Rule Creation', () => {
    it('creates execution time alert with duration threshold', () => {
      const builder = new MonitoringBuilder();
      const result = builder.onExecutionTime(greaterThan(minutes(5))).warn();

      const alerts = result._build();

      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toMatchObject({
        metric: 'executionTime',
        value: 300000, // 5 minutes in milliseconds
        condition: 'greaterThan',
        severity: 'warn',
      });
    });

    it('creates execution time alert with numeric threshold', () => {
      const builder = new MonitoringBuilder();
      const result = builder
        .onExecutionTime(greaterThan(600000)) // 10 minutes in ms
        .error();

      const alerts = result._build();

      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toMatchObject({
        metric: 'executionTime',
        value: 600000,
        condition: 'greaterThan',
        severity: 'error',
      });
    });

    it('creates memory usage alert', () => {
      const builder = new MonitoringBuilder();
      const result = builder.onMemoryUsage(greaterThan(1800)).warn();

      const alerts = result._build();

      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toMatchObject({
        metric: 'memoryUsage',
        value: 1800,
        condition: 'greaterThan',
        severity: 'warn',
      });
    });

    it('creates failure rate alert', () => {
      const builder = new MonitoringBuilder();
      const result = builder.onFailureRate(greaterThan(0.05)).critical();

      const alerts = result._build();

      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toMatchObject({
        metric: 'failureRate',
        value: 0.05,
        condition: 'greaterThan',
        severity: 'critical',
      });
    });

    it('handles lessThan thresholds', () => {
      const builder = new MonitoringBuilder();
      const result = builder.onExecutionTime(lessThan(seconds(30))).info();

      const alerts = result._build();

      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toMatchObject({
        metric: 'executionTime',
        value: 30000,
        condition: 'lessThan',
        severity: 'info',
      });
    });
  });

  describe('Alert Severity Levels', () => {
    it('sets info severity', () => {
      const builder = new MonitoringBuilder();
      const result = builder.onExecutionTime(greaterThan(minutes(1))).info();

      const alerts = result._build();
      expect(alerts[0].severity).toBe('info');
    });

    it('sets warn severity', () => {
      const builder = new MonitoringBuilder();
      const result = builder.onExecutionTime(greaterThan(minutes(5))).warn();

      const alerts = result._build();
      expect(alerts[0].severity).toBe('warn');
    });

    it('sets error severity', () => {
      const builder = new MonitoringBuilder();
      const result = builder.onFailureRate(greaterThan(0.05)).error();

      const alerts = result._build();
      expect(alerts[0].severity).toBe('error');
    });

    it('sets critical severity', () => {
      const builder = new MonitoringBuilder();
      const result = builder.onFailureRate(greaterThan(0.1)).critical();

      const alerts = result._build();
      expect(alerts[0].severity).toBe('critical');
    });
  });

  describe('Alert Actions', () => {
    it('adds email action', () => {
      const builder = new MonitoringBuilder();
      const result = builder
        .onExecutionTime(greaterThan(minutes(5)))
        .withEmail('team@company.com')
        .warn();

      const alerts = result._build();

      expect(alerts[0].actions).toBeDefined();
      expect(alerts[0].actions).toHaveLength(1);
      expect(alerts[0].actions![0]).toMatchObject({
        type: 'email',
        target: 'team@company.com',
      });
    });

    it('adds multiple email actions', () => {
      const builder = new MonitoringBuilder();
      const result = builder
        .onExecutionTime(greaterThan(minutes(5)))
        .withEmail('team@company.com')
        .withEmail('ops@company.com')
        .warn();

      const alerts = result._build();

      expect(alerts[0].actions).toHaveLength(2);
      expect(alerts[0].actions![0].target).toBe('team@company.com');
      expect(alerts[0].actions![1].target).toBe('ops@company.com');
    });

    it('adds webhook action', () => {
      const builder = new MonitoringBuilder();
      const result = builder
        .onFailureRate(greaterThan(0.05))
        .withWebhook('https://api.company.com/alerts')
        .critical();

      const alerts = result._build();

      expect(alerts[0].actions).toHaveLength(1);
      expect(alerts[0].actions![0]).toMatchObject({
        type: 'webhook',
        target: 'https://api.company.com/alerts',
      });
    });

    it('adds SMS action', () => {
      const builder = new MonitoringBuilder();
      const result = builder.onFailureRate(greaterThan(0.1)).withSMS('+1234567890').critical();

      const alerts = result._build();

      expect(alerts[0].actions).toHaveLength(1);
      expect(alerts[0].actions![0]).toMatchObject({
        type: 'sms',
        target: '+1234567890',
      });
    });

    it('adds mixed actions', () => {
      const builder = new MonitoringBuilder();
      const result = builder
        .onExecutionTime(greaterThan(minutes(10)))
        .withEmail('team@company.com')
        .withWebhook('https://api.company.com/alerts')
        .withSMS('+1234567890')
        .critical();

      const alerts = result._build();

      expect(alerts[0].actions).toHaveLength(3);
      expect(alerts[0].actions![0].type).toBe('email');
      expect(alerts[0].actions![1].type).toBe('webhook');
      expect(alerts[0].actions![2].type).toBe('sms');
    });
  });

  describe('Multiple Alert Rules', () => {
    it('creates multiple alert rules', () => {
      const builder = new MonitoringBuilder();
      const result = builder
        .onExecutionTime(greaterThan(minutes(8)))
        .withEmail('platform-team@company.com')
        .warn()

        .onFailureRate(greaterThan(0.05))
        .error();

      const alerts = result._build();

      expect(alerts).toHaveLength(2);

      expect(alerts[0]).toMatchObject({
        metric: 'executionTime',
        value: 480000,
        condition: 'greaterThan',
        severity: 'warn',
      });
      expect(alerts[0].actions).toHaveLength(1);
      expect(alerts[0].actions![0].target).toBe('platform-team@company.com');

      expect(alerts[1]).toMatchObject({
        metric: 'failureRate',
        value: 0.05,
        condition: 'greaterThan',
        severity: 'error',
      });
    });

    it('creates complex monitoring configuration', () => {
      const builder = new MonitoringBuilder();
      const result = builder
        .onExecutionTime(greaterThan(minutes(8)))
        .withEmail('platform-team@company.com')
        .warn()

        .onMemoryUsage(greaterThan(1800))
        .warn()

        .onFailureRate(greaterThan(0.02))
        .withEmail('data-platform@company.com')
        .critical();

      const alerts = result._build();

      expect(alerts).toHaveLength(3);

      // Execution time alert
      expect(alerts[0].metric).toBe('executionTime');
      expect(alerts[0].severity).toBe('warn');
      expect(alerts[0].actions).toHaveLength(1);

      // Memory usage alert
      expect(alerts[1].metric).toBe('memoryUsage');
      expect(alerts[1].severity).toBe('warn');

      // Failure rate alert
      expect(alerts[2].metric).toBe('failureRate');
      expect(alerts[2].severity).toBe('critical');
      expect(alerts[2].actions).toHaveLength(1);
    });
  });

  describe('Immutability', () => {
    it('returns frozen alert rules array', () => {
      const builder = new MonitoringBuilder();
      const result = builder.onExecutionTime(greaterThan(minutes(5))).warn();

      const alerts = result._build();

      expect(Object.isFrozen(alerts)).toBe(true);
    });

    it('freezes alert actions array', () => {
      const builder = new MonitoringBuilder();
      const result = builder
        .onExecutionTime(greaterThan(minutes(5)))
        .withEmail('team@company.com')
        .warn();

      const alerts = result._build();

      expect(Object.isFrozen(alerts[0].actions)).toBe(true);
    });
  });

  describe('Reference Implementation Compatibility', () => {
    it('matches reference implementation example 1', () => {
      // From resource.ts lines 117-128
      const builder = new MonitoringBuilder();
      const result = builder
        .onExecutionTime(greaterThan(minutes(8)))
        .withEmail('platform-team@company.com')
        .warn()

        .onFailureRate(greaterThan(0.05))
        .error();

      const alerts = result._build();

      expect(alerts).toHaveLength(2);
      expect(alerts[0].metric).toBe('executionTime');
      expect(alerts[0].value).toBe(480000); // 8 minutes
      expect(alerts[1].metric).toBe('failureRate');
      expect(alerts[1].value).toBe(0.05);
    });

    it('matches reference implementation example 2', () => {
      // From resource.ts lines 259-270
      const builder = new MonitoringBuilder();
      const result = builder
        .onExecutionTime(greaterThan(minutes(12)))
        .warn()

        .onMemoryUsage(greaterThan(1800))
        .warn()

        .onFailureRate(greaterThan(0.02))
        .withEmail('data-platform@company.com')
        .critical();

      const alerts = result._build();

      expect(alerts).toHaveLength(3);
      expect(alerts[0].value).toBe(720000); // 12 minutes
      expect(alerts[1].value).toBe(1800); // MB
      expect(alerts[2].value).toBe(0.02);
    });
  });
});

describe('AlertRuleBuilder', () => {
  it('builds alert rule with email action before severity', () => {
    const parentBuilder = new MonitoringBuilder();
    const ruleBuilder = new AlertRuleBuilder('executionTime', 300000, 'greaterThan', parentBuilder);

    const result = ruleBuilder.withEmail('team@company.com').warn();

    const alerts = result._build();

    expect(alerts[0].actions).toHaveLength(1);
    expect(alerts[0].actions![0].target).toBe('team@company.com');
    expect(alerts[0].severity).toBe('warn');
  });

  it('builds alert rule with multiple actions', () => {
    const parentBuilder = new MonitoringBuilder();
    const ruleBuilder = new AlertRuleBuilder('failureRate', 0.05, 'greaterThan', parentBuilder);

    const result = ruleBuilder
      .withEmail('team@company.com')
      .withWebhook('https://api.company.com/webhook')
      .critical();

    const alerts = result._build();

    expect(alerts[0].actions).toHaveLength(2);
    expect(alerts[0].severity).toBe('critical');
  });

  it('returns parent builder for chaining', () => {
    const parentBuilder = new MonitoringBuilder();
    const ruleBuilder = new AlertRuleBuilder('executionTime', 300000, 'greaterThan', parentBuilder);

    const result = ruleBuilder.warn();

    expect(result).toBe(parentBuilder);
  });
});
