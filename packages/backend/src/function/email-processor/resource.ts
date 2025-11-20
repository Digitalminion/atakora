/**
 * Email Processor Function - Resource Definition
 *
 * Azure Function that processes email sending requests from a queue.
 * Triggered by messages in the 'email' queue.
 */

import { defineFunction } from '@atakora/component/functions';

export const emailProcessor = defineFunction({
  name: 'email-processor',

  // Queue trigger configuration
  trigger: {
    type: 'queue',
    queueName: 'email',
    connection: 'STORAGE_CONNECTION',  // Storage account connection string
    batchSize: 10,                     // Process up to 10 emails at once
  },

  // Handler implementation
  handler: './handler.ts',

  // Function configuration
  memory: 256,      // 256MB for email processing
  timeout: 300,      // 5 minutes timeout

  // Environment variables
  environment: {
    STORAGE_CONNECTION: '@storage.connectionString',
    SENDGRID_API_KEY: '@keyVault.secrets.sendgrid-api-key',  // From Key Vault
    EMAIL_FROM: 'noreply@colorai.com',
  },

  // Scaling configuration
  scale: {
    minInstances: 0,
    maxInstances: 5,
    maxConcurrentExecutions: 3,  // Limit concurrent email batches
  },

  // Retry policy for transient failures
  retry: {
    maxRetryCount: 3,
    minimumInterval: '00:00:10',  // 10 seconds
    maximumInterval: '00:01:00',  // 1 minute
  },
});

/**
 * This function is designed to be attached to a queue infrastructure resource.
 * The queue processor in queue-processors/email/ will reference this function.
 *
 * Features:
 * - Batch email processing for efficiency
 * - Integration with SendGrid or other email services
 * - Template rendering support
 * - Automatic retry for transient failures
 * - Priority-based processing
 */