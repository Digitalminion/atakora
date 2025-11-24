# Function Handler Patterns

> Master function handlers: request/response patterns, error handling, middleware, and performance optimization

## Table of Contents

- [Function Handler Anatomy](#function-handler-anatomy)
- [Request/Response Patterns](#requestresponse-patterns)
- [Using Services in Handlers](#using-services-in-handlers)
- [Error Handling](#error-handling)
- [Middleware Usage](#middleware-usage)
- [Authentication and Authorization](#authentication-and-authorization)
- [Input Validation](#input-validation)
- [Testing Handlers](#testing-handlers)
- [Performance Optimization](#performance-optimization)
- [Best Practices](#best-practices)

## Function Handler Anatomy

A function handler is an async function that processes requests and returns responses.

### Basic Structure

```typescript
import type { FunctionHandler, FunctionContext } from '@atakora/component/functions';

// Handler signature
export const myFunction: FunctionHandler<InputType, OutputType> = async (
  context,  // Execution context with database, storage, services, user, etc.
  input     // Type-safe input matching function model
) => {
  // Your business logic here

  return {
    // Type-safe output matching function model
  };
};
```

### Function Context

The `context` parameter provides access to:

```typescript
interface FunctionContext {
  // Database operations
  database: DatabaseClient;     // context.database.users.get(id)

  // Storage operations
  storage: StorageClient;       // context.storage.blobs.upload(path, data)

  // Custom services
  services: ServiceRegistry;    // context.services.emailService.send(...)

  // Current user
  user: UserContext;            // context.user.id, context.user.roles

  // Logging
  log: Logger;                  // context.log.info('Processing...')

  // Utilities
  utils: FunctionUtils;         // context.utils.generateId('rpt')

  // Metadata
  executionId: string;          // Unique execution ID
  executionTime: number;        // Start time (ms since epoch)
  invocationId: string;         // Azure Functions invocation ID
  bindingData?: any;            // Trigger-specific metadata
}
```

### Complete Example

```typescript
import type { FunctionHandler } from '@atakora/component/functions';

interface GenerateReportInput {
  datasetId: string;
  format: 'pdf' | 'excel';
  recipientEmail: string;
}

interface GenerateReportOutput {
  reportId: string;
  reportUrl: string;
  status: 'completed' | 'failed';
  generatedAt: string;
}

export const generateReport: FunctionHandler<GenerateReportInput, GenerateReportOutput> =
  async (context, input) => {
    // Log request
    context.log.info('Generating report', {
      datasetId: input.datasetId,
      format: input.format,
      userId: context.user.id,
    });

    // Fetch data
    const dataset = await context.database.datasets.get(input.datasetId);
    if (!dataset) {
      throw new Error(`Dataset not found: ${input.datasetId}`);
    }

    // Generate report using service
    const report = await context.services.reportGenerator.generate({
      dataset,
      format: input.format,
    });

    // Upload to storage
    const reportUrl = await context.storage.blobs.upload(
      `reports/${report.id}.${input.format}`,
      report.data,
      { contentType: report.mimeType }
    );

    // Send notification
    await context.services.emailService.send({
      to: input.recipientEmail,
      subject: 'Your Report is Ready',
      body: `Download your report: ${reportUrl}`,
    });

    // Log success
    context.log.info('Report generated successfully', {
      reportId: report.id,
      url: reportUrl,
    });

    return {
      reportId: report.id,
      reportUrl,
      status: 'completed',
      generatedAt: new Date().toISOString(),
    };
  };
```

## Request/Response Patterns

### Simple CRUD Operations

```typescript
// Get single record
export const getUser: FunctionHandler<{ userId: string }, User> = async (context, input) => {
  const user = await context.database.users.get(input.userId);

  if (!user) {
    throw new Error('User not found');
  }

  return user;
};

// List records with filtering
export const listUsers: FunctionHandler<{ status?: string }, { users: User[] }> =
  async (context, input) => {
    const users = await context.database.users.list(
      input.status ? { status: input.status } : undefined
    );

    return { users };
  };

// Create record
export const createUser: FunctionHandler<CreateUserInput, User> =
  async (context, input) => {
    const user = await context.database.users.create({
      email: input.email,
      name: input.name,
      status: 'active',
      createdBy: context.user.id,
    });

    return user;
  };

// Update record
export const updateUser: FunctionHandler<UpdateUserInput, User> =
  async (context, input) => {
    const user = await context.database.users.update(input.userId, {
      name: input.name,
      updatedBy: context.user.id,
      updatedAt: new Date().toISOString(),
    });

    return user;
  };

// Delete record
export const deleteUser: FunctionHandler<{ userId: string }, { success: boolean }> =
  async (context, input) => {
    await context.database.users.delete(input.userId);
    return { success: true };
  };
```

### Batch Operations

```typescript
interface BatchProcessInput {
  items: Array<{ id: string; data: any }>;
}

interface BatchProcessOutput {
  processed: number;
  failed: number;
  results: Array<{ id: string; status: 'success' | 'error'; error?: string }>;
}

export const batchProcess: FunctionHandler<BatchProcessInput, BatchProcessOutput> =
  async (context, input) => {
    const results = [];
    let processed = 0;
    let failed = 0;

    for (const item of input.items) {
      try {
        await context.services.dataProcessor.process(item.data);
        results.push({ id: item.id, status: 'success' });
        processed++;
      } catch (error) {
        results.push({
          id: item.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        failed++;
        context.log.error(`Failed to process item ${item.id}`, error);
      }
    }

    return { processed, failed, results };
  };
```

### Async Processing with Queue

```typescript
interface StartJobInput {
  jobType: string;
  parameters: Record<string, any>;
}

interface StartJobOutput {
  jobId: string;
  status: 'queued';
  estimatedCompletionTime: string;
}

export const startJob: FunctionHandler<StartJobInput, StartJobOutput> =
  async (context, input) => {
    // Create job record
    const jobId = context.utils.generateId('job');
    const job = await context.database.jobs.create({
      id: jobId,
      type: input.jobType,
      parameters: input.parameters,
      status: 'queued',
      createdBy: context.user.id,
      createdAt: new Date().toISOString(),
    });

    // Queue for background processing
    await context.services.queueService.enqueue('job-processing', {
      jobId: job.id,
      type: job.type,
      parameters: job.parameters,
    });

    context.log.info(`Job ${jobId} queued for processing`);

    return {
      jobId: job.id,
      status: 'queued',
      estimatedCompletionTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };
  };
```

## Using Services in Handlers

Services provide reusable business logic.

### Single Service Usage

```typescript
export const sendEmail: FunctionHandler<SendEmailInput, SendEmailOutput> =
  async (context, input) => {
    await context.services.emailService.send({
      to: input.to,
      subject: input.subject,
      body: input.body,
    });

    return { sent: true, timestamp: new Date().toISOString() };
  };
```

### Multiple Services Composition

```typescript
export const processOrder: FunctionHandler<ProcessOrderInput, ProcessOrderOutput> =
  async (context, input) => {
    // Validate order data
    const validation = await context.services.orderValidator.validate(input.order);
    if (!validation.isValid) {
      throw new Error(`Invalid order: ${validation.errors.join(', ')}`);
    }

    // Calculate pricing
    const pricing = await context.services.pricingService.calculate(input.order);

    // Process payment
    const payment = await context.services.paymentService.charge({
      amount: pricing.total,
      currency: pricing.currency,
      customerId: context.user.id,
    });

    // Create order record
    const order = await context.database.orders.create({
      userId: context.user.id,
      items: input.order.items,
      total: pricing.total,
      paymentId: payment.id,
      status: 'confirmed',
    });

    // Send confirmation email
    await context.services.emailService.send({
      to: context.user.email,
      subject: 'Order Confirmation',
      body: `Your order ${order.id} has been confirmed.`,
    });

    return {
      orderId: order.id,
      status: 'confirmed',
      total: pricing.total,
    };
  };
```

### Service Error Handling

```typescript
export const searchDocuments: FunctionHandler<SearchInput, SearchOutput> =
  async (context, input) => {
    try {
      const results = await context.services.aiSearch.search(input.query);

      return {
        results,
        count: results.length,
        query: input.query,
      };
    } catch (error) {
      // Log service error
      context.log.error('AI Search failed', error);

      // Fallback to basic search
      context.log.info('Falling back to database search');
      const results = await context.database.documents.list({
        title: { $contains: input.query },
      });

      return {
        results: results.map(doc => ({
          id: doc.id,
          content: doc.title,
          score: 0,
        })),
        count: results.length,
        query: input.query,
        fallback: true,
      };
    }
  };
```

## Error Handling

Proper error handling ensures reliable functions.

### Standard Error Handling

```typescript
export const processPayment: FunctionHandler<PaymentInput, PaymentOutput> =
  async (context, input) => {
    try {
      // Validate input
      if (input.amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Process payment
      const result = await context.services.paymentService.charge({
        amount: input.amount,
        customerId: context.user.id,
      });

      return {
        success: true,
        transactionId: result.id,
      };
    } catch (error) {
      // Log error with context
      context.log.error('Payment processing failed', error, {
        userId: context.user.id,
        amount: input.amount,
      });

      // Return structured error response
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed',
      };
    }
  };
```

### Custom Error Types

```typescript
// errors/payment-errors.ts
export class PaymentError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

export class InsufficientFundsError extends PaymentError {
  constructor() {
    super('Insufficient funds', 'INSUFFICIENT_FUNDS', false);
    this.name = 'InsufficientFundsError';
  }
}

export class PaymentGatewayError extends PaymentError {
  constructor(message: string) {
    super(message, 'GATEWAY_ERROR', true);
    this.name = 'PaymentGatewayError';
  }
}

// Handler
export const processPayment: FunctionHandler<PaymentInput, PaymentOutput> =
  async (context, input) => {
    try {
      const result = await context.services.paymentService.charge(input);
      return { success: true, transactionId: result.id };
    } catch (error) {
      if (error instanceof InsufficientFundsError) {
        context.log.warn('Payment declined: insufficient funds', {
          userId: context.user.id,
        });
        return {
          success: false,
          error: 'Insufficient funds',
          code: error.code,
        };
      }

      if (error instanceof PaymentGatewayError) {
        context.log.error('Payment gateway error', error, {
          retryable: error.retryable,
        });
        return {
          success: false,
          error: 'Payment processing failed',
          code: error.code,
          retryable: true,
        };
      }

      // Unknown error
      context.log.error('Unexpected payment error', error);
      return {
        success: false,
        error: 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
      };
    }
  };
```

### Validation Errors

```typescript
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const createUser: FunctionHandler<CreateUserInput, User> =
  async (context, input) => {
    // Validate email
    if (!input.email.includes('@')) {
      throw new ValidationError(
        'Invalid email format',
        'email',
        input.email
      );
    }

    // Check for duplicate
    const existing = await context.database.users.list({ email: input.email });
    if (existing.length > 0) {
      throw new ValidationError(
        'Email already exists',
        'email',
        input.email
      );
    }

    return context.database.users.create(input);
  };
```

## Middleware Usage

Middleware wraps handlers to add cross-cutting concerns.

### Authentication Middleware

```typescript
// middleware/auth.ts
export function requireAuth<TInput, TOutput>(
  handler: FunctionHandler<TInput, TOutput>
): FunctionHandler<TInput, TOutput> {
  return async (context, input) => {
    // Check if user is authenticated
    if (!context.user || !context.user.id) {
      throw new Error('Authentication required');
    }

    // Call original handler
    return handler(context, input);
  };
}

// Usage
export const getProfile = requireAuth(
  async (context, input) => {
    return context.database.users.get(context.user.id);
  }
);
```

### Authorization Middleware

```typescript
// middleware/authorize.ts
export function requireRoles<TInput, TOutput>(
  roles: string[],
  handler: FunctionHandler<TInput, TOutput>
): FunctionHandler<TInput, TOutput> {
  return async (context, input) => {
    // Check user has required role
    const hasRole = roles.some(role => context.user.roles.includes(role));
    if (!hasRole) {
      throw new Error(`Requires one of roles: ${roles.join(', ')}`);
    }

    return handler(context, input);
  };
}

// Usage
export const deleteUser = requireRoles(['admin'], async (context, input) => {
  await context.database.users.delete(input.userId);
  return { success: true };
});
```

### Logging Middleware

```typescript
// middleware/logging.ts
export function withLogging<TInput, TOutput>(
  handler: FunctionHandler<TInput, TOutput>
): FunctionHandler<TInput, TOutput> {
  return async (context, input) => {
    const startTime = Date.now();

    context.log.info('Handler started', {
      executionId: context.executionId,
      userId: context.user?.id,
    });

    try {
      const result = await handler(context, input);

      const duration = Date.now() - startTime;
      context.log.info('Handler completed', {
        executionId: context.executionId,
        duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      context.log.error('Handler failed', error, {
        executionId: context.executionId,
        duration,
      });

      throw error;
    }
  };
}
```

### Composing Middleware

```typescript
// middleware/compose.ts
export function compose<TInput, TOutput>(
  ...middlewares: Array<(h: FunctionHandler<TInput, TOutput>) => FunctionHandler<TInput, TOutput>>
) {
  return (handler: FunctionHandler<TInput, TOutput>): FunctionHandler<TInput, TOutput> => {
    return middlewares.reduceRight((h, middleware) => middleware(h), handler);
  };
}

// Usage
const protectedHandler = compose(
  withLogging,
  requireAuth,
  requireRoles(['admin'])
)(async (context, input) => {
  // Handler implementation
});
```

## Authentication and Authorization

### Checking User Authentication

```typescript
export const getProfile: FunctionHandler = async (context) => {
  if (!context.user) {
    throw new Error('Not authenticated');
  }

  const user = await context.database.users.get(context.user.id);
  return user;
};
```

### Role-Based Access Control

```typescript
export const deletePost: FunctionHandler<{ postId: string }, { success: boolean }> =
  async (context, input) => {
    // Get post
    const post = await context.database.posts.get(input.postId);
    if (!post) {
      throw new Error('Post not found');
    }

    // Check permissions
    const isOwner = post.authorId === context.user.id;
    const isAdmin = context.user.roles.includes('admin');

    if (!isOwner && !isAdmin) {
      throw new Error('Not authorized to delete this post');
    }

    // Delete post
    await context.database.posts.delete(input.postId);

    return { success: true };
  };
```

### Multi-Tenant Isolation

```typescript
export const listDocuments: FunctionHandler<{}, { documents: Document[] }> =
  async (context) => {
    // Get user's tenant ID from claims
    const tenantId = context.user.claims?.tenantId;
    if (!tenantId) {
      throw new Error('Tenant not found');
    }

    // Filter by tenant
    const documents = await context.database.documents.list({
      tenantId,
    });

    return { documents };
  };
```

## Input Validation

### Schema-Based Validation

```typescript
import type { FunctionHandler } from '@atakora/component/functions';

interface CreatePostInput {
  title: string;
  content: string;
  tags?: string[];
}

export const createPost: FunctionHandler<CreatePostInput, Post> =
  async (context, input) => {
    // Validate required fields
    if (!input.title || input.title.trim() === '') {
      throw new Error('Title is required');
    }

    if (!input.content || input.content.trim() === '') {
      throw new Error('Content is required');
    }

    // Validate lengths
    if (input.title.length > 200) {
      throw new Error('Title must be 200 characters or less');
    }

    if (input.content.length > 10000) {
      throw new Error('Content must be 10,000 characters or less');
    }

    // Validate tags
    if (input.tags && input.tags.length > 10) {
      throw new Error('Maximum 10 tags allowed');
    }

    // Create post
    return context.database.posts.create({
      title: input.title.trim(),
      content: input.content.trim(),
      tags: input.tags || [],
      authorId: context.user.id,
      createdAt: new Date().toISOString(),
    });
  };
```

### Using Validation Services

```typescript
export const submitForm: FunctionHandler<FormData, FormSubmission> =
  async (context, input) => {
    // Use validation service
    const validation = await context.services.formValidator.validate(input);

    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Process valid data
    return context.database.submissions.create(input);
  };
```

## Testing Handlers

### Unit Testing

```typescript
// __tests__/handlers/generate-report.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createFunctionContext } from '@atakora/component/functions';
import { generateReport } from '../../functions/generate-report';

describe('generateReport', () => {
  let context: FunctionContext;

  beforeEach(() => {
    context = createFunctionContext({
      user: { id: 'user-123', email: 'test@example.com', roles: [] },
      services: {
        reportGenerator: {
          generate: async (input) => ({
            id: 'report-123',
            data: Buffer.from('report'),
            mimeType: 'application/pdf',
          }),
        },
        emailService: {
          send: async () => {},
        },
      },
      database: {
        datasets: {
          get: async (id) => ({ id, name: 'Test Dataset', data: [] }),
        },
      },
      storage: {
        blobs: {
          upload: async (path, data) => `https://example.com/${path}`,
        },
      },
    });
  });

  it('should generate report successfully', async () => {
    const input = {
      datasetId: 'dataset-123',
      format: 'pdf' as const,
      recipientEmail: 'user@example.com',
    };

    const result = await generateReport(context, input);

    expect(result.status).toBe('completed');
    expect(result.reportUrl).toContain('report-123');
  });

  it('should throw error for non-existent dataset', async () => {
    context.database.datasets.get = async () => null;

    const input = {
      datasetId: 'invalid',
      format: 'pdf' as const,
      recipientEmail: 'user@example.com',
    };

    await expect(generateReport(context, input)).rejects.toThrow('Dataset not found');
  });
});
```

### Integration Testing

```typescript
// __tests__/integration/report-flow.integration.test.ts
import { describe, it, expect } from 'vitest';
import { backend } from '../../backend';

describe('Report Generation Flow', () => {
  it('should generate and email report', async () => {
    // Create test dataset
    const dataset = await backend.database.datasets.create({
      name: 'Test Dataset',
      data: [{ value: 1 }, { value: 2 }],
    });

    // Generate report
    const result = await backend.functions.generateReport({
      datasetId: dataset.id,
      format: 'pdf',
      recipientEmail: 'test@example.com',
    });

    expect(result.status).toBe('completed');
    expect(result.reportUrl).toMatch(/^https:\/\//);

    // Verify report exists in storage
    const exists = await backend.storage.blobs.exists(result.reportUrl);
    expect(exists).toBe(true);
  });
});
```

## Performance Optimization

### Parallel Operations

```typescript
export const enrichUserData: FunctionHandler<{ userId: string }, EnrichedUser> =
  async (context, input) => {
    // Fetch data in parallel
    const [user, posts, comments, followers] = await Promise.all([
      context.database.users.get(input.userId),
      context.database.posts.list({ authorId: input.userId }),
      context.database.comments.list({ authorId: input.userId }),
      context.database.followers.list({ followingId: input.userId }),
    ]);

    return {
      ...user,
      postsCount: posts.length,
      commentsCount: comments.length,
      followersCount: followers.length,
    };
  };
```

### Caching Results

```typescript
const cache = new Map<string, any>();

export const getPopularPosts: FunctionHandler<{}, { posts: Post[] }> =
  async (context) => {
    const cacheKey = 'popular-posts';

    // Check cache
    if (cache.has(cacheKey)) {
      context.log.info('Returning cached results');
      return { posts: cache.get(cacheKey) };
    }

    // Fetch from database
    const posts = await context.database.posts.list({
      orderBy: 'views',
      limit: 10,
    });

    // Cache for 5 minutes
    cache.set(cacheKey, posts);
    setTimeout(() => cache.delete(cacheKey), 5 * 60 * 1000);

    return { posts };
  };
```

### Streaming Large Results

```typescript
export const exportData: FunctionHandler<{ query: any }, { exportUrl: string }> =
  async (context, input) => {
    // Instead of loading all data into memory
    const exportId = context.utils.generateId('export');
    const exportPath = `exports/${exportId}.csv`;

    // Stream results to storage
    const stream = context.storage.blobs.createWriteStream(exportPath);

    let offset = 0;
    const limit = 1000;

    while (true) {
      const batch = await context.database.records.list({
        ...input.query,
        offset,
        limit,
      });

      if (batch.length === 0) break;

      for (const record of batch) {
        stream.write(JSON.stringify(record) + '\n');
      }

      offset += limit;
    }

    await stream.end();

    return {
      exportUrl: `https://storage.example.com/${exportPath}`,
    };
  };
```

## Best Practices

### 1. Use Type-Safe Inputs/Outputs

```typescript
// ✅ Good - strongly typed
interface CreateUserInput {
  email: string;
  name: string;
}

interface CreateUserOutput {
  id: string;
  email: string;
  name: string;
}

export const createUser: FunctionHandler<CreateUserInput, CreateUserOutput> = async (
  context,
  input
) => {
  // TypeScript ensures type safety
};
```

### 2. Validate Input Early

```typescript
// ✅ Good - fail fast
export const processOrder: FunctionHandler = async (context, input) => {
  if (!input.items || input.items.length === 0) {
    throw new Error('Order must contain at least one item');
  }

  // Continue processing...
};
```

### 3. Log Important Events

```typescript
// ✅ Good - comprehensive logging
export const processPayment: FunctionHandler = async (context, input) => {
  context.log.info('Processing payment', {
    userId: context.user.id,
    amount: input.amount,
  });

  try {
    const result = await context.services.paymentService.charge(input);

    context.log.info('Payment successful', {
      transactionId: result.id,
    });

    return { success: true, transactionId: result.id };
  } catch (error) {
    context.log.error('Payment failed', error);
    throw error;
  }
};
```

### 4. Handle Errors Gracefully

```typescript
// ✅ Good - structured error handling
export const sendNotification: FunctionHandler = async (context, input) => {
  try {
    await context.services.emailService.send(input);
    return { sent: true };
  } catch (error) {
    context.log.error('Email failed', error);

    // Don't fail entire function - return error info
    return {
      sent: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
```

### 5. Keep Handlers Focused

```typescript
// ✅ Good - single responsibility
export const createUser: FunctionHandler = async (context, input) => {
  return context.database.users.create(input);
};

export const sendWelcomeEmail: FunctionHandler = async (context, input) => {
  return context.services.emailService.send({
    to: input.email,
    template: 'welcome',
  });
};

// ❌ Bad - too many responsibilities
export const createUserAndSendEmail: FunctionHandler = async (context, input) => {
  const user = await context.database.users.create(input);
  await context.services.emailService.send({ ... });
  await context.services.analytics.track({ ... });
  await context.services.slack.notify({ ... });
  return user;
};
```

---

**Next Steps:**
- Learn about [Service Registry](./service-registry.md)
- Explore [Token Validation](./token-validation.md)
- See [Testing Guide](./testing.md) for comprehensive testing strategies
