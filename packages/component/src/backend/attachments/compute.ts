/**
 * Compute Attachment Logic
 *
 * Provides attachment point functionality for compute resources (Function Apps).
 * Allows customization of function app configuration including plan, runtime,
 * and scaling settings while maintaining validation and type safety.
 *
 * @module @atakora/component/backend/attachments
 */

import type {
  FunctionAppConfig,
  FunctionPlanType,
  PremiumPlanSku,
  DedicatedPlanSku,
  FunctionRuntime,
} from '../defaults/types';

/**
 * Validation result for compute attachments
 */
export interface ComputeAttachmentValidation {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

/**
 * Function App attachment builder
 *
 * Provides fluent API for building function app configurations
 * that can be attached to backend compute resources.
 *
 * @example
 * ```typescript
 * const customFunctionApp = functionApp()
 *   .plan('Premium', 'EP1')
 *   .runtime('node', '20')
 *   .minInstances(3)
 *   .maxInstances(10)
 *   .alwaysOn(true)
 *   .healthCheck('/api/health')
 *   .build();
 *
 * backend.compute.functionApp.attach(customFunctionApp);
 * ```
 */
export class FunctionAppAttachmentBuilder {
  private config: Partial<FunctionAppConfig> = {
    alwaysOn: false,
  };

  /**
   * Set function app name
   *
   * @param name - Function app name
   * @returns Builder for chaining
   */
  public name(name: string): this {
    this.config = { ...this.config, name };
    return this;
  }

  /**
   * Set hosting plan configuration
   *
   * @param type - Plan type (Consumption, Premium, or Dedicated)
   * @param sku - Optional SKU size for Premium or Dedicated plans
   * @returns Builder for chaining
   *
   * @example
   * ```typescript
   * // Consumption plan
   * builder.plan('Consumption')
   *
   * // Premium plan with EP2 SKU
   * builder.plan('Premium', 'EP2')
   *
   * // Dedicated plan with P1v2 SKU
   * builder.plan('Dedicated', 'P1v2')
   * ```
   */
  public plan(type: FunctionPlanType, sku?: PremiumPlanSku | DedicatedPlanSku): this {
    this.config = {
      ...this.config,
      plan: { type, sku },
    };
    return this;
  }

  /**
   * Set runtime configuration
   *
   * @param runtime - Runtime language
   * @param version - Runtime version
   * @returns Builder for chaining
   *
   * @example
   * ```typescript
   * builder.runtime('node', '20')
   * builder.runtime('dotnet', '8')
   * builder.runtime('python', '3.11')
   * ```
   */
  public runtime(runtime: FunctionRuntime, version: string): this {
    this.config = {
      ...this.config,
      runtime: { runtime, version },
    };
    return this;
  }

  /**
   * Set always on configuration
   *
   * Always on keeps the app loaded even when idle, preventing cold starts.
   * Only available for Premium and Dedicated plans.
   *
   * @param enable - Whether to enable always on
   * @returns Builder for chaining
   */
  public alwaysOn(enable: boolean): this {
    this.config = { ...this.config, alwaysOn: enable };
    return this;
  }

  /**
   * Set minimum instance count
   *
   * Minimum instances define the baseline scale for the function app.
   * Only available for Premium plans.
   *
   * @param count - Minimum number of instances
   * @returns Builder for chaining
   */
  public minInstances(count: number): this {
    this.config = { ...this.config, minInstances: count };
    return this;
  }

  /**
   * Set maximum instance count
   *
   * Maximum instances define the scale limit for the function app.
   * Available for all plan types.
   *
   * @param count - Maximum number of instances
   * @returns Builder for chaining
   */
  public maxInstances(count: number): this {
    this.config = { ...this.config, maxInstances: count };
    return this;
  }

  /**
   * Set health check endpoint
   *
   * Health check endpoint is used to monitor app health and
   * remove unhealthy instances from rotation.
   *
   * @param path - Health check endpoint path
   * @returns Builder for chaining
   */
  public healthCheck(path: string): this {
    this.config = { ...this.config, healthCheck: path };
    return this;
  }

  /**
   * Set CORS configuration
   *
   * @param allowedOrigins - Array of allowed origins
   * @param supportCredentials - Whether to support credentials
   * @returns Builder for chaining
   *
   * @example
   * ```typescript
   * builder.cors(['https://app.example.com'], true)
   * ```
   */
  public cors(allowedOrigins: readonly string[], supportCredentials?: boolean): this {
    this.config = {
      ...this.config,
      cors: {
        allowedOrigins,
        supportCredentials: supportCredentials ?? false,
      },
    };
    return this;
  }

  /**
   * Build the function app configuration
   *
   * @returns Complete function app configuration
   * @throws Error if required fields are missing
   */
  public build(): FunctionAppConfig {
    // Validate required fields
    if (!this.config.plan) {
      throw new Error('Function app plan is required');
    }

    if (!this.config.runtime) {
      throw new Error('Function app runtime is required');
    }

    return this.config as FunctionAppConfig;
  }
}

/**
 * Create a new function app attachment builder
 *
 * @returns Function app attachment builder
 *
 * @example
 * ```typescript
 * const config = functionApp()
 *   .plan('Premium', 'EP1')
 *   .runtime('node', '20')
 *   .build();
 * ```
 */
export function functionApp(): FunctionAppAttachmentBuilder {
  return new FunctionAppAttachmentBuilder();
}

/**
 * Validate function app configuration
 *
 * Performs comprehensive validation of function app configuration including:
 * - Plan and SKU compatibility
 * - Runtime version support
 * - Scaling configuration
 * - Feature availability per plan type
 *
 * @param config - Function app configuration to validate
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * const config = functionApp().plan('Consumption').runtime('node', '20').build();
 * const validation = validateFunctionAppAttachment(config);
 *
 * if (!validation.valid) {
 *   console.error('Validation errors:', validation.errors);
 * }
 * ```
 */
export function validateFunctionAppAttachment(
  config: FunctionAppConfig
): ComputeAttachmentValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate plan configuration
  validatePlan(config, errors, warnings);

  // Validate runtime configuration
  validateRuntime(config, errors, warnings);

  // Validate scaling configuration
  validateScaling(config, errors, warnings);

  // Validate feature availability
  validateFeatures(config, errors, warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate plan configuration
 */
function validatePlan(config: FunctionAppConfig, errors: string[], warnings: string[]): void {
  const { plan } = config;

  // Validate SKU is provided when required
  if (plan.type === 'Premium' && !plan.sku) {
    errors.push('Premium plan requires a SKU (EP1, EP2, or EP3)');
  }

  if (plan.type === 'Dedicated' && !plan.sku) {
    errors.push('Dedicated plan requires a SKU (B1, S1, P1v2, etc.)');
  }

  // Validate SKU matches plan type
  if (plan.type === 'Premium' && plan.sku && !isPremiumSku(plan.sku)) {
    errors.push(`Invalid Premium SKU: ${plan.sku}. Must be EP1, EP2, or EP3`);
  }

  if (plan.type === 'Dedicated' && plan.sku && isPremiumSku(plan.sku)) {
    errors.push(`Invalid Dedicated SKU: ${plan.sku}. Cannot use Premium SKUs for Dedicated plans`);
  }

  // Consumption plan warnings
  if (plan.type === 'Consumption') {
    warnings.push(
      'Consumption plan has cold start latency. Consider Premium for production workloads'
    );
  }
}

/**
 * Validate runtime configuration
 */
function validateRuntime(config: FunctionAppConfig, errors: string[], warnings: string[]): void {
  const { runtime } = config;

  // Validate runtime versions
  const validVersions = getValidRuntimeVersions(runtime.runtime);
  if (!validVersions.includes(runtime.version)) {
    errors.push(
      `Invalid ${runtime.runtime} version: ${runtime.version}. Valid versions: ${validVersions.join(', ')}`
    );
  }

  // Check for deprecated versions
  const deprecatedVersions = getDeprecatedRuntimeVersions(runtime.runtime);
  if (deprecatedVersions.includes(runtime.version)) {
    warnings.push(
      `Runtime version ${runtime.runtime} ${runtime.version} is deprecated. Consider upgrading to a newer version`
    );
  }
}

/**
 * Validate scaling configuration
 */
function validateScaling(config: FunctionAppConfig, errors: string[], warnings: string[]): void {
  const { plan, minInstances, maxInstances } = config;

  // Validate min instances
  if (minInstances !== undefined) {
    if (plan.type === 'Consumption') {
      errors.push('Consumption plan does not support minimum instance count');
    }

    if (minInstances < 0) {
      errors.push('Minimum instances cannot be negative');
    }

    if (minInstances > 20) {
      warnings.push('Minimum instances set very high. This may incur significant costs');
    }
  }

  // Validate max instances
  if (maxInstances !== undefined) {
    if (maxInstances < 1) {
      errors.push('Maximum instances must be at least 1');
    }

    if (maxInstances > 200) {
      warnings.push('Maximum instances exceeds Azure limits (typically 200)');
    }
  }

  // Validate min/max relationship
  if (minInstances !== undefined && maxInstances !== undefined) {
    if (minInstances > maxInstances) {
      errors.push('Minimum instances cannot be greater than maximum instances');
    }

    if (minInstances === maxInstances) {
      warnings.push('Min and max instances are equal. This disables autoscaling');
    }
  }
}

/**
 * Validate feature availability
 */
function validateFeatures(config: FunctionAppConfig, errors: string[], warnings: string[]): void {
  const { plan, alwaysOn, healthCheck } = config;

  // Validate always on
  if (alwaysOn) {
    if (plan.type === 'Consumption') {
      errors.push('Always on is not available for Consumption plan');
    }
  } else {
    if (plan.type !== 'Consumption') {
      warnings.push(
        'Always on is recommended for Premium and Dedicated plans to avoid cold starts'
      );
    }
  }

  // Validate health check
  if (healthCheck) {
    if (!healthCheck.startsWith('/')) {
      errors.push('Health check path must start with /');
    }

    if (plan.type === 'Consumption') {
      warnings.push(
        'Health check has limited effectiveness on Consumption plan due to cold starts'
      );
    }
  }
}

/**
 * Check if SKU is a Premium SKU
 */
function isPremiumSku(sku: string): boolean {
  return ['EP1', 'EP2', 'EP3'].includes(sku);
}

/**
 * Get valid runtime versions for a given runtime
 */
function getValidRuntimeVersions(runtime: FunctionRuntime): string[] {
  const versions: Record<FunctionRuntime, string[]> = {
    node: ['14', '16', '18', '20'],
    dotnet: ['6', '7', '8'],
    python: ['3.8', '3.9', '3.10', '3.11'],
    java: ['8', '11', '17'],
    powershell: ['7.2', '7.3'],
  };

  return versions[runtime] || [];
}

/**
 * Get deprecated runtime versions for a given runtime
 */
function getDeprecatedRuntimeVersions(runtime: FunctionRuntime): string[] {
  const deprecated: Record<FunctionRuntime, string[]> = {
    node: ['14'],
    dotnet: ['6'],
    python: ['3.8'],
    java: ['8'],
    powershell: [],
  };

  return deprecated[runtime] || [];
}

/**
 * Merge function app configurations
 *
 * Merges a custom configuration with a base configuration.
 * Custom configuration takes precedence over base configuration.
 *
 * @param base - Base configuration (defaults)
 * @param custom - Custom configuration (attachment)
 * @returns Merged configuration
 *
 * @example
 * ```typescript
 * const merged = mergeFunctionAppConfigs(
 *   productionDefaults.compute.functionApp,
 *   customFunctionApp
 * );
 * ```
 */
export function mergeFunctionAppConfigs(
  base: FunctionAppConfig,
  custom: FunctionAppConfig
): FunctionAppConfig {
  return {
    name: custom.name ?? base.name,
    plan: custom.plan ?? base.plan,
    runtime: custom.runtime ?? base.runtime,
    alwaysOn: custom.alwaysOn ?? base.alwaysOn,
    minInstances: custom.minInstances ?? base.minInstances,
    maxInstances: custom.maxInstances ?? base.maxInstances,
    healthCheck: custom.healthCheck ?? base.healthCheck,
    cors: custom.cors ?? base.cors,
  };
}

/**
 * Attachment point for function app configuration
 *
 * Provides attach/detach/get functionality for function app customization.
 */
export class FunctionAppAttachmentPoint {
  private attachedConfig?: FunctionAppConfig;

  constructor(private readonly defaultConfig: FunctionAppConfig) {}

  /**
   * Attach custom function app configuration
   *
   * @param config - Custom configuration to attach
   * @throws Error if validation fails
   */
  public attach(config: FunctionAppConfig): void {
    // Validate configuration
    const validation = validateFunctionAppAttachment(config);

    if (!validation.valid) {
      throw new Error(
        `Function app attachment validation failed:\n${validation.errors.join('\n')}`
      );
    }

    // Log warnings
    if (validation.warnings.length > 0) {
      console.warn('Function app attachment warnings:', validation.warnings);
    }

    this.attachedConfig = config;
  }

  /**
   * Check if custom configuration is attached
   *
   * @returns True if configuration is attached
   */
  public isAttached(): boolean {
    return this.attachedConfig !== undefined;
  }

  /**
   * Get current configuration (attached or default)
   *
   * @returns Current function app configuration
   */
  public getConfig(): FunctionAppConfig {
    if (this.attachedConfig) {
      return mergeFunctionAppConfigs(this.defaultConfig, this.attachedConfig);
    }
    return this.defaultConfig;
  }

  /**
   * Reset to default configuration
   */
  public reset(): void {
    this.attachedConfig = undefined;
  }
}

/**
 * Create a function app attachment point
 *
 * @param defaultConfig - Default configuration
 * @returns Attachment point instance
 *
 * @example
 * ```typescript
 * const attachmentPoint = createFunctionAppAttachmentPoint(
 *   productionDefaults.compute.functionApp
 * );
 *
 * // Later, attach custom config
 * attachmentPoint.attach(customConfig);
 * ```
 */
export function createFunctionAppAttachmentPoint(
  defaultConfig: FunctionAppConfig
): FunctionAppAttachmentPoint {
  return new FunctionAppAttachmentPoint(defaultConfig);
}

// ============================================================================
// Compute Builder API (Stub Implementation)
// ============================================================================

/**
 * TODO: Full implementation of compute builder API
 * This is a stub to allow example code to compile.
 */

/**
 * Compute builder stub
 * @internal
 */
export interface ComputeResourceBuilder {
  when(condition: boolean, callback: (builder: this) => any): this;
  _build(): any;
  // Allow any method for fluent API
  [key: string]: any;
}

class ComputeResourceBuilderImpl implements ComputeResourceBuilder {
  private config: any = {};

  constructor() {
    // Return a proxy that accepts any method call
    return new Proxy(this, {
      get(target, prop: string) {
        if (prop === '_build') {
          return () => target.config;
        }
        if (prop === 'when') {
          return (condition: boolean, callback: (builder: any) => any) => {
            if (condition) callback(target);
            return target;
          };
        }
        // Any other method call returns the builder for chaining
        return (...args: any[]) => {
          target.config[prop] = args;
          return target;
        };
      },
    }) as any;
  }

  when(condition: boolean, callback: (builder: any) => any): this {
    if (condition) callback(this);
    return this;
  }

  _build(): any {
    return this.config;
  }

  [key: string]: any;
}

/**
 * Compute namespace with builder factory methods
 */
export const compute = {
  /**
   * Create a function app builder (stub)
   */
  functionApp(): ComputeResourceBuilder {
    return new ComputeResourceBuilderImpl();
  },
};

/**
 * Define compute configuration
 *
 * @param configs - Compute configuration
 * @returns Compute configuration
 */
export function defineCompute(configs: Record<string, any>): any {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(configs)) {
    if (value && typeof value === 'object' && '_build' in value) {
      result[key] = value._build();
    } else {
      result[key] = value;
    }
  }
  return result;
}
