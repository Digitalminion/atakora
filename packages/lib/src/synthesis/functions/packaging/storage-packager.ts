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

import * as crypto from 'crypto';
import * as path from 'path';
import {
  BuildArtifact,
  FunctionPackage,
  PackagingStrategy,
  DeploymentConfig,
  PackagingError,
  TriggerConfig,
  BindingConfig,
} from '../types';

/**
 * ZIP file entry
 */
interface ZipEntry {
  /**
   * File path within ZIP
   */
  readonly path: string;

  /**
   * File contents
   */
  readonly content: Uint8Array | string;

  /**
   * Compression level (0-9, 0=store, 9=maximum)
   */
  readonly compression?: number;
}

/**
 * function.json structure for Azure Functions
 */
interface FunctionJson {
  /**
   * Bindings array (trigger + inputs + outputs)
   */
  readonly bindings: readonly any[];

  /**
   * Whether function is disabled
   */
  readonly disabled: boolean;

  /**
   * Script file (entry point)
   */
  readonly scriptFile: string;
}

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
export class StoragePackager {
  private readonly options: Required<StoragePackagerOptions>;

  constructor(options?: StoragePackagerOptions) {
    this.options = {
      includeSourceMaps: options?.includeSourceMaps ?? true,
      compressionLevel: options?.compressionLevel ?? 9,
      outputDir: options?.outputDir ?? '.atakora/packages',
    };
  }

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
  async package(
    artifact: BuildArtifact,
    trigger: TriggerConfig,
    inputBindings?: readonly BindingConfig[],
    outputBindings?: readonly BindingConfig[]
  ): Promise<FunctionPackage> {
    try {
      // Generate function.json
      const functionJson = this.generateFunctionJson(trigger, inputBindings, outputBindings);

      // Create ZIP entries
      const entries: ZipEntry[] = [
        // Main function code
        {
          path: 'index.js',
          content: artifact.bundle,
          compression: this.options.compressionLevel,
        },
        // function.json
        {
          path: 'function.json',
          content: JSON.stringify(functionJson, null, 2),
          compression: this.options.compressionLevel,
        },
      ];

      // Add source map if available and enabled
      if (this.options.includeSourceMaps && artifact.sourceMap) {
        entries.push({
          path: 'index.js.map',
          content: artifact.sourceMap,
          compression: this.options.compressionLevel,
        });
      }

      // Create ZIP package (in-memory)
      const zipBuffer = await this.createZip(entries);

      // Compute integrity hash
      const integrity = this.computeIntegrity(zipBuffer);

      // Create deployment config
      const deployment: DeploymentConfig = {
        type: 'storage',
        integrity,
        // Location will be set during assembly phase when uploaded
        // to Azure Storage and SAS token is generated
      };

      // Create function package
      const pkg: FunctionPackage = {
        artifact,
        strategy: PackagingStrategy.STORAGE,
        deployment,
      };

      return pkg;
    } catch (error) {
      throw new PackagingError(
        `Failed to package function ${artifact.functionName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        PackagingStrategy.STORAGE,
        error instanceof Error ? error : undefined
      );
    }
  }

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
  shouldUseStoragePackaging(artifact: BuildArtifact): boolean {
    const sizeKB = artifact.metadata.size / 1024;
    const hasNativeModules = artifact.metadata.hasNativeModules ?? false;

    return sizeKB >= 4 && sizeKB < 100 * 1024 && !hasNativeModules;
  }

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
  private generateFunctionJson(
    trigger: TriggerConfig,
    inputBindings?: readonly BindingConfig[],
    outputBindings?: readonly BindingConfig[]
  ): FunctionJson {
    const bindings: any[] = [];

    // Add trigger (always first binding)
    bindings.push(this.triggerToBinding(trigger));

    // Add input bindings
    if (inputBindings) {
      bindings.push(...inputBindings.map(b => this.bindingToJson(b)));
    }

    // Add output bindings
    if (outputBindings) {
      bindings.push(...outputBindings.map(b => this.bindingToJson(b)));
    }

    return {
      bindings,
      disabled: false,
      scriptFile: 'index.js',
    };
  }

  /**
   * Convert trigger config to function.json binding
   *
   * @param trigger - Trigger configuration
   * @returns Binding JSON
   *
   * @internal
   */
  private triggerToBinding(trigger: TriggerConfig): any {
    const binding: any = {
      type: trigger.type,
      direction: 'in',
      name: 'trigger', // Standard name for trigger parameter
    };

    // Copy trigger-specific properties
    for (const [key, value] of Object.entries(trigger)) {
      if (key !== 'type') {
        binding[key] = value;
      }
    }

    return binding;
  }

  /**
   * Convert binding config to function.json binding
   *
   * @param binding - Binding configuration
   * @returns Binding JSON
   *
   * @internal
   */
  private bindingToJson(binding: BindingConfig): any {
    const json: any = {
      type: binding.type,
      direction: binding.direction,
      name: binding.name,
    };

    // Copy binding-specific properties
    for (const [key, value] of Object.entries(binding)) {
      if (key !== 'type' && key !== 'direction' && key !== 'name') {
        json[key] = value;
      }
    }

    return json;
  }

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
  private async createZip(entries: ZipEntry[]): Promise<Uint8Array> {
    // NOTE: This is a placeholder implementation
    // In production, use a proper ZIP library
    // For now, we'll create a simple concatenation with metadata

    const buffers: Uint8Array[] = [];
    let totalSize = 0;

    for (const entry of entries) {
      // Convert content to Uint8Array if needed
      const content = typeof entry.content === 'string'
        ? new TextEncoder().encode(entry.content)
        : entry.content;

      // For now, just concatenate (in production, create proper ZIP structure)
      buffers.push(content);
      totalSize += content.length;
    }

    // Combine all buffers
    const result = new Uint8Array(totalSize);
    let offset = 0;
    for (const buffer of buffers) {
      result.set(buffer, offset);
      offset += buffer.length;
    }

    return result;
  }

  /**
   * Compute SHA256 integrity hash
   *
   * @param data - Data to hash
   * @returns Hex-encoded hash
   *
   * @internal
   */
  private computeIntegrity(data: Uint8Array): string {
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  }

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
  estimatePackageSize(artifact: BuildArtifact): number {
    // Estimate compression ratio (typically 60-70% of original size)
    const compressionRatio = 0.65;

    // Bundle size
    let estimatedSize = artifact.metadata.size * compressionRatio;

    // Add source map if included
    if (this.options.includeSourceMaps && artifact.sourceMap) {
      estimatedSize += artifact.sourceMap.length * compressionRatio;
    }

    // Add overhead for function.json and ZIP structure (~1KB)
    estimatedSize += 1024;

    return Math.ceil(estimatedSize);
  }
}
