/**
 * Complete Getting Started Example
 *
 * This example demonstrates a complete task management backend
 * built with Atakora Component v2.0
 *
 * Features:
 * - Schema-first data models (User, Project, Task)
 * - Microsoft Entra ID authentication
 * - Authorization rules
 * - Custom function handlers
 * - Service dependency injection
 * - Type-safe throughout
 */

import { defineSchema, defineAuth, defineBackend, a, c, auth } from '@atakora/component';
import type { FunctionHandler } from '@atakora/component/functions';

// ============================================================================
// STEP 1: Define Schema
// ============================================================================

export const schema = defineSchema({
  schema: a.schema({

    // User Model
    User: c.model({
      id: a.id(),
      email: a.string()
        .required()
        .email()
        .description('User email address'),
      name: a.string()
        .required()
        .min(2)
        .max(100)
        .description('Full name'),
      role: a.enum(['admin', 'member', 'viewer'] as const)
        .default('member')
        .description('User role'),
      createdAt: a.datetime()
        .default(() => new Date())
        .description('Account creation timestamp'),
      lastLoginAt: a.datetime()
        .optional()
        .description('Last login timestamp'),
    })
      .authorization(allow => [
        // Users can read their own record
        allow.owner('id'),
        // Admins can read all users
        allow.custom((ctx) => ctx.user.roles.includes('admin')),
      ])
      .indexes([
        { fields: ['email'], unique: true },
        { fields: ['role', 'createdAt'] },
      ]),

    // Project Model
    Project: c.model({
      id: a.id(),
      name: a.string()
        .required()
        .min(3)
        .max(200)
        .description('Project name'),
      description: a.string()
        .optional()
        .max(1000)
        .description('Project description'),
      ownerId: a.string()
        .required()
        .description('Project owner user ID'),
      owner: a.ref('User')
        .optional()
        .description('Reference to owner'),
      status: a.enum(['active', 'archived', 'completed'] as const)
        .default('active')
        .description('Project status'),
      tags: a.array(a.string())
        .optional()
        .description('Project tags'),
      createdAt: a.datetime()
        .default(() => new Date()),
      updatedAt: a.datetime()
        .default(() => new Date()),
    })
      .authorization(allow => [
        // Owner can perform all operations
        allow.owner('ownerId'),
        // Members can read
        allow.authenticated().read(),
      ])
      .indexes([
        { fields: ['ownerId'] },
        { fields: ['status', 'createdAt'] },
      ])
      .partitionKey('ownerId'),

    // Task Model
    Task: c.model({
      id: a.id(),
      title: a.string()
        .required()
        .min(3)
        .max(200)
        .description('Task title'),
      description: a.string()
        .optional()
        .max(5000)
        .description('Task description'),
      projectId: a.string()
        .required()
        .description('Parent project ID'),
      project: a.ref('Project')
        .optional()
        .description('Reference to project'),
      assigneeId: a.string()
        .optional()
        .description('Assigned user ID'),
      assignee: a.ref('User')
        .optional()
        .description('Reference to assignee'),
      status: a.enum(['todo', 'in_progress', 'review', 'done'] as const)
        .default('todo')
        .description('Task status'),
      priority: a.enum(['low', 'medium', 'high', 'urgent'] as const)
        .default('medium')
        .description('Task priority'),
      dueDate: a.datetime()
        .optional()
        .description('Task due date'),
      completedAt: a.datetime()
        .optional()
        .description('Completion timestamp'),
      createdAt: a.datetime()
        .default(() => new Date()),
      updatedAt: a.datetime()
        .default(() => new Date()),
    })
      .authorization(allow => [
        // Project owner can manage all tasks
        allow.custom(async (ctx, task) => {
          const project = await ctx.database.Project.get(task.projectId);
          return project?.ownerId === ctx.user.id;
        }),
        // Assignee can update their tasks
        allow.custom((ctx, task) =>
          task.assigneeId === ctx.user.id
        ).update(),
        // Authenticated users can read tasks
        allow.authenticated().read(),
      ])
      .indexes([
        { fields: ['projectId'] },
        { fields: ['assigneeId', 'status'] },
        { fields: ['dueDate'] },
      ])
      .partitionKey('projectId'),
  }),
});

// Export inferred types
export type User = typeof schema.types.User;
export type Project = typeof schema.types.Project;
export type Task = typeof schema.types.Task;

// ============================================================================
// STEP 2: Configure Authentication
// ============================================================================

export const authentication = defineAuth({

  // Primary: Microsoft Entra ID
  Primary: auth.entra()
    .tenantId(process.env.AZURE_TENANT_ID!)
    .clientId(process.env.AZURE_CLIENT_ID!)
    .audience('api://task-management-app')
    .issuer(`https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`)
    .validateIssuer(true)
    .validateAudience(true)
    .clockTolerance(300) // 5 minutes
    .cacheTokens(true)
    .cacheTTL(3600) // 1 hour
    .primary()
    .roles((mapper) => {
      mapper.map('TaskApp.Admin', 'admin');
      mapper.map('TaskApp.Member', 'member');
      mapper.mapDefault('viewer');
    }),

  // Secondary: API Keys for service-to-service
  ApiKey: auth.apiKey()
    .headerName('x-api-key')
    .validateKey(async (key) => {
      // In production, validate against Azure Key Vault
      const validKeys = process.env.API_KEYS?.split(',') || [];
      return validKeys.includes(key);
    })
    .roles(['service', 'automation']),
});

// ============================================================================
// STEP 3: Define Custom Services
// ============================================================================

interface EmailService {
  send(to: string, subject: string, body: string): Promise<void>;
}

interface NotificationService {
  notify(userId: string, message: string): Promise<void>;
}

function createEmailService(): EmailService {
  return {
    send: async (to: string, subject: string, body: string) => {
      // Integrate with SendGrid, Azure Communication Services, etc.
      console.log(`[Email] To: ${to}, Subject: ${subject}`);
      console.log(`[Email] Body: ${body}`);
      // await sendGridClient.send({ to, subject, body });
    },
  };
}

function createNotificationService(): NotificationService {
  return {
    notify: async (userId: string, message: string) => {
      // Push notifications, webhooks, etc.
      console.log(`[Notification] User: ${userId}, Message: ${message}`);
      // await pushNotificationService.send(userId, message);
    },
  };
}

// ============================================================================
// STEP 4: Assemble Backend
// ============================================================================

export const backend = defineBackend({

  // Schema
  schema,

  // Authentication
  authentication,

  // Settings
  settings: {
    name: 'task-app',
    region: 'eastus',
    environment: 'development', // auto-detected: development, staging, production, govcloud

    // Resource naming
    resourcePrefix: 'taskapp',
    resourceSuffix: 'dev',

    // Feature flags
    features: {
      auditLogging: true,
      metricsCollection: true,
      distributedTracing: true,
      autoScaling: false, // Enable in production
    },

    // CORS configuration
    cors: {
      allowedOrigins: ['http://localhost:3000', 'https://app.example.com'],
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400,
    },

    // Performance tuning
    performance: {
      caching: {
        enabled: true,
        ttl: 300, // 5 minutes
      },
      rateLimit: {
        enabled: true,
        requestsPerMinute: 100,
        burstSize: 20,
      },
    },
  },

  // Services (Dependency Injection)
  services: (builder) => ({
    emailService: builder.singleton(createEmailService()),
    notificationService: builder.transient(createNotificationService()),
  }),

  // Custom Function Handlers
  functions: {
    completeTask: {
      handler: completeTaskHandler,
      httpTrigger: {
        methods: ['POST'],
        route: 'tasks/{taskId}/complete',
        authLevel: 'authenticated',
      },
    },
    getProjectStats: {
      handler: getProjectStatsHandler,
      httpTrigger: {
        methods: ['GET'],
        route: 'projects/{projectId}/stats',
        authLevel: 'authenticated',
      },
    },
  },
});

// Export type for use in handlers
export type Backend = typeof backend;

// ============================================================================
// STEP 5: Custom Function Handlers
// ============================================================================

/**
 * Complete a task and send notification
 */
export const completeTaskHandler: FunctionHandler<Backend> = async (context) => {
  const { taskId } = context.request.params;

  // Get task
  const task = await context.database.Task.get(taskId);
  if (!task) {
    return context.response.notFound('Task not found');
  }

  // Verify authorization
  if (task.assigneeId !== context.user.id) {
    return context.response.forbidden('Only assignee can complete task');
  }

  // Update task
  const updatedTask = await context.database.Task.update(taskId, {
    status: 'done',
    completedAt: new Date(),
  });

  // Send notification to project owner
  const project = await context.database.Project.get(task.projectId);
  if (project) {
    await context.services.notificationService.notify(
      project.ownerId,
      `Task "${task.title}" completed by ${context.user.email}`
    );

    // Send email
    const owner = await context.database.User.get(project.ownerId);
    if (owner) {
      await context.services.emailService.send(
        owner.email,
        `Task Completed: ${task.title}`,
        `${context.user.name} completed the task "${task.title}" in project "${project.name}".`
      );
    }
  }

  return context.response.success(updatedTask);
};

/**
 * Get task statistics for a project
 */
export const getProjectStatsHandler: FunctionHandler<Backend> = async (context) => {
  const { projectId } = context.request.params;

  // Verify project access
  const project = await context.database.Project.get(projectId);
  if (!project) {
    return context.response.notFound('Project not found');
  }

  // Check authorization (project owner or admin)
  const isOwner = project.ownerId === context.user.id;
  const isAdmin = context.user.roles.includes('admin');
  if (!isOwner && !isAdmin) {
    return context.response.forbidden('Access denied');
  }

  // Get all tasks for project
  const tasks = await context.database.Task.query({
    filter: { projectId },
    partitionKey: projectId, // Single-partition query for performance
  });

  // Calculate statistics
  const stats = {
    total: tasks.length,
    byStatus: {
      todo: tasks.filter(t => t.status === 'todo').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      review: tasks.filter(t => t.status === 'review').length,
      done: tasks.filter(t => t.status === 'done').length,
    },
    byPriority: {
      low: tasks.filter(t => t.priority === 'low').length,
      medium: tasks.filter(t => t.priority === 'medium').length,
      high: tasks.filter(t => t.priority === 'high').length,
      urgent: tasks.filter(t => t.priority === 'urgent').length,
    },
    overdue: tasks.filter(t =>
      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
    ).length,
    completionRate: tasks.length > 0
      ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100)
      : 0,
  };

  return context.response.success({
    projectId,
    projectName: project.name,
    stats,
    generatedAt: new Date().toISOString(),
  });
};

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/**
 * Example usage in application code
 */
export async function exampleUsage() {
  // The backend definition automatically generates:
  //
  // 1. REST API Endpoints (CRUD):
  //    GET    /api/users              - List users
  //    GET    /api/users/{id}         - Get user
  //    POST   /api/users              - Create user
  //    PUT    /api/users/{id}         - Update user
  //    DELETE /api/users/{id}         - Delete user
  //
  //    GET    /api/projects           - List projects
  //    GET    /api/projects/{id}      - Get project
  //    POST   /api/projects           - Create project
  //    PUT    /api/projects/{id}      - Update project
  //    DELETE /api/projects/{id}      - Delete project
  //
  //    GET    /api/tasks              - List tasks
  //    GET    /api/tasks/{id}         - Get task
  //    POST   /api/tasks              - Create task
  //    PUT    /api/tasks/{id}         - Update task
  //    DELETE /api/tasks/{id}         - Delete task
  //
  // 2. Custom Endpoints:
  //    POST   /api/tasks/{id}/complete        - Complete task
  //    GET    /api/projects/{id}/stats        - Project statistics
  //
  // 3. Azure Infrastructure:
  //    - Azure Functions (REST API + handlers)
  //    - Cosmos DB (NoSQL database)
  //    - Application Insights (monitoring)
  //    - Storage Account (function app storage)
  //    - Key Vault (secrets management)
  //
  // 4. Type-Safe Database Access:
  //    context.database.User.get(id)
  //    context.database.Project.query({ filter: {...} })
  //    context.database.Task.create({ ... })
  //
  // 5. Authentication & Authorization:
  //    - JWT token validation
  //    - Role-based access control
  //    - Row-level security
  //    - Automatic authorization checks
}

// ============================================================================
// DEPLOYMENT
// ============================================================================

/**
 * Deploy to Azure
 *
 * 1. Build:
 *    npm run build
 *
 * 2. Deploy:
 *    npm run deploy
 *
 * This generates and deploys:
 * - ARM templates for infrastructure
 * - Function app code
 * - Database schema
 * - Monitoring configuration
 */

// ============================================================================
// TESTING
// ============================================================================

/**
 * Example test
 */
import { describe, it, expect } from 'vitest';

describe('Task Management Backend', () => {
  it('should validate task data', () => {
    const validator = backend.schema.getValidator('Task');

    const validTask = {
      title: 'Build feature',
      projectId: 'proj-123',
      status: 'todo',
      priority: 'high',
    };

    const result = validator.validate(validTask);
    expect(result.success).toBe(true);
  });

  it('should reject invalid task data', () => {
    const validator = backend.schema.getValidator('Task');

    const invalidTask = {
      title: 'AB', // Too short (min 3)
      projectId: '',
      status: 'invalid-status',
    };

    const result = validator.validate(invalidTask);
    expect(result.success).toBe(false);
  });
});
