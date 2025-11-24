/**
 * Field Validation Tests
 *
 * Tests for validation of field configurations including conflicting modifiers,
 * readonly/computed fields, and other field-level validation rules.
 */

import { describe, it, expect, vi } from 'vitest';
import { a } from './field-types';

// ============================================================================
// Conflicting Modifier Tests
// ============================================================================

describe('Field Validation - Conflicting Modifiers', () => {
  it('should use last call wins when field is required then optional', () => {
    const field = a.string().required().optional()._build();
    expect(field.required).toBe(false);
    expect(field.isRequired).toBe(false);
    expect(field.isOptional).toBe(true);
  });

  it('should use last call wins when field is optional then required', () => {
    const field = a.string().optional().required()._build();
    expect(field.required).toBe(true);
    expect(field.isRequired).toBe(true);
    expect(field.isOptional).toBe(false);
  });

  it('should warn when field is both required and nullable', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    a.string().required().nullable()._build();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Field is marked as both required and nullable')
    );

    consoleSpy.mockRestore();
  });

  it('should allow field to be optional and nullable', () => {
    expect(() => {
      a.string().optional().nullable()._build();
    }).not.toThrow();
  });
});

// ============================================================================
// ReadOnly Field Tests
// ============================================================================

describe('Field Validation - ReadOnly Fields', () => {
  it('should mark field as readonly', () => {
    const field = a.string().readOnly()._build();
    expect(field.isReadOnly).toBe(true);
  });

  it('should allow readonly with required', () => {
    const field = a.string().required().readOnly()._build();
    expect(field.isReadOnly).toBe(true);
    expect(field.isRequired).toBe(true);
  });

  it('should allow readonly with default value', () => {
    const field = a.string().default('test').readOnly()._build();
    expect(field.isReadOnly).toBe(true);
    expect(field.defaultValue).toBe('test');
  });

  it('should work with various field types', () => {
    const idField = a.id().readOnly()._build();
    const dateField = a.datetime().readOnly()._build();
    const numberField = a.number().readOnly()._build();

    expect(idField.isReadOnly).toBe(true);
    expect(dateField.isReadOnly).toBe(true);
    expect(numberField.isReadOnly).toBe(true);
  });
});

// ============================================================================
// Computed Field Tests
// ============================================================================

describe('Field Validation - Computed Fields', () => {
  it('should mark field as computed and readonly', () => {
    const field = a
      .string()
      .computed(() => 'computed value')
      ._build();
    expect(field.isComputed).toBe(true);
    expect(field.isReadOnly).toBe(true);
  });

  it('should store compute function', () => {
    const computeFn = () => 'test';
    const field = a.string().computed(computeFn)._build();
    expect(field.computeFn).toBe(computeFn);
  });

  it('should throw error when computed field has default value', () => {
    expect(() => {
      a.string()
        .default('test')
        .computed(() => 'computed')
        ._build();
    }).toThrow('Computed fields cannot have default values');
  });

  it('should throw error when default is set after computed', () => {
    expect(() => {
      a.string()
        .computed(() => 'computed')
        .default('test')
        ._build();
    }).toThrow('Computed fields cannot have default values');
  });

  it('should work with different field types', () => {
    const stringField = a
      .string()
      .computed(() => 'value')
      ._build();
    const numberField = a
      .number()
      .computed(() => 42)
      ._build();
    const boolField = a
      .boolean()
      .computed(() => true)
      ._build();

    expect(stringField.isComputed).toBe(true);
    expect(numberField.isComputed).toBe(true);
    expect(boolField.isComputed).toBe(true);
  });

  it('should allow computed fields to be optional', () => {
    const field = a
      .string()
      .optional()
      .computed(() => 'value')
      ._build();
    expect(field.isComputed).toBe(true);
    expect(field.isOptional).toBe(true);
  });
});

// ============================================================================
// Ref Field Validation Tests
// ============================================================================

describe('Field Validation - Reference Fields', () => {
  it('should validate ref field has model name', () => {
    expect(() => {
      a.ref('')._build();
    }).toThrow('Reference field must specify a valid model name');
  });

  it('should validate ref field with whitespace model name', () => {
    expect(() => {
      a.ref('  ')._build();
    }).toThrow('Reference field must specify a valid model name');
  });

  it('should auto-add nullable when set_null onDelete is used', () => {
    // onDelete('set_null') should automatically add nullable
    const field = a.ref('User').onDelete('set_null')._build();
    expect(field.isNullable).toBe(true);
  });

  it('should auto-add nullable when set_null is used', () => {
    const field = a.ref('User').onDelete('set_null')._build();
    expect(field.isNullable).toBe(true);
  });

  it('should throw error when required with set_null onDelete', () => {
    expect(() => {
      a.ref('User').required().onDelete('set_null')._build();
    }).toThrow("Reference field cannot be both required and have onDelete('set_null')");
  });

  it('should allow cascade onDelete with required', () => {
    const field = a.ref('User').required().onDelete('cascade')._build();
    expect(field.onDelete).toBe('cascade');
    expect(field.isRequired).toBe(true);
  });

  it('should allow restrict onDelete with required', () => {
    const field = a.ref('User').required().onDelete('restrict')._build();
    expect(field.onDelete).toBe('restrict');
    expect(field.isRequired).toBe(true);
  });
});

// ============================================================================
// Field Type Specific Validation
// ============================================================================

describe('Field Validation - Type Specific', () => {
  it('should validate string field constraints', () => {
    const field = a
      .string()
      .minLength(5)
      .maxLength(10)
      .pattern(/^[A-Z]/)
      ._build();

    expect(field.validations).toContainEqual(
      expect.objectContaining({ type: 'minLength', value: 5 })
    );
    expect(field.validations).toContainEqual(
      expect.objectContaining({ type: 'maxLength', value: 10 })
    );
  });

  it('should validate number field constraints', () => {
    const field = a.number().min(0).max(100).integer()._build();

    expect(field.validations).toContainEqual(expect.objectContaining({ type: 'min', value: 0 }));
    expect(field.validations).toContainEqual(expect.objectContaining({ type: 'max', value: 100 }));
    expect(field.validations).toContainEqual(expect.objectContaining({ type: 'integer' }));
  });

  it('should validate enum field values', () => {
    const field = a.enum(['active', 'inactive', 'pending'] as const)._build();
    expect(field.values).toEqual(['active', 'inactive', 'pending']);
  });

  it('should validate array field with item type', () => {
    const field = a.array(a.string().required())._build();
    expect(field.type).toBe('array');
    expect(field.itemType).toBeDefined();
  });

  it('should validate binary field size constraint', () => {
    const field = a
      .binary()
      .maxSize(1024 * 1024)
      ._build(); // 1MB
    expect(field.maxSizeBytes).toBe(1024 * 1024);
  });
});

// ============================================================================
// Complex Field Validation Scenarios
// ============================================================================

describe('Field Validation - Complex Scenarios', () => {
  it('should validate nested object fields', () => {
    const field = a
      .object({
        name: a.string().required(),
        age: a.number().min(0).max(120),
        address: a.object({
          street: a.string().required(),
          city: a.string().required(),
          zipCode: a.string().pattern(/^\d{5}$/),
        }),
      })
      ._build();

    expect(field.type).toBe('object');
    expect(field.schema).toBeDefined();
  });

  it('should validate array of objects', () => {
    const field = a
      .array(
        a.object({
          id: a.id(),
          name: a.string().required(),
          value: a.number().min(0),
        })
      )
      ._build();

    expect(field.type).toBe('array');
    expect(field.itemType).toBeDefined();
  });

  it('should handle multiple validation rules', () => {
    const field = a
      .string()
      .required()
      .minLength(5)
      .maxLength(50)
      .email()
      .custom((value) => !value.includes('spam'), 'No spam allowed')
      ._build();

    expect(field.validations.length).toBeGreaterThan(4);
    expect(field.isRequired).toBe(true);
  });

  it('should handle field with all modifiers', () => {
    const field = a
      .string()
      .required()
      .readOnly()
      .default('default')
      .minLength(1)
      .maxLength(100)
      ._build();

    expect(field.isRequired).toBe(true);
    expect(field.isReadOnly).toBe(true);
    expect(field.defaultValue).toBe('default');
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Field Validation - Edge Cases', () => {
  it('should handle empty validation array', () => {
    const field = a.string()._build();
    expect(field.validations).toEqual([]);
  });

  it('should handle multiple calls to same modifier', () => {
    const field = a
      .string()
      .minLength(5)
      .minLength(10) // Second call should override
      ._build();

    const minLengthRules = field.validations.filter((v: any) => v.type === 'minLength');
    expect(minLengthRules).toHaveLength(2); // Both are added
  });

  it('should handle readonly after computed', () => {
    const field = a
      .string()
      .computed(() => 'value')
      .readOnly() // Redundant but should not error
      ._build();

    expect(field.isComputed).toBe(true);
    expect(field.isReadOnly).toBe(true);
  });

  it('should validate custom validator function', () => {
    const validator = (value: string) => value.length > 0;
    const field = a.string().custom(validator, 'Must not be empty')._build();

    const customRule = field.validations.find((v: any) => v.type === 'custom');
    expect(customRule).toBeDefined();
    expect(customRule?.validator).toBe(validator);
    expect(customRule?.message).toBe('Must not be empty');
  });
});
