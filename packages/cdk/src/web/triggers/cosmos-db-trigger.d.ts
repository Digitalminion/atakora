/**
 * Cosmos DB trigger builder utilities for Azure Functions.
 *
 * @packageDocumentation
 */
import type { CosmosDBTriggerConfig } from '../function-app-types';
/**
 * Builder for creating Cosmos DB trigger configurations.
 *
 * @remarks
 * Provides a fluent API for building Cosmos DB change feed trigger configurations.
 *
 * @example
 * ```typescript
 * const trigger = CosmosDBTrigger.create()
 *   .withDatabaseName('mydb')
 *   .withCollectionName('orders')
 *   .withConnection('CosmosDBConnection')
 *   .withLeaseCollection('leases')
 *   .startFromBeginning()
 *   .build();
 * ```
 */
export declare class CosmosDBTrigger {
    private databaseName?;
    private collectionName?;
    private connection?;
    private leaseCollectionName?;
    private createLeaseCollectionIfNotExistsFlag?;
    private preferredLocations?;
    private startFromBeginningFlag?;
    /**
     * Creates a new Cosmos DB trigger builder.
     *
     * @returns New CosmosDBTrigger builder instance
     */
    static create(): CosmosDBTrigger;
    /**
     * Sets the database name.
     *
     * @param databaseName - Cosmos DB database name
     * @returns This builder for chaining
     *
     * @example
     * ```typescript
     * .withDatabaseName('mydb')
     * ```
     */
    withDatabaseName(databaseName: string): this;
    /**
     * Sets the collection (container) name to monitor.
     *
     * @param collectionName - Collection/container name
     * @returns This builder for chaining
     *
     * @example
     * ```typescript
     * .withCollectionName('orders')
     * ```
     */
    withCollectionName(collectionName: string): this;
    /**
     * Sets the Cosmos DB connection string app setting name.
     *
     * @param connection - App setting name containing the connection string
     * @returns This builder for chaining
     *
     * @example
     * ```typescript
     * .withConnection('CosmosDBConnection')
     * ```
     */
    withConnection(connection: string): this;
    /**
     * Sets the lease collection name.
     *
     * @param leaseCollectionName - Lease collection name
     * @returns This builder for chaining
     *
     * @remarks
     * Defaults to 'leases' if not specified.
     *
     * @example
     * ```typescript
     * .withLeaseCollection('function-leases')
     * ```
     */
    withLeaseCollection(leaseCollectionName: string): this;
    /**
     * Enables automatic creation of lease collection if it doesn't exist.
     *
     * @param create - True to auto-create
     * @returns This builder for chaining
     *
     * @example
     * ```typescript
     * .createLeaseCollectionIfNotExists(true)
     * ```
     */
    createLeaseCollectionIfNotExists(create?: boolean): this;
    /**
     * Sets preferred locations for geo-replicated accounts.
     *
     * @param locations - Comma-separated list of regions
     * @returns This builder for chaining
     *
     * @example
     * ```typescript
     * .withPreferredLocations('East US,West US')
     * ```
     */
    withPreferredLocations(locations: string): this;
    /**
     * Configures to start from the beginning of the change feed.
     *
     * @param enable - True to start from beginning
     * @returns This builder for chaining
     *
     * @remarks
     * By default, starts from current time.
     *
     * @example
     * ```typescript
     * .startFromBeginning()
     * ```
     */
    startFromBeginning(enable?: boolean): this;
    /**
     * Builds the Cosmos DB trigger configuration.
     *
     * @returns Cosmos DB trigger configuration object
     *
     * @throws {Error} If required properties are not set
     */
    build(): CosmosDBTriggerConfig;
}
/**
 * Helper function to create a Cosmos DB trigger configuration.
 *
 * @param databaseName - Database name
 * @param collectionName - Collection name
 * @param connection - Connection string app setting name
 * @param options - Optional configuration
 * @returns Complete Cosmos DB trigger configuration
 *
 * @example
 * ```typescript
 * const trigger = cosmosDBTrigger('mydb', 'orders', 'CosmosDBConnection', {
 *   leaseCollectionName: 'leases',
 *   startFromBeginning: true
 * });
 * ```
 */
export declare function cosmosDBTrigger(databaseName: string, collectionName: string, connection: string, options?: {
    leaseCollectionName?: string;
    createLeaseCollectionIfNotExists?: boolean;
    preferredLocations?: string;
    startFromBeginning?: boolean;
}): CosmosDBTriggerConfig;
//# sourceMappingURL=cosmos-db-trigger.d.ts.map