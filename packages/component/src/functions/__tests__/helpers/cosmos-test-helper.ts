/**
 * Cosmos DB Test Helper
 *
 * @remarks
 * Utilities for testing with Cosmos DB Emulator.
 * Provides setup/teardown, connection management, and test data utilities.
 *
 * @packageDocumentation
 */

import { CosmosClient, Database, Container } from '@azure/cosmos';

/**
 * Cosmos DB Emulator Configuration
 */
export const COSMOS_EMULATOR_CONFIG = {
  endpoint: process.env.COSMOS_ENDPOINT || 'https://localhost:8081',
  key:
    process.env.COSMOS_KEY ||
    'C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==',
  // Disable SSL validation for emulator
  connectionPolicy: {
    requestTimeout: 10000,
  },
};

/**
 * Test database configuration
 */
export interface TestDatabaseConfig {
  databaseId: string;
  containers: Array<{
    id: string;
    partitionKey: string;
  }>;
}

/**
 * Cosmos Test Helper
 *
 * @remarks
 * Manages Cosmos DB test resources with automatic cleanup
 */
export class CosmosTestHelper {
  private client: CosmosClient;
  private database?: Database;
  private containers: Map<string, Container> = new Map();
  private config: TestDatabaseConfig;

  constructor(config: TestDatabaseConfig) {
    this.config = config;
    this.client = new CosmosClient({
      endpoint: COSMOS_EMULATOR_CONFIG.endpoint,
      key: COSMOS_EMULATOR_CONFIG.key,
      connectionPolicy: COSMOS_EMULATOR_CONFIG.connectionPolicy,
    });
  }

  /**
   * Setup test database and containers
   */
  async setup(): Promise<void> {
    try {
      // Create database
      const { database } = await this.client.databases.createIfNotExists({
        id: this.config.databaseId,
      });
      this.database = database;

      // Create containers
      for (const containerConfig of this.config.containers) {
        const { container } = await database.containers.createIfNotExists({
          id: containerConfig.id,
          partitionKey: {
            paths: [containerConfig.partitionKey],
          },
          // Enable optimistic concurrency for testing
          indexingPolicy: {
            automatic: true,
            indexingMode: 'consistent' as any,
          },
        });
        this.containers.set(containerConfig.id, container);
      }
    } catch (error) {
      throw new Error(
        `Failed to setup Cosmos test database: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Teardown test database
   */
  async teardown(): Promise<void> {
    try {
      if (this.database) {
        await this.database.delete();
        this.database = undefined;
        this.containers.clear();
      }
    } catch (error) {
      // Log but don't throw - teardown should be best-effort
      console.warn(
        `Failed to teardown Cosmos test database: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get container by ID
   */
  getContainer(containerId: string): Container {
    const container = this.containers.get(containerId);
    if (!container) {
      throw new Error(`Container '${containerId}' not found. Did you call setup()?`);
    }
    return container;
  }

  /**
   * Get database
   */
  getDatabase(): Database {
    if (!this.database) {
      throw new Error('Database not initialized. Did you call setup()?');
    }
    return this.database;
  }

  /**
   * Get Cosmos client
   */
  getClient(): CosmosClient {
    return this.client;
  }

  /**
   * Seed test data into a container
   */
  async seedData<T extends { id: string }>(containerId: string, items: T[]): Promise<void> {
    const container = this.getContainer(containerId);

    for (const item of items) {
      await container.items.create(item);
    }
  }

  /**
   * Clear all data from a container
   */
  async clearContainer(containerId: string): Promise<void> {
    const container = this.getContainer(containerId);

    // Query all items
    const { resources: items } = await container.items.query('SELECT c.id FROM c').fetchAll();

    // Delete all items
    for (const item of items) {
      if (item.id) {
        await container.item(item.id, item.id).delete();
      }
    }
  }

  /**
   * Clear all containers
   */
  async clearAllContainers(): Promise<void> {
    for (const containerId of this.containers.keys()) {
      await this.clearContainer(containerId);
    }
  }

  /**
   * Wait for Cosmos DB emulator to be ready
   */
  static async waitForEmulator(maxRetries = 30, retryDelay = 1000): Promise<boolean> {
    const client = new CosmosClient({
      endpoint: COSMOS_EMULATOR_CONFIG.endpoint,
      key: COSMOS_EMULATOR_CONFIG.key,
    });

    for (let i = 0; i < maxRetries; i++) {
      try {
        await client.getDatabaseAccount();
        return true;
      } catch (error) {
        if (i === maxRetries - 1) {
          throw new Error(
            `Cosmos DB Emulator not ready after ${maxRetries} attempts: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }

    return false;
  }

  /**
   * Check if running in CI environment
   */
  static isCI(): boolean {
    return process.env.CI === 'true';
  }

  /**
   * Check if emulator is available
   */
  static async isEmulatorAvailable(): Promise<boolean> {
    try {
      const client = new CosmosClient({
        endpoint: COSMOS_EMULATOR_CONFIG.endpoint,
        key: COSMOS_EMULATOR_CONFIG.key,
      });
      await client.getDatabaseAccount();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create a unique test database ID
 */
export function createTestDatabaseId(testName: string): string {
  const timestamp = Date.now();
  const sanitized = testName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  return `test-${sanitized}-${timestamp}`;
}

/**
 * Create test data factory for models
 */
export function createTestDataFactory<T extends { id?: string }>(
  defaults: Partial<T>
): (overrides?: Partial<T>) => T {
  return (overrides = {}) => {
    return {
      ...defaults,
      ...overrides,
      id: overrides.id || `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    } as T;
  };
}
