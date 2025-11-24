/**
 * Backend Attachments
 *
 * This module provides attachment logic for customizing backend infrastructure.
 * Attachments allow progressive enhancement of backend resources beyond defaults.
 *
 * @module @atakora/component/backend/attachments
 */

// ============================================================================
// Network Attachments
// ============================================================================

export {
  validateVNetConfig,
  validateWafConfig,
  validateDdosConfig,
  validateNetworkConfig,
} from './network';

export type {
  NetworkValidationResult,
  VNetAttachment,
  SubnetAttachment,
  WafAttachment,
  WafCustomRule,
  WafMatchCondition,
  WafExclusion,
  DdosAttachment,
  DdosAlertThresholds,
  NetworkAttachment,
} from './network';

// ============================================================================
// Compute Attachments
// ============================================================================

export {
  functionApp,
  validateFunctionAppAttachment,
  mergeFunctionAppConfigs,
  createFunctionAppAttachmentPoint,
  FunctionAppAttachmentBuilder,
  FunctionAppAttachmentPoint,
} from './compute';

export type { ComputeAttachmentValidation } from './compute';

// ============================================================================
// Performance Attachments
// ============================================================================

export {
  cdn,
  validateCdnAttachment,
  cache,
  validateCacheAttachment,
  rateLimit,
  validateRateLimitAttachment,
  createPerformanceAttachmentPoints,
  CdnAttachmentBuilder,
  CacheAttachmentBuilder,
  RateLimitAttachmentBuilder,
  PerformanceAttachmentPoint,
} from './performance';

export type { PerformanceAttachmentValidation } from './performance';
