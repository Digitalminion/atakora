/**
 * Enums for Azure Active Directory Domain Services (Microsoft.AAD).
 *
 * @remarks
 * Curated enums for Azure AD Domain Services resources.
 *
 * **Resource Types**:
 * - Microsoft.AAD/domainServices
 * - Microsoft.AAD/domainServices/ouContainer
 *
 * **API Version**: 2025-06-01
 *
 * @packageDocumentation
 */

// Domain Services enums

/**
 * Configuration diagnostics validator result status.
 */
export enum ConfigDiagnosticsStatus {
  /**
   * Validation failed.
   */
  FAILURE = 'Failure',

  /**
   * No validation performed.
   */
  NONE = 'None',

  /**
   * Validation succeeded.
   */
  OK = 'OK',

  /**
   * Validation is running.
   */
  RUNNING = 'Running',

  /**
   * Validation was skipped.
   */
  SKIPPED = 'Skipped',

  /**
   * Validation completed with warnings.
   */
  WARNING = 'Warning',
}

/**
 * Domain security setting state.
 *
 * @remarks
 * Generic enabled/disabled state used for various security settings.
 */
export enum DomainSecuritySetting {
  /**
   * Security setting is disabled.
   */
  DISABLED = 'Disabled',

  /**
   * Security setting is enabled.
   */
  ENABLED = 'Enabled',
}

/**
 * Sync scope for domain services.
 *
 * @remarks
 * Determines which users are synced to the managed domain.
 */
export enum SyncScope {
  /**
   * Sync all users from Azure AD.
   */
  ALL = 'All',

  /**
   * Sync only cloud users (exclude on-premises synced users).
   */
  CLOUD_ONLY = 'CloudOnly',
}
