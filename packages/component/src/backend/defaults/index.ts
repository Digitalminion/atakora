/**
 * Backend Defaults
 *
 * This module provides environment-aware default configurations for backends.
 * Each environment (development, staging, production) has optimized defaults
 * for its specific use case.
 *
 * @module @atakora/component/backend/defaults
 */

// ============================================================================
// Base Types
// ============================================================================

export type {
  Environment,
  StorageSku,
  StorageTier,
  ConsistencyLevel,
  CosmosMode,
  BackupType,
  FunctionAppPlan,
  PremiumSku,
  FunctionRuntime,
  StorageAccountDefaults,
  BackupDefaults,
  ThroughputDefaults,
  CosmosDbDefaults,
  StorageDefaults,
  ScalingDefaults,
  FunctionAppDefaults,
  ComputeDefaults,
  VNetDefaults,
  SubnetDefaults,
  WafDefaults,
  DdosDefaults,
  NetworkDefaults,
  AppInsightsDefaults,
  LogAnalyticsDefaults,
  AlertThreshold,
  AlertsDefaults,
  MonitoringDefaults,
  CdnDefaults,
  CacheDefaults,
  RateLimitDefaults,
  PerformanceDefaults,
  BackendDefaults,
} from './base';

// ============================================================================
// Development Defaults
// ============================================================================

export {
  getDevelopmentDefaults,
  isDevelopment,
  getDevelopmentDefaultsWithOverrides,
} from './development';

// ============================================================================
// Staging Defaults
// ============================================================================

export { getStagingDefaults, isStaging, getStagingDefaultsWithOverrides } from './staging';

// ============================================================================
// Production Defaults
// ============================================================================

export {
  getProductionDefaults,
  getProductionDefaultsWithOverrides,
  validateProductionDefaults,
} from './production';
