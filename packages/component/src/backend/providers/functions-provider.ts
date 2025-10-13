import type { Construct } from '@atakora/cdk';
import { FunctionApp } from '@atakora/cdk/functions';
import type { FunctionAppProps } from '@atakora/cdk/functions';
import { BaseProvider, type IResourceRequirement, type ProviderContext, type ValidationResult } from './base-provider';

/**
 * Function runtime types.
 */
export type FunctionRuntime = 'node' | 'python' | 'dotnet' | 'java' | 'powershell';

/**
 * Function App configuration for resource requirements.
 */
export interface FunctionsConfig {
  readonly runtime: FunctionRuntime;
  readonly version?: string;
  readonly sku?: string;
  readonly alwaysOn?: boolean;
  readonly environmentVariables?: Record<string, EnvironmentVariableConfig>;
  readonly extensions?: ReadonlyArray<string>;
  readonly plan?: any; // App Service Plan reference
  readonly storageAccount?: any; // Storage Account reference
  readonly location?: string;
}

/**
 * Environment variable configuration with source component tracking.
 */
export interface EnvironmentVariableConfig {
  readonly value: string;
  readonly componentId?: string; // Which component requires this variable
}

/**
 * Azure Function App resource limits.
 */
const FUNCTIONS_LIMITS = {
  /** Maximum functions per Function App (practical limit) */
  MAX_FUNCTIONS_PER_APP: 200,

  /** Maximum environment variables per Function App (practical limit) */
  MAX_ENVIRONMENT_VARIABLES: 1000,
} as const;

/**
 * Resource provider for Azure Function Apps.
 *
 * @remarks
 * Handles provisioning and merging of Function App resources.
 *
 * **Features**:
 * - Merges multiple function requirements into single app
 * - Namespaces environment variables by component to prevent conflicts
 * - Respects Azure limits (max 200 functions per app)
 * - Auto-splits when limits exceeded (creates functions-2, functions-3, etc.)
 * - Validates runtime compatibility
 *
 * **Merge Rules**:
 * - Runtime and version must match
 * - Environment variables are namespaced: COMPONENT_VAR_NAME
 * - Extensions are merged (union)
 * - SKU is upgraded to highest requirement
 * - alwaysOn is enabled if any component requires it
 *
 * **Environment Variable Namespacing**:
 * ```typescript
 * // Component: UserApi
 * USER_API_COSMOS_ENDPOINT = "https://..."
 * USER_API_DATABASE_NAME = "users-db"
 *
 * // Component: ProductApi
 * PRODUCT_API_COSMOS_ENDPOINT = "https://..."
 * PRODUCT_API_DATABASE_NAME = "products-db"
 * ```
 *
 * @example
 * ```typescript
 * const provider = new FunctionsProvider();
 *
 * const req1: IResourceRequirement = {
 *   resourceType: 'functions',
 *   requirementKey: 'shared',
 *   config: {
 *     runtime: 'node',
 *     version: '20',
 *     environmentVariables: {
 *       'COSMOS_ENDPOINT': { value: '${cosmos.endpoint}', componentId: 'UserApi' }
 *     }
 *   }
 * };
 *
 * const merged = provider.mergeRequirements([req1, req2]);
 * // Result: Single app with namespaced environment variables
 * ```
 */
export class FunctionsProvider extends BaseProvider<FunctionsConfig, FunctionApp> {
  readonly providerId = 'functions-provider';
  readonly resourceType = 'functions';
  readonly supportedTypes = ['functions'] as const;
  protected readonly resourceLimit = FUNCTIONS_LIMITS.MAX_FUNCTIONS_PER_APP;

  /**
   * Check if two Function App configurations can be merged.
   *
   * @param config1 - First configuration
   * @param config2 - Second configuration
   * @returns True if configurations are compatible
   */
  protected canMerge(config1: FunctionsConfig, config2: FunctionsConfig): boolean {
    // Runtime must match
    if (config1.runtime !== config2.runtime) {
      return false;
    }

    // Version should match (or be compatible)
    if (config1.version && config2.version && config1.version !== config2.version) {
      // Allow minor version differences for same major version
      const v1Major = config1.version.split('.')[0];
      const v2Major = config2.version.split('.')[0];
      if (v1Major !== v2Major) {
        return false;
      }
    }

    // Check if environment variables would conflict after namespacing
    // Since we namespace by component, conflicts are rare but possible
    // if two components use the same ID
    const env1 = config1.environmentVariables ?? {};
    const env2 = config2.environmentVariables ?? {};

    const namespacedKeys1 = Object.keys(env1).map(key =>
      this.namespaceEnvVar(key, env1[key].componentId ?? 'unknown')
    );
    const namespacedKeys2 = Object.keys(env2).map(key =>
      this.namespaceEnvVar(key, env2[key].componentId ?? 'unknown')
    );

    // Check for duplicates
    const duplicates = namespacedKeys1.filter(key => namespacedKeys2.includes(key));
    if (duplicates.length > 0) {
      // Check if duplicate keys have same values
      for (const dupKey of duplicates) {
        const original1 = Object.entries(env1).find(([k, v]) =>
          this.namespaceEnvVar(k, v.componentId ?? 'unknown') === dupKey
        );
        const original2 = Object.entries(env2).find(([k, v]) =>
          this.namespaceEnvVar(k, v.componentId ?? 'unknown') === dupKey
        );

        if (original1 && original2 && original1[1].value !== original2[1].value) {
          return false; // Conflicting values
        }
      }
    }

    return true;
  }

  /**
   * Merge multiple Function App requirements into a single configuration.
   *
   * @param requirements - Array of requirements to merge
   * @returns Merged Functions configuration
   */
  protected merge(requirements: ReadonlyArray<IResourceRequirement>): FunctionsConfig {
    const configs = requirements.map(r => r.config as FunctionsConfig);

    // Start with first config as base
    const mergedConfig: any = {
      runtime: configs[0].runtime,
      version: configs[0].version,
      sku: configs[0].sku,
      alwaysOn: configs[0].alwaysOn,
      plan: configs[0].plan,
      storageAccount: configs[0].storageAccount,
      location: configs[0].location,
    };

    // Merge extensions (union)
    const allExtensions = new Set<string>();
    for (const config of configs) {
      if (config.extensions) {
        config.extensions.forEach(ext => allExtensions.add(ext));
      }
    }
    if (allExtensions.size > 0) {
      mergedConfig.extensions = Array.from(allExtensions);
    }

    // Merge environment variables with namespacing
    mergedConfig.environmentVariables = this.mergeEnvironmentVariables(configs);

    // Use highest SKU
    const skus = configs.map(c => c.sku).filter((sku): sku is string => sku !== undefined);
    if (skus.length > 0) {
      mergedConfig.sku = this.selectHighestSku(skus);
    }

    // Enable alwaysOn if any component requires it
    if (configs.some(c => c.alwaysOn)) {
      mergedConfig.alwaysOn = true;
    }

    // Use most recent version if multiple specified
    const versions = configs.map(c => c.version).filter((v): v is string => v !== undefined);
    if (versions.length > 1) {
      mergedConfig.version = this.selectHighestVersion(versions);
    }

    return mergedConfig;
  }

  /**
   * Merge environment variables from multiple configurations with namespacing.
   *
   * @param configs - Array of Functions configurations
   * @returns Merged environment variables with namespacing
   */
  private mergeEnvironmentVariables(
    configs: ReadonlyArray<FunctionsConfig>
  ): Record<string, EnvironmentVariableConfig> {
    const merged: Record<string, EnvironmentVariableConfig> = {};

    for (const config of configs) {
      if (!config.environmentVariables) continue;

      for (const [key, envConfig] of Object.entries(config.environmentVariables)) {
        const componentId = envConfig.componentId ?? 'shared';
        const namespacedKey = this.namespaceEnvVar(key, componentId);

        // Check for conflicts
        if (merged[namespacedKey] && merged[namespacedKey].value !== envConfig.value) {
          throw this.createError(
            'ENV_VAR_CONFLICT',
            `Environment variable conflict for '${namespacedKey}': '${merged[namespacedKey].value}' vs '${envConfig.value}'`,
            { key: namespacedKey, values: [merged[namespacedKey].value, envConfig.value] }
          );
        }

        merged[namespacedKey] = envConfig;
      }
    }

    // Check environment variable limit
    if (Object.keys(merged).length > FUNCTIONS_LIMITS.MAX_ENVIRONMENT_VARIABLES) {
      throw this.createError(
        'ENV_VAR_LIMIT_EXCEEDED',
        `Merged configuration would create ${Object.keys(merged).length} environment variables, exceeding limit of ${FUNCTIONS_LIMITS.MAX_ENVIRONMENT_VARIABLES}`,
        { count: Object.keys(merged).length, limit: FUNCTIONS_LIMITS.MAX_ENVIRONMENT_VARIABLES }
      );
    }

    return merged;
  }

  /**
   * Namespace an environment variable key by component ID.
   *
   * @param key - Original environment variable key
   * @param componentId - Component identifier
   * @returns Namespaced key
   *
   * @example
   * namespaceEnvVar('COSMOS_ENDPOINT', 'UserApi') => 'USER_API_COSMOS_ENDPOINT'
   * namespaceEnvVar('LOG_LEVEL', 'shared') => 'LOG_LEVEL' (no namespace for shared)
   */
  private namespaceEnvVar(key: string, componentId: string): string {
    if (componentId === 'shared' || componentId === 'unknown') {
      return key;
    }

    // Convert componentId to UPPER_SNAKE_CASE prefix
    const prefix = componentId
      .replace(/([A-Z])/g, '_$1') // Insert underscore before capitals
      .toUpperCase()
      .replace(/^_/, ''); // Remove leading underscore

    return `${prefix}_${key}`;
  }

  /**
   * Select the highest SKU from a list of SKU names.
   *
   * @param skus - Array of SKU names
   * @returns Highest SKU name
   */
  private selectHighestSku(skus: string[]): string {
    const skuPriority: Record<string, number> = {
      'Y1': 1, // Consumption
      'EP1': 2, // Elastic Premium
      'EP2': 3,
      'EP3': 4,
      'P1V2': 5, // Premium V2
      'P2V2': 6,
      'P3V2': 7,
      'P1V3': 8, // Premium V3
      'P2V3': 9,
      'P3V3': 10,
    };

    return skus.reduce((highest, current) => {
      const currentPriority = skuPriority[current] ?? 0;
      const highestPriority = skuPriority[highest] ?? 0;
      return currentPriority > highestPriority ? current : highest;
    });
  }

  /**
   * Select the highest version from a list of version strings.
   *
   * @param versions - Array of version strings
   * @returns Highest version string
   */
  private selectHighestVersion(versions: string[]): string {
    return versions.sort((a, b) => {
      const aParts = a.split('.').map(Number);
      const bParts = b.split('.').map(Number);

      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aPart = aParts[i] ?? 0;
        const bPart = bParts[i] ?? 0;
        if (aPart !== bPart) {
          return bPart - aPart; // Descending order
        }
      }
      return 0;
    })[0];
  }

  /**
   * Provision a Function App.
   *
   * @param scope - The construct scope
   * @param id - Resource identifier
   * @param config - Merged Functions configuration
   * @param context - Provider context
   * @returns Created FunctionApp resource
   */
  protected provision(
    scope: Construct,
    id: string,
    config: FunctionsConfig,
    context: ProviderContext
  ): FunctionApp {
    // Convert namespaced environment variables back to simple Record
    const environment: Record<string, string> = {};
    if (config.environmentVariables) {
      for (const [key, envConfig] of Object.entries(config.environmentVariables)) {
        environment[key] = envConfig.value;
      }
    }

    const props: FunctionAppProps = {
      functionAppName: id,
      plan: config.plan,
      storageAccount: config.storageAccount,
      runtime: config.runtime as any,
      runtimeVersion: config.version,
      environment,
      tags: context.tags,
      location: config.location,
    };

    return new FunctionApp(scope, id, props);
  }

  /**
   * Validate Function App configuration.
   *
   * @param config - Configuration to validate
   * @returns Validation result
   */
  protected validate(config: FunctionsConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate runtime
    const validRuntimes: FunctionRuntime[] = ['node', 'python', 'dotnet', 'java', 'powershell'];
    if (!validRuntimes.includes(config.runtime)) {
      errors.push(`Invalid runtime '${config.runtime}'. Must be one of: ${validRuntimes.join(', ')}`);
    }

    // Validate version format
    if (config.version && !/^\d+(\.\d+)*$/.test(config.version)) {
      errors.push(`Invalid version format '${config.version}'. Expected format: X.Y.Z`);
    }

    // Validate environment variables count
    if (config.environmentVariables) {
      const envCount = Object.keys(config.environmentVariables).length;
      if (envCount > FUNCTIONS_LIMITS.MAX_ENVIRONMENT_VARIABLES) {
        errors.push(
          `Configuration specifies ${envCount} environment variables, exceeding limit of ${FUNCTIONS_LIMITS.MAX_ENVIRONMENT_VARIABLES}`
        );
      }
    }

    // Validate required dependencies
    if (!config.plan) {
      errors.push('Function App requires an App Service Plan reference');
    }

    if (!config.storageAccount) {
      errors.push('Function App requires a Storage Account reference');
    }

    // Warn about consumption plan with alwaysOn
    if (config.sku === 'Y1' && config.alwaysOn) {
      warnings.push('alwaysOn is not available on Consumption plan (Y1)');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Get the namespaced environment variable key for a component.
   * Helper method for components to construct their env var keys.
   *
   * @param componentId - Component identifier
   * @param key - Environment variable key
   * @returns Namespaced key
   */
  public getEnvironmentVariableKey(componentId: string, key: string): string {
    return this.namespaceEnvVar(key, componentId);
  }
}
