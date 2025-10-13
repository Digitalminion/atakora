import type { NameValidationResult, ResourceValidationRules } from './types';
/**
 * Validation rules for Azure Storage Account names.
 *
 * @see {@link https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules#microsoftstorage}
 */
export declare const STORAGE_ACCOUNT_RULES: ResourceValidationRules;
/**
 * Validation rules for Azure Key Vault names.
 *
 * @see {@link https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules#microsoftkeyvault}
 */
export declare const KEY_VAULT_RULES: ResourceValidationRules;
/**
 * Validation rules for Azure Resource Group names.
 *
 * @see {@link https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules#microsoftresources}
 */
export declare const RESOURCE_GROUP_RULES: ResourceValidationRules;
/**
 * Validation rules for Azure Virtual Network names.
 *
 * @see {@link https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules#microsoftnetwork}
 */
export declare const VIRTUAL_NETWORK_RULES: ResourceValidationRules;
/**
 * Validation rules for Azure Cosmos DB account names.
 *
 * @see {@link https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules#microsoftdocumentdb}
 */
export declare const COSMOS_DB_RULES: ResourceValidationRules;
/**
 * Default validation rules for most Azure resources.
 */
export declare const DEFAULT_VALIDATION_RULES: ResourceValidationRules;
/**
 * Map of resource types to their validation rules.
 */
export declare const RESOURCE_VALIDATION_RULES: Record<string, ResourceValidationRules>;
/**
 * Gets validation rules for a specific resource type.
 *
 * @param resourceType - Resource type identifier
 * @returns Validation rules for the resource type
 *
 * @example
 * ```typescript
 * const rules = getValidationRules('storage');
 * console.log(rules.maxLength); // 24
 * ```
 */
export declare function getValidationRules(resourceType: string): ResourceValidationRules;
/**
 * Validates a resource name against Azure naming constraints.
 *
 * @param name - Resource name to validate
 * @param resourceType - Type of resource (e.g., 'storage', 'keyvault')
 * @returns Validation result with any errors or warnings
 *
 * @example
 * ```typescript
 * const result = validateResourceName('my-storage-123', 'storage');
 * if (!result.isValid) {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 */
export declare function validateResourceName(name: string, resourceType: string): NameValidationResult;
/**
 * Validates parameters required for resource name generation.
 *
 * @param params - Object containing generation parameters
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = validateGenerationParams({
 *   resourceType: 'storage',
 *   organization: 'dp',
 *   project: 'authr'
 * });
 * ```
 */
export declare function validateGenerationParams(params: {
    resourceType?: string;
    organization?: string;
    project?: string;
    environment?: string;
    geography?: string;
    instance?: string;
}): NameValidationResult;
/**
 * Checks if a name would be truncated for a given resource type.
 *
 * @param name - Name to check
 * @param resourceType - Resource type
 * @returns True if name exceeds maximum length for resource type
 *
 * @example
 * ```typescript
 * const willTruncate = isNameTooLong('very-long-storage-account-name-here', 'storage');
 * // Returns true (exceeds 24 character limit)
 * ```
 */
export declare function isNameTooLong(name: string, resourceType: string): boolean;
//# sourceMappingURL=validation.d.ts.map