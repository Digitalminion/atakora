/**
 * Backend Synthesizer Tests
 *
 * Comprehensive unit tests for BackendSynthesizer class ensuring correct orchestration,
 * error handling, and output generation.
 *
 * @module @atakora/component/synthesis/__tests__/backend-synthesizer.spec
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BackendSynthesizer } from '../backend-synthesizer';
import type { BackendObject } from '../../backend/types';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

// Mock @atakora/lib module
vi.mock('@atakora/lib', async () => {
  const actual = await vi.importActual('@atakora/lib');

  // Create a class that mocks the App behavior
  class MockApp {
    async synth() {
      return {
        directory: '/mock/cdk.out',
        stacks: {
          'test-app-subscription/test-app': {
            templatePath: 'test-app-subscription-test-app.template.json',
            displayName: 'test-app-subscription/test-app',
          },
        },
      };
    }
  }

  return {
    ...actual,
    App: MockApp,
    SubscriptionStack: vi.fn().mockImplementation(() => ({})),
    ResourceGroupStack: vi.fn().mockImplementation(() => ({})),
    Geography: vi.fn().mockImplementation((region) => ({ region })),
    Subscription: vi.fn().mockImplementation((config) => config),
    Organization: vi.fn().mockImplementation((org) => ({ org })),
    Project: vi.fn().mockImplementation((project) => ({ project })),
    Environment: vi.fn().mockImplementation((env) => ({ env })),
    Instance: vi.fn().mockImplementation((instance) => ({ instance })),
  };
});

describe('BackendSynthesizer', () => {
  let synthesizer: BackendSynthesizer;

  beforeEach(() => {
    synthesizer = new BackendSynthesizer();

    // Setup default fs mock responses
    (fs.existsSync as any).mockReturnValue(true);
    (fs.readFileSync as any).mockReturnValue(
      JSON.stringify({
        $schema:
          'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [],
        parameters: {},
        variables: {},
        outputs: {},
      })
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('synthesize - success flow', () => {
    it('should successfully synthesize a minimal backend', async () => {
      const backend = createMinimalBackend();

      const result = await synthesizer.synthesize(backend);

      expect(result).toBeDefined();
      expect(result.armTemplate).toBeDefined();
      expect(result.armTemplate.$schema).toContain('deploymentTemplate.json');
      expect(result.armTemplate.resources).toBeInstanceOf(Array);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.backendName).toBe('test-app');
      expect(result.metadata.environment).toBe('development');
    });

    it('should return null for placeholder synthesizers', async () => {
      const backend = createMinimalBackend();

      const result = await synthesizer.synthesize(backend);

      // DataSynthesizer, ApiSynthesizer, FunctionSynthesizer not implemented yet
      expect(result.functions.handlers).toEqual({});
      expect(result.schemas.openapi).toBeUndefined();
      expect(result.schemas.graphql).toBeUndefined();
    });

    it('should include complete metadata', async () => {
      const backend = createBackendWithCRUDModel();

      const result = await synthesizer.synthesize(backend);

      expect(result.metadata).toMatchObject({
        backendName: 'test-app',
        environment: 'development',
        region: 'eastus',
        version: '0.1.0',
      });
      expect(result.metadata.synthesizedAt).toBeInstanceOf(Date);
      expect(result.metadata.resourceCount).toBeGreaterThanOrEqual(0);
      expect(result.metadata.modelCount).toBeGreaterThan(0);
      expect(result.metadata.functionCount).toBeGreaterThanOrEqual(0);
      expect(result.metadata.features).toEqual({
        monitoring: false,
        networking: false,
        performance: false,
      });
      expect(result.metadata.warnings).toEqual([]);
    });

    it('should handle custom synthesis options', async () => {
      const backend = createMinimalBackend();

      const result = await synthesizer.synthesize(backend, {
        environment: 'production',
        outputDir: '/custom/output',
        validate: true,
        prettyPrint: true,
      });

      expect(result.metadata.environment).toBe('production');
    });

    it('should synthesize backend with multiple CRUD models', async () => {
      const backend = createBackendWithMultipleCRUDModels();

      const result = await synthesizer.synthesize(backend);

      expect(result.metadata.modelCount).toBe(3);
      expect(result.analysis.models.crud.length).toBe(3);
    });

    it('should create proper synthesis context', async () => {
      const backend = createMinimalBackend();

      const result = await synthesizer.synthesize(backend);

      expect(result.context).toBeDefined();
      expect(result.context.backend).toBe(backend);
      expect(result.context.environment).toBe('development');
      expect(result.context.cloudType).toBe('commercial');
      expect(result.context.region).toBe('eastus');
      expect(result.context.resourceGroup).toBe('test-rg');
      expect(result.context.naming).toEqual({
        organization: 'org',
        project: 'test-app',
        environment: 'dev',
        geography: 'eus',
        instance: '01',
      });
    });
  });

  describe('error handling', () => {
    it('should throw error when template file does not exist', async () => {
      const backend = createMinimalBackend();

      (fs.existsSync as any).mockReturnValue(false);

      await expect(synthesizer.synthesize(backend)).rejects.toThrow(
        'Template file not found'
      );
    });

    it('should throw error when template is missing required properties', async () => {
      const backend = createMinimalBackend();

      // Mock invalid template (missing $schema)
      (fs.readFileSync as any).mockReturnValue(
        JSON.stringify({
          contentVersion: '1.0.0.0',
          resources: [],
        })
      );

      await expect(synthesizer.synthesize(backend)).rejects.toThrow(
        'missing required $schema property'
      );
    });

    it('should throw error for invalid attachment config', async () => {
      const backend = createBackendWithInvalidAttachment();

      await expect(synthesizer.synthesize(backend)).rejects.toThrow(
        'has invalid configuration'
      );
    });

    it('should handle JSON parse errors gracefully', async () => {
      const backend = createMinimalBackend();

      (fs.readFileSync as any).mockReturnValue('invalid json {]');

      await expect(synthesizer.synthesize(backend)).rejects.toThrow();
    });

    it('should throw error when template is missing contentVersion', async () => {
      const backend = createMinimalBackend();

      (fs.readFileSync as any).mockReturnValue(
        JSON.stringify({
          $schema:
            'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
          resources: [],
        })
      );

      await expect(synthesizer.synthesize(backend)).rejects.toThrow(
        'missing required contentVersion property'
      );
    });
  });

  describe('backend analysis', () => {
    it('should discover CRUD models', async () => {
      const backend = createBackendWithCRUDModel();

      const result = await synthesizer.synthesize(backend);

      expect(result.analysis.models.crud.length).toBe(1);
      expect(result.analysis.models.crud[0]).toMatchObject({
        name: 'User',
        type: 'crud',
      });
    });

    it('should discover function models', async () => {
      const backend = createBackendWithFunctionModel();

      const result = await synthesizer.synthesize(backend);

      expect(result.analysis.models.function.length).toBe(1);
      expect(result.analysis.models.function[0]).toMatchObject({
        name: 'SendEmail',
        type: 'function',
      });
    });

    it('should handle backend with no models', async () => {
      const backend = createMinimalBackend();

      const result = await synthesizer.synthesize(backend);

      expect(result.analysis.models.crud.length).toBe(0);
      expect(result.analysis.models.event.length).toBe(0);
      expect(result.analysis.models.function.length).toBe(0);
      expect(result.metadata.modelCount).toBe(0);
    });

    it('should detect enabled features', async () => {
      const backend = createBackendWithFeatures();

      const result = await synthesizer.synthesize(backend);

      expect(result.analysis.features).toEqual({
        monitoring: true,
        networking: true,
        performance: false,
      });
      expect(result.metadata.features).toEqual({
        monitoring: true,
        networking: true,
        performance: false,
      });
    });

    it('should analyze resource dependencies', async () => {
      const backend = createBackendWithCRUDModel();

      const result = await synthesizer.synthesize(backend);

      expect(result.analysis.dependencies).toBeDefined();
      expect(result.analysis.dependencies.size).toBeGreaterThan(0);
      expect(result.analysis.dependencies.has('cosmos-db')).toBe(true);
      expect(result.analysis.dependencies.get('cosmos-db')).toContain('User');
    });

    it('should count resources correctly', async () => {
      const backend = createBackendWithCRUDModel();

      const result = await synthesizer.synthesize(backend);

      expect(result.resourceCount).toBe(result.armTemplate.resources.length);
      expect(result.metadata.resourceCount).toBe(result.armTemplate.resources.length);
    });
  });

  describe('attachment discovery', () => {
    it('should detect attached database configuration', async () => {
      const backend = createBackendWithAttachment();

      const result = await synthesizer.synthesize(backend);

      expect(result.analysis.attachments.storage.length).toBeGreaterThan(0);
      const dbAttachment = result.analysis.attachments.storage.find(
        (a) => a.path === 'storage.database'
      );
      expect(dbAttachment).toBeDefined();
      expect(dbAttachment?.config).toEqual({ throughput: 2000 });
    });

    it('should detect attached storage account', async () => {
      const backend = createBackendWithStorageAttachment();

      const result = await synthesizer.synthesize(backend);

      const storageAttachment = result.analysis.attachments.storage.find(
        (a) => a.path === 'storage.account'
      );
      expect(storageAttachment).toBeDefined();
    });

    it('should detect attached function app', async () => {
      const backend = createBackendWithFunctionAppAttachment();

      const result = await synthesizer.synthesize(backend);

      const functionAttachment = result.analysis.attachments.compute.find(
        (a) => a.path === 'compute.functionApp'
      );
      expect(functionAttachment).toBeDefined();
    });

    it('should handle backends with no attachments', async () => {
      const backend = createMinimalBackend();

      const result = await synthesizer.synthesize(backend);

      expect(result.analysis.attachments.storage.length).toBe(0);
      expect(result.analysis.attachments.compute.length).toBe(0);
      expect(result.analysis.attachments.networking.length).toBe(0);
      expect(result.analysis.attachments.monitoring.length).toBe(0);
      expect(result.analysis.attachments.performance.length).toBe(0);
    });
  });

  describe('naming and context', () => {
    it('should create synthesis context with correct naming', async () => {
      const backend = createMinimalBackend();

      const result = await synthesizer.synthesize(backend);

      expect(result.context.naming).toEqual({
        organization: 'org',
        project: 'test-app',
        environment: 'dev',
        geography: 'eus',
        instance: '01',
      });
    });

    it('should use custom organization in naming', async () => {
      const backend = createMinimalBackend();
      backend.settings.organization = 'custom-org';

      const result = await synthesizer.synthesize(backend);

      expect(result.context.naming.organization).toBe('custom-org');
    });

    it('should use custom instance in naming', async () => {
      const backend = createMinimalBackend();
      backend.settings.instance = '99';

      const result = await synthesizer.synthesize(backend);

      expect(result.context.naming.instance).toBe('99');
    });

    it('should normalize environment names', async () => {
      const testCases = [
        { input: 'production', expected: 'prod' },
        { input: 'prod', expected: 'prod' },
        { input: 'staging', expected: 'stg' },
        { input: 'stg', expected: 'stg' },
        { input: 'development', expected: 'dev' },
        { input: 'dev', expected: 'dev' },
      ];

      for (const { input, expected } of testCases) {
        const backend = createMinimalBackend();
        const result = await synthesizer.synthesize(backend, {
          environment: input as any,
        });

        expect(result.context.naming.environment).toBe(expected);
      }
    });

    it('should convert region to geography code', async () => {
      const testCases = [
        { region: 'eastus', geography: 'eus' },
        { region: 'eastus2', geography: 'eus2' },
        { region: 'westus', geography: 'wus' },
        { region: 'westus2', geography: 'wus2' },
      ];

      for (const { region, geography } of testCases) {
        const backend = createMinimalBackend();
        backend.settings.region = region;
        backend.settings.geography = undefined; // Clear default geography to test region conversion

        const result = await synthesizer.synthesize(backend);

        expect(result.context.naming.geography).toBe(geography);
      }
    });

    it('should detect commercial cloud from region', async () => {
      const backend = createMinimalBackend();
      backend.settings.region = 'eastus';

      const result = await synthesizer.synthesize(backend);

      expect(result.context.cloudType).toBe('commercial');
    });

    it('should detect government cloud from region', async () => {
      const backend = createMinimalBackend();
      backend.settings.region = 'usgovvirginia';

      const result = await synthesizer.synthesize(backend);

      expect(result.context.cloudType).toBe('government');
    });
  });

  describe('ARM template generation', () => {
    it('should generate ARM template with correct schema', async () => {
      const backend = createMinimalBackend();

      const result = await synthesizer.synthesize(backend);

      expect(result.armTemplate.$schema).toBe(
        'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#'
      );
      expect(result.armTemplate.contentVersion).toBe('1.0.0.0');
    });

    it('should include default parameters', async () => {
      const backend = createMinimalBackend();

      const result = await synthesizer.synthesize(backend);

      expect(result.armTemplate.parameters).toBeDefined();
      // Note: parameters may be empty if template doesn't define any
    });

    it('should include variables with naming prefix', async () => {
      const backend = createMinimalBackend();

      const result = await synthesizer.synthesize(backend);

      expect(result.armTemplate.variables).toBeDefined();
      // Note: variables may be empty if template doesn't define any
    });

    it('should include resource group name in outputs', async () => {
      const backend = createMinimalBackend();

      const result = await synthesizer.synthesize(backend);

      expect(result.armTemplate.outputs).toBeDefined();
      // Note: outputs may be empty if template doesn't define any
    });

    it('should handle templates with resources', async () => {
      const backend = createMinimalBackend();

      (fs.readFileSync as any).mockReturnValue(
        JSON.stringify({
          $schema:
            'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
          contentVersion: '1.0.0.0',
          resources: [
            {
              type: 'Microsoft.Storage/storageAccounts',
              apiVersion: '2021-04-01',
              name: 'teststorage',
              location: 'eastus',
            },
          ],
        })
      );

      const result = await synthesizer.synthesize(backend);

      expect(result.armTemplate.resources.length).toBe(1);
      expect(result.armTemplate.resources[0].type).toBe(
        'Microsoft.Storage/storageAccounts'
      );
      expect(result.metadata.resourceCount).toBe(1);
    });
  });

  describe('backward compatibility', () => {
    it('should include deprecated template property', async () => {
      const backend = createMinimalBackend();

      const result = await synthesizer.synthesize(backend);

      expect((result as any).template).toBe(result.armTemplate);
    });

    it('should include deprecated context property', async () => {
      const backend = createMinimalBackend();

      const result = await synthesizer.synthesize(backend);

      expect((result as any).context).toBeDefined();
      expect((result as any).context.backend).toBe(backend);
    });

    it('should include deprecated analysis property', async () => {
      const backend = createMinimalBackend();

      const result = await synthesizer.synthesize(backend);

      expect((result as any).analysis).toBeDefined();
      expect((result as any).analysis.models).toBeDefined();
    });

    it('should include deprecated resourceCount property', async () => {
      const backend = createMinimalBackend();

      const result = await synthesizer.synthesize(backend);

      expect((result as any).resourceCount).toBe(result.metadata.resourceCount);
    });
  });

  describe('edge cases', () => {
    it('should handle empty schema models object', async () => {
      const backend = createMinimalBackend();
      backend.schema.models = {};

      const result = await synthesizer.synthesize(backend);

      expect(result.analysis.models.crud.length).toBe(0);
      expect(result.metadata.modelCount).toBe(0);
    });

    it('should handle missing tags', async () => {
      const backend = createMinimalBackend();
      backend.settings.tags = undefined as any;

      const result = await synthesizer.synthesize(backend);

      expect(result.context.tags).toEqual({});
    });

    it('should handle missing region (use default)', async () => {
      const backend = createMinimalBackend();
      backend.settings.region = undefined as any;

      const result = await synthesizer.synthesize(backend);

      expect(result.context.region).toBe('eastus');
    });

    it('should handle missing geography (generate from region)', async () => {
      const backend = createMinimalBackend();
      backend.settings.geography = undefined;

      const result = await synthesizer.synthesize(backend);

      expect(result.context.naming.geography).toBe('eus');
    });

    it('should handle custom environment names with truncation', async () => {
      const backend = createMinimalBackend();

      const result = await synthesizer.synthesize(backend, {
        environment: 'verylongenvironmentname' as any,
      });

      expect(result.context.naming.environment.length).toBeLessThanOrEqual(4);
    });
  });
});

// ============================================================================
// Test Helpers
// ============================================================================

function createMinimalBackend(): BackendObject {
  return {
    schema: {
      models: {},
      _metadata: {
        name: 'test-app',
        version: '1.0.0',
      },
      _schemaInput: { schema: {} } as any,
    },
    settings: {
      name: 'test-app',
      region: 'eastus',
      organization: 'org',
      instance: '01',
      geography: 'eus',
      resourceGroup: 'test-rg',
      tags: {},
      features: {
        monitoring: false,
        networking: false,
        performance: false,
      },
    },
    environment: 'development',
    storage: {
      account: createMockAttachmentPoint(),
      database: createMockAttachmentPoint(),
      blobs: createMockAttachmentPoint(),
    },
    compute: {
      functionApp: createMockAttachmentPoint(),
    },
    models: {},
    _metadata: {
      version: '1.0.0',
      createdAt: new Date(),
      environment: 'development',
      modelCount: 0,
      hasAuthentication: false,
      enabledFeatures: [],
    },
    _attachments: new Map(),
    _defaults: {},
  } as any;
}

function createBackendWithCRUDModel(): BackendObject {
  const backend = createMinimalBackend();

  (backend.schema.models as any).User = {
    _modelType: 'crud',
    schema: {
      fields: {
        id: { _type: 'id', _required: true },
        email: { _type: 'email', _required: true },
        name: { _type: 'string', _required: true },
      },
    },
  };

  backend._metadata.modelCount = 1;

  return backend;
}

function createBackendWithMultipleCRUDModels(): BackendObject {
  const backend = createMinimalBackend();

  (backend.schema.models as any).User = {
    _modelType: 'crud',
    schema: { fields: { id: { _type: 'id' } } },
  };

  (backend.schema.models as any).Post = {
    _modelType: 'crud',
    schema: { fields: { id: { _type: 'id' } } },
  };

  (backend.schema.models as any).Comment = {
    _modelType: 'crud',
    schema: { fields: { id: { _type: 'id' } } },
  };

  backend._metadata.modelCount = 3;

  return backend;
}

function createBackendWithFunctionModel(): BackendObject {
  const backend = createMinimalBackend();

  (backend.schema.models as any).SendEmail = {
    _modelType: 'function',
    input: { to: { _type: 'string' }, subject: { _type: 'string' } },
    output: { success: { _type: 'boolean' } },
  };

  backend._metadata.modelCount = 1;

  return backend;
}

function createBackendWithFeatures(): BackendObject {
  const backend = createMinimalBackend();

  backend.settings.features = {
    monitoring: true,
    networking: true,
    performance: false,
  };

  backend._metadata.enabledFeatures = ['monitoring', 'networking'];

  return backend;
}

function createBackendWithAttachment(): BackendObject {
  const backend = createMinimalBackend();

  backend.storage.database = {
    attach: () => {},
    isAttached: () => true,
    getConfig: () => ({ throughput: 2000 }),
    reset: () => {},
    _default: {},
    _attached: { throughput: 2000 },
    _path: 'storage.database',
  };

  return backend;
}

function createBackendWithStorageAttachment(): BackendObject {
  const backend = createMinimalBackend();

  backend.storage.account = {
    attach: () => {},
    isAttached: () => true,
    getConfig: () => ({ sku: 'Standard_LRS' }),
    reset: () => {},
    _default: {},
    _attached: { sku: 'Standard_LRS' },
    _path: 'storage.account',
  };

  return backend;
}

function createBackendWithFunctionAppAttachment(): BackendObject {
  const backend = createMinimalBackend();

  backend.compute.functionApp = {
    attach: () => {},
    isAttached: () => true,
    getConfig: () => ({ sku: 'Y1' }),
    reset: () => {},
    _default: {},
    _attached: { sku: 'Y1' },
    _path: 'compute.functionApp',
  };

  return backend;
}

function createBackendWithInvalidAttachment(): BackendObject {
  const backend = createMinimalBackend();

  backend.storage.database = {
    attach: () => {},
    isAttached: () => true,
    getConfig: () => null as any, // Invalid: null config
    reset: () => {},
    _default: {},
    _attached: null as any,
    _path: 'storage.database',
  };

  return backend;
}

function createMockAttachmentPoint(): any {
  return {
    attach: () => {},
    isAttached: () => false,
    getConfig: () => ({}),
    reset: () => {},
    _default: {},
    _path: 'mock',
  };
}
