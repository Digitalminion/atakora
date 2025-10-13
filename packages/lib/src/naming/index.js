"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NamingService = exports.getServiceAbbreviation = exports.constructIdToPurpose = exports.validateScopedParams = exports.generateScopedName = exports.RESOURCE_VALIDATION_RULES = exports.DEFAULT_VALIDATION_RULES = exports.COSMOS_DB_RULES = exports.VIRTUAL_NETWORK_RULES = exports.RESOURCE_GROUP_RULES = exports.KEY_VAULT_RULES = exports.STORAGE_ACCOUNT_RULES = exports.isNameTooLong = exports.getValidationRules = exports.validateGenerationParams = exports.validateResourceName = exports.getSpecialCaseRules = exports.isSpecialCaseResource = exports.SPECIAL_CASE_RESOURCES = exports.mergeConventions = exports.DEFAULT_MAX_LENGTH = exports.DEFAULT_SEPARATOR = exports.DEFAULT_MAX_LENGTHS = exports.DEFAULT_PATTERNS = exports.DEFAULT_CONVENTIONS = exports.ResourceNameGenerator = void 0;
// Core generator class
var generator_1 = require("./generator");
Object.defineProperty(exports, "ResourceNameGenerator", { enumerable: true, get: function () { return generator_1.ResourceNameGenerator; } });
// Default conventions and utilities
var conventions_1 = require("./conventions");
Object.defineProperty(exports, "DEFAULT_CONVENTIONS", { enumerable: true, get: function () { return conventions_1.DEFAULT_CONVENTIONS; } });
Object.defineProperty(exports, "DEFAULT_PATTERNS", { enumerable: true, get: function () { return conventions_1.DEFAULT_PATTERNS; } });
Object.defineProperty(exports, "DEFAULT_MAX_LENGTHS", { enumerable: true, get: function () { return conventions_1.DEFAULT_MAX_LENGTHS; } });
Object.defineProperty(exports, "DEFAULT_SEPARATOR", { enumerable: true, get: function () { return conventions_1.DEFAULT_SEPARATOR; } });
Object.defineProperty(exports, "DEFAULT_MAX_LENGTH", { enumerable: true, get: function () { return conventions_1.DEFAULT_MAX_LENGTH; } });
Object.defineProperty(exports, "mergeConventions", { enumerable: true, get: function () { return conventions_1.mergeConventions; } });
Object.defineProperty(exports, "SPECIAL_CASE_RESOURCES", { enumerable: true, get: function () { return conventions_1.SPECIAL_CASE_RESOURCES; } });
Object.defineProperty(exports, "isSpecialCaseResource", { enumerable: true, get: function () { return conventions_1.isSpecialCaseResource; } });
Object.defineProperty(exports, "getSpecialCaseRules", { enumerable: true, get: function () { return conventions_1.getSpecialCaseRules; } });
// Validation utilities
var validation_1 = require("./validation");
Object.defineProperty(exports, "validateResourceName", { enumerable: true, get: function () { return validation_1.validateResourceName; } });
Object.defineProperty(exports, "validateGenerationParams", { enumerable: true, get: function () { return validation_1.validateGenerationParams; } });
Object.defineProperty(exports, "getValidationRules", { enumerable: true, get: function () { return validation_1.getValidationRules; } });
Object.defineProperty(exports, "isNameTooLong", { enumerable: true, get: function () { return validation_1.isNameTooLong; } });
Object.defineProperty(exports, "STORAGE_ACCOUNT_RULES", { enumerable: true, get: function () { return validation_1.STORAGE_ACCOUNT_RULES; } });
Object.defineProperty(exports, "KEY_VAULT_RULES", { enumerable: true, get: function () { return validation_1.KEY_VAULT_RULES; } });
Object.defineProperty(exports, "RESOURCE_GROUP_RULES", { enumerable: true, get: function () { return validation_1.RESOURCE_GROUP_RULES; } });
Object.defineProperty(exports, "VIRTUAL_NETWORK_RULES", { enumerable: true, get: function () { return validation_1.VIRTUAL_NETWORK_RULES; } });
Object.defineProperty(exports, "COSMOS_DB_RULES", { enumerable: true, get: function () { return validation_1.COSMOS_DB_RULES; } });
Object.defineProperty(exports, "DEFAULT_VALIDATION_RULES", { enumerable: true, get: function () { return validation_1.DEFAULT_VALIDATION_RULES; } });
Object.defineProperty(exports, "RESOURCE_VALIDATION_RULES", { enumerable: true, get: function () { return validation_1.RESOURCE_VALIDATION_RULES; } });
// Scope-aware naming
var scoped_naming_1 = require("./scoped-naming");
Object.defineProperty(exports, "generateScopedName", { enumerable: true, get: function () { return scoped_naming_1.generateScopedName; } });
Object.defineProperty(exports, "validateScopedParams", { enumerable: true, get: function () { return scoped_naming_1.validateScopedParams; } });
// Construct ID utilities
var construct_id_utils_1 = require("./construct-id-utils");
Object.defineProperty(exports, "constructIdToPurpose", { enumerable: true, get: function () { return construct_id_utils_1.constructIdToPurpose; } });
Object.defineProperty(exports, "getServiceAbbreviation", { enumerable: true, get: function () { return construct_id_utils_1.getServiceAbbreviation; } });
// Naming service
var naming_service_1 = require("./naming-service");
Object.defineProperty(exports, "NamingService", { enumerable: true, get: function () { return naming_service_1.NamingService; } });
