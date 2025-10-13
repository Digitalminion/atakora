/**
 * L1 (ARM) construct for Cosmos DB SQL Database.
 *
 * @remarks
 * Direct ARM resource mapping for Microsoft.DocumentDB/databaseAccounts/sqlDatabases.
 *
 * @packageDocumentation
 */
import { Resource, Construct, DeploymentScope } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { ArmCosmosDBDatabaseProps, ICosmosDBDatabase } from './cosmos-db-database-types';
/**
 * L1 construct for Cosmos DB SQL Database.
 *
 * @remarks
 * Direct mapping to Microsoft.DocumentDB/databaseAccounts/sqlDatabases ARM resource.
 * This is a child resource of Cosmos DB database account.
 *
 * **ARM Resource Type**: `Microsoft.DocumentDB/databaseAccounts/sqlDatabases`
 * **API Version**: `2024-08-15`
 * **Deployment Scope**: ResourceGroup (as child resource)
 */
export declare class ArmCosmosDBDatabase extends Resource implements ICosmosDBDatabase {
    /**
     * ARM resource type.
     */
    readonly resourceType: string;
    /**
     * API version for the resource.
     */
    readonly apiVersion: string;
    /**
     * Deployment scope.
     */
    readonly scope: DeploymentScope.ResourceGroup;
    /**
     * Parent account.
     */
    readonly account: any;
    /**
     * Database name.
     */
    readonly databaseName: string;
    /**
     * Resource name (same as databaseName).
     */
    readonly name: string;
    /**
     * Throughput configuration.
     */
    private readonly throughput?;
    /**
     * Tags.
     */
    private readonly resourceTags?;
    /**
     * ARM resource ID.
     */
    readonly resourceId: string;
    /**
     * Database ID (alias for resourceId).
     */
    readonly databaseId: string;
    constructor(scope: Construct, id: string, props: ArmCosmosDBDatabaseProps);
    protected validateProps(props: ArmCosmosDBDatabaseProps): void;
    toArmTemplate(): ArmResource;
}
//# sourceMappingURL=cosmos-db-database-arm.d.ts.map