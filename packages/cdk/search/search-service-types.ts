/**
 * Type definitions for Azure AI Search Service constructs.
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

/**
 * SKU configuration.
 */
export interface SearchServiceSkuConfig {
  /**
   * SKU name.
   */
  readonly name: SearchServiceSku;
}

/**
 * IP rule configuration.
 */
export interface IpRule {
  /**
   * IP address or CIDR range.
   */
  readonly value: string;
}

/**
 * Network rule set configuration.
 */
export interface NetworkRuleSet {
  /**
   * IP ACL rules.
   */
  readonly ipRules?: IpRule[];
}

/**
 * Properties for ArmSearchService (L1 construct).
 *
 * @remarks
 * Direct mapping to Microsoft.Search/searchServices ARM resource.
 * All properties are explicit with no defaults or auto-generation.
 *
 * ARM API Version: 2023-11-01
 *
 * @example
 * ```typescript
 * const props: ArmSearchServicesProps = {
 *   serviceName: 'srch-authr-data-nonprod-eus-00',
 *   location: 'eastus',
 *   sku: { name: SearchServiceSku.BASIC },
 *   properties: {
 *     replicaCount: 1,
 *     partitionCount: 1,
 *     hostingMode: HostingMode.DEFAULT,
 *     publicNetworkAccess: PublicNetworkAccess.DISABLED
 *   }
 * };
 * ```
 */
export interface ArmSearchServicesProps {
  /**
   * Search service name.
   *
   * @remarks
   * - Must be 2-60 characters
   * - Lowercase letters, numbers, and hyphens only
   * - Cannot start or end with hyphen
   * - Pattern: ^[a-z0-9][a-z0-9-]{0,58}[a-z0-9]$
   */
  readonly serviceName: string;

  /**
   * Azure region where the search service will be created.
   */
  readonly location: string;

  /**
   * SKU configuration (required).
   */
  readonly sku: SearchServiceSkuConfig;

  /**
   * Search service properties.
   */
  readonly properties?: {
    /**
     * Number of replicas.
     *
     * @remarks
     * Valid range: 1-12
     * Default: 1
     */
    readonly replicaCount?: number;

    /**
     * Number of partitions.
     *
     * @remarks
     * Valid values: 1, 2, 3, 4, 6, 12
     * Default: 1
     */
    readonly partitionCount?: number;

    /**
     * Hosting mode (default or highDensity).
     *
     * @remarks
     * High density mode is only available for standard3 SKU.
     */
    readonly hostingMode?: HostingMode;

    /**
     * Public network access setting.
     */
    readonly publicNetworkAccess?: PublicNetworkAccess;

    /**
     * Network rule set configuration.
     */
    readonly networkRuleSet?: NetworkRuleSet;
  };

  /**
   * Tags to apply to the search service.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Properties for SearchService (L2 construct).
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 * Designed for developer productivity with minimal required properties.
 *
 * @example
 * ```typescript
 * // Minimal usage - auto-generates name and uses defaults
 * const searchService = new SearchService(resourceGroup, 'DataSearch');
 *
 * // With custom properties
 * const searchService = new SearchService(resourceGroup, 'DataSearch', {
 *   sku: SearchServiceSku.STANDARD,
 *   replicaCount: 3,
 *   partitionCount: 2
 * });
 * ```
 */
export interface SearchServicesProps {
  /**
   * Search service name.
   *
   * @remarks
   * If not provided, will be auto-generated using the stack's naming context.
   * - Format: `srch-{org}-{project}-{purpose}-{env}-{geo}-{instance}`
   * - Example: `srch-dp-authr-data-nonprod-eus-00`
   *
   * The `purpose` is derived from the construct ID.
   */
  readonly serviceName?: string;

  /**
   * Azure region where the search service will be created.
   *
   * @remarks
   * If not provided, defaults to the parent resource group's location.
   */
  readonly location?: string;

  /**
   * SKU name.
   *
   * @remarks
   * Defaults to basic.
   */
  readonly sku?: SearchServiceSku;

  /**
   * Number of replicas.
   *
   * @remarks
   * Valid range: 1-12
   * Defaults to 1.
   */
  readonly replicaCount?: number;

  /**
   * Number of partitions.
   *
   * @remarks
   * Valid values: 1, 2, 3, 4, 6, 12
   * Defaults to 1.
   */
  readonly partitionCount?: number;

  /**
   * Hosting mode.
   *
   * @remarks
   * Defaults to default.
   * High density mode is only available for standard3 SKU.
   */
  readonly hostingMode?: HostingMode;

  /**
   * Public network access setting.
   *
   * @remarks
   * Defaults to disabled for AuthR security pattern.
   */
  readonly publicNetworkAccess?: PublicNetworkAccess;

  /**
   * Network rule set configuration.
   */
  readonly networkRuleSet?: NetworkRuleSet;

  /**
   * Tags to apply to the search service.
   *
   * @remarks
   * These tags will be merged with the parent's tags.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Interface for Search Service reference.
 *
 * @remarks
 * Allows resources to reference a search service without depending on the construct class.
 */
export interface ISearchService {
  /**
   * Name of the search service.
   */
  readonly serviceName: string;

  /**
   * Location of the search service.
   */
  readonly location: string;

  /**
   * Resource ID of the search service.
   */
  readonly serviceId: string;
}
