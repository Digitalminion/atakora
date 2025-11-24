/**
 * Backend Assembly System Public API
 *
 * This module provides the backend assembly pattern that brings together
 * schema (Phase 1) and authentication (Phase 2) into a unified backend definition.
 *
 * @module @atakora/component/backend
 *
 * @example
 * ```typescript
 * import { defineBackend } from '@atakora/component/backend';
 * import { defineSchema, a, c } from '@atakora/component/schema';
 * import { defineAuth, auth } from '@atakora/component/auth';
 *
 * // Define schema
 * const schema = defineSchema({
 *   schema: a.schema({
 *     User: c.model({
 *       id: a.id(),
 *       email: a.string().required().email(),
 *     }),
 *   }),
 * });
 *
 * // Define authentication
 * const authentication = defineAuth({
 *   entra: auth.entra()
 *     .clientId('...')
 *     .tenantId('...')
 *     .primary(),
 * });
 *
 * // Define backend
 * export const backend = defineBackend({
 *   schema,
 *   authentication,
 *   settings: {
 *     name: 'my-app',
 *     region: 'eastus',
 *   },
 * });
 * ```
 *
 * @packageDocumentation
 */

// ============================================================================
// Main Function
// ============================================================================

export {
  defineBackend,
  isBackendObject,
  getBackendMetadata,
  getEnabledFeatures,
  isFeatureEnabled,
} from './define-backend';

// ============================================================================
// Type Exports
// ============================================================================

export type {
  // Core types
  Environment,
  BackendSettings,
  ResolvedBackendSettings,
  BackendConfig,
  BackendObject,
  BackendMetadata,

  // Attachment points
  AttachmentPoint,
} from './types';

// ============================================================================
// Attachment Point System
// ============================================================================

export {
  AttachmentPointImpl,
  createAttachmentPoint,
  createAttachmentPoints,
} from './attachment-point';

export type { BackendObjectRef, ConfigValidator } from './attachment-point';

// ============================================================================
// Service Configuration
// ============================================================================

export type { ServicesConfig, InferServices } from './service-config';
export { createServiceBuilder } from './service-config';

export {
  AttachmentValidationError,
  isNonEmptyString,
  isValidResourceName,
  isValidSku,
  isPositiveInteger,
  isInRange,
  validateStorageAccountConfig,
  validateDatabaseConfig,
  validateFunctionAppConfig,
  validateVNetConfig,
  validateAppInsightsConfig,
  createRequiredFieldsValidator,
  composeValidators,
  ValidatorRegistry,
  defaultValidators,
} from './attachment-validator';

export type {
  BaseResourceConfig,
  StorageAccountConfig,
  DatabaseConfig,
  FunctionAppConfig,
  VNetConfig,
  AppInsightsConfig,
} from './attachment-validator';

// ============================================================================
// Environment Detection and Configuration (Phase 4)
// ============================================================================

export {
  // Environment types
  type Environment as EnvironmentType,
  type EnvironmentOptions,
  type EnvironmentDefaults,

  // Detection functions
  detectEnvironment,
  getEnvironmentDefaults,
  isFeatureEnabled as isEnvironmentFeatureEnabled,
  getDefaultRegion,
} from './environment';

export {
  // Utility types
  type EnvironmentOverrides,
  type EnvironmentComparison,

  // Utility functions
  mergeEnvironmentConfig,
  getEnvironmentFlags,
  validateEnvironmentConfig,
  getEnvironmentDisplayName,
  getEnvironmentColor,
  detectAndConfigure,
  isOperationAllowed,
  getEnvironmentTags,
} from './environment-utils';

// ============================================================================
// Storage Attachments (Phase 4)
// ============================================================================

export {
  // Configuration types
  type StorageAccountConfig as StorageAttachmentConfig,
  type DatabaseConfig as DatabaseAttachmentConfig,
  type QueueConfig,
  type BlobContainerConfig,
  type StorageNetworkRules,
  type DatabaseThroughput,
  type DatabaseBackupConfig,
  type DatabaseNetworkRules,
  type CosmosDatabase,
  type CosmosContainer,
  type IndexingPolicy,

  // Enums
  type StorageSku,
  type StorageTier,
  type CosmosConsistency,
  type CosmosMode,

  // Validation functions
  validateStorageAccountConfig as validateStorageAttachment,
  validateDatabaseConfig as validateDatabaseAttachment,
  validateQueueConfig,

  // Factory functions
  createDefaultStorageConfig,
  createDefaultDatabaseConfig,

  // Error class
  StorageAttachmentError,
} from './attachments/storage';

// ============================================================================
// Monitoring Attachments (Phase 4)
// ============================================================================

export {
  // Configuration types
  type AppInsightsConfig as AppInsightsAttachmentConfig,
  type LogAnalyticsConfig,
  type AlertsConfig,
  type AlertThreshold,
  type CustomAlertConfig,
  type ActionGroupConfig,
  type EmailReceiver,
  type SmsReceiver,
  type WebhookReceiver,
  type AzureFunctionReceiver,
  type LogicAppReceiver,
  type DataSourceType,

  // Validation functions
  validateAppInsightsConfig as validateAppInsightsAttachment,
  validateLogAnalyticsConfig,
  validateAlertsConfig,

  // Factory functions
  createDefaultAppInsightsConfig,
  createDefaultLogAnalyticsConfig,
  createDefaultAlertsConfig,

  // Error class
  MonitoringAttachmentError,
} from './attachments/monitoring';

// ============================================================================
// Legacy Component Compatibility Stubs
// ============================================================================

/**
 * @deprecated Legacy component interface - no longer used in schema-centric architecture
 * @legacy
 */
export interface IBackendComponent {
  readonly componentType: string;
  readonly componentId: string;
}

/**
 * @deprecated Legacy component interface - no longer used in schema-centric architecture
 * @legacy
 */
export interface IComponentDefinition {
  readonly type: string;
  readonly config: Record<string, any>;
}

/**
 * @deprecated Legacy component interface - no longer used in schema-centric architecture
 * @legacy
 */
export interface IResourceRequirement {
  readonly resourceType: string;
  readonly required: boolean;
}

/**
 * @deprecated Legacy component interface - no longer used in schema-centric architecture
 * @legacy
 */
export type ResourceMap = Record<string, any>;

/**
 * @deprecated Legacy component interface - no longer used in schema-centric architecture
 * @legacy
 * @remarks Renamed to avoid conflict with validation module's ValidationResult
 */
export interface LegacyValidationResult {
  readonly valid: boolean;
  readonly errors?: string[];
}

/**
 * @deprecated Legacy component interface - no longer used in schema-centric architecture
 * @legacy
 */
export type ComponentOutputs = Record<string, any>;

/**
 * @deprecated Legacy component function - no longer used in schema-centric architecture
 * @legacy
 */
export function isBackendManaged(_component: any): boolean {
  return false;
}

// ============================================================================
// Version
// ============================================================================

/**
 * Backend assembly API version
 */
export const BACKEND_ASSEMBLY_VERSION = '1.0.0';
