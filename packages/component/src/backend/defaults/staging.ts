/**
 * Staging Environment Defaults
 *
 * This file provides the default configuration for staging environments.
 * Staging defaults are optimized for:
 * - Production-like configuration (but scaled down)
 * - Lower scale (min 1 instance, max 10)
 * - Shorter retention (30 days vs 90 days)
 * - Single region (no multi-region)
 * - Lower throughput limits
 * - Cost optimization while maintaining prod similarity
 *
 * @module @atakora/component/backend/defaults
 */

import type { BackendDefaults } from './base';

/**
 * Get staging environment defaults.
 *
 * Staging defaults provide a production-like environment at lower scale
 * and cost. These defaults are designed for:
 * - Pre-production testing
 * - Integration testing
 * - QA validation
 * - Performance testing (at lower scale)
 *
 * Key characteristics:
 * - Autoscale Cosmos DB (lower throughput than prod)
 * - Premium Function App (scaled down)
 * - Network isolation (like prod)
 * - Full monitoring (shorter retention)
 * - Single region (no multi-region)
 * - Performance features disabled (unlike prod)
 *
 * @returns Staging backend defaults
 *
 * @example
 * ```typescript
 * import { getStagingDefaults } from '@atakora/component/backend/defaults';
 *
 * const defaults = getStagingDefaults();
 *
 * // Autoscale Cosmos DB (lower than prod)
 * defaults.storage.database.mode; // 'Autoscale'
 * defaults.storage.database.throughput?.max; // 10000 (vs 40000 in prod)
 *
 * // Premium Function App (scaled down)
 * defaults.compute.functionApp.plan; // 'Premium'
 * defaults.compute.functionApp.scaling.maxInstances; // 10 (vs 20 in prod)
 * ```
 */
export function getStagingDefaults(): BackendDefaults {
  return {
    // =========================================================================
    // Storage Configuration
    // =========================================================================
    storage: {
      // Storage Account: Zone redundant (like prod, but can be downgraded)
      account: {
        sku: 'Standard_ZRS', // Zone redundant within region
        tier: 'Hot', // Optimized for frequent access
        httpsOnly: true,
        minimumTlsVersion: '1.2',
        enableHierarchicalNamespace: false,
      },

      // Cosmos DB: Autoscale mode with lower throughput than production
      database: {
        mode: 'Autoscale', // Auto-scale between min/max
        consistency: 'Session', // Same as prod

        // Backups enabled but with shorter retention
        backup: {
          enabled: true,
          type: 'Periodic', // Periodic backups (Continuous is more expensive)
          retentionDays: 7, // Shorter retention than prod
          intervalMinutes: 240, // Backup every 4 hours
        },

        // Lower throughput than production
        throughput: {
          min: 1000, // Minimum 1K RU/s
          max: 10000, // Maximum 10K RU/s (vs 40K in prod)
        },

        // Single region only (no multi-region in staging)
        multiRegion: false,

        // No analytical store in staging
        analyticalStore: false,
      },
    },

    // =========================================================================
    // Compute Configuration
    // =========================================================================
    compute: {
      // Function App: Premium plan (like prod) but scaled down
      functionApp: {
        plan: 'Premium',
        sku: 'EP1', // Smallest Premium SKU (vs EP2 in prod)
        runtime: 'node',
        runtimeVersion: '20',

        // Reduced scaling compared to production
        scaling: {
          minInstances: 1, // Lower min than prod (2)
          maxInstances: 10, // Lower max than prod (20)
          alwaysOn: true, // Keep warm like prod
        },

        // Health check endpoint (like prod)
        healthCheck: '/api/health',
      },
    },

    // =========================================================================
    // Network Configuration
    // =========================================================================
    // Network isolation like production (for realistic testing)
    network: {
      // Virtual Network
      vnet: {
        enabled: true,
        addressSpace: '10.1.0.0/16', // Different from prod (10.0.0.0/16)
        subnets: [
          {
            name: 'functions',
            addressRange: '10.1.1.0/24',
            serviceEndpoints: ['Microsoft.Storage', 'Microsoft.AzureCosmosDB'],
          },
          {
            name: 'data',
            addressRange: '10.1.2.0/24',
            serviceEndpoints: ['Microsoft.Storage', 'Microsoft.AzureCosmosDB'],
          },
        ],
      },

      // WAF enabled in detection mode
      waf: {
        enabled: true,
        mode: 'Detection', // Detection only (vs Prevention in prod)
        ruleSet: 'OWASP',
        ruleSetVersion: '3.2',
      },

      // DDoS protection disabled (cost savings vs prod)
      ddos: {
        enabled: false, // Disabled in staging to save costs
      },
    },

    // =========================================================================
    // Monitoring Configuration
    // =========================================================================
    // Full monitoring like production but with shorter retention
    monitoring: {
      // Application Insights
      appInsights: {
        enabled: true,
        samplingPercentage: 100, // Full sampling like prod
        retentionDays: 30, // Shorter than prod (90 days)
        liveMetrics: true, // Enabled for debugging
        profiler: false, // Disabled to save costs
      },

      // Log Analytics
      logAnalytics: {
        enabled: true,
        retentionDays: 30, // Shorter than prod (90 days)
        sku: 'PerGB2018',
      },

      // Alerts enabled but with relaxed thresholds
      alerts: {
        responseTime: {
          warning: 1500, // More lenient than prod (1000ms)
          critical: 5000, // More lenient than prod (3000ms)
        },
        errorRate: {
          warning: 2, // More lenient than prod (1%)
          critical: 10, // More lenient than prod (5%)
        },
        availability: {
          warning: 99.5, // More lenient than prod (99.9%)
          critical: 99.0, // More lenient than prod (99.5%)
        },
      },
    },

    // =========================================================================
    // Performance Configuration
    // =========================================================================
    // Performance features disabled in staging (unlike prod)
    // This saves costs while still providing production-like infrastructure
    performance: undefined,
  };
}

/**
 * Check if the current environment is staging.
 *
 * @returns True if running in staging environment
 *
 * @example
 * ```typescript
 * import { isStaging } from '@atakora/component/backend/defaults';
 *
 * if (isStaging()) {
 *   console.log('Running in staging mode');
 * }
 * ```
 */
export function isStaging(): boolean {
  const env = process.env.NODE_ENV || process.env.ENVIRONMENT;
  return (
    env?.toLowerCase() === 'staging' ||
    env?.toLowerCase() === 'stage' ||
    env?.toLowerCase() === 'test'
  );
}

/**
 * Get staging defaults with custom overrides.
 *
 * This function allows you to customize specific aspects of the staging
 * defaults while keeping the rest intact.
 *
 * @param overrides - Partial configuration to override defaults
 * @returns Staging defaults with overrides applied
 *
 * @example
 * ```typescript
 * import { getStagingDefaultsWithOverrides } from '@atakora/component/backend/defaults';
 *
 * const customDefaults = getStagingDefaultsWithOverrides({
 *   compute: {
 *     functionApp: {
 *       scaling: {
 *         maxInstances: 20, // Increase max instances for load testing
 *       },
 *     },
 *   },
 * });
 * ```
 */
export function getStagingDefaultsWithOverrides(
  overrides: Partial<BackendDefaults>
): BackendDefaults {
  const defaults = getStagingDefaults();

  return {
    storage: {
      account: {
        ...defaults.storage.account,
        ...overrides.storage?.account,
      },
      database: {
        ...defaults.storage.database,
        ...overrides.storage?.database,
        backup: {
          ...defaults.storage.database.backup,
          ...overrides.storage?.database?.backup,
        },
        throughput: overrides.storage?.database?.throughput
          ? {
              ...defaults.storage.database.throughput,
              ...overrides.storage.database.throughput,
            }
          : defaults.storage.database.throughput,
      },
    },
    compute: {
      functionApp: {
        ...defaults.compute.functionApp,
        ...overrides.compute?.functionApp,
        scaling: {
          ...defaults.compute.functionApp.scaling,
          ...overrides.compute?.functionApp?.scaling,
        },
      },
    },
    network: overrides.network
      ? {
          vnet: {
            ...defaults.network?.vnet!,
            ...overrides.network?.vnet,
            subnets: overrides.network?.vnet?.subnets ?? defaults.network?.vnet.subnets,
          },
          waf: {
            ...defaults.network?.waf!,
            ...overrides.network?.waf,
          },
          ddos: {
            ...defaults.network?.ddos!,
            ...overrides.network?.ddos,
          },
        }
      : defaults.network,
    monitoring: overrides.monitoring
      ? {
          appInsights: {
            ...defaults.monitoring?.appInsights!,
            ...overrides.monitoring?.appInsights,
          },
          logAnalytics: overrides.monitoring?.logAnalytics
            ? {
                ...defaults.monitoring?.logAnalytics,
                ...overrides.monitoring?.logAnalytics,
              }
            : defaults.monitoring?.logAnalytics,
          alerts: overrides.monitoring?.alerts
            ? {
                responseTime: {
                  ...defaults.monitoring?.alerts?.responseTime,
                  ...overrides.monitoring?.alerts?.responseTime,
                },
                errorRate: {
                  ...defaults.monitoring?.alerts?.errorRate,
                  ...overrides.monitoring?.alerts?.errorRate,
                },
                availability: {
                  ...defaults.monitoring?.alerts?.availability,
                  ...overrides.monitoring?.alerts?.availability,
                },
              }
            : defaults.monitoring?.alerts,
        }
      : defaults.monitoring,
    performance: overrides.performance ?? defaults.performance,
  };
}
