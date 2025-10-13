import { Construct, Resource, DeploymentScope } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { ArmServersProps, SqlServerVersion, PublicNetworkAccess } from './server-types';
/**
 * L1 construct for Azure SQL Server.
 *
 * @remarks
 * Direct mapping to Microsoft.Sql/servers ARM resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.Sql/servers`
 * **API Version**: `2021-11-01`
 * **Deployment Scope**: ResourceGroup
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * auto-naming and defaults, use the {@link Servers} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmServers, SqlServerVersion, PublicNetworkAccess } from '@atakora/cdk/sql';
 *
 * const sqlServer = new ArmServers(resourceGroup, 'SqlServer', {
 *   serverName: 'sql-authr-001',
 *   location: 'eastus',
 *   administratorLogin: 'sqladmin',
 *   administratorLoginPassword: 'P@ssw0rd123!',
 *   version: SqlServerVersion.V12_0,
 *   publicNetworkAccess: PublicNetworkAccess.DISABLED
 * });
 * ```
 */
export declare class ArmServers extends Resource {
    /**
     * ARM resource type.
     */
    readonly resourceType: string;
    /**
     * API version for the resource.
     */
    readonly apiVersion: string;
    /**
     * Deployment scope for SQL servers.
     */
    readonly scope: DeploymentScope.ResourceGroup;
    /**
     * Name of the SQL Server.
     */
    readonly serverName: string;
    /**
     * Resource name (same as serverName).
     */
    readonly name: string;
    /**
     * Azure region where the SQL Server is located.
     */
    readonly location: string;
    /**
     * Administrator login name.
     */
    readonly administratorLogin: string;
    /**
     * Administrator login password.
     */
    readonly administratorLoginPassword: string;
    /**
     * SQL Server version.
     */
    readonly version?: SqlServerVersion;
    /**
     * Public network access setting.
     */
    readonly publicNetworkAccess?: PublicNetworkAccess;
    /**
     * Minimal TLS version.
     */
    readonly minimalTlsVersion?: string;
    /**
     * Tags applied to the SQL Server.
     */
    readonly tags: Record<string, string>;
    /**
     * ARM resource ID.
     *
     * @remarks
     * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Sql/servers/{serverName}`
     */
    readonly resourceId: string;
    /**
     * SQL Server resource ID (alias for resourceId).
     */
    readonly serverId: string;
    /**
     * Creates a new ArmServers construct.
     *
     * @param scope - Parent construct (typically a ResourceGroup)
     * @param id - Unique identifier for this construct within the parent scope
     * @param props - SQL Server properties
     *
     * @throws {Error} If serverName is invalid
     * @throws {Error} If location is empty
     * @throws {Error} If administratorLogin or administratorLoginPassword is invalid
     */
    constructor(scope: Construct, id: string, props: ArmServersProps);
    /**
     * Validates SQL Server properties against ARM constraints.
     *
     * @param props - Properties to validate
     * @throws {Error} If validation fails
     */
    protected validateProps(props: ArmServersProps): void;
    /**
     * Generates ARM template representation of this resource.
     *
     * @remarks
     * Called during synthesis to produce the ARM template JSON.
     * This will be implemented by Grace's synthesis pipeline.
     *
     * @returns ARM template resource object
     */
    toArmTemplate(): ArmResource;
}
//# sourceMappingURL=servers-arm.d.ts.map