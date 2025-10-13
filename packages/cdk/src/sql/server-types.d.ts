/**
 * Type definitions for SQL Server constructs.
 *
 * @remarks
 * Types are re-exported from @atakora/lib/schema/sql for consistency.
 *
 * @packageDocumentation
 */
import { schema } from '@atakora/lib';
export declare const SqlServerVersion: typeof schema.sql.SqlServerVersion;
export declare const PublicNetworkAccess: typeof schema.sql.PublicNetworkAccess;
export type SqlServerVersion = typeof SqlServerVersion[keyof typeof SqlServerVersion];
export type PublicNetworkAccess = typeof PublicNetworkAccess[keyof typeof PublicNetworkAccess];
/**
 * Properties for ArmServers (L1 construct).
 *
 * @remarks
 * Direct mapping to Microsoft.Sql/servers ARM resource.
 * All properties are explicit with no defaults or auto-generation.
 *
 * ARM API Version: 2021-11-01
 *
 * @example
 * ```typescript
 * const props: ArmServersProps = {
 *   serverName: 'sql-authr-001',
 *   location: 'eastus',
 *   administratorLogin: 'sqladmin',
 *   administratorLoginPassword: 'P@ssw0rd123!',
 *   version: SqlServerVersion.V12_0,
 *   publicNetworkAccess: PublicNetworkAccess.DISABLED
 * };
 * ```
 */
export interface ArmServersProps {
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
 * Properties for Servers (L2 construct).
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 * Designed for developer productivity with minimal required properties.
 *
 * @example
 * ```typescript
 * // Minimal usage - auto-generates name and uses defaults
 * const sqlServer = new Servers(resourceGroup, 'Database', {
 *   administratorLogin: 'sqladmin',
 *   administratorLoginPassword: 'P@ssw0rd123!'
 * });
 *
 * // With custom properties
 * const sqlServer = new Servers(resourceGroup, 'Database', {
 *   serverName: 'sql-myapp-001',
 *   administratorLogin: 'sqladmin',
 *   administratorLoginPassword: 'P@ssw0rd123!',
 *   publicNetworkAccess: PublicNetworkAccess.ENABLED
 * });
 * ```
 */
export interface ServersProps {
    /**
     * SQL Server name.
     *
     * @remarks
     * If not provided, will be auto-generated using the stack's naming context.
     * - Format: `sql-{org}-{project}-{purpose}-{env}-{geo}-{instance}`
     * - Example: `sql-dp-authr-database-np-eus-01`
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
export interface IServers {
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
//# sourceMappingURL=server-types.d.ts.map