/**
 * Process Upload Function - Handler Implementation
 *
 * This file contains the actual business logic for file upload processing.
 * Separated from configuration for clarity and maintainability.
 */

import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import { BlobServiceClient } from '@azure/storage-blob';
import { CosmosClient } from '@azure/cosmos';
import { v4 as uuid } from 'uuid';

/**
 * Process uploaded files with validation and storage.
 *
 * This handler:
 * 1. Receives uploaded file via HTTP
 * 2. Validates file format and size
 * 3. Stores in Azure Blob Storage
 * 4. Creates database record
 * 5. Queues for further processing
 */
const handler: AzureFunction = async (context: Context, req: HttpRequest) => {
  try {
    // Extract file from multipart form data
    const file = req.body;
    const { description, tags } = req.query;

    // Validate file
    if (!file || !file.name) {
      return {
        status: 400,
        body: {
          error: 'No file provided',
          message: 'Please upload a file',
        },
      };
    }

    // Check file size (max from environment)
    const maxSizeMb = parseInt(process.env.MAX_FILE_SIZE || '100');
    const maxSizeBytes = maxSizeMb * 1024 * 1024;

    if (file.size > maxSizeBytes) {
      return {
        status: 413,
        body: {
          error: 'File too large',
          message: `File size exceeds ${maxSizeMb}MB limit`,
          maxSize: maxSizeBytes,
          actualSize: file.size,
        },
      };
    }

    // Validate file type
    const allowedTypes = JSON.parse(process.env.ALLOWED_TYPES || '[]');
    const fileExtension = file.name.substring(file.name.lastIndexOf('.'));

    if (allowedTypes.length > 0 && !allowedTypes.includes(fileExtension)) {
      return {
        status: 400,
        body: {
          error: 'Invalid file type',
          message: `File type ${fileExtension} is not allowed`,
          allowedTypes,
        },
      };
    }

    // Generate unique blob name
    const blobName = `${uuid()}-${file.name}`;
    const containerName = 'uploads';

    // Upload to blob storage
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      process.env.STORAGE_CONNECTION!
    );
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.upload(file.data, file.size, {
      blobHTTPHeaders: {
        blobContentType: file.type || 'application/octet-stream',
      },
      metadata: {
        originalName: file.name,
        uploadedBy: context.req?.headers['x-user-id'] || 'anonymous',
        uploadedAt: new Date().toISOString(),
      },
    });

    // Create database record
    const cosmosClient = new CosmosClient(process.env.COSMOS_CONNECTION!);
    const database = cosmosClient.database('colorai-db');
    const container = database.container('datasets');

    const datasetRecord = {
      id: uuid(),
      fileName: file.name,
      blobUrl: blockBlobClient.url,
      blobName,
      fileSizeBytes: file.size,
      description: description || '',
      tags: tags ? tags.split(',').map((t: string) => t.trim()) : [],
      status: 'validating',
      createdBy: context.req?.headers['x-user-id'] || 'anonymous',
      createdAt: new Date().toISOString(),
    };

    const { resource: createdRecord } = await container.items.create(datasetRecord);

    // Queue for validation
    // Note: In a real implementation, this would use Azure Queue Storage
    // For now, we'll just log the action
    context.log('Queuing dataset for validation:', {
      datasetId: createdRecord.id,
      fileName: file.name,
    });

    // Return success response
    return {
      status: 200,
      body: {
        success: true,
        datasetId: createdRecord.id,
        fileName: file.name,
        size: file.size,
        status: 'validating',
        message: 'Upload successful, validation in progress',
      },
    };

  } catch (error) {
    context.log.error('Upload processing failed:', error);

    return {
      status: 500,
      body: {
        error: 'Internal server error',
        message: 'Failed to process upload',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
    };
  }
};

export default handler;

/**
 * Helper functions that could be extracted to utils:
 */

function isValidFile(file: any): boolean {
  return file && file.name && file.data && file.size > 0;
}

function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot === -1 ? '' : fileName.substring(lastDot).toLowerCase();
}

function sanitizeFileName(fileName: string): string {
  // Remove special characters and spaces
  return fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
}