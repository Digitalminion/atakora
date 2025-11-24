/**
 * Function Model Builder Tests
 *
 * Comprehensive tests for function model creation, configuration, and validation.
 */

import { describe, it, expect } from 'vitest';
import { f, FunctionModelBuilder } from './function-model';
import { a } from './field-types';
import type { FunctionModelConfig } from './types';

// ============================================================================
// Basic Function Model Creation
// ============================================================================

describe('FunctionModelBuilder - Basic Creation', () => {
  it('should create a function model with input and output', () => {
    const GenerateReport = f.model({
      input: {
        datasetId: a.string().required(),
        format: a.enum(['pdf', 'excel']).default('pdf'),
      },
      output: {
        reportUrl: a.string().url().required(),
        status: a.enum(['generating', 'completed']).required(),
      },
    });

    expect(GenerateReport).toBeInstanceOf(FunctionModelBuilder);
    expect(GenerateReport._config.type).toBe('function');
    expect(GenerateReport._config.input).toBeDefined();
    expect(GenerateReport._config.output).toBeDefined();
  });

  it('should process input field configurations correctly', () => {
    const Calculate = f.model({
      input: {
        x: a.number().required(),
        y: a.number().required(),
        operation: a.enum(['+', '-', '*', '/']).required(),
      },
      output: {
        result: a.number().required(),
      },
    });

    const config = Calculate._build();

    expect(config.input.x.type).toBe('number');
    expect(config.input.x.required).toBe(true);
    expect(config.input.operation.type).toBe('enum');
    expect(config.input.operation.values).toEqual(['+', '-', '*', '/']);
  });

  it('should process output field configurations correctly', () => {
    const Validate = f.model({
      input: {
        data: a.string().required(),
      },
      output: {
        isValid: a.boolean().required(),
        errors: a.array(a.string()).default([]),
        warnings: a.array(a.string()).default([]),
      },
    });

    const config = Validate._build();

    expect(config.output.isValid.type).toBe('boolean');
    expect(config.output.errors.type).toBe('array');
    expect(config.output.errors.default).toEqual([]);
  });

  it('should handle functions with minimal input/output', () => {
    const Simple = f.model({
      input: {
        id: a.id(),
      },
      output: {
        success: a.boolean(),
      },
    });

    const config = Simple._build();
    expect(Object.keys(config.input)).toHaveLength(1);
    expect(Object.keys(config.output)).toHaveLength(1);
  });

  it('should handle functions with complex types', () => {
    const ProcessData = f.model({
      input: {
        datasetId: a.string().required(),
        options: a.object({
          sortBy: a.string(),
          limit: a.number().integer().min(1).max(1000),
        }),
        metadata: a.json(),
      },
      output: {
        processedRecords: a.number().integer().required(),
        resultUrl: a.string().url().required(),
        summary: a.json(),
      },
    });

    const config = ProcessData._build();

    expect(config.input.options.type).toBe('object');
    expect(config.input.metadata.type).toBe('json');
    expect(config.output.summary.type).toBe('json');
  });
});

// ============================================================================
// Authorization Configuration
// ============================================================================

describe('FunctionModelBuilder - Authorization', () => {
  it('should configure authenticated authorization', () => {
    const ProtectedFunction = f
      .model({
        input: { data: a.string() },
        output: { result: a.string() },
      })
      .authorization((allow) => [allow.authenticated()]);

    const config = ProtectedFunction._build();

    expect(config.authorization).toHaveLength(1);
    expect(config.authorization[0].type).toBe('authenticated');
  });

  it('should configure group-based authorization', () => {
    const AdminFunction = f
      .model({
        input: { action: a.string().required() },
        output: { success: a.boolean().required() },
      })
      .authorization((allow) => [allow.groups(['admin']).all()]);

    const config = AdminFunction._build();

    expect(config.authorization).toHaveLength(1);
    expect(config.authorization[0].type).toBe('groups');
    expect(config.authorization[0].groups).toEqual(['admin']);
  });

  it('should configure public authorization', () => {
    const PublicFunction = f
      .model({
        input: { query: a.string() },
        output: { results: a.array(a.string()) },
      })
      .authorization((allow) => [allow.public()]);

    const config = PublicFunction._build();

    expect(config.authorization).toHaveLength(1);
    expect(config.authorization[0].type).toBe('public');
  });

  it('should support multiple authorization rules', () => {
    const MultiAuthFunction = f
      .model({
        input: { data: a.string() },
        output: { result: a.string() },
      })
      .authorization((allow) => [allow.groups(['admin']).all(), allow.authenticated()]);

    const config = MultiAuthFunction._build();

    expect(config.authorization).toHaveLength(2);
    expect(config.authorization[0].type).toBe('groups');
    expect(config.authorization[1].type).toBe('authenticated');
  });

  it('should default to empty authorization rules', () => {
    const Function = f.model({
      input: { data: a.string() },
      output: { result: a.string() },
    });

    const config = Function._build();
    expect(config.authorization).toEqual([]);
  });
});

// ============================================================================
// Method Chaining
// ============================================================================

describe('FunctionModelBuilder - Method Chaining', () => {
  it('should support fluent API chaining', () => {
    const Function = f
      .model({
        input: { data: a.string().required() },
        output: { result: a.string().required() },
      })
      .authorization((allow) => [allow.authenticated()]);

    const config = Function._build();

    expect(config.authorization).toHaveLength(1);
  });

  it('should return same instance for chaining', () => {
    const initial = f.model({
      input: { data: a.string() },
      output: { result: a.string() },
    });

    const afterAuth = initial.authorization((allow) => [allow.authenticated()]);

    expect(afterAuth).toBe(initial);
  });
});

// ============================================================================
// Auto-Generation Specifications
// ============================================================================

describe('FunctionModelBuilder - Auto-Generation Specs', () => {
  it('should specify function type for code generation', () => {
    const Function = f.model({
      input: { data: a.string() },
      output: { result: a.string() },
    });

    const config = Function._build();
    expect(config.type).toBe('function');
  });

  it('should preserve all configuration for endpoint generation', () => {
    const Function = f
      .model({
        input: {
          userId: a.string().required(),
          action: a.string().required(),
        },
        output: {
          success: a.boolean().required(),
          message: a.string(),
        },
      })
      .authorization((allow) => [allow.authenticated()]);

    const config = Function._build();

    // Verify all configuration is preserved for code generation
    expect(config).toMatchObject({
      type: 'function',
      input: expect.any(Object),
      output: expect.any(Object),
      authorization: expect.any(Array),
    });
  });
});

// ============================================================================
// Complex Function Scenarios
// ============================================================================

describe('FunctionModelBuilder - Complex Scenarios', () => {
  it('should handle data export function', () => {
    const ExportData = f
      .model({
        input: {
          datasetId: a.string().required(),
          format: a.enum(['csv', 'json', 'excel', 'parquet']).required(),
          filters: a.json(),
          includeHeaders: a.boolean().default(true),
        },
        output: {
          exportId: a.id(),
          downloadUrl: a.string().url().required(),
          expiresAt: a.datetime().required(),
          rowCount: a.number().integer().min(0).required(),
          fileSize: a.number().integer().min(0).required(),
        },
      })
      .authorization((allow) => [allow.authenticated()]);

    const config = ExportData._build();

    expect(Object.keys(config.input)).toHaveLength(4);
    expect(Object.keys(config.output)).toHaveLength(5);
    expect(config.authorization).toHaveLength(1);
  });

  it('should handle image processing function', () => {
    const ProcessImage = f
      .model({
        input: {
          imageUrl: a.string().url().required(),
          operations: a.array(
            a.object({
              type: a.enum(['resize', 'crop', 'rotate', 'filter']).required(),
              params: a.json().required(),
            })
          ),
          format: a.enum(['jpg', 'png', 'webp']).default('jpg'),
          quality: a.number().min(1).max(100).default(85),
        },
        output: {
          processedUrl: a.string().url().required(),
          thumbnailUrl: a.string().url(),
          width: a.number().integer().min(1).required(),
          height: a.number().integer().min(1).required(),
          fileSize: a.number().integer().min(0).required(),
        },
      })
      .authorization((allow) => [allow.authenticated()]);

    const config = ProcessImage._build();

    expect(config.input.operations.type).toBe('array');
    expect(config.input.quality.default).toBe(85);
  });

  it('should handle AI/ML inference function', () => {
    const PredictSentiment = f
      .model({
        input: {
          text: a.string().required().minLength(1).maxLength(5000),
          language: a.enum(['en', 'es', 'fr', 'de']).default('en'),
          modelVersion: a.string().default('v1'),
        },
        output: {
          sentiment: a.enum(['positive', 'neutral', 'negative']).required(),
          confidence: a.number().min(0).max(1).required(),
          scores: a.object({
            positive: a.number().min(0).max(1).required(),
            neutral: a.number().min(0).max(1).required(),
            negative: a.number().min(0).max(1).required(),
          }),
        },
      })
      .authorization((allow) => [allow.authenticated()]);

    const config = PredictSentiment._build();

    expect(config.input.text.maxLength).toBe(5000);
    expect(config.output.scores.type).toBe('object');
  });

  it('should handle payment processing function', () => {
    const ProcessPayment = f
      .model({
        input: {
          orderId: a.string().required(),
          amount: a.number().min(0).required(),
          currency: a.string().required(),
          paymentMethod: a.enum(['card', 'bank', 'wallet']).required(),
          metadata: a.json(),
        },
        output: {
          transactionId: a.string().required(),
          status: a.enum(['pending', 'authorized', 'captured', 'failed']).required(),
          message: a.string(),
          processedAt: a.datetime().required(),
        },
      })
      .authorization((allow) => [allow.groups(['payment-processor']).all()]);

    const config = ProcessPayment._build();

    expect(config.authorization[0].groups).toEqual(['payment-processor']);
  });

  it('should handle batch processing function', () => {
    const ProcessBatch = f
      .model({
        input: {
          batchId: a.string().required(),
          records: a.array(a.json()).required(),
          options: a.object({
            parallelism: a.number().integer().min(1).max(100).default(10),
            timeout: a.number().integer().min(1000).default(60000),
          }),
        },
        output: {
          processedCount: a.number().integer().min(0).required(),
          failedCount: a.number().integer().min(0).required(),
          errors: a.array(
            a.object({
              recordIndex: a.number().integer().required(),
              error: a.string().required(),
            })
          ),
          duration: a.number().min(0).required(),
        },
      })
      .authorization((allow) => [allow.authenticated()]);

    const config = ProcessBatch._build();

    expect(config.input.records.type).toBe('array');
    expect(config.output.errors.type).toBe('array');
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('FunctionModelBuilder - Edge Cases', () => {
  it('should handle function with minimal fields', () => {
    const Minimal = f.model({
      input: { id: a.id() },
      output: { success: a.boolean() },
    });

    const config = Minimal._build();
    expect(Object.keys(config.input)).toHaveLength(1);
    expect(Object.keys(config.output)).toHaveLength(1);
  });

  it('should handle function with nested objects in input', () => {
    const Complex = f.model({
      input: {
        nested: a.object({
          field1: a.string(),
          field2: a.number(),
        }),
      },
      output: {
        result: a.string(),
      },
    });

    const config = Complex._build();
    expect(config.input.nested.type).toBe('object');
  });

  it('should handle function with nested objects in output', () => {
    const Complex = f.model({
      input: {
        data: a.string(),
      },
      output: {
        nested: a.object({
          field1: a.string(),
          field2: a.number(),
        }),
      },
    });

    const config = Complex._build();
    expect(config.output.nested.type).toBe('object');
  });

  it('should handle function with binary input', () => {
    const Upload = f.model({
      input: {
        file: a.binary().maxSize(10 * 1024 * 1024), // 10MB
      },
      output: {
        fileId: a.string().required(),
      },
    });

    const config = Upload._build();
    expect(config.input.file.type).toBe('binary');
    expect(config.input.file.maxSizeBytes).toBe(10 * 1024 * 1024);
  });

  it('should build independent configurations', () => {
    const Func1 = f
      .model({
        input: { data: a.string() },
        output: { result: a.string() },
      })
      .authorization((allow) => [allow.authenticated()]);

    const Func2 = f
      .model({
        input: { data: a.string() },
        output: { result: a.string() },
      })
      .authorization((allow) => [allow.public()]);

    const config1 = Func1._build();
    const config2 = Func2._build();

    expect(config1.authorization[0].type).toBe('authenticated');
    expect(config2.authorization[0].type).toBe('public');
  });

  it('should not mutate original configuration on build', () => {
    const Function = f
      .model({
        input: { data: a.string() },
        output: { result: a.string() },
      })
      .authorization((allow) => [allow.authenticated()]);

    const config1 = Function._build();
    const config2 = Function._build();

    expect(config1).not.toBe(config2);
    expect(config1).toEqual(config2);
  });
});

// ============================================================================
// Real-World Function Examples
// ============================================================================

describe('FunctionModelBuilder - Real-World Examples', () => {
  it('should model email sending function', () => {
    const SendEmail = f
      .model({
        input: {
          to: a.array(a.string().email()).required(),
          subject: a.string().required(),
          body: a.string().required(),
          attachments: a.array(a.string().url()).default([]),
        },
        output: {
          messageId: a.string().required(),
          status: a.enum(['sent', 'queued', 'failed']).required(),
          sentAt: a.datetime(),
        },
      })
      .authorization((allow) => [allow.authenticated()]);

    const config = SendEmail._build();
    expect(config.input.to.type).toBe('array');
  });

  it('should model search function', () => {
    const Search = f
      .model({
        input: {
          query: a.string().required().minLength(1).maxLength(200),
          filters: a.json(),
          limit: a.number().integer().min(1).max(100).default(10),
          offset: a.number().integer().min(0).default(0),
        },
        output: {
          results: a.array(a.json()).required(),
          totalCount: a.number().integer().min(0).required(),
          hasMore: a.boolean().required(),
        },
      })
      .authorization((allow) => [allow.authenticated()]);

    const config = Search._build();
    expect(config.input.limit.default).toBe(10);
  });

  it('should model webhook handler function', () => {
    const HandleWebhook = f
      .model({
        input: {
          event: a.string().required(),
          payload: a.json().required(),
          signature: a.string().required(),
          timestamp: a.datetime().required(),
        },
        output: {
          acknowledged: a.boolean().required(),
          processedAt: a.datetime().required(),
          errors: a.array(a.string()).default([]),
        },
      })
      .authorization((allow) => [allow.public()]);

    const config = HandleWebhook._build();
    expect(config.authorization[0].type).toBe('public');
  });
});

// ============================================================================
// Type Safety
// ============================================================================

describe('FunctionModelBuilder - Type Inference', () => {
  it('should infer correct config type', () => {
    const Function = f.model({
      input: { data: a.string() },
      output: { result: a.string() },
    });

    const config: FunctionModelConfig = Function._build();
    expect(config.type).toBe('function');
  });

  it('should expose readonly _config property', () => {
    const Function = f.model({
      input: { data: a.string() },
      output: { result: a.string() },
    });

    expect(Function._config).toBeDefined();
    expect(Function._config.type).toBe('function');
    expect(Function._config.input).toBeDefined();
    expect(Function._config.output).toBeDefined();
  });
});

// ============================================================================
// Function Model Factory
// ============================================================================

describe('f namespace - Function Model Factory', () => {
  it('should provide model factory method', () => {
    expect(f.model).toBeDefined();
    expect(typeof f.model).toBe('function');
  });

  it('should create FunctionModelBuilder instances', () => {
    const Function = f.model({
      input: { data: a.string() },
      output: { result: a.string() },
    });

    expect(Function).toBeInstanceOf(FunctionModelBuilder);
  });
});
