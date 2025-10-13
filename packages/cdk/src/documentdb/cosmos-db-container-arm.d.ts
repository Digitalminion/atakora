/**
 * L1 (ARM) construct for Cosmos DB SQL Container.
 *
 * @remarks
 * Direct ARM resource mapping for Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers.
 *
 * @packageDocumentation
 */
import { Resource, Construct, DeploymentScope } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { ArmCosmosDBContainerProps, ICosmosDBContainer } from './cosmos-db-container-types';
/**
 * L1 construct for Cosmos DB SQL Container.
 *
 * @remarks
 * Direct mapping to Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers ARM resource.
 * This is a child resource of Cosmos DB database.
 *
 * **ARM Resource Type**: `Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers`
 * **API Version**: `2024-08-15`
 * **Deployment Scope**: ResourceGroup (as child resource)
 */
export declare class ArmCosmosDBContainer extends Resource implements ICosmosDBContainer {
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
     * Parent database.
     */
    readonly database: any;
    /**
     * Container name.
     */
    readonly containerName: string;
    /**
     * Resource name (same as containerName).
     */
    readonly name: string;
    /**
     * Partition key path.
     */
    private readonly partitionKeyPath;
    /**
     * Partition key version.
     */
    private readonly partitionKeyVersion?;
    /**
     * Partition key paths (hierarchical).
     */
    private readonly partitionKeyPaths?;
    /**
     * Indexing policy.
     */
    private readonly indexingPolicy?;
    /**
     * Throughput configuration.
     */
    private readonly throughput?;
    /**
     * Unique key policy.
     */
    private readonly uniqueKeyPolicy?;
    /**
     * Conflict resolution policy.
     */
    private readonly conflictResolutionPolicy?;
    /**
     * Default TTL.
     */
    private readonly defaultTtl?;
    /**
     * Analytical storage TTL.
     */
    private readonly analyticalStorageTtl?;
    /**
     * Tags.
     */
    private readonly resourceTags?;
    /**
     * ARM resource ID.
     */
    readonly resourceId: string;
    /**
     * Container ID (alias for resourceId).
     */
    readonly containerId: string;
    constructor(scope: Construct, id: string, props: ArmCosmosDBContainerProps);
    protected validateProps(props: ArmCosmosDBContainerProps): void;
    toArmTemplate(): ArmResource;
}
//# sourceMappingURL=cosmos-db-container-arm.d.ts.map