/**
 * Unit tests for ProviderRegistry
 *
 * Tests provider registration, discovery, and requirement validation.
 *
 * @module @atakora/component/__tests__/backend/registry
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProviderRegistry } from '../../src/backend/registry';
import type { IResourceRequirement } from '../../src/backend/interfaces';
import { MockResourceProvider, createMockRequirement } from './fixtures';

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = new ProviderRegistry();
  });

  describe('register', () => {
    it('should register a provider', () => {
      const provider = new MockResourceProvider('test-provider', ['cosmos']);

      registry.register(provider);

      expect(registry.size).toBe(1);
      expect(registry.getProvider('test-provider')).toBe(provider);
    });

    it('should register multiple providers', () => {
      const provider1 = new MockResourceProvider('provider1', ['cosmos']);
      const provider2 = new MockResourceProvider('provider2', ['functions']);

      registry.register(provider1);
      registry.register(provider2);

      expect(registry.size).toBe(2);
    });

    it('should throw on duplicate provider ID', () => {
      const provider1 = new MockResourceProvider('test-provider', ['cosmos']);
      const provider2 = new MockResourceProvider('test-provider', ['functions']);

      registry.register(provider1);

      expect(() => registry.register(provider2)).toThrow(
        'Provider with ID "test-provider" is already registered'
      );
    });

    it('should throw on missing provider ID', () => {
      const invalidProvider = {
        providerId: '',
        supportedTypes: ['cosmos'],
        canProvide: () => true,
        provideResource: () => ({}),
        mergeRequirements: (reqs: any) => reqs[0],
        validateMerged: () => ({ valid: true }),
      };

      expect(() => registry.register(invalidProvider as any)).toThrow(
        'Provider must have a providerId'
      );
    });

    it('should throw on empty supported types', () => {
      const invalidProvider = new MockResourceProvider('test-provider', []);

      expect(() => registry.register(invalidProvider)).toThrow(
        'Provider "test-provider" must support at least one resource type'
      );
    });

    it('should index provider by supported types', () => {
      const provider = new MockResourceProvider('test-provider', ['cosmos', 'storage']);

      registry.register(provider);

      expect(registry.isTypeSupported('cosmos')).toBe(true);
      expect(registry.isTypeSupported('storage')).toBe(true);
      expect(registry.isTypeSupported('functions')).toBe(false);
    });
  });

  describe('registerAll', () => {
    it('should register multiple providers at once', () => {
      const providers = [
        new MockResourceProvider('provider1', ['cosmos']),
        new MockResourceProvider('provider2', ['functions']),
        new MockResourceProvider('provider3', ['storage']),
      ];

      registry.registerAll(providers);

      expect(registry.size).toBe(3);
    });

    it('should throw on duplicate in batch registration', () => {
      const providers = [
        new MockResourceProvider('provider1', ['cosmos']),
        new MockResourceProvider('provider1', ['functions']),
      ];

      expect(() => registry.registerAll(providers)).toThrow();
    });
  });

  describe('unregister', () => {
    it('should unregister a provider', () => {
      const provider = new MockResourceProvider('test-provider', ['cosmos']);

      registry.register(provider);
      expect(registry.size).toBe(1);

      const result = registry.unregister('test-provider');

      expect(result).toBe(true);
      expect(registry.size).toBe(0);
      expect(registry.getProvider('test-provider')).toBeUndefined();
    });

    it('should return false for non-existent provider', () => {
      const result = registry.unregister('non-existent');

      expect(result).toBe(false);
    });

    it('should remove provider from type index', () => {
      const provider = new MockResourceProvider('test-provider', ['cosmos', 'storage']);

      registry.register(provider);
      expect(registry.isTypeSupported('cosmos')).toBe(true);
      expect(registry.isTypeSupported('storage')).toBe(true);

      registry.unregister('test-provider');

      expect(registry.isTypeSupported('cosmos')).toBe(false);
      expect(registry.isTypeSupported('storage')).toBe(false);
    });
  });

  describe('getProvider', () => {
    it('should get registered provider by ID', () => {
      const provider = new MockResourceProvider('test-provider', ['cosmos']);

      registry.register(provider);

      const retrieved = registry.getProvider('test-provider');

      expect(retrieved).toBe(provider);
    });

    it('should return undefined for non-existent provider', () => {
      const retrieved = registry.getProvider('non-existent');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('getAllProviders', () => {
    it('should return all registered providers', () => {
      const provider1 = new MockResourceProvider('provider1', ['cosmos']);
      const provider2 = new MockResourceProvider('provider2', ['functions']);

      registry.register(provider1);
      registry.register(provider2);

      const providers = registry.getAllProviders();

      expect(providers).toHaveLength(2);
      expect(providers).toContain(provider1);
      expect(providers).toContain(provider2);
    });

    it('should return empty array when no providers', () => {
      const providers = registry.getAllProviders();

      expect(providers).toHaveLength(0);
    });
  });

  describe('getProvidersByType', () => {
    it('should return providers that support specific type', () => {
      const provider1 = new MockResourceProvider('provider1', ['cosmos']);
      const provider2 = new MockResourceProvider('provider2', ['cosmos', 'storage']);
      const provider3 = new MockResourceProvider('provider3', ['functions']);

      registry.registerAll([provider1, provider2, provider3]);

      const cosmosProviders = registry.getProvidersByType('cosmos');

      expect(cosmosProviders).toHaveLength(2);
      expect(cosmosProviders).toContain(provider1);
      expect(cosmosProviders).toContain(provider2);
    });

    it('should return empty array for unsupported type', () => {
      const provider = new MockResourceProvider('provider1', ['cosmos']);

      registry.register(provider);

      const providers = registry.getProvidersByType('unsupported');

      expect(providers).toHaveLength(0);
    });
  });

  describe('findProvider', () => {
    it('should find provider for requirement', () => {
      const provider = new MockResourceProvider('test-provider', ['cosmos']);
      const requirement = createMockRequirement('cosmos', 'shared');

      registry.register(provider);

      const found = registry.findProvider(requirement);

      expect(found).toBe(provider);
    });

    it('should return undefined when no provider can handle requirement', () => {
      const provider = new MockResourceProvider('test-provider', ['cosmos']);
      const requirement = createMockRequirement('functions', 'shared');

      registry.register(provider);

      const found = registry.findProvider(requirement);

      expect(found).toBeUndefined();
    });

    it('should return first matching provider when multiple match', () => {
      const provider1 = new MockResourceProvider('provider1', ['cosmos']);
      const provider2 = new MockResourceProvider('provider2', ['cosmos']);
      const requirement = createMockRequirement('cosmos', 'shared');

      registry.register(provider1);
      registry.register(provider2);

      const found = registry.findProvider(requirement);

      expect(found).toBe(provider1);
    });

    it('should respect provider canProvide method', () => {
      const selectiveProvider = new MockResourceProvider('selective', ['cosmos']);
      selectiveProvider.canProvide = (req) =>
        req.resourceType === 'cosmos' && req.requirementKey === 'specific';

      const requirement1 = createMockRequirement('cosmos', 'specific');
      const requirement2 = createMockRequirement('cosmos', 'other');

      registry.register(selectiveProvider);

      expect(registry.findProvider(requirement1)).toBe(selectiveProvider);
      expect(registry.findProvider(requirement2)).toBeUndefined();
    });
  });

  describe('findProviderOrThrow', () => {
    it('should return provider when found', () => {
      const provider = new MockResourceProvider('test-provider', ['cosmos']);
      const requirement = createMockRequirement('cosmos', 'shared');

      registry.register(provider);

      const found = registry.findProviderOrThrow(requirement);

      expect(found).toBe(provider);
    });

    it('should throw when no provider found', () => {
      const requirement = createMockRequirement('cosmos', 'shared');

      expect(() => registry.findProviderOrThrow(requirement)).toThrow();
    });
  });

  describe('isTypeSupported', () => {
    it('should return true for supported type', () => {
      const provider = new MockResourceProvider('test-provider', ['cosmos']);

      registry.register(provider);

      expect(registry.isTypeSupported('cosmos')).toBe(true);
    });

    it('should return false for unsupported type', () => {
      const provider = new MockResourceProvider('test-provider', ['cosmos']);

      registry.register(provider);

      expect(registry.isTypeSupported('functions')).toBe(false);
    });

    it('should return false when no providers registered', () => {
      expect(registry.isTypeSupported('cosmos')).toBe(false);
    });
  });

  describe('getSupportedTypes', () => {
    it('should return all supported types', () => {
      const provider1 = new MockResourceProvider('provider1', ['cosmos', 'storage']);
      const provider2 = new MockResourceProvider('provider2', ['functions']);

      registry.registerAll([provider1, provider2]);

      const types = registry.getSupportedTypes();

      expect(types.size).toBe(3);
      expect(types.has('cosmos')).toBe(true);
      expect(types.has('storage')).toBe(true);
      expect(types.has('functions')).toBe(true);
    });

    it('should return empty set when no providers', () => {
      const types = registry.getSupportedTypes();

      expect(types.size).toBe(0);
    });

    it('should not include duplicates', () => {
      const provider1 = new MockResourceProvider('provider1', ['cosmos']);
      const provider2 = new MockResourceProvider('provider2', ['cosmos']);

      registry.registerAll([provider1, provider2]);

      const types = registry.getSupportedTypes();

      expect(types.size).toBe(1);
      expect(types.has('cosmos')).toBe(true);
    });
  });

  describe('canProvide', () => {
    it('should return true when requirement can be provided', () => {
      const provider = new MockResourceProvider('test-provider', ['cosmos']);
      const requirement = createMockRequirement('cosmos', 'shared');

      registry.register(provider);

      expect(registry.canProvide(requirement)).toBe(true);
    });

    it('should return false when requirement cannot be provided', () => {
      const provider = new MockResourceProvider('test-provider', ['cosmos']);
      const requirement = createMockRequirement('functions', 'shared');

      registry.register(provider);

      expect(registry.canProvide(requirement)).toBe(false);
    });
  });

  describe('validateRequirements', () => {
    it('should validate all requirements can be provided', () => {
      const provider1 = new MockResourceProvider('provider1', ['cosmos']);
      const provider2 = new MockResourceProvider('provider2', ['functions']);

      registry.registerAll([provider1, provider2]);

      const requirements: IResourceRequirement[] = [
        createMockRequirement('cosmos', 'db'),
        createMockRequirement('functions', 'app'),
      ];

      const result = registry.validateRequirements(requirements);

      expect(result.valid).toBe(true);
      expect(result.missingTypes).toHaveLength(0);
    });

    it('should detect missing providers', () => {
      const provider = new MockResourceProvider('provider1', ['cosmos']);

      registry.register(provider);

      const requirements: IResourceRequirement[] = [
        createMockRequirement('cosmos', 'db'),
        createMockRequirement('functions', 'app'),
        createMockRequirement('storage', 'account'),
      ];

      const result = registry.validateRequirements(requirements);

      expect(result.valid).toBe(false);
      expect(result.missingTypes).toHaveLength(2);
      expect(result.missingTypes).toContain('functions');
      expect(result.missingTypes).toContain('storage');
    });

    it('should handle empty requirements', () => {
      const result = registry.validateRequirements([]);

      expect(result.valid).toBe(true);
      expect(result.missingTypes).toHaveLength(0);
    });

    it('should deduplicate missing types', () => {
      const provider = new MockResourceProvider('provider1', ['cosmos']);

      registry.register(provider);

      const requirements: IResourceRequirement[] = [
        createMockRequirement('functions', 'app1'),
        createMockRequirement('functions', 'app2'),
        createMockRequirement('functions', 'app3'),
      ];

      const result = registry.validateRequirements(requirements);

      expect(result.valid).toBe(false);
      expect(result.missingTypes).toHaveLength(1);
      expect(result.missingTypes).toContain('functions');
    });
  });

  describe('clear', () => {
    it('should remove all providers', () => {
      const providers = [
        new MockResourceProvider('provider1', ['cosmos']),
        new MockResourceProvider('provider2', ['functions']),
        new MockResourceProvider('provider3', ['storage']),
      ];

      registry.registerAll(providers);
      expect(registry.size).toBe(3);

      registry.clear();

      expect(registry.size).toBe(0);
      expect(registry.isEmpty).toBe(true);
    });

    it('should clear type index', () => {
      const provider = new MockResourceProvider('test-provider', ['cosmos']);

      registry.register(provider);
      expect(registry.isTypeSupported('cosmos')).toBe(true);

      registry.clear();

      expect(registry.isTypeSupported('cosmos')).toBe(false);
    });
  });

  describe('size and isEmpty', () => {
    it('should return correct size', () => {
      expect(registry.size).toBe(0);

      registry.register(new MockResourceProvider('provider1', ['cosmos']));
      expect(registry.size).toBe(1);

      registry.register(new MockResourceProvider('provider2', ['functions']));
      expect(registry.size).toBe(2);

      registry.unregister('provider1');
      expect(registry.size).toBe(1);
    });

    it('should return correct isEmpty status', () => {
      expect(registry.isEmpty).toBe(true);

      registry.register(new MockResourceProvider('provider1', ['cosmos']));
      expect(registry.isEmpty).toBe(false);

      registry.clear();
      expect(registry.isEmpty).toBe(true);
    });
  });

  describe('complex scenarios', () => {
    it('should handle many providers efficiently', () => {
      const providers = Array.from({ length: 100 }, (_, i) =>
        new MockResourceProvider(`provider${i}`, [`type${i % 10}`])
      );

      registry.registerAll(providers);

      expect(registry.size).toBe(100);
      expect(registry.getSupportedTypes().size).toBe(10);
    });

    it('should handle provider with many supported types', () => {
      const types = Array.from({ length: 50 }, (_, i) => `type${i}`);
      const provider = new MockResourceProvider('multi-type', types);

      registry.register(provider);

      types.forEach((type) => {
        expect(registry.isTypeSupported(type)).toBe(true);
      });
    });

    it('should maintain correct state after multiple operations', () => {
      const provider1 = new MockResourceProvider('provider1', ['cosmos']);
      const provider2 = new MockResourceProvider('provider2', ['functions']);
      const provider3 = new MockResourceProvider('provider3', ['cosmos', 'storage']);

      registry.register(provider1);
      registry.register(provider2);
      registry.register(provider3);

      expect(registry.size).toBe(3);
      expect(registry.getProvidersByType('cosmos')).toHaveLength(2);

      registry.unregister('provider1');

      expect(registry.size).toBe(2);
      expect(registry.getProvidersByType('cosmos')).toHaveLength(1);

      registry.register(provider1);

      expect(registry.size).toBe(3);
      expect(registry.getProvidersByType('cosmos')).toHaveLength(2);
    });
  });
});
