import * as path from 'path';
import {
  FunctionConfiguration,
  FunctionDefinition,
  FunctionDirectory,
  ResourceLoadError,
} from './types';

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
export class ResourceLoader {
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
  async loadResourceConfig(
    directory: FunctionDirectory
  ): Promise<FunctionConfiguration> {
    try {
      // Dynamically import resource.ts
      const module = await this.importResourceModule(directory.resourcePath);

      // Extract default export
      const definition = this.extractDefinition(module, directory.resourcePath);

      // Validate definition structure
      this.validateDefinition(definition, directory.name);

      // Create complete configuration
      const config: FunctionConfiguration = {
        directory,
        definition,
        metadata: {
          discoveredAt: Date.now(),
          functionName: directory.name,
          hasTypedEnvironment: !!definition.config.environment,
        },
      };

      return config;
    } catch (error) {
      throw new ResourceLoadError(
        `Failed to load resource.ts for function '${directory.name}': ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        directory.resourcePath,
        error instanceof Error ? error : undefined
      );
    }
  }

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
  async loadMultiple(
    directories: FunctionDirectory[]
  ): Promise<FunctionConfiguration[]> {
    return Promise.all(
      directories.map((dir) => this.loadResourceConfig(dir))
    );
  }

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
  private async importResourceModule(resourcePath: string): Promise<any> {
    try {
      // Convert to absolute path
      const absolutePath = path.resolve(resourcePath);

      // Convert to file:// URL for cross-platform compatibility
      const fileUrl = new URL(`file:///${absolutePath.replace(/\\/g, '/')}`);

      // Dynamic import
      const module = await import(fileUrl.href);

      return module;
    } catch (error) {
      throw new Error(
        `Failed to import resource.ts: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

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
  private extractDefinition(
    module: any,
    resourcePath: string
  ): FunctionDefinition {
    // Try default export first
    if (module.default) {
      return module.default as FunctionDefinition;
    }

    // Try named 'definition' export
    if (module.definition) {
      return module.definition as FunctionDefinition;
    }

    // No valid export found
    throw new Error(
      `resource.ts must export a FunctionDefinition as default or named 'definition' export. ` +
        `Found exports: ${Object.keys(module).join(', ')}`
    );
  }

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
  private validateDefinition(
    definition: any,
    functionName: string
  ): asserts definition is FunctionDefinition {
    // Check type
    if (definition.type !== 'AzureFunction') {
      throw new Error(
        `Invalid function definition type. Expected 'AzureFunction', got '${definition.type}'`
      );
    }

    // Check version
    if (!definition.version) {
      throw new Error('Function definition must have a version property');
    }

    // Check config
    if (!definition.config || typeof definition.config !== 'object') {
      throw new Error('Function definition must have a config object');
    }

    // Check trigger
    if (!definition.config.trigger || !definition.config.trigger.type) {
      throw new Error(
        'Function config must have a trigger with a type property'
      );
    }

    // Validate bindings if present
    if (definition.config.inputBindings) {
      this.validateBindings(
        definition.config.inputBindings,
        'input',
        functionName
      );
    }

    if (definition.config.outputBindings) {
      this.validateBindings(
        definition.config.outputBindings,
        'output',
        functionName
      );
    }
  }

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
  private validateBindings(
    bindings: readonly any[],
    bindingType: string,
    functionName: string
  ): void {
    if (!Array.isArray(bindings)) {
      throw new Error(
        `${bindingType} bindings must be an array in function '${functionName}'`
      );
    }

    for (const [index, binding] of bindings.entries()) {
      if (!binding.type) {
        throw new Error(
          `${bindingType} binding at index ${index} must have a type property in function '${functionName}'`
        );
      }

      if (!binding.direction) {
        throw new Error(
          `${bindingType} binding '${binding.type}' at index ${index} must have a direction property in function '${functionName}'`
        );
      }

      if (!binding.name) {
        throw new Error(
          `${bindingType} binding '${binding.type}' at index ${index} must have a name property in function '${functionName}'`
        );
      }
    }
  }

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
  async updateConfiguration(
    existingConfig: FunctionConfiguration,
    directory: FunctionDirectory
  ): Promise<FunctionConfiguration> {
    const loadedConfig = await this.loadResourceConfig(directory);

    return {
      ...existingConfig,
      definition: loadedConfig.definition,
      metadata: {
        ...existingConfig.metadata,
        hasTypedEnvironment: loadedConfig.metadata.hasTypedEnvironment,
      },
    };
  }
}
