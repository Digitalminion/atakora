/**
 * Schema Definition
 *
 * This file defines all data models for your backend.
 * Models auto-generate infrastructure, APIs, validation, and types.
 *
 * Three model types:
 * - c.model() - CRUD operations (REST APIs + Cosmos DB)
 * - e.model() - Event processing (Queues + processors)
 * - f.model() - Custom functions (HTTP endpoints with custom logic)
 */

import { defineSchema, a, c, e, f } from '@atakora/component';

export const schema = defineSchema({
  schema: a.schema({
    /**
     * CRUD Model Example: User
     *
     * Auto-generates:
     * - POST   /api/users           Create user
     * - GET    /api/users/:id       Get user by ID
     * - PUT    /api/users/:id       Update user
     * - DELETE /api/users/:id       Delete user
     * - GET    /api/users           List users (with filters, pagination, sorting)
     *
     * - Cosmos DB container: 'users'
     * - TypeScript types: User, CreateUserInput, UpdateUserInput
     * - Input/output validation
     * - Authentication required
     * - Authorization enforced
     */
    User: c.model({
      id: a.id(),                                      // Auto-generated UUID
      email: a.string().required().email(),            // Validates email format
      name: a.string().required(),
      role: a.enum(['user', 'admin']).default('user'),
      isActive: a.boolean().default(true),
      // createdAt, updatedAt added automatically
    })
      .authorization(allow => [
        allow.owner('id'),                             // Users can manage themselves
        allow.groups(['admin']).all(),                 // Admins can manage all users
      ])
      .indexes(['email', 'role']),                     // Optimize queries on these fields

    /**
     * CRUD Model Example: Project
     *
     * Demonstrates:
     * - Foreign keys (ownerId)
     * - Organization-based access
     * - Multi-field indexes
     */
    Project: c.model({
      id: a.id(),
      name: a.string().required(),
      description: a.string(),
      ownerId: a.string().required(),                  // Foreign key to User
      organizationId: a.string().required(),
      status: a.enum(['planning', 'active', 'completed', 'archived']).default('planning'),
      settings: a.json().default({}),                  // Arbitrary JSON
    })
      .authorization(allow => [
        allow.owner('ownerId'),                        // Owner has full access
        allow.custom((user, project) => {
          return user.organizationId === project.organizationId;
        }).read(),                                     // Same org can read
        allow.groups(['admin']).all(),
      ])
      .indexes(['ownerId', 'organizationId', 'status'])
      .partitionKey('organizationId'),                 // Optimize for multi-tenant queries

    /**
     * Event Model Example: DataUploaded
     *
     * Auto-generates:
     * - POST /api/events/data-uploaded   Publish endpoint
     * - Azure Storage Queue: 'data-uploaded'
     * - Processor function (queue-triggered)
     * - Dead letter queue: 'data-uploaded-deadletter'
     *
     * Default processor: Just logs the event
     * To customize: Create src/event/resource.ts and attach processor
     */
    DataUploaded: e.model({
      datasetId: a.string().required(),
      projectId: a.string().required(),
      fileUrl: a.string().url().required(),            // Validates URL
      fileSizeBytes: a.number().required().min(1),     // Must be positive
      uploadedAt: a.datetime().required(),
      uploadedBy: a.string().required(),
    }),

    /**
     * Event Model Example: ValidationRequested
     *
     * Demonstrates event chaining:
     * DataUploaded → ValidationRequested → ValidationCompleted
     */
    ValidationRequested: e.model({
      datasetId: a.string().required(),
      fileUrl: a.string().url().required(),
      requestedAt: a.datetime().required(),
    }),

    /**
     * Function Model Example: GenerateReport
     *
     * Auto-generates:
     * - POST /api/functions/generate-report   HTTP endpoint
     * - Input validation (based on input schema)
     * - Output validation (based on output schema)
     *
     * Default handler: Returns 501 Not Implemented
     * To customize: Create src/function/resource.ts and attach handler
     */
    GenerateReport: f.model({
      input: {
        datasetId: a.string().required(),
        reportType: a.enum(['summary', 'detailed', 'quality']).required(),
        format: a.enum(['pdf', 'csv', 'xlsx']).default('pdf'),
        includeCharts: a.boolean().default(true),
        dateRange: a.object({
          start: a.datetime().required(),
          end: a.datetime().required(),
        }),
      },
      output: {
        reportId: a.string().required(),
        reportUrl: a.string().url().required(),
        status: a.enum(['generating', 'completed', 'failed']).required(),
        expiresAt: a.datetime().required(),
        metadata: a.json(),
      },
    })
      .authorization(allow => [
        allow.authenticated(),                         // Any authenticated user
        allow.groups(['analyst', 'admin']),           // Analysts and admins
      ]),

    /**
     * Function Model Example: SearchData
     *
     * Demonstrates complex input/output schemas
     */
    SearchData: f.model({
      input: {
        query: a.string().required().minLength(3),
        projectId: a.string(),
        filters: a.object({
          dateRange: a.object({
            start: a.datetime(),
            end: a.datetime(),
          }),
          status: a.array(a.string()),
          tags: a.array(a.string()),
        }),
        page: a.number().default(1).min(1),
        pageSize: a.number().default(20).min(1).max(100),
      },
      output: {
        results: a.array(a.json()).required(),
        pagination: a.object({
          page: a.number().required(),
          pageSize: a.number().required(),
          total: a.number().required(),
          totalPages: a.number().required(),
        }).required(),
        executionTime: a.number().required(),          // Milliseconds
      },
    }),
  }),
});

/**
 * NEXT STEPS:
 *
 * 1. Deploy this schema:
 *    npx atakora deploy --environment development
 *
 * 2. Test auto-generated endpoints:
 *    POST /api/users
 *    GET  /api/users
 *    POST /api/events/data-uploaded
 *    POST /api/functions/generate-report
 *
 * 3. Add custom logic (when needed):
 *
 *    Event Processor:
 *    - Create src/event/resource.ts
 *    - Define custom processor for DataUploaded
 *    - Attach in src/index.ts: backend.schema.DataUploaded.queue.attach(...)
 *
 *    Function Handler:
 *    - Create src/function/resource.ts
 *    - Define custom handler for GenerateReport
 *    - Attach in src/index.ts: backend.schema.GenerateReport.function.attach(...)
 *
 *    Infrastructure:
 *    - Create src/network/resource.ts for VNet config
 *    - Create src/storage/resource.ts for Cosmos DB config
 *    - Create src/compute/resource.ts for Function App config
 *    - Attach in src/index.ts: backend.network.primary.attach(...)
 *
 * See docs/reference/backend/ for complete documentation.
 */
