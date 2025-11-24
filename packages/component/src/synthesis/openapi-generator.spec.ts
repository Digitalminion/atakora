/**
 * OpenAPI Generator Tests
 *
 * Tests the OpenAPI specification generator to ensure it correctly transforms
 * component schema definitions into valid OpenAPI 3.0 specifications.
 */

import { describe, it, expect } from 'vitest';
import { OpenApiGenerator, generateOpenApiSpec } from './openapi-generator';

describe('OpenApiGenerator', () => {
  describe('basic generation', () => {
    it('should generate a valid OpenAPI spec from minimal schema', () => {
      const schema = {
        _metadata: {
          name: 'TestAPI',
          version: '1.0.0',
          description: 'Test API description',
        },
        models: {},
      };

      const generator = new OpenApiGenerator();
      const spec = generator.mapSchema(schema);

      expect(spec.openapi).toBe('3.0.3');
      expect(spec.info.title).toBe('TestAPI API');
      expect(spec.info.version).toBe('1.0.0');
      expect(spec.info.description).toBe('Test API description');
      expect(spec.paths).toBeDefined();
      expect(spec.components).toBeDefined();
    });

    it('should use convenience function generateOpenApiSpec', () => {
      const schema = {
        _metadata: { name: 'MyAPI' },
        models: {},
      };

      const spec = generateOpenApiSpec(schema);

      expect(spec.openapi).toBe('3.0.3');
      expect(spec.info.title).toBe('MyAPI API');
    });
  });

  describe('path generation', () => {
    it('should generate paths for CRUD models', () => {
      const schema = {
        _metadata: { name: 'UserAPI' },
        models: {
          User: {
            config: {
              type: 'crud',
              fields: {
                id: { type: 'id', required: true, validations: [] },
                email: { type: 'string', required: true, validations: [] },
                name: { type: 'string', required: true, validations: [] },
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

      const generator = new OpenApiGenerator();
      const spec = generator.mapSchema(schema);

      // Check collection paths
      expect(spec.paths['/users']).toBeDefined();
      expect(spec.paths['/users'].get).toBeDefined();
      expect(spec.paths['/users'].post).toBeDefined();

      // Check item paths
      expect(spec.paths['/users/{id}']).toBeDefined();
      expect(spec.paths['/users/{id}'].get).toBeDefined();
      expect(spec.paths['/users/{id}'].put).toBeDefined();
      expect(spec.paths['/users/{id}'].delete).toBeDefined();
    });

    it('should pluralize model names correctly', () => {
      const schema = {
        _metadata: { name: 'CategoryAPI' },
        models: {
          Category: {
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

      const generator = new OpenApiGenerator();
      const spec = generator.mapSchema(schema);

      expect(spec.paths['/categories']).toBeDefined();
      expect(spec.paths['/categories/{id}']).toBeDefined();
    });
  });

  describe('operation generation', () => {
    const testSchema = {
      _metadata: { name: 'ProductAPI' },
      models: {
        Product: {
          config: {
            type: 'crud',
            fields: {
              id: { type: 'id', required: true, validations: [] },
              name: { type: 'string', required: true, validations: [], minLength: 3, maxLength: 100 },
              price: { type: 'number', required: true, validations: [], min: 0 },
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

    it('should generate list operation with pagination', () => {
      const generator = new OpenApiGenerator();
      const spec = generator.mapSchema(testSchema);

      const listOp = spec.paths['/products'].get!;

      expect(listOp.operationId).toBe('listProducts');
      expect(listOp.summary).toContain('products');
      expect(listOp.parameters).toBeDefined();

      const limitParam = listOp.parameters!.find(p => 'name' in p && p.name === 'limit');
      expect(limitParam).toBeDefined();

      const offsetParam = listOp.parameters!.find(p => 'name' in p && p.name === 'offset');
      expect(offsetParam).toBeDefined();
    });

    it('should generate create operation', () => {
      const generator = new OpenApiGenerator();
      const spec = generator.mapSchema(testSchema);

      const createOp = spec.paths['/products'].post!;

      expect(createOp.operationId).toBe('createProduct');
      expect(createOp.requestBody).toBeDefined();
      expect(createOp.requestBody!.required).toBe(true);

      if ('content' in createOp.requestBody!) {
        expect(createOp.requestBody!.content['application/json']).toBeDefined();
      }

      expect(createOp.responses['201']).toBeDefined();
    });

    it('should generate get operation', () => {
      const generator = new OpenApiGenerator();
      const spec = generator.mapSchema(testSchema);

      const getOp = spec.paths['/products/{id}'].get!;

      expect(getOp.operationId).toBe('getProduct');

      const idParam = getOp.parameters!.find(p => 'name' in p && p.name === 'id');
      expect(idParam).toBeDefined();
      if (idParam && 'in' in idParam) {
        expect(idParam.in).toBe('path');
        expect(idParam.required).toBe(true);
      }

      expect(getOp.responses['200']).toBeDefined();
      expect(getOp.responses['404']).toBeDefined();
    });

    it('should generate update operation', () => {
      const generator = new OpenApiGenerator();
      const spec = generator.mapSchema(testSchema);

      const updateOp = spec.paths['/products/{id}'].put!;

      expect(updateOp.operationId).toBe('updateProduct');
      expect(updateOp.requestBody).toBeDefined();
      expect(updateOp.responses['200']).toBeDefined();
      expect(updateOp.responses['404']).toBeDefined();
    });

    it('should generate delete operation', () => {
      const generator = new OpenApiGenerator();
      const spec = generator.mapSchema(testSchema);

      const deleteOp = spec.paths['/products/{id}'].delete!;

      expect(deleteOp.operationId).toBe('deleteProduct');
      expect(deleteOp.responses['204']).toBeDefined();
      expect(deleteOp.responses['404']).toBeDefined();
    });
  });

  describe('component schema generation', () => {
    it('should generate schemas for models and input types', () => {
      const schema = {
        _metadata: { name: 'ItemAPI' },
        models: {
          Item: {
            config: {
              type: 'crud',
              fields: {
                id: { type: 'id', required: true, validations: [] },
                name: { type: 'string', required: true, validations: [] },
                description: { type: 'string', required: false, validations: [] },
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

      const generator = new OpenApiGenerator();
      const spec = generator.mapSchema(schema);

      // Check main model schema
      expect(spec.components!.schemas!['Item']).toBeDefined();

      // Check input schemas
      expect(spec.components!.schemas!['CreateItemInput']).toBeDefined();
      expect(spec.components!.schemas!['UpdateItemInput']).toBeDefined();
    });

    it('should omit system fields in create input schema', () => {
      const schema = {
        _metadata: { name: 'RecordAPI' },
        models: {
          Record: {
            config: {
              type: 'crud',
              fields: {
                id: { type: 'id', required: true, validations: [] },
                name: { type: 'string', required: true, validations: [] },
                createdAt: { type: 'datetime', required: true, validations: [] },
                updatedAt: { type: 'datetime', required: true, validations: [] },
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

      const generator = new OpenApiGenerator();
      const spec = generator.mapSchema(schema);

      const createInputSchema = spec.components!.schemas!['CreateRecordInput'];

      expect(createInputSchema.type).toBe('object');
      expect(createInputSchema.properties!['id']).toBeUndefined();
      expect(createInputSchema.properties!['createdAt']).toBeUndefined();
      expect(createInputSchema.properties!['updatedAt']).toBeUndefined();
      expect(createInputSchema.properties!['name']).toBeDefined();
    });

    it('should make all fields optional in update input schema', () => {
      const schema = {
        _metadata: { name: 'EntityAPI' },
        models: {
          Entity: {
            config: {
              type: 'crud',
              fields: {
                id: { type: 'id', required: true, validations: [] },
                field1: { type: 'string', required: true, validations: [] },
                field2: { type: 'string', required: true, validations: [] },
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

      const generator = new OpenApiGenerator();
      const spec = generator.mapSchema(schema);

      const updateInputSchema = spec.components!.schemas!['UpdateEntityInput'];

      expect(updateInputSchema.type).toBe('object');
      expect(updateInputSchema.required).toBeUndefined(); // No required fields
      expect(updateInputSchema.properties!['field1']).toBeDefined();
      expect(updateInputSchema.properties!['field2']).toBeDefined();
    });
  });

  describe('field type mapping', () => {
    const createSchemaWithFields = (fields: Record<string, any>) => ({
      _metadata: { name: 'TestAPI' },
      models: {
        TestModel: {
          config: {
            type: 'crud',
            fields,
          },
          metadata: {
            isCrud: true,
            isEvent: false,
            isFunction: false,
          },
        },
      },
    });

    it('should map string fields correctly', () => {
      const schema = createSchemaWithFields({
        id: { type: 'id', required: true, validations: [] },
        name: {
          type: 'string',
          required: true,
          validations: [],
          minLength: 3,
          maxLength: 100,
        },
      });

      const generator = new OpenApiGenerator();
      const spec = generator.mapSchema(schema);

      const nameField = spec.components!.schemas!['TestModel'].properties!['name'];
      expect(nameField.type).toBe('string');
      expect(nameField.minLength).toBe(3);
      expect(nameField.maxLength).toBe(100);
    });

    it('should map number fields correctly', () => {
      const schema = createSchemaWithFields({
        id: { type: 'id', required: true, validations: [] },
        age: {
          type: 'number',
          required: true,
          validations: [],
          min: 0,
          max: 150,
          integer: true,
        },
      });

      const generator = new OpenApiGenerator();
      const spec = generator.mapSchema(schema);

      const ageField = spec.components!.schemas!['TestModel'].properties!['age'];
      expect(ageField.type).toBe('integer');
      expect(ageField.minimum).toBe(0);
      expect(ageField.maximum).toBe(150);
    });

    it('should map boolean fields correctly', () => {
      const schema = createSchemaWithFields({
        id: { type: 'id', required: true, validations: [] },
        active: { type: 'boolean', required: true, validations: [] },
      });

      const generator = new OpenApiGenerator();
      const spec = generator.mapSchema(schema);

      const activeField = spec.components!.schemas!['TestModel'].properties!['active'];
      expect(activeField.type).toBe('boolean');
    });

    it('should map enum fields correctly', () => {
      const schema = createSchemaWithFields({
        id: { type: 'id', required: true, validations: [] },
        status: {
          type: 'enum',
          required: true,
          validations: [],
          values: ['pending', 'active', 'archived'],
        },
      });

      const generator = new OpenApiGenerator();
      const spec = generator.mapSchema(schema);

      const statusField = spec.components!.schemas!['TestModel'].properties!['status'];
      expect(statusField.type).toBe('string');
      expect(statusField.enum).toEqual(['pending', 'active', 'archived']);
    });

    it('should map ref fields to UUID format', () => {
      const schema = createSchemaWithFields({
        id: { type: 'id', required: true, validations: [] },
        userId: { type: 'ref', required: true, validations: [], modelName: 'User' },
      });

      const generator = new OpenApiGenerator();
      const spec = generator.mapSchema(schema);

      const userIdField = spec.components!.schemas!['TestModel'].properties!['userId'];
      expect(userIdField.type).toBe('string');
      expect(userIdField.format).toBe('uuid');
    });
  });
});
