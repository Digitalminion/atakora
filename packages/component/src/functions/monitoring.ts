/**
 * Monitoring Builders for Function Customization
 *
 * @remarks
 * Provides fluent API builders for creating monitoring configurations
 * including alerts, metrics, and tracing for Azure Functions.
 *
 * @packageDocumentation
 */

import type { Duration } from '../common/duration';
import type { Threshold } from '../common/threshold';
import type { AlertRule, MutableAlertRule, AlertAction } from './types';

/**
 * Builder for creating monitoring configurations with a fluent API
 *
 * @example
 * ```typescript
 * import { MonitoringBuilder, greaterThan, minutes } from '@atakora/component/functions';
 *
 * const monitoring = new MonitoringBuilder()
 *   .onExecutionTime(greaterThan(minutes(5)))
 *   .warn()
 *   .withEmail('team@company.com')
 *
 *   .onFailureRate(greaterThan(0.05))
 *   .critical();
 *
 * const config = monitoring._build();
 * ```
 *
 * @public
 */
export class MonitoringBuilder {
  private alerts: AlertRule[] = [];

  /**
   * Add an alert for execution time
   *
   * @param threshold - The execution time threshold
   * @returns Alert rule builder for chaining
   *
   * @example
   * ```typescript
   * builder.onExecutionTime(greaterThan(minutes(5))).warn();
   * ```
   */
  onExecutionTime(threshold: Threshold<number> | Threshold<Duration>): AlertRuleBuilder {
    const value = this.extractThresholdValue(threshold);
    const condition = this.extractOperator(threshold);
    return new AlertRuleBuilder('executionTime', value, condition, this);
  }

  /**
   * Add an alert for memory usage
   *
   * @param threshold - The memory usage threshold (in MB)
   * @returns Alert rule builder for chaining
   *
   * @example
   * ```typescript
   * builder.onMemoryUsage(greaterThan(1800)).warn();
   * ```
   */
  onMemoryUsage(threshold: Threshold<number>): AlertRuleBuilder {
    const value = this.extractThresholdValue(threshold);
    const condition = this.extractOperator(threshold);
    return new AlertRuleBuilder('memoryUsage', value, condition, this);
  }

  /**
   * Add an alert for failure rate
   *
   * @param threshold - The failure rate threshold (as a decimal, e.g., 0.05 for 5%)
   * @returns Alert rule builder for chaining
   *
   * @example
   * ```typescript
   * builder.onFailureRate(greaterThan(0.05)).critical();
   * ```
   */
  onFailureRate(threshold: Threshold<number>): AlertRuleBuilder {
    const value = this.extractThresholdValue(threshold);
    const condition = this.extractOperator(threshold);
    return new AlertRuleBuilder('failureRate', value, condition, this);
  }

  /**
   * Internal method to add an alert rule
   * @internal
   */
  _addAlert(alert: AlertRule): void {
    this.alerts.push(alert);
  }

  /**
   * Build and return the final alert rules array
   * @internal
   */
  _build(): readonly AlertRule[] {
    return Object.freeze([...this.alerts]);
  }

  /**
   * Extract the numeric threshold value from a Threshold object
   * @internal
   */
  private extractThresholdValue(threshold: Threshold<number> | Threshold<Duration>): number {
    const value = threshold.value;

    // If it's a Duration, convert to milliseconds
    if (typeof value === 'object' && value && 'toMilliseconds' in value) {
      return value.toMilliseconds();
    }

    // Otherwise, it's already a number
    return value as number;
  }

  /**
   * Extract the comparison operator from a Threshold object
   * @internal
   */
  private extractOperator(threshold: Threshold<any>): 'greaterThan' | 'lessThan' {
    switch (threshold.type) {
      case 'greater':
      case 'older':
        return 'greaterThan';
      case 'less':
        return 'lessThan';
      default:
        // Default to greaterThan for other threshold types
        return 'greaterThan';
    }
  }
}

/**
 * Builder for creating individual alert rules with severity and actions
 *
 * @example
 * ```typescript
 * const rule = new AlertRuleBuilder('executionTime', 300000, 'greaterThan', parentBuilder)
 *   .warn()
 *   .withEmail('team@company.com');
 * ```
 *
 * @public
 */
export class AlertRuleBuilder {
  private rule: MutableAlertRule;
  private actions: AlertAction[] = [];

  /**
   * @internal
   */
  constructor(
    metric: AlertRule['metric'],
    value: number,
    condition: 'greaterThan' | 'lessThan',
    private parent: MonitoringBuilder
  ) {
    this.rule = {
      metric,
      value,
      condition,
    };
  }

  /**
   * Set alert severity to 'info' and return to the monitoring builder
   *
   * @returns The parent monitoring builder for chaining more alerts
   *
   * @example
   * ```typescript
   * builder.onExecutionTime(greaterThan(minutes(5))).info();
   * ```
   */
  info(): MonitoringBuilder {
    this.rule.severity = 'info';
    this.finalizeRule();
    return this.parent;
  }

  /**
   * Set alert severity to 'warn' and return to the monitoring builder
   *
   * @returns The parent monitoring builder for chaining more alerts
   *
   * @example
   * ```typescript
   * builder.onExecutionTime(greaterThan(minutes(5))).warn();
   * ```
   */
  warn(): MonitoringBuilder {
    this.rule.severity = 'warn';
    this.finalizeRule();
    return this.parent;
  }

  /**
   * Set alert severity to 'error' and return to the monitoring builder
   *
   * @returns The parent monitoring builder for chaining more alerts
   *
   * @example
   * ```typescript
   * builder.onFailureRate(greaterThan(0.05)).error();
   * ```
   */
  error(): MonitoringBuilder {
    this.rule.severity = 'error';
    this.finalizeRule();
    return this.parent;
  }

  /**
   * Set alert severity to 'critical' and return to the monitoring builder
   *
   * @returns The parent monitoring builder for chaining more alerts
   *
   * @example
   * ```typescript
   * builder.onFailureRate(greaterThan(0.1)).critical();
   * ```
   */
  critical(): MonitoringBuilder {
    this.rule.severity = 'critical';
    this.finalizeRule();
    return this.parent;
  }

  /**
   * Add an email action to this alert rule
   *
   * @param email - The email address to notify
   * @returns This alert rule builder for chaining more actions
   *
   * @example
   * ```typescript
   * builder
   *   .onExecutionTime(greaterThan(minutes(5)))
   *   .withEmail('team@company.com')
   *   .warn();
   * ```
   */
  withEmail(email: string): this {
    this.actions.push({ type: 'email', target: email });
    return this;
  }

  /**
   * Add a webhook action to this alert rule
   *
   * @param url - The webhook URL to call
   * @returns This alert rule builder for chaining more actions
   *
   * @example
   * ```typescript
   * builder
   *   .onFailureRate(greaterThan(0.05))
   *   .withWebhook('https://api.company.com/alerts')
   *   .critical();
   * ```
   */
  withWebhook(url: string): this {
    this.actions.push({ type: 'webhook', target: url });
    return this;
  }

  /**
   * Add an SMS action to this alert rule
   *
   * @param phoneNumber - The phone number to send SMS to
   * @returns This alert rule builder for chaining more actions
   *
   * @example
   * ```typescript
   * builder
   *   .onFailureRate(greaterThan(0.1))
   *   .withSMS('+1234567890')
   *   .critical();
   * ```
   */
  withSMS(phoneNumber: string): this {
    this.actions.push({ type: 'sms', target: phoneNumber });
    return this;
  }

  /**
   * Finalize the rule and add it to the parent builder
   * @internal
   */
  private finalizeRule(): void {
    if (this.actions.length > 0) {
      this.rule.actions = Object.freeze([...this.actions]) as any;
    }
    this.parent._addAlert(this.rule as AlertRule);
  }
}
