/**
 * Integration Test Helpers
 *
 * @remarks
 * Provides reusable helper functions for integration testing.
 * Simplifies common test patterns and reduces boilerplate.
 *
 * @module @atakora/component/__tests__/helpers/integration-helpers
 */

import { expect } from 'vitest';
import type { BackendObject } from '../../backend/types';
import { createMockAzureEnvironment } from '../mocks/azure-resources';

// ============================================================================
// Backend Assembly Testing Helpers
// ============================================================================

/**
 * Validate backend structure
 *
 * @remarks
 * Ensures backend has all required properties and correct structure.
 * Useful for basic smoke tests.
 */
export function assertValidBackendStructure(backend: BackendObject) {
  // Core properties
  expect(backend).toBeDefined();
  expect(backend.schema).toBeDefined();
  expect(backend.settings).toBeDefined();
  expect(backend.environment).toBeDefined();

  // Settings validation
  expect(backend.settings.name).toBeTruthy();
  expect(backend.settings.region).toBeTruthy();
  expect(backend.settings.resourceGroup).toBeTruthy();
  expect(backend.settings.features).toBeDefined();

  // Infrastructure attachment points
  expect(backend.storage).toBeDefined();
  expect(backend.storage.account).toBeDefined();
  expect(backend.storage.database).toBeDefined();
  expect(backend.storage.blobs).toBeDefined();

  expect(backend.compute).toBeDefined();
  expect(backend.compute.functionApp).toBeDefined();

  // Metadata
  expect(backend._metadata).toBeDefined();
  expect(backend._metadata.version).toBeTruthy();
  expect(backend._metadata.createdAt).toBeInstanceOf(Date);
  expect(backend._metadata.environment).toBe(backend.environment);
}

/**
 * Assert backend has expected features enabled
 */
export function assertFeatures(
  backend: BackendObject,
  expected: {
    monitoring: boolean;
    networking: boolean;
    performance: boolean;
  }
) {
  expect(backend.settings.features.monitoring).toBe(expected.monitoring);
  expect(backend.settings.features.networking).toBe(expected.networking);
  expect(backend.settings.features.performance).toBe(expected.performance);

  // Check attachment points exist when features are enabled
  if (expected.monitoring) {
    expect(backend.monitoring).toBeDefined();
  }

  if (expected.networking) {
    expect(backend.network).toBeDefined();
  }

  if (expected.performance) {
    expect(backend.performance).toBeDefined();
  }
}

/**
 * Assert backend has authentication configured
 */
export function assertHasAuthentication(backend: BackendObject, shouldHave: boolean = true) {
  if (shouldHave) {
    expect(backend.authentication).toBeDefined();
    expect(backend._metadata.hasAuthentication).toBe(true);
  } else {
    expect(backend.authentication).toBeUndefined();
    expect(backend._metadata.hasAuthentication).toBe(false);
  }
}

/**
 * Assert backend model count
 */
export function assertModelCount(backend: BackendObject, expectedCount: number) {
  expect(backend._metadata.modelCount).toBe(expectedCount);
  expect(Object.keys(backend.schema.models)).toHaveLength(expectedCount);
}

/**
 * Assert backend has specific models
 */
export function assertHasModels(backend: BackendObject, modelNames: string[]) {
  const schemaModels = Object.keys(backend.schema.models);

  modelNames.forEach((modelName) => {
    expect(schemaModels).toContain(modelName);
  });
}

// ============================================================================
// Attachment Point Testing Helpers
// ============================================================================

/**
 * Test attachment point basic functionality
 *
 * @remarks
 * Validates that an attachment point has the correct structure and methods.
 */
export function assertValidAttachmentPoint(attachmentPoint: any) {
  expect(attachmentPoint).toBeDefined();
  expect(attachmentPoint.attach).toBeInstanceOf(Function);
  expect(attachmentPoint.isAttached).toBeInstanceOf(Function);
  expect(attachmentPoint.getConfig).toBeInstanceOf(Function);
  expect(attachmentPoint.reset).toBeInstanceOf(Function);
  expect(attachmentPoint._default).toBeDefined();
  expect(attachmentPoint._path).toBeTruthy();
}

/**
 * Test attachment point attach/detach cycle
 */
export function testAttachmentPointCycle(
  attachmentPoint: any,
  testConfig: any,
  defaultConfig?: any
) {
  // Initially not attached
  expect(attachmentPoint.isAttached()).toBe(false);

  // Get default config
  const initialConfig = attachmentPoint.getConfig();
  if (defaultConfig) {
    expect(initialConfig).toEqual(defaultConfig);
  }

  // Attach custom config
  attachmentPoint.attach(testConfig);
  expect(attachmentPoint.isAttached()).toBe(true);
  expect(attachmentPoint.getConfig()).toEqual(testConfig);

  // Reset to default
  attachmentPoint.reset();
  expect(attachmentPoint.isAttached()).toBe(false);
  expect(attachmentPoint.getConfig()).toEqual(initialConfig);
}

/**
 * Assert all infrastructure attachment points are valid
 */
export function assertValidInfrastructureAttachmentPoints(backend: BackendObject) {
  // Storage
  assertValidAttachmentPoint(backend.storage.account);
  assertValidAttachmentPoint(backend.storage.database);
  assertValidAttachmentPoint(backend.storage.blobs);

  // Compute
  assertValidAttachmentPoint(backend.compute.functionApp);

  // Optional: Networking
  if (backend.network) {
    assertValidAttachmentPoint(backend.network.vnet);
    assertValidAttachmentPoint(backend.network.primary);
    assertValidAttachmentPoint(backend.network.firewall);
    assertValidAttachmentPoint(backend.network.waf);
    assertValidAttachmentPoint(backend.network.ddos);
  }

  // Optional: Monitoring
  if (backend.monitoring) {
    assertValidAttachmentPoint(backend.monitoring.appInsights);
    assertValidAttachmentPoint(backend.monitoring.insights);
    assertValidAttachmentPoint(backend.monitoring.logAnalytics);
    assertValidAttachmentPoint(backend.monitoring.logs);
    assertValidAttachmentPoint(backend.monitoring.alerts);
    assertValidAttachmentPoint(backend.monitoring.diagnostics);
    assertValidAttachmentPoint(backend.monitoring.metrics);
    assertValidAttachmentPoint(backend.monitoring.tracing);
    assertValidAttachmentPoint(backend.monitoring.queryPacks);
  }

  // Optional: Performance
  if (backend.performance) {
    assertValidAttachmentPoint(backend.performance.cdn);
    assertValidAttachmentPoint(backend.performance.cache);
    assertValidAttachmentPoint(backend.performance.rateLimit);
    assertValidAttachmentPoint(backend.performance.compression);
  }
}

// ============================================================================
// Synthesis Pipeline Testing Helpers
// ============================================================================

/**
 * Mock synthesis context
 */
export interface MockSynthesisContext {
  backend: BackendObject;
  environment: ReturnType<typeof createMockAzureEnvironment>;
  resources: Map<string, any>;
  outputs: Map<string, any>;
}

/**
 * Create mock synthesis context
 */
export function createMockSynthesisContext(backend: BackendObject): MockSynthesisContext {
  return {
    backend,
    environment: createMockAzureEnvironment(),
    resources: new Map(),
    outputs: new Map(),
  };
}

/**
 * Simulate resource synthesis
 *
 * @remarks
 * Simulates the synthesis process without actual CDK calls.
 * Useful for testing synthesis logic in isolation.
 */
export function simulateResourceSynthesis(
  context: MockSynthesisContext,
  resourceType: string,
  resourceName: string,
  properties: any
) {
  const resourceId = `${resourceType}/${resourceName}`;
  const resource = {
    type: resourceType,
    name: resourceName,
    properties,
    location: context.backend.settings.region,
    tags: context.backend.settings.tags,
  };

  context.resources.set(resourceId, resource);

  return resource;
}

/**
 * Assert resource was synthesized
 */
export function assertResourceSynthesized(
  context: MockSynthesisContext,
  resourceType: string,
  resourceName: string
) {
  const resourceId = `${resourceType}/${resourceName}`;
  expect(context.resources.has(resourceId)).toBe(true);

  const resource = context.resources.get(resourceId);
  expect(resource).toBeDefined();
  expect(resource.type).toBe(resourceType);
  expect(resource.name).toBe(resourceName);

  return resource;
}

/**
 * Assert resource has properties
 */
export function assertResourceHasProperties(resource: any, expectedProperties: any) {
  expect(resource.properties).toBeDefined();

  Object.keys(expectedProperties).forEach((key) => {
    expect(resource.properties[key]).toEqual(expectedProperties[key]);
  });
}

/**
 * Count synthesized resources by type
 */
export function countResourcesByType(
  context: MockSynthesisContext,
  resourceType: string
): number {
  let count = 0;

  for (const [key, resource] of context.resources.entries()) {
    if (resource.type === resourceType) {
      count++;
    }
  }

  return count;
}

// ============================================================================
// Schema Testing Helpers
// ============================================================================

/**
 * Assert schema has model of specific type
 */
export function assertHasModelType(
  schema: any,
  modelName: string,
  modelType: 'crud' | 'event' | 'function'
) {
  expect(schema.models[modelName]).toBeDefined();

  const model = schema.models[modelName];

  switch (modelType) {
    case 'crud':
      expect(model._modelType).toBe('crud');
      expect(model.fields).toBeDefined();
      break;

    case 'event':
      expect(model._modelType).toBe('event');
      expect(model.fields).toBeDefined();
      break;

    case 'function':
      expect(model._modelType).toBe('function');
      expect(model.input).toBeDefined();
      expect(model.output).toBeDefined();
      break;
  }
}

/**
 * Get models by type from schema
 */
export function getModelsByType(schema: any, modelType: 'crud' | 'event' | 'function') {
  const models: any[] = [];

  for (const [name, model] of Object.entries(schema.models)) {
    if ((model as any)._modelType === modelType) {
      models.push({ name, model });
    }
  }

  return models;
}

/**
 * Count models by type
 */
export function countModelsByType(schema: any, modelType: 'crud' | 'event' | 'function'): number {
  return getModelsByType(schema, modelType).length;
}

// ============================================================================
// End-to-End Validation Helpers
// ============================================================================

/**
 * Validate complete backend-to-resources pipeline
 *
 * @remarks
 * Comprehensive validation that ensures:
 * 1. Backend structure is valid
 * 2. Schema is properly configured
 * 3. Attachment points are functional
 * 4. Resources can be synthesized
 */
export async function validateCompleteBackendPipeline(backend: BackendObject) {
  // Step 1: Validate backend structure
  assertValidBackendStructure(backend);

  // Step 2: Validate attachment points
  assertValidInfrastructureAttachmentPoints(backend);

  // Step 3: Validate schema
  expect(backend.schema.models).toBeDefined();
  expect(Object.keys(backend.schema.models).length).toBeGreaterThan(0);

  // Step 4: Create synthesis context
  const context = createMockSynthesisContext(backend);

  // Step 5: Simulate basic resource creation
  const storageAccount = simulateResourceSynthesis(
    context,
    'Microsoft.Storage/storageAccounts',
    `${backend.settings.name}storage`,
    {
      sku: { name: 'Standard_LRS' },
      kind: 'StorageV2',
    }
  );

  expect(storageAccount).toBeDefined();

  // Step 6: Validate resource properties
  assertResourceHasProperties(storageAccount, {
    sku: { name: 'Standard_LRS' },
    kind: 'StorageV2',
  });

  return {
    backend,
    context,
    resources: Array.from(context.resources.values()),
  };
}

// ============================================================================
// Performance Testing Helpers
// ============================================================================

/**
 * Measure execution time of a function
 */
export async function measureExecutionTime<T>(fn: () => T | Promise<T>): Promise<{
  result: T;
  executionTime: number;
}> {
  const start = performance.now();
  const result = await fn();
  const executionTime = performance.now() - start;

  return { result, executionTime };
}

/**
 * Assert execution time is within threshold
 */
export function assertExecutionTimeWithin(
  executionTime: number,
  maxMs: number,
  operation: string
) {
  if (executionTime > maxMs) {
    console.warn(`Warning: ${operation} took ${executionTime.toFixed(2)}ms (expected < ${maxMs}ms)`);
  }

  expect(executionTime).toBeLessThan(maxMs);
}

/**
 * Run performance benchmark
 */
export async function runPerformanceBenchmark(
  name: string,
  fn: () => any | Promise<any>,
  iterations: number = 10
): Promise<{
  name: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
}> {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const { executionTime } = await measureExecutionTime(fn);
    times.push(executionTime);
  }

  const totalTime = times.reduce((sum, time) => sum + time, 0);
  const averageTime = totalTime / iterations;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  return {
    name,
    iterations,
    totalTime,
    averageTime,
    minTime,
    maxTime,
  };
}

// ============================================================================
// Test Data Generators
// ============================================================================

/**
 * Generate mock user data
 */
export function generateMockUser(overrides: Partial<any> = {}) {
  return {
    id: `user-${Math.random().toString(36).substring(7)}`,
    email: `test-${Math.random().toString(36).substring(7)}@example.com`,
    name: `Test User ${Math.random().toString(36).substring(7)}`,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Generate mock dataset data
 */
export function generateMockDataset(overrides: Partial<any> = {}) {
  return {
    id: `dataset-${Math.random().toString(36).substring(7)}`,
    name: `Test Dataset ${Math.random().toString(36).substring(7)}`,
    fileUrl: `https://example.com/datasets/${Math.random().toString(36).substring(7)}.csv`,
    sizeBytes: Math.floor(Math.random() * 10000000),
    status: 'ready',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Generate batch of test items
 */
export function generateBatch<T>(
  generator: (index: number) => T,
  count: number
): T[] {
  const items: T[] = [];

  for (let i = 0; i < count; i++) {
    items.push(generator(i));
  }

  return items;
}

// ============================================================================
// Cleanup Helpers
// ============================================================================

/**
 * Cleanup context for tests
 */
export interface TestCleanupContext {
  cleanupFunctions: Array<() => void | Promise<void>>;
}

/**
 * Create test cleanup context
 */
export function createCleanupContext(): TestCleanupContext {
  return {
    cleanupFunctions: [],
  };
}

/**
 * Register cleanup function
 */
export function registerCleanup(
  context: TestCleanupContext,
  cleanup: () => void | Promise<void>
) {
  context.cleanupFunctions.push(cleanup);
}

/**
 * Run all cleanup functions
 */
export async function runCleanup(context: TestCleanupContext) {
  for (const cleanup of context.cleanupFunctions) {
    await cleanup();
  }

  context.cleanupFunctions = [];
}

// ============================================================================
// Error Testing Helpers
// ============================================================================

/**
 * Assert function throws specific error
 */
export async function assertThrowsError(
  fn: () => any | Promise<any>,
  expectedError: string | RegExp
) {
  let thrown = false;
  let error: any;

  try {
    await fn();
  } catch (e) {
    thrown = true;
    error = e;
  }

  expect(thrown).toBe(true);

  if (typeof expectedError === 'string') {
    expect(error.message).toContain(expectedError);
  } else {
    expect(error.message).toMatch(expectedError);
  }
}

/**
 * Assert async function throws
 */
export async function expectAsyncThrow(fn: () => Promise<any>) {
  let thrown = false;

  try {
    await fn();
  } catch (e) {
    thrown = true;
  }

  expect(thrown).toBe(true);
}
