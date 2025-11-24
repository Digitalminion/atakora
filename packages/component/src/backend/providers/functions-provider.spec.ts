import { describe, it, expect, beforeEach } from 'vitest';
import {
  FunctionsProvider,
  type FunctionsConfig,
  type EnvironmentVariableConfig,
} from './functions-provider';
import type { IResourceRequirement, ProviderContext } from './base-provider';
import type { Construct } from '@atakora/cdk';

describe('FunctionsProvider', () => {
  let provider: FunctionsProvider;
  let mockScope: Construct;
  let mockContext: ProviderContext;

  beforeEach(() => {
    provider = new FunctionsProvider();
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
      expect(provider.providerId).toBe('functions-provider');
    });

    it('should have correct resource type', () => {
      expect(provider.resourceType).toBe('functions');
    });

    it('should support functions resource type', () => {
      expect(provider.supportedTypes).toContain('functions');
    });
  });

  describe('canProvide', () => {
    it('should accept functions resource type', () => {
      const requirement: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {},
      };

      expect(provider.canProvide(requirement)).toBe(true);
    });

    it('should reject other resource types', () => {
      const requirement: IResourceRequirement = {
        resourceType: 'cosmos',
        requirementKey: 'shared',
        config: {},
      };

      expect(provider.canProvide(requirement)).toBe(false);
    });
  });

  describe('mergeRequirements - runtime compatibility', () => {
    it('should merge configs with same runtime', () => {
      const req1: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
          version: '20',
        } as FunctionsConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
          version: '20',
        } as FunctionsConfig,
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.config.runtime).toBe('node');
      expect(result.config.version).toBe('20');
    });

    it('should reject configs with different runtimes', () => {
      const req1: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
        } as FunctionsConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'python',
        } as FunctionsConfig,
      };

      expect(() => provider.mergeRequirements([req1, req2])).toThrow('CANNOT_MERGE');
    });

    it('should reject configs with different major versions', () => {
      const req1: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
          version: '18',
        } as FunctionsConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
          version: '20',
        } as FunctionsConfig,
      };

      expect(() => provider.mergeRequirements([req1, req2])).toThrow('CANNOT_MERGE');
    });

    it('should allow configs with same major version but different minor versions', () => {
      const req1: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
          version: '20.1',
        } as FunctionsConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
          version: '20.2',
        } as FunctionsConfig,
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.config.version).toBe('20.2'); // Highest version
    });

    it('should allow configs when only one has version specified', () => {
      const req1: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
          version: '20',
        } as FunctionsConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
        } as FunctionsConfig,
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.config.version).toBe('20');
    });
  });

  describe('mergeRequirements - environment variables', () => {
    it('should namespace environment variables by component', () => {
      const req1: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
          environmentVariables: {
            COSMOS_ENDPOINT: { value: 'https://cosmos1.azure.com', componentId: 'UserApi' },
          },
        } as FunctionsConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
          environmentVariables: {
            COSMOS_ENDPOINT: { value: 'https://cosmos2.azure.com', componentId: 'ProductApi' },
          },
        } as FunctionsConfig,
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.config.environmentVariables).toHaveProperty('USER_API_COSMOS_ENDPOINT');
      expect(result.config.environmentVariables).toHaveProperty('PRODUCT_API_COSMOS_ENDPOINT');
    });

    it('should not namespace shared environment variables', () => {
      const requirement: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
          environmentVariables: {
            LOG_LEVEL: { value: 'info', componentId: 'shared' },
          },
        } as FunctionsConfig,
      };

      const result = provider.mergeRequirements([requirement]);

      expect(result.config.environmentVariables).toHaveProperty('LOG_LEVEL');
      expect(result.config.environmentVariables.LOG_LEVEL.value).toBe('info');
    });

    it('should reject conflicting environment variable values', () => {
      const req1: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
          environmentVariables: {
            CONFIG: { value: 'value1', componentId: 'MyComponent' },
          },
        } as FunctionsConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
          environmentVariables: {
            CONFIG: { value: 'value2', componentId: 'MyComponent' },
          },
        } as FunctionsConfig,
      };

      // Conflict detected in canMerge, throws CANNOT_MERGE
      expect(() => provider.mergeRequirements([req1, req2])).toThrow('CANNOT_MERGE');
    });

    it('should allow same key with same value from same component', () => {
      const req1: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
          environmentVariables: {
            CONFIG: { value: 'same-value', componentId: 'MyComponent' },
          },
        } as FunctionsConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
          environmentVariables: {
            CONFIG: { value: 'same-value', componentId: 'MyComponent' },
          },
        } as FunctionsConfig,
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.config.environmentVariables.MY_COMPONENT_CONFIG.value).toBe('same-value');
    });

    it('should reject configs exceeding environment variable limit in validation', () => {
      const envVars: Record<string, EnvironmentVariableConfig> = {};
      for (let i = 0; i < 1100; i++) {
        envVars[`VAR_${i}`] = { value: `value${i}`, componentId: 'TestComponent' };
      }

      const config: FunctionsConfig = {
        runtime: 'node',
        environmentVariables: envVars,
      };

      const result = provider.validateMerged({
        resourceType: 'functions',
        requirementKey: 'shared',
        config,
      });

      expect(result.valid).toBe(false);
      expect(result.errors![0]).toContain('environment variables');
    });

    it('should handle environment variables without componentId', () => {
      const requirement: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
          environmentVariables: {
            SOME_VAR: { value: 'some-value' },
          },
        } as FunctionsConfig,
      };

      const result = provider.mergeRequirements([requirement]);

      // Without componentId, defaults to 'shared', which is not namespaced
      expect(result.config.environmentVariables.SOME_VAR.value).toBe('some-value');
    });
  });

  describe('mergeRequirements - extensions', () => {
    it('should merge extensions as union', () => {
      const req1: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
          extensions: ['cosmos', 'storage'],
        } as FunctionsConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
          extensions: ['servicebus', 'storage'],
        } as FunctionsConfig,
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.config.extensions).toHaveLength(3);
      expect(result.config.extensions).toContain('cosmos');
      expect(result.config.extensions).toContain('storage');
      expect(result.config.extensions).toContain('servicebus');
    });

    it('should handle configs without extensions', () => {
      const req1: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
        } as FunctionsConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
          extensions: ['cosmos'],
        } as FunctionsConfig,
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.config.extensions).toEqual(['cosmos']);
    });
  });

  describe('mergeRequirements - SKU selection', () => {
    it('should select highest SKU when merging', () => {
      const req1: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
          sku: 'Y1', // Consumption
        } as FunctionsConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
          sku: 'EP1', // Elastic Premium
        } as FunctionsConfig,
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.config.sku).toBe('EP1');
    });

    it('should select Premium V3 over Premium V2', () => {
      const req1: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
          sku: 'P2V2',
        } as FunctionsConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
          sku: 'P1V3',
        } as FunctionsConfig,
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.config.sku).toBe('P1V3');
    });

    it('should handle configs without SKU', () => {
      const req1: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
        } as FunctionsConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
        } as FunctionsConfig,
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.config.sku).toBeUndefined();
    });
  });

  describe('mergeRequirements - alwaysOn', () => {
    it('should enable alwaysOn if any component requires it', () => {
      const req1: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
          alwaysOn: false,
        } as FunctionsConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
          alwaysOn: true,
        } as FunctionsConfig,
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.config.alwaysOn).toBe(true);
    });

    it('should not enable alwaysOn if no component requires it', () => {
      const req1: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
          alwaysOn: false,
        } as FunctionsConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
          alwaysOn: false,
        } as FunctionsConfig,
      };

      const result = provider.mergeRequirements([req1, req2]);

      // When no config requires alwaysOn, we keep the base value (false from req1)
      expect(result.config.alwaysOn).toBe(false);
    });
  });

  describe('validate', () => {
    it('should validate runtime types', () => {
      const config: FunctionsConfig = {
        runtime: 'invalid' as any,
      };

      const requirement: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config,
      };

      const result = provider.validateMerged(requirement);

      expect(result.valid).toBe(false);
      expect(result.errors![0]).toContain('Invalid runtime');
    });

    it('should validate version format', () => {
      const config: FunctionsConfig = {
        runtime: 'node',
        version: 'invalid-version',
      };

      const requirement: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config,
      };

      const result = provider.validateMerged(requirement);

      expect(result.valid).toBe(false);
      expect(result.errors![0]).toContain('Invalid version format');
    });

    it('should accept valid version formats', () => {
      const validVersions = ['20', '18.0', '3.11.0'];

      for (const version of validVersions) {
        const config: FunctionsConfig = {
          runtime: 'node',
          version,
        };

        const requirement: IResourceRequirement = {
          resourceType: 'functions',
          requirementKey: 'shared',
          config,
        };

        const result = provider.validateMerged(requirement);

        expect(result.valid).toBe(true);
      }
    });

    it('should warn about alwaysOn on consumption plan', () => {
      const config: FunctionsConfig = {
        runtime: 'node',
        sku: 'Y1',
        alwaysOn: true,
      };

      const requirement: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config,
      };

      const result = provider.validateMerged(requirement);

      expect(result.valid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('alwaysOn is not available on Consumption plan');
    });

    it('should reject too many environment variables', () => {
      const envVars: Record<string, EnvironmentVariableConfig> = {};
      for (let i = 0; i < 1100; i++) {
        envVars[`VAR_${i}`] = { value: `value${i}` };
      }

      const config: FunctionsConfig = {
        runtime: 'node',
        environmentVariables: envVars,
      };

      const requirement: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config,
      };

      const result = provider.validateMerged(requirement);

      expect(result.valid).toBe(false);
      expect(result.errors![0]).toContain('environment variables');
    });

    it('should accept valid configuration', () => {
      const config: FunctionsConfig = {
        runtime: 'node',
        version: '20',
        sku: 'EP1',
        alwaysOn: true,
        environmentVariables: {
          LOG_LEVEL: { value: 'info' },
        },
        extensions: ['cosmos', 'storage'],
      };

      const requirement: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config,
      };

      const result = provider.validateMerged(requirement);

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });
  });

  describe('getEnvironmentVariableKey', () => {
    it('should generate namespaced key for component', () => {
      const key = provider.getEnvironmentVariableKey('UserApi', 'COSMOS_ENDPOINT');

      expect(key).toBe('USER_API_COSMOS_ENDPOINT');
    });

    it('should not namespace shared keys', () => {
      const key = provider.getEnvironmentVariableKey('shared', 'LOG_LEVEL');

      expect(key).toBe('LOG_LEVEL');
    });

    it('should handle camelCase component IDs', () => {
      const key = provider.getEnvironmentVariableKey('myTestComponent', 'CONFIG');

      expect(key).toBe('MY_TEST_COMPONENT_CONFIG');
    });

    it('should handle PascalCase component IDs', () => {
      const key = provider.getEnvironmentVariableKey('MyTestComponent', 'CONFIG');

      expect(key).toBe('MY_TEST_COMPONENT_CONFIG');
    });

    it('should not namespace unknown component ID', () => {
      const key = provider.getEnvironmentVariableKey('unknown', 'CONFIG');

      expect(key).toBe('CONFIG');
    });
  });

  describe('edge cases', () => {
    it('should handle configs with no environment variables', () => {
      const req1: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
        } as FunctionsConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
        } as FunctionsConfig,
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.config.environmentVariables).toEqual({});
    });

    it('should handle version sorting with different lengths', () => {
      const req1: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
          version: '20.1.0',
        } as FunctionsConfig,
      };

      const req2: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
          version: '20.2',
        } as FunctionsConfig,
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.config.version).toBe('20.2');
    });

    it('should preserve plan and storage account references', () => {
      const mockPlan = { id: 'plan-id' };
      const mockStorage = { id: 'storage-id' };

      const requirement: IResourceRequirement = {
        resourceType: 'functions',
        requirementKey: 'shared',
        config: {
          runtime: 'node',
          plan: mockPlan,
          storageAccount: mockStorage,
        } as FunctionsConfig,
      };

      const result = provider.mergeRequirements([requirement]);

      expect(result.config.plan).toBe(mockPlan);
      expect(result.config.storageAccount).toBe(mockStorage);
    });

    it('should handle all valid runtime types', () => {
      const runtimes: Array<'node' | 'python' | 'dotnet' | 'java' | 'powershell'> = [
        'node',
        'python',
        'dotnet',
        'java',
        'powershell',
      ];

      for (const runtime of runtimes) {
        const config: FunctionsConfig = { runtime };

        const requirement: IResourceRequirement = {
          resourceType: 'functions',
          requirementKey: 'shared',
          config,
        };

        const result = provider.validateMerged(requirement);

        expect(result.valid).toBe(true);
      }
    });
  });
});
