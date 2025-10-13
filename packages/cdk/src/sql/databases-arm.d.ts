import { Construct, Resource, DeploymentScope } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { ArmDatabasesProps, DatabaseSku } from './database-types';
/**
 * L1 construct for Azure SQL Database.
 *
 * @remarks
 * Direct mapping to Microsoft.Sql/servers/databases ARM resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.Sql/servers/databases`
 * **API Version**: `2021-11-01`
 * **Deployment Scope**: ResourceGroup
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * auto-naming and defaults, use the {@link Databases} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmDatabases, DatabaseSkuTier } from '@atakora/cdk/sql';
 *
 * const database = new ArmDatabases(resourceGroup, 'Database', {
 *   serverName: 'sql-authr-001',
 *   databaseName: 'mydb',
 *   location: 'eastus',
 *   sku: {
 *     tier: DatabaseSkuTier.STANDARD,
 *     capacity: 10
 *   }
 * });
 * ```
 */
export declare class ArmDatabases extends Resource {
    /**
     * ARM resource type.
     */
    readonly resourceType: string;
    /**
     * API version for the resource.
     */
    readonly apiVersion: string;
    /**
     * Deployment scope for SQL databases.
     */
    readonly scope: DeploymentScope.ResourceGroup;
    /**
     * Name of the parent SQL Server.
     */
    readonly serverName: string;
    /**
     * Name of the SQL Database.
     */
    readonly databaseName: string;
    /**
     * Resource name (same as databaseName).
     */
    readonly name: string;
    /**
     * Azure region where the SQL Database is located.
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
     */
    readonly collation?: string;
    /**
     * Tags applied to the SQL Database.
     */
    readonly tags: Record<string, string>;
    /**
     * ARM resource ID.
     *
     * @remarks
     * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Sql/servers/{serverName}/databases/{databaseName}`
     */
    readonly resourceId: string;
    /**
     * SQL Database resource ID (alias for resourceId).
     */
    readonly databaseId: string;
    /**
     * Creates a new ArmDatabases construct.
     *
     * @param scope - Parent construct (typically a ResourceGroup)
     * @param id - Unique identifier for this construct within the parent scope
     * @param props - SQL Database properties
     *
     * @throws {Error} If databaseName is invalid
     * @throws {Error} If serverName or location is empty
     */
    constructor(scope: Construct, id: string, props: ArmDatabasesProps);
    /**
     * Validates SQL Database properties against ARM constraints.
     *
     * @param props - Properties to validate
     * @throws {Error} If validation fails
     */
    protected validateProps(props: ArmDatabasesProps): void;
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
//# sourceMappingURL=databases-arm.d.ts.map