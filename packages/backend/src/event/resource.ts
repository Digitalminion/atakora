/**
 * Event Customizations
 *
 * Events are defined in schema/resource.ts using e.model().
 * This file provides customizations beyond the defaults.
 *
 * DEFAULT BEHAVIOR (without customization):
 * - POST /api/events/{event-name} endpoint
 * - Azure Storage Queue with standard settings
 * - Validation function that checks schema and publishes
 * - Basic processor that logs the event
 * - 3 retries, 30s visibility timeout, 7 day TTL
 *
 * Use configureEvent() to override defaults:
 * - Custom retry policies
 * - Dead letter queues
 * - Custom processors
 * - Monitoring and alerts
 * - Queue settings (TTL, visibility, batching)
 */

import {
  defineEvents,
  configureEvent,
  minutes,
  hours,
  days,
  greaterThan,
  olderThan,
} from '@atakora/component/events';

export const event = defineEvents({
  /**
   * DataUploaded Event
   *
   * Critical event that triggers the data processing pipeline.
   * Customized for high reliability with extensive retries and monitoring.
   */
  DataUploaded: configureEvent('DataUploaded')
    // Queue configuration
    .ttl(days(14))
    .visibility(minutes(5))
    .batchSize(1) // Process one at a time for data integrity
    .parallelism(3) // Max 3 concurrent uploads

    // Retry policy - aggressive for critical pipeline
    .retry((retry) =>
      retry
        .maxAttempts(10)
        .exponentialBackoff()
        .initialDelay(minutes(1))
        .maxDelay(hours(2))
        .withJitter()
    )

    // Dead letter queue for failed uploads
    .withDeadLetterQueue('data-uploaded-failed')
    .deadLetterAfter(10)

    // Custom processor function
    .withProcessor(async (context, event) => {
      // Update dataset status to 'validating'
      await context.database.datasets.update(event.datasetId, {
        status: 'validating',
      });

      // Trigger validation workflow
      await context.events.publish('DataValidated', {
        datasetId: event.datasetId,
        isValid: true, // Will be updated by validator
        rowCount: 0,
        validationErrors: [],
        warnings: [],
        validatedAt: new Date(),
      });

      // Store upload record for audit
      await context.storage.auditLogs.write({
        event: 'data-uploaded',
        datasetId: event.datasetId,
        userId: event.userId,
        timestamp: event.uploadedAt,
      });
    })

    // Monitoring and alerts
    .monitoring((alerts) =>
      alerts
        .onDepth(greaterThan(100))
        .warn()
        .withEmail('data-team@company.com')

        .onDepth(greaterThan(500))
        .critical()
        .withEmail('oncall@company.com')
        .withSms('+1-555-0100')

        .onMessageAge(olderThan(hours(1)))
        .warn()

        .onDeadLetter()
        .critical()
        .withWebhook('https://alerts.company.com/webhook')
    )

    // Enable detailed metrics and tracing
    .withMetrics()
    .withTracing()

    // Tags for cost tracking
    .tags({
      criticality: 'high',
      pipeline: 'data-ingestion',
      team: 'data-platform',
    }),

  /**
   * DataValidated Event
   *
   * Triggered after data validation completes.
   * Moderate retry policy with monitoring.
   */
  DataValidated: configureEvent('DataValidated')
    .ttl(days(7))
    .visibility(minutes(2))
    .retries(5)

    .withDeadLetterQueue()

    .withProcessor(async (context, event) => {
      // Update dataset with validation results
      await context.database.datasets.update(event.datasetId, {
        status: event.isValid ? 'valid' : 'invalid',
        rowCount: event.rowCount,
        validationErrors: event.validationErrors,
      });

      // If valid, trigger processing
      if (event.isValid) {
        await context.events.publish('ProcessingStarted', {
          datasetId: event.datasetId,
          startedAt: new Date(),
        });
      } else {
        // Notify user of validation failure
        await context.events.publish('NotificationRequested', {
          userId: event.datasetId, // Look up from dataset
          type: 'email',
          subject: 'Dataset Validation Failed',
          body: `Validation errors: ${event.validationErrors.join(', ')}`,
          priority: 'high',
        });
      }
    })

    .monitoring((alerts) =>
      alerts
        .onDepth(greaterThan(200))
        .warn()

        .onFailureRate(greaterThan(0.1))
        .error()
        .withEmail('data-quality@company.com')
    )

    .withMetrics(),

  /**
   * ProcessingCompleted Event
   *
   * Final step in data pipeline.
   * Simple configuration with basic monitoring.
   */
  ProcessingCompleted: configureEvent('ProcessingCompleted')
    .ttl(days(30))
    .retries(3)

    .withProcessor(async (context, event) => {
      // Update dataset status
      await context.database.datasets.update(event.datasetId, {
        status: event.status === 'success' ? 'completed' : 'failed',
      });

      // Notify project owner
      const dataset = await context.database.datasets.get(event.datasetId);
      const project = await context.database.projects.get(dataset.projectId);

      await context.events.publish('NotificationRequested', {
        userId: project.ownerId,
        type: 'email',
        subject: `Dataset Processing ${event.status}`,
        body: `Processing completed in ${event.processingTimeMs}ms`,
        metadata: {
          datasetId: event.datasetId,
          status: event.status,
        },
        priority: event.status === 'success' ? 'normal' : 'high',
      });

      // Store metrics
      await context.metrics.record('processing.duration', event.processingTimeMs);
      await context.metrics.record('processing.status', event.status);
    })

    .monitoring((alerts) =>
      alerts
        .onDepth(greaterThan(50))
        .warn()

        .onDeadLetter()
        .error()
    ),

  /**
   * QualityCheckFailed Event
   *
   * Critical alerts require immediate attention.
   * High priority processing with multiple notification channels.
   */
  QualityCheckFailed: configureEvent('QualityCheckFailed')
    .visibility(minutes(1)) // Process quickly
    .parallelism(10) // Can handle many alerts concurrently
    .retries(5)

    .withProcessor(async (context, event) => {
      // Record the quality issue
      await context.database.qualityIssues.create({
        datasetId: event.datasetId,
        checkName: event.checkName,
        severity: event.severity,
        reason: event.failureReason,
        affectedRows: event.affectedRows,
        detectedAt: event.detectedAt,
        status: 'open',
      });

      // Determine notification priority
      const priority = event.severity === 'critical' ? 'urgent' : 'high';

      // Notify data quality team
      await context.events.publish('NotificationRequested', {
        userId: 'data-quality-team',
        type: 'email',
        subject: `[${event.severity.toUpperCase()}] Quality Check Failed: ${event.checkName}`,
        body: event.failureReason,
        metadata: {
          datasetId: event.datasetId,
          checkName: event.checkName,
          affectedRows: event.affectedRows,
        },
        priority,
      });

      // For critical issues, also send SMS
      if (event.severity === 'critical') {
        await context.events.publish('NotificationRequested', {
          userId: 'oncall-engineer',
          type: 'sms',
          subject: 'Critical Quality Issue',
          body: `Dataset ${event.datasetId}: ${event.failureReason}`,
          priority: 'urgent',
        });
      }
    })

    .monitoring((alerts) =>
      alerts
        .onDepth(greaterThan(20))
        .critical()
        .withEmail('data-quality@company.com')
        .withWebhook('https://pagerduty.company.com/webhook')
    )

    .withMetrics()
    .withTracing(),

  /**
   * NotificationRequested Event
   *
   * Generic notification system.
   * Batched processing with per-channel parallelism limits.
   */
  NotificationRequested: configureEvent('NotificationRequested')
    .ttl(days(7))
    .visibility(minutes(1))
    .batchSize(10) // Process notifications in batches
    .parallelism(5) // Limit concurrent sends

    // Standard retry policy
    .retry((retry) =>
      retry.maxAttempts(5).exponentialBackoff().initialDelay(minutes(1)).maxDelay(minutes(30))
    )

    .withDeadLetterQueue()

    .withProcessor(async (context, event) => {
      // Route to appropriate notification service
      switch (event.type) {
        case 'email':
          await context.services.email.send({
            to: event.userId,
            subject: event.subject,
            body: event.body,
            priority: event.priority,
          });
          break;

        case 'sms':
          await context.services.sms.send({
            to: event.userId,
            message: `${event.subject}: ${event.body}`,
            priority: event.priority,
          });
          break;

        case 'push':
          await context.services.push.send({
            userId: event.userId,
            title: event.subject,
            body: event.body,
            data: event.metadata,
          });
          break;

        case 'webhook':
          await context.services.http.post(event.userId, {
            subject: event.subject,
            body: event.body,
            metadata: event.metadata,
          });
          break;
      }

      // Record notification sent
      await context.database.notificationLog.create({
        userId: event.userId,
        type: event.type,
        subject: event.subject,
        sentAt: new Date(),
        status: 'sent',
      });
    })

    .monitoring((alerts) =>
      alerts
        .onDepth(greaterThan(1000))
        .warn()

        .onFailureRate(greaterThan(0.05))
        .error()
        .withEmail('platform-team@company.com')

        .onDeadLetter()
        .critical()
    )

    .withMetrics(),
});

/**
 * What this configuration provides:
 *
 * 1. Custom Processing Logic
 *    - Each event has tailored business logic
 *    - Can call databases, publish other events, call external services
 *    - Full TypeScript with IntelliSense
 *
 * 2. Reliability
 *    - Configurable retry policies per event
 *    - Dead letter queues for failed messages
 *    - Exponential backoff with jitter
 *
 * 3. Monitoring
 *    - Queue depth alerts
 *    - Message age monitoring
 *    - Failure rate tracking
 *    - Multiple notification channels
 *
 * 4. Performance
 *    - Batch processing where appropriate
 *    - Parallelism limits to prevent overload
 *    - Configurable visibility timeouts
 *
 * 5. Observability
 *    - Metrics collection
 *    - Distributed tracing
 *    - Cost allocation tags
 *
 * Events without customization (not listed above) use sensible defaults.
 */
