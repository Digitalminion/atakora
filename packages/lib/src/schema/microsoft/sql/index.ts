/**
 * Azure SQL (Microsoft.Sql) schema module.
 *
 * @remarks
 * Centralized type definitions and enums for Azure SQL resources.
 *
 * @packageDocumentation
 */

// Export all enums
export { SqlServerVersion, PublicNetworkAccess, DatabaseSkuTier } from './enums';

// Export all types
export type {
  SqlServerIdentity,
  ServerExternalAdministrator,
  PrivateEndpointConnectionProperties,
  SqlServerProperties,
  DatabaseSku,
  AutoPauseDelay,
  BackupShortTermRetentionPolicy,
  BackupLongTermRetentionPolicy,
  TransparentDataEncryption,
  DatabaseReadScale,
  SecondaryType,
  DatabaseLicenseType,
  MaintenanceConfigurationId,
  DatabaseProperties,
  FirewallRuleProperties,
  VirtualNetworkRuleProperties,
  ServerBlobAuditingPolicyProperties,
  SecurityAlertPolicyProperties,
  ElasticPoolSku,
  ElasticPoolPerDatabaseSettings,
  ElasticPoolProperties,
} from './types';
