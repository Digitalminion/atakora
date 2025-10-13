"use strict";
/**
 * Utility functions for handling construct IDs in resource naming.
 *
 * @remarks
 * These utilities help prevent naming duplication when construct IDs
 * contain resource type names or stack prefixes.
 */
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.constructIdToPurpose = constructIdToPurpose;
exports.getServiceAbbreviation = getServiceAbbreviation;
/**
 * Common stack name prefixes that should be stripped from construct IDs.
 */
var STACK_PREFIXES = [
    'data',
    'application',
    'connectivity',
    'networking',
    'monitoring',
    'platform',
    'foundation',
];
/**
 * Converts a construct ID to a purpose identifier for naming, removing
 * redundant stack prefixes and resource type names.
 *
 * @param id - The construct ID
 * @param resourceTypeName - The resource type name (e.g., 'vnet', 'search', 'keyvault')
 * @param additionalAliases - Additional aliases for the resource type (e.g., 'virtualnetwork' for 'vnet')
 * @returns Purpose string for naming, or undefined if ID only contains resource type
 *
 * @remarks
 * This function:
 * 1. Converts to lowercase
 * 2. Strips stack prefixes (data, application, connectivity, etc.)
 * 3. Strips the resource type name itself
 * 4. Returns undefined if nothing meaningful remains
 *
 * @example
 * ```typescript
 * constructIdToPurpose('DataSearch', 'search');
 * // Returns: undefined (only contained stack prefix + resource type)
 *
 * constructIdToPurpose('UserDataSearch', 'search');
 * // Returns: 'userdata'
 *
 * constructIdToPurpose('VNet', 'vnet', ['virtualnetwork']);
 * // Returns: undefined
 *
 * constructIdToPurpose('PrimaryVNet', 'vnet', ['virtualnetwork']);
 * // Returns: 'primary'
 * ```
 */
function constructIdToPurpose(id, resourceTypeName, additionalAliases) {
    var purpose = id.toLowerCase();
    // Remove stack prefixes
    for (var _i = 0, STACK_PREFIXES_1 = STACK_PREFIXES; _i < STACK_PREFIXES_1.length; _i++) {
        var prefix = STACK_PREFIXES_1[_i];
        if (purpose.startsWith(prefix)) {
            purpose = purpose.slice(prefix.length);
        }
    }
    // Remove resource type name and aliases
    var typesToRemove = __spreadArray([resourceTypeName], (additionalAliases || []), true);
    for (var _a = 0, typesToRemove_1 = typesToRemove; _a < typesToRemove_1.length; _a++) {
        var type = typesToRemove_1[_a];
        if (purpose === type || purpose.endsWith(type)) {
            // If the whole ID is just the resource type, return undefined
            if (purpose === type) {
                return undefined;
            }
            // Otherwise, remove it from the end
            purpose = purpose.slice(0, -type.length);
        }
    }
    // If nothing meaningful left, return undefined
    if (purpose.length === 0) {
        return undefined;
    }
    return purpose;
}
/**
 * Gets the service abbreviation from a resource type or service name.
 *
 * @param serviceIdentifier - The service identifier (e.g., 'cosmos', 'storage', 'keyvault')
 * @returns The service abbreviation
 *
 * @remarks
 * This is useful for private endpoints which should use the service abbreviation
 * instead of the full construct ID.
 *
 * @example
 * ```typescript
 * getServiceAbbreviation('storage');  // Returns: 'sto'
 * getServiceAbbreviation('cosmos');   // Returns: 'cosdb'
 * getServiceAbbreviation('keyvault'); // Returns: 'kv'
 * ```
 */
function getServiceAbbreviation(serviceIdentifier) {
    var abbreviations = {
        storage: 'sto',
        keyvault: 'kv',
        cosmos: 'cosdb',
        cosmosdb: 'cosdb',
        search: 'srch',
        searchservice: 'srch',
        openai: 'oai',
        appservice: 'appsrv',
        app: 'appsrv',
        appserviceplan: 'aspsrvpl',
    };
    var lower = serviceIdentifier.toLowerCase();
    return abbreviations[lower] || lower;
}
