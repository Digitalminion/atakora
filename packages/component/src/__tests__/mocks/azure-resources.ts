/**
 * Azure Resource Mocks
 *
 * @remarks
 * Provides mock implementations of Azure SDK operations for testing.
 * Mocks match the real Azure API signatures to ensure tests are realistic.
 *
 * @module @atakora/component/__tests__/mocks/azure-resources
 */

import { vi } from 'vitest';

// ============================================================================
// Cosmos DB Mocks
// ============================================================================

/**
 * Mock Cosmos DB Container
 */
export class MockCosmosContainer {
  public id: string;
  private items: Map<string, any> = new Map();

  constructor(id: string) {
    this.id = id;
  }

  /**
   * Mock create item
   */
  async create(item: any) {
    const id = item.id || Math.random().toString(36).substring(7);
    const newItem = { ...item, id };
    this.items.set(id, newItem);

    return {
      resource: newItem,
      statusCode: 201,
      headers: {},
      activityId: 'mock-activity-id',
      requestCharge: 5.0,
    };
  }

  /**
   * Mock read item
   */
  async read(id: string, partitionKey?: string) {
    const item = this.items.get(id);

    if (!item) {
      const error = new Error('NotFound') as any;
      error.code = 404;
      throw error;
    }

    return {
      resource: item,
      statusCode: 200,
      headers: {},
      activityId: 'mock-activity-id',
      requestCharge: 1.0,
    };
  }

  /**
   * Mock replace item (update)
   */
  async replace(id: string, item: any) {
    if (!this.items.has(id)) {
      const error = new Error('NotFound') as any;
      error.code = 404;
      throw error;
    }

    const updatedItem = { ...item, id };
    this.items.set(id, updatedItem);

    return {
      resource: updatedItem,
      statusCode: 200,
      headers: {},
      activityId: 'mock-activity-id',
      requestCharge: 3.0,
    };
  }

  /**
   * Mock delete item
   */
  async delete(id: string, partitionKey?: string) {
    if (!this.items.has(id)) {
      const error = new Error('NotFound') as any;
      error.code = 404;
      throw error;
    }

    this.items.delete(id);

    return {
      statusCode: 204,
      headers: {},
      activityId: 'mock-activity-id',
      requestCharge: 2.0,
    };
  }

  /**
   * Mock query items
   */
  async query(querySpec: any) {
    const items = Array.from(this.items.values());

    return {
      fetchAll: async () => ({
        resources: items,
        headers: {},
        activityId: 'mock-activity-id',
        requestCharge: 2.5,
      }),
      hasMoreResults: () => false,
      executeNext: async () => ({
        resources: items,
        headers: {},
        activityId: 'mock-activity-id',
        requestCharge: 2.5,
      }),
    };
  }

  /**
   * Mock items property
   */
  get items() {
    return {
      create: this.create.bind(this),
      query: this.query.bind(this),
      upsert: async (item: any) => {
        const id = item.id || Math.random().toString(36).substring(7);
        const newItem = { ...item, id };
        this.items.set(id, newItem);
        return {
          resource: newItem,
          statusCode: 200,
          headers: {},
          activityId: 'mock-activity-id',
          requestCharge: 5.0,
        };
      },
    };
  }

  /**
   * Get item
   */
  item(id: string, partitionKey?: string) {
    return {
      read: () => this.read(id, partitionKey),
      replace: (item: any) => this.replace(id, item),
      delete: () => this.delete(id, partitionKey),
    };
  }

  /**
   * Clear all items (for test cleanup)
   */
  clear() {
    this.items.clear();
  }

  /**
   * Get all items (for test assertions)
   */
  getAllItems() {
    return Array.from(this.items.values());
  }
}

/**
 * Mock Cosmos DB Database
 */
export class MockCosmosDatabase {
  public id: string;
  private containers: Map<string, MockCosmosContainer> = new Map();

  constructor(id: string) {
    this.id = id;
  }

  /**
   * Get or create container
   */
  async container(id: string) {
    if (!this.containers.has(id)) {
      this.containers.set(id, new MockCosmosContainer(id));
    }
    return this.containers.get(id)!;
  }

  /**
   * Create container
   */
  async createContainer(containerDefinition: { id: string; partitionKey: any }) {
    const container = new MockCosmosContainer(containerDefinition.id);
    this.containers.set(containerDefinition.id, container);

    return {
      container,
      statusCode: 201,
      headers: {},
      activityId: 'mock-activity-id',
      requestCharge: 10.0,
    };
  }

  /**
   * Clear all containers (for test cleanup)
   */
  clear() {
    this.containers.forEach((container) => container.clear());
    this.containers.clear();
  }
}

/**
 * Mock Cosmos DB Client
 */
export class MockCosmosClient {
  private databases: Map<string, MockCosmosDatabase> = new Map();

  /**
   * Get database
   */
  database(id: string) {
    if (!this.databases.has(id)) {
      this.databases.set(id, new MockCosmosDatabase(id));
    }
    return this.databases.get(id)!;
  }

  /**
   * Create database
   */
  async createDatabase(databaseDefinition: { id: string }) {
    const database = new MockCosmosDatabase(databaseDefinition.id);
    this.databases.set(databaseDefinition.id, database);

    return {
      database,
      statusCode: 201,
      headers: {},
      activityId: 'mock-activity-id',
      requestCharge: 10.0,
    };
  }

  /**
   * Clear all databases (for test cleanup)
   */
  clear() {
    this.databases.forEach((database) => database.clear());
    this.databases.clear();
  }

  /**
   * Get all databases (for test assertions)
   */
  getDatabases() {
    return Array.from(this.databases.values());
  }
}

// ============================================================================
// Storage Blob Mocks
// ============================================================================

/**
 * Mock Blob Service Client
 */
export class MockBlobServiceClient {
  private containers: Map<string, MockContainerClient> = new Map();

  constructor(public connectionString: string = 'mock-connection-string') {}

  /**
   * Get container client
   */
  getContainerClient(containerName: string) {
    if (!this.containers.has(containerName)) {
      this.containers.set(containerName, new MockContainerClient(containerName));
    }
    return this.containers.get(containerName)!;
  }

  /**
   * Create container
   */
  async createContainer(containerName: string) {
    const container = new MockContainerClient(containerName);
    this.containers.set(containerName, container);

    return {
      containerClient: container,
      succeeded: true,
      statusCode: 201,
    };
  }

  /**
   * Clear all containers (for test cleanup)
   */
  clear() {
    this.containers.forEach((container) => container.clear());
    this.containers.clear();
  }
}

/**
 * Mock Container Client
 */
export class MockContainerClient {
  private blobs: Map<string, MockBlobData> = new Map();

  constructor(public containerName: string) {}

  /**
   * Get blob client
   */
  getBlobClient(blobName: string) {
    return new MockBlobClient(blobName, this);
  }

  /**
   * Get block blob client
   */
  getBlockBlobClient(blobName: string) {
    return new MockBlockBlobClient(blobName, this);
  }

  /**
   * List blobs
   */
  async *listBlobsFlat() {
    for (const [name, blob] of this.blobs.entries()) {
      yield {
        name,
        properties: blob.properties,
        metadata: blob.metadata,
      };
    }
  }

  /**
   * Check if blob exists
   */
  async exists() {
    return this.blobs.size > 0;
  }

  /**
   * Create if not exists
   */
  async createIfNotExists() {
    return {
      succeeded: true,
      statusCode: 201,
    };
  }

  /**
   * Delete container
   */
  async delete() {
    this.blobs.clear();
    return {
      succeeded: true,
      statusCode: 202,
    };
  }

  /**
   * Internal: Add blob
   */
  _addBlob(name: string, data: MockBlobData) {
    this.blobs.set(name, data);
  }

  /**
   * Internal: Get blob
   */
  _getBlob(name: string) {
    return this.blobs.get(name);
  }

  /**
   * Internal: Delete blob
   */
  _deleteBlob(name: string) {
    return this.blobs.delete(name);
  }

  /**
   * Clear all blobs (for test cleanup)
   */
  clear() {
    this.blobs.clear();
  }
}

interface MockBlobData {
  content: Buffer | string;
  properties: {
    contentType?: string;
    contentLength: number;
    lastModified: Date;
    etag: string;
  };
  metadata?: Record<string, string>;
}

/**
 * Mock Blob Client
 */
export class MockBlobClient {
  constructor(
    public blobName: string,
    private container: MockContainerClient
  ) {}

  /**
   * Download blob
   */
  async download() {
    const blob = this.container._getBlob(this.blobName);

    if (!blob) {
      const error = new Error('BlobNotFound') as any;
      error.statusCode = 404;
      throw error;
    }

    return {
      readableStreamBody: Buffer.from(blob.content),
      blobBody: Promise.resolve(Buffer.from(blob.content)),
      contentLength: blob.properties.contentLength,
      contentType: blob.properties.contentType,
      metadata: blob.metadata,
    };
  }

  /**
   * Check if blob exists
   */
  async exists() {
    return this.container._getBlob(this.blobName) !== undefined;
  }

  /**
   * Delete blob
   */
  async delete() {
    this.container._deleteBlob(this.blobName);
    return {
      succeeded: true,
      statusCode: 202,
    };
  }

  /**
   * Get properties
   */
  async getProperties() {
    const blob = this.container._getBlob(this.blobName);

    if (!blob) {
      const error = new Error('BlobNotFound') as any;
      error.statusCode = 404;
      throw error;
    }

    return blob.properties;
  }
}

/**
 * Mock Block Blob Client
 */
export class MockBlockBlobClient extends MockBlobClient {
  /**
   * Upload blob
   */
  async upload(content: string | Buffer, length: number) {
    const blob: MockBlobData = {
      content,
      properties: {
        contentType: 'application/octet-stream',
        contentLength: length,
        lastModified: new Date(),
        etag: `"${Math.random().toString(36).substring(7)}"`,
      },
      metadata: {},
    };

    this.container._addBlob(this.blobName, blob);

    return {
      succeeded: true,
      statusCode: 201,
      etag: blob.properties.etag,
    };
  }

  /**
   * Upload data
   */
  async uploadData(data: Buffer | Blob | ArrayBuffer) {
    const buffer = Buffer.from(data as any);
    return this.upload(buffer, buffer.length);
  }

  /**
   * Set metadata
   */
  async setMetadata(metadata: Record<string, string>) {
    const blob = this.container._getBlob(this.blobName);

    if (!blob) {
      const error = new Error('BlobNotFound') as any;
      error.statusCode = 404;
      throw error;
    }

    blob.metadata = metadata;

    return {
      succeeded: true,
      statusCode: 200,
    };
  }
}

// ============================================================================
// Function App Mocks
// ============================================================================

/**
 * Mock Azure Function Context
 */
export function createMockFunctionContext(options: {
  invocationId?: string;
  functionName?: string;
  traceContext?: any;
} = {}) {
  const logs: string[] = [];

  return {
    invocationId: options.invocationId || Math.random().toString(36).substring(7),
    functionName: options.functionName || 'MockFunction',
    traceContext: options.traceContext || {
      traceparent: 'mock-trace-parent',
      tracestate: 'mock-trace-state',
      attributes: {},
    },
    log: vi.fn((...args: any[]) => {
      logs.push(args.join(' '));
    }),
    info: vi.fn((...args: any[]) => {
      logs.push(`[INFO] ${args.join(' ')}`);
    }),
    warn: vi.fn((...args: any[]) => {
      logs.push(`[WARN] ${args.join(' ')}`);
    }),
    error: vi.fn((...args: any[]) => {
      logs.push(`[ERROR] ${args.join(' ')}`);
    }),
    debug: vi.fn((...args: any[]) => {
      logs.push(`[DEBUG] ${args.join(' ')}`);
    }),
    _logs: logs,
  };
}

/**
 * Mock HTTP Request
 */
export function createMockHttpRequest(options: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string>;
  query?: Record<string, string>;
} = {}) {
  return {
    method: options.method || 'GET',
    url: options.url || 'http://localhost:7071/api/test',
    headers: options.headers || {},
    body: options.body,
    params: options.params || {},
    query: options.query || {},
  };
}

/**
 * Mock HTTP Response
 */
export function createMockHttpResponse() {
  return {
    status: 200,
    headers: {} as Record<string, string>,
    body: undefined as any,
    jsonBody: undefined as any,
  };
}

// ============================================================================
// ARM Template Validation Mocks
// ============================================================================

/**
 * Mock ARM Template Validator
 */
export class MockArmTemplateValidator {
  private validationErrors: string[] = [];

  /**
   * Validate ARM template structure
   */
  async validateTemplate(template: any): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    this.validationErrors = [];

    // Basic structure validation
    if (!template.$schema) {
      this.validationErrors.push('Missing $schema property');
    }

    if (!template.contentVersion) {
      this.validationErrors.push('Missing contentVersion property');
    }

    if (!template.resources) {
      this.validationErrors.push('Missing resources array');
    } else if (!Array.isArray(template.resources)) {
      this.validationErrors.push('resources must be an array');
    }

    // Validate each resource
    if (Array.isArray(template.resources)) {
      template.resources.forEach((resource: any, index: number) => {
        this.validateResource(resource, index);
      });
    }

    return {
      valid: this.validationErrors.length === 0,
      errors: this.validationErrors,
    };
  }

  /**
   * Validate individual resource
   */
  private validateResource(resource: any, index: number) {
    if (!resource.type) {
      this.validationErrors.push(`Resource at index ${index} missing type property`);
    }

    if (!resource.name) {
      this.validationErrors.push(`Resource at index ${index} missing name property`);
    }

    if (!resource.apiVersion) {
      this.validationErrors.push(`Resource at index ${index} missing apiVersion property`);
    }

    if (!resource.location && !this.isGlobalResource(resource.type)) {
      this.validationErrors.push(`Resource at index ${index} missing location property`);
    }

    if (!resource.properties && this.requiresProperties(resource.type)) {
      this.validationErrors.push(`Resource at index ${index} missing properties`);
    }
  }

  /**
   * Check if resource is global (doesn't require location)
   */
  private isGlobalResource(type: string): boolean {
    const globalTypes = [
      'Microsoft.Resources/resourceGroups',
      'Microsoft.Authorization/roleAssignments',
      'Microsoft.Authorization/policyAssignments',
    ];
    return globalTypes.includes(type);
  }

  /**
   * Check if resource type requires properties
   */
  private requiresProperties(type: string): boolean {
    // Most resources require properties
    const noPropertiesTypes = ['Microsoft.Resources/deployments'];
    return !noPropertiesTypes.includes(type);
  }

  /**
   * Validate resource dependencies
   */
  async validateDependencies(template: any): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    const resourceNames = new Set<string>();

    if (!Array.isArray(template.resources)) {
      return { valid: true, errors: [] };
    }

    // Collect all resource names
    template.resources.forEach((resource: any) => {
      if (resource.name) {
        resourceNames.add(resource.name);
      }
    });

    // Check dependencies exist
    template.resources.forEach((resource: any) => {
      if (resource.dependsOn && Array.isArray(resource.dependsOn)) {
        resource.dependsOn.forEach((dep: string) => {
          // Extract resource name from dependency string
          const depName = dep.replace(/^\[resourceId\('.*?',\s*'(.+?)'\)\]$/, '$1');
          if (!resourceNames.has(depName)) {
            errors.push(`Resource ${resource.name} depends on non-existent resource: ${depName}`);
          }
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// ============================================================================
// Resource Validation Mocks
// ============================================================================

/**
 * Mock Resource Name Validator
 */
export class MockResourceNameValidator {
  /**
   * Validate Azure resource name
   */
  validateName(resourceType: string, name: string): { valid: boolean; error?: string } {
    // Storage account names
    if (resourceType.includes('storageAccounts')) {
      if (name.length < 3 || name.length > 24) {
        return { valid: false, error: 'Storage account name must be 3-24 characters' };
      }
      if (!/^[a-z0-9]+$/.test(name)) {
        return {
          valid: false,
          error: 'Storage account name must be lowercase alphanumeric',
        };
      }
    }

    // Function app names
    if (resourceType.includes('sites')) {
      if (name.length < 2 || name.length > 60) {
        return { valid: false, error: 'Function app name must be 2-60 characters' };
      }
      if (!/^[a-z0-9-]+$/.test(name)) {
        return {
          valid: false,
          error: 'Function app name must be lowercase alphanumeric with hyphens',
        };
      }
    }

    // Cosmos DB account names
    if (resourceType.includes('databaseAccounts')) {
      if (name.length < 3 || name.length > 44) {
        return { valid: false, error: 'Cosmos DB account name must be 3-44 characters' };
      }
      if (!/^[a-z0-9-]+$/.test(name)) {
        return {
          valid: false,
          error: 'Cosmos DB account name must be lowercase alphanumeric with hyphens',
        };
      }
    }

    return { valid: true };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a complete mock Azure environment
 */
export function createMockAzureEnvironment() {
  return {
    cosmos: new MockCosmosClient(),
    blob: new MockBlobServiceClient(),
    armValidator: new MockArmTemplateValidator(),
    nameValidator: new MockResourceNameValidator(),
    clear() {
      this.cosmos.clear();
      this.blob.clear();
    },
  };
}

/**
 * Create mock for testing CRUD operations
 */
export function createCrudTestMocks() {
  const cosmos = new MockCosmosClient();
  const database = cosmos.database('test-db');

  return {
    cosmos,
    database,
    async getContainer(name: string) {
      return database.container(name);
    },
    clear() {
      cosmos.clear();
    },
  };
}

/**
 * Create mock for testing blob storage operations
 */
export function createBlobTestMocks() {
  const blobService = new MockBlobServiceClient();
  const container = blobService.getContainerClient('test-container');

  return {
    blobService,
    container,
    clear() {
      blobService.clear();
    },
  };
}
