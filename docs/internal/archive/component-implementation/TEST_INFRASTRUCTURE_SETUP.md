# Test Infrastructure Setup - Phase 1 Complete

**Date**: 2025-11-22
**Owner**: Charlie (Quality Lead)
**Status**: Complete and Ready for Devon's Implementation

## Executive Summary

Comprehensive test infrastructure has been set up for Phase 1 implementation of the stub features. All test helpers, emulator configurations, CI/CD pipelines, and documentation are in place.

## What Was Created

### 1. Docker Compose Configuration

**File**: `/packages/component/docker-compose.test.yml`

Provides local emulator services:

- **Cosmos DB Emulator** (Linux version for cross-platform support)
  - Port 8081 for API
  - Ports 10251-10254 for internal communication
  - Health checks configured
  - Data persistence disabled for faster tests

- **Azurite (Storage Emulator)**
  - Port 10000 for Blob service
  - Port 10001 for Queue service
  - Port 10002 for Table service
  - Health checks configured
  - Persistent volume for data

### 2. Test Helpers

All helpers located in `/packages/component/src/functions/__tests__/helpers/`

#### Cosmos DB Helper (`cosmos-test-helper.ts`)

- **CosmosTestHelper class**: Manages database/container lifecycle
- **Features**:
  - Automatic setup/teardown of test databases
  - Container creation with partition keys
  - Data seeding utilities
  - Clear data between tests
  - Wait for emulator readiness
  - Unique test database ID generation
  - Test data factory integration

#### Storage Helper (`storage-test-helper.ts`)

- **StorageTestHelper class**: Manages blob storage lifecycle
- **Features**:
  - Automatic setup/teardown of test containers
  - Upload/download/delete blob operations
  - Blob existence checks
  - Clear containers between tests
  - Wait for Azurite readiness
  - Test blob name generation
  - Random test data generation

#### Application Insights Helper (`insights-test-helper.ts`)

- **MockInsightsClient class**: In-memory telemetry capture
- **TelemetryAssertions class**: Verify telemetry events
- **Features**:
  - Track all telemetry types (trace, event, metric, exception, dependency, request)
  - Query telemetry by type
  - Assert telemetry was logged correctly
  - Enable/disable telemetry capture
  - Clear telemetry between tests

#### Integration Helper (`integration-helper.ts`)

- **IntegrationTestHelper class**: Orchestrates all helpers
- **Features**:
  - Single setup/teardown for all resources
  - Access to all helpers (Cosmos, Storage, Insights)
  - Clear all data across all resources
  - Check if emulators are available
  - Skip tests if emulators not running

#### Performance Helper (`performance-helper.ts`)

- **PerformanceTimer class**: Measure execution time
- **PerformanceAssertions class**: Assert performance requirements
- **Features**:
  - Benchmark functions with warmup iterations
  - Calculate statistics (min, max, mean, median, p95, p99, stdDev)
  - Parallel and sequential execution modes
  - Throughput calculation
  - Memory usage tracking
  - Format benchmark results for display

### 3. Test Fixtures

Located in `/packages/component/src/functions/__tests__/fixtures/`

#### Test Data Factory (`test-data-factory.ts`)

- User context factories (test, admin, anonymous)
- Execution context factory
- Generic model factories
- Sample models (User, Product, Order)
- Blob content factories (text, binary, JSON, large files)
- Random data generators (string, number, email, ID)

### 4. Configuration Updates

#### Package.json Scripts

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest run --coverage",
  "test:integration": "vitest run --config vitest.integration.config.ts",
  "test:bench": "vitest bench",
  "emulators:start": "docker-compose -f docker-compose.test.yml up -d",
  "emulators:stop": "docker-compose -f docker-compose.test.yml down",
  "emulators:logs": "docker-compose -f docker-compose.test.yml logs -f"
}
```

#### Vitest Configuration Updates

- **Coverage thresholds increased**:
  - Lines: 85% (was 80%)
  - Functions: 85% (was 80%)
  - Branches: 80% (was 75%)
  - Statements: 85% (was 80%)

- **Timeouts increased for integration tests**:
  - Test timeout: 30 seconds (was 10)
  - Hook timeout: 30 seconds (was 10)
  - Teardown timeout: 30 seconds (was 10)

#### Integration Test Configuration

**File**: `/packages/component/vitest.integration.config.ts`

- Separate config for integration tests
- 60-second timeouts
- Sequential execution (single fork)
- Pattern matching for `*.integration.test.ts` files

### 5. CI/CD Pipeline Updates

**File**: `/.github/workflows/ci.yml`

#### Updated Test Job

- Added Azurite service container
- Health checks for emulator availability
- Runs unit tests with Azurite available

#### New Integration Tests Job

- Dedicated job for integration tests
- Starts Azurite in Docker
- Waits for readiness before running tests
- Automatic cleanup on completion

#### New Performance Tests Job

- Runs benchmarks on pull requests
- Uploads benchmark results as artifacts
- Tracks performance regressions

### 6. Documentation

#### Test Infrastructure Guide

**File**: `/packages/component/src/functions/__tests__/README.md`

Comprehensive guide covering:

- Quick start instructions
- How to run unit/integration/performance tests
- Emulator setup and configuration
- Test helper usage examples
- Test patterns and best practices
- Troubleshooting guide
- Coverage requirements
- CI/CD integration details

#### Setup Summary

**File**: `/packages/component/TEST_INFRASTRUCTURE_SETUP.md` (this file)

### 7. Example Tests

#### Integration Test Example

**File**: `/packages/component/src/functions/__tests__/integration/example.integration.test.ts`

Demonstrates:

- Cosmos DB CRUD operations
- Storage blob operations
- Application Insights telemetry tracking
- Combined integration scenarios
- Setup/teardown patterns
- Data clearing between tests

#### Performance Benchmark Example

**File**: `/packages/component/src/functions/__tests__/benchmarks/example.bench.ts`

Demonstrates:

- Database read/write benchmarks
- Storage upload/download benchmarks
- Performance assertions (p95 latency, throughput)
- Warmup iterations
- Benchmark result formatting

## How Developers Use This

### Local Development

#### Start Emulators

```bash
cd packages/component
npm run emulators:start

# Wait for emulators (check logs)
npm run emulators:logs
```

#### Run Tests

```bash
# Unit tests (fast, with mocks)
npm test

# Integration tests (requires emulators)
npm run test:integration

# Performance benchmarks
npm run test:bench

# All tests with coverage
npm run test:coverage
```

#### Stop Emulators

```bash
npm run emulators:stop
```

### Writing Tests

#### Unit Test (with mocks)

```typescript
import { describe, it, expect } from 'vitest';
import { createTestExecutionContext } from './fixtures';

describe('MyFeature', () => {
  it('should work', () => {
    const context = createTestExecutionContext();
    // Test with mocks
  });
});
```

#### Integration Test (with emulators)

```typescript
import { describe, it, beforeAll, afterAll } from 'vitest';
import { createIntegrationTestHelper } from './helpers';

describe('MyFeature Integration', () => {
  const helper = createIntegrationTestHelper({
    testName: 'my-feature',
    cosmos: {
      containers: [{ id: 'users', partitionKey: '/id' }],
    },
    storage: {
      containers: ['files'],
    },
    insights: true,
  });

  beforeAll(async () => await helper.setup());
  afterAll(async () => await helper.teardown());

  it('should work with real services', async () => {
    const cosmos = helper.getCosmos();
    // Test with real Cosmos DB
  });
});
```

#### Performance Benchmark

```typescript
import { describe, bench } from 'vitest';
import { benchmark, PerformanceAssertions } from './helpers';

describe('MyFeature Performance', () => {
  bench('operation latency', async () => {
    const result = await benchmark({ name: 'MyOperation', iterations: 100 }, async () => {
      // Operation to benchmark
    });

    PerformanceAssertions.assertP95Latency(result.stats, 100);
  });
});
```

## Phase 1 Coverage Requirements

### Overall Package Coverage

- Lines: 85%+
- Functions: 85%+
- Branches: 80%+
- Statements: 85%+

### Critical Runtime Code (Higher Bar)

- Database client: 90%+
- Storage client: 90%+
- Logger: 85%+
- Service registry: 85%+

## Performance Targets (Phase 1)

### Database Operations

- Point read latency (p95): <100ms
- Query latency (p95): <200ms
- Write latency (p95): <150ms

### Storage Operations

- Blob upload throughput: >10MB/s
- Blob download throughput: >10MB/s
- Small file operations (<1MB): <50ms p95

### Logger Operations

- Log statement overhead: <5ms
- Telemetry batching: No blocking

## Known Limitations

### Cosmos DB Emulator

- Self-signed SSL certificate (disabled in tests)
- Performance differs from production
- Some advanced features not available
- Requires ~4GB RAM and ~5GB disk space

### Azurite

- Some advanced storage features not available
- Performance characteristics differ from production
- Sufficient for integration testing

### CI/CD

- Cosmos DB emulator not included in CI (too resource-intensive)
- Azurite only for integration tests
- Full integration tests recommended locally before PR

## Next Steps for Devon

### Phase 1 Task 1.1: Cosmos DB Database Client

**What's Ready:**

- CosmosTestHelper with full setup/teardown
- Test data factories for models
- Integration test examples
- Performance benchmark examples
- CI/CD pipeline ready

**Implementation Steps:**

1. Update `packages/component/src/functions/context.ts`:
   - Implement `createDatabaseClient()` using @azure/cosmos SDK
   - Implement `createModelOperations()` with real CRUD operations
   - Add connection pooling and retry logic

2. Write unit tests:
   - Mock Cosmos SDK
   - Test CRUD operations in isolation
   - Test error handling

3. Write integration tests:
   - Use CosmosTestHelper
   - Test real CRUD operations
   - Test query operations
   - Test error scenarios

4. Write performance tests:
   - Benchmark point reads
   - Benchmark queries
   - Benchmark writes
   - Assert performance targets

5. Achieve 90%+ coverage

### Phase 1 Task 1.2: Blob Storage Client

**What's Ready:**

- StorageTestHelper with full setup/teardown
- Blob content factories
- Integration test examples
- Performance benchmark examples

**Implementation Steps:**

1. Update `packages/component/src/functions/context.ts`:
   - Implement `createStorageClient()` using @azure/storage-blob SDK
   - Implement `createBlobOperations()` with real operations
   - Add streaming support for large files

2. Write unit tests:
   - Mock Storage SDK
   - Test blob operations in isolation
   - Test error handling

3. Write integration tests:
   - Use StorageTestHelper
   - Test upload/download/delete operations
   - Test large file handling

4. Write performance tests:
   - Benchmark uploads (various sizes)
   - Benchmark downloads
   - Assert throughput targets

5. Achieve 90%+ coverage

### Phase 1 Task 1.3: Application Insights Logger

**What's Ready:**

- MockInsightsClient for unit tests
- TelemetryAssertions for verification
- Integration test patterns

**Implementation Steps:**

1. Update `packages/component/src/functions/context.ts`:
   - Implement `createLogger()` using @azure/monitor-opentelemetry
   - Add structured logging
   - Add correlation IDs
   - Add performance metrics

2. Write unit tests:
   - Use MockInsightsClient
   - Test all log levels
   - Test correlation ID propagation
   - Test custom properties

3. Write integration tests:
   - Test with real Application Insights (or mock)
   - Verify telemetry format

4. Achieve 85%+ coverage

## Success Criteria

### For This Setup (Complete)

- [x] Docker Compose configuration created
- [x] All test helpers implemented
- [x] Test fixtures created
- [x] Vitest configuration updated
- [x] CI/CD pipeline updated
- [x] Documentation written
- [x] Example tests created

### For Phase 1 Implementation (Next)

- [ ] All runtime clients implemented
- [ ] 90%+ coverage for database client
- [ ] 90%+ coverage for storage client
- [ ] 85%+ coverage for logger
- [ ] All integration tests passing
- [ ] All performance benchmarks passing
- [ ] CI/CD green

## Additional Resources

- [Cosmos DB Emulator Documentation](https://learn.microsoft.com/en-us/azure/cosmos-db/docker-emulator-linux)
- [Azurite Documentation](https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azurite)
- [Vitest Documentation](https://vitest.dev/)
- [Azure SDK for JavaScript](https://github.com/Azure/azure-sdk-for-js)

## Support

For questions about test infrastructure:

1. Check `/packages/component/src/functions/__tests__/README.md`
2. Review example tests
3. Contact Charlie (Quality Lead)
