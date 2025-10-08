import { Construct } from '../../core/construct';
import type { IResourceGroup } from '../resource-group/types';
import { ArmSqlServer } from './arm-sql-server';
import type { SqlServerProps, ISqlServer, SqlServerVersion, PublicNetworkAccess } from './types';

/**
 * L2 construct for Azure SQL Server.
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-naming.
 * Provides developer-friendly experience with minimal required configuration.
 *
 * **Features**:
 * - Auto-generates SQL Server name
 * - Defaults location to parent resource group's location
 * - Merges tags with parent tags
 * - Secure defaults: version 12.0, TLS 1.2, public network disabled
 *
 * **ARM Resource Type**: `Microsoft.Sql/servers`
 * **API Version**: `2021-11-01`
 * **Deployment Scope**: ResourceGroup
 *
 * @example
 * Minimal usage (auto-generates name):
 * ```typescript
 * import { SqlServer } from '@atakora/lib';
 *
 * const sqlServer = new SqlServer(resourceGroup, 'Database', {
 *   administratorLogin: 'sqladmin',
 *   administratorLoginPassword: 'P@ssw0rd123!'
 * });
 * ```
 *
 * @example
 * With custom properties:
 * ```typescript
 * const sqlServer = new SqlServer(resourceGroup, 'Database', {
 *   serverName: 'sql-myapp-001',
 *   administratorLogin: 'sqladmin',
 *   administratorLoginPassword: 'P@ssw0rd123!',
 *   publicNetworkAccess: PublicNetworkAccess.ENABLED
 * });
 * ```
 */
export class SqlServer extends Construct implements ISqlServer {
  /**
   * Import an existing SQL Server by its resource ID.
   *
   * @param scope - Parent construct
   * @param id - Unique identifier for this construct
   * @param serverId - Full resource ID of the SQL Server
   * @returns SQL Server reference
   *
   * @example
   * ```typescript
   * const sqlServer = SqlServer.fromServerId(
   *   scope,
   *   'ImportedSqlServer',
   *   '/subscriptions/12345678-1234-1234-1234-123456789abc/resourceGroups/my-rg/providers/Microsoft.Sql/servers/my-sql-server'
   * );
   * ```
   */
  static fromServerId(scope: Construct, id: string, serverId: string): ISqlServer {
    // Parse the resource ID to extract server name and location
    // Format: /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Sql/servers/{serverName}
    const parts = serverId.split('/');
    const serverName = parts[parts.length - 1];

    return {
      serverName,
      location: 'unknown', // Location cannot be determined from resource ID alone
      serverId,
    };
  }

  /**
   * Underlying L1 construct.
   */
  private readonly armSqlServer: ArmSqlServer;

  /**
   * Parent resource group.
   */
  private readonly parentResourceGroup: IResourceGroup;

  /**
   * Name of the SQL Server.
   */
  public readonly serverName: string;

  /**
   * Location of the SQL Server.
   */
  public readonly location: string;

  /**
   * Resource group name where the SQL Server is deployed.
   */
  public readonly resourceGroupName: string;

  /**
   * Resource ID of the SQL Server.
   */
  public readonly serverId: string;

  /**
   * Tags applied to the SQL Server (merged with parent tags).
   */
  public readonly tags: Record<string, string>;

  /**
   * SQL Server version.
   */
  public readonly version: SqlServerVersion;

  /**
   * Creates a new SqlServer construct.
   *
   * @param scope - Parent construct (must be or contain a ResourceGroup)
   * @param id - Unique identifier for this construct
   * @param props - SQL Server properties
   *
   * @throws {Error} If scope does not contain a ResourceGroup
   * @throws {Error} If administratorLogin or administratorLoginPassword is not provided
   *
   * @example
   * ```typescript
   * const sqlServer = new SqlServer(resourceGroup, 'Database', {
   *   administratorLogin: 'sqladmin',
   *   administratorLoginPassword: 'SecureP@ssw0rd!',
   *   tags: { purpose: 'application-database' }
   * });
   * ```
   */
  constructor(scope: Construct, id: string, props: SqlServerProps) {
    super(scope, id);

    // Get parent resource group
    this.parentResourceGroup = this.getParentResourceGroup(scope);

    // Auto-generate or use provided server name
    this.serverName = this.resolveServerName(id, props);

    // Default location to resource group's location or use provided
    this.location = props.location ?? this.parentResourceGroup.location;

    // Set resource group name
    this.resourceGroupName = this.parentResourceGroup.resourceGroupName;

    // Default version to 12.0
    this.version = props.version ?? ('12.0' as SqlServerVersion);

    // Merge tags with parent
    this.tags = {
      ...this.getParentTags(scope),
      ...props.tags,
    };

    // Create underlying L1 resource
    this.armSqlServer = new ArmSqlServer(scope, `${id}-Resource`, {
      serverName: this.serverName,
      location: this.location,
      administratorLogin: props.administratorLogin,
      administratorLoginPassword: props.administratorLoginPassword,
      version: this.version,
      publicNetworkAccess: props.publicNetworkAccess ?? ('Disabled' as PublicNetworkAccess),
      minimalTlsVersion: props.minimalTlsVersion ?? '1.2',
      tags: this.tags,
    });

    // Get resource ID from L1
    this.serverId = this.armSqlServer.serverId;
  }

  /**
   * Gets the parent ResourceGroup from the construct tree.
   *
   * @param scope - Parent construct
   * @returns The resource group interface
   * @throws {Error} If parent is not or doesn't contain a ResourceGroup
   */
  private getParentResourceGroup(scope: Construct): IResourceGroup {
    // Walk up the construct tree to find ResourceGroup
    let current: Construct | undefined = scope;

    while (current) {
      // Check if current implements IResourceGroup interface
      if (this.isResourceGroup(current)) {
        return current as IResourceGroup;
      }
      current = current.node.scope;
    }

    throw new Error(
      'SqlServer must be created within or under a ResourceGroup. ' +
        'Ensure the parent scope is a ResourceGroup or has one in its hierarchy.'
    );
  }

  /**
   * Checks if a construct implements IResourceGroup interface using duck typing.
   *
   * @param construct - Construct to check
   * @returns True if construct has ResourceGroup properties
   */
  private isResourceGroup(construct: any): construct is IResourceGroup {
    return (
      construct &&
      typeof construct.resourceGroupName === 'string' &&
      typeof construct.location === 'string'
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
   * Resolves the SQL Server name from props or auto-generates it.
   *
   * @param id - Construct ID
   * @param props - SQL Server properties
   * @returns Resolved SQL Server name
   *
   * @remarks
   * SQL Server names have special constraints:
   * - 1-63 characters
   * - Lowercase letters, numbers, and hyphens
   * - Cannot start or end with hyphen
   * - Globally unique across Azure
   */
  private resolveServerName(id: string, props: SqlServerProps): string {
    // If name provided explicitly, use it
    if (props.serverName) {
      return props.serverName;
    }

    // Auto-generate name using parent's naming context
    const subscriptionStack = this.getSubscriptionStack();
    if (subscriptionStack) {
      const purpose = this.constructIdToPurpose(id);
      // Use 'sql' prefix for SQL Server
      return subscriptionStack.generateResourceName('sql', purpose);
    }

    // Fallback: construct a basic name from ID
    return `sql-${id.toLowerCase()}`;
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
