/**
 * Utility functions for handling construct IDs in resource naming.
 *
 * @remarks
 * These utilities help prevent naming duplication when construct IDs
 * contain resource type names or stack prefixes.
 */

/**
 * Common stack name prefixes that should be stripped from construct IDs.
 */
const STACK_PREFIXES = [
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
export function constructIdToPurpose(
  id: string,
  resourceTypeName: string,
  additionalAliases?: string[]
): string | undefined {
  let purpose = id.toLowerCase();

  // Remove stack prefixes
  for (const prefix of STACK_PREFIXES) {
    if (purpose.startsWith(prefix)) {
      purpose = purpose.slice(prefix.length);
    }
  }

  // Remove resource type name and aliases
  const typesToRemove = [resourceTypeName, ...(additionalAliases || [])];
  for (const type of typesToRemove) {
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
export function getServiceAbbreviation(serviceIdentifier: string): string {
  const abbreviations: Record<string, string> = {
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

  const lower = serviceIdentifier.toLowerCase();
  return abbreviations[lower] || lower;
}
