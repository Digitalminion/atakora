import { Construct } from '../../core/construct';
import { Resource } from '../../core/resource';
import { DeploymentScope } from '../../core/azure/scopes';
import type {
  ArmCosmosDbAccountProps,
  ICosmosDbAccount,
  DatabaseAccountOfferType,
  Location,
} from './types';

/**
 * L1 construct for Azure Cosmos DB Database Account.
 *
 * @remarks
 * Direct mapping to Microsoft.DocumentDB/databaseAccounts ARM resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.DocumentDB/databaseAccounts`
 * **API Version**: `2024-08-15`
 * **Deployment Scope**: ResourceGroup
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * defaults, use the {@link CosmosDbAccount} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmCosmosDbAccount, DatabaseAccountOfferType, ConsistencyLevel } from '@atakora/lib';
 *
 * const cosmosAccount = new ArmCosmosDbAccount(resourceGroup, 'CosmosAccount', {
 *   databaseAccountName: 'cosmos-colorai-001',
 *   location: 'eastus',
 *   databaseAccountOfferType: DatabaseAccountOfferType.STANDARD,
 *   locations: [
 *     {
 *       locationName: 'eastus',
 *       failoverPriority: 0,
 *       isZoneRedundant: false
 *     }
 *   ],
 *   consistencyPolicy: {
 *     defaultConsistencyLevel: ConsistencyLevel.SESSION
 *   }
 * });
 * ```
 */
export class ArmCosmosDbAccount extends Resource implements ICosmosDbAccount {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.DocumentDB/databaseAccounts';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2024-08-15';

  /**
   * Deployment scope for Cosmos DB accounts.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * Name of the Cosmos DB database account.
   */
  public readonly databaseAccountName: string;

  /**
   * Resource name (same as databaseAccountName).
   */
  public readonly name: string;

  /**
   * Azure region where the Cosmos DB account is located.
   */
  public readonly location: string;

  /**
   * ARM resource ID.
   *
   * @remarks
   * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.DocumentDB/databaseAccounts/{databaseAccountName}`
   */
  public readonly resourceId: string;

  /**
   * Cosmos DB account resource ID (alias for resourceId).
   */
  public readonly accountId: string;

  /**
   * The endpoint URI for the Cosmos DB account.
   */
  public readonly documentEndpoint: string;

  /**
   * Database account offer type.
   */
  private readonly databaseAccountOfferType: DatabaseAccountOfferType;

  /**
   * All properties for ARM template.
   */
  private readonly props: ArmCosmosDbAccountProps;

  /**
   * Creates a new ArmCosmosDbAccount construct.
   *
   * @param scope - Parent construct (typically a ResourceGroup)
   * @param id - Unique identifier for this construct within the parent scope
   * @param props - Cosmos DB account properties
   *
   * @throws {Error} If databaseAccountName is invalid
   * @throws {Error} If location is empty
   * @throws {Error} If databaseAccountOfferType or locations are not provided
   */
  constructor(scope: Construct, id: string, props: ArmCosmosDbAccountProps) {
    super(scope, id);

    // Validate required properties
    this.validateProps(props);

    // Set properties
    this.props = props;
    this.databaseAccountName = props.databaseAccountName;
    this.name = props.databaseAccountName;
    this.location = props.location;
    this.databaseAccountOfferType = props.databaseAccountOfferType;

    // Construct resource ID
    this.resourceId = `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.DocumentDB/databaseAccounts/${this.databaseAccountName}`;
    this.accountId = this.resourceId;

    // Set document endpoint
    this.documentEndpoint = `https://${this.databaseAccountName}.documents.azure.com:443/`;
  }

  /**
   * Validates Cosmos DB account properties against ARM constraints.
   *
   * @param props - Properties to validate
   * @throws {Error} If validation fails
   */
  private validateProps(props: ArmCosmosDbAccountProps): void {
    // Validate database account name
    if (!props.databaseAccountName || props.databaseAccountName.trim() === '') {
      throw new Error('Database account name cannot be empty');
    }

    if (props.databaseAccountName.length < 3 || props.databaseAccountName.length > 44) {
      throw new Error(
        `Database account name must be 3-44 characters (got ${props.databaseAccountName.length})`
      );
    }

    // Validate name pattern: ^[a-z0-9][a-z0-9-]{1,42}[a-z0-9]$
    const namePattern = /^[a-z0-9][a-z0-9-]{1,42}[a-z0-9]$/;
    if (!namePattern.test(props.databaseAccountName)) {
      throw new Error(
        `Database account name must match pattern: ^[a-z0-9][a-z0-9-]{1,42}[a-z0-9]$ (lowercase letters, numbers, and hyphens; cannot start or end with hyphen). Got: '${props.databaseAccountName}'`
      );
    }

    // Validate location
    if (!props.location || props.location.trim() === '') {
      throw new Error('Location cannot be empty');
    }

    // Validate database account offer type
    if (!props.databaseAccountOfferType) {
      throw new Error('Database account offer type must be provided');
    }

    // Validate locations
    if (!props.locations || props.locations.length === 0) {
      throw new Error('At least one location must be provided');
    }

    // Validate each location
    props.locations.forEach((location, index) => {
      if (!location.locationName || location.locationName.trim() === '') {
        throw new Error(`Location at index ${index} must have a locationName`);
      }
      if (location.failoverPriority === undefined || location.failoverPriority === null) {
        throw new Error(`Location at index ${index} must have a failoverPriority`);
      }
      if (location.failoverPriority < 0) {
        throw new Error(`Location at index ${index} failoverPriority must be >= 0`);
      }
    });

    // Check for duplicate failover priorities
    const priorities = props.locations.map((loc) => loc.failoverPriority);
    const uniquePriorities = new Set(priorities);
    if (uniquePriorities.size !== priorities.length) {
      throw new Error('Each location must have a unique failoverPriority');
    }
  }

  /**
   * Generates ARM template representation of this resource.
   *
   * @remarks
   * Called during synthesis to produce the ARM template JSON.
   *
   * @returns ARM template resource object
   */
  public toArmTemplate(): Record<string, unknown> {
    const properties: any = {
      databaseAccountOfferType: this.databaseAccountOfferType,
      locations: this.props.locations,
    };

    // Add optional properties
    if (this.props.consistencyPolicy) {
      properties.consistencyPolicy = this.props.consistencyPolicy;
    }

    if (this.props.enableAutomaticFailover !== undefined) {
      properties.enableAutomaticFailover = this.props.enableAutomaticFailover;
    }

    if (this.props.enableMultipleWriteLocations !== undefined) {
      properties.enableMultipleWriteLocations = this.props.enableMultipleWriteLocations;
    }

    if (this.props.isVirtualNetworkFilterEnabled !== undefined) {
      properties.isVirtualNetworkFilterEnabled = this.props.isVirtualNetworkFilterEnabled;
    }

    if (this.props.virtualNetworkRules) {
      properties.virtualNetworkRules = this.props.virtualNetworkRules;
    }

    if (this.props.ipRules) {
      properties.ipRules = this.props.ipRules;
    }

    if (this.props.publicNetworkAccess) {
      properties.publicNetworkAccess = this.props.publicNetworkAccess;
    }

    if (this.props.enableFreeTier !== undefined) {
      properties.enableFreeTier = this.props.enableFreeTier;
    }

    if (this.props.capabilities) {
      properties.capabilities = this.props.capabilities;
    }

    const template: Record<string, unknown> = {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.databaseAccountName,
      location: this.location,
      properties,
    };

    // Add kind at top level if specified
    if (this.props.kind) {
      template.kind = this.props.kind;
    }

    // Add tags if present
    if (this.props.tags && Object.keys(this.props.tags).length > 0) {
      template.tags = this.props.tags;
    }

    return template;
  }
}
