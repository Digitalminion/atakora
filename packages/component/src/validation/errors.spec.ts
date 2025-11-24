/**
 * Tests for validation error types and utilities
 */

import { describe, it, expect } from 'vitest';
import {
  ValidationError,
  createFieldError,
  formatPath,
  mapZodErrorType,
  type FieldError,
  type ValidationErrorType,
} from './errors';

describe('FieldError interface', () => {
  it('should have correct structure', () => {
    const error: FieldError = {
      field: 'email',
      message: 'Invalid email format',
      type: 'format',
    };

    expect(error.field).toBe('email');
    expect(error.message).toBe('Invalid email format');
    expect(error.type).toBe('format');
  });

  it('should support optional context', () => {
    const error: FieldError = {
      field: 'age',
      message: 'Must be at least 18',
      type: 'min',
      context: { min: 18, actual: 15 },
    };

    expect(error.context).toEqual({ min: 18, actual: 15 });
  });

  it('should support nested field paths', () => {
    const error: FieldError = {
      field: 'user.address.city',
      message: 'City is required',
      type: 'required',
    };

    expect(error.field).toBe('user.address.city');
  });

  it('should support array field paths', () => {
    const error: FieldError = {
      field: 'items[0].name',
      message: 'Name is required',
      type: 'required',
    };

    expect(error.field).toBe('items[0].name');
  });
});

describe('ValidationError class', () => {
  describe('constructor', () => {
    it('should create error with single field error', () => {
      const errors: FieldError[] = [{ field: 'email', message: 'Invalid email', type: 'format' }];
      const error = new ValidationError(errors);

      expect(error.errors).toEqual(errors);
      expect(error.message).toBe('Validation failed: 1 error(s)');
      expect(error.name).toBe('ValidationError');
    });

    it('should create error with multiple field errors', () => {
      const errors: FieldError[] = [
        { field: 'email', message: 'Invalid email', type: 'format' },
        { field: 'age', message: 'Must be at least 18', type: 'min' },
        { field: 'name', message: 'Name is required', type: 'required' },
      ];
      const error = new ValidationError(errors);

      expect(error.errors).toHaveLength(3);
      expect(error.message).toBe('Validation failed: 3 error(s)');
    });

    it('should create error with empty errors array', () => {
      const errors: FieldError[] = [];
      const error = new ValidationError(errors);

      expect(error.errors).toEqual([]);
      expect(error.message).toBe('Validation failed: 0 error(s)');
    });

    it('should preserve error context', () => {
      const errors: FieldError[] = [
        {
          field: 'age',
          message: 'Must be at least 18',
          type: 'min',
          context: { min: 18, actual: 15 },
        },
      ];
      const error = new ValidationError(errors);

      expect(error.errors[0].context).toEqual({ min: 18, actual: 15 });
    });
  });

  describe('statusCode', () => {
    it('should return 400 Bad Request status code', () => {
      const error = new ValidationError([{ field: 'email', message: 'Invalid', type: 'format' }]);

      expect(error.statusCode).toBe(400);
    });

    it('should be readonly', () => {
      const error = new ValidationError([{ field: 'email', message: 'Invalid', type: 'format' }]);

      // TypeScript will prevent this, but test runtime behavior
      // In strict mode, assignment to readonly property throws
      expect(() => {
        (error as any).statusCode = 500;
      }).toThrow();
      // Value should remain 400 due to readonly
      expect(error.statusCode).toBe(400);
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON-friendly format', () => {
      const errors: FieldError[] = [{ field: 'email', message: 'Invalid email', type: 'format' }];
      const error = new ValidationError(errors);
      const json = error.toJSON();

      expect(json).toEqual({
        error: 'ValidationError',
        message: 'Validation failed: 1 error(s)',
        statusCode: 400,
        errors: errors,
      });
    });

    it('should handle multiple errors in JSON', () => {
      const errors: FieldError[] = [
        { field: 'email', message: 'Invalid email', type: 'format' },
        { field: 'age', message: 'Too young', type: 'min' },
      ];
      const error = new ValidationError(errors);
      const json = error.toJSON();

      expect(json.errors).toHaveLength(2);
      expect(json.message).toBe('Validation failed: 2 error(s)');
    });

    it('should be serializable with JSON.stringify', () => {
      const error = new ValidationError([{ field: 'email', message: 'Invalid', type: 'format' }]);

      const jsonString = JSON.stringify(error);
      const parsed = JSON.parse(jsonString);

      expect(parsed.statusCode).toBe(400);
      expect(parsed.errors).toBeDefined();
    });
  });

  describe('getFieldErrors', () => {
    it('should return errors for specific field', () => {
      const errors: FieldError[] = [
        { field: 'email', message: 'Invalid email', type: 'format' },
        { field: 'age', message: 'Too young', type: 'min' },
        { field: 'email', message: 'Already exists', type: 'custom' },
      ];
      const error = new ValidationError(errors);

      const emailErrors = error.getFieldErrors('email');

      expect(emailErrors).toHaveLength(2);
      expect(emailErrors[0].message).toBe('Invalid email');
      expect(emailErrors[1].message).toBe('Already exists');
    });

    it('should return empty array for field with no errors', () => {
      const error = new ValidationError([{ field: 'email', message: 'Invalid', type: 'format' }]);

      const ageErrors = error.getFieldErrors('age');

      expect(ageErrors).toEqual([]);
    });

    it('should handle nested field paths', () => {
      const errors: FieldError[] = [
        { field: 'user.address.city', message: 'Required', type: 'required' },
        { field: 'user.address.zip', message: 'Invalid', type: 'format' },
      ];
      const error = new ValidationError(errors);

      const cityErrors = error.getFieldErrors('user.address.city');

      expect(cityErrors).toHaveLength(1);
      expect(cityErrors[0].message).toBe('Required');
    });

    it('should handle array index paths', () => {
      const errors: FieldError[] = [
        { field: 'items[0].name', message: 'Required', type: 'required' },
        { field: 'items[1].name', message: 'Required', type: 'required' },
      ];
      const error = new ValidationError(errors);

      const firstItemErrors = error.getFieldErrors('items[0].name');

      expect(firstItemErrors).toHaveLength(1);
      expect(firstItemErrors[0].field).toBe('items[0].name');
    });
  });

  describe('hasFieldError', () => {
    it('should return true if field has errors', () => {
      const error = new ValidationError([{ field: 'email', message: 'Invalid', type: 'format' }]);

      expect(error.hasFieldError('email')).toBe(true);
    });

    it('should return false if field has no errors', () => {
      const error = new ValidationError([{ field: 'email', message: 'Invalid', type: 'format' }]);

      expect(error.hasFieldError('age')).toBe(false);
    });

    it('should return true for multiple errors on same field', () => {
      const errors: FieldError[] = [
        { field: 'email', message: 'Invalid format', type: 'format' },
        { field: 'email', message: 'Already exists', type: 'custom' },
      ];
      const error = new ValidationError(errors);

      expect(error.hasFieldError('email')).toBe(true);
    });

    it('should work with nested paths', () => {
      const error = new ValidationError([
        { field: 'user.profile.bio', message: 'Too long', type: 'maxLength' },
      ]);

      expect(error.hasFieldError('user.profile.bio')).toBe(true);
      expect(error.hasFieldError('user.profile.name')).toBe(false);
    });
  });

  describe('error message formatting', () => {
    it('should format message with correct count', () => {
      const error1 = new ValidationError([{ field: 'a', message: 'error', type: 'format' }]);
      expect(error1.message).toBe('Validation failed: 1 error(s)');

      const error2 = new ValidationError([
        { field: 'a', message: 'error', type: 'format' },
        { field: 'b', message: 'error', type: 'format' },
      ]);
      expect(error2.message).toBe('Validation failed: 2 error(s)');
    });

    it('should handle very long error messages', () => {
      const longMessage = 'x'.repeat(1000);
      const error = new ValidationError([{ field: 'field', message: longMessage, type: 'custom' }]);

      expect(error.errors[0].message).toBe(longMessage);
      expect(error.errors[0].message.length).toBe(1000);
    });

    it('should handle special characters in messages', () => {
      const specialMessage = 'Email must match pattern: /^[a-z]+@[a-z]+\\.com$/';
      const error = new ValidationError([
        { field: 'email', message: specialMessage, type: 'pattern' },
      ]);

      expect(error.errors[0].message).toBe(specialMessage);
    });
  });
});

describe('createFieldError', () => {
  it('should create basic field error', () => {
    const error = createFieldError('email', 'Invalid email', 'format');

    expect(error).toEqual({
      field: 'email',
      message: 'Invalid email',
      type: 'format',
    });
  });

  it('should create error with context', () => {
    const error = createFieldError('age', 'Must be at least 18', 'min', { min: 18, actual: 15 });

    expect(error).toEqual({
      field: 'age',
      message: 'Must be at least 18',
      type: 'min',
      context: { min: 18, actual: 15 },
    });
  });

  it('should create error without context', () => {
    const error = createFieldError('name', 'Required', 'required');

    expect(error.context).toBeUndefined();
  });

  it('should handle all error types', () => {
    const types: ValidationErrorType[] = [
      'required',
      'type',
      'format',
      'min',
      'max',
      'minLength',
      'maxLength',
      'pattern',
      'email',
      'url',
      'integer',
      'positive',
      'negative',
      'minItems',
      'maxItems',
      'unique',
      'custom',
      'unknown',
    ];

    types.forEach((type) => {
      const error = createFieldError('field', 'Error', type);
      expect(error.type).toBe(type);
    });
  });

  it('should handle complex context objects', () => {
    const error = createFieldError('config', 'Invalid configuration', 'custom', {
      expected: { min: 10, max: 100 },
      actual: { min: 5, max: 150 },
      path: 'config.limits',
    });

    expect(error.context).toEqual({
      expected: { min: 10, max: 100 },
      actual: { min: 5, max: 150 },
      path: 'config.limits',
    });
  });
});

describe('formatPath', () => {
  it('should format empty path as "root"', () => {
    expect(formatPath([])).toBe('root');
  });

  it('should format single segment path', () => {
    expect(formatPath(['email'])).toBe('email');
  });

  it('should format nested object path with dots', () => {
    expect(formatPath(['user', 'address', 'city'])).toBe('user.address.city');
  });

  it('should format array indices with brackets', () => {
    expect(formatPath(['items', 0, 'name'])).toBe('items[0].name');
  });

  it('should handle mixed paths', () => {
    expect(formatPath(['users', 0, 'addresses', 1, 'street'])).toBe('users[0].addresses[1].street');
  });

  it('should handle starting with array index', () => {
    expect(formatPath([0, 'name'])).toBe('0.name');
  });

  it('should handle consecutive array indices', () => {
    expect(formatPath(['matrix', 0, 1, 'value'])).toBe('matrix[0][1].value');
  });

  it('should handle numeric string segments', () => {
    expect(formatPath(['field123', 'subfield456'])).toBe('field123.subfield456');
  });

  it('should handle deep nesting', () => {
    const deepPath = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    expect(formatPath(deepPath)).toBe('a.b.c.d.e.f.g.h');
  });

  it('should handle paths with underscores and special chars', () => {
    expect(formatPath(['user_data', 'first_name'])).toBe('user_data.first_name');
  });
});

describe('mapZodErrorType', () => {
  it('should map invalid_type to type', () => {
    expect(mapZodErrorType('invalid_type')).toBe('type');
  });

  it('should map invalid_string to format', () => {
    expect(mapZodErrorType('invalid_string')).toBe('format');
  });

  it('should map too_small to min', () => {
    expect(mapZodErrorType('too_small')).toBe('min');
  });

  it('should map too_big to max', () => {
    expect(mapZodErrorType('too_big')).toBe('max');
  });

  it('should map invalid_enum_value to format', () => {
    expect(mapZodErrorType('invalid_enum_value')).toBe('format');
  });

  it('should map invalid_date to format', () => {
    expect(mapZodErrorType('invalid_date')).toBe('format');
  });

  it('should map custom to custom', () => {
    expect(mapZodErrorType('custom')).toBe('custom');
  });

  it('should map unknown codes to unknown', () => {
    expect(mapZodErrorType('some_unknown_code')).toBe('unknown');
    expect(mapZodErrorType('random_error')).toBe('unknown');
    expect(mapZodErrorType('')).toBe('unknown');
  });

  it('should map all known Zod error codes', () => {
    const knownMappings = {
      invalid_type: 'type',
      invalid_string: 'format',
      too_small: 'min',
      too_big: 'max',
      invalid_enum_value: 'format',
      invalid_arguments: 'format',
      invalid_return_type: 'type',
      invalid_date: 'format',
      invalid_intersection_types: 'type',
      not_multiple_of: 'format',
      custom: 'custom',
    };

    Object.entries(knownMappings).forEach(([zodCode, expectedType]) => {
      expect(mapZodErrorType(zodCode)).toBe(expectedType);
    });
  });
});

describe('Error aggregation', () => {
  it('should aggregate multiple field errors', () => {
    const errors: FieldError[] = [
      createFieldError('email', 'Invalid email', 'format'),
      createFieldError('age', 'Must be at least 18', 'min'),
      createFieldError('name', 'Required', 'required'),
    ];
    const validationError = new ValidationError(errors);

    expect(validationError.errors).toHaveLength(3);
    expect(validationError.errors).toEqual(errors);
  });

  it('should preserve error order', () => {
    const errors: FieldError[] = [
      createFieldError('c', 'Error C', 'format'),
      createFieldError('a', 'Error A', 'format'),
      createFieldError('b', 'Error B', 'format'),
    ];
    const validationError = new ValidationError(errors);

    expect(validationError.errors[0].field).toBe('c');
    expect(validationError.errors[1].field).toBe('a');
    expect(validationError.errors[2].field).toBe('b');
  });

  it('should handle errors with same field', () => {
    const errors: FieldError[] = [
      createFieldError('email', 'Invalid format', 'format'),
      createFieldError('email', 'Too long', 'maxLength'),
      createFieldError('email', 'Already exists', 'custom'),
    ];
    const validationError = new ValidationError(errors);

    const emailErrors = validationError.getFieldErrors('email');
    expect(emailErrors).toHaveLength(3);
  });
});

describe('Edge cases', () => {
  it('should handle empty field name', () => {
    const error = createFieldError('', 'Error on empty field', 'custom');
    expect(error.field).toBe('');
  });

  it('should handle empty message', () => {
    const error = createFieldError('field', '', 'custom');
    expect(error.message).toBe('');
  });

  it('should handle null context values', () => {
    const error = createFieldError('field', 'Error', 'custom', {
      value: null,
    });
    expect(error.context?.value).toBeNull();
  });

  it('should handle undefined in context', () => {
    const error = createFieldError('field', 'Error', 'custom', {
      value: undefined,
    });
    expect(error.context?.value).toBeUndefined();
  });

  it('should handle very long field paths', () => {
    const longPath = Array(100).fill('field').join('.');
    const error = createFieldError(longPath, 'Error', 'custom');
    expect(error.field).toBe(longPath);
  });

  it('should handle unicode characters in field names', () => {
    const error = createFieldError('用户名', 'Required', 'required');
    expect(error.field).toBe('用户名');
  });

  it('should handle unicode characters in messages', () => {
    const error = createFieldError('field', '必须填写', 'required');
    expect(error.message).toBe('必须填写');
  });

  it('should handle ValidationError inheritance', () => {
    const error = new ValidationError([createFieldError('field', 'Error', 'format')]);

    expect(error instanceof Error).toBe(true);
    expect(error instanceof ValidationError).toBe(true);
  });

  it('should have correct Error prototype chain', () => {
    const error = new ValidationError([createFieldError('field', 'Error', 'format')]);

    expect(Object.getPrototypeOf(error)).toBe(ValidationError.prototype);
    expect(Object.getPrototypeOf(ValidationError.prototype)).toBe(Error.prototype);
  });
});
