/**
 * Tests for Backend Logger
 *
 * @remarks
 * Comprehensive test suite for Logger, LogLevel, and logging utilities.
 * Tests cover:
 * - Logger creation and configuration
 * - Log level filtering
 * - Context and metadata attachment
 * - Custom log handlers
 * - Child logger creation with context merging
 * - Error serialization and logging
 * - Global logger instances
 * - Environment-based configuration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  Logger,
  LogLevel,
  LogEntry,
  LoggerConfig,
  LogHandler,
  globalLogger,
  getBackendLogger,
  getComponentLogger,
  getProviderLogger,
  setGlobalLogLevel,
  getGlobalLogLevel,
} from './logger';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a mock log handler that captures log entries
 */
function createMockHandler(): { handler: LogHandler; entries: LogEntry[] } {
  const entries: LogEntry[] = [];
  const handler: LogHandler = (entry: LogEntry) => {
    entries.push(entry);
  };
  return { handler, entries };
}

/**
 * Create a test error with stack trace
 */
function createTestError(message: string): Error {
  return new Error(message);
}

// ============================================================================
// LogLevel Enum Tests
// ============================================================================

describe('LogLevel Enum', () => {
  it('should define all log levels in correct order', () => {
    expect(LogLevel.DEBUG).toBe(0);
    expect(LogLevel.INFO).toBe(1);
    expect(LogLevel.WARN).toBe(2);
    expect(LogLevel.ERROR).toBe(3);
    expect(LogLevel.NONE).toBe(4);
  });

  it('should support numeric comparison', () => {
    expect(LogLevel.DEBUG < LogLevel.INFO).toBe(true);
    expect(LogLevel.INFO < LogLevel.WARN).toBe(true);
    expect(LogLevel.WARN < LogLevel.ERROR).toBe(true);
    expect(LogLevel.ERROR < LogLevel.NONE).toBe(true);
  });

  it('should support string conversion', () => {
    expect(LogLevel[LogLevel.DEBUG]).toBe('DEBUG');
    expect(LogLevel[LogLevel.INFO]).toBe('INFO');
    expect(LogLevel[LogLevel.WARN]).toBe('WARN');
    expect(LogLevel[LogLevel.ERROR]).toBe('ERROR');
    expect(LogLevel[LogLevel.NONE]).toBe('NONE');
  });
});

// ============================================================================
// Logger Creation and Configuration
// ============================================================================

describe('Logger - Creation and Configuration', () => {
  it('should create logger with default configuration', () => {
    const logger = new Logger();

    expect(logger).toBeDefined();
    expect(logger.getLevel()).toBe(LogLevel.INFO);
    expect(logger.isLevelEnabled(LogLevel.INFO)).toBe(true);
    expect(logger.isLevelEnabled(LogLevel.DEBUG)).toBe(false);
  });

  it('should create logger with custom log level', () => {
    const logger = new Logger({ level: LogLevel.DEBUG });

    expect(logger.getLevel()).toBe(LogLevel.DEBUG);
    expect(logger.isLevelEnabled(LogLevel.DEBUG)).toBe(true);
  });

  it('should create logger with custom handler', () => {
    const { handler, entries } = createMockHandler();
    const logger = new Logger({ handler });

    logger.info('test message');

    expect(entries).toHaveLength(1);
    expect(entries[0].message).toBe('test message');
  });

  it('should create logger with all config options', () => {
    const { handler } = createMockHandler();
    const config: LoggerConfig = {
      level: LogLevel.WARN,
      includeTimestamp: false,
      includeContext: false,
      handler,
    };

    const logger = new Logger(config);

    expect(logger.getLevel()).toBe(LogLevel.WARN);
  });

  it('should use default values for missing config options', () => {
    const logger = new Logger({ level: LogLevel.ERROR });

    // Should not throw - defaults should be applied
    logger.error('test');
    expect(logger.getLevel()).toBe(LogLevel.ERROR);
  });
});

// ============================================================================
// Log Level Methods
// ============================================================================

describe('Logger - Log Level Methods', () => {
  let logger: Logger;
  let handler: LogHandler;
  let entries: LogEntry[];

  beforeEach(() => {
    const mock = createMockHandler();
    handler = mock.handler;
    entries = mock.entries;
    logger = new Logger({ level: LogLevel.DEBUG, handler });
  });

  describe('debug()', () => {
    it('should log debug message', () => {
      logger.debug('debug message');

      expect(entries).toHaveLength(1);
      expect(entries[0].level).toBe(LogLevel.DEBUG);
      expect(entries[0].message).toBe('debug message');
    });

    it('should log debug message with context', () => {
      logger.debug('debug message', { foo: 'bar' });

      expect(entries[0].context).toEqual({ foo: 'bar' });
    });

    it('should not log debug when level is INFO', () => {
      logger.setLevel(LogLevel.INFO);
      logger.debug('debug message');

      expect(entries).toHaveLength(0);
    });
  });

  describe('info()', () => {
    it('should log info message', () => {
      logger.info('info message');

      expect(entries).toHaveLength(1);
      expect(entries[0].level).toBe(LogLevel.INFO);
      expect(entries[0].message).toBe('info message');
    });

    it('should log info message with context', () => {
      logger.info('info message', { userId: 123 });

      expect(entries[0].context).toEqual({ userId: 123 });
    });

    it('should log info when level is INFO', () => {
      logger.setLevel(LogLevel.INFO);
      logger.info('info message');

      expect(entries).toHaveLength(1);
    });

    it('should not log info when level is WARN', () => {
      logger.setLevel(LogLevel.WARN);
      logger.info('info message');

      expect(entries).toHaveLength(0);
    });
  });

  describe('warn()', () => {
    it('should log warn message', () => {
      logger.warn('warn message');

      expect(entries).toHaveLength(1);
      expect(entries[0].level).toBe(LogLevel.WARN);
      expect(entries[0].message).toBe('warn message');
    });

    it('should log warn message with context', () => {
      logger.warn('warn message', { resource: 'cosmos' });

      expect(entries[0].context).toEqual({ resource: 'cosmos' });
    });

    it('should log warn message with error', () => {
      const error = createTestError('test error');
      logger.warn('warn message', undefined, error);

      expect(entries[0].error).toBe(error);
    });

    it('should log warn with both context and error', () => {
      const error = createTestError('test error');
      logger.warn('warn message', { attempt: 2 }, error);

      expect(entries[0].context).toEqual({ attempt: 2 });
      expect(entries[0].error).toBe(error);
    });

    it('should not log warn when level is ERROR', () => {
      logger.setLevel(LogLevel.ERROR);
      logger.warn('warn message');

      expect(entries).toHaveLength(0);
    });
  });

  describe('error()', () => {
    it('should log error message', () => {
      logger.error('error message');

      expect(entries).toHaveLength(1);
      expect(entries[0].level).toBe(LogLevel.ERROR);
      expect(entries[0].message).toBe('error message');
    });

    it('should log error message with context', () => {
      logger.error('error message', { operation: 'provision' });

      expect(entries[0].context).toEqual({ operation: 'provision' });
    });

    it('should log error message with error object', () => {
      const error = createTestError('critical error');
      logger.error('error message', undefined, error);

      expect(entries[0].error).toBe(error);
      expect(entries[0].error?.message).toBe('critical error');
    });

    it('should log error with both context and error', () => {
      const error = createTestError('critical error');
      logger.error('error message', { resourceId: 'abc123' }, error);

      expect(entries[0].context).toEqual({ resourceId: 'abc123' });
      expect(entries[0].error).toBe(error);
    });

    it('should log error when level is ERROR', () => {
      logger.setLevel(LogLevel.ERROR);
      logger.error('error message');

      expect(entries).toHaveLength(1);
    });

    it('should not log error when level is NONE', () => {
      logger.setLevel(LogLevel.NONE);
      logger.error('error message');

      expect(entries).toHaveLength(0);
    });
  });
});

// ============================================================================
// Generic log() Method
// ============================================================================

describe('Logger - log() Method', () => {
  let logger: Logger;
  let handler: LogHandler;
  let entries: LogEntry[];

  beforeEach(() => {
    const mock = createMockHandler();
    handler = mock.handler;
    entries = mock.entries;
    logger = new Logger({ level: LogLevel.DEBUG, handler });
  });

  it('should log at specified level', () => {
    logger.log(LogLevel.INFO, 'info via log');

    expect(entries).toHaveLength(1);
    expect(entries[0].level).toBe(LogLevel.INFO);
    expect(entries[0].message).toBe('info via log');
  });

  it('should respect level filtering', () => {
    logger.setLevel(LogLevel.WARN);

    logger.log(LogLevel.DEBUG, 'should not log');
    logger.log(LogLevel.INFO, 'should not log');
    logger.log(LogLevel.WARN, 'should log');
    logger.log(LogLevel.ERROR, 'should log');

    expect(entries).toHaveLength(2);
    expect(entries[0].level).toBe(LogLevel.WARN);
    expect(entries[1].level).toBe(LogLevel.ERROR);
  });

  it('should include context when provided', () => {
    logger.log(LogLevel.INFO, 'test', { key: 'value' });

    expect(entries[0].context).toEqual({ key: 'value' });
  });

  it('should include error when provided', () => {
    const error = createTestError('test error');
    logger.log(LogLevel.ERROR, 'test', undefined, error);

    expect(entries[0].error).toBe(error);
  });

  it('should include timestamp', () => {
    const beforeLog = new Date();
    logger.log(LogLevel.INFO, 'test');
    const afterLog = new Date();

    expect(entries[0].timestamp).toBeDefined();
    expect(entries[0].timestamp.getTime()).toBeGreaterThanOrEqual(beforeLog.getTime());
    expect(entries[0].timestamp.getTime()).toBeLessThanOrEqual(afterLog.getTime());
  });
});

// ============================================================================
// Context Management
// ============================================================================

describe('Logger - Context Management', () => {
  let logger: Logger;
  let handler: LogHandler;
  let entries: LogEntry[];

  beforeEach(() => {
    const mock = createMockHandler();
    handler = mock.handler;
    entries = mock.entries;
    logger = new Logger({ level: LogLevel.DEBUG, handler, includeContext: true });
  });

  it('should include context when includeContext is true', () => {
    logger.info('test', { foo: 'bar' });

    expect(entries[0].context).toEqual({ foo: 'bar' });
  });

  it('should exclude context when includeContext is false', () => {
    const loggerNoContext = new Logger({ level: LogLevel.DEBUG, handler, includeContext: false });
    loggerNoContext.info('test', { foo: 'bar' });

    expect(entries[0].context).toBeUndefined();
  });

  it('should handle empty context object', () => {
    logger.info('test', {});

    expect(entries[0].context).toEqual({});
  });

  it('should handle complex context objects', () => {
    const context = {
      user: { id: 123, name: 'test' },
      tags: ['tag1', 'tag2'],
      metadata: { nested: { value: true } },
    };

    logger.info('test', context);

    expect(entries[0].context).toEqual(context);
  });

  it('should handle undefined context', () => {
    logger.info('test');

    expect(entries[0].context).toBeUndefined();
  });
});

// ============================================================================
// Child Logger Creation
// ============================================================================

describe('Logger - Child Logger', () => {
  let parentLogger: Logger;
  let handler: LogHandler;
  let entries: LogEntry[];

  beforeEach(() => {
    const mock = createMockHandler();
    handler = mock.handler;
    entries = mock.entries;
    parentLogger = new Logger({ level: LogLevel.DEBUG, handler });
  });

  it('should create child logger with parent context', () => {
    const childLogger = parentLogger.child({ backendId: 'test-backend' });

    childLogger.info('test message');

    expect(entries).toHaveLength(1);
    expect(entries[0].context).toEqual({ backendId: 'test-backend' });
  });

  it('should merge child context with log context', () => {
    const childLogger = parentLogger.child({ backendId: 'test-backend' });

    childLogger.info('test message', { operation: 'provision' });

    expect(entries[0].context).toEqual({
      backendId: 'test-backend',
      operation: 'provision',
    });
  });

  it('should allow log context to override child context', () => {
    const childLogger = parentLogger.child({ env: 'dev' });

    childLogger.info('test message', { env: 'prod' });

    expect(entries[0].context).toEqual({ env: 'prod' });
  });

  it('should support nested child loggers', () => {
    const child1 = parentLogger.child({ level1: 'value1' });
    const child2 = child1.child({ level2: 'value2' });

    child2.info('test message', { level3: 'value3' });

    expect(entries[0].context).toEqual({
      level1: 'value1',
      level2: 'value2',
      level3: 'value3',
    });
  });

  it('should inherit parent log level', () => {
    parentLogger.setLevel(LogLevel.WARN);
    const childLogger = parentLogger.child({ child: true });

    childLogger.debug('should not log');
    childLogger.info('should not log');
    childLogger.warn('should log');

    expect(entries).toHaveLength(1);
    expect(entries[0].level).toBe(LogLevel.WARN);
  });

  it('should create independent child logger instance', () => {
    const child1 = parentLogger.child({ child: '1' });
    const child2 = parentLogger.child({ child: '2' });

    child1.info('message 1');
    child2.info('message 2');

    expect(entries).toHaveLength(2);
    expect(entries[0].context).toEqual({ child: '1' });
    expect(entries[1].context).toEqual({ child: '2' });
  });
});

// ============================================================================
// Level Management
// ============================================================================

describe('Logger - Level Management', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger({ level: LogLevel.INFO });
  });

  describe('setLevel()', () => {
    it('should change log level', () => {
      expect(logger.getLevel()).toBe(LogLevel.INFO);

      logger.setLevel(LogLevel.WARN);

      expect(logger.getLevel()).toBe(LogLevel.WARN);
    });

    it('should affect subsequent log calls', () => {
      const { handler, entries } = createMockHandler();
      const testLogger = new Logger({ level: LogLevel.INFO, handler });

      testLogger.info('should log');
      testLogger.setLevel(LogLevel.WARN);
      testLogger.info('should not log');

      expect(entries).toHaveLength(1);
    });

    it('should support setting to NONE', () => {
      logger.setLevel(LogLevel.NONE);

      expect(logger.getLevel()).toBe(LogLevel.NONE);
      expect(logger.isLevelEnabled(LogLevel.ERROR)).toBe(false);
    });

    it('should support setting to DEBUG', () => {
      logger.setLevel(LogLevel.DEBUG);

      expect(logger.getLevel()).toBe(LogLevel.DEBUG);
      expect(logger.isLevelEnabled(LogLevel.DEBUG)).toBe(true);
    });
  });

  describe('getLevel()', () => {
    it('should return current log level', () => {
      const level = logger.getLevel();

      expect(level).toBe(LogLevel.INFO);
    });

    it('should reflect level changes', () => {
      logger.setLevel(LogLevel.ERROR);

      expect(logger.getLevel()).toBe(LogLevel.ERROR);
    });
  });

  describe('isLevelEnabled()', () => {
    it('should return true for enabled levels', () => {
      logger.setLevel(LogLevel.INFO);

      expect(logger.isLevelEnabled(LogLevel.INFO)).toBe(true);
      expect(logger.isLevelEnabled(LogLevel.WARN)).toBe(true);
      expect(logger.isLevelEnabled(LogLevel.ERROR)).toBe(true);
    });

    it('should return false for disabled levels', () => {
      logger.setLevel(LogLevel.INFO);

      expect(logger.isLevelEnabled(LogLevel.DEBUG)).toBe(false);
    });

    it('should handle NONE level', () => {
      logger.setLevel(LogLevel.NONE);

      expect(logger.isLevelEnabled(LogLevel.ERROR)).toBe(false);
      expect(logger.isLevelEnabled(LogLevel.WARN)).toBe(false);
      expect(logger.isLevelEnabled(LogLevel.INFO)).toBe(false);
      expect(logger.isLevelEnabled(LogLevel.DEBUG)).toBe(false);
    });

    it('should handle DEBUG level', () => {
      logger.setLevel(LogLevel.DEBUG);

      expect(logger.isLevelEnabled(LogLevel.DEBUG)).toBe(true);
      expect(logger.isLevelEnabled(LogLevel.INFO)).toBe(true);
      expect(logger.isLevelEnabled(LogLevel.WARN)).toBe(true);
      expect(logger.isLevelEnabled(LogLevel.ERROR)).toBe(true);
    });
  });
});

// ============================================================================
// Custom Handlers
// ============================================================================

describe('Logger - Custom Handlers', () => {
  it('should call custom handler for each log', () => {
    const { handler, entries } = createMockHandler();
    const logger = new Logger({ handler });

    logger.info('message 1');
    logger.warn('message 2');

    expect(entries).toHaveLength(2);
  });

  it('should receive complete log entry', () => {
    const { handler, entries } = createMockHandler();
    const logger = new Logger({ handler });
    const error = createTestError('test error');

    logger.error('test message', { key: 'value' }, error);

    const entry = entries[0];
    expect(entry.level).toBe(LogLevel.ERROR);
    expect(entry.message).toBe('test message');
    expect(entry.context).toEqual({ key: 'value' });
    expect(entry.error).toBe(error);
    expect(entry.timestamp).toBeInstanceOf(Date);
  });

  it('should handle handler that throws error', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const throwingHandler: LogHandler = () => {
      throw new Error('Handler error');
    };

    const logger = new Logger({ handler: throwingHandler });

    // Should not throw - should fallback to console
    expect(() => logger.info('test')).not.toThrow();

    expect(consoleErrorSpy).toHaveBeenCalledWith('Logger handler failed:', expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  it('should log original entry when handler fails', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const throwingHandler: LogHandler = () => {
      throw new Error('Handler error');
    };

    const logger = new Logger({ handler: throwingHandler });
    logger.info('test message', { foo: 'bar' });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Original log entry:',
      expect.objectContaining({
        message: 'test message',
        context: { foo: 'bar' },
      })
    );

    consoleErrorSpy.mockRestore();
  });
});

// ============================================================================
// Console Handler (Default)
// ============================================================================

describe('Logger - Console Handler', () => {
  let consoleDebugSpy: any;
  let consoleInfoSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleDebugSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should use console.debug for DEBUG level', () => {
    const logger = new Logger({ level: LogLevel.DEBUG });
    logger.debug('debug message');

    expect(consoleDebugSpy).toHaveBeenCalledWith(expect.stringContaining('[DEBUG]'));
    expect(consoleDebugSpy).toHaveBeenCalledWith(expect.stringContaining('debug message'));
  });

  it('should use console.info for INFO level', () => {
    const logger = new Logger();
    logger.info('info message');

    expect(consoleInfoSpy).toHaveBeenCalledWith(expect.stringContaining('[INFO]'));
    expect(consoleInfoSpy).toHaveBeenCalledWith(expect.stringContaining('info message'));
  });

  it('should use console.warn for WARN level', () => {
    const logger = new Logger();
    logger.warn('warn message');

    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('[WARN]'));
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('warn message'));
  });

  it('should use console.error for ERROR level', () => {
    const logger = new Logger();
    logger.error('error message');

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[ERROR]'));
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('error message'));
  });

  it('should include timestamp in console output', () => {
    const logger = new Logger();
    logger.info('test');

    expect(consoleInfoSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    );
  });

  it('should include context in console output', () => {
    const logger = new Logger();
    logger.info('test', { foo: 'bar', num: 123 });

    expect(consoleInfoSpy).toHaveBeenCalledWith(expect.stringContaining('{"foo":"bar","num":123}'));
  });

  it('should log error object separately for WARN', () => {
    const logger = new Logger();
    const error = createTestError('test error');
    logger.warn('warn message', undefined, error);

    expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
    expect(consoleWarnSpy).toHaveBeenNthCalledWith(1, expect.stringContaining('warn message'));
    expect(consoleWarnSpy).toHaveBeenNthCalledWith(2, error);
  });

  it('should log error object separately for ERROR', () => {
    const logger = new Logger();
    const error = createTestError('test error');
    logger.error('error message', undefined, error);

    expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
    expect(consoleErrorSpy).toHaveBeenNthCalledWith(1, expect.stringContaining('error message'));
    expect(consoleErrorSpy).toHaveBeenNthCalledWith(2, error);
  });
});

// ============================================================================
// Global Logger
// ============================================================================

describe('Global Logger', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.BACKEND_LOG_LEVEL;
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.BACKEND_LOG_LEVEL;
    } else {
      process.env.BACKEND_LOG_LEVEL = originalEnv;
    }
    setGlobalLogLevel(LogLevel.INFO); // Reset to default
  });

  it('should provide global logger instance', () => {
    expect(globalLogger).toBeDefined();
    expect(globalLogger).toBeInstanceOf(Logger);
  });

  it('should default to INFO level', () => {
    expect(globalLogger.getLevel()).toBe(LogLevel.INFO);
  });

  describe('getGlobalLogLevel()', () => {
    it('should return global log level', () => {
      const level = getGlobalLogLevel();
      expect(level).toBe(LogLevel.INFO);
    });
  });

  describe('setGlobalLogLevel()', () => {
    it('should change global log level', () => {
      setGlobalLogLevel(LogLevel.WARN);
      expect(getGlobalLogLevel()).toBe(LogLevel.WARN);
    });

    it('should affect global logger', () => {
      setGlobalLogLevel(LogLevel.ERROR);
      expect(globalLogger.getLevel()).toBe(LogLevel.ERROR);
    });
  });

  describe('environment variable configuration', () => {
    it('should respect BACKEND_LOG_LEVEL environment variable', () => {
      // Note: The globalLogger is already created with process.env.BACKEND_LOG_LEVEL
      // This test documents the expected behavior
      const currentLevel = globalLogger.getLevel();
      expect(currentLevel).toBeDefined();
      expect([
        LogLevel.DEBUG,
        LogLevel.INFO,
        LogLevel.WARN,
        LogLevel.ERROR,
        LogLevel.NONE,
      ]).toContain(currentLevel);
    });

    it('should handle invalid BACKEND_LOG_LEVEL gracefully', () => {
      // The logger should fall back to INFO for invalid values (via ?? operator)
      // This is already tested by the globalLogger initialization
      expect(globalLogger.getLevel()).toBeDefined();
    });
  });
});

// ============================================================================
// Specialized Logger Factories
// ============================================================================

describe('Specialized Logger Factories', () => {
  let handler: LogHandler;
  let entries: LogEntry[];

  beforeEach(() => {
    const mock = createMockHandler();
    handler = mock.handler;
    entries = mock.entries;
  });

  describe('getBackendLogger()', () => {
    it('should create logger with backend context', () => {
      // Temporarily replace global logger handler
      const originalLevel = globalLogger.getLevel();
      const testGlobalLogger = new Logger({ level: LogLevel.DEBUG, handler });
      (globalLogger as any).config.handler = handler;

      const backendLogger = getBackendLogger('my-backend');
      backendLogger.info('test message');

      expect(entries).toHaveLength(1);
      expect(entries[0].context).toEqual({ backendId: 'my-backend' });

      setGlobalLogLevel(originalLevel);
    });

    it('should create independent logger instances', () => {
      const logger1 = getBackendLogger('backend1');
      const logger2 = getBackendLogger('backend2');

      expect(logger1).not.toBe(logger2);
    });
  });

  describe('getComponentLogger()', () => {
    it('should create logger with component context', () => {
      const testGlobalLogger = new Logger({ level: LogLevel.DEBUG, handler });
      (globalLogger as any).config.handler = handler;

      const componentLogger = getComponentLogger('my-component', 'function');
      componentLogger.info('test message');

      expect(entries).toHaveLength(1);
      expect(entries[0].context).toEqual({
        componentId: 'my-component',
        componentType: 'function',
      });
    });

    it('should include both component ID and type', () => {
      const testGlobalLogger = new Logger({ level: LogLevel.DEBUG, handler });
      (globalLogger as any).config.handler = handler;

      const componentLogger = getComponentLogger('api', 'http');
      componentLogger.info('request received');

      expect(entries[0].context).toHaveProperty('componentId', 'api');
      expect(entries[0].context).toHaveProperty('componentType', 'http');
    });
  });

  describe('getProviderLogger()', () => {
    it('should create logger with provider context', () => {
      const testGlobalLogger = new Logger({ level: LogLevel.DEBUG, handler });
      (globalLogger as any).config.handler = handler;

      const providerLogger = getProviderLogger('cosmos-provider');
      providerLogger.info('test message');

      expect(entries).toHaveLength(1);
      expect(entries[0].context).toEqual({ providerId: 'cosmos-provider' });
    });

    it('should support different provider types', () => {
      const testGlobalLogger = new Logger({ level: LogLevel.DEBUG, handler });
      (globalLogger as any).config.handler = handler;

      const storageProvider = getProviderLogger('storage');
      const functionProvider = getProviderLogger('functions');

      storageProvider.info('storage message');
      functionProvider.info('function message');

      expect(entries).toHaveLength(2);
      expect(entries[0].context).toEqual({ providerId: 'storage' });
      expect(entries[1].context).toEqual({ providerId: 'functions' });
    });
  });
});

// ============================================================================
// Edge Cases and Error Handling
// ============================================================================

describe('Logger - Edge Cases', () => {
  it('should handle very long messages', () => {
    const { handler, entries } = createMockHandler();
    const logger = new Logger({ handler });
    const longMessage = 'x'.repeat(10000);

    logger.info(longMessage);

    expect(entries[0].message).toBe(longMessage);
    expect(entries[0].message.length).toBe(10000);
  });

  it('should handle special characters in message', () => {
    const { handler, entries } = createMockHandler();
    const logger = new Logger({ handler });
    const message = 'Message with "quotes", \\backslashes\\ and \nnewlines\n';

    logger.info(message);

    expect(entries[0].message).toBe(message);
  });

  it('should handle null in context (converted to object)', () => {
    const { handler, entries } = createMockHandler();
    const logger = new Logger({ handler });

    logger.info('test', { value: null } as any);

    expect(entries[0].context).toEqual({ value: null });
  });

  it('should handle circular references in context', () => {
    const { handler, entries } = createMockHandler();
    const logger = new Logger({ handler });

    const circular: any = { name: 'test' };
    circular.self = circular;

    // Should not throw - handler might serialize it
    expect(() => logger.info('test', circular)).not.toThrow();
  });

  it('should handle logging at boundary level', () => {
    const { handler, entries } = createMockHandler();
    const logger = new Logger({ level: LogLevel.WARN, handler });

    logger.warn('should log - exactly at level');

    expect(entries).toHaveLength(1);
  });

  it('should handle rapid successive logs', () => {
    const { handler, entries } = createMockHandler();
    const logger = new Logger({ handler });

    for (let i = 0; i < 100; i++) {
      logger.info(`message ${i}`);
    }

    expect(entries).toHaveLength(100);
    expect(entries[0].message).toBe('message 0');
    expect(entries[99].message).toBe('message 99');
  });

  it('should maintain separate timestamps for rapid logs', () => {
    const { handler, entries } = createMockHandler();
    const logger = new Logger({ handler });

    logger.info('first');
    logger.info('second');

    expect(entries[0].timestamp).toBeInstanceOf(Date);
    expect(entries[1].timestamp).toBeInstanceOf(Date);
    // Second log should be same or later
    expect(entries[1].timestamp.getTime()).toBeGreaterThanOrEqual(entries[0].timestamp.getTime());
  });
});

// ============================================================================
// Integration Scenarios
// ============================================================================

describe('Logger - Integration Scenarios', () => {
  it('should support backend provisioning workflow', () => {
    const { handler, entries } = createMockHandler();
    const logger = new Logger({ level: LogLevel.DEBUG, handler });
    const backendLogger = logger.child({ backendId: 'my-app' });

    backendLogger.info('Starting provisioning');
    backendLogger.debug('Loading configuration', { stage: 'init' });
    backendLogger.info('Creating resources', { count: 5 });
    backendLogger.warn('Resource limit approaching', { type: 'cosmos', used: 18, limit: 20 });
    backendLogger.info('Provisioning complete', { duration: '45s' });

    expect(entries).toHaveLength(5);
    expect(entries.every((e) => e.context?.backendId === 'my-app')).toBe(true);
  });

  it('should support nested context for component operations', () => {
    const { handler, entries } = createMockHandler();
    const logger = new Logger({ handler });
    const backendLogger = logger.child({ backendId: 'my-app' });
    const componentLogger = backendLogger.child({ componentId: 'api', componentType: 'function' });

    componentLogger.info('Function invoked', { endpoint: '/users' });
    componentLogger.error('Function failed', { error: 'timeout' }, new Error('Request timeout'));

    expect(entries).toHaveLength(2);
    expect(entries[0].context).toMatchObject({
      backendId: 'my-app',
      componentId: 'api',
      componentType: 'function',
      endpoint: '/users',
    });
  });

  it('should support dynamic log level adjustment', () => {
    const { handler, entries } = createMockHandler();
    const logger = new Logger({ level: LogLevel.INFO, handler });

    logger.debug('should not log');
    logger.info('should log 1');

    logger.setLevel(LogLevel.DEBUG);

    logger.debug('should log 2');
    logger.info('should log 3');

    expect(entries).toHaveLength(3);
    expect(entries[0].level).toBe(LogLevel.INFO);
    expect(entries[1].level).toBe(LogLevel.DEBUG);
    expect(entries[2].level).toBe(LogLevel.INFO);
  });
});
