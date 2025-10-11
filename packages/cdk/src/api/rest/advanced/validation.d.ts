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
import { ProblemDetails, ValidationError } from './problem-details';
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
export declare class JsonSchemaValidator {
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
    static validate(schema: JsonSchema, strict?: boolean): ValidationConfig;
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
    static custom(validator: CustomValidator): ValidationConfig;
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
    private static makeStrict;
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
    static validateData(data: unknown, config: ValidationConfig): ValidationResult;
    /**
     * Validate type of data
     */
    private static validateType;
    /**
     * Validate a single property
     */
    private static validateProperty;
    /**
     * Validate format constraints
     */
    private static validateFormat;
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
export declare class ContentTypeValidator {
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
    static require(types: readonly string[]): ContentTypeConfig;
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
    static charset(charset: string): ContentTypeConfig;
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
    static validate(contentType: string | undefined, config: ContentTypeConfig): ValidationResult;
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
export declare class SizeValidator {
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
    static maxBodySize(bytes: number): SizeConfig;
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
    static maxHeaderSize(bytes: number): SizeConfig;
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
    static maxUrlLength(chars: number): SizeConfig;
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
    static validate(bodySize: number | undefined, headerSize: number | undefined, urlLength: number | undefined, config: SizeConfig): ValidationResult;
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
export declare class Sanitizer {
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
    static xss(): SanitizationConfig;
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
    static sqlInjection(): SanitizationConfig;
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
    static pathTraversal(): SanitizationConfig;
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
    static custom(fn: (input: string) => string): SanitizationConfig;
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
    static apply(input: string, config: SanitizationConfig): string;
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
    static applyToObject(obj: unknown, config: SanitizationConfig): unknown;
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
    static combine(configs: readonly SanitizationConfig[]): SanitizationConfig;
}
//# sourceMappingURL=validation.d.ts.map