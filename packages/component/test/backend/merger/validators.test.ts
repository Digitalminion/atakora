/**
 * Unit tests for configuration validators.
 */

import { describe, it, expect } from 'vitest';
import {
  ConflictDetector,
  ConfigValidator,
  AzureValidators,
  type MergeContext,
  type ConfigSchema,
  type ValidationContext,
  type IncompatibilityRule
} from '../../../src/backend/merger/validators';

describe('Configuration Validators', () => {
  describe('ConflictDetector', () => {
    const detector = new ConflictDetector();

    describe('detectConflicts', () => {
      it('should detect value conflicts', () => {
        const context: MergeContext = {
          path: 'config.setting',
          sources: ['A', 'B'],
          priorities: [10, 10]
        };

        const conflicts = detector.detectConflicts(['value1', 'value2'], context);

        expect(conflicts).toHaveLength(1);
        expect(conflicts[0].conflictType).toBe('value');
        expect(conflicts[0].path).toBe('config.setting');
        expect(conflicts[0].values).toHaveLength(2);
      });

      it('should not detect conflict when values are identical', () => {
        const context: MergeContext = {
          path: 'config.setting',
          sources: ['A', 'B'],
          priorities: [10, 10]
        };

        const conflicts = detector.detectConflicts(['same-value', 'same-value'], context);

        expect(conflicts).toHaveLength(0);
      });

      it('should mark conflict as resolvable when priorities differ', () => {
        const context: MergeContext = {
          path: 'config.setting',
          sources: ['A', 'B'],
          priorities: [10, 20]
        };

        const conflicts = detector.detectConflicts(['value1', 'value2'], context);

        expect(conflicts[0].resolvable).toBe(true);
        expect(conflicts[0].suggestedStrategy).toBe('priority');
      });

      it('should mark conflict as unresolvable when priorities are same', () => {
        const context: MergeContext = {
          path: 'config.setting',
          sources: ['A', 'B'],
          priorities: [10, 10]
        };

        const conflicts = detector.detectConflicts(['value1', 'value2'], context);

        expect(conflicts[0].resolvable).toBe(false);
        expect(conflicts[0].suggestedStrategy).toBe('manual-resolution');
      });

      it('should handle undefined values', () => {
        const context: MergeContext = {
          path: 'config.optional',
          sources: ['A', 'B', 'C'],
          priorities: [10, 10, 10]
        };

        const conflicts = detector.detectConflicts(['value1', undefined, 'value1'], context);

        expect(conflicts).toHaveLength(0);
      });

      it('should handle single value', () => {
        const context: MergeContext = {
          path: 'config.setting',
          sources: ['A'],
          priorities: [10]
        };

        const conflicts = detector.detectConflicts(['value1'], context);

        expect(conflicts).toHaveLength(0);
      });
    });

    describe('detectTypeConflicts', () => {
      it('should detect type mismatches', () => {
        const context: MergeContext = {
          path: 'config.value',
          sources: ['A', 'B'],
          priorities: [10, 10]
        };

        const conflicts = detector.detectTypeConflicts(['string-value', 123], context);

        expect(conflicts).toHaveLength(1);
        expect(conflicts[0].conflictType).toBe('type');
        expect(conflicts[0].resolvable).toBe(false);
      });

      it('should distinguish arrays from objects', () => {
        const context: MergeContext = {
          path: 'config.data',
          sources: ['A', 'B'],
          priorities: [10, 10]
        };

        const conflicts = detector.detectTypeConflicts([['array'], { key: 'object' }], context);

        expect(conflicts).toHaveLength(1);
        expect(conflicts[0].reason).toContain('array');
        expect(conflicts[0].reason).toContain('object');
      });

      it('should not conflict on same types', () => {
        const context: MergeContext = {
          path: 'config.numbers',
          sources: ['A', 'B'],
          priorities: [10, 10]
        };

        const conflicts = detector.detectTypeConflicts([123, 456], context);

        expect(conflicts).toHaveLength(0);
      });

      it('should handle null values', () => {
        const context: MergeContext = {
          path: 'config.nullable',
          sources: ['A', 'B'],
          priorities: [10, 10]
        };

        const conflicts = detector.detectTypeConflicts([null, 'value'], context);

        expect(conflicts).toHaveLength(1);
        expect(conflicts[0].reason).toContain('null');
      });

      it('should ignore undefined values', () => {
        const context: MergeContext = {
          path: 'config.optional',
          sources: ['A', 'B'],
          priorities: [10, 10]
        };

        const conflicts = detector.detectTypeConflicts([undefined, 'value'], context);

        expect(conflicts).toHaveLength(0);
      });
    });

    describe('detectIncompatibilities', () => {
      it('should detect incompatible feature combinations', () => {
        const rule: IncompatibilityRule = {
          path: 'config',
          conflictingPaths: ['config.serverless', 'config.reservedCapacity'],
          condition: (config) => {
            return config.serverless === true && config.reservedCapacity === true;
          },
          reason: 'Cannot use serverless mode with reserved capacity',
          suggestion: 'Choose either serverless or reserved capacity, not both'
        };

        const config = {
          serverless: true,
          reservedCapacity: true
        };

        const conflicts = detector.detectIncompatibilities(config, [rule]);

        expect(conflicts).toHaveLength(1);
        expect(conflicts[0].conflictType).toBe('incompatible');
        expect(conflicts[0].resolvable).toBe(false);
        expect(conflicts[0].reason).toContain('serverless');
      });

      it('should not detect when condition is false', () => {
        const rule: IncompatibilityRule = {
          path: 'config',
          conflictingPaths: ['config.a', 'config.b'],
          condition: (config) => config.a === true && config.b === true,
          reason: 'Incompatible'
        };

        const config = { a: true, b: false };

        const conflicts = detector.detectIncompatibilities(config, [rule]);

        expect(conflicts).toHaveLength(0);
      });

      it('should check multiple rules', () => {
        const rules: IncompatibilityRule[] = [
          {
            path: 'config.feature1',
            conflictingPaths: ['config.feature1', 'config.feature2'],
            condition: (config) => config.feature1 && config.feature2,
            reason: 'Features 1 and 2 are incompatible'
          },
          {
            path: 'config.feature3',
            conflictingPaths: ['config.feature3', 'config.feature4'],
            condition: (config) => config.feature3 && config.feature4,
            reason: 'Features 3 and 4 are incompatible'
          }
        ];

        const config = {
          feature1: true,
          feature2: true,
          feature3: true,
          feature4: true
        };

        const conflicts = detector.detectIncompatibilities(config, rules);

        expect(conflicts).toHaveLength(2);
      });
    });
  });

  describe('ConfigValidator', () => {
    describe('validateAgainstSchema', () => {
      const validator = new ConfigValidator();

      it('should validate required fields', () => {
        const schema: ConfigSchema = {
          type: 'string',
          required: true
        };

        const context: ValidationContext = {
          path: 'config.name',
          source: 'TestComponent'
        };

        const result = validator.validateAgainstSchema(undefined, schema, context);

        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors![0].code).toBe('REQUIRED_FIELD_MISSING');
      });

      it('should validate type matching', () => {
        const schema: ConfigSchema<string> = {
          type: 'string'
        };

        const context: ValidationContext = {
          path: 'config.name',
          source: 'TestComponent'
        };

        const result = validator.validateAgainstSchema(123 as any, schema, context);

        expect(result.valid).toBe(false);
        expect(result.errors![0].code).toBe('TYPE_MISMATCH');
      });

      it('should validate enum values', () => {
        const schema: ConfigSchema = {
          type: 'enum',
          enum: ['value1', 'value2', 'value3']
        };

        const context: ValidationContext = {
          path: 'config.option',
          source: 'TestComponent'
        };

        const invalidResult = validator.validateAgainstSchema('invalid', schema, context);
        expect(invalidResult.valid).toBe(false);
        expect(invalidResult.errors![0].code).toBe('INVALID_ENUM_VALUE');

        const validResult = validator.validateAgainstSchema('value2', schema, context);
        expect(validResult.valid).toBe(true);
      });

      it('should validate array items', () => {
        const schema: ConfigSchema = {
          type: 'array',
          items: {
            type: 'number'
          }
        };

        const context: ValidationContext = {
          path: 'config.numbers',
          source: 'TestComponent'
        };

        const result = validator.validateAgainstSchema([1, 2, 'three', 4], schema, context);

        expect(result.valid).toBe(false);
        expect(result.errors).toBeDefined();
      });

      it('should validate object properties', () => {
        const schema: ConfigSchema = {
          type: 'object',
          properties: {
            name: { type: 'string', required: true },
            age: { type: 'number' }
          }
        };

        const context: ValidationContext = {
          path: 'config.person',
          source: 'TestComponent'
        };

        const invalidResult = validator.validateAgainstSchema(
          { age: 30 },
          schema,
          context
        );
        expect(invalidResult.valid).toBe(false);

        const validResult = validator.validateAgainstSchema(
          { name: 'John', age: 30 },
          schema,
          context
        );
        expect(validResult.valid).toBe(true);
      });

      it('should run custom validators', () => {
        const customValidator = (value: string, ctx: ValidationContext) => {
          if (value.length < 3) {
            return {
              valid: false,
              errors: [{
                message: 'Value too short',
                path: ctx.path,
                code: 'TOO_SHORT'
              }]
            };
          }
          return { valid: true };
        };

        const schema: ConfigSchema<string> = {
          type: 'string',
          validators: [customValidator]
        };

        const context: ValidationContext = {
          path: 'config.code',
          source: 'TestComponent'
        };

        const result = validator.validateAgainstSchema('ab', schema, context);

        expect(result.valid).toBe(false);
        expect(result.errors![0].code).toBe('TOO_SHORT');
      });

      it('should skip validation for optional undefined values', () => {
        const schema: ConfigSchema = {
          type: 'string',
          required: false
        };

        const context: ValidationContext = {
          path: 'config.optional',
          source: 'TestComponent'
        };

        const result = validator.validateAgainstSchema(undefined, schema, context);

        expect(result.valid).toBe(true);
      });
    });

    describe('registerSchema and validate', () => {
      it('should validate full configuration against registered schemas', () => {
        const validator = new ConfigValidator();

        validator.registerSchema('name', {
          type: 'string',
          required: true
        });

        validator.registerSchema('age', {
          type: 'number',
          required: false
        });

        const context: ValidationContext = {
          path: 'config',
          source: 'TestComponent'
        };

        const invalidConfig = { age: 30 };
        const invalidResult = validator.validate(invalidConfig, context);
        expect(invalidResult.valid).toBe(false);

        const validConfig = { name: 'John', age: 30 };
        const validResult = validator.validate(validConfig, context);
        expect(validResult.valid).toBe(true);
      });

      it('should validate nested properties', () => {
        const validator = new ConfigValidator();

        validator.registerSchema('database.name', {
          type: 'string',
          required: true
        });

        const context: ValidationContext = {
          path: 'config',
          source: 'TestComponent'
        };

        const config = {
          database: {
            name: 'mydb'
          }
        };

        const result = validator.validate(config, context);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('AzureValidators', () => {
    describe('resourceName', () => {
      it('should validate length constraints', () => {
        const validator = AzureValidators.resourceName(3, 24);
        const context: ValidationContext = {
          path: 'config.name',
          source: 'TestComponent'
        };

        const tooShort = validator('ab', context);
        expect(tooShort.valid).toBe(false);
        expect(tooShort.errors![0].code).toBe('INVALID_LENGTH');

        const tooLong = validator('a'.repeat(25), context);
        expect(tooLong.valid).toBe(false);

        const valid = validator('valid-name', context);
        expect(valid.valid).toBe(true);
      });

      it('should validate pattern constraints', () => {
        const validator = AzureValidators.resourceName();
        const context: ValidationContext = {
          path: 'config.name',
          source: 'TestComponent'
        };

        const startsWithSpecial = validator('-invalid', context);
        expect(startsWithSpecial.valid).toBe(false);
        expect(startsWithSpecial.errors![0].code).toBe('INVALID_PATTERN');

        const endsWithSpecial = validator('invalid-', context);
        expect(endsWithSpecial.valid).toBe(false);

        const invalidChars = validator('invalid@name', context);
        expect(invalidChars.valid).toBe(false);

        const valid = validator('valid-resource_name.123', context);
        expect(valid.valid).toBe(true);
      });
    });

    describe('storageAccountName', () => {
      it('should validate storage account constraints', () => {
        const validator = AzureValidators.storageAccountName();
        const context: ValidationContext = {
          path: 'config.accountName',
          source: 'TestComponent'
        };

        const tooShort = validator('ab', context);
        expect(tooShort.valid).toBe(false);

        const tooLong = validator('a'.repeat(25), context);
        expect(tooLong.valid).toBe(false);

        const uppercase = validator('InvalidName', context);
        expect(uppercase.valid).toBe(false);

        const specialChars = validator('invalid-name', context);
        expect(specialChars.valid).toBe(false);

        const valid = validator('validname123', context);
        expect(valid.valid).toBe(true);
      });
    });

    describe('numberRange', () => {
      it('should validate number ranges', () => {
        const validator = AzureValidators.numberRange(10, 100);
        const context: ValidationContext = {
          path: 'config.value',
          source: 'TestComponent'
        };

        const tooLow = validator(5, context);
        expect(tooLow.valid).toBe(false);
        expect(tooLow.errors![0].code).toBe('OUT_OF_RANGE');

        const tooHigh = validator(150, context);
        expect(tooHigh.valid).toBe(false);

        const valid = validator(50, context);
        expect(valid.valid).toBe(true);

        const edgeLow = validator(10, context);
        expect(edgeLow.valid).toBe(true);

        const edgeHigh = validator(100, context);
        expect(edgeHigh.valid).toBe(true);
      });
    });

    describe('arrayLength', () => {
      it('should validate array length', () => {
        const validator = AzureValidators.arrayLength(1, 5);
        const context: ValidationContext = {
          path: 'config.items',
          source: 'TestComponent'
        };

        const tooShort = validator([], context);
        expect(tooShort.valid).toBe(false);

        const tooLong = validator([1, 2, 3, 4, 5, 6], context);
        expect(tooLong.valid).toBe(false);

        const valid = validator([1, 2, 3], context);
        expect(valid.valid).toBe(true);
      });
    });

    describe('pattern', () => {
      it('should validate regex patterns', () => {
        const validator = AzureValidators.pattern(/^[A-Z]{3}-\d{3}$/, 'Format: XXX-999');
        const context: ValidationContext = {
          path: 'config.code',
          source: 'TestComponent'
        };

        const invalid = validator('invalid', context);
        expect(invalid.valid).toBe(false);
        expect(invalid.errors![0].code).toBe('INVALID_PATTERN');

        const valid = validator('ABC-123', context);
        expect(valid.valid).toBe(true);
      });
    });
  });
});
