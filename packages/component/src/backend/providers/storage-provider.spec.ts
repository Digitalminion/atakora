import { describe, it, expect, beforeEach } from 'vitest';
import { StorageProvider, type StorageConfig, type ContainerConfig } from './storage-provider';
import type { IResourceRequirement, ProviderContext } from './base-provider';
import type { Construct } from '@atakora/cdk';

describe('StorageProvider', () => {
  let provider: StorageProvider;
  let mockScope: Construct;
  let mockContext: ProviderContext;

  beforeEach(() => {
    provider = new StorageProvider();
    mockScope = { node: { id: 'test-scope' } } as any;
    mockContext = {
      backend: { backendId: 'test-backend' },
      naming: {
        formatResourceName: (type: string, backendId: string, suffix?: string) =>
          `${type}-${backendId}${suffix ? `-${suffix}` : ''}`,
      },
      tags: { environment: 'test' },
      existingResources: new Map(),
      location: 'eastus',
      environment: 'dev',
    };
  });

  describe('provider metadata', () => {
    it('should have correct provider ID', () => {
      expect(provider.providerId).toBe('storage-provider');
    });

    it('should have correct resource type', () => {
      expect(provider.resourceType).toBe('storage');
    });

    it('should support storage resource type', () => {
      expect(provider.supportedTypes).toContain('storage');
    });
  });

  describe('canProvide', () => {
    it('should accept storage resource type', () => {
      const requirement: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {},
      };

      expect(provider.canProvide(requirement)).toBe(true);
    });

    it('should reject other resource types', () => {
      const requirement: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {},
      };

      expect(provider.canProvide(requirement)).toBe(false);
    });
  });

  describe('mergeRequirements - basic merging', () => {
    it('should merge two compatible configs', () => {
      const req1: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {
          sku: 'Standard_LRS' as any,
          containers: [{ name: 'data', componentId: 'UserApi' }],
        } as StorageConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {
          sku: 'Standard_LRS' as any,
          containers: [{ name: 'images', componentId: 'ProductApi' }],
        } as StorageConfig,
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.config.containers).toHaveLength(2);
      expect(result.config.containers.map((c: ContainerConfig) => c.name)).toContain(
        'user-api-data'
      );
      expect(result.config.containers.map((c: ContainerConfig) => c.name)).toContain(
        'product-api-images'
      );
    });

    it('should select highest SKU', () => {
      const req1: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {
          sku: 'Standard_LRS' as any,
        } as StorageConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {
          sku: 'Premium_LRS' as any,
        } as StorageConfig,
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.config.sku).toBe('Premium_LRS');
    });

    it('should handle SKU priority correctly', () => {
      const skuTests = [
        { low: 'Standard_LRS', high: 'Standard_GRS', expected: 'Standard_GRS' },
        { low: 'Standard_GRS', high: 'Standard_RAGRS', expected: 'Standard_RAGRS' },
        { low: 'Standard_ZRS', high: 'Premium_LRS', expected: 'Premium_LRS' },
        { low: 'Premium_LRS', high: 'Premium_ZRS', expected: 'Premium_ZRS' },
      ];

      for (const test of skuTests) {
        const req1: IResourceRequirement = {
          resourceType: 'storage',
          requirementKey: 'shared',
          config: { sku: test.low as any } as StorageConfig,
        };

        const req2: IResourceRequirement = {
          resourceType: 'storage',
          requirementKey: 'shared',
          config: { sku: test.high as any } as StorageConfig,
        };

        const result = provider.mergeRequirements([req1, req2]);

        expect(result.config.sku).toBe(test.expected);
      }
    });
  });

  describe('mergeRequirements - access tier', () => {
    it('should use Hot tier if any config requires it', () => {
      const req1: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {
          accessTier: 'Cool' as any,
        } as StorageConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {
          accessTier: 'Hot' as any,
        } as StorageConfig,
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.config.accessTier).toBe('Hot');
    });

    it('should use Cool tier when all configs specify it', () => {
      const req1: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {
          accessTier: 'Cool' as any,
        } as StorageConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {
          accessTier: 'Cool' as any,
        } as StorageConfig,
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.config.accessTier).toBe('Cool');
    });
  });

  describe('mergeRequirements - public access', () => {
    it('should disable public access if any config requires it', () => {
      const req1: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {
          enableBlobPublicAccess: true,
        } as StorageConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {
          enableBlobPublicAccess: false,
        } as StorageConfig,
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.config.enableBlobPublicAccess).toBe(false);
    });

    it('should keep public access enabled if all configs allow it', () => {
      const req1: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {
          enableBlobPublicAccess: true,
        } as StorageConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {} as StorageConfig,
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.config.enableBlobPublicAccess).toBe(true);
    });
  });

  describe('mergeRequirements - container prefixing', () => {
    it('should prefix containers with component ID', () => {
      const req1: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {
          containers: [{ name: 'data', componentId: 'UserApi' }],
        } as StorageConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {
          containers: [{ name: 'images', componentId: 'ProductApi' }],
        } as StorageConfig,
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.config.containers.map((c: ContainerConfig) => c.name)).toContain(
        'user-api-data'
      );
      expect(result.config.containers.map((c: ContainerConfig) => c.name)).toContain(
        'product-api-images'
      );
    });

    it('should not prefix shared containers', () => {
      const requirement: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {
          containers: [{ name: 'shared-data', componentId: 'shared' }],
        } as StorageConfig,
      };

      const result = provider.mergeRequirements([requirement]);

      expect(result.config.containers[0].name).toBe('shared-data');
    });

    it('should handle camelCase component IDs', () => {
      const req1: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {
          containers: [{ name: 'data', componentId: 'myTestComponent' }],
        } as StorageConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {
          containers: [{ name: 'files', componentId: 'otherComponent' }],
        } as StorageConfig,
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.config.containers.map((c: ContainerConfig) => c.name)).toContain(
        'my-test-component-data'
      );
    });

    it('should handle PascalCase component IDs', () => {
      const req1: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {
          containers: [{ name: 'data', componentId: 'MyTestComponent' }],
        } as StorageConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {
          containers: [{ name: 'files', componentId: 'MyTestComponent' }],
        } as StorageConfig,
      };

      const result = provider.mergeRequirements([req1, req2]);

      // PascalCase: 'MyTestComponent' -> insert hyphen before each capital -> '-My-Test-Component'
      // then toLowerCase -> '-my-test-component', remove leading hyphen -> 'my-test-component'
      // Result: 'my-test-component-data' and 'my-test-component-files'
      expect(result.config.containers).toHaveLength(2);
      expect(result.config.containers.map((c: ContainerConfig) => c.name)).toContain(
        'my-test-component-data'
      );
      expect(result.config.containers.map((c: ContainerConfig) => c.name)).toContain(
        'my-test-component-files'
      );
    });

    it('should reject containers with duplicate names after prefixing', () => {
      const req1: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {
          containers: [{ name: 'data', componentId: 'UserApi' }],
        } as StorageConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {
          containers: [{ name: 'data', componentId: 'UserApi' }],
        } as StorageConfig,
      };

      // canMerge rejects duplicate container names - this is a naming conflict
      expect(() => provider.mergeRequirements([req1, req2])).toThrow('CANNOT_MERGE');
    });
  });

  describe('mergeRequirements - container merging', () => {
    it('should reject duplicate containers with same prefixed name', () => {
      const req1: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {
          containers: [{ name: 'data', componentId: 'UserApi', publicAccess: 'None' }],
        } as StorageConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {
          containers: [{ name: 'data', componentId: 'UserApi', publicAccess: 'Blob' }],
        } as StorageConfig,
      };

      // canMerge detects duplicate container names and rejects
      expect(() => provider.mergeRequirements([req1, req2])).toThrow('CANNOT_MERGE');
    });

    it('should merge containers with different names successfully', () => {
      const req1: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {
          containers: [{ name: 'data', componentId: 'UserApi', publicAccess: 'None' }],
        } as StorageConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {
          containers: [{ name: 'images', componentId: 'UserApi', publicAccess: 'Blob' }],
        } as StorageConfig,
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.config.containers).toHaveLength(2);
      expect(result.config.containers.map((c: ContainerConfig) => c.name)).toContain(
        'user-api-data'
      );
      expect(result.config.containers.map((c: ContainerConfig) => c.name)).toContain(
        'user-api-images'
      );
    });

    it('should reject configs exceeding container limit', () => {
      // Create two requirements that together exceed the limit
      const containers1 = Array.from({ length: 150 }, (_, i) => ({
        name: `container${i}`,
        componentId: `comp${i}`,
      }));

      const containers2 = Array.from({ length: 150 }, (_, i) => ({
        name: `container${i}`,
        componentId: `other${i}`,
      }));

      const req1: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: { containers: containers1 } as StorageConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: { containers: containers2 } as StorageConfig,
      };

      expect(() => provider.mergeRequirements([req1, req2])).toThrow('CONTAINER_LIMIT_EXCEEDED');
    });

    it('should handle containers without componentId', () => {
      const requirement: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {
          containers: [{ name: 'data' }],
        } as StorageConfig,
      };

      const result = provider.mergeRequirements([requirement]);

      expect(result.config.containers[0].name).toBe('data'); // No prefix for shared
    });
  });

  describe('validate', () => {
    it('should reject too many containers', () => {
      const containers = Array.from({ length: 260 }, (_, i) => ({
        name: `container${i}`,
      }));

      const config: StorageConfig = { containers };

      const requirement: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config,
      };

      const result = provider.validateMerged(requirement);

      expect(result.valid).toBe(false);
      expect(result.errors![0]).toContain('exceeding limit');
    });

    it('should reject empty container names', () => {
      const config: StorageConfig = {
        containers: [{ name: '' }],
      };

      const requirement: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config,
      };

      const result = provider.validateMerged(requirement);

      expect(result.valid).toBe(false);
      expect(result.errors![0]).toContain('cannot be empty');
    });

    it('should reject container names that are too short', () => {
      const config: StorageConfig = {
        containers: [{ name: 'ab' }],
      };

      const requirement: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config,
      };

      const result = provider.validateMerged(requirement);

      expect(result.valid).toBe(false);
      expect(result.errors![0]).toContain('3-63 characters');
    });

    it('should reject container names that are too long', () => {
      const config: StorageConfig = {
        containers: [{ name: 'a'.repeat(64) }],
      };

      const requirement: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config,
      };

      const result = provider.validateMerged(requirement);

      expect(result.valid).toBe(false);
      expect(result.errors![0]).toContain('3-63 characters');
    });

    it('should reject container names with invalid characters', () => {
      const invalidNames = ['My-Container', 'container_name', 'container.name', 'UPPERCASE'];

      for (const name of invalidNames) {
        const config: StorageConfig = {
          containers: [{ name }],
        };

        const requirement: IResourceRequirement = {
          resourceType: 'storage',
          requirementKey: 'shared',
          config,
        };

        const result = provider.validateMerged(requirement);

        expect(result.valid).toBe(false);
      }
    });

    it('should reject container names starting with hyphen', () => {
      const config: StorageConfig = {
        containers: [{ name: '-container' }],
      };

      const requirement: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config,
      };

      const result = provider.validateMerged(requirement);

      expect(result.valid).toBe(false);
      expect(result.errors![0]).toContain('cannot start or end with a hyphen');
    });

    it('should reject container names ending with hyphen', () => {
      const config: StorageConfig = {
        containers: [{ name: 'container-' }],
      };

      const requirement: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config,
      };

      const result = provider.validateMerged(requirement);

      expect(result.valid).toBe(false);
      expect(result.errors![0]).toContain('cannot start or end with a hyphen');
    });

    it('should reject container names with consecutive hyphens', () => {
      const config: StorageConfig = {
        containers: [{ name: 'container--name' }],
      };

      const requirement: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config,
      };

      const result = provider.validateMerged(requirement);

      expect(result.valid).toBe(false);
      expect(result.errors![0]).toContain('consecutive hyphens');
    });

    it('should accept valid container names', () => {
      const validNames = ['data', 'my-container', 'container123', 'a'.repeat(63)];

      for (const name of validNames) {
        const config: StorageConfig = {
          containers: [{ name }],
        };

        const requirement: IResourceRequirement = {
          resourceType: 'storage',
          requirementKey: 'shared',
          config,
        };

        const result = provider.validateMerged(requirement);

        expect(result.valid).toBe(true);
      }
    });

    it('should warn about public access enabled', () => {
      const config: StorageConfig = {
        enableBlobPublicAccess: true,
      };

      const requirement: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config,
      };

      const result = provider.validateMerged(requirement);

      expect(result.valid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('public access');
    });

    it('should accept valid configuration', () => {
      const config: StorageConfig = {
        sku: 'Standard_LRS' as any,
        accessTier: 'Hot' as any,
        enableBlobPublicAccess: false,
        containers: [
          { name: 'user-api-data', componentId: 'UserApi' },
          { name: 'product-api-images', componentId: 'ProductApi' },
        ],
      };

      const requirement: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config,
      };

      const result = provider.validateMerged(requirement);

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });
  });

  describe('getComponentContainers', () => {
    it('should return containers for specific component', () => {
      const config: StorageConfig = {
        containers: [
          { name: 'user-api-data', componentId: 'UserApi' },
          { name: 'user-api-images', componentId: 'UserApi' },
          { name: 'productapi-data', componentId: 'ProductApi' },
        ],
      };

      const containers = provider.getComponentContainers(config, 'UserApi');

      expect(containers).toHaveLength(2);
      expect(containers).toContain('user-api-data');
      expect(containers).toContain('user-api-images');
    });

    it('should return empty array for component with no containers', () => {
      const config: StorageConfig = {
        containers: [{ name: 'user-api-data', componentId: 'UserApi' }],
      };

      const containers = provider.getComponentContainers(config, 'ProductApi');

      expect(containers).toHaveLength(0);
    });

    it('should return empty array for config with no containers', () => {
      const config: StorageConfig = {};

      const containers = provider.getComponentContainers(config, 'UserApi');

      expect(containers).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle configs with no containers', () => {
      const req1: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {} as StorageConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {} as StorageConfig,
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.config.containers).toEqual([]);
    });

    it('should handle configs with undefined SKU', () => {
      const req1: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {} as StorageConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {} as StorageConfig,
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.config.sku).toBeUndefined();
    });

    it('should handle containers without public access setting', () => {
      const requirement: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {
          containers: [{ name: 'data', componentId: 'UserApi' }],
        } as StorageConfig,
      };

      const result = provider.mergeRequirements([requirement]);

      expect(result.config.containers[0].publicAccess).toBeUndefined();
    });

    it('should preserve location when specified', () => {
      const requirement: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {
          location: 'westus',
        } as StorageConfig,
      };

      const result = provider.mergeRequirements([requirement]);

      expect(result.config.location).toBe('westus');
    });
  });
});
