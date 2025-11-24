/**
 * Integration tests demonstrating real-world usage of helper utilities
 *
 * @remarks
 * These tests show how duration, threshold, and size helpers work together
 * in realistic function configuration scenarios.
 */

import { describe, it, expect } from 'vitest';
import {
  milliseconds,
  seconds,
  minutes,
  hours,
  days,
  bytes,
  kilobytes,
  megabytes,
  gigabytes,
  terabytes,
  greaterThan,
  lessThan,
  between,
  equals,
  olderThan,
  type Duration,
  type Size,
  type Threshold,
} from './index';

describe('Helper Utilities Integration', () => {
  describe('function configuration examples', () => {
    it('should create API handler configuration', () => {
      const config = {
        timeout: seconds(30),
        memory: megabytes(512),
        monitoring: {
          responseTime: greaterThan(milliseconds(500)),
          errorRate: greaterThan(1),
          requestCount: lessThan(10),
        },
      };

      expect(config.timeout.toSeconds()).toBe(30);
      expect(config.memory.toMegabytes()).toBe(512);
      expect(config.monitoring.responseTime.evaluate(milliseconds(600))).toBe(true);
      expect(config.monitoring.errorRate.evaluate(2)).toBe(true);
      expect(config.monitoring.requestCount.evaluate(5)).toBe(true);
    });

    it('should create background job processor configuration', () => {
      const config = {
        timeout: hours(1),
        memory: gigabytes(4),
        retry: {
          maxAttempts: 5,
          backoff: minutes(5),
          maxBackoff: hours(1),
        },
        monitoring: {
          executionTime: greaterThan(minutes(55)),
          memoryUsage: between(2, 3.5), // Comparing GB values as numbers
          queueDepth: greaterThan(1000),
        },
      };

      expect(config.timeout.toHours()).toBe(1);
      expect(config.memory.toGigabytes()).toBe(4);
      expect(config.retry.backoff.toMinutes()).toBe(5);
      expect(config.monitoring.executionTime.evaluate(minutes(56))).toBe(true);
      expect(config.monitoring.memoryUsage.evaluate(3)).toBe(true); // 3 GB
      expect(config.monitoring.queueDepth.evaluate(1500)).toBe(true);
    });

    it('should create data cleanup function configuration', () => {
      const config = {
        timeout: hours(4),
        memory: gigabytes(1),
        schedule: days(1),
        dataRetention: {
          logs: olderThan(days(90)),
          tempFiles: olderThan(days(7)),
          cacheEntries: olderThan(hours(24)),
        },
        monitoring: {
          deletedItems: greaterThan(10000),
          executionTime: greaterThan(hours(3)),
        },
      };

      expect(config.timeout.toHours()).toBe(4);
      expect(config.memory.toGigabytes()).toBe(1);
      expect(config.schedule.toDays()).toBe(1);
      expect(config.dataRetention.logs.value.toDays()).toBe(90);
      expect(config.monitoring.deletedItems.evaluate(15000)).toBe(true);
    });
  });

  describe('type-safe configuration interface', () => {
    interface FunctionConfig {
      timeout: Duration;
      memory: Size;
      alerts: {
        executionTime: Threshold<Duration>;
        memoryUsageMB: Threshold<number>; // Compare numeric MB values
        errorRate: Threshold<number>;
      };
    }

    it('should enforce type safety at compile time', () => {
      const config: FunctionConfig = {
        timeout: minutes(10),
        memory: megabytes(512),
        alerts: {
          executionTime: greaterThan(minutes(8)),
          memoryUsageMB: greaterThan(400), // 400 MB threshold
          errorRate: greaterThan(5),
        },
      };

      expect(config.timeout.toMinutes()).toBe(10);
      expect(config.memory.toMegabytes()).toBe(512);
      expect(config.alerts.executionTime.evaluate(minutes(9))).toBe(true);
      expect(config.alerts.memoryUsageMB.evaluate(450)).toBe(true); // 450 MB
      expect(config.alerts.errorRate.evaluate(6)).toBe(true);
    });
  });

  describe('format conversions for infrastructure', () => {
    it('should convert to ISO 8601 for standard formats', () => {
      const timeout = minutes(5);
      const retention = days(30);
      const interval = hours(2);

      expect(timeout.toISOString()).toBe('PT5M');
      expect(retention.toISOString()).toBe('P30D');
      expect(interval.toISOString()).toBe('PT2H');
    });

    it('should convert to ARM template format', () => {
      const timeout = minutes(30);
      const retention = days(7);
      const interval = hours(1);

      expect(timeout.toArmDuration()).toBe('0.00:30:00');
      expect(retention.toArmDuration()).toBe('7.00:00:00');
      expect(interval.toArmDuration()).toBe('0.01:00:00');
    });
  });

  describe('threshold evaluation scenarios', () => {
    it('should evaluate performance thresholds', () => {
      const cpuThreshold = greaterThan(80);
      const memoryThresholdMB = greaterThan(1500); // 1500 MB
      const responseTimeThreshold = greaterThan(milliseconds(200));

      // CPU at 85% - alert
      expect(cpuThreshold.evaluate(85)).toBe(true);

      // Memory at 1600MB - alert
      expect(memoryThresholdMB.evaluate(1600)).toBe(true);

      // Response time at 250ms - alert
      expect(responseTimeThreshold.evaluate(milliseconds(250))).toBe(true);
    });

    it('should evaluate within acceptable ranges', () => {
      const normalCpu = between(20, 80);
      const normalMemoryMB = between(100, 1500); // 100-1500 MB
      const acceptableLatency = between(milliseconds(50), milliseconds(200));

      // Within range - no alert
      expect(normalCpu.evaluate(50)).toBe(true);
      expect(normalMemoryMB.evaluate(800)).toBe(true); // 800 MB
      expect(acceptableLatency.evaluate(milliseconds(100))).toBe(true);

      // Outside range - alert
      expect(normalCpu.evaluate(85)).toBe(false);
      expect(normalMemoryMB.evaluate(1600)).toBe(false); // 1600 MB
      expect(acceptableLatency.evaluate(milliseconds(250))).toBe(false);
    });
  });

  describe('size calculations', () => {
    it('should calculate storage requirements', () => {
      const perUserCache = megabytes(10);
      const userCount = 1000;
      const totalCache = bytes(perUserCache.toBytes() * userCount);

      expect(totalCache.toGigabytes()).toBeCloseTo(9.77, 2);
    });

    it('should handle binary unit conversions correctly', () => {
      const size1KB = kilobytes(1);
      const size1MB = megabytes(1);
      const size1GB = gigabytes(1);

      // 1 KB = 1024 bytes
      expect(size1KB.toBytes()).toBe(1024);

      // 1 MB = 1024 KB = 1,048,576 bytes
      expect(size1MB.toKilobytes()).toBe(1024);
      expect(size1MB.toBytes()).toBe(1048576);

      // 1 GB = 1024 MB = 1,073,741,824 bytes
      expect(size1GB.toMegabytes()).toBe(1024);
      expect(size1GB.toBytes()).toBe(1073741824);
    });
  });

  describe('duration calculations', () => {
    it('should calculate total execution time', () => {
      const warmupTime = seconds(5);
      const processingTime = minutes(2);
      const cleanupTime = seconds(10);

      const totalMs =
        warmupTime.toMilliseconds() +
        processingTime.toMilliseconds() +
        cleanupTime.toMilliseconds();

      const totalTime = milliseconds(totalMs);

      expect(totalTime.toSeconds()).toBe(135); // 5 + 120 + 10
      expect(totalTime.toMinutes()).toBe(2);
    });

    it('should handle time-based retention policies', () => {
      const logRetention = days(90);
      const metricRetention = days(180);
      const archiveRetention = days(365);

      expect(logRetention.toHours()).toBe(2160);
      expect(metricRetention.toHours()).toBe(4320);
      expect(archiveRetention.toDays()).toBe(365);
    });
  });

  describe('combined real-world scenario', () => {
    it('should create complete function monitoring setup', () => {
      // Function configuration
      const functionConfig = {
        name: 'ProcessOrders',
        timeout: minutes(15),
        memory: gigabytes(2),
        retry: {
          maxAttempts: 3,
          backoff: seconds(30),
          maxBackoff: minutes(5),
        },
      };

      // Monitoring thresholds
      const monitoring = {
        execution: {
          warning: greaterThan(minutes(12)),
          critical: greaterThan(minutes(14)),
        },
        memory: {
          warning: greaterThan(1800), // MB
          critical: greaterThan(1950), // MB
        },
        performance: {
          errorRate: greaterThan(5),
          successRate: lessThan(95),
          throughput: lessThan(100),
        },
      };

      // Simulate metrics
      const currentExecutionTime = minutes(13);
      const currentMemoryMB = 1850;
      const currentErrorRate = 3;
      const currentSuccessRate = 96;

      // Check alerts
      const warnings = {
        executionTime: monitoring.execution.warning.evaluate(currentExecutionTime),
        memory: monitoring.memory.warning.evaluate(currentMemoryMB),
        errorRate: monitoring.performance.errorRate.evaluate(currentErrorRate),
        successRate: monitoring.performance.successRate.evaluate(currentSuccessRate),
      };

      expect(warnings.executionTime).toBe(true); // 13 > 12
      expect(warnings.memory).toBe(true); // 1850 > 1800
      expect(warnings.errorRate).toBe(false); // 3 < 5
      expect(warnings.successRate).toBe(false); // 96 > 95

      // Check critical alerts
      const critical = {
        executionTime: monitoring.execution.critical.evaluate(currentExecutionTime),
        memory: monitoring.memory.critical.evaluate(currentMemoryMB),
      };

      expect(critical.executionTime).toBe(false); // 13 < 14
      expect(critical.memory).toBe(false); // 1850 < 1950
    });
  });

  describe('helper utilities chaining', () => {
    it('should support fluent API patterns', () => {
      const config = {
        timeout: minutes(10),
        memory: gigabytes(2),
      };

      // Convert and validate
      const timeoutSeconds = config.timeout.toSeconds();
      const memoryMB = config.memory.toMegabytes();

      expect(timeoutSeconds).toBe(600);
      expect(memoryMB).toBe(2048);

      // Create thresholds from converted values
      const timeoutThreshold = greaterThan(seconds(timeoutSeconds - 120)); // 2 minutes before timeout
      const memoryThresholdMB = greaterThan(memoryMB * 0.9); // 90% of memory (in MB)

      expect(timeoutThreshold.evaluate(seconds(500))).toBe(true);
      expect(memoryThresholdMB.evaluate(memoryMB * 0.95)).toBe(true); // 95% is > 90%
    });
  });
});
