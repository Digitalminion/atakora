/**
 * Storage packager for Azure Functions
 *
 * @remarks
 * This module packages function artifacts for deployment to Azure Storage.
 * Functions larger than 4KB but smaller than 100MB are typically deployed
 * via Storage Account using ZIP packages.
 *
 * The packager:
 * - Creates ZIP archives containing function code and metadata
 * - Generates function.json for bindings
 * - Computes integrity hashes
 * - Prepares deployment configuration
 */
import { BuildArtifact, FunctionPackage, TriggerConfig, BindingConfig } from '../types';
/**
 * Storage packager options
 */
export interface StoragePackagerOptions {
    /**
     * Include source maps in package
     */
    readonly includeSourceMaps?: boolean;
    /**
     * Compression level (0-9, default: 9)
     */
    readonly compressionLevel?: number;
    /**
     * Output directory for packages
     */
    readonly outputDir?: string;
}
/**
 * Storage packager for function deployment
 *
 * @remarks
 * Packages function artifacts into ZIP archives suitable for
 * deployment to Azure Storage and consumption by Azure Functions.
 *
 * @example
 * ```typescript
 * const packager = new StoragePackager({
 *   includeSourceMaps: true,
 *   compressionLevel: 9
 * });
 *
 * const pkg = await packager.package(artifact, trigger, inputBindings, outputBindings);
 * ```
 */
export declare class StoragePackager {
    private readonly options;
    constructor(options?: StoragePackagerOptions);
    /**
     * Package a function artifact for storage deployment
     *
     * @param artifact - Build artifact
     * @param trigger - Function trigger configuration
     * @param inputBindings - Input bindings (optional)
     * @param outputBindings - Output bindings (optional)
     * @returns Function package ready for deployment
     *
     * @throws {PackagingError} If packaging fails
     */
    package(artifact: BuildArtifact, trigger: TriggerConfig, inputBindings?: readonly BindingConfig[], outputBindings?: readonly BindingConfig[]): Promise<FunctionPackage>;
    /**
     * Determine if artifact should use storage packaging
     *
     * @param artifact - Build artifact
     * @returns True if storage packaging is appropriate
     *
     * @remarks
     * Storage packaging is suitable for:
     * - Functions > 4KB (too large for inline)
     * - Functions < 100MB (storage limit)
     * - Functions without native modules
     */
    shouldUseStoragePackaging(artifact: BuildArtifact): boolean;
    /**
     * Generate function.json from trigger and bindings
     *
     * @param trigger - Trigger configuration
     * @param inputBindings - Input bindings
     * @param outputBindings - Output bindings
     * @returns function.json structure
     *
     * @internal
     */
    private generateFunctionJson;
    /**
     * Convert trigger config to function.json binding
     *
     * @param trigger - Trigger configuration
     * @returns Binding JSON
     *
     * @internal
     */
    private triggerToBinding;
    /**
     * Convert binding config to function.json binding
     *
     * @param binding - Binding configuration
     * @returns Binding JSON
     *
     * @internal
     */
    private bindingToJson;
    /**
     * Create ZIP archive from entries
     *
     * @param entries - ZIP entries
     * @returns ZIP buffer
     *
     * @remarks
     * This is a simplified ZIP implementation for now.
     * In production, use a proper ZIP library like jszip or archiver.
     *
     * @internal
     */
    private createZip;
    /**
     * Compute SHA256 integrity hash
     *
     * @param data - Data to hash
     * @returns Hex-encoded hash
     *
     * @internal
     */
    private computeIntegrity;
    /**
     * Estimate package size
     *
     * @param artifact - Build artifact
     * @returns Estimated package size in bytes
     *
     * @remarks
     * Estimates final ZIP size based on bundle size and compression ratio.
     * Actual size may vary.
     */
    estimatePackageSize(artifact: BuildArtifact): number;
}
//# sourceMappingURL=storage-packager.d.ts.map