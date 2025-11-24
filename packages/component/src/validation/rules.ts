/**
 * Validation Rules
 *
 * @remarks
 * Reusable validation rules for different field types. These rules are used
 * to build Zod schemas for runtime validation.
 *
 * @packageDocumentation
 */

import { z } from 'zod';

/**
 * String validation rules
 */
export const stringRules = {
  /**
   * Validate email format
   */
  email: () => ({
    refinement: (val: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(val);
    },
    message: 'Must be a valid email address',
  }),

  /**
   * Validate URL format
   */
  url: () => ({
    refinement: (val: string) => {
      try {
        new URL(val);
        return true;
      } catch {
        return false;
      }
    },
    message: 'Must be a valid URL',
  }),

  /**
   * Validate against regex pattern
   */
  regex: (pattern: RegExp, message?: string) => ({
    refinement: (val: string) => pattern.test(val),
    message: message || `Must match pattern ${pattern}`,
  }),

  /**
   * Minimum length
   */
  minLength: (min: number) => ({
    check: (schema: z.ZodString) => schema.min(min),
    message: `Must be at least ${min} character(s)`,
  }),

  /**
   * Maximum length
   */
  maxLength: (max: number) => ({
    check: (schema: z.ZodString) => schema.max(max),
    message: `Must be at most ${max} character(s)`,
  }),

  /**
   * Exact length
   */
  length: (len: number) => ({
    check: (schema: z.ZodString) => schema.length(len),
    message: `Must be exactly ${len} character(s)`,
  }),

  /**
   * Non-empty string
   */
  nonEmpty: () => ({
    check: (schema: z.ZodString) => schema.min(1),
    message: 'Cannot be empty',
  }),

  /**
   * UUID format
   */
  uuid: () => ({
    check: (schema: z.ZodString) => schema.uuid(),
    message: 'Must be a valid UUID',
  }),

  /**
   * CUID format
   */
  cuid: () => ({
    check: (schema: z.ZodString) => schema.cuid(),
    message: 'Must be a valid CUID',
  }),

  /**
   * Trim whitespace
   */
  trim: () => ({
    check: (schema: z.ZodString) => schema.trim(),
  }),

  /**
   * Lowercase
   */
  lowercase: () => ({
    check: (schema: z.ZodString) => schema.toLowerCase(),
  }),

  /**
   * Uppercase
   */
  uppercase: () => ({
    check: (schema: z.ZodString) => schema.toUpperCase(),
  }),
};

/**
 * Number validation rules
 */
export const numberRules = {
  /**
   * Minimum value
   */
  min: (min: number) => ({
    check: (schema: z.ZodNumber) => schema.min(min),
    message: `Must be at least ${min}`,
  }),

  /**
   * Maximum value
   */
  max: (max: number) => ({
    check: (schema: z.ZodNumber) => schema.max(max),
    message: `Must be at most ${max}`,
  }),

  /**
   * Greater than
   */
  greaterThan: (value: number) => ({
    check: (schema: z.ZodNumber) => schema.gt(value),
    message: `Must be greater than ${value}`,
  }),

  /**
   * Less than
   */
  lessThan: (value: number) => ({
    check: (schema: z.ZodNumber) => schema.lt(value),
    message: `Must be less than ${value}`,
  }),

  /**
   * Integer (no decimals)
   */
  integer: () => ({
    check: (schema: z.ZodNumber) => schema.int(),
    message: 'Must be an integer',
  }),

  /**
   * Positive number (> 0)
   */
  positive: () => ({
    check: (schema: z.ZodNumber) => schema.positive(),
    message: 'Must be positive',
  }),

  /**
   * Negative number (< 0)
   */
  negative: () => ({
    check: (schema: z.ZodNumber) => schema.negative(),
    message: 'Must be negative',
  }),

  /**
   * Non-negative (>= 0)
   */
  nonNegative: () => ({
    check: (schema: z.ZodNumber) => schema.nonnegative(),
    message: 'Cannot be negative',
  }),

  /**
   * Non-positive (<= 0)
   */
  nonPositive: () => ({
    check: (schema: z.ZodNumber) => schema.nonpositive(),
    message: 'Cannot be positive',
  }),

  /**
   * Multiple of
   */
  multipleOf: (value: number) => ({
    check: (schema: z.ZodNumber) => schema.multipleOf(value),
    message: `Must be a multiple of ${value}`,
  }),

  /**
   * Finite number (not Infinity or NaN)
   */
  finite: () => ({
    check: (schema: z.ZodNumber) => schema.finite(),
    message: 'Must be a finite number',
  }),

  /**
   * Safe integer (within Number.MIN_SAFE_INTEGER and Number.MAX_SAFE_INTEGER)
   */
  safe: () => ({
    check: (schema: z.ZodNumber) => schema.safe(),
    message: 'Must be a safe integer',
  }),
};

/**
 * Date validation rules
 */
export const dateRules = {
  /**
   * Minimum date
   */
  min: (min: Date) => ({
    check: (schema: z.ZodDate) => schema.min(min),
    message: `Must be on or after ${min.toISOString()}`,
  }),

  /**
   * Maximum date
   */
  max: (max: Date) => ({
    check: (schema: z.ZodDate) => schema.max(max),
    message: `Must be on or before ${max.toISOString()}`,
  }),

  /**
   * Future date (after now)
   */
  future: () => ({
    refinement: (val: Date) => val > new Date(),
    message: 'Must be in the future',
  }),

  /**
   * Past date (before now)
   */
  past: () => ({
    refinement: (val: Date) => val < new Date(),
    message: 'Must be in the past',
  }),

  /**
   * Today or future
   */
  todayOrFuture: () => ({
    refinement: (val: Date) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return val >= today;
    },
    message: 'Must be today or in the future',
  }),

  /**
   * Within range
   */
  between: (min: Date, max: Date) => ({
    refinement: (val: Date) => val >= min && val <= max,
    message: `Must be between ${min.toISOString()} and ${max.toISOString()}`,
  }),
};

/**
 * Array validation rules
 */
export const arrayRules = {
  /**
   * Minimum number of items
   */
  minItems: (min: number) => ({
    check: <T extends z.ZodTypeAny>(schema: z.ZodArray<T>) => schema.min(min),
    message: `Must contain at least ${min} item(s)`,
  }),

  /**
   * Maximum number of items
   */
  maxItems: (max: number) => ({
    check: <T extends z.ZodTypeAny>(schema: z.ZodArray<T>) => schema.max(max),
    message: `Must contain at most ${max} item(s)`,
  }),

  /**
   * Exact number of items
   */
  length: (len: number) => ({
    check: <T extends z.ZodTypeAny>(schema: z.ZodArray<T>) => schema.length(len),
    message: `Must contain exactly ${len} item(s)`,
  }),

  /**
   * Non-empty array
   */
  nonEmpty: () => ({
    check: <T extends z.ZodTypeAny>(schema: z.ZodArray<T>) => schema.nonempty(),
    message: 'Array cannot be empty',
  }),

  /**
   * Unique items
   */
  unique: <T = any>(compareFn?: (a: T, b: T) => boolean) => ({
    refinement: (arr: T[]) => {
      if (compareFn) {
        for (let i = 0; i < arr.length; i++) {
          for (let j = i + 1; j < arr.length; j++) {
            if (compareFn(arr[i], arr[j])) return false;
          }
        }
        return true;
      }
      return arr.length === new Set(arr).size;
    },
    message: 'All items must be unique',
  }),
};

/**
 * Object validation rules
 */
export const objectRules = {
  /**
   * Strict mode (no additional properties)
   */
  strict: () => ({
    check: <T extends z.ZodRawShape>(schema: z.ZodObject<T>) => schema.strict(),
    message: 'No additional properties allowed',
  }),

  /**
   * Pass through unknown keys
   */
  passthrough: () => ({
    check: <T extends z.ZodRawShape>(schema: z.ZodObject<T>) => schema.passthrough(),
  }),

  /**
   * Strip unknown keys
   */
  strip: () => ({
    check: <T extends z.ZodRawShape>(schema: z.ZodObject<T>) => schema.strip(),
  }),
};

/**
 * Custom validation function type
 */
export type CustomValidator<T> = (value: T) => boolean | Promise<boolean>;

/**
 * Create a custom validation rule
 */
export function customRule<T>(
  validator: CustomValidator<T>,
  message: string
): {
  refinement: (val: T) => boolean | Promise<boolean>;
  message: string;
} {
  return {
    refinement: validator,
    message,
  };
}

/**
 * Combine multiple refinements
 */
export function combine<T>(
  ...refinements: Array<{
    refinement: (val: T) => boolean | Promise<boolean>;
    message: string;
  }>
): Array<{
  refinement: (val: T) => boolean | Promise<boolean>;
  message: string;
}> {
  return refinements;
}
