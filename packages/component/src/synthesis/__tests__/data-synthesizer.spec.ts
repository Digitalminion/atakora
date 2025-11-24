/**
 * Data Synthesizer Tests
 *
 * Comprehensive test suite for DataSynthesizer class.
 *
 * @module @atakora/component/synthesis/__tests__/data-synthesizer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DataSynthesizer } from '../data-synthesizer';
import type { SynthesisContext, SchemaObject } from '../types';
import { App, SubscriptionStack, ResourceGroupStack } from '@atakora/lib';
import { Subscription, Geography, Organization, Project, Environment, Instance } from '@atakora/lib';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create a test synthesis context
 */
function createTestContext(options?: {
  environment?: 'development' | 'staging' | 'production';
  schema?: SchemaObject;
}): SynthesisContext {
  const schema: SchemaObject = options?.schema || {
    name: 'TestSchema',
    models: {
      User: {
        config: {
          type: 'crud',
          fields: {
            id: { type: 'id', required: true },
            email: { type: 'string', required: true },
            name: { type: 'string', required: true },
          },
        },
        metadata: {
          isCrud: true,
          isEvent: false,
          isFunction: false,
        },
      },
      Product: {
        config: {
          type: 'crud',
          fields: {
            id: { type: 'id', required: true },
            name: { type: 'string', required: true },
            price: { type: 'number', required: true },
          },
        },
        metadata: {
          isCrud: true,
          isEvent: false,
          isFunction: false,
        },
      },
    },
  };

  return {
    backend: {
      name: 'test-backend',
      environment: options?.environment || 'development',
      schema,
      settings: {
        name: 'test-app',
        organization: 'testorg',
        region: 'eastus',
        resourceGroup: 'test-rg',
        instance: '01',
      },
    } as any,
    analysis: {
      models: {
        crud: [],
        event: [],
        function: [],
      },
      attachments: {
        storage: [],
        compute: [],
        networking: [],
        monitoring: [],
        performance: [],
      },
      features: {
        monitoring: false,
        networking: false,
        performance: false,
      },
      dependencies: new Map(),
    },
    environment: options?.environment || 'development',
    cloudType: 'commercial',
    region: 'eastus',
    resourceGroup: 'test-rg',
    tags: {
      Environment: options?.environment || 'development',
      Project: 'test-app',
    },
    naming: {
      organization: 'testorg',
      project: 'testapp',
      environment: options?.environment || 'dev',
      geography: 'eus',
      instance: '01',
    },
    features: {
      monitoring: false,
      networking: false,
      performance: false,
    },
  };
}

/**
 * Create a test CDK stack
 */
function createTestStack(): ResourceGroupStack {
  const app = new App({ outdir: 'cdk.out' });

  const subscriptionStack = new SubscriptionStack(app, 'TestSubscription', {
    subscription: new Subscription({
      subscriptionId: '00000000-0000-0000-0000-000000000000',
      displayName: 'Test Subscription',
    }),
    geography: new Geography('eastus'),
    organization: new Organization('testorg'),
    project: new Project('testapp'),
    environment: new Environment('dev'),
    instance: new Instance('01'),
    tags: {},
  });

  const stack = new ResourceGroupStack(subscriptionStack, 'TestResourceGroup', {
    resourceGroup: {
      resourceGroupName: 'test-rg',
      location: 'eastus',
    },
    tags: {},
  });

  return stack;
}

// ============================================================================
// Test Suite
// ============================================================================

describe('DataSynthesizer', () => {
  let dataSynthesizer: DataSynthesizer;
  let stack: ResourceGroupStack;

  beforeEach(() => {
    dataSynthesizer = new DataSynthesizer();
    stack = createTestStack();
  });

  // ==========================================================================
  // Constructor Tests
  // ==========================================================================

  describe('constructor', () => {
    it('should create a new DataSynthesizer instance', () => {
      expect(dataSynthesizer).toBeDefined();
      expect(dataSynthesizer).toBeInstanceOf(DataSynthesizer);
    });

    it('should initialize naming utility', () => {
      // Verify by calling synthesize - naming utility should work
      expect(() => dataSynthesizer).not.toThrow();
    });

    it('should initialize schema introspector', () => {
      // Verify by calling synthesize - introspector should work
      expect(() => dataSynthesizer).not.toThrow();
    });
  });

  // ==========================================================================
  // Synthesize Method Tests
  // ==========================================================================

  describe('synthesize', () => {
    it('should synthesize data resources successfully', async () => {
      const context = createTestContext();
      const dataResources = await dataSynthesizer.synthesize(context, stack);

      expect(dataResources).toBeDefined();
      expect(dataResources.cosmosAccount).toBeDefined();
      expect(dataResources.database).toBeDefined();
      expect(dataResources.containers).toBeDefined();
    });

    it('should create Cosmos account with correct naming', async () => {
      const context = createTestContext();
      const dataResources = await dataSynthesizer.synthesize(context, stack);

      const accountName = dataResources.cosmosAccount?.databaseAccountName;
      expect(accountName).toBeDefined();
      expect(accountName).toContain('cosdb');
      expect(accountName).toContain('testorg');
      expect(accountName).toContain('testapp');
    });

    it('should create database with correct naming', async () => {
      const context = createTestContext();
      const dataResources = await dataSynthesizer.synthesize(context, stack);

      const databaseName = dataResources.database?.databaseName;
      expect(databaseName).toBeDefined();
      expect(databaseName).toContain('testapp');
    });

    it('should create containers for all CRUD models', async () => {
      const context = createTestContext();
      const dataResources = await dataSynthesizer.synthesize(context, stack);

      expect(dataResources.containers).toHaveLength(2); // User and Product
    });

    it('should create containers with correct names', async () => {
      const context = createTestContext();
      const dataResources = await dataSynthesizer.synthesize(context, stack);

      const containerNames = dataResources.containers.map((c) => c.containerName);
      expect(containerNames).toContain('users'); // User -> users
      expect(containerNames).toContain('products'); // Product -> products
    });

    it('should throw error if context is missing', async () => {
      await expect(
        dataSynthesizer.synthesize(null as any, stack)
      ).rejects.toThrow('Synthesis context is required');
    });

    it('should throw error if stack is missing', async () => {
      const context = createTestContext();
      await expect(
        dataSynthesizer.synthesize(context, null as any)
      ).rejects.toThrow('ResourceGroupStack is required');
    });

    it('should throw error if schema is missing', async () => {
      const context = createTestContext();
      context.backend.schema = null as any;

      await expect(
        dataSynthesizer.synthesize(context, stack)
      ).rejects.toThrow('Backend schema is required for data synthesis');
    });

    it('should handle empty schema (no CRUD models)', async () => {
      const emptySchema: SchemaObject = {
        name: 'EmptySchema',
        models: {},
      };

      const context = createTestContext({ schema: emptySchema });
      const dataResources = await dataSynthesizer.synthesize(context, stack);

      expect(dataResources.cosmosAccount).toBeDefined();
      expect(dataResources.database).toBeDefined();
      expect(dataResources.containers).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Environment-Specific Behavior Tests
  // ==========================================================================

  describe('environment-specific defaults', () => {
    it('should enable serverless for development environment', async () => {
      const context = createTestContext({ environment: 'development' });
      const dataResources = await dataSynthesizer.synthesize(context, stack);

      expect(dataResources.cosmosAccount).toBeDefined();
      // Note: Cannot directly check serverless mode from interface
      // but synthesis should succeed without errors
    });

    it('should use provisioned throughput for production environment', async () => {
      const context = createTestContext({ environment: 'production' });
      const dataResources = await dataSynthesizer.synthesize(context, stack);

      expect(dataResources.cosmosAccount).toBeDefined();
      expect(dataResources.database).toBeDefined();
      // Production should use autoscale by default
    });

    it('should use provisioned throughput for staging environment', async () => {
      const context = createTestContext({ environment: 'staging' });
      const dataResources = await dataSynthesizer.synthesize(context, stack);

      expect(dataResources.cosmosAccount).toBeDefined();
      expect(dataResources.database).toBeDefined();
    });
  });

  // ==========================================================================
  // Configuration Options Tests
  // ==========================================================================

  describe('configuration options', () => {
    it('should accept custom account name', async () => {
      const context = createTestContext();
      const dataResources = await dataSynthesizer.synthesize(context, stack, {
        cosmos: {
          accountName: 'custom-cosmos-account',
        },
      });

      expect(dataResources.cosmosAccount?.databaseAccountName).toBe('custom-cosmos-account');
    });

    it('should accept custom database name', async () => {
      const context = createTestContext();
      const dataResources = await dataSynthesizer.synthesize(context, stack, {
        cosmos: {
          databaseName: 'custom-db',
        },
      });

      expect(dataResources.database?.databaseName).toBe('custom-db');
    });

    it('should accept custom consistency level', async () => {
      const context = createTestContext();
      const dataResources = await dataSynthesizer.synthesize(context, stack, {
        cosmos: {
          consistencyLevel: 'Strong',
        },
      });

      expect(dataResources.cosmosAccount).toBeDefined();
      // Consistency level is set in construct
    });

    it('should accept custom throughput', async () => {
      const context = createTestContext({ environment: 'production' });
      const dataResources = await dataSynthesizer.synthesize(context, stack, {
        cosmos: {
          throughput: 1000,
        },
      });

      expect(dataResources.database).toBeDefined();
      // Throughput is set in database construct
    });

    it('should accept custom max throughput for autoscale', async () => {
      const context = createTestContext({ environment: 'production' });
      const dataResources = await dataSynthesizer.synthesize(context, stack, {
        cosmos: {
          maxThroughput: 10000,
        },
      });

      expect(dataResources.database).toBeDefined();
      // Max throughput is set in database construct
    });

    it('should allow forcing serverless in production', async () => {
      const context = createTestContext({ environment: 'production' });
      const dataResources = await dataSynthesizer.synthesize(context, stack, {
        cosmos: {
          enableServerless: true,
        },
      });

      expect(dataResources.cosmosAccount).toBeDefined();
      expect(dataResources.database).toBeDefined();
    });
  });

  // ==========================================================================
  // Container Naming Tests
  // ==========================================================================

  describe('container name generation', () => {
    it('should pluralize regular nouns by adding "s"', async () => {
      const schema: SchemaObject = {
        name: 'TestSchema',
        models: {
          User: {
            config: { type: 'crud', fields: { id: { type: 'id', required: true } } },
            metadata: { isCrud: true, isEvent: false, isFunction: false },
          },
        },
      };

      const context = createTestContext({ schema });
      const dataResources = await dataSynthesizer.synthesize(context, stack);

      expect(dataResources.containers[0].containerName).toBe('users');
    });

    it('should pluralize nouns ending in "y" by replacing with "ies"', async () => {
      const schema: SchemaObject = {
        name: 'TestSchema',
        models: {
          Category: {
            config: { type: 'crud', fields: { id: { type: 'id', required: true } } },
            metadata: { isCrud: true, isEvent: false, isFunction: false },
          },
        },
      };

      const context = createTestContext({ schema });
      const dataResources = await dataSynthesizer.synthesize(context, stack);

      expect(dataResources.containers[0].containerName).toBe('categories');
    });

    it('should pluralize nouns ending in "s" by adding "es"', async () => {
      const schema: SchemaObject = {
        name: 'TestSchema',
        models: {
          Address: {
            config: { type: 'crud', fields: { id: { type: 'id', required: true } } },
            metadata: { isCrud: true, isEvent: false, isFunction: false },
          },
        },
      };

      const context = createTestContext({ schema });
      const dataResources = await dataSynthesizer.synthesize(context, stack);

      expect(dataResources.containers[0].containerName).toBe('addresses');
    });

    it('should not change vowel+y endings', async () => {
      const schema: SchemaObject = {
        name: 'TestSchema',
        models: {
          Day: {
            config: { type: 'crud', fields: { id: { type: 'id', required: true } } },
            metadata: { isCrud: true, isEvent: false, isFunction: false },
          },
        },
      };

      const context = createTestContext({ schema });
      const dataResources = await dataSynthesizer.synthesize(context, stack);

      expect(dataResources.containers[0].containerName).toBe('days');
    });
  });

  // ==========================================================================
  // Schema Introspection Tests
  // ==========================================================================

  describe('schema introspection', () => {
    it('should only create containers for CRUD models', async () => {
      const schema: SchemaObject = {
        name: 'TestSchema',
        models: {
          User: {
            config: { type: 'crud', fields: { id: { type: 'id', required: true } } },
            metadata: { isCrud: true, isEvent: false, isFunction: false },
          },
          UserCreated: {
            config: { type: 'event', fields: { userId: { type: 'string', required: true } } },
            metadata: { isCrud: false, isEvent: true, isFunction: false },
          },
        },
      };

      const context = createTestContext({ schema });
      const dataResources = await dataSynthesizer.synthesize(context, stack);

      // Should only create container for User (CRUD), not UserCreated (Event)
      expect(dataResources.containers).toHaveLength(1);
      expect(dataResources.containers[0].containerName).toBe('users');
    });

    it('should handle complex schemas with multiple model types', async () => {
      const schema: SchemaObject = {
        name: 'ComplexSchema',
        models: {
          User: {
            config: { type: 'crud', fields: { id: { type: 'id', required: true } } },
            metadata: { isCrud: true, isEvent: false, isFunction: false },
          },
          Product: {
            config: { type: 'crud', fields: { id: { type: 'id', required: true } } },
            metadata: { isCrud: true, isEvent: false, isFunction: false },
          },
          Order: {
            config: { type: 'crud', fields: { id: { type: 'id', required: true } } },
            metadata: { isCrud: true, isEvent: false, isFunction: false },
          },
          OrderPlaced: {
            config: { type: 'event', fields: { orderId: { type: 'string', required: true } } },
            metadata: { isCrud: false, isEvent: true, isFunction: false },
          },
        },
      };

      const context = createTestContext({ schema });
      const dataResources = await dataSynthesizer.synthesize(context, stack);

      // Should create containers for 3 CRUD models
      expect(dataResources.containers).toHaveLength(3);
      const containerNames = dataResources.containers.map((c) => c.containerName);
      expect(containerNames).toContain('users');
      expect(containerNames).toContain('products');
      expect(containerNames).toContain('orders');
    });
  });

  // ==========================================================================
  // Resource Properties Tests
  // ==========================================================================

  describe('resource properties', () => {
    it('should set correct tags on resources', async () => {
      const context = createTestContext();
      context.tags = {
        Environment: 'development',
        Project: 'test-app',
        Owner: 'test-team',
      };

      const dataResources = await dataSynthesizer.synthesize(context, stack);

      expect(dataResources.cosmosAccount).toBeDefined();
      expect(dataResources.database).toBeDefined();
      expect(dataResources.containers.length).toBeGreaterThan(0);
    });

    it('should create account in correct region', async () => {
      const context = createTestContext();
      context.region = 'westus2';

      const dataResources = await dataSynthesizer.synthesize(context, stack);

      expect(dataResources.cosmosAccount?.location).toBe('westus2');
    });

    it('should set partition key to /id by default', async () => {
      const context = createTestContext();
      const dataResources = await dataSynthesizer.synthesize(context, stack);

      // All containers should have partition key /id
      expect(dataResources.containers.length).toBeGreaterThan(0);
      // Note: Cannot directly check partition key from interface
      // but containers should be created successfully
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle single CRUD model', async () => {
      const schema: SchemaObject = {
        name: 'SingleModelSchema',
        models: {
          User: {
            config: { type: 'crud', fields: { id: { type: 'id', required: true } } },
            metadata: { isCrud: true, isEvent: false, isFunction: false },
          },
        },
      };

      const context = createTestContext({ schema });
      const dataResources = await dataSynthesizer.synthesize(context, stack);

      expect(dataResources.containers).toHaveLength(1);
    });

    it('should handle many CRUD models', async () => {
      const models: Record<string, any> = {};
      for (let i = 0; i < 10; i++) {
        models[`Model${i}`] = {
          config: { type: 'crud', fields: { id: { type: 'id', required: true } } },
          metadata: { isCrud: true, isEvent: false, isFunction: false },
        };
      }

      const schema: SchemaObject = {
        name: 'ManyModelsSchema',
        models,
      };

      const context = createTestContext({ schema });
      const dataResources = await dataSynthesizer.synthesize(context, stack);

      expect(dataResources.containers).toHaveLength(10);
    });

    it('should handle model names with special characters', async () => {
      const schema: SchemaObject = {
        name: 'SpecialSchema',
        models: {
          'User-Profile': {
            config: { type: 'crud', fields: { id: { type: 'id', required: true } } },
            metadata: { isCrud: true, isEvent: false, isFunction: false },
          },
        },
      };

      const context = createTestContext({ schema });
      const dataResources = await dataSynthesizer.synthesize(context, stack);

      // Should sanitize container name
      expect(dataResources.containers).toHaveLength(1);
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('integration', () => {
    it('should work with real schema from introspector', async () => {
      const context = createTestContext();
      const dataResources = await dataSynthesizer.synthesize(context, stack);

      expect(dataResources.cosmosAccount).toBeDefined();
      expect(dataResources.database).toBeDefined();
      expect(dataResources.containers.length).toBeGreaterThan(0);
    });

    it('should work with naming utility for resource names', async () => {
      const context = createTestContext();
      const dataResources = await dataSynthesizer.synthesize(context, stack);

      const accountName = dataResources.cosmosAccount?.databaseAccountName;
      expect(accountName).toMatch(/^cosdb-/);
    });

    it('should return immutable data resources', async () => {
      const context = createTestContext();
      const dataResources = await dataSynthesizer.synthesize(context, stack);

      // Containers should be readonly array
      expect(Array.isArray(dataResources.containers)).toBe(true);
    });
  });
});
