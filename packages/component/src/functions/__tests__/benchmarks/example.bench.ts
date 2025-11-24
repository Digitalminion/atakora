/**
 * Example Performance Benchmark
 *
 * @remarks
 * Demonstrates how to use the performance testing infrastructure.
 * Benchmarks should measure critical path operations.
 */

import { describe, bench, beforeAll, afterAll } from 'vitest';
import {
  benchmark,
  PerformanceAssertions,
  formatBenchmarkResult,
} from '../helpers/performance-helper';
import { createIntegrationTestHelper } from '../helpers/integration-helper';
import { createSampleUser, createTestBlobContent } from '../fixtures/test-data-factory';

describe('Performance Benchmarks', () => {
  const helper = createIntegrationTestHelper({
    testName: 'performance-bench',
    cosmos: {
      containers: [{ id: 'users', partitionKey: '/id' }],
    },
    storage: {
      containers: ['bench-files'],
    },
  });

  let testUserId: string;

  beforeAll(async () => {
    await helper.setup();

    // Seed test data
    const cosmos = helper.getCosmos();
    const container = cosmos.getContainer('users');

    // Create test user for read benchmarks
    const user = createSampleUser();
    testUserId = user.id;
    await container.items.create(user);

    // Seed additional users for query benchmarks
    const users = Array.from({ length: 100 }, (_, i) =>
      createSampleUser({ name: `Bench User ${i}` })
    );
    for (const u of users) {
      await container.items.create(u);
    }
  }, 120000);

  afterAll(async () => {
    await helper.teardown();
  }, 60000);

  describe('Cosmos DB Read Performance', () => {
    bench(
      'single item read (point read)',
      async () => {
        const cosmos = helper.getCosmos();
        const container = cosmos.getContainer('users');
        await container.item(testUserId, testUserId).read();
      },
      {
        iterations: 100,
        warmupIterations: 10,
      }
    );

    bench(
      'query items',
      async () => {
        const cosmos = helper.getCosmos();
        const container = cosmos.getContainer('users');
        await container.items
          .query({
            query: 'SELECT * FROM c WHERE c.status = @status',
            parameters: [{ name: '@status', value: 'active' }],
          })
          .fetchAll();
      },
      {
        iterations: 50,
        warmupIterations: 5,
      }
    );
  });

  describe('Cosmos DB Write Performance', () => {
    bench(
      'create item',
      async () => {
        const cosmos = helper.getCosmos();
        const container = cosmos.getContainer('users');
        const user = createSampleUser();
        await container.items.create(user);
      },
      {
        iterations: 50,
        warmupIterations: 5,
      }
    );

    bench(
      'update item',
      async () => {
        const cosmos = helper.getCosmos();
        const container = cosmos.getContainer('users');
        const updatedUser = { ...createSampleUser(), id: testUserId };
        await container.item(testUserId, testUserId).replace(updatedUser);
      },
      {
        iterations: 50,
        warmupIterations: 5,
      }
    );
  });

  describe('Storage Performance', () => {
    bench(
      'upload small blob (1KB)',
      async () => {
        const storage = helper.getStorage();
        const blob = createTestBlobContent({
          content: Buffer.alloc(1024, 'x'),
        });
        await storage.uploadBlob('bench-files', blob.name, blob.content);
      },
      {
        iterations: 50,
        warmupIterations: 5,
      }
    );

    bench(
      'upload medium blob (100KB)',
      async () => {
        const storage = helper.getStorage();
        const blob = createTestBlobContent({
          content: Buffer.alloc(100 * 1024, 'x'),
        });
        await storage.uploadBlob('bench-files', blob.name, blob.content);
      },
      {
        iterations: 20,
        warmupIterations: 3,
      }
    );

    bench(
      'download blob',
      async () => {
        const storage = helper.getStorage();
        await storage.downloadBlob('bench-files', 'test-download.bin');
      },
      {
        iterations: 50,
        warmupIterations: 5,
        setup: async () => {
          // Setup: Upload a test blob
          const storage = helper.getStorage();
          await storage.uploadBlob(
            'bench-files',
            'test-download.bin',
            Buffer.alloc(10 * 1024, 'x')
          );
        },
      }
    );
  });
});

/**
 * Custom benchmark assertions
 *
 * These tests verify performance requirements for Phase 1.
 */
describe('Performance Assertions', () => {
  const helper = createIntegrationTestHelper({
    testName: 'perf-assertions',
    cosmos: {
      containers: [{ id: 'users', partitionKey: '/id' }],
    },
    storage: {
      containers: ['perf-files'],
    },
  });

  let testUserId: string;

  beforeAll(async () => {
    await helper.setup();

    // Seed test data
    const cosmos = helper.getCosmos();
    const container = cosmos.getContainer('users');
    const user = createSampleUser();
    testUserId = user.id;
    await container.items.create(user);
  }, 60000);

  afterAll(async () => {
    await helper.teardown();
  }, 60000);

  bench('database read latency p95 < 100ms', async () => {
    const cosmos = helper.getCosmos();
    const container = cosmos.getContainer('users');

    const result = await benchmark(
      {
        name: 'Database Read',
        iterations: 100,
      },
      async () => {
        await container.item(testUserId, testUserId).read();
      }
    );

    // Assert p95 latency < 100ms
    PerformanceAssertions.assertP95Latency(result.stats, 100);

    // Log results
    console.log(formatBenchmarkResult(result));
  });

  bench('blob upload throughput > 10MB/s', async () => {
    const storage = helper.getStorage();

    // Upload 10MB blob
    const blobSize = 10 * 1024 * 1024; // 10MB
    const blob = createTestBlobContent({
      content: Buffer.alloc(blobSize, 'x'),
    });

    const result = await benchmark(
      {
        name: 'Blob Upload',
        iterations: 5,
      },
      async () => {
        await storage.uploadBlob('perf-files', blob.name, blob.content);
      }
    );

    // Calculate throughput in MB/s
    const avgDurationSeconds = result.stats.mean / 1000;
    const throughputMBps = blobSize / 1024 / 1024 / avgDurationSeconds;

    // Assert throughput > 10MB/s
    if (throughputMBps < 10) {
      throw new Error(
        `Blob upload throughput below 10MB/s. Actual: ${throughputMBps.toFixed(2)} MB/s`
      );
    }

    // Log results
    console.log(formatBenchmarkResult(result));
    console.log(`Throughput: ${throughputMBps.toFixed(2)} MB/s`);
  });
});
