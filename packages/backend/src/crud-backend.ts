/**
 * CRUD Backend Infrastructure
 *
 * @remarks
 * Uses the new backend pattern from @atakora/component to efficiently share
 * resources across multiple CRUD APIs. This replaces the commented-out
 * FeedbackCrud and LabDatasetCrud with a modern, resource-efficient approach.
 *
 * Benefits:
 * - Single Cosmos DB account with multiple containers
 * - Single Function App with all CRUD operations
 * - Automatic resource sharing and deduplication
 * - 50% cost reduction compared to separate resources
 * - Full TypeScript type safety
 *
 * @packageDocumentation
 */

import { defineBackend } from '@atakora/component';
import { CrudApi } from '@atakora/component/crud';

/**
 * Configuration for CRUD Backend
 */
export interface CrudBackendConfig {
  /**
   * Azure geography/region
   */
  geography: string;

  /**
   * Environment name (dev, staging, prod, etc.)
   */
  environmentName: string;

  /**
   * Database name (default: colorai-db)
   */
  databaseName?: string;

  /**
   * Enable monitoring (Application Insights)
   */
  enableMonitoring?: boolean;

  /**
   * Log retention in days
   */
  logRetentionInDays?: number;

  /**
   * Additional tags for resources
   */
  tags?: Record<string, string>;
}

/**
 * Create CRUD Backend with shared infrastructure
 *
 * @remarks
 * Creates a backend with two CRUD APIs that share a single Cosmos DB
 * and Function App for cost efficiency.
 *
 * Resources created:
 * - 1x Cosmos DB account (serverless) with 2 containers
 *   - feedback container (partition key: /user_id)
 *   - data container (partition key: /id)
 * - 1x Function App with 10 functions (5 per CRUD)
 * - 1x Storage Account (for Functions runtime)
 *
 * @param config - CRUD backend configuration
 * @returns Backend instance with feedbackApi and labDatasetApi
 *
 * @example
 * ```typescript
 * const crudBackend = createCrudBackend({
 *   geography: 'eastus2',
 *   environmentName: 'prod',
 *   enableMonitoring: true
 * });
 *
 * crudBackend.addToStack(foundation);
 *
 * // Access APIs with full type safety
 * console.log(crudBackend.components.feedbackApi.apiEndpoint);
 * console.log(crudBackend.components.labDatasetApi.operations);
 * ```
 */
export function createCrudBackend(config: CrudBackendConfig) {
  const {
    geography,
    environmentName,
    databaseName = 'colorai-db',
    enableMonitoring = true,
    logRetentionInDays = 90,
    tags = {},
  } = config;

  return defineBackend(
    {
      // Feedback CRUD API
      // Container: feedback | Partition: /user_id
      feedbackApi: CrudApi.define('FeedbackApi', {
        entityName: 'Feedback',
        entityNamePlural: 'Feedback',
        containerName: 'feedback',
        partitionKey: '/user_id',
        databaseName,
        location: geography,
        schema: {
          // Primary identifiers
          id: 'string',
          user_id: { type: 'string', required: true },
          search_id: 'string',

          // Timestamps
          created_at: 'timestamp',
          updated_at: 'timestamp',

          // User feedback fields
          text: {
            type: 'string',
            required: true,
            validation: {
              minLength: 1,
              maxLength: 5000,
            },
            description: 'Feedback text',
          },
          rating: {
            type: 'number',
            validation: {
              min: 1,
              max: 5,
            },
            description: 'User rating 1-5',
          },
          category: {
            type: 'string',
            validation: {
              enum: ['bug', 'feature_request', 'ui_ux', 'performance', 'data_quality', 'other'],
            },
            description: 'Feedback category',
          },
          tags: {
            type: 'array',
            description: 'User-defined tags',
          },

          // Status and admin fields
          status: {
            type: 'string',
            required: true,
            validation: {
              enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
            },
            description: 'Feedback status',
          },
          sentiment: {
            type: 'string',
            validation: {
              enum: ['positive', 'neutral', 'negative'],
            },
            description: 'Sentiment analysis result',
          },
          priority: {
            type: 'string',
            validation: {
              enum: ['low', 'medium', 'high', 'critical'],
            },
            description: 'Admin-assigned priority',
          },
          admin_notes: {
            type: 'string',
            validation: {
              maxLength: 2000,
            },
            description: 'Admin notes (admin only)',
          },
          admin_user_id: {
            type: 'string',
            description: 'Admin user who last updated',
          },
          admin_updated_at: {
            type: 'timestamp',
            description: 'When admin last updated',
          },
        },
      }),

      // Lab Dataset CRUD API
      // Container: data | Partition: /id
      labDatasetApi: CrudApi.define('LabDatasetApi', {
        entityName: 'LabDataset',
        entityNamePlural: 'LabDatasets',
        containerName: 'data',
        partitionKey: '/id',
        databaseName,
        location: geography,
        schema: {
          // Primary identifier
          id: 'string',

          // Timestamps and tracking
          created_at: 'timestamp',
          created_by: {
            type: 'string',
            required: true,
            description: 'User ID who uploaded the dataset',
          },
          activated_at: 'timestamp',

          // Status
          status: {
            type: 'string',
            required: true,
            validation: {
              enum: ['validating', 'active', 'inactive', 'invalid'],
            },
            description: 'Dataset status',
          },

          // File information
          blob_url: {
            type: 'string',
            required: true,
            format: 'uri',
            description: 'Azure Blob Storage URL for the CSV file',
          },
          file_name: {
            type: 'string',
            required: true,
            validation: {
              pattern: '^.+\\.csv$',
            },
            description: 'Original file name',
          },
          file_size_bytes: {
            type: 'number',
            required: true,
            validation: {
              min: 0,
              max: 1000000000, // 1GB max
            },
            description: 'File size in bytes',
          },

          // Dataset metrics
          row_count: {
            type: 'number',
            validation: {
              min: 0,
            },
            description: 'Number of material rows in dataset',
          },
          column_count: {
            type: 'number',
            validation: {
              min: 0,
            },
            description: 'Number of columns in dataset',
          },

          // Validation results
          validation: {
            type: 'object',
            description: 'Validation results',
            // validation.passed: boolean
            // validation.errors: string[]
            // validation.warnings: string[]
          },

          // Processing metadata
          processing_time_ms: {
            type: 'number',
            description: 'Time taken to validate and process',
          },
          metadata: {
            type: 'object',
            description: 'Additional metadata (headers, data types, etc.)',
          },
        },
      }),
    },
    {
      environment: environmentName,
      location: geography,
      monitoring: enableMonitoring,
      tags: {
        purpose: 'crud-apis',
        environment: environmentName,
        component: 'backend',
        ...tags,
      },
    }
  );
}
