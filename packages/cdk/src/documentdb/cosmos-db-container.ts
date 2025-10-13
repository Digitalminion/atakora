/**
 * L2 construct for Cosmos DB SQL Container with intent-based API.
 *
 * @remarks
 * Higher-level construct with sensible defaults for Cosmos DB SQL containers.
 *
 * @packageDocumentation
 */

import { Construct } from '@atakora/cdk';
import { constructIdToPurpose, IGrantable, IGrantResult, WellKnownRoleIds } from '@atakora/lib';
import { ArmCosmosDBContainer } from './cosmos-db-container-arm';
import { ThroughputMode, type ThroughputConfig } from './cosmos-db-database-types';
import type {
  CosmosDBContainerProps,
  ICosmosDBContainer,
} from './cosmos-db-container-types';
import { PartitionKeyVersion } from './cosmos-db-container-types';

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
export class CosmosDBContainer extends Construct implements ICosmosDBContainer {
  /**
   * Counter for generating unique grant IDs
   */
  private grantCounter = 0;

  private readonly armContainer: ArmCosmosDBContainer;

  /**
   * Container name.
   */
  public readonly containerName: string;

  /**
   * Resource ID of the container.
   */
  public readonly containerId: string;

  /**
   * Parent database.
   */
  public readonly database: any;

  constructor(scope: Construct, id: string, props: CosmosDBContainerProps) {
    super(scope, id);

    this.database = props.database;
    this.containerName = props.containerName ?? this.generateContainerName(id);

    // Build throughput configuration
    const throughput = this.buildThroughputConfig(props);

    // Determine partition key version (default to V2)
    const partitionKeyVersion = props.partitionKeyVersion ?? PartitionKeyVersion.V2;

    this.armContainer = new ArmCosmosDBContainer(scope, `${id}-Resource`, {
      database: props.database,
      containerName: this.containerName,
      partitionKeyPath: props.partitionKeyPath,
      partitionKeyVersion,
      partitionKeyPaths: props.partitionKeyPaths,
      indexingPolicy: props.indexingPolicy,
      throughput,
      uniqueKeyPolicy: props.uniqueKeyPolicy,
      conflictResolutionPolicy: props.conflictResolutionPolicy,
      defaultTtl: props.defaultTtl,
      analyticalStorageTtl: props.analyticalStorageTtl,
      tags: props.tags,
    });

    this.containerId = this.armContainer.containerId;
  }

  /**
   * Generates a container name from construct ID.
   *
   * @param id - Construct ID
   * @returns Sanitized container name
   */
  private generateContainerName(id: string): string {
    const purpose = constructIdToPurpose(id, 'container', ['coll', 'collection']) || id.toLowerCase();
    return purpose.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
  }

  /**
   * Builds throughput configuration from props.
   *
   * @param props - Container props
   * @returns Throughput config or undefined
   */
  private buildThroughputConfig(props: CosmosDBContainerProps): ThroughputConfig | undefined {
    if (props.maxThroughput) {
      // Autoscale mode
      return {
        mode: ThroughputMode.AUTOSCALE,
        maxThroughput: props.maxThroughput,
      };
    } else if (props.throughput) {
      // Manual mode
      return {
        mode: ThroughputMode.MANUAL,
        throughput: props.throughput,
      };
    }

    // No throughput specified - inherits from database or must be specified
    return undefined;
  }

  /**
   * Import an existing Cosmos DB container by its resource ID.
   *
   * @param scope - The parent construct
   * @param id - The construct ID
   * @param containerId - The full resource ID of the container
   * @param database - The parent database
   * @returns An ICosmosDBContainer reference
   */
  public static fromContainerId(
    scope: Construct,
    id: string,
    containerId: string,
    database: any
  ): ICosmosDBContainer {
    class Import extends Construct implements ICosmosDBContainer {
      public readonly containerId = containerId;
      public readonly database = database;
      public readonly containerName: string;

      constructor() {
        super(scope, id);

        // Parse container name from resource ID
        const match = containerId.match(/\/containers\/([^/]+)$/);
        if (!match) {
          throw new Error(
            `Invalid Cosmos DB container resource ID: ${containerId}. ` +
              `Expected format: .../containers/{containerName}`
          );
        }
        this.containerName = match[1];
      }
    }

    return new Import();
  }

  // ============================================================
  // Grant Methods
  // ============================================================

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
  public grantReadData(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.COSMOS_DB_DATA_READER,
      `Read data from container ${this.containerName}`
    );
  }

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
  public grantWriteData(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.COSMOS_DB_DATA_CONTRIBUTOR,
      `Read and write data in container ${this.containerName}`
    );
  }

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
  public grantDelete(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.COSMOS_DB_DATA_CONTRIBUTOR,
      `Delete data from container ${this.containerName}`
    );
  }

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
  public grantFullAccess(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.COSMOS_DB_DATA_CONTRIBUTOR,
      `Full access to container ${this.containerName}`
    );
  }

  /**
   * Internal helper to create role assignments for grant methods.
   */
  protected grant(
    grantable: IGrantable,
    roleDefinitionId: string,
    description?: string
  ): IGrantResult {
    const RoleAssignment = require('@atakora/lib/authorization').RoleAssignment;
    const GrantResult = require('@atakora/lib/authorization').GrantResult;

    const roleAssignment = new RoleAssignment(this, `Grant${this.grantCounter++}`, {
      scope: this.containerId,
      roleDefinitionId,
      principalId: grantable.principalId,
      principalType: grantable.principalType,
      tenantId: grantable.tenantId,
      description,
    });

    return new GrantResult(roleAssignment, roleDefinitionId, grantable, this.containerId);
  }
}
