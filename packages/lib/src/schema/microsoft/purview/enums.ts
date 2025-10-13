/**
 * Enums for Microsoft Purview (Microsoft.Purview).
 *
 * @remarks
 * Curated enums for Microsoft Purview governance and compliance resources.
 *
 * **Resource Types**:
 * - Microsoft.Purview/accounts
 * - Microsoft.Purview/accounts/kafkaConfigurations
 * - Microsoft.Purview/accounts/privateEndpointConnections
 *
 * **API Version**: 2024-04-01-preview
 *
 * @packageDocumentation
 */

// Purview Account enums

/**
 * Microsoft Purview account SKU name.
 */
export enum PurviewSkuName {
  /**
   * Free tier - limited features for evaluation.
   */
  FREE = 'Free',

  /**
   * Standard tier - full features for production.
   */
  STANDARD = 'Standard',
}

/**
 * Managed identity type for Purview account.
 *
 * @remarks
 * Determines the type of managed identity assigned to the Purview account.
 */
export enum PurviewIdentityType {
  /**
   * No managed identity.
   */
  NONE = 'None',

  /**
   * System-assigned managed identity.
   */
  SYSTEM_ASSIGNED = 'SystemAssigned',

  /**
   * User-assigned managed identity.
   */
  USER_ASSIGNED = 'UserAssigned',
}

/**
 * Public network access state.
 *
 * @remarks
 * Controls whether the Purview account is accessible from public networks.
 */
export enum PublicNetworkAccess {
  /**
   * Public network access is disabled.
   */
  DISABLED = 'Disabled',

  /**
   * Public network access is enabled.
   */
  ENABLED = 'Enabled',

  /**
   * Public network access state is not specified.
   */
  NOT_SPECIFIED = 'NotSpecified',
}

/**
 * Managed resources public network access state.
 *
 * @remarks
 * Controls whether managed resources (Event Hub, Storage) are accessible from public networks.
 */
export enum ManagedResourcesPublicNetworkAccess {
  /**
   * Managed resources public network access is disabled.
   */
  DISABLED = 'Disabled',

  /**
   * Managed resources public network access is enabled.
   */
  ENABLED = 'Enabled',

  /**
   * Managed resources public network access state is not specified.
   */
  NOT_SPECIFIED = 'NotSpecified',
}

/**
 * Ingestion storage public network access state.
 *
 * @remarks
 * Controls whether ingestion storage is accessible from public networks.
 */
export enum IngestionStoragePublicNetworkAccess {
  /**
   * Ingestion storage public network access is disabled.
   */
  DISABLED = 'Disabled',

  /**
   * Ingestion storage public network access is enabled.
   */
  ENABLED = 'Enabled',

  /**
   * Ingestion storage public network access state is not specified.
   */
  NOT_SPECIFIED = 'NotSpecified',
}

/**
 * Managed Event Hub state.
 *
 * @remarks
 * Controls whether the managed Event Hub is enabled for the Purview account.
 */
export enum ManagedEventHubState {
  /**
   * Managed Event Hub is disabled.
   */
  DISABLED = 'Disabled',

  /**
   * Managed Event Hub is enabled.
   */
  ENABLED = 'Enabled',

  /**
   * Managed Event Hub state is not specified.
   */
  NOT_SPECIFIED = 'NotSpecified',
}

/**
 * Tenant endpoint state.
 *
 * @remarks
 * Controls whether tenant endpoints are enabled for the Purview account.
 */
export enum TenantEndpointState {
  /**
   * Tenant endpoints are disabled.
   */
  DISABLED = 'Disabled',

  /**
   * Tenant endpoints are enabled.
   */
  ENABLED = 'Enabled',

  /**
   * Tenant endpoint state is not specified.
   */
  NOT_SPECIFIED = 'NotSpecified',
}
