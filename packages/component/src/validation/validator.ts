/**
 * Validation Engine
 *
 * @remarks
 * Core validation engine that converts field type definitions to Zod schemas
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

/**
 * Field type definition
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
 * Supported field types
 */
export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'email'
  | 'url'
  | 'uuid'
  | 'json'
  | 'array'
  | 'object'
  | 'enum';

/**
 * Validation rule
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
export type SchemaDefinition = Record<string, FieldDefinition>;

/**
 * Convert field definition to Zod schema
 */
export function fieldToZodSchema(field: FieldDefinition): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  // Base schema based on type
  switch (field.type) {
    case 'string':
    case 'email':
    case 'url':
    case 'uuid':
      schema = z.string();
      break;

    case 'number':
      schema = z.number();
      break;

    case 'boolean':
      schema = z.boolean();
      break;

    case 'date':
    case 'datetime':
      schema = z.coerce.date();
      break;

    case 'json':
      schema = z.any();
      break;

    case 'array':
      schema = z.array(z.any());
      break;

    case 'object':
      schema = z.record(z.any());
      break;

    case 'enum':
      // Enum requires values in validation
      const enumValidation = field.validations?.find((v) => v.type === 'format');
      if (enumValidation?.value && Array.isArray(enumValidation.value)) {
        schema = z.enum(enumValidation.value as [string, ...string[]]);
      } else {
        schema = z.string();
      }
      break;

    default:
      schema = z.any();
  }

  // Apply type-specific validations
  if (field.type === 'string' || field.type === 'email' || field.type === 'url' || field.type === 'uuid') {
    schema = applyStringValidations(schema as z.ZodString, field);
  } else if (field.type === 'number') {
    schema = applyNumberValidations(schema as z.ZodNumber, field);
  } else if (field.type === 'date' || field.type === 'datetime') {
    schema = applyDateValidations(schema as z.ZodDate, field);
  } else if (field.type === 'array') {
    schema = applyArrayValidations(schema as z.ZodArray<any>, field);
  }

  // Apply custom validations
  if (field.validations) {
    schema = applyCustomValidations(schema, field.validations);
  }

  // Handle nullable
  if (field.nullable) {
    schema = schema.nullable();
  }

  // Handle optional vs required
  if (!field.required) {
    schema = schema.optional();
  }

  // Handle default value
  if (field.default !== undefined) {
    schema = schema.default(field.default);
  }

  return schema;
}

/**
 * Apply string-specific validations
 */
function applyStringValidations(schema: z.ZodString, field: FieldDefinition): z.ZodString {
  let result = schema;

  // Type-specific built-in validations
  if (field.type === 'email') {
    result = result.email('Must be a valid email address');
  } else if (field.type === 'url') {
    result = result.url('Must be a valid URL');
  } else if (field.type === 'uuid') {
    result = result.uuid('Must be a valid UUID');
  }

  // Additional validations
  field.validations?.forEach((validation) => {
    switch (validation.type) {
      case 'minLength':
        result = result.min(validation.value, validation.message);
        break;
      case 'maxLength':
        result = result.max(validation.value, validation.message);
        break;
      case 'pattern':
        if (validation.value instanceof RegExp) {
          result = result.regex(validation.value, validation.message);
        }
        break;
    }
  });

  return result;
}

/**
 * Apply number-specific validations
 */
function applyNumberValidations(schema: z.ZodNumber, field: FieldDefinition): z.ZodNumber {
  let result = schema;

  field.validations?.forEach((validation) => {
    switch (validation.type) {
      case 'min':
        result = result.min(validation.value, validation.message);
        break;
      case 'max':
        result = result.max(validation.value, validation.message);
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
function applyDateValidations(schema: z.ZodDate, field: FieldDefinition): z.ZodDate {
  let result = schema;

  field.validations?.forEach((validation) => {
    switch (validation.type) {
      case 'min':
        if (validation.value instanceof Date) {
          result = result.min(validation.value, validation.message);
        }
        break;
      case 'max':
        if (validation.value instanceof Date) {
          result = result.max(validation.value, validation.message);
        }
        break;
    }
  });

  return result;
}

/**
 * Apply array-specific validations
 */
function applyArrayValidations(schema: z.ZodArray<any>, field: FieldDefinition): z.ZodArray<any> {
  let result = schema;

  field.validations?.forEach((validation) => {
    switch (validation.type) {
      case 'minItems':
        result = result.min(validation.value, validation.message);
        break;
      case 'maxItems':
        result = result.max(validation.value, validation.message);
        break;
    }
  });

  return result;
}

/**
 * Apply custom validations using refinements
 */
function applyCustomValidations(schema: z.ZodTypeAny, validations: Validation[]): z.ZodTypeAny {
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
  field: FieldDefinition,
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
    return createFieldError(
      path,
      issue.message,
      mapZodErrorType(issue.code),
      { code: issue.code }
    );
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
    return { success: true, data: result.data };
  }

  const errors: FieldError[] = result.error.issues.map((issue) => {
    return createFieldError(
      formatPath(issue.path),
      issue.message,
      mapZodErrorType(issue.code),
      { code: issue.code }
    );
  });

  return { success: false, errors };
}

/**
 * Validate and throw on error
 */
export function validate<T = any>(
  schema: SchemaDefinition,
  data: unknown
): T {
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
      Object.entries(schema).map(([key, field]) => [
        key,
        { ...field, required: false },
      ])
    );
    return validateSchema<T>(optionalSchema, data);
  }

  return validateSchema<T>(schema, data);
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
