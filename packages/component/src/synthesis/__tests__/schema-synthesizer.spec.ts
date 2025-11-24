/**
 * Schema Synthesizer Tests
 *
 * Tests for the SchemaSynthesizer class that orchestrates OpenAPI and
 * GraphQL schema generation from component schemas.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SchemaSynthesizer,
  createSchemaSynthesizer,
} from '../schema-synthesizer';
import type { SynthesisContext } from '../types';

describe('SchemaSynthesizer', () => {
  let synthesizer: SchemaSynthesizer;

  beforeEach(() => {
    synthesizer = new SchemaSynthesizer();
  });

  describe('constructor', () => {
    it('should create a new SchemaSynthesizer instance', () => {
      expect(synthesizer).toBeInstanceOf(SchemaSynthesizer);
    });

    it('should create via factory function', () => {
      const instance = createSchemaSynthesizer();
      expect(instance).toBeInstanceOf(SchemaSynthesizer);
    });
  });

  describe('synthesize', () => {
    it('should generate OpenAPI spec from schema by default', async () => {
      const schema = {
        _metadata: {
          name: 'TestAPI',
          version: '1.0.0',
        },
        models: {
          User: {
            config: {
              type: 'crud',
              fields: {
                id: { type: 'id', required: true, validations: [] },
                email: { type: 'string', required: true, validations: [] },
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

      const context: SynthesisContext = {
        backend: { schema } as any,
        analysis: {} as any,
        environment: 'dev' as any,
        cloudType: 'commercial',
        region: 'eastus',
        resourceGroup: 'test-rg',
        tags: {},
        naming: {
          organization: 'org',
          project: 'test',
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

      const artifacts = await synthesizer.synthesize(context);

      expect(artifacts.openapi).not.toBeNull();
      expect(artifacts.openapi?.openapi).toBe('3.0.3');
      expect(artifacts.openapi?.info.title).toBe('TestAPI API');
      expect(artifacts.openapi?.paths).toBeDefined();
      expect(artifacts.openapi?.paths['/users']).toBeDefined();
      expect(artifacts.openapi?.paths['/users/{id}']).toBeDefined();
      expect(artifacts.graphql).toBeNull(); // Not yet implemented
      expect(artifacts.typescript).toBeNull(); // Not yet implemented
    });

    it('should skip OpenAPI generation when disabled', async () => {
      const schema = {
        _metadata: { name: 'TestAPI' },
        models: {
          User: {
            config: {
              type: 'crud',
              fields: {
                id: { type: 'id', required: true, validations: [] },
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

      const context: SynthesisContext = {
        backend: { schema } as any,
        analysis: {} as any,
        environment: 'dev' as any,
        cloudType: 'commercial',
        region: 'eastus',
        resourceGroup: 'test-rg',
        tags: {},
        naming: {
          organization: 'org',
          project: 'test',
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

      const artifacts = await synthesizer.synthesize(context, {
        generateOpenApi: false,
      });

      expect(artifacts.openapi).toBeNull();
      expect(artifacts.graphql).toBeNull();
      expect(artifacts.typescript).toBeNull();
    });

    it('should handle empty schema', async () => {
      const schema = {
        _metadata: { name: 'EmptyAPI' },
        models: {},
      };

      const context: SynthesisContext = {
        backend: { schema } as any,
        analysis: {} as any,
        environment: 'dev' as any,
        cloudType: 'commercial',
        region: 'eastus',
        resourceGroup: 'test-rg',
        tags: {},
        naming: {
          organization: 'org',
          project: 'test',
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

      const artifacts = await synthesizer.synthesize(context);

      expect(artifacts.openapi).not.toBeNull();
      expect(artifacts.openapi?.openapi).toBe('3.0.3');
      expect(artifacts.openapi?.paths).toBeDefined();
      expect(Object.keys(artifacts.openapi?.paths || {})).toHaveLength(0);
    });

    it('should throw error if schema is missing', async () => {
      const context: SynthesisContext = {
        backend: {} as any, // Missing schema
        analysis: {} as any,
        environment: 'dev' as any,
        cloudType: 'commercial',
        region: 'eastus',
        resourceGroup: 'test-rg',
        tags: {},
        naming: {
          organization: 'org',
          project: 'test',
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

      await expect(synthesizer.synthesize(context)).rejects.toThrow(
        'Schema synthesis failed: context.backend.schema is missing or invalid'
      );
    });

    it('should generate complete OpenAPI spec with multiple models', async () => {
      const schema = {
        _metadata: {
          name: 'MultiModelAPI',
          version: '2.0.0',
          description: 'Test API with multiple models',
        },
        models: {
          User: {
            config: {
              type: 'crud',
              fields: {
                id: { type: 'id', required: true, validations: [] },
                email: { type: 'string', required: true, validations: [] },
                name: { type: 'string', required: false, validations: [] },
              },
            },
            metadata: {
              isCrud: true,
              isEvent: false,
              isFunction: false,
            },
          },
          Post: {
            config: {
              type: 'crud',
              fields: {
                id: { type: 'id', required: true, validations: [] },
                title: { type: 'string', required: true, validations: [] },
                content: { type: 'string', required: true, validations: [] },
                authorId: { type: 'string', required: true, validations: [] },
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

      const context: SynthesisContext = {
        backend: { schema } as any,
        analysis: {} as any,
        environment: 'dev' as any,
        cloudType: 'commercial',
        region: 'eastus',
        resourceGroup: 'test-rg',
        tags: {},
        naming: {
          organization: 'org',
          project: 'test',
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

      const artifacts = await synthesizer.synthesize(context);

      expect(artifacts.openapi).not.toBeNull();
      expect(artifacts.openapi?.openapi).toBe('3.0.3');
      expect(artifacts.openapi?.info.title).toBe('MultiModelAPI API');
      expect(artifacts.openapi?.info.version).toBe('2.0.0');
      expect(artifacts.openapi?.info.description).toBe(
        'Test API with multiple models'
      );

      // Check User paths
      expect(artifacts.openapi?.paths['/users']).toBeDefined();
      expect(artifacts.openapi?.paths['/users'].get).toBeDefined();
      expect(artifacts.openapi?.paths['/users'].post).toBeDefined();
      expect(artifacts.openapi?.paths['/users/{id}']).toBeDefined();
      expect(artifacts.openapi?.paths['/users/{id}'].get).toBeDefined();
      expect(artifacts.openapi?.paths['/users/{id}'].put).toBeDefined();
      expect(artifacts.openapi?.paths['/users/{id}'].delete).toBeDefined();

      // Check Post paths
      expect(artifacts.openapi?.paths['/posts']).toBeDefined();
      expect(artifacts.openapi?.paths['/posts'].get).toBeDefined();
      expect(artifacts.openapi?.paths['/posts'].post).toBeDefined();
      expect(artifacts.openapi?.paths['/posts/{id}']).toBeDefined();
      expect(artifacts.openapi?.paths['/posts/{id}'].get).toBeDefined();
      expect(artifacts.openapi?.paths['/posts/{id}'].put).toBeDefined();
      expect(artifacts.openapi?.paths['/posts/{id}'].delete).toBeDefined();
    });

    it('should return null for GraphQL when requested (not yet implemented)', async () => {
      const schema = {
        _metadata: { name: 'TestAPI' },
        models: {
          User: {
            config: {
              type: 'crud',
              fields: {
                id: { type: 'id', required: true, validations: [] },
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

      const context: SynthesisContext = {
        backend: { schema } as any,
        analysis: {} as any,
        environment: 'dev' as any,
        cloudType: 'commercial',
        region: 'eastus',
        resourceGroup: 'test-rg',
        tags: {},
        naming: {
          organization: 'org',
          project: 'test',
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

      const artifacts = await synthesizer.synthesize(context, {
        generateGraphQL: true,
      });

      expect(artifacts.graphql).toBeNull(); // Not yet implemented
    });

    it('should return null for TypeScript when requested (not yet implemented)', async () => {
      const schema = {
        _metadata: { name: 'TestAPI' },
        models: {
          User: {
            config: {
              type: 'crud',
              fields: {
                id: { type: 'id', required: true, validations: [] },
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

      const context: SynthesisContext = {
        backend: { schema } as any,
        analysis: {} as any,
        environment: 'dev' as any,
        cloudType: 'commercial',
        region: 'eastus',
        resourceGroup: 'test-rg',
        tags: {},
        naming: {
          organization: 'org',
          project: 'test',
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

      const artifacts = await synthesizer.synthesize(context, {
        generateTypeScript: true,
      });

      expect(artifacts.typescript).toBeNull(); // Not yet implemented
    });
  });

  describe('getSchemaStats', () => {
    it('should return schema statistics', () => {
      const schema = {
        _metadata: { name: 'TestAPI' },
        models: {
          User: {
            config: { type: 'crud', fields: {} },
            metadata: { isCrud: true, isEvent: false, isFunction: false },
          },
          Post: {
            config: { type: 'crud', fields: {} },
            metadata: { isCrud: true, isEvent: false, isFunction: false },
          },
          UserCreated: {
            config: { type: 'event', fields: {} },
            metadata: { isCrud: false, isEvent: true, isFunction: false },
          },
        },
      };

      const context: SynthesisContext = {
        backend: { schema } as any,
        analysis: {} as any,
        environment: 'dev' as any,
        cloudType: 'commercial',
        region: 'eastus',
        resourceGroup: 'test-rg',
        tags: {},
        naming: {
          organization: 'org',
          project: 'test',
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

      const stats = synthesizer.getSchemaStats(context);

      expect(stats.totalModels).toBe(3);
      expect(stats.crudModels).toBe(2);
      expect(stats.eventModels).toBe(1);
      expect(stats.functionModels).toBe(0);
    });
  });

  describe('options handling', () => {
    it('should respect openApiVersion option (future)', async () => {
      const schema = {
        _metadata: { name: 'TestAPI' },
        models: {
          User: {
            config: {
              type: 'crud',
              fields: {
                id: { type: 'id', required: true, validations: [] },
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

      const context: SynthesisContext = {
        backend: { schema } as any,
        analysis: {} as any,
        environment: 'dev' as any,
        cloudType: 'commercial',
        region: 'eastus',
        resourceGroup: 'test-rg',
        tags: {},
        naming: {
          organization: 'org',
          project: 'test',
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

      const artifacts = await synthesizer.synthesize(context, {
        openApiVersion: '3.0.2',
      });

      expect(artifacts.openapi).not.toBeNull();
      // Note: OpenApiGenerator currently always generates 3.0.3
      // This test documents the option exists for future implementation
      expect(artifacts.openapi?.openapi).toBe('3.0.3');
    });

    it('should handle all options together', async () => {
      const schema = {
        _metadata: { name: 'TestAPI' },
        models: {
          User: {
            config: {
              type: 'crud',
              fields: {
                id: { type: 'id', required: true, validations: [] },
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

      const context: SynthesisContext = {
        backend: { schema } as any,
        analysis: {} as any,
        environment: 'dev' as any,
        cloudType: 'commercial',
        region: 'eastus',
        resourceGroup: 'test-rg',
        tags: {},
        naming: {
          organization: 'org',
          project: 'test',
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

      const artifacts = await synthesizer.synthesize(context, {
        generateOpenApi: true,
        generateGraphQL: true,
        generateTypeScript: true,
        openApiVersion: '3.0.3',
      });

      expect(artifacts.openapi).not.toBeNull();
      expect(artifacts.graphql).toBeNull(); // Not yet implemented
      expect(artifacts.typescript).toBeNull(); // Not yet implemented
    });
  });
});
