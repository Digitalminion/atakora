"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvironmentResolver = void 0;
var types_1 = require("./types");
/**
 * Environment Resolution System
 *
 * @remarks
 * Resolves ${PLACEHOLDER} variables in function environment configurations
 * by interpolating values from app.ts infrastructure definitions.
 *
 * Resolution process:
 * 1. Identifies placeholders in function environment (${VAR_NAME})
 * 2. Looks up values in app environment (provided by app.ts)
 * 3. Handles both literal strings and IResourceReference objects
 * 4. Validates that all placeholders are provided
 * 5. Returns fully resolved environment variables
 *
 * @example
 * ```typescript
 * // In resource.ts:
 * environment: {
 *   DATABASE_URL: '${COSMOS_ENDPOINT}',
 *   API_KEY: '${API_SECRET}'
 * }
 *
 * // In app.ts:
 * const function = new AzureFunction(app, 'MyFunction', {
 *   environment: {
 *     COSMOS_ENDPOINT: cosmosDb.endpoint,  // IResourceReference
 *     API_SECRET: 'literal-secret-value'   // string
 *   }
 * });
 *
 * // Resolver output:
 * {
 *   DATABASE_URL: "[reference(...).endpoint]",  // ARM expression
 *   API_KEY: "literal-secret-value"              // literal value
 * }
 * ```
 */
var EnvironmentResolver = /** @class */ (function () {
    function EnvironmentResolver() {
        /**
         * Regular expression to match ${PLACEHOLDER} patterns
         *
         * @remarks
         * Matches patterns like ${VAR_NAME} where VAR_NAME can contain:
         * - Letters (a-z, A-Z)
         * - Numbers (0-9)
         * - Underscores (_)
         * - Hyphens (-)
         * - Dots (.)
         *
         * Examples:
         * - ${DATABASE_URL}
         * - ${API_KEY}
         * - ${cosmos.endpoint}
         * - ${storage-account}
         */
        this.placeholderPattern = /\$\{([^}]+)\}/g;
    }
    /**
     * Resolves environment variables for a function
     *
     * @param functionConfig - Function configuration from resource.ts
     * @param appEnvironment - Environment variables provided in app.ts
     * @returns Fully resolved environment variable map
     * @throws {EnvironmentResolutionError} If placeholder is missing or resolution fails
     *
     * @remarks
     * Resolution rules:
     * 1. Placeholders in resource.ts (${VAR}) are replaced with app.ts values
     * 2. Literal values in resource.ts are kept as-is
     * 3. Additional app.ts variables (not in resource.ts) are added
     * 4. IResourceReference objects are converted to ARM expressions or strings
     *
     * Priority order (highest to lowest):
     * 1. Placeholder resolution from app.ts
     * 2. Literal values from resource.ts
     * 3. Additional variables from app.ts
     */
    EnvironmentResolver.prototype.resolveEnvironment = function (functionConfig, appEnvironment) {
        var resolved = {};
        var functionEnv = functionConfig.definition.config.environment || {};
        // Process function environment variables
        for (var _i = 0, _a = Object.entries(functionEnv); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], value = _b[1];
            if (typeof value === 'string') {
                // Check if value contains placeholders
                var hasPlaceholders = this.placeholderPattern.test(value);
                this.placeholderPattern.lastIndex = 0; // Reset regex state
                if (hasPlaceholders) {
                    // Resolve placeholders
                    resolved[key] = this.resolvePlaceholders(value, appEnvironment, functionConfig.metadata.functionName);
                }
                else {
                    // Keep literal value
                    resolved[key] = value;
                }
            }
        }
        // Add additional environment variables from app.ts that weren't in resource.ts
        for (var _c = 0, _d = Object.entries(appEnvironment); _c < _d.length; _c++) {
            var _e = _d[_c], key = _e[0], value = _e[1];
            if (!(key in resolved)) {
                resolved[key] = this.resolveValue(value);
            }
        }
        return resolved;
    };
    /**
     * Resolves placeholders in a template string
     *
     * @param template - Template string with ${PLACEHOLDER} patterns
     * @param values - Values to interpolate
     * @param functionName - Function name for error messages
     * @returns Resolved string
     * @throws {EnvironmentResolutionError} If placeholder is missing
     *
     * @remarks
     * Supports multiple placeholders in a single string:
     * ```typescript
     * template: "https://${HOST}:${PORT}/api"
     * values: { HOST: "localhost", PORT: "3000" }
     * result: "https://localhost:3000/api"
     * ```
     *
     * @internal
     */
    EnvironmentResolver.prototype.resolvePlaceholders = function (template, values, functionName) {
        var result = template;
        var matches = template.match(this.placeholderPattern);
        if (!matches) {
            return template;
        }
        for (var _i = 0, matches_1 = matches; _i < matches_1.length; _i++) {
            var match = matches_1[_i];
            // Extract placeholder name (remove ${ and })
            var placeholderName = match.slice(2, -1);
            // Check if value exists
            if (!(placeholderName in values)) {
                throw new types_1.EnvironmentResolutionError("Environment variable '".concat(placeholderName, "' not provided in app.ts"), placeholderName, functionName);
            }
            // Resolve value
            var replacement = this.resolveValue(values[placeholderName]);
            // Replace placeholder with value
            result = result.replace(match, replacement);
        }
        return result;
    };
    /**
     * Resolves a value (string or IResourceReference) to a string
     *
     * @param value - Value to resolve
     * @returns String representation
     *
     * @remarks
     * Handles two types of values:
     * 1. Literal strings - returned as-is
     * 2. IResourceReference - converted to string (ARM expression or value)
     *
     * For IResourceReference objects, this calls the toString() method
     * which should return either:
     * - ARM template expression (e.g., "[reference(...).endpoint]")
     * - Literal value (for testing or development)
     *
     * @internal
     */
    EnvironmentResolver.prototype.resolveValue = function (value) {
        if (typeof value === 'string') {
            return value;
        }
        // IResourceReference - convert to string
        return value.toString();
    };
    /**
     * Extracts all placeholder names from a template string
     *
     * @param template - Template string to analyze
     * @returns Array of unique placeholder names
     *
     * @remarks
     * Useful for:
     * - Validating required environment variables
     * - Building dependency graphs
     * - Generating documentation
     *
     * @example
     * ```typescript
     * const placeholders = resolver.extractPlaceholders(
     *   "https://${HOST}:${PORT}/${PATH}"
     * );
     * // Result: ['HOST', 'PORT', 'PATH']
     * ```
     */
    EnvironmentResolver.prototype.extractPlaceholders = function (template) {
        var placeholders = new Set();
        var matches = template.match(this.placeholderPattern);
        if (matches) {
            for (var _i = 0, matches_2 = matches; _i < matches_2.length; _i++) {
                var match = matches_2[_i];
                var name_1 = match.slice(2, -1);
                placeholders.add(name_1);
            }
        }
        return Array.from(placeholders);
    };
    /**
     * Validates that all required placeholders are provided
     *
     * @param functionConfig - Function configuration
     * @param appEnvironment - Available environment variables
     * @returns Validation result with missing placeholders
     *
     * @remarks
     * This method checks all environment variables in the function
     * configuration and validates that values are provided for all
     * placeholders. Useful for early validation before synthesis.
     *
     * @example
     * ```typescript
     * const validation = resolver.validateEnvironment(config, appEnv);
     * if (!validation.valid) {
     *   console.error('Missing variables:', validation.missing);
     * }
     * ```
     */
    EnvironmentResolver.prototype.validateEnvironment = function (functionConfig, appEnvironment) {
        var functionEnv = functionConfig.definition.config.environment || {};
        var required = new Set();
        var missing = [];
        // Extract all placeholders from function environment
        for (var _i = 0, _a = Object.values(functionEnv); _i < _a.length; _i++) {
            var value = _a[_i];
            if (typeof value === 'string') {
                var placeholders = this.extractPlaceholders(value);
                placeholders.forEach(function (p) { return required.add(p); });
            }
        }
        // Check which placeholders are missing
        for (var _b = 0, required_1 = required; _b < required_1.length; _b++) {
            var placeholder = required_1[_b];
            if (!(placeholder in appEnvironment)) {
                missing.push(placeholder);
            }
        }
        return {
            valid: missing.length === 0,
            missing: missing,
            required: Array.from(required),
        };
    };
    /**
     * Resolves environment variables for multiple functions
     *
     * @param functionConfigs - Array of function configurations
     * @param appEnvironment - Shared app environment
     * @returns Map of resolved environments by function name
     * @throws {EnvironmentResolutionError} If any resolution fails
     *
     * @remarks
     * Processes multiple functions in parallel for better performance.
     * All functions share the same app environment.
     */
    EnvironmentResolver.prototype.resolveMultiple = function (functionConfigs, appEnvironment) {
        var resolved = new Map();
        for (var _i = 0, functionConfigs_1 = functionConfigs; _i < functionConfigs_1.length; _i++) {
            var config = functionConfigs_1[_i];
            var functionEnv = this.resolveEnvironment(config, appEnvironment);
            resolved.set(config.metadata.functionName, functionEnv);
        }
        return resolved;
    };
    return EnvironmentResolver;
}());
exports.EnvironmentResolver = EnvironmentResolver;
