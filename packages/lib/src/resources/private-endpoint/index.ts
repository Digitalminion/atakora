/**
 * Azure Private Endpoint constructs.
 *
 * @remarks
 * Provides both L1 (ARM direct mapping) and L2 (intent-based) constructs
 * for creating Azure Private Endpoints to securely connect to Azure services.
 *
 * **Resource Type**: Microsoft.Network/privateEndpoints
 * **API Version**: 2023-11-01
 * **Deployment Scope**: ResourceGroup
 *
 * @packageDocumentation
 *
 * @example
 * L1 usage (explicit control):
 * ```typescript
 * import { ArmPrivateEndpoint } from '@azure-arm-priv/lib';
 *
 * const endpoint = new ArmPrivateEndpoint(resourceGroup, 'StorageEndpoint', {
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
 * });
 * ```
 *
 * @example
 * L2 usage (auto-generation):
 * ```typescript
 * import { PrivateEndpoint } from '@azure-arm-priv/lib';
 *
 * const endpoint = new PrivateEndpoint(resourceGroup, 'StorageEndpoint', {
 *   subnet: subnet,
 *   privateLinkServiceId: storageAccount.storageAccountId,
 *   groupIds: ['blob']
 * });
 * // Auto-generates name and inherits location from parent
 * ```
 *
 * @example
 * With DNS integration:
 * ```typescript
 * const endpoint = new PrivateEndpoint(resourceGroup, 'StorageEndpoint', {
 *   subnet: subnet,
 *   privateLinkServiceId: storageAccount.storageAccountId,
 *   groupIds: ['blob'],
 *   privateDnsZoneId: dnsZone.zoneId
 * });
 * ```
 */

// L1 construct (ARM direct mapping)
export { ArmPrivateEndpoint } from './arm-private-endpoint';

// L2 construct (intent-based)
export { PrivateEndpoint } from './private-endpoint';

// Type definitions
export type {
  ArmPrivateEndpointProps,
  PrivateEndpointProps,
  IPrivateEndpoint,
  PrivateLinkServiceConnection,
  PrivateDnsZoneGroup,
  PrivateDnsZoneConfig,
  SubnetReference,
  ISubnet,
  IPrivateDnsZone,
  IPrivateLinkResource,
} from './types';
