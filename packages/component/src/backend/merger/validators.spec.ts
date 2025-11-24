/**
 * Tests for Backend Merger Validators
 *
 * @remarks
 * Comprehensive test suite for configuration validation framework.
 * Tests cover:
 * - ConflictDetector (value, type, and incompatibility detection)
 * - ConfigValidator (schema-based validation)
 * - AzureValidators (Azure-specific naming and constraint validation)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ConflictDetector,
  ConfigValidator,
  AzureValidators,
  type ValidationResult,
  type ValidationContext,
  type ConfigSchema,
  type IncompatibilityRule,
} from './validators';
import type { MergeContext } from './strategies';

// ============================================================================
// Test Fixtures
// ============================================================================

function createMergeContext(path: string, sources: string[], priorities?: number[]): MergeContext {
  return {
    path,
    sources,
    priorities: priorities ?? sources.map(() => 10),
    metadata: {},
  };
}

function createValidationContext(
  path: string,
  source: string,
  fullConfig?: Record<string, unknown>
): ValidationContext {
  return {
    path,
    source,
    fullConfig,
    metadata: {},
  };
}

// ============================================================================
// ConflictDetector Tests - Value Conflicts
// ============================================================================

describe('ConflictDetector - detectConflicts', () => {
  let detector: ConflictDetector;

  beforeEach(() => {
    detector = new ConflictDetector();
  });

  it('should detect value conflicts with different priorities', () => {
    const values = ['development', 'production', 'staging'];
    const context = createMergeContext(
      'config.environment',
      ['source1', 'source2', 'source3'],
      [10, 20, 15]
    );

    const conflicts = detector.detectConflicts(values, context);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].path).toBe('config.environment');
    expect(conflicts[0].conflictType).toBe('value');
    expect(conflicts[0].resolvable).toBe(true);
    expect(conflicts[0].suggestedStrategy).toBe('priority');
  });

  it('should detect unresolvable conflicts with same priority', () => {
    const values = ['valueA', 'valueB', 'valueC'];
    const context = createMergeContext(
      'config.setting',
      ['source1', 'source2', 'source3'],
      [20, 20, 20] // All same priority
    );

    const conflicts = detector.detectConflicts(values, context);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].resolvable).toBe(false);
    expect(conflicts[0].suggestedStrategy).toBe('manual-resolution');
    expect(conflicts[0].reason).toContain('same priority');
  });

  it('should not detect conflict when all values are identical', () => {
    const values = ['same', 'same', 'same'];
    const context = createMergeContext(
      'config.setting',
      ['source1', 'source2', 'source3'],
      [20, 20, 20]
    );

    const conflicts = detector.detectConflicts(values, context);

    expect(conflicts).toHaveLength(0);
  });

  it('should handle single value without conflict', () => {
    const values = ['single'];
    const context = createMergeContext('config.setting', ['source1'], [10]);

    const conflicts = detector.detectConflicts(values, context);

    expect(conflicts).toHaveLength(0);
  });

  it('should handle empty values', () => {
    const values: string[] = [];
    const context = createMergeContext('config.setting', [], []);

    const conflicts = detector.detectConflicts(values, context);

    expect(conflicts).toHaveLength(0);
  });

  it('should detect conflicts in complex objects', () => {
    const values = [
      { sku: 'basic', tier: 'B1' },
      { sku: 'premium', tier: 'P1' },
    ];
    const context = createMergeContext('config.appServicePlan', ['source1', 'source2'], [10, 20]);

    const conflicts = detector.detectConflicts(values, context);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].values).toHaveLength(2);
  });

  it('should skip undefined values', () => {
    const values = ['valueA', undefined, 'valueB'];
    const context = createMergeContext(
      'config.setting',
      ['source1', 'source2', 'source3'],
      [10, 20, 30]
    );

    const conflicts = detector.detectConflicts(values as any, context);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].values).toHaveLength(2); // Only valueA and valueB
  });
});

// ============================================================================
// ConflictDetector Tests - Type Conflicts
// ============================================================================

describe('ConflictDetector - detectTypeConflicts', () => {
  let detector: ConflictDetector;

  beforeEach(() => {
    detector = new ConflictDetector();
  });

  it('should detect type conflicts between different types', () => {
    const values = ['string', 123, true];
    const context = createMergeContext('config.value', ['source1', 'source2', 'source3']);

    const conflicts = detector.detectTypeConflicts(values, context);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].conflictType).toBe('type');
    expect(conflicts[0].resolvable).toBe(false);
    expect(conflicts[0].reason).toContain('Incompatible types');
  });

  it('should detect array vs object type conflict', () => {
    const values = [[], {}];
    const context = createMergeContext('config.value', ['source1', 'source2']);

    const conflicts = detector.detectTypeConflicts(values, context);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].reason).toContain('array');
    expect(conflicts[0].reason).toContain('object');
  });

  it('should detect null as separate type', () => {
    const values = [null, 'string'];
    const context = createMergeContext('config.value', ['source1', 'source2']);

    const conflicts = detector.detectTypeConflicts(values, context);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].reason).toContain('null');
  });

  it('should not detect conflict for same types', () => {
    const values = ['stringA', 'stringB', 'stringC'];
    const context = createMergeContext('config.value', ['source1', 'source2', 'source3']);

    const conflicts = detector.detectTypeConflicts(values, context);

    expect(conflicts).toHaveLength(0);
  });

  it('should handle single value without conflict', () => {
    const values = ['single'];
    const context = createMergeContext('config.value', ['source1']);

    const conflicts = detector.detectTypeConflicts(values, context);

    expect(conflicts).toHaveLength(0);
  });

  it('should handle empty values', () => {
    const values: unknown[] = [];
    const context = createMergeContext('config.value', []);

    const conflicts = detector.detectTypeConflicts(values, context);

    expect(conflicts).toHaveLength(0);
  });

  it('should skip undefined values when checking types', () => {
    const values = ['string', undefined, 'another string'];
    const context = createMergeContext('config.value', ['source1', 'source2', 'source3']);

    const conflicts = detector.detectTypeConflicts(values, context);

    expect(conflicts).toHaveLength(0); // All non-undefined values are strings
  });
});

// ============================================================================
// ConflictDetector Tests - Incompatibilities
// ============================================================================

describe('ConflictDetector - detectIncompatibilities', () => {
  let detector: ConflictDetector;

  beforeEach(() => {
    detector = new ConflictDetector();
  });

  it('should detect incompatible feature combinations', () => {
    const config = {
      features: {
        serverless: true,
        alwaysOn: true, // Incompatible with serverless
      },
    };

    const rules: IncompatibilityRule[] = [
      {
        path: 'features',
        conflictingPaths: ['features.serverless', 'features.alwaysOn'],
        condition: (cfg) => {
          const features = cfg.features as any;
          return features?.serverless === true && features?.alwaysOn === true;
        },
        reason: 'Serverless mode is incompatible with AlwaysOn',
        suggestion: 'Disable AlwaysOn when using Serverless',
      },
    ];

    const conflicts = detector.detectIncompatibilities(config, rules);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].conflictType).toBe('incompatible');
    expect(conflicts[0].resolvable).toBe(false);
    expect(conflicts[0].reason).toContain('incompatible with AlwaysOn');
  });

  it('should not detect incompatibility when condition is false', () => {
    const config = {
      features: {
        serverless: false,
        alwaysOn: true,
      },
    };

    const rules: IncompatibilityRule[] = [
      {
        path: 'features',
        conflictingPaths: ['features.serverless', 'features.alwaysOn'],
        condition: (cfg) => {
          const features = cfg.features as any;
          return features?.serverless === true && features?.alwaysOn === true;
        },
        reason: 'Serverless mode is incompatible with AlwaysOn',
      },
    ];

    const conflicts = detector.detectIncompatibilities(config, rules);

    expect(conflicts).toHaveLength(0);
  });

  it('should handle multiple incompatibility rules', () => {
    const config = {
      tier: 'free',
      features: {
        customDomain: true,
        ssl: true,
      },
    };

    const rules: IncompatibilityRule[] = [
      {
        path: 'tier',
        conflictingPaths: ['tier', 'features.customDomain'],
        condition: (cfg) => cfg.tier === 'free' && (cfg.features as any)?.customDomain,
        reason: 'Custom domains not available in free tier',
      },
      {
        path: 'tier',
        conflictingPaths: ['tier', 'features.ssl'],
        condition: (cfg) => cfg.tier === 'free' && (cfg.features as any)?.ssl,
        reason: 'SSL not available in free tier',
      },
    ];

    const conflicts = detector.detectIncompatibilities(config, rules);

    expect(conflicts).toHaveLength(2);
  });

  it('should handle nested path values', () => {
    const config = {
      database: {
        type: 'cosmos',
        tier: 'serverless',
        minThroughput: 4000, // Not allowed in serverless
      },
    };

    const rules: IncompatibilityRule[] = [
      {
        path: 'database',
        conflictingPaths: ['database.tier', 'database.minThroughput'],
        condition: (cfg) => {
          const db = cfg.database as any;
          return db?.tier === 'serverless' && db?.minThroughput > 0;
        },
        reason: 'Serverless mode does not support min throughput',
      },
    ];

    const conflicts = detector.detectIncompatibilities(config, rules);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].values).toHaveLength(2);
  });

  it('should handle empty config', () => {
    const config = {};
    const rules: IncompatibilityRule[] = [];

    const conflicts = detector.detectIncompatibilities(config, rules);

    expect(conflicts).toHaveLength(0);
  });
});

// ============================================================================
// ConfigValidator Tests - Schema Validation
// ============================================================================

describe('ConfigValidator - validateAgainstSchema', () => {
  let validator: ConfigValidator;

  beforeEach(() => {
    validator = new ConfigValidator();
  });

  it('should validate required fields', () => {
    const schema: ConfigSchema<string> = {
      type: 'string',
      required: true,
    };
    const context = createValidationContext('config.name', 'source1');

    const result = validator.validateAgainstSchema(undefined, schema, context);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors![0].code).toBe('REQUIRED_FIELD_MISSING');
  });

  it('should allow undefined for non-required fields', () => {
    const schema: ConfigSchema<string> = {
      type: 'string',
      required: false,
    };
    const context = createValidationContext('config.name', 'source1');

    const result = validator.validateAgainstSchema(undefined, schema, context);

    expect(result.valid).toBe(true);
  });

  it('should validate type mismatches', () => {
    const schema: ConfigSchema<string> = {
      type: 'string',
    };
    const context = createValidationContext('config.name', 'source1');

    const result = validator.validateAgainstSchema(123 as any, schema, context);

    expect(result.valid).toBe(false);
    expect(result.errors![0].code).toBe('TYPE_MISMATCH');
    expect(result.errors![0].actualValue).toBe(123);
  });

  it('should validate enum values', () => {
    const schema: ConfigSchema<string> = {
      type: 'enum',
      enum: ['development', 'staging', 'production'],
    };
    const context = createValidationContext('config.environment', 'source1');

    const invalidResult = validator.validateAgainstSchema('invalid', schema, context);
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.errors![0].code).toBe('INVALID_ENUM_VALUE');

    const validResult = validator.validateAgainstSchema('production', schema, context);
    expect(validResult.valid).toBe(true);
  });

  it('should validate array items recursively', () => {
    const schema: ConfigSchema<number[]> = {
      type: 'array',
      items: {
        type: 'number',
      },
    };
    const context = createValidationContext('config.numbers', 'source1');

    const result = validator.validateAgainstSchema([1, 2, 'three'] as any, schema, context);

    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.some((e) => e.path.includes('[2]'))).toBe(true);
  });

  it('should validate object properties recursively', () => {
    const schema: ConfigSchema<Record<string, unknown>> = {
      type: 'object',
      properties: {
        name: { type: 'string', required: true },
        age: { type: 'number' },
      },
    };
    const context = createValidationContext('config.user', 'source1');

    const result = validator.validateAgainstSchema(
      { name: 'Alice', age: 'thirty' } as any,
      schema,
      context
    );

    expect(result.valid).toBe(false);
    expect(result.errors!.some((e) => e.path === 'config.user.age')).toBe(true);
  });

  it('should run custom validators', () => {
    const schema: ConfigSchema<number> = {
      type: 'number',
      validators: [
        (value: number, ctx: ValidationContext) => {
          if (value < 0) {
            return {
              valid: false,
              errors: [
                {
                  message: 'Value must be positive',
                  path: ctx.path,
                  source: ctx.source,
                  code: 'NEGATIVE_VALUE',
                },
              ],
            };
          }
          return { valid: true };
        },
      ],
    };
    const context = createValidationContext('config.count', 'source1');

    const result = validator.validateAgainstSchema(-5, schema, context);

    expect(result.valid).toBe(false);
    expect(result.errors![0].code).toBe('NEGATIVE_VALUE');
  });

  it('should collect warnings from validators', () => {
    const schema: ConfigSchema<number> = {
      type: 'number',
      validators: [
        (value: number) => ({
          valid: true,
          warnings: ['Value is within range but consider using a higher value'],
        }),
      ],
    };
    const context = createValidationContext('config.memory', 'source1');

    const result = validator.validateAgainstSchema(256, schema, context);

    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(1);
  });

  it('should handle null values', () => {
    const schema: ConfigSchema<string> = {
      type: 'string',
      required: true,
    };
    const context = createValidationContext('config.name', 'source1');

    const result = validator.validateAgainstSchema(null as any, schema, context);

    expect(result.valid).toBe(false);
    expect(result.errors![0].code).toBe('REQUIRED_FIELD_MISSING');
  });
});

// ============================================================================
// ConfigValidator Tests - Full Config Validation
// ============================================================================

describe('ConfigValidator - validate', () => {
  let validator: ConfigValidator;

  beforeEach(() => {
    validator = new ConfigValidator();
  });

  it('should validate against registered schemas', () => {
    validator.registerSchema('name', {
      type: 'string',
      required: true,
    });
    validator.registerSchema('age', {
      type: 'number',
    });

    const config = { name: 'Alice', age: 30 };
    const context = createValidationContext('config', 'source1', config);

    const result = validator.validate(config, context);

    expect(result.valid).toBe(true);
  });

  it('should collect errors from multiple schemas', () => {
    validator.registerSchema('name', {
      type: 'string',
      required: true,
    });
    validator.registerSchema('age', {
      type: 'number',
      required: true,
    });

    const config = { name: 'Alice' }; // Missing age
    const context = createValidationContext('config', 'source1', config);

    const result = validator.validate(config, context);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
  });

  it('should run custom validators', () => {
    validator.registerValidator('age', (value: unknown, ctx: ValidationContext) => {
      if (typeof value === 'number' && value < 0) {
        return {
          valid: false,
          errors: [
            {
              message: 'Age cannot be negative',
              path: ctx.path,
              source: ctx.source,
            },
          ],
        };
      }
      return { valid: true };
    });

    const config = { age: -5 };
    const context = createValidationContext('config', 'source1', config);

    const result = validator.validate(config, context);

    expect(result.valid).toBe(false);
    expect(result.errors![0].message).toContain('negative');
  });

  it('should handle nested paths in config', () => {
    validator.registerSchema('database.connectionString', {
      type: 'string',
      required: true,
    });

    const config = { database: { connectionString: 'mongodb://localhost' } };
    const context = createValidationContext('config', 'source1', config);

    const result = validator.validate(config, context);

    expect(result.valid).toBe(true);
  });

  it('should handle missing nested paths', () => {
    validator.registerSchema('database.connectionString', {
      type: 'string',
      required: true,
    });

    const config = { database: {} };
    const context = createValidationContext('config', 'source1', config);

    const result = validator.validate(config, context);

    expect(result.valid).toBe(false);
  });
});

// ============================================================================
// AzureValidators Tests - Resource Name
// ============================================================================

describe('AzureValidators - resourceName', () => {
  it('should validate valid resource names', () => {
    const validator = AzureValidators.resourceName();
    const context = createValidationContext('config.name', 'source1');

    const validNames = [
      'my-resource',
      'my_resource',
      'my.resource',
      'MyResource123',
      'a',
      'a' + 'b'.repeat(258) + 'c', // 260 chars
    ];

    for (const name of validNames) {
      const result = validator(name, context);
      expect(result.valid).toBe(true);
    }
  });

  it('should reject invalid resource names', () => {
    const validator = AzureValidators.resourceName();
    const context = createValidationContext('config.name', 'source1');

    const invalidNames = [
      '', // Empty
      '-starts-with-hyphen',
      'ends-with-hyphen-',
      '_starts-with-underscore',
      'ends-with-underscore_',
      '.starts-with-period',
      'ends-with-period.',
      'has spaces',
      'has!special@chars',
      'a' + 'b'.repeat(259) + 'c', // 261 chars (too long)
    ];

    for (const name of invalidNames) {
      const result = validator(name, context);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    }
  });

  it('should support custom length constraints', () => {
    const validator = AzureValidators.resourceName(3, 24);
    const context = createValidationContext('config.name', 'source1');

    const tooShort = validator('ab', context);
    expect(tooShort.valid).toBe(false);
    expect(tooShort.errors![0].code).toBe('INVALID_LENGTH');

    const tooLong = validator('a' + 'b'.repeat(23), context); // 24 chars is ok, 25 is too long
    expect(tooLong.valid).toBe(true); // This is 24 chars, valid

    const wayTooLong = validator('a' + 'b'.repeat(24), context); // 25 chars
    expect(wayTooLong.valid).toBe(false);

    const justRight = validator('abc', context);
    expect(justRight.valid).toBe(true);
  });
});

// ============================================================================
// AzureValidators Tests - Storage Account Name
// ============================================================================

describe('AzureValidators - storageAccountName', () => {
  it('should validate valid storage account names', () => {
    const validator = AzureValidators.storageAccountName();
    const context = createValidationContext('config.storageAccount', 'source1');

    const validNames = [
      'abc',
      'mystorageaccount',
      'storage123',
      'abc' + '1'.repeat(18) + 'xyz', // 24 chars
    ];

    for (const name of validNames) {
      const result = validator(name, context);
      expect(result.valid).toBe(true);
    }
  });

  it('should reject invalid storage account names', () => {
    const validator = AzureValidators.storageAccountName();
    const context = createValidationContext('config.storageAccount', 'source1');

    const testCases = [
      { name: 'ab', shouldFail: true, reason: 'Too short' },
      { name: 'a' + 'b'.repeat(24), shouldFail: true, reason: '26 chars (too long)' },
      { name: 'MyStorage', shouldFail: true, reason: 'Uppercase' },
      { name: 'my-storage', shouldFail: true, reason: 'Hyphen' },
      { name: 'my_storage', shouldFail: true, reason: 'Underscore' },
      { name: 'my.storage', shouldFail: true, reason: 'Period' },
      { name: 'my storage', shouldFail: true, reason: 'Space' },
      { name: 'storage!', shouldFail: true, reason: 'Special char' },
    ];

    for (const testCase of testCases) {
      const result = validator(testCase.name, context);
      expect(result.valid).toBe(false, `${testCase.reason}: "${testCase.name}" should be invalid`);
      expect(result.errors).toBeDefined();
    }
  });
});

// ============================================================================
// AzureValidators Tests - Number Range
// ============================================================================

describe('AzureValidators - numberRange', () => {
  it('should validate numbers within range', () => {
    const validator = AzureValidators.numberRange(1, 100);
    const context = createValidationContext('config.value', 'source1');

    const validValues = [1, 50, 100];

    for (const value of validValues) {
      const result = validator(value, context);
      expect(result.valid).toBe(true);
    }
  });

  it('should reject numbers outside range', () => {
    const validator = AzureValidators.numberRange(1, 100);
    const context = createValidationContext('config.value', 'source1');

    const tooLow = validator(0, context);
    expect(tooLow.valid).toBe(false);
    expect(tooLow.errors![0].code).toBe('OUT_OF_RANGE');

    const tooHigh = validator(101, context);
    expect(tooHigh.valid).toBe(false);
    expect(tooHigh.errors![0].code).toBe('OUT_OF_RANGE');
  });

  it('should handle negative ranges', () => {
    const validator = AzureValidators.numberRange(-100, -1);
    const context = createValidationContext('config.value', 'source1');

    expect(validator(-50, context).valid).toBe(true);
    expect(validator(0, context).valid).toBe(false);
  });
});

// ============================================================================
// AzureValidators Tests - Array Length
// ============================================================================

describe('AzureValidators - arrayLength', () => {
  it('should validate arrays within length constraints', () => {
    const validator = AzureValidators.arrayLength(1, 5);
    const context = createValidationContext('config.items', 'source1');

    const validArrays = [[1], [1, 2, 3], [1, 2, 3, 4, 5]];

    for (const arr of validArrays) {
      const result = validator(arr, context);
      expect(result.valid).toBe(true);
    }
  });

  it('should reject arrays outside length constraints', () => {
    const validator = AzureValidators.arrayLength(1, 5);
    const context = createValidationContext('config.items', 'source1');

    const tooShort = validator([], context);
    expect(tooShort.valid).toBe(false);
    expect(tooShort.errors![0].code).toBe('INVALID_LENGTH');

    const tooLong = validator([1, 2, 3, 4, 5, 6], context);
    expect(tooLong.valid).toBe(false);
  });
});

// ============================================================================
// AzureValidators Tests - Pattern
// ============================================================================

describe('AzureValidators - pattern', () => {
  it('should validate strings matching pattern', () => {
    const validator = AzureValidators.pattern(/^[A-Z]{3}-\d{4}$/, 'Format: XXX-0000');
    const context = createValidationContext('config.code', 'source1');

    const valid = validator('ABC-1234', context);
    expect(valid.valid).toBe(true);
  });

  it('should reject strings not matching pattern', () => {
    const validator = AzureValidators.pattern(/^[A-Z]{3}-\d{4}$/, 'Format: XXX-0000');
    const context = createValidationContext('config.code', 'source1');

    const invalidValues = [
      'abc-1234', // Lowercase
      'AB-1234', // Too short
      'ABCD-1234', // Too long
      'ABC-123', // Missing digit
      'ABC1234', // Missing hyphen
    ];

    for (const value of invalidValues) {
      const result = validator(value, context);
      expect(result.valid).toBe(false);
      expect(result.errors![0].code).toBe('INVALID_PATTERN');
    }
  });

  it('should include description in error message', () => {
    const validator = AzureValidators.pattern(/^\d{3}$/, 'Three digit code');
    const context = createValidationContext('config.code', 'source1');

    const result = validator('12', context);

    expect(result.valid).toBe(false);
    expect(result.errors![0].expected).toContain('Three digit code');
  });
});
