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
export class CosmosDBTrigger {
  private databaseName?: string;
  private collectionName?: string;
  private connection?: string;
  private leaseCollectionName?: string;
  private createLeaseCollectionIfNotExists?: boolean;
  private preferredLocations?: string;
  private startFromBeginningFlag?: boolean;

  /**
   * Creates a new Cosmos DB trigger builder.
   *
   * @returns New CosmosDBTrigger builder instance
   */
  public static create(): CosmosDBTrigger {
    return new CosmosDBTrigger();
  }

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
  public withDatabaseName(databaseName: string): this {
    this.databaseName = databaseName;
    return this;
  }

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
  public withCollectionName(collectionName: string): this {
    this.collectionName = collectionName;
    return this;
  }

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
  public withConnection(connection: string): this {
    this.connection = connection;
    return this;
  }

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
  public withLeaseCollection(leaseCollectionName: string): this {
    this.leaseCollectionName = leaseCollectionName;
    return this;
  }

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
  public createLeaseCollectionIfNotExists(create: boolean = true): this {
    this.createLeaseCollectionIfNotExists = create;
    return this;
  }

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
  public withPreferredLocations(locations: string): this {
    this.preferredLocations = locations;
    return this;
  }

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
  public startFromBeginning(enable: boolean = true): this {
    this.startFromBeginningFlag = enable;
    return this;
  }

  /**
   * Builds the Cosmos DB trigger configuration.
   *
   * @returns Cosmos DB trigger configuration object
   *
   * @throws {Error} If required properties are not set
   */
  public build(): CosmosDBTriggerConfig {
    if (!this.databaseName) {
      throw new Error('Database name must be set for Cosmos DB trigger');
    }
    if (!this.collectionName) {
      throw new Error('Collection name must be set for Cosmos DB trigger');
    }
    if (!this.connection) {
      throw new Error('Connection must be set for Cosmos DB trigger');
    }

    return {
      type: 'cosmosDB',
      databaseName: this.databaseName,
      collectionName: this.collectionName,
      connection: this.connection,
      leaseCollectionName: this.leaseCollectionName,
      createLeaseCollectionIfNotExists: this.createLeaseCollectionIfNotExists,
      preferredLocations: this.preferredLocations,
      startFromBeginning: this.startFromBeginningFlag,
    };
  }
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
export function cosmosDBTrigger(
  databaseName: string,
  collectionName: string,
  connection: string,
  options: {
    leaseCollectionName?: string;
    createLeaseCollectionIfNotExists?: boolean;
    preferredLocations?: string;
    startFromBeginning?: boolean;
  } = {}
): CosmosDBTriggerConfig {
  return {
    type: 'cosmosDB',
    databaseName,
    collectionName,
    connection,
    leaseCollectionName: options.leaseCollectionName,
    createLeaseCollectionIfNotExists: options.createLeaseCollectionIfNotExists,
    preferredLocations: options.preferredLocations,
    startFromBeginning: options.startFromBeginning,
  };
}
