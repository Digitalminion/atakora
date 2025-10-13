/**
 * Backend Pattern Logging
 *
 * This file provides structured logging for the backend pattern,
 * enabling debugging and operational visibility.
 *
 * @module @atakora/component/backend/logger
 */

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

/**
 * Log entry structure
 */
export interface LogEntry {
  readonly level: LogLevel;
  readonly timestamp: Date;
  readonly message: string;
  readonly context?: Record<string, unknown>;
  readonly error?: Error;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  /** Minimum log level to output */
  readonly level: LogLevel;

  /** Whether to include timestamps */
  readonly includeTimestamp?: boolean;

  /** Whether to include context data */
  readonly includeContext?: boolean;

  /** Custom log handler */
  readonly handler?: LogHandler;
}

/**
 * Log handler function type
 */
export type LogHandler = (entry: LogEntry) => void;

/**
 * Default console log handler
 */
const consoleHandler: LogHandler = (entry: LogEntry) => {
  const parts: string[] = [];

  // Timestamp
  parts.push(`[${entry.timestamp.toISOString()}]`);

  // Level
  parts.push(`[${LogLevel[entry.level]}]`);

  // Message
  parts.push(entry.message);

  // Context
  if (entry.context && Object.keys(entry.context).length > 0) {
    parts.push(JSON.stringify(entry.context));
  }

  // Output based on level
  const message = parts.join(' ');
  switch (entry.level) {
    case LogLevel.DEBUG:
      console.debug(message);
      break;
    case LogLevel.INFO:
      console.info(message);
      break;
    case LogLevel.WARN:
      console.warn(message);
      if (entry.error) {
        console.warn(entry.error);
      }
      break;
    case LogLevel.ERROR:
      console.error(message);
      if (entry.error) {
        console.error(entry.error);
      }
      break;
  }
};

/**
 * Logger for backend operations.
 * Provides structured logging with configurable levels and handlers.
 *
 * @example
 * ```typescript
 * const logger = new Logger({ level: LogLevel.INFO });
 *
 * logger.info('Backend initialized', { backendId: 'MyBackend' });
 * logger.warn('Resource limit approaching', { type: 'cosmos', count: 20 });
 * logger.error('Provisioning failed', { resourceType: 'functions' }, error);
 * ```
 */
export class Logger {
  private readonly config: Required<LoggerConfig>;

  /**
   * Create a new Logger instance.
   *
   * @param config - Logger configuration
   */
  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: config.level ?? LogLevel.INFO,
      includeTimestamp: config.includeTimestamp ?? true,
      includeContext: config.includeContext ?? true,
      handler: config.handler ?? consoleHandler,
    };
  }

  /**
   * Log a debug message.
   *
   * @param message - Log message
   * @param context - Additional context
   */
  public debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log an info message.
   *
   * @param message - Log message
   * @param context - Additional context
   */
  public info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log a warning message.
   *
   * @param message - Log message
   * @param context - Additional context
   * @param error - Optional error
   */
  public warn(message: string, context?: Record<string, unknown>, error?: Error): void {
    this.log(LogLevel.WARN, message, context, error);
  }

  /**
   * Log an error message.
   *
   * @param message - Log message
   * @param context - Additional context
   * @param error - Optional error
   */
  public error(message: string, context?: Record<string, unknown>, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Log a message at the specified level.
   *
   * @param level - Log level
   * @param message - Log message
   * @param context - Additional context
   * @param error - Optional error
   */
  public log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): void {
    // Check if this level should be logged
    if (level < this.config.level) {
      return;
    }

    // Create log entry
    const entry: LogEntry = {
      level,
      timestamp: new Date(),
      message,
      context: this.config.includeContext ? context : undefined,
      error,
    };

    // Call handler
    try {
      this.config.handler(entry);
    } catch (handlerError) {
      // Fallback to console if handler fails
      console.error('Logger handler failed:', handlerError);
      console.error('Original log entry:', entry);
    }
  }

  /**
   * Create a child logger with additional context.
   * Child logger inherits parent configuration but adds context to all logs.
   *
   * @param context - Context to add to all child logs
   * @returns Child logger
   */
  public child(context: Record<string, unknown>): Logger {
    const parentHandler = this.config.handler;

    // Create handler that merges context
    const childHandler: LogHandler = (entry: LogEntry) => {
      const mergedContext = {
        ...context,
        ...entry.context,
      };
      parentHandler({
        ...entry,
        context: mergedContext,
      });
    };

    return new Logger({
      ...this.config,
      handler: childHandler,
    });
  }

  /**
   * Set the minimum log level.
   *
   * @param level - New log level
   */
  public setLevel(level: LogLevel): void {
    (this.config as { level: LogLevel }).level = level;
  }

  /**
   * Get the current log level.
   *
   * @returns Current log level
   */
  public getLevel(): LogLevel {
    return this.config.level;
  }

  /**
   * Check if a log level is enabled.
   *
   * @param level - Level to check
   * @returns True if level is enabled
   */
  public isLevelEnabled(level: LogLevel): boolean {
    return level >= this.config.level;
  }
}

/**
 * Global logger instance.
 * Can be used across the backend system.
 */
export const globalLogger = new Logger({
  level: process.env.BACKEND_LOG_LEVEL
    ? (LogLevel[process.env.BACKEND_LOG_LEVEL as keyof typeof LogLevel] ?? LogLevel.INFO)
    : LogLevel.INFO,
});

/**
 * Get a logger for a specific backend.
 * Creates a child logger with backend context.
 *
 * @param backendId - Backend identifier
 * @returns Logger with backend context
 */
export function getBackendLogger(backendId: string): Logger {
  return globalLogger.child({ backendId });
}

/**
 * Get a logger for a specific component.
 * Creates a child logger with component context.
 *
 * @param componentId - Component identifier
 * @param componentType - Component type
 * @returns Logger with component context
 */
export function getComponentLogger(componentId: string, componentType: string): Logger {
  return globalLogger.child({ componentId, componentType });
}

/**
 * Get a logger for a specific resource provider.
 * Creates a child logger with provider context.
 *
 * @param providerId - Provider identifier
 * @returns Logger with provider context
 */
export function getProviderLogger(providerId: string): Logger {
  return globalLogger.child({ providerId });
}

/**
 * Set the global log level.
 *
 * @param level - Log level to set
 */
export function setGlobalLogLevel(level: LogLevel): void {
  globalLogger.setLevel(level);
}

/**
 * Get the global log level.
 *
 * @returns Current global log level
 */
export function getGlobalLogLevel(): LogLevel {
  return globalLogger.getLevel();
}
