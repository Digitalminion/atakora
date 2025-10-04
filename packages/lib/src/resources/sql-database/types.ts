/**
 * Type definitions for SQL Server and SQL Database constructs.
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
 * Properties for ArmSqlServer (L1 construct).
 *
 * @remarks
 * Direct mapping to Microsoft.Sql/servers ARM resource.
 * All properties are explicit with no defaults or auto-generation.
 *
 * ARM API Version: 2021-11-01
 *
 * @example
 * ```typescript
 * const props: ArmSqlServerProps = {
 *   serverName: 'sql-colorai-001',
 *   location: 'eastus',
 *   administratorLogin: 'sqladmin',
 *   administratorLoginPassword: 'P@ssw0rd123!',
 *   version: SqlServerVersion.V12_0,
 *   publicNetworkAccess: PublicNetworkAccess.DISABLED
 * };
 * ```
 */
export interface ArmSqlServerProps {
  /**
   * SQL Server name.
   *
   * @remarks
   * - Must be 1-63 characters
   * - Lowercase letters, numbers, and hyphens
   * - Cannot start or end with hyphen
   * - Must be globally unique across Azure
   * - Pattern: ^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$ or ^[a-z0-9]$
   */
  readonly serverName: string;

  /**
   * Azure region where the SQL Server will be created.
   */
  readonly location: string;

  /**
   * Administrator login name.
   *
   * @remarks
   * Cannot be 'admin', 'administrator', 'sa', 'root', 'dbmanager', 'loginmanager', etc.
   */
  readonly administratorLogin: string;

  /**
   * Administrator login password.
   *
   * @remarks
   * Must be at least 8 characters and contain characters from three of the following categories:
   * - Uppercase letters
   * - Lowercase letters
   * - Numbers
   * - Non-alphanumeric characters
   */
  readonly administratorLoginPassword: string;

  /**
   * SQL Server version.
   *
   * @remarks
   * Defaults to '12.0' if not specified.
   */
  readonly version?: SqlServerVersion;

  /**
   * Public network access setting.
   */
  readonly publicNetworkAccess?: PublicNetworkAccess;

  /**
   * Minimal TLS version.
   *
   * @remarks
   * Valid values: '1.0', '1.1', '1.2'
   */
  readonly minimalTlsVersion?: string;

  /**
   * Tags to apply to the SQL Server.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Properties for SqlServer (L2 construct).
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 * Designed for developer productivity with minimal required properties.
 *
 * @example
 * ```typescript
 * // Minimal usage - auto-generates name and uses defaults
 * const sqlServer = new SqlServer(resourceGroup, 'Database', {
 *   administratorLogin: 'sqladmin',
 *   administratorLoginPassword: 'P@ssw0rd123!'
 * });
 *
 * // With custom properties
 * const sqlServer = new SqlServer(resourceGroup, 'Database', {
 *   serverName: 'sql-myapp-001',
 *   administratorLogin: 'sqladmin',
 *   administratorLoginPassword: 'P@ssw0rd123!',
 *   publicNetworkAccess: PublicNetworkAccess.ENABLED
 * });
 * ```
 */
export interface SqlServerProps {
  /**
   * SQL Server name.
   *
   * @remarks
   * If not provided, will be auto-generated using the stack's naming context.
   * - Format: `sql-{org}-{project}-{purpose}-{env}-{geo}-{instance}`
   * - Example: `sql-dp-colorai-database-np-eus-01`
   *
   * The `purpose` is derived from the construct ID.
   */
  readonly serverName?: string;

  /**
   * Azure region where the SQL Server will be created.
   *
   * @remarks
   * If not provided, defaults to the parent resource group's location.
   */
  readonly location?: string;

  /**
   * Administrator login name.
   *
   * @remarks
   * Required. Cannot be 'admin', 'administrator', 'sa', 'root', 'dbmanager', 'loginmanager', etc.
   */
  readonly administratorLogin: string;

  /**
   * Administrator login password.
   *
   * @remarks
   * Required. Must be at least 8 characters and contain characters from three categories.
   */
  readonly administratorLoginPassword: string;

  /**
   * SQL Server version.
   *
   * @remarks
   * Defaults to '12.0'.
   */
  readonly version?: SqlServerVersion;

  /**
   * Public network access setting.
   *
   * @remarks
   * Defaults to 'Disabled' for security.
   */
  readonly publicNetworkAccess?: PublicNetworkAccess;

  /**
   * Minimal TLS version.
   *
   * @remarks
   * Defaults to '1.2'.
   */
  readonly minimalTlsVersion?: string;

  /**
   * Tags to apply to the SQL Server.
   *
   * @remarks
   * These tags will be merged with the parent's tags.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Interface for SQL Server reference.
 *
 * @remarks
 * Allows resources to reference a SQL Server without depending on the construct class.
 */
export interface ISqlServer {
  /**
   * Name of the SQL Server.
   */
  readonly serverName: string;

  /**
   * Location of the SQL Server.
   */
  readonly location: string;

  /**
   * Resource ID of the SQL Server.
   */
  readonly serverId: string;
}

/**
 * Properties for ArmSqlDatabase (L1 construct).
 *
 * @remarks
 * Direct mapping to Microsoft.Sql/servers/databases ARM resource.
 * All properties are explicit with no defaults or auto-generation.
 *
 * ARM API Version: 2021-11-01
 *
 * @example
 * ```typescript
 * const props: ArmSqlDatabaseProps = {
 *   serverName: 'sql-colorai-001',
 *   databaseName: 'mydb',
 *   location: 'eastus',
 *   sku: {
 *     tier: DatabaseSkuTier.STANDARD,
 *     capacity: 10
 *   }
 * };
 * ```
 */
export interface ArmSqlDatabaseProps {
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
 * Properties for SqlDatabase (L2 construct).
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 * Designed for developer productivity with minimal required properties.
 *
 * @example
 * ```typescript
 * // Minimal usage - auto-generates name and uses defaults
 * const db = new SqlDatabase(sqlServer, 'AppDatabase');
 *
 * // With custom properties
 * const db = new SqlDatabase(sqlServer, 'AppDatabase', {
 *   databaseName: 'myapp-db',
 *   sku: DatabaseSkuTier.STANDARD,
 *   maxSizeBytes: 268435456000 // 250 GB
 * });
 * ```
 */
export interface SqlDatabaseProps {
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
export interface ISqlDatabase {
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
