import Ajv, { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { ArmTemplate, ValidationResult } from '../types';
import { BaseValidator } from './validator-registry';

/**
 * ARM template JSON schema
 */
const ARM_TEMPLATE_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['$schema', 'contentVersion', 'resources'],
  properties: {
    $schema: {
      type: 'string',
      format: 'uri',
    },
    contentVersion: {
      type: 'string',
      pattern: '^[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+$',
    },
    parameters: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        required: ['type'],
        properties: {
          type: {
            enum: ['string', 'int', 'bool', 'object', 'array', 'secureString', 'secureObject'],
          },
          defaultValue: {},
          allowedValues: {
            type: 'array',
          },
          minValue: {
            type: 'number',
          },
          maxValue: {
            type: 'number',
          },
          minLength: {
            type: 'number',
          },
          maxLength: {
            type: 'number',
          },
          metadata: {
            type: 'object',
          },
        },
      },
    },
    variables: {
      type: 'object',
    },
    resources: {
      type: 'array',
      items: {
        type: 'object',
        required: ['type', 'apiVersion', 'name'],
        properties: {
          type: {
            type: 'string',
          },
          apiVersion: {
            type: 'string',
          },
          name: {
            type: 'string',
          },
          location: {
            type: 'string',
          },
          tags: {
            type: 'object',
            additionalProperties: {
              type: 'string',
            },
          },
          dependsOn: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          properties: {
            type: 'object',
          },
          sku: {
            type: 'object',
          },
          kind: {
            type: 'string',
          },
          identity: {
            type: 'object',
          },
        },
      },
    },
    outputs: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        required: ['type', 'value'],
        properties: {
          type: {
            enum: ['string', 'int', 'bool', 'object', 'array'],
          },
          value: {},
          metadata: {
            type: 'object',
          },
        },
      },
    },
  },
};

/**
 * Validates ARM templates against JSON schemas
 */
export class SchemaValidator extends BaseValidator {
  readonly name = 'SchemaValidator';
  private ajv: Ajv;

  constructor() {
    super();
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false,
    });
    // Working around ajv-formats compatibility issue
    // Ensure opts and opts.code exist before calling addFormats
    if (!this.ajv.opts) {
      // @ts-ignore - opts may not be defined in type definitions
      this.ajv.opts = { code: {} };
    } else if (!this.ajv.opts.code) {
      // @ts-ignore - opts.code may not be defined in type definitions
      this.ajv.opts.code = {};
    }
    // Disable format limit keywords to avoid additional compatibility issues
    // We only need basic format validation for ARM templates
    addFormats(this.ajv, { keywords: false });
  }

  validate(template: ArmTemplate, stackName: string): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Validate against ARM template schema
    const validate = this.ajv.compile(ARM_TEMPLATE_SCHEMA);
    const valid = validate(template);

    if (!valid && validate.errors) {
      for (const error of validate.errors) {
        errors.push(
          this.createError(
            this.formatAjvError(error),
            this.getErrorPath(error, stackName),
            'SCHEMA_VALIDATION_ERROR',
            this.getErrorSuggestion(error)
          )
        );
      }
    }

    // Additional custom validations
    this.validateCustomRules(template, stackName, errors, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Format Ajv error message
   */
  private formatAjvError(error: ErrorObject): string {
    const path = error.instancePath || 'template';
    const message = error.message || 'Validation error';

    switch (error.keyword) {
      case 'required':
        return `Missing required property: ${error.params.missingProperty}`;
      case 'type':
        return `Expected type ${error.params.type} at ${path}`;
      case 'enum':
        return `Value must be one of: ${error.params.allowedValues?.join(', ')}`;
      case 'pattern':
        return `Value at ${path} does not match required pattern`;
      case 'format':
        return `Invalid format at ${path}: expected ${error.params.format}`;
      default:
        return `${path}: ${message}`;
    }
  }

  /**
   * Get error path
   */
  private getErrorPath(error: ErrorObject, stackName: string): string {
    if (!error.instancePath) {
      return stackName;
    }
    return `${stackName}${error.instancePath}`;
  }

  /**
   * Get error suggestion
   */
  private getErrorSuggestion(error: ErrorObject): string | undefined {
    switch (error.keyword) {
      case 'required':
        return `Add the required property '${error.params.missingProperty}' to the object`;
      case 'enum':
        return `Use one of the allowed values: ${error.params.allowedValues?.join(', ')}`;
      case 'pattern':
        return 'Ensure the value matches the expected pattern';
      default:
        return undefined;
    }
  }

  /**
   * Custom validation rules
   */
  private validateCustomRules(
    template: ArmTemplate,
    stackName: string,
    errors: any[],
    warnings: any[]
  ): void {
    // Check for empty resources array
    if (template.resources && template.resources.length === 0) {
      warnings.push(
        this.createWarning(
          'Template contains no resources',
          stackName,
          'EMPTY_TEMPLATE'
        )
      );
    }

    // Check for duplicate resource names
    const resourceNames = new Set<string>();
    if (template.resources) {
      for (const resource of template.resources) {
        if (resourceNames.has(resource.name)) {
          errors.push(
            this.createError(
              `Duplicate resource name: ${resource.name}`,
              `${stackName}/resources/${resource.name}`,
              'DUPLICATE_RESOURCE_NAME',
              'Each resource must have a unique name within the template'
            )
          );
        }
        resourceNames.add(resource.name);
      }
    }

    // Check $schema format
    if (template.$schema && !template.$schema.startsWith('https://')) {
      warnings.push(
        this.createWarning(
          'Template $schema should use HTTPS',
          `${stackName}/$schema`,
          'SCHEMA_HTTP'
        )
      );
    }

    // Validate contentVersion format
    if (!/^\d+\.\d+\.\d+\.\d+$/.test(template.contentVersion)) {
      warnings.push(
        this.createWarning(
          `Content version '${template.contentVersion}' does not follow recommended format (e.g., 1.0.0.0)`,
          `${stackName}/contentVersion`,
          'INVALID_CONTENT_VERSION'
        )
      );
    }
  }
}
