/**
 * Type definitions for SQL Database constructs.
 *
 * @packageDocumentation
 */

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

/**
 * Database SKU configuration.
 */
export interface DatabaseSku {
  /**
   * SKU tier name.
   */
  readonly tier: DatabaseSkuTier;

  /**
   * Capacity (DTUs or vCores).
   */
  readonly capacity?: number;
}

/**
 * Properties for ArmDatabases (L1 construct).
 *
 * @remarks
 * Direct mapping to Microsoft.Sql/servers/databases ARM resource.
 * All properties are explicit with no defaults or auto-generation.
 *
 * ARM API Version: 2021-11-01
 *
 * @example
 * ```typescript
 * const props: ArmDatabasesProps = {
 *   serverName: 'sql-authr-001',
 *   databaseName: 'mydb',
 *   location: 'eastus',
 *   sku: {
 *     tier: DatabaseSkuTier.STANDARD,
 *     capacity: 10
 *   }
 * };
 * ```
 */
export interface ArmDatabasesProps {
  /**
   * SQL Server name (parent resource).
   */
  readonly serverName: string;

  /**
   * SQL Database name.
   *
   * @remarks
   * - Must be 1-128 characters
   * - Can contain letters, numbers, hyphens, periods, and underscores
   * - Cannot end with period or hyphen
   */
  readonly databaseName: string;

  /**
   * Azure region where the SQL Database will be created.
   *
   * @remarks
   * Must match the parent SQL Server's location.
   */
  readonly location: string;

  /**
   * Database SKU configuration.
   */
  readonly sku?: DatabaseSku;

  /**
   * Maximum size in bytes.
   */
  readonly maxSizeBytes?: number;

  /**
   * Database collation.
   *
   * @remarks
   * Example: 'SQL_Latin1_General_CP1_CI_AS'
   */
  readonly collation?: string;

  /**
   * Tags to apply to the SQL Database.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Properties for Databases (L2 construct).
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 * Designed for developer productivity with minimal required properties.
 *
 * @example
 * ```typescript
 * // Minimal usage - auto-generates name and uses defaults
 * const db = new Databases(sqlServer, 'AppDatabase');
 *
 * // With custom properties
 * const db = new Databases(sqlServer, 'AppDatabase', {
 *   databaseName: 'myapp-db',
 *   sku: DatabaseSkuTier.STANDARD,
 *   maxSizeBytes: 268435456000 // 250 GB
 * });
 * ```
 */
export interface DatabasesProps {
  /**
   * SQL Database name.
   *
   * @remarks
   * If not provided, will be auto-generated using the stack's naming context.
   * The `purpose` is derived from the construct ID.
   */
  readonly databaseName?: string;

  /**
   * Azure region where the SQL Database will be created.
   *
   * @remarks
   * If not provided, defaults to the parent SQL Server's location.
   */
  readonly location?: string;

  /**
   * Database SKU configuration.
   *
   * @remarks
   * Can be a DatabaseSkuTier enum value (simplified) or a full DatabaseSku object.
   * If a tier is provided, defaults will be used for capacity.
   */
  readonly sku?: DatabaseSkuTier | DatabaseSku;

  /**
   * Maximum size in bytes.
   */
  readonly maxSizeBytes?: number;

  /**
   * Database collation.
   *
   * @remarks
   * Defaults to 'SQL_Latin1_General_CP1_CI_AS'.
   */
  readonly collation?: string;

  /**
   * Tags to apply to the SQL Database.
   *
   * @remarks
   * These tags will be merged with the parent's tags.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Interface for SQL Database reference.
 *
 * @remarks
 * Allows resources to reference a SQL Database without depending on the construct class.
 */
export interface IDatabases {
  /**
   * Name of the SQL Database.
   */
  readonly databaseName: string;

  /**
   * Name of the parent SQL Server.
   */
  readonly serverName: string;

  /**
   * Location of the SQL Database.
   */
  readonly location: string;

  /**
   * Resource ID of the SQL Database.
   */
  readonly databaseId: string;
}
