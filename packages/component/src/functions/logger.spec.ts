/**
 * Logger Tests
 *
 * @remarks
 * Tests for Application Insights logger integration with OpenTelemetry.
 * Tests cover all log levels, structured logging, exception tracking,
 * correlation IDs, and performance.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createFunctionContext,
  createExecutionContext,
  createAnonymousUserContext,
  initializeApplicationInsights,
  isAppInsightsEnabled,
  resetApplicationInsights,
} from './context';
import type { Logger } from './types';

// ============================================================================
// Test Setup
// ============================================================================

describe('Application Insights Logger', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Spy on console methods
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;

    // Restore console methods
    consoleSpy.log.mockRestore();
    consoleSpy.info.mockRestore();
    consoleSpy.warn.mockRestore();
    consoleSpy.error.mockRestore();
  });

  // ============================================================================
  // Initialization Tests
  // ============================================================================

  describe('Application Insights Initialization', () => {
    beforeEach(() => {
      // Reset App Insights state before each test
      resetApplicationInsights();
    });

    it('should disable telemetry in development by default', () => {
      process.env.NODE_ENV = 'development';
      initializeApplicationInsights();
      expect(isAppInsightsEnabled()).toBe(false);
    });

    it('should disable telemetry in test by default', () => {
      process.env.NODE_ENV = 'test';
      initializeApplicationInsights();
      expect(isAppInsightsEnabled()).toBe(false);
    });

    it('should disable telemetry when connection string is missing', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
      initializeApplicationInsights();
      expect(isAppInsightsEnabled()).toBe(false);
    });

    it('should enable telemetry in development when explicitly configured', () => {
      process.env.NODE_ENV = 'development';
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING =
        'InstrumentationKey=00000000-0000-0000-0000-000000000000';

      initializeApplicationInsights({
        enableInDevelopment: true,
      });

      expect(isAppInsightsEnabled()).toBe(true);
    });

    it('should be idempotent on multiple initialization calls', () => {
      // Test that multiple calls don't cause issues
      expect(() => {
        initializeApplicationInsights();
        const firstState = isAppInsightsEnabled();

        initializeApplicationInsights();
        const secondState = isAppInsightsEnabled();

        initializeApplicationInsights();
        const thirdState = isAppInsightsEnabled();

        // State should remain consistent across all calls
        expect(firstState).toBe(secondState);
        expect(secondState).toBe(thirdState);
      }).not.toThrow();
    });
  });

  // ============================================================================
  // Logger Creation Tests
  // ============================================================================

  describe('Logger Creation', () => {
    it('should create a logger with all required methods', () => {
      const executionContext = createExecutionContext('test-invocation-id');
      const userContext = createAnonymousUserContext();
      const context = createFunctionContext(executionContext, userContext);

      expect(context.log).toBeDefined();
      expect(typeof context.log).toBe('function');
      expect(typeof context.log.info).toBe('function');
      expect(typeof context.log.warn).toBe('function');
      expect(typeof context.log.error).toBe('function');
      expect(typeof context.log.verbose).toBe('function');
    });

    it('should include execution ID in logger context', () => {
      const executionContext = createExecutionContext('test-invocation-id');
      const userContext = createAnonymousUserContext();
      const context = createFunctionContext(executionContext, userContext);

      context.log('Test message');

      expect(consoleSpy.log).toHaveBeenCalled();
      const logCall = consoleSpy.log.mock.calls[0][0];
      expect(logCall).toContain(executionContext.executionId);
    });
  });

  // ============================================================================
  // Log Level Tests
  // ============================================================================

  describe('Log Levels', () => {
    let logger: Logger;

    beforeEach(() => {
      const executionContext = createExecutionContext('test-invocation-id');
      const userContext = createAnonymousUserContext();
      const context = createFunctionContext(executionContext, userContext);
      logger = context.log;
    });

    it('should log info messages', () => {
      logger.info('Info message');

      expect(consoleSpy.log).toHaveBeenCalled();
      const logCall = consoleSpy.log.mock.calls[0][0];
      expect(logCall).toContain('INFO');
      expect(logCall).toContain('Info message');
    });

    it('should log warning messages', () => {
      logger.warn('Warning message');

      expect(consoleSpy.warn).toHaveBeenCalled();
      const logCall = consoleSpy.warn.mock.calls[0][0];
      expect(logCall).toContain('WARN');
      expect(logCall).toContain('Warning message');
    });

    it('should log error messages', () => {
      const error = new Error('Test error');
      logger.error('Error message', error);

      expect(consoleSpy.error).toHaveBeenCalled();
      const logCall = consoleSpy.error.mock.calls[0][0];
      expect(logCall).toContain('ERROR');
      expect(logCall).toContain('Error message');
    });

    it('should log verbose messages', () => {
      logger.verbose('Verbose message');

      expect(consoleSpy.log).toHaveBeenCalled();
      const logCall = consoleSpy.log.mock.calls[0][0];
      expect(logCall).toContain('VERBOSE');
      expect(logCall).toContain('Verbose message');
    });

    it('should log messages using default log function', () => {
      logger('Default message');

      expect(consoleSpy.log).toHaveBeenCalled();
      const logCall = consoleSpy.log.mock.calls[0][0];
      expect(logCall).toContain('INFO');
      expect(logCall).toContain('Default message');
    });
  });

  // ============================================================================
  // Structured Logging Tests
  // ============================================================================

  describe('Structured Logging', () => {
    let logger: Logger;

    beforeEach(() => {
      const executionContext = createExecutionContext('test-invocation-id');
      const userContext = createAnonymousUserContext();
      const context = createFunctionContext(executionContext, userContext);
      logger = context.log;
    });

    it('should accept custom properties', () => {
      logger.info('Message with properties', { userId: 'user123', action: 'create' });

      expect(consoleSpy.log).toHaveBeenCalled();
      const logData = consoleSpy.log.mock.calls[0][1];
      expect(logData).toEqual({ userId: 'user123', action: 'create' });
    });

    it('should accept measurements', () => {
      logger.info('Message with measurements', { duration: 150, count: 5 });

      expect(consoleSpy.log).toHaveBeenCalled();
      const logData = consoleSpy.log.mock.calls[0][1];
      expect(logData).toEqual({ duration: 150, count: 5 });
    });

    it('should handle mixed properties and measurements', () => {
      logger.info('Mixed data', { userId: 'user123', duration: 150, status: 'success' });

      expect(consoleSpy.log).toHaveBeenCalled();
      const logData = consoleSpy.log.mock.calls[0][1];
      expect(logData).toEqual({ userId: 'user123', duration: 150, status: 'success' });
    });

    it('should handle multiple data arguments', () => {
      logger.info(
        'Multiple arguments',
        { userId: 'user123' },
        { duration: 150 },
        { status: 'success' }
      );

      expect(consoleSpy.log).toHaveBeenCalled();
      expect(consoleSpy.log.mock.calls[0].length).toBeGreaterThan(1);
    });
  });

  // ============================================================================
  // Exception Tracking Tests
  // ============================================================================

  describe('Exception Tracking', () => {
    let logger: Logger;

    beforeEach(() => {
      const executionContext = createExecutionContext('test-invocation-id');
      const userContext = createAnonymousUserContext();
      const context = createFunctionContext(executionContext, userContext);
      logger = context.log;
    });

    it('should track exceptions with stack traces', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.ts:1:1';

      logger.error('Operation failed', error);

      expect(consoleSpy.error).toHaveBeenCalled();
      const logData = consoleSpy.error.mock.calls[0];
      expect(logData).toContain(error);
    });

    it('should handle error without additional data', () => {
      const error = new Error('Simple error');
      logger.error('Error occurred', error);

      expect(consoleSpy.error).toHaveBeenCalled();
      const logCall = consoleSpy.error.mock.calls[0][0];
      expect(logCall).toContain('ERROR');
      expect(logCall).toContain('Error occurred');
    });

    it('should handle error with additional properties', () => {
      const error = new Error('Error with context');
      logger.error('Operation failed', error, { userId: 'user123', operation: 'delete' });

      expect(consoleSpy.error).toHaveBeenCalled();
      expect(consoleSpy.error.mock.calls[0]).toContain(error);
    });

    it('should handle logging without error object', () => {
      logger.error('Error message without exception');

      expect(consoleSpy.error).toHaveBeenCalled();
      const logCall = consoleSpy.error.mock.calls[0][0];
      expect(logCall).toContain('ERROR');
      expect(logCall).toContain('Error message without exception');
    });
  });

  // ============================================================================
  // Correlation ID Tests
  // ============================================================================

  describe('Correlation IDs', () => {
    it('should include execution ID in all logs', () => {
      const executionContext = createExecutionContext('test-invocation-id');
      const userContext = createAnonymousUserContext();
      const context = createFunctionContext(executionContext, userContext);

      context.log.info('Message 1');
      context.log.warn('Message 2');
      context.log.error('Message 3');

      // All logs should contain the same execution ID
      const executionId = executionContext.executionId;
      expect(consoleSpy.log.mock.calls[0][0]).toContain(executionId);
      expect(consoleSpy.warn.mock.calls[0][0]).toContain(executionId);
      expect(consoleSpy.error.mock.calls[0][0]).toContain(executionId);
    });

    it('should generate unique execution IDs for different contexts', () => {
      const context1 = createFunctionContext(
        createExecutionContext('invocation-1'),
        createAnonymousUserContext()
      );

      const context2 = createFunctionContext(
        createExecutionContext('invocation-2'),
        createAnonymousUserContext()
      );

      expect(context1.executionId).not.toBe(context2.executionId);
    });

    it('should maintain correlation across multiple log calls', () => {
      const executionContext = createExecutionContext('test-invocation-id');
      const userContext = createAnonymousUserContext();
      const context = createFunctionContext(executionContext, userContext);

      context.log('Start processing');
      context.log('Processing step 1');
      context.log('Processing step 2');
      context.log('Complete');

      // Extract execution IDs from all log calls
      const executionIds = consoleSpy.log.mock.calls.map((call) => {
        const match = call[0].match(/\[exec_[a-z0-9_]+\]/);
        return match ? match[0] : null;
      });

      // All should be the same
      expect(new Set(executionIds).size).toBe(1);
    });
  });

  // ============================================================================
  // Performance Tests
  // ============================================================================

  describe('Performance', () => {
    it('should have minimal overhead when App Insights is disabled', () => {
      const executionContext = createExecutionContext('test-invocation-id');
      const userContext = createAnonymousUserContext();
      const context = createFunctionContext(executionContext, userContext);

      const iterations = 1000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        context.log('Performance test message', { iteration: i });
      }

      const duration = performance.now() - start;
      const averagePerLog = duration / iterations;

      // Should average less than 1ms per log when disabled
      expect(averagePerLog).toBeLessThan(1);
    });

    it('should not block on telemetry errors', () => {
      const executionContext = createExecutionContext('test-invocation-id');
      const userContext = createAnonymousUserContext();
      const context = createFunctionContext(executionContext, userContext);

      // This should not throw even if telemetry fails
      expect(() => {
        context.log('Test message');
        context.log.error('Error message', new Error('Test error'));
      }).not.toThrow();
    });
  });

  // ============================================================================
  // Timestamp Tests
  // ============================================================================

  describe('Timestamps', () => {
    it('should include ISO timestamps in logs', () => {
      const executionContext = createExecutionContext('test-invocation-id');
      const userContext = createAnonymousUserContext();
      const context = createFunctionContext(executionContext, userContext);

      const beforeLog = new Date();
      context.log('Timestamped message');
      const afterLog = new Date();

      expect(consoleSpy.log).toHaveBeenCalled();
      const logCall = consoleSpy.log.mock.calls[0][0];

      // Extract timestamp from log (ISO 8601 format)
      const timestampMatch = logCall.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
      expect(timestampMatch).toBeTruthy();

      if (timestampMatch) {
        const timestamp = new Date(timestampMatch[0]);
        expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeLog.getTime());
        expect(timestamp.getTime()).toBeLessThanOrEqual(afterLog.getTime());
      }
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    let logger: Logger;

    beforeEach(() => {
      const executionContext = createExecutionContext('test-invocation-id');
      const userContext = createAnonymousUserContext();
      const context = createFunctionContext(executionContext, userContext);
      logger = context.log;
    });

    it('should handle empty messages', () => {
      expect(() => logger('')).not.toThrow();
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should handle very long messages', () => {
      const longMessage = 'x'.repeat(10000);
      expect(() => logger(longMessage)).not.toThrow();
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should handle null data', () => {
      expect(() => logger('Message', null as any)).not.toThrow();
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should handle undefined data', () => {
      expect(() => logger('Message', undefined as any)).not.toThrow();
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should handle circular references in properties', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;

      // Should not throw (console.log handles circular refs)
      expect(() => logger('Message', circular)).not.toThrow();
    });

    it('should handle special characters in messages', () => {
      const specialMessage = 'Test\n\t\r\x00\\special';
      expect(() => logger(specialMessage)).not.toThrow();
      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Integration with Function Context', () => {
    it('should provide logger in function context', () => {
      const executionContext = createExecutionContext('test-invocation-id');
      const userContext = createAnonymousUserContext();
      const context = createFunctionContext(executionContext, userContext);

      expect(context.log).toBeDefined();
      expect(context.executionId).toBe(executionContext.executionId);
      expect(context.invocationId).toBe(executionContext.invocationId);
    });

    it('should correlate logger with execution context', () => {
      const executionContext = createExecutionContext('test-invocation-id');
      const userContext = createAnonymousUserContext();
      const context = createFunctionContext(executionContext, userContext);

      context.log('Test correlation');

      expect(consoleSpy.log).toHaveBeenCalled();
      const logCall = consoleSpy.log.mock.calls[0][0];
      expect(logCall).toContain(context.executionId);
    });

    it('should work with real-world logging patterns', () => {
      const executionContext = createExecutionContext('test-invocation-id');
      const userContext = {
        id: 'user123',
        email: 'user@example.com',
        roles: ['admin'],
      };
      const context = createFunctionContext(executionContext, userContext);

      // Simulate real-world function execution
      context.log('Function started', { userId: userContext.id });

      try {
        // Simulate some work
        context.log.verbose('Processing data', { recordCount: 100 });
        context.log.info('Data processed successfully', { duration: 150 });
      } catch (error) {
        context.log.error('Processing failed', error as Error, {
          userId: userContext.id,
        });
      }

      context.log('Function completed', { userId: userContext.id });

      // Verify all logs were captured
      expect(consoleSpy.log).toHaveBeenCalledTimes(4);
    });
  });
});
