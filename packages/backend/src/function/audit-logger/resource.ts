/**
 * Audit Logger Function - Resource Definition
 *
 * Azure Function that logs all system events for compliance and auditing.
 * Triggered by Event Grid events from the 'audit-logs' topic.
 */

import { defineFunction } from '@atakora/component/functions';

export const auditLogger = defineFunction({
  name: 'audit-logger',

  // Event Grid trigger configuration
  trigger: {
    type: 'eventGrid',
    topicName: 'audit-logs',
    // Optional: Filter events by type or subject
    eventTypes: [
      'Authentication.*',
      'Authorization.*',
      'DataAccess.*',
      'DataModification.*',
      'DataDeletion.*',
      'Security.*',
      'Compliance.*',
    ],
  },

  // Handler implementation
  handler: './handler.ts',

  // Function configuration
  memory: 512,       // 512MB for event processing
  timeout: 60,       // 1 minute per event batch

  // Environment variables
  environment: {
    AUDIT_STORAGE_CONNECTION: '@storage.audit.connectionString',
    LOG_ANALYTICS_WORKSPACE_ID: '@logAnalytics.workspaceId',
    LOG_ANALYTICS_KEY: '@keyVault.secrets.log-analytics-key',
  },

  // Scaling configuration
  scale: {
    minInstances: 1,    // Always have one instance running for audit
    maxInstances: 20,   // Scale up for high event volume
    maxConcurrentExecutions: 10,  // Process multiple events concurrently
  },

  // No retry for audit events - log errors but continue
  retry: {
    maxRetryCount: 0,  // No retries - must not lose audit events
  },

  // High availability settings
  alwaysOn: true,  // Keep warm for immediate processing
});

/**
 * This function is designed to be attached to an Event Grid topic.
 * The event processor in event-processors/audit-logs/ will reference this function.
 *
 * Features:
 * - Real-time event processing from Event Grid
 * - Compliance-focused logging (GDPR, SOC2, etc.)
 * - Multiple destination support (Log Analytics, Storage, Security Center)
 * - Structured logging for querying
 * - High availability with always-on configuration
 * - No retry policy to prevent audit event loss
 *
 * Event Types Handled:
 * - Authentication events (login, logout, MFA)
 * - Authorization events (access granted/denied)
 * - Data access events (read operations)
 * - Data modification events (create, update, delete)
 * - Security events (threats, violations)
 * - Compliance events (personal data access)
 */