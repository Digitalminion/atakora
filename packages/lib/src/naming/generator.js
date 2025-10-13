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
exports.ResourceNameGenerator = void 0;
var conventions_1 = require("./conventions");
var validation_1 = require("./validation");
var scoped_naming_1 = require("./scoped-naming");
/**
 * Generates Azure-compliant resource names according to configurable naming conventions.
 *
 * @remarks
 * This class handles:
 * - Name generation based on organizational patterns
 * - Resource-specific transformations (e.g., storage accounts without hyphens)
 * - Automatic truncation to meet Azure length constraints
 * - Validation against Azure naming rules
 *
 * @example
 * Basic usage with defaults:
 * ```typescript
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
 * With custom conventions:
 * ```typescript
 * const generator = new ResourceNameGenerator({
 *   separator: '_',
 *   patterns: {
 *     storage: 'stor'
 *   }
 * });
 * ```
 *
 * @example
 * Storage account (special case):
 * ```typescript
 * const generator = new ResourceNameGenerator();
 *
 * const storageName = generator.generateName({
 *   resourceType: 'storage',
 *   organization: 'dp',
 *   project: 'authr',
 *   environment: 'nonprod',
 *   geography: 'eus',
 *   instance: '01'
 * });
 * // Result: "stdpauthrnonprodeus01" (no hyphens, lowercase, max 24 chars)
 * ```
 */
var ResourceNameGenerator = /** @class */ (function () {
    /**
     * Creates a new ResourceNameGenerator instance.
     *
     * @param config - Optional custom naming convention configuration.
     *                 If not provided, uses default conventions from AuthR implementation.
     *
     * @example
     * ```typescript
     * // Use default conventions
     * const generator = new ResourceNameGenerator();
     *
     * // Customize conventions
     * const customGenerator = new ResourceNameGenerator({
     *   separator: '_',
     *   maxLength: 50,
     *   patterns: {
     *     storage: 'stor',
     *     keyvault: 'vault'
     *   }
     * });
     * ```
     */
    function ResourceNameGenerator(config) {
        this.conventions = (0, conventions_1.mergeConventions)(config);
    }
    /**
     * Generates a resource name according to configured naming conventions.
     *
     * @param params - Parameters for name generation
     * @returns Generated resource name, compliant with Azure constraints
     *
     * @throws {Error} If required parameters are missing or invalid
     *
     * @example
     * ```typescript
     * const generator = new ResourceNameGenerator();
     *
     * // Basic resource name
     * const name = generator.generateName({
     *   resourceType: 'vnet',
     *   organization: 'digital-minion',
     *   project: 'authr',
     *   environment: 'nonprod',
     *   geography: 'eastus',
     *   instance: '01'
     * });
     *
     * // With purpose
     * const subnetName = generator.generateName({
     *   resourceType: 'subnet',
     *   organization: 'digital-minion',
     *   project: 'authr',
     *   purpose: 'data',
     *   environment: 'nonprod',
     *   geography: 'eastus',
     *   instance: '01'
     * });
     * ```
     */
    ResourceNameGenerator.prototype.generateName = function (params) {
        // Validate parameters
        var validation = (0, validation_1.validateGenerationParams)(params);
        if (!validation.isValid) {
            throw new Error("Invalid name generation parameters: ".concat(validation.errors.join(', ')));
        }
        // Get resource pattern (prefix)
        var pattern = this.getPattern(params.resourceType);
        // Build name components
        var components = this.buildComponents(pattern, params);
        // Join with separator
        var name = components.join(this.conventions.separator);
        // Apply resource-specific transformations
        name = this.applyTransformations(name, params.resourceType);
        // Apply length limits and truncate if necessary
        name = this.applyLengthLimit(name, params.resourceType);
        return name;
    };
    /**
     * Validates a resource name against Azure naming constraints.
     *
     * @param name - Resource name to validate
     * @param resourceType - Type of Azure resource
     * @returns Validation result containing errors and warnings
     *
     * @example
     * ```typescript
     * const generator = new ResourceNameGenerator();
     * const result = generator.validateName('my-storage-123', 'storage');
     *
     * if (!result.isValid) {
     *   console.error('Validation failed:', result.errors);
     * }
     *
     * if (result.warnings.length > 0) {
     *   console.warn('Warnings:', result.warnings);
     * }
     * ```
     */
    ResourceNameGenerator.prototype.validateName = function (name, resourceType) {
        return (0, validation_1.validateResourceName)(name, resourceType);
    };
    /**
     * Gets the naming pattern (prefix) for a resource type.
     *
     * @param resourceType - Resource type identifier
     * @returns Pattern/prefix for the resource type
     *
     * @example
     * ```typescript
     * const generator = new ResourceNameGenerator();
     * const pattern = generator.getPattern('storage'); // Returns "st"
     * ```
     */
    ResourceNameGenerator.prototype.getPattern = function (resourceType) {
        var pattern = this.conventions.patterns[resourceType];
        if (!pattern) {
            // No pattern found, use resource type as prefix
            return resourceType;
        }
        return pattern;
    };
    /**
     * Gets the maximum length constraint for a resource type.
     *
     * @param resourceType - Resource type identifier
     * @returns Maximum length, or default if not specified
     *
     * @example
     * ```typescript
     * const generator = new ResourceNameGenerator();
     * const maxLen = generator.getMaxLength('storage'); // Returns 24
     * ```
     */
    ResourceNameGenerator.prototype.getMaxLength = function (resourceType) {
        var _a;
        return (_a = this.conventions.maxLengths[resourceType]) !== null && _a !== void 0 ? _a : this.conventions.maxLength;
    };
    /**
     * Builds name components array from parameters.
     *
     * @param pattern - Resource type pattern/prefix
     * @param params - Name generation parameters
     * @returns Array of name components in correct order
     */
    ResourceNameGenerator.prototype.buildComponents = function (pattern, params) {
        var components = [pattern];
        // Add purpose if specified (comes right after resource type prefix)
        if (params.purpose) {
            components.push(params.purpose);
        }
        // Add organization and project
        components.push(params.organization, params.project);
        // Add environment, geography, and instance
        components.push(params.environment, params.geography, params.instance);
        // Add additional suffix if provided
        if (params.additionalSuffix) {
            components.push(params.additionalSuffix);
        }
        return components;
    };
    /**
     * Applies resource-specific transformations to the name.
     *
     * @param name - Generated name before transformations
     * @param resourceType - Resource type
     * @returns Transformed name
     *
     * @remarks
     * Handles special cases like:
     * - Storage accounts: remove hyphens, force lowercase
     * - Key Vaults: force lowercase
     */
    ResourceNameGenerator.prototype.applyTransformations = function (name, resourceType) {
        var specialRules = (0, conventions_1.getSpecialCaseRules)(resourceType);
        if (!specialRules) {
            return name;
        }
        var transformed = name;
        // Remove hyphens if required (e.g., storage accounts)
        if (specialRules.removeHyphens) {
            transformed = transformed.replace(/-/g, '');
        }
        // Force lowercase if required
        if (specialRules.forceLowercase) {
            transformed = transformed.toLowerCase();
        }
        return transformed;
    };
    /**
     * Applies length limits to the name, truncating if necessary.
     *
     * @param name - Name to check and potentially truncate
     * @param resourceType - Resource type
     * @returns Name truncated to maximum length if necessary
     *
     * @remarks
     * Automatically truncates names that exceed resource-specific maximum lengths.
     * Use the `willTruncate()` method to check if truncation will occur before generation.
     */
    ResourceNameGenerator.prototype.applyLengthLimit = function (name, resourceType) {
        var maxLength = this.getMaxLength(resourceType);
        if (name.length <= maxLength) {
            return name;
        }
        // Truncate to maximum length for this resource type
        var truncated = name.substring(0, maxLength);
        return truncated;
    };
    /**
     * Gets the current naming conventions being used by this generator.
     *
     * @returns Current naming conventions (immutable copy)
     *
     * @example
     * ```typescript
     * const generator = new ResourceNameGenerator({ separator: '_' });
     * const conventions = generator.getConventions();
     * console.log(conventions.separator); // "_"
     * ```
     */
    ResourceNameGenerator.prototype.getConventions = function () {
        return Object.freeze(__assign({}, this.conventions));
    };
    /**
     * Checks if a name would be truncated for a given resource type.
     *
     * @param name - Name to check
     * @param resourceType - Resource type
     * @returns True if name exceeds maximum length
     *
     * @example
     * ```typescript
     * const generator = new ResourceNameGenerator();
     * const tooLong = generator.willTruncate('very-long-storage-name-here', 'storage');
     * // Returns true if name exceeds 24 characters
     * ```
     */
    ResourceNameGenerator.prototype.willTruncate = function (name, resourceType) {
        return (0, validation_1.isNameTooLong)(name, resourceType);
    };
    /**
     * Generate a resource name for a specific deployment scope.
     *
     * @param params - Scoped naming parameters
     * @returns Generated resource name appropriate for the scope
     *
     * @remarks
     * Different scopes have different naming patterns:
     * - **Tenant**: `{prefix}-{purpose}`
     * - **ManagementGroup**: `{prefix}-{org}-{purpose}`
     * - **Subscription**: `{prefix}-{org}-{project}-{purpose}-{env}-{geo}-{instance}`
     * - **ResourceGroup**: Same as Subscription
     *
     * @example
     * Subscription-scoped resource:
     * ```typescript
     * const generator = new ResourceNameGenerator();
     *
     * const rgName = generator.generateForScope({
     *   scope: DeploymentScope.Subscription,
     *   resourceType: 'rg',
     *   organization: 'digital-minion',
     *   project: 'authr',
     *   purpose: 'data',
     *   environment: 'nonprod',
     *   geography: 'eastus',
     *   instance: '01'
     * });
     * // Result: "rg-digital-minion-authr-data-nonprod-eastus-01"
     * ```
     *
     * @example
     * Management group (no geography):
     * ```typescript
     * const mgName = generator.generateForScope({
     *   scope: DeploymentScope.ManagementGroup,
     *   resourceType: 'mg',
     *   organization: 'digital-minion',
     *   purpose: 'platform'
     * });
     * // Result: "mg-digital-minion-platform"
     * ```
     */
    ResourceNameGenerator.prototype.generateForScope = function (params) {
        return (0, scoped_naming_1.generateScopedName)(params, this.conventions);
    };
    return ResourceNameGenerator;
}());
exports.ResourceNameGenerator = ResourceNameGenerator;
