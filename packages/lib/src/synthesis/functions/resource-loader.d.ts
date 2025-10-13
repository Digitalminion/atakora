import { FunctionConfiguration, FunctionDirectory } from './types';
/**
 * Resource Loader for Function Definitions
 *
 * @remarks
 * Loads and parses resource.ts files to extract function configurations.
 * This is used during the Build phase after functions have been discovered.
 *
 * The resource loader:
 * 1. Dynamically imports resource.ts files
 * 2. Validates the exported definition structure
 * 3. Extracts typed environment variable information
 * 4. Returns complete function configurations
 *
 * @example
 * ```typescript
 * const loader = new ResourceLoader();
 * const config = await loader.loadResourceConfig(functionDir);
 * console.log(`Loaded ${config.definition.config.trigger.type} trigger`);
 * ```
 */
export declare class ResourceLoader {
    /**
     * Loads a single function's resource.ts configuration
     *
     * @param directory - Function directory information
     * @returns Complete function configuration
     * @throws {ResourceLoadError} If loading or validation fails
     *
     * @remarks
     * This method performs the following steps:
     * 1. Dynamically imports the resource.ts module
     * 2. Extracts the default export (FunctionDefinition)
     * 3. Validates the definition structure
     * 4. Updates metadata with environment variable type information
     *
     * The resource.ts file must export a FunctionDefinition as default:
     * ```typescript
     * export default defineFunction({ ... });
     * ```
     */
    loadResourceConfig(directory: FunctionDirectory): Promise<FunctionConfiguration>;
    /**
     * Loads multiple function configurations in parallel
     *
     * @param directories - Array of function directories
     * @returns Array of function configurations
     * @throws {ResourceLoadError} If any loading fails
     *
     * @remarks
     * Uses Promise.all for parallel loading to improve performance.
     * If any resource fails to load, the entire operation fails.
     */
    loadMultiple(directories: FunctionDirectory[]): Promise<FunctionConfiguration[]>;
    /**
     * Dynamically imports a resource.ts module
     *
     * @param resourcePath - Absolute path to resource.ts
     * @returns Imported module
     * @throws {Error} If import fails
     *
     * @remarks
     * Uses dynamic import() to load TypeScript modules at runtime.
     * The module is evaluated and its exports are returned.
     *
     * On Windows, we need to convert the path to a file:// URL to
     * handle paths with spaces and special characters correctly.
     *
     * @internal
     */
    private importResourceModule;
    /**
     * Extracts FunctionDefinition from module exports
     *
     * @param module - Imported module
     * @param resourcePath - Path for error messages
     * @returns Function definition
     * @throws {Error} If definition is missing or invalid
     *
     * @remarks
     * The resource.ts file should export a FunctionDefinition as default:
     * ```typescript
     * export default defineFunction({ ... });
     * ```
     *
     * We also support named export 'definition' as a fallback:
     * ```typescript
     * export const definition = defineFunction({ ... });
     * ```
     *
     * @internal
     */
    private extractDefinition;
    /**
     * Validates function definition structure
     *
     * @param definition - Function definition to validate
     * @param functionName - Function name for error messages
     * @throws {Error} If validation fails
     *
     * @remarks
     * Validates that the definition has required properties:
     * - type: Must be 'AzureFunction'
     * - version: Must be present
     * - config: Must be an object with trigger
     * - config.trigger: Must have a type property
     *
     * This catches common configuration errors early.
     *
     * @internal
     */
    private validateDefinition;
    /**
     * Validates binding configurations
     *
     * @param bindings - Array of bindings to validate
     * @param bindingType - Type of bindings (input/output) for error messages
     * @param functionName - Function name for error messages
     * @throws {Error} If validation fails
     *
     * @remarks
     * Validates that each binding has required properties:
     * - type: Binding type (cosmosDb, blob, etc.)
     * - direction: in, out, or inout
     * - name: Binding name for code reference
     *
     * @internal
     */
    private validateBindings;
    /**
     * Updates an existing function configuration with loaded definition
     *
     * @param existingConfig - Existing configuration from discovery
     * @param directory - Function directory
     * @returns Updated configuration
     * @throws {ResourceLoadError} If loading fails
     *
     * @remarks
     * This is useful when you want to update a configuration that was
     * created during the Discovery phase with placeholder data.
     */
    updateConfiguration(existingConfig: FunctionConfiguration, directory: FunctionDirectory): Promise<FunctionConfiguration>;
}
//# sourceMappingURL=resource-loader.d.ts.map