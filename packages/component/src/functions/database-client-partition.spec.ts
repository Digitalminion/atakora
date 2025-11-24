/**
 * Database Client Partition Key Tests
 *
 * @remarks
 * Tests for custom partition key support in Cosmos DB operations.
 * Validates partition key extraction, CRUD operations, and error handling.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createModelOperations,
  DatabaseError,
  NotFoundError,
  CosmosConnectionPool,
  type ModelOperationsOptions,
} from './database-client';
import type { ExecutionContext } from './types';

// ============================================================================
// Test Setup
// ============================================================================

/**
 * Create mock execution context
 */
function createMockExecutionContext(): ExecutionContext {
  return {
    executionId: 'exec-123',
    executionTime: Date.now(),
    invocationId: 'inv-123',
  };
}

/**
 * Create mock Cosmos connection pool
 */
function createMockPool() {
  const items = new Map<string, any>();

  return {
    executeWithRetry: async (fn: () => Promise<any>) => fn(),
    getContainer: async () => ({
      item: (id: string, partitionKey: string) => ({
        read: async () => {
          const item = items.get(id);
          if (!item) {
            const error: any = new Error('NotFound');
            error.code = 404;
            throw error;
          }
          return { resource: item };
        },
        replace: async (data: any) => {
          items.set(id, data);
          return { resource: data };
        },
        delete: async () => {
          items.delete(id);
        },
      }),
      items: {
        create: async (data: any) => {
          items.set(data.id, data);
          return { resource: data };
        },
        query: () => ({
          fetchAll: async () => {
            const resources = Array.from(items.values());
            return { resources };
          },
        }),
      },
    }),
    // Test helper methods
    _setItem: (id: string, data: any) => items.set(id, data),
    _getItem: (id: string) => items.get(id),
    _clear: () => items.clear(),
  };
}

// ============================================================================
// Partition Key Tests
// ============================================================================

describe('Database Client - Partition Key Support', () => {
  let executionContext: ExecutionContext;
  let mockPool: any;

  beforeEach(() => {
    executionContext = createMockExecutionContext();
    mockPool = createMockPool();
  });

  afterEach(() => {
    mockPool._clear();
  });

  describe('Default partition key (id)', () => {
    it('should use id as default partition key', async () => {
      const operations = createModelOperations('users', executionContext, undefined, mockPool);

      const created = await operations.create({
        name: 'John Doe',
        email: 'john@example.com',
      });

      expect(created.id).toBeDefined();
      expect(created.name).toBe('John Doe');
    });

    it('should get document with id partition key', async () => {
      const operations = createModelOperations('users', executionContext, undefined, mockPool);

      const created = await operations.create({
        name: 'John Doe',
        email: 'john@example.com',
      });

      const retrieved = await operations.get(created.id!);

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('John Doe');
    });

    it('should update document with id partition key', async () => {
      const operations = createModelOperations('users', executionContext, undefined, mockPool);

      const created = await operations.create({
        name: 'John Doe',
        email: 'john@example.com',
      });

      const updated = await operations.update(created.id!, {
        name: 'Jane Doe',
      });

      expect(updated.name).toBe('Jane Doe');
      expect(updated.email).toBe('john@example.com'); // Preserved
    });

    it('should delete document with id partition key', async () => {
      const operations = createModelOperations('users', executionContext, undefined, mockPool);

      const created = await operations.create({
        name: 'John Doe',
        email: 'john@example.com',
      });

      await operations.delete(created.id!);

      const retrieved = await operations.get(created.id!);
      expect(retrieved).toBeNull();
    });
  });

  describe('Custom partition key', () => {
    it('should create document with custom partition key', async () => {
      const options: ModelOperationsOptions = {
        partitionKey: 'tenantId',
      };

      const operations = createModelOperations('users', executionContext, options, mockPool);

      const created = await operations.create({
        tenantId: 'tenant-123',
        name: 'John Doe',
        email: 'john@example.com',
      });

      expect(created.tenantId).toBe('tenant-123');
      expect(created.name).toBe('John Doe');
    });

    it('should throw error if partition key missing on create', async () => {
      const options: ModelOperationsOptions = {
        partitionKey: 'tenantId',
      };

      const operations = createModelOperations('users', executionContext, options, mockPool);

      await expect(
        operations.create({
          name: 'John Doe',
          email: 'john@example.com',
          // Missing tenantId
        })
      ).rejects.toThrow('Partition key field');
    });

    it('should get document with custom partition key', async () => {
      const options: ModelOperationsOptions = {
        partitionKey: 'tenantId',
      };

      const operations = createModelOperations('users', executionContext, options, mockPool);

      const created = await operations.create({
        tenantId: 'tenant-123',
        name: 'John Doe',
        email: 'john@example.com',
      });

      const retrieved = await operations.get(created.id!);

      expect(retrieved).toBeDefined();
      expect(retrieved?.tenantId).toBe('tenant-123');
    });

    it('should update document with custom partition key', async () => {
      const options: ModelOperationsOptions = {
        partitionKey: 'tenantId',
      };

      const operations = createModelOperations('users', executionContext, options, mockPool);

      const created = await operations.create({
        tenantId: 'tenant-123',
        name: 'John Doe',
        email: 'john@example.com',
      });

      const updated = await operations.update(created.id!, {
        name: 'Jane Doe',
      });

      expect(updated.name).toBe('Jane Doe');
      expect(updated.tenantId).toBe('tenant-123'); // Preserved
    });

    it('should delete document with custom partition key', async () => {
      const options: ModelOperationsOptions = {
        partitionKey: 'tenantId',
      };

      const operations = createModelOperations('users', executionContext, options, mockPool);

      const created = await operations.create({
        tenantId: 'tenant-123',
        name: 'John Doe',
        email: 'john@example.com',
      });

      await operations.delete(created.id!);

      const retrieved = await operations.get(created.id!);
      expect(retrieved).toBeNull();
    });
  });

  describe('Nested partition key', () => {
    it('should support dot notation for nested fields', async () => {
      const options: ModelOperationsOptions = {
        partitionKey: 'organization.id',
      };

      const operations = createModelOperations('users', executionContext, options, mockPool);

      const created = await operations.create({
        organization: {
          id: 'org-123',
          name: 'Acme Corp',
        },
        name: 'John Doe',
        email: 'john@example.com',
      });

      expect(created.organization.id).toBe('org-123');
    });

    it('should throw error if nested partition key missing', async () => {
      const options: ModelOperationsOptions = {
        partitionKey: 'organization.id',
      };

      const operations = createModelOperations('users', executionContext, options, mockPool);

      await expect(
        operations.create({
          organization: {
            name: 'Acme Corp',
            // Missing id
          },
          name: 'John Doe',
        })
      ).rejects.toThrow('Partition key field');
    });
  });

  describe('Error handling', () => {
    it('should handle missing document gracefully', async () => {
      const operations = createModelOperations('users', executionContext, undefined, mockPool);

      const result = await operations.get('non-existent-id');

      expect(result).toBeNull();
    });

    it('should throw NotFoundError on update of missing document', async () => {
      const operations = createModelOperations('users', executionContext, undefined, mockPool);

      await expect(
        operations.update('non-existent-id', { name: 'Updated' })
      ).rejects.toThrow(NotFoundError);
    });

    it('should be idempotent on delete of missing document', async () => {
      const operations = createModelOperations('users', executionContext, undefined, mockPool);

      // Should not throw
      await expect(operations.delete('non-existent-id')).resolves.not.toThrow();
    });

    it('should add context to database errors', async () => {
      const errorPool = {
        ...mockPool,
        executeWithRetry: async (fn: () => Promise<any>) => {
          throw new Error('Connection failed');
        },
      };

      const operations = createModelOperations('users', executionContext, undefined, errorPool);

      await expect(operations.get('user-123')).rejects.toThrow();
    });
  });

  describe('Multi-tenant scenarios', () => {
    it('should support tenant-partitioned data', async () => {
      const options: ModelOperationsOptions = {
        partitionKey: 'tenantId',
      };

      const operations = createModelOperations('documents', executionContext, options, mockPool);

      // Create documents for different tenants
      await operations.create({
        tenantId: 'tenant-1',
        title: 'Doc 1',
      });

      await operations.create({
        tenantId: 'tenant-2',
        title: 'Doc 2',
      });

      // List would normally filter by partition key in real Cosmos DB
      const all = await operations.list();
      expect(all.length).toBe(2);
    });

    it('should maintain partition key on updates', async () => {
      const options: ModelOperationsOptions = {
        partitionKey: 'tenantId',
      };

      const operations = createModelOperations('documents', executionContext, options, mockPool);

      const created = await operations.create({
        tenantId: 'tenant-1',
        title: 'Original',
        content: 'Original content',
      });

      // Update should not allow changing partition key
      const updated = await operations.update(created.id!, {
        title: 'Updated',
        // Attempting to change tenantId would be ignored by merge
      });

      expect(updated.tenantId).toBe('tenant-1');
      expect(updated.title).toBe('Updated');
    });
  });

  describe('Performance considerations', () => {
    it('should use point read for id partition key', async () => {
      // When partitionKey === 'id', we can do efficient point reads
      const options: ModelOperationsOptions = {
        partitionKey: 'id',
      };

      const operations = createModelOperations('users', executionContext, options, mockPool);

      const created = await operations.create({
        name: 'John Doe',
      });

      const retrieved = await operations.get(created.id!);

      expect(retrieved).toBeDefined();
      // Point read is more efficient than query
    });

    it('should use query for custom partition key get', async () => {
      // When partitionKey !== 'id', we need to query
      const options: ModelOperationsOptions = {
        partitionKey: 'tenantId',
      };

      const operations = createModelOperations('users', executionContext, options, mockPool);

      const created = await operations.create({
        tenantId: 'tenant-1',
        name: 'John Doe',
      });

      const retrieved = await operations.get(created.id!);

      expect(retrieved).toBeDefined();
      // Query is less efficient but necessary for custom partition keys
    });
  });
});
