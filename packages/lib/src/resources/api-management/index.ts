/**
 * Azure API Management constructs.
 *
 * @remarks
 * Provides both L1 (ARM direct mapping) and L2 (intent-based) constructs
 * for creating Azure API Management services.
 *
 * **Resource Type**: Microsoft.ApiManagement/service
 * **API Version**: 2024-05-01
 * **Deployment Scope**: ResourceGroup
 *
 * @packageDocumentation
 *
 * @example
 * L1 usage (explicit control):
 * ```typescript
 * import { ArmApiManagement, ApiManagementSkuName } from '@atakora/lib';
 *
 * const apim = new ArmApiManagement(resourceGroup, 'APIM', {
 *   serviceName: 'apim-authr-nonprod',
 *   location: 'eastus',
 *   sku: {
 *     name: ApiManagementSkuName.DEVELOPER,
 *     capacity: 1
 *   },
 *   publisherName: 'Avient AuthR',
 *   publisherEmail: 'admin@avient.com',
 *   identity: {
 *     type: 'SystemAssigned'
 *   }
 * });
 * ```
 *
 * @example
 * L2 usage (auto-generation):
 * ```typescript
 * import { ApiManagement } from '@atakora/lib';
 *
 * const apim = new ApiManagement(resourceGroup, 'Gateway', {
 *   publisherName: 'Avient AuthR',
 *   publisherEmail: 'admin@avient.com'
 * });
 * // Auto-generates name, uses secure defaults, disables legacy TLS
 * ```
 */

// L1 constructs (ARM direct mapping)
export { ArmApiManagement } from './arm-api-management';
export { ArmApiManagementApi } from './api';
export { ArmApiManagementProduct } from './product';
export { ArmApiManagementSubscription } from './subscription';
export { ArmApiManagementPolicy } from './policy';

// L2 constructs (intent-based)
export { ApiManagement } from './api-management';
export { ApiManagementApi } from './api';
export { ApiManagementProduct } from './product';
export { ApiManagementSubscription } from './subscription';
export { ApiManagementPolicy } from './policy';

// Type definitions - Main service
export type {
  ArmApiManagementProps,
  ApiManagementProps,
  IApiManagement,
  ApiManagementSku,
  ApiManagementIdentity,
  HostnameConfiguration,
  VirtualNetworkConfiguration,
  AdditionalLocation,
} from './types';

// Type definitions - API sub-resource
export type {
  ArmApiManagementApiProps,
  ApiManagementApiProps,
  IApiManagementApi,
  SubscriptionKeyParameterNames,
} from './types';

// Type definitions - Product sub-resource
export type {
  ArmApiManagementProductProps,
  ApiManagementProductProps,
  IApiManagementProduct,
} from './types';

// Type definitions - Subscription sub-resource
export type {
  ArmApiManagementSubscriptionProps,
  ApiManagementSubscriptionProps,
  IApiManagementSubscription,
} from './types';

// Type definitions - Policy sub-resource
export type {
  ArmApiManagementPolicyProps,
  ApiManagementPolicyProps,
  IApiManagementPolicy,
} from './types';

// Enums
export {
  ApiManagementSkuName,
  VirtualNetworkType,
  HostnameType,
  ApiProtocol,
  ApiType,
  ProductState,
  SubscriptionState,
  PolicyFormat,
} from './types';
