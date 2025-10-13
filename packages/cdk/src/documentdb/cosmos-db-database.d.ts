/**
 * L2 construct for Cosmos DB SQL Database with intent-based API.
 *
 * @remarks
 * Higher-level construct with sensible defaults for Cosmos DB SQL databases.
 *
 * @packageDocumentation
 */
import { Construct } from '@atakora/cdk';
import { IGrantable, IGrantResult } from '@atakora/lib';
import type { CosmosDBDatabaseProps, ICosmosDBDatabase } from './cosmos-db-database-types';
/**
 * L2 construct for Cosmos DB SQL Database.
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 * Creates a SQL database within a Cosmos DB account.
 *
 * @example
 * **Minimal usage (database-level throughput):**
 * ```typescript
 * const database = new CosmosDBDatabase(stack, 'Database', {
 *   account: cosmosAccount,
 *   throughput: 400 // Manual provisioned throughput
 * });
 * ```
 *
 * @example
 * **With autoscale throughput:**
 * ```typescript
 * const database = new CosmosDBDatabase(stack, 'Database', {
 *   account: cosmosAccount,
 *   maxThroughput: 4000 // Autoscale up to 4000 RU/s
 * });
 * ```
 *
 * @example
 * **Container-level throughput (no database throughput):**
 * ```typescript
 * const database = new CosmosDBDatabase(stack, 'Database', {
 *   account: cosmosAccount
 *   // No throughput specified - containers will have their own
 * });
 * ```
 */
export declare class CosmosDBDatabase extends Construct implements ICosmosDBDatabase {
    /**
     * Counter for generating unique grant IDs
     */
    private grantCounter;
    private readonly armDatabase;
    /**
     * Database name.
     */
    readonly databaseName: string;
    /**
     * Resource ID of the database.
     */
    readonly databaseId: string;
    /**
     * Parent account.
     */
    readonly account: any;
    constructor(scope: Construct, id: string, props: CosmosDBDatabaseProps);
    /**
     * Generates a database name from construct ID.
     *
     * @param id - Construct ID
     * @returns Sanitized database name
     */
    private generateDatabaseName;
    /**
     * Builds throughput configuration from props.
     *
     * @param props - Database props
     * @returns Throughput config or undefined
     */
    private buildThroughputConfig;
    /**
     * Import an existing Cosmos DB database by its resource ID.
     *
     * @param scope - The parent construct
     * @param id - The construct ID
     * @param databaseId - The full resource ID of the database
     * @returns An ICosmosDBDatabase reference
     */
    static fromDatabaseId(scope: Construct, id: string, databaseId: string, account: any): ICosmosDBDatabase;
    /**
     * Grant read access to data in this database.
     *
     * @remarks
     * Allows reading all documents and containers within this database.
     *
     * @param grantable - Identity to grant permissions to
     * @returns Grant result with the created role assignment
     *
     * @example
     * ```typescript
     * const functionApp = new FunctionApp(stack, 'Reader', {});
     * database.grantReadData(functionApp);
     * ```
     */
    grantReadData(grantable: IGrantable): IGrantResult;
    /**
     * Grant read and write access to data in this database.
     *
     * @remarks
     * Allows creating, reading, updating, and deleting documents in all containers
     * within this database.
     *
     * @param grantable - Identity to grant permissions to
     * @returns Grant result with the created role assignment
     *
     * @example
     * ```typescript
     * const webApp = new WebApp(stack, 'App', {});
     * database.grantWriteData(webApp);
     * ```
     */
    grantWriteData(grantable: IGrantable): IGrantResult;
    /**
     * Grant full access to this database (data and management).
     *
     * @remarks
     * Allows all operations on this database and its containers.
     *
     * @param grantable - Identity to grant permissions to
     * @returns Grant result with the created role assignment
     *
     * @example
     * ```typescript
     * const admin = new UserAssignedIdentity(stack, 'Admin', {});
     * database.grantFullAccess(admin);
     * ```
     */
    grantFullAccess(grantable: IGrantable): IGrantResult;
    /**
     * Internal helper to create role assignments for grant methods.
     */
    protected grant(grantable: IGrantable, roleDefinitionId: string, description?: string): IGrantResult;
}
//# sourceMappingURL=cosmos-db-database.d.ts.map