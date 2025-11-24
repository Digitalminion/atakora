/**
 * Model Namespace Integration Tests
 *
 * Tests for c, e, f namespace exports and model combinations.
 */

import { describe, it, expect } from 'vitest';
import { c, e, f } from './index';
import { a } from './field-types';

// ============================================================================
// Namespace Exports
// ============================================================================

describe('Model Namespaces - Exports', () => {
  it('should export c namespace for CRUD models', () => {
    expect(c).toBeDefined();
    expect(c.model).toBeDefined();
    expect(typeof c.model).toBe('function');
  });

  it('should export e namespace for event models', () => {
    expect(e).toBeDefined();
    expect(e.model).toBeDefined();
    expect(typeof e.model).toBe('function');
  });

  it('should export f namespace for function models', () => {
    expect(f).toBeDefined();
    expect(f.model).toBeDefined();
    expect(typeof f.model).toBe('function');
  });

  it('should have distinct namespaces', () => {
    expect(c).not.toBe(e);
    expect(c).not.toBe(f);
    expect(e).not.toBe(f);
  });
});

// ============================================================================
// Model Type Identification
// ============================================================================

describe('Model Namespaces - Type Identification', () => {
  it('should create CRUD models with correct type', () => {
    const User = c.model({
      id: a.id(),
      name: a.string(),
    });

    expect(User._config.type).toBe('crud');
  });

  it('should create event models with correct type', () => {
    const UserRegistered = e.model({
      userId: a.id(),
      timestamp: a.datetime(),
    });

    expect(UserRegistered._config.type).toBe('event');
  });

  it('should create function models with correct type', () => {
    const ProcessData = f.model({
      input: { data: a.string() },
      output: { result: a.string() },
    });

    expect(ProcessData._config.type).toBe('function');
  });

  it('should distinguish between model types', () => {
    const crud = c.model({ id: a.id() });
    const event = e.model({ id: a.id() });
    const func = f.model({
      input: { id: a.id() },
      output: { result: a.string() },
    });

    expect(crud._config.type).not.toBe(event._config.type);
    expect(crud._config.type).not.toBe(func._config.type);
    expect(event._config.type).not.toBe(func._config.type);
  });
});

// ============================================================================
// Combined Schema Examples
// ============================================================================

describe('Model Namespaces - Combined Schemas', () => {
  it('should support schema with all model types', () => {
    const User = c.model({
      id: a.id(),
      email: a.string().email().required(),
      name: a.string().required(),
    });

    const UserRegistered = e.model({
      userId: a.id(),
      email: a.string().email().required(),
      timestamp: a.datetime().required(),
    });

    const SendWelcomeEmail = f.model({
      input: {
        userId: a.id(),
        email: a.string().email().required(),
      },
      output: {
        sent: a.boolean().required(),
        messageId: a.string(),
      },
    });

    expect(User._config.type).toBe('crud');
    expect(UserRegistered._config.type).toBe('event');
    expect(SendWelcomeEmail._config.type).toBe('function');
  });

  it('should support e-commerce schema', () => {
    const Product = c.model({
      id: a.id(),
      name: a.string().required(),
      price: a.number().min(0).required(),
      stock: a.number().integer().min(0).required(),
    });

    const Order = c.model({
      id: a.id(),
      customerId: a.string().required(),
      items: a.array(a.json()).required(),
      totalAmount: a.number().min(0).required(),
    });

    const OrderPlaced = e.model({
      orderId: a.id(),
      customerId: a.string().required(),
      totalAmount: a.number().min(0).required(),
      placedAt: a.datetime().required(),
    });

    const CalculateShipping = f.model({
      input: {
        orderId: a.id(),
        address: a.json().required(),
      },
      output: {
        shippingCost: a.number().min(0).required(),
        estimatedDays: a.number().integer().min(1).required(),
      },
    });

    expect(Product._config.type).toBe('crud');
    expect(Order._config.type).toBe('crud');
    expect(OrderPlaced._config.type).toBe('event');
    expect(CalculateShipping._config.type).toBe('function');
  });

  it('should support multi-tenant application schema', () => {
    const Tenant = c
      .model({
        id: a.id(),
        name: a.string().required(),
        status: a.enum(['active', 'suspended']).default('active'),
      })
      .authorization((allow) => [allow.groups(['super-admin']).all()]);

    const User = c
      .model({
        id: a.id(),
        tenantId: a.string().required(),
        email: a.string().email().required(),
      })
      .partitionKey('tenantId')
      .authorization((allow) => [allow.owner('id'), allow.groups(['tenant-admin']).all()]);

    const TenantCreated = e.model({
      tenantId: a.id(),
      name: a.string().required(),
      createdAt: a.datetime().required(),
    });

    const InviteUser = f
      .model({
        input: {
          tenantId: a.string().required(),
          email: a.string().email().required(),
          role: a.enum(['admin', 'user']).required(),
        },
        output: {
          inviteId: a.id(),
          inviteUrl: a.string().url().required(),
          expiresAt: a.datetime().required(),
        },
      })
      .authorization((allow) => [allow.groups(['tenant-admin']).all()]);

    expect(Tenant._config.partitionKey).toBe('id');
    expect(User._config.partitionKey).toBe('tenantId');
    expect(TenantCreated._config.type).toBe('event');
    expect(InviteUser._config.authorization).toHaveLength(1);
  });
});

// ============================================================================
// Cross-Model References
// ============================================================================

describe('Model Namespaces - Cross-Model References', () => {
  it('should handle event referencing CRUD model', () => {
    const User = c.model({
      id: a.id(),
      email: a.string().email().required(),
    });

    const UserUpdated = e.model({
      userId: a.id(), // References User.id
      email: a.string().email().required(),
      updatedAt: a.datetime().required(),
    });

    expect(User._config.fields.id.type).toBe('id');
    expect(UserUpdated._config.fields.userId.type).toBe('id');
  });

  it('should handle function processing event data', () => {
    const FileUploaded = e.model({
      fileId: a.id(),
      fileUrl: a.string().url().required(),
      uploadedAt: a.datetime().required(),
    });

    const ProcessFile = f.model({
      input: {
        fileId: a.id(), // References FileUploaded.fileId
        options: a.json(),
      },
      output: {
        processedUrl: a.string().url().required(),
        status: a.enum(['success', 'failed']).required(),
      },
    });

    expect(FileUploaded._config.fields.fileId.type).toBe('id');
    expect(ProcessFile._config.input.fileId.type).toBe('id');
  });

  it('should handle CRUD model with event triggers', () => {
    const Document = c
      .model({
        id: a.id(),
        title: a.string().required(),
        content: a.string().required(),
        authorId: a.string().required(),
      })
      .authorization((allow) => [allow.owner('authorId')]);

    const DocumentCreated = e.model({
      documentId: a.id(), // References Document.id
      authorId: a.string().required(),
      createdAt: a.datetime().required(),
    });

    const IndexDocument = f.model({
      input: {
        documentId: a.id(), // References Document.id
        content: a.string().required(),
      },
      output: {
        indexed: a.boolean().required(),
        keywords: a.array(a.string()),
      },
    });

    expect(Document._config.type).toBe('crud');
    expect(DocumentCreated._config.type).toBe('event');
    expect(IndexDocument._config.type).toBe('function');
  });
});

// ============================================================================
// Real-World Application Schemas
// ============================================================================

describe('Model Namespaces - Real-World Applications', () => {
  it('should model blog application', () => {
    const Author = c
      .model({
        id: a.id(),
        email: a.string().email().required(),
        name: a.string().required(),
        bio: a.string(),
      })
      .authorization((allow) => [allow.owner('id')]);

    const Post = c
      .model({
        id: a.id(),
        authorId: a.string().required(),
        title: a.string().required(),
        content: a.string().required(),
        publishedAt: a.datetime(),
        status: a.enum(['draft', 'published']).default('draft'),
      })
      .authorization((allow) => [allow.owner('authorId'), allow.public(['read', 'list'])])
      .indexes(['authorId', 'status']);

    const Comment = c
      .model({
        id: a.id(),
        postId: a.string().required(),
        authorId: a.string().required(),
        content: a.string().required(),
      })
      .authorization((allow) => [allow.owner('authorId'), allow.authenticated(['read', 'list'])])
      .partitionKey('postId');

    const PostPublished = e.model({
      postId: a.id(),
      authorId: a.string().required(),
      title: a.string().required(),
      publishedAt: a.datetime().required(),
    });

    const GeneratePostSummary = f
      .model({
        input: {
          postId: a.id(),
          maxLength: a.number().integer().min(50).max(500).default(200),
        },
        output: {
          summary: a.string().required(),
          keywords: a.array(a.string()),
        },
      })
      .authorization((allow) => [allow.authenticated()]);

    expect(Author._config.type).toBe('crud');
    expect(Post._config.authorization).toHaveLength(2);
    expect(Comment._config.partitionKey).toBe('postId');
    expect(PostPublished._config.type).toBe('event');
    expect(GeneratePostSummary._config.type).toBe('function');
  });

  it('should model task management application', () => {
    const Project = c
      .model({
        id: a.id(),
        name: a.string().required(),
        ownerId: a.string().required(),
      })
      .authorization((allow) => [allow.owner('ownerId'), allow.groups(['team-member']).read()]);

    const Task = c
      .model({
        id: a.id(),
        projectId: a.string().required(),
        title: a.string().required(),
        assigneeId: a.string(),
        status: a.enum(['todo', 'in-progress', 'done']).default('todo'),
        priority: a.enum(['low', 'medium', 'high']).default('medium'),
      })
      .partitionKey('projectId')
      .indexes(['assigneeId', 'status'])
      .authorization((allow) => [allow.groups(['team-member']).all()]);

    const TaskAssigned = e.model({
      taskId: a.id(),
      assigneeId: a.string().required(),
      assignedAt: a.datetime().required(),
    });

    const CalculateProjectProgress = f
      .model({
        input: {
          projectId: a.id(),
        },
        output: {
          totalTasks: a.number().integer().min(0).required(),
          completedTasks: a.number().integer().min(0).required(),
          percentComplete: a.number().min(0).max(100).required(),
        },
      })
      .authorization((allow) => [allow.groups(['team-member']).all()]);

    expect(Project._config.authorization).toHaveLength(2);
    expect(Task._config.partitionKey).toBe('projectId');
    expect(Task._config.indexes).toContain('assigneeId');
    expect(TaskAssigned._config.type).toBe('event');
    expect(CalculateProjectProgress._config.type).toBe('function');
  });

  it('should model analytics platform', () => {
    const Dataset = c
      .model({
        id: a.id(),
        name: a.string().required(),
        ownerId: a.string().required(),
        schema: a.json(),
      })
      .authorization((allow) => [allow.owner('ownerId'), allow.groups(['admin']).all()]);

    const DataUploaded = e.model({
      datasetId: a.id(),
      fileUrl: a.string().url().required(),
      recordCount: a.number().integer().min(0).required(),
      uploadedAt: a.datetime().required(),
    });

    const DataProcessed = e.model({
      datasetId: a.id(),
      jobId: a.string().required(),
      status: a.enum(['success', 'failed']).required(),
      processedAt: a.datetime().required(),
    });

    const RunQuery = f
      .model({
        input: {
          datasetId: a.id(),
          query: a.string().required(),
          limit: a.number().integer().min(1).max(10000).default(100),
        },
        output: {
          results: a.array(a.json()).required(),
          executionTime: a.number().min(0).required(),
          rowCount: a.number().integer().min(0).required(),
        },
      })
      .authorization((allow) => [allow.authenticated()]);

    const ExportData = f
      .model({
        input: {
          datasetId: a.id(),
          format: a.enum(['csv', 'json', 'excel']).required(),
        },
        output: {
          exportUrl: a.string().url().required(),
          expiresAt: a.datetime().required(),
        },
      })
      .authorization((allow) => [allow.authenticated()]);

    expect(Dataset._config.type).toBe('crud');
    expect(DataUploaded._config.type).toBe('event');
    expect(DataProcessed._config.type).toBe('event');
    expect(RunQuery._config.type).toBe('function');
    expect(ExportData._config.type).toBe('function');
  });
});

// ============================================================================
// Model Builder Independence
// ============================================================================

describe('Model Namespaces - Builder Independence', () => {
  it('should create independent CRUD models', () => {
    const Model1 = c.model({ id: a.id() }).timestamps(true);
    const Model2 = c.model({ id: a.id() }).timestamps(false);

    expect(Model1._config.timestamps).toBe(true);
    expect(Model2._config.timestamps).toBe(false);
  });

  it('should create independent event models', () => {
    const Event1 = e.model({ type: a.string().default('event1') });
    const Event2 = e.model({ type: a.string().default('event2') });

    expect(Event1._config.fields.type.default).toBe('event1');
    expect(Event2._config.fields.type.default).toBe('event2');
  });

  it('should create independent function models', () => {
    const Func1 = f
      .model({
        input: { data: a.string() },
        output: { result: a.string() },
      })
      .authorization((allow) => [allow.authenticated()]);

    const Func2 = f
      .model({
        input: { data: a.string() },
        output: { result: a.string() },
      })
      .authorization((allow) => [allow.public()]);

    expect(Func1._config.authorization[0].type).toBe('authenticated');
    expect(Func2._config.authorization[0].type).toBe('public');
  });
});
