import { Construct } from '@atakora/cdk';
import type { IResourceGroup } from '@atakora/cdk';
import { DatabaseAccounts, type IDatabaseAccount } from '@atakora/cdk/documentdb';
import { PrivateEndpoints, PrivateDnsZones, type IPrivateEndpoint, type ISubnet, type IPrivateDnsZone } from '@atakora/cdk/network';

/**
 * Configuration for CosmosDB Stack
 */
export interface CosmosDbStackProps {
  /**
   * Resource Group to deploy Cosmos DB into
   */
  resourceGroup: IResourceGroup;

  /**
   * Subnet for the private endpoint
   */
  privateEndpointSubnet: ISubnet;

  /**
   * Whether to create a new Private DNS Zone (default: true)
   *
   * @remarks
   * If false, you must provide existingPrivateDnsZone
   */
  createPrivateDnsZone?: boolean;

  /**
   * Existing Private DNS Zone to use for DNS integration
   *
   * @remarks
   * Only used if createPrivateDnsZone is false
   */
  existingPrivateDnsZone?: IPrivateDnsZone;

  /**
   * Enable serverless mode (default: true)
   */
  enableServerless?: boolean;

  /**
   * Log Analytics Workspace ID for diagnostic settings
   */
  logAnalyticsWorkspaceId?: string;

  /**
   * Additional tags
   */
  tags?: Record<string, string>;
}

/**
 * Cosmos DB Capability Stack
 *
 * @remarks
 * Self-contained stack that creates a complete Cosmos DB deployment including:
 * - Cosmos DB Database Account
 * - Private Endpoint for secure connectivity
 * - Private DNS Zone (or uses existing)
 * - DNS integration
 *
 * This stack follows the single responsibility principle - it creates
 * everything needed for a fully functional, privately accessible Cosmos DB.
 *
 * @example
 * Basic usage with auto-created DNS zone:
 * ```typescript
 * const cosmosStack = new CosmosDbStack(app, 'CosmosDb', {
 *   resourceGroup: rg,
 *   privateEndpointSubnet: subnet
 * });
 *
 * // Access the resources
 * const dbAccount = cosmosStack.databaseAccount;
 * const endpoint = cosmosStack.privateEndpoint;
 * ```
 *
 * @example
 * Using existing DNS zone:
 * ```typescript
 * const cosmosStack = new CosmosDbStack(app, 'CosmosDb', {
 *   resourceGroup: rg,
 *   privateEndpointSubnet: subnet,
 *   createPrivateDnsZone: false,
 *   existingPrivateDnsZone: sharedDnsZone
 * });
 * ```
 *
 * @example
 * With serverless disabled:
 * ```typescript
 * const cosmosStack = new CosmosDbStack(app, 'CosmosDb', {
 *   resourceGroup: rg,
 *   privateEndpointSubnet: subnet,
 *   enableServerless: false,
 *   tags: { service: 'data-platform' }
 * });
 * ```
 */
export class CosmosDbStack extends Construct {
  /**
   * Cosmos DB Database Account
   */
  public readonly databaseAccount: DatabaseAccounts;

  /**
   * Private Endpoint for Cosmos DB
   */
  public readonly privateEndpoint: IPrivateEndpoint;

  /**
   * Private DNS Zone for Cosmos DB
   */
  public readonly privateDnsZone: IPrivateDnsZone;

  /**
   * Resource Group where Cosmos DB is deployed
   */
  public readonly resourceGroup: IResourceGroup;

  constructor(scope: Construct, id: string, props: CosmosDbStackProps) {
    super(scope, id);

    this.resourceGroup = props.resourceGroup;

    // Merge stack tag with provided tags
    const stackTags = {
      stack: 'cosmosdb',
      service: 'data',
      ...props.tags,
    };

    // Create Cosmos DB Database Account
    this.databaseAccount = new DatabaseAccounts(this, 'Account', {
      location: props.resourceGroup.location,
      enableServerless: props.enableServerless ?? true,
      tags: stackTags,
    });

    // Create or use existing Private DNS Zone
    if (props.createPrivateDnsZone !== false) {
      // Create new Private DNS Zone
      this.privateDnsZone = new PrivateDnsZones(this, 'PrivateDnsZone', {
        zoneName: 'privatelink.documents.azure.com',
        tags: stackTags,
      });
    } else {
      // Use existing Private DNS Zone
      if (!props.existingPrivateDnsZone) {
        throw new Error(
          'When createPrivateDnsZone is false, existingPrivateDnsZone must be provided'
        );
      }
      this.privateDnsZone = props.existingPrivateDnsZone;
    }

    // Create Private Endpoint with DNS integration
    this.privateEndpoint = new PrivateEndpoints(this, 'CosmosPrivateEndpoint', {
      subnet: props.privateEndpointSubnet,
      privateLinkServiceId: this.databaseAccount.resourceId,
      groupIds: ['Sql'],
      privateDnsZoneId: this.privateDnsZone.zoneId,
      tags: stackTags,
    });
  }

  /**
   * Get deployed configuration
   */
  public getDeployedConfig() {
    return {
      databaseAccount: {
        id: this.databaseAccount.accountId,
        name: this.databaseAccount.databaseAccountName,
        endpoint: `https://${this.databaseAccount.databaseAccountName}.documents.azure.com:443/`,
      },
      privateEndpoint: {
        id: this.privateEndpoint.privateEndpointId,
        name: this.privateEndpoint.privateEndpointName,
      },
      privateDnsZone: {
        id: this.privateDnsZone.zoneId,
        name: this.privateDnsZone.zoneName,
      },
    };
  }
}
