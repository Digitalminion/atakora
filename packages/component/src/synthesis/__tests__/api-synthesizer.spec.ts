/**
 * API Synthesizer Tests
 *
 * @module @atakora/component/synthesis/__tests__/api-synthesizer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ApiSynthesizer } from '../api-synthesizer';
import type { SynthesisContext, ApiResources } from '../types';
import type { BackendObject } from '../../backend/types';
import type { SchemaObject } from '../../schema/types';
import {
  App,
  ResourceGroupStack,
  SubscriptionStack,
  Organization,
  Project,
  Environment as EnvironmentNaming,
  Geography,
  Instance,
  Subscription,
} from '@atakora/lib';

/**
 * Create a mock synthesis context for testing
 */
function createMockContext(overrides?: Partial<SynthesisContext>): SynthesisContext {
  const mockSchema: SchemaObject = {
    schema: {},
    models: {
      User: {
        name: 'User',
        config: {
          type: 'crud',
          fields: {
            id: {
              type: 'id',
              required: true,
              fieldName: 'id',
              baseType: 'id',
            },
            name: {
              type: 'string',
              required: true,
              fieldName: 'name',
              baseType: 'string',
            },
            email: {
              type: 'string',
              required: true,
              fieldName: 'email',
              baseType: 'string',
            },
          },
          primaryKey: 'id',
          indexes: [],
          authorization: [],
        },
        metadata: {
          isCrud: true,
          isEvent: false,
          isFunction: false,
        },
      },
      Product: {
        name: 'Product',
        config: {
          type: 'crud',
          fields: {
            id: {
              type: 'id',
              required: true,
              fieldName: 'id',
              baseType: 'id',
            },
            title: {
              type: 'string',
              required: true,
              fieldName: 'title',
              baseType: 'string',
            },
            price: {
              type: 'number',
              required: true,
              fieldName: 'price',
              baseType: 'number',
            },
          },
          primaryKey: 'id',
          indexes: [],
          authorization: [],
        },
        metadata: {
          isCrud: true,
          isEvent: false,
          isFunction: false,
        },
      },
    },
    _metadata: {
      version: '1.0',
      createdAt: new Date().toISOString(),
      models: {
        crud: ['User', 'Product'],
        events: [],
        functions: [],
      },
    },
    _raw: {} as any,
  };

  const mockBackend: BackendObject = {
    schema: mockSchema,
    settings: {
      name: 'testapp',
      environment: 'dev',
      region: 'eastus',
      organization: 'testorg',
      geography: 'eus',
      instance: '01',
      features: {
        monitoring: false,
        networking: false,
        performance: false,
      },
      tags: {},
    },
  };

  const defaultContext: SynthesisContext = {
    backend: mockBackend,
    analysis: {
      models: {
        crud: [
          {
            name: 'User',
            type: 'crud',
            definition: mockSchema.models.User.config,
            fields: [],
            metadata: {
              isCrud: true,
              isEvent: false,
              isFunction: false,
            },
          },
          {
            name: 'Product',
            type: 'crud',
            definition: mockSchema.models.Product.config,
            fields: [],
            metadata: {
              isCrud: true,
              isEvent: false,
              isFunction: false,
            },
          },
        ],
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
      dependencies: [],
    },
    environment: 'dev' as any,
    cloudType: 'commercial',
    region: 'eastus',
    resourceGroup: 'testapp-rg',
    tags: { environment: 'dev' },
    naming: {
      organization: 'testorg',
      project: 'testapp',
      environment: 'dev',
      geography: 'eus',
      instance: '01',
    },
    features: {
      monitoring: false,
      networking: false,
      performance: false,
    },
  };

  return { ...defaultContext, ...overrides };
}

/**
 * Create a mock resource group stack for testing
 */
function createMockStack(): ResourceGroupStack {
  const app = new App({ outdir: 'cdk.out' });

  const subscriptionStack = new SubscriptionStack(app, 'TestSubscription', {
    subscription: new Subscription({
      subscriptionId: '00000000-0000-0000-0000-000000000000',
      displayName: 'Test Subscription',
    }),
    geography: new Geography('eastus'),
    organization: new Organization('testorg'),
    project: new Project('testapp'),
    environment: new EnvironmentNaming('dev'),
    instance: new Instance('01'),
    tags: {},
  });

  const stack = new ResourceGroupStack(subscriptionStack, 'TestResourceGroup', {
    resourceGroup: {
      resourceGroupName: 'testapp-rg',
      location: 'eastus',
    },
    tags: {},
  });

  return stack;
}

describe('ApiSynthesizer', () => {
  let synthesizer: ApiSynthesizer;
  let context: SynthesisContext;
  let stack: ResourceGroupStack;

  beforeEach(() => {
    synthesizer = new ApiSynthesizer();
    context = createMockContext();
    stack = createMockStack();
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(synthesizer).toBeInstanceOf(ApiSynthesizer);
    });
  });

  describe('synthesize', () => {
    it('should synthesize API resources successfully', async () => {
      const resources = await synthesizer.synthesize(context, stack);

      expect(resources).toBeDefined();
      expect(resources.apim).not.toBeNull();
      expect(resources.api).not.toBeNull();
      expect(resources.operations).toBeDefined();
      expect(Array.isArray(resources.operations)).toBe(true);
    });

    it('should create APIM service with correct naming', async () => {
      const resources = await synthesizer.synthesize(context, stack);

      expect(resources.apim).not.toBeNull();
      if (resources.apim) {
        // Name format: apim-{org}-{project}-{env}-{geo}-{instance}
        expect(resources.apim.serviceName).toMatch(/^apim-testorg-testapp-dev-eus-01$/);
      }
    });

    it('should create API within APIM', async () => {
      const resources = await synthesizer.synthesize(context, stack);

      expect(resources.api).not.toBeNull();
      if (resources.api) {
        expect(resources.api.apiName).toBe('testapp-api');
        expect(resources.api.path).toBe('api/testapp');
      }
    });

    it('should generate operations for all CRUD models', async () => {
      const resources = await synthesizer.synthesize(context, stack);

      // Should have 5 operations per CRUD model (User and Product = 10 total)
      expect(resources.operations.length).toBe(10);
    });

    it('should generate 5 operations per CRUD model', async () => {
      // Create context with single model
      const singleModelContext = createMockContext({
        backend: {
          ...context.backend,
          schema: {
            schema: {},
            models: {
              User: context.backend.schema.models.User,
            },
            _metadata: {
              version: '1.0',
              createdAt: new Date().toISOString(),
              models: {
                crud: ['User'],
                events: [],
                functions: [],
              },
            },
            _raw: {} as any,
          },
        },
        analysis: {
          ...context.analysis,
          models: {
            crud: [context.analysis.models.crud[0]],
            event: [],
            function: [],
          },
        },
      });

      const resources = await synthesizer.synthesize(singleModelContext, stack);

      // Should have exactly 5 operations for the User model
      expect(resources.operations.length).toBe(5);
    });

    it('should generate operations with correct HTTP methods', async () => {
      const resources = await synthesizer.synthesize(context, stack);

      // Count operations by HTTP method
      const methodCounts = resources.operations.reduce((acc, op) => {
        acc[op.method] = (acc[op.method] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // With 2 models, should have:
      // - 2 GET (list) + 2 GET (get) = 4 GET
      // - 2 POST (create) = 2 POST
      // - 2 PUT (update) = 2 PUT
      // - 2 DELETE (delete) = 2 DELETE
      expect(methodCounts.GET).toBe(4); // list + get for each model
      expect(methodCounts.POST).toBe(2); // create for each model
      expect(methodCounts.PUT).toBe(2); // update for each model
      expect(methodCounts.DELETE).toBe(2); // delete for each model
    });

    it('should use pluralized names in URLs', async () => {
      const resources = await synthesizer.synthesize(context, stack);

      // Find User model operations
      const userListOp = resources.operations.find(op => op.operationId === 'listUsers');
      const productListOp = resources.operations.find(op => op.operationId === 'listProducts');

      expect(userListOp).toBeDefined();
      expect(userListOp?.path).toBe('/users');

      expect(productListOp).toBeDefined();
      expect(productListOp?.path).toBe('/products');
    });

    it('should generate correct operation IDs', async () => {
      const resources = await synthesizer.synthesize(context, stack);

      // Check User operations
      const userOperationIds = resources.operations
        .filter(op => op.operationId.includes('User'))
        .map(op => op.operationId)
        .sort();

      expect(userOperationIds).toEqual([
        'createUser',
        'deleteUser',
        'getUser',
        'listUsers',
        'updateUser',
      ]);

      // Check Product operations
      const productOperationIds = resources.operations
        .filter(op => op.operationId.includes('Product'))
        .map(op => op.operationId)
        .sort();

      expect(productOperationIds).toEqual([
        'createProduct',
        'deleteProduct',
        'getProduct',
        'listProducts',
        'updateProduct',
      ]);
    });

    it('should generate list operations without ID parameter', async () => {
      const resources = await synthesizer.synthesize(context, stack);

      const listOps = resources.operations.filter(op => op.method === 'GET' && !op.path.includes('{id}'));

      expect(listOps.length).toBe(2); // One for each model
      expect(listOps[0].path).not.toContain('{id}');
      expect(listOps[1].path).not.toContain('{id}');
    });

    it('should generate item operations with ID parameter', async () => {
      const resources = await synthesizer.synthesize(context, stack);

      const itemOps = resources.operations.filter(op => op.path.includes('{id}'));

      // get, update, delete for each model = 6 total
      expect(itemOps.length).toBe(6);

      // All should have {id} in path
      itemOps.forEach(op => {
        expect(op.path).toContain('{id}');
      });
    });

    it('should include display names for all operations', async () => {
      const resources = await synthesizer.synthesize(context, stack);

      resources.operations.forEach(op => {
        expect(op.displayName).toBeDefined();
        expect(op.displayName.length).toBeGreaterThan(0);
      });
    });

    it('should include descriptions for all operations', async () => {
      const resources = await synthesizer.synthesize(context, stack);

      resources.operations.forEach(op => {
        expect(op.description).toBeDefined();
        expect(op.description!.length).toBeGreaterThan(0);
      });
    });

    it('should handle empty schema gracefully', async () => {
      const emptyContext = createMockContext({
        backend: {
          ...context.backend,
          schema: {
            schema: {},
            models: {},
            _metadata: {
              version: '1.0',
              createdAt: new Date().toISOString(),
              models: {
                crud: [],
                events: [],
                functions: [],
              },
            },
            _raw: {} as any,
          },
        },
        analysis: {
          ...context.analysis,
          models: {
            crud: [],
            event: [],
            function: [],
          },
        },
      });

      const resources = await synthesizer.synthesize(emptyContext, stack);

      expect(resources.apim).not.toBeNull();
      expect(resources.api).not.toBeNull();
      expect(resources.operations.length).toBe(0); // No models = no operations
    });
  });

  describe('CRUD operation pattern validation', () => {
    it('should follow standard REST conventions for User model', async () => {
      const resources = await synthesizer.synthesize(context, stack);

      const userOps = resources.operations.filter(op =>
        op.operationId.includes('User') || op.path.includes('users')
      );

      // List operation
      const listOp = userOps.find(op => op.operationId === 'listUsers');
      expect(listOp).toMatchObject({
        operationId: 'listUsers',
        displayName: 'List Users',
        method: 'GET',
        path: '/users',
      });

      // Create operation
      const createOp = userOps.find(op => op.operationId === 'createUser');
      expect(createOp).toMatchObject({
        operationId: 'createUser',
        displayName: 'Create User',
        method: 'POST',
        path: '/users',
      });

      // Get operation
      const getOp = userOps.find(op => op.operationId === 'getUser');
      expect(getOp).toMatchObject({
        operationId: 'getUser',
        displayName: 'Get User',
        method: 'GET',
        path: '/users/{id}',
      });

      // Update operation
      const updateOp = userOps.find(op => op.operationId === 'updateUser');
      expect(updateOp).toMatchObject({
        operationId: 'updateUser',
        displayName: 'Update User',
        method: 'PUT',
        path: '/users/{id}',
      });

      // Delete operation
      const deleteOp = userOps.find(op => op.operationId === 'deleteUser');
      expect(deleteOp).toMatchObject({
        operationId: 'deleteUser',
        displayName: 'Delete User',
        method: 'DELETE',
        path: '/users/{id}',
      });
    });
  });
});
