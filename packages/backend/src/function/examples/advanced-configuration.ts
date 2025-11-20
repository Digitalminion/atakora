/**
 * Process Upload Function
 *
 * Handles file upload processing, validation, and storage.
 * Uses the new defineFunction() pattern for Azure Functions.
 */

import { defineFunction } from '@atakora/component/functions';

/**
 * Process uploaded files with validation and storage.
 *
 * This function:
 * 1. Receives uploaded file via HTTP trigger
 * 2. Validates file format and size
 * 3. Stores in Azure Blob Storage
 * 4. Creates database record
 * 5. Queues for further processing
 */
export const processUpload = defineFunction({
  name: 'process-upload',

  // Function entry point
  entry: './handler.ts',

  // Runtime configuration
  runtime: 20, // Node.js 20
  timeout: 300, // 5 minutes
  memory: 512, // MB

  // HTTP trigger configuration
  trigger: {
    type: 'http',
    methods: ['POST'],
    route: 'upload',
    authLevel: 'function', // Requires function key
  },

  // Bindings for Azure services
  bindings: {
    // Input: Receive file from HTTP request
    input: [
      {
        type: 'httpTrigger',
        name: 'req',
        methods: ['POST'],
        route: 'upload',
      },
    ],

    // Output: Multiple outputs
    output: [
      {
        type: 'http',
        name: '$return',
      },
      {
        type: 'blob',
        name: 'uploadedFile',
        path: 'uploads/{rand-guid}',
        connection: 'STORAGE_CONNECTION',
      },
      {
        type: 'cosmosDB',
        name: 'datasetRecord',
        databaseName: 'colorai-db',
        containerName: 'datasets',
        connection: 'COSMOS_CONNECTION',
      },
      {
        type: 'queue',
        name: 'validationQueue',
        queueName: 'dataset-validation',
        connection: 'STORAGE_CONNECTION',
      },
    ],
  },

  // Environment variables
  environment: {
    STORAGE_CONNECTION: '${backend.storage.connectionString}',
    COSMOS_CONNECTION: '${backend.cosmos.connectionString}',
    MAX_FILE_SIZE: '${backend.config.maxUploadSizeMb}',
    ALLOWED_TYPES: '${backend.config.allowedFileTypes}',
  },

  // Scaling configuration
  scale: {
    minInstances: 0,
    maxInstances: 10,
    rules: [
      {
        name: 'http-queue-length',
        type: 'http',
        threshold: 100,
      },
    ],
  },

  // Retry policy
  retry: {
    maxAttempts: 3,
    delay: 5000, // 5 seconds
    backoff: 'exponential',
  },

  // Monitoring
  monitoring: {
    logLevel: 'info',
    metrics: [
      { name: 'upload_size_bytes', type: 'histogram' },
      { name: 'upload_duration_ms', type: 'histogram' },
      { name: 'upload_success', type: 'counter' },
      { name: 'upload_failure', type: 'counter' },
    ],
    alerts: [
      {
        name: 'upload_failures',
        condition: 'rate(upload_failure[5m]) > 10',
        severity: 'warning',
      },
    ],
  },

  // CORS configuration
  cors: {
    allowedOrigins: ['${backend.config.allowedOrigins}'],
    allowedMethods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  },

  // Authorization
  authorization: {
    type: 'jwt',
    audiences: ['${backend.auth.audience}'],
    issuer: '${backend.auth.issuer}',
  },

  // OpenAPI documentation
  openapi: {
    summary: 'Upload and process dataset file',
    description: 'Uploads a CSV or Excel file for processing and validation',
    requestBody: {
      required: true,
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            properties: {
              file: {
                type: 'string',
                format: 'binary',
                description: 'The file to upload',
              },
              description: {
                type: 'string',
                description: 'Optional description of the dataset',
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional tags for categorization',
              },
            },
            required: ['file'],
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Upload successful',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                datasetId: { type: 'string' },
                fileName: { type: 'string' },
                size: { type: 'number' },
                status: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
      400: {
        description: 'Invalid file or parameters',
      },
      413: {
        description: 'File too large',
      },
    },
  },
});

/**
 * The actual function implementation would be in handler.ts:
 *
 * ```typescript
 * // handler.ts
 * import { AzureFunction, Context, HttpRequest } from '@azure/functions';
 *
 * const handler: AzureFunction = async (context: Context, req: HttpRequest) => {
 *   const file = req.body;
 *   const { description, tags } = req.query;
 *
 *   // Validate file
 *   if (!isValidFile(file)) {
 *     return {
 *       status: 400,
 *       body: { error: 'Invalid file format' }
 *     };
 *   }
 *
 *   // Process and store
 *   const blobUrl = await storeInBlob(context.bindings.uploadedFile, file);
 *   const record = await createRecord(context.bindings.datasetRecord, {
 *     fileName: file.name,
 *     blobUrl,
 *     size: file.size,
 *     description,
 *     tags,
 *   });
 *
 *   // Queue for validation
 *   context.bindings.validationQueue = {
 *     datasetId: record.id,
 *     userId: context.user.id,
 *   };
 *
 *   return {
 *     status: 200,
 *     body: {
 *       datasetId: record.id,
 *       fileName: file.name,
 *       size: file.size,
 *       status: 'processing',
 *       message: 'Upload successful, validation in progress',
 *     }
 *   };
 * };
 *
 * export default handler;
 * ```
 */