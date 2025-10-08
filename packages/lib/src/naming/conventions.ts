import type {
  NamingConventions,
  NamingConventionConfig,
  ResourceTypePatterns,
  ResourceTypeMaxLengths,
} from './types';

/**
 * Default prefix patterns for Azure resource types.
 * Based on ColorAI PowerShell implementation and Azure best practices.
 *
 * @see {@link https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-best-practices/resource-abbreviations}
 */
export const DEFAULT_PATTERNS: ResourceTypePatterns = {
  // Core Infrastructure
  rg: 'rg',
  rgLandingZone: 'rg-lz',
  rgPlatform: 'rg-pl',
  stack: 'stk',
  vnet: 'vnet',
  subnet: 'snet',
  nsg: 'nsg',
  publicIp: 'pip',
  privateEndpoint: 'pe',
  privateLinkService: 'pls',
  dnsZoneLink: 'dns-link',

  // Compute Services
  appService: 'appsrv',
  appServicePlan: 'aspsrvpl',
  appGateway: 'appgw',
  wafPolicy: 'waf',

  // Data Services
  storage: 'sto',
  keyvault: 'kv',
  cosmos: 'cosdb',
  search: 'srch',

  // AI Services
  openai: 'oai',

  // API Services
  apim: 'apim',

  // Monitoring Services
  logAnalytics: 'log',
  applicationInsights: 'ai',
  actionGroup: 'ag',
  dashboard: 'dash',
  alert: 'alert',

  // External Services
  snowflake: 'sf',
};

/**
 * Default maximum name lengths for Azure resource types.
 * Based on Azure resource naming rules and constraints.
 *
 * @see {@link https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules}
 */
export const DEFAULT_MAX_LENGTHS: ResourceTypeMaxLengths = {
  rg: 90,
  rgLandingZone: 90,
  rgPlatform: 90,
  stack: 60,
  vnet: 80,
  storage: 24,
  keyvault: 24,
  cosmos: 44,
  search: 60,
  openai: 60,
  apim: 50,
  appGateway: 80,
  appService: 60,
};

/**
 * Default separator used between name components.
 */
export const DEFAULT_SEPARATOR = '-';

/**
 * Default maximum length when no resource-specific limit is defined.
 */
export const DEFAULT_MAX_LENGTH = 60;

/**
 * Default naming conventions used when no custom configuration is provided.
 *
 * @example
 * ```typescript
 * import { DEFAULT_CONVENTIONS } from '@atakora/lib/naming';
 *
 * console.log(DEFAULT_CONVENTIONS.separator); // "-"
 * console.log(DEFAULT_CONVENTIONS.patterns.storage); // "st"
 * ```
 */
export const DEFAULT_CONVENTIONS: NamingConventions = {
  separator: DEFAULT_SEPARATOR,
  maxLength: DEFAULT_MAX_LENGTH,
  patterns: DEFAULT_PATTERNS,
  maxLengths: DEFAULT_MAX_LENGTHS,
};

/**
 * Merges custom naming conventions with default conventions.
 * Custom values override defaults where specified.
 *
 * @param config - Custom naming convention configuration
 * @returns Merged naming conventions
 *
 * @example
 * ```typescript
 * const merged = mergeConventions({
 *   separator: '_',
 *   patterns: { storage: 'stor' }
 * });
 *
 * // Result:
 * // - separator: '_' (overridden)
 * // - patterns.storage: 'stor' (overridden)
 * // - patterns.keyvault: 'kv' (from defaults)
 * // - maxLength: 60 (from defaults)
 * ```
 */
export function mergeConventions(config?: NamingConventionConfig): NamingConventions {
  if (!config) {
    return DEFAULT_CONVENTIONS;
  }

  return {
    separator: config.separator ?? DEFAULT_CONVENTIONS.separator,
    maxLength: config.maxLength ?? DEFAULT_CONVENTIONS.maxLength,
    patterns: {
      ...DEFAULT_CONVENTIONS.patterns,
      ...config.patterns,
    },
    maxLengths: {
      ...DEFAULT_CONVENTIONS.maxLengths,
      ...config.maxLengths,
    },
  };
}

/**
 * Resource types that require special handling during name generation.
 */
export const SPECIAL_CASE_RESOURCES = {
  /**
   * Storage accounts have unique constraints:
   * - No hyphens allowed
   * - Lowercase letters and numbers only
   * - Maximum 24 characters
   * - Must be globally unique
   */
  storage: {
    removeHyphens: true,
    forceLowercase: true,
  },

  /**
   * Key Vaults have specific constraints:
   * - Must start with a letter
   * - Alphanumeric and hyphens only
   * - Maximum 24 characters
   * - Must be globally unique
   */
  keyvault: {
    forceLowercase: true,
  },
} as const;

/**
 * Checks if a resource type requires special handling.
 *
 * @param resourceType - Resource type to check
 * @returns True if resource type has special handling rules
 *
 * @example
 * ```typescript
 * isSpecialCaseResource('storage'); // true
 * isSpecialCaseResource('vnet'); // false
 * ```
 */
export function isSpecialCaseResource(resourceType: string): boolean {
  return resourceType in SPECIAL_CASE_RESOURCES;
}

/**
 * Gets special case handling rules for a resource type.
 *
 * @param resourceType - Resource type to get rules for
 * @returns Special case rules or undefined if no special handling needed
 */
export function getSpecialCaseRules(
  resourceType: string
): { removeHyphens?: boolean; forceLowercase?: boolean } | undefined {
  return SPECIAL_CASE_RESOURCES[resourceType as keyof typeof SPECIAL_CASE_RESOURCES];
}
