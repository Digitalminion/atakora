/**
 * Resource naming convention system for Azure resources.
 *
 * @remarks
 * This module provides utilities for generating Azure-compliant resource names
 * based on organizational naming conventions. It handles:
 * - Configurable naming patterns per resource type
 * - Resource-specific constraints (length, character rules)
 * - Special handling for storage accounts, key vaults, etc.
 * - Automatic truncation and validation
 *
 * @packageDocumentation
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ResourceNameGenerator } from '@atakora/lib/naming';
 *
 * const generator = new ResourceNameGenerator();
 *
 * const vnetName = generator.generateName({
 *   resourceType: 'vnet',
 *   organization: 'digital-minion',
 *   project: 'authr',
 *   environment: 'nonprod',
 *   geography: 'eastus',
 *   instance: '01'
 * });
 * // Result: "vnet-digital-minion-authr-nonprod-eastus-01"
 * ```
 *
 * @example
 * Custom conventions:
 * ```typescript
 * import { ResourceNameGenerator } from '@atakora/lib/naming';
 *
 * const generator = new ResourceNameGenerator({
 *   separator: '_',
 *   patterns: {
 *     storage: 'stor'
 *   }
 * });
 * ```
 */
export { ResourceNameGenerator } from './generator';
export type { ResourceTypePatterns, ResourceTypeMaxLengths, NamingConventions, NamingConventionConfig, ResourceNameParams, NameValidationResult, ResourceValidationRules, } from './types';
export { DEFAULT_CONVENTIONS, DEFAULT_PATTERNS, DEFAULT_MAX_LENGTHS, DEFAULT_SEPARATOR, DEFAULT_MAX_LENGTH, mergeConventions, SPECIAL_CASE_RESOURCES, isSpecialCaseResource, getSpecialCaseRules, } from './conventions';
export { validateResourceName, validateGenerationParams, getValidationRules, isNameTooLong, STORAGE_ACCOUNT_RULES, KEY_VAULT_RULES, RESOURCE_GROUP_RULES, VIRTUAL_NETWORK_RULES, COSMOS_DB_RULES, DEFAULT_VALIDATION_RULES, RESOURCE_VALIDATION_RULES, } from './validation';
export { generateScopedName, validateScopedParams } from './scoped-naming';
export type { ScopedResourceNameParams } from './scoped-naming';
export { constructIdToPurpose, getServiceAbbreviation } from './construct-id-utils';
export { NamingService } from './naming-service';
//# sourceMappingURL=index.d.ts.map