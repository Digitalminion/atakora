/**
 * Type definitions for Private Endpoint constructs.
 *
 * @packageDocumentation
 */

import { schema } from '@atakora/lib';

/**
 * Private endpoint network policies.
 *
 * @remarks
 * Imported from schema for consistency with Azure ARM specifications.
 * Controls whether network policies are applied to private endpoints in a subnet.
 */
export const PrivateEndpointNetworkPolicies = schema.network.PrivateEndpointNetworkPolicies;
export type PrivateEndpointNetworkPolicies = typeof PrivateEndpointNetworkPolicies[keyof typeof PrivateEndpointNetworkPolicies];

/**
 * Private link service network policies.
 *
 * @remarks
 * Imported from schema for consistency with Azure ARM specifications.
 * Controls whether network policies are applied to private link services in a subnet.
 */
export const PrivateLinkServiceNetworkPolicies = schema.network.PrivateLinkServiceNetworkPolicies;
export type PrivateLinkServiceNetworkPolicies = typeof PrivateLinkServiceNetworkPolicies[keyof typeof PrivateLinkServiceNetworkPolicies];

/**
 * Private Link Service Connection configuration.
 *
 * @remarks
 * Defines the connection to a private link service or Azure resource.
 */
export interface PrivateLinkServiceConnection {
  /**
   * Name of the private link service connection.
   */
  readonly name: string;

  /**
   * Resource ID of the private link service or Azure resource.
   *
   * @remarks
   * Examples:
   * - Storage Account: /subscriptions/.../storageAccounts/mystorageaccount
   * - Key Vault: /subscriptions/.../vaults/mykeyvault
   * - Cosmos DB: /subscriptions/.../databaseAccounts/mycosmosdb
   */
  readonly privateLinkServiceId: string;

  /**
   * Group IDs for the private endpoint connection.
   *
   * @remarks
   * Identifies which sub-resource of the service to connect to.
   * Common examples:
   * - Storage: ['blob'], ['file'], ['table'], ['queue']
   * - Key Vault: ['vault']
   * - Cosmos DB: ['Sql'], ['MongoDB']
   * - SQL Server: ['sqlServer']
   */
  readonly groupIds: string[];

  /**
   * Custom message for the private endpoint connection request.
   *
   * @remarks
   * Optional message when manual approval is required.
   */
  readonly requestMessage?: string;
}

/**
 * Private DNS Zone Configuration.
 *
 * @remarks
 * Associates a private DNS zone with the private endpoint for name resolution.
 */
export interface PrivateDnsZoneConfig {
  /**
   * Name of the DNS zone configuration.
   */
  readonly name: string;

  /**
   * Resource ID of the private DNS zone.
   *
   * @remarks
   * Example: /subscriptions/.../privateDnsZones/privatelink.blob.core.windows.net
   */
  readonly privateDnsZoneId: string;
}

/**
 * Private DNS Zone Group configuration.
 *
 * @remarks
 * Groups multiple DNS zone configurations for the private endpoint.
 */
export interface PrivateDnsZoneGroup {
  /**
   * Name of the private DNS zone group.
   */
  readonly name: string;

  /**
   * Array of private DNS zone configurations.
   */
  readonly privateDnsZoneConfigs: PrivateDnsZoneConfig[];
}

/**
 * Subnet reference for private endpoint.
 */
export interface SubnetReference {
  /**
   * Resource ID of the subnet.
   */
  readonly id: string;
}

/**
 * Properties for ArmPrivateEndpoint (L1 construct).
 *
 * @remarks
 * Direct mapping to Microsoft.Network/privateEndpoints ARM resource.
 * All properties are explicit with no defaults or auto-generation.
 *
 * ARM API Version: 2023-11-01
 *
 * @example
 * ```typescript
 * const props: ArmPrivateEndpointProps = {
 *   privateEndpointName: 'pe-storage-blob-01',
 *   location: 'eastus',
 *   subnet: {
 *     id: '/subscriptions/.../subnets/snet-pe-01'
 *   },
 *   privateLinkServiceConnections: [{
 *     name: 'storage-connection',
 *     privateLinkServiceId: '/subscriptions/.../storageAccounts/mystg',
 *     groupIds: ['blob']
 *   }]
 * };
 * ```
 */
export interface ArmPrivateEndpointProps {
  /**
   * Name of the private endpoint.
   *
   * @remarks
   * Must be 1-80 characters.
   * Alphanumerics, underscores, periods, and hyphens.
   * Start with alphanumeric. End alphanumeric or underscore.
   */
  readonly privateEndpointName: string;

  /**
   * Azure region where the private endpoint will be created.
   */
  readonly location: string;

  /**
   * Reference to the subnet where the private endpoint will be created.
   */
  readonly subnet: SubnetReference;

  /**
   * Array of private link service connections.
   */
  readonly privateLinkServiceConnections: PrivateLinkServiceConnection[];

  /**
   * Custom name for the network interface.
   *
   * @remarks
   * Optional custom name for the NIC created by the private endpoint.
   */
  readonly customNetworkInterfaceName?: string;

  /**
   * Private DNS zone group configuration.
   *
   * @remarks
   * Optional DNS integration for automatic private DNS zone registration.
   */
  readonly privateDnsZoneGroup?: PrivateDnsZoneGroup;

  /**
   * Tags to apply to the private endpoint.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Properties for PrivateEndpoint (L2 construct).
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 * Designed for developer productivity with minimal required properties.
 *
 * @example
 * ```typescript
 * // Minimal usage - auto-generates name
 * const endpoint = new PrivateEndpoint(resourceGroup, 'StorageEndpoint', {
 *   subnet: subnet,
 *   privateLinkServiceId: storageAccount.storageAccountId,
 *   groupIds: ['blob']
 * });
 *
 * // With DNS integration
 * const endpoint = new PrivateEndpoint(resourceGroup, 'StorageEndpoint', {
 *   subnet: subnet,
 *   privateLinkServiceId: storageAccount.storageAccountId,
 *   groupIds: ['blob'],
 *   privateDnsZoneId: dnsZone.zoneId
 * });
 * ```
 */
export interface PrivateEndpointsProps {
  /**
   * Name of the private endpoint.
   *
   * @remarks
   * If not provided, will be auto-generated using the parent's naming context:
   * - Format: `pe-{org}-{project}-{purpose}-{env}-{geo}-{instance}`
   * - Example: `pe-digital-minion-authr-storage-nonprod-eus-00`
   *
   * The `purpose` is derived from the construct ID.
   */
  readonly privateEndpointName?: string;

  /**
   * Azure region where the private endpoint will be created.
   *
   * @remarks
   * If not provided, defaults to the parent resource group's location.
   */
  readonly location?: string;

  /**
   * Subnet where the private endpoint will be created.
   *
   * @remarks
   * Can be an ISubnet construct or a subnet ID string.
   */
  readonly subnet: ISubnet | string;

  /**
   * Resource to connect to via private link.
   *
   * @remarks
   * Can be a resource object with resourceId property or a resource ID string.
   */
  readonly privateLinkServiceId: IPrivateLinkResource | string;

  /**
   * Group IDs for the private endpoint connection.
   *
   * @remarks
   * Identifies which sub-resource to connect to.
   * Common examples:
   * - Storage: ['blob'], ['file'], ['table'], ['queue']
   * - Key Vault: ['vault']
   * - Cosmos DB: ['Sql'], ['MongoDB']
   */
  readonly groupIds: string[];

  /**
   * Name for the private link service connection.
   *
   * @remarks
   * If not provided, will be auto-generated as '{privateEndpointName}-connection'.
   */
  readonly connectionName?: string;

  /**
   * Custom message for the connection request.
   */
  readonly requestMessage?: string;

  /**
   * Custom name for the network interface.
   */
  readonly customNetworkInterfaceName?: string;

  /**
   * Private DNS zone for DNS integration.
   *
   * @remarks
   * Can be an IPrivateDnsZone construct or a zone ID string.
   * If provided, automatically configures DNS integration.
   */
  readonly privateDnsZoneId?: IPrivateDnsZone | string;

  /**
   * Name for the DNS zone group.
   *
   * @remarks
   * Only used if privateDnsZoneId is provided.
   * Defaults to 'default'.
   */
  readonly dnsZoneGroupName?: string;

  /**
   * Tags to apply to the private endpoint.
   *
   * @remarks
   * These tags will be merged with the parent's tags.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Interface for Subnet reference (duck-typed).
 */
export interface ISubnet {
  /**
   * Resource ID of the subnet.
   */
  readonly subnetId: string;
}

/**
 * Interface for Private DNS Zone reference (duck-typed).
 */
export interface IPrivateDnsZone {
  /**
   * Resource ID of the private DNS zone.
   */
  readonly zoneId: string;
}

/**
 * Interface for Private Link enabled resources (duck-typed).
 */
export interface IPrivateLinkResource {
  /**
   * Resource ID of the private link resource.
   */
  readonly resourceId: string;
}

/**
 * Interface for Private Endpoint reference.
 *
 * @remarks
 * Allows resources to reference a private endpoint without depending on the construct class.
 */
export interface IPrivateEndpoint {
  /**
   * Name of the private endpoint.
   */
  readonly privateEndpointName: string;

  /**
   * Location of the private endpoint.
   */
  readonly location: string;

  /**
   * Resource ID of the private endpoint.
   */
  readonly privateEndpointId: string;
}
