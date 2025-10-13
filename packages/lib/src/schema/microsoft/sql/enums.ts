/**
 * Enums for Azure SQL (Microsoft.Sql).
 *
 * @remarks
 * Curated enums for Azure SQL server and database resources.
 *
 * **Resource Types**: Microsoft.Sql/servers, Microsoft.Sql/servers/databases
 * **API Version**: 2021-11-01
 *
 * @packageDocumentation
 */

/**
 * SQL Server version.
 */
export enum SqlServerVersion {
  /**
   * SQL Server 2019 (version 12.0).
   */
  V12_0 = '12.0',
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

/**
 * Database SKU tier.
 */
export enum DatabaseSkuTier {
  /**
   * Basic tier.
   */
  BASIC = 'Basic',

  /**
   * Standard tier.
   */
  STANDARD = 'Standard',

  /**
   * Premium tier.
   */
  PREMIUM = 'Premium',

  /**
   * General Purpose tier.
   */
  GENERAL_PURPOSE = 'GeneralPurpose',

  /**
   * Business Critical tier.
   */
  BUSINESS_CRITICAL = 'BusinessCritical',

  /**
   * Hyperscale tier.
   */
  HYPERSCALE = 'Hyperscale',
}
