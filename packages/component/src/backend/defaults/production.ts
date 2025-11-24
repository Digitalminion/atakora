/**
 * Production Environment Defaults
 *
 * Provides high-availability, multi-region configurations optimized for
 * production workloads with full monitoring, security, and performance features.
 *
 * Key characteristics:
 * - High availability (zone redundancy, multi-region)
 * - Enhanced security (network rules, encryption)
 * - Full monitoring and observability
 * - Performance optimizations (CDN, caching, rate limiting)
 * - Autoscaling with appropriate limits
 * - Backup and disaster recovery
 *
 * @module @atakora/component/backend/defaults
 */

import type { BackendDefaults } from './types';

/**
 * Get production environment default configurations.
 *
 * Production defaults are optimized for:
 * - 99.9%+ availability
 * - Multi-region resilience
 * - Enterprise-grade security
 * - Comprehensive monitoring
 * - Optimal performance
 *
 * @returns Complete production backend defaults
 *
 * @example
 * ```typescript
 * import { getProductionDefaults } from '@atakora/component/backend/defaults';
 *
 * const defaults = getProductionDefaults();
 *
 * // Use in backend configuration
 * const backend = defineBackend({
 *   schema,
 *   authentication,
 *   settings: { name: 'my-app' },
 *   defaults: defaults
 * });
 * ```
 */
export function getProductionDefaults(): BackendDefaults {
  return {
    // ========================================================================
    // Storage Configuration
    // ========================================================================
    storage: {
      /**
       * Production Storage Account
       *
       * Configuration:
       * - Zone-redundant storage (ZRS) for high availability
       * - Hot tier for optimal performance
       * - Microsoft-managed encryption
       * - Network rules to deny public access by default
       * - HTTPS only with TLS 1.2 minimum
       */
      account: {
        sku: 'Standard_ZRS',
        tier: 'Hot',
        encryption: 'Microsoft.Storage',
        networkRules: {
          defaultAction: 'Deny',
          allowAzureServices: true,
        },
        enableHttpsOnly: true,
        minimumTlsVersion: '1.2',
      },

      /**
       * Production Cosmos DB
       *
       * Configuration:
       * - Autoscale mode (4K-40K RU/s)
       * - Session consistency (balance between performance and consistency)
       * - Continuous backup with 30-day retention
       * - Multi-region deployment (East US, West US)
       * - Analytical store enabled for reporting
       * - Public network access disabled for security
       */
      database: {
        mode: 'Autoscale',
        throughput: {
          min: 4000,
          max: 40000,
        },
        consistency: 'Session',
        backup: {
          enabled: true,
          type: 'Continuous',
          retention: 30,
        },
        multiRegion: ['eastus', 'westus'],
        enableAnalyticalStore: true,
        publicNetworkAccess: 'Disabled',
      },
    },

    // ========================================================================
    // Compute Configuration
    // ========================================================================
    compute: {
      /**
       * Production Function App
       *
       * Configuration:
       * - Premium EP2 plan for better performance and features
       * - Node.js 18 runtime (LTS)
       * - Always on for zero cold starts
       * - Min 2 instances for high availability
       * - Max 20 instances for scalability
       * - Health check endpoint enabled
       * - CORS configured for common scenarios
       */
      functionApp: {
        plan: {
          type: 'Premium',
          sku: 'EP2',
        },
        runtime: {
          runtime: 'node',
          version: '18',
        },
        alwaysOn: true,
        minInstances: 2,
        maxInstances: 20,
        healthCheck: '/api/health',
        cors: {
          allowedOrigins: ['https://*.azurewebsites.net'],
          supportCredentials: true,
        },
      },
    },

    // ========================================================================
    // Network Configuration
    // ========================================================================
    network: {
      /**
       * Production Virtual Network
       *
       * Configuration:
       * - /16 address space for large deployments
       * - Separate subnets for compute and data layers
       * - DDoS protection enabled
       * - Service endpoints for secure access
       */
      vnet: {
        addressSpace: '10.0.0.0/16',
        subnets: [
          {
            name: 'functions',
            range: '10.0.1.0/24',
            serviceEndpoints: ['Microsoft.Storage', 'Microsoft.AzureCosmosDB'],
          },
          {
            name: 'data',
            range: '10.0.2.0/24',
            serviceEndpoints: ['Microsoft.Storage', 'Microsoft.AzureCosmosDB'],
          },
          {
            name: 'gateway',
            range: '10.0.3.0/24',
          },
        ],
        enableDdosProtection: true,
      },

      /**
       * Production Web Application Firewall
       *
       * Configuration:
       * - Prevention mode (blocks threats)
       * - OWASP 3.2 rule set
       */
      waf: {
        enabled: true,
        mode: 'Prevention',
        ruleSet: {
          type: 'OWASP',
          version: '3.2',
        },
      },

      /**
       * Production DDoS Protection
       *
       * Configuration:
       * - Standard plan for enterprise protection
       */
      ddos: {
        enabled: true,
        plan: 'Standard',
      },
    },

    // ========================================================================
    // Monitoring Configuration
    // ========================================================================
    monitoring: {
      /**
       * Production Application Insights
       *
       * Configuration:
       * - 100% sampling for complete telemetry
       * - 90-day retention for compliance
       * - Live metrics enabled for real-time monitoring
       * - Profiler enabled for performance analysis
       * - Snapshot debugger for production debugging
       */
      appInsights: {
        samplingPercentage: 100,
        retentionDays: 90,
        enableLiveMetrics: true,
        enableProfiler: true,
        enableSnapshotDebugger: true,
      },

      /**
       * Production Log Analytics
       *
       * Configuration:
       * - PerGB2018 SKU for cost-effective large-scale logging
       * - 90-day retention matching Application Insights
       */
      logAnalytics: {
        sku: 'PerGB2018',
        retentionDays: 90,
      },

      /**
       * Production Alerts
       *
       * Configuration:
       * - Response time: warn at 1s, critical at 3s
       * - Error rate: warn at 1%, critical at 5%
       * - Availability: warn at 99.9%, critical at 99.5%
       */
      alerts: {
        responseTime: {
          warning: 1000, // 1 second
          critical: 3000, // 3 seconds
        },
        errorRate: {
          warning: 1, // 1%
          critical: 5, // 5%
        },
        availability: {
          warning: 99.9, // 99.9%
          critical: 99.5, // 99.5%
        },
      },
    },

    // ========================================================================
    // Performance Configuration
    // ========================================================================
    performance: {
      /**
       * Production CDN
       *
       * Configuration:
       * - Standard Microsoft profile (global coverage)
       * - Standard caching behavior
       * - Compression enabled for better performance
       * - Query string caching enabled
       */
      cdn: {
        enabled: true,
        profile: 'Standard_Microsoft',
        caching: 'Standard',
        compression: true,
        queryStringCaching: 'UseQueryString',
      },

      /**
       * Production Redis Cache
       *
       * Configuration:
       * - Standard tier C1 (1GB cache)
       * - LRU eviction policy
       * - TLS 1.2 minimum
       * - Non-SSL port disabled for security
       */
      cache: {
        enabled: true,
        sku: {
          tier: 'Standard',
          family: 'C',
          capacity: '1',
        },
        evictionPolicy: 'allkeys-lru',
        enableNonSslPort: false,
        minimumTlsVersion: '1.2',
      },

      /**
       * Production Rate Limiting
       *
       * Configuration:
       * - 1000 requests per minute per API
       * - Burst size of 100 for traffic spikes
       * - Per-client limits enabled
       * - 5-minute block duration for violators
       */
      rateLimit: {
        enabled: true,
        requestsPerMinute: 1000,
        burstSize: 100,
        enablePerClientLimits: true,
        blockDuration: 300, // 5 minutes
      },
    },
  };
}

/**
 * Get production defaults with custom overrides.
 *
 * Allows partial customization of production defaults while maintaining
 * production-grade configurations for non-overridden values.
 *
 * @param overrides - Partial backend defaults to override
 * @returns Production defaults with custom overrides applied
 *
 * @example
 * ```typescript
 * const customDefaults = getProductionDefaultsWithOverrides({
 *   storage: {
 *     database: {
 *       throughput: { min: 10000, max: 100000 }
 *     }
 *   }
 * });
 * ```
 */
export function getProductionDefaultsWithOverrides(
  overrides: Partial<BackendDefaults>
): BackendDefaults {
  const baseDefaults = getProductionDefaults();

  return {
    storage: {
      account: overrides.storage?.account ?? baseDefaults.storage.account,
      database: overrides.storage?.database ?? baseDefaults.storage.database,
    },
    compute: {
      functionApp: overrides.compute?.functionApp ?? baseDefaults.compute.functionApp,
    },
    network: 'network' in overrides ? overrides.network : baseDefaults.network,
    monitoring: 'monitoring' in overrides ? overrides.monitoring : baseDefaults.monitoring,
    performance: 'performance' in overrides ? overrides.performance : baseDefaults.performance,
  };
}

/**
 * Validate production defaults configuration.
 *
 * Ensures that production defaults meet minimum requirements for
 * high availability, security, and performance.
 *
 * @param defaults - Backend defaults to validate
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * const validation = validateProductionDefaults(myDefaults);
 * if (!validation.valid) {
 *   console.error('Production validation failed:', validation.errors);
 * }
 * ```
 */
export function validateProductionDefaults(defaults: BackendDefaults): {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate storage configuration
  if (defaults.storage.account.sku === 'Standard_LRS') {
    errors.push('Production storage must use zone-redundant (ZRS) or geo-redundant (GRS) SKU');
  }

  if (defaults.storage.database.mode === 'Serverless') {
    errors.push('Production database should use Provisioned or Autoscale mode, not Serverless');
  }

  if (!defaults.storage.database.backup?.enabled) {
    errors.push('Production database must have backup enabled');
  }

  // Validate compute configuration
  if (defaults.compute.functionApp.plan.type === 'Consumption') {
    warnings.push('Production should use Premium or Dedicated plan for better performance');
  }

  if (!defaults.compute.functionApp.alwaysOn) {
    warnings.push('Production function apps should have alwaysOn enabled to avoid cold starts');
  }

  if ((defaults.compute.functionApp.minInstances ?? 0) < 2) {
    warnings.push('Production should have at least 2 minimum instances for high availability');
  }

  // Validate network configuration
  if (!defaults.network) {
    warnings.push('Production should configure network isolation for security');
  }

  if (defaults.network?.waf && defaults.network.waf.mode === 'Detection') {
    warnings.push('Production WAF should use Prevention mode, not Detection mode');
  }

  // Validate monitoring configuration
  if (!defaults.monitoring) {
    errors.push('Production must have monitoring configured');
  }

  if ((defaults.monitoring?.appInsights.samplingPercentage ?? 0) < 50) {
    warnings.push('Production should have at least 50% telemetry sampling');
  }

  if ((defaults.monitoring?.appInsights.retentionDays ?? 0) < 30) {
    warnings.push('Production should retain logs for at least 30 days');
  }

  // Validate performance configuration
  if (!defaults.performance) {
    warnings.push('Production should configure performance features (CDN, caching)');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
