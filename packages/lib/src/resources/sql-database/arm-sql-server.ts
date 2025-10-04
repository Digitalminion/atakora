import { Construct } from '../../core/construct';
import { Resource } from '../../core/resource';
import { DeploymentScope } from '../../core/azure/scopes';
import type { ArmSqlServerProps, SqlServerVersion, PublicNetworkAccess } from './types';

/**
 * L1 construct for Azure SQL Server.
 *
 * @remarks
 * Direct mapping to Microsoft.Sql/servers ARM resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.Sql/servers`
 * **API Version**: `2021-11-01`
 * **Deployment Scope**: ResourceGroup
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * auto-naming and defaults, use the {@link SqlServer} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmSqlServer, SqlServerVersion, PublicNetworkAccess } from '@azure-arm-priv/lib';
 *
 * const sqlServer = new ArmSqlServer(resourceGroup, 'SqlServer', {
 *   serverName: 'sql-colorai-001',
 *   location: 'eastus',
 *   administratorLogin: 'sqladmin',
 *   administratorLoginPassword: 'P@ssw0rd123!',
 *   version: SqlServerVersion.V12_0,
 *   publicNetworkAccess: PublicNetworkAccess.DISABLED
 * });
 * ```
 */
export class ArmSqlServer extends Resource {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.Sql/servers';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2021-11-01';

  /**
   * Deployment scope for SQL servers.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

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
   * Administrator login name.
   */
  public readonly administratorLogin: string;

  /**
   * Administrator login password.
   */
  public readonly administratorLoginPassword: string;

  /**
   * SQL Server version.
   */
  public readonly version?: SqlServerVersion;

  /**
   * Public network access setting.
   */
  public readonly publicNetworkAccess?: PublicNetworkAccess;

  /**
   * Minimal TLS version.
   */
  public readonly minimalTlsVersion?: string;

  /**
   * Tags applied to the SQL Server.
   */
  public readonly tags: Record<string, string>;

  /**
   * ARM resource ID.
   *
   * @remarks
   * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Sql/servers/{serverName}`
   */
  public readonly resourceId: string;

  /**
   * SQL Server resource ID (alias for resourceId).
   */
  public readonly serverId: string;

  /**
   * Creates a new ArmSqlServer construct.
   *
   * @param scope - Parent construct (typically a ResourceGroup)
   * @param id - Unique identifier for this construct within the parent scope
   * @param props - SQL Server properties
   *
   * @throws {Error} If serverName is invalid
   * @throws {Error} If location is empty
   * @throws {Error} If administratorLogin or administratorLoginPassword is invalid
   */
  constructor(scope: Construct, id: string, props: ArmSqlServerProps) {
    super(scope, id);

    // Validate required properties
    this.validateProps(props);

    // Set properties
    this.serverName = props.serverName;
    this.name = props.serverName;
    this.location = props.location;
    this.administratorLogin = props.administratorLogin;
    this.administratorLoginPassword = props.administratorLoginPassword;
    this.version = props.version;
    this.publicNetworkAccess = props.publicNetworkAccess;
    this.minimalTlsVersion = props.minimalTlsVersion;
    this.tags = props.tags ?? {};

    // Construct resource ID
    this.resourceId = `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Sql/servers/${this.serverName}`;
    this.serverId = this.resourceId;
  }

  /**
   * Validates SQL Server properties against ARM constraints.
   *
   * @param props - Properties to validate
   * @throws {Error} If validation fails
   */
  private validateProps(props: ArmSqlServerProps): void {
    // Validate server name
    if (!props.serverName || props.serverName.trim() === '') {
      throw new Error('SQL Server name cannot be empty');
    }

    if (props.serverName.length < 1 || props.serverName.length > 63) {
      throw new Error(
        `SQL Server name must be 1-63 characters (got ${props.serverName.length})`
      );
    }

    // Validate name pattern: ^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$ or ^[a-z0-9]$
    // Single character names are allowed
    if (props.serverName.length === 1) {
      const singleCharPattern = /^[a-z0-9]$/;
      if (!singleCharPattern.test(props.serverName)) {
        throw new Error(
          `SQL Server name must be a lowercase letter or number (got: ${props.serverName})`
        );
      }
    } else {
      const namePattern = /^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/;
      if (!namePattern.test(props.serverName)) {
        throw new Error(
          `SQL Server name must match pattern: ^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$ (lowercase letters, numbers, and hyphens; cannot start or end with hyphen). Got: '${props.serverName}'`
        );
      }
    }

    // Validate location
    if (!props.location || props.location.trim() === '') {
      throw new Error('Location cannot be empty');
    }

    // Validate administrator login
    if (!props.administratorLogin || props.administratorLogin.trim() === '') {
      throw new Error('Administrator login cannot be empty');
    }

    // Check for reserved login names
    const reservedLogins = [
      'admin',
      'administrator',
      'sa',
      'root',
      'dbmanager',
      'loginmanager',
      'dbo',
      'guest',
      'public',
    ];
    if (reservedLogins.includes(props.administratorLogin.toLowerCase())) {
      throw new Error(
        `Administrator login cannot be a reserved name: ${reservedLogins.join(', ')}`
      );
    }

    // Validate administrator login password
    if (!props.administratorLoginPassword || props.administratorLoginPassword.length < 8) {
      throw new Error('Administrator login password must be at least 8 characters');
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
    const properties: any = {
      administratorLogin: this.administratorLogin,
      administratorLoginPassword: this.administratorLoginPassword,
    };

    // Add optional properties
    if (this.version) {
      properties.version = this.version;
    }

    if (this.publicNetworkAccess) {
      properties.publicNetworkAccess = this.publicNetworkAccess;
    }

    if (this.minimalTlsVersion) {
      properties.minimalTlsVersion = this.minimalTlsVersion;
    }

    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.serverName,
      location: this.location,
      properties,
      tags: Object.keys(this.tags).length > 0 ? this.tags : undefined,
    };
  }
}
