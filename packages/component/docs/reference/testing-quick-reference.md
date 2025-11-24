# Testing Quick Reference Card

Quick reference for using the test infrastructure in Phase 1 implementation.

## Quick Commands

```bash
# Local Development
npm run emulators:start        # Start Cosmos DB + Azurite
npm run emulators:logs         # View emulator logs
npm run emulators:stop         # Stop emulators

# Running Tests
npm test                       # Unit tests
npm run test:watch             # Watch mode
npm run test:coverage          # With coverage report
npm run test:integration       # Integration tests (needs emulators)
npm run test:bench             # Performance benchmarks

# Build
npm run build                  # Compile TypeScript
npm run clean                  # Clean build artifacts
```

## Test Imports

```typescript
// Test helpers
import {
  CosmosTestHelper,
  StorageTestHelper,
  MockInsightsClient,
  createIntegrationTestHelper,
  benchmark,
  PerformanceAssertions,
} from './__tests__/helpers';

// Test fixtures
import {
  createTestUserContext,
  createTestExecutionContext,
  createSampleUser,
  createTestBlobContent,
} from './__tests__/fixtures';
```

## Unit Test Template

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('MyFeature', () => {
  it('should do something', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = myFunction(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

## Integration Test Template

```typescript
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { createIntegrationTestHelper } from './__tests__/helpers';

describe('MyFeature Integration', () => {
  const helper = createIntegrationTestHelper({
    testName: 'my-feature',
    cosmos: { containers: [{ id: 'users', partitionKey: '/id' }] },
    storage: { containers: ['files'] },
    insights: true,
  });

  beforeAll(async () => await helper.setup(), 60000);
  afterAll(async () => await helper.teardown(), 60000);
  beforeEach(async () => await helper.clearAllData());

  it('should work', async () => {
    const cosmos = helper.getCosmos();
    const storage = helper.getStorage();
    const insights = helper.getInsights();

    // Your test code
  });
});
```

## Performance Benchmark Template

```typescript
import { describe, bench, beforeAll, afterAll } from 'vitest';
import { benchmark, PerformanceAssertions } from './__tests__/helpers';

describe('MyFeature Performance', () => {
  bench('operation performance', async () => {
    const result = await benchmark(
      {
        name: 'MyOperation',
        iterations: 100,
        warmupIterations: 10,
      },
      async () => {
        // Operation to benchmark
      }
    );

    // Assert performance
    PerformanceAssertions.assertP95Latency(result.stats, 100);
  });
});
```

## Common Test Patterns

### Creating Test Data

```typescript
// User contexts
const user = createTestUserContext();
const admin = createTestUserContext({ roles: ['admin'] });

// Execution context
const execCtx = createTestExecutionContext();

// Sample models
const user = createSampleUser({ email: 'test@example.com' });
const product = createSampleProduct({ price: 99.99 });

// Blob content
const blob = createTestBlobContent({ content: 'test data' });
const largeBlog = createLargeBlobContent(10); // 10MB
```

### Cosmos DB Operations

```typescript
const cosmos = helper.getCosmos();
const container = cosmos.getContainer('users');

// Create
await container.items.create({ id: '123', name: 'Test' });

// Read
const { resource } = await container.item('123', '123').read();

// Query
const { resources } = await container.items
  .query({
    query: 'SELECT * FROM c WHERE c.status = @status',
    parameters: [{ name: '@status', value: 'active' }],
  })
  .fetchAll();

// Update
await container.item('123', '123').replace({ id: '123', name: 'Updated' });

// Delete
await container.item('123', '123').delete();
```

### Storage Operations

```typescript
const storage = helper.getStorage();

// Upload
await storage.uploadBlob('container', 'file.txt', 'content');

// Download
const content = await storage.downloadBlob('container', 'file.txt');

// Check existence
const exists = await storage.blobExists('container', 'file.txt');

// Delete
await storage.deleteBlob('container', 'file.txt');
```

### Application Insights

```typescript
const insights = helper.getInsights();

// Track events
insights.trackEvent('UserCreated', { userId: '123' });

// Track traces
insights.trackTrace('Debug message', LogLevel.Info);

// Track exceptions
insights.trackException(error, LogLevel.Error);

// Assert in tests
const assertions = createTelemetryAssertions(insights);
assertions.assertEventTracked('UserCreated', { userId: '123' });
assertions.assertTraceLogged('Debug message');
```

### Performance Assertions

```typescript
// Latency
PerformanceAssertions.assertP95Latency(stats, 100); // <100ms p95
PerformanceAssertions.assertMeanLatency(stats, 50); // <50ms mean

// Throughput
PerformanceAssertions.assertThroughput(throughput, 100); // >100 ops/sec
```

## Coverage Requirements

| Component        | Target |
| ---------------- | ------ |
| Database Client  | 90%+   |
| Storage Client   | 90%+   |
| Logger           | 85%+   |
| Service Registry | 85%+   |
| Overall Package  | 85%+   |

## Performance Targets

| Operation           | Target     |
| ------------------- | ---------- |
| Database Point Read | <100ms p95 |
| Database Query      | <200ms p95 |
| Database Write      | <150ms p95 |
| Blob Upload         | >10MB/s    |
| Blob Download       | >10MB/s    |
| Logger Overhead     | <5ms       |

## Emulator Endpoints

### Cosmos DB Emulator

```
Endpoint: https://localhost:8081
Key: C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==
Data Explorer: https://localhost:8081/_explorer/index.html
```

### Azurite (Storage)

```
Account Name: devstoreaccount1
Account Key: Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==
Blob Endpoint: http://127.0.0.1:10000/devstoreaccount1
Queue Endpoint: http://127.0.0.1:10001/devstoreaccount1
Table Endpoint: http://127.0.0.1:10002/devstoreaccount1
```

## Troubleshooting

### Emulators not starting

```bash
# Check Docker is running
docker ps

# Check logs
npm run emulators:logs

# Restart emulators
npm run emulators:stop
npm run emulators:start
```

### Tests timing out

```bash
# Increase timeout in test file
it('should work', async () => {
  // test code
}, 60000); // 60 second timeout
```

### Port conflicts

```bash
# Find process using port
lsof -i :8081  # Cosmos
lsof -i :10000 # Azurite

# Kill process
kill -9 <PID>
```

### Clean slate

```bash
# Full reset
npm run emulators:stop
docker system prune -f
npm run emulators:start
```

## File Locations

```
packages/component/
├── docker-compose.test.yml           # Emulator configuration
├── vitest.config.ts                  # Unit test config
├── vitest.integration.config.ts      # Integration test config
├── src/functions/__tests__/
│   ├── README.md                     # Full testing guide
│   ├── helpers/
│   │   ├── index.ts                  # Helper exports
│   │   ├── cosmos-test-helper.ts     # Cosmos DB helper
│   │   ├── storage-test-helper.ts    # Storage helper
│   │   ├── insights-test-helper.ts   # App Insights mock
│   │   ├── integration-helper.ts     # Combined helper
│   │   └── performance-helper.ts     # Performance utilities
│   ├── fixtures/
│   │   ├── index.ts                  # Fixture exports
│   │   └── test-data-factory.ts      # Test data factories
│   ├── integration/
│   │   └── example.integration.test.ts
│   └── benchmarks/
│       └── example.bench.ts
└── TEST_INFRASTRUCTURE_SETUP.md      # Setup documentation
```

## More Help

- Full guide: `src/functions/__tests__/README.md`
- Setup docs: `TEST_INFRASTRUCTURE_SETUP.md`
- Example tests: `src/functions/__tests__/integration/example.integration.test.ts`
- Contact: Charlie (Quality Lead)
