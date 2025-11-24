/**
 * Environment Detection and Configuration
 *
 * This module provides environment detection logic and environment-specific
 * default configurations for the backend system.
 *
 * @module @atakora/component/backend/environment
 */

/**
 * Supported environment types
 */
export type Environment = 'development' | 'staging' | 'production';

/**
 * Environment detection options
 */
export interface EnvironmentOptions {
  /**
   * Explicit environment override
   * Takes precedence over environment variable detection
   */
  readonly environment?: Environment;

  /**
   * Custom environment variable name to check
   * Default: NODE_ENV or ENVIRONMENT
   */
  readonly envVarName?: string;
}

/**
 * Environment configuration defaults
 * These are the baseline configurations for each environment
 */
export interface EnvironmentDefaults {
  /**
   * Environment name
   */
  readonly environment: Environment;

  /**
   * Default Azure region
   */
  readonly defaultRegion: string;

  /**
   * Default resource SKUs and tiers
   */
  readonly defaults: {
    /**
     * Storage account SKU
     */
    readonly storageSku: 'Standard_LRS' | 'Standard_ZRS' | 'Standard_GRS';

    /**
     * Cosmos DB mode
     */
    readonly cosmosMode: 'Serverless' | 'Provisioned' | 'Autoscale';

    /**
     * Cosmos DB throughput (RU/s) - for provisioned/autoscale
     */
    readonly cosmosThroughput?: {
      readonly min: number;
      readonly max: number;
    };

    /**
     * Function App plan
     */
    readonly functionPlan: 'Consumption' | 'Premium' | 'Dedicated';

    /**
     * Function App SKU (for Premium/Dedicated)
     */
    readonly functionSku?: 'EP1' | 'EP2' | 'EP3' | 'S1' | 'P1v2';

    /**
     * Function App scaling
     */
    readonly functionScaling?: {
      readonly minInstances: number;
      readonly maxInstances: number;
    };
  };

  /**
   * Feature flags
   */
  readonly features: {
    /**
     * Enable monitoring (App Insights, Log Analytics)
     */
    readonly monitoring: boolean;

    /**
     * Enable network isolation (VNet, private endpoints)
     */
    readonly networking: boolean;

    /**
     * Enable performance features (CDN, cache, rate limiting)
     */
    readonly performance: boolean;

    /**
     * Enable multi-region deployment
     */
    readonly multiRegion: boolean;

    /**
     * Enable backups
     */
    readonly backups: boolean;
  };

  /**
   * Monitoring configuration
   */
  readonly monitoring?: {
    /**
     * Application Insights sampling percentage (0-100)
     */
    readonly samplingPercentage: number;

    /**
     * Log retention in days
     */
    readonly retentionDays: number;

    /**
     * Enable live metrics
     */
    readonly liveMetrics: boolean;

    /**
     * Enable profiler
     */
    readonly profiler: boolean;
  };

  /**
   * Network configuration
   */
  readonly networking?: {
    /**
     * Network mode
     */
    readonly mode: 'public' | 'isolated' | 'hybrid';

    /**
     * Enable private endpoints
     */
    readonly privateEndpoints: boolean;

    /**
     * Enable WAF
     */
    readonly waf: boolean;

    /**
     * Enable DDoS protection
     */
    readonly ddos: boolean;
  };

  /**
   * Performance configuration
   */
  readonly performance?: {
    /**
     * Enable CDN
     */
    readonly cdn: boolean;

    /**
     * Enable Redis cache
     */
    readonly cache: boolean;

    /**
     * Enable rate limiting
     */
    readonly rateLimit: boolean;
  };
}

/**
 * Detect the current environment from environment variables or explicit override.
 *
 * Detection logic:
 * 1. If explicit environment provided in options, use it
 * 2. Check Azure App Service environment variables (WEBSITE_* variables)
 * 3. Check custom environment variable if specified
 * 4. Check NODE_ENV environment variable
 * 5. Check ENVIRONMENT environment variable
 * 6. Check CI/CD environment variables (CI, GITHUB_ACTIONS, etc.)
 * 7. Default to 'development'
 *
 * Mapping rules:
 * - 'production', 'prod' → 'production'
 * - 'staging', 'stage', 'test' → 'staging'
 * - Everything else → 'development'
 *
 * @param options - Environment detection options
 * @returns Detected environment
 *
 * @example
 * ```typescript
 * // Auto-detect from environment variables
 * const env = detectEnvironment();
 *
 * // Explicit override
 * const env = detectEnvironment({ environment: 'production' });
 *
 * // Custom environment variable
 * const env = detectEnvironment({ envVarName: 'APP_ENV' });
 * ```
 */
export function detectEnvironment(options: EnvironmentOptions = {}): Environment {
  // 1. Explicit override takes precedence
  if (options.environment) {
    return options.environment;
  }

  // 2. Check Azure App Service specific variables
  const azureEnv = detectAzureEnvironment();
  if (azureEnv) {
    return azureEnv;
  }

  // 3. Check environment variables
  const envVarName = options.envVarName || 'NODE_ENV';
  const envValue = process.env[envVarName] || process.env.ENVIRONMENT || '';

  // 4. If still empty, check CI/CD environment
  if (!envValue) {
    const ciEnv = detectCIEnvironment();
    if (ciEnv) {
      return ciEnv;
    }
  }

  // 5. Map environment variable value to Environment type
  return mapEnvironmentValue(envValue);
}

/**
 * Detect environment from Azure App Service variables.
 * Azure App Service sets specific WEBSITE_* environment variables.
 *
 * @returns Detected environment or undefined
 * @internal
 */
function detectAzureEnvironment(): Environment | undefined {
  // Check if running in Azure App Service
  if (!process.env.WEBSITE_SITE_NAME) {
    return undefined;
  }

  // Check WEBSITE_SLOT_NAME for deployment slot
  const slotName = process.env.WEBSITE_SLOT_NAME?.toLowerCase();

  if (slotName === 'production' || !slotName) {
    // Production slot or no slot specified
    return 'production';
  }

  if (slotName === 'staging' || slotName === 'stage') {
    return 'staging';
  }

  // Any other slot (e.g., 'dev', 'test') defaults to staging
  return 'staging';
}

/**
 * Detect environment from CI/CD variables.
 * Various CI/CD platforms set specific environment variables.
 *
 * @returns Detected environment or undefined
 * @internal
 */
function detectCIEnvironment(): Environment | undefined {
  // GitHub Actions
  if (process.env.GITHUB_ACTIONS === 'true') {
    const ref = process.env.GITHUB_REF?.toLowerCase();
    if (ref === 'refs/heads/main' || ref === 'refs/heads/master') {
      return 'production';
    }
    if (ref?.includes('staging') || ref?.includes('stage')) {
      return 'staging';
    }
    // Pull requests and other branches default to development
    return 'development';
  }

  // Azure DevOps
  if (process.env.TF_BUILD === 'True' || process.env.AZURE_PIPELINES === 'true') {
    const buildSourceBranch = process.env.BUILD_SOURCEBRANCH?.toLowerCase();
    if (buildSourceBranch === 'refs/heads/main' || buildSourceBranch === 'refs/heads/master') {
      return 'production';
    }
    if (buildSourceBranch?.includes('staging') || buildSourceBranch?.includes('stage')) {
      return 'staging';
    }
    return 'development';
  }

  // GitLab CI
  if (process.env.GITLAB_CI === 'true') {
    const ciCommitRef = process.env.CI_COMMIT_REF_NAME?.toLowerCase();
    if (ciCommitRef === 'main' || ciCommitRef === 'master' || ciCommitRef === 'production') {
      return 'production';
    }
    if (ciCommitRef?.includes('staging') || ciCommitRef?.includes('stage')) {
      return 'staging';
    }
    return 'development';
  }

  // Jenkins
  if (process.env.JENKINS_HOME) {
    const branchName =
      process.env.BRANCH_NAME?.toLowerCase() || process.env.GIT_BRANCH?.toLowerCase();
    if (branchName === 'main' || branchName === 'master' || branchName === 'production') {
      return 'production';
    }
    if (branchName?.includes('staging') || branchName?.includes('stage')) {
      return 'staging';
    }
    return 'development';
  }

  // Generic CI environment
  if (process.env.CI === 'true') {
    // Default to development for generic CI
    return 'development';
  }

  return undefined;
}

/**
 * Map environment variable value to Environment type.
 * Handles various common environment names and aliases.
 *
 * @param value - Environment variable value
 * @returns Mapped environment
 * @internal
 */
function mapEnvironmentValue(value: string): Environment {
  const normalized = value.toLowerCase().trim();

  switch (normalized) {
    case 'production':
    case 'prod':
      return 'production';

    case 'staging':
    case 'stage':
    case 'test':
      return 'staging';

    case 'development':
    case 'dev':
    case 'local':
    default:
      return 'development';
  }
}

/**
 * Get environment-specific default configuration.
 *
 * This function returns the baseline configuration for each environment:
 * - Development: Cost-optimized, serverless, minimal features
 * - Staging: Production-like but scaled down
 * - Production: High availability, performance, full features
 *
 * @param env - Environment type
 * @returns Environment defaults
 *
 * @example
 * ```typescript
 * const env = detectEnvironment();
 * const defaults = getEnvironmentDefaults(env);
 *
 * console.log(defaults.defaults.cosmosMode); // 'Serverless' for dev
 * console.log(defaults.features.monitoring); // false for dev, true for prod
 * ```
 */
export function getEnvironmentDefaults(env: Environment): EnvironmentDefaults {
  switch (env) {
    case 'development':
      return getDevelopmentDefaults();

    case 'staging':
      return getStagingDefaults();

    case 'production':
      return getProductionDefaults();
  }
}

/**
 * Development environment defaults.
 *
 * Optimized for:
 * - Low cost (serverless/consumption tiers)
 * - Fast iteration (minimal monitoring)
 * - Single region
 * - No redundancy or backups
 *
 * @returns Development defaults
 */
function getDevelopmentDefaults(): EnvironmentDefaults {
  return {
    environment: 'development',
    defaultRegion: 'eastus',

    defaults: {
      storageSku: 'Standard_LRS', // Single region, locally redundant
      cosmosMode: 'Serverless', // Pay per request
      functionPlan: 'Consumption', // Serverless
    },

    features: {
      monitoring: false, // Minimal monitoring in dev
      networking: false, // No network isolation
      performance: false, // No performance features
      multiRegion: false, // Single region
      backups: false, // No backups in dev
    },

    // Minimal monitoring if enabled
    monitoring: {
      samplingPercentage: 10, // Sample 10% of telemetry
      retentionDays: 7, // Keep logs for 7 days
      liveMetrics: false,
      profiler: false,
    },
  };
}

/**
 * Staging environment defaults.
 *
 * Optimized for:
 * - Production-like configuration
 * - Lower scale and cost
 * - Single region
 * - Shorter retention periods
 *
 * @returns Staging defaults
 */
function getStagingDefaults(): EnvironmentDefaults {
  return {
    environment: 'staging',
    defaultRegion: 'eastus',

    defaults: {
      storageSku: 'Standard_ZRS', // Zone redundant
      cosmosMode: 'Autoscale', // Auto-scale for variable load
      cosmosThroughput: {
        min: 1000, // 1K RU/s minimum
        max: 10000, // 10K RU/s maximum
      },
      functionPlan: 'Premium',
      functionSku: 'EP1', // Entry premium
      functionScaling: {
        minInstances: 1,
        maxInstances: 10,
      },
    },

    features: {
      monitoring: true, // Full monitoring
      networking: true, // Network isolation
      performance: false, // No performance features
      multiRegion: false, // Single region
      backups: true, // Enable backups
    },

    monitoring: {
      samplingPercentage: 100, // Full telemetry
      retentionDays: 30, // 30 days retention
      liveMetrics: true,
      profiler: false,
    },

    networking: {
      mode: 'isolated',
      privateEndpoints: true,
      waf: false, // No WAF in staging
      ddos: false, // No DDoS in staging
    },
  };
}

/**
 * Production environment defaults.
 *
 * Optimized for:
 * - High availability
 * - Performance
 * - Security
 * - Compliance
 * - Multi-region capability
 *
 * @returns Production defaults
 */
function getProductionDefaults(): EnvironmentDefaults {
  return {
    environment: 'production',
    defaultRegion: 'eastus',

    defaults: {
      storageSku: 'Standard_ZRS', // Zone redundant
      cosmosMode: 'Autoscale', // Auto-scale for variable load
      cosmosThroughput: {
        min: 4000, // 4K RU/s minimum
        max: 40000, // 40K RU/s maximum
      },
      functionPlan: 'Premium',
      functionSku: 'EP2', // Mid-tier premium
      functionScaling: {
        minInstances: 2, // Always 2+ instances for HA
        maxInstances: 20,
      },
    },

    features: {
      monitoring: true, // Full monitoring
      networking: true, // Network isolation
      performance: true, // Performance features
      multiRegion: true, // Multi-region capable
      backups: true, // Enable backups
    },

    monitoring: {
      samplingPercentage: 100, // Full telemetry
      retentionDays: 90, // 90 days retention
      liveMetrics: true,
      profiler: true,
    },

    networking: {
      mode: 'isolated',
      privateEndpoints: true,
      waf: true, // Enable WAF
      ddos: true, // Enable DDoS protection
    },

    performance: {
      cdn: true, // Enable CDN
      cache: true, // Enable Redis cache
      rateLimit: true, // Enable rate limiting
    },
  };
}

/**
 * Check if a feature is enabled for the current environment.
 *
 * @param env - Environment type
 * @param feature - Feature name
 * @returns True if feature is enabled
 *
 * @example
 * ```typescript
 * const env = detectEnvironment();
 * if (isFeatureEnabled(env, 'monitoring')) {
 *   // Set up monitoring
 * }
 * ```
 */
export function isFeatureEnabled(
  env: Environment,
  feature: keyof EnvironmentDefaults['features']
): boolean {
  const defaults = getEnvironmentDefaults(env);
  return defaults.features[feature];
}

/**
 * Get default region for environment.
 *
 * @param env - Environment type
 * @returns Default Azure region
 */
export function getDefaultRegion(env: Environment): string {
  const defaults = getEnvironmentDefaults(env);
  return defaults.defaultRegion;
}
