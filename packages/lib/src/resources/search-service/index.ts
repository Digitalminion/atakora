/**
 * Azure AI Search Service constructs.
 *
 * @remarks
 * Provides both L1 (ARM direct mapping) and L2 (intent-based) constructs
 * for creating Azure AI Search services.
 *
 * **Resource Type**: Microsoft.Search/searchServices
 * **API Version**: 2023-11-01
 * **Deployment Scope**: ResourceGroup
 *
 * @packageDocumentation
 *
 * @example
 * L1 usage (explicit control):
 * ```typescript
 * import { ArmSearchService, SearchServiceSku, HostingMode } from '@azure-arm-priv/lib';
 *
 * const search = new ArmSearchService(resourceGroup, 'SearchService', {
 *   serviceName: 'srch-colorai-001',
 *   location: 'eastus',
 *   sku: { name: SearchServiceSku.BASIC },
 *   properties: {
 *     replicaCount: 1,
 *     partitionCount: 1,
 *     hostingMode: HostingMode.DEFAULT,
 *     publicNetworkAccess: PublicNetworkAccess.DISABLED
 *   }
 * });
 * ```
 *
 * @example
 * L2 usage (auto-generation):
 * ```typescript
 * import { SearchService } from '@azure-arm-priv/lib';
 *
 * const searchService = new SearchService(resourceGroup, 'DataSearch');
 * // Auto-generates name, uses secure defaults
 * ```
 */

// L1 construct (ARM direct mapping)
export { ArmSearchService } from './arm-search-service';

// L2 construct (intent-based)
export { SearchService } from './search-service';

// Type definitions
export type {
  ArmSearchServiceProps,
  SearchServiceProps,
  ISearchService,
  SearchServiceSkuConfig,
  NetworkRuleSet,
  IpRule,
} from './types';

// Enums
export {
  SearchServiceSku,
  HostingMode,
  PublicNetworkAccess as SearchPublicNetworkAccess,
} from './types';
