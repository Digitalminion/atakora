/**
 * Azure SQL resources
 *
 * This namespace contains constructs for Azure SQL Database resources:
 * - SQL Servers (Microsoft.Sql/servers)
 * - SQL Databases (Microsoft.Sql/servers/databases)
 *
 * @remarks
 * Import SQL resources from this namespace using:
 * ```typescript
 * import { ArmServers, ArmDatabases, SqlServerVersion } from '@atakora/cdk/sql';
 * ```
 *
 * ## ARM Resource Types
 *
 * - **SQL Server**: `Microsoft.Sql/servers`
 * - **SQL Database**: `Microsoft.Sql/servers/databases` (child resource)
 *
 * ## Usage Example
 *
 * ```typescript
 * import { App, ResourceGroupStack } from '@atakora/cdk';
 * import { ArmServers, ArmDatabases, SqlServerVersion, DatabaseSkuTier, PublicNetworkAccess } from '@atakora/cdk/sql';
 *
 * const app = new App();
 * const stack = new ResourceGroupStack(app, 'MyStack', {
 *   resourceGroupName: 'rg-myapp-prod',
 *   location: 'eastus'
 * });
 *
 * // Create SQL Server
 * const sqlServer = new ArmServers(stack, 'SqlServer', {
 *   serverName: 'sql-myapp-prod-001',
 *   location: 'eastus',
 *   administratorLogin: 'sqladmin',
 *   administratorLoginPassword: 'P@ssw0rd123!',
 *   version: SqlServerVersion.V12_0,
 *   publicNetworkAccess: PublicNetworkAccess.DISABLED
 * });
 *
 * // Create SQL Database (child resource of SQL Server)
 * const database = new ArmDatabases(stack, 'Database', {
 *   serverName: sqlServer.serverName,
 *   databaseName: 'myapp-db',
 *   location: 'eastus',
 *   sku: {
 *     tier: DatabaseSkuTier.STANDARD,
 *     capacity: 10
 *   }
 * });
 *
 * app.synth();
 * ```
 *
 * @packageDocumentation
 */

// ============================================================================
// SQL SERVER EXPORTS
// ============================================================================

/**
 * SQL Server L1 construct
 */
export { ArmServers } from './servers-arm';

/**
 * SQL Server types and interfaces
 */
export type {
  ArmServersProps,
  ServersProps,
  IServers,
} from './server-types';

/**
 * SQL Server enums
 */
export {
  SqlServerVersion,
  PublicNetworkAccess,
} from './server-types';

// ============================================================================
// SQL DATABASE EXPORTS
// ============================================================================

/**
 * SQL Database L1 construct
 */
export { ArmDatabases } from './databases-arm';

/**
 * SQL Database types and interfaces
 */
export type {
  ArmDatabasesProps,
  DatabasesProps,
  IDatabases,
  DatabaseSku,
} from './database-types';

/**
 * SQL Database enums
 */
export {
  DatabaseSkuTier,
} from './database-types';
