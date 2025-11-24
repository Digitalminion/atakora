/**
 * Tests for Function Execution Context
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createFunctionContext,
  createAnonymousUserContext,
  createUserContextFromToken,
  createExecutionContext,
} from './context';
import type { ExecutionContext, UserContext } from './types';
import { CosmosConnectionPool } from './database-client';

// ============================================================================
// Mock Azure SDK Clients
// ============================================================================

// Mock Cosmos DB SDK
vi.mock('@azure/cosmos', () => {
  const mockContainer = {
    item: vi.fn((id: string, partitionKey: string) => ({
      read: vi.fn().mockResolvedValue({ resource: null }),
      replace: vi.fn().mockResolvedValue({ resource: { id } }),
      delete: vi.fn().mockResolvedValue({}),
    })),
    items: {
      create: vi.fn((item: any) =>
        Promise.resolve({
          resource: { id: item.id || 'generated-id', ...item },
        })
      ),
      query: vi.fn(() => ({
        fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
      })),
    },
  };

  const mockDatabase = {
    container: vi.fn(() => mockContainer),
  };

  const mockClient = {
    database: vi.fn(() => mockDatabase),
  };

  return {
    CosmosClient: vi.fn(() => mockClient),
  };
});

// Mock Blob Storage SDK
vi.mock('@azure/storage-blob', () => {
  const { Readable } = require('stream');

  const createMockBlobClient = (path: string) => ({
    uploadData: vi.fn().mockResolvedValue({}),
    upload: vi.fn().mockResolvedValue({}),
    download: vi.fn().mockResolvedValue({
      readableStreamBody: Readable.from(Buffer.from('mock data')),
    }),
    exists: vi.fn().mockResolvedValue(true),
    delete: vi.fn().mockResolvedValue({}),
    url: `https://teststorage.blob.core.windows.net/test-container/${path}`,
  });

  const mockContainerClient = {
    getBlockBlobClient: vi.fn((path: string) => createMockBlobClient(path)),
    getBlobClient: vi.fn((path: string) => createMockBlobClient(path)),
    exists: vi.fn().mockResolvedValue(true),
    create: vi.fn().mockResolvedValue({}),
  };

  const mockBlobServiceClient = {
    getContainerClient: vi.fn(() => mockContainerClient),
  };

  return {
    BlobServiceClient: {
      fromConnectionString: vi.fn(() => mockBlobServiceClient),
    },
    StorageRetryPolicyType: {
      EXPONENTIAL: 1,
      FIXED: 0,
    },
    StorageSharedKeyCredential: vi.fn(),
  };
});

// Mock OpenTelemetry
vi.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: vi.fn(() => ({
      startSpan: vi.fn(() => ({
        recordException: vi.fn(),
        setStatus: vi.fn(),
        end: vi.fn(),
      })),
    })),
  },
  context: {},
  SpanStatusCode: {
    ERROR: 2,
  },
}));

vi.mock('@azure/monitor-opentelemetry', () => ({
  useAzureMonitor: vi.fn(),
}));

// ============================================================================
// Test Setup
// ============================================================================

// Mock environment variables for Azure services
beforeEach(() => {
  process.env.COSMOS_ENDPOINT = 'https://test-cosmos.documents.azure.com:443/';
  process.env.COSMOS_KEY = 'test-key-12345';
  process.env.COSMOS_DATABASE_ID = 'test-db';
  process.env.AZURE_STORAGE_CONNECTION_STRING =
    'DefaultEndpointsProtocol=https;AccountName=teststorage;AccountKey=dGVzdC1rZXk=;EndpointSuffix=core.windows.net';
});

afterEach(() => {
  delete process.env.COSMOS_ENDPOINT;
  delete process.env.COSMOS_KEY;
  delete process.env.COSMOS_DATABASE_ID;
  delete process.env.AZURE_STORAGE_CONNECTION_STRING;

  // Reset Cosmos connection pool between tests
  CosmosConnectionPool.resetInstance();
});

describe('createFunctionContext', () => {
  const mockExecutionContext: ExecutionContext = {
    executionId: 'exec_123',
    executionTime: Date.now(),
    invocationId: 'inv_456',
  };

  const mockUserContext: UserContext = {
    id: 'user_789',
    email: 'user@example.com',
    roles: ['user', 'admin'],
  };

  it('should create function context with all properties', () => {
    const context = createFunctionContext(mockExecutionContext, mockUserContext);

    expect(context.executionId).toBe('exec_123');
    expect(context.invocationId).toBe('inv_456');
    expect(context.executionTime).toBe(mockExecutionContext.executionTime);
    expect(context.user).toEqual(mockUserContext);
  });

  it('should create database client', () => {
    const context = createFunctionContext(mockExecutionContext, mockUserContext);

    expect(context.database).toBeDefined();
    expect(typeof context.database).toBe('object');
  });

  it('should create storage client', () => {
    const context = createFunctionContext(mockExecutionContext, mockUserContext);

    expect(context.storage).toBeDefined();
    expect(context.storage.blobs).toBeDefined();
  });

  it('should create utilities', () => {
    const context = createFunctionContext(mockExecutionContext, mockUserContext);

    expect(context.utils).toBeDefined();
    expect(typeof context.utils.generateId).toBe('function');
    expect(typeof context.utils.now).toBe('function');
    expect(typeof context.utils.formatDate).toBe('function');
  });
});

describe('Database Client', () => {
  const mockExecutionContext: ExecutionContext = {
    executionId: 'exec_123',
    executionTime: Date.now(),
    invocationId: 'inv_456',
  };

  const mockUserContext: UserContext = {
    id: 'user_789',
    email: 'user@example.com',
    roles: ['user'],
  };

  it('should provide model operations via proxy', () => {
    const context = createFunctionContext(mockExecutionContext, mockUserContext);

    expect(context.database.users).toBeDefined();
    expect(context.database.datasets).toBeDefined();
    expect(context.database.reports).toBeDefined();
  });

  it('should provide CRUD operations for models', () => {
    const context = createFunctionContext(mockExecutionContext, mockUserContext);

    const userOps = context.database.users;
    expect(typeof userOps.get).toBe('function');
    expect(typeof userOps.list).toBe('function');
    expect(typeof userOps.create).toBe('function');
    expect(typeof userOps.update).toBe('function');
    expect(typeof userOps.delete).toBe('function');
  });

  it('should cache model operations', () => {
    const context = createFunctionContext(mockExecutionContext, mockUserContext);

    const users1 = context.database.users;
    const users2 = context.database.users;

    expect(users1).toBe(users2); // Same instance
  });

  it('should handle get operation', async () => {
    const context = createFunctionContext(mockExecutionContext, mockUserContext);

    const result = await context.database.users.get('user_123');
    // Currently returns null (placeholder implementation)
    expect(result).toBeNull();
  });

  it('should handle list operation', async () => {
    const context = createFunctionContext(mockExecutionContext, mockUserContext);

    const result = await context.database.users.list();
    // Currently returns empty array (placeholder implementation)
    expect(result).toEqual([]);
  });

  it('should handle create operation', async () => {
    const context = createFunctionContext(mockExecutionContext, mockUserContext);

    const data = { email: 'new@example.com' };
    const result = await context.database.users.create(data);
    // Should return created item with id
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.email).toBe('new@example.com');
  });
});

describe('Storage Client', () => {
  const mockExecutionContext: ExecutionContext = {
    executionId: 'exec_123',
    executionTime: Date.now(),
    invocationId: 'inv_456',
  };

  const mockUserContext: UserContext = {
    id: 'user_789',
    email: 'user@example.com',
    roles: ['user'],
  };

  it('should provide blob operations', () => {
    const context = createFunctionContext(mockExecutionContext, mockUserContext);

    expect(context.storage.blobs).toBeDefined();
    expect(typeof context.storage.blobs.upload).toBe('function');
    expect(typeof context.storage.blobs.download).toBe('function');
    expect(typeof context.storage.blobs.delete).toBe('function');
    expect(typeof context.storage.blobs.exists).toBe('function');
  });

  it('should handle upload operation', async () => {
    const context = createFunctionContext(mockExecutionContext, mockUserContext);

    const url = await context.storage.blobs.upload('reports/report.pdf', Buffer.from('data'), {
      contentType: 'application/pdf',
    });

    expect(typeof url).toBe('string');
    expect(url).toContain('reports/report.pdf');
  });

  it('should handle download operation', async () => {
    const context = createFunctionContext(mockExecutionContext, mockUserContext);

    const result = await context.storage.blobs.download(
      'https://teststorage.blob.core.windows.net/test-container/file.pdf'
    );
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it('should handle exists operation', async () => {
    const context = createFunctionContext(mockExecutionContext, mockUserContext);

    const exists = await context.storage.blobs.exists(
      'https://teststorage.blob.core.windows.net/test-container/file.pdf'
    );
    expect(typeof exists).toBe('boolean');
  });
});

describe('Utilities', () => {
  const mockExecutionContext: ExecutionContext = {
    executionId: 'exec_123',
    executionTime: Date.now(),
    invocationId: 'inv_456',
  };

  const mockUserContext: UserContext = {
    id: 'user_789',
    email: 'user@example.com',
    roles: ['user'],
  };

  it('should generate unique IDs', () => {
    const context = createFunctionContext(mockExecutionContext, mockUserContext);

    const id1 = context.utils.generateId();
    const id2 = context.utils.generateId();

    expect(typeof id1).toBe('string');
    expect(typeof id2).toBe('string');
    expect(id1).not.toBe(id2);
  });

  it('should generate IDs with prefix', () => {
    const context = createFunctionContext(mockExecutionContext, mockUserContext);

    const id = context.utils.generateId('rpt');

    expect(id).toMatch(/^rpt_/);
  });

  it('should provide current timestamp', () => {
    const context = createFunctionContext(mockExecutionContext, mockUserContext);

    const now = context.utils.now();

    expect(typeof now).toBe('number');
    expect(now).toBeGreaterThan(0);
  });

  it('should format dates to ISO string', () => {
    const context = createFunctionContext(mockExecutionContext, mockUserContext);

    const date = new Date('2025-01-15T10:30:00Z');
    const formatted = context.utils.formatDate(date);

    expect(formatted).toBe('2025-01-15T10:30:00.000Z');
  });
});

describe('createAnonymousUserContext', () => {
  it('should create anonymous user context', () => {
    const userContext = createAnonymousUserContext();

    expect(userContext.id).toBe('anonymous');
    expect(userContext.email).toBe('anonymous@example.com');
    expect(userContext.roles).toEqual([]);
  });
});

describe('createUserContextFromToken', () => {
  it('should create user context from token', () => {
    const token = {
      sub: 'user_123',
      email: 'user@example.com',
      roles: ['admin', 'user'],
      name: 'Test User',
    };

    const userContext = createUserContextFromToken(token);

    expect(userContext.id).toBe('user_123');
    expect(userContext.email).toBe('user@example.com');
    expect(userContext.roles).toEqual(['admin', 'user']);
    expect(userContext.name).toBe('Test User');
    expect(userContext.claims).toEqual(token);
  });

  it('should handle token without optional fields', () => {
    const token = {
      sub: 'user_123',
    };

    const userContext = createUserContextFromToken(token);

    expect(userContext.id).toBe('user_123');
    expect(userContext.email).toBe('unknown@example.com');
    expect(userContext.roles).toEqual([]);
  });

  it('should handle token without sub', () => {
    const token = {
      email: 'user@example.com',
    };

    const userContext = createUserContextFromToken(token);

    expect(userContext.id).toBe('unknown');
  });
});

describe('createExecutionContext', () => {
  it('should create execution context', () => {
    const executionContext = createExecutionContext('inv_789');

    expect(executionContext.invocationId).toBe('inv_789');
    expect(executionContext.executionId).toMatch(/^exec_/);
    expect(typeof executionContext.executionTime).toBe('number');
    expect(executionContext.executionTime).toBeGreaterThan(0);
  });

  it('should generate unique execution IDs', () => {
    const context1 = createExecutionContext('inv_1');
    const context2 = createExecutionContext('inv_2');

    expect(context1.executionId).not.toBe(context2.executionId);
  });
});

describe('User Context', () => {
  it('should include user information in context', () => {
    const mockExecutionContext: ExecutionContext = {
      executionId: 'exec_123',
      executionTime: Date.now(),
      invocationId: 'inv_456',
    };

    const mockUserContext: UserContext = {
      id: 'user_789',
      email: 'admin@example.com',
      roles: ['admin', 'superuser'],
      name: 'Admin User',
      claims: {
        tenant: 'company_123',
        department: 'engineering',
      },
    };

    const context = createFunctionContext(mockExecutionContext, mockUserContext);

    expect(context.user.id).toBe('user_789');
    expect(context.user.email).toBe('admin@example.com');
    expect(context.user.roles).toContain('admin');
    expect(context.user.roles).toContain('superuser');
    expect(context.user.name).toBe('Admin User');
    expect(context.user.claims?.tenant).toBe('company_123');
  });
});
