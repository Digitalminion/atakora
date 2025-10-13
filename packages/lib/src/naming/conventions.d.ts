import type { NamingConventions, NamingConventionConfig, ResourceTypePatterns, ResourceTypeMaxLengths } from './types';
/**
 * Default prefix patterns for Azure resource types.
 * Based on AuthR PowerShell implementation and Azure best practices.
 *
 * @see {@link https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-best-practices/resource-abbreviations}
 */
export declare const DEFAULT_PATTERNS: ResourceTypePatterns;
/**
 * Default maximum name lengths for Azure resource types.
 * Based on Azure resource naming rules and constraints.
 *
 * @see {@link https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules}
 */
export declare const DEFAULT_MAX_LENGTHS: ResourceTypeMaxLengths;
/**
 * Default separator used between name components.
 */
export declare const DEFAULT_SEPARATOR = "-";
/**
 * Default maximum length when no resource-specific limit is defined.
 */
export declare const DEFAULT_MAX_LENGTH = 60;
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
export declare const DEFAULT_CONVENTIONS: NamingConventions;
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
export declare function mergeConventions(config?: NamingConventionConfig): NamingConventions;
/**
 * Resource types that require special handling during name generation.
 */
export declare const SPECIAL_CASE_RESOURCES: {
    /**
     * Storage accounts have unique constraints:
     * - No hyphens allowed
     * - Lowercase letters and numbers only
     * - Maximum 24 characters
     * - Must be globally unique
     */
    readonly storage: {
        readonly removeHyphens: true;
        readonly forceLowercase: true;
    };
    /**
     * Key Vaults have specific constraints:
     * - Must start with a letter
     * - Alphanumeric and hyphens only
     * - Maximum 24 characters
     * - Must be globally unique
     */
    readonly keyvault: {
        readonly forceLowercase: true;
    };
};
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
export declare function isSpecialCaseResource(resourceType: string): boolean;
/**
 * Gets special case handling rules for a resource type.
 *
 * @param resourceType - Resource type to get rules for
 * @returns Special case rules or undefined if no special handling needed
 */
export declare function getSpecialCaseRules(resourceType: string): {
    removeHyphens?: boolean;
    forceLowercase?: boolean;
} | undefined;
//# sourceMappingURL=conventions.d.ts.map