/**
 * Logging Service
 *
 * @remarks
 * Enhanced logging service with structured logging capabilities.
 * Extends the basic logger with additional features.
 *
 * @packageDocumentation
 */

/**
 * Log level
 *
 * @public
 */
export type LogLevel = 'verbose' | 'info' | 'warn' | 'error' | 'critical';

/**
 * Structured log entry
 *
 * @public
 */
export interface LogEntry {
  /**
   * Log level
   */
  readonly level: LogLevel;

  /**
   * Log message
   */
  readonly message: string;

  /**
   * Timestamp (ISO string)
   */
  readonly timestamp: string;

  /**
   * Execution context ID
   */
  readonly executionId?: string;

  /**
   * Custom properties
   */
  readonly properties?: Record<string, any>;

  /**
   * Metrics/measurements
   */
  readonly measurements?: Record<string, number>;

  /**
   * Error information
   */
  readonly error?: {
    readonly message: string;
    readonly stack?: string;
    readonly code?: string;
  };
}

/**
 * Logging service interface
 *
 * @remarks
 * Enhanced logging with structured data and custom sinks.
 *
 * @public
 */
export interface LoggingService {
  /**
   * Log a message
   */
  log(level: LogLevel, message: string, properties?: Record<string, any>): Promise<void>;

  /**
   * Log verbose message
   */
  verbose(message: string, properties?: Record<string, any>): Promise<void>;

  /**
   * Log info message
   */
  info(message: string, properties?: Record<string, any>): Promise<void>;

  /**
   * Log warning message
   */
  warn(message: string, properties?: Record<string, any>): Promise<void>;

  /**
   * Log error message
   */
  error(message: string, error?: Error, properties?: Record<string, any>): Promise<void>;

  /**
   * Log critical message
   */
  critical(message: string, error?: Error, properties?: Record<string, any>): Promise<void>;

  /**
   * Flush buffered logs
   */
  flush(): Promise<void>;
}

/**
 * Basic logging service implementation
 *
 * @remarks
 * Simple logging service that writes to console and Application Insights.
 *
 * @public
 */
export class BasicLoggingService implements LoggingService {
  private readonly executionId?: string;
  private readonly logBuffer: LogEntry[] = [];
  private readonly bufferSize: number;

  /**
   * Create a basic logging service
   *
   * @param options - Service options
   */
  constructor(
    options: {
      executionId?: string;
      bufferSize?: number;
    } = {}
  ) {
    this.executionId = options.executionId;
    this.bufferSize = options.bufferSize ?? 100;
  }

  /**
   * Log a message
   */
  async log(level: LogLevel, message: string, properties?: Record<string, any>): Promise<void> {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      executionId: this.executionId,
      properties,
    };

    // Add to buffer
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.bufferSize) {
      this.logBuffer.shift();
    }

    // Write to console
    this.writeToConsole(entry);
  }

  /**
   * Log verbose message
   */
  async verbose(message: string, properties?: Record<string, any>): Promise<void> {
    await this.log('verbose', message, properties);
  }

  /**
   * Log info message
   */
  async info(message: string, properties?: Record<string, any>): Promise<void> {
    await this.log('info', message, properties);
  }

  /**
   * Log warning message
   */
  async warn(message: string, properties?: Record<string, any>): Promise<void> {
    await this.log('warn', message, properties);
  }

  /**
   * Log error message
   */
  async error(message: string, error?: Error, properties?: Record<string, any>): Promise<void> {
    const entry: LogEntry = {
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      executionId: this.executionId,
      properties,
      error: error
        ? {
            message: error.message,
            stack: error.stack,
            code: (error as any).code,
          }
        : undefined,
    };

    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.bufferSize) {
      this.logBuffer.shift();
    }

    this.writeToConsole(entry);
  }

  /**
   * Log critical message
   */
  async critical(message: string, error?: Error, properties?: Record<string, any>): Promise<void> {
    const entry: LogEntry = {
      level: 'critical',
      message,
      timestamp: new Date().toISOString(),
      executionId: this.executionId,
      properties,
      error: error
        ? {
            message: error.message,
            stack: error.stack,
            code: (error as any).code,
          }
        : undefined,
    };

    this.logBuffer.push(entry);
    this.writeToConsole(entry);

    // Critical logs are flushed immediately
    await this.flush();
  }

  /**
   * Flush buffered logs
   */
  async flush(): Promise<void> {
    // In a real implementation, this would send logs to Application Insights
    // For now, we just clear the buffer
    this.logBuffer.length = 0;
  }

  /**
   * Write log entry to console
   */
  private writeToConsole(entry: LogEntry): void {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
    const message = `${prefix} ${entry.message}`;

    switch (entry.level) {
      case 'error':
      case 'critical':
        console.error(message, entry.properties, entry.error);
        break;
      case 'warn':
        console.warn(message, entry.properties);
        break;
      case 'verbose':
        if (process.env.NODE_ENV === 'development') {
          console.log(message, entry.properties);
        }
        break;
      default:
        console.log(message, entry.properties);
    }
  }
}
