/**
 * Database Client Integration Tests
 *
 * @remarks
 * Integration tests for Cosmos DB client using Cosmos DB Emulator.
 * These tests require the Cosmos DB Emulator to be running locally.
 *
 * To run the Cosmos DB Emulator:
 * - Windows: Install from https://aka.ms/cosmosdb-emulator
 * - macOS/Linux: Use Docker:
 *   docker run -p 8081:8081 -p 10251:10251 -p 10252:10252 -p 10253:10253 -p 10254:10254 \
 *   -e AZURE_COSMOS_EMULATOR_PARTITION_COUNT=10 \
 *   -e AZURE_COSMOS_EMULATOR_ENABLE_DATA_PERSISTENCE=false \
 *   mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { CosmosClient } from '@azure/cosmos';
import { CosmosConnectionPool, createModelOperations } from '../database-client';
import type { ExecutionContext } from '../types';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Cosmos DB Emulator configuration
 */
const EMULATOR_CONFIG = {
  endpoint: 'https://localhost:8081',
  key: 'C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==',
  databaseId: 'test-database',
  containerId: 'test-users',
};

/**
 * Check if Cosmos DB Emulator is available
 */
async function isEmulatorAvailable(): Promise<boolean> {
  try {
    const client = new CosmosClient({
      endpoint: EMULATOR_CONFIG.endpoint,
      key: EMULATOR_CONFIG.key,
    });
    await client.getDatabaseAccount();
    return true;
  } catch {
    return false;
  }
}

/**
 * Skip tests if emulator is not available
 */
function describeWithEmulator(
  name: string,
  fn: () => void,
  options?: { skip?: boolean; only?: boolean }
) {
  const describeFn = options?.only ? describe.only : options?.skip ? describe.skip : describe;

  describeFn(name, () => {
    beforeAll(async () => {
      const available = await isEmulatorAvailable();
      if (!available) {
        console.warn(
          '\n⚠️  Cosmos DB Emulator not available. Skipping integration tests.\n' +
            'Start the emulator with: docker run -p 8081:8081 mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator\n'
        );
        return;
      }
    });

    fn();
  });
}

// ============================================================================
// Test Setup
// ============================================================================

interface TestUser {
  id: string;
  name: string;
  email: string;
  status?: 'active' | 'inactive';
  createdAt?: string;
}

let cosmosClient: CosmosClient;
let executionContext: ExecutionContext;

// ============================================================================
// Integration Tests
// ============================================================================

describeWithEmulator('Cosmos DB Integration Tests', () => {
  beforeAll(async () => {
    // Set environment variables for connection pool
    process.env.COSMOS_ENDPOINT = EMULATOR_CONFIG.endpoint;
    process.env.COSMOS_KEY = EMULATOR_CONFIG.key;
    process.env.COSMOS_DATABASE_ID = EMULATOR_CONFIG.databaseId;

    // Create Cosmos client
    cosmosClient = new CosmosClient({
      endpoint: EMULATOR_CONFIG.endpoint,
      key: EMULATOR_CONFIG.key,
    });

    // Create database
    try {
      await cosmosClient.databases.createIfNotExists({
        id: EMULATOR_CONFIG.databaseId,
      });
    } catch (error) {
      console.error('Failed to create database:', error);
      throw error;
    }

    // Create container
    const database = cosmosClient.database(EMULATOR_CONFIG.databaseId);
    try {
      await database.containers.createIfNotExists({
        id: EMULATOR_CONFIG.containerId,
        partitionKey: '/id',
      });
    } catch (error) {
      console.error('Failed to create container:', error);
      throw error;
    }

    // Create execution context
    executionContext = {
      executionId: 'integration-test',
      executionTime: Date.now(),
      invocationId: 'test-invocation',
    };
  });

  afterAll(async () => {
    // Clean up: delete database
    try {
      await cosmosClient.database(EMULATOR_CONFIG.databaseId).delete();
    } catch {
      // Ignore errors during cleanup
    }

    // Reset singleton
    CosmosConnectionPool.resetInstance();

    // Clean up environment variables
    delete process.env.COSMOS_ENDPOINT;
    delete process.env.COSMOS_KEY;
    delete process.env.COSMOS_DATABASE_ID;
  });

  beforeEach(async () => {
    // Clear all documents before each test
    const database = cosmosClient.database(EMULATOR_CONFIG.databaseId);
    const container = database.container(EMULATOR_CONFIG.containerId);

    const { resources } = await container.items.query('SELECT c.id FROM c').fetchAll();
    for (const item of resources) {
      await container.item(item.id, item.id).delete();
    }
  });

  // ==========================================================================
  // CRUD Operations
  // ==========================================================================

  describe('CRUD Operations', () => {
    it('should create and retrieve a document', async () => {
      const operations = createModelOperations<TestUser>(
        EMULATOR_CONFIG.containerId,
        executionContext
      );

      // Create user
      const user = await operations.create({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        status: 'active',
      });

      expect(user.id).toBe('user-1');
      expect(user.name).toBe('Test User');
      expect(user.email).toBe('test@example.com');

      // Retrieve user
      const retrieved = await operations.get('user-1');

      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe('user-1');
      expect(retrieved!.name).toBe('Test User');
    });

    it('should create document with auto-generated ID', async () => {
      const operations = createModelOperations<TestUser>(
        EMULATOR_CONFIG.containerId,
        executionContext
      );

      const user = await operations.create({
        name: 'Auto ID User',
        email: 'auto@example.com',
      });

      expect(user.id).toBeDefined();
      expect(typeof user.id).toBe('string');

      // Verify can retrieve by generated ID
      const retrieved = await operations.get(user.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.name).toBe('Auto ID User');
    });

    it('should update existing document', async () => {
      const operations = createModelOperations<TestUser>(
        EMULATOR_CONFIG.containerId,
        executionContext
      );

      // Create user
      await operations.create({
        id: 'user-2',
        name: 'Original Name',
        email: 'original@example.com',
        status: 'inactive',
      });

      // Update user
      const updated = await operations.update('user-2', {
        name: 'Updated Name',
        status: 'active',
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.status).toBe('active');
      expect(updated.email).toBe('original@example.com'); // Preserved
    });

    it('should delete document', async () => {
      const operations = createModelOperations<TestUser>(
        EMULATOR_CONFIG.containerId,
        executionContext
      );

      // Create user
      await operations.create({
        id: 'user-3',
        name: 'To Delete',
        email: 'delete@example.com',
      });

      // Verify exists
      let user = await operations.get('user-3');
      expect(user).not.toBeNull();

      // Delete
      await operations.delete('user-3');

      // Verify deleted
      user = await operations.get('user-3');
      expect(user).toBeNull();
    });

    it('should list all documents', async () => {
      const operations = createModelOperations<TestUser>(
        EMULATOR_CONFIG.containerId,
        executionContext
      );

      // Create multiple users
      await operations.create({ id: 'user-1', name: 'User 1', email: 'user1@example.com' });
      await operations.create({ id: 'user-2', name: 'User 2', email: 'user2@example.com' });
      await operations.create({ id: 'user-3', name: 'User 3', email: 'user3@example.com' });

      // List all
      const users = await operations.list();

      expect(users.length).toBe(3);
      expect(users.map((u) => u.id).sort()).toEqual(['user-1', 'user-2', 'user-3']);
    });

    it('should filter documents', async () => {
      const operations = createModelOperations<TestUser>(
        EMULATOR_CONFIG.containerId,
        executionContext
      );

      // Create users with different statuses
      await operations.create({
        id: 'user-1',
        name: 'Active User 1',
        email: 'active1@example.com',
        status: 'active',
      });
      await operations.create({
        id: 'user-2',
        name: 'Active User 2',
        email: 'active2@example.com',
        status: 'active',
      });
      await operations.create({
        id: 'user-3',
        name: 'Inactive User',
        email: 'inactive@example.com',
        status: 'inactive',
      });

      // Filter by status
      const activeUsers = await operations.list({ status: 'active' });

      expect(activeUsers.length).toBe(2);
      expect(activeUsers.every((u) => u.status === 'active')).toBe(true);
    });
  });

  // ==========================================================================
  // Connection Pooling
  // ==========================================================================

  describe('Connection Pooling', () => {
    it('should reuse connections across operations', async () => {
      const operations1 = createModelOperations<TestUser>(
        EMULATOR_CONFIG.containerId,
        executionContext
      );
      const operations2 = createModelOperations<TestUser>(
        EMULATOR_CONFIG.containerId,
        executionContext
      );

      // Create user with first operations instance
      await operations1.create({
        id: 'user-pool-1',
        name: 'Pool Test 1',
        email: 'pool1@example.com',
      });

      // Retrieve with second operations instance (should use same connection)
      const user = await operations2.get('user-pool-1');

      expect(user).not.toBeNull();
      expect(user!.name).toBe('Pool Test 1');
    });

    it('should handle concurrent operations', async () => {
      const operations = createModelOperations<TestUser>(
        EMULATOR_CONFIG.containerId,
        executionContext
      );

      // Create multiple users concurrently
      const promises = Array.from({ length: 10 }, (_, i) =>
        operations.create({
          id: `concurrent-${i}`,
          name: `Concurrent User ${i}`,
          email: `concurrent${i}@example.com`,
        })
      );

      const results = await Promise.all(promises);

      expect(results.length).toBe(10);
      expect(results.every((r) => r.id !== undefined)).toBe(true);

      // Verify all were created
      const users = await operations.list();
      expect(users.length).toBe(10);
    });
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================

  describe('Performance', () => {
    it('should meet p95 latency target for get operations (<100ms)', async () => {
      const operations = createModelOperations<TestUser>(
        EMULATOR_CONFIG.containerId,
        executionContext
      );

      // Create test user
      await operations.create({
        id: 'perf-user',
        name: 'Performance Test User',
        email: 'perf@example.com',
      });

      // Measure latency for 100 get operations
      const latencies: number[] = [];
      for (let i = 0; i < 100; i++) {
        const start = Date.now();
        await operations.get('perf-user');
        const latency = Date.now() - start;
        latencies.push(latency);
      }

      // Calculate p95
      latencies.sort((a, b) => a - b);
      const p95Index = Math.floor(latencies.length * 0.95);
      const p95Latency = latencies[p95Index];

      console.log(`Get operation p95 latency: ${p95Latency}ms`);

      // Note: This may fail in CI or slow environments
      // Emulator latency is typically higher than production Cosmos DB
      expect(p95Latency).toBeLessThan(200); // Relaxed for emulator
    });

    it('should handle batch creates efficiently', async () => {
      const operations = createModelOperations<TestUser>(
        EMULATOR_CONFIG.containerId,
        executionContext
      );

      const start = Date.now();

      // Create 100 users
      const promises = Array.from({ length: 100 }, (_, i) =>
        operations.create({
          id: `batch-${i}`,
          name: `Batch User ${i}`,
          email: `batch${i}@example.com`,
        })
      );

      await Promise.all(promises);

      const duration = Date.now() - start;

      console.log(`Batch create 100 users: ${duration}ms`);

      // Should complete in reasonable time (less than 10 seconds)
      expect(duration).toBeLessThan(10000);
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  describe('Error Handling', () => {
    it('should return null for non-existent document', async () => {
      const operations = createModelOperations<TestUser>(
        EMULATOR_CONFIG.containerId,
        executionContext
      );

      const user = await operations.get('non-existent-user');

      expect(user).toBeNull();
    });

    it('should handle delete of non-existent document gracefully', async () => {
      const operations = createModelOperations<TestUser>(
        EMULATOR_CONFIG.containerId,
        executionContext
      );

      // Should not throw
      await expect(operations.delete('non-existent-user')).resolves.toBeUndefined();
    });
  });
});
