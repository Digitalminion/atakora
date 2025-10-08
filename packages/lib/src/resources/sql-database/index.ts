/**
 * SQL Database constructs and types.
 *
 * @remarks
 * Provides L1 and L2 constructs for Azure SQL Server and SQL Database resources.
 *
 * @packageDocumentation
 */

// Type definitions
export type {
  ArmSqlServerProps,
  SqlServerProps,
  ISqlServer,
  ArmSqlDatabaseProps,
  SqlDatabaseProps,
  ISqlDatabase,
  DatabaseSku,
} from './types';

// Enums
export { SqlServerVersion, DatabaseSkuTier, PublicNetworkAccess } from './types';

// L1 constructs
export { ArmSqlServer } from './arm-sql-server';
export { ArmSqlDatabase } from './arm-sql-database';

// L2 constructs
export { SqlServer } from './sql-server';
export { SqlDatabase } from './sql-database';
