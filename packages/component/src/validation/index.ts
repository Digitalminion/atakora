/**
 * Validation Engine
 *
 * @remarks
 * Runtime validation engine using Zod for schema validation. Provides
 * type-safe validation with clear error messages for all model fields,
 * function inputs/outputs, and event payloads.
 *
 * ## Features
 *
 * - **Field Type Validation**: Validates strings, numbers, dates, arrays, objects
 * - **Custom Validators**: Support for custom validation logic
 * - **Structured Errors**: Field-level errors with paths
 * - **HTTP-Friendly**: 400 Bad Request compatible error format
 * - **Type Safety**: Full TypeScript support with inference
 *
 * ## Basic Usage
 *
 * ```typescript
 * import { validate, type SchemaDefinition } from '@atakora/component/validation';
 *
 * const userSchema: SchemaDefinition = {
 *   email: {
 *     type: 'email',
 *     required: true,
 *   },
 *   age: {
 *     type: 'number',
 *     required: true,
 *     validations: [
 *       { type: 'min', value: 0 },
 *       { type: 'max', value: 120 },
 *       { type: 'integer' },
 *     ],
 *   },
 * };
 *
 * try {
 *   const user = validate(userSchema, {
 *     email: 'user@example.com',
 *     age: 25,
 *   });
 *   console.log('Valid:', user);
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     console.log('Errors:', error.errors);
 *   }
 * }
 * ```
 *
 * ## Validation Results
 *
 * ```typescript
 * import { validateSchema } from '@atakora/component/validation';
 *
 * const result = validateSchema(userSchema, data);
 *
 * if (result.success) {
 *   console.log('Data:', result.data);
 * } else {
 *   console.log('Errors:', result.errors);
 *   // [
 *   //   {
 *   //     field: 'email',
 *   //     message: 'Must be a valid email address',
 *   //     type: 'format'
 *   //   }
 *   // ]
 * }
 * ```
 *
 * ## Model Validation
 *
 * ```typescript
 * import { validateModelInput } from '@atakora/component/validation';
 *
 * // Create mode: all required fields must be present
 * const createResult = validateModelInput(schema, data, 'create');
 *
 * // Update mode: all fields optional
 * const updateResult = validateModelInput(schema, data, 'update');
 * ```
 *
 * ## Custom Validators
 *
 * ```typescript
 * const schema: SchemaDefinition = {
 *   username: {
 *     type: 'string',
 *     required: true,
 *     validations: [
 *       {
 *         type: 'custom',
 *         validator: (val: string) => !val.includes('admin'),
 *         message: 'Username cannot contain "admin"',
 *       },
 *     ],
 *   },
 * };
 * ```
 *
 * @packageDocumentation
 */

// ============================================================================
// CORE VALIDATION
// ============================================================================

export {
  fieldToZodSchema,
  schemaToZodSchema,
  validateField,
  validateSchema,
  validate,
  validateModelInput,
  validateFunction,
  validateEvent,
  createValidator,
  createAsyncValidator,
  validatePartial,
  validateArray,
  type FieldDefinition,
  type FieldType,
  type Validation,
  type SchemaDefinition,
} from './validator';

// ============================================================================
// ERROR TYPES
// ============================================================================

export {
  ValidationError,
  createFieldError,
  formatPath,
  mapZodErrorType,
  type FieldError,
  type ValidationErrorType,
  type ValidationResult,
} from './errors';

// ============================================================================
// VALIDATION RULES
// ============================================================================

export {
  stringRules,
  numberRules,
  dateRules,
  arrayRules,
  objectRules,
  customRule,
  combine,
  type CustomValidator,
} from './rules';

// ============================================================================
// VERSION
// ============================================================================

/**
 * Validation engine version
 */
export const VALIDATION_VERSION = '1.0.0';
