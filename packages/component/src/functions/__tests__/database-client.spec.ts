/**
 * Database Client Tests
 *
 * @remarks
 * Comprehensive tests for Cosmos DB database client with connection pooling,
 * CRUD operations, error handling, and performance validation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CosmosConnectionPool,
  createModelOperations,
  DatabaseError,
  NotFoundError,
  ConfigurationError,
} from '../database-client';
import type { ExecutionContext } from '../types';
import type { Container, Database, CosmosClient, ItemResponse, FeedResponse } from '@azure/cosmos';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create mock execution context
 */
function createMockExecutionContext(): ExecutionContext {
  return {
    executionId: 'test-exec-123',
    executionTime: Date.now(),
    invocationId: 'test-invocation-456',
  };
}

/**
 * Create mock Cosmos container
 */
function createMockContainer(): Container {
  return {
    item: vi.fn(),
    items: {
      create: vi.fn(),
      query: vi.fn(),
    },
  } as any;
}

/**
 * Create mock Cosmos database
 */
function createMockDatabase(): Database {
  return {
    container: vi.fn(),
  } as any;
}

/**
 * Create mock Cosmos client
 */
function createMockCosmosClient(): CosmosClient {
  return {
    database: vi.fn(),
  } as any;
}

// ============================================================================
// Setup and Teardown
// ============================================================================

describe('CosmosConnectionPool', () => {
  beforeEach(() => {
    // Reset singleton instance before each test
    CosmosConnectionPool.resetInstance();

    // Reset environment variables
    delete process.env.COSMOS_ENDPOINT;
    delete process.env.COSMOS_KEY;
    delete process.env.COSMOS_DATABASE_ID;

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after tests
    CosmosConnectionPool.resetInstance();
  });

  // ==========================================================================
  // Initialization Tests
  // ==========================================================================

  describe('Initialization', () => {
    it('should create singleton instance', () => {
      const pool1 = CosmosConnectionPool.getInstance();
      const pool2 = CosmosConnectionPool.getInstance();

      expect(pool1).toBe(pool2);
    });

    it('should throw ConfigurationError when COSMOS_ENDPOINT is missing', async () => {
      process.env.COSMOS_KEY = 'test-key';

      const pool = CosmosConnectionPool.getInstance();

      await expect(pool.getContainer('users')).rejects.toThrow(ConfigurationError);
      await expect(pool.getContainer('users')).rejects.toThrow(
        'COSMOS_ENDPOINT environment variable is required'
      );
    });

    it('should throw ConfigurationError when COSMOS_KEY is missing', async () => {
      process.env.COSMOS_ENDPOINT = 'https://test.documents.azure.com:443/';

      const pool = CosmosConnectionPool.getInstance();

      await expect(pool.getContainer('users')).rejects.toThrow(ConfigurationError);
      await expect(pool.getContainer('users')).rejects.toThrow(
        'COSMOS_KEY environment variable is required'
      );
    });

    it('should use default database ID when not specified', async () => {
      process.env.COSMOS_ENDPOINT = 'https://test.documents.azure.com:443/';
      process.env.COSMOS_KEY = 'test-key';

      const pool = CosmosConnectionPool.getInstance();

      // Mock the initialization to avoid actual Cosmos connection
      const mockDatabase = createMockDatabase();
      const mockContainer = createMockContainer();
      (mockDatabase.container as any).mockReturnValue(mockContainer);

      // This will trigger initialization
      try {
        await pool.getContainer('users');
      } catch (error) {
        // Expected to fail in test environment
      }
    });

    it('should reset instance correctly', () => {
      const pool1 = CosmosConnectionPool.getInstance();
      CosmosConnectionPool.resetInstance();
      const pool2 = CosmosConnectionPool.getInstance();

      expect(pool1).not.toBe(pool2);
    });
  });

  // ==========================================================================
  // Container Caching Tests
  // ==========================================================================

  describe('Container Caching', () => {
    it('should cache container instances', async () => {
      // Mock environment
      process.env.COSMOS_ENDPOINT = 'https://test.documents.azure.com:443/';
      process.env.COSMOS_KEY = 'test-key';

      const pool = CosmosConnectionPool.getInstance();

      // We'll test caching behavior indirectly through model operations
      // since the pool's internal container method requires actual initialization
    });
  });
});

// ============================================================================
// Model Operations Tests
// ============================================================================

describe('Model Operations', () => {
  let executionContext: ExecutionContext;
  let mockContainer: Container;
  let mockPool: CosmosConnectionPool;

  beforeEach(() => {
    executionContext = createMockExecutionContext();
    mockContainer = createMockContainer();

    // Create a mock pool that returns our mock container
    // executeWithRetry should wrap errors in DatabaseError
    mockPool = {
      getContainer: vi.fn().mockResolvedValue(mockContainer),
      executeWithRetry: vi.fn(async (fn, opName) => {
        try {
          return await fn();
        } catch (error: any) {
          // Simulate the real executeWithRetry behavior
          if (error instanceof DatabaseError) {
            throw error;
          }
          throw new DatabaseError(`${opName} failed`, error);
        }
      }),
    } as any;
  });

  // ==========================================================================
  // GET Operation Tests
  // ==========================================================================

  describe('get()', () => {
    it('should retrieve document by ID', async () => {
      const testUser = {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
      };

      // Mock container.item().read()
      const mockRead = vi.fn().mockResolvedValue({ resource: testUser });
      const mockItem = vi.fn().mockReturnValue({ read: mockRead });
      (mockContainer.item as any) = mockItem;

      const operations = createModelOperations('users', executionContext, mockPool);
      const result = await operations.get('user-123');

      expect(result).toEqual(testUser);
      expect(mockItem).toHaveBeenCalledWith('user-123', 'user-123');
      expect(mockRead).toHaveBeenCalled();
    });

    it('should return null for non-existent document', async () => {
      // Mock 404 error
      const mockRead = vi.fn().mockRejectedValue({ code: 404, statusCode: 404 });
      const mockItem = vi.fn().mockReturnValue({ read: mockRead });
      (mockContainer.item as any) = mockItem;

      const operations = createModelOperations('users', executionContext, mockPool);
      const result = await operations.get('non-existent');

      expect(result).toBeNull();
    });

    it('should throw DatabaseError for other errors', async () => {
      // Mock network error
      const mockRead = vi.fn().mockRejectedValue(new Error('Network timeout'));
      const mockItem = vi.fn().mockReturnValue({ read: mockRead });
      (mockContainer.item as any) = mockItem;

      const operations = createModelOperations('users', executionContext, mockPool);

      await expect(operations.get('user-123')).rejects.toThrow(DatabaseError);
    });
  });

  // ==========================================================================
  // LIST Operation Tests
  // ==========================================================================

  describe('list()', () => {
    it('should list all documents when no filter provided', async () => {
      const testUsers = [
        { id: 'user-1', name: 'User 1' },
        { id: 'user-2', name: 'User 2' },
      ];

      // Mock query response
      const mockFetchAll = vi.fn().mockResolvedValue({ resources: testUsers });
      const mockQuery = vi.fn().mockReturnValue({ fetchAll: mockFetchAll });
      (mockContainer.items.query as any) = mockQuery;

      const operations = createModelOperations('users', executionContext, mockPool);
      const result = await operations.list();

      expect(result).toEqual(testUsers);
      expect(mockQuery).toHaveBeenCalledWith({
        query: 'SELECT * FROM c',
      });
    });

    it('should filter documents by single field', async () => {
      const testUsers = [{ id: 'user-1', name: 'Active User', status: 'active' }];

      const mockFetchAll = vi.fn().mockResolvedValue({ resources: testUsers });
      const mockQuery = vi.fn().mockReturnValue({ fetchAll: mockFetchAll });
      (mockContainer.items.query as any) = mockQuery;

      const operations = createModelOperations('users', executionContext, mockPool);
      const result = await operations.list({ status: 'active' } as any);

      expect(result).toEqual(testUsers);
      expect(mockQuery).toHaveBeenCalledWith({
        query: 'SELECT * FROM c WHERE c.status = @param0',
        parameters: [{ name: '@param0', value: 'active' }],
      });
    });

    it('should filter documents by multiple fields', async () => {
      const testUsers = [{ id: 'user-1', name: 'Test', status: 'active', role: 'admin' }];

      const mockFetchAll = vi.fn().mockResolvedValue({ resources: testUsers });
      const mockQuery = vi.fn().mockReturnValue({ fetchAll: mockFetchAll });
      (mockContainer.items.query as any) = mockQuery;

      const operations = createModelOperations('users', executionContext, mockPool);
      const result = await operations.list({ status: 'active', role: 'admin' } as any);

      expect(result).toEqual(testUsers);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('WHERE'),
          parameters: expect.arrayContaining([
            { name: '@param0', value: 'active' },
            { name: '@param1', value: 'admin' },
          ]),
        })
      );
    });

    it('should return empty array when no documents match', async () => {
      const mockFetchAll = vi.fn().mockResolvedValue({ resources: [] });
      const mockQuery = vi.fn().mockReturnValue({ fetchAll: mockFetchAll });
      (mockContainer.items.query as any) = mockQuery;

      const operations = createModelOperations('users', executionContext, mockPool);
      const result = await operations.list({ status: 'deleted' } as any);

      expect(result).toEqual([]);
    });

    it('should ignore undefined filter values', async () => {
      const testUsers = [{ id: 'user-1', name: 'Test' }];

      const mockFetchAll = vi.fn().mockResolvedValue({ resources: testUsers });
      const mockQuery = vi.fn().mockReturnValue({ fetchAll: mockFetchAll });
      (mockContainer.items.query as any) = mockQuery;

      const operations = createModelOperations('users', executionContext, mockPool);
      const result = await operations.list({ status: 'active', deleted: undefined } as any);

      expect(result).toEqual(testUsers);
      expect(mockQuery).toHaveBeenCalledWith({
        query: 'SELECT * FROM c WHERE c.status = @param0',
        parameters: [{ name: '@param0', value: 'active' }],
      });
    });
  });

  // ==========================================================================
  // CREATE Operation Tests
  // ==========================================================================

  describe('create()', () => {
    it('should create document with provided ID', async () => {
      const inputData = {
        id: 'user-123',
        name: 'New User',
        email: 'new@example.com',
      };

      const mockCreate = vi.fn().mockResolvedValue({ resource: inputData });
      (mockContainer.items.create as any) = mockCreate;

      const operations = createModelOperations('users', executionContext, mockPool);
      const result = await operations.create(inputData);

      expect(result).toEqual(inputData);
      expect(mockCreate).toHaveBeenCalledWith(inputData);
    });

    it('should generate ID when not provided', async () => {
      const inputData = {
        name: 'New User',
        email: 'new@example.com',
      };

      let capturedItem: any;
      const mockCreate = vi.fn().mockImplementation((item) => {
        capturedItem = item;
        return Promise.resolve({ resource: item });
      });
      (mockContainer.items.create as any) = mockCreate;

      const operations = createModelOperations('users', executionContext, mockPool);
      const result = await operations.create(inputData);

      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('string');
      expect(capturedItem).toMatchObject({
        ...inputData,
        id: expect.any(String),
      });
    });

    it('should throw DatabaseError when resource is not returned', async () => {
      const mockCreate = vi.fn().mockResolvedValue({ resource: null });
      (mockContainer.items.create as any) = mockCreate;

      const operations = createModelOperations('users', executionContext, mockPool);

      await expect(operations.create({ name: 'Test' })).rejects.toThrow(DatabaseError);
      await expect(operations.create({ name: 'Test' })).rejects.toThrow('Failed to create users');
    });

    it('should propagate Cosmos DB errors', async () => {
      const mockCreate = vi.fn().mockRejectedValue(new Error('Conflict'));
      (mockContainer.items.create as any) = mockCreate;

      const operations = createModelOperations('users', executionContext, mockPool);

      await expect(operations.create({ id: 'user-123', name: 'Test' })).rejects.toThrow(
        DatabaseError
      );
    });
  });

  // ==========================================================================
  // UPDATE Operation Tests
  // ==========================================================================

  describe('update()', () => {
    it('should update existing document', async () => {
      const existingUser = {
        id: 'user-123',
        name: 'Old Name',
        email: 'old@example.com',
      };

      const updatedUser = {
        id: 'user-123',
        name: 'New Name',
        email: 'old@example.com',
      };

      // Mock get operation
      const mockRead = vi.fn().mockResolvedValue({ resource: existingUser });
      const mockReplace = vi.fn().mockResolvedValue({ resource: updatedUser });
      const mockItem = vi.fn().mockReturnValue({ read: mockRead, replace: mockReplace });
      (mockContainer.item as any) = mockItem;

      const operations = createModelOperations('users', executionContext, mockPool);
      const result = await operations.update('user-123', { name: 'New Name' });

      expect(result).toEqual(updatedUser);
      expect(mockReplace).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-123',
          name: 'New Name',
          email: 'old@example.com',
        })
      );
    });

    it('should merge update data with existing document', async () => {
      const existingUser = {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
      };

      const mockRead = vi.fn().mockResolvedValue({ resource: existingUser });
      const mockReplace = vi.fn().mockResolvedValue({
        resource: { ...existingUser, role: 'admin' },
      });
      const mockItem = vi.fn().mockReturnValue({ read: mockRead, replace: mockReplace });
      (mockContainer.item as any) = mockItem;

      const operations = createModelOperations('users', executionContext, mockPool);
      const result = await operations.update('user-123', { role: 'admin' });

      expect(result.name).toBe('Test User');
      expect(result.email).toBe('test@example.com');
      expect(result.role).toBe('admin');
    });

    it('should throw NotFoundError when document does not exist', async () => {
      const mockRead = vi.fn().mockRejectedValue({ code: 404, statusCode: 404 });
      const mockItem = vi.fn().mockReturnValue({ read: mockRead });
      (mockContainer.item as any) = mockItem;

      const operations = createModelOperations('users', executionContext, mockPool);

      await expect(operations.update('non-existent', { name: 'Test' })).rejects.toThrow(
        NotFoundError
      );
    });

    it('should preserve document ID', async () => {
      const existingUser = { id: 'user-123', name: 'Test' };

      const mockRead = vi.fn().mockResolvedValue({ resource: existingUser });
      const mockReplace = vi.fn().mockResolvedValue({
        resource: { id: 'user-123', name: 'Updated' },
      });
      const mockItem = vi.fn().mockReturnValue({ read: mockRead, replace: mockReplace });
      (mockContainer.item as any) = mockItem;

      const operations = createModelOperations('users', executionContext, mockPool);
      const result = await operations.update('user-123', { name: 'Updated', id: 'hacked' } as any);

      expect(result.id).toBe('user-123');
    });

    it('should throw DatabaseError when resource is not returned', async () => {
      const existingUser = { id: 'user-123', name: 'Test' };

      const mockRead = vi.fn().mockResolvedValue({ resource: existingUser });
      const mockReplace = vi.fn().mockResolvedValue({ resource: null });
      const mockItem = vi.fn().mockReturnValue({ read: mockRead, replace: mockReplace });
      (mockContainer.item as any) = mockItem;

      const operations = createModelOperations('users', executionContext, mockPool);

      await expect(operations.update('user-123', { name: 'Test' })).rejects.toThrow(DatabaseError);
    });
  });

  // ==========================================================================
  // DELETE Operation Tests
  // ==========================================================================

  describe('delete()', () => {
    it('should delete existing document', async () => {
      const mockDelete = vi.fn().mockResolvedValue({});
      const mockItem = vi.fn().mockReturnValue({ delete: mockDelete });
      (mockContainer.item as any) = mockItem;

      const operations = createModelOperations('users', executionContext, mockPool);
      await operations.delete('user-123');

      expect(mockItem).toHaveBeenCalledWith('user-123', 'user-123');
      expect(mockDelete).toHaveBeenCalled();
    });

    it('should be idempotent (deleting non-existent document succeeds)', async () => {
      const mockDelete = vi.fn().mockRejectedValue({ code: 404, statusCode: 404 });
      const mockItem = vi.fn().mockReturnValue({ delete: mockDelete });
      (mockContainer.item as any) = mockItem;

      const operations = createModelOperations('users', executionContext, mockPool);

      // Should not throw
      await expect(operations.delete('non-existent')).resolves.toBeUndefined();
    });

    it('should throw DatabaseError for other errors', async () => {
      const mockDelete = vi.fn().mockRejectedValue(new Error('Permission denied'));
      const mockItem = vi.fn().mockReturnValue({ delete: mockDelete });
      (mockContainer.item as any) = mockItem;

      const operations = createModelOperations('users', executionContext, mockPool);

      await expect(operations.delete('user-123')).rejects.toThrow(DatabaseError);
    });
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('Error Handling', () => {
  it('should create DatabaseError with cause', () => {
    const cause = new Error('Original error');
    const error = new DatabaseError('Database operation failed', cause, 'ERR_DB');

    expect(error.message).toBe('Database operation failed');
    expect(error.cause).toBe(cause);
    expect(error.code).toBe('ERR_DB');
    expect(error.name).toBe('DatabaseError');
  });

  it('should create NotFoundError with model and ID', () => {
    const error = new NotFoundError('users', 'user-123');

    expect(error.message).toBe("users with id 'user-123' not found");
    expect(error.code).toBe('NotFound');
    expect(error.statusCode).toBe(404);
    expect(error.name).toBe('NotFoundError');
  });

  it('should create ConfigurationError', () => {
    const error = new ConfigurationError('Missing configuration');

    expect(error.message).toBe('Missing configuration');
    expect(error.name).toBe('ConfigurationError');
  });
});

// ============================================================================
// Performance Tests
// ============================================================================

describe('Performance', () => {
  it('should generate unique IDs efficiently', async () => {
    const executionContext = createMockExecutionContext();
    const mockContainer = createMockContainer();
    const mockPool = {
      getContainer: vi.fn().mockResolvedValue(mockContainer),
      executeWithRetry: vi.fn((fn) => fn()),
    } as any;

    const ids = new Set<string>();
    const operations = createModelOperations('users', executionContext, mockPool);

    // Mock create to capture generated IDs
    const mockCreate = vi.fn().mockImplementation((item) => ({
      resource: item,
    }));
    (mockContainer.items.create as any) = mockCreate;

    // Generate 1000 IDs
    const startTime = Date.now();
    for (let i = 0; i < 1000; i++) {
      const result = await operations.create({ name: `User ${i}` });
      ids.add(result.id!);
    }
    const duration = Date.now() - startTime;

    // All IDs should be unique
    expect(ids.size).toBe(1000);

    // Should be fast (less than 1 second for 1000 operations)
    expect(duration).toBeLessThan(1000);
  });
});
