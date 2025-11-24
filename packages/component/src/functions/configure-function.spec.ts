/**
 * Tests for Function Configuration Builder
 */

import { describe, it, expect } from 'vitest';
import {
  configureFunction,
  FunctionConfigurationBuilder,
  AlertBuilder,
} from './configure-function';
import { minutes, seconds, hours } from '../common/duration';
import { greaterThan, lessThan } from '../common/threshold';

describe('FunctionConfigurationBuilder', () => {
  describe('Basic Configuration', () => {
    it('should create builder with default values', () => {
      const builder = configureFunction('TestFunction');
      const config = builder._build();

      expect(config.name).toBe('TestFunction');
      expect(config.memory).toBe(256); // Default 256MB
      expect(config.timeout).toBe(30000); // Default 30s
    });

    it('should set memory allocation', () => {
      const config = configureFunction('TestFunction').memory(1024)._build();

      expect(config.memory).toBe(1024);
    });

    it('should set timeout with number', () => {
      const config = configureFunction('TestFunction').timeout(60000)._build();

      expect(config.timeout).toBe(60000);
    });

    it('should set timeout with Duration', () => {
      const config = configureFunction('TestFunction').timeout(minutes(5))._build();

      expect(config.timeout).toBe(300000); // 5 minutes in ms
    });
  });

  describe('Method Chaining', () => {
    it('should support fluent method chaining', () => {
      const config = configureFunction('TestFunction')
        .memory(512)
        .timeout(seconds(45))
        .withMetrics()
        .withTracing()
        ._build();

      expect(config.memory).toBe(512);
      expect(config.timeout).toBe(45000);
      expect(config.monitoring?.metrics).toBe(true);
      expect(config.monitoring?.tracing).toBe(true);
    });

    it('should return same instance for chaining', () => {
      const builder = configureFunction('TestFunction');
      const result1 = builder.memory(512);
      const result2 = result1.timeout(60000);

      expect(result1).toBe(builder);
      expect(result2).toBe(builder);
    });
  });

  describe('Handler Configuration', () => {
    it('should set custom handler', () => {
      const handler = async (context: any, input: any) => ({ result: 'ok' });

      const config = configureFunction('TestFunction').withHandler(handler)._build();

      expect(config.handler).toBe(handler);
    });

    it('should support typed handler', () => {
      type Input = { datasetId: string };
      type Output = { reportUrl: string };

      const handler = async (context: any, input: Input): Promise<Output> => {
        return { reportUrl: 'https://example.com/report.pdf' };
      };

      const config = configureFunction('TestFunction').withHandler<Input, Output>(handler)._build();

      expect(config.handler).toBe(handler);
    });
  });

  describe('Bindings Configuration', () => {
    it('should set storage binding', () => {
      const config = configureFunction('TestFunction')
        .bindings({
          storage: {
            type: 'blob',
            container: 'reports',
            path: '{reportId}.pdf',
          },
        })
        ._build();

      expect(config.bindings?.storage).toEqual({
        type: 'blob',
        container: 'reports',
        path: '{reportId}.pdf',
      });
    });

    it('should set queue binding', () => {
      const config = configureFunction('TestFunction')
        .bindings({
          queue: {
            type: 'queue',
            name: 'cleanup-queue',
            message: { id: '{reportId}' },
          },
        })
        ._build();

      expect(config.bindings?.queue).toEqual({
        type: 'queue',
        name: 'cleanup-queue',
        message: { id: '{reportId}' },
      });
    });

    it('should set multiple bindings', () => {
      const config = configureFunction('TestFunction')
        .bindings({
          storage: {
            type: 'blob',
            container: 'reports',
            path: '{reportId}.pdf',
          },
          queue: {
            type: 'queue',
            name: 'notifications',
            message: { reportId: '{reportId}' },
          },
          event: {
            type: 'eventGrid',
            topicName: 'report-completed',
          },
        })
        ._build();

      expect(config.bindings?.storage).toBeDefined();
      expect(config.bindings?.queue).toBeDefined();
      expect(config.bindings?.event).toBeDefined();
    });
  });

  describe('Environment Configuration', () => {
    it('should set environment variables', () => {
      const config = configureFunction('TestFunction')
        .env({
          STORAGE_ACCOUNT: 'required',
          MAX_FILE_SIZE: '100',
          DEBUG: 'false',
        })
        ._build();

      expect(config.environment).toEqual({
        STORAGE_ACCOUNT: 'required',
        MAX_FILE_SIZE: '100',
        DEBUG: 'false',
      });
    });

    it('should support required environment variables', () => {
      const config = configureFunction('TestFunction')
        .env({
          API_KEY: 'required',
          ENDPOINT: 'required',
        })
        ._build();

      expect(config.environment?.API_KEY).toBe('required');
      expect(config.environment?.ENDPOINT).toBe('required');
    });
  });

  describe('Monitoring Configuration', () => {
    it('should enable metrics', () => {
      const config = configureFunction('TestFunction').withMetrics()._build();

      expect(config.monitoring?.metrics).toBe(true);
    });

    it('should enable tracing', () => {
      const config = configureFunction('TestFunction').withTracing()._build();

      expect(config.monitoring?.tracing).toBe(true);
    });

    it('should enable both metrics and tracing', () => {
      const config = configureFunction('TestFunction').withMetrics().withTracing()._build();

      expect(config.monitoring?.metrics).toBe(true);
      expect(config.monitoring?.tracing).toBe(true);
    });
  });

  describe('Immutability', () => {
    it('should build immutable configuration', () => {
      const builder = configureFunction('TestFunction').memory(512).timeout(60000);

      const config1 = builder._build();
      const config2 = builder._build();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Different instances
    });

    it('should not affect built config when builder is modified', () => {
      const builder = configureFunction('TestFunction').memory(512);
      const config1 = builder._build();

      builder.memory(1024);
      const config2 = builder._build();

      expect(config1.memory).toBe(512);
      expect(config2.memory).toBe(1024);
    });
  });
});

describe('AlertBuilder', () => {
  describe('Execution Time Alerts', () => {
    it('should create execution time alert', () => {
      const config = configureFunction('TestFunction')
        .monitoring((alerts) => alerts.onExecutionTime(greaterThan(minutes(5))).warn())
        ._build();

      const alert = config.monitoring?.alerts?.[0];
      expect(alert).toBeDefined();
      expect(alert?.metric).toBe('executionTime');
      expect(alert?.condition).toBe('greaterThan');
      expect(alert?.severity).toBe('warn');
    });

    it('should support Duration thresholds', () => {
      const config = configureFunction('TestFunction')
        .monitoring((alerts) => alerts.onExecutionTime(greaterThan(seconds(30))).error())
        ._build();

      const alert = config.monitoring?.alerts?.[0];
      expect(alert?.metric).toBe('executionTime');
    });
  });

  describe('Memory Usage Alerts', () => {
    it('should create memory usage alert', () => {
      const config = configureFunction('TestFunction')
        .monitoring((alerts) => alerts.onMemoryUsage(greaterThan(1800)).warn())
        ._build();

      const alert = config.monitoring?.alerts?.[0];
      expect(alert?.metric).toBe('memoryUsage');
      expect(alert?.condition).toBe('greaterThan');
      expect(alert?.severity).toBe('warn');
    });
  });

  describe('Failure Rate Alerts', () => {
    it('should create failure rate alert', () => {
      const config = configureFunction('TestFunction')
        .monitoring((alerts) => alerts.onFailureRate(greaterThan(0.05)).critical())
        ._build();

      const alert = config.monitoring?.alerts?.[0];
      expect(alert?.metric).toBe('failureRate');
      expect(alert?.condition).toBe('greaterThan');
      expect(alert?.severity).toBe('critical');
    });
  });

  describe('Alert Severity', () => {
    it('should support info severity', () => {
      const config = configureFunction('TestFunction')
        .monitoring((alerts) => alerts.onExecutionTime(greaterThan(minutes(1))).info())
        ._build();

      expect(config.monitoring?.alerts?.[0]?.severity).toBe('info');
    });

    it('should support warn severity', () => {
      const config = configureFunction('TestFunction')
        .monitoring((alerts) => alerts.onExecutionTime(greaterThan(minutes(1))).warn())
        ._build();

      expect(config.monitoring?.alerts?.[0]?.severity).toBe('warn');
    });

    it('should support error severity', () => {
      const config = configureFunction('TestFunction')
        .monitoring((alerts) => alerts.onExecutionTime(greaterThan(minutes(1))).error())
        ._build();

      expect(config.monitoring?.alerts?.[0]?.severity).toBe('error');
    });

    it('should support critical severity', () => {
      const config = configureFunction('TestFunction')
        .monitoring((alerts) => alerts.onExecutionTime(greaterThan(minutes(1))).critical())
        ._build();

      expect(config.monitoring?.alerts?.[0]?.severity).toBe('critical');
    });

    it('should default to warn if severity not specified', () => {
      const config = configureFunction('TestFunction')
        .monitoring((alerts) => alerts.onExecutionTime(greaterThan(minutes(1))))
        ._build();

      expect(config.monitoring?.alerts?.[0]?.severity).toBe('warn');
    });
  });

  describe('Email Notifications', () => {
    it('should add email recipients', () => {
      const config = configureFunction('TestFunction')
        .monitoring((alerts) =>
          alerts
            .onExecutionTime(greaterThan(minutes(5)))
            .warn()
            .withEmail('platform@company.com')
        )
        ._build();

      expect(config.monitoring?.alerts?.[0]?.emails).toContain('platform@company.com');
    });

    it('should add multiple email recipients', () => {
      const config = configureFunction('TestFunction')
        .monitoring((alerts) =>
          alerts
            .onExecutionTime(greaterThan(minutes(5)))
            .warn()
            .withEmail('platform@company.com', 'ops@company.com')
        )
        ._build();

      const emails = config.monitoring?.alerts?.[0]?.emails;
      expect(emails).toContain('platform@company.com');
      expect(emails).toContain('ops@company.com');
    });

    it('should support chaining multiple withEmail calls', () => {
      const config = configureFunction('TestFunction')
        .monitoring((alerts) =>
          alerts
            .onExecutionTime(greaterThan(minutes(5)))
            .warn()
            .withEmail('first@company.com')
            .withEmail('second@company.com')
        )
        ._build();

      const emails = config.monitoring?.alerts?.[0]?.emails;
      expect(emails).toContain('first@company.com');
      expect(emails).toContain('second@company.com');
    });
  });

  describe('Multiple Alerts', () => {
    it('should create multiple alert rules', () => {
      const config = configureFunction('TestFunction')
        .monitoring((alerts) =>
          alerts
            .onExecutionTime(greaterThan(minutes(5)))
            .warn()

            .onMemoryUsage(greaterThan(1800))
            .error()

            .onFailureRate(greaterThan(0.05))
            .critical()
        )
        ._build();

      const alertRules = config.monitoring?.alerts;
      expect(alertRules).toHaveLength(3);

      expect(alertRules?.[0]?.metric).toBe('executionTime');
      expect(alertRules?.[0]?.severity).toBe('warn');

      expect(alertRules?.[1]?.metric).toBe('memoryUsage');
      expect(alertRules?.[1]?.severity).toBe('error');

      expect(alertRules?.[2]?.metric).toBe('failureRate');
      expect(alertRules?.[2]?.severity).toBe('critical');
    });

    it('should support complex alert configuration', () => {
      const config = configureFunction('TestFunction')
        .monitoring((alerts) =>
          alerts
            .onExecutionTime(greaterThan(minutes(8)))
            .warn()
            .withEmail('platform@company.com')

            .onMemoryUsage(greaterThan(1800))
            .warn()

            .onFailureRate(greaterThan(0.02))
            .critical()
            .withEmail('oncall@company.com', 'platform@company.com')
        )
        ._build();

      const alertRules = config.monitoring?.alerts;
      expect(alertRules).toHaveLength(3);

      expect(alertRules?.[0]?.emails).toEqual(['platform@company.com']);
      expect(alertRules?.[2]?.emails).toEqual(['oncall@company.com', 'platform@company.com']);
    });
  });
});

describe('Complete Example', () => {
  it('should build comprehensive function configuration', () => {
    const handler = async (context: any, input: any) => {
      return { status: 'completed' };
    };

    const config = configureFunction('GenerateReport')
      .memory(1024)
      .timeout(minutes(10))
      .withHandler(handler)
      .bindings({
        storage: {
          type: 'blob',
          container: 'reports',
          path: '{reportId}.pdf',
        },
        queue: {
          type: 'queue',
          name: 'report-cleanup',
          message: { reportId: '{reportId}' },
        },
      })
      .env({
        STORAGE_ACCOUNT: 'required',
        MAX_REPORT_SIZE: '100',
      })
      .monitoring((alerts) =>
        alerts
          .onExecutionTime(greaterThan(minutes(8)))
          .warn()
          .withEmail('platform@company.com')

          .onFailureRate(greaterThan(0.05))
          .critical()
      )
      .withMetrics()
      .withTracing()
      ._build();

    expect(config.name).toBe('GenerateReport');
    expect(config.memory).toBe(1024);
    expect(config.timeout).toBe(600000);
    expect(config.handler).toBe(handler);
    expect(config.bindings?.storage).toBeDefined();
    expect(config.bindings?.queue).toBeDefined();
    expect(config.environment?.STORAGE_ACCOUNT).toBe('required');
    expect(config.monitoring?.metrics).toBe(true);
    expect(config.monitoring?.tracing).toBe(true);
    expect(config.monitoring?.alerts).toHaveLength(2);
  });
});
