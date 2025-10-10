/**
 * OpenAPI schema validator using AJV.
 *
 * Provides comprehensive validation for:
 * - OpenAPI specifications
 * - Request data against schemas
 * - Response data against schemas
 * - Custom error formatting with detailed messages
 */

import Ajv, { ErrorObject, ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import {
  OpenApiDefinition,
  JsonSchema,
  ValidationResult,
  ValidationError,
  ProblemDetails,
  ValidationProblemDetails,
} from './types';

/**
 * Validator options for customizing validation behavior.
 */
export interface ValidatorOptions {
  readonly strict?: boolean;
  readonly allErrors?: boolean;
  readonly validateFormats?: boolean;
  readonly removeAdditional?: boolean | 'all' | 'failing';
  readonly useDefaults?: boolean;
  readonly coerceTypes?: boolean | 'array';
  readonly verbose?: boolean;
}

/**
 * OpenAPI schema validator using AJV.
 *
 * Features:
 * - JSON Schema Draft 2020-12 support (OpenAPI 3.1)
 * - Format validation (email, uuid, date-time, etc.)
 * - Custom error messages for better DX
 * - Azure extension support (x-ms-*)
 * - Government cloud compatible
 */
export class OpenApiSchemaValidator {
  private readonly ajv: Ajv;
  private readonly validatorCache = new Map<string, ValidateFunction>();
  private readonly options: Required<ValidatorOptions>;

  constructor(options: ValidatorOptions = {}) {
    this.options = {
      strict: options.strict ?? true,
      allErrors: options.allErrors ?? true,
      validateFormats: options.validateFormats ?? true,
      removeAdditional: options.removeAdditional ?? false,
      useDefaults: options.useDefaults ?? false,
      coerceTypes: options.coerceTypes ?? false,
      verbose: options.verbose ?? false,
    };

    // Initialize AJV with OpenAPI-compatible settings
    this.ajv = new Ajv({
      strict: this.options.strict,
      allErrors: this.options.allErrors,
      validateFormats: this.options.validateFormats,
      removeAdditional: this.options.removeAdditional,
      useDefaults: this.options.useDefaults,
      coerceTypes: this.options.coerceTypes,
      verbose: this.options.verbose,
      // Support both draft-07 (OpenAPI 3.0) and draft 2020-12 (OpenAPI 3.1)
      strictSchema: false,
      keywords: [],
    });

    // Add standard format validators
    addFormats(this.ajv);

    // Add Azure-specific keywords
    this.addAzureKeywords();

    // Add OpenAPI-specific keywords
    this.addOpenApiKeywords();
  }

  /**
   * Validate an OpenAPI specification.
   *
   * @param spec - OpenAPI specification to validate
   * @returns Validation result
   */
  validateSpec(spec: OpenApiDefinition): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate OpenAPI version
    if (!spec.openapi) {
      errors.push({
        path: '/openapi',
        message: 'OpenAPI version is required',
        keyword: 'required',
        params: { missingProperty: 'openapi' },
      });
    } else if (!spec.openapi.match(/^3\.[01]\.\d+$/)) {
      errors.push({
        path: '/openapi',
        message: `Unsupported OpenAPI version: ${spec.openapi}. Expected 3.0.x or 3.1.x`,
        keyword: 'format',
        value: spec.openapi,
      });
    }

    // Validate info object
    if (!spec.info) {
      errors.push({
        path: '/info',
        message: 'Info object is required',
        keyword: 'required',
        params: { missingProperty: 'info' },
      });
    } else {
      if (!spec.info.title) {
        errors.push({
          path: '/info/title',
          message: 'Info title is required',
          keyword: 'required',
          params: { missingProperty: 'title' },
        });
      }
      if (!spec.info.version) {
        errors.push({
          path: '/info/version',
          message: 'Info version is required',
          keyword: 'required',
          params: { missingProperty: 'version' },
        });
      }
    }

    // Validate paths
    if (!spec.paths && !spec['x-ms-paths']) {
      errors.push({
        path: '/paths',
        message: 'Paths object is required (or x-ms-paths for Azure)',
        keyword: 'required',
        params: { missingProperty: 'paths' },
      });
    }

    // Validate schemas in components
    if (spec.components?.schemas) {
      for (const [name, schema] of Object.entries(spec.components.schemas)) {
        const schemaErrors = this.validateSchemaDefinition(schema, `/components/schemas/${name}`);
        errors.push(...schemaErrors);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate request data against a schema.
   *
   * @param request - Request data to validate
   * @param schema - JSON schema to validate against
   * @returns Validation result
   */
  validateRequest(request: unknown, schema: JsonSchema): ValidationResult {
    return this.validate(request, schema, 'request');
  }

  /**
   * Validate response data against a schema.
   *
   * @param response - Response data to validate
   * @param schema - JSON schema to validate against
   * @returns Validation result
   */
  validateResponse(response: unknown, schema: JsonSchema): ValidationResult {
    return this.validate(response, schema, 'response');
  }

  /**
   * Validate data against a schema.
   *
   * @param data - Data to validate
   * @param schema - JSON schema to validate against
   * @param context - Context for error messages
   * @returns Validation result
   */
  validate(data: unknown, schema: JsonSchema, context: string = 'data'): ValidationResult {
    // Get or compile validator
    const schemaKey = JSON.stringify(schema);
    let validator = this.validatorCache.get(schemaKey);

    if (!validator) {
      try {
        validator = this.ajv.compile(schema);
        this.validatorCache.set(schemaKey, validator);
      } catch (error) {
        return {
          valid: false,
          errors: [
            {
              path: '/',
              message: `Invalid schema: ${error instanceof Error ? error.message : String(error)}`,
              keyword: 'schema',
            },
          ],
        };
      }
    }

    // Validate data
    const valid = validator(data);

    if (valid) {
      return { valid: true, errors: [] };
    }

    // Format errors
    const errors = this.formatErrors(validator.errors || [], context);

    return {
      valid: false,
      errors,
    };
  }

  /**
   * Format AJV errors into detailed validation errors.
   *
   * @param errors - AJV errors
   * @param context - Context for error messages
   * @returns Formatted validation errors
   */
  formatErrors(errors: ErrorObject[], context: string = 'data'): ValidationError[] {
    return errors.map((error) => this.formatError(error, context));
  }

  /**
   * Format a single AJV error.
   */
  private formatError(error: ErrorObject, context: string): ValidationError {
    const path = error.instancePath || '/';
    const value = error.data;

    // Generate human-readable message
    let message = error.message || 'Validation failed';

    switch (error.keyword) {
      case 'required':
        message = `Missing required property: ${error.params.missingProperty}`;
        break;

      case 'type':
        message = `Invalid type. Expected ${error.params.type}, got ${typeof value}`;
        break;

      case 'minLength':
        message = `String is too short. Minimum length: ${error.params.limit}, actual: ${
          typeof value === 'string' ? value.length : 0
        }`;
        break;

      case 'maxLength':
        message = `String is too long. Maximum length: ${error.params.limit}, actual: ${
          typeof value === 'string' ? value.length : 0
        }`;
        break;

      case 'pattern':
        message = `String does not match pattern: ${error.params.pattern}`;
        break;

      case 'format':
        message = `Invalid ${error.params.format} format`;
        break;

      case 'minimum':
        message = `Value is too small. Minimum: ${error.params.limit}, actual: ${value}`;
        break;

      case 'maximum':
        message = `Value is too large. Maximum: ${error.params.limit}, actual: ${value}`;
        break;

      case 'minItems':
        message = `Array is too short. Minimum items: ${error.params.limit}, actual: ${
          Array.isArray(value) ? value.length : 0
        }`;
        break;

      case 'maxItems':
        message = `Array is too long. Maximum items: ${error.params.limit}, actual: ${
          Array.isArray(value) ? value.length : 0
        }`;
        break;

      case 'uniqueItems':
        message = `Array items must be unique. Duplicate at index: ${error.params.i}`;
        break;

      case 'enum':
        message = `Invalid value. Allowed values: ${error.params.allowedValues?.join(', ')}`;
        break;

      case 'const':
        message = `Value must be: ${error.params.allowedValue}`;
        break;

      case 'additionalProperties':
        message = `Additional property not allowed: ${error.params.additionalProperty}`;
        break;

      case 'oneOf':
        message = `Value must match exactly one schema. Matched: ${error.params.passingSchemas?.length || 0}`;
        break;

      case 'anyOf':
        message = `Value must match at least one schema`;
        break;

      case 'allOf':
        message = `Value must match all schemas`;
        break;
    }

    return {
      path,
      message,
      keyword: error.keyword,
      params: error.params,
      value,
      constraint: error.params?.limit ?? error.params?.pattern ?? error.params?.allowedValue,
    };
  }

  /**
   * Convert validation errors to RFC 7807 Problem Details.
   *
   * @param errors - Validation errors
   * @param status - HTTP status code
   * @param instance - Request instance URI
   * @returns Problem details object
   */
  toProblemDetails(
    errors: readonly ValidationError[],
    status: number = 400,
    instance?: string
  ): ValidationProblemDetails {
    return {
      type: 'https://atakora.dev/problems/validation-error',
      title: 'Validation Error',
      status,
      detail: `Validation failed with ${errors.length} error${errors.length === 1 ? '' : 's'}`,
      instance,
      errors,
    };
  }

  /**
   * Validate a schema definition itself.
   */
  private validateSchemaDefinition(schema: unknown, path: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!schema || typeof schema !== 'object') {
      errors.push({
        path,
        message: 'Schema must be an object',
        keyword: 'type',
        value: schema,
      });
      return errors;
    }

    // Check for $ref - if present, no other properties should exist (OpenAPI 3.0)
    const schemaObj = schema as Record<string, unknown>;
    if ('$ref' in schemaObj) {
      const otherProps = Object.keys(schemaObj).filter((k) => k !== '$ref');
      if (otherProps.length > 0) {
        errors.push({
          path,
          message: `Schema with $ref should not have other properties: ${otherProps.join(', ')}`,
          keyword: 'ref',
        });
      }
    }

    return errors;
  }

  /**
   * Add Azure-specific keywords to AJV.
   */
  private addAzureKeywords(): void {
    // x-ms-enum: Azure enum metadata
    this.ajv.addKeyword({
      keyword: 'x-ms-enum',
      schemaType: 'object',
      metaSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          modelAsString: { type: 'boolean' },
          values: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                value: { type: 'string' },
                description: { type: 'string' },
                name: { type: 'string' },
              },
              required: ['value'],
            },
          },
        },
        required: ['name'],
      },
    });

    // x-ms-discriminator-value: Polymorphic type discriminator
    this.ajv.addKeyword({
      keyword: 'x-ms-discriminator-value',
      schemaType: 'string',
    });

    // x-ms-client-flatten: Flatten nested properties
    this.ajv.addKeyword({
      keyword: 'x-ms-client-flatten',
      schemaType: 'boolean',
    });

    // x-ms-azure-resource: Mark as Azure resource
    this.ajv.addKeyword({
      keyword: 'x-ms-azure-resource',
      schemaType: 'boolean',
    });

    // x-ms-mutability: Property mutability
    this.ajv.addKeyword({
      keyword: 'x-ms-mutability',
      schemaType: 'array',
    });
  }

  /**
   * Add OpenAPI-specific keywords to AJV.
   */
  private addOpenApiKeywords(): void {
    // OpenAPI 3.0 nullable (deprecated in 3.1)
    this.ajv.addKeyword({
      keyword: 'nullable',
      schemaType: 'boolean',
      compile: (nullable: boolean) => {
        return (data: unknown) => {
          if (nullable && data === null) {
            return true;
          }
          return data !== null;
        };
      },
    });

    // Discriminator
    this.ajv.addKeyword({
      keyword: 'discriminator',
      schemaType: 'object',
    });

    // Example (not validated, just metadata)
    this.ajv.addKeyword({
      keyword: 'example',
    });

    // Examples
    this.ajv.addKeyword({
      keyword: 'examples',
      schemaType: 'array',
    });

    // XML metadata
    this.ajv.addKeyword({
      keyword: 'xml',
      schemaType: 'object',
    });

    // External docs
    this.ajv.addKeyword({
      keyword: 'externalDocs',
      schemaType: 'object',
    });
  }

  /**
   * Clear the validator cache.
   */
  clearCache(): void {
    this.validatorCache.clear();
  }

  /**
   * Get the underlying AJV instance for advanced usage.
   */
  getAjv(): Ajv {
    return this.ajv;
  }

  /**
   * Create a validator with Government cloud defaults.
   */
  static createGovernmentCloudValidator(): OpenApiSchemaValidator {
    return new OpenApiSchemaValidator({
      strict: true,
      allErrors: true,
      validateFormats: true,
      removeAdditional: false,
      useDefaults: false,
      coerceTypes: false,
      verbose: true,
    });
  }
}

/**
 * Helper function to extract constraints from a schema.
 */
export function extractConstraints(schema: JsonSchema): Record<string, unknown> {
  const constraints: Record<string, unknown> = {};

  // String constraints
  if (schema.minLength !== undefined) constraints.minLength = schema.minLength;
  if (schema.maxLength !== undefined) constraints.maxLength = schema.maxLength;
  if (schema.pattern !== undefined) constraints.pattern = schema.pattern;
  if (schema.format !== undefined) constraints.format = schema.format;

  // Number constraints
  if (schema.minimum !== undefined) constraints.minimum = schema.minimum;
  if (schema.maximum !== undefined) constraints.maximum = schema.maximum;
  if (schema.exclusiveMinimum !== undefined) {
    constraints.exclusiveMinimum = schema.exclusiveMinimum;
  }
  if (schema.exclusiveMaximum !== undefined) {
    constraints.exclusiveMaximum = schema.exclusiveMaximum;
  }
  if (schema.multipleOf !== undefined) constraints.multipleOf = schema.multipleOf;

  // Array constraints
  if (schema.minItems !== undefined) constraints.minItems = schema.minItems;
  if (schema.maxItems !== undefined) constraints.maxItems = schema.maxItems;
  if (schema.uniqueItems !== undefined) constraints.uniqueItems = schema.uniqueItems;

  // Object constraints
  if (schema.minProperties !== undefined) constraints.minProperties = schema.minProperties;
  if (schema.maxProperties !== undefined) constraints.maxProperties = schema.maxProperties;
  if (schema.required !== undefined) constraints.required = schema.required;

  return constraints;
}
