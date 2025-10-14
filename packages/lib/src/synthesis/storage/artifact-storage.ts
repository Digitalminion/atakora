/**
 * Artifact Storage Manager
 *
 * Manages Azure Storage Account for deployment artifacts including:
 * - Provisioning storage accounts
 * - Uploading ARM templates
 * - Uploading function packages
 * - Generating SAS tokens for secure access
 * - Container lifecycle management
 */

import { BlobServiceClient, ContainerClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions, SASProtocol, ContainerSASPermissions } from '@azure/storage-blob';
import { StorageManagementClient } from '@azure/arm-storage';
import { DefaultAzureCredential, TokenCredential } from '@azure/identity';
import * as crypto from 'crypto';

export interface StorageAccountConfig {
  subscriptionId: string;
  resourceGroupName: string;
  location: string;
  organization?: string; // Organization name for storage account naming
  project?: string;
  environment?: string;
  storageAccountName?: string; // Optional override
  credential?: TokenCredential; // Optional credential to use instead of DefaultAzureCredential
}

export interface StorageAccountInfo {
  accountName: string;
  accountUrl: string;
  containerName: string;
  deploymentId: string;
}

export interface UploadResult {
  blobUrl: string;
  sasUrl: string;
  checksum: string;
}

/**
 * Manages Azure Storage Account for deployment artifacts
 */
export class ArtifactStorageManager {
  private config: StorageAccountConfig;
  private storageInfo?: StorageAccountInfo;
  private blobServiceClient?: BlobServiceClient;
  private containerClient?: ContainerClient;
  private sharedKeyCredential?: StorageSharedKeyCredential;
  private readonly containerName = 'arm-templates';

  constructor(config: StorageAccountConfig) {
    this.config = config;
  }

  /**
   * Provision or get existing storage account for artifacts
   */
  async provisionStorage(): Promise<StorageAccountInfo> {
    if (this.storageInfo) {
      return this.storageInfo;
    }

    // Generate storage account name if not provided
    const accountName = this.config.storageAccountName || this.generateStorageAccountName();
    const deploymentId = this.generateDeploymentId();

    // Use provided credential or fall back to DefaultAzureCredential
    const credential = this.config.credential || new DefaultAzureCredential();
    const storageClient = new StorageManagementClient(credential, this.config.subscriptionId);

    try {
      // Check if storage account exists
      let storageAccount;
      try {
        storageAccount = await storageClient.storageAccounts.getProperties(
          this.config.resourceGroupName,
          accountName
        );
      } catch (error: any) {
        if (error.statusCode === 404 || error.code === 'ResourceNotFound') {
          // Storage account doesn't exist, create it
          console.log(`Creating storage account: ${accountName}...`);

          const createParams = {
            location: this.config.location,
            sku: {
              name: 'Standard_LRS', // Locally redundant storage
            },
            kind: 'StorageV2',
            properties: {
              accessTier: 'Hot',
              allowBlobPublicAccess: false, // No public access
              minimumTlsVersion: 'TLS1_2',
              supportsHttpsTrafficOnly: true,
              encryption: {
                services: {
                  blob: {
                    enabled: true,
                    keyType: 'Account',
                  },
                },
                keySource: 'Microsoft.Storage',
              },
            },
            tags: {
              purpose: 'arm-templates',
              managedBy: 'atakora-cdk',
              createdAt: new Date().toISOString(),
            },
          };

          // Start the creation operation
          const poller = await storageClient.storageAccounts.beginCreate(
            this.config.resourceGroupName,
            accountName,
            createParams
          );

          // Wait for completion
          storageAccount = await poller.pollUntilDone();
          console.log(`Storage account created: ${accountName}`);
        } else {
          throw error;
        }
      }

      // Get account URL
      const accountUrl = `https://${accountName}.blob.core.windows.net`;

      this.storageInfo = {
        accountName,
        accountUrl,
        containerName: this.containerName,
        deploymentId,
      };

      // Get storage account keys for SAS token generation
      const keys = await storageClient.storageAccounts.listKeys(
        this.config.resourceGroupName,
        accountName
      );

      if (!keys.keys || keys.keys.length === 0) {
        throw new Error(`No keys found for storage account ${accountName}`);
      }

      const accountKey = keys.keys[0].value!;

      // Create shared key credential for SAS token generation
      this.sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

      // Initialize blob service client with DefaultAzureCredential for uploads
      this.blobServiceClient = new BlobServiceClient(accountUrl, credential);

      // Ensure container exists
      await this.ensureContainer(this.containerName);

      return this.storageInfo;
    } catch (error) {
      throw new Error(`Failed to provision storage account: ${error}`);
    }
  }

  /**
   * Upload ARM template to blob storage
   */
  async uploadTemplate(templateName: string, templateContent: string): Promise<UploadResult> {
    if (!this.storageInfo) {
      throw new Error('Storage not provisioned. Call provisionStorage() first.');
    }

    const blobName = `${this.storageInfo.deploymentId}/${templateName}`;
    const containerClient = this.getContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Calculate checksum
    const checksum = this.calculateChecksum(Buffer.from(templateContent, 'utf-8'));

    // Upload template
    await blockBlobClient.upload(templateContent, Buffer.byteLength(templateContent, 'utf-8'), {
      blobHTTPHeaders: {
        blobContentType: 'application/json'
      },
      metadata: {
        checksum,
        uploadedAt: new Date().toISOString(),
        deploymentId: this.storageInfo.deploymentId
      }
    });

    const blobUrl = blockBlobClient.url;

    // Generate SAS token with 24 hour expiry
    const sasToken = await this.generateSasToken(blobUrl, 24);
    const sasUrl = `${blobUrl}${sasToken}`;

    return {
      blobUrl,
      sasUrl,
      checksum
    };
  }

  /**
   * Upload function package to blob storage
   */
  async uploadPackage(packageName: string, packageContent: Buffer): Promise<UploadResult> {
    if (!this.storageInfo) {
      throw new Error('Storage not provisioned. Call provisionStorage() first.');
    }

    const blobName = `${this.storageInfo.deploymentId}/packages/${packageName}`;
    const containerClient = this.getContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Calculate checksum
    const checksum = this.calculateChecksum(packageContent);

    // Upload package
    await blockBlobClient.upload(packageContent, packageContent.length, {
      blobHTTPHeaders: {
        blobContentType: 'application/zip'
      },
      metadata: {
        checksum,
        uploadedAt: new Date().toISOString(),
        deploymentId: this.storageInfo.deploymentId
      }
    });

    const blobUrl = blockBlobClient.url;

    // Generate SAS token with 24 hour expiry
    const sasToken = await this.generateSasToken(blobUrl, 24);
    const sasUrl = `${blobUrl}${sasToken}`;

    return {
      blobUrl,
      sasUrl,
      checksum
    };
  }

  /**
   * Generate container-level SAS token for ARM compatibility
   * Container-level SAS works better with ARM deployments per Microsoft docs
   */
  async generateSasToken(blobUri: string, expiryHours: number = 24): Promise<string> {
    if (!this.storageInfo) {
      throw new Error('Storage not provisioned. Call provisionStorage() first.');
    }

    if (!this.sharedKeyCredential) {
      throw new Error('Shared key credential not initialized. Storage account keys not available.');
    }

    const expiresOn = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    try {
      // Generate container-level SAS token (not blob-specific)
      // This is recommended for ARM linked template deployments
      const containerSAS = generateBlobSASQueryParameters({
        containerName: this.containerName,
        permissions: ContainerSASPermissions.parse('rl'), // Read + List
        expiresOn,
        protocol: SASProtocol.Https,
        version: '2022-11-02' // API version matching Azure CLI
      }, this.sharedKeyCredential);

      return `?${containerSAS.toString()}`;
    } catch (error) {
      throw new Error(`Failed to generate container SAS token: ${error}`);
    }
  }

  /**
   * Ensure container exists, create if not
   */
  async ensureContainer(containerName: string): Promise<void> {
    if (!this.blobServiceClient) {
      throw new Error('Blob service client not initialized.');
    }

    const containerClient = this.blobServiceClient.getContainerClient(containerName);

    try {
      const exists = await containerClient.exists();
      if (!exists) {
        console.log(`Creating container: ${containerName}...`);
        await containerClient.create(); // Creates private container by default
        console.log(`Container created: ${containerName}`);
      } else {
        console.log(`Using existing container: ${containerName}`);
      }

      this.containerClient = containerClient;
    } catch (error: any) {
      // Container might already exist (race condition) or we might not have permissions to check
      if (error.statusCode === 409 || error.code === 'ContainerAlreadyExists') {
        console.log(`Container already exists: ${containerName}`);
        this.containerClient = containerClient;
      } else {
        throw new Error(`Failed to ensure container exists: ${error}`);
      }
    }
  }

  /**
   * Clean up old artifacts based on retention policy
   */
  async cleanupOldArtifacts(retentionDays: number): Promise<void> {
    const containerClient = this.getContainerClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const deletedBlobs: string[] = [];

    try {
      for await (const blob of containerClient.listBlobsFlat({ includeMetadata: true })) {
        const uploadedAt = blob.metadata?.uploadedAt;

        if (uploadedAt) {
          const uploadDate = new Date(uploadedAt);
          if (uploadDate < cutoffDate) {
            const blobClient = containerClient.getBlockBlobClient(blob.name);
            await blobClient.delete();
            deletedBlobs.push(blob.name);
          }
        }
      }

      if (deletedBlobs.length > 0) {
        console.log(`Cleaned up ${deletedBlobs.length} old artifacts`);
      }
    } catch (error) {
      console.error(`Error cleaning up artifacts: ${error}`);
    }
  }

  /**
   * Get base URI for artifacts (used as _artifactsLocation parameter)
   */
  getArtifactsBaseUri(): string {
    if (!this.storageInfo) {
      throw new Error('Storage not provisioned. Call provisionStorage() first.');
    }

    return `${this.storageInfo.accountUrl}/${this.containerName}/${this.storageInfo.deploymentId}`;
  }

  /**
   * Get deployment ID
   */
  getDeploymentId(): string {
    if (!this.storageInfo) {
      throw new Error('Storage not provisioned. Call provisionStorage() first.');
    }

    return this.storageInfo.deploymentId;
  }

  /**
   * Get storage configuration for manifest tracking
   */
  getStorageConfig() {
    if (!this.storageInfo) {
      throw new Error('Storage not provisioned. Call provisionStorage() first.');
    }

    return {
      accountName: this.storageInfo.accountName,
      resourceGroupName: this.config.resourceGroupName,
      location: this.config.location,
      containerName: this.storageInfo.containerName,
      endpoint: this.storageInfo.accountUrl,
    };
  }

  /**
   * Private helper: Get container client
   */
  private getContainerClient(): ContainerClient {
    if (!this.containerClient) {
      throw new Error('Container client not initialized. Call provisionStorage() first.');
    }
    return this.containerClient;
  }

  /**
   * Private helper: Generate storage account name
   * Pattern: {organization}cdk{hash} (max 24 chars, lowercase alphanumeric)
   * Example: digitalproductscdk7f3e92
   */
  private generateStorageAccountName(): string {
    // Extract organization name from config or resource group name
    let orgName = this.config.organization;

    if (!orgName) {
      // Try to extract from resource group name pattern: rg-pl-{org}-...
      const rgMatch = this.config.resourceGroupName.match(/rg-(?:pl-)?([a-zA-Z0-9]+)/);
      orgName = rgMatch ? rgMatch[1] : 'atakora';
    }

    // Normalize organization name: lowercase, remove special chars
    const normalizedOrg = orgName.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Build prefix: {org}cdk
    const prefix = `${normalizedOrg}cdk`;

    // Calculate remaining space for hash (max 24 chars total)
    const maxHashLength = 24 - prefix.length;

    // Ensure we have at least 6 characters for hash to maintain uniqueness
    if (maxHashLength < 6) {
      // If org name is too long, truncate it
      const maxOrgLength = 24 - 3 - 6; // 24 total - 'cdk' - 6 hash chars
      const truncatedOrg = normalizedOrg.substring(0, maxOrgLength);
      const truncatedPrefix = `${truncatedOrg}cdk`;
      const hash = crypto
        .createHash('md5')
        .update(`${this.config.subscriptionId}-${this.config.resourceGroupName}`)
        .digest('hex')
        .substring(0, 6);

      return `${truncatedPrefix}${hash}`;
    }

    // Generate hash based on subscription + resource group for deterministic naming
    const hash = crypto
      .createHash('md5')
      .update(`${this.config.subscriptionId}-${this.config.resourceGroupName}`)
      .digest('hex')
      .substring(0, maxHashLength);

    return `${prefix}${hash}`;
  }

  /**
   * Private helper: Generate deployment ID
   * Pattern: deploy-YYYYMMDD-HHmmss-{hash}
   */
  private generateDeploymentId(): string {
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/[-:]/g, '')
      .replace('T', '-')
      .substring(0, 15); // YYYYMMDD-HHmmss

    const hash = crypto.randomBytes(3).toString('hex');

    return `deploy-${timestamp}-${hash}`;
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
}
