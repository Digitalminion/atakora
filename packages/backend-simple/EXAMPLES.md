# Examples: Common Patterns

This document shows common patterns and complete examples using `backend-simple`.

## Table of Contents

1. [Simple Todo API](#simple-todo-api)
2. [Blog Platform](#blog-platform)
3. [File Upload Service](#file-upload-service)
4. [Notification System](#notification-system)
5. [Data Processing Pipeline](#data-processing-pipeline)
6. [Multi-Tenant SaaS](#multi-tenant-saas)

---

## Simple Todo API

A basic todo list API with user authentication.

### Schema

```typescript
// src/schema/resource.ts
import { defineSchema, a, c } from '@atakora/component';

export const schema = defineSchema({
  schema: a.schema({
    Todo: c.model({
      id: a.id(),
      title: a.string().required().minLength(1).maxLength(200),
      description: a.string(),
      completed: a.boolean().default(false),
      userId: a.string().required(),
      dueDate: a.datetime(),
      priority: a.enum(['low', 'medium', 'high']).default('medium'),
      tags: a.array(a.string()).default([]),
    })
      .authorization(allow => [
        allow.owner('userId'),                    // Users own their todos
        allow.groups(['admin']).all(),           // Admins manage all
      ])
      .indexes(['userId', 'completed', 'priority', 'dueDate']),
  }),
});
```

### Usage

```bash
# Create todo
POST /api/todos
{
  "title": "Buy groceries",
  "description": "Milk, eggs, bread",
  "userId": "user_123",
  "dueDate": "2025-01-20T18:00:00Z",
  "priority": "high",
  "tags": ["shopping", "urgent"]
}

# List my todos
GET /api/todos?userId=user_123&completed=false

# Update todo
PUT /api/todos/:id
{
  "completed": true
}

# Delete todo
DELETE /api/todos/:id
```

**Lines of code:** ~20 lines
**Endpoints generated:** 5 (create, read, update, delete, list)

---

## Blog Platform

A simple blog with posts, comments, and authors.

### Schema

```typescript
// src/schema/resource.ts
import { defineSchema, a, c, e } from '@atakora/component';

export const schema = defineSchema({
  schema: a.schema({
    Author: c.model({
      id: a.id(),
      name: a.string().required(),
      email: a.string().required().email(),
      bio: a.string(),
      avatarUrl: a.string().url(),
    })
      .authorization(allow => [
        allow.owner('id'),
        allow.groups(['admin']).all(),
        allow.public().read(),                   // Anyone can read authors
      ])
      .indexes(['email']),

    Post: c.model({
      id: a.id(),
      title: a.string().required(),
      slug: a.string().required(),               // URL-friendly title
      content: a.string().required(),
      excerpt: a.string(),
      authorId: a.string().required(),
      published: a.boolean().default(false),
      publishedAt: a.datetime(),
      tags: a.array(a.string()).default([]),
      viewCount: a.number().default(0),
    })
      .authorization(allow => [
        allow.owner('authorId').create().update().delete(),
        allow.groups(['admin']).all(),
        allow.public().read(),                   // Anyone can read published posts
      ])
      .indexes(['authorId', 'published', 'slug', 'publishedAt'])
      .computed({
        readingTime: (post) => {
          const wordsPerMinute = 200;
          const words = post.content.split(/\s+/).length;
          return Math.ceil(words / wordsPerMinute);
        },
      }),

    Comment: c.model({
      id: a.id(),
      postId: a.string().required(),
      authorId: a.string().required(),
      content: a.string().required(),
      approved: a.boolean().default(false),      // Moderation
      parentId: a.string(),                      // For nested comments
    })
      .authorization(allow => [
        allow.owner('authorId'),
        allow.groups(['admin']).all(),
        allow.authenticated().create(),          // Anyone can comment
        allow.public().read(),                   // Anyone can read approved
      ])
      .indexes(['postId', 'authorId', 'approved']),

    // Event: Published post notification
    PostPublished: e.model({
      postId: a.string().required(),
      authorId: a.string().required(),
      title: a.string().required(),
      publishedAt: a.datetime().required(),
    }),
  }),
});
```

### Custom Event Processor (Optional)

```typescript
// src/event/resource.ts
import { defineEvents, configureEvent } from '@atakora/component/events';

export const event = defineEvents({
  PostPublished: configureEvent('PostPublished')
    .withProcessor(async (context, event) => {
      // Send email notifications to subscribers
      const author = await context.db.authors.get(event.authorId);

      // Send notifications (implement your notification service)
      await context.email.send({
        to: 'subscribers@blog.com',
        template: 'new-post',
        data: {
          authorName: author.name,
          postTitle: event.title,
          postUrl: `https://blog.com/posts/${event.postId}`,
        },
      });

      context.log(`Notified subscribers about: ${event.title}`);
    }),
});
```

**Lines of code:** ~70 lines (schema only)
**Endpoints generated:** 15 (5 per model)
**With event processor:** +20 lines

---

## File Upload Service

A service for uploading and processing files.

### Schema

```typescript
// src/schema/resource.ts
import { defineSchema, a, c, e, f } from '@atakora/component';

export const schema = defineSchema({
  schema: a.schema({
    File: c.model({
      id: a.id(),
      name: a.string().required(),
      url: a.string().url().required(),
      sizeBytes: a.number().required().min(1),
      mimeType: a.string().required(),
      uploadedBy: a.string().required(),
      status: a.enum(['uploading', 'processing', 'ready', 'failed']).default('uploading'),
      thumbnailUrl: a.string().url(),
      metadata: a.json().default({}),
    })
      .authorization(allow => [
        allow.owner('uploadedBy'),
        allow.groups(['admin']).all(),
      ])
      .indexes(['uploadedBy', 'status', 'mimeType']),

    // Event: File uploaded (for async processing)
    FileUploaded: e.model({
      fileId: a.string().required(),
      url: a.string().url().required(),
      mimeType: a.string().required(),
      sizeBytes: a.number().required(),
      uploadedBy: a.string().required(),
    }),

    // Function: Generate upload URL
    GenerateUploadUrl: f.model({
      input: {
        fileName: a.string().required(),
        mimeType: a.string().required(),
        sizeBytes: a.number().required().max(100_000_000), // 100 MB max
      },
      output: {
        uploadUrl: a.string().url().required(),
        fileId: a.string().required(),
        expiresAt: a.datetime().required(),
      },
    })
      .authorization(allow => [
        allow.authenticated(),
      ]),
  }),
});
```

### Custom Function Handler

```typescript
// src/function/resource.ts
import { defineFunctions, configureFunction } from '@atakora/component/functions';

export const func = defineFunctions({
  GenerateUploadUrl: configureFunction('GenerateUploadUrl')
    .withHandler(async (context, input) => {
      // Generate unique file ID
      const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Generate SAS URL for blob storage (expires in 1 hour)
      const uploadUrl = await context.storage.generateSasUrl(
        'uploads',
        `${fileId}/${input.fileName}`,
        {
          permissions: 'w',  // Write only
          expiresIn: 3600,   // 1 hour
        }
      );

      // Create file record
      await context.db.files.create({
        id: fileId,
        name: input.fileName,
        url: uploadUrl,
        sizeBytes: input.sizeBytes,
        mimeType: input.mimeType,
        uploadedBy: context.user.id,
        status: 'uploading',
      });

      return {
        uploadUrl,
        fileId,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      };
    }),
});
```

### Custom Event Processor

```typescript
// src/event/resource.ts
import { defineEvents, configureEvent } from '@atakora/component/events';

export const event = defineEvents({
  FileUploaded: configureEvent('FileUploaded')
    .withProcessor(async (context, event) => {
      context.log(`Processing file: ${event.fileId}`);

      // Update status
      await context.db.files.update(event.fileId, {
        status: 'processing',
      });

      // Generate thumbnail for images
      if (event.mimeType.startsWith('image/')) {
        const thumbnailUrl = await generateThumbnail(event.url);

        await context.db.files.update(event.fileId, {
          thumbnailUrl,
          status: 'ready',
        });
      } else {
        await context.db.files.update(event.fileId, {
          status: 'ready',
        });
      }

      context.log(`File processed: ${event.fileId}`);
    }),
});

async function generateThumbnail(imageUrl: string): Promise<string> {
  // Implement thumbnail generation
  return 'https://storage.blob.core.windows.net/thumbnails/thumb.jpg';
}
```

**Usage Flow:**

```bash
# 1. Get upload URL
POST /api/functions/generate-upload-url
{
  "fileName": "photo.jpg",
  "mimeType": "image/jpeg",
  "sizeBytes": 1048576
}

Response: {
  "uploadUrl": "https://storage.blob.core.windows.net/...",
  "fileId": "file_123",
  "expiresAt": "2025-01-15T11:30:00Z"
}

# 2. Client uploads directly to blob storage using uploadUrl
PUT <uploadUrl>
<binary data>

# 3. Client notifies backend
POST /api/events/file-uploaded
{
  "fileId": "file_123",
  "url": "https://storage.blob.core.windows.net/...",
  "mimeType": "image/jpeg",
  "sizeBytes": 1048576,
  "uploadedBy": "user_123"
}

# 4. Backend processes asynchronously (generates thumbnail)

# 5. Client checks status
GET /api/files/file_123
```

---

## Notification System

A system for sending notifications via multiple channels.

### Schema

```typescript
// src/schema/resource.ts
import { defineSchema, a, c, e } from '@atakora/component';

export const schema = defineSchema({
  schema: a.schema({
    NotificationTemplate: c.model({
      id: a.id(),
      name: a.string().required(),
      subject: a.string().required(),
      bodyHtml: a.string().required(),
      bodyText: a.string(),
      channels: a.array(a.enum(['email', 'sms', 'push'])).required(),
    })
      .authorization(allow => [
        allow.groups(['admin']).all(),
      ]),

    Notification: c.model({
      id: a.id(),
      recipientId: a.string().required(),
      templateId: a.string().required(),
      channel: a.enum(['email', 'sms', 'push']).required(),
      status: a.enum(['pending', 'sent', 'failed']).default('pending'),
      sentAt: a.datetime(),
      errorMessage: a.string(),
      metadata: a.json().default({}),
    })
      .authorization(allow => [
        allow.owner('recipientId').read(),
        allow.groups(['admin']).all(),
      ])
      .indexes(['recipientId', 'status', 'sentAt']),

    // Event: Send notification
    NotificationRequested: e.model({
      recipientId: a.string().required(),
      templateId: a.string().required(),
      channel: a.enum(['email', 'sms', 'push']).required(),
      data: a.json().required(),                 // Template variables
    }),
  }),
});
```

### Custom Event Processor

```typescript
// src/event/resource.ts
import { defineEvents, configureEvent } from '@atakora/component/events';

export const event = defineEvents({
  NotificationRequested: configureEvent('NotificationRequested')
    .retries(5)                                  // Retry failed sends
    .withProcessor(async (context, event) => {
      // Get template
      const template = await context.db.notificationTemplates.get(event.templateId);

      // Create notification record
      const notification = await context.db.notifications.create({
        recipientId: event.recipientId,
        templateId: event.templateId,
        channel: event.channel,
        status: 'pending',
      });

      try {
        // Send notification
        switch (event.channel) {
          case 'email':
            await sendEmail(event.recipientId, template, event.data);
            break;
          case 'sms':
            await sendSms(event.recipientId, template, event.data);
            break;
          case 'push':
            await sendPush(event.recipientId, template, event.data);
            break;
        }

        // Update status
        await context.db.notifications.update(notification.id, {
          status: 'sent',
          sentAt: new Date().toISOString(),
        });

        context.log(`Notification sent: ${notification.id}`);

      } catch (error) {
        // Update status
        await context.db.notifications.update(notification.id, {
          status: 'failed',
          errorMessage: error.message,
        });

        context.log.error(`Notification failed: ${notification.id}`, error);
        throw error;  // Retry
      }
    }),
});

async function sendEmail(recipientId: string, template: any, data: any) {
  // Implement email sending
}

async function sendSms(recipientId: string, template: any, data: any) {
  // Implement SMS sending
}

async function sendPush(recipientId: string, template: any, data: any) {
  // Implement push notification
}
```

**Usage:**

```bash
# Send notification
POST /api/events/notification-requested
{
  "recipientId": "user_123",
  "templateId": "welcome-email",
  "channel": "email",
  "data": {
    "userName": "John Doe",
    "activationLink": "https://app.com/activate/xyz"
  }
}

# Check notification status
GET /api/notifications?recipientId=user_123&status=sent
```

---

## Data Processing Pipeline

A pipeline for processing CSV data uploads.

### Schema

```typescript
// src/schema/resource.ts
import { defineSchema, a, c, e } from '@atakora/component';

export const schema = defineSchema({
  schema: a.schema({
    Dataset: c.model({
      id: a.id(),
      name: a.string().required(),
      ownerId: a.string().required(),
      fileUrl: a.string().url(),
      status: a.enum([
        'created',
        'uploading',
        'uploaded',
        'validating',
        'valid',
        'invalid',
        'processing',
        'ready',
        'failed',
      ]).default('created'),
      rowCount: a.number(),
      errorCount: a.number(),
      errors: a.array(a.json()).default([]),
    })
      .authorization(allow => [
        allow.owner('ownerId'),
        allow.groups(['admin']).all(),
      ])
      .indexes(['ownerId', 'status']),

    // Event pipeline
    DataUploaded: e.model({
      datasetId: a.string().required(),
      fileUrl: a.string().url().required(),
    }),

    DataValidated: e.model({
      datasetId: a.string().required(),
      isValid: a.boolean().required(),
      rowCount: a.number().required(),
      errorCount: a.number().required(),
      errors: a.array(a.json()).default([]),
    }),

    DataProcessed: e.model({
      datasetId: a.string().required(),
      processedRows: a.number().required(),
    }),
  }),
});
```

### Custom Event Processors

```typescript
// src/event/resource.ts
import { defineEvents, configureEvent } from '@atakora/component/events';

export const event = defineEvents({
  // Step 1: File uploaded
  DataUploaded: configureEvent('DataUploaded')
    .withProcessor(async (context, event) => {
      await context.db.datasets.update(event.datasetId, {
        status: 'validating',
      });

      // Trigger validation
      await context.publish('DataValidated', {
        datasetId: event.datasetId,
        ...(await validateCsv(event.fileUrl)),
      });
    }),

  // Step 2: Data validated
  DataValidated: configureEvent('DataValidated')
    .withProcessor(async (context, event) => {
      if (event.isValid) {
        await context.db.datasets.update(event.datasetId, {
          status: 'processing',
          rowCount: event.rowCount,
        });

        // Trigger processing
        await context.publish('DataProcessed', {
          datasetId: event.datasetId,
          processedRows: await processData(event.datasetId),
        });
      } else {
        await context.db.datasets.update(event.datasetId, {
          status: 'invalid',
          errorCount: event.errorCount,
          errors: event.errors,
        });
      }
    }),

  // Step 3: Data processed
  DataProcessed: configureEvent('DataProcessed')
    .withProcessor(async (context, event) => {
      await context.db.datasets.update(event.datasetId, {
        status: 'ready',
      });

      // Notify user
      const dataset = await context.db.datasets.get(event.datasetId);
      context.log(`Dataset ${dataset.name} ready: ${event.processedRows} rows`);
    }),
});

async function validateCsv(fileUrl: string) {
  // Implement CSV validation
  return {
    isValid: true,
    rowCount: 1000,
    errorCount: 0,
    errors: [],
  };
}

async function processData(datasetId: string) {
  // Implement data processing
  return 1000;
}
```

**Event Flow:**
```
DataUploaded
  → Validate CSV
  → Publish DataValidated

DataValidated
  → If valid: Process data → Publish DataProcessed
  → If invalid: Update status to "invalid"

DataProcessed
  → Update status to "ready"
  → Notify user
```

---

## Multi-Tenant SaaS

A multi-tenant application with organization-based isolation.

### Schema

```typescript
// src/schema/resource.ts
import { defineSchema, a, c } from '@atakora/component';

export const schema = defineSchema({
  schema: a.schema({
    Organization: c.model({
      id: a.id(),
      name: a.string().required(),
      plan: a.enum(['free', 'pro', 'enterprise']).default('free'),
      isActive: a.boolean().default(true),
      settings: a.json().default({}),
    })
      .authorization(allow => [
        allow.groups(['admin']).all(),
        allow.custom((user, org) => {
          return user.organizationId === org.id;
        }).read(),
      ])
      .partitionKey('id'),

    User: c.model({
      id: a.id(),
      email: a.string().required().email(),
      name: a.string().required(),
      organizationId: a.string().required(),
      role: a.enum(['owner', 'admin', 'member']).default('member'),
      isActive: a.boolean().default(true),
    })
      .authorization(allow => [
        allow.groups(['admin']).all(),
        allow.custom((user, record) => {
          // Same organization
          return user.organizationId === record.organizationId;
        }),
      ])
      .indexes(['email', 'organizationId', 'role'])
      .partitionKey('organizationId'),         // Optimize for tenant isolation

    Project: c.model({
      id: a.id(),
      name: a.string().required(),
      organizationId: a.string().required(),
      ownerId: a.string().required(),
      members: a.array(a.string()).default([]),
    })
      .authorization(allow => [
        allow.groups(['admin']).all(),
        allow.owner('ownerId'),
        allow.custom((user, project) => {
          // Same organization
          if (user.organizationId !== project.organizationId) {
            return false;
          }
          // Is member
          return project.members.includes(user.id);
        }).read().update(['members']),
      ])
      .indexes(['organizationId', 'ownerId'])
      .partitionKey('organizationId'),         // Tenant isolation
  }),
});
```

**Key Features:**
- Partition key = `organizationId` for optimal tenant isolation
- Authorization rules enforce same-organization access
- Automatic tenant filtering in queries

**Usage:**
```bash
# All queries automatically filtered by organizationId
GET /api/projects
→ Only returns projects in user's organization

# Cannot access other organization's data
GET /api/projects/project_from_other_org
→ 403 Forbidden
```

---

## Summary

All examples above work with just `backend-simple` - no custom infrastructure needed!

**What you get:**
- Complete REST APIs
- Event processing
- Custom functions
- Authentication
- Authorization
- Database
- TypeScript types

**Lines of code:**
- Todo API: ~20 lines
- Blog: ~70 lines
- File Upload: ~100 lines
- Notifications: ~80 lines
- Data Pipeline: ~100 lines
- Multi-Tenant: ~60 lines

**Time to deploy:** 5 minutes each

**See Also:**
- [GETTING_STARTED.md](./GETTING_STARTED.md) - Deploy your first backend
- [README.md](./README.md) - Package overview
- [COMPARISON.md](./COMPARISON.md) - Simple vs. full backend
