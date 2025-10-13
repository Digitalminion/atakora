/**
 * Azure Log Analytics (Microsoft.OperationalInsights) schema module.
 *
 * @remarks
 * Centralized type definitions and enums for Azure Log Analytics resources.
 *
 * @packageDocumentation
 */

// Export all enums
export { WorkspaceSku, PublicNetworkAccess } from './enums';

// Export all types
export type {
  WorkspaceSkuDef,
  WorkspaceCapping,
  WorkspaceFeatures,
  UserAssignedIdentity,
  WorkspaceIdentity,
  WorkspaceProperties,
} from './types';
