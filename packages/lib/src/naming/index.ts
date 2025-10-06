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
 *   organization: 'digital-products',
 *   project: 'colorai',
 *   environment: 'nonprod',
 *   geography: 'eastus',
 *   instance: '01'
 * });
 * // Result: "vnet-digital-products-colorai-nonprod-eastus-01"
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

// Core generator class
export { ResourceNameGenerator } from './generator';

// Type definitions
export type {
  ResourceTypePatterns,
  ResourceTypeMaxLengths,
  NamingConventions,
  NamingConventionConfig,
  ResourceNameParams,
  ValidationResult,
  ResourceValidationRules,
} from './types';

// Default conventions and utilities
export {
  DEFAULT_CONVENTIONS,
  DEFAULT_PATTERNS,
  DEFAULT_MAX_LENGTHS,
  DEFAULT_SEPARATOR,
  DEFAULT_MAX_LENGTH,
  mergeConventions,
  SPECIAL_CASE_RESOURCES,
  isSpecialCaseResource,
  getSpecialCaseRules,
} from './conventions';

// Validation utilities
export {
  validateResourceName,
  validateGenerationParams,
  getValidationRules,
  isNameTooLong,
  STORAGE_ACCOUNT_RULES,
  KEY_VAULT_RULES,
  RESOURCE_GROUP_RULES,
  VIRTUAL_NETWORK_RULES,
  COSMOS_DB_RULES,
  DEFAULT_VALIDATION_RULES,
  RESOURCE_VALIDATION_RULES,
} from './validation';

// Scope-aware naming
export { generateScopedName, validateScopedParams } from './scoped-naming';
export type { ScopedResourceNameParams } from './scoped-naming';
