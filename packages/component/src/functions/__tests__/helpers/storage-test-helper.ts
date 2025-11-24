/**
 * Azure Storage (Azurite) Test Helper
 *
 * @remarks
 * Utilities for testing with Azurite storage emulator.
 * Provides setup/teardown, connection management, and test data utilities.
 *
 * @packageDocumentation
 */

import {
  BlobServiceClient,
  ContainerClient,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';

/**
 * Azurite Emulator Configuration
 */
export const AZURITE_CONFIG = {
  accountName: process.env.AZURITE_ACCOUNT_NAME || 'devstoreaccount1',
  accountKey:
    process.env.AZURITE_ACCOUNT_KEY ||
    'Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==',
  blobEndpoint: process.env.AZURITE_BLOB_ENDPOINT || 'http://127.0.0.1:10000/devstoreaccount1',
};

/**
 * Test storage configuration
 */
export interface TestStorageConfig {
  containers: string[];
}

/**
 * Storage Test Helper
 *
 * @remarks
 * Manages Azure Blob Storage test resources with automatic cleanup
 */
export class StorageTestHelper {
  private serviceClient: BlobServiceClient;
  private containers: Map<string, ContainerClient> = new Map();
  private config: TestStorageConfig;

  constructor(config: TestStorageConfig) {
    this.config = config;

    // Create credentials
    const sharedKeyCredential = new StorageSharedKeyCredential(
      AZURITE_CONFIG.accountName,
      AZURITE_CONFIG.accountKey
    );

    // Create service client
    this.serviceClient = new BlobServiceClient(AZURITE_CONFIG.blobEndpoint, sharedKeyCredential);
  }

  /**
   * Setup test containers
   */
  async setup(): Promise<void> {
    try {
      for (const containerName of this.config.containers) {
        const containerClient = this.serviceClient.getContainerClient(containerName);
        await containerClient.createIfNotExists();
        this.containers.set(containerName, containerClient);
      }
    } catch (error) {
      throw new Error(
        `Failed to setup storage test containers: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Teardown test containers
   */
  async teardown(): Promise<void> {
    try {
      for (const [containerName, containerClient] of this.containers) {
        try {
          await containerClient.delete();
        } catch (error) {
          // Container might not exist, continue
          console.warn(`Failed to delete container ${containerName}:`, error);
        }
      }
      this.containers.clear();
    } catch (error) {
      // Log but don't throw - teardown should be best-effort
      console.warn(
        `Failed to teardown storage test containers: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Get container client by name
   */
  getContainer(containerName: string): ContainerClient {
    const container = this.containers.get(containerName);
    if (!container) {
      throw new Error(`Container '${containerName}' not found. Did you call setup()?`);
    }
    return container;
  }

  /**
   * Get blob service client
   */
  getServiceClient(): BlobServiceClient {
    return this.serviceClient;
  }

  /**
   * Upload test blob
   */
  async uploadBlob(
    containerName: string,
    blobName: string,
    content: Buffer | string
  ): Promise<string> {
    const container = this.getContainer(containerName);
    const blockBlobClient = container.getBlockBlobClient(blobName);

    const data = typeof content === 'string' ? Buffer.from(content) : content;
    await blockBlobClient.upload(data, data.length);

    return blockBlobClient.url;
  }

  /**
   * Download test blob
   */
  async downloadBlob(containerName: string, blobName: string): Promise<Buffer> {
    const container = this.getContainer(containerName);
    const blockBlobClient = container.getBlockBlobClient(blobName);

    const downloadResponse = await blockBlobClient.download(0);
    if (!downloadResponse.readableStreamBody) {
      throw new Error('No readable stream body');
    }

    const chunks: Buffer[] = [];
    for await (const chunk of downloadResponse.readableStreamBody) {
      chunks.push(Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }

  /**
   * Delete test blob
   */
  async deleteBlob(containerName: string, blobName: string): Promise<void> {
    const container = this.getContainer(containerName);
    const blockBlobClient = container.getBlockBlobClient(blobName);
    await blockBlobClient.deleteIfExists();
  }

  /**
   * Check if blob exists
   */
  async blobExists(containerName: string, blobName: string): Promise<boolean> {
    const container = this.getContainer(containerName);
    const blockBlobClient = container.getBlockBlobClient(blobName);
    return await blockBlobClient.exists();
  }

  /**
   * Clear all blobs from a container
   */
  async clearContainer(containerName: string): Promise<void> {
    const container = this.getContainer(containerName);

    for await (const blob of container.listBlobsFlat()) {
      await container.deleteBlob(blob.name);
    }
  }

  /**
   * Clear all containers
   */
  async clearAllContainers(): Promise<void> {
    for (const containerName of this.containers.keys()) {
      await this.clearContainer(containerName);
    }
  }

  /**
   * Generate test blob name
   */
  static generateBlobName(prefix = 'test'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}-${timestamp}-${random}.bin`;
  }

  /**
   * Generate random test data
   */
  static generateTestData(sizeInBytes: number): Buffer {
    return Buffer.alloc(sizeInBytes, 'x');
  }

  /**
   * Wait for Azurite to be ready
   */
  static async waitForAzurite(maxRetries = 30, retryDelay = 1000): Promise<boolean> {
    const sharedKeyCredential = new StorageSharedKeyCredential(
      AZURITE_CONFIG.accountName,
      AZURITE_CONFIG.accountKey
    );

    const serviceClient = new BlobServiceClient(AZURITE_CONFIG.blobEndpoint, sharedKeyCredential);

    for (let i = 0; i < maxRetries; i++) {
      try {
        await serviceClient.getAccountInfo();
        return true;
      } catch (error) {
        if (i === maxRetries - 1) {
          throw new Error(
            `Azurite not ready after ${maxRetries} attempts: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }

    return false;
  }

  /**
   * Check if running in CI environment
   */
  static isCI(): boolean {
    return process.env.CI === 'true';
  }

  /**
   * Check if Azurite is available
   */
  static async isAzuriteAvailable(): Promise<boolean> {
    try {
      const sharedKeyCredential = new StorageSharedKeyCredential(
        AZURITE_CONFIG.accountName,
        AZURITE_CONFIG.accountKey
      );

      const serviceClient = new BlobServiceClient(AZURITE_CONFIG.blobEndpoint, sharedKeyCredential);

      await serviceClient.getAccountInfo();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create a unique test container name
 */
export function createTestContainerName(testName: string): string {
  const timestamp = Date.now();
  const sanitized = testName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  return `test-${sanitized}-${timestamp}`.substring(0, 63); // Azure container name limit
}
