# Fluent Queue API - Implementation Specification

## Overview

This document provides the detailed implementation specification for the Fluent Queue API, including type definitions, helper utilities, and usage examples.

## Core Type System

### Duration Types

```typescript
// packages/component/src/common/duration.ts

export type TimeUnit = 'ms' | 's' | 'm' | 'h' | 'd' | 'w';

export interface Duration {
  readonly value: number;
  readonly unit: TimeUnit;

  // Conversion methods
  toMilliseconds(): number;
  toSeconds(): number;
  toMinutes(): number;
  toHours(): number;
  toDays(): number;

  // ARM format conversion (ISO 8601 duration)
  toTimeSpan(): string; // Returns format like "P7D" or "PT10M"
  toArmDuration(): string; // Returns format like "7.00:00:00"

  // Arithmetic operations
  add(other: Duration): Duration;
  subtract(other: Duration): Duration;
  multiply(factor: number): Duration;
  divide(divisor: number): Duration;

  // Comparison
  equals(other: Duration): boolean;
  lessThan(other: Duration): boolean;
  greaterThan(other: Duration): boolean;
}

class DurationImpl implements Duration {
  constructor(
    readonly value: number,
    readonly unit: TimeUnit
  ) {}

  toMilliseconds(): number {
    const conversions: Record<TimeUnit, number> = {
      ms: 1,
      s: 1000,
      m: 60000,
      h: 3600000,
      d: 86400000,
      w: 604800000,
    };
    return this.value * conversions[this.unit];
  }

  toSeconds(): number {
    return this.toMilliseconds() / 1000;
  }

  toMinutes(): number {
    return this.toMilliseconds() / 60000;
  }

  toHours(): number {
    return this.toMilliseconds() / 3600000;
  }

  toDays(): number {
    return this.toMilliseconds() / 86400000;
  }

  toTimeSpan(): string {
    const totalSeconds = this.toSeconds();
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    let result = 'P';
    if (days > 0) result += `${days}D`;

    const timePart = [];
    if (hours > 0) timePart.push(`${hours}H`);
    if (minutes > 0) timePart.push(`${minutes}M`);
    if (seconds > 0) timePart.push(`${seconds}S`);

    if (timePart.length > 0) {
      result += 'T' + timePart.join('');
    }

    return result === 'P' ? 'PT0S' : result;
  }

  toArmDuration(): string {
    const totalSeconds = this.toSeconds();
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${days}.${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  add(other: Duration): Duration {
    const totalMs = this.toMilliseconds() + other.toMilliseconds();
    return new DurationImpl(totalMs, 'ms');
  }

  subtract(other: Duration): Duration {
    const totalMs = this.toMilliseconds() - other.toMilliseconds();
    return new DurationImpl(Math.max(0, totalMs), 'ms');
  }

  multiply(factor: number): Duration {
    return new DurationImpl(this.value * factor, this.unit);
  }

  divide(divisor: number): Duration {
    return new DurationImpl(this.value / divisor, this.unit);
  }

  equals(other: Duration): boolean {
    return this.toMilliseconds() === other.toMilliseconds();
  }

  lessThan(other: Duration): boolean {
    return this.toMilliseconds() < other.toMilliseconds();
  }

  greaterThan(other: Duration): boolean {
    return this.toMilliseconds() > other.toMilliseconds();
  }
}

// Factory functions
export const milliseconds = (n: number): Duration => new DurationImpl(n, 'ms');
export const seconds = (n: number): Duration => new DurationImpl(n, 's');
export const minutes = (n: number): Duration => new DurationImpl(n, 'm');
export const hours = (n: number): Duration => new DurationImpl(n, 'h');
export const days = (n: number): Duration => new DurationImpl(n, 'd');
export const weeks = (n: number): Duration => new DurationImpl(n, 'w');

// Aliases for better readability
export const ms = milliseconds;
export const sec = seconds;
export const min = minutes;
export const hr = hours;
```

### Threshold Types

```typescript
// packages/component/src/common/threshold.ts

export type ComparisonOperator = '>' | '<' | '>=' | '<=' | '==' | '!=' | 'between' | 'outside';

export interface Threshold<T> {
  readonly operator: ComparisonOperator;
  readonly value: T;
  readonly upperBound?: T; // For 'between' and 'outside'

  evaluate(actual: T): boolean;
  invert(): Threshold<T>;
  toString(): string;
}

class ThresholdImpl<T> implements Threshold<T> {
  constructor(
    readonly operator: ComparisonOperator,
    readonly value: T,
    readonly upperBound?: T
  ) {}

  evaluate(actual: T): boolean {
    const compare = (a: any, b: any) => {
      if (typeof a === 'number' && typeof b === 'number') {
        return a - b;
      }
      if (a && typeof a.toMilliseconds === 'function') {
        return a.toMilliseconds() - b.toMilliseconds();
      }
      return String(a).localeCompare(String(b));
    };

    const cmp = compare(actual, this.value);

    switch (this.operator) {
      case '>':
        return cmp > 0;
      case '<':
        return cmp < 0;
      case '>=':
        return cmp >= 0;
      case '<=':
        return cmp <= 0;
      case '==':
        return cmp === 0;
      case '!=':
        return cmp !== 0;
      case 'between':
        return cmp >= 0 && compare(actual, this.upperBound!) <= 0;
      case 'outside':
        return cmp < 0 || compare(actual, this.upperBound!) > 0;
      default:
        return false;
    }
  }

  invert(): Threshold<T> {
    const inversions: Record<ComparisonOperator, ComparisonOperator> = {
      '>': '<=',
      '<': '>=',
      '>=': '<',
      '<=': '>',
      '==': '!=',
      '!=': '==',
      between: 'outside',
      outside: 'between',
    };
    return new ThresholdImpl(inversions[this.operator], this.value, this.upperBound);
  }

  toString(): string {
    if (this.operator === 'between') {
      return `between ${this.value} and ${this.upperBound}`;
    }
    if (this.operator === 'outside') {
      return `outside ${this.value} and ${this.upperBound}`;
    }
    return `${this.operator} ${this.value}`;
  }
}

// Factory functions
export const greaterThan = <T>(value: T): Threshold<T> => new ThresholdImpl('>', value);

export const lessThan = <T>(value: T): Threshold<T> => new ThresholdImpl('<', value);

export const atLeast = <T>(value: T): Threshold<T> => new ThresholdImpl('>=', value);

export const atMost = <T>(value: T): Threshold<T> => new ThresholdImpl('<=', value);

export const exactly = <T>(value: T): Threshold<T> => new ThresholdImpl('==', value);

export const notEqual = <T>(value: T): Threshold<T> => new ThresholdImpl('!=', value);

export const between = <T>(min: T, max: T): Threshold<T> => new ThresholdImpl('between', min, max);

export const outside = <T>(min: T, max: T): Threshold<T> => new ThresholdImpl('outside', min, max);

// Specialized for Duration
export const olderThan = (duration: Duration): Threshold<Duration> => greaterThan(duration);

export const newerThan = (duration: Duration): Threshold<Duration> => lessThan(duration);

export const withinLast = (duration: Duration): Threshold<Duration> => lessThan(duration);
```

## Queue Builder Implementation

```typescript
// packages/component/src/queues/queue-builder.ts

import { Duration, Threshold } from '../common';
import { RetryPolicy } from './retry-policy';
import { AlertBuilder } from './alert-builder';
import { QueuePreset, applyPreset } from './presets';

export interface QueueConfig {
  name: string;
  processor?: Function;
  ttl?: Duration;
  visibility?: Duration;
  lockDuration?: Duration;
  maxDeliveryCount?: number;
  batchSize?: number;
  parallelism?: number;
  deadLetter?: {
    enabled: boolean;
    name?: string;
    maxDeliveryCount?: number;
  };
  retryPolicy?: RetryPolicy;
  monitoring?: MonitoringConfig;
  duplicateDetection?: {
    enabled: boolean;
    window?: Duration;
  };
  session?: {
    enabled: boolean;
    maxConcurrentSessions?: number;
  };
  encryption?: {
    enabled: boolean;
    keyVaultKeyId?: string;
  };
  tags?: Record<string, string>;
}

export class QueueBuilder {
  private config: QueueConfig;

  constructor(name: string) {
    this.config = {
      name,
      ttl: days(7), // Default: 7 days
      visibility: seconds(30), // Default: 30 seconds
      maxDeliveryCount: 3, // Default: 3 retries
      batchSize: 1, // Default: 1 message at a time
      parallelism: 1, // Default: 1 concurrent execution
    };
  }

  static create(name: string): QueueBuilder {
    return new QueueBuilder(name);
  }

  // Basic configuration
  processor(fn: Function): this {
    this.config.processor = fn;
    return this;
  }

  ttl(duration: Duration): this {
    this.config.ttl = duration;
    return this;
  }

  visibility(duration: Duration): this {
    this.config.visibility = duration;
    return this;
  }

  lockDuration(duration: Duration): this {
    this.config.lockDuration = duration;
    return this;
  }

  retries(count: number): this {
    this.config.maxDeliveryCount = count;
    return this;
  }

  batchSize(size: number): this {
    this.config.batchSize = size;
    return this;
  }

  parallelism(count: number): this {
    this.config.parallelism = count;
    return this;
  }

  // Dead letter queue
  withDeadLetterQueue(name?: string): this {
    this.config.deadLetter = {
      enabled: true,
      name: name || `${this.config.name}-dlq`,
    };
    return this;
  }

  deadLetterAfter(maxDeliveries: number): this {
    if (!this.config.deadLetter) {
      this.withDeadLetterQueue();
    }
    this.config.deadLetter!.maxDeliveryCount = maxDeliveries;
    return this;
  }

  // Retry configuration
  retry(policy: RetryPolicy | ((builder: RetryPolicyBuilder) => RetryPolicy)): this {
    if (typeof policy === 'function') {
      this.config.retryPolicy = policy(new RetryPolicyBuilder());
    } else {
      this.config.retryPolicy = policy;
    }
    return this;
  }

  // Duplicate detection
  withDuplicateDetection(window?: Duration): this {
    this.config.duplicateDetection = {
      enabled: true,
      window: window || minutes(10),
    };
    return this;
  }

  // Session support
  withSessions(maxConcurrent?: number): this {
    this.config.session = {
      enabled: true,
      maxConcurrentSessions: maxConcurrent || 1,
    };
    return this;
  }

  // Encryption
  withEncryption(keyVaultKeyId?: string): this {
    this.config.encryption = {
      enabled: true,
      keyVaultKeyId,
    };
    return this;
  }

  // Monitoring configuration
  monitoring(configure: (alerts: AlertBuilder) => AlertBuilder): this {
    const builder = new AlertBuilder();
    this.config.monitoring = configure(builder).build();
    return this;
  }

  withMetrics(): this {
    // Enable default metrics collection
    if (!this.config.monitoring) {
      this.config.monitoring = {};
    }
    this.config.monitoring.metrics = {
      enabled: true,
      namespace: 'Queues',
    };
    return this;
  }

  withTracing(): this {
    // Enable distributed tracing
    if (!this.config.monitoring) {
      this.config.monitoring = {};
    }
    this.config.monitoring.tracing = {
      enabled: true,
      samplingRate: 1.0,
    };
    return this;
  }

  // Presets - common configurations
  highThroughput(): this {
    return applyPreset(this, QueuePreset.HighThroughput);
  }

  lowLatency(): this {
    return applyPreset(this, QueuePreset.LowLatency);
  }

  longRunning(): this {
    return applyPreset(this, QueuePreset.LongRunning);
  }

  reliable(): this {
    return applyPreset(this, QueuePreset.Reliable);
  }

  standardRetries(): this {
    return applyPreset(this, QueuePreset.StandardRetries);
  }

  // Tags
  tag(key: string, value: string): this {
    if (!this.config.tags) {
      this.config.tags = {};
    }
    this.config.tags[key] = value;
    return this;
  }

  tags(tags: Record<string, string>): this {
    this.config.tags = { ...this.config.tags, ...tags };
    return this;
  }

  // Build the final configuration
  build(): QueueConfig {
    // Validate configuration
    if (!this.config.processor) {
      throw new Error(`Queue '${this.config.name}' requires a processor function`);
    }

    // Apply defaults for lock duration if not set
    if (!this.config.lockDuration) {
      this.config.lockDuration = this.config.visibility;
    }

    return this.config;
  }

  // Convenience method to build and export
  export(): QueueConfig {
    return this.build();
  }
}

// Convenience export function that builds automatically
export function Queue(name: string): QueueBuilder {
  return QueueBuilder.create(name);
}
```

## Alert Builder Implementation

```typescript
// packages/component/src/queues/alert-builder.ts

import { Duration, Threshold } from '../common';

export type AlertSeverity = 'Critical' | 'Error' | 'Warning' | 'Information';

export interface Alert {
  metric: string;
  threshold: Threshold<any>;
  severity: AlertSeverity;
  description?: string;
  actions?: AlertAction[];
}

export interface AlertAction {
  type: 'email' | 'sms' | 'webhook' | 'function';
  target: string;
  delay?: Duration;
}

export interface MonitoringConfig {
  alerts?: Alert[];
  metrics?: {
    enabled: boolean;
    namespace?: string;
  };
  tracing?: {
    enabled: boolean;
    samplingRate?: number;
  };
}

export class AlertBuilder {
  private alerts: Alert[] = [];
  private currentAlert?: Partial<Alert>;

  onDepth(threshold: Threshold<number>): AlertConfigurator {
    return new AlertConfigurator(this, 'queueDepth', threshold);
  }

  onMessageAge(threshold: Threshold<Duration>): AlertConfigurator {
    return new AlertConfigurator(this, 'messageAge', threshold);
  }

  onProcessingTime(threshold: Threshold<Duration>): AlertConfigurator {
    return new AlertConfigurator(this, 'processingTime', threshold);
  }

  onDeadLetter(): AlertConfigurator {
    return new AlertConfigurator(this, 'deadLetterCount', greaterThan(0));
  }

  onFailureRate(threshold: Threshold<number>): AlertConfigurator {
    return new AlertConfigurator(this, 'failureRate', threshold);
  }

  onPoisonMessages(): AlertConfigurator {
    return new AlertConfigurator(this, 'poisonMessageCount', greaterThan(0));
  }

  custom(metric: string, threshold: Threshold<any>): AlertConfigurator {
    return new AlertConfigurator(this, metric, threshold);
  }

  addAlert(alert: Alert): void {
    this.alerts.push(alert);
  }

  build(): MonitoringConfig {
    return {
      alerts: this.alerts,
    };
  }
}

export class AlertConfigurator {
  private alert: Partial<Alert>;
  private builder: AlertBuilder;

  constructor(builder: AlertBuilder, metric: string, threshold: Threshold<any>) {
    this.builder = builder;
    this.alert = { metric, threshold };
  }

  critical(): AlertActionConfigurator {
    this.alert.severity = 'Critical';
    return new AlertActionConfigurator(this);
  }

  error(): AlertActionConfigurator {
    this.alert.severity = 'Error';
    return new AlertActionConfigurator(this);
  }

  warn(): AlertActionConfigurator {
    this.alert.severity = 'Warning';
    return new AlertActionConfigurator(this);
  }

  info(): AlertActionConfigurator {
    this.alert.severity = 'Information';
    return new AlertActionConfigurator(this);
  }

  withDescription(description: string): this {
    this.alert.description = description;
    return this;
  }

  // Internal method to finalize alert
  finalize(): AlertBuilder {
    if (!this.alert.severity) {
      this.alert.severity = 'Warning'; // Default severity
    }
    this.builder.addAlert(this.alert as Alert);
    return this.builder;
  }
}

export class AlertActionConfigurator {
  private configurator: AlertConfigurator;
  private actions: AlertAction[] = [];

  constructor(configurator: AlertConfigurator) {
    this.configurator = configurator;
  }

  withEmail(address: string, delay?: Duration): this {
    this.actions.push({ type: 'email', target: address, delay });
    return this;
  }

  withSms(phoneNumber: string, delay?: Duration): this {
    this.actions.push({ type: 'sms', target: phoneNumber, delay });
    return this;
  }

  withWebhook(url: string, delay?: Duration): this {
    this.actions.push({ type: 'webhook', target: url, delay });
    return this;
  }

  withFunction(functionName: string, delay?: Duration): this {
    this.actions.push({ type: 'function', target: functionName, delay });
    return this;
  }

  // Chain back to AlertBuilder
  onDepth(threshold: Threshold<number>): AlertConfigurator {
    this.configurator.alert.actions = this.actions;
    return this.configurator.finalize().onDepth(threshold);
  }

  onMessageAge(threshold: Threshold<Duration>): AlertConfigurator {
    this.configurator.alert.actions = this.actions;
    return this.configurator.finalize().onMessageAge(threshold);
  }

  onDeadLetter(): AlertConfigurator {
    this.configurator.alert.actions = this.actions;
    return this.configurator.finalize().onDeadLetter();
  }

  // Terminal operation - return to builder
  and(): AlertBuilder {
    this.configurator.alert.actions = this.actions;
    return this.configurator.finalize();
  }
}
```

## Retry Policy Implementation

```typescript
// packages/component/src/queues/retry-policy.ts

import { Duration, seconds, minutes } from '../common';

export interface RetryPolicy {
  maxAttempts: number;
  initialDelay: Duration;
  maxDelay?: Duration;
  backoffStrategy: 'fixed' | 'linear' | 'exponential';
  backoffMultiplier?: number;
  jitter?: boolean;
}

export class RetryPolicyBuilder {
  private policy: Partial<RetryPolicy> = {
    maxAttempts: 3,
    initialDelay: seconds(5),
    backoffStrategy: 'exponential',
    backoffMultiplier: 2,
    jitter: true,
  };

  maxAttempts(n: number): this {
    this.policy.maxAttempts = n;
    return this;
  }

  initialDelay(duration: Duration): this {
    this.policy.initialDelay = duration;
    return this;
  }

  maxDelay(duration: Duration): this {
    this.policy.maxDelay = duration;
    return this;
  }

  backoffMultiplier(multiplier: number): this {
    this.policy.backoffMultiplier = multiplier;
    return this;
  }

  withJitter(enabled: boolean = true): this {
    this.policy.jitter = enabled;
    return this;
  }

  build(): RetryPolicy {
    // Apply defaults
    if (!this.policy.maxDelay) {
      this.policy.maxDelay = this.policy.initialDelay!.multiply(
        Math.pow(this.policy.backoffMultiplier!, this.policy.maxAttempts!)
      );
    }

    return this.policy as RetryPolicy;
  }
}

// Factory functions for common patterns
export const noRetries = (): RetryPolicy => ({
  maxAttempts: 0,
  initialDelay: seconds(0),
  backoffStrategy: 'fixed',
});

export const fixedDelay = (delay: Duration = seconds(5)): RetryPolicyBuilder => {
  const builder = new RetryPolicyBuilder();
  builder.policy.backoffStrategy = 'fixed';
  builder.policy.initialDelay = delay;
  builder.policy.backoffMultiplier = 1;
  return builder;
};

export const linearBackoff = (increment: Duration = seconds(5)): RetryPolicyBuilder => {
  const builder = new RetryPolicyBuilder();
  builder.policy.backoffStrategy = 'linear';
  builder.policy.initialDelay = increment;
  return builder;
};

export const exponentialBackoff = (): RetryPolicyBuilder => {
  const builder = new RetryPolicyBuilder();
  builder.policy.backoffStrategy = 'exponential';
  builder.policy.initialDelay = seconds(1);
  builder.policy.backoffMultiplier = 2;
  builder.policy.maxDelay = minutes(5);
  return builder;
};

// Preset configurations
export const aggressive = (): RetryPolicy =>
  exponentialBackoff().maxAttempts(10).initialDelay(seconds(1)).maxDelay(minutes(10)).build();

export const conservative = (): RetryPolicy =>
  exponentialBackoff().maxAttempts(3).initialDelay(seconds(30)).maxDelay(minutes(30)).build();

export const immediate = (): RetryPolicy =>
  fixedDelay(seconds(0)).maxAttempts(3).withJitter(false).build();
```

## Queue Presets

```typescript
// packages/component/src/queues/presets.ts

import { QueueBuilder } from './queue-builder';
import { seconds, minutes, hours, days } from '../common';
import { exponentialBackoff, aggressive } from './retry-policy';
import { greaterThan, olderThan } from '../common/threshold';

export enum QueuePreset {
  HighThroughput,
  LowLatency,
  LongRunning,
  Reliable,
  StandardRetries,
}

export function applyPreset(builder: QueueBuilder, preset: QueuePreset): QueueBuilder {
  switch (preset) {
    case QueuePreset.HighThroughput:
      return builder
        .batchSize(32)
        .parallelism(10)
        .visibility(seconds(30))
        .ttl(days(1))
        .monitoring((alerts) =>
          alerts.onDepth(greaterThan(10000)).warn().onDepth(greaterThan(50000)).critical()
        );

    case QueuePreset.LowLatency:
      return builder
        .batchSize(1)
        .parallelism(5)
        .visibility(seconds(10))
        .retries(1)
        .monitoring((alerts) =>
          alerts
            .onProcessingTime(greaterThan(seconds(5)))
            .warn()
            .onProcessingTime(greaterThan(seconds(10)))
            .error()
        );

    case QueuePreset.LongRunning:
      return builder
        .visibility(minutes(30))
        .lockDuration(hours(1))
        .ttl(days(14))
        .retries(1)
        .withDeadLetterQueue()
        .monitoring((alerts) =>
          alerts
            .onProcessingTime(greaterThan(hours(2)))
            .warn()
            .onMessageAge(olderThan(days(1)))
            .warn()
        );

    case QueuePreset.Reliable:
      return builder
        .retries(5)
        .withDeadLetterQueue()
        .withDuplicateDetection(minutes(10))
        .retry(aggressive())
        .monitoring((alerts) =>
          alerts
            .onDeadLetter()
            .error()
            .onFailureRate(greaterThan(0.1))
            .critical()
            .onPoisonMessages()
            .critical()
        );

    case QueuePreset.StandardRetries:
      return builder.retry(
        exponentialBackoff().maxAttempts(3).initialDelay(seconds(5)).maxDelay(minutes(1))
      );

    default:
      return builder;
  }
}
```

## Usage Examples

```typescript
// examples/simple-queue.ts
import { Queue, minutes } from '@atakora/component/queues';
import { myProcessor } from '../functions';

// Minimal configuration
export const simpleQueue = Queue('simple').processor(myProcessor).export();
```

```typescript
// examples/standard-queue.ts
import { Queue, minutes, hours, days } from '@atakora/component/queues';
import { orderProcessor } from '../functions';

// Standard configuration with common options
export const orderQueue = Queue('orders')
  .processor(orderProcessor)
  .ttl(days(7))
  .visibility(minutes(5))
  .retries(5)
  .withDeadLetterQueue()
  .export();
```

```typescript
// examples/high-throughput-queue.ts
import { Queue, greaterThan } from '@atakora/component/queues';
import { eventProcessor } from '../functions';

// High-throughput preset with custom monitoring
export const eventQueue = Queue('events')
  .processor(eventProcessor)
  .highThroughput()
  .monitoring((alerts) =>
    alerts
      .onDepth(greaterThan(100000))
      .critical()
      .withEmail('ops@company.com')
      .onMessageAge(olderThan(hours(1)))
      .warn()
  )
  .withMetrics()
  .withTracing()
  .export();
```

```typescript
// examples/complex-queue.ts
import { Queue, seconds, minutes, hours, days } from '@atakora/component/queues';
import { exponentialBackoff, greaterThan, olderThan, between } from '@atakora/component/queues';
import { dataProcessor } from '../functions';

// Complex configuration with all options
export const dataProcessingQueue = Queue('data-processing')
  .processor(dataProcessor)
  .ttl(days(30))
  .visibility(minutes(10))
  .lockDuration(minutes(15))
  .batchSize(10)
  .parallelism(5)
  .retry(
    exponentialBackoff().maxAttempts(10).initialDelay(seconds(2)).maxDelay(minutes(10)).withJitter()
  )
  .withDeadLetterQueue('data-processing-failures')
  .deadLetterAfter(5)
  .withDuplicateDetection(minutes(30))
  .withEncryption()
  .monitoring((alerts) =>
    alerts
      .onDepth(greaterThan(1000))
      .warn()
      .onDepth(greaterThan(5000))
      .critical()
      .withEmail('oncall@company.com')
      .onMessageAge(olderThan(hours(2)))
      .warn()
      .onMessageAge(olderThan(hours(6)))
      .error()
      .onProcessingTime(between(minutes(10), minutes(20)))
      .warn()
      .onProcessingTime(greaterThan(minutes(20)))
      .error()
      .onDeadLetter()
      .error()
      .withWebhook('https://alerts.company.com/webhook')
      .onFailureRate(greaterThan(0.05))
      .critical()
  )
  .withMetrics()
  .withTracing()
  .tags({
    environment: 'production',
    team: 'data-platform',
    costCenter: 'engineering',
  })
  .export();
```

## Migration Examples

### Before (Old API)

```typescript
export const dataQualityQueue = defineQueue({
  name: 'data-quality',
  processor: dataQualityProcessor,
  queue: {
    messageTimeToLive: '7.00:00:00',
    visibilityTimeout: '00:10:00',
    maxDeliveryCount: 3,
    deadLetterQueue: {
      enabled: true,
      name: 'data-quality-dlq',
    },
  },
  monitoring: {
    queueDepthAlert: {
      threshold: 1000,
      severity: 'Warning',
    },
    messageAgeAlert: {
      threshold: '01:00:00',
      severity: 'Warning',
    },
    deadLetterAlert: {
      enabled: true,
      severity: 'Error',
    },
  },
});
```

### After (New Fluent API)

```typescript
import { Queue, minutes, hours, days, greaterThan, olderThan } from '@atakora/component/queues';

export const dataQualityQueue = Queue('data-quality')
  .processor(dataQualityProcessor)
  .ttl(days(7))
  .visibility(minutes(10))
  .retries(3)
  .withDeadLetterQueue('data-quality-dlq')
  .monitoring((alerts) =>
    alerts
      .onDepth(greaterThan(1000))
      .warn()
      .onMessageAge(olderThan(hours(1)))
      .warn()
      .onDeadLetter()
      .error()
  )
  .export();
```

## Benefits Summary

1. **50% less code** for common patterns
2. **Type-safe** time durations and thresholds
3. **Discoverable** via IDE autocomplete
4. **Progressive** - start simple, add complexity
5. **Readable** - code reads like English
6. **Composable** - reuse policies and patterns
7. **Maintainable** - changes are localized

This implementation provides a delightful developer experience that feels like writing modern TypeScript code rather than configuration.
