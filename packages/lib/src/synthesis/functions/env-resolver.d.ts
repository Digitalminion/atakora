import { FunctionConfiguration } from './types';
/**
 * Resource reference interface for cross-resource dependencies
 */
export interface IResourceReference {
    /**
     * Resource ID or name
     */
    readonly resourceId: string;
    /**
     * ARM resource type
     */
    readonly resourceType: string;
    /**
     * Property to reference (e.g., 'endpoint', 'connectionString')
     */
    readonly property?: string;
    /**
     * Converts reference to string value or ARM expression
     */
    toString(): string;
}
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
export declare class EnvironmentResolver {
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
    private readonly placeholderPattern;
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
    resolveEnvironment(functionConfig: FunctionConfiguration, appEnvironment: Record<string, string | IResourceReference>): Record<string, string>;
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
    private resolvePlaceholders;
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
    private resolveValue;
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
    extractPlaceholders(template: string): string[];
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
    validateEnvironment(functionConfig: FunctionConfiguration, appEnvironment: Record<string, string | IResourceReference>): {
        valid: boolean;
        missing: string[];
        required: string[];
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
    resolveMultiple(functionConfigs: FunctionConfiguration[], appEnvironment: Record<string, string | IResourceReference>): Map<string, Record<string, string>>;
}
//# sourceMappingURL=env-resolver.d.ts.map