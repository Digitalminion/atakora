/**
 * Data Quality Processor Function - Resource Definition
 *
 * Azure Function that processes data quality analysis requests from a queue.
 * Triggered by messages in the 'data-quality' queue.
 */

import { defineFunction } from '@atakora/component/functions';

export const dataQualityProcessor = defineFunction({
  name: 'data-quality-processor',

  // Queue trigger configuration
  trigger: {
    type: 'queue',
    queueName: 'data-quality',
    connection: 'STORAGE_CONNECTION',  // Storage account connection string
    batchSize: 16,                     // Process up to 16 messages at once
  },

  // Handler implementation
  handler: './handler.ts',

  // Function configuration
  memory: 1024,     // 1GB for data processing
  timeout: 600,     // 10 minutes for complex analysis

  // Environment variables
  environment: {
    COSMOS_CONNECTION: '@cosmos.connectionString',
    STORAGE_CONNECTION: '@storage.connectionString',
  },

  // Scaling configuration
  scale: {
    minInstances: 0,
    maxInstances: 10,
    maxConcurrentExecutions: 5,  // Limit concurrent executions
  },

  // Retry policy
  retry: {
    maxRetryCount: 3,
    minimumInterval: '00:00:05',  // 5 seconds
    maximumInterval: '00:00:30',  // 30 seconds
  },
});

/**
 * This function is designed to be attached to a queue infrastructure resource.
 * The queue processor in queue-processors/data-quality/ will reference this function.
 *
 * Features:
 * - Automatic message pickup from queue
 * - Batch processing for efficiency
 * - Automatic retry with exponential backoff
 * - Dead letter queue for failed messages
 * - Application Insights integration
 */