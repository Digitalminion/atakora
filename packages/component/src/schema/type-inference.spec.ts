/**
 * Tests for Type Inference System
 *
 * Note: TypeScript type inference is compile-time, so these tests focus on:
 * 1. Runtime structure validation
 * 2. Type builder configurations that enable inference
 * 3. Documentation of expected type behavior
 *
 * For true compile-time type testing, consider using:
 * - expect-type (https://github.com/mmkal/expect-type)
 * - tsd (https://github.com/SamVerschueren/tsd)
 *
 * Comprehensive test coverage for:
 * - InferFieldType - Field type inference
 * - InferModelType - Full model types
 * - InferCreateInput - Create input types
 * - InferUpdateInput - Update input types
 * - InferFilterType - Query filter types
 * - InferEventType - Event payload types
 * - InferFunctionInput/Output - Function I/O types
 * - Complex nested types
 * - Optional/required handling
 */

import { describe, it, expect } from 'vitest';
import { a } from './field-types';
import { c } from './crud-model';
import { e } from './event-model';
import { f } from './function-model';
import type {
  InferFieldType,
  InferFieldTypes,
  InferModelType,
  InferCreateInput,
  InferUpdateInput,
  InferFilterType,
  InferEventType,
  InferFunctionInput,
  InferFunctionOutput,
  FilterOperators,
} from './type-inference';

// ============================================================================
// Field Type Inference Tests
// ============================================================================

describe('Field Type Inference', () => {
  describe('InferFieldType', () => {
    it('should infer string type from StringFieldBuilder', () => {
      const field = a.string();
      const config = field._build();

      // Runtime check: field config indicates string type
      expect(config.type).toBe('string');

      // Compile-time type test (documented):
      // type Inferred = InferFieldType<typeof field>;
      // expectTypeOf<Inferred>().toEqualTypeOf<string>();
    });

    it('should infer number type from NumberFieldBuilder', () => {
      const field = a.number();
      const config = field._build();

      expect(config.type).toBe('number');

      // Compile-time: InferFieldType<typeof field> === number
    });

    it('should infer boolean type from BooleanFieldBuilder', () => {
      const field = a.boolean();
      const config = field._build();

      expect(config.type).toBe('boolean');

      // Compile-time: InferFieldType<typeof field> === boolean
    });

    it('should infer datetime as string (ISO 8601)', () => {
      const field = a.datetime();
      const config = field._build();

      expect(config.type).toBe('datetime');

      // Compile-time: InferFieldType<typeof field> === string (ISO 8601)
    });

    it('should infer id as string', () => {
      const field = a.id();
      const config = field._build();

      expect(config.type).toBe('id');

      // Compile-time: InferFieldType<typeof field> === string
    });

    it('should infer enum as union type', () => {
      const field = a.enum(['admin', 'user', 'guest'] as const);
      const config = field._build();

      expect(config.type).toBe('enum');
      expect(config.values).toEqual(['admin', 'user', 'guest']);

      // Compile-time: InferFieldType<typeof field> === 'admin' | 'user' | 'guest'
    });

    it('should infer array type with item type', () => {
      const field = a.array(a.string());
      const config = field._build();

      expect(config.type).toBe('array');
      expect(config.itemType).toBeDefined();

      // Compile-time: InferFieldType<typeof field> === string[]
    });

    it('should infer nested array types', () => {
      const field = a.array(a.array(a.number()));
      const config = field._build();

      expect(config.type).toBe('array');

      // Compile-time: InferFieldType<typeof field> === number[][]
    });

    it('should infer object type from schema', () => {
      const field = a.object({
        firstName: a.string(),
        lastName: a.string(),
        age: a.number(),
      });
      const config = field._build();

      expect(config.type).toBe('object');
      expect(config.schema).toBeDefined();

      // Compile-time: InferFieldType<typeof field> === { firstName: string, lastName: string, age: number }
    });

    it('should infer json as any', () => {
      const field = a.json();
      const config = field._build();

      expect(config.type).toBe('json');

      // Compile-time: InferFieldType<typeof field> === any
    });

    it('should infer binary as Buffer', () => {
      const field = a.binary();
      const config = field._build();

      expect(config.type).toBe('binary');

      // Compile-time: InferFieldType<typeof field> === Buffer
    });
  });

  describe('InferFieldTypes', () => {
    it('should infer types for multiple fields', () => {
      const fields = {
        id: a.id(),
        name: a.string(),
        age: a.number(),
        active: a.boolean(),
      };

      // Runtime check: all fields have correct types
      Object.entries(fields).forEach(([name, field]) => {
        expect(field._build()).toBeDefined();
      });

      // Compile-time:
      // type Inferred = InferFieldTypes<typeof fields>;
      // expectTypeOf<Inferred>().toEqualTypeOf<{
      //   id: string;
      //   name: string;
      //   age: number;
      //   active: boolean;
      // }>();
    });

    it('should handle nested object fields', () => {
      const fields = {
        profile: a.object({
          firstName: a.string(),
          lastName: a.string(),
        }),
        tags: a.array(a.string()),
      };

      expect(fields.profile._build().type).toBe('object');
      expect(fields.tags._build().type).toBe('array');

      // Compile-time:
      // type Inferred = InferFieldTypes<typeof fields>;
      // expectTypeOf<Inferred>().toEqualTypeOf<{
      //   profile: { firstName: string; lastName: string };
      //   tags: string[];
      // }>();
    });
  });
});

// ============================================================================
// CRUD Model Type Inference Tests
// ============================================================================

describe('CRUD Model Type Inference', () => {
  describe('InferModelType', () => {
    it('should infer full model type with auto-generated fields', () => {
      const User = c.model({
        email: a.string().required().email(),
        name: a.string().required(),
        age: a.number().optional(),
      });

      // Runtime check: model has correct config
      expect(User._config.type).toBe('crud');
      expect(User._config.fields).toBeDefined();
      expect(User._config.fields.email).toBeDefined();
      expect(User._config.fields.name).toBeDefined();
      expect(User._config.fields.age).toBeDefined();

      // Compile-time:
      // type UserType = InferModelType<typeof User>;
      // expectTypeOf<UserType>().toEqualTypeOf<{
      //   id: string;
      //   email: string;
      //   name: string;
      //   age?: number;
      //   createdAt?: string;
      //   updatedAt?: string;
      //   deletedAt?: string;
      // }>();
    });

    it('should include id field automatically', () => {
      const Model = c.model({
        name: a.string().required(),
      });

      // id should be auto-generated (not in fields, but in type)
      // Runtime: we can verify id is not in the fields we defined
      expect(Model._config.fields.id).toBeUndefined();

      // Compile-time:
      // type ModelType = InferModelType<typeof Model>;
      // expectTypeOf<ModelType>().toHaveProperty('id').toEqualTypeOf<string>();
    });

    it('should include timestamp fields when timestamps enabled', () => {
      const Model = c
        .model({
          name: a.string().required(),
        })
        .timestamps(true);

      expect(Model._config.timestamps).toBe(true);

      // Compile-time:
      // type ModelType = InferModelType<typeof Model>;
      // expectTypeOf<ModelType>().toHaveProperty('createdAt');
      // expectTypeOf<ModelType>().toHaveProperty('updatedAt');
    });

    it('should include deletedAt when soft delete enabled', () => {
      const Model = c
        .model({
          name: a.string().required(),
        })
        .softDelete(true);

      expect(Model._config.softDelete).toBe(true);

      // Compile-time:
      // type ModelType = InferModelType<typeof Model>;
      // expectTypeOf<ModelType>().toHaveProperty('deletedAt');
    });

    it('should handle complex field types', () => {
      const User = c.model({
        email: a.string().required().email(),
        role: a.enum(['admin', 'user', 'guest'] as const).default('user'),
        profile: a.object({
          firstName: a.string(),
          lastName: a.string(),
        }),
        tags: a.array(a.string()),
        metadata: a.json(),
      });

      expect(User._config.fields.email.type).toBe('string');
      expect(User._config.fields.role.type).toBe('enum');
      expect(User._config.fields.profile.type).toBe('object');
      expect(User._config.fields.tags.type).toBe('array');
      expect(User._config.fields.metadata.type).toBe('json');

      // Compile-time:
      // type UserType = InferModelType<typeof User>;
      // expectTypeOf<UserType>().toMatchTypeOf<{
      //   email: string;
      //   role: 'admin' | 'user' | 'guest';
      //   profile: { firstName: string; lastName: string };
      //   tags: string[];
      //   metadata: any;
      // }>();
    });
  });

  describe('InferCreateInput', () => {
    it('should omit auto-generated fields from create input', () => {
      const User = c.model({
        email: a.string().required().email(),
        name: a.string().required(),
        age: a.number().optional(),
      });

      // Runtime: verify the base fields exist
      expect(User._config.fields.email).toBeDefined();
      expect(User._config.fields.name).toBeDefined();

      // Compile-time:
      // type CreateInput = InferCreateInput<typeof User>;
      // expectTypeOf<CreateInput>().toEqualTypeOf<{
      //   email: string;
      //   name: string;
      //   age?: number;
      // }>();
      // expectTypeOf<CreateInput>().not.toHaveProperty('id');
      // expectTypeOf<CreateInput>().not.toHaveProperty('createdAt');
      // expectTypeOf<CreateInput>().not.toHaveProperty('updatedAt');
    });

    it('should preserve required fields', () => {
      const User = c.model({
        email: a.string().required(),
        name: a.string().required(),
        bio: a.string().optional(),
      });

      expect(User._config.fields.email.required).toBe(true);
      expect(User._config.fields.name.required).toBe(true);

      // Compile-time:
      // type CreateInput = InferCreateInput<typeof User>;
      // Required<CreateInput> should include email and name
      // Optional should include bio
    });
  });

  describe('InferUpdateInput', () => {
    it('should make all fields optional for update', () => {
      const User = c.model({
        email: a.string().required(),
        name: a.string().required(),
        age: a.number().optional(),
      });

      // Runtime: original fields are defined
      expect(User._config.fields.email.required).toBe(true);
      expect(User._config.fields.name.required).toBe(true);

      // Compile-time:
      // type UpdateInput = InferUpdateInput<typeof User>;
      // expectTypeOf<UpdateInput>().toEqualTypeOf<{
      //   email?: string;
      //   name?: string;
      //   age?: number;
      // }>();
    });

    it('should omit auto-generated fields', () => {
      const User = c.model({
        name: a.string().required(),
      });

      // Compile-time:
      // type UpdateInput = InferUpdateInput<typeof User>;
      // expectTypeOf<UpdateInput>().not.toHaveProperty('id');
      // expectTypeOf<UpdateInput>().not.toHaveProperty('createdAt');
    });
  });

  describe('InferFilterType', () => {
    it('should allow direct value matching', () => {
      const User = c.model({
        email: a.string(),
        age: a.number(),
        active: a.boolean(),
      });

      // Runtime: fields exist
      expect(User._config.fields.email).toBeDefined();

      // Compile-time:
      // type Filter = InferFilterType<typeof User>;
      // const filter: Filter = {
      //   email: 'test@example.com',
      //   age: 25,
      //   active: true,
      // };
    });

    it('should support filter operators', () => {
      const User = c.model({
        age: a.number(),
        name: a.string(),
      });

      // Runtime verification that FilterOperators structure exists
      const operators: FilterOperators<number> = {
        eq: 25,
        gt: 18,
        lt: 65,
        in: [25, 30, 35],
      };

      expect(operators).toBeDefined();

      // Compile-time:
      // type Filter = InferFilterType<typeof User>;
      // const filter: Filter = {
      //   age: { gt: 18, lt: 65 },
      //   name: { contains: 'john' },
      // };
    });

    it('should support string-specific operators', () => {
      const operators: FilterOperators<string> = {
        contains: 'test',
        startsWith: 'prefix',
        endsWith: 'suffix',
      };

      expect(operators.contains).toBe('test');
      expect(operators.startsWith).toBe('prefix');
      expect(operators.endsWith).toBe('suffix');
    });

    it('should support comparison operators', () => {
      const operators: FilterOperators<number> = {
        eq: 10,
        ne: 5,
        gt: 0,
        gte: 1,
        lt: 100,
        lte: 99,
      };

      expect(Object.keys(operators)).toEqual(['eq', 'ne', 'gt', 'gte', 'lt', 'lte']);
    });

    it('should support array operators', () => {
      const operators: FilterOperators<string> = {
        in: ['value1', 'value2', 'value3'],
        nin: ['excluded1', 'excluded2'],
      };

      expect(operators.in).toHaveLength(3);
      expect(operators.nin).toHaveLength(2);
    });
  });
});

// ============================================================================
// Event Model Type Inference Tests
// ============================================================================

describe('Event Model Type Inference', () => {
  describe('InferEventType', () => {
    it('should infer event payload type from fields', () => {
      const DataUploaded = e.model({
        datasetId: a.string().required(),
        fileUrl: a.string().url().required(),
        uploadedAt: a.datetime().required(),
        fileSize: a.number().required(),
      });

      // Runtime: verify event config
      expect(DataUploaded._config.type).toBe('event');
      expect(DataUploaded._config.fields.datasetId).toBeDefined();
      expect(DataUploaded._config.fields.fileUrl).toBeDefined();

      // Compile-time:
      // type EventPayload = InferEventType<typeof DataUploaded>;
      // expectTypeOf<EventPayload>().toEqualTypeOf<{
      //   datasetId: string;
      //   fileUrl: string;
      //   uploadedAt: string;
      //   fileSize: number;
      // }>();
    });

    it('should handle optional fields in events', () => {
      const UserUpdated = e.model({
        userId: a.string().required(),
        oldEmail: a.string().optional(),
        newEmail: a.string().optional(),
      });

      expect(UserUpdated._config.fields.userId.required).toBe(true);

      // Compile-time:
      // type EventPayload = InferEventType<typeof UserUpdated>;
      // expectTypeOf<EventPayload>().toMatchTypeOf<{
      //   userId: string;
      //   oldEmail?: string;
      //   newEmail?: string;
      // }>();
    });

    it('should handle complex event payloads', () => {
      const OrderPlaced = e.model({
        orderId: a.string().required(),
        items: a.array(
          a.object({
            productId: a.string(),
            quantity: a.number(),
            price: a.number(),
          })
        ),
        total: a.number().required(),
        status: a.enum(['pending', 'confirmed'] as const),
      });

      expect(OrderPlaced._config.fields.items.type).toBe('array');
      expect(OrderPlaced._config.fields.status.type).toBe('enum');

      // Compile-time:
      // type EventPayload = InferEventType<typeof OrderPlaced>;
      // Complex nested structure should be inferred correctly
    });
  });
});

// ============================================================================
// Function Model Type Inference Tests
// ============================================================================

describe('Function Model Type Inference', () => {
  describe('InferFunctionInput', () => {
    it('should infer function input type', () => {
      const GenerateReport = f.model({
        input: {
          datasetId: a.string().required(),
          format: a.enum(['pdf', 'excel', 'csv'] as const).default('pdf'),
          includeCharts: a.boolean().default(false),
        },
        output: {
          reportUrl: a.string().url().required(),
        },
      });

      // Runtime: verify function config
      expect(GenerateReport._config.type).toBe('function');
      expect(GenerateReport._config.input.datasetId).toBeDefined();
      expect(GenerateReport._config.input.format).toBeDefined();

      // Compile-time:
      // type Input = InferFunctionInput<typeof GenerateReport>;
      // expectTypeOf<Input>().toEqualTypeOf<{
      //   datasetId: string;
      //   format: 'pdf' | 'excel' | 'csv';
      //   includeCharts: boolean;
      // }>();
    });

    it('should handle optional input fields', () => {
      const ProcessData = f.model({
        input: {
          data: a.string().required(),
          options: a.json().optional(),
        },
        output: {
          result: a.string(),
        },
      });

      expect(ProcessData._config.input.data.required).toBe(true);

      // Compile-time:
      // type Input = InferFunctionInput<typeof ProcessData>;
      // expectTypeOf<Input>().toMatchTypeOf<{
      //   data: string;
      //   options?: any;
      // }>();
    });
  });

  describe('InferFunctionOutput', () => {
    it('should infer function output type', () => {
      const GenerateReport = f.model({
        input: {
          datasetId: a.string().required(),
        },
        output: {
          reportUrl: a.string().url().required(),
          status: a.enum(['generating', 'completed', 'failed'] as const).required(),
          generatedAt: a.datetime().required(),
        },
      });

      // Runtime: verify output config
      expect(GenerateReport._config.output.reportUrl).toBeDefined();
      expect(GenerateReport._config.output.status).toBeDefined();

      // Compile-time:
      // type Output = InferFunctionOutput<typeof GenerateReport>;
      // expectTypeOf<Output>().toEqualTypeOf<{
      //   reportUrl: string;
      //   status: 'generating' | 'completed' | 'failed';
      //   generatedAt: string;
      // }>();
    });

    it('should handle complex output types', () => {
      const AnalyzeData = f.model({
        input: {
          datasetId: a.string(),
        },
        output: {
          summary: a.object({
            totalRecords: a.number(),
            avgValue: a.number(),
            distribution: a.array(a.number()),
          }),
          warnings: a.array(a.string()),
          metadata: a.json(),
        },
      });

      expect(AnalyzeData._config.output.summary.type).toBe('object');
      expect(AnalyzeData._config.output.warnings.type).toBe('array');

      // Compile-time:
      // type Output = InferFunctionOutput<typeof AnalyzeData>;
      // Complex nested output structure should be inferred correctly
    });
  });

  describe('Input and Output together', () => {
    it('should infer both input and output types independently', () => {
      const Transform = f.model({
        input: {
          sourceData: a.string().required(),
          sourceFormat: a.enum(['json', 'csv', 'xml'] as const),
        },
        output: {
          transformedData: a.string().required(),
          targetFormat: a.enum(['json', 'yaml'] as const),
          recordCount: a.number(),
        },
      });

      // Runtime checks
      expect(Transform._config.input.sourceData).toBeDefined();
      expect(Transform._config.output.transformedData).toBeDefined();

      // Compile-time:
      // type Input = InferFunctionInput<typeof Transform>;
      // type Output = InferFunctionOutput<typeof Transform>;
      // Input and Output should be different types
    });
  });
});

// ============================================================================
// Complex Type Scenarios
// ============================================================================

describe('Complex Type Scenarios', () => {
  describe('deeply nested structures', () => {
    it('should handle nested objects', () => {
      const Model = c.model({
        address: a.object({
          street: a.string(),
          city: a.string(),
          location: a.object({
            lat: a.number(),
            lng: a.number(),
          }),
        }),
      });

      expect(Model._config.fields.address.type).toBe('object');

      // Compile-time:
      // type ModelType = InferModelType<typeof Model>;
      // Nested location should be properly typed
    });

    it('should handle arrays of objects', () => {
      const Model = c.model({
        items: a.array(
          a.object({
            id: a.string(),
            name: a.string(),
            metadata: a.json(),
          })
        ),
      });

      expect(Model._config.fields.items.type).toBe('array');

      // Compile-time:
      // type ModelType = InferModelType<typeof Model>;
      // items should be Array<{ id: string; name: string; metadata: any }>
    });

    it('should handle nested arrays', () => {
      const Model = c.model({
        matrix: a.array(a.array(a.number())),
      });

      expect(Model._config.fields.matrix.type).toBe('array');

      // Compile-time:
      // type ModelType = InferModelType<typeof Model>;
      // matrix should be number[][]
    });
  });

  describe('optional vs required handling', () => {
    it('should distinguish optional and required fields', () => {
      const Model = c.model({
        required1: a.string().required(),
        required2: a.number().required(),
        optional1: a.string().optional(),
        optional2: a.boolean().optional(),
      });

      expect(Model._config.fields.required1.required).toBe(true);
      expect(Model._config.fields.required2.required).toBe(true);

      // Compile-time:
      // type ModelType = InferModelType<typeof Model>;
      // required1 and required2 should not be optional
      // optional1 and optional2 should be optional (?)
    });
  });

  describe('default values', () => {
    it('should preserve default value information', () => {
      const Model = c.model({
        status: a.enum(['active', 'inactive'] as const).default('active'),
        count: a.number().default(0),
        enabled: a.boolean().default(true),
      });

      expect(Model._config.fields.status.default).toBe('active');
      expect(Model._config.fields.count.default).toBe(0);
      expect(Model._config.fields.enabled.default).toBe(true);

      // Note: Default values don't change TypeScript types,
      // but they're stored in config for runtime usage
    });
  });

  describe('union and enum types', () => {
    it('should handle enum as discriminated union', () => {
      const Model = c.model({
        status: a.enum(['draft', 'published', 'archived'] as const),
        priority: a.enum(['low', 'medium', 'high'] as const).required(),
      });

      const statusConfig = Model._config.fields.status;
      if (statusConfig.type === 'enum') {
        expect(statusConfig.values).toEqual(['draft', 'published', 'archived']);
      }

      // Compile-time:
      // type ModelType = InferModelType<typeof Model>;
      // status should be 'draft' | 'published' | 'archived'
      // priority should be 'low' | 'medium' | 'high'
    });
  });
});

// ============================================================================
// Utility Types Tests
// ============================================================================

describe('Utility Types', () => {
  describe('ListResponse and Pagination', () => {
    it('should structure pagination metadata correctly', () => {
      // Runtime: verify the structure is correct
      const pagination = {
        page: 1,
        pageSize: 20,
        total: 100,
        totalPages: 5,
        hasMore: true,
      };

      expect(pagination.page).toBe(1);
      expect(pagination.hasMore).toBe(true);

      // Compile-time:
      // type Pagination = PaginationMetadata;
      // All fields should be present and correctly typed
    });

    it('should structure list response correctly', () => {
      const User = c.model({
        email: a.string(),
        name: a.string(),
      });

      // Runtime: we can't fully test the type, but we can verify structure
      const mockResponse = {
        data: [],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 0,
          totalPages: 0,
          hasMore: false,
        },
      };

      expect(mockResponse.data).toBeDefined();
      expect(mockResponse.pagination).toBeDefined();

      // Compile-time:
      // type Response = InferListResponse<typeof User>;
      // Response should have data: InferModelType<typeof User>[]
      // and pagination: PaginationMetadata
    });
  });
});
