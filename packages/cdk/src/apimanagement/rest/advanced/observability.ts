/**
 * Observability and Tracing
 *
 * Provides comprehensive observability capabilities for REST APIs including:
 * - W3C Trace Context propagation
 * - Request/response logging with sensitive data masking
 * - Custom metrics (counters, histograms, gauges)
 * - Application Insights integration
 * - Correlation ID management
 * - Distributed tracing support
 *
 * @see ADR-015 REST Advanced Features - Section 9: Observability & Tracing
 */

/**
 * W3C Trace Context configuration
 *
 * Configures distributed tracing using W3C Trace Context standard.
 *
 * @see https://www.w3.org/TR/trace-context/
 *
 * @example
 * ```typescript
 * const config: TracingConfig = {
 *   enabled: true,
 *   samplingRate: 0.1,
 *   propagators: ['traceparent', 'tracestate']
 * };
 * ```
 */
export interface TracingConfig {
  /**
   * Whether tracing is enabled
   * @default true
   */
  readonly enabled?: boolean;

  /**
   * Sampling rate (0.0 to 1.0)
   * @default 1.0
   */
  readonly samplingRate?: number;

  /**
   * Trace propagators to use
   * @default ['traceparent', 'tracestate']
   */
  readonly propagators?: readonly string[];

  /**
   * Whether to include request body in traces
   * @default false
   */
  readonly includeRequestBody?: boolean;

  /**
   * Whether to include response body in traces
   * @default false
   */
  readonly includeResponseBody?: boolean;

  /**
   * Custom trace attributes to include
   */
  readonly customAttributes?: Record<string, string>;
}

/**
 * Request/response logging configuration
 *
 * Configures logging behavior with support for sensitive data masking.
 *
 * @example
 * ```typescript
 * const config: LoggingOptions = {
 *   logLevel: 'info',
 *   logRequests: true,
 *   logResponses: true,
 *   maskSensitiveData: true,
 *   sensitiveFields: ['password', 'ssn', 'creditCard']
 * };
 * ```
 */
export interface LoggingOptions {
  /**
   * Log level
   * @default 'info'
   */
  readonly logLevel?: LogLevel;

  /**
   * Whether to log requests
   * @default true
   */
  readonly logRequests?: boolean;

  /**
   * Whether to log responses
   * @default true
   */
  readonly logResponses?: boolean;

  /**
   * Whether to log request/response headers
   * @default false
   */
  readonly logHeaders?: boolean;

  /**
   * Whether to log request/response body
   * @default false
   */
  readonly logBody?: boolean;

  /**
   * Whether to mask sensitive data
   * @default true
   */
  readonly maskSensitiveData?: boolean;

  /**
   * List of sensitive field names to mask
   */
  readonly sensitiveFields?: readonly string[];

  /**
   * List of sensitive headers to mask
   * @default ['authorization', 'cookie', 'x-api-key']
   */
  readonly sensitiveHeaders?: readonly string[];

  /**
   * Maximum body size to log (in bytes)
   * @default 10000
   */
  readonly maxBodySize?: number;
}

/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Logging configuration result
 */
export interface LoggingConfig {
  readonly options: LoggingOptions;
  readonly maskPatterns: readonly MaskPattern[];
}

/**
 * Pattern for masking sensitive data
 */
export interface MaskPattern {
  readonly field: string;
  readonly replacement: string;
}

/**
 * Custom metric configuration
 *
 * Defines a custom metric to be collected.
 *
 * @example
 * ```typescript
 * const config: MetricConfig = {
 *   name: 'api.requests.total',
 *   type: 'counter',
 *   description: 'Total number of API requests',
 *   dimensions: ['method', 'status_code']
 * };
 * ```
 */
export interface MetricConfig {
  /**
   * Metric name
   */
  readonly name: string;

  /**
   * Metric type
   */
  readonly type: 'counter' | 'histogram' | 'gauge';

  /**
   * Human-readable description
   */
  readonly description?: string;

  /**
   * Metric unit (e.g., 'ms', 'bytes', 'count')
   */
  readonly unit?: string;

  /**
   * Dimension names for metric aggregation
   */
  readonly dimensions?: readonly string[];

  /**
   * Histogram buckets (for histogram metrics)
   */
  readonly buckets?: readonly number[];
}

/**
 * Application Insights configuration
 *
 * Configures Azure Application Insights integration.
 *
 * @example
 * ```typescript
 * const config: ObservabilityConfig = {
 *   instrumentationKey: 'your-key-here',
 *   enableLiveMetrics: true,
 *   enableDependencyTracking: true
 * };
 * ```
 */
export interface ObservabilityConfig {
  /**
   * Application Insights instrumentation key
   */
  readonly instrumentationKey?: string;

  /**
   * Application Insights connection string
   */
  readonly connectionString?: string;

  /**
   * Whether to enable live metrics
   * @default true
   */
  readonly enableLiveMetrics?: boolean;

  /**
   * Whether to enable dependency tracking
   * @default true
   */
  readonly enableDependencyTracking?: boolean;

  /**
   * Whether to enable auto-collection of requests
   * @default true
   */
  readonly enableAutoCollectRequests?: boolean;

  /**
   * Whether to enable auto-collection of dependencies
   * @default true
   */
  readonly enableAutoCollectDependencies?: boolean;

  /**
   * Sampling percentage (0-100)
   * @default 100
   */
  readonly samplingPercentage?: number;

  /**
   * Custom properties to add to all telemetry
   */
  readonly commonProperties?: Record<string, string>;
}

/**
 * Correlation ID configuration
 *
 * Configures correlation ID handling for request tracking.
 *
 * @example
 * ```typescript
 * const config: CorrelationConfig = {
 *   headerName: 'X-Correlation-ID',
 *   generateIfMissing: true,
 *   includeInResponse: true
 * };
 * ```
 */
export interface CorrelationConfig {
  /**
   * HTTP header name for correlation ID
   * @default 'X-Correlation-ID'
   */
  readonly headerName?: string;

  /**
   * Whether to generate correlation ID if not present
   * @default true
   */
  readonly generateIfMissing?: boolean;

  /**
   * Whether to include correlation ID in response
   * @default true
   */
  readonly includeInResponse?: boolean;

  /**
   * Correlation ID format validator
   */
  readonly validator?: (id: string) => boolean;
}

/**
 * W3C Trace Context helper
 *
 * Provides utilities for W3C Trace Context propagation.
 *
 * @see https://www.w3.org/TR/trace-context/
 *
 * @example
 * ```typescript
 * const config = TraceContext.enable(0.1);
 * const propagate = TraceContext.propagate(['traceparent', 'tracestate']);
 * ```
 */
export class TraceContext {
  /**
   * Enable W3C Trace Context with optional sampling rate
   *
   * @param samplingRate - Sampling rate between 0.0 and 1.0
   * @returns Tracing configuration
   *
   * @example
   * ```typescript
   * const config = TraceContext.enable(0.1); // 10% sampling
   * ```
   */
  static enable(samplingRate?: number): TracingConfig {
    return {
      enabled: true,
      samplingRate: samplingRate ?? 1.0,
      propagators: ['traceparent', 'tracestate'],
    };
  }

  /**
   * Configure trace propagators
   *
   * @param propagators - List of propagator names
   * @returns Tracing configuration
   *
   * @example
   * ```typescript
   * const config = TraceContext.propagate(['traceparent', 'tracestate']);
   * ```
   */
  static propagate(propagators: readonly string[]): TracingConfig {
    return {
      enabled: true,
      propagators,
    };
  }

  /**
   * Generate a W3C traceparent header value
   *
   * Format: 00-{trace-id}-{parent-id}-{trace-flags}
   *
   * @param traceId - 32-character hex trace ID (optional, generated if not provided)
   * @param parentId - 16-character hex parent ID (optional, generated if not provided)
   * @param sampled - Whether this trace is sampled
   * @returns traceparent header value
   *
   * @example
   * ```typescript
   * const traceparent = TraceContext.generateTraceparent();
   * // Returns: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01'
   * ```
   */
  static generateTraceparent(
    traceId?: string,
    parentId?: string,
    sampled: boolean = true
  ): string {
    const tid = traceId || this.generateTraceId();
    const pid = parentId || this.generateSpanId();
    const flags = sampled ? '01' : '00';
    return `00-${tid}-${pid}-${flags}`;
  }

  /**
   * Parse a W3C traceparent header value
   *
   * @param traceparent - traceparent header value
   * @returns Parsed trace context
   *
   * @example
   * ```typescript
   * const context = TraceContext.parseTraceparent(
   *   '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01'
   * );
   * // Returns: { version: '00', traceId: '4bf...', ... }
   * ```
   */
  static parseTraceparent(traceparent: string): {
    version: string;
    traceId: string;
    parentId: string;
    traceFlags: string;
  } | null {
    const parts = traceparent.split('-');
    if (parts.length !== 4) return null;

    const [version, traceId, parentId, traceFlags] = parts;

    // Validate format
    if (version !== '00') return null;
    if (traceId.length !== 32 || !/^[0-9a-f]{32}$/.test(traceId)) return null;
    if (parentId.length !== 16 || !/^[0-9a-f]{16}$/.test(parentId)) return null;
    if (traceFlags.length !== 2 || !/^[0-9a-f]{2}$/.test(traceFlags))
      return null;

    return { version, traceId, parentId, traceFlags };
  }

  /**
   * Generate a random trace ID (32 hex characters)
   */
  static generateTraceId(): string {
    return this.randomHex(32);
  }

  /**
   * Generate a random span ID (16 hex characters)
   */
  static generateSpanId(): string {
    return this.randomHex(16);
  }

  /**
   * Generate random hexadecimal string
   */
  private static randomHex(length: number): string {
    const bytes = new Uint8Array(length / 2);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      // Fallback for Node.js
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
}

/**
 * Request logger with sensitive data masking
 *
 * Provides request/response logging capabilities with automatic
 * sensitive data masking.
 *
 * @example
 * ```typescript
 * const config = RequestLogger.configure({
 *   logLevel: 'info',
 *   maskSensitiveData: true,
 *   sensitiveFields: ['password', 'ssn']
 * });
 *
 * const maskConfig = RequestLogger.maskSensitiveData([
 *   'password',
 *   'creditCard',
 *   'ssn'
 * ]);
 * ```
 */
export class RequestLogger {
  /**
   * Configure request/response logging
   *
   * @param options - Logging options
   * @returns Logging configuration
   *
   * @example
   * ```typescript
   * const config = RequestLogger.configure({
   *   logLevel: 'info',
   *   logRequests: true,
   *   logResponses: true,
   *   maskSensitiveData: true
   * });
   * ```
   */
  static configure(options: LoggingOptions): LoggingConfig {
    const maskPatterns = this.createMaskPatterns(
      options.sensitiveFields || [],
      options.sensitiveHeaders || []
    );

    return {
      options: {
        logLevel: options.logLevel ?? 'info',
        logRequests: options.logRequests ?? true,
        logResponses: options.logResponses ?? true,
        logHeaders: options.logHeaders ?? false,
        logBody: options.logBody ?? false,
        maskSensitiveData: options.maskSensitiveData ?? true,
        sensitiveFields: options.sensitiveFields ?? [],
        sensitiveHeaders: options.sensitiveHeaders ?? [
          'authorization',
          'cookie',
          'x-api-key',
        ],
        maxBodySize: options.maxBodySize ?? 10000,
      },
      maskPatterns,
    };
  }

  /**
   * Configure sensitive data masking
   *
   * @param fields - List of field names to mask
   * @returns Logging configuration
   *
   * @example
   * ```typescript
   * const config = RequestLogger.maskSensitiveData([
   *   'password',
   *   'ssn',
   *   'creditCard'
   * ]);
   * ```
   */
  static maskSensitiveData(fields: readonly string[]): LoggingConfig {
    return this.configure({
      maskSensitiveData: true,
      sensitiveFields: fields,
    });
  }

  /**
   * Create mask patterns from field names
   */
  private static createMaskPatterns(
    fields: readonly string[],
    headers: readonly string[]
  ): MaskPattern[] {
    const patterns: MaskPattern[] = [];

    for (const field of fields) {
      patterns.push({
        field,
        replacement: '***MASKED***',
      });
    }

    for (const header of headers) {
      patterns.push({
        field: header,
        replacement: '***MASKED***',
      });
    }

    return patterns;
  }

  /**
   * Mask sensitive data in a string (JSON format)
   *
   * @param data - Data to mask
   * @param config - Logging configuration
   * @returns Masked data
   *
   * @example
   * ```typescript
   * const masked = RequestLogger.maskData(
   *   '{"password":"secret123","email":"user@example.com"}',
   *   config
   * );
   * // Returns: '{"password":"***MASKED***","email":"user@example.com"}'
   * ```
   */
  static maskData(data: string, config: LoggingConfig): string {
    if (!config.options.maskSensitiveData) {
      return data;
    }

    let masked = data;

    for (const pattern of config.maskPatterns) {
      // Match JSON field: "field":"value"
      const regex = new RegExp(
        `"${pattern.field}"\\s*:\\s*"[^"]*"`,
        'gi'
      );
      masked = masked.replace(
        regex,
        `"${pattern.field}":"${pattern.replacement}"`
      );

      // Match JSON field with any value type: "field":value
      const regex2 = new RegExp(
        `"${pattern.field}"\\s*:\\s*[^,}]*`,
        'gi'
      );
      masked = masked.replace(
        regex2,
        `"${pattern.field}":"${pattern.replacement}"`
      );
    }

    return masked;
  }

  /**
   * Mask sensitive data in an object
   *
   * @param obj - Object to mask
   * @param config - Logging configuration
   * @returns Masked object
   *
   * @example
   * ```typescript
   * const masked = RequestLogger.maskObject(
   *   { password: 'secret', email: 'user@example.com' },
   *   config
   * );
   * // Returns: { password: '***MASKED***', email: 'user@example.com' }
   * ```
   */
  static maskObject(obj: unknown, config: LoggingConfig): unknown {
    if (!config.options.maskSensitiveData) {
      return obj;
    }

    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.maskObject(item, config));
    }

    const masked: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const shouldMask = config.maskPatterns.some(
        (p) => p.field.toLowerCase() === key.toLowerCase()
      );

      if (shouldMask) {
        masked[key] = '***MASKED***';
      } else if (typeof value === 'object' && value !== null) {
        masked[key] = this.maskObject(value, config);
      } else {
        masked[key] = value;
      }
    }

    return masked;
  }
}

/**
 * Custom metrics helper
 *
 * Provides utilities for defining custom metrics.
 *
 * @example
 * ```typescript
 * const requestCounter = Metrics.counter('api.requests.total', ['method', 'status']);
 * const latencyHistogram = Metrics.histogram('api.request.duration', ['endpoint']);
 * const activeConnections = Metrics.gauge('api.connections.active');
 * ```
 */
export class Metrics {
  /**
   * Define a counter metric
   *
   * Counters are used for values that only increase (e.g., request count).
   *
   * @param name - Metric name
   * @param dimensions - Dimension names for aggregation
   * @returns Metric configuration
   *
   * @example
   * ```typescript
   * const metric = Metrics.counter(
   *   'api.requests.total',
   *   ['method', 'status_code', 'endpoint']
   * );
   * ```
   */
  static counter(
    name: string,
    dimensions?: readonly string[]
  ): MetricConfig {
    return {
      name,
      type: 'counter',
      unit: 'count',
      dimensions,
    };
  }

  /**
   * Define a histogram metric
   *
   * Histograms are used for distributions of values (e.g., request duration).
   *
   * @param name - Metric name
   * @param dimensions - Dimension names for aggregation
   * @param buckets - Histogram buckets (optional)
   * @returns Metric configuration
   *
   * @example
   * ```typescript
   * const metric = Metrics.histogram(
   *   'api.request.duration',
   *   ['endpoint'],
   *   [10, 50, 100, 500, 1000, 5000]
   * );
   * ```
   */
  static histogram(
    name: string,
    dimensions?: readonly string[],
    buckets?: readonly number[]
  ): MetricConfig {
    return {
      name,
      type: 'histogram',
      unit: 'ms',
      dimensions,
      buckets: buckets ?? [10, 50, 100, 500, 1000, 5000],
    };
  }

  /**
   * Define a gauge metric
   *
   * Gauges are used for values that can go up or down (e.g., active connections).
   *
   * @param name - Metric name
   * @param dimensions - Dimension names for aggregation
   * @returns Metric configuration
   *
   * @example
   * ```typescript
   * const metric = Metrics.gauge('api.connections.active', ['region']);
   * ```
   */
  static gauge(name: string, dimensions?: readonly string[]): MetricConfig {
    return {
      name,
      type: 'gauge',
      dimensions,
    };
  }
}

/**
 * Application Insights integration helper
 *
 * Provides utilities for Azure Application Insights integration.
 *
 * @example
 * ```typescript
 * const config = AppInsightsIntegration.configure(
 *   'your-instrumentation-key'
 * );
 *
 * const withLiveMetrics = AppInsightsIntegration.enableLiveMetrics();
 * ```
 */
export class AppInsightsIntegration {
  /**
   * Configure Application Insights
   *
   * @param instrumentationKey - Application Insights instrumentation key
   * @returns Observability configuration
   *
   * @example
   * ```typescript
   * const config = AppInsightsIntegration.configure(
   *   'your-key-here'
   * );
   * ```
   */
  static configure(instrumentationKey: string): ObservabilityConfig {
    return {
      instrumentationKey,
      enableLiveMetrics: true,
      enableDependencyTracking: true,
      enableAutoCollectRequests: true,
      enableAutoCollectDependencies: true,
      samplingPercentage: 100,
    };
  }

  /**
   * Enable live metrics streaming
   *
   * @returns Observability configuration
   *
   * @example
   * ```typescript
   * const config = AppInsightsIntegration.enableLiveMetrics();
   * ```
   */
  static enableLiveMetrics(): ObservabilityConfig {
    return {
      enableLiveMetrics: true,
    };
  }

  /**
   * Configure with connection string (preferred over instrumentation key)
   *
   * @param connectionString - Application Insights connection string
   * @returns Observability configuration
   *
   * @example
   * ```typescript
   * const config = AppInsightsIntegration.withConnectionString(
   *   'InstrumentationKey=...;IngestionEndpoint=...'
   * );
   * ```
   */
  static withConnectionString(connectionString: string): ObservabilityConfig {
    return {
      connectionString,
      enableLiveMetrics: true,
      enableDependencyTracking: true,
    };
  }

  /**
   * Configure sampling percentage
   *
   * @param percentage - Sampling percentage (0-100)
   * @returns Observability configuration
   *
   * @example
   * ```typescript
   * const config = AppInsightsIntegration.withSampling(10); // 10% sampling
   * ```
   */
  static withSampling(percentage: number): ObservabilityConfig {
    return {
      samplingPercentage: Math.max(0, Math.min(100, percentage)),
    };
  }
}

/**
 * Correlation ID manager
 *
 * Provides utilities for correlation ID generation and validation.
 *
 * @example
 * ```typescript
 * const config = CorrelationId.header('X-Request-ID');
 * const id = CorrelationId.generate();
 * const isValid = CorrelationId.validate(id);
 * ```
 */
export class CorrelationId {
  /**
   * Configure correlation ID header name
   *
   * @param headerName - HTTP header name for correlation ID
   * @returns Correlation configuration
   *
   * @example
   * ```typescript
   * const config = CorrelationId.header('X-Request-ID');
   * ```
   */
  static header(headerName?: string): CorrelationConfig {
    return {
      headerName: headerName ?? 'X-Correlation-ID',
      generateIfMissing: true,
      includeInResponse: true,
    };
  }

  /**
   * Generate a new correlation ID
   *
   * Uses UUIDv4 format by default.
   *
   * @returns New correlation ID
   *
   * @example
   * ```typescript
   * const id = CorrelationId.generate();
   * // Returns: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
   * ```
   */
  static generate(): string {
    // Generate UUIDv4
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    // Fallback UUID generation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }

  /**
   * Validate a correlation ID
   *
   * Checks if the ID is a valid UUID.
   *
   * @param id - Correlation ID to validate
   * @returns True if valid, false otherwise
   *
   * @example
   * ```typescript
   * const isValid = CorrelationId.validate('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
   * // Returns: true
   * ```
   */
  static validate(id: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  /**
   * Extract correlation ID from headers
   *
   * @param headers - HTTP headers
   * @param config - Correlation configuration
   * @returns Correlation ID or undefined
   *
   * @example
   * ```typescript
   * const id = CorrelationId.extract(
   *   { 'X-Correlation-ID': 'abc-123' },
   *   config
   * );
   * ```
   */
  static extract(
    headers: Record<string, string | undefined>,
    config: CorrelationConfig
  ): string | undefined {
    const headerName = config.headerName ?? 'X-Correlation-ID';
    const id = headers[headerName] ?? headers[headerName.toLowerCase()];

    if (!id) {
      return config.generateIfMissing ? this.generate() : undefined;
    }

    // Validate if validator is provided
    if (config.validator && !config.validator(id)) {
      return config.generateIfMissing ? this.generate() : undefined;
    }

    return id;
  }
}
