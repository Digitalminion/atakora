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
import type {
  ArmCosmosDBDatabaseProps,
  ICosmosDBDatabase,
} from './cosmos-db-database-types';
import { ThroughputMode } from './cosmos-db-database-types';

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
export class ArmCosmosDBDatabase extends Resource implements ICosmosDBDatabase {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2024-08-15';

  /**
   * Deployment scope.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * Parent account.
   */
  public readonly account: any;

  /**
   * Database name.
   */
  public readonly databaseName: string;

  /**
   * Resource name (same as databaseName).
   */
  public readonly name: string;

  /**
   * Throughput configuration.
   */
  private readonly throughput?: any;

  /**
   * Tags.
   */
  private readonly resourceTags?: Record<string, string>;

  /**
   * ARM resource ID.
   */
  public readonly resourceId: string;

  /**
   * Database ID (alias for resourceId).
   */
  public readonly databaseId: string;

  constructor(scope: Construct, id: string, props: ArmCosmosDBDatabaseProps) {
    super(scope, id);

    this.validateProps(props);

    this.account = props.account;
    this.databaseName = props.databaseName;
    this.name = props.databaseName;
    this.throughput = props.throughput;
    this.resourceTags = props.tags;

    this.resourceId = `${this.account.accountId}/sqlDatabases/${this.databaseName}`;
    this.databaseId = this.resourceId;
  }

  protected validateProps(props: ArmCosmosDBDatabaseProps): void {
    if (!props.databaseName || props.databaseName.trim() === '') {
      throw new Error('Database name cannot be empty');
    }

    if (props.databaseName.length < 1 || props.databaseName.length > 255) {
      throw new Error('Database name must be between 1 and 255 characters');
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
    const properties: any = {
      resource: {
        id: this.databaseName,
      },
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
      name: `${this.account.databaseAccountName}/${this.databaseName}`,
      properties,
      dependsOn: [this.account.accountId],
      ...(this.resourceTags && Object.keys(this.resourceTags).length > 0 && { tags: this.resourceTags }),
    } as ArmResource;
  }
}
