/**
 * Validation Engine
 *
 * @remarks
 * Core validation engine that converts unified field definitions to Zod schemas
 * and performs runtime validation. Supports all common field types and
 * provides clear, actionable error messages.
 *
 * @packageDocumentation
 */

import { z } from 'zod';
import {
  ValidationResult,
  ValidationError,
  FieldError,
  createFieldError,
  formatPath,
  mapZodErrorType,
  type ValidationErrorType,
} from './errors';
import type { CustomValidator } from './rules';
import type {
  UnifiedFieldDefinition,
  UnifiedValidationRule,
  FieldType,
} from '../schema/unified-types';

/**
 * Field definition type (alias for backward compatibility)
 * @deprecated Use UnifiedFieldDefinition from unified-types instead
 */
export interface FieldDefinition {
  type: FieldType;
  required?: boolean;
  default?: any;
  validations?: Validation[];
  description?: string;
  nullable?: boolean;
}

/**
 * Supported field types (re-export for backward compatibility)
 * @deprecated Import FieldType from unified-types instead
 */
export type { FieldType } from '../schema/unified-types';

/**
 * Validation rule (alias for backward compatibility)
 * @deprecated Use UnifiedValidationRule from unified-types instead
 */
export interface Validation {
  type: ValidationErrorType;
  value?: any;
  message?: string;
  validator?: CustomValidator<any>;
}

/**
 * Schema definition (collection of fields)
 */
export type SchemaDefinition = Record<string, UnifiedFieldDefinition | FieldDefinition>;

/**
 * Convert legacy FieldDefinition to UnifiedFieldDefinition
 *
 * @internal
 */
function toUnifiedDefinition(
  field: FieldDefinition | UnifiedFieldDefinition
): UnifiedFieldDefinition {
  // Check if already unified
  if (
    'validations' in field &&
    Array.isArray(field.validations) &&
    field.validations.length > 0 &&
    'type' in field.validations[0]
  ) {
    // Check if it has the unified structure
    if (typeof field.required === 'boolean' && typeof field.nullable === 'boolean') {
      return field as UnifiedFieldDefinition;
    }
  }

  // Convert legacy to unified
  const legacy = field as FieldDefinition;
  const unified: UnifiedFieldDefinition = {
    type: legacy.type,
    required: legacy.required ?? false,
    nullable: legacy.nullable ?? false,
    default: legacy.default,
    validations: [],
    metadata: legacy.description ? { description: legacy.description } : undefined,
  };

  // Convert legacy validations to unified
  if (legacy.validations) {
    unified.validations = legacy.validations.map(
      (v) =>
        ({
          type: v.type as any,
          value: v.value,
          message: v.message,
          validator: v.validator,
        }) as UnifiedValidationRule
    );
  }

  return unified;
}

/**
 * Convert unified field definition to Zod schema
 */
export function fieldToZodSchema(field: UnifiedFieldDefinition | FieldDefinition): z.ZodTypeAny {
  // Ensure we have a unified definition
  const unified = toUnifiedDefinition(field);

  let schema: z.ZodTypeAny;

  // Base schema based on type
  switch (unified.type) {
    case 'string':
      schema = z.string();
      break;

    case 'number':
      schema = z.number();
      break;

    case 'boolean':
      schema = z.boolean();
      break;

    case 'datetime':
      schema = z.coerce.date();
      break;

    case 'id':
      schema = z.string();
      break;

    case 'json':
      schema = z.any();
      break;

    case 'binary':
      schema = z.instanceof(Buffer);
      break;

    case 'array':
      // Handle array item definition
      if (unified.itemDefinition) {
        const itemSchema = fieldToZodSchema(unified.itemDefinition);
        schema = z.array(itemSchema);
      } else {
        schema = z.array(z.any());
      }
      break;

    case 'object':
      // Handle object schema
      if (unified.schema) {
        const shape: Record<string, z.ZodTypeAny> = {};
        for (const [key, fieldDef] of Object.entries(unified.schema)) {
          shape[key] = fieldToZodSchema(fieldDef);
        }
        schema = z.object(shape);
      } else {
        schema = z.record(z.any());
      }
      break;

    case 'enum':
      // Handle enum values
      if (unified.values && unified.values.length > 0) {
        schema = z.enum(unified.values as [string, ...string[]]);
      } else {
        // Look for format validation with enum values
        const enumValidation = unified.validations?.find((v) => v.type === 'format');
        if (enumValidation?.value && Array.isArray(enumValidation.value)) {
          schema = z.enum(enumValidation.value as [string, ...string[]]);
        } else {
          schema = z.string();
        }
      }
      break;

    case 'ref':
      // Reference fields are validated as strings (storing IDs)
      schema = z.string();
      break;

    case 'email':
      // Email fields are strings with email validation
      schema = z.string().email('Must be a valid email address');
      break;

    case 'url':
      // URL fields are strings with URL validation
      schema = z.string().url('Must be a valid URL');
      break;

    case 'uuid':
      // UUID fields are strings with UUID validation
      schema = z.string().uuid('Must be a valid UUID');
      break;

    case 'date':
      // Date fields (treated the same as datetime)
      schema = z.coerce.date();
      break;

    default:
      schema = z.any();
  }

  // Apply type-specific validations based on unified definition
  if (
    unified.type === 'string' ||
    unified.type === 'email' ||
    unified.type === 'url' ||
    unified.type === 'uuid'
  ) {
    schema = applyStringValidations(schema as z.ZodString, unified);
  } else if (unified.type === 'number') {
    schema = applyNumberValidations(schema as z.ZodNumber, unified);
  } else if (unified.type === 'datetime' || unified.type === 'date') {
    schema = applyDateValidations(schema as z.ZodDate, unified);
  } else if (unified.type === 'array') {
    schema = applyArrayValidations(schema as z.ZodArray<any>, unified);
  }

  // Apply custom validations
  if (unified.validations && unified.validations.length > 0) {
    schema = applyCustomValidations(schema, unified.validations);
  }

  // Handle nullable
  if (unified.nullable) {
    schema = schema.nullable();
  }

  // Handle optional vs required
  if (!unified.required) {
    schema = schema.optional();
  }

  // Handle default value
  if (unified.default !== undefined) {
    schema = schema.default(unified.default);
  }

  // Add description if available
  if (unified.metadata?.description) {
    schema = schema.describe(unified.metadata.description);
  }

  return schema;
}

/**
 * Apply string-specific validations
 */
function applyStringValidations(schema: z.ZodString, field: UnifiedFieldDefinition): z.ZodString {
  let result = schema;

  // Apply format validations (skip if type is already email/url/uuid to avoid double-application)
  if (field.type !== 'email' && field.type !== 'url' && field.type !== 'uuid') {
    if (field.format === 'email' || field.validations?.some((v) => v.type === 'email')) {
      result = result.email('Must be a valid email address');
    } else if (field.format === 'url' || field.validations?.some((v) => v.type === 'url')) {
      result = result.url('Must be a valid URL');
    } else if (field.format === 'uuid' || field.validations?.some((v) => v.type === 'uuid')) {
      result = result.uuid('Must be a valid UUID');
    }
  }

  // Apply length constraints from unified definition
  if (field.minLength !== undefined) {
    result = result.min(field.minLength);
  }
  if (field.maxLength !== undefined) {
    result = result.max(field.maxLength);
  }

  // Apply pattern validation
  if (field.pattern) {
    result = result.regex(field.pattern);
  }

  // Additional validations from rules
  field.validations?.forEach((validation) => {
    switch (validation.type) {
      case 'minLength':
        if (validation.value !== undefined) {
          result = result.min(validation.value, validation.message);
        }
        break;
      case 'maxLength':
        if (validation.value !== undefined) {
          result = result.max(validation.value, validation.message);
        }
        break;
      case 'pattern':
      case 'regex':
        // Support both 'pattern' property (unified) and 'value' property (legacy)
        const pattern = validation.pattern || (validation as any).value;
        if (pattern instanceof RegExp) {
          result = result.regex(pattern, validation.message);
        }
        break;
      case 'phone':
        // Phone validation is handled via pattern
        if (field.pattern) {
          result = result.regex(
            field.pattern,
            validation.message || 'Must be a valid phone number'
          );
        }
        break;
    }
  });

  return result;
}

/**
 * Apply number-specific validations
 */
function applyNumberValidations(schema: z.ZodNumber, field: UnifiedFieldDefinition): z.ZodNumber {
  let result = schema;

  // Apply constraints from unified definition
  if (field.min !== undefined) {
    result = result.min(field.min);
  }
  if (field.max !== undefined) {
    result = result.max(field.max);
  }
  if (field.integer) {
    result = result.int();
  }

  // Additional validations from rules
  field.validations?.forEach((validation) => {
    switch (validation.type) {
      case 'min':
        if (validation.value !== undefined) {
          result = result.min(validation.value, validation.message);
        }
        break;
      case 'max':
        if (validation.value !== undefined) {
          result = result.max(validation.value, validation.message);
        }
        break;
      case 'integer':
        result = result.int(validation.message);
        break;
      case 'positive':
        result = result.positive(validation.message);
        break;
      case 'negative':
        result = result.negative(validation.message);
        break;
    }
  });

  return result;
}

/**
 * Apply date-specific validations
 */
function applyDateValidations(schema: z.ZodDate, field: UnifiedFieldDefinition): z.ZodDate {
  let result = schema;

  field.validations?.forEach((validation) => {
    switch (validation.type) {
      case 'min':
        if (
          validation.value &&
          typeof validation.value === 'object' &&
          (validation.value as any) instanceof Date
        ) {
          result = result.min(validation.value as Date, validation.message);
        }
        break;
      case 'max':
        if (
          validation.value &&
          typeof validation.value === 'object' &&
          (validation.value as any) instanceof Date
        ) {
          result = result.max(validation.value as Date, validation.message);
        }
        break;
    }
  });

  return result;
}

/**
 * Apply array-specific validations
 */
function applyArrayValidations(
  schema: z.ZodArray<any>,
  field: UnifiedFieldDefinition
): z.ZodArray<any> {
  let result = schema;

  // Apply constraints from unified definition
  if (field.minItems !== undefined) {
    result = result.min(field.minItems);
  }
  if (field.maxItems !== undefined) {
    result = result.max(field.maxItems);
  }
  if (field.unique) {
    // Apply uniqueness validation
    result = result.refine((items) => new Set(items).size === items.length, {
      message: 'Array items must be unique',
    }) as unknown as z.ZodArray<any>;
  }

  // Additional validations from rules
  field.validations?.forEach((validation) => {
    switch (validation.type) {
      case 'minItems':
        if (validation.value !== undefined) {
          result = result.min(validation.value, validation.message);
        }
        break;
      case 'maxItems':
        if (validation.value !== undefined) {
          result = result.max(validation.value, validation.message);
        }
        break;
      case 'unique':
        result = result.refine((items) => new Set(items).size === items.length, {
          message: validation.message || 'Array items must be unique',
        }) as unknown as z.ZodArray<any>;
        break;
    }
  });

  return result;
}

/**
 * Apply custom validations using refinements
 */
function applyCustomValidations(
  schema: z.ZodTypeAny,
  validations: UnifiedValidationRule[]
): z.ZodTypeAny {
  let result = schema;

  validations.forEach((validation) => {
    if (validation.type === 'custom' && validation.validator) {
      result = result.refine(validation.validator, {
        message: validation.message || 'Validation failed',
      });
    }
  });

  return result;
}

/**
 * Convert schema definition to Zod object schema
 */
export function schemaToZodSchema(schema: SchemaDefinition): z.ZodObject<any> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [key, field] of Object.entries(schema)) {
    shape[key] = fieldToZodSchema(field);
  }

  return z.object(shape);
}

/**
 * Validate data against a field definition
 */
export function validateField<T = any>(
  field: UnifiedFieldDefinition | FieldDefinition,
  value: unknown,
  fieldName: string = 'field'
): ValidationResult<T> {
  const schema = fieldToZodSchema(field);
  const result = schema.safeParse(value);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: FieldError[] = result.error.issues.map((issue) => {
    const path = issue.path.length > 0 ? formatPath([fieldName, ...issue.path]) : fieldName;
    return createFieldError(path, issue.message, mapZodErrorType(issue.code), { code: issue.code });
  });

  return { success: false, errors };
}

/**
 * Validate data against a schema definition
 */
export function validateSchema<T = any>(
  schema: SchemaDefinition,
  data: unknown
): ValidationResult<T> {
  const zodSchema = schemaToZodSchema(schema);
  const result = zodSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data as T };
  }

  const errors: FieldError[] = result.error.issues.map((issue) => {
    return createFieldError(formatPath(issue.path), issue.message, mapZodErrorType(issue.code), {
      code: issue.code,
    });
  });

  return { success: false, errors };
}

/**
 * Validate and throw on error
 */
export function validate<T = any>(schema: SchemaDefinition, data: unknown): T {
  const result = validateSchema<T>(schema, data);

  if (!result.success) {
    throw new ValidationError(result.errors);
  }

  return result.data;
}

/**
 * Validate model input (for CRUD operations)
 */
export function validateModelInput<T = any>(
  schema: SchemaDefinition,
  data: unknown,
  mode: 'create' | 'update' = 'create'
): ValidationResult<T> {
  // For update operations, make all fields optional
  if (mode === 'update') {
    const optionalSchema = Object.fromEntries(
      Object.entries(schema).map(([key, field]) => {
        const unified = toUnifiedDefinition(field);
        return [key, { ...unified, required: false }];
      })
    );
    return validateSchema<T>(optionalSchema, data);
  }

  // For create operations, respect read-only fields
  const createSchema = Object.fromEntries(
    Object.entries(schema).filter(([key, field]) => {
      const unified = toUnifiedDefinition(field);
      // Exclude read-only and computed fields from create validation
      return !unified.metadata?.readOnly && !unified.metadata?.computed;
    })
  );

  return validateSchema<T>(createSchema, data);
}

/**
 * Validate function input/output
 */
export function validateFunction<TInput = any, TOutput = any>(
  inputSchema: SchemaDefinition,
  outputSchema: SchemaDefinition,
  input: unknown,
  output?: unknown
): {
  input: ValidationResult<TInput>;
  output?: ValidationResult<TOutput>;
} {
  const inputResult = validateSchema<TInput>(inputSchema, input);

  if (output !== undefined) {
    const outputResult = validateSchema<TOutput>(outputSchema, output);
    return { input: inputResult, output: outputResult };
  }

  return { input: inputResult };
}

/**
 * Validate event payload
 */
export function validateEvent<T = any>(
  schema: SchemaDefinition,
  payload: unknown
): ValidationResult<T> {
  return validateSchema<T>(schema, payload);
}

/**
 * Create a validator function from schema
 */
export function createValidator<T = any>(
  schema: SchemaDefinition
): (data: unknown) => ValidationResult<T> {
  return (data: unknown) => validateSchema<T>(schema, data);
}

/**
 * Create an async validator function
 */
export function createAsyncValidator<T = any>(
  schema: SchemaDefinition
): (data: unknown) => Promise<ValidationResult<T>> {
  return async (data: unknown) => {
    return validateSchema<T>(schema, data);
  };
}

/**
 * Partial validation (validate only provided fields)
 */
export function validatePartial<T = any>(
  schema: SchemaDefinition,
  data: unknown
): ValidationResult<Partial<T>> {
  if (typeof data !== 'object' || data === null) {
    return {
      success: false,
      errors: [createFieldError('root', 'Data must be an object', 'type')],
    };
  }

  // Only validate fields present in data
  const partialSchema = Object.fromEntries(
    Object.entries(schema).filter(([key]) => key in (data as Record<string, any>))
  );

  return validateSchema<Partial<T>>(partialSchema, data);
}

/**
 * Validate array of items
 */
export function validateArray<T = any>(
  itemSchema: SchemaDefinition,
  data: unknown
): ValidationResult<T[]> {
  if (!Array.isArray(data)) {
    return {
      success: false,
      errors: [createFieldError('root', 'Data must be an array', 'type')],
    };
  }

  const errors: FieldError[] = [];
  const validatedItems: T[] = [];

  data.forEach((item, index) => {
    const result = validateSchema<T>(itemSchema, item);
    if (result.success) {
      validatedItems.push(result.data);
    } else {
      // Prefix errors with array index
      result.errors.forEach((error) => {
        errors.push({
          ...error,
          field: `[${index}].${error.field}`,
        });
      });
    }
  });

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: validatedItems };
}
