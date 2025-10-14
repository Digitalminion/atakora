/**
 * Artifact Uploader
 *
 * Uploads all deployment artifacts (templates and packages) to Azure Storage
 * before deployment. Handles parallel uploads with progress tracking.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { ArtifactStorageManager, UploadResult as StorageUploadResult } from '@atakora/lib/synthesis/storage';
import type { CloudAssemblyV2, StackManifestV2 } from '@atakora/lib/synthesis/types';

export interface TemplateArtifact {
  name: string;
  localPath: string;
  blobUrl: string;
  sasUrl: string;
  checksum: string;
  size: number;
}

export interface PackageArtifact {
  name: string;
  localPath: string;
  blobUrl: string;
  sasUrl: string;
  checksum: string;
  size: number;
  functionAppName: string;
}

export interface UploadResult {
  rootTemplateUri: string;
  linkedTemplates: Map<string, string>; // name -> URI with SAS
  functionPackages: Map<string, string>; // packagePath -> URI with SAS
  baseUri: string; // _artifactsLocation parameter value
  sasToken: string; // _artifactsLocationSasToken parameter value
}

export interface UploadProgress {
  current: number;
  total: number;
  currentFile: string;
  phase: 'templates' | 'packages';
}

export type ProgressCallback = (progress: UploadProgress) => void;

/**
 * Uploads deployment artifacts to Azure Storage
 */
export class ArtifactUploader {
  private maxConcurrency = 5;
  private maxRetries = 3;
  private retryDelayMs = 1000;

  constructor(
    private readonly onProgress?: ProgressCallback
  ) {}

  /**
   * Upload all artifacts from cloud assembly
   */
  async uploadAll(
    manifest: CloudAssemblyV2,
    storageManager: ArtifactStorageManager,
    stackName: string
  ): Promise<UploadResult> {
    const stack = manifest.stacks[stackName];
    if (!stack) {
      throw new Error(`Stack "${stackName}" not found in manifest`);
    }

    const baseDir = manifest.directory;

    // Collect all files to upload
    const templateFiles: string[] = [];
    const packageFiles: string[] = [];

    // Root template
    const rootTemplatePath = path.join(baseDir, stack.templatePath);
    templateFiles.push(rootTemplatePath);

    // Linked templates
    if (stack.linkedTemplates && stack.linkedTemplates.length > 0) {
      for (const linkedTemplate of stack.linkedTemplates) {
        const linkedPath = path.join(baseDir, linkedTemplate);
        templateFiles.push(linkedPath);
      }
    }

    // Function packages
    if (stack.artifacts?.functionPackages) {
      for (const pkg of stack.artifacts.functionPackages) {
        packageFiles.push(pkg.packagePath);
      }
    }

    // Upload templates
    const templateArtifacts = await this.uploadTemplates(
      templateFiles,
      storageManager,
      baseDir
    );

    // Upload packages
    const packageArtifacts = await this.uploadPackages(
      packageFiles,
      storageManager,
      stack
    );

    // Build result
    const linkedTemplates = new Map<string, string>();
    const functionPackages = new Map<string, string>();

    // Map template artifacts
    for (const artifact of templateArtifacts) {
      if (artifact.name === stack.templatePath) {
        // Skip root template in linked templates map
        continue;
      }
      linkedTemplates.set(artifact.name, artifact.sasUrl);
    }

    // Map package artifacts
    for (const artifact of packageArtifacts) {
      functionPackages.set(artifact.name, artifact.sasUrl);
    }

    // Get root template artifact
    const rootArtifact = templateArtifacts.find(
      a => a.name === stack.templatePath
    );

    if (!rootArtifact) {
      throw new Error('Root template artifact not found after upload');
    }

    // Get base URI and extract SAS token
    const baseUri = storageManager.getArtifactsBaseUri();
    const sasToken = this.extractSasToken(rootArtifact.sasUrl);

    return {
      rootTemplateUri: rootArtifact.sasUrl,
      linkedTemplates,
      functionPackages,
      baseUri,
      sasToken
    };
  }

  /**
   * Upload templates in parallel
   */
  private async uploadTemplates(
    templatePaths: string[],
    storageManager: ArtifactStorageManager,
    baseDir: string
  ): Promise<TemplateArtifact[]> {
    const results: TemplateArtifact[] = [];
    const totalFiles = templatePaths.length;

    // Create batches for parallel upload
    const batches = this.createBatches(templatePaths, this.maxConcurrency);

    let processedCount = 0;

    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map(async (templatePath) => {
          const templateName = path.relative(baseDir, templatePath);

          this.reportProgress({
            current: processedCount,
            total: totalFiles,
            currentFile: templateName,
            phase: 'templates'
          });

          try {
            const artifact = await this.uploadTemplate(
              templatePath,
              templateName,
              storageManager
            );

            processedCount++;

            this.reportProgress({
              current: processedCount,
              total: totalFiles,
              currentFile: templateName,
              phase: 'templates'
            });

            return artifact;
          } catch (error) {
            throw new Error(
              `Failed to upload template ${templateName}: ${error}`
            );
          }
        })
      );

      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Upload a single template with retry logic
   */
  async uploadTemplate(
    templatePath: string,
    templateName: string,
    storageManager: ArtifactStorageManager
  ): Promise<TemplateArtifact> {
    const content = await fs.promises.readFile(templatePath, 'utf-8');
    const size = Buffer.byteLength(content, 'utf-8');

    // Upload with retry
    const uploadResult = await this.retryOperation(async () => {
      return await storageManager.uploadTemplate(templateName, content);
    });

    // Validate checksum
    const localChecksum = this.calculateChecksum(Buffer.from(content, 'utf-8'));
    if (localChecksum !== uploadResult.checksum) {
      throw new Error(
        `Checksum mismatch for ${templateName}: expected ${localChecksum}, got ${uploadResult.checksum}`
      );
    }

    return {
      name: templateName,
      localPath: templatePath,
      blobUrl: uploadResult.blobUrl,
      sasUrl: uploadResult.sasUrl,
      checksum: uploadResult.checksum,
      size
    };
  }

  /**
   * Upload packages in parallel
   */
  private async uploadPackages(
    packagePaths: string[],
    storageManager: ArtifactStorageManager,
    stack: StackManifestV2
  ): Promise<PackageArtifact[]> {
    if (packagePaths.length === 0) {
      return [];
    }

    const results: PackageArtifact[] = [];
    const totalFiles = packagePaths.length;

    // Create batches for parallel upload
    const batches = this.createBatches(packagePaths, this.maxConcurrency);

    let processedCount = 0;

    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map(async (packagePath) => {
          const packageName = path.basename(packagePath);

          this.reportProgress({
            current: processedCount,
            total: totalFiles,
            currentFile: packageName,
            phase: 'packages'
          });

          try {
            // Find function app name from stack artifacts
            const functionAppName = this.findFunctionAppName(
              packagePath,
              stack
            );

            const artifact = await this.uploadPackage(
              packagePath,
              packageName,
              storageManager,
              functionAppName
            );

            processedCount++;

            this.reportProgress({
              current: processedCount,
              total: totalFiles,
              currentFile: packageName,
              phase: 'packages'
            });

            return artifact;
          } catch (error) {
            throw new Error(
              `Failed to upload package ${packageName}: ${error}`
            );
          }
        })
      );

      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Upload a single package with retry logic
   */
  async uploadPackage(
    packagePath: string,
    packageName: string,
    storageManager: ArtifactStorageManager,
    functionAppName: string
  ): Promise<PackageArtifact> {
    const content = await fs.promises.readFile(packagePath);
    const size = content.length;

    // Upload with retry
    const uploadResult = await this.retryOperation(async () => {
      return await storageManager.uploadPackage(packageName, content);
    });

    // Validate checksum
    const localChecksum = this.calculateChecksum(content);
    if (localChecksum !== uploadResult.checksum) {
      throw new Error(
        `Checksum mismatch for ${packageName}: expected ${localChecksum}, got ${uploadResult.checksum}`
      );
    }

    return {
      name: packageName,
      localPath: packagePath,
      blobUrl: uploadResult.blobUrl,
      sasUrl: uploadResult.sasUrl,
      checksum: uploadResult.checksum,
      size,
      functionAppName
    };
  }

  /**
   * Validate upload integrity by comparing checksums
   */
  async validateChecksum(localPath: string, uploadedChecksum: string): Promise<boolean> {
    const content = await fs.promises.readFile(localPath);
    const localChecksum = this.calculateChecksum(content);
    return localChecksum === uploadedChecksum;
  }

  /**
   * Private helper: Create batches for parallel processing
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Private helper: Retry operation with exponential backoff
   */
  private async retryOperation<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          throw error;
        }

        // Wait before retry with exponential backoff
        if (attempt < this.maxRetries - 1) {
          const delay = this.retryDelayMs * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }

    throw new Error(
      `Operation failed after ${this.maxRetries} retries: ${lastError?.message}`
    );
  }

  /**
   * Private helper: Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Network errors and transient failures are retryable
    const retryablePatterns = [
      /ECONNRESET/i,
      /ETIMEDOUT/i,
      /ENOTFOUND/i,
      /ECONNREFUSED/i,
      /network/i,
      /timeout/i,
      /503/i,
      /502/i,
      /429/i // Rate limiting
    ];

    const errorString = error?.message || String(error);
    return retryablePatterns.some(pattern => pattern.test(errorString));
  }

  /**
   * Private helper: Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Private helper: Calculate SHA256 checksum
   */
  private calculateChecksum(content: Buffer): string {
    return crypto
      .createHash('sha256')
      .update(content)
      .digest('hex');
  }

  /**
   * Private helper: Report progress
   */
  private reportProgress(progress: UploadProgress): void {
    if (this.onProgress) {
      this.onProgress(progress);
    }
  }

  /**
   * Private helper: Extract SAS token from URL
   */
  private extractSasToken(sasUrl: string): string {
    const url = new URL(sasUrl);
    return url.search; // Returns "?sv=...&sig=..."
  }

  /**
   * Private helper: Find function app name from package path
   */
  private findFunctionAppName(
    packagePath: string,
    stack: StackManifestV2
  ): string {
    if (!stack.artifacts?.functionPackages) {
      throw new Error('No function packages in stack artifacts');
    }

    const pkg = stack.artifacts.functionPackages.find(
      p => p.packagePath === packagePath
    );

    if (!pkg) {
      throw new Error(`Package ${packagePath} not found in stack artifacts`);
    }

    return pkg.functionAppName;
  }
}
