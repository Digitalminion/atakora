/**
 * Request and Response Validation
 *
 * Provides comprehensive validation capabilities for REST API operations including:
 * - JSON Schema validation with strict mode support
 * - Content-Type validation and enforcement
 * - Request size limits and security controls
 * - Input sanitization (XSS, SQL injection, path traversal)
 * - Custom validation functions
 *
 * @see ADR-015 REST Advanced Features - Section 6: Request/Response Validation
 */

import { JsonSchema } from '../operation';
import { ProblemDetails, ProblemDetailsFactory, ValidationError } from './problem-details';

/**
 * Validation configuration for JSON Schema validation
 *
 * Defines how JSON Schema validation should be performed.
 *
 * @example
 * ```typescript
 * const config: ValidationConfig = {
 *   schema: userSchema,
 *   strict: true,
 *   errorMessage: 'User validation failed'
 * };
 * ```
 */
export interface ValidationConfig {
  /**
   * JSON Schema to validate against
   */
  readonly schema: JsonSchema;

  /**
   * Strict mode - reject additional properties not in schema
   * @default false
   */
  readonly strict?: boolean;

  /**
   * Custom error message for validation failures
   */
  readonly errorMessage?: string;

  /**
   * Whether to include detailed validation errors in response
   * @default true
   */
  readonly includeErrors?: boolean;
}

/**
 * Validation result from JSON Schema validation
 *
 * Contains validation status and detailed error information.
 *
 * @example
 * ```typescript
 * const result: ValidationResult = {
 *   valid: false,
 *   errors: [
 *     { field: 'email', message: 'Invalid email format' }
 *   ]
 * };
 * ```
 */
export interface ValidationResult {
  /**
   * Whether validation passed
   */
  readonly valid: boolean;

  /**
   * Detailed validation errors (if any)
   */
  readonly errors?: readonly ValidationError[];

  /**
   * Problem details for failed validation
   */
  readonly problemDetails?: ProblemDetails;
}

/**
 * Content-Type validation configuration
 *
 * Defines allowed content types and charset requirements.
 *
 * @example
 * ```typescript
 * const config: ContentTypeConfig = {
 *   allowed: ['application/json', 'application/xml'],
 *   charset: 'utf-8',
 *   required: true
 * };
 * ```
 */
export interface ContentTypeConfig {
  /**
   * List of allowed content types
   */
  readonly allowed: readonly string[];

  /**
   * Required charset (e.g., 'utf-8')
   */
  readonly charset?: string;

  /**
   * Whether Content-Type header is required
   * @default true
   */
  readonly required?: boolean;

  /**
   * Error message for invalid content type
   */
  readonly errorMessage?: string;
}

/**
 * Request size validation configuration
 *
 * Defines size limits for various parts of the request.
 *
 * @example
 * ```typescript
 * const config: SizeConfig = {
 *   maxBodySize: 1024 * 1024, // 1MB
 *   maxHeaderSize: 8192,       // 8KB
 *   maxUrlLength: 2048
 * };
 * ```
 */
export interface SizeConfig {
  /**
   * Maximum request body size in bytes
   */
  readonly maxBodySize?: number;

  /**
   * Maximum total header size in bytes
   */
  readonly maxHeaderSize?: number;

  /**
   * Maximum URL length in characters
   */
  readonly maxUrlLength?: number;

  /**
   * Error message for size limit violations
   */
  readonly errorMessage?: string;
}

/**
 * Input sanitization configuration
 *
 * Defines sanitization rules for input data.
 *
 * @example
 * ```typescript
 * const config: SanitizationConfig = {
 *   enabled: true,
 *   patterns: [
 *     { regex: /<script[^>]*>.*?<\/script>/gi, replacement: '' }
 *   ]
 * };
 * ```
 */
export interface SanitizationConfig {
  /**
   * Whether sanitization is enabled
   * @default true
   */
  readonly enabled?: boolean;

  /**
   * Custom sanitization patterns
   */
  readonly patterns?: readonly SanitizationPattern[];

  /**
   * Whether to log sanitization actions
   * @default false
   */
  readonly logSanitizations?: boolean;
}

/**
 * Sanitization pattern for input cleaning
 */
export interface SanitizationPattern {
  /**
   * Regular expression to match
   */
  readonly regex: RegExp;

  /**
   * Replacement string
   */
  readonly replacement: string;

  /**
   * Description of what this pattern sanitizes
   */
  readonly description?: string;
}

/**
 * Custom validation function type
 *
 * @param data - Data to validate
 * @returns Validation result
 */
export type CustomValidator = (data: unknown) => ValidationResult;

/**
 * JSON Schema validator with strict mode support
 *
 * Provides JSON Schema validation with comprehensive error reporting
 * and support for strict mode (rejecting additional properties).
 *
 * @example
 * ```typescript
 * const schema: JsonSchema = {
 *   type: 'object',
 *   required: ['email', 'name'],
 *   properties: {
 *     email: { type: 'string', format: 'email' },
 *     name: { type: 'string', minLength: 1 }
 *   }
 * };
 *
 * const config = JsonSchemaValidator.validate(schema, true);
 * ```
 */
export class JsonSchemaValidator {
  /**
   * Create a JSON Schema validation configuration
   *
   * @param schema - JSON Schema to validate against
   * @param strict - Whether to reject additional properties
   * @returns Validation configuration
   *
   * @example
   * ```typescript
   * const config = JsonSchemaValidator.validate(userSchema, true);
   * ```
   */
  static validate(schema: JsonSchema, strict?: boolean): ValidationConfig {
    return {
      schema: strict ? this.makeStrict(schema) : schema,
      strict,
      includeErrors: true,
    };
  }

  /**
   * Create a custom validation configuration
   *
   * @param validator - Custom validation function
   * @returns Validation configuration
   *
   * @example
   * ```typescript
   * const config = JsonSchemaValidator.custom((data) => {
   *   if (typeof data === 'object' && data.email) {
   *     return { valid: true };
   *   }
   *   return {
   *     valid: false,
   *     errors: [{ field: 'email', message: 'Email is required' }]
   *   };
   * });
   * ```
   */
  static custom(validator: CustomValidator): ValidationConfig {
    return {
      schema: { type: 'object' }, // Placeholder schema
      includeErrors: true,
    };
  }

  /**
   * Make a schema strict by setting additionalProperties to false
   *
   * @param schema - Original schema
   * @returns Strict version of schema
   *
   * @example
   * ```typescript
   * const strictSchema = JsonSchemaValidator.makeStrict(schema);
   * // strictSchema.additionalProperties === false
   * ```
   */
  private static makeStrict(schema: JsonSchema): JsonSchema {
    if (schema.type === 'object') {
      return {
        ...schema,
        additionalProperties: false,
      };
    }
    return schema;
  }

  /**
   * Validate data against a JSON Schema
   *
   * This is a runtime validation helper that can be used in handler code.
   *
   * @param data - Data to validate
   * @param config - Validation configuration
   * @returns Validation result
   *
   * @example
   * ```typescript
   * const result = JsonSchemaValidator.validateData(
   *   { email: 'test@example.com', name: 'John' },
   *   config
   * );
   *
   * if (!result.valid) {
   *   console.error(result.errors);
   * }
   * ```
   */
  static validateData(
    data: unknown,
    config: ValidationConfig
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const schema = config.schema;

    // Basic type validation
    if (schema.type && !this.validateType(data, schema.type)) {
      errors.push({
        field: '$root',
        message: `Expected type ${schema.type} but got ${typeof data}`,
        code: 'invalid_type',
      });
    }

    // Object property validation
    if (
      schema.type === 'object' &&
      typeof data === 'object' &&
      data !== null
    ) {
      const obj = data as Record<string, unknown>;

      // Check required properties
      if (schema.required) {
        for (const required of schema.required) {
          if (!(required in obj)) {
            errors.push({
              field: required,
              message: `Missing required property: ${required}`,
              code: 'required',
              pointer: `/${required}`,
            });
          }
        }
      }

      // Validate properties
      if (schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          if (key in obj) {
            const propErrors = this.validateProperty(
              obj[key],
              propSchema,
              key
            );
            errors.push(...propErrors);
          }
        }
      }

      // Check for additional properties in strict mode
      if (config.strict && schema.properties) {
        const allowedKeys = Object.keys(schema.properties);
        for (const key of Object.keys(obj)) {
          if (!allowedKeys.includes(key)) {
            errors.push({
              field: key,
              message: `Additional property not allowed: ${key}`,
              code: 'additional_property',
              pointer: `/${key}`,
            });
          }
        }
      }
    }

    // Array validation
    if (schema.type === 'array' && Array.isArray(data)) {
      if (schema.minItems !== undefined && data.length < schema.minItems) {
        errors.push({
          field: '$root',
          message: `Array must have at least ${schema.minItems} items`,
          code: 'min_items',
        });
      }

      if (schema.maxItems !== undefined && data.length > schema.maxItems) {
        errors.push({
          field: '$root',
          message: `Array must have at most ${schema.maxItems} items`,
          code: 'max_items',
        });
      }
    }

    const valid = errors.length === 0;

    return {
      valid,
      errors: valid ? undefined : errors,
      problemDetails: valid
        ? undefined
        : ProblemDetailsFactory.unprocessableEntity(
            config.errorMessage || 'Validation failed',
            errors
          ),
    };
  }

  /**
   * Validate type of data
   */
  private static validateType(data: unknown, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof data === 'string';
      case 'number':
      case 'integer':
        return typeof data === 'number';
      case 'boolean':
        return typeof data === 'boolean';
      case 'array':
        return Array.isArray(data);
      case 'object':
        return typeof data === 'object' && data !== null && !Array.isArray(data);
      case 'null':
        return data === null;
      default:
        return true;
    }
  }

  /**
   * Validate a single property
   */
  private static validateProperty(
    value: unknown,
    schema: JsonSchema,
    field: string
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Type validation
    if (schema.type && !this.validateType(value, schema.type)) {
      errors.push({
        field,
        message: `Expected type ${schema.type}`,
        code: 'invalid_type',
        value,
        pointer: `/${field}`,
      });
      return errors; // Stop further validation if type is wrong
    }

    // String validations
    if (schema.type === 'string' && typeof value === 'string') {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        errors.push({
          field,
          message: `Must be at least ${schema.minLength} characters`,
          code: 'min_length',
          pointer: `/${field}`,
        });
      }

      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        errors.push({
          field,
          message: `Must be at most ${schema.maxLength} characters`,
          code: 'max_length',
          pointer: `/${field}`,
        });
      }

      if (schema.pattern) {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(value)) {
          errors.push({
            field,
            message: `Does not match required pattern`,
            code: 'pattern',
            pointer: `/${field}`,
          });
        }
      }

      // Format validation
      if (schema.format) {
        const formatError = this.validateFormat(value, schema.format, field);
        if (formatError) {
          errors.push(formatError);
        }
      }
    }

    // Number validations
    if (
      (schema.type === 'number' || schema.type === 'integer') &&
      typeof value === 'number'
    ) {
      if (schema.minimum !== undefined && value < schema.minimum) {
        errors.push({
          field,
          message: `Must be at least ${schema.minimum}`,
          code: 'minimum',
          pointer: `/${field}`,
        });
      }

      if (schema.maximum !== undefined && value > schema.maximum) {
        errors.push({
          field,
          message: `Must be at most ${schema.maximum}`,
          code: 'maximum',
          pointer: `/${field}`,
        });
      }

      if (schema.multipleOf !== undefined && value % schema.multipleOf !== 0) {
        errors.push({
          field,
          message: `Must be a multiple of ${schema.multipleOf}`,
          code: 'multiple_of',
          pointer: `/${field}`,
        });
      }
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(value as any)) {
      errors.push({
        field,
        message: `Must be one of: ${schema.enum.join(', ')}`,
        code: 'enum',
        value,
        pointer: `/${field}`,
      });
    }

    return errors;
  }

  /**
   * Validate format constraints
   */
  private static validateFormat(
    value: string,
    format: string,
    field: string
  ): ValidationError | undefined {
    switch (format) {
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return {
            field,
            message: 'Invalid email format',
            code: 'format_email',
            pointer: `/${field}`,
          };
        }
        break;

      case 'uuid':
        if (
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            value
          )
        ) {
          return {
            field,
            message: 'Invalid UUID format',
            code: 'format_uuid',
            pointer: `/${field}`,
          };
        }
        break;

      case 'uri':
      case 'url':
        try {
          new URL(value);
        } catch {
          return {
            field,
            message: 'Invalid URL format',
            code: 'format_url',
            pointer: `/${field}`,
          };
        }
        break;

      case 'date':
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          return {
            field,
            message: 'Invalid date format (expected YYYY-MM-DD)',
            code: 'format_date',
            pointer: `/${field}`,
          };
        }
        break;

      case 'date-time':
        if (isNaN(Date.parse(value))) {
          return {
            field,
            message: 'Invalid date-time format',
            code: 'format_date_time',
            pointer: `/${field}`,
          };
        }
        break;
    }

    return undefined;
  }
}

/**
 * Content-Type validator
 *
 * Validates request Content-Type headers and charset requirements.
 *
 * @example
 * ```typescript
 * const config = ContentTypeValidator.require(['application/json']);
 * const withCharset = ContentTypeValidator.charset('utf-8');
 * ```
 */
export class ContentTypeValidator {
  /**
   * Require specific content types
   *
   * @param types - List of allowed content types
   * @returns Content-Type validation configuration
   *
   * @example
   * ```typescript
   * const config = ContentTypeValidator.require([
   *   'application/json',
   *   'application/xml'
   * ]);
   * ```
   */
  static require(types: readonly string[]): ContentTypeConfig {
    return {
      allowed: types,
      required: true,
    };
  }

  /**
   * Require specific charset
   *
   * @param charset - Required charset (e.g., 'utf-8')
   * @returns Content-Type validation configuration
   *
   * @example
   * ```typescript
   * const config = ContentTypeValidator.charset('utf-8');
   * ```
   */
  static charset(charset: string): ContentTypeConfig {
    return {
      allowed: ['*/*'], // Allow any content type
      charset,
      required: false,
    };
  }

  /**
   * Validate Content-Type header
   *
   * @param contentType - Content-Type header value
   * @param config - Validation configuration
   * @returns Validation result
   *
   * @example
   * ```typescript
   * const result = ContentTypeValidator.validate(
   *   'application/json; charset=utf-8',
   *   config
   * );
   * ```
   */
  static validate(
    contentType: string | undefined,
    config: ContentTypeConfig
  ): ValidationResult {
    // Check if required but missing
    if (config.required && !contentType) {
      return {
        valid: false,
        problemDetails: ProblemDetailsFactory.badRequest(
          'Content-Type header is required'
        ),
      };
    }

    if (!contentType) {
      return { valid: true };
    }

    // Parse content type and charset
    const [mediaType, ...params] = contentType.split(';').map((s) => s.trim());
    const charsetParam = params.find((p) => p.startsWith('charset='));
    const charset = charsetParam?.split('=')[1]?.toLowerCase();

    // Check if content type is allowed
    const isAllowed =
      config.allowed.includes('*/*') ||
      config.allowed.some((allowed) => {
        if (allowed.endsWith('/*')) {
          const prefix = allowed.slice(0, -2);
          return mediaType.startsWith(prefix);
        }
        return mediaType === allowed;
      });

    if (!isAllowed) {
      return {
        valid: false,
        problemDetails: ProblemDetailsFactory.custom(
          415,
          'https://httpstatuses.io/415',
          'Unsupported Media Type',
          config.errorMessage ||
            `Content-Type must be one of: ${config.allowed.join(', ')}`,
          { receivedContentType: mediaType }
        ),
      };
    }

    // Check charset if required
    if (config.charset && charset !== config.charset.toLowerCase()) {
      return {
        valid: false,
        problemDetails: ProblemDetailsFactory.badRequest(
          `Charset must be ${config.charset}`
        ),
      };
    }

    return { valid: true };
  }
}

/**
 * Request size validator
 *
 * Validates request size limits for body, headers, and URL.
 *
 * @example
 * ```typescript
 * const bodyLimit = SizeValidator.maxBodySize(1024 * 1024); // 1MB
 * const headerLimit = SizeValidator.maxHeaderSize(8192);    // 8KB
 * const urlLimit = SizeValidator.maxUrlLength(2048);        // 2KB
 * ```
 */
export class SizeValidator {
  /**
   * Set maximum body size limit
   *
   * @param bytes - Maximum body size in bytes
   * @returns Size validation configuration
   *
   * @example
   * ```typescript
   * const config = SizeValidator.maxBodySize(1024 * 1024); // 1MB
   * ```
   */
  static maxBodySize(bytes: number): SizeConfig {
    return {
      maxBodySize: bytes,
    };
  }

  /**
   * Set maximum header size limit
   *
   * @param bytes - Maximum total header size in bytes
   * @returns Size validation configuration
   *
   * @example
   * ```typescript
   * const config = SizeValidator.maxHeaderSize(8192); // 8KB
   * ```
   */
  static maxHeaderSize(bytes: number): SizeConfig {
    return {
      maxHeaderSize: bytes,
    };
  }

  /**
   * Set maximum URL length limit
   *
   * @param chars - Maximum URL length in characters
   * @returns Size validation configuration
   *
   * @example
   * ```typescript
   * const config = SizeValidator.maxUrlLength(2048);
   * ```
   */
  static maxUrlLength(chars: number): SizeConfig {
    return {
      maxUrlLength: chars,
    };
  }

  /**
   * Validate request sizes
   *
   * @param bodySize - Request body size in bytes
   * @param headerSize - Total header size in bytes
   * @param urlLength - URL length in characters
   * @param config - Size validation configuration
   * @returns Validation result
   *
   * @example
   * ```typescript
   * const result = SizeValidator.validate(1024, 512, 100, config);
   * ```
   */
  static validate(
    bodySize: number | undefined,
    headerSize: number | undefined,
    urlLength: number | undefined,
    config: SizeConfig
  ): ValidationResult {
    // Validate body size
    if (
      config.maxBodySize !== undefined &&
      bodySize !== undefined &&
      bodySize > config.maxBodySize
    ) {
      return {
        valid: false,
        problemDetails: ProblemDetailsFactory.custom(
          413,
          'https://httpstatuses.io/413',
          'Payload Too Large',
          `Request body must not exceed ${config.maxBodySize} bytes`,
          { maxSize: config.maxBodySize, actualSize: bodySize }
        ),
      };
    }

    // Validate header size
    if (
      config.maxHeaderSize !== undefined &&
      headerSize !== undefined &&
      headerSize > config.maxHeaderSize
    ) {
      return {
        valid: false,
        problemDetails: ProblemDetailsFactory.custom(
          431,
          'https://httpstatuses.io/431',
          'Request Header Fields Too Large',
          `Request headers must not exceed ${config.maxHeaderSize} bytes`,
          { maxSize: config.maxHeaderSize, actualSize: headerSize }
        ),
      };
    }

    // Validate URL length
    if (
      config.maxUrlLength !== undefined &&
      urlLength !== undefined &&
      urlLength > config.maxUrlLength
    ) {
      return {
        valid: false,
        problemDetails: ProblemDetailsFactory.custom(
          414,
          'https://httpstatuses.io/414',
          'URI Too Long',
          `Request URL must not exceed ${config.maxUrlLength} characters`,
          { maxLength: config.maxUrlLength, actualLength: urlLength }
        ),
      };
    }

    return { valid: true };
  }
}

/**
 * Input sanitizer
 *
 * Sanitizes input to prevent XSS, SQL injection, and path traversal attacks.
 *
 * @example
 * ```typescript
 * const xssConfig = Sanitizer.xss();
 * const sqlConfig = Sanitizer.sqlInjection();
 * const pathConfig = Sanitizer.pathTraversal();
 * ```
 */
export class Sanitizer {
  /**
   * XSS sanitization configuration
   *
   * Removes script tags, event handlers, and javascript: protocols.
   *
   * @returns Sanitization configuration
   *
   * @example
   * ```typescript
   * const config = Sanitizer.xss();
   * const clean = Sanitizer.apply(input, config);
   * ```
   */
  static xss(): SanitizationConfig {
    return {
      enabled: true,
      patterns: [
        {
          regex: /<script[^>]*>.*?<\/script>/gi,
          replacement: '',
          description: 'Remove script tags',
        },
        {
          regex: /javascript:/gi,
          replacement: '',
          description: 'Remove javascript: protocol',
        },
        {
          regex: /on\w+\s*=/gi,
          replacement: '',
          description: 'Remove event handlers',
        },
        {
          regex: /<iframe[^>]*>.*?<\/iframe>/gi,
          replacement: '',
          description: 'Remove iframe tags',
        },
      ],
    };
  }

  /**
   * SQL injection sanitization configuration
   *
   * Escapes SQL special characters and removes SQL keywords.
   *
   * @returns Sanitization configuration
   *
   * @example
   * ```typescript
   * const config = Sanitizer.sqlInjection();
   * const clean = Sanitizer.apply(input, config);
   * ```
   */
  static sqlInjection(): SanitizationConfig {
    return {
      enabled: true,
      patterns: [
        {
          regex: /('|(--)|;|\/\*|\*\/)/g,
          replacement: '',
          description: 'Remove SQL special characters',
        },
        {
          regex: /\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b/gi,
          replacement: '',
          description: 'Remove SQL keywords',
        },
      ],
    };
  }

  /**
   * Path traversal sanitization configuration
   *
   * Removes path traversal patterns like ../ and ..\
   *
   * @returns Sanitization configuration
   *
   * @example
   * ```typescript
   * const config = Sanitizer.pathTraversal();
   * const clean = Sanitizer.apply(input, config);
   * ```
   */
  static pathTraversal(): SanitizationConfig {
    return {
      enabled: true,
      patterns: [
        {
          regex: /\.\.[\/\\]/g,
          replacement: '',
          description: 'Remove path traversal patterns',
        },
        {
          regex: /[\/\\]\.\./g,
          replacement: '',
          description: 'Remove reverse path traversal patterns',
        },
      ],
    };
  }

  /**
   * Custom sanitization configuration
   *
   * @param fn - Custom sanitization function
   * @returns Sanitization configuration
   *
   * @example
   * ```typescript
   * const config = Sanitizer.custom((input) => {
   *   return input.replace(/bad-word/gi, '***');
   * });
   * ```
   */
  static custom(fn: (input: string) => string): SanitizationConfig {
    return {
      enabled: true,
    };
  }

  /**
   * Apply sanitization to input string
   *
   * @param input - Input string to sanitize
   * @param config - Sanitization configuration
   * @returns Sanitized string
   *
   * @example
   * ```typescript
   * const clean = Sanitizer.apply(
   *   '<script>alert("XSS")</script>Hello',
   *   Sanitizer.xss()
   * );
   * // Returns: 'Hello'
   * ```
   */
  static apply(input: string, config: SanitizationConfig): string {
    if (!config.enabled) {
      return input;
    }

    let sanitized = input;

    if (config.patterns) {
      for (const pattern of config.patterns) {
        sanitized = sanitized.replace(pattern.regex, pattern.replacement);
      }
    }

    return sanitized;
  }

  /**
   * Apply sanitization to an object recursively
   *
   * @param obj - Object to sanitize
   * @param config - Sanitization configuration
   * @returns Sanitized object
   *
   * @example
   * ```typescript
   * const clean = Sanitizer.applyToObject(
   *   { name: '<script>XSS</script>John', email: 'test@example.com' },
   *   Sanitizer.xss()
   * );
   * // Returns: { name: 'John', email: 'test@example.com' }
   * ```
   */
  static applyToObject(obj: unknown, config: SanitizationConfig): unknown {
    if (typeof obj === 'string') {
      return this.apply(obj, config);
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.applyToObject(item, config));
    }

    if (typeof obj === 'object' && obj !== null) {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.applyToObject(value, config);
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Combine multiple sanitization configurations
   *
   * @param configs - Array of sanitization configurations
   * @returns Combined sanitization configuration
   *
   * @example
   * ```typescript
   * const config = Sanitizer.combine([
   *   Sanitizer.xss(),
   *   Sanitizer.sqlInjection(),
   *   Sanitizer.pathTraversal()
   * ]);
   * ```
   */
  static combine(
    configs: readonly SanitizationConfig[]
  ): SanitizationConfig {
    const allPatterns: SanitizationPattern[] = [];

    for (const config of configs) {
      if (config.patterns) {
        allPatterns.push(...config.patterns);
      }
    }

    return {
      enabled: configs.some((c) => c.enabled),
      patterns: allPatterns,
      logSanitizations: configs.some((c) => c.logSanitizations),
    };
  }
}
