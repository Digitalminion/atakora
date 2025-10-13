/**
 * L2 construct for Cosmos DB SQL Container with intent-based API.
 *
 * @remarks
 * Higher-level construct with sensible defaults for Cosmos DB SQL containers.
 *
 * @packageDocumentation
 */
import { Construct } from '@atakora/cdk';
import { IGrantable, IGrantResult } from '@atakora/lib';
import type { CosmosDBContainerProps, ICosmosDBContainer } from './cosmos-db-container-types';
/**
 * L2 construct for Cosmos DB SQL Container.
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 * Creates a SQL container within a Cosmos DB database.
 *
 * @example
 * **Minimal usage:**
 * ```typescript
 * const container = new CosmosDBContainer(stack, 'Users', {
 *   database,
 *   partitionKeyPath: '/userId'
 * });
 * ```
 *
 * @example
 * **With throughput and indexing:**
 * ```typescript
 * const container = new CosmosDBContainer(stack, 'Products', {
 *   database,
 *   partitionKeyPath: '/categoryId',
 *   throughput: 400,
 *   indexingPolicy: {
 *     indexingMode: IndexingMode.CONSISTENT,
 *     automatic: true,
 *     includedPaths: [{ path: '/*' }],
 *     excludedPaths: [{ path: '/largeData/*' }]
 *   }
 * });
 * ```
 *
 * @example
 * **With composite indexes for sorting:**
 * ```typescript
 * const container = new CosmosDBContainer(stack, 'Orders', {
 *   database,
 *   partitionKeyPath: '/customerId',
 *   indexingPolicy: {
 *     compositeIndexes: [
 *       {
 *         paths: [
 *           { path: '/orderDate', order: 'descending' },
 *           { path: '/totalAmount', order: 'ascending' }
 *         ]
 *       }
 *     ]
 *   }
 * });
 * ```
 *
 * @example
 * **With TTL and unique keys:**
 * ```typescript
 * const container = new CosmosDBContainer(stack, 'Sessions', {
 *   database,
 *   partitionKeyPath: '/sessionId',
 *   defaultTtl: 3600, // 1 hour
 *   uniqueKeyPolicy: {
 *     uniqueKeys: [
 *       { paths: ['/email'] },
 *       { paths: ['/username'] }
 *     ]
 *   }
 * });
 * ```
 */
export declare class CosmosDBContainer extends Construct implements ICosmosDBContainer {
    /**
     * Counter for generating unique grant IDs
     */
    private grantCounter;
    private readonly armContainer;
    /**
     * Container name.
     */
    readonly containerName: string;
    /**
     * Resource ID of the container.
     */
    readonly containerId: string;
    /**
     * Parent database.
     */
    readonly database: any;
    constructor(scope: Construct, id: string, props: CosmosDBContainerProps);
    /**
     * Generates a container name from construct ID.
     *
     * @param id - Construct ID
     * @returns Sanitized container name
     */
    private generateContainerName;
    /**
     * Builds throughput configuration from props.
     *
     * @param props - Container props
     * @returns Throughput config or undefined
     */
    private buildThroughputConfig;
    /**
     * Import an existing Cosmos DB container by its resource ID.
     *
     * @param scope - The parent construct
     * @param id - The construct ID
     * @param containerId - The full resource ID of the container
     * @param database - The parent database
     * @returns An ICosmosDBContainer reference
     */
    static fromContainerId(scope: Construct, id: string, containerId: string, database: any): ICosmosDBContainer;
    /**
     * Grant read access to data in this container.
     *
     * @remarks
     * Allows reading all documents within this container.
     *
     * @param grantable - Identity to grant permissions to
     * @returns Grant result with the created role assignment
     *
     * @example
     * ```typescript
     * const functionApp = new FunctionApp(stack, 'Reader', {});
     * container.grantReadData(functionApp);
     * ```
     */
    grantReadData(grantable: IGrantable): IGrantResult;
    /**
     * Grant read and write access to data in this container.
     *
     * @remarks
     * Allows creating, reading, updating, and deleting documents in this container.
     *
     * @param grantable - Identity to grant permissions to
     * @returns Grant result with the created role assignment
     *
     * @example
     * ```typescript
     * const webApp = new WebApp(stack, 'App', {});
     * container.grantWriteData(webApp);
     * ```
     */
    grantWriteData(grantable: IGrantable): IGrantResult;
    /**
     * Grant delete access to data in this container.
     *
     * @remarks
     * Allows deleting documents in this container.
     * For full CRUD access, use grantWriteData or grantFullAccess instead.
     *
     * @param grantable - Identity to grant permissions to
     * @returns Grant result with the created role assignment
     *
     * @example
     * ```typescript
     * const cleanupJob = new FunctionApp(stack, 'Cleanup', {});
     * container.grantDelete(cleanupJob);
     * ```
     */
    grantDelete(grantable: IGrantable): IGrantResult;
    /**
     * Grant full access to this container.
     *
     * @remarks
     * Allows all operations on this container and its documents.
     *
     * @param grantable - Identity to grant permissions to
     * @returns Grant result with the created role assignment
     *
     * @example
     * ```typescript
     * const admin = new UserAssignedIdentity(stack, 'Admin', {});
     * container.grantFullAccess(admin);
     * ```
     */
    grantFullAccess(grantable: IGrantable): IGrantResult;
    /**
     * Internal helper to create role assignments for grant methods.
     */
    protected grant(grantable: IGrantable, roleDefinitionId: string, description?: string): IGrantResult;
}
//# sourceMappingURL=cosmos-db-container.d.ts.map