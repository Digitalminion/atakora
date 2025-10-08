import { Construct } from '../../core/construct';
import { Resource } from '../../core/resource';
import { DeploymentScope } from '../../core/azure/scopes';
import type { ArmSqlDatabaseProps, DatabaseSku } from './types';

/**
 * L1 construct for Azure SQL Database.
 *
 * @remarks
 * Direct mapping to Microsoft.Sql/servers/databases ARM resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.Sql/servers/databases`
 * **API Version**: `2021-11-01`
 * **Deployment Scope**: ResourceGroup
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * auto-naming and defaults, use the {@link SqlDatabase} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmSqlDatabase, DatabaseSkuTier } from '@atakora/lib';
 *
 * const database = new ArmSqlDatabase(resourceGroup, 'Database', {
 *   serverName: 'sql-colorai-001',
 *   databaseName: 'mydb',
 *   location: 'eastus',
 *   sku: {
 *     tier: DatabaseSkuTier.STANDARD,
 *     capacity: 10
 *   }
 * });
 * ```
 */
export class ArmSqlDatabase extends Resource {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.Sql/servers/databases';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2021-11-01';

  /**
   * Deployment scope for SQL databases.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * Name of the parent SQL Server.
   */
  public readonly serverName: string;

  /**
   * Name of the SQL Database.
   */
  public readonly databaseName: string;

  /**
   * Resource name (same as databaseName).
   */
  public readonly name: string;

  /**
   * Azure region where the SQL Database is located.
   */
  public readonly location: string;

  /**
   * Database SKU configuration.
   */
  public readonly sku?: DatabaseSku;

  /**
   * Maximum size in bytes.
   */
  public readonly maxSizeBytes?: number;

  /**
   * Database collation.
   */
  public readonly collation?: string;

  /**
   * Tags applied to the SQL Database.
   */
  public readonly tags: Record<string, string>;

  /**
   * ARM resource ID.
   *
   * @remarks
   * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Sql/servers/{serverName}/databases/{databaseName}`
   */
  public readonly resourceId: string;

  /**
   * SQL Database resource ID (alias for resourceId).
   */
  public readonly databaseId: string;

  /**
   * Creates a new ArmSqlDatabase construct.
   *
   * @param scope - Parent construct (typically a ResourceGroup)
   * @param id - Unique identifier for this construct within the parent scope
   * @param props - SQL Database properties
   *
   * @throws {Error} If databaseName is invalid
   * @throws {Error} If serverName or location is empty
   */
  constructor(scope: Construct, id: string, props: ArmSqlDatabaseProps) {
    super(scope, id);

    // Validate required properties
    this.validateProps(props);

    // Set properties
    this.serverName = props.serverName;
    this.databaseName = props.databaseName;
    this.name = props.databaseName;
    this.location = props.location;
    this.sku = props.sku;
    this.maxSizeBytes = props.maxSizeBytes;
    this.collation = props.collation;
    this.tags = props.tags ?? {};

    // Construct resource ID
    this.resourceId = `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Sql/servers/${this.serverName}/databases/${this.databaseName}`;
    this.databaseId = this.resourceId;
  }

  /**
   * Validates SQL Database properties against ARM constraints.
   *
   * @param props - Properties to validate
   * @throws {Error} If validation fails
   */
  private validateProps(props: ArmSqlDatabaseProps): void {
    // Validate server name
    if (!props.serverName || props.serverName.trim() === '') {
      throw new Error('SQL Server name cannot be empty');
    }

    // Validate database name
    if (!props.databaseName || props.databaseName.trim() === '') {
      throw new Error('Database name cannot be empty');
    }

    if (props.databaseName.length < 1 || props.databaseName.length > 128) {
      throw new Error(`Database name must be 1-128 characters (got ${props.databaseName.length})`);
    }

    // Validate database name doesn't end with period or hyphen
    if (props.databaseName.endsWith('.') || props.databaseName.endsWith('-')) {
      throw new Error('Database name cannot end with period or hyphen');
    }

    // Validate location
    if (!props.location || props.location.trim() === '') {
      throw new Error('Location cannot be empty');
    }
  }

  /**
   * Generates ARM template representation of this resource.
   *
   * @remarks
   * Called during synthesis to produce the ARM template JSON.
   * This will be implemented by Grace's synthesis pipeline.
   *
   * @returns ARM template resource object
   */
  public toArmTemplate(): object {
    const properties: any = {};

    // Add optional properties
    if (this.maxSizeBytes !== undefined) {
      properties.maxSizeBytes = this.maxSizeBytes;
    }

    if (this.collation) {
      properties.collation = this.collation;
    }

    const template: any = {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: `${this.serverName}/${this.databaseName}`,
      location: this.location,
      dependsOn: [`[resourceId('Microsoft.Sql/servers', '${this.serverName}')]`],
    };

    // Add SKU if provided
    if (this.sku) {
      template.sku = {
        tier: this.sku.tier,
        ...(this.sku.capacity && { capacity: this.sku.capacity }),
      };
    }

    // Add properties if any exist
    if (Object.keys(properties).length > 0) {
      template.properties = properties;
    }

    // Add tags if present
    if (Object.keys(this.tags).length > 0) {
      template.tags = this.tags;
    }

    return template;
  }
}
