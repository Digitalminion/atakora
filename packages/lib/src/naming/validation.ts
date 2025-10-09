import type { NameValidationResult, ResourceValidationRules } from './types';

/**
 * Creates a validation result object.
 *
 * @param isValid - Whether validation passed
 * @param errors - Array of error messages
 * @param warnings - Array of warning messages
 * @returns Validation result
 */
function createNameValidationResult(
  isValid: boolean,
  errors: string[] = [],
  warnings: string[] = []
): NameValidationResult {
  return {
    isValid,
    errors: Object.freeze(errors),
    warnings: Object.freeze(warnings),
  };
}

/**
 * Validation rules for Azure Storage Account names.
 *
 * @see {@link https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules#microsoftstorage}
 */
export const STORAGE_ACCOUNT_RULES: ResourceValidationRules = {
  minLength: 3,
  maxLength: 24,
  pattern: /^[a-z0-9]+$/,
  globallyUnique: true,
  caseSensitive: false,
};

/**
 * Validation rules for Azure Key Vault names.
 *
 * @see {@link https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules#microsoftkeyvault}
 */
export const KEY_VAULT_RULES: ResourceValidationRules = {
  minLength: 3,
  maxLength: 24,
  pattern: /^[a-zA-Z][a-zA-Z0-9-]*[a-zA-Z0-9]$/,
  globallyUnique: true,
  caseSensitive: false,
};

/**
 * Validation rules for Azure Resource Group names.
 *
 * @see {@link https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules#microsoftresources}
 */
export const RESOURCE_GROUP_RULES: ResourceValidationRules = {
  minLength: 1,
  maxLength: 90,
  pattern: /^[\w\-().]+[\w\-()]$/,
  globallyUnique: false,
  caseSensitive: false,
};

/**
 * Validation rules for Azure Virtual Network names.
 *
 * @see {@link https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules#microsoftnetwork}
 */
export const VIRTUAL_NETWORK_RULES: ResourceValidationRules = {
  minLength: 2,
  maxLength: 64,
  pattern: /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9_]$/,
  globallyUnique: false,
  caseSensitive: false,
};

/**
 * Validation rules for Azure Cosmos DB account names.
 *
 * @see {@link https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules#microsoftdocumentdb}
 */
export const COSMOS_DB_RULES: ResourceValidationRules = {
  minLength: 3,
  maxLength: 44,
  pattern: /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
  globallyUnique: true,
  caseSensitive: false,
};

/**
 * Default validation rules for most Azure resources.
 */
export const DEFAULT_VALIDATION_RULES: ResourceValidationRules = {
  minLength: 1,
  maxLength: 64,
  pattern: /^[a-zA-Z0-9][a-zA-Z0-9-_]*[a-zA-Z0-9]$/,
  globallyUnique: false,
  caseSensitive: false,
};

/**
 * Map of resource types to their validation rules.
 */
export const RESOURCE_VALIDATION_RULES: Record<string, ResourceValidationRules> = {
  storage: STORAGE_ACCOUNT_RULES,
  keyvault: KEY_VAULT_RULES,
  rg: RESOURCE_GROUP_RULES,
  rgLandingZone: RESOURCE_GROUP_RULES,
  rgPlatform: RESOURCE_GROUP_RULES,
  vnet: VIRTUAL_NETWORK_RULES,
  cosmos: COSMOS_DB_RULES,
};

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
export function getValidationRules(resourceType: string): ResourceValidationRules {
  return RESOURCE_VALIDATION_RULES[resourceType] ?? DEFAULT_VALIDATION_RULES;
}

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
export function validateResourceName(name: string, resourceType: string): NameValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Get validation rules for this resource type
  const rules = getValidationRules(resourceType);

  // Check if name is empty
  if (!name || name.trim().length === 0) {
    errors.push('Resource name cannot be empty');
    return createNameValidationResult(false, errors, warnings);
  }

  // Check minimum length
  if (rules.minLength !== undefined && name.length < rules.minLength) {
    errors.push(
      `Resource name must be at least ${rules.minLength} characters long (current: ${name.length})`
    );
  }

  // Check maximum length
  if (rules.maxLength !== undefined && name.length > rules.maxLength) {
    errors.push(
      `Resource name must not exceed ${rules.maxLength} characters (current: ${name.length})`
    );
  }

  // Check pattern match
  if (rules.pattern && !rules.pattern.test(name)) {
    errors.push(`Resource name '${name}' does not match required pattern for ${resourceType}`);
  }

  // Resource-specific validations
  if (resourceType === 'storage') {
    validateStorageAccountName(name, errors, warnings);
  } else if (resourceType === 'keyvault') {
    validateKeyVaultName(name, errors, warnings);
  } else if (
    resourceType === 'rg' ||
    resourceType === 'rgLandingZone' ||
    resourceType === 'rgPlatform'
  ) {
    validateResourceGroupName(name, errors, warnings);
  }

  // Check for custom validator
  if (rules.customValidator) {
    const customResult = rules.customValidator(name);
    errors.push(...customResult.errors);
    warnings.push(...customResult.warnings);
  }

  return createNameValidationResult(errors.length === 0, errors, warnings);
}

/**
 * Validates a storage account name according to Azure constraints.
 *
 * @param name - Storage account name to validate
 * @param errors - Array to collect error messages
 * @param warnings - Array to collect warning messages
 */
function validateStorageAccountName(name: string, errors: string[], warnings: string[]): void {
  // Check for uppercase letters
  if (name !== name.toLowerCase()) {
    errors.push('Storage account names must be lowercase');
  }

  // Check for hyphens or special characters
  if (!/^[a-z0-9]+$/.test(name)) {
    errors.push('Storage account names can only contain lowercase letters and numbers');
  }

  // Warn about global uniqueness requirement
  if (name.length >= 3 && name.length <= 24) {
    warnings.push('Storage account names must be globally unique across Azure');
  }
}

/**
 * Validates a Key Vault name according to Azure constraints.
 *
 * @param name - Key Vault name to validate
 * @param errors - Array to collect error messages
 * @param warnings - Array to collect warning messages
 */
function validateKeyVaultName(name: string, errors: string[], warnings: string[]): void {
  // Check if starts with a letter
  if (!/^[a-zA-Z]/.test(name)) {
    errors.push('Key Vault names must start with a letter');
  }

  // Check if ends with alphanumeric
  if (!/[a-zA-Z0-9]$/.test(name)) {
    errors.push('Key Vault names must end with a letter or number');
  }

  // Check for consecutive hyphens
  if (/--/.test(name)) {
    errors.push('Key Vault names cannot contain consecutive hyphens');
  }

  // Warn about global uniqueness requirement
  if (name.length >= 3 && name.length <= 24) {
    warnings.push('Key Vault names must be globally unique across Azure');
  }
}

/**
 * Validates a Resource Group name according to Azure constraints.
 *
 * @param name - Resource Group name to validate
 * @param errors - Array to collect error messages
 * @param warnings - Array to collect warning messages
 */
function validateResourceGroupName(name: string, errors: string[], warnings: string[]): void {
  // Check if ends with period
  if (name.endsWith('.')) {
    errors.push('Resource Group names cannot end with a period');
  }

  // Check for invalid characters at start/end
  if (/^[._-]/.test(name)) {
    warnings.push('Resource Group names should start with an alphanumeric character');
  }
}

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
export function validateGenerationParams(params: {
  resourceType?: string;
  organization?: string;
  project?: string;
  environment?: string;
  geography?: string;
  instance?: string;
}): NameValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required parameters
  const requiredParams = [
    'resourceType',
    'organization',
    'project',
    'environment',
    'geography',
    'instance',
  ] as const;

  for (const param of requiredParams) {
    if (!params[param] || params[param]?.trim().length === 0) {
      errors.push(`Required parameter '${param}' is missing or empty`);
    }
  }

  return createNameValidationResult(errors.length === 0, errors, warnings);
}

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
export function isNameTooLong(name: string, resourceType: string): boolean {
  const rules = getValidationRules(resourceType);
  return rules.maxLength !== undefined && name.length > rules.maxLength;
}
