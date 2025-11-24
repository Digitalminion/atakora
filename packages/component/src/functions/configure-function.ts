/**
 * Function Configuration Builder
 *
 * @remarks
 * Fluent API for configuring custom function handlers with memory, timeout,
 * bindings, environment variables, and monitoring.
 *
 * @packageDocumentation
 */

import type { Duration } from '../common/duration';
import type {
  FunctionConfig,
  FunctionHandler,
  BindingConfig,
  EnvironmentConfig,
  MonitoringConfig,
  AlertRule,
  MutableAlertRule,
} from './types';
import { MonitoringBuilder } from './monitoring';

// ============================================================================
// Monitoring Builder
// ============================================================================

/**
 * Alert builder for monitoring configuration
 *
 * @remarks
 * Fluent API for defining alert rules on function metrics.
 *
 * @public
 */
export class AlertBuilder {
  private rules: AlertRule[] = [];
  private currentRule: MutableAlertRule | null = null;

  /**
   * Create alert on execution time
   *
   * @param threshold - Time threshold (Duration or number in milliseconds)
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * .onExecutionTime(greaterThan(minutes(5)))
   * ```
   */
  onExecutionTime(threshold: { type: string; value: Duration | number }): this {
    this.finalizeCurrentRule();
    this.currentRule = {
      metric: 'executionTime',
      condition: threshold.type === 'greater' ? 'greaterThan' : 'lessThan',
      value: threshold.value,
    };
    return this;
  }

  /**
   * Create alert on memory usage
   *
   * @param threshold - Memory threshold in MB
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * .onMemoryUsage(greaterThan(1800))
   * ```
   */
  onMemoryUsage(threshold: { type: string; value: number }): this {
    this.finalizeCurrentRule();
    this.currentRule = {
      metric: 'memoryUsage',
      condition: threshold.type === 'greater' ? 'greaterThan' : 'lessThan',
      value: threshold.value,
    };
    return this;
  }

  /**
   * Create alert on failure rate
   *
   * @param threshold - Failure rate threshold (0-1)
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * .onFailureRate(greaterThan(0.05))
   * ```
   */
  onFailureRate(threshold: { type: string; value: number }): this {
    this.finalizeCurrentRule();
    this.currentRule = {
      metric: 'failureRate',
      condition: threshold.type === 'greater' ? 'greaterThan' : 'lessThan',
      value: threshold.value,
    };
    return this;
  }

  /**
   * Set alert severity to info
   *
   * @returns This builder for chaining
   */
  info(): this {
    if (this.currentRule) {
      this.currentRule.severity = 'info';
    }
    return this;
  }

  /**
   * Set alert severity to warn
   *
   * @returns This builder for chaining
   */
  warn(): this {
    if (this.currentRule) {
      this.currentRule.severity = 'warn';
    }
    return this;
  }

  /**
   * Set alert severity to error
   *
   * @returns This builder for chaining
   */
  error(): this {
    if (this.currentRule) {
      this.currentRule.severity = 'error';
    }
    return this;
  }

  /**
   * Set alert severity to critical
   *
   * @returns This builder for chaining
   */
  critical(): this {
    if (this.currentRule) {
      this.currentRule.severity = 'critical';
    }
    return this;
  }

  /**
   * Add email notification recipients
   *
   * @param emails - Email addresses to notify
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * .withEmail('platform@company.com')
   * .withEmail('ops@company.com', 'oncall@company.com')
   * ```
   */
  withEmail(...emails: string[]): this {
    if (this.currentRule) {
      this.currentRule.emails = [...(this.currentRule.emails || []), ...emails];
    }
    return this;
  }

  /**
   * Finalize current rule and add to list
   * @internal
   */
  private finalizeCurrentRule(): void {
    if (
      this.currentRule &&
      this.currentRule.metric &&
      this.currentRule.condition &&
      this.currentRule.value !== undefined
    ) {
      // Set default severity if not specified
      if (!this.currentRule.severity) {
        this.currentRule.severity = 'warn';
      }
      this.rules.push(this.currentRule as AlertRule);
    }
    this.currentRule = null;
  }

  /**
   * Build alert rules
   * @internal
   */
  _build(): AlertRule[] {
    this.finalizeCurrentRule();
    return [...this.rules];
  }
}

// ============================================================================
// Function Configuration Builder
// ============================================================================

/**
 * Function configuration builder
 *
 * @remarks
 * Fluent API for configuring function handlers with performance settings,
 * bindings, environment variables, and monitoring.
 *
 * @example
 * ```typescript
 * configureFunction('GenerateReport')
 *   .memory(1024)
 *   .timeout(minutes(10))
 *   .withHandler(async (context, input) => {
 *     // Implementation
 *   })
 *   .bindings({
 *     storage: { type: 'blob', container: 'reports', path: '{reportId}.pdf' }
 *   })
 *   .monitoring(alerts =>
 *     alerts.onExecutionTime(greaterThan(minutes(8))).warn()
 *   )
 * ```
 *
 * @public
 */
export class FunctionConfigurationBuilder<TInput = any, TOutput = any> {
  private config: FunctionConfig;

  /**
   * Create a new function configuration builder
   *
   * @param name - Function name (must match function model name)
   */
  constructor(name: string) {
    this.config = {
      name,
      memory: 256, // Default 256MB
      timeout: 30000, // Default 30 seconds
    };
  }

  /**
   * Set memory allocation in megabytes
   *
   * @param mb - Memory in MB (common values: 256, 512, 1024, 2048)
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * .memory(1024) // 1GB for heavy processing
   * ```
   */
  memory(mb: number): this {
    this.config = { ...this.config, memory: mb };
    return this;
  }

  /**
   * Set execution timeout
   *
   * @param timeout - Timeout in milliseconds or Duration object
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * .timeout(minutes(10))     // Using Duration
   * .timeout(600000)          // 10 minutes in milliseconds
   * ```
   */
  timeout(timeout: number | Duration): this {
    const ms = typeof timeout === 'number' ? timeout : (timeout as any).toMilliseconds();
    this.config = { ...this.config, timeout: ms };
    return this;
  }

  /**
   * Set custom handler implementation
   *
   * @typeParam TInput - Input type (inferred from function model)
   * @typeParam TOutput - Output type (inferred from function model)
   * @param handler - Handler function
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * .withHandler(async (context, input) => {
   *   const data = await context.database.datasets.get(input.datasetId);
   *   return { result: processData(data) };
   * })
   * ```
   */
  withHandler<TIn = TInput, TOut = TOutput>(
    handler: FunctionHandler<TIn, TOut>
  ): FunctionConfigurationBuilder<TIn, TOut> {
    this.config = { ...this.config, handler: handler as any };
    return this as any;
  }

  /**
   * Configure output bindings
   *
   * @param bindings - Binding configuration for storage, queues, events
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * .bindings({
   *   storage: {
   *     type: 'blob',
   *     container: 'reports',
   *     path: '{reportId}.pdf'
   *   },
   *   queue: {
   *     type: 'queue',
   *     name: 'report-cleanup',
   *     message: { reportId: '{reportId}' }
   *   }
   * })
   * ```
   */
  bindings(bindings: BindingConfig): this {
    this.config = { ...this.config, bindings };
    return this;
  }

  /**
   * Configure environment variables
   *
   * @param env - Environment variable definitions
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * .env({
   *   STORAGE_ACCOUNT: 'required',  // Must be provided
   *   MAX_FILE_SIZE: '100',         // Optional with default
   *   DEBUG: 'false'
   * })
   * ```
   */
  env(env: EnvironmentConfig): this {
    this.config = { ...this.config, environment: env };
    return this;
  }

  /**
   * Configure monitoring and alerts using AlertBuilder (legacy API)
   *
   * @param configureFn - Function that configures alert rules
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * .monitoring(alerts =>
   *   alerts
   *     .onExecutionTime(greaterThan(minutes(8)))
   *     .warn()
   *     .withEmail('platform@company.com')
   *
   *     .onMemoryUsage(greaterThan(1800))
   *     .error()
   * )
   * ```
   */
  monitoring(configureFn: (alerts: AlertBuilder) => AlertBuilder): this;

  /**
   * Configure monitoring and alerts using MonitoringBuilder (new API)
   *
   * @param configureFn - Function that configures alert rules
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * .monitoring(alerts =>
   *   alerts
   *     .onExecutionTime(greaterThan(minutes(8)))
   *     .warn()
   *     .withEmail('platform@company.com')
   *
   *     .onFailureRate(greaterThan(0.05))
   *     .error()
   * )
   * ```
   */
  monitoring(configureFn: (alerts: MonitoringBuilder) => MonitoringBuilder): this;

  monitoring(
    configureFn:
      | ((alerts: AlertBuilder) => AlertBuilder)
      | ((alerts: MonitoringBuilder) => MonitoringBuilder)
  ): this {
    // Try MonitoringBuilder first (new API)
    const monitoringBuilder = new MonitoringBuilder();
    try {
      const result = configureFn(monitoringBuilder as any);
      if (result instanceof MonitoringBuilder) {
        const alerts = result._build();
        this.config = {
          ...this.config,
          monitoring: {
            ...(this.config.monitoring || {}),
            alerts: alerts as any,
          },
        };
        return this;
      }
    } catch (e) {
      // Fall through to AlertBuilder
    }

    // Fall back to AlertBuilder (legacy API)
    const alertBuilder = new AlertBuilder();
    configureFn(alertBuilder as any);
    const alerts = alertBuilder._build();

    this.config = {
      ...this.config,
      monitoring: {
        ...(this.config.monitoring || {}),
        alerts,
      },
    };
    return this;
  }

  /**
   * Enable custom metrics collection
   *
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * .withMetrics()
   * ```
   */
  withMetrics(): this {
    this.config = {
      ...this.config,
      monitoring: {
        ...(this.config.monitoring || {}),
        metrics: true,
      },
    };
    return this;
  }

  /**
   * Enable distributed tracing
   *
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * .withTracing()
   * ```
   */
  withTracing(): this {
    this.config = {
      ...this.config,
      monitoring: {
        ...(this.config.monitoring || {}),
        tracing: true,
      },
    };
    return this;
  }

  /**
   * Build final configuration
   *
   * @internal
   * @returns Immutable function configuration
   */
  _build(): FunctionConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a function configuration builder
 *
 * @param name - Function name (must match function model name)
 * @returns Function configuration builder
 *
 * @example
 * ```typescript
 * const reportFunction = configureFunction('GenerateReport')
 *   .memory(1024)
 *   .timeout(minutes(10))
 *   .withHandler(async (context, input) => {
 *     // Implementation
 *   });
 * ```
 *
 * @public
 */
export function configureFunction(name: string): FunctionConfigurationBuilder {
  return new FunctionConfigurationBuilder(name);
}
