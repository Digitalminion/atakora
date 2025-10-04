import { Construct } from '../../core/construct';
import { ArmCosmosDbAccount } from './arm-cosmos-db-account';
import type {
  CosmosDbAccountProps,
  ICosmosDbAccount,
  DatabaseAccountOfferType,
  ConsistencyLevel,
  CosmosDbKind,
  PublicNetworkAccess,
  Location,
  Capability,
} from './types';

/**
 * L2 construct for Azure Cosmos DB Database Account.
 *
 * @remarks
 * Intent-based construct that provides sensible defaults and type-safe configuration
 * for creating Cosmos DB database accounts.
 *
 * **Resource Type**: Microsoft.DocumentDB/databaseAccounts
 * **API Version**: 2024-08-15
 * **Deployment Scope**: ResourceGroup
 *
 * **Key Features**:
 * - Auto-generates account name if not provided
 * - Defaults consistency level to Session
 * - Defaults publicNetworkAccess to 'disabled'
 * - Defaults kind to GlobalDocumentDB
 * - Builds locations array from location and additionalLocations
 * - Adds EnableServerless capability if enableServerless is true
 *
 * For maximum control over ARM properties, use {@link ArmCosmosDbAccount} instead.
 *
 * @example
 * Basic serverless Cosmos DB account:
 * ```typescript
 * import { CosmosDbAccount } from '@azure-arm-priv/lib';
 *
 * const cosmosAccount = new CosmosDbAccount(resourceGroup, 'CosmosAccount', {
 *   location: 'eastus',
 *   enableServerless: true
 * });
 * ```
 *
 * @example
 * Multi-region Cosmos DB account:
 * ```typescript
 * const cosmosAccount = new CosmosDbAccount(resourceGroup, 'CosmosAccount', {
 *   databaseAccountName: 'cosmos-colorai-001',
 *   location: 'eastus',
 *   additionalLocations: ['westus', 'northeurope'],
 *   enableAutomaticFailover: true
 * });
 * ```
 */
export class CosmosDbAccount extends Construct implements ICosmosDbAccount {
  /**
   * The underlying L1 construct.
   */
  private readonly armAccount: ArmCosmosDbAccount;

  /**
   * Name of the Cosmos DB database account.
   */
  public readonly databaseAccountName: string;

  /**
   * Azure region.
   */
  public readonly location: string;

  /**
   * ARM resource ID.
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

  constructor(scope: Construct, id: string, props: CosmosDbAccountProps = {}) {
    super(scope, id);

    // Resolve account name (auto-generate if not provided)
    this.databaseAccountName = props.databaseAccountName ?? this.generateAccountName(id);

    // Resolve location (inherit from parent if not specified)
    this.location = this.resolveLocation(props.location);

    // Build locations array
    const locations = this.buildLocations(this.location, props.additionalLocations);

    // Build capabilities array
    const capabilities = this.buildCapabilities(props.enableServerless);

    // Resolve consistency level
    const consistencyLevel = props.consistencyLevel ?? ('Session' as ConsistencyLevel);

    // Resolve kind
    const kind = props.kind ?? ('GlobalDocumentDB' as CosmosDbKind);

    // Resolve public network access
    const publicNetworkAccess = props.publicNetworkAccess ?? ('disabled' as PublicNetworkAccess);

    // Create underlying L1 construct
    this.armAccount = new ArmCosmosDbAccount(scope, `${id}-Resource`, {
      databaseAccountName: this.databaseAccountName,
      location: this.location,
      kind,
      databaseAccountOfferType: 'Standard' as DatabaseAccountOfferType,
      consistencyPolicy: {
        defaultConsistencyLevel: consistencyLevel,
      },
      locations,
      enableAutomaticFailover: props.enableAutomaticFailover,
      publicNetworkAccess,
      virtualNetworkRules: props.virtualNetworkRules,
      enableFreeTier: props.enableFreeTier,
      capabilities: capabilities.length > 0 ? capabilities : undefined,
      tags: props.tags,
    });

    // Expose properties
    this.resourceId = this.armAccount.resourceId;
    this.accountId = this.armAccount.accountId;
    this.documentEndpoint = this.armAccount.documentEndpoint;
  }

  /**
   * Generates an account name from the construct ID.
   */
  private generateAccountName(id: string): string {
    // Convert to lowercase and replace invalid characters with hyphens
    let name = id.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    // Remove consecutive hyphens
    name = name.replace(/-+/g, '-');

    // Ensure it starts and ends with alphanumeric
    name = name.replace(/^-+|-+$/g, '');

    // Ensure it starts with alphanumeric (prepend 'cosmos-' if it doesn't)
    if (!/^[a-z0-9]/.test(name)) {
      name = `cosmos-${name}`;
    }

    // Ensure it ends with alphanumeric (remove trailing hyphens)
    if (!/[a-z0-9]$/.test(name)) {
      name = name.replace(/-+$/, '');
    }

    // If name doesn't start with a letter or is too generic, prepend 'cosmos-'
    if (/^\d/.test(name) || name.length < 3) {
      name = `cosmos-${name}`;
    }

    // Truncate to 44 characters if needed
    if (name.length > 44) {
      name = name.substring(0, 44);
      // Ensure still ends with alphanumeric after truncation
      name = name.replace(/-+$/, '');
    }

    // Final validation - ensure minimum length of 3
    if (name.length < 3) {
      name = `cosmos-db-${name}`;
    }

    return name;
  }

  /**
   * Resolves the location from props or parent scope.
   */
  private resolveLocation(location?: string): string {
    if (location) {
      return location;
    }

    // Try to inherit from parent
    // For now, throw error if not provided
    // In future, could walk up the construct tree to find location
    throw new Error('Location must be provided either in props or inherited from parent');
  }

  /**
   * Builds the locations array from primary location and additional locations.
   */
  private buildLocations(
    primaryLocation: string,
    additionalLocations?: string[]
  ): Location[] {
    const locations: Location[] = [
      {
        locationName: primaryLocation,
        failoverPriority: 0,
        isZoneRedundant: false,
      },
    ];

    if (additionalLocations && additionalLocations.length > 0) {
      additionalLocations.forEach((loc, index) => {
        locations.push({
          locationName: loc,
          failoverPriority: index + 1,
          isZoneRedundant: false,
        });
      });
    }

    return locations;
  }

  /**
   * Builds the capabilities array.
   */
  private buildCapabilities(enableServerless?: boolean): Capability[] {
    const capabilities: Capability[] = [];

    if (enableServerless) {
      capabilities.push({
        name: 'EnableServerless',
      });
    }

    return capabilities;
  }

  /**
   * Import an existing Cosmos DB account by its resource ID.
   *
   * @param scope - The parent construct
   * @param id - The construct ID
   * @param accountId - The full resource ID of the Cosmos DB account
   * @returns An ICosmosDbAccount reference
   */
  public static fromAccountId(
    scope: Construct,
    id: string,
    accountId: string
  ): ICosmosDbAccount {
    class Import extends Construct implements ICosmosDbAccount {
      public readonly accountId = accountId;
      public readonly resourceId = accountId;
      public readonly databaseAccountName: string;
      public readonly location: string;
      public readonly documentEndpoint: string;

      constructor() {
        super(scope, id);

        // Parse account name from resource ID
        const match = accountId.match(/\/databaseAccounts\/([^/]+)$/);
        if (!match) {
          throw new Error(
            `Invalid Cosmos DB account resource ID: ${accountId}. ` +
            `Expected format: .../Microsoft.DocumentDB/databaseAccounts/{accountName}`
          );
        }
        this.databaseAccountName = match[1];

        // Parse location from resource ID (if available)
        // Location is not in the resource ID, so we set a placeholder
        this.location = 'unknown';

        // Set document endpoint
        this.documentEndpoint = `https://${this.databaseAccountName}.documents.azure.com:443/`;
      }
    }

    return new Import();
  }
}
