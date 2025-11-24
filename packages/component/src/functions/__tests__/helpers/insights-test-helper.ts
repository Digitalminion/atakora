/**
 * Application Insights Test Helper
 *
 * @remarks
 * Mock implementation and utilities for testing Application Insights integration.
 * Provides telemetry capture and verification utilities.
 *
 * @packageDocumentation
 */

/**
 * Log level for telemetry
 */
export enum LogLevel {
  Verbose = 0,
  Info = 1,
  Warning = 2,
  Error = 3,
}

/**
 * Telemetry event types
 */
export enum TelemetryType {
  Trace = 'trace',
  Event = 'event',
  Metric = 'metric',
  Exception = 'exception',
  Dependency = 'dependency',
  Request = 'request',
}

/**
 * Base telemetry item
 */
export interface TelemetryItem {
  type: TelemetryType;
  timestamp: number;
  name: string;
  properties?: Record<string, any>;
  measurements?: Record<string, number>;
}

/**
 * Trace telemetry
 */
export interface TraceTelemetry extends TelemetryItem {
  type: TelemetryType.Trace;
  message: string;
  severityLevel: LogLevel;
}

/**
 * Event telemetry
 */
export interface EventTelemetry extends TelemetryItem {
  type: TelemetryType.Event;
}

/**
 * Metric telemetry
 */
export interface MetricTelemetry extends TelemetryItem {
  type: TelemetryType.Metric;
  value: number;
  count?: number;
  min?: number;
  max?: number;
  stdDev?: number;
}

/**
 * Exception telemetry
 */
export interface ExceptionTelemetry extends TelemetryItem {
  type: TelemetryType.Exception;
  exception: Error;
  severityLevel: LogLevel;
}

/**
 * Dependency telemetry
 */
export interface DependencyTelemetry extends TelemetryItem {
  type: TelemetryType.Dependency;
  dependencyTypeName: string;
  target: string;
  data: string;
  duration: number;
  resultCode: number | string;
  success: boolean;
}

/**
 * Request telemetry
 */
export interface RequestTelemetry extends TelemetryItem {
  type: TelemetryType.Request;
  url: string;
  duration: number;
  responseCode: number;
  success: boolean;
}

/**
 * Union type for all telemetry types
 */
export type Telemetry =
  | TraceTelemetry
  | EventTelemetry
  | MetricTelemetry
  | ExceptionTelemetry
  | DependencyTelemetry
  | RequestTelemetry;

/**
 * Mock Application Insights Client
 *
 * @remarks
 * Captures telemetry in memory for testing purposes.
 * Provides utilities to verify telemetry was sent correctly.
 */
export class MockInsightsClient {
  private telemetry: Telemetry[] = [];
  private enabled = true;

  /**
   * Track a trace message
   */
  trackTrace(message: string, severityLevel: LogLevel, properties?: Record<string, any>): void {
    if (!this.enabled) return;

    this.telemetry.push({
      type: TelemetryType.Trace,
      timestamp: Date.now(),
      name: 'trace',
      message,
      severityLevel,
      properties,
    });
  }

  /**
   * Track a custom event
   */
  trackEvent(
    name: string,
    properties?: Record<string, any>,
    measurements?: Record<string, number>
  ): void {
    if (!this.enabled) return;

    this.telemetry.push({
      type: TelemetryType.Event,
      timestamp: Date.now(),
      name,
      properties,
      measurements,
    });
  }

  /**
   * Track a metric
   */
  trackMetric(name: string, value: number, properties?: Record<string, any>): void {
    if (!this.enabled) return;

    this.telemetry.push({
      type: TelemetryType.Metric,
      timestamp: Date.now(),
      name,
      value,
      properties,
    });
  }

  /**
   * Track an exception
   */
  trackException(
    exception: Error,
    severityLevel: LogLevel,
    properties?: Record<string, any>
  ): void {
    if (!this.enabled) return;

    this.telemetry.push({
      type: TelemetryType.Exception,
      timestamp: Date.now(),
      name: exception.name,
      exception,
      severityLevel,
      properties,
    });
  }

  /**
   * Track a dependency call
   */
  trackDependency(
    name: string,
    dependencyTypeName: string,
    target: string,
    data: string,
    duration: number,
    resultCode: number | string,
    success: boolean,
    properties?: Record<string, any>
  ): void {
    if (!this.enabled) return;

    this.telemetry.push({
      type: TelemetryType.Dependency,
      timestamp: Date.now(),
      name,
      dependencyTypeName,
      target,
      data,
      duration,
      resultCode,
      success,
      properties,
    });
  }

  /**
   * Track a request
   */
  trackRequest(
    name: string,
    url: string,
    duration: number,
    responseCode: number,
    success: boolean,
    properties?: Record<string, any>
  ): void {
    if (!this.enabled) return;

    this.telemetry.push({
      type: TelemetryType.Request,
      timestamp: Date.now(),
      name,
      url,
      duration,
      responseCode,
      success,
      properties,
    });
  }

  /**
   * Flush telemetry (no-op for mock)
   */
  async flush(): Promise<void> {
    // No-op for mock
  }

  /**
   * Get all captured telemetry
   */
  getTelemetry(): readonly Telemetry[] {
    return [...this.telemetry];
  }

  /**
   * Get telemetry by type
   */
  getTelemetryByType<T extends Telemetry>(type: TelemetryType): T[] {
    return this.telemetry.filter((t) => t.type === type) as T[];
  }

  /**
   * Get traces
   */
  getTraces(): TraceTelemetry[] {
    return this.getTelemetryByType<TraceTelemetry>(TelemetryType.Trace);
  }

  /**
   * Get events
   */
  getEvents(): EventTelemetry[] {
    return this.getTelemetryByType<EventTelemetry>(TelemetryType.Event);
  }

  /**
   * Get metrics
   */
  getMetrics(): MetricTelemetry[] {
    return this.getTelemetryByType<MetricTelemetry>(TelemetryType.Metric);
  }

  /**
   * Get exceptions
   */
  getExceptions(): ExceptionTelemetry[] {
    return this.getTelemetryByType<ExceptionTelemetry>(TelemetryType.Exception);
  }

  /**
   * Get dependencies
   */
  getDependencies(): DependencyTelemetry[] {
    return this.getTelemetryByType<DependencyTelemetry>(TelemetryType.Dependency);
  }

  /**
   * Get requests
   */
  getRequests(): RequestTelemetry[] {
    return this.getTelemetryByType<RequestTelemetry>(TelemetryType.Request);
  }

  /**
   * Clear all captured telemetry
   */
  clear(): void {
    this.telemetry = [];
  }

  /**
   * Disable telemetry capture
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Enable telemetry capture
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * Check if telemetry is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

/**
 * Telemetry assertions helper
 */
export class TelemetryAssertions {
  constructor(private client: MockInsightsClient) {}

  /**
   * Assert that a trace was logged
   */
  assertTraceLogged(
    message: string,
    severityLevel?: LogLevel,
    properties?: Partial<Record<string, any>>
  ): void {
    const traces = this.client.getTraces();
    const matching = traces.find((t) => {
      if (!t.message.includes(message)) return false;
      if (severityLevel !== undefined && t.severityLevel !== severityLevel) return false;
      if (properties) {
        for (const [key, value] of Object.entries(properties)) {
          if (t.properties?.[key] !== value) return false;
        }
      }
      return true;
    });

    if (!matching) {
      throw new Error(
        `Expected trace with message "${message}" not found. Logged traces: ${JSON.stringify(
          traces.map((t) => t.message)
        )}`
      );
    }
  }

  /**
   * Assert that an event was tracked
   */
  assertEventTracked(name: string, properties?: Partial<Record<string, any>>): void {
    const events = this.client.getEvents();
    const matching = events.find((e) => {
      if (e.name !== name) return false;
      if (properties) {
        for (const [key, value] of Object.entries(properties)) {
          if (e.properties?.[key] !== value) return false;
        }
      }
      return true;
    });

    if (!matching) {
      throw new Error(
        `Expected event "${name}" not found. Tracked events: ${JSON.stringify(
          events.map((e) => e.name)
        )}`
      );
    }
  }

  /**
   * Assert that a metric was tracked
   */
  assertMetricTracked(name: string, value?: number): void {
    const metrics = this.client.getMetrics();
    const matching = metrics.find((m) => {
      if (m.name !== name) return false;
      if (value !== undefined && m.value !== value) return false;
      return true;
    });

    if (!matching) {
      throw new Error(
        `Expected metric "${name}" not found. Tracked metrics: ${JSON.stringify(
          metrics.map((m) => ({ name: m.name, value: m.value }))
        )}`
      );
    }
  }

  /**
   * Assert that an exception was tracked
   */
  assertExceptionTracked(exceptionName?: string, severityLevel?: LogLevel): void {
    const exceptions = this.client.getExceptions();
    const matching = exceptions.find((ex) => {
      if (exceptionName && ex.exception.name !== exceptionName) return false;
      if (severityLevel !== undefined && ex.severityLevel !== severityLevel) return false;
      return true;
    });

    if (!matching) {
      throw new Error(
        `Expected exception${exceptionName ? ` "${exceptionName}"` : ''} not found. Tracked exceptions: ${JSON.stringify(
          exceptions.map((ex) => ex.exception.name)
        )}`
      );
    }
  }

  /**
   * Assert that a dependency was tracked
   */
  assertDependencyTracked(name: string, dependencyTypeName?: string, success?: boolean): void {
    const dependencies = this.client.getDependencies();
    const matching = dependencies.find((d) => {
      if (d.name !== name) return false;
      if (dependencyTypeName && d.dependencyTypeName !== dependencyTypeName) return false;
      if (success !== undefined && d.success !== success) return false;
      return true;
    });

    if (!matching) {
      throw new Error(
        `Expected dependency "${name}" not found. Tracked dependencies: ${JSON.stringify(
          dependencies.map((d) => d.name)
        )}`
      );
    }
  }

  /**
   * Assert telemetry count
   */
  assertTelemetryCount(type: TelemetryType, expectedCount: number): void {
    const telemetry = this.client.getTelemetryByType(type);
    if (telemetry.length !== expectedCount) {
      throw new Error(
        `Expected ${expectedCount} ${type} telemetry items, but found ${telemetry.length}`
      );
    }
  }
}

/**
 * Create mock insights client for testing
 */
export function createMockInsightsClient(): MockInsightsClient {
  return new MockInsightsClient();
}

/**
 * Create telemetry assertions helper
 */
export function createTelemetryAssertions(client: MockInsightsClient): TelemetryAssertions {
  return new TelemetryAssertions(client);
}
