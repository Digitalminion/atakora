/**
 * Enums for Azure AI Search Service (Microsoft.Search).
 *
 * @remarks
 * Curated enums for Azure AI Search Service resources.
 *
 * **Resource Type**: Microsoft.Search/searchServices
 * **API Version**: 2023-11-01
 *
 * @packageDocumentation
 */

/**
 * SKU name for AI Search service.
 */
export enum SearchServiceSku {
  FREE = 'free',
  BASIC = 'basic',
  STANDARD = 'standard',
  STANDARD2 = 'standard2',
  STANDARD3 = 'standard3',
  STORAGE_OPTIMIZED_L1 = 'storage_optimized_l1',
  STORAGE_OPTIMIZED_L2 = 'storage_optimized_l2',
}

/**
 * Hosting mode for search service.
 */
export enum HostingMode {
  DEFAULT = 'default',
  HIGH_DENSITY = 'highDensity',
}

/**
 * Public network access setting.
 */
export enum PublicNetworkAccess {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
}
