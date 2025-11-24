/**
 * Reusable Backend Test Fixtures
 *
 * @remarks
 * This module provides a comprehensive set of reusable backend configurations
 * for testing various scenarios across the test suite. Each fixture is designed
 * to be easily customizable while providing sensible defaults.
 *
 * @module @atakora/component/__tests__/fixtures/backends
 */

import { defineSchema, a, c, e, f } from '../../schema';
import { defineAuth, auth } from '../../auth';
import { defineBackend } from '../../backend';
import { hours } from '../../common/duration';
import type { BackendObject } from '../../backend/types';

// ============================================================================
// Schema Fixtures
// ============================================================================

/**
 * Minimal schema - Single CRUD model
 *
 * @remarks
 * Useful for basic tests that don't need complex schemas.
 * Fast to create and validate.
 */
export const minimalSchema = defineSchema({
  schema: a.schema({
    User: c.model({
      id: a.id(),
      email: a.string().required().email(),
      name: a.string().required(),
    }),
  }),
});

/**
 * Standard schema - CRUD + Events
 *
 * @remarks
 * Represents a typical application schema with both data models and events.
 * Good for testing event-driven patterns.
 */
export const standardSchema = defineSchema({
  schema: a.schema({
    // CRUD Models
    User: c.model({
      id: a.id(),
      email: a.string().required().email(),
      name: a.string().required(),
      role: a.enum(['admin', 'user']).default('user'),
      createdAt: a.datetime().default('now'),
    }),

    Post: c.model({
      id: a.id(),
      title: a.string().required(),
      content: a.string().required(),
      authorId: a.string().required(),
      publishedAt: a.datetime().optional(),
    }),

    // Event Models
    UserRegistered: e.model({
      userId: a.string().required(),
      email: a.string().required().email(),
      registeredAt: a.datetime().required(),
    }),

    PostPublished: e.model({
      postId: a.string().required(),
      authorId: a.string().required(),
      publishedAt: a.datetime().required(),
    }),
  }),
});

/**
 * Complex schema - CRUD + Events + Functions
 *
 * @remarks
 * Full-featured schema for testing all model types.
 * Includes relationships, validations, and business logic.
 */
export const complexSchema = defineSchema({
  schema: a.schema({
    // CRUD Models
    Organization: c.model({
      id: a.id(),
      name: a.string().required(),
      domain: a.string().required(),
      plan: a.enum(['free', 'pro', 'enterprise']).default('free'),
      settings: a.json().optional(),
    }),

    User: c.model({
      id: a.id(),
      email: a.string().required().email(),
      name: a.string().required(),
      organizationId: a.string().required(),
      role: a.enum(['admin', 'member', 'viewer']).default('member'),
      metadata: a.json().optional(),
      createdAt: a.datetime().default('now'),
      updatedAt: a.datetime().default('now'),
    }),

    Dataset: c.model({
      id: a.id(),
      name: a.string().required(),
      organizationId: a.string().required(),
      uploadedBy: a.string().required(),
      fileUrl: a.string().url().required(),
      sizeBytes: a.number().integer().min(0).required(),
      status: a.enum(['uploading', 'processing', 'ready', 'error']).default('uploading'),
      metadata: a.json().optional(),
      createdAt: a.datetime().default('now'),
    }),

    Report: c.model({
      id: a.id(),
      name: a.string().required(),
      datasetId: a.string().required(),
      generatedBy: a.string().required(),
      reportUrl: a.string().url().optional(),
      status: a.enum(['pending', 'generating', 'ready', 'failed']).default('pending'),
      createdAt: a.datetime().default('now'),
      completedAt: a.datetime().optional(),
    }),

    // Event Models
    DataUploaded: e.model({
      datasetId: a.string().required(),
      organizationId: a.string().required(),
      uploadedBy: a.string().required(),
      fileUrl: a.string().url().required(),
      sizeBytes: a.number().integer().min(0).required(),
      uploadedAt: a.datetime().required(),
    }),

    DataProcessed: e.model({
      datasetId: a.string().required(),
      organizationId: a.string().required(),
      recordCount: a.number().integer().min(0).required(),
      processedAt: a.datetime().required(),
    }),

    ReportGenerated: e.model({
      reportId: a.string().required(),
      datasetId: a.string().required(),
      generatedBy: a.string().required(),
      reportUrl: a.string().url().required(),
      generatedAt: a.datetime().required(),
    }),

    // Function Models
    GenerateReport: f.model({
      input: {
        datasetId: a.string().required(),
        userId: a.string().required(),
        reportType: a.enum(['summary', 'detailed', 'export']).default('summary'),
      },
      output: {
        reportId: a.string().required(),
        reportUrl: a.string().url().required(),
        status: a.enum(['queued', 'processing', 'ready', 'failed']).required(),
      },
    }),

    ProcessDataset: f.model({
      input: {
        datasetId: a.string().required(),
        processingOptions: a.json().optional(),
      },
      output: {
        recordCount: a.number().integer().required(),
        processedAt: a.datetime().required(),
        errors: a.array(a.string()).optional(),
      },
    }),

    SendNotification: f.model({
      input: {
        userId: a.string().required(),
        message: a.string().required(),
        priority: a.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
      },
      output: {
        notificationId: a.string().required(),
        sentAt: a.datetime().required(),
        delivered: a.boolean().required(),
      },
    }),
  }),
});

/**
 * Production schema - Large-scale with advanced features
 *
 * @remarks
 * Simulates a real-world production application with:
 * - Multiple related models
 * - Complex validations
 * - Rich business logic
 * - Performance considerations
 */
export const productionSchema = defineSchema({
  schema: a.schema({
    // Core Models
    Tenant: c.model({
      id: a.id(),
      name: a.string().required(),
      subdomain: a.string().required(),
      plan: a.enum(['starter', 'professional', 'enterprise', 'government']).default('starter'),
      region: a.string().required(),
      complianceFrameworks: a.array(a.string()).optional(),
      limits: a.json().required(),
      status: a.enum(['active', 'suspended', 'trial', 'archived']).default('active'),
      createdAt: a.datetime().default('now'),
      updatedAt: a.datetime().default('now'),
    }),

    User: c.model({
      id: a.id(),
      tenantId: a.string().required(),
      email: a.string().required().email(),
      firstName: a.string().required(),
      lastName: a.string().required(),
      roles: a.array(a.string()).required(),
      permissions: a.array(a.string()).optional(),
      mfaEnabled: a.boolean().default(false),
      lastLoginAt: a.datetime().optional(),
      metadata: a.json().optional(),
      status: a.enum(['active', 'inactive', 'locked', 'pending']).default('pending'),
      createdAt: a.datetime().default('now'),
      updatedAt: a.datetime().default('now'),
    }),

    ApiKey: c.model({
      id: a.id(),
      tenantId: a.string().required(),
      userId: a.string().required(),
      name: a.string().required(),
      keyHash: a.string().required(),
      scopes: a.array(a.string()).required(),
      expiresAt: a.datetime().optional(),
      lastUsedAt: a.datetime().optional(),
      rateLimit: a.number().integer().min(0).optional(),
      status: a.enum(['active', 'revoked', 'expired']).default('active'),
      createdAt: a.datetime().default('now'),
    }),

    AuditLog: c.model({
      id: a.id(),
      tenantId: a.string().required(),
      userId: a.string().optional(),
      action: a.string().required(),
      resource: a.string().required(),
      resourceId: a.string().optional(),
      ipAddress: a.string().optional(),
      userAgent: a.string().optional(),
      metadata: a.json().optional(),
      timestamp: a.datetime().default('now'),
    }),

    // Business Models
    Project: c.model({
      id: a.id(),
      tenantId: a.string().required(),
      name: a.string().required(),
      description: a.string().optional(),
      ownerId: a.string().required(),
      teamMembers: a.array(a.string()).required(),
      tags: a.array(a.string()).optional(),
      settings: a.json().optional(),
      status: a.enum(['active', 'archived', 'deleted']).default('active'),
      createdAt: a.datetime().default('now'),
      updatedAt: a.datetime().default('now'),
    }),

    Dataset: c.model({
      id: a.id(),
      tenantId: a.string().required(),
      projectId: a.string().required(),
      name: a.string().required(),
      description: a.string().optional(),
      uploadedBy: a.string().required(),
      storageUrl: a.string().url().required(),
      sizeBytes: a.number().integer().min(0).required(),
      format: a.enum(['csv', 'json', 'parquet', 'excel']).required(),
      schema: a.json().optional(),
      rowCount: a.number().integer().min(0).optional(),
      columnCount: a.number().integer().min(0).optional(),
      checksumMd5: a.string().optional(),
      encryptionKeyId: a.string().optional(),
      status: a.enum(['uploading', 'validating', 'ready', 'processing', 'error']).default('uploading'),
      metadata: a.json().optional(),
      createdAt: a.datetime().default('now'),
      updatedAt: a.datetime().default('now'),
    }),

    Job: c.model({
      id: a.id(),
      tenantId: a.string().required(),
      projectId: a.string().required(),
      type: a.enum(['import', 'export', 'transform', 'analyze', 'report']).required(),
      status: a.enum(['queued', 'running', 'completed', 'failed', 'cancelled']).default('queued'),
      priority: a.number().integer().min(0).max(10).default(5),
      progress: a.number().min(0).max(100).default(0),
      inputDatasetId: a.string().optional(),
      outputDatasetId: a.string().optional(),
      config: a.json().required(),
      result: a.json().optional(),
      errorMessage: a.string().optional(),
      startedAt: a.datetime().optional(),
      completedAt: a.datetime().optional(),
      createdAt: a.datetime().default('now'),
    }),

    // Event Models
    UserLoggedIn: e.model({
      userId: a.string().required(),
      tenantId: a.string().required(),
      ipAddress: a.string().optional(),
      userAgent: a.string().optional(),
      mfaUsed: a.boolean().required(),
      loginAt: a.datetime().required(),
    }),

    DatasetUploaded: e.model({
      datasetId: a.string().required(),
      tenantId: a.string().required(),
      projectId: a.string().required(),
      uploadedBy: a.string().required(),
      sizeBytes: a.number().integer().required(),
      format: a.string().required(),
      uploadedAt: a.datetime().required(),
    }),

    JobCompleted: e.model({
      jobId: a.string().required(),
      tenantId: a.string().required(),
      projectId: a.string().required(),
      type: a.string().required(),
      status: a.string().required(),
      duration: a.number().integer().required(),
      completedAt: a.datetime().required(),
    }),

    AlertTriggered: e.model({
      alertId: a.string().required(),
      tenantId: a.string().required(),
      severity: a.enum(['info', 'warning', 'error', 'critical']).required(),
      message: a.string().required(),
      metadata: a.json().optional(),
      triggeredAt: a.datetime().required(),
    }),

    // Function Models
    GenerateAnalyticsReport: f.model({
      input: {
        tenantId: a.string().required(),
        projectId: a.string().required(),
        datasetIds: a.array(a.string()).required(),
        reportType: a.enum(['summary', 'detailed', 'custom']).required(),
        options: a.json().optional(),
      },
      output: {
        reportId: a.string().required(),
        reportUrl: a.string().url().required(),
        sizeBytes: a.number().integer().required(),
        generatedAt: a.datetime().required(),
      },
    }),

    ExecuteDataTransformation: f.model({
      input: {
        tenantId: a.string().required(),
        datasetId: a.string().required(),
        transformationType: a.enum(['filter', 'aggregate', 'join', 'pivot']).required(),
        config: a.json().required(),
      },
      output: {
        outputDatasetId: a.string().required(),
        rowsProcessed: a.number().integer().required(),
        executionTime: a.number().required(),
        warnings: a.array(a.string()).optional(),
      },
    }),

    SendBulkNotifications: f.model({
      input: {
        tenantId: a.string().required(),
        userIds: a.array(a.string()).required(),
        subject: a.string().required(),
        message: a.string().required(),
        priority: a.enum(['low', 'normal', 'high']).default('normal'),
      },
      output: {
        sentCount: a.number().integer().required(),
        failedCount: a.number().integer().required(),
        sentAt: a.datetime().required(),
      },
    }),
  }),
});

/**
 * Government Cloud schema - Compliance-focused
 *
 * @remarks
 * Designed for government and highly regulated environments:
 * - Enhanced audit logging
 * - Data classification
 * - Compliance tracking
 * - Security metadata
 */
export const governmentSchema = defineSchema({
  schema: a.schema({
    Agency: c.model({
      id: a.id(),
      name: a.string().required(),
      agencyCode: a.string().required(),
      classification: a.enum(['public', 'sensitive', 'classified']).default('sensitive'),
      complianceFrameworks: a.array(a.string()).required(),
      securityContact: a.string().email().required(),
      region: a.enum(['usgov-virginia', 'usgov-arizona']).required(),
      createdAt: a.datetime().default('now'),
    }),

    Document: c.model({
      id: a.id(),
      agencyId: a.string().required(),
      title: a.string().required(),
      classification: a.enum(['unclassified', 'cui', 'secret', 'top-secret']).default('unclassified'),
      storageUrl: a.string().url().required(),
      encryptionKeyId: a.string().required(),
      checksumSha256: a.string().required(),
      accessLog: a.array(a.json()).optional(),
      retentionPolicy: a.json().required(),
      createdAt: a.datetime().default('now'),
      lastAccessedAt: a.datetime().optional(),
    }),

    SecurityEvent: e.model({
      eventId: a.string().required(),
      agencyId: a.string().required(),
      eventType: a.string().required(),
      severity: a.enum(['low', 'medium', 'high', 'critical']).required(),
      metadata: a.json().required(),
      timestamp: a.datetime().required(),
    }),

    ComplianceCheck: f.model({
      input: {
        agencyId: a.string().required(),
        framework: a.string().required(),
        resources: a.array(a.string()).required(),
      },
      output: {
        checkId: a.string().required(),
        passed: a.boolean().required(),
        findings: a.array(a.json()).required(),
        checkedAt: a.datetime().required(),
      },
    }),
  }),
});

// ============================================================================
// Authentication Fixtures
// ============================================================================

/**
 * Basic Entra ID authentication
 */
export const basicAuth = defineAuth({
  Entra: auth.entra().tenant('test-tenant-id').clientId('test-client-id').audience('api://test'),
});

/**
 * Multi-provider authentication (multiple Entra providers for different purposes)
 */
export const multiProviderAuth = defineAuth({
  Primary: auth.entra().tenant('test-tenant-id').clientId('test-client-id').audience('api://test'),
  Secondary: auth.entra().tenant('test-tenant-2-id').clientId('test-client-2-id').audience('api://test-2'),
});

/**
 * Production authentication with session management
 */
export const productionAuth = defineAuth({
  Primary: auth
    .entra()
    .tenant('prod-tenant-id')
    .clientId('prod-client-id')
    .audience('api://prod')
    .session((session) => session.duration(hours(12))),
});

/**
 * Government Cloud authentication
 */
export const governmentAuth = defineAuth({
  Primary: auth
    .entra()
    .tenant('gov-tenant-id')
    .clientId('gov-client-id')
    .audience('api://gov')
    .session((session) => session.duration(hours(4))),
});

// ============================================================================
// Backend Fixtures
// ============================================================================

/**
 * Minimal backend - Single model, no auth, development
 *
 * @remarks
 * Fastest backend for simple tests. Ideal for:
 * - Basic functionality tests
 * - Schema validation tests
 * - Quick iterations
 */
export function createMinimalBackend(): BackendObject<typeof minimalSchema, never> {
  return defineBackend({
    schema: minimalSchema,
    settings: {
      name: 'minimal-test-app',
      environment: 'development',
    },
  });
}

/**
 * Standard backend - CRUD + Events, basic auth, development
 *
 * @remarks
 * Standard test backend for most test scenarios. Includes:
 * - Multiple CRUD models
 * - Event models
 * - Basic authentication
 */
export function createStandardBackend(): BackendObject<
  typeof standardSchema,
  typeof basicAuth
> {
  return defineBackend({
    schema: standardSchema,
    authentication: basicAuth,
    settings: {
      name: 'standard-test-app',
      environment: 'development',
      region: 'eastus',
      tags: {
        team: 'test',
        purpose: 'integration-testing',
      },
    },
  });
}

/**
 * Complex backend - All model types, multi-auth, staging
 *
 * @remarks
 * Full-featured backend for comprehensive testing. Includes:
 * - All model types (CRUD, Events, Functions)
 * - Multiple authentication providers
 * - Staging environment defaults
 * - Custom tags and settings
 */
export function createComplexBackend(): BackendObject<
  typeof complexSchema,
  typeof multiProviderAuth
> {
  return defineBackend({
    schema: complexSchema,
    authentication: multiProviderAuth,
    settings: {
      name: 'complex-test-app',
      environment: 'staging',
      region: 'westus2',
      resourceGroup: 'complex-test-rg',
      tags: {
        team: 'test',
        environment: 'staging',
        purpose: 'integration-testing',
      },
      features: {
        monitoring: true,
        networking: true,
        performance: false,
      },
    },
  });
}

/**
 * Production backend - Large schema, full auth, all features
 *
 * @remarks
 * Production-grade backend for performance and stress testing. Includes:
 * - Large schema with many models
 * - Full authentication with MFA and session management
 * - All features enabled (monitoring, networking, performance)
 * - Production environment defaults
 */
export function createProductionBackend(): BackendObject<
  typeof productionSchema,
  typeof productionAuth
> {
  return defineBackend({
    schema: productionSchema,
    authentication: productionAuth,
    settings: {
      name: 'production-test-app',
      environment: 'production',
      region: 'eastus2',
      resourceGroup: 'production-test-rg',
      tags: {
        team: 'test',
        environment: 'production',
        purpose: 'performance-testing',
        criticality: 'high',
      },
      features: {
        monitoring: true,
        networking: true,
        performance: true,
      },
    },
  });
}

/**
 * Government Cloud backend - Compliance-focused, secure
 *
 * @remarks
 * Government Cloud backend for compliance testing. Includes:
 * - Government Cloud schema
 * - Government Cloud authentication
 * - Enhanced security features
 * - Compliance-focused configuration
 */
export function createGovernmentBackend(): BackendObject<
  typeof governmentSchema,
  typeof governmentAuth
> {
  return defineBackend({
    schema: governmentSchema,
    authentication: governmentAuth,
    settings: {
      name: 'gov-test-app',
      environment: 'production',
      region: 'usgov-virginia',
      resourceGroup: 'gov-test-rg',
      tags: {
        team: 'test',
        environment: 'production',
        cloud: 'government',
        classification: 'sensitive',
      },
      features: {
        monitoring: true,
        networking: true,
        performance: true,
      },
    },
  });
}

// ============================================================================
// Custom Backend Builder
// ============================================================================

/**
 * Custom backend builder for test-specific configurations
 *
 * @example
 * ```typescript
 * const backend = createCustomBackend({
 *   name: 'my-test',
 *   schema: customSchema,
 *   authentication: customAuth,
 *   environment: 'staging',
 *   features: { monitoring: true }
 * });
 * ```
 */
export interface CustomBackendOptions {
  name: string;
  schema: any;
  authentication?: any;
  environment?: 'development' | 'staging' | 'production';
  region?: string;
  features?: {
    monitoring?: boolean;
    networking?: boolean;
    performance?: boolean;
  };
  tags?: Record<string, string>;
}

export function createCustomBackend(options: CustomBackendOptions): BackendObject {
  return defineBackend({
    schema: options.schema,
    authentication: options.authentication,
    settings: {
      name: options.name,
      environment: options.environment || 'development',
      region: options.region,
      features: options.features,
      tags: options.tags,
    },
  });
}
