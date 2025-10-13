/**
 * L2 construct for Cosmos DB SQL Database with intent-based API.
 *
 * @remarks
 * Higher-level construct with sensible defaults for Cosmos DB SQL databases.
 *
 * @packageDocumentation
 */

import { Construct } from '@atakora/cdk';
import { constructIdToPurpose, IGrantable, IGrantResult, WellKnownRoleIds } from '@atakora/lib';
import { ArmCosmosDBDatabase } from './cosmos-db-database-arm';
import type {
  CosmosDBDatabaseProps,
  ICosmosDBDatabase,
  ThroughputConfig,
} from './cosmos-db-database-types';
import { ThroughputMode } from './cosmos-db-database-types';

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
export class CosmosDBDatabase extends Construct implements ICosmosDBDatabase {
  /**
   * Counter for generating unique grant IDs
   */
  private grantCounter = 0;

  private readonly armDatabase: ArmCosmosDBDatabase;

  /**
   * Database name.
   */
  public readonly databaseName: string;

  /**
   * Resource ID of the database.
   */
  public readonly databaseId: string;

  /**
   * Parent account.
   */
  public readonly account: any;

  constructor(scope: Construct, id: string, props: CosmosDBDatabaseProps) {
    super(scope, id);

    this.account = props.account;
    this.databaseName = props.databaseName ?? this.generateDatabaseName(id);

    // Build throughput configuration
    const throughput = this.buildThroughputConfig(props);

    this.armDatabase = new ArmCosmosDBDatabase(scope, `${id}-Resource`, {
      account: props.account,
      databaseName: this.databaseName,
      throughput,
      tags: props.tags,
    });

    this.databaseId = this.armDatabase.databaseId;
  }

  /**
   * Generates a database name from construct ID.
   *
   * @param id - Construct ID
   * @returns Sanitized database name
   */
  private generateDatabaseName(id: string): string {
    const purpose = constructIdToPurpose(id, 'database', ['db']) || id.toLowerCase();
    return purpose.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
  }

  /**
   * Builds throughput configuration from props.
   *
   * @param props - Database props
   * @returns Throughput config or undefined
   */
  private buildThroughputConfig(props: CosmosDBDatabaseProps): ThroughputConfig | undefined {
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

    // No throughput specified - containers will have their own
    return undefined;
  }

  /**
   * Import an existing Cosmos DB database by its resource ID.
   *
   * @param scope - The parent construct
   * @param id - The construct ID
   * @param databaseId - The full resource ID of the database
   * @returns An ICosmosDBDatabase reference
   */
  public static fromDatabaseId(
    scope: Construct,
    id: string,
    databaseId: string,
    account: any
  ): ICosmosDBDatabase {
    class Import extends Construct implements ICosmosDBDatabase {
      public readonly databaseId = databaseId;
      public readonly account = account;
      public readonly databaseName: string;

      constructor() {
        super(scope, id);

        // Parse database name from resource ID
        const match = databaseId.match(/\/sqlDatabases\/([^/]+)$/);
        if (!match) {
          throw new Error(
            `Invalid Cosmos DB database resource ID: ${databaseId}. ` +
              `Expected format: .../sqlDatabases/{databaseName}`
          );
        }
        this.databaseName = match[1];
      }
    }

    return new Import();
  }

  // ============================================================
  // Grant Methods
  // ============================================================

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
  public grantReadData(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.COSMOS_DB_DATA_READER,
      `Read data from database ${this.databaseName}`
    );
  }

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
  public grantWriteData(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.COSMOS_DB_DATA_CONTRIBUTOR,
      `Read and write data in database ${this.databaseName}`
    );
  }

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
  public grantFullAccess(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.COSMOS_DB_DATA_CONTRIBUTOR,
      `Full access to database ${this.databaseName}`
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
      scope: this.databaseId,
      roleDefinitionId,
      principalId: grantable.principalId,
      principalType: grantable.principalType,
      tenantId: grantable.tenantId,
      description,
    });

    return new GrantResult(roleAssignment, roleDefinitionId, grantable, this.databaseId);
  }
}
