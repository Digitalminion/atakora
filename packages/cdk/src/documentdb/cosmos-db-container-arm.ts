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
import type {
  ArmCosmosDBContainerProps,
  ICosmosDBContainer,
} from './cosmos-db-container-types';
import { PartitionKeyVersion } from './cosmos-db-container-types';
import { ThroughputMode } from './cosmos-db-database-types';

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
export class ArmCosmosDBContainer extends Resource implements ICosmosDBContainer {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2024-08-15';

  /**
   * Deployment scope.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * Parent database.
   */
  public readonly database: any;

  /**
   * Container name.
   */
  public readonly containerName: string;

  /**
   * Resource name (same as containerName).
   */
  public readonly name: string;

  /**
   * Partition key path.
   */
  private readonly partitionKeyPath: string;

  /**
   * Partition key version.
   */
  private readonly partitionKeyVersion?: PartitionKeyVersion;

  /**
   * Partition key paths (hierarchical).
   */
  private readonly partitionKeyPaths?: string[];

  /**
   * Indexing policy.
   */
  private readonly indexingPolicy?: any;

  /**
   * Throughput configuration.
   */
  private readonly throughput?: any;

  /**
   * Unique key policy.
   */
  private readonly uniqueKeyPolicy?: any;

  /**
   * Conflict resolution policy.
   */
  private readonly conflictResolutionPolicy?: any;

  /**
   * Default TTL.
   */
  private readonly defaultTtl?: number;

  /**
   * Analytical storage TTL.
   */
  private readonly analyticalStorageTtl?: number;

  /**
   * Tags.
   */
  private readonly resourceTags?: Record<string, string>;

  /**
   * ARM resource ID.
   */
  public readonly resourceId: string;

  /**
   * Container ID (alias for resourceId).
   */
  public readonly containerId: string;

  constructor(scope: Construct, id: string, props: ArmCosmosDBContainerProps) {
    super(scope, id);

    this.validateProps(props);

    this.database = props.database;
    this.containerName = props.containerName;
    this.name = props.containerName;
    this.partitionKeyPath = props.partitionKeyPath;
    this.partitionKeyVersion = props.partitionKeyVersion;
    this.partitionKeyPaths = props.partitionKeyPaths;
    this.indexingPolicy = props.indexingPolicy;
    this.throughput = props.throughput;
    this.uniqueKeyPolicy = props.uniqueKeyPolicy;
    this.conflictResolutionPolicy = props.conflictResolutionPolicy;
    this.defaultTtl = props.defaultTtl;
    this.analyticalStorageTtl = props.analyticalStorageTtl;
    this.resourceTags = props.tags;

    this.resourceId = `${this.database.databaseId}/containers/${this.containerName}`;
    this.containerId = this.resourceId;
  }

  protected validateProps(props: ArmCosmosDBContainerProps): void {
    if (!props.containerName || props.containerName.trim() === '') {
      throw new Error('Container name cannot be empty');
    }

    if (props.containerName.length < 1 || props.containerName.length > 255) {
      throw new Error('Container name must be between 1 and 255 characters');
    }

    if (!props.partitionKeyPath || props.partitionKeyPath.trim() === '') {
      throw new Error('Partition key path cannot be empty');
    }

    // Validate partition key path format (must start with /)
    if (!props.partitionKeyPath.startsWith('/')) {
      throw new Error('Partition key path must start with /');
    }

    // Validate throughput configuration
    if (props.throughput) {
      if (props.throughput.mode === ThroughputMode.MANUAL) {
        if (props.throughput.throughput && props.throughput.throughput < 400) {
          throw new Error('Manual throughput must be at least 400 RU/s');
        }
        if (props.throughput.throughput && props.throughput.throughput % 100 !== 0) {
          throw new Error('Manual throughput must be in increments of 100 RU/s');
        }
      } else if (props.throughput.mode === ThroughputMode.AUTOSCALE) {
        if (props.throughput.maxThroughput && props.throughput.maxThroughput < 1000) {
          throw new Error('Autoscale max throughput must be at least 1000 RU/s');
        }
        if (props.throughput.maxThroughput && props.throughput.maxThroughput % 1000 !== 0) {
          throw new Error('Autoscale max throughput must be in increments of 1000 RU/s');
        }
      }
    }
  }

  public toArmTemplate(): ArmResource {
    const partitionKey: any = {
      paths: this.partitionKeyPaths || [this.partitionKeyPath],
    };

    if (this.partitionKeyVersion) {
      partitionKey.version = this.partitionKeyVersion;
    }

    const resource: any = {
      id: this.containerName,
      partitionKey,
    };

    // Add indexing policy if specified
    if (this.indexingPolicy) {
      resource.indexingPolicy = this.indexingPolicy;
    }

    // Add unique key policy if specified
    if (this.uniqueKeyPolicy) {
      resource.uniqueKeyPolicy = this.uniqueKeyPolicy;
    }

    // Add conflict resolution policy if specified
    if (this.conflictResolutionPolicy) {
      resource.conflictResolutionPolicy = this.conflictResolutionPolicy;
    }

    // Add default TTL if specified
    if (this.defaultTtl !== undefined) {
      resource.defaultTtl = this.defaultTtl;
    }

    // Add analytical storage TTL if specified
    if (this.analyticalStorageTtl !== undefined) {
      resource.analyticalStorageTtl = this.analyticalStorageTtl;
    }

    const properties: any = {
      resource,
    };

    // Add throughput options if specified
    if (this.throughput) {
      properties.options = {};

      if (this.throughput.mode === ThroughputMode.MANUAL && this.throughput.throughput) {
        properties.options.throughput = this.throughput.throughput;
      } else if (this.throughput.mode === ThroughputMode.AUTOSCALE && this.throughput.maxThroughput) {
        properties.options.autoscaleSettings = {
          maxThroughput: this.throughput.maxThroughput,
        };
      }
    }

    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: `${this.database.account.databaseAccountName}/${this.database.databaseName}/${this.containerName}`,
      properties,
      dependsOn: [this.database.databaseId],
      ...(this.resourceTags && Object.keys(this.resourceTags).length > 0 && { tags: this.resourceTags }),
    } as ArmResource;
  }
}
