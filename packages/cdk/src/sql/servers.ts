/**
 * L2 construct for Azure SQL Server with grant capabilities.
 *
 * @remarks
 * Provides an intent-based API with sensible defaults and built-in grant methods
 * for role-based access control (RBAC).
 *
 * **Features**:
 * - Auto-generates server names following naming conventions
 * - Inherits and merges tags from parent
 * - Applies secure defaults (TLS 1.2, disabled public access)
 * - Extends GrantableResource for RBAC grant pattern
 * - Built-in grant methods for common SQL permissions
 *
 * **Grant Methods**:
 * - `grantDatabaseContributor()` - Manage databases
 * - `grantSecurityManager()` - Manage security policies
 * - `grantServerContributor()` - Manage server configuration
 *
 * @packageDocumentation
 */

import { Construct, GrantableResource, ResourceGroupStack } from '@atakora/lib';
import type { IGrantable, IGrantResult, ArmResource } from '@atakora/lib';
import { WellKnownRoleIds } from '@atakora/lib';
import { ArmServers } from './servers-arm';
import type { ServersProps, IServers, SqlServerVersion, PublicNetworkAccess } from './server-types';

/**
 * L2 SQL Server construct with grant capabilities.
 *
 * @remarks
 * Intent-based API that simplifies SQL Server creation with sensible defaults
 * and provides built-in RBAC grant methods.
 *
 * **Default Behavior**:
 * - Auto-generates server name if not provided
 * - Inherits location from parent resource group
 * - Sets minimalTlsVersion to '1.2' for security
 * - Disables public network access by default
 * - Merges tags from parent stack
 *
 * **Grant Pattern**:
 * This class extends GrantableResource, enabling resources with managed identities
 * to receive SQL permissions through semantic grant methods.
 *
 * @example
 * Basic usage with minimal configuration:
 * ```typescript
 * import { Servers } from '@atakora/cdk/sql';
 *
 * const sqlServer = new Servers(resourceGroup, 'Database', {
 *   administratorLogin: 'sqladmin',
 *   administratorLoginPassword: 'P@ssw0rd123!'
 * });
 * ```
 *
 * @example
 * With custom configuration:
 * ```typescript
 * const sqlServer = new Servers(resourceGroup, 'Database', {
 *   serverName: 'sql-myapp-prod-001',
 *   administratorLogin: 'sqladmin',
 *   administratorLoginPassword: 'P@ssw0rd123!',
 *   publicNetworkAccess: PublicNetworkAccess.ENABLED,
 *   tags: { costCenter: '12345' }
 * });
 * ```
 *
 * @example
 * Granting permissions to a managed identity:
 * ```typescript
 * // VM with managed identity
 * const vm = new VirtualMachine(stack, 'VM', {
 *   // ... vm config
 * });
 *
 * // Grant SQL database contributor access
 * sqlServer.grantDatabaseContributor(vm);
 *
 * // Grant security manager access
 * sqlServer.grantSecurityManager(vm);
 * ```
 *
 * @public
 */
export class Servers extends GrantableResource implements IServers {
  /**
   * Underlying L1 SQL Server construct.
   *
   * @remarks
   * Provides access to the ARM-level construct for advanced scenarios.
   */
  private readonly armServer: ArmServers;

  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.Sql/servers';

  /**
   * Name of the SQL Server.
   */
  public readonly serverName: string;

  /**
   * Resource name (same as serverName).
   */
  public readonly name: string;

  /**
   * Azure region where the SQL Server is located.
   */
  public readonly location: string;

  /**
   * Resource ID of the SQL Server.
   */
  public readonly resourceId: string;

  /**
   * Resource ID of the SQL Server (alias for resourceId).
   */
  public readonly serverId: string;

  /**
   * Creates a new L2 SQL Server construct.
   *
   * @param scope - Parent construct (typically a ResourceGroupStack)
   * @param id - Unique identifier for this construct within the parent scope
   * @param props - SQL Server properties
   *
   * @throws {Error} If parent is not a ResourceGroupStack (when location not provided)
   */
  constructor(scope: Construct, id: string, props: ServersProps) {
    super(scope, id);

    // Determine location from props or parent
    let location = props.location;
    if (!location) {
      const parent = this.node.scope;
      if (parent instanceof ResourceGroupStack) {
        location = parent.location;
      } else {
        throw new Error(
          `SQL Server '${id}' requires explicit location when not created in a ResourceGroupStack`
        );
      }
    }

    // Generate server name if not provided
    const serverName = props.serverName ?? this.generateResourceName('sql', id);

    // Merge tags from parent
    const tags = this.mergeTags(props.tags);

    // Create L1 construct with defaults
    this.armServer = new ArmServers(this, 'Resource', {
      serverName,
      location,
      administratorLogin: props.administratorLogin,
      administratorLoginPassword: props.administratorLoginPassword,
      version: props.version,
      publicNetworkAccess: props.publicNetworkAccess ?? 'Disabled' as PublicNetworkAccess,
      minimalTlsVersion: props.minimalTlsVersion ?? '1.2',
      tags,
    });

    // Set public properties
    this.serverName = serverName;
    this.name = serverName;
    this.location = location;
    this.resourceId = this.armServer.serverId;
    this.serverId = this.armServer.serverId;
  }

  /**
   * Validates SQL Server properties.
   *
   * @param props - Properties to validate
   * @internal
   */
  protected validateProps(props: ServersProps): void {
    // Delegate to L1 construct validation
    // L2 validation happens in constructor before L1 creation
  }

  /**
   * Generates ARM template representation.
   *
   * @returns ARM template resource object
   * @internal
   */
  public toArmTemplate(): ArmResource {
    return this.armServer.toArmTemplate();
  }

  /**
   * Grant SQL database contributor access.
   *
   * @remarks
   * Allows the grantee to manage SQL databases including:
   * - Create and delete databases
   * - Configure database settings
   * - Manage backups
   * - Scale databases
   *
   * This is a control plane permission for managing database resources,
   * not data plane access to database contents.
   *
   * **Role**: SQL DB Contributor
   * **GUID**: `9b7fa17d-e63e-47b0-bb0a-15c516ac86ec`
   *
   * @param grantable - Identity to grant permissions to (resource with managed identity)
   * @returns Grant result for further configuration or dependency management
   *
   * @example
   * ```typescript
   * const functionApp = new FunctionApp(stack, 'Api', { ... });
   * const sqlServer = new Servers(stack, 'Database', { ... });
   *
   * // Grant database management permissions
   * sqlServer.grantDatabaseContributor(functionApp);
   * ```
   *
   * @public
   */
  public grantDatabaseContributor(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.SQL_DB_CONTRIBUTOR,
      `Database contributor access to ${this.serverName}`
    );
  }

  /**
   * Grant SQL security manager access.
   *
   * @remarks
   * Allows the grantee to manage SQL database security including:
   * - Manage security policies
   * - Configure auditing
   * - Manage threat detection
   * - View security alerts
   *
   * This role is focused on security management without full database administration.
   *
   * **Role**: SQL Security Manager
   * **GUID**: `056cd41c-7e88-42e1-933e-88ba6a50c9c3`
   *
   * @param grantable - Identity to grant permissions to (resource with managed identity)
   * @returns Grant result for further configuration or dependency management
   *
   * @example
   * ```typescript
   * const securityService = new FunctionApp(stack, 'Security', { ... });
   * const sqlServer = new Servers(stack, 'Database', { ... });
   *
   * // Grant security management permissions
   * sqlServer.grantSecurityManager(securityService);
   * ```
   *
   * @public
   */
  public grantSecurityManager(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.SQL_SECURITY_MANAGER,
      `Security manager access to ${this.serverName}`
    );
  }

  /**
   * Grant SQL server contributor access.
   *
   * @remarks
   * Allows the grantee to manage SQL servers including:
   * - Create and delete SQL servers
   * - Configure server settings
   * - Manage server firewall rules
   * - All database contributor permissions
   *
   * This is the highest level of SQL management permission.
   *
   * **Role**: SQL Server Contributor
   * **GUID**: `6d8ee4ec-f05a-4a1d-8b00-a9b17e38b437`
   *
   * @param grantable - Identity to grant permissions to (resource with managed identity)
   * @returns Grant result for further configuration or dependency management
   *
   * @example
   * ```typescript
   * const infraService = new FunctionApp(stack, 'Infrastructure', { ... });
   * const sqlServer = new Servers(stack, 'Database', { ... });
   *
   * // Grant full server management permissions
   * sqlServer.grantServerContributor(infraService);
   * ```
   *
   * @public
   */
  public grantServerContributor(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.SQL_SERVER_CONTRIBUTOR,
      `Server contributor access to ${this.serverName}`
    );
  }

  /**
   * Import an existing SQL Server by name.
   *
   * @remarks
   * Creates a reference to an existing SQL Server without managing its lifecycle.
   * Useful for referencing SQL Servers created outside the current stack.
   *
   * @param scope - Parent construct
   * @param id - Unique identifier for this reference
   * @param serverName - Name of the existing SQL Server
   * @param location - Azure region where the server is located
   * @returns SQL Server reference implementing IServers
   *
   * @example
   * ```typescript
   * const existingServer = Servers.fromServerName(
   *   stack,
   *   'ExistingDatabase',
   *   'sql-prod-eastus-001',
   *   'eastus'
   * );
   *
   * // Can be used for grants
   * existingServer.grantDatabaseContributor(myApp);
   * ```
   *
   * @public
   */
  public static fromServerName(
    scope: Construct,
    id: string,
    serverName: string,
    location: string
  ): IServers {
    class ImportedServers extends GrantableResource implements IServers {
      public readonly resourceType = 'Microsoft.Sql/servers';
      public readonly serverName = serverName;
      public readonly name = serverName;
      public readonly location = location;
      public readonly resourceId = `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Sql/servers/${serverName}`;
      public readonly serverId = this.resourceId;

      constructor() {
        super(scope, id);
      }

      protected validateProps(_props: unknown): void {
        // No validation needed for imported resources
      }

      public toArmTemplate(): ArmResource {
        throw new Error('Imported resources cannot be synthesized to ARM templates');
      }

      public grantDatabaseContributor(grantable: IGrantable): IGrantResult {
        return this.grant(
          grantable,
          WellKnownRoleIds.SQL_DB_CONTRIBUTOR,
          `Database contributor access to ${this.serverName}`
        );
      }

      public grantSecurityManager(grantable: IGrantable): IGrantResult {
        return this.grant(
          grantable,
          WellKnownRoleIds.SQL_SECURITY_MANAGER,
          `Security manager access to ${this.serverName}`
        );
      }

      public grantServerContributor(grantable: IGrantable): IGrantResult {
        return this.grant(
          grantable,
          WellKnownRoleIds.SQL_SERVER_CONTRIBUTOR,
          `Server contributor access to ${this.serverName}`
        );
      }
    }

    return new ImportedServers();
  }

  /**
   * Generates a resource-specific name following naming conventions.
   *
   * @param serviceAbbreviation - Azure service abbreviation (e.g., 'sql')
   * @param purpose - Purpose derived from construct ID
   * @returns Generated resource name
   *
   * @internal
   */
  private generateResourceName(serviceAbbreviation: string, purpose: string): string {
    // This would use the stack's naming context
    // For now, return a placeholder that follows the pattern
    let current = this.node.scope;
    while (current) {
      if (current instanceof ResourceGroupStack) {
        return current.generateResourceName(serviceAbbreviation, purpose);
      }
      current = current.node.scope;
    }
    // Fallback to simple pattern
    return `${serviceAbbreviation}-${purpose.toLowerCase()}`;
  }

  /**
   * Merges tags from parent stack with provided tags.
   *
   * @param tags - Additional tags to merge
   * @returns Merged tag collection
   *
   * @internal
   */
  private mergeTags(tags?: Record<string, string>): Record<string, string> {
    let current = this.node.scope;
    while (current) {
      if (current instanceof ResourceGroupStack) {
        return { ...current.tags, ...tags };
      }
      current = current.node.scope;
    }
    return { ...tags };
  }
}
