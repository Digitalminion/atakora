/**
 * Type definitions for Azure SQL (Microsoft.Sql).
 *
 * @remarks
 * Comprehensive types for Azure SQL server and database resources.
 *
 * **Resource Types**: Microsoft.Sql/servers, Microsoft.Sql/servers/databases
 * **API Version**: 2021-11-01
 *
 * @packageDocumentation
 */

import {
  SqlServerVersion,
  PublicNetworkAccess,
  DatabaseSkuTier,
} from './enums';

// ============================================================================
// SQL Server Types
// ============================================================================

/**
 * Managed identity configuration for SQL Server.
 */
export interface SqlServerIdentity {
  /**
   * Identity type.
   *
   * @remarks
   * Valid values:
   * - 'SystemAssigned': System-assigned managed identity
   * - 'UserAssigned': User-assigned managed identity
   * - 'SystemAssigned,UserAssigned': Both system and user assigned
   * - 'None': No managed identity
   */
  readonly type: 'SystemAssigned' | 'UserAssigned' | 'SystemAssigned,UserAssigned' | 'None';

  /**
   * User-assigned identity resource IDs.
   *
   * @remarks
   * Required when type includes 'UserAssigned'.
   * Key is the resource ID, value is an empty object.
   */
  readonly userAssignedIdentities?: Record<string, Record<string, never>>;
}

/**
 * SQL Server administrator configuration.
 */
export interface ServerExternalAdministrator {
  /**
   * Type of administrator.
   *
   * @remarks
   * Valid value: 'ActiveDirectory'
   */
  readonly administratorType?: 'ActiveDirectory';

  /**
   * Principal type.
   *
   * @remarks
   * Valid values: 'User', 'Group', 'Application'
   */
  readonly principalType?: 'User' | 'Group' | 'Application';

  /**
   * Login name of the server administrator.
   */
  readonly login?: string;

  /**
   * SID (object ID) of the server administrator.
   */
  readonly sid?: string;

  /**
   * Tenant ID of the administrator.
   */
  readonly tenantId?: string;

  /**
   * Azure Active Directory only authentication enabled.
   */
  readonly azureADOnlyAuthentication?: boolean;
}

/**
 * Private endpoint connection properties.
 */
export interface PrivateEndpointConnectionProperties {
  /**
   * Private endpoint resource ID.
   */
  readonly privateEndpoint?: {
    readonly id?: string;
  };

  /**
   * Connection state.
   */
  readonly privateLinkServiceConnectionState?: {
    readonly status?: 'Pending' | 'Approved' | 'Rejected';
    readonly description?: string;
    readonly actionsRequired?: string;
  };
}

/**
 * SQL Server properties for create/update.
 */
export interface SqlServerProperties {
  /**
   * Administrator username.
   *
   * @remarks
   * Cannot be: 'admin', 'administrator', 'sa', 'root', 'dbmanager', 'loginmanager',
   * 'dbo', 'guest', 'public', or Azure AD user/group names.
   */
  readonly administratorLogin?: string;

  /**
   * Administrator password.
   *
   * @remarks
   * Must be 8-128 characters and contain characters from 3 of these categories:
   * - Uppercase letters
   * - Lowercase letters
   * - Numbers (0-9)
   * - Non-alphanumeric characters (!,$,#,%, etc.)
   */
  readonly administratorLoginPassword?: string;

  /**
   * SQL Server version.
   */
  readonly version?: SqlServerVersion;

  /**
   * State of the server.
   *
   * @remarks
   * Read-only. Values: 'Ready', 'Disabled'
   */
  readonly state?: string;

  /**
   * Fully qualified domain name of the server.
   *
   * @remarks
   * Read-only. Example: 'myserver.database.windows.net'
   */
  readonly fullyQualifiedDomainName?: string;

  /**
   * Private endpoint connections.
   *
   * @remarks
   * Read-only.
   */
  readonly privateEndpointConnections?: PrivateEndpointConnectionProperties[];

  /**
   * Minimal TLS version.
   *
   * @remarks
   * Valid values: '1.0', '1.1', '1.2', '1.3'
   */
  readonly minimalTlsVersion?: '1.0' | '1.1' | '1.2' | '1.3';

  /**
   * Public network access setting.
   */
  readonly publicNetworkAccess?: PublicNetworkAccess;

  /**
   * Whether or not existing server has a workspace created.
   *
   * @remarks
   * Read-only.
   */
  readonly workspaceFeature?: 'Connected' | 'Disconnected';

  /**
   * Primary user-assigned identity.
   *
   * @remarks
   * Resource ID of a user-assigned identity to be used by default.
   */
  readonly primaryUserAssignedIdentityId?: string;

  /**
   * Resource ID of a user-assigned identity used for CMK.
   */
  readonly keyId?: string;

  /**
   * Azure Active Directory administrator.
   */
  readonly administrators?: ServerExternalAdministrator;

  /**
   * Whether or not to restrict outbound network access.
   */
  readonly restrictOutboundNetworkAccess?: 'Enabled' | 'Disabled';

  /**
   * Federated client ID used for cross-tenant CMK scenario.
   */
  readonly federatedClientId?: string;
}

// ============================================================================
// SQL Database Types
// ============================================================================

/**
 * Database SKU configuration.
 *
 * @remarks
 * Defines the performance tier and capacity for the database.
 */
export interface DatabaseSku {
  /**
   * SKU name.
   *
   * @remarks
   * Examples:
   * - Basic: 'Basic'
   * - Standard: 'S0', 'S1', 'S2', 'S3', 'S4', 'S6', 'S7', 'S9', 'S12'
   * - Premium: 'P1', 'P2', 'P4', 'P6', 'P11', 'P15'
   * - GeneralPurpose: 'GP_Gen5_2', 'GP_Gen5_4', etc.
   * - BusinessCritical: 'BC_Gen5_2', 'BC_Gen5_4', etc.
   * - Hyperscale: 'HS_Gen5_2', 'HS_Gen5_4', etc.
   */
  readonly name?: string;

  /**
   * SKU tier.
   */
  readonly tier?: DatabaseSkuTier;

  /**
   * Capacity (DTUs or vCores).
   *
   * @remarks
   * - For DTU-based tiers: 5, 10, 20, 50, 100, 200, 400, 800, 1600, 3000
   * - For vCore-based tiers: 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 32, 40, 80
   */
  readonly capacity?: number;

  /**
   * Family of hardware.
   *
   * @remarks
   * Valid values: 'Gen4', 'Gen5', 'Fsv2', 'M', 'DC'
   */
  readonly family?: string;

  /**
   * Size of the SKU.
   *
   * @remarks
   * Read-only. Example: '32GB'
   */
  readonly size?: string;
}

/**
 * Database auto-pause delay configuration.
 *
 * @remarks
 * Used with serverless compute tier.
 */
export interface AutoPauseDelay {
  /**
   * Time in minutes after which database is automatically paused.
   *
   * @remarks
   * - -1: Auto-pause disabled
   * - Minimum: 60 minutes
   * - Maximum: 10080 minutes (7 days)
   */
  readonly minutes?: number;
}

/**
 * Backup retention policy.
 */
export interface BackupShortTermRetentionPolicy {
  /**
   * Retention period in days.
   *
   * @remarks
   * - Basic tier: 1-7 days
   * - Other tiers: 1-35 days
   */
  readonly retentionDays?: number;

  /**
   * Diff backup interval.
   *
   * @remarks
   * Valid values: 12, 24 (hours)
   */
  readonly diffBackupIntervalInHours?: 12 | 24;
}

/**
 * Long-term backup retention policy.
 */
export interface BackupLongTermRetentionPolicy {
  /**
   * Weekly retention.
   *
   * @remarks
   * ISO 8601 duration format. Example: 'P1W' (1 week), 'P1M' (1 month), 'P1Y' (1 year)
   */
  readonly weeklyRetention?: string;

  /**
   * Monthly retention.
   */
  readonly monthlyRetention?: string;

  /**
   * Yearly retention.
   */
  readonly yearlyRetention?: string;

  /**
   * Week of year for yearly retention.
   *
   * @remarks
   * Value: 1-52
   */
  readonly weekOfYear?: number;
}

/**
 * Transparent data encryption settings.
 */
export interface TransparentDataEncryption {
  /**
   * TDE state.
   *
   * @remarks
   * Valid values: 'Enabled', 'Disabled'
   */
  readonly state?: 'Enabled' | 'Disabled';
}

/**
 * Database read scale configuration.
 */
export interface DatabaseReadScale {
  /**
   * Read scale state.
   *
   * @remarks
   * Valid values: 'Enabled', 'Disabled'
   * Available in Premium and Business Critical tiers.
   */
  readonly state?: 'Enabled' | 'Disabled';
}

/**
 * Database secondary type.
 */
export interface SecondaryType {
  /**
   * Type of secondary database.
   *
   * @remarks
   * Valid values: 'Geo', 'Named', 'Standby'
   */
  readonly type?: 'Geo' | 'Named' | 'Standby';
}

/**
 * Database license type.
 */
export interface DatabaseLicenseType {
  /**
   * License type.
   *
   * @remarks
   * Valid values:
   * - 'LicenseIncluded': Pay-as-you-go licensing
   * - 'BasePrice': Azure Hybrid Benefit (bring your own license)
   */
  readonly type?: 'LicenseIncluded' | 'BasePrice';
}

/**
 * Database maintenance configuration.
 */
export interface MaintenanceConfigurationId {
  /**
   * Maintenance configuration resource ID.
   *
   * @remarks
   * Resource ID format: /subscriptions/{subscriptionId}/providers/Microsoft.Maintenance/publicMaintenanceConfigurations/{configName}
   */
  readonly id?: string;
}

/**
 * Database properties for create/update.
 */
export interface DatabaseProperties {
  /**
   * Collation of the database.
   *
   * @remarks
   * Default: 'SQL_Latin1_General_CP1_CI_AS'
   * Examples:
   * - 'SQL_Latin1_General_CP1_CI_AS'
   * - 'SQL_Latin1_General_CP1_CS_AS'
   * - 'Latin1_General_100_CI_AS_SC'
   */
  readonly collation?: string;

  /**
   * Maximum size in bytes.
   *
   * @remarks
   * Examples:
   * - Basic: 2 GB (2147483648 bytes)
   * - Standard: 250 GB (268435456000 bytes)
   * - Premium: 4 TB (4398046511104 bytes)
   */
  readonly maxSizeBytes?: number;

  /**
   * Sample schema to apply.
   *
   * @remarks
   * Valid values: 'AdventureWorksLT', 'WideWorldImportersStd', 'WideWorldImportersFull'
   */
  readonly sampleName?: string;

  /**
   * Whether to enable elastic pool for this database.
   */
  readonly elasticPoolId?: string;

  /**
   * Source database resource ID (for copy/restore).
   */
  readonly sourceDatabaseId?: string;

  /**
   * Database status.
   *
   * @remarks
   * Read-only. Values: 'Online', 'Restoring', 'RecoveryPending', 'Recovering',
   * 'Suspect', 'Offline', 'Standby', 'Shutdown', 'EmergencyMode', 'AutoClosed',
   * 'Copying', 'Creating', 'Inaccessible', 'OfflineSecondary', 'Pausing',
   * 'Paused', 'Resuming', 'Scaling', 'OfflineChangingDwPerformanceTiers',
   * 'OnlineChangingDwPerformanceTiers', 'Disabled'
   */
  readonly status?: string;

  /**
   * Database creation date.
   *
   * @remarks
   * Read-only. ISO 8601 format.
   */
  readonly creationDate?: string;

  /**
   * Database ID.
   *
   * @remarks
   * Read-only. Unique identifier.
   */
  readonly databaseId?: string;

  /**
   * Current service level objective name.
   *
   * @remarks
   * Read-only. Example: 'S0', 'P1', 'GP_Gen5_2'
   */
  readonly currentServiceObjectiveName?: string;

  /**
   * Requested service level objective name.
   */
  readonly requestedServiceObjectiveName?: string;

  /**
   * Default secondary location.
   *
   * @remarks
   * Read-only. Example: 'West US'
   */
  readonly defaultSecondaryLocation?: string;

  /**
   * Failover group ID.
   *
   * @remarks
   * Read-only.
   */
  readonly failoverGroupId?: string;

  /**
   * Restore point in time (for point-in-time restore).
   *
   * @remarks
   * ISO 8601 format. Example: '2023-01-15T08:00:00Z'
   */
  readonly restorePointInTime?: string;

  /**
   * Source database deletion date (for restore).
   *
   * @remarks
   * ISO 8601 format.
   */
  readonly sourceDatabaseDeletionDate?: string;

  /**
   * Recovery services recovery point resource ID.
   */
  readonly recoveryServicesRecoveryPointId?: string;

  /**
   * Long-term retention backup resource ID.
   */
  readonly longTermRetentionBackupResourceId?: string;

  /**
   * Recoverable database resource ID.
   */
  readonly recoverableDatabaseId?: string;

  /**
   * Restorable dropped database resource ID.
   */
  readonly restorableDroppedDatabaseId?: string;

  /**
   * Catalog collation.
   *
   * @remarks
   * Valid values: 'DATABASE_DEFAULT', 'SQL_Latin1_General_CP1_CI_AS'
   */
  readonly catalogCollation?: 'DATABASE_DEFAULT' | 'SQL_Latin1_General_CP1_CI_AS';

  /**
   * Whether or not database is zone redundant.
   */
  readonly zoneRedundant?: boolean;

  /**
   * License type.
   *
   * @remarks
   * Valid values: 'LicenseIncluded', 'BasePrice'
   */
  readonly licenseType?: 'LicenseIncluded' | 'BasePrice';

  /**
   * Maximum log size in bytes.
   *
   * @remarks
   * Read-only.
   */
  readonly maxLogSizeBytes?: number;

  /**
   * Earliest restore point in time.
   *
   * @remarks
   * Read-only. ISO 8601 format.
   */
  readonly earliestRestoreDate?: string;

  /**
   * Database read scale.
   *
   * @remarks
   * Valid values: 'Enabled', 'Disabled'
   */
  readonly readScale?: 'Enabled' | 'Disabled';

  /**
   * Number of readonly secondary replicas.
   *
   * @remarks
   * Valid values: 0-4
   */
  readonly highAvailabilityReplicaCount?: number;

  /**
   * Secondary type.
   *
   * @remarks
   * Valid values: 'Geo', 'Named', 'Standby'
   */
  readonly secondaryType?: 'Geo' | 'Named' | 'Standby';

  /**
   * Current SKU.
   *
   * @remarks
   * Read-only.
   */
  readonly currentSku?: DatabaseSku;

  /**
   * Auto-pause delay in minutes.
   *
   * @remarks
   * Serverless compute tier only.
   * - -1: Disabled
   * - Minimum: 60
   * - Maximum: 10080 (7 days)
   */
  readonly autoPauseDelay?: number;

  /**
   * Current backup storage redundancy.
   *
   * @remarks
   * Read-only. Values: 'Geo', 'Local', 'Zone', 'GeoZone'
   */
  readonly currentBackupStorageRedundancy?: 'Geo' | 'Local' | 'Zone' | 'GeoZone';

  /**
   * Requested backup storage redundancy.
   *
   * @remarks
   * Values: 'Geo', 'Local', 'Zone', 'GeoZone'
   */
  readonly requestedBackupStorageRedundancy?: 'Geo' | 'Local' | 'Zone' | 'GeoZone';

  /**
   * Minimal capacity for serverless compute tier.
   *
   * @remarks
   * vCores value. Examples: 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, etc.
   */
  readonly minCapacity?: number;

  /**
   * Maintenance configuration ID.
   */
  readonly maintenanceConfigurationId?: string;

  /**
   * Whether ledger is enabled.
   */
  readonly isLedgerOn?: boolean;

  /**
   * Whether or not database uses free monthly limits.
   */
  readonly useFreeLimit?: boolean;

  /**
   * Type of free limit.
   *
   * @remarks
   * Valid value: 'FreeLimitExhausted'
   */
  readonly freeLimitExhaustionBehavior?: 'FreeLimitExhausted';

  /**
   * Availability zone.
   *
   * @remarks
   * Valid values: 'NoPreference', '1', '2', '3'
   */
  readonly availabilityZone?: 'NoPreference' | '1' | '2' | '3';

  /**
   * Performance level.
   *
   * @remarks
   * Used for Data Warehouse. Example: 'DW100c'
   */
  readonly performanceLevel?: string;
}

// ============================================================================
// Firewall Rules
// ============================================================================

/**
 * Firewall rule properties.
 */
export interface FirewallRuleProperties {
  /**
   * Start IP address.
   *
   * @remarks
   * IPv4 format. Example: '0.0.0.0'
   */
  readonly startIpAddress: string;

  /**
   * End IP address.
   *
   * @remarks
   * IPv4 format. Example: '255.255.255.255'
   */
  readonly endIpAddress: string;
}

// ============================================================================
// Virtual Network Rules
// ============================================================================

/**
 * Virtual network rule properties.
 */
export interface VirtualNetworkRuleProperties {
  /**
   * Virtual network subnet resource ID.
   *
   * @remarks
   * Resource ID format: /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/virtualNetworks/{vnetName}/subnets/{subnetName}
   */
  readonly virtualNetworkSubnetId: string;

  /**
   * Whether to ignore missing service endpoint.
   */
  readonly ignoreMissingVnetServiceEndpoint?: boolean;

  /**
   * Virtual network rule state.
   *
   * @remarks
   * Read-only. Values: 'Initializing', 'InProgress', 'Ready', 'Deleting', 'Unknown'
   */
  readonly state?: string;
}

// ============================================================================
// Auditing Settings
// ============================================================================

/**
 * Auditing settings properties.
 */
export interface ServerBlobAuditingPolicyProperties {
  /**
   * Auditing state.
   *
   * @remarks
   * Valid values: 'Enabled', 'Disabled'
   */
  readonly state: 'Enabled' | 'Disabled';

  /**
   * Storage endpoint.
   *
   * @remarks
   * Example: 'https://mystorageaccount.blob.core.windows.net'
   */
  readonly storageEndpoint?: string;

  /**
   * Storage account access key.
   */
  readonly storageAccountAccessKey?: string;

  /**
   * Retention days.
   *
   * @remarks
   * Value: 0 (unlimited) to 3285 days
   */
  readonly retentionDays?: number;

  /**
   * Audit actions and groups.
   *
   * @remarks
   * Examples:
   * - 'SUCCESSFUL_DATABASE_AUTHENTICATION_GROUP'
   * - 'FAILED_DATABASE_AUTHENTICATION_GROUP'
   * - 'BATCH_COMPLETED_GROUP'
   */
  readonly auditActionsAndGroups?: string[];

  /**
   * Storage account subscription ID.
   */
  readonly storageAccountSubscriptionId?: string;

  /**
   * Whether to use storage account access key.
   */
  readonly isStorageSecondaryKeyInUse?: boolean;

  /**
   * Whether managed identity is used to access blob storage.
   */
  readonly isAzureMonitorTargetEnabled?: boolean;

  /**
   * Queue delay in milliseconds.
   */
  readonly queueDelayMs?: number;

  /**
   * Whether Devops audit is enabled.
   */
  readonly isDevopsAuditEnabled?: boolean;
}

// ============================================================================
// Threat Detection
// ============================================================================

/**
 * Security alert policy properties.
 */
export interface SecurityAlertPolicyProperties {
  /**
   * Security alert policy state.
   *
   * @remarks
   * Valid values: 'Enabled', 'Disabled'
   */
  readonly state: 'Enabled' | 'Disabled';

  /**
   * Disabled alerts.
   *
   * @remarks
   * Examples: 'Sql_Injection', 'Sql_Injection_Vulnerability', 'Access_Anomaly', 'Data_Exfiltration', 'Unsafe_Action'
   */
  readonly disabledAlerts?: string[];

  /**
   * Email addresses to send alerts.
   */
  readonly emailAddresses?: string[];

  /**
   * Whether to send alerts to account admins.
   */
  readonly emailAccountAdmins?: boolean;

  /**
   * Storage endpoint.
   */
  readonly storageEndpoint?: string;

  /**
   * Storage account access key.
   */
  readonly storageAccountAccessKey?: string;

  /**
   * Retention days.
   */
  readonly retentionDays?: number;
}

// ============================================================================
// Elastic Pools
// ============================================================================

/**
 * Elastic pool SKU.
 */
export interface ElasticPoolSku {
  /**
   * SKU name.
   *
   * @remarks
   * Examples: 'BasicPool', 'StandardPool', 'PremiumPool', 'GP_Gen5', 'BC_Gen5'
   */
  readonly name?: string;

  /**
   * SKU tier.
   *
   * @remarks
   * Valid values: 'Basic', 'Standard', 'Premium', 'GeneralPurpose', 'BusinessCritical'
   */
  readonly tier?: string;

  /**
   * Capacity (eDTUs or vCores).
   */
  readonly capacity?: number;

  /**
   * Family of hardware.
   */
  readonly family?: string;
}

/**
 * Per-database settings in elastic pool.
 */
export interface ElasticPoolPerDatabaseSettings {
  /**
   * Minimum capacity per database.
   */
  readonly minCapacity?: number;

  /**
   * Maximum capacity per database.
   */
  readonly maxCapacity?: number;
}

/**
 * Elastic pool properties.
 */
export interface ElasticPoolProperties {
  /**
   * Elastic pool state.
   *
   * @remarks
   * Read-only. Values: 'Creating', 'Ready', 'Disabled'
   */
  readonly state?: string;

  /**
   * Creation date.
   *
   * @remarks
   * Read-only. ISO 8601 format.
   */
  readonly creationDate?: string;

  /**
   * Maximum size in bytes.
   */
  readonly maxSizeBytes?: number;

  /**
   * Per-database settings.
   */
  readonly perDatabaseSettings?: ElasticPoolPerDatabaseSettings;

  /**
   * Whether or not pool is zone redundant.
   */
  readonly zoneRedundant?: boolean;

  /**
   * License type.
   */
  readonly licenseType?: 'LicenseIncluded' | 'BasePrice';

  /**
   * Maintenance configuration ID.
   */
  readonly maintenanceConfigurationId?: string;

  /**
   * High availability replica count.
   */
  readonly highAvailabilityReplicaCount?: number;

  /**
   * Minimal capacity.
   */
  readonly minCapacity?: number;

  /**
   * Availability zone.
   */
  readonly availabilityZone?: 'NoPreference' | '1' | '2' | '3';
}
