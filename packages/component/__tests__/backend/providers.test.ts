/**
 * Integration tests for Resource Providers
 *
 * Tests CosmosProvider, FunctionsProvider, and StorageProvider
 * including merging logic, validation, and resource provisioning.
 *
 * @module @atakora/component/__tests__/backend/providers
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CosmosProvider } from '../../src/backend/providers/cosmos-provider';
import { FunctionsProvider } from '../../src/backend/providers/functions-provider';
import { StorageProvider } from '../../src/backend/providers/storage-provider';
import type { IResourceRequirement } from '../../src/backend/interfaces';
import {
  MockConstruct,
  createMockProviderContext,
  createMockRequirement,
} from './fixtures';

describe('CosmosProvider', () => {
  let provider: CosmosProvider;
  let scope: MockConstruct;

  beforeEach(() => {
    provider = new CosmosProvider();
    scope = new MockConstruct(undefined, 'test-scope');
  });

  describe('basic properties', () => {
    it('should have correct provider ID', () => {
      expect(provider.providerId).toBe('cosmos-provider');
    });

    it('should support cosmos resource type', () => {
      expect(provider.supportedTypes).toContain('cosmos');
    });

    it('should recognize cosmos requirements', () => {
      const requirement = createMockRequirement('cosmos', 'shared');

      expect(provider.canProvide(requirement)).toBe(true);
    });

    it('should not recognize non-cosmos requirements', () => {
      const requirement = createMockRequirement('functions', 'shared');

      expect(provider.canProvide(requirement)).toBe(false);
    });
  });

  describe('mergeRequirements', () => {
    it('should merge compatible cosmos requirements', () => {
      const req1: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          enableServerless: true,
          consistency: 'Session',
          databases: [
            {
              name: 'users-db',
              containers: [{ name: 'users', partitionKey: '/id' }],
            },
          ],
        },
      };

      const req2: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          enableServerless: true,
          consistency: 'Session',
          databases: [
            {
              name: 'products-db',
              containers: [{ name: 'products', partitionKey: '/id' }],
            },
          ],
        },
      };

      const merged = provider.mergeRequirements([req1, req2]);

      expect(merged.config.enableServerless).toBe(true);
      expect(merged.config.consistency).toBe('Session');
      expect(merged.config.databases).toHaveLength(2);
    });

    it('should merge databases with same name', () => {
      const req1: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          databases: [
            {
              name: 'app-db',
              containers: [{ name: 'users', partitionKey: '/id' }],
            },
          ],
        },
      };

      const req2: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          databases: [
            {
              name: 'app-db',
              containers: [{ name: 'products', partitionKey: '/id' }],
            },
          ],
        },
      };

      const merged = provider.mergeRequirements([req1, req2]);

      expect(merged.config.databases).toHaveLength(1);
      expect(merged.config.databases[0].name).toBe('app-db');
      expect(merged.config.databases[0].containers).toHaveLength(2);
    });

    it('should throw on conflicting consistency levels', () => {
      const req1: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          consistency: 'Session',
        },
      };

      const req2: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          consistency: 'Strong',
        },
      };

      expect(() => provider.mergeRequirements([req1, req2])).toThrow();
    });

    it('should throw on conflicting serverless modes', () => {
      const req1: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          enableServerless: true,
        },
      };

      const req2: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          enableServerless: false,
        },
      };

      expect(() => provider.mergeRequirements([req1, req2])).toThrow();
    });

    it('should throw on conflicting partition keys for same container', () => {
      const req1: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          databases: [
            {
              name: 'app-db',
              containers: [{ name: 'users', partitionKey: '/id' }],
            },
          ],
        },
      };

      const req2: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          databases: [
            {
              name: 'app-db',
              containers: [{ name: 'users', partitionKey: '/userId' }],
            },
          ],
        },
      };

      expect(() => provider.mergeRequirements([req1, req2])).toThrow(
        'partition key'
      );
    });

    it('should merge capabilities as union', () => {
      const req1: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          capabilities: ['EnableCassandra'],
        },
      };

      const req2: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          capabilities: ['EnableGremlin'],
        },
      };

      const merged = provider.mergeRequirements([req1, req2]);

      expect(merged.config.capabilities).toHaveLength(2);
      expect(merged.config.capabilities).toContain('EnableCassandra');
      expect(merged.config.capabilities).toContain('EnableGremlin');
    });

    it('should handle single requirement', () => {
      const req: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          enableServerless: true,
        },
      };

      const merged = provider.mergeRequirements([req]);

      expect(merged).toEqual(req);
    });
  });

  describe('validateMerged', () => {
    it('should validate correct configuration', () => {
      const requirement: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          enableServerless: true,
          consistency: 'Session',
          databases: [
            {
              name: 'test-db',
              containers: [{ name: 'test', partitionKey: '/id' }],
            },
          ],
        },
      };

      const result = provider.validateMerged(requirement);

      expect(result.valid).toBe(true);
    });

    it('should reject serverless with multi-region', () => {
      const requirement: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          enableServerless: true,
          enableMultiRegion: true,
        },
      };

      const result = provider.validateMerged(requirement);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject too many databases', () => {
      const databases = Array.from({ length: 30 }, (_, i) => ({
        name: `db-${i}`,
        containers: [],
      }));

      const requirement: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          databases,
        },
      };

      const result = provider.validateMerged(requirement);

      expect(result.valid).toBe(false);
      expect(result.errors?.some((e) => e.includes('25'))).toBe(true);
    });

    it('should reject invalid partition keys', () => {
      const requirement: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          databases: [
            {
              name: 'test-db',
              containers: [{ name: 'test', partitionKey: 'id' }], // Missing leading /
            },
          ],
        },
      };

      const result = provider.validateMerged(requirement);

      expect(result.valid).toBe(false);
    });

    it('should warn about free tier', () => {
      const requirement: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          enableFreeTier: true,
        },
      };

      const result = provider.validateMerged(requirement);

      expect(result.warnings).toBeDefined();
      expect(result.warnings?.some((w) => w.includes('free tier'))).toBe(true);
    });
  });

  describe('resource limits', () => {
    it('should enforce max 25 databases per account', () => {
      const databases = Array.from({ length: 26 }, (_, i) => ({
        name: `db-${i}`,
        containers: [],
      }));

      const req1: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          databases: databases.slice(0, 15),
        },
      };

      const req2: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          databases: databases.slice(15, 26),
        },
      };

      expect(() => provider.mergeRequirements([req1, req2])).toThrow('25');
    });

    it('should enforce max 100 containers per database', () => {
      const containers = Array.from({ length: 101 }, (_, i) => ({
        name: `container-${i}`,
        partitionKey: '/id',
      }));

      const req: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          databases: [
            {
              name: 'test-db',
              containers,
            },
          ],
        },
      };

      const result = provider.validateMerged(req);

      expect(result.valid).toBe(false);
    });
  });
});

describe('FunctionsProvider', () => {
  let provider: FunctionsProvider;

  beforeEach(() => {
    provider = new FunctionsProvider();
  });

  describe('basic properties', () => {
    it('should have correct provider ID', () => {
      expect(provider.providerId).toBe('functions-provider');
    });

    it('should support functions resource type', () => {
      expect(provider.supportedTypes).toContain('functions');
    });

    it('should recognize functions requirements', () => {
      const requirement = createMockRequirement('functions', 'shared');

      expect(provider.canProvide(requirement)).toBe(true);
    });
  });

  describe('mergeRequirements', () => {
    it('should merge compatible function app requirements', () => {
      const req1: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
          version: '20',
          sku: 'Y1',
        },
      };

      const req2: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
          version: '20',
          sku: 'Y1',
        },
      };

      const merged = provider.mergeRequirements([req1, req2]);

      expect(merged.config.runtime).toBe('node');
      expect(merged.config.version).toBe('20');
    });

    it('should merge environment variables with namespacing', () => {
      const req1: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
          environmentVariables: {
            API_KEY: 'key1',
            DATABASE: 'db1',
          },
        },
        metadata: {
          source: 'UserApi',
          version: '1.0',
        },
      };

      const req2: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
          environmentVariables: {
            API_KEY: 'key2',
            DATABASE: 'db2',
          },
        },
        metadata: {
          source: 'ProductApi',
          version: '1.0',
        },
      };

      const merged = provider.mergeRequirements([req1, req2]);

      // Variables should be namespaced to avoid conflicts
      expect(merged.config.environmentVariables).toBeDefined();
    });

    it('should throw on conflicting runtimes', () => {
      const req1: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
        },
      };

      const req2: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'python',
        },
      };

      expect(() => provider.mergeRequirements([req1, req2])).toThrow();
    });

    it('should use maximum SKU when different SKUs specified', () => {
      const req1: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
          sku: 'Y1',
        },
      };

      const req2: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
          sku: 'EP1',
        },
      };

      const merged = provider.mergeRequirements([req1, req2]);

      // Should pick the more powerful SKU (EP1 > Y1)
      expect(merged.config.sku).toBe('EP1');
    });

    it('should merge CORS settings as union', () => {
      const req1: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
          cors: {
            allowedOrigins: ['https://app1.com'],
          },
        },
      };

      const req2: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
          cors: {
            allowedOrigins: ['https://app2.com'],
          },
        },
      };

      const merged = provider.mergeRequirements([req1, req2]);

      expect(merged.config.cors.allowedOrigins).toHaveLength(2);
    });
  });

  describe('validateMerged', () => {
    it('should validate correct configuration', () => {
      const requirement: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
          version: '20',
        },
      };

      const result = provider.validateMerged(requirement);

      expect(result.valid).toBe(true);
    });

    it('should reject missing runtime', () => {
      const requirement: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {},
      };

      const result = provider.validateMerged(requirement);

      expect(result.valid).toBe(false);
    });
  });
});

describe('StorageProvider', () => {
  let provider: StorageProvider;

  beforeEach(() => {
    provider = new StorageProvider();
  });

  describe('basic properties', () => {
    it('should have correct provider ID', () => {
      expect(provider.providerId).toBe('storage-provider');
    });

    it('should support storage resource type', () => {
      expect(provider.supportedTypes).toContain('storage');
    });

    it('should recognize storage requirements', () => {
      const requirement = createMockRequirement('storage', 'shared');

      expect(provider.canProvide(requirement)).toBe(true);
    });
  });

  describe('mergeRequirements', () => {
    it('should merge compatible storage requirements', () => {
      const req1: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {
          sku: 'Standard_LRS',
          kind: 'StorageV2',
          containers: [{ name: 'container1' }],
        },
      };

      const req2: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {
          sku: 'Standard_LRS',
          kind: 'StorageV2',
          containers: [{ name: 'container2' }],
        },
      };

      const merged = provider.mergeRequirements([req1, req2]);

      expect(merged.config.sku).toBe('Standard_LRS');
      expect(merged.config.containers).toHaveLength(2);
    });

    it('should deduplicate containers with same name', () => {
      const req1: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {
          sku: 'Standard_LRS',
          containers: [{ name: 'shared-container' }],
        },
      };

      const req2: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {
          sku: 'Standard_LRS',
          containers: [{ name: 'shared-container' }],
        },
      };

      const merged = provider.mergeRequirements([req1, req2]);

      expect(merged.config.containers).toHaveLength(1);
    });

    it('should throw on conflicting SKUs', () => {
      const req1: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {
          sku: 'Standard_LRS',
        },
      };

      const req2: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {
          sku: 'Premium_LRS',
        },
      };

      expect(() => provider.mergeRequirements([req1, req2])).toThrow();
    });

    it('should merge queues as union', () => {
      const req1: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {
          sku: 'Standard_LRS',
          queues: ['queue1', 'queue2'],
        },
      };

      const req2: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {
          sku: 'Standard_LRS',
          queues: ['queue2', 'queue3'],
        },
      };

      const merged = provider.mergeRequirements([req1, req2]);

      expect(merged.config.queues).toHaveLength(3);
      expect(merged.config.queues).toContain('queue1');
      expect(merged.config.queues).toContain('queue2');
      expect(merged.config.queues).toContain('queue3');
    });

    it('should merge tables as union', () => {
      const req1: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {
          sku: 'Standard_LRS',
          tables: ['table1'],
        },
      };

      const req2: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {
          sku: 'Standard_LRS',
          tables: ['table2'],
        },
      };

      const merged = provider.mergeRequirements([req1, req2]);

      expect(merged.config.tables).toHaveLength(2);
    });
  });

  describe('validateMerged', () => {
    it('should validate correct configuration', () => {
      const requirement: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {
          sku: 'Standard_LRS',
          kind: 'StorageV2',
        },
      };

      const result = provider.validateMerged(requirement);

      expect(result.valid).toBe(true);
    });

    it('should reject missing SKU', () => {
      const requirement: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {},
      };

      const result = provider.validateMerged(requirement);

      expect(result.valid).toBe(false);
    });
  });
});

describe('Provider integration', () => {
  it('should work together in a complete scenario', () => {
    const cosmosProvider = new CosmosProvider();
    const functionsProvider = new FunctionsProvider();
    const storageProvider = new StorageProvider();

    const cosmosReq = createMockRequirement('cosmos', 'shared', {
      enableServerless: true,
    });

    const functionsReq = createMockRequirement('functions', 'shared', {
      runtime: 'node',
    });

    const storageReq = createMockRequirement('storage', 'shared', {
      sku: 'Standard_LRS',
    });

    expect(cosmosProvider.canProvide(cosmosReq)).toBe(true);
    expect(functionsProvider.canProvide(functionsReq)).toBe(true);
    expect(storageProvider.canProvide(storageReq)).toBe(true);

    expect(cosmosProvider.canProvide(functionsReq)).toBe(false);
    expect(functionsProvider.canProvide(storageReq)).toBe(false);
    expect(storageProvider.canProvide(cosmosReq)).toBe(false);
  });
});
