import { DiscoveryResult } from './types';
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
export declare class FunctionDiscovery {
    private readonly functionsPath;
    /**
     * Creates a new Function Discovery instance
     *
     * @param functionsPath - Absolute or relative path to functions directory
     */
    constructor(functionsPath: string);
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
    discover(): Promise<DiscoveryResult>;
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
    private scanFunctionsDirectory;
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
    private buildFunctionRegistry;
    /**
     * Checks if a file exists
     *
     * @param filePath - Path to check
     * @returns True if file exists
     *
     * @internal
     */
    private fileExists;
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
    private computeFileHash;
    /**
     * Gets the absolute path to the functions directory
     *
     * @returns Absolute path
     */
    getFunctionsPath(): string;
}
//# sourceMappingURL=discovery.d.ts.map