/**
 * Azure Blob Storage Client Implementation
 *
 * @remarks
 * Production-ready blob storage client with connection pooling,
 * streaming support, retry logic, and performance optimization.
 *
 * @packageDocumentation
 */

import {
  BlobServiceClient,
  ContainerClient,
  BlockBlobClient,
  StorageSharedKeyCredential,
  BlobUploadCommonResponse,
  BlobDownloadResponseParsed,
  StorageRetryPolicyType,
} from '@azure/storage-blob';
import { Readable } from 'stream';
import type { BlobOperations, UploadOptions, ExecutionContext } from './types';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Storage configuration options
 *
 * @internal
 */
export interface StorageConfig {
  /**
   * Storage account connection string
   */
  connectionString?: string;

  /**
   * Storage account name (alternative to connection string)
   */
  accountName?: string;

  /**
   * Storage account key (alternative to connection string)
   */
  accountKey?: string;

  /**
   * Default container name
   */
  defaultContainer?: string;

  /**
   * Maximum retry attempts
   * @defaultValue 3
   */
  maxRetries?: number;

  /**
   * Retry delay in milliseconds
   * @defaultValue 4000
   */
  retryDelayMs?: number;

  /**
   * Request timeout in milliseconds
   * @defaultValue 30000 (30 seconds)
   */
  timeoutMs?: number;

  /**
   * Threshold for streaming uploads (bytes)
   * Files larger than this will be uploaded in chunks
   * @defaultValue 5242880 (5MB)
   */
  streamingThreshold?: number;

  /**
   * Block size for chunked uploads (bytes)
   * @defaultValue 4194304 (4MB)
   */
  blockSize?: number;

  /**
   * Maximum concurrency for chunked uploads
   * @defaultValue 5
   */
  maxConcurrency?: number;
}

/**
 * Storage error class for better error handling
 *
 * @internal
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

// ============================================================================
// Connection Pool
// ============================================================================

/**
 * Global connection pool for blob storage clients
 *
 * @remarks
 * Implements singleton pattern to reuse connections across function invocations.
 * This eliminates connection overhead (~50-100ms) for warm starts.
 *
 * @internal
 */
class BlobConnectionPool {
  private static instance: BlobConnectionPool;
  private client: BlobServiceClient | null = null;
  private containers: Map<string, ContainerClient> = new Map();
  private config: StorageConfig = {};

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): BlobConnectionPool {
    if (!BlobConnectionPool.instance) {
      BlobConnectionPool.instance = new BlobConnectionPool();
    }
    return BlobConnectionPool.instance;
  }

  /**
   * Initialize the blob service client
   *
   * @param config - Storage configuration
   */
  public async initialize(config: StorageConfig): Promise<void> {
    if (this.client) {
      // Already initialized
      return;
    }

    this.config = config;

    // Create client from connection string or credentials
    if (config.connectionString) {
      this.client = BlobServiceClient.fromConnectionString(config.connectionString, {
        retryOptions: {
          maxTries: config.maxRetries ?? 3,
          retryDelayInMs: config.retryDelayMs ?? 4000,
          retryPolicyType: StorageRetryPolicyType.EXPONENTIAL,
        },
      });
    } else if (config.accountName && config.accountKey) {
      const credential = new StorageSharedKeyCredential(config.accountName, config.accountKey);
      const url = `https://${config.accountName}.blob.core.windows.net`;
      this.client = new BlobServiceClient(url, credential, {
        retryOptions: {
          maxTries: config.maxRetries ?? 3,
          retryDelayInMs: config.retryDelayMs ?? 4000,
          retryPolicyType: StorageRetryPolicyType.EXPONENTIAL,
        },
      });
    } else {
      throw new StorageError(
        'Storage configuration requires either connectionString or (accountName + accountKey)',
        'INVALID_CONFIG'
      );
    }
  }

  /**
   * Get container client
   *
   * @param containerName - Container name
   * @returns Container client
   */
  public async getContainer(containerName: string): Promise<ContainerClient> {
    if (!this.client) {
      await this.initializeFromEnvironment();
    }

    // Use cached container client if available
    if (!this.containers.has(containerName)) {
      const container = this.client!.getContainerClient(containerName);
      this.containers.set(containerName, container);
    }

    return this.containers.get(containerName)!;
  }

  /**
   * Get configuration
   */
  public getConfig(): StorageConfig {
    return this.config;
  }

  /**
   * Initialize from environment variables
   *
   * @private
   */
  private async initializeFromEnvironment(): Promise<void> {
    const config: StorageConfig = {
      connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
      accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME,
      accountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY,
      defaultContainer: process.env.AZURE_STORAGE_DEFAULT_CONTAINER || 'default',
    };

    await this.initialize(config);
  }

  /**
   * Reset the pool (for testing)
   *
   * @internal
   */
  public reset(): void {
    this.client = null;
    this.containers.clear();
    this.config = {};
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse storage URL to extract container and blob path
 *
 * @param url - Blob URL or path
 * @returns Container name and blob path
 *
 * @internal
 */
function parseStorageUrl(url: string): { container: string; blob: string } {
  // If it's just a path (no protocol), assume default container
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return { container: 'default', blob: url };
  }

  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split('/').filter((p) => p.length > 0);

    if (pathParts.length < 2) {
      throw new StorageError('Invalid blob URL format', 'INVALID_URL');
    }

    const container = pathParts[0];
    const blob = pathParts.slice(1).join('/');

    return { container, blob };
  } catch (error) {
    throw new StorageError(
      `Failed to parse storage URL: ${url}`,
      'INVALID_URL',
      undefined,
      error as Error
    );
  }
}

/**
 * Convert stream to buffer
 *
 * @param stream - Readable stream
 * @returns Buffer with stream contents
 *
 * @internal
 */
async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    stream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    stream.on('error', (error) => {
      reject(new StorageError('Failed to read stream', 'STREAM_ERROR', undefined, error));
    });
  });
}

/**
 * Convert buffer to stream
 *
 * @param buffer - Buffer to convert
 * @returns Readable stream
 *
 * @internal
 */
function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

/**
 * Determine if file should be streamed based on size
 *
 * @param data - File data
 * @param threshold - Streaming threshold in bytes
 * @returns True if file should be streamed
 *
 * @internal
 */
function shouldStream(data: Buffer | string, threshold: number): boolean {
  const size = typeof data === 'string' ? Buffer.byteLength(data) : data.length;
  return size > threshold;
}

// ============================================================================
// Blob Operations Implementation
// ============================================================================

/**
 * Create blob operations with Azure SDK integration
 *
 * @param executionContext - Execution context
 * @returns Blob operations
 *
 * @public
 */
export function createBlobOperations(executionContext: ExecutionContext): BlobOperations {
  const pool = BlobConnectionPool.getInstance();

  return {
    /**
     * Upload a blob to Azure Storage
     *
     * @param path - Blob path within container
     * @param data - Blob data (Buffer or string)
     * @param options - Upload options
     * @returns URL of uploaded blob
     */
    async upload(path: string, data: Buffer | string, options?: UploadOptions): Promise<string> {
      try {
        // Determine container
        const containerName =
          options?.metadata?.container || pool.getConfig().defaultContainer || 'default';
        const container = await pool.getContainer(containerName);

        // Get blob client
        const blobClient = container.getBlockBlobClient(path);

        // Convert string to buffer if needed
        const buffer = typeof data === 'string' ? Buffer.from(data) : data;
        const size = buffer.length;

        // Get configuration
        const config = pool.getConfig();
        const streamingThreshold = config.streamingThreshold ?? 5 * 1024 * 1024; // 5MB
        const blockSize = config.blockSize ?? 4 * 1024 * 1024; // 4MB
        const maxConcurrency = config.maxConcurrency ?? 5;

        // Upload with streaming for large files
        if (shouldStream(buffer, streamingThreshold)) {
          const stream = bufferToStream(buffer);
          await blobClient.uploadStream(stream, blockSize, maxConcurrency, {
            blobHTTPHeaders: {
              blobContentType: options?.contentType,
              blobCacheControl: options?.cacheControl,
            },
            metadata: options?.metadata,
          });
        } else {
          // Direct upload for small files
          await blobClient.upload(buffer, size, {
            blobHTTPHeaders: {
              blobContentType: options?.contentType,
              blobCacheControl: options?.cacheControl,
            },
            metadata: options?.metadata,
          });
        }

        return blobClient.url;
      } catch (error: any) {
        throw new StorageError(
          `Failed to upload blob: ${path}`,
          error.code || 'UPLOAD_ERROR',
          error.statusCode,
          error
        );
      }
    },

    /**
     * Download a blob from Azure Storage
     *
     * @param url - Blob URL or path
     * @returns Blob data as Buffer
     */
    async download(url: string): Promise<Buffer> {
      try {
        // Parse URL to get container and blob path
        const { container, blob } = parseStorageUrl(url);

        // Get container client
        const containerClient = await pool.getContainer(container);

        // Get blob client
        const blobClient = containerClient.getBlobClient(blob);

        // Download blob
        const downloadResponse = await blobClient.download();

        if (!downloadResponse.readableStreamBody) {
          throw new StorageError('No readable stream in download response', 'DOWNLOAD_ERROR');
        }

        // Convert stream to buffer
        return await streamToBuffer(downloadResponse.readableStreamBody);
      } catch (error: any) {
        throw new StorageError(
          `Failed to download blob: ${url}`,
          error.code || 'DOWNLOAD_ERROR',
          error.statusCode,
          error
        );
      }
    },

    /**
     * Delete a blob from Azure Storage
     *
     * @param url - Blob URL or path
     */
    async delete(url: string): Promise<void> {
      try {
        // Parse URL to get container and blob path
        const { container, blob } = parseStorageUrl(url);

        // Get container client
        const containerClient = await pool.getContainer(container);

        // Get blob client
        const blobClient = containerClient.getBlobClient(blob);

        // Delete blob (soft delete if enabled)
        await blobClient.deleteIfExists({
          deleteSnapshots: 'include',
        });
      } catch (error: any) {
        throw new StorageError(
          `Failed to delete blob: ${url}`,
          error.code || 'DELETE_ERROR',
          error.statusCode,
          error
        );
      }
    },

    /**
     * Check if a blob exists in Azure Storage
     *
     * @param url - Blob URL or path
     * @returns True if blob exists
     */
    async exists(url: string): Promise<boolean> {
      try {
        // Parse URL to get container and blob path
        const { container, blob } = parseStorageUrl(url);

        // Get container client
        const containerClient = await pool.getContainer(container);

        // Get blob client
        const blobClient = containerClient.getBlobClient(blob);

        // Check existence
        return await blobClient.exists();
      } catch (error: any) {
        // If error is 404, blob doesn't exist
        if (error.statusCode === 404 || error.code === 'BlobNotFound') {
          return false;
        }

        throw new StorageError(
          `Failed to check blob existence: ${url}`,
          error.code || 'EXISTS_ERROR',
          error.statusCode,
          error
        );
      }
    },
  };
}

/**
 * Initialize storage client with custom configuration
 *
 * @param config - Storage configuration
 *
 * @public
 */
export async function initializeStorageClient(config: StorageConfig): Promise<void> {
  const pool = BlobConnectionPool.getInstance();
  await pool.initialize(config);
}

/**
 * Reset storage client (for testing)
 *
 * @internal
 */
export function resetStorageClient(): void {
  BlobConnectionPool.getInstance().reset();
}
