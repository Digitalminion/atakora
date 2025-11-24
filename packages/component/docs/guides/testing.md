# Testing Guide

> Comprehensive testing strategies for Atakora backends

## Overview

Testing infrastructure-as-code is crucial for reliable deployments. This guide covers testing strategies for backends defined with Atakora, from unit tests to integration tests to deployment validation.

### Testing Pyramid for Infrastructure

```
         /\
        /  \  E2E Tests (Deployment Validation)
       /    \
      /------\
     / Integ. \ Integration Tests (Synthesis Output)
    /----------\
   /   Unit     \ Unit Tests (Backend Configuration)
  /--------------\
```

---

## Unit Testing Backend Definitions

Test your backend configuration and schema definitions without synthesizing or deploying.

### Testing Schema Definitions

```typescript
// schema.test.ts
import { describe, it, expect } from 'vitest';
import { schema } from './schema';

describe('Schema Definition', () => {
  it('should define User model', () => {
    expect(schema.models.User).toBeDefined();
  });

  it('should have required fields on User', () => {
    const userFields = schema.models.User._fields;
    expect(userFields.id).toBeDefined();
    expect(userFields.email).toBeDefined();
    expect(userFields.name).toBeDefined();
  });

  it('should require email on User', () => {
    const emailField = schema.models.User._fields.email;
    expect(emailField._required).toBe(true);
  });

  it('should validate email format', () => {
    const emailField = schema.models.User._fields.email;
    expect(emailField._validation).toContain('email');
  });

  it('should define authorization rules', () => {
    const auth = schema.models.User._authorization;
    expect(auth).toBeDefined();
    expect(auth.length).toBeGreaterThan(0);
  });
});
```

### Testing Backend Configuration

```typescript
// backend.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { defineBackend } from '@atakora/component';
import { schema } from './schema';
import { authentication } from './auth';

describe('Backend Configuration', () => {
  let backend: ReturnType<typeof defineBackend>;

  beforeEach(() => {
    backend = defineBackend({
      schema,
      authentication,
      settings: {
        name: 'test-app',
        environment: 'development'
      }
    });
  });

  it('should create backend with correct name', () => {
    expect(backend.settings.name).toBe('test-app');
  });

  it('should detect development environment', () => {
    expect(backend.environment).toBe('development');
  });

  it('should have storage attachment points', () => {
    expect(backend.storage.database).toBeDefined();
    expect(backend.storage.blobs).toBeDefined();
    expect(backend.storage.account).toBeDefined();
  });

  it('should have compute attachment points', () => {
    expect(backend.compute.functionApp).toBeDefined();
  });

  it('should not have network in development', () => {
    expect(backend.network).toBeUndefined();
  });

  it('should expose schema models', () => {
    expect(backend.schema.User).toBeDefined();
  });

  it('should track metadata', () => {
    expect(backend._metadata.version).toBe('1.0.0');
    expect(backend._metadata.modelCount).toBeGreaterThan(0);
    expect(backend._metadata.hasAuthentication).toBe(true);
  });
});
```

### Testing Attachment Points

```typescript
// attachments.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { defineBackend } from '@atakora/component';
import { storage } from '@atakora/component/builders';
import { schema } from './schema';
import { authentication } from './auth';

describe('Attachment Points', () => {
  let backend: ReturnType<typeof defineBackend>;

  beforeEach(() => {
    backend = defineBackend({
      schema,
      authentication,
      settings: { name: 'test-app' }
    });
  });

  it('should attach database configuration', () => {
    const config = storage.cosmosDb().name('custom-db').mode('Serverless');

    backend.storage.database.attach(config);

    expect(backend.storage.database.isAttached()).toBe(true);
    expect(backend.storage.database.getConfig()).toEqual(config);
  });

  it('should reset attached configuration', () => {
    const config = storage.cosmosDb().name('custom-db');

    backend.storage.database.attach(config);
    expect(backend.storage.database.isAttached()).toBe(true);

    backend.storage.database.reset();
    expect(backend.storage.database.isAttached()).toBe(false);
  });

  it('should reject invalid configuration', () => {
    expect(() => {
      backend.storage.database.attach(null as any);
    }).toThrow('Cannot attach null or undefined configuration');
  });

  it('should validate configuration type', () => {
    expect(() => {
      backend.storage.database.attach('invalid' as any);
    }).toThrow('must be an object');
  });

  it('should track attachments', () => {
    const config = storage.cosmosDb().name('custom-db');

    backend.storage.database.attach(config);

    expect(backend._attachments.has('storage.database')).toBe(true);
    expect(backend._attachments.get('storage.database')).toEqual(config);
  });
});
```

### Testing Environment Detection

```typescript
// environment.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { defineBackend } from '@atakora/component';
import { schema } from './schema';
import { authentication } from './auth';

describe('Environment Detection', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('should default to development', () => {
    delete process.env.NODE_ENV;

    const backend = defineBackend({
      schema,
      authentication,
      settings: { name: 'test-app' }
    });

    expect(backend.environment).toBe('development');
  });

  it('should detect production from NODE_ENV', () => {
    process.env.NODE_ENV = 'production';

    const backend = defineBackend({
      schema,
      authentication,
      settings: { name: 'test-app' }
    });

    expect(backend.environment).toBe('production');
  });

  it('should normalize "prod" to "production"', () => {
    process.env.NODE_ENV = 'prod';

    const backend = defineBackend({
      schema,
      authentication,
      settings: { name: 'test-app' }
    });

    expect(backend.environment).toBe('production');
  });

  it('should allow explicit environment override', () => {
    process.env.NODE_ENV = 'development';

    const backend = defineBackend({
      schema,
      authentication,
      settings: {
        name: 'test-app',
        environment: 'production'
      }
    });

    expect(backend.environment).toBe('production');
  });

  it('should enable features based on environment', () => {
    const prodBackend = defineBackend({
      schema,
      authentication,
      settings: {
        name: 'test-app',
        environment: 'production'
      }
    });

    expect(prodBackend.settings.features.monitoring).toBe(true);
    expect(prodBackend.settings.features.networking).toBe(true);
    expect(prodBackend.settings.features.performance).toBe(true);

    const devBackend = defineBackend({
      schema,
      authentication,
      settings: {
        name: 'test-app',
        environment: 'development'
      }
    });

    expect(devBackend.settings.features.monitoring).toBe(false);
    expect(devBackend.settings.features.networking).toBe(false);
    expect(devBackend.settings.features.performance).toBe(false);
  });
});
```

---

## Integration Testing with Synthesis

Test the synthesis output to ensure correct ARM templates are generated.

### Testing Synthesis Output

```typescript
// synthesis.test.ts
import { describe, it, expect } from 'vitest';
import { synthesize } from '@atakora/component/synthesis';
import { backend } from './backend';
import * as fs from 'fs';
import * as path from 'path';

describe('Synthesis Integration', () => {
  const outputDir = path.join(__dirname, '.test-synth');

  afterEach(() => {
    // Clean up synthesis output
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true });
    }
  });

  it('should synthesize ARM template', async () => {
    await synthesize(backend, { output: outputDir });

    const templatePath = path.join(outputDir, 'template.json');
    expect(fs.existsSync(templatePath)).toBe(true);
  });

  it('should generate valid ARM JSON', async () => {
    await synthesize(backend, { output: outputDir });

    const templatePath = path.join(outputDir, 'template.json');
    const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));

    expect(template.$schema).toContain('deploymentTemplate.json');
    expect(template.contentVersion).toBe('1.0.0.0');
    expect(template.resources).toBeInstanceOf(Array);
  });

  it('should include Cosmos DB resource', async () => {
    await synthesize(backend, { output: outputDir });

    const templatePath = path.join(outputDir, 'template.json');
    const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));

    const cosmosDb = template.resources.find(
      (r: any) => r.type === 'Microsoft.DocumentDB/databaseAccounts'
    );

    expect(cosmosDb).toBeDefined();
  });

  it('should include Function App resource', async () => {
    await synthesize(backend, { output: outputDir });

    const templatePath = path.join(outputDir, 'template.json');
    const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));

    const functionApp = template.resources.find(
      (r: any) => r.type === 'Microsoft.Web/sites' && r.kind === 'functionapp'
    );

    expect(functionApp).toBeDefined();
  });

  it('should generate parameters file', async () => {
    await synthesize(backend, { output: outputDir });

    const paramsPath = path.join(outputDir, 'parameters.development.json');
    expect(fs.existsSync(paramsPath)).toBe(true);

    const params = JSON.parse(fs.readFileSync(paramsPath, 'utf-8'));
    expect(params.parameters).toBeDefined();
  });

  it('should respect attached configurations', async () => {
    backend.storage.database.attach(
      storage.cosmosDb().name('custom-db').mode('Serverless')
    );

    await synthesize(backend, { output: outputDir });

    const templatePath = path.join(outputDir, 'template.json');
    const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));

    const cosmosDb = template.resources.find(
      (r: any) => r.type === 'Microsoft.DocumentDB/databaseAccounts'
    );

    expect(cosmosDb.properties.databaseAccountOfferType).toBe('Serverless');
  });

  it('should generate metadata', async () => {
    await synthesize(backend, { output: outputDir });

    const metadataPath = path.join(outputDir, 'metadata.json');
    expect(fs.existsSync(metadataPath)).toBe(true);

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    expect(metadata.backend.name).toBe(backend.settings.name);
    expect(metadata.schema.modelCount).toBe(backend._metadata.modelCount);
  });
});
```

### Testing Generated Functions

```typescript
// functions.test.ts
import { describe, it, expect } from 'vitest';
import { synthesize } from '@atakora/component/synthesis';
import { backend } from './backend';
import * as fs from 'fs';
import * as path from 'path';

describe('Generated Functions', () => {
  const outputDir = path.join(__dirname, '.test-synth');

  beforeAll(async () => {
    await synthesize(backend, { output: outputDir });
  });

  afterAll(() => {
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true });
    }
  });

  it('should generate CRUD functions for each model', () => {
    const functionsDir = path.join(outputDir, 'functions/src');

    // Check User CRUD functions
    expect(fs.existsSync(path.join(functionsDir, 'users/create.ts'))).toBe(true);
    expect(fs.existsSync(path.join(functionsDir, 'users/read.ts'))).toBe(true);
    expect(fs.existsSync(path.join(functionsDir, 'users/update.ts'))).toBe(true);
    expect(fs.existsSync(path.join(functionsDir, 'users/delete.ts'))).toBe(true);
    expect(fs.existsSync(path.join(functionsDir, 'users/list.ts'))).toBe(true);
  });

  it('should generate event processors', () => {
    const functionsDir = path.join(outputDir, 'functions/src/events');

    expect(fs.existsSync(
      path.join(functionsDir, 'data-uploaded-validator.ts')
    )).toBe(true);
    expect(fs.existsSync(
      path.join(functionsDir, 'data-uploaded-processor.ts')
    )).toBe(true);
  });

  it('should generate custom functions', () => {
    const functionsDir = path.join(outputDir, 'functions/src/functions');

    expect(fs.existsSync(
      path.join(functionsDir, 'generate-report.ts')
    )).toBe(true);
  });

  it('should generate function configuration', () => {
    const functionsDir = path.join(outputDir, 'functions');

    expect(fs.existsSync(path.join(functionsDir, 'host.json'))).toBe(true);
    expect(fs.existsSync(path.join(functionsDir, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(functionsDir, 'tsconfig.json'))).toBe(true);
  });
});
```

---

## Test Helpers and Utilities

Atakora provides test helpers to simplify testing.

### Test Fixtures

```typescript
// test-fixtures.ts
import { defineBackend } from '@atakora/component';
import { defineSchema, a, c, e, f } from '@atakora/component';
import { defineAuth, auth } from '@atakora/component';

/**
 * Minimal test backend
 */
export function createTestBackend(overrides = {}) {
  const schema = defineSchema({
    schema: a.schema({
      TestModel: c.model({
        id: a.id(),
        name: a.string()
      })
    })
  });

  const authentication = defineAuth({
    Primary: auth.jwt().issuer('https://test.example.com')
  });

  return defineBackend({
    schema,
    authentication,
    settings: {
      name: 'test-backend',
      environment: 'development',
      ...overrides
    }
  });
}

/**
 * Backend with all features enabled
 */
export function createFullFeaturedBackend() {
  return createTestBackend({
    environment: 'production',
    features: {
      monitoring: true,
      networking: true,
      performance: true
    }
  });
}

/**
 * Backend with complex schema
 */
export function createComplexBackend() {
  const schema = defineSchema({
    schema: a.schema({
      User: c.model({
        id: a.id(),
        email: a.string().email(),
        profile: a.ref('UserProfile')
      }),
      UserProfile: c.model({
        id: a.id(),
        bio: a.string(),
        avatar: a.string().url()
      }),
      DataUploaded: e.model({
        fileId: a.string(),
        uploadedBy: a.ref('User')
      }),
      GenerateReport: f.model({
        input: a.object({ reportType: a.string() }),
        output: a.object({ url: a.string() })
      })
    })
  });

  const authentication = defineAuth({
    Primary: auth.entra()
      .tenant('test-tenant')
      .clientId('test-client-id')
  });

  return defineBackend({
    schema,
    authentication,
    settings: { name: 'complex-backend' }
  });
}
```

### Mock Azure Services

```typescript
// azure-mocks.ts
import { vi } from 'vitest';

/**
 * Mock Cosmos DB client
 */
export function createMockCosmosClient() {
  return {
    database: vi.fn(() => ({
      container: vi.fn(() => ({
        items: {
          create: vi.fn().mockResolvedValue({ resource: {} }),
          query: vi.fn(() => ({
            fetchAll: vi.fn().mockResolvedValue({ resources: [] })
          }))
        },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: {} }),
          replace: vi.fn().mockResolvedValue({ resource: {} }),
          delete: vi.fn().mockResolvedValue({})
        }))
      }))
    }))
  };
}

/**
 * Mock Storage Blob client
 */
export function createMockBlobClient() {
  return {
    getContainerClient: vi.fn(() => ({
      createIfNotExists: vi.fn().mockResolvedValue({}),
      getBlockBlobClient: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({}),
        download: vi.fn().mockResolvedValue({
          readableStreamBody: Buffer.from('test data')
        })
      }))
    }))
  };
}

/**
 * Mock Queue client
 */
export function createMockQueueClient() {
  return {
    createIfNotExists: vi.fn().mockResolvedValue({}),
    sendMessage: vi.fn().mockResolvedValue({}),
    receiveMessages: vi.fn().mockResolvedValue({
      receivedMessageItems: []
    }),
    deleteMessage: vi.fn().mockResolvedValue({})
  };
}
```

### Test Helpers

```typescript
// test-helpers.ts
import { CosmosClient } from '@azure/cosmos';
import { BlobServiceClient } from '@azure/storage-blob';

/**
 * Wait for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await sleep(delayMs * Math.pow(2, i));
      }
    }
  }

  throw lastError!;
}

/**
 * Clean up test resources
 */
export async function cleanupTestResources(
  resourceGroupName: string
): Promise<void> {
  // Only clean up in test environment
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Cleanup only allowed in test environment');
  }

  // Delete resource group
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);

  await execPromise(
    `az group delete --name ${resourceGroupName} --yes --no-wait`
  );
}

/**
 * Generate random resource name
 */
export function randomResourceName(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `${prefix}-${timestamp}-${random}`;
}
```

---

## Integration Testing with Azure

Test actual deployment to Azure (requires Azure subscription).

### Setup

```typescript
// integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { defineBackend } from '@atakora/component';
import { synthesize, deploy } from '@atakora/component';
import { createTestBackend, cleanupTestResources, randomResourceName } from './test-helpers';

describe('Azure Integration Tests', () => {
  let backend: ReturnType<typeof defineBackend>;
  let resourceGroupName: string;

  beforeAll(async () => {
    // Skip if not in CI or explicit integration test run
    if (!process.env.RUN_INTEGRATION_TESTS) {
      console.log('Skipping integration tests (set RUN_INTEGRATION_TESTS=true to run)');
      return;
    }

    resourceGroupName = randomResourceName('atakora-test');

    backend = createTestBackend({
      settings: {
        name: 'integration-test',
        resourceGroup: resourceGroupName
      }
    });

    // Create resource group
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);

    await execPromise(
      `az group create --name ${resourceGroupName} --location eastus`
    );
  }, 60000);  // 60 second timeout

  afterAll(async () => {
    if (process.env.RUN_INTEGRATION_TESTS && resourceGroupName) {
      await cleanupTestResources(resourceGroupName);
    }
  }, 120000);  // 2 minute timeout

  it('should deploy backend to Azure', async () => {
    if (!process.env.RUN_INTEGRATION_TESTS) return;

    // Synthesize
    await synthesize(backend, { output: './.test-synth' });

    // Deploy
    const result = await deploy(backend, {
      templateFile: './.test-synth/template.json',
      parametersFile: './.test-synth/parameters.development.json',
      resourceGroup: resourceGroupName
    });

    expect(result.provisioningState).toBe('Succeeded');
  }, 300000);  // 5 minute timeout

  it('should create Cosmos DB', async () => {
    if (!process.env.RUN_INTEGRATION_TESTS) return;

    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);

    const { stdout } = await execPromise(
      `az cosmosdb list --resource-group ${resourceGroupName} --output json`
    );

    const databases = JSON.parse(stdout);
    expect(databases.length).toBeGreaterThan(0);
  }, 60000);

  it('should create Function App', async () => {
    if (!process.env.RUN_INTEGRATION_TESTS) return;

    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);

    const { stdout } = await execPromise(
      `az functionapp list --resource-group ${resourceGroupName} --output json`
    );

    const functionApps = JSON.parse(stdout);
    expect(functionApps.length).toBeGreaterThan(0);
  }, 60000);
});
```

---

## Performance Testing

Test synthesis and deployment performance.

### Synthesis Benchmarks

```typescript
// synthesis.bench.ts
import { bench, describe } from 'vitest';
import { synthesize } from '@atakora/component/synthesis';
import { createTestBackend, createComplexBackend } from './test-fixtures';

describe('Synthesis Performance', () => {
  bench('synthesize simple backend', async () => {
    const backend = createTestBackend();
    await synthesize(backend, { output: './.bench-synth' });
  });

  bench('synthesize complex backend', async () => {
    const backend = createComplexBackend();
    await synthesize(backend, { output: './.bench-synth' });
  });

  bench('synthesize with cache', async () => {
    const backend = createTestBackend();
    await synthesize(backend, { output: './.bench-synth', cache: true });
  });
});
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Test Backend

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Run synthesis tests
        run: npm run test:synthesis

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/coverage-final.json

  integration:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Azure Login
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Install dependencies
        run: npm ci

      - name: Run integration tests
        run: npm run test:integration
        env:
          RUN_INTEGRATION_TESTS: true
          AZURE_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
```

### Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run --reporter=verbose",
    "test:synthesis": "vitest run --config vitest.synthesis.config.ts",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## Best Practices

### 1. Test at Multiple Levels

```typescript
// Unit tests - fast, isolated
describe('Backend Configuration', () => {
  it('should create backend', () => {
    const backend = createTestBackend();
    expect(backend).toBeDefined();
  });
});

// Integration tests - synthesis output
describe('Synthesis Output', () => {
  it('should generate ARM template', async () => {
    await synthesize(backend);
    // Verify template structure
  });
});

// E2E tests - actual deployment (CI only)
describe('Deployment', () => {
  it('should deploy to Azure', async () => {
    // Only run in CI
    if (!process.env.CI) return;
    await deploy(backend);
  });
});
```

### 2. Use Test Fixtures

Reuse common test setups:

```typescript
import { createTestBackend } from './test-fixtures';

// Don't repeat yourself
const backend = createTestBackend({ name: 'test' });
```

### 3. Mock External Services

Don't hit real Azure services in unit tests:

```typescript
import { createMockCosmosClient } from './azure-mocks';

vi.mock('@azure/cosmos', () => ({
  CosmosClient: createMockCosmosClient
}));
```

### 4. Clean Up After Tests

Always clean up test resources:

```typescript
afterEach(async () => {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true });
  }
});
```

### 5. Test Error Cases

Don't just test happy paths:

```typescript
it('should reject invalid attachment', () => {
  expect(() => {
    backend.storage.database.attach(null);
  }).toThrow('Cannot attach null');
});
```

---

## Next Steps

- [Attachment Points Guide](./attachment-points.md) - Test attachment configurations
- [Synthesis Guide](./synthesis.md) - Understand synthesis output
- [Examples](../../examples/testing) - Working test examples

---

**Run all tests:**

```bash
npm test
```
