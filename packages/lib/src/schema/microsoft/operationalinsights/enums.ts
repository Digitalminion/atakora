/**
 * Enums for Azure Log Analytics (Microsoft.OperationalInsights).
 *
 * @remarks
 * Curated enums for Azure Log Analytics workspace resources.
 *
 * **Resource Type**: Microsoft.OperationalInsights/workspaces
 * **API Version**: 2021-06-01
 *
 * @packageDocumentation
 */

/**
 * Log Analytics workspace SKU.
 */
export enum WorkspaceSku {
  /**
   * Free tier.
   */
  FREE = 'Free',

  /**
   * Standard tier (legacy).
   */
  STANDARD = 'Standard',

  /**
   * Premium tier (legacy).
   */
  PREMIUM = 'Premium',

  /**
   * Per-node pricing.
   */
  PER_NODE = 'PerNode',

  /**
   * Per-GB pricing (2018 model).
   */
  PER_GB_2018 = 'PerGB2018',

  /**
   * Standalone tier (legacy).
   */
  STANDALONE = 'Standalone',

  /**
   * Capacity reservation pricing.
   */
  CAPACITY_RESERVATION = 'CapacityReservation',

  /**
   * Log Analytics cluster pricing.
   */
  LA_CLUSTER = 'LACluster',
}

/**
 * Public network access setting.
 */
export enum PublicNetworkAccess {
  /**
   * Enabled - allows public access.
   */
  ENABLED = 'Enabled',

  /**
   * Disabled - no public access.
   */
  DISABLED = 'Disabled',
}
