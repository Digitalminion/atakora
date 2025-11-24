# Service Registry and Dependency Injection

> Learn how to register custom services and inject them into function handlers for reusable business logic

## Table of Contents

- [What is Dependency Injection?](#what-is-dependency-injection)
- [How the Service Registry Works](#how-the-service-registry-works)
- [Defining Custom Services](#defining-custom-services)
- [Registering Services with Backend](#registering-services-with-backend)
- [Using Services in Functions](#using-services-in-functions)
- [Service Lifecycles](#service-lifecycles)
- [Testing with Mocked Services](#testing-with-mocked-services)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

## What is Dependency Injection?

Dependency injection (DI) is a design pattern where an object receives its dependencies from external sources rather than creating them itself. This makes code more:

- **Testable** - Mock dependencies in tests
- **Maintainable** - Change implementations without modifying consumers
- **Reusable** - Share logic across multiple functions
- **Flexible** - Swap implementations based on environment

### Without Dependency Injection

```typescript
// ❌ Hard to test, tightly coupled
export const generateReport: FunctionHandler = async (context, input) => {
  // Service is created directly inside the handler
  const reportService = new ReportGeneratorService({
    storageAccount: process.env.STORAGE_ACCOUNT!,
    aiEndpoint: process.env.AI_ENDPOINT!,
  });

  const report = await reportService.generate(input.datasetId);
  return { reportUrl: report.url };
};
```

### With Dependency Injection

```typescript
// ✅ Testable, loosely coupled, reusable
export const generateReport: FunctionHandler = async (context, input) => {
  // Service is injected through context
  const report = await context.services.reportGenerator.generate(input.datasetId);
  return { reportUrl: report.url };
};
```

## How the Service Registry Works

The service registry manages service creation and lifetime:

1. **Define** services with factory functions
2. **Register** services in backend configuration
3. **Access** services through `context.services`
4. **Lifecycle** management (singleton, transient, scoped)

```
┌─────────────────────────────────────────┐
│         Backend Configuration           │
│  services: {                            │
│    reportGenerator: (ctx) => new ...    │
│    dataValidator: (ctx) => new ...      │
│  }                                      │
└────────────┬────────────────────────────┘
             │
             │ Registration
             ▼
┌─────────────────────────────────────────┐
│         Service Registry                │
│  - Manages service instances            │
│  - Handles lifecycle                    │
│  - Provides to functions                │
└────────────┬────────────────────────────┘
             │
             │ Injection
             ▼
┌─────────────────────────────────────────┐
│       Function Context                  │
│  context.services.reportGenerator       │
│  context.services.dataValidator         │
└─────────────────────────────────────────┘
```

## Defining Custom Services

Services are defined using factory functions that return service instances.

### Basic Service Definition

```typescript
// services/report-generator.ts
export interface ReportGenerator {
  generate(datasetId: string): Promise<{ url: string; size: number }>;
}

export class ReportGeneratorService implements ReportGenerator {
  constructor(
    private readonly storageAccount: string,
    private readonly aiEndpoint: string
  ) {}

  async generate(datasetId: string): Promise<{ url: string; size: number }> {
    // Business logic here
    const reportData = await this.fetchData(datasetId);
    const url = await this.uploadReport(reportData);
    return { url, size: reportData.length };
  }

  private async fetchData(datasetId: string): Promise<Buffer> {
    // Implementation
    return Buffer.from('report data');
  }

  private async uploadReport(data: Buffer): Promise<string> {
    // Implementation
    return `https://${this.storageAccount}.blob.core.windows.net/reports/report.pdf`;
  }
}
```

### Service Factory Function

```typescript
import type { ServiceFactory } from '@atakora/component/functions';
import { ReportGeneratorService, type ReportGenerator } from './report-generator';

export const reportGeneratorFactory: ServiceFactory<ReportGenerator> = (context) => {
  return new ReportGeneratorService(
    context.env.STORAGE_ACCOUNT || context.settings.storage?.accountName || '',
    context.env.AI_ENDPOINT || ''
  );
};
```

### Async Service Factories

Services can be created asynchronously:

```typescript
import type { ServiceFactory } from '@atakora/component/functions';

export const databaseFactory: ServiceFactory<DatabaseConnection> = async (context) => {
  const connection = new DatabaseConnection({
    endpoint: context.env.DATABASE_ENDPOINT!,
    key: context.env.DATABASE_KEY!,
  });

  // Wait for connection to be established
  await connection.connect();

  return connection;
};
```

## Registering Services with Backend

Services are registered in backend configuration using the `services` property.

### Basic Registration

```typescript
import { defineBackend } from '@atakora/component/backend';
import { reportGeneratorFactory } from './services/report-generator';
import { dataValidatorFactory } from './services/data-validator';

export const backend = defineBackend({
  schema,
  authentication,
  services: {
    reportGenerator: reportGeneratorFactory,
    dataValidator: dataValidatorFactory,
  },
  settings: {
    name: 'my-app',
    region: 'eastus',
  },
});
```

### Type-Safe Service Registration

The service registry is fully type-safe:

```typescript
import { defineBackend } from '@atakora/component/backend';
import type { ReportGenerator } from './services/report-generator';
import type { DataValidator } from './services/data-validator';

// Define service types
interface MyServices {
  reportGenerator: ReportGenerator;
  dataValidator: DataValidator;
}

// Services are type-checked
export const backend = defineBackend({
  schema,
  authentication,
  services: {
    reportGenerator: reportGeneratorFactory, // Must return ReportGenerator
    dataValidator: dataValidatorFactory,     // Must return DataValidator
  } as ServiceConfig<MyServices>,
  settings: {
    name: 'my-app',
    region: 'eastus',
  },
});
```

### Multiple Service Registrations

```typescript
import { defineBackend } from '@atakora/component/backend';

export const backend = defineBackend({
  schema,
  authentication,
  services: {
    // Report generation
    reportGenerator: (ctx) => new ReportGeneratorService(
      ctx.env.STORAGE_ACCOUNT!,
      ctx.env.AI_ENDPOINT!
    ),

    // Data validation
    dataValidator: (ctx) => new DataValidatorService(),

    // Email notifications
    emailService: (ctx) => new EmailService(
      ctx.env.SENDGRID_API_KEY!
    ),

    // AI search
    aiSearch: (ctx) => new AISearchService(
      ctx.env.SEARCH_ENDPOINT!,
      ctx.env.SEARCH_KEY!
    ),

    // Data transformation
    dataTransformer: (ctx) => new DataTransformerService(),
  },
  settings: {
    name: 'my-app',
    region: 'eastus',
  },
});
```

## Using Services in Functions

Access services through `context.services` in function handlers.

### Basic Usage

```typescript
import type { FunctionHandler } from '@atakora/component/functions';

export const generateReport: FunctionHandler<GenerateReportInput, GenerateReportOutput> =
  async (context, input) => {
    // Access service from context
    const report = await context.services.reportGenerator.generate(input.datasetId);

    return {
      reportUrl: report.url,
      reportSize: report.size,
      status: 'completed',
    };
  };
```

### Using Multiple Services

```typescript
export const processData: FunctionHandler = async (context, input) => {
  // Validate input data
  const validation = await context.services.dataValidator.validate(input.data);

  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }

  // Transform data
  const transformed = await context.services.dataTransformer.transform(input.data);

  // Generate report
  const report = await context.services.reportGenerator.generate(transformed);

  // Send notification
  await context.services.emailService.send({
    to: input.recipientEmail,
    subject: 'Report Generated',
    body: `Your report is ready: ${report.url}`,
  });

  return {
    reportUrl: report.url,
    status: 'completed',
  };
};
```

### Service Composition

Services can depend on other services:

```typescript
// services/advanced-report-generator.ts
export class AdvancedReportGeneratorService {
  constructor(
    private readonly dataValidator: DataValidator,
    private readonly dataTransformer: DataTransformer,
    private readonly basicReportGenerator: ReportGenerator
  ) {}

  async generate(input: any): Promise<Report> {
    // Validate
    await this.dataValidator.validate(input);

    // Transform
    const data = await this.dataTransformer.transform(input);

    // Generate
    return this.basicReportGenerator.generate(data);
  }
}

// In backend configuration
export const backend = defineBackend({
  schema,
  authentication,
  services: {
    dataValidator: (ctx) => new DataValidatorService(),
    dataTransformer: (ctx) => new DataTransformerService(),
    reportGenerator: (ctx) => new ReportGeneratorService(
      ctx.env.STORAGE_ACCOUNT!,
      ctx.env.AI_ENDPOINT!
    ),
    advancedReportGenerator: (ctx) => new AdvancedReportGeneratorService(
      // Services are not yet available in factory context
      // Create dependencies directly
      new DataValidatorService(),
      new DataTransformerService(),
      new ReportGeneratorService(
        ctx.env.STORAGE_ACCOUNT!,
        ctx.env.AI_ENDPOINT!
      )
    ),
  },
  settings: { name: 'my-app', region: 'eastus' },
});
```

## Service Lifecycles

Services support three lifecycle modes:

### Transient (Default)

New instance created for each function invocation:

```typescript
import type { ServiceDefinition } from '@atakora/component/functions';

const reportGenerator: ServiceDefinition<ReportGenerator> = {
  name: 'reportGenerator',
  factory: (ctx) => new ReportGeneratorService(
    ctx.env.STORAGE_ACCOUNT!,
    ctx.env.AI_ENDPOINT!
  ),
  lifecycle: 'transient', // Default
};
```

**Use transient when:**
- Service holds request-specific state
- Service is lightweight to create
- You want isolation between requests

### Singleton

Single shared instance across all invocations:

```typescript
const databasePool: ServiceDefinition<DatabasePool> = {
  name: 'databasePool',
  factory: async (ctx) => {
    const pool = new DatabasePool({
      endpoint: ctx.env.DATABASE_ENDPOINT!,
      key: ctx.env.DATABASE_KEY!,
    });
    await pool.initialize();
    return pool;
  },
  lifecycle: 'singleton',
};
```

**Use singleton when:**
- Service is expensive to create (connection pools)
- Service maintains shared state (caches)
- Service is stateless and thread-safe

### Scoped (Future)

New instance per request (not yet implemented):

```typescript
const userSession: ServiceDefinition<UserSession> = {
  name: 'userSession',
  factory: (ctx) => new UserSession(ctx.user),
  lifecycle: 'scoped', // Future feature
};
```

**Will use scoped when:**
- Service should be shared within a request
- Service depends on request context
- You want cleanup after request completes

## Testing with Mocked Services

Services make testing easy by allowing mock implementations.

### Mock Service Implementation

```typescript
// __tests__/mocks/report-generator.mock.ts
import type { ReportGenerator } from '../../services/report-generator';

export class MockReportGenerator implements ReportGenerator {
  public generatedReports: string[] = [];

  async generate(datasetId: string): Promise<{ url: string; size: number }> {
    this.generatedReports.push(datasetId);
    return {
      url: `https://mock.example.com/reports/${datasetId}.pdf`,
      size: 1024,
    };
  }
}
```

### Testing with Mocks

```typescript
// __tests__/functions/generate-report.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createFunctionContext } from '@atakora/component/functions';
import { MockReportGenerator } from '../mocks/report-generator.mock';
import { generateReport } from '../../functions/generate-report';

describe('generateReport', () => {
  let mockReportGenerator: MockReportGenerator;
  let context: FunctionContext;

  beforeEach(() => {
    mockReportGenerator = new MockReportGenerator();

    context = createFunctionContext({
      services: {
        reportGenerator: mockReportGenerator,
      },
    });
  });

  it('should generate report successfully', async () => {
    const input = { datasetId: 'dataset-123' };

    const result = await generateReport(context, input);

    expect(result.status).toBe('completed');
    expect(result.reportUrl).toContain('dataset-123');
    expect(mockReportGenerator.generatedReports).toContain('dataset-123');
  });

  it('should handle errors gracefully', async () => {
    // Mock failure
    mockReportGenerator.generate = async () => {
      throw new Error('Storage unavailable');
    };

    const input = { datasetId: 'dataset-456' };

    await expect(generateReport(context, input)).rejects.toThrow('Storage unavailable');
  });
});
```

### Integration Testing

```typescript
// __tests__/integration/report-generation.integration.test.ts
import { describe, it, expect } from 'vitest';
import { ReportGeneratorService } from '../../services/report-generator';

describe('ReportGenerator Integration', () => {
  it('should generate real report', async () => {
    const service = new ReportGeneratorService(
      process.env.TEST_STORAGE_ACCOUNT!,
      process.env.TEST_AI_ENDPOINT!
    );

    const report = await service.generate('test-dataset');

    expect(report.url).toMatch(/^https:\/\//);
    expect(report.size).toBeGreaterThan(0);
  });
});
```

## Best Practices

### 1. Define Service Interfaces

Always define TypeScript interfaces for services:

```typescript
// ✅ Good - interface defines contract
export interface EmailService {
  send(options: EmailOptions): Promise<void>;
  sendBatch(emails: EmailOptions[]): Promise<void>;
}

export class SendGridEmailService implements EmailService {
  // Implementation
}
```

### 2. Use Environment Variables

Configure services using environment variables:

```typescript
// ✅ Good - configurable through environment
export const emailServiceFactory: ServiceFactory<EmailService> = (ctx) => {
  return new SendGridEmailService({
    apiKey: ctx.env.SENDGRID_API_KEY!,
    fromEmail: ctx.env.FROM_EMAIL || 'noreply@example.com',
  });
};
```

### 3. Handle Errors Gracefully

Services should throw meaningful errors:

```typescript
export class DataValidatorService implements DataValidator {
  async validate(data: any): Promise<ValidationResult> {
    try {
      // Validation logic
      return { isValid: true, errors: [] };
    } catch (error) {
      throw new ValidationError('Data validation failed', { cause: error });
    }
  }
}
```

### 4. Use Singleton for Expensive Resources

Connection pools and caches should be singletons:

```typescript
const databasePool: ServiceDefinition<DatabasePool> = {
  name: 'databasePool',
  factory: async (ctx) => {
    const pool = new DatabasePool(ctx.env.DATABASE_CONNECTION!);
    await pool.initialize();
    return pool;
  },
  lifecycle: 'singleton', // Share across invocations
};
```

### 5. Keep Services Focused

Each service should have a single responsibility:

```typescript
// ✅ Good - focused responsibility
export class ReportGeneratorService {
  async generate(datasetId: string): Promise<Report> { ... }
}

export class ReportStorageService {
  async upload(report: Buffer): Promise<string> { ... }
  async download(url: string): Promise<Buffer> { ... }
}

// ❌ Bad - too many responsibilities
export class ReportService {
  async generate(datasetId: string): Promise<Report> { ... }
  async upload(report: Buffer): Promise<string> { ... }
  async download(url: string): Promise<Buffer> { ... }
  async sendEmail(recipient: string): Promise<void> { ... }
  async validate(data: any): Promise<boolean> { ... }
}
```

### 6. Document Service Dependencies

Include metadata for documentation:

```typescript
const reportGenerator: ServiceDefinition<ReportGenerator> = {
  name: 'reportGenerator',
  factory: (ctx) => new ReportGeneratorService(
    ctx.env.STORAGE_ACCOUNT!,
    ctx.env.AI_ENDPOINT!
  ),
  lifecycle: 'transient',
  metadata: {
    description: 'Generates PDF reports from datasets using AI analysis',
    version: '1.0.0',
    dependencies: ['STORAGE_ACCOUNT', 'AI_ENDPOINT'],
  },
};
```

## Common Patterns

### Pattern 1: Email Service with SendGrid

```typescript
// services/email.ts
import sgMail from '@sendgrid/mail';

export interface EmailService {
  send(options: EmailOptions): Promise<void>;
}

export interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

export class SendGridEmailService implements EmailService {
  constructor(apiKey: string, fromEmail: string) {
    sgMail.setApiKey(apiKey);
    this.fromEmail = fromEmail;
  }

  private readonly fromEmail: string;

  async send(options: EmailOptions): Promise<void> {
    await sgMail.send({
      to: options.to,
      from: this.fromEmail,
      subject: options.subject,
      text: options.body,
      html: options.html || options.body,
    });
  }
}

// Factory
export const emailServiceFactory: ServiceFactory<EmailService> = (ctx) => {
  return new SendGridEmailService(
    ctx.env.SENDGRID_API_KEY!,
    ctx.env.FROM_EMAIL || 'noreply@example.com'
  );
};
```

### Pattern 2: Azure AI Search Integration

```typescript
// services/ai-search.ts
import { SearchClient, AzureKeyCredential } from '@azure/search-documents';

export interface AISearchService {
  search(query: string): Promise<SearchResult[]>;
  index(document: any): Promise<void>;
}

export interface SearchResult {
  id: string;
  content: string;
  score: number;
}

export class AzureAISearchService implements AISearchService {
  private readonly client: SearchClient;

  constructor(endpoint: string, apiKey: string, indexName: string) {
    this.client = new SearchClient(
      endpoint,
      indexName,
      new AzureKeyCredential(apiKey)
    );
  }

  async search(query: string): Promise<SearchResult[]> {
    const results = await this.client.search(query, {
      top: 10,
      select: ['id', 'content'],
    });

    const items: SearchResult[] = [];
    for await (const result of results.results) {
      items.push({
        id: result.document.id,
        content: result.document.content,
        score: result.score || 0,
      });
    }

    return items;
  }

  async index(document: any): Promise<void> {
    await this.client.uploadDocuments([document]);
  }
}

// Factory
export const aiSearchFactory: ServiceFactory<AISearchService> = (ctx) => {
  return new AzureAISearchService(
    ctx.env.SEARCH_ENDPOINT!,
    ctx.env.SEARCH_API_KEY!,
    ctx.env.SEARCH_INDEX_NAME || 'default-index'
  );
};
```

### Pattern 3: Data Validation Service

```typescript
// services/data-validator.ts
export interface DataValidator {
  validate(data: any, schema: ValidationSchema): Promise<ValidationResult>;
}

export interface ValidationSchema {
  type: 'object';
  properties: Record<string, any>;
  required?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class DataValidatorService implements DataValidator {
  async validate(data: any, schema: ValidationSchema): Promise<ValidationResult> {
    const errors: string[] = [];

    // Check required fields
    for (const field of schema.required || []) {
      if (!(field in data)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate properties
    for (const [key, value] of Object.entries(data)) {
      if (!(key in schema.properties)) {
        errors.push(`Unknown field: ${key}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// Factory
export const dataValidatorFactory: ServiceFactory<DataValidator> = () => {
  return new DataValidatorService();
};
```

## Troubleshooting

### Service Not Found Error

**Error:**
```
ServiceNotFoundError: Service 'reportGenerator' not found in service registry.
Available services: emailService, dataValidator
```

**Cause:** Service was not registered in backend configuration.

**Solution:** Add service to backend configuration:

```typescript
export const backend = defineBackend({
  schema,
  authentication,
  services: {
    reportGenerator: reportGeneratorFactory, // Add this
    emailService: emailServiceFactory,
    dataValidator: dataValidatorFactory,
  },
  settings: { name: 'my-app', region: 'eastus' },
});
```

### Service Instantiation Error

**Error:**
```
ServiceInstantiationError: Failed to instantiate service 'emailService':
Missing required environment variable: SENDGRID_API_KEY
```

**Cause:** Service factory failed due to missing configuration.

**Solution:** Ensure required environment variables are set:

```bash
export SENDGRID_API_KEY=your-api-key
export FROM_EMAIL=noreply@example.com
```

### TypeScript Type Error

**Error:**
```typescript
Type 'MockService' is not assignable to type 'RealService'.
```

**Cause:** Mock service doesn't implement the service interface correctly.

**Solution:** Ensure mock implements the full interface:

```typescript
// ✅ Correct - implements full interface
export class MockEmailService implements EmailService {
  async send(options: EmailOptions): Promise<void> {
    // Mock implementation
  }

  async sendBatch(emails: EmailOptions[]): Promise<void> {
    // Mock implementation
  }
}
```

### Circular Dependency Error

**Error:**
```
CircularDependencyError: Circular service dependency detected:
reportGenerator -> dataValidator -> reportGenerator
```

**Cause:** Services depend on each other in a circular manner.

**Solution:** Refactor to remove circular dependency:

```typescript
// ❌ Bad - circular dependency
// reportGenerator depends on dataValidator
// dataValidator depends on reportGenerator

// ✅ Good - linear dependency
// reportGenerator depends on dataValidator
// dataValidator has no dependencies
```

---

**Next Steps:**
- Learn about [Function Handler Patterns](./function-handlers.md)
- Explore [Token Validation](./token-validation.md)
- See [Testing Guide](./testing.md) for testing strategies
