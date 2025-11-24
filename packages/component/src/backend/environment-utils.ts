/**
 * Environment Utilities
 *
 * Helper functions for working with environment configuration and detection.
 *
 * @module @atakora/component/backend/environment-utils
 */

import type { Environment, EnvironmentDefaults } from './environment';
import { detectEnvironment, getEnvironmentDefaults } from './environment';

/**
 * Environment configuration override options.
 * Allows partial override of environment defaults.
 */
export interface EnvironmentOverrides {
  /**
   * Override default region
   */
  readonly region?: string;

  /**
   * Override storage SKU
   */
  readonly storageSku?: 'Standard_LRS' | 'Standard_ZRS' | 'Standard_GRS';

  /**
   * Override Cosmos DB mode
   */
  readonly cosmosMode?: 'Serverless' | 'Provisioned' | 'Autoscale';

  /**
   * Override Cosmos DB throughput
   */
  readonly cosmosThroughput?: {
    readonly min: number;
    readonly max: number;
  };

  /**
   * Override Function App plan
   */
  readonly functionPlan?: 'Consumption' | 'Premium' | 'Dedicated';

  /**
   * Override Function App SKU
   */
  readonly functionSku?: 'EP1' | 'EP2' | 'EP3' | 'S1' | 'P1v2';

  /**
   * Override feature flags
   */
  readonly features?: Partial<EnvironmentDefaults['features']>;

  /**
   * Override monitoring configuration
   */
  readonly monitoring?: Partial<EnvironmentDefaults['monitoring']>;

  /**
   * Override networking configuration
   */
  readonly networking?: Partial<EnvironmentDefaults['networking']>;

  /**
   * Override performance configuration
   */
  readonly performance?: Partial<EnvironmentDefaults['performance']>;
}

/**
 * Merge environment defaults with user-provided overrides.
 *
 * This function applies user overrides on top of environment defaults,
 * allowing selective customization while maintaining sensible defaults.
 *
 * @param env - Environment type
 * @param overrides - User-provided overrides
 * @returns Merged environment configuration
 *
 * @example
 * ```typescript
 * const config = mergeEnvironmentConfig('production', {
 *   region: 'westus2',
 *   cosmosThroughput: { min: 10000, max: 50000 }
 * });
 * ```
 */
export function mergeEnvironmentConfig(
  env: Environment,
  overrides: EnvironmentOverrides = {}
): EnvironmentDefaults {
  const defaults = getEnvironmentDefaults(env);

  return {
    ...defaults,
    defaultRegion: overrides.region ?? defaults.defaultRegion,
    defaults: {
      ...defaults.defaults,
      ...(overrides.storageSku && { storageSku: overrides.storageSku }),
      ...(overrides.cosmosMode && { cosmosMode: overrides.cosmosMode }),
      ...(overrides.cosmosThroughput && { cosmosThroughput: overrides.cosmosThroughput }),
      ...(overrides.functionPlan && { functionPlan: overrides.functionPlan }),
      ...(overrides.functionSku && { functionSku: overrides.functionSku }),
    },
    features: {
      ...defaults.features,
      ...overrides.features,
    },
    ...(defaults.monitoring && {
      monitoring: {
        ...defaults.monitoring,
        ...overrides.monitoring,
      },
    }),
    ...(defaults.networking && {
      networking: {
        ...defaults.networking,
        ...overrides.networking,
      },
    }),
    ...(defaults.performance && {
      performance: {
        ...defaults.performance,
        ...overrides.performance,
      },
    }),
  };
}

/**
 * Environment comparison result
 */
export interface EnvironmentComparison {
  /**
   * Is production environment
   */
  readonly isProduction: boolean;

  /**
   * Is staging environment
   */
  readonly isStaging: boolean;

  /**
   * Is development environment
   */
  readonly isDevelopment: boolean;

  /**
   * Is production-like (staging or production)
   */
  readonly isProductionLike: boolean;

  /**
   * Requires high availability
   */
  readonly requiresHighAvailability: boolean;

  /**
   * Requires security features
   */
  readonly requiresSecurity: boolean;
}

/**
 * Get environment comparison flags.
 *
 * Provides convenient boolean flags for environment-specific logic.
 *
 * @param env - Environment type
 * @returns Environment comparison flags
 *
 * @example
 * ```typescript
 * const env = detectEnvironment();
 * const flags = getEnvironmentFlags(env);
 *
 * if (flags.requiresHighAvailability) {
 *   // Configure for HA
 * }
 * ```
 */
export function getEnvironmentFlags(env: Environment): EnvironmentComparison {
  return {
    isProduction: env === 'production',
    isStaging: env === 'staging',
    isDevelopment: env === 'development',
    isProductionLike: env === 'production' || env === 'staging',
    requiresHighAvailability: env === 'production' || env === 'staging',
    requiresSecurity: env === 'production' || env === 'staging',
  };
}

/**
 * Validate environment-specific configuration.
 *
 * Ensures that configuration meets minimum requirements for the environment.
 *
 * @param env - Environment type
 * @param config - Configuration to validate
 * @returns Validation errors (empty if valid)
 *
 * @example
 * ```typescript
 * const errors = validateEnvironmentConfig('production', {
 *   features: { backups: false } // Invalid for production
 * });
 * ```
 */
export function validateEnvironmentConfig(
  env: Environment,
  config: Partial<EnvironmentDefaults>
): string[] {
  const errors: string[] = [];
  const flags = getEnvironmentFlags(env);

  // Production validation
  if (flags.isProduction) {
    if (config.features?.backups === false) {
      errors.push('Backups must be enabled in production');
    }

    if (config.features?.monitoring === false) {
      errors.push('Monitoring must be enabled in production');
    }

    if (config.defaults?.cosmosMode === 'Serverless') {
      errors.push(
        'Serverless Cosmos DB not recommended for production (use Provisioned or Autoscale)'
      );
    }

    if (config.defaults?.functionPlan === 'Consumption') {
      errors.push('Consumption plan not recommended for production (use Premium or Dedicated)');
    }

    if (config.defaults?.functionScaling) {
      const scaling = config.defaults.functionScaling;
      if (scaling.minInstances < 2) {
        errors.push('Production requires minimum 2 instances for high availability');
      }
    }
  }

  // Staging validation
  if (flags.isStaging) {
    if (config.features?.monitoring === false) {
      errors.push('Monitoring should be enabled in staging for production parity');
    }
  }

  return errors;
}

/**
 * Get environment display name.
 *
 * @param env - Environment type
 * @returns Human-readable environment name
 */
export function getEnvironmentDisplayName(env: Environment): string {
  switch (env) {
    case 'production':
      return 'Production';
    case 'staging':
      return 'Staging';
    case 'development':
      return 'Development';
  }
}

/**
 * Get environment color (for UI/logging).
 *
 * @param env - Environment type
 * @returns Color name
 */
export function getEnvironmentColor(env: Environment): string {
  switch (env) {
    case 'production':
      return 'red';
    case 'staging':
      return 'yellow';
    case 'development':
      return 'green';
  }
}

/**
 * Detect and get environment configuration in one call.
 *
 * Convenience function that combines detection and configuration retrieval.
 *
 * @param options - Environment detection options and overrides
 * @returns Detected environment and its configuration
 *
 * @example
 * ```typescript
 * const { environment, config } = detectAndConfigure({
 *   region: 'westus2'
 * });
 * ```
 */
export function detectAndConfigure(
  options: {
    readonly environment?: Environment;
    readonly envVarName?: string;
  } & EnvironmentOverrides = {}
): {
  readonly environment: Environment;
  readonly config: EnvironmentDefaults;
} {
  const environment = detectEnvironment({
    environment: options.environment,
    envVarName: options.envVarName,
  });

  const config = mergeEnvironmentConfig(environment, options);

  return {
    environment,
    config,
  };
}

/**
 * Check if current environment allows a specific operation.
 *
 * Some operations should only be allowed in certain environments.
 *
 * @param env - Environment type
 * @param operation - Operation to check
 * @returns True if operation is allowed
 *
 * @example
 * ```typescript
 * if (isOperationAllowed(env, 'destructive')) {
 *   // Only allowed in dev
 *   await dropDatabase();
 * }
 * ```
 */
export function isOperationAllowed(
  env: Environment,
  operation: 'destructive' | 'experimental' | 'debug'
): boolean {
  const flags = getEnvironmentFlags(env);

  switch (operation) {
    case 'destructive':
      // Only allow destructive operations in development
      return flags.isDevelopment;

    case 'experimental':
      // Allow experimental features in dev and staging
      return !flags.isProduction;

    case 'debug':
      // Allow debug features in all environments
      return true;
  }
}

/**
 * Get recommended resource tags for environment.
 *
 * @param env - Environment type
 * @param additionalTags - Additional tags to include
 * @returns Recommended tags
 *
 * @example
 * ```typescript
 * const tags = getEnvironmentTags('production', {
 *   project: 'my-app',
 *   team: 'platform'
 * });
 * ```
 */
export function getEnvironmentTags(
  env: Environment,
  additionalTags: Record<string, string> = {}
): Record<string, string> {
  return {
    environment: env,
    managed_by: 'atakora',
    ...additionalTags,
  };
}

/**
 * Runtime environment information
 */
export interface RuntimeEnvironment {
  /**
   * Detected environment type
   */
  readonly environment: Environment;

  /**
   * Is running in Azure App Service
   */
  readonly isAzureAppService: boolean;

  /**
   * Is running in CI/CD pipeline
   */
  readonly isCI: boolean;

  /**
   * CI/CD platform name if detected
   */
  readonly ciPlatform?: 'github' | 'azure-devops' | 'gitlab' | 'jenkins' | 'other';

  /**
   * Azure deployment slot name (if applicable)
   */
  readonly azureSlot?: string;

  /**
   * Git branch name (if available)
   */
  readonly gitBranch?: string;
}

/**
 * Get comprehensive runtime environment information.
 *
 * Provides detailed information about the runtime environment including
 * platform detection, CI/CD context, and Azure-specific details.
 *
 * @returns Runtime environment information
 *
 * @example
 * ```typescript
 * const runtime = getRuntimeEnvironment();
 *
 * if (runtime.isAzureAppService) {
 *   console.log(`Running in Azure slot: ${runtime.azureSlot}`);
 * }
 *
 * if (runtime.isCI) {
 *   console.log(`Running in ${runtime.ciPlatform} CI`);
 * }
 * ```
 */
export function getRuntimeEnvironment(): RuntimeEnvironment {
  const environment = detectEnvironment();

  // Azure App Service detection
  const isAzureAppService = !!process.env.WEBSITE_SITE_NAME;
  const azureSlot = process.env.WEBSITE_SLOT_NAME;

  // CI/CD detection
  let isCI = false;
  let ciPlatform: RuntimeEnvironment['ciPlatform'];
  let gitBranch: string | undefined;

  if (process.env.GITHUB_ACTIONS === 'true') {
    isCI = true;
    ciPlatform = 'github';
    gitBranch = process.env.GITHUB_REF?.replace('refs/heads/', '');
  } else if (process.env.TF_BUILD === 'True' || process.env.AZURE_PIPELINES === 'true') {
    isCI = true;
    ciPlatform = 'azure-devops';
    gitBranch = process.env.BUILD_SOURCEBRANCH?.replace('refs/heads/', '');
  } else if (process.env.GITLAB_CI === 'true') {
    isCI = true;
    ciPlatform = 'gitlab';
    gitBranch = process.env.CI_COMMIT_REF_NAME;
  } else if (process.env.JENKINS_HOME) {
    isCI = true;
    ciPlatform = 'jenkins';
    gitBranch = process.env.BRANCH_NAME || process.env.GIT_BRANCH?.replace('origin/', '');
  } else if (process.env.CI === 'true') {
    isCI = true;
    ciPlatform = 'other';
  }

  return {
    environment,
    isAzureAppService,
    isCI,
    ciPlatform,
    azureSlot,
    gitBranch,
  };
}

/**
 * Check if running in a specific runtime context.
 *
 * @param context - Runtime context to check
 * @returns True if running in specified context
 *
 * @example
 * ```typescript
 * if (isRunningIn('azure')) {
 *   // Azure-specific logic
 * }
 *
 * if (isRunningIn('ci')) {
 *   // CI-specific logic
 * }
 * ```
 */
export function isRunningIn(context: 'azure' | 'ci' | 'local'): boolean {
  const runtime = getRuntimeEnvironment();

  switch (context) {
    case 'azure':
      return runtime.isAzureAppService;
    case 'ci':
      return runtime.isCI;
    case 'local':
      return !runtime.isAzureAppService && !runtime.isCI;
  }
}

/**
 * Environment configuration summary for logging/debugging
 */
export interface EnvironmentSummary {
  /**
   * Environment name
   */
  readonly environment: Environment;

  /**
   * Display name
   */
  readonly displayName: string;

  /**
   * Runtime context
   */
  readonly runtime: RuntimeEnvironment;

  /**
   * Configuration summary
   */
  readonly config: {
    readonly region: string;
    readonly storageSku: string;
    readonly cosmosMode: string;
    readonly functionPlan: string;
    readonly featuresEnabled: string[];
  };
}

/**
 * Get comprehensive environment summary for logging/debugging.
 *
 * @param overrides - Optional configuration overrides
 * @returns Environment summary
 *
 * @example
 * ```typescript
 * const summary = getEnvironmentSummary();
 * console.log('Environment:', summary.displayName);
 * console.log('Config:', summary.config);
 * ```
 */
export function getEnvironmentSummary(overrides?: EnvironmentOverrides): EnvironmentSummary {
  const runtime = getRuntimeEnvironment();
  const config = mergeEnvironmentConfig(runtime.environment, overrides);

  const featuresEnabled = Object.entries(config.features)
    .filter(([_, enabled]) => enabled)
    .map(([feature]) => feature);

  return {
    environment: config.environment,
    displayName: getEnvironmentDisplayName(config.environment),
    runtime,
    config: {
      region: config.defaultRegion,
      storageSku: config.defaults.storageSku,
      cosmosMode: config.defaults.cosmosMode,
      functionPlan: config.defaults.functionPlan,
      featuresEnabled,
    },
  };
}
