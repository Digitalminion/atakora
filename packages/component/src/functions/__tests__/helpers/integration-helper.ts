/**
 * Integration Test Helper
 *
 * @remarks
 * Combines all test helpers for comprehensive integration testing.
 * Provides a unified interface for setting up and tearing down test resources.
 *
 * @packageDocumentation
 */

import { CosmosTestHelper, createTestDatabaseId } from './cosmos-test-helper';
import { StorageTestHelper, createTestContainerName } from './storage-test-helper';
import { MockInsightsClient, createMockInsightsClient } from './insights-test-helper';

/**
 * Integration test configuration
 */
export interface IntegrationTestConfig {
  testName: string;
  cosmos?: {
    containers: Array<{
      id: string;
      partitionKey: string;
    }>;
  };
  storage?: {
    containers: string[];
  };
  insights?: boolean;
}

/**
 * Integration test resources
 */
export interface IntegrationTestResources {
  cosmos?: CosmosTestHelper;
  storage?: StorageTestHelper;
  insights?: MockInsightsClient;
}

/**
 * Integration Test Helper
 *
 * @remarks
 * Orchestrates setup and teardown of all test resources.
 * Ensures clean state for each test.
 */
export class IntegrationTestHelper {
  private config: IntegrationTestConfig;
  private resources: IntegrationTestResources = {};

  constructor(config: IntegrationTestConfig) {
    this.config = config;
  }

  /**
   * Setup all test resources
   */
  async setup(): Promise<IntegrationTestResources> {
    // Setup Cosmos DB if configured
    if (this.config.cosmos) {
      const databaseId = createTestDatabaseId(this.config.testName);
      this.resources.cosmos = new CosmosTestHelper({
        databaseId,
        containers: this.config.cosmos.containers,
      });
      await this.resources.cosmos.setup();
    }

    // Setup Storage if configured
    if (this.config.storage) {
      this.resources.storage = new StorageTestHelper({
        containers: this.config.storage.containers,
      });
      await this.resources.storage.setup();
    }

    // Setup Application Insights mock if configured
    if (this.config.insights) {
      this.resources.insights = createMockInsightsClient();
    }

    return this.resources;
  }

  /**
   * Teardown all test resources
   */
  async teardown(): Promise<void> {
    const errors: Error[] = [];

    // Teardown Cosmos DB
    if (this.resources.cosmos) {
      try {
        await this.resources.cosmos.teardown();
      } catch (error) {
        errors.push(
          error instanceof Error ? error : new Error(`Cosmos teardown failed: ${String(error)}`)
        );
      }
    }

    // Teardown Storage
    if (this.resources.storage) {
      try {
        await this.resources.storage.teardown();
      } catch (error) {
        errors.push(
          error instanceof Error ? error : new Error(`Storage teardown failed: ${String(error)}`)
        );
      }
    }

    // Clear Application Insights mock
    if (this.resources.insights) {
      this.resources.insights.clear();
    }

    // Reset resources
    this.resources = {};

    // Throw if any errors occurred
    if (errors.length > 0) {
      throw new Error(`Teardown errors: ${errors.map((e) => e.message).join('; ')}`);
    }
  }

  /**
   * Get Cosmos helper
   */
  getCosmos(): CosmosTestHelper {
    if (!this.resources.cosmos) {
      throw new Error('Cosmos not configured. Add cosmos config to IntegrationTestConfig');
    }
    return this.resources.cosmos;
  }

  /**
   * Get Storage helper
   */
  getStorage(): StorageTestHelper {
    if (!this.resources.storage) {
      throw new Error('Storage not configured. Add storage config to IntegrationTestConfig');
    }
    return this.resources.storage;
  }

  /**
   * Get Application Insights mock
   */
  getInsights(): MockInsightsClient {
    if (!this.resources.insights) {
      throw new Error('Insights not configured. Add insights: true to IntegrationTestConfig');
    }
    return this.resources.insights;
  }

  /**
   * Clear all data from test resources
   */
  async clearAllData(): Promise<void> {
    if (this.resources.cosmos) {
      await this.resources.cosmos.clearAllContainers();
    }

    if (this.resources.storage) {
      await this.resources.storage.clearAllContainers();
    }

    if (this.resources.insights) {
      this.resources.insights.clear();
    }
  }
}

/**
 * Create integration test helper
 */
export function createIntegrationTestHelper(config: IntegrationTestConfig): IntegrationTestHelper {
  return new IntegrationTestHelper(config);
}

/**
 * Check if integration tests should run
 *
 * @remarks
 * Integration tests require emulators to be running.
 * This function checks if emulators are available.
 */
export async function shouldRunIntegrationTests(): Promise<{
  cosmos: boolean;
  storage: boolean;
}> {
  const [cosmosAvailable, storageAvailable] = await Promise.all([
    CosmosTestHelper.isEmulatorAvailable().catch(() => false),
    StorageTestHelper.isAzuriteAvailable().catch(() => false),
  ]);

  return {
    cosmos: cosmosAvailable,
    storage: storageAvailable,
  };
}

/**
 * Skip integration test if emulators not available
 *
 * @remarks
 * Use this in test files to conditionally skip integration tests
 * when emulators are not running.
 */
export function skipIfEmulatorsNotAvailable() {
  return async (testFn: () => void | Promise<void>) => {
    const available = await shouldRunIntegrationTests();

    if (!available.cosmos && !available.storage) {
      console.warn('Skipping integration test - emulators not available');
      return;
    }

    await testFn();
  };
}
