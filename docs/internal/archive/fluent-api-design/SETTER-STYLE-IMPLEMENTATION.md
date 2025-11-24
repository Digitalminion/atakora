# Setter-Style Backend API Implementation Guide

This document provides implementation details for the setter-style backend API defined in ADR-020.

## Core Backend Class Design

```typescript
// packages/component/src/backend/Backend.ts

import type {
  DataComponent,
  FunctionComponent,
  QueueComponent,
  EventTopicComponent,
  InfrastructureComponent,
} from './types';

/**
 * The Backend class uses TypeScript Proxies to enable dynamic property assignment
 * while maintaining full type safety through careful type definitions.
 */
export class Backend {
  // Internal storage for components
  private _data?: DataComponent;
  private _components = new Map<string, ComponentType>();
  private _stacks = new Map<string, Stack>();

  // Configuration builders (lazy initialized)
  private _config?: ConfigBuilder;
  private _secrets?: SecretsBuilder;
  private _authentication?: AuthenticationBuilder;
  private _networking?: NetworkingBuilder;
  private _performance?: PerformanceBuilder;
  private _governance?: GovernanceBuilder;
  private _monitoring?: MonitoringBuilder;
  private _features?: FeaturesBuilder;

  // Allow dynamic property assignment for components
  [key: string]: any;

  constructor() {
    // Use Proxy to intercept property assignments
    return new Proxy(this, {
      set: this._handleAssignment.bind(this),
      get: this._handleAccess.bind(this),
    });
  }

  private _handleAssignment(target: any, prop: string | symbol, value: any): boolean {
    // Special handling for known component types
    if (prop === 'data' && isDataComponent(value)) {
      this._data = value;
      return true;
    }

    // Auto-detect component types
    if (isFunctionComponent(value)) {
      this._components.set(String(prop), { type: 'function', component: value });
      return true;
    }

    if (isQueueComponent(value)) {
      this._components.set(String(prop), { type: 'queue', component: value });
      return true;
    }

    if (isEventTopicComponent(value)) {
      this._components.set(String(prop), { type: 'eventTopic', component: value });
      return true;
    }

    // Default property assignment
    target[prop] = value;
    return true;
  }

  private _handleAccess(target: any, prop: string | symbol): any {
    // Lazy initialize configuration builders
    switch (prop) {
      case 'config':
        return (this._config ??= new ConfigBuilder(this));
      case 'secrets':
        return (this._secrets ??= new SecretsBuilder(this));
      case 'authentication':
        return (this._authentication ??= new AuthenticationBuilder(this));
      case 'networking':
        return (this._networking ??= new NetworkingBuilder(this));
      case 'performance':
        return (this._performance ??= new PerformanceBuilder(this));
      case 'governance':
        return (this._governance ??= new GovernanceBuilder(this));
      case 'monitoring':
        return (this._monitoring ??= new MonitoringBuilder(this));
      case 'features':
        return (this._features ??= new FeaturesBuilder(this));
      default:
        return target[prop];
    }
  }

  // Stack management
  createStack(name: string, options?: StackOptions): Stack {
    const stack = new Stack(name, this, options);
    this._stacks.set(name, stack);
    return stack;
  }

  // Environment-specific configuration
  when(environment: string): EnvironmentConfigBuilder {
    return new EnvironmentConfigBuilder(this, environment);
  }

  // Getter for special properties that need processing
  get functionApp(): FunctionAppReference {
    // Returns a reference to the synthesized function app
    return new FunctionAppReference(this);
  }
}
```

## Configuration Builder Classes

### ConfigBuilder - Direct Assignment Pattern

```typescript
/**
 * ConfigBuilder allows direct property assignment for configuration values.
 * Uses Proxy to enable dynamic property creation with type safety.
 */
export class ConfigBuilder {
  private _values = new Map<string, any>();
  private _backend: Backend;

  // Nested builders for complex configuration
  private _rateLimits?: RateLimitsConfig;

  constructor(backend: Backend) {
    this._backend = backend;

    // Return a Proxy to handle dynamic property assignment
    return new Proxy(this, {
      set: (target, prop, value) => {
        if (prop === 'rateLimits') {
          this._rateLimits ??= new RateLimitsConfig();
          return true;
        }
        this._values.set(String(prop), value);
        return true;
      },
      get: (target, prop) => {
        if (prop === 'rateLimits') {
          return (this._rateLimits ??= new RateLimitsConfig());
        }
        return this._values.get(String(prop));
      },
    });
  }

  // Type-safe properties (for IntelliSense)
  databaseName!: string;
  maxUploadSizeMb!: number;
  allowedFileTypes!: string[];
  allowedOrigins!: string[];
  debugMode!: boolean;
  verboseLogging!: boolean;
  rateLimits!: RateLimitsConfig;
}

class RateLimitsConfig {
  api: number = 1000;
  uploads: number = 10;
  reports: number = 100;
}
```

### SecretsBuilder - Helper Functions Pattern

```typescript
/**
 * SecretsBuilder uses helper functions for clarity and type safety.
 * Secrets are not actual values but declarations of what secrets are needed.
 */
export class SecretsBuilder {
  private _secrets = new Map<string, SecretDeclaration>();

  // Dynamic property assignment with helper functions
  [key: string]: SecretDeclaration;

  constructor(private backend: Backend) {
    return new Proxy(this, {
      set: (target, prop, value) => {
        if (isSecretDeclaration(value)) {
          this._secrets.set(String(prop), value);
          return true;
        }
        throw new Error(`Invalid secret declaration for ${String(prop)}`);
      },
      get: (target, prop) => {
        return this._secrets.get(String(prop));
      },
    });
  }
}

// Helper functions for secret declarations
export function required(description?: string): SecretDeclaration {
  return {
    required: true,
    description,
  };
}

export function optional(description?: string): SecretDeclaration {
  return {
    required: false,
    description,
  };
}

interface SecretDeclaration {
  required: boolean;
  description?: string;
}
```

### AuthenticationBuilder - Fluent API Pattern

```typescript
/**
 * AuthenticationBuilder combines direct assignment with fluent methods
 * for complex configuration scenarios.
 */
export class AuthenticationBuilder {
  provider: 'entra' | 'b2c' | 'custom' = 'entra';

  private _allowedTenants: string[] = [];
  private _requireMFA: boolean = false;
  private _conditionalAccess?: ConditionalAccessConfig;

  apiKeys = new ApiKeysBuilder();

  constructor(private backend: Backend) {}

  // Fluent methods for complex configuration
  allowTenants(...tenants: string[]): this {
    this._allowedTenants.push(...tenants);
    return this;
  }

  requireMFA(require: boolean = true): this {
    this._requireMFA = require;
    return this;
  }

  conditionalAccess(config: ConditionalAccessConfig): this {
    this._conditionalAccess = config;
    return this;
  }
}

class ApiKeysBuilder {
  private _enabled: boolean = false;
  private _rotationDays?: number;

  enable(): this {
    this._enabled = true;
    return this;
  }

  rotationDays(days: number): this {
    this._rotationDays = days;
    return this;
  }
}
```

### NetworkingBuilder - Chained Configuration

```typescript
/**
 * NetworkingBuilder uses method chaining for progressive configuration.
 */
export class NetworkingBuilder {
  private _forcePrivate: boolean = false;
  private _allowedIPs: string[] = [];
  private _wafEnabled: boolean = false;

  constructor(private backend: Backend) {}

  forcePrivate(): this {
    this._forcePrivate = true;
    return this;
  }

  allowPublic(): this {
    this._forcePrivate = false;
    return this;
  }

  allowIPs(...ips: string[]): this {
    this._allowedIPs.push(...ips);
    return this;
  }

  enableWAF(): this {
    this._wafEnabled = true;
    return this;
  }
}
```

### PerformanceBuilder - Nested Builders

```typescript
/**
 * PerformanceBuilder uses nested builders for different subsystems.
 */
export class PerformanceBuilder {
  private _functionPlan: 'Consumption' | 'Premium' = 'Consumption';
  private _alwaysOn: boolean = false;
  private _maxInstances: number = 10;
  private _scaleRules: ScaleRule[] = [];

  cosmos = new CosmosPerformanceBuilder();
  cache = new CachePerformanceBuilder();

  constructor(private backend: Backend) {}

  functionPlan(plan: 'Consumption' | 'Premium'): this {
    this._functionPlan = plan;
    return this;
  }

  alwaysOn(enabled: boolean = true): this {
    this._alwaysOn = enabled;
    return this;
  }

  maxInstances(count: number): this {
    this._maxInstances = count;
    return this;
  }

  scaleRule(metric: string, threshold: number, options?: { scaleBy: number }): this {
    this._scaleRules.push({ metric, threshold, ...options });
    return this;
  }
}

class CosmosPerformanceBuilder {
  private _mode: 'Serverless' | 'Autoscale' = 'Serverless';
  private _maxRU?: number;

  mode(mode: 'Serverless' | 'Autoscale'): this {
    this._mode = mode;
    return this;
  }

  maxRU(ru: number): this {
    this._maxRU = ru;
    return this;
  }

  dedicatedGateway(): this {
    // Enable dedicated gateway for better performance
    return this;
  }
}

class CachePerformanceBuilder {
  private _type?: 'redis' | 'memory';
  private _ttl: number = 3600;

  redis(): this {
    this._type = 'redis';
    return this;
  }

  memory(): this {
    this._type = 'memory';
    return this;
  }

  ttl(seconds: number): this {
    this._ttl = seconds;
    return this;
  }
}
```

### MonitoringBuilder - Alert Definition Pattern

```typescript
/**
 * MonitoringBuilder provides a fluent API for metrics and alerts.
 */
export class MonitoringBuilder {
  private _metrics: CustomMetric[] = [];
  private _alerts: Alert[] = [];
  private _currentAlert?: AlertBuilder;

  constructor(private backend: Backend) {}

  metric(name: string, type: 'gauge' | 'counter' | 'histogram'): this {
    this._metrics.push({ name, type });
    return this;
  }

  alert(name: string): AlertBuilder {
    const alertBuilder = new AlertBuilder(name, this);
    this._currentAlert = alertBuilder;
    return alertBuilder;
  }

  _addAlert(alert: Alert): void {
    this._alerts.push(alert);
  }
}

class AlertBuilder {
  private _condition?: string;
  private _severity?: 'info' | 'warning' | 'critical';
  private _action?: string;

  constructor(
    private name: string,
    private parent: MonitoringBuilder
  ) {}

  when(condition: string): this {
    this._condition = condition;
    return this;
  }

  severity(level: 'info' | 'warning' | 'critical'): this {
    this._severity = level;
    return this;
  }

  action(action: string): this {
    this._action = action;
    // Complete the alert and add to parent
    this.parent._addAlert({
      name: this.name,
      condition: this._condition!,
      severity: this._severity!,
      action: this._action,
    });
    // Return parent for continued chaining
    return this.parent;
  }
}
```

### FeaturesBuilder - Simple Boolean Properties

```typescript
/**
 * FeaturesBuilder uses simple property assignment for feature flags.
 */
export class FeaturesBuilder {
  graphql: boolean = false;
  websockets: boolean = false;
  batchOperations: boolean = false;
  dataExport: boolean = false;
  experimental: boolean = false;
  hotReload: boolean = false;

  constructor(private backend: Backend) {}
}
```

## Environment-Specific Configuration

```typescript
/**
 * EnvironmentConfigBuilder enables clean environment-specific overrides.
 */
export class EnvironmentConfigBuilder {
  constructor(
    private backend: Backend,
    private environment: string
  ) {}

  config(configure: (config: ConfigBuilder) => void): this {
    if (this.isCurrentEnvironment()) {
      configure(this.backend.config);
    }
    return this;
  }

  networking(configure: (networking: NetworkingBuilder) => void): this {
    if (this.isCurrentEnvironment()) {
      configure(this.backend.networking);
    }
    return this;
  }

  performance(configure: (performance: PerformanceBuilder) => void): this {
    if (this.isCurrentEnvironment()) {
      configure(this.backend.performance);
    }
    return this;
  }

  features(configure: (features: FeaturesBuilder) => void): this {
    if (this.isCurrentEnvironment()) {
      configure(this.backend.features);
    }
    return this;
  }

  private isCurrentEnvironment(): boolean {
    return process.env.NODE_ENV === this.environment;
  }
}
```

## Component Type Guards

```typescript
// Type guards for component detection
export function isDataComponent(value: any): value is DataComponent {
  return value && typeof value === 'object' && 'schema' in value;
}

export function isFunctionComponent(value: any): value is FunctionComponent {
  return value && typeof value === 'object' && 'trigger' in value && 'entry' in value;
}

export function isQueueComponent(value: any): value is QueueComponent {
  return value && typeof value === 'object' && 'queueName' in value;
}

export function isEventTopicComponent(value: any): value is EventTopicComponent {
  return value && typeof value === 'object' && 'topicName' in value;
}

export function isSecretDeclaration(value: any): value is SecretDeclaration {
  return value && typeof value === 'object' && 'required' in value;
}
```

## TypeScript Type Definitions

```typescript
// Advanced type definitions for full IntelliSense support

// Make Backend accept any function/queue/topic assignment
interface Backend {
  // Known properties
  data: DataComponent;
  config: ConfigBuilder;
  secrets: SecretsBuilder;
  authentication: AuthenticationBuilder;
  networking: NetworkingBuilder;
  performance: PerformanceBuilder;
  governance: GovernanceBuilder;
  monitoring: MonitoringBuilder;
  features: FeaturesBuilder;

  // Dynamic component assignment
  [functionName: string]: FunctionComponent | QueueComponent | EventTopicComponent | any;
}

// Use template literal types for better IntelliSense
type SecretName = `${Uppercase<string>}_${Uppercase<string>}` | string;

interface SecretsBuilder {
  [K: SecretName]: SecretDeclaration;
}
```

## Usage Examples

### Minimal Configuration

```typescript
const backend = new Backend();
backend.data = data;
backend.processUpload = processUpload;
```

### Progressive Enhancement

```typescript
const backend = new Backend();

// Start simple
backend.data = data;
backend.processUpload = processUpload;

// Add secrets as needed
backend.secrets.API_KEY = required();

// Configure networking when ready
backend.networking.forcePrivate();

// Add monitoring later
backend.monitoring
  .metric('requests', 'counter')
  .alert('high-load')
  .when('requests > 1000')
  .severity('warning')
  .action('scale-up');
```

### Environment-Aware Configuration

```typescript
const backend = new Backend();

backend.data = data;

// Base configuration
backend.config.databaseName = 'myapp-db';

// Environment-specific overrides
backend
  .when('production')
  .networking((n) => n.forcePrivate())
  .performance((p) => p.functionPlan('Premium'));

backend.when('development').features((f) => {
  f.experimental = true;
  f.hotReload = true;
});
```

## Benefits of This Implementation

1. **Natural TypeScript Feel** - Assignments and method calls, not config objects
2. **Progressive Disclosure** - Complexity hidden until needed
3. **Full Type Safety** - TypeScript knows about every property
4. **Excellent IntelliSense** - Auto-completion for all properties
5. **Flexible Patterns** - Mix assignment, builders, and methods as appropriate
6. **Clean Conditionals** - Standard if/else or when() method
7. **Testable** - Each builder can be unit tested independently
8. **Maintainable** - Clear separation of concerns

## Migration Strategy

1. Implement Backend class alongside existing defineBackend
2. Mark defineBackend as deprecated
3. Provide codemod for automatic migration
4. Remove old API in next major version

The setter-style API represents a significant improvement in developer experience while maintaining all the power and flexibility of the original design.
