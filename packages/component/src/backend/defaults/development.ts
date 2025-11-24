/**
 * Development Environment Defaults
 *
 * This file provides the default configuration for development environments.
 * Development defaults are optimized for:
 * - Cost minimization (serverless/consumption tiers)
 * - Fast iteration (minimal resources)
 * - Local-first development
 * - No network isolation
 * - Minimal monitoring (10% sampling)
 *
 * @module @atakora/component/backend/defaults
 */

import type { BackendDefaults } from './base';

/**
 * Get development environment defaults.
 *
 * Development defaults prioritize cost savings and simplicity over
 * high availability and performance. These defaults are designed for:
 * - Local development
 * - Testing
 * - Prototyping
 * - CI/CD pipelines
 *
 * Key characteristics:
 * - Serverless Cosmos DB (pay per request)
 * - Consumption Function App (pay per execution)
 * - No network isolation
 * - Minimal monitoring (10% sampling)
 * - No backups
 * - No multi-region replication
 * - No performance features (CDN, cache, rate limiting)
 *
 * @returns Development backend defaults
 *
 * @example
 * ```typescript
 * import { getDevelopmentDefaults } from '@atakora/component/backend/defaults';
 *
 * const defaults = getDevelopmentDefaults();
 *
 * // Serverless Cosmos DB
 * defaults.storage.database.mode; // 'Serverless'
 *
 * // Consumption Function App
 * defaults.compute.functionApp.plan; // 'Consumption'
 *
 * // No network isolation
 * defaults.network; // undefined
 * ```
 */
export function getDevelopmentDefaults(): BackendDefaults {
  return {
    // =========================================================================
    // Storage Configuration
    // =========================================================================
    storage: {
      // Storage Account: Locally redundant, hot tier
      account: {
        sku: 'Standard_LRS', // Single datacenter replication (lowest cost)
        tier: 'Hot', // Optimized for frequent access
        httpsOnly: true, // Always enforce HTTPS
        minimumTlsVersion: '1.2', // Security best practice
      },

      // Cosmos DB: Serverless mode for pay-per-request pricing
      database: {
        mode: 'Serverless', // No provisioned throughput - pay per request
        consistency: 'Session', // Balance between consistency and performance

        // No backups in development to save costs
        backup: {
          enabled: false,
        },

        // Single region only
        multiRegion: false,

        // No analytical store in dev
        analyticalStore: false,
      },
    },

    // =========================================================================
    // Compute Configuration
    // =========================================================================
    compute: {
      // Function App: Consumption plan for serverless execution
      functionApp: {
        plan: 'Consumption', // Serverless - pay per execution
        runtime: 'node', // Default to Node.js
        runtimeVersion: '20', // Node.js 20 LTS

        // No scaling configuration needed for Consumption plan
        scaling: {
          alwaysOn: false, // Not available in Consumption plan
        },

        // No health check in dev
        healthCheck: undefined,
      },
    },

    // =========================================================================
    // Network Configuration
    // =========================================================================
    // No network isolation in development
    network: undefined,

    // =========================================================================
    // Monitoring Configuration
    // =========================================================================
    // Minimal monitoring to reduce noise and costs
    monitoring: {
      // Application Insights with reduced sampling
      appInsights: {
        enabled: true, // Keep basic telemetry
        samplingPercentage: 10, // Sample only 10% of requests
        retentionDays: 30, // Short retention period
        liveMetrics: false, // Disable live metrics in dev
        profiler: false, // Disable profiler in dev
      },

      // No Log Analytics in development
      logAnalytics: undefined,

      // No alerts in development
      alerts: undefined,
    },

    // =========================================================================
    // Performance Configuration
    // =========================================================================
    // No performance features in development
    performance: undefined,
  };
}

/**
 * Check if the current environment is development.
 *
 * @returns True if running in development environment
 *
 * @example
 * ```typescript
 * import { isDevelopment } from '@atakora/component/backend/defaults';
 *
 * if (isDevelopment()) {
 *   console.log('Running in development mode');
 * }
 * ```
 */
export function isDevelopment(): boolean {
  const env = process.env.NODE_ENV || process.env.ENVIRONMENT || 'development';
  return (
    env.toLowerCase() === 'development' ||
    env.toLowerCase() === 'dev' ||
    env.toLowerCase() === 'local'
  );
}

/**
 * Get development defaults with custom overrides.
 *
 * This function allows you to customize specific aspects of the development
 * defaults while keeping the rest intact.
 *
 * @param overrides - Partial configuration to override defaults
 * @returns Development defaults with overrides applied
 *
 * @example
 * ```typescript
 * import { getDevelopmentDefaultsWithOverrides } from '@atakora/component/backend/defaults';
 *
 * const customDefaults = getDevelopmentDefaultsWithOverrides({
 *   storage: {
 *     database: {
 *       consistency: 'Strong', // Override consistency level
 *     },
 *   },
 * });
 * ```
 */
export function getDevelopmentDefaultsWithOverrides(
  overrides: Partial<BackendDefaults>
): BackendDefaults {
  const defaults = getDevelopmentDefaults();

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
    network: overrides.network ?? defaults.network,
    monitoring: overrides.monitoring
      ? {
          appInsights: {
            ...defaults.monitoring?.appInsights!,
            ...overrides.monitoring?.appInsights,
          },
          logAnalytics: overrides.monitoring?.logAnalytics,
          alerts: overrides.monitoring?.alerts,
        }
      : defaults.monitoring,
    performance: overrides.performance ?? defaults.performance,
  };
}
