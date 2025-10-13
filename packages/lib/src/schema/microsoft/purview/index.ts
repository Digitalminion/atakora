/**
 * Microsoft Purview (Microsoft.Purview) schema module.
 *
 * @remarks
 * Centralized type definitions and enums for Microsoft Purview governance resources.
 *
 * @packageDocumentation
 */

// Export all enums
export {
  PurviewSkuName,
  PurviewIdentityType,
  PublicNetworkAccess,
  ManagedResourcesPublicNetworkAccess,
  IngestionStoragePublicNetworkAccess,
  ManagedEventHubState,
  TenantEndpointState,
} from './enums';

// Export all types
export type {
  PurviewSku,
  UserAssignedIdentity,
  PurviewIdentity,
  IngestionStorage,
  CloudConnectors,
  MergeInfo,
  AccountProperties,
} from './types';
