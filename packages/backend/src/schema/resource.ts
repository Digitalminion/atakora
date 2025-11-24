/**
 * Schema Definition - Single Source of Truth
 *
 * This schema defines all data contracts for the application:
 * - c.model: CRUD REST APIs backed by Cosmos DB
 * - e.model: Event-driven async processing with queues
 * - f.model: Custom HTTP functions with defined inputs/outputs
 *
 * Each model type auto-generates infrastructure:
 * - REST endpoints
 * - Database containers
 * - Event queues/topics
 * - Azure Functions
 * - TypeScript types
 * - Validation logic
 *
 * Customizations are attached in index.ts using the .attach() pattern.
 */

import { defineSchema, a, c, e, f } from '@atakora/component';

export const schema = defineSchema({
  schema: a.schema({
    // ========================================
    // CRUD Models - Database-Backed REST APIs
    // ========================================

    /**
     * User Model
     * Auto-generates: POST/GET/PUT/DELETE/LIST /api/users
     * Database: Cosmos DB container 'users'
     */
    User: c
      .model({
        id: a.id(),
        email: a.string().required().email(),
        name: a.string().required(),
        role: a.enum(['user', 'admin', 'analyst']).default('user'),
        organizationId: a.string().required(),
        preferences: a.json(),
        isActive: a.boolean().default(true),
        lastLoginAt: a.datetime(),
      })
      .authorization((allow) => [allow.owner('id'), allow.groups(['admin']).all()])
      .indexes(['email', 'organizationId', 'role']),

    /**
     * Project Model
     * Auto-generates: Full CRUD at /api/projects
     */
    Project: c
      .model({
        id: a.id(),
        name: a.string().required(),
        description: a.string().maxLength(500),
        organizationId: a.string().required(),
        ownerId: a.string().required(),
        status: a.enum(['active', 'archived', 'deleted']).default('active'),
        settings: a.json(),
        tags: a.array(a.string()),
      })
      .authorization((allow) => [allow.owner('ownerId'), allow.groups(['admin', 'analyst']).read()])
      .indexes(['organizationId', 'ownerId', 'status']),

    /**
     * Dataset Model
     * Auto-generates: Full CRUD at /api/datasets
     */
    Dataset: c
      .model({
        id: a.id(),
        name: a.string().required(),
        projectId: a.string().required(),
        uploadedBy: a.string().required(),
        fileUrl: a.string().required().url(),
        fileSizeBytes: a.number().required(),
        rowCount: a.number(),
        status: a
          .enum([
            'uploading',
            'validating',
            'valid',
            'invalid',
            'processing',
            'completed',
            'failed',
          ])
          .default('uploading'),
        validationErrors: a.array(a.string()),
        metadata: a.json(),
      })
      .authorization((allow) => [
        allow.owner('uploadedBy'),
        allow.groups(['admin', 'analyst']).all(),
      ])
      .indexes(['projectId', 'uploadedBy', 'status']),

    /**
     * Feedback Model
     * Auto-generates: Full CRUD at /api/feedback
     */
    Feedback: c
      .model({
        id: a.id(),
        userId: a.string().required(),
        datasetId: a.string(),
        text: a.string().required().maxLength(2000),
        rating: a.number().min(1).max(5),
        category: a.enum(['bug', 'feature_request', 'ui_ux', 'data_quality', 'general']).required(),
        sentiment: a.enum(['positive', 'neutral', 'negative']),
        priority: a.enum(['low', 'medium', 'high', 'critical']),
        status: a.enum(['pending', 'reviewed', 'resolved', 'closed']).default('pending'),
        adminNotes: a.string(),
        adminUserId: a.string(),
        tags: a.array(a.string()),
      })
      .authorization((allow) => [
        allow.owner('userId').create().read().update(['text', 'rating', 'category']),
        allow.groups(['admin']).all(),
      ])
      .indexes(['userId', 'category', 'status', 'priority']),

    // ========================================
    // Event Models - Async Processing
    // ========================================

    /**
     * DataUploaded Event
     * Auto-generates:
     * - POST /api/events/data-uploaded endpoint
     * - Azure Storage Queue 'data-uploaded'
     * - Function to validate and publish
     * - Default processor (logs event)
     */
    DataUploaded: e.model({
      datasetId: a.string().required(),
      projectId: a.string().required(),
      userId: a.string().required(),
      fileUrl: a.string().required().url(),
      fileSizeBytes: a.number().required(),
      fileName: a.string().required(),
      contentType: a.string().required(),
      uploadedAt: a.datetime().required(),
    }),

    /**
     * DataValidated Event
     * With customization for retries and monitoring
     */
    DataValidated: e.model({
      datasetId: a.string().required(),
      isValid: a.boolean().required(),
      rowCount: a.number().required(),
      validationErrors: a.array(a.string()),
      warnings: a.array(a.string()),
      validatedAt: a.datetime().required(),
    }),

    /**
     * ProcessingCompleted Event
     * Notifies when data processing finishes
     */
    ProcessingCompleted: e.model({
      datasetId: a.string().required(),
      projectId: a.string().required(),
      status: a.enum(['success', 'failed', 'partial']).required(),
      resultUrl: a.string().url(),
      errorMessage: a.string(),
      processingTimeMs: a.number().required(),
      completedAt: a.datetime().required(),
    }),

    /**
     * QualityCheckFailed Event
     * Critical alerts for data quality issues
     */
    QualityCheckFailed: e.model({
      datasetId: a.string().required(),
      checkName: a.string().required(),
      severity: a.enum(['warning', 'error', 'critical']).required(),
      failureReason: a.string().required(),
      affectedRows: a.number(),
      detectedAt: a.datetime().required(),
    }),

    /**
     * NotificationRequested Event
     * Generic notification system
     */
    NotificationRequested: e.model({
      userId: a.string().required(),
      type: a.enum(['email', 'sms', 'push', 'webhook']).required(),
      subject: a.string().required(),
      body: a.string().required(),
      metadata: a.json(),
      priority: a.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
      scheduledFor: a.datetime(),
    }),

    // ========================================
    // Function Models - Custom HTTP Endpoints
    // ========================================

    /**
     * GenerateReport Function
     * Auto-generates:
     * - POST /api/functions/generate-report endpoint
     * - Azure Function with HTTP trigger
     * - Input/output validation
     * - TypeScript types
     */
    GenerateReport: f.model({
      input: {
        datasetId: a.string().required(),
        reportType: a.enum(['summary', 'detailed', 'quality', 'comparison']).required(),
        format: a.enum(['pdf', 'excel', 'json']).default('pdf'),
        includeCharts: a.boolean().default(true),
        customFilters: a.json(),
      },
      output: {
        reportId: a.string().required(),
        reportUrl: a.string().url().required(),
        status: a.enum(['generating', 'completed', 'failed']).required(),
        expiresAt: a.datetime().required(),
        metadata: a.json(),
      },
    }),

    /**
     * ValidateData Function
     * Synchronous validation endpoint
     */
    ValidateData: f.model({
      input: {
        datasetId: a.string().required(),
        validationRules: a.array(a.string()).required(),
        strictMode: a.boolean().default(false),
      },
      output: {
        isValid: a.boolean().required(),
        errors: a.array(
          a.object({
            row: a.number(),
            column: a.string(),
            message: a.string(),
            severity: a.enum(['error', 'warning']),
          })
        ),
        warnings: a.array(a.string()),
        summary: a.object({
          totalRows: a.number(),
          validRows: a.number(),
          invalidRows: a.number(),
        }),
      },
    }),

    /**
     * TransformData Function
     * Data transformation pipeline
     */
    TransformData: f.model({
      input: {
        datasetId: a.string().required(),
        transformations: a
          .array(
            a.object({
              type: a.enum(['filter', 'map', 'aggregate', 'join', 'pivot']),
              config: a.json(),
            })
          )
          .required(),
        outputFormat: a.enum(['csv', 'json', 'parquet']).default('csv'),
      },
      output: {
        transformedDatasetId: a.string().required(),
        outputUrl: a.string().url().required(),
        rowsProcessed: a.number().required(),
        transformsApplied: a.number().required(),
        duration: a.number().required(),
      },
    }),

    /**
     * SearchData Function
     * Complex search with AI-powered ranking
     */
    SearchData: f.model({
      input: {
        query: a.string().required(),
        filters: a.object({
          projectId: a.string(),
          status: a.array(a.string()),
          dateRange: a.object({
            from: a.datetime(),
            to: a.datetime(),
          }),
        }),
        pagination: a.object({
          page: a.number().min(1).default(1),
          pageSize: a.number().min(1).max(100).default(20),
        }),
        sortBy: a.enum(['relevance', 'date', 'name']).default('relevance'),
      },
      output: {
        results: a.array(
          a.object({
            id: a.string(),
            name: a.string(),
            score: a.number(),
            highlights: a.array(a.string()),
          })
        ),
        total: a.number().required(),
        page: a.number().required(),
        pageSize: a.number().required(),
        aggregations: a.json(),
      },
    }),

    /**
     * ProcessUpload Function
     * File upload with virus scanning and metadata extraction
     * No customization - uses defaults
     */
    ProcessUpload: f.model({
      input: {
        file: a.binary().required(),
        projectId: a.string().required(),
        metadata: a.json(),
      },
      output: {
        datasetId: a.string().required(),
        fileUrl: a.string().url().required(),
        status: a.enum(['uploaded', 'scanning', 'quarantined', 'ready']).required(),
        virusScanResult: a.object({
          clean: a.boolean(),
          threats: a.array(a.string()),
        }),
        extractedMetadata: a.json(),
      },
    }),
  }),
});

/**
 * What gets auto-generated from this schema:
 *
 * REST CRUD APIs (c.model):
 * - POST   /api/users
 * - GET    /api/users/:id
 * - PUT    /api/users/:id
 * - DELETE /api/users/:id
 * - GET    /api/users (with filtering, pagination, sorting)
 * ... and same for Project, Dataset, Feedback
 *
 * Event APIs (e.model):
 * - POST   /api/events/data-uploaded
 * - POST   /api/events/data-validated
 * - POST   /api/events/processing-completed
 * - POST   /api/events/quality-check-failed
 * - POST   /api/events/notification-requested
 * + Azure Storage Queues for each event
 * + Default processor functions
 *
 * Function APIs (f.model):
 * - POST   /api/functions/generate-report
 * - POST   /api/functions/validate-data
 * - POST   /api/functions/transform-data
 * - POST   /api/functions/search-data
 * - POST   /api/functions/process-upload
 * + Azure Functions with HTTP triggers
 * + Input/output validation
 *
 * Database:
 * - Cosmos DB containers: users, projects, datasets, feedback
 * - Optimized indexes based on .indexes()
 * - Partition keys based on authorization
 *
 * TypeScript Types:
 * - User, CreateUserInput, UpdateUserInput, UserFilter
 * - DataUploadedEvent, PublishDataUploadedInput
 * - GenerateReportInput, GenerateReportOutput
 * ... and types for all models
 */
