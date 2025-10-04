/**
 * Azure Cosmos DB constructs.
 *
 * @remarks
 * Provides both L1 (ARM direct mapping) and L2 (intent-based) constructs
 * for creating Azure Cosmos DB database accounts.
 *
 * **Resource Type**: Microsoft.DocumentDB/databaseAccounts
 * **API Version**: 2024-08-15
 * **Deployment Scope**: ResourceGroup
 *
 * @packageDocumentation
 *
 * @example
 * L1 usage (explicit control):
 * ```typescript
 * import { ArmCosmosDbAccount, DatabaseAccountOfferType, ConsistencyLevel } from '@azure-arm-priv/lib';
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
 *
 * @example
 * L2 usage (with defaults):
 * ```typescript
 * import { CosmosDbAccount } from '@azure-arm-priv/lib';
 *
 * const cosmosAccount = new CosmosDbAccount(resourceGroup, 'CosmosAccount', {
 *   location: 'eastus',
 *   enableServerless: true
 * });
 * // Account name auto-generated
 * // Consistency level defaults to 'Session'
 * // Public network access defaults to 'disabled'
 * ```
 */

// L1 construct (ARM direct mapping)
export { ArmCosmosDbAccount } from './arm-cosmos-db-account';

// L2 construct (intent-based)
export { CosmosDbAccount } from './cosmos-db-account';

// Type definitions
export type {
  ArmCosmosDbAccountProps,
  CosmosDbAccountProps,
  ICosmosDbAccount,
  ConsistencyPolicy,
  Location,
  Capability,
  VirtualNetworkRule,
  IpAddressOrRange,
} from './types';

// Enums
export {
  CosmosDbKind,
  DatabaseAccountOfferType,
  ConsistencyLevel,
  PublicNetworkAccess,
} from './types';
