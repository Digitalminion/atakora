/**
 * Test fixtures and mocks for Backend Pattern tests
 *
 * Provides reusable test data, mock implementations, and helper functions
 * for testing the Backend Pattern implementation.
 *
 * @module @atakora/component/__tests__/backend/fixtures
 */

import { Construct } from '@atakora/cdk';
import type {
  IBackendComponent,
  IComponentDefinition,
  IResourceRequirement,
  IResourceProvider,
  ResourceMap,
  ValidationResult,
  ProviderContext,
  BackendConfig,
  ComponentFactory,
} from '../../src/backend/interfaces';

// ============================================================================
// Mock Construct Implementation
// ============================================================================

/**
 * Mock CDK construct for testing
 */
export class MockConstruct implements Partial<Construct> {
  private context = new Map<string, unknown>();
  public readonly children: Construct[] = [];

  public node = {
    setContext: (key: string, value: unknown) => {
      this.context.set(key, value);
    },
    tryGetContext: (key: string) => {
      return this.context.get(key);
    },
    id: 'test-construct',
    path: '/test-construct',
    scope: undefined as unknown as Construct,
    children: this.children,
  };

  constructor(public readonly scope?: Construct, public readonly id?: string) {}
}

// ============================================================================
// Mock Component Implementation
// ============================================================================

export interface MockComponentConfig {
  readonly entityName: string;
  readonly partitionKey?: string;
  readonly requireCosmos?: boolean;
  readonly requireFunctions?: boolean;
  readonly requireStorage?: boolean;
}

/**
 * Mock component for testing
 */
export class MockComponent implements IBackendComponent<MockComponentConfig> {
  public readonly componentId: string;
  public readonly componentType = 'MockComponent';
  public readonly config: MockComponentConfig;
  public initializeCalled = false;
  public validateCalled = false;

  constructor(
    scope: Construct,
    id: string,
    config: MockComponentConfig,
    resources: ResourceMap
  ) {
    this.componentId = id;
    this.config = config;
  }

  public getRequirements(): ReadonlyArray<IResourceRequirement> {
    const requirements: IResourceRequirement[] = [];

    if (this.config.requireCosmos !== false) {
      requirements.push({
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          enableServerless: true,
          consistency: 'Session' as const,
          databases: [
            {
              name: `${this.config.entityName.toLowerCase()}-db`,
              containers: [
                {
                  name: this.config.entityName.toLowerCase(),
                  partitionKey: this.config.partitionKey ?? '/id',
                },
              ],
            },
          ],
        },
        priority: 10,
        metadata: {
          source: this.componentId,
          version: '1.0',
        },
      });
    }

    if (this.config.requireFunctions) {
      requirements.push({
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node' as const,
          version: '20',
          environmentVariables: {
            COMPONENT_ID: this.componentId,
          },
        },
        priority: 10,
        metadata: {
          source: this.componentId,
          version: '1.0',
        },
      });
    }

    if (this.config.requireStorage) {
      requirements.push({
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {
          sku: 'Standard_LRS' as const,
          kind: 'StorageV2' as const,
          containers: [
            {
              name: this.config.entityName.toLowerCase(),
            },
          ],
        },
        priority: 10,
        metadata: {
          source: this.componentId,
          version: '1.0',
        },
      });
    }

    return requirements;
  }

  public initialize(resources: ResourceMap, scope: Construct): void {
    this.initializeCalled = true;
  }

  public validateResources(resources: ResourceMap): ValidationResult {
    this.validateCalled = true;
    return { valid: true };
  }

  public getOutputs() {
    return {
      componentId: this.componentId,
      entityName: this.config.entityName,
    };
  }

  public static define(
    id: string,
    config: MockComponentConfig
  ): IComponentDefinition<MockComponentConfig> {
    return {
      componentId: id,
      componentType: 'MockComponent',
      config,
      factory: (scope, id, config, resources) =>
        new MockComponent(scope, id, config, resources),
    };
  }
}

// ============================================================================
// Mock Resource Provider
// ============================================================================

export class MockResourceProvider implements IResourceProvider {
  public readonly providerId: string;
  public readonly supportedTypes: ReadonlyArray<string>;
  public provisionCalled = false;
  public mergeRequirementsCalled = false;
  public validateMergedCalled = false;
  public provisionedResources: unknown[] = [];

  constructor(
    providerId: string = 'mock-provider',
    supportedTypes: string[] = ['mock']
  ) {
    this.providerId = providerId;
    this.supportedTypes = supportedTypes;
  }

  public canProvide(requirement: IResourceRequirement): boolean {
    return this.supportedTypes.includes(requirement.resourceType);
  }

  public provideResource(
    requirement: IResourceRequirement,
    scope: Construct,
    context: ProviderContext
  ): unknown {
    this.provisionCalled = true;
    const resource = {
      type: requirement.resourceType,
      key: requirement.requirementKey,
      config: requirement.config,
    };
    this.provisionedResources.push(resource);
    return resource;
  }

  public mergeRequirements(
    requirements: ReadonlyArray<IResourceRequirement>
  ): IResourceRequirement {
    this.mergeRequirementsCalled = true;
    if (requirements.length === 0) {
      throw new Error('Cannot merge empty requirements');
    }
    if (requirements.length === 1) {
      return requirements[0];
    }

    // Simple merge: take first requirement and merge configs
    const merged: IResourceRequirement = {
      resourceType: requirements[0].resourceType,
      requirementKey: requirements[0].requirementKey,
      config: Object.assign({}, ...requirements.map((r) => r.config)),
      priority: Math.max(...requirements.map((r) => r.priority ?? 10)),
    };

    return merged;
  }

  public validateMerged(requirement: IResourceRequirement): ValidationResult {
    this.validateMergedCalled = true;
    return { valid: true };
  }
}

// ============================================================================
// Test Data Factories
// ============================================================================

/**
 * Create a mock resource requirement
 */
export function createMockRequirement(
  resourceType: string = 'mock',
  requirementKey: string = 'default',
  config: Record<string, unknown> = {}
): IResourceRequirement {
  return {
    resourceType,
    requirementKey,
    config,
    priority: 10,
    metadata: {
      source: 'test',
      version: '1.0',
    },
  };
}

/**
 * Create a mock component definition
 */
export function createMockComponentDefinition(
  id: string,
  config: MockComponentConfig = { entityName: 'Entity' }
): IComponentDefinition<MockComponentConfig> {
  return MockComponent.define(id, config);
}

/**
 * Create a mock provider context
 */
export function createMockProviderContext(
  overrides: Partial<ProviderContext> = {}
): ProviderContext {
  return {
    backend: {} as any,
    naming: {
      formatResourceName: (type, backendId, suffix) =>
        [type, backendId, suffix].filter(Boolean).join('-'),
      formatResourceGroupName: (backendId, env) =>
        ['rg', backendId, env].filter(Boolean).join('-'),
    },
    tags: { environment: 'test' },
    existingResources: new Map(),
    location: 'eastus',
    environment: 'test',
    ...overrides,
  };
}

/**
 * Create a mock backend config
 */
export function createMockBackendConfig(
  overrides: Partial<BackendConfig> = {}
): BackendConfig {
  return {
    environment: 'test',
    location: 'eastus',
    tags: { app: 'test' },
    ...overrides,
  };
}

/**
 * Create multiple mock component definitions
 */
export function createMockComponents(
  count: number,
  configOverrides: Partial<MockComponentConfig> = {}
): Record<string, IComponentDefinition<MockComponentConfig>> {
  const components: Record<string, IComponentDefinition<MockComponentConfig>> =
    {};

  for (let i = 1; i <= count; i++) {
    const id = `component${i}`;
    components[id] = createMockComponentDefinition(id, {
      entityName: `Entity${i}`,
      ...configOverrides,
    });
  }

  return components;
}

// ============================================================================
// Mock Resource Implementations
// ============================================================================

/**
 * Mock Cosmos DB Account
 */
export class MockCosmosAccount {
  constructor(
    public readonly scope: Construct,
    public readonly id: string,
    public readonly props: any
  ) {}

  public endpoint = 'https://mock-cosmos.documents.azure.com';
  public primaryKey = 'mock-primary-key';
}

/**
 * Mock Functions App
 */
export class MockFunctionsApp {
  constructor(
    public readonly scope: Construct,
    public readonly id: string,
    public readonly props: any
  ) {}

  public appUrl = 'https://mock-function-app.azurewebsites.net';
  public defaultHostName = 'mock-function-app.azurewebsites.net';
}

/**
 * Mock Storage Account
 */
export class MockStorageAccount {
  constructor(
    public readonly scope: Construct,
    public readonly id: string,
    public readonly props: any
  ) {}

  public primaryEndpoint = 'https://mockstorage.blob.core.windows.net';
  public accountName = 'mockstorage';
}

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Wait for async operations
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a spy function
 */
export function createSpy<T extends (...args: any[]) => any>(): T & {
  calls: any[][];
  reset: () => void;
} {
  const calls: any[][] = [];
  const spy = ((...args: any[]) => {
    calls.push(args);
  }) as any;

  spy.calls = calls;
  spy.reset = () => {
    calls.length = 0;
  };

  return spy;
}

/**
 * Assert that a function throws with a specific message
 */
export function assertThrows(
  fn: () => void,
  expectedMessage?: string | RegExp
): void {
  let thrown = false;
  let error: Error | undefined;

  try {
    fn();
  } catch (e) {
    thrown = true;
    error = e as Error;
  }

  if (!thrown) {
    throw new Error('Expected function to throw, but it did not');
  }

  if (expectedMessage && error) {
    if (typeof expectedMessage === 'string') {
      if (!error.message.includes(expectedMessage)) {
        throw new Error(
          `Expected error message to include "${expectedMessage}", but got "${error.message}"`
        );
      }
    } else {
      if (!expectedMessage.test(error.message)) {
        throw new Error(
          `Expected error message to match ${expectedMessage}, but got "${error.message}"`
        );
      }
    }
  }
}

/**
 * Create a mock resource map
 */
export function createMockResourceMap(
  resources: Record<string, unknown> = {}
): ResourceMap {
  return new Map(Object.entries(resources));
}

/**
 * Extract all requirement keys from requirements
 */
export function extractRequirementKeys(
  requirements: ReadonlyArray<IResourceRequirement>
): string[] {
  return requirements.map((r) => `${r.resourceType}:${r.requirementKey}`);
}

/**
 * Count requirements by type
 */
export function countRequirementsByType(
  requirements: ReadonlyArray<IResourceRequirement>
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const req of requirements) {
    counts[req.resourceType] = (counts[req.resourceType] ?? 0) + 1;
  }
  return counts;
}

/**
 * Create a performance measurement helper
 */
export function measurePerformance<T>(fn: () => T): { result: T; duration: number } {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  return { result, duration };
}

/**
 * Create a performance measurement helper for async functions
 */
export async function measurePerformanceAsync<T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
}
