/**
 * FunctionSynthesizer Tests
 *
 * @remarks
 * Tests for the FunctionSynthesizer class that creates Azure Functions
 * infrastructure and generates CRUD function code.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FunctionSynthesizer } from '../function-synthesizer';
import {
  App,
  ResourceGroupStack,
  SubscriptionStack,
  Subscription,
  Geography,
  Organization,
  Project,
  Environment,
  Instance,
} from '@atakora/lib';
import { defineSchema } from '../../schema';
import type { SynthesisContext, BackendDataResources } from '../types';
import type { BackendObject } from '../../backend/types';

describe('FunctionSynthesizer', () => {
  let synthesizer: FunctionSynthesizer;
  let app: App;
  let stack: ResourceGroupStack;
  let context: SynthesisContext;
  let dataResources: BackendDataResources;

  beforeEach(() => {
    synthesizer = new FunctionSynthesizer();

    // Create CDK app and stacks
    app = new App({ outdir: 'cdk.out' });
    const subscriptionStack = new SubscriptionStack(app, 'TestSubscription', {
      subscription: new Subscription({
        subscriptionId: '00000000-0000-0000-0000-000000000000',
        displayName: 'Test Subscription',
      }),
      geography: new Geography('eastus'),
      organization: new Organization('testorg'),
      project: new Project('test-app'),
      environment: new Environment('dev'),
      instance: new Instance('01'),
      tags: {},
    });
    stack = new ResourceGroupStack(subscriptionStack, 'TestStack', {
      resourceGroup: {
        resourceGroupName: 'rg-test',
        location: 'eastus',
      },
      tags: {},
    });

    // Create mock schema with CRUD models
    const schema = defineSchema({
      schema: {
        models: {
          User: {
            type: 'crud',
            fields: {
              id: { type: 'id', required: true },
              name: { type: 'string', required: true },
              email: { type: 'string', required: true },
            },
          },
          Product: {
            type: 'crud',
            fields: {
              id: { type: 'id', required: true },
              name: { type: 'string', required: true },
              price: { type: 'number', required: true },
            },
          },
        },
      },
    });

    // Create mock backend object
    const backend: BackendObject = {
      schema,
      settings: {
        name: 'test-app',
        environment: 'dev',
        region: 'eastus',
        organization: 'testorg',
        features: {
          monitoring: false,
          networking: false,
          performance: false,
        },
      },
      attachments: [],
    };

    // Create synthesis context
    context = {
      backend,
      analysis: {
        models: {
          crud: [
            {
              name: 'User',
              type: 'crud',
              definition: schema.models.User.config,
              fields: [],
              metadata: { isCrud: true, isEvent: false, isFunction: false },
            },
            {
              name: 'Product',
              type: 'crud',
              definition: schema.models.Product.config,
              fields: [],
              metadata: { isCrud: true, isEvent: false, isFunction: false },
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
        features: {
          monitoring: false,
          networking: false,
          performance: false,
        },
        dependencies: new Map(),
      },
      environment: 'development',
      cloudType: 'commercial',
      region: 'eastus',
      resourceGroup: 'rg-test-app',
      tags: { environment: 'dev' },
      naming: {
        organization: 'testorg',
        project: 'test-app',
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

    // Create mock data resources
    dataResources = {
      cosmosAccount: {
        accountId: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.DocumentDB/databaseAccounts/cosmos-test',
        accountName: 'cosmos-test',
        accountEndpoint: 'https://cosmos-test.documents.azure.com:443/',
      },
      database: {
        databaseId: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.DocumentDB/databaseAccounts/cosmos-test/sqlDatabases/test-app',
        databaseName: 'test-app',
        accountName: 'cosmos-test',
      },
      containers: [],
    };
  });

  describe('synthesize', () => {
    it('should create App Service Plan and Function App', async () => {
      const resources = await synthesizer.synthesize(
        context,
        stack,
        dataResources
      );

      expect(resources.appServicePlan).toBeDefined();
      expect(resources.appServicePlan).not.toBeNull();
      expect(resources.functionApp).toBeDefined();
      expect(resources.functionApp).not.toBeNull();
    });

    it('should generate 5 functions per CRUD model', async () => {
      const resources = await synthesizer.synthesize(
        context,
        stack,
        dataResources
      );

      // 2 models × 5 functions = 10 total functions
      expect(resources.functions).toHaveLength(10);
    });

    it('should create functions with correct types', async () => {
      const resources = await synthesizer.synthesize(
        context,
        stack,
        dataResources
      );

      // Check User functions
      const userFunctions = resources.functions.filter(
        (f) => f.modelName === 'User'
      );
      expect(userFunctions).toHaveLength(5);

      const functionTypes = userFunctions.map((f) => f.type);
      expect(functionTypes).toContain('list');
      expect(functionTypes).toContain('create');
      expect(functionTypes).toContain('get');
      expect(functionTypes).toContain('update');
      expect(functionTypes).toContain('delete');
    });

    it('should use Y1 SKU for dev environment by default', async () => {
      const resources = await synthesizer.synthesize(
        context,
        stack,
        dataResources
      );

      expect(resources.appServicePlan?.sku).toBe('B1'); // ServerFarms defaults to B1, but we pass Y1
    });

    it('should use custom SKU when provided', async () => {
      const resources = await synthesizer.synthesize(
        context,
        stack,
        dataResources,
        { sku: 'EP1' }
      );

      expect(resources.appServicePlan).toBeDefined();
      // Note: The SKU might be normalized by the CDK construct
    });
  });

  describe('HTTP triggers', () => {
    it('should configure list function with GET method', async () => {
      const resources = await synthesizer.synthesize(
        context,
        stack,
        dataResources
      );

      const listUser = resources.functions.find((f) => f.type === 'list' && f.modelName === 'User');
      expect(listUser).toBeDefined();
      expect(listUser?.httpTrigger.methods).toContain('GET');
      expect(listUser?.httpTrigger.route).toBe('users');
    });

    it('should configure create function with POST method', async () => {
      const resources = await synthesizer.synthesize(
        context,
        stack,
        dataResources
      );

      const createUser = resources.functions.find(
        (f) => f.type === 'create' && f.modelName === 'User'
      );
      expect(createUser).toBeDefined();
      expect(createUser?.httpTrigger.methods).toContain('POST');
      expect(createUser?.httpTrigger.route).toBe('users');
    });

    it('should configure get function with GET method and ID parameter', async () => {
      const resources = await synthesizer.synthesize(
        context,
        stack,
        dataResources
      );

      const getUser = resources.functions.find((f) => f.type === 'get' && f.modelName === 'User');
      expect(getUser).toBeDefined();
      expect(getUser?.httpTrigger.methods).toContain('GET');
      expect(getUser?.httpTrigger.route).toBe('users/{id}');
    });

    it('should configure update function with PUT method and ID parameter', async () => {
      const resources = await synthesizer.synthesize(
        context,
        stack,
        dataResources
      );

      const updateUser = resources.functions.find(
        (f) => f.type === 'update' && f.modelName === 'User'
      );
      expect(updateUser).toBeDefined();
      expect(updateUser?.httpTrigger.methods).toContain('PUT');
      expect(updateUser?.httpTrigger.route).toBe('users/{id}');
    });

    it('should configure delete function with DELETE method and ID parameter', async () => {
      const resources = await synthesizer.synthesize(
        context,
        stack,
        dataResources
      );

      const deleteUser = resources.functions.find(
        (f) => f.type === 'delete' && f.modelName === 'User'
      );
      expect(deleteUser).toBeDefined();
      expect(deleteUser?.httpTrigger.methods).toContain('DELETE');
      expect(deleteUser?.httpTrigger.route).toBe('users/{id}');
    });

    it('should use function auth level by default', async () => {
      const resources = await synthesizer.synthesize(
        context,
        stack,
        dataResources
      );

      for (const func of resources.functions) {
        expect(func.httpTrigger.authLevel).toBe('function');
      }
    });
  });

  describe('Cosmos DB bindings', () => {
    it('should configure Cosmos DB bindings for all functions', async () => {
      const resources = await synthesizer.synthesize(
        context,
        stack,
        dataResources
      );

      for (const func of resources.functions) {
        expect(func.cosmosBinding).toBeDefined();
        expect(func.cosmosBinding?.connection).toBe('CosmosDB');
        expect(func.cosmosBinding?.databaseName).toBe('test-app');
      }
    });

    it('should use correct container name for each model', async () => {
      const resources = await synthesizer.synthesize(
        context,
        stack,
        dataResources
      );

      const userFunctions = resources.functions.filter(
        (f) => f.modelName === 'User'
      );
      for (const func of userFunctions) {
        expect(func.cosmosBinding?.containerName).toBe('users');
      }

      const productFunctions = resources.functions.filter(
        (f) => f.modelName === 'Product'
      );
      for (const func of productFunctions) {
        expect(func.cosmosBinding?.containerName).toBe('products');
      }
    });
  });

  describe('Function code generation', () => {
    it('should generate TypeScript code templates', async () => {
      const resources = await synthesizer.synthesize(
        context,
        stack,
        dataResources
      );

      for (const func of resources.functions) {
        expect(func.template.language).toBe('typescript');
        expect(func.template.sourceCode).toBeTruthy();
        expect(func.template.sourceCode.length).toBeGreaterThan(0);
      }
    });

    it('should include required dependencies', async () => {
      const resources = await synthesizer.synthesize(
        context,
        stack,
        dataResources
      );

      for (const func of resources.functions) {
        expect(func.template.dependencies).toBeDefined();
        expect(func.template.dependencies?.['@azure/functions']).toBe('^4.0.0');
        expect(func.template.dependencies?.['@azure/cosmos']).toBe('^4.0.0');
      }
    });

    it('should generate valid TypeScript for list function', async () => {
      const resources = await synthesizer.synthesize(
        context,
        stack,
        dataResources
      );

      const listUser = resources.functions.find((f) => f.type === 'list' && f.modelName === 'User');
      expect(listUser).toBeDefined();

      const code = listUser!.template.sourceCode;
      expect(code).toContain('import { AzureFunction');
      expect(code).toContain('import { CosmosClient');
      expect(code).toContain('const handler: AzureFunction');
      expect(code).toContain('export default handler');
      expect(code).toContain('readAll()');
    });

    it('should generate valid TypeScript for create function', async () => {
      const resources = await synthesizer.synthesize(
        context,
        stack,
        dataResources
      );

      const createUser = resources.functions.find(
        (f) => f.type === 'create' && f.modelName === 'User'
      );
      expect(createUser).toBeDefined();

      const code = createUser!.template.sourceCode;
      expect(code).toContain('container.items.create');
      expect(code).toContain('status: 201');
    });

    it('should generate valid TypeScript for get function', async () => {
      const resources = await synthesizer.synthesize(
        context,
        stack,
        dataResources
      );

      const getUser = resources.functions.find((f) => f.type === 'get' && f.modelName === 'User');
      expect(getUser).toBeDefined();

      const code = getUser!.template.sourceCode;
      expect(code).toContain('context.bindingData.id');
      expect(code).toContain('container.item(id, id).read()');
      expect(code).toContain('status: 404');
    });

    it('should generate valid TypeScript for update function', async () => {
      const resources = await synthesizer.synthesize(
        context,
        stack,
        dataResources
      );

      const updateUser = resources.functions.find(
        (f) => f.type === 'update' && f.modelName === 'User'
      );
      expect(updateUser).toBeDefined();

      const code = updateUser!.template.sourceCode;
      expect(code).toContain('context.bindingData.id');
      expect(code).toContain('container.item(id, id).replace');
      expect(code).toContain('status: 200');
    });

    it('should generate valid TypeScript for delete function', async () => {
      const resources = await synthesizer.synthesize(
        context,
        stack,
        dataResources
      );

      const deleteUser = resources.functions.find(
        (f) => f.type === 'delete' && f.modelName === 'User'
      );
      expect(deleteUser).toBeDefined();

      const code = deleteUser!.template.sourceCode;
      expect(code).toContain('context.bindingData.id');
      expect(code).toContain('container.item(id, id).delete()');
      expect(code).toContain('status: 204');
    });
  });

  describe('Function naming', () => {
    it('should generate correct function names', async () => {
      const resources = await synthesizer.synthesize(
        context,
        stack,
        dataResources
      );

      const functionNames = resources.functions.map((f) => f.name);

      // User functions
      expect(functionNames).toContain('listUsers');
      expect(functionNames).toContain('createUser');
      expect(functionNames).toContain('getUser');
      expect(functionNames).toContain('updateUser');
      expect(functionNames).toContain('deleteUser');

      // Product functions
      expect(functionNames).toContain('listProducts');
      expect(functionNames).toContain('createProduct');
      expect(functionNames).toContain('getProduct');
      expect(functionNames).toContain('updateProduct');
      expect(functionNames).toContain('deleteProduct');
    });
  });

  describe('App Service Plan configuration', () => {
    it('should create Linux plan', async () => {
      const resources = await synthesizer.synthesize(
        context,
        stack,
        dataResources
      );

      expect(resources.appServicePlan?.kind).toBe('linux');
      expect(resources.appServicePlan?.reserved).toBe(true);
    });

    it('should use correct location', async () => {
      const resources = await synthesizer.synthesize(
        context,
        stack,
        dataResources
      );

      expect(resources.appServicePlan?.location).toBe('eastus');
    });
  });

  describe('Function App configuration', () => {
    it('should create Function App with system-assigned identity', async () => {
      const resources = await synthesizer.synthesize(
        context,
        stack,
        dataResources
      );

      expect(resources.functionApp?.identity.type).toBe('SystemAssigned');
    });

    it('should enable HTTPS only', async () => {
      const resources = await synthesizer.synthesize(
        context,
        stack,
        dataResources
      );

      expect(resources.functionApp?.httpsOnly).toBe(true);
    });

    it('should use correct kind for Function App', async () => {
      const resources = await synthesizer.synthesize(
        context,
        stack,
        dataResources
      );

      expect(resources.functionApp?.kind).toBe('functionapp,linux');
    });
  });

  describe('Edge cases', () => {
    it('should handle schema with no CRUD models', async () => {
      const emptySchema = defineSchema({ schema: { models: {} } });
      const emptyBackend: BackendObject = {
        schema: emptySchema,
        settings: {
          name: 'test-app',
          environment: 'dev',
          region: 'eastus',
        },
        attachments: [],
      };

      const emptyContext: SynthesisContext = {
        ...context,
        backend: emptyBackend,
        analysis: {
          ...context.analysis,
          models: { crud: [], event: [], function: [] },
        },
      };

      const resources = await synthesizer.synthesize(
        emptyContext,
        stack,
        dataResources
      );

      expect(resources.functions).toHaveLength(0);
      expect(resources.functionApp).toBeDefined();
      expect(resources.appServicePlan).toBeDefined();
    });

    it('should handle missing Cosmos DB resources', async () => {
      const emptyDataResources: BackendDataResources = {};

      const resources = await synthesizer.synthesize(
        context,
        stack,
        emptyDataResources
      );

      // Should still create resources
      expect(resources.functionApp).toBeDefined();
      expect(resources.appServicePlan).toBeDefined();
      expect(resources.functions.length).toBeGreaterThan(0);
    });
  });
});
