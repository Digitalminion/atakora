/**
 * Schema Definition System - Complete Example
 *
 * This file demonstrates all features of the schema definition system.
 * It can be used as a template for creating your own schemas.
 */

import { defineSchema, a, c, e, f } from './index';
import type {
  InferModelType,
  InferCreateInput,
  InferUpdateInput,
  InferEventType,
  InferFunctionInput,
  InferFunctionOutput,
} from './index';

// ============================================================================
// Schema Definition
// ============================================================================

export const exampleSchema = defineSchema({
  schema: a.schema({
    // ========================================
    // CRUD Models
    // ========================================

    /**
     * User Model
     *
     * Demonstrates:
     * - All field types
     * - Authorization rules
     * - Indexes
     */
    User: c
      .model({
        id: a.id(),
        email: a.string().required().email().maxLength(255),
        name: a.string().required().minLength(2).maxLength(100),
        role: a.enum(['user', 'admin', 'analyst']).default('user'),
        organizationId: a.string().required(),
        preferences: a.json(),
        isActive: a.boolean().default(true),
        lastLoginAt: a.datetime(),
      })
      .authorization((allow) => [allow.owner('id').all(), allow.groups(['admin']).all()])
      .indexes(['email', 'organizationId', 'role'])
      .timestamps(true)
      .softDelete(true),

    /**
     * Project Model
     *
     * Demonstrates:
     * - Enums for status
     * - Arrays of strings
     * - Nested JSON
     * - Multiple authorization rules
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
      .authorization((allow) => [
        allow.owner('ownerId').all(),
        allow.groups(['admin', 'analyst']).read(),
      ])
      .indexes(['organizationId', 'ownerId', 'status']),

    /**
     * Dataset Model
     *
     * Demonstrates:
     * - URL validation
     * - Number fields with constraints
     * - Complex status enums
     * - Array of validation errors
     */
    Dataset: c
      .model({
        id: a.id(),
        name: a.string().required(),
        projectId: a.string().required(),
        uploadedBy: a.string().required(),
        fileUrl: a.string().required().url(),
        fileSizeBytes: a.number().required().min(0),
        rowCount: a.number().min(0),
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
        allow.owner('uploadedBy').all(),
        allow.groups(['admin', 'analyst']).all(),
      ])
      .indexes(['projectId', 'uploadedBy', 'status']),

    // ========================================
    // Event Models
    // ========================================

    /**
     * DataUploaded Event
     *
     * Triggered when a user uploads a file.
     *
     * Demonstrates:
     * - Simple event structure
     * - All required fields
     * - Datetime field
     */
    DataUploaded: e.model({
      datasetId: a.string().required(),
      projectId: a.string().required(),
      userId: a.string().required(),
      fileUrl: a.string().required().url(),
      fileSizeBytes: a.number().required().min(0),
      fileName: a.string().required(),
      contentType: a.string().required(),
      uploadedAt: a.datetime().required(),
    }),

    /**
     * DataValidated Event
     *
     * Triggered after data validation completes.
     *
     * Demonstrates:
     * - Boolean validation result
     * - Arrays of errors/warnings
     * - Nested data
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
     * NotificationRequested Event
     *
     * Generic notification event.
     *
     * Demonstrates:
     * - Notification types enum
     * - Priority levels
     * - Optional scheduling
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
    // Function Models
    // ========================================

    /**
     * GenerateReport Function
     *
     * Generates reports from datasets.
     *
     * Demonstrates:
     * - Input/output separation
     * - Multiple format options
     * - Boolean flags
     * - Custom filters as JSON
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
     *
     * Synchronous data validation.
     *
     * Demonstrates:
     * - Array of validation rules
     * - Complex nested output
     * - Object fields with schema
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
     * SearchData Function
     *
     * Complex search with filters and pagination.
     *
     * Demonstrates:
     * - Complex nested input structure
     * - Optional filters
     * - Pagination parameters
     * - Array output with scoring
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
  }),
});

// ============================================================================
// Type Exports
// ============================================================================

/**
 * Generated types for CRUD models
 */
export type User = InferModelType<typeof exampleSchema.models.User>;
export type CreateUserInput = InferCreateInput<typeof exampleSchema.models.User>;
export type UpdateUserInput = InferUpdateInput<typeof exampleSchema.models.User>;

export type Project = InferModelType<typeof exampleSchema.models.Project>;
export type CreateProjectInput = InferCreateInput<typeof exampleSchema.models.Project>;
export type UpdateProjectInput = InferUpdateInput<typeof exampleSchema.models.Project>;

export type Dataset = InferModelType<typeof exampleSchema.models.Dataset>;
export type CreateDatasetInput = InferCreateInput<typeof exampleSchema.models.Dataset>;
export type UpdateDatasetInput = InferUpdateInput<typeof exampleSchema.models.Dataset>;

/**
 * Generated types for event models
 */
export type DataUploadedEvent = InferEventType<typeof exampleSchema.models.DataUploaded>;
export type DataValidatedEvent = InferEventType<typeof exampleSchema.models.DataValidated>;
export type NotificationRequestedEvent = InferEventType<
  typeof exampleSchema.models.NotificationRequested
>;

/**
 * Generated types for function models
 */
export type GenerateReportInput = InferFunctionInput<typeof exampleSchema.models.GenerateReport>;
export type GenerateReportOutput = InferFunctionOutput<typeof exampleSchema.models.GenerateReport>;

export type ValidateDataInput = InferFunctionInput<typeof exampleSchema.models.ValidateData>;
export type ValidateDataOutput = InferFunctionOutput<typeof exampleSchema.models.ValidateData>;

export type SearchDataInput = InferFunctionInput<typeof exampleSchema.models.SearchData>;
export type SearchDataOutput = InferFunctionOutput<typeof exampleSchema.models.SearchData>;

// ============================================================================
// Usage Examples
// ============================================================================

/**
 * Example: Using inferred types in application code
 *
 * Note: Type inference may vary based on schema structure.
 * The following examples show the intended API design.
 */
export function exampleUsage() {
  // Create user input - type-safe
  const createUser = {
    email: 'user@example.com',
    name: 'John Doe',
    role: 'user' as const, // Type-checked to 'user' | 'admin' | 'analyst'
    organizationId: 'org_123',
    isActive: true,
  };

  // Update user input - all fields optional
  const updateUser = {
    name: 'Jane Doe',
    // Other fields optional
  };

  // Event payload - type-safe
  const event = {
    datasetId: 'dataset_123',
    projectId: 'project_123',
    userId: 'user_123',
    fileUrl: 'https://example.com/file.csv',
    fileSizeBytes: 1024000,
    fileName: 'data.csv',
    contentType: 'text/csv',
    uploadedAt: new Date().toISOString(),
  };

  // Function input - type-safe
  const reportInput = {
    datasetId: 'dataset_123',
    reportType: 'summary',
    format: 'pdf',
    includeCharts: true,
    customFilters: {
      dateRange: { from: '2024-01-01', to: '2024-12-31' },
    },
  };
}

// ============================================================================
// Schema Introspection Example
// ============================================================================

import {
  getSchemaStats,
  getCrudModelNames,
  getEventModelNames,
  getFunctionModelNames,
} from './index';

/**
 * Example: Schema introspection
 */
export function introspectionExample() {
  // Get schema statistics
  const stats = getSchemaStats(exampleSchema);
  console.log('Schema stats:', stats);
  // → { totalModels: 10, crudModels: 3, eventModels: 3, functionModels: 4 }

  // Get model names by category
  const crudModels = getCrudModelNames(exampleSchema);
  console.log('CRUD models:', crudModels);
  // → ['User', 'Project', 'Dataset']

  const events = getEventModelNames(exampleSchema);
  console.log('Events:', events);
  // → ['DataUploaded', 'DataValidated', 'NotificationRequested']

  const functions = getFunctionModelNames(exampleSchema);
  console.log('Functions:', functions);
  // → ['GenerateReport', 'ValidateData', 'SearchData']
}
