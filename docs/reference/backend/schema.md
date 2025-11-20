# Schema Reference

The schema is the single source of truth for all data contracts in your backend. Define your models once, and Atakora auto-generates all necessary infrastructure.

## Overview

Atakora provides three model types for different use cases:

- **`c.model`** - CRUD operations backed by REST APIs and Cosmos DB
- **`e.model`** - Event-driven async processing with queues
- **`f.model`** - Custom HTTP functions with defined inputs/outputs

## Schema Definition

Define your schema in `src/schema/resource.ts`:

```typescript
import { defineSchema, a, c, e, f } from '@atakora/component';

export const schema = defineSchema({
  schema: a.schema({
    // CRUD models
    User: c.model({
      id: a.id(),
      email: a.string().required().email(),
      name: a.string().required(),
    }),

    // Event models
    DataUploaded: e.model({
      datasetId: a.string().required(),
      fileUrl: a.string().url().required(),
    }),

    // Function models
    GenerateReport: f.model({
      input: {
        datasetId: a.string().required(),
      },
      output: {
        reportUrl: a.string().url().required(),
      },
    }),
  }),
});
```

## CRUD Models (`c.model`)

CRUD models generate full REST APIs with database backing.

### Basic Definition

```typescript
User: c.model({
  id: a.id(),
  email: a.string().required().email(),
  name: a.string().required(),
  role: a.enum(['user', 'admin']).default('user'),
  createdAt: a.datetime(),
  updatedAt: a.datetime(),
})
```

### What Gets Generated

**REST Endpoints:**
```
POST   /api/users           Create new user
GET    /api/users/:id       Get user by ID
PUT    /api/users/:id       Update user
DELETE /api/users/:id       Delete user
GET    /api/users           List/search users
```

**Cosmos DB:**
- Container: `users`
- Partition key: `/id` (or custom via `.partitionKey()`)
- Indexes: Automatic + custom via `.indexes()`

**TypeScript Types:**
```typescript
type User = {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
};

type CreateUserInput = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;
type UpdateUserInput = Partial<CreateUserInput>;
type UserFilter = {
  email?: string;
  name?: string;
  role?: 'user' | 'admin';
};
```

**Azure Resources:**
- ✅ 5 Azure Functions (1 per endpoint)
- ✅ 1 Cosmos DB container
- ✅ HTTP routes in Function App
- ✅ Application Insights tracking

### List/Search Endpoint

The `GET /api/{model-name}` endpoint supports powerful querying:

**Filtering:**
```bash
GET /api/users?role=admin
GET /api/users?email=user@example.com
GET /api/users?role=admin&createdAt[gte]=2025-01-01T00:00:00Z
```

**Pagination:**
```bash
GET /api/users?page=1&pageSize=50
```

**Sorting:**
```bash
GET /api/users?sortBy=createdAt&sortOrder=desc
GET /api/users?sortBy=name&sortOrder=asc
```

**Combined:**
```bash
GET /api/users?role=admin&page=2&pageSize=20&sortBy=createdAt&sortOrder=desc
```

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "pageSize": 20,
    "total": 156,
    "totalPages": 8
  }
}
```

### Authorization

Define access control directly in the schema:

```typescript
User: c.model({...})
  .authorization(allow => [
    // Users can read/update their own records
    allow.owner('id'),

    // Admins can do everything
    allow.groups(['admin']).all(),

    // Analysts can read all, but not modify
    allow.groups(['analyst']).read(),

    // Users can create and update specific fields
    allow.owner('id')
      .create()
      .read()
      .update(['name', 'email']), // Only these fields
  ])
```

**Authorization Rules:**

- `allow.owner(field)` - User owns the record (field matches user ID from token)
- `allow.groups(roles)` - User has one of these roles in their token
- `.all()` - All operations (create, read, update, delete)
- `.create()` - Create new records
- `.read()` - Read records
- `.update(fields?)` - Update records (optionally specific fields only)
- `.delete()` - Delete records

**What Gets Generated:**

Each endpoint checks authorization before executing:

```typescript
// Pseudo-code for generated handler
async function updateUser(req) {
  const user = await getUserFromToken(req);
  const record = await db.get(req.params.id);

  // Check: Is user the owner?
  if (record.id !== user.id) {
    // Check: Does user have admin role?
    if (!user.roles.includes('admin')) {
      return { statusCode: 403, body: 'Forbidden' };
    }
  }

  // Check: Can user update these specific fields?
  const allowedFields = getAllowedFields(user, record);
  const updates = filterToAllowedFields(req.body, allowedFields);

  // Proceed with update
  return await db.update(req.params.id, updates);
}
```

### Indexes

Optimize query performance with indexes:

```typescript
User: c.model({...})
  .indexes(['email', 'organizationId', 'role', 'createdAt'])
```

**Generates:**
- Cosmos DB secondary indexes on specified fields
- Faster queries on these fields
- Lower RU costs for filtered queries

**Best Practices:**
- Index fields used in queries/filters
- Index foreign keys (e.g., `organizationId`)
- Index enum fields used for filtering (e.g., `role`, `status`)
- Index datetime fields for sorting

### Partition Key

Customize the partition key for optimal performance:

```typescript
User: c.model({...})
  .partitionKey('organizationId')  // Default is 'id'
```

**Guidelines:**
- Default (`id`): Good for small-medium datasets with random access
- Organization/Tenant ID: Good for multi-tenant applications
- Date (e.g., `YYYY-MM`): Good for time-series data with TTL

### Timestamps

Automatic timestamp management:

```typescript
User: c.model({...})
  .timestamps(true)  // Adds createdAt, updatedAt

// Or customize field names
User: c.model({...})
  .timestamps({
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  })
```

### Soft Deletes

Enable soft deletes instead of hard deletes:

```typescript
User: c.model({...})
  .softDelete(true)  // Adds deletedAt field

// DELETE /api/users/:id sets deletedAt instead of removing record
// GET /api/users automatically excludes soft-deleted records
// GET /api/users?includeDeleted=true includes soft-deleted records (admin only)
```

**Restore endpoint:**
```bash
# Restore soft-deleted record
POST /api/users/:id/restore
```

### Optimistic Concurrency

Automatic conflict detection using ETags:

```typescript
User: c.model({...})
  .optimisticConcurrency(true)  // Enabled by default
```

**How it works:**
```bash
# Get user (includes ETag in response)
GET /api/users/user_123
Response: { ..., "_etag": "abc123" }

# Update with ETag to ensure no one else modified it
PUT /api/users/user_123
If-Match: "abc123"
Body: { "name": "New Name" }

# If someone else updated first: 412 Precondition Failed
# If ETag matches: 200 OK with updated resource
```

**Custom conflict resolution:**
```typescript
User: c.model({...})
  .optimisticConcurrency({
    enabled: true,
    onConflict: async (current, updates, context) => {
      // Custom merge strategy
      return {
        ...current,
        ...updates,
        // Preserve arrays from both versions
        tags: [...new Set([...current.tags, ...updates.tags])],
      };
    },
  })
```

### Computed Fields

Add fields computed at query time:

```typescript
User: c.model({
  firstName: a.string().required(),
  lastName: a.string().required(),
  email: a.string().required().email(),
})
  .computed({
    fullName: (user) => `${user.firstName} ${user.lastName}`,
    emailDomain: (user) => user.email.split('@')[1],
    initials: (user) =>
      `${user.firstName[0]}${user.lastName[0]}`.toUpperCase(),
  })
```

**Response includes computed fields:**
```json
{
  "id": "user_123",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "fullName": "John Doe",
  "emailDomain": "example.com",
  "initials": "JD"
}
```

### Custom Validation

Add business logic validation beyond schema types:

```typescript
User: c.model({
  email: a.string().required().email(),
  age: a.number().required(),
  organizationId: a.string().required(),
})
  .validation({
    email: async (value, context) => {
      // Check if email domain is allowed
      const domain = value.split('@')[1];
      const allowedDomains = await context.db.allowedDomains.list();

      if (!allowedDomains.some(d => d.domain === domain)) {
        throw new Error(`Email domain ${domain} not allowed`);
      }
    },
    age: (value) => {
      if (value < 18) {
        throw new Error('Must be 18 or older');
      }
    },
    _record: async (record, context) => {
      // Validate entire record
      const org = await context.db.organizations.get(record.organizationId);
      if (!org || !org.isActive) {
        throw new Error('Organization is not active');
      }
    },
  })
```

### Field-Level Authorization

Control access to specific fields:

```typescript
User: c.model({
  name: a.string().required(),
  email: a.string().required().email(),
  salary: a.number(),
  internalNotes: a.string(),
  ssn: a.string(),
})
  .authorization(allow => [
    // Regular users can read/update their own name and email
    allow.owner('id')
      .read(['name', 'email'])
      .update(['name']),

    // Managers can read salary but not SSN
    allow.groups(['manager'])
      .read(['name', 'email', 'salary']),

    // HR can read everything except internal notes
    allow.groups(['hr'])
      .read(['name', 'email', 'salary', 'ssn']),

    // Admins can read/update everything
    allow.groups(['admin']).all(),
  ])
```

**Response varies by user role:**
```typescript
// Regular user sees:
{ "name": "John Doe", "email": "john@example.com" }

// Manager sees:
{ "name": "John Doe", "email": "john@example.com", "salary": 85000 }

// HR sees:
{ "name": "John Doe", "email": "john@example.com", "salary": 85000, "ssn": "***-**-1234" }

// Admin sees:
{ "name": "John Doe", "email": "john@example.com", "salary": 85000, "ssn": "123-45-6789", "internalNotes": "..." }
```

### Hooks

Add lifecycle hooks for custom logic:

```typescript
User: c.model({...})
  .hooks({
    beforeCreate: async (input, context) => {
      // Hash password, validate uniqueness, etc.
      return { ...input, password: await hash(input.password) };
    },
    afterCreate: async (record, context) => {
      // Send welcome email, log audit event, etc.
      await context.events.publish('UserCreated', { userId: record.id });
    },
    beforeUpdate: async (id, updates, context) => {
      // Validate changes, check permissions, etc.
      return updates;
    },
    afterUpdate: async (record, context) => {
      // Invalidate cache, log change, etc.
      await context.cache.invalidate(`user:${record.id}`);
    },
    beforeDelete: async (id, context) => {
      // Check for dependencies, etc.
      const hasProjects = await context.db.projects.count({ ownerId: id });
      if (hasProjects > 0) {
        throw new Error('Cannot delete user with active projects');
      }
    },
    afterDelete: async (id, context) => {
      // Clean up related data, etc.
      await context.storage.deleteUserFiles(id);
    },
  })
```

## Event Models (`e.model`)

Event models generate async processing pipelines with queues.

### Basic Definition

```typescript
DataUploaded: e.model({
  datasetId: a.string().required(),
  projectId: a.string().required(),
  userId: a.string().required(),
  fileUrl: a.string().url().required(),
  fileSizeBytes: a.number().required(),
  uploadedAt: a.datetime().required(),
})
```

### What Gets Generated

**REST Endpoint:**
```
POST   /api/events/data-uploaded    Publish event
```

**Request:**
```bash
curl -X POST https://api.example.com/api/events/data-uploaded \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "datasetId": "abc123",
    "projectId": "proj456",
    "userId": "user789",
    "fileUrl": "https://storage.blob.core.windows.net/datasets/file.csv",
    "fileSizeBytes": 1024000,
    "uploadedAt": "2025-01-15T10:30:00Z"
  }'
```

**Response:**
```json
{
  "eventId": "evt_abc123",
  "status": "queued",
  "queuedAt": "2025-01-15T10:30:01Z"
}
```

**Azure Resources:**
- ✅ 1 Azure Function (validation + publishing)
- ✅ 1 Azure Storage Queue (or Service Bus Topic)
- ✅ 1 Azure Function (processor)
- ✅ 1 Dead Letter Queue (for failures)
- ✅ Queue depth metrics
- ✅ Application Insights tracking

**TypeScript Types:**
```typescript
type DataUploadedEvent = {
  datasetId: string;
  projectId: string;
  userId: string;
  fileUrl: string;
  fileSizeBytes: number;
  uploadedAt: string;
};

type PublishDataUploadedInput = DataUploadedEvent;
```

### Default Behavior

By default, events are logged when processed:

```typescript
// Auto-generated processor
async function processDataUploaded(event: DataUploadedEvent) {
  console.log('DataUploaded event received:', event);
  // Event is logged and acknowledged
}
```

### Custom Processor

Attach custom processing logic:

```typescript
// src/event/resource.ts
import { defineEvents, configureEvent, days, minutes } from '@atakora/component/events';

export const event = defineEvents({
  DataUploaded: configureEvent('DataUploaded')
    // Queue settings
    .ttl(days(14))              // Messages expire after 14 days
    .visibility(minutes(5))     // 5 min before retry
    .retries(10)                // Max 10 retries
    .batchSize(10)              // Process 10 messages at once

    // Custom processor
    .withProcessor(async (context, event) => {
      context.log(`Processing upload: ${event.fileUrl}`);

      // Validate file
      const validation = await validateFile(event.fileUrl);

      // Update database
      await context.db.datasets.update(event.datasetId, {
        status: validation.isValid ? 'valid' : 'invalid',
        validationErrors: validation.errors,
        rowCount: validation.rowCount,
      });

      // Publish next event
      if (validation.isValid) {
        await context.publish('DataValidated', {
          datasetId: event.datasetId,
          isValid: true,
          rowCount: validation.rowCount,
          validatedAt: new Date(),
        });
      }
    })

    // Monitoring
    .monitoring(alerts =>
      alerts
        .onFailure('critical')            // Alert on failures
        .onQueueDepth(100, 'warning')     // Warn if queue > 100
        .onProcessingTime(300, 'warning') // Warn if > 5 min
    ),
});

// src/index.ts - Attach custom processor
backend.schema.DataUploaded.queue.attach(event.DataUploaded);
```

### Event Flow

```
1. Client publishes event
   POST /api/events/data-uploaded
   ↓
2. Validation Function
   - Validates schema
   - Checks authorization
   - Writes to queue
   - Returns 202 Accepted
   ↓
3. Azure Storage Queue
   - Stores message
   - Retry logic
   - Visibility timeout
   ↓
4. Processor Function
   - Reads from queue
   - Executes custom logic
   - Acknowledges message (success)
   - Or moves to dead letter (failure)
   ↓
5. Dead Letter Queue (if needed)
   - Stores failed messages
   - Manual inspection
   - Replay capability
```

### Error Handling

Automatic retry with exponential backoff:

```
Attempt 1: Immediate
Attempt 2: 30s delay
Attempt 3: 1m delay
Attempt 4: 2m delay
Attempt 5: 4m delay
...
Attempt 10: ~8.5min delay
→ Dead Letter Queue
```

### Batch Processing

Process multiple events efficiently:

```typescript
DataUploaded: configureEvent('DataUploaded')
  .batchSize(32)  // Process up to 32 events at once
  .withProcessor(async (context, events) => {
    // events is an array
    const results = await Promise.allSettled(
      events.map(event => processEvent(event))
    );

    // Track successes and failures
    const succeeded = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');

    context.log(`Processed ${succeeded.length} events, ${failed.length} failed`);

    // Failed events automatically retry
  })
```

### Ordering Guarantees

**Storage Queue** (default):
- ❌ No ordering guarantees
- ✅ At-least-once delivery
- ✅ High throughput
- ✅ Low cost

**Service Bus Topic** (optional):
- ✅ FIFO ordering (with sessions)
- ✅ Exactly-once delivery (with transactions)
- ✅ Advanced routing
- ❌ Higher cost (~10× more expensive)

```typescript
DataUploaded: e.model({...})
  .queue('serviceBus')       // Use Service Bus instead of Storage Queue
  .session('datasetId')      // FIFO ordering per dataset
  .transaction(true)         // Enable transactions
  .maxSize(1024)             // 1 MB messages (vs 64 KB for Storage Queue)
```

**Service Bus features:**
```yaml
✅ FIFO ordering (with sessions)
✅ Exactly-once delivery (with transactions)
✅ Message sessions
✅ Scheduled messages
✅ Dead lettering
✅ 1 MB message size (vs 64 KB)
✅ Topics and subscriptions
```

### Idempotency

Ensure processors handle duplicate messages safely:

```typescript
DataUploaded: configureEvent('DataUploaded')
  .withProcessor(async (context, event) => {
    // ❌ Not idempotent - will fail on retry
    await context.db.datasets.increment(event.datasetId, 'uploadCount', 1);

    // ✅ Idempotent - safe to retry
    await context.db.datasets.update(event.datasetId, {
      status: 'uploaded',
      uploadedAt: event.uploadedAt,
      fileUrl: event.fileUrl,
    });
  })
```

**Best practices:**
- Use `update()` instead of `increment()`
- Use event data (not current time) for timestamps
- Check if operation already completed before executing
- Use unique IDs from event to prevent duplicates

### Event Chaining

Trigger subsequent events after processing:

```typescript
// src/event/resource.ts
export const event = defineEvents({
  DataUploaded: configureEvent('DataUploaded')
    .withProcessor(async (context, event) => {
      // Update status
      await context.db.datasets.update(event.datasetId, {
        status: 'validating',
      });

      // Trigger next event in workflow
      await context.publish('ValidationRequested', {
        datasetId: event.datasetId,
        fileUrl: event.fileUrl,
        requestedAt: new Date().toISOString(),
      });
    }),

  ValidationRequested: configureEvent('ValidationRequested')
    .withProcessor(async (context, event) => {
      // Validate data
      const isValid = await validateData(event.fileUrl);

      // Trigger completion event
      await context.publish('ValidationCompleted', {
        datasetId: event.datasetId,
        isValid,
        completedAt: new Date().toISOString(),
      });
    }),

  ValidationCompleted: configureEvent('ValidationCompleted')
    .withProcessor(async (context, event) => {
      // Update final status
      await context.db.datasets.update(event.datasetId, {
        status: event.isValid ? 'ready' : 'invalid',
      });

      // Notify user
      await context.notifications.send({
        type: 'email',
        template: event.isValid ? 'validation-success' : 'validation-failed',
      });
    }),
});
```

**Event flow:**
```
DataUploaded
  → Update dataset to "validating"
  → Publish ValidationRequested

ValidationRequested
  → Validate data
  → Publish ValidationCompleted

ValidationCompleted
  → Update dataset to "ready" or "invalid"
  → Notify user
```

### Dead Letter Queue Monitoring

Configure alerts for failed events:

```typescript
DataUploaded: configureEvent('DataUploaded')
  .monitoring(alerts =>
    alerts
      .onDeadLetter('critical')         // Alert when event goes to dead letter
      .onQueueDepth(100, 'warning')     // Warn if queue backs up
      .onProcessingTime(300, 'warning') // Warn if processing takes > 5 min
      .onFailure('critical')            // Alert on processing failure
  )
  .withProcessor(async (context, event) => {
    // Processing logic
  })
```

**Manual replay from dead letter queue:**
```bash
# View dead letter messages
az storage message peek \
  --queue-name data-uploaded-deadletter \
  --account-name myaccount

# Replay message (move back to main queue)
node scripts/replay-dead-letter.js \
  --queue data-uploaded-deadletter \
  --event-id evt_abc123
```

### Context API in Event Processors

Full context available in processors:

```typescript
DataUploaded: configureEvent('DataUploaded')
  .withProcessor(async (context, event) => {
    // Database access
    await context.db.datasets.update(event.datasetId, {...});
    const user = await context.db.users.get(event.userId);

    // Storage access
    const exists = await context.storage.blobExists('datasets', 'file.csv');
    const content = await context.storage.blobDownload('datasets', 'file.csv');

    // Publish events
    await context.publish('ValidationRequested', {...});

    // Send notifications
    await context.notifications.send({
      to: user.email,
      template: 'upload-complete',
    });

    // HTTP requests
    const response = await context.http.post('https://api.example.com', {...});

    // Logging
    context.log('Processing event', { eventId: event.eventId });
    context.log.error('Error occurred', { error });

    // User context (from published event)
    const uploadedBy = event.userId;

    // Audit logging
    await context.audit.log('DATA_UPLOAD', {
      userId: event.userId,
      datasetId: event.datasetId,
    });
  })
```

## Function Models (`f.model`)

Function models generate custom HTTP endpoints with defined inputs/outputs.

### Basic Definition

```typescript
GenerateReport: f.model({
  input: {
    datasetId: a.string().required(),
    reportType: a.enum(['summary', 'detailed', 'quality']).required(),
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
})
```

### What Gets Generated

**REST Endpoint:**
```
POST   /api/functions/generate-report    Invoke function
```

**Request:**
```bash
curl -X POST https://api.example.com/api/functions/generate-report \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "datasetId": "abc123",
    "reportType": "detailed",
    "format": "pdf",
    "includeCharts": true
  }'
```

**Response:**
```json
{
  "reportId": "rpt_abc123",
  "reportUrl": "https://storage.blob.core.windows.net/reports/rpt_abc123.pdf",
  "status": "completed",
  "expiresAt": "2025-01-22T10:30:00Z",
  "metadata": {
    "pageCount": 24,
    "generatedAt": "2025-01-15T10:30:05Z"
  }
}
```

**Azure Resources:**
- ✅ 1 Azure Function (HTTP trigger)
- ✅ Input validation
- ✅ Output validation
- ✅ Application Insights tracking

**TypeScript Types:**
```typescript
type GenerateReportInput = {
  datasetId: string;
  reportType: 'summary' | 'detailed' | 'quality';
  format?: 'pdf' | 'excel' | 'json';
  includeCharts?: boolean;
  customFilters?: any;
};

type GenerateReportOutput = {
  reportId: string;
  reportUrl: string;
  status: 'generating' | 'completed' | 'failed';
  expiresAt: string;
  metadata?: any;
};
```

### Default Handler

By default, returns 501 Not Implemented:

```typescript
// Auto-generated handler
async function generateReport(input: GenerateReportInput): Promise<GenerateReportOutput> {
  return {
    statusCode: 501,
    body: {
      error: 'Not Implemented',
      message: 'Function handler not customized. Attach a custom handler in src/index.ts',
    },
  };
}
```

### Custom Handler

Attach custom implementation:

```typescript
// src/function/resource.ts
import { defineFunctions, configureFunction, minutes } from '@atakora/component/functions';

export const func = defineFunctions({
  GenerateReport: configureFunction('GenerateReport')
    // Function settings
    .memory(1024)              // 1 GB RAM
    .timeout(minutes(10))      // 10 min max execution
    .concurrency(10)           // Max 10 concurrent executions per instance

    // Custom handler
    .withHandler(async (context, input) => {
      context.log(`Generating ${input.reportType} report for ${input.datasetId}`);

      // Fetch data
      const dataset = await context.db.datasets.get(input.datasetId);
      if (!dataset) {
        throw new Error(`Dataset ${input.datasetId} not found`);
      }

      // Generate report
      const reportId = `rpt_${generateId()}`;
      let reportBlob: Buffer;

      switch (input.format) {
        case 'pdf':
          reportBlob = await generatePdfReport(dataset, input);
          break;
        case 'excel':
          reportBlob = await generateExcelReport(dataset, input);
          break;
        case 'json':
          reportBlob = Buffer.from(JSON.stringify(dataset));
          break;
      }

      // Upload to storage
      const reportUrl = await context.storage.uploadBlob(
        'reports',
        `${reportId}.${input.format}`,
        reportBlob,
        {
          contentType: getContentType(input.format),
          metadata: {
            datasetId: input.datasetId,
            reportType: input.reportType,
          },
        }
      );

      // Set expiration (7 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      return {
        reportId,
        reportUrl,
        status: 'completed',
        expiresAt: expiresAt.toISOString(),
        metadata: {
          pageCount: reportBlob.length / 1024, // Approximate
          generatedAt: new Date().toISOString(),
          format: input.format,
        },
      };
    })

    // Additional bindings
    .bindings({
      storage: {
        type: 'blob',
        direction: 'inout',
        path: 'reports',
      },
      queue: {
        type: 'queue',
        direction: 'out',
        queueName: 'report-cleanup',
      },
    }),
});

// src/index.ts - Attach custom handler
backend.schema.GenerateReport.function.attach(func.GenerateReport);
```

### Validation

Input and output are automatically validated:

**Input Validation:**
```typescript
// Request with invalid input
POST /api/functions/generate-report
{
  "datasetId": 123,  // Should be string
  "reportType": "invalid",  // Not in enum
  "format": null  // Uses default 'pdf'
}

// Response: 400 Bad Request
{
  "error": "Validation Error",
  "details": [
    {
      "field": "datasetId",
      "message": "Expected string, received number"
    },
    {
      "field": "reportType",
      "message": "Invalid enum value. Expected 'summary' | 'detailed' | 'quality', received 'invalid'"
    }
  ]
}
```

**Output Validation:**
```typescript
// Handler returns invalid output
return {
  reportUrl: "not a url",  // Should be valid URL
  status: "completed",
  // Missing required fields: reportId, expiresAt
};

// Atakora throws error before returning to client
// Logs error to Application Insights
// Returns 500 Internal Server Error (doesn't expose internal details)
```

### Error Handling

Automatic error handling with proper status codes:

```typescript
.withHandler(async (context, input) => {
  // Business logic error → 400 Bad Request
  if (input.datasetId.length < 5) {
    throw new BadRequestError('Dataset ID must be at least 5 characters');
  }

  // Not found → 404 Not Found
  const dataset = await context.db.datasets.get(input.datasetId);
  if (!dataset) {
    throw new NotFoundError(`Dataset ${input.datasetId} not found`);
  }

  // Authorization error → 403 Forbidden
  if (dataset.ownerId !== context.user.id) {
    throw new ForbiddenError('You do not own this dataset');
  }

  // Unexpected error → 500 Internal Server Error (auto-logged)
  return await generateReport(dataset, input);
})
```

### Long-Running Functions

For operations that take more than 5 minutes:

```typescript
ProcessLargeFile: f.model({
  input: {
    fileUrl: a.string().url().required(),
  },
  output: {
    result: a.json().required(),
  },
})
  .timeout(1800)  // 30 minutes (max: 600 seconds on Consumption, 1800 on Premium)

// src/function/resource.ts
ProcessLargeFile: configureFunction('ProcessLargeFile')
  .timeout(1800)  // 30 minutes
  .memory(2048)   // 2 GB RAM
  .withHandler(async (context, input) => {
    // Long-running processing
    const data = await downloadAndProcessLargeFile(input.fileUrl);
    return { result: data };
  })
```

### Async Functions (Background Processing)

For operations that should return immediately and process in background:

```typescript
ProcessVideo: f.model({
  input: {
    videoUrl: a.string().url().required(),
  },
  output: {
    jobId: a.string().required(),
    status: a.string().required(),
  },
})
  .async(true)  // Return immediately, process in background

// src/function/resource.ts
ProcessVideo: configureFunction('ProcessVideo')
  .async(true)
  .withHandler(async (context, input) => {
    // This runs in background after response is sent
    const video = await downloadVideo(input.videoUrl);
    const processed = await processVideo(video);

    // Update job status in database
    await context.db.jobs.update(context.jobId, {
      status: 'completed',
      result: processed,
    });
  })
```

**How it works:**
1. Function invoked: `POST /api/functions/process-video`
2. Response returned immediately: `{ jobId: 'job_123', status: 'processing' }`
3. Handler continues processing in background
4. Client polls: `GET /api/jobs/job_123` to check status

### Retry Configuration

For functions that may fail transiently:

```typescript
FetchExternalData: f.model({
  input: {
    apiUrl: a.string().url().required(),
  },
  output: {
    data: a.json().required(),
  },
})

// src/function/resource.ts
FetchExternalData: configureFunction('FetchExternalData')
  .retries(5)                    // 5 retry attempts
  .retryDelay(minutes(1))        // 1 minute between retries
  .timeout(300)                  // 5 minutes per attempt
  .withHandler(async (context, input) => {
    // May fail due to network issues
    const response = await context.http.get(input.apiUrl);
    return { data: response.data };
  })
```

**Retry behavior:**
```
Attempt 1: Immediate
Attempt 2: 1 minute later
Attempt 3: 1 minute later
Attempt 4: 1 minute later
Attempt 5: 1 minute later
Final failure: Return 500 error
```

### Rate Limiting

Protect functions from abuse:

```typescript
AnalyzeData: f.model({
  input: {
    datasetId: a.string().required(),
  },
  output: {
    analysis: a.json().required(),
  },
})

// src/function/resource.ts
AnalyzeData: configureFunction('AnalyzeData')
  .rateLimit(limit =>
    limit
      .perUser(10, 'hour')       // 10 requests per user per hour
      .perIp(20, 'hour')         // 20 requests per IP per hour
      .global(1000, 'hour')      // 1000 requests total per hour
  )
  .withHandler(async (context, input) => {
    // Expensive analysis
    const data = await context.db.datasets.get(input.datasetId);
    const analysis = await runAnalysis(data);
    return { analysis };
  })
```

**Rate limit response:**
```json
HTTP/1.1 429 Too Many Requests
Retry-After: 3600

{
  "error": "Rate Limit Exceeded",
  "message": "Maximum 10 requests per hour",
  "retryAfter": 3600
}
```

### Caching

Cache expensive computations:

```typescript
GetStatistics: f.model({
  input: {
    datasetId: a.string().required(),
  },
  output: {
    statistics: a.json().required(),
  },
})

// src/function/resource.ts
GetStatistics: configureFunction('GetStatistics')
  .cache(cache =>
    cache
      .ttl(minutes(15))          // Cache for 15 minutes
      .key((input) => `stats:${input.datasetId}`)
      .invalidateOn(['DatasetUpdated'])  // Clear cache on update event
  )
  .withHandler(async (context, input) => {
    // Expensive calculation (only runs on cache miss)
    const data = await context.db.datasets.get(input.datasetId);
    const statistics = await calculateStatistics(data);
    return { statistics };
  })
```

**How it works:**
1. First request: Runs handler, caches result
2. Subsequent requests: Returns cached result (no handler execution)
3. After 15 minutes: Cache expires, next request runs handler
4. On `DatasetUpdated` event: Cache invalidated, next request runs handler

### Context Object

Handlers receive a rich context object:

```typescript
.withHandler(async (context, input) => {
  // Logging
  context.log('Info message');
  context.warn('Warning message');
  context.error('Error message');

  // Database access (all CRUD models)
  const user = await context.db.users.get(userId);
  const projects = await context.db.projects.list({ ownerId: userId });

  // Storage access
  const blob = await context.storage.getBlob('container', 'path/file.pdf');
  await context.storage.uploadBlob('container', 'path/file.pdf', buffer);

  // Event publishing
  await context.publish('DataProcessed', { datasetId: input.datasetId });

  // Cache access
  const cached = await context.cache.get('key');
  await context.cache.set('key', value, { ttl: 300 });

  // HTTP requests
  const response = await context.http.get('https://api.example.com/data');

  // Current user (from auth token)
  const userId = context.user.id;
  const roles = context.user.roles;
  const isAdmin = context.user.hasRole('admin');

  // Request metadata
  const requestId = context.requestId;
  const timestamp = context.timestamp;
  const ipAddress = context.ip;

  // Secrets (from Key Vault)
  const apiKey = await context.secrets.get('EXTERNAL_API_KEY');

  // Audit logging
  await context.audit.log('DATA_PROCESS', {
    userId: context.user.id,
    datasetId: input.datasetId,
  });
})
```

## Field Types

All available field types for model definitions:

### Primitive Types

```typescript
// String
a.string()
  .required()
  .minLength(3)
  .maxLength(255)
  .pattern(/^[a-z]+$/)
  .email()
  .url()
  .uuid()
  .default('default value')

// Number
a.number()
  .required()
  .min(0)
  .max(100)
  .integer()
  .positive()
  .negative()
  .default(0)

// Boolean
a.boolean()
  .required()
  .default(false)

// Datetime (ISO 8601 string)
a.datetime()
  .required()
  .default(() => new Date().toISOString())

// ID (auto-generated UUID)
a.id()  // Always generates a new UUID on create

// Binary (for file uploads)
a.binary()
  .required()
  .maxSize(10_000_000)  // 10 MB
```

### Complex Types

```typescript
// Enum
a.enum(['pending', 'active', 'archived'])
  .required()
  .default('pending')

// Array
a.array(a.string())
  .required()
  .minItems(1)
  .maxItems(10)
  .unique()  // All items must be unique
  .default([])

// Object (nested)
a.object({
  street: a.string().required(),
  city: a.string().required(),
  zip: a.string().pattern(/^\d{5}$/),
})
  .required()

// JSON (arbitrary JSON)
a.json()
  .default({})
```

### Advanced Types

```typescript
// Union (one of multiple types)
a.union([
  a.string(),
  a.number(),
])

// Nullable
a.string().nullable()  // Can be null
a.string().optional()  // Can be undefined
a.string().nullable().optional()  // Can be null or undefined

// Conditional (based on other field)
a.object({
  type: a.enum(['email', 'sms']),
  email: a.string().email().when('type', {
    is: 'email',
    then: (schema) => schema.required(),
    otherwise: (schema) => schema.optional(),
  }),
  phone: a.string().when('type', {
    is: 'sms',
    then: (schema) => schema.required(),
    otherwise: (schema) => schema.optional(),
  }),
})
```

## Best Practices

### 1. Model Naming

```typescript
// ✅ Good: Singular, PascalCase
User: c.model({...})
Project: c.model({...})
DataUploadedEvent: e.model({...})  // Suffix "Event" for clarity

// ❌ Avoid: Plural, snake_case, abbreviations
Users: c.model({...})
user_model: c.model({...})
Usr: c.model({...})
```

### 2. Field Naming

```typescript
// ✅ Good: camelCase, descriptive
userId: a.string().required()
createdAt: a.datetime()
isActive: a.boolean()

// ❌ Avoid: snake_case, abbreviations
user_id: a.string()
created_at: a.datetime()
is_act: a.boolean()
```

### 3. Required vs Optional

```typescript
// ✅ Good: Be explicit about what's required
User: c.model({
  id: a.id(),
  email: a.string().required(),
  name: a.string().required(),
  phone: a.string(),  // Optional
  bio: a.string(),  // Optional
})

// ❌ Avoid: Everything required or everything optional
User: c.model({
  email: a.string().required(),
  name: a.string().required(),
  phone: a.string().required(),  // Is phone really required?
  bio: a.string().required(),  // Is bio really required?
})
```

### 4. Default Values

```typescript
// ✅ Good: Sensible defaults
User: c.model({
  role: a.enum(['user', 'admin']).default('user'),
  isActive: a.boolean().default(true),
  preferences: a.json().default({}),
})

// ❌ Avoid: Defaults for things that should be required
User: c.model({
  email: a.string().default('user@example.com'),  // Email should be required!
})
```

### 5. Validation

```typescript
// ✅ Good: Validate at schema level
User: c.model({
  email: a.string().required().email(),
  age: a.number().min(18).max(120),
  website: a.string().url(),
})

// ❌ Avoid: Validating in handlers
User: c.model({
  email: a.string().required(),  // No email validation
})
// Then validating in hooks/handlers
```

### 6. Authorization

```typescript
// ✅ Good: Define access control in schema
User: c.model({...})
  .authorization(allow => [
    allow.owner('id'),
    allow.groups(['admin']).all(),
  ])

// ❌ Avoid: Authorization in handlers
User: c.model({...})
// Then checking permissions in every handler
```

### 7. Events vs Functions

```typescript
// ✅ Good: Use events for async, decoupled operations
DataUploaded: e.model({...})  // Fire and forget
EmailRequested: e.model({...})  // Background processing

// ✅ Good: Use functions for sync operations requiring response
GenerateReport: f.model({...})  // Client needs the report URL
SearchData: f.model({...})  // Client needs search results

// ❌ Avoid: Using functions for async operations
ProcessVideo: f.model({...})  // Client waits 10 minutes? Use event instead!
```

## Related Documentation

- [Schema CRUD Models](./schema-crud.md) - Deep dive into c.model
- [Schema Events](./schema-events.md) - Deep dive into e.model
- [Schema Functions](./schema-functions.md) - Deep dive into f.model
- [Field Types API](./api/field-types.md) - Complete field type reference
- [Validation API](./api/validation.md) - Validation method reference
- [Authorization](./authorization.md) - Access control patterns
- [Type Generation](./type-generation.md) - Auto-generated TypeScript types
