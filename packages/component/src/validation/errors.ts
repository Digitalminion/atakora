/**
 * Validation Error Types
 *
 * @remarks
 * Structured error types for validation failures with field-level granularity.
 * Errors are designed to be HTTP-friendly and easy to consume by client applications.
 *
 * @packageDocumentation
 */

/**
 * Represents a single field validation error
 */
export interface FieldError {
  /**
   * Path to the field that failed validation
   * @example 'email', 'user.address.city', 'items[0].name'
   */
  field: string;

  /**
   * Human-readable error message
   */
  message: string;

  /**
   * Type of validation that failed
   */
  type: ValidationErrorType;

  /**
   * Additional context about the validation failure
   */
  context?: Record<string, any>;
}

/**
 * Types of validation errors
 */
export type ValidationErrorType =
  | 'required'
  | 'type'
  | 'format'
  | 'min'
  | 'max'
  | 'minLength'
  | 'maxLength'
  | 'pattern'
  | 'email'
  | 'url'
  | 'integer'
  | 'positive'
  | 'negative'
  | 'minItems'
  | 'maxItems'
  | 'unique'
  | 'custom'
  | 'unknown';

/**
 * Result of a validation operation
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: FieldError[] };

/**
 * Validation exception thrown when validation fails
 */
export class ValidationError extends Error {
  public readonly errors: FieldError[];
  public readonly statusCode: number = 400;

  constructor(errors: FieldError[]) {
    const message = `Validation failed: ${errors.length} error(s)`;
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }

  /**
   * Convert to HTTP-friendly error response
   */
  toJSON() {
    return {
      error: 'ValidationError',
      message: this.message,
      statusCode: this.statusCode,
      errors: this.errors,
    };
  }

  /**
   * Get errors for a specific field
   */
  getFieldErrors(field: string): FieldError[] {
    return this.errors.filter((e) => e.field === field);
  }

  /**
   * Check if a specific field has errors
   */
  hasFieldError(field: string): boolean {
    return this.errors.some((e) => e.field === field);
  }
}

/**
 * Create a field error
 */
export function createFieldError(
  field: string,
  message: string,
  type: ValidationErrorType,
  context?: Record<string, any>
): FieldError {
  return { field, message, type, context };
}

/**
 * Format Zod error path to string
 */
export function formatPath(path: (string | number)[]): string {
  if (path.length === 0) return 'root';

  return path.reduce<string>((acc, segment, index) => {
    if (index === 0) return String(segment);
    if (typeof segment === 'number') return `${acc}[${segment}]`;
    return `${acc}.${segment}`;
  }, '');
}

/**
 * Map Zod error code to ValidationErrorType
 */
export function mapZodErrorType(zodCode: string): ValidationErrorType {
  const mapping: Record<string, ValidationErrorType> = {
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

  return mapping[zodCode] || 'unknown';
}
