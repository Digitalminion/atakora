/**
 * Utility functions for handling construct IDs in resource naming.
 *
 * @remarks
 * These utilities help prevent naming duplication when construct IDs
 * contain resource type names or stack prefixes.
 */
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
export declare function constructIdToPurpose(id: string, resourceTypeName: string, additionalAliases?: string[]): string | undefined;
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
export declare function getServiceAbbreviation(serviceIdentifier: string): string;
//# sourceMappingURL=construct-id-utils.d.ts.map