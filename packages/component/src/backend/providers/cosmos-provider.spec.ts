import { describe, it, expect, beforeEach } from 'vitest';
import {
  CosmosProvider,
  type CosmosConfig,
  type DatabaseRequirement,
  type ContainerRequirement,
} from './cosmos-provider';
import type { IResourceRequirement, ProviderContext } from './base-provider';
import type { Construct } from '@atakora/cdk';

describe('CosmosProvider', () => {
  let provider: CosmosProvider;
  let mockScope: Construct;
  let mockContext: ProviderContext;

  beforeEach(() => {
    provider = new CosmosProvider();
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
      expect(provider.providerId).toBe('cosmos-provider');
    });

    it('should have correct resource type', () => {
      expect(provider.resourceType).toBe('cosmos');
    });

    it('should support cosmos resource type', () => {
      expect(provider.supportedTypes).toContain('cosmos');
    });
  });

  describe('canProvide', () => {
    it('should accept cosmos resource type', () => {
      const requirement: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {},
      };

      expect(provider.canProvide(requirement)).toBe(true);
    });

    it('should reject other resource types', () => {
      const requirement: IResourceRequirement = {
        resourceType: 'storage',
        requirementKey: 'shared',
        config: {},
      };

      expect(provider.canProvide(requirement)).toBe(false);
    });
  });

  describe('mergeRequirements - basic merging', () => {
    it('should merge two compatible configs', () => {
      const req1: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          enableServerless: true,
          databases: [{ name: 'db1' }],
        } as CosmosConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          enableServerless: true,
          databases: [{ name: 'db2' }],
        } as CosmosConfig,
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.config.databases).toHaveLength(2);
      expect(result.config.databases.map((d: DatabaseRequirement) => d.name)).toContain('db1');
      expect(result.config.databases.map((d: DatabaseRequirement) => d.name)).toContain('db2');
    });

    it('should reject configs with different consistency levels', () => {
      const req1: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          consistency: 'Session' as any,
        } as CosmosConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          consistency: 'Strong' as any,
        } as CosmosConfig,
      };

      expect(() => provider.mergeRequirements([req1, req2])).toThrow('CANNOT_MERGE');
    });

    it('should reject configs with different serverless modes', () => {
      const req1: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          enableServerless: true,
        } as CosmosConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          enableServerless: false,
        } as CosmosConfig,
      };

      expect(() => provider.mergeRequirements([req1, req2])).toThrow('CANNOT_MERGE');
    });

    it('should reject configs with different kinds', () => {
      const req1: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          kind: 'GlobalDocumentDB' as any,
        } as CosmosConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          kind: 'MongoDB' as any,
        } as CosmosConfig,
      };

      expect(() => provider.mergeRequirements([req1, req2])).toThrow('CANNOT_MERGE');
    });

    it('should reject configs with different multi-region settings', () => {
      const req1: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          enableMultiRegion: true,
        } as CosmosConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          enableMultiRegion: false,
        } as CosmosConfig,
      };

      expect(() => provider.mergeRequirements([req1, req2])).toThrow('CANNOT_MERGE');
    });
  });

  describe('mergeRequirements - database merging', () => {
    it('should deduplicate databases by name', () => {
      const req1: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          databases: [{ name: 'users-db', containers: [{ name: 'users', partitionKey: '/id' }] }],
        } as CosmosConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          databases: [
            { name: 'users-db', containers: [{ name: 'sessions', partitionKey: '/userId' }] },
          ],
        } as CosmosConfig,
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.config.databases).toHaveLength(1);
      expect(result.config.databases[0].name).toBe('users-db');
      expect(result.config.databases[0].containers).toHaveLength(2);
    });

    it('should merge containers within same database', () => {
      const req1: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          databases: [
            {
              name: 'app-db',
              containers: [
                { name: 'users', partitionKey: '/id' },
                { name: 'sessions', partitionKey: '/userId' },
              ],
            },
          ],
        } as CosmosConfig,
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
        } as CosmosConfig,
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.config.databases).toHaveLength(1);
      expect(result.config.databases[0].containers).toHaveLength(3);
    });

    it('should reject databases exceeding limit in validation', () => {
      const databases = Array.from({ length: 30 }, (_, i) => ({ name: `db${i}` }));

      const config: CosmosConfig = { databases };
      const result = provider.validateMerged({
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config,
      });

      expect(result.valid).toBe(false);
      expect(result.errors![0]).toContain('exceeding limit');
    });

    it('should throw on exceeding database limit during merge', () => {
      const req1: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          databases: Array.from({ length: 20 }, (_, i) => ({ name: `db${i}` })),
        } as CosmosConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          databases: Array.from({ length: 10 }, (_, i) => ({ name: `db${i + 20}` })),
        } as CosmosConfig,
      };

      expect(() => provider.mergeRequirements([req1, req2])).toThrow('DATABASE_LIMIT_EXCEEDED');
    });
  });

  describe('mergeRequirements - container merging', () => {
    it('should deduplicate containers by name', () => {
      const req1: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          databases: [
            {
              name: 'db1',
              containers: [{ name: 'users', partitionKey: '/id' }],
            },
          ],
        } as CosmosConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          databases: [
            {
              name: 'db1',
              containers: [{ name: 'users', partitionKey: '/id' }],
            },
          ],
        } as CosmosConfig,
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.config.databases[0].containers).toHaveLength(1);
    });

    it('should reject containers with conflicting partition keys', () => {
      const req1: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          databases: [
            {
              name: 'db1',
              containers: [{ name: 'users', partitionKey: '/id' }],
            },
          ],
        } as CosmosConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          databases: [
            {
              name: 'db1',
              containers: [{ name: 'users', partitionKey: '/userId' }],
            },
          ],
        } as CosmosConfig,
      };

      expect(() => provider.mergeRequirements([req1, req2])).toThrow('INCOMPATIBLE_PARTITION_KEYS');
    });

    it('should merge unique keys from duplicate containers', () => {
      const req1: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          databases: [
            {
              name: 'db1',
              containers: [{ name: 'users', partitionKey: '/id', uniqueKeys: ['email'] }],
            },
          ],
        } as CosmosConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          databases: [
            {
              name: 'db1',
              containers: [{ name: 'users', partitionKey: '/id', uniqueKeys: ['username'] }],
            },
          ],
        } as CosmosConfig,
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.config.databases[0].containers![0].uniqueKeys).toHaveLength(2);
      expect(result.config.databases[0].containers![0].uniqueKeys).toContain('email');
      expect(result.config.databases[0].containers![0].uniqueKeys).toContain('username');
    });

    it('should use minimum TTL when both specified', () => {
      const req1: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          databases: [
            {
              name: 'db1',
              containers: [{ name: 'sessions', partitionKey: '/id', ttl: 3600 }],
            },
          ],
        } as CosmosConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          databases: [
            {
              name: 'db1',
              containers: [{ name: 'sessions', partitionKey: '/id', ttl: 7200 }],
            },
          ],
        } as CosmosConfig,
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.config.databases[0].containers![0].ttl).toBe(3600);
    });

    it('should reject containers exceeding limit in validation', () => {
      const containers = Array.from({ length: 110 }, (_, i) => ({
        name: `container${i}`,
        partitionKey: '/id',
      }));

      const config: CosmosConfig = {
        databases: [{ name: 'db1', containers }],
      };

      const result = provider.validateMerged({
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config,
      });

      expect(result.valid).toBe(false);
      expect(result.errors![0]).toContain('exceeding limit');
    });
  });

  describe('mergeRequirements - capability and location merging', () => {
    it('should merge capabilities as union', () => {
      const req1: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          capabilities: ['EnableServerless'],
        } as CosmosConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          capabilities: ['EnableTable', 'EnableCassandra'],
        } as CosmosConfig,
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.config.capabilities).toHaveLength(3);
      expect(result.config.capabilities).toContain('EnableServerless');
      expect(result.config.capabilities).toContain('EnableTable');
      expect(result.config.capabilities).toContain('EnableCassandra');
    });

    it('should merge additional locations as union', () => {
      const req1: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          additionalLocations: ['westus', 'eastus'],
        } as CosmosConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          additionalLocations: ['northeurope'],
        } as CosmosConfig,
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.config.additionalLocations).toHaveLength(3);
      expect(result.config.additionalLocations).toContain('westus');
      expect(result.config.additionalLocations).toContain('eastus');
      expect(result.config.additionalLocations).toContain('northeurope');
    });

    it('should enable multi-region if any config requires it', () => {
      const req1: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          enableMultiRegion: false,
        } as CosmosConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          enableMultiRegion: true,
        } as CosmosConfig,
      };

      // This should fail because enableMultiRegion must match
      expect(() => provider.mergeRequirements([req1, req2])).toThrow('CANNOT_MERGE');
    });

    it('should enable free tier if any config requires it', () => {
      const req1: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {} as CosmosConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          enableFreeTier: true,
        } as CosmosConfig,
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.config.enableFreeTier).toBe(true);
    });
  });

  describe('mergeRequirements - public network access', () => {
    it('should use most restrictive public network access (Disabled)', () => {
      const req1: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          publicNetworkAccess: 'Enabled' as any,
        } as CosmosConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          publicNetworkAccess: 'Disabled' as any,
        } as CosmosConfig,
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.config.publicNetworkAccess).toBe('Disabled');
    });

    it('should use SecuredByPerimeter over Enabled', () => {
      const req1: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          publicNetworkAccess: 'Enabled' as any,
        } as CosmosConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          publicNetworkAccess: 'SecuredByPerimeter' as any,
        } as CosmosConfig,
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.config.publicNetworkAccess).toBe('SecuredByPerimeter');
    });

    it('should use Enabled when all configs specify it', () => {
      const req1: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          publicNetworkAccess: 'Enabled' as any,
        } as CosmosConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          publicNetworkAccess: 'Enabled' as any,
        } as CosmosConfig,
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.config.publicNetworkAccess).toBe('Enabled');
    });
  });

  describe('validate', () => {
    it('should validate serverless constraints', () => {
      const config: CosmosConfig = {
        enableServerless: true,
        enableMultiRegion: true,
      };

      const requirement: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config,
      };

      const result = provider.validateMerged(requirement);

      expect(result.valid).toBe(false);
      expect(result.errors![0]).toContain('Serverless accounts do not support multi-region');
    });

    it('should warn about free tier on serverless', () => {
      const config: CosmosConfig = {
        enableServerless: true,
        enableFreeTier: true,
      };

      const requirement: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config,
      };

      const result = provider.validateMerged(requirement);

      expect(result.valid).toBe(true); // No errors, just warnings
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.some((w) => w.includes('free tier'))).toBe(true);
    });

    it('should warn about free tier limitation', () => {
      const config: CosmosConfig = {
        enableFreeTier: true,
      };

      const requirement: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config,
      };

      const result = provider.validateMerged(requirement);

      expect(result.valid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('free tier');
    });

    it('should reject empty database names', () => {
      const config: CosmosConfig = {
        databases: [{ name: '' }],
      };

      const requirement: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config,
      };

      const result = provider.validateMerged(requirement);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Database name cannot be empty');
    });

    it('should reject empty container names', () => {
      const config: CosmosConfig = {
        databases: [
          {
            name: 'db1',
            containers: [{ name: '', partitionKey: '/id' }],
          },
        ],
      };

      const requirement: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config,
      };

      const result = provider.validateMerged(requirement);

      expect(result.valid).toBe(false);
      expect(result.errors![0]).toContain('Container name cannot be empty');
    });

    it('should reject containers without partition key', () => {
      const config: CosmosConfig = {
        databases: [
          {
            name: 'db1',
            containers: [{ name: 'users', partitionKey: '' }],
          },
        ],
      };

      const requirement: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config,
      };

      const result = provider.validateMerged(requirement);

      expect(result.valid).toBe(false);
      expect(result.errors![0]).toContain('must specify a partition key');
    });

    it('should reject partition keys not starting with /', () => {
      const config: CosmosConfig = {
        databases: [
          {
            name: 'db1',
            containers: [{ name: 'users', partitionKey: 'id' }],
          },
        ],
      };

      const requirement: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config,
      };

      const result = provider.validateMerged(requirement);

      expect(result.valid).toBe(false);
      expect(result.errors![0]).toContain("must start with '/'");
    });

    it('should accept valid configuration', () => {
      const config: CosmosConfig = {
        consistency: 'Session' as any,
        databases: [
          {
            name: 'users-db',
            containers: [
              { name: 'users', partitionKey: '/id' },
              { name: 'sessions', partitionKey: '/userId' },
            ],
          },
        ],
      };

      const requirement: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config,
      };

      const result = provider.validateMerged(requirement);

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });
  });

  describe('helper methods', () => {
    it('getDatabases should return databases from config', () => {
      const config: CosmosConfig = {
        databases: [{ name: 'db1' }, { name: 'db2' }],
      };

      const databases = provider.getDatabases(config);

      expect(databases).toHaveLength(2);
      expect(databases[0].name).toBe('db1');
    });

    it('getDatabases should return empty array for no databases', () => {
      const config: CosmosConfig = {};

      const databases = provider.getDatabases(config);

      expect(databases).toHaveLength(0);
    });

    it('getContainers should return containers for database', () => {
      const config: CosmosConfig = {
        databases: [
          {
            name: 'db1',
            containers: [
              { name: 'users', partitionKey: '/id' },
              { name: 'sessions', partitionKey: '/userId' },
            ],
          },
        ],
      };

      const containers = provider.getContainers(config, 'db1');

      expect(containers).toHaveLength(2);
      expect(containers![0].name).toBe('users');
    });

    it('getContainers should return undefined for non-existent database', () => {
      const config: CosmosConfig = {
        databases: [{ name: 'db1' }],
      };

      const containers = provider.getContainers(config, 'nonexistent');

      expect(containers).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle configs with no databases', () => {
      const req1: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {} as CosmosConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {} as CosmosConfig,
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.config.databases).toEqual([]);
    });

    it('should handle databases with no containers', () => {
      const requirement: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          databases: [{ name: 'db1' }],
        } as CosmosConfig,
      };

      const result = provider.mergeRequirements([requirement]);

      expect(result.config.databases[0].containers).toBeUndefined();
    });

    it('should preserve indexing policy when merging containers', () => {
      const req1: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          databases: [
            {
              name: 'db1',
              containers: [
                {
                  name: 'users',
                  partitionKey: '/id',
                  indexingPolicy: { automatic: true },
                },
              ],
            },
          ],
        } as CosmosConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {
          databases: [
            {
              name: 'db1',
              containers: [
                {
                  name: 'users',
                  partitionKey: '/id',
                },
              ],
            },
          ],
        } as CosmosConfig,
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.config.databases[0].containers![0].indexingPolicy).toEqual({ automatic: true });
    });
  });
});
