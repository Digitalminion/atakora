import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  FunctionDirectory,
  FunctionConfiguration,
  FunctionDefinition,
  FunctionMetadata,
  DiscoveryResult,
  DiscoveryError,
} from './types';

/**
 * Function Discovery System
 *
 * @remarks
 * Scans filesystem for function directories containing handler.ts + resource.ts pairs.
 * This implements the Discovery phase (Phase 0) of the synthesis pipeline.
 *
 * The discovery process:
 * 1. Scans the functions directory for subdirectories
 * 2. Validates that each directory contains both handler.ts and resource.ts
 * 3. Computes content hashes for cache invalidation
 * 4. Builds a registry of discovered functions
 *
 * @example
 * ```typescript
 * const discovery = new FunctionDiscovery('../functions');
 * const result = await discovery.discover();
 * console.log(`Discovered ${result.functionsDiscovered} functions`);
 * ```
 */
export class FunctionDiscovery {
  /**
   * Creates a new Function Discovery instance
   *
   * @param functionsPath - Absolute or relative path to functions directory
   */
  constructor(private readonly functionsPath: string) {}

  /**
   * Discovers all functions in the functions directory
   *
   * @returns Discovery result with registry of found functions
   * @throws {DiscoveryError} If discovery fails
   *
   * @remarks
   * This method performs the complete discovery process:
   * 1. Resolves the absolute path to the functions directory
   * 2. Scans for subdirectories containing handler.ts + resource.ts
   * 3. Computes content hashes for cache invalidation
   * 4. Returns a registry of discovered functions
   *
   * Directories without both files are silently skipped.
   */
  async discover(): Promise<DiscoveryResult> {
    try {
      // Step 1: Scan functions directory
      const functionDirs = await this.scanFunctionsDirectory();

      // Step 2: Build function registry with metadata
      const registry = await this.buildFunctionRegistry(functionDirs);

      return {
        functionsDiscovered: registry.size,
        registry,
      };
    } catch (error) {
      throw new DiscoveryError(
        `Function discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Scans the functions directory for valid function directories
   *
   * @returns Array of function directories
   * @throws {DiscoveryError} If directory cannot be accessed
   *
   * @remarks
   * A valid function directory must contain:
   * - handler.ts: Runtime code
   * - resource.ts: Configuration
   *
   * The method skips:
   * - Files (not directories)
   * - Directories without both required files
   * - Hidden directories (starting with .)
   * - node_modules directories
   *
   * @internal
   */
  private async scanFunctionsDirectory(): Promise<FunctionDirectory[]> {
    const dirs: FunctionDirectory[] = [];
    const basePath = path.resolve(this.functionsPath);

    // Check if functions directory exists
    try {
      await fs.access(basePath);
    } catch {
      throw new DiscoveryError(
        `Functions directory not found: ${basePath}`,
        undefined,
        undefined
      );
    }

    // Read directory contents
    const entries = await fs.readdir(basePath, { withFileTypes: true });

    for (const entry of entries) {
      // Skip files and hidden/special directories
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.')) continue;
      if (entry.name === 'node_modules') continue;

      const functionPath = path.join(basePath, entry.name);
      const handlerPath = path.join(functionPath, 'handler.ts');
      const resourcePath = path.join(functionPath, 'resource.ts');

      // Check for both required files
      const hasHandler = await this.fileExists(handlerPath);
      const hasResource = await this.fileExists(resourcePath);

      if (hasHandler && hasResource) {
        dirs.push({
          name: entry.name,
          path: functionPath,
          handlerPath,
          resourcePath,
        });
      }
    }

    return dirs;
  }

  /**
   * Builds a registry of function configurations with metadata
   *
   * @param dirs - Function directories to process
   * @returns Map of function configurations by name
   * @throws {DiscoveryError} If configuration loading fails
   *
   * @remarks
   * For each function directory, this method:
   * 1. Computes content hashes for handler.ts and resource.ts
   * 2. Creates metadata for cache invalidation
   * 3. Stores configuration in registry
   *
   * Note: resource.ts files are NOT loaded/parsed at this stage.
   * They are loaded later by ResourceLoader during the Build phase.
   *
   * @internal
   */
  private async buildFunctionRegistry(
    dirs: FunctionDirectory[]
  ): Promise<Map<string, FunctionConfiguration>> {
    const registry = new Map<string, FunctionConfiguration>();

    for (const dir of dirs) {
      try {
        // Compute content hashes for cache invalidation
        const handlerHash = await this.computeFileHash(dir.handlerPath);
        const resourceHash = await this.computeFileHash(dir.resourcePath);

        // Create metadata
        const metadata: FunctionMetadata = {
          discoveredAt: Date.now(),
          functionName: dir.name,
          hasTypedEnvironment: false, // Will be determined by ResourceLoader
          handlerHash,
          resourceHash,
        };

        // Create placeholder configuration (actual definition loaded by ResourceLoader)
        const config: FunctionConfiguration = {
          directory: dir,
          definition: {
            type: 'AzureFunction',
            version: '1.0',
            config: {
              trigger: { type: 'unknown' }, // Placeholder
            },
          },
          metadata,
        };

        // Check for duplicate function names
        if (registry.has(dir.name)) {
          throw new DiscoveryError(
            `Duplicate function name found: ${dir.name}`,
            dir.name,
            undefined
          );
        }

        registry.set(dir.name, config);
      } catch (error) {
        throw new DiscoveryError(
          `Failed to process function directory: ${dir.name}`,
          dir.name,
          error instanceof Error ? error : undefined
        );
      }
    }

    return registry;
  }

  /**
   * Checks if a file exists
   *
   * @param filePath - Path to check
   * @returns True if file exists
   *
   * @internal
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Computes SHA256 hash of file contents
   *
   * @param filePath - Path to file
   * @returns Hex-encoded hash
   *
   * @remarks
   * Used for cache invalidation - if hash changes, rebuild is required.
   *
   * @internal
   */
  private async computeFileHash(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Gets the absolute path to the functions directory
   *
   * @returns Absolute path
   */
  getFunctionsPath(): string {
    return path.resolve(this.functionsPath);
  }
}
