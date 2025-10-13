"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SPECIAL_CASE_RESOURCES = exports.DEFAULT_CONVENTIONS = exports.DEFAULT_MAX_LENGTH = exports.DEFAULT_SEPARATOR = exports.DEFAULT_MAX_LENGTHS = exports.DEFAULT_PATTERNS = void 0;
exports.mergeConventions = mergeConventions;
exports.isSpecialCaseResource = isSpecialCaseResource;
exports.getSpecialCaseRules = getSpecialCaseRules;
/**
 * Default prefix patterns for Azure resource types.
 * Based on AuthR PowerShell implementation and Azure best practices.
 *
 * @see {@link https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-best-practices/resource-abbreviations}
 */
exports.DEFAULT_PATTERNS = {
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
exports.DEFAULT_MAX_LENGTHS = {
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
exports.DEFAULT_SEPARATOR = '-';
/**
 * Default maximum length when no resource-specific limit is defined.
 */
exports.DEFAULT_MAX_LENGTH = 60;
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
exports.DEFAULT_CONVENTIONS = {
    separator: exports.DEFAULT_SEPARATOR,
    maxLength: exports.DEFAULT_MAX_LENGTH,
    patterns: exports.DEFAULT_PATTERNS,
    maxLengths: exports.DEFAULT_MAX_LENGTHS,
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
function mergeConventions(config) {
    var _a, _b;
    if (!config) {
        return exports.DEFAULT_CONVENTIONS;
    }
    return {
        separator: (_a = config.separator) !== null && _a !== void 0 ? _a : exports.DEFAULT_CONVENTIONS.separator,
        maxLength: (_b = config.maxLength) !== null && _b !== void 0 ? _b : exports.DEFAULT_CONVENTIONS.maxLength,
        patterns: __assign(__assign({}, exports.DEFAULT_CONVENTIONS.patterns), config.patterns),
        maxLengths: __assign(__assign({}, exports.DEFAULT_CONVENTIONS.maxLengths), config.maxLengths),
    };
}
/**
 * Resource types that require special handling during name generation.
 */
exports.SPECIAL_CASE_RESOURCES = {
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
function isSpecialCaseResource(resourceType) {
    return resourceType in exports.SPECIAL_CASE_RESOURCES;
}
/**
 * Gets special case handling rules for a resource type.
 *
 * @param resourceType - Resource type to get rules for
 * @returns Special case rules or undefined if no special handling needed
 */
function getSpecialCaseRules(resourceType) {
    return exports.SPECIAL_CASE_RESOURCES[resourceType];
}
