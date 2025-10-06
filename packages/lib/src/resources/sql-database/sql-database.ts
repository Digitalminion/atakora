import { Construct } from '../../core/construct';
import { ArmSqlDatabase } from './arm-sql-database';
import type {
  SqlDatabaseProps,
  ISqlDatabase,
  ISqlServer,
  DatabaseSkuTier,
  DatabaseSku,
} from './types';

/**
 * L2 construct for Azure SQL Database.
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-naming.
 * Provides developer-friendly experience with minimal required configuration.
 *
 * **Features**:
 * - Auto-generates database name
 * - Defaults location to parent SQL Server's location
 * - Merges tags with parent tags
 * - Defaults collation to SQL_Latin1_General_CP1_CI_AS
 * - Supports both simplified tier and full SKU configuration
 *
 * **ARM Resource Type**: `Microsoft.Sql/servers/databases`
 * **API Version**: `2021-11-01`
 * **Deployment Scope**: ResourceGroup
 *
 * @example
 * Minimal usage (auto-generates name):
 * ```typescript
 * import { SqlDatabase } from '@atakora/lib';
 *
 * const database = new SqlDatabase(sqlServer, 'AppDatabase');
 * ```
 *
 * @example
 * With custom properties:
 * ```typescript
 * const database = new SqlDatabase(sqlServer, 'AppDatabase', {
 *   databaseName: 'myapp-db',
 *   sku: DatabaseSkuTier.STANDARD,
 *   maxSizeBytes: 268435456000 // 250 GB
 * });
 * ```
 */
export class SqlDatabase extends Construct implements ISqlDatabase {
  /**
   * Import an existing SQL Database by its resource ID.
   *
   * @param scope - Parent construct
   * @param id - Unique identifier for this construct
   * @param databaseId - Full resource ID of the SQL Database
   * @returns SQL Database reference
   *
   * @example
   * ```typescript
   * const database = SqlDatabase.fromDatabaseId(
   *   scope,
   *   'ImportedDatabase',
   *   '/subscriptions/12345678-1234-1234-1234-123456789abc/resourceGroups/my-rg/providers/Microsoft.Sql/servers/my-sql-server/databases/my-db'
   * );
   * ```
   */
  static fromDatabaseId(scope: Construct, id: string, databaseId: string): ISqlDatabase {
    // Parse the resource ID to extract server name and database name
    // Format: /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Sql/servers/{serverName}/databases/{databaseName}
    const parts = databaseId.split('/');
    const databaseName = parts[parts.length - 1];
    const serverName = parts[parts.length - 3];

    return {
      databaseName,
      serverName,
      location: 'unknown', // Location cannot be determined from resource ID alone
      databaseId,
    };
  }

  /**
   * Underlying L1 construct.
   */
  private readonly armSqlDatabase: ArmSqlDatabase;

  /**
   * Parent SQL Server.
   */
  private readonly parentSqlServer: ISqlServer;

  /**
   * Name of the SQL Database.
   */
  public readonly databaseName: string;

  /**
   * Name of the parent SQL Server.
   */
  public readonly serverName: string;

  /**
   * Location of the SQL Database.
   */
  public readonly location: string;

  /**
   * Resource ID of the SQL Database.
   */
  public readonly databaseId: string;

  /**
   * Tags applied to the SQL Database (merged with parent tags).
   */
  public readonly tags: Record<string, string>;

  /**
   * Database SKU.
   */
  public readonly sku?: DatabaseSku;

  /**
   * Creates a new SqlDatabase construct.
   *
   * @param scope - Parent construct (must be or contain a SqlServer)
   * @param id - Unique identifier for this construct
   * @param props - Optional SQL Database properties
   *
   * @throws {Error} If scope does not contain a SqlServer
   *
   * @example
   * ```typescript
   * const database = new SqlDatabase(sqlServer, 'AppDatabase', {
   *   sku: DatabaseSkuTier.STANDARD,
   *   maxSizeBytes: 268435456000,
   *   tags: { purpose: 'application-data' }
   * });
   * ```
   */
  constructor(scope: Construct, id: string, props?: SqlDatabaseProps) {
    super(scope, id);

    // Get parent SQL Server
    this.parentSqlServer = this.getParentSqlServer(scope);

    // Auto-generate or use provided database name
    this.databaseName = this.resolveDatabaseName(id, props);

    // Default location to SQL Server's location or use provided
    this.location = props?.location ?? this.parentSqlServer.location;

    // Set server name
    this.serverName = this.parentSqlServer.serverName;

    // Resolve SKU configuration
    this.sku = this.resolveSku(props);

    // Merge tags with parent
    this.tags = {
      ...this.getParentTags(scope),
      ...props?.tags,
    };

    // Create underlying L1 resource
    this.armSqlDatabase = new ArmSqlDatabase(scope, `${id}-Resource`, {
      serverName: this.serverName,
      databaseName: this.databaseName,
      location: this.location,
      sku: this.sku,
      maxSizeBytes: props?.maxSizeBytes,
      collation: props?.collation ?? 'SQL_Latin1_General_CP1_CI_AS',
      tags: this.tags,
    });

    // Get resource ID from L1
    this.databaseId = this.armSqlDatabase.databaseId;
  }

  /**
   * Gets the parent SqlServer from the construct tree.
   *
   * @param scope - Parent construct
   * @returns The SQL Server interface
   * @throws {Error} If parent is not or doesn't contain a SqlServer
   */
  private getParentSqlServer(scope: Construct): ISqlServer {
    // Walk up the construct tree to find SqlServer
    let current: Construct | undefined = scope;

    while (current) {
      // Check if current implements ISqlServer interface
      if (this.isSqlServer(current)) {
        return current as ISqlServer;
      }
      current = current.node.scope;
    }

    throw new Error(
      'SqlDatabase must be created within or under a SqlServer. ' +
        'Ensure the parent scope is a SqlServer or has one in its hierarchy.'
    );
  }

  /**
   * Checks if a construct implements ISqlServer interface using duck typing.
   *
   * @param construct - Construct to check
   * @returns True if construct has SqlServer properties
   */
  private isSqlServer(construct: any): construct is ISqlServer {
    return (
      construct &&
      typeof construct.serverName === 'string' &&
      typeof construct.location === 'string' &&
      typeof construct.serverId === 'string'
    );
  }

  /**
   * Gets tags from parent construct hierarchy.
   *
   * @param scope - Parent construct
   * @returns Tags object (empty if no tags found)
   */
  private getParentTags(scope: Construct): Record<string, string> {
    // Try to get tags from parent
    const parent = scope as any;
    if (parent && typeof parent.tags === 'object') {
      return parent.tags;
    }
    return {};
  }

  /**
   * Resolves the SQL Database name from props or auto-generates it.
   *
   * @param id - Construct ID
   * @param props - SQL Database properties
   * @returns Resolved SQL Database name
   *
   * @remarks
   * SQL Database names have special constraints:
   * - 1-128 characters
   * - Can contain letters, numbers, hyphens, periods, and underscores
   * - Cannot end with period or hyphen
   */
  private resolveDatabaseName(id: string, props?: SqlDatabaseProps): string {
    // If name provided explicitly, use it
    if (props?.databaseName) {
      return props.databaseName;
    }

    // Auto-generate name using parent's naming context
    const subscriptionStack = this.getSubscriptionStack();
    if (subscriptionStack) {
      const purpose = this.constructIdToPurpose(id);
      // Use 'sqldb' prefix for SQL Database
      return subscriptionStack.generateResourceName('sqldb', purpose);
    }

    // Fallback: construct a basic name from ID
    return `sqldb-${id.toLowerCase()}`;
  }

  /**
   * Resolves the SKU configuration.
   *
   * @param props - SQL Database properties
   * @returns Resolved DatabaseSku or undefined
   *
   * @remarks
   * Supports both simplified tier string and full DatabaseSku object.
   */
  private resolveSku(props?: SqlDatabaseProps): DatabaseSku | undefined {
    if (!props?.sku) {
      return undefined;
    }

    // Check if sku is a string (DatabaseSkuTier enum) or object (DatabaseSku)
    if (typeof props.sku === 'string') {
      // Convert tier string to DatabaseSku object
      return {
        tier: props.sku as DatabaseSkuTier,
      };
    }

    // Already a DatabaseSku object
    return props.sku;
  }

  /**
   * Gets the SubscriptionStack from the construct tree.
   *
   * @returns SubscriptionStack or undefined if not found
   */
  private getSubscriptionStack(): any {
    let current: Construct | undefined = this.node.scope;

    while (current) {
      // Check if current is a SubscriptionStack using duck typing
      if (
        current &&
        typeof (current as any).generateResourceName === 'function' &&
        typeof (current as any).subscriptionId === 'string'
      ) {
        return current;
      }
      current = current.node.scope;
    }

    return undefined;
  }

  /**
   * Converts construct ID to purpose identifier for naming.
   *
   * @param id - Construct ID
   * @returns Purpose string for naming
   */
  private constructIdToPurpose(id: string): string {
    return id.toLowerCase();
  }
}
