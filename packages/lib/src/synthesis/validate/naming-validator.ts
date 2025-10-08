import { ArmTemplate, ValidationResult } from '../types';
import { BaseValidator } from './validator-registry';

/**
 * Azure resource naming rules
 */
interface NamingRule {
  maxLength: number;
  minLength?: number;
  allowedPattern?: RegExp;
  allowedChars?: string;
  examples?: string[];
}

/**
 * Validates Azure resource naming conventions
 */
export class NamingValidator extends BaseValidator {
  readonly name = 'NamingValidator';

  private namingRules: Record<string, NamingRule> = {
    'Microsoft.Storage/storageAccounts': {
      maxLength: 24,
      minLength: 3,
      allowedPattern: /^[a-z0-9]+$/,
      allowedChars: 'lowercase letters and numbers only',
      examples: ['mystorageaccount', 'storage123'],
    },
    'Microsoft.Resources/resourceGroups': {
      maxLength: 90,
      minLength: 1,
      allowedPattern: /^[\w\-().]+$/,
      allowedChars: 'alphanumerics, hyphens, periods, parentheses, underscores',
      examples: ['my-resource-group', 'rg_prod'],
    },
    'Microsoft.Network/virtualNetworks': {
      maxLength: 64,
      minLength: 1,
      allowedPattern: /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9_]$/,
      allowedChars: 'alphanumerics, hyphens, periods, underscores',
      examples: ['my-vnet', 'vnet-prod-001'],
    },
    'Microsoft.Compute/virtualMachines': {
      maxLength: 64,
      minLength: 1,
      allowedPattern: /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/,
      allowedChars: 'alphanumerics and hyphens',
      examples: ['my-vm', 'vm-prod-001'],
    },
    'Microsoft.KeyVault/vaults': {
      maxLength: 24,
      minLength: 3,
      allowedPattern: /^[a-zA-Z][a-zA-Z0-9-]*[a-zA-Z0-9]$/,
      allowedChars: 'alphanumerics and hyphens, must start with letter',
      examples: ['my-keyvault', 'kv-prod-001'],
    },
  };

  validate(template: ArmTemplate, stackName: string): ValidationResult {
    const errors = [];
    const warnings = [];

    for (const resource of template.resources) {
      const rule = this.namingRules[resource.type];

      if (!rule) {
        // No specific rule for this resource type
        // Apply generic validation
        this.validateGenericName(resource.name, resource.type, errors, warnings);
        continue;
      }

      // Validate length
      if (resource.name.length > rule.maxLength) {
        errors.push(
          this.createError(
            `Resource name '${resource.name}' exceeds maximum length of ${rule.maxLength} characters`,
            `resources/${resource.name}`,
            'NAME_TOO_LONG',
            `Shorten the name to ${rule.maxLength} characters or fewer. Examples: ${rule.examples?.join(', ')}`
          )
        );
      }

      if (rule.minLength && resource.name.length < rule.minLength) {
        errors.push(
          this.createError(
            `Resource name '${resource.name}' is shorter than minimum length of ${rule.minLength} characters`,
            `resources/${resource.name}`,
            'NAME_TOO_SHORT'
          )
        );
      }

      // Validate pattern
      if (rule.allowedPattern && !rule.allowedPattern.test(resource.name)) {
        errors.push(
          this.createError(
            `Resource name '${resource.name}' contains invalid characters. ${rule.allowedChars ? `Allowed: ${rule.allowedChars}` : ''}`,
            `resources/${resource.name}`,
            'INVALID_NAME_FORMAT',
            rule.examples ? `Try names like: ${rule.examples.join(', ')}` : undefined
          )
        );
      }

      // Check for common issues
      if (resource.name.startsWith('-') || resource.name.endsWith('-')) {
        warnings.push(
          this.createWarning(
            `Resource name '${resource.name}' starts or ends with a hyphen, which may not be allowed`,
            `resources/${resource.name}`,
            'NAME_HYPHEN_EDGE'
          )
        );
      }

      if (resource.name.includes('__')) {
        warnings.push(
          this.createWarning(
            `Resource name '${resource.name}' contains consecutive underscores`,
            `resources/${resource.name}`,
            'NAME_DOUBLE_UNDERSCORE'
          )
        );
      }

      if (resource.name.includes('--')) {
        warnings.push(
          this.createWarning(
            `Resource name '${resource.name}' contains consecutive hyphens`,
            `resources/${resource.name}`,
            'NAME_DOUBLE_HYPHEN'
          )
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate generic resource name (when no specific rule exists)
   */
  private validateGenericName(
    name: string,
    resourceType: string,
    errors: any[],
    warnings: any[]
  ): void {
    // Check if this is a child resource (contains /)
    const isChildResource = name.includes('/');

    if (isChildResource) {
      // Child resources use parent/child format - validate each part separately
      const parts = name.split('/');

      // Validate parent name doesn't exceed reasonable length
      if (parts[0].length > 64) {
        warnings.push(
          this.createWarning(
            `Parent resource name '${parts[0]}' in '${name}' exceeds recommended maximum length of 64 characters`,
            `resources/${name}`,
            'NAME_TOO_LONG',
            'Consider shortening the parent resource name'
          )
        );
      }

      // Validate child name doesn't exceed reasonable length
      if (parts[1] && parts[1].length > 64) {
        warnings.push(
          this.createWarning(
            `Child resource name '${parts[1]}' in '${name}' exceeds recommended maximum length of 64 characters`,
            `resources/${name}`,
            'NAME_TOO_LONG',
            'Consider shortening the child resource name'
          )
        );
      }

      // Validate each part for special characters (excluding the / separator)
      for (let i = 0; i < parts.length; i++) {
        if (!/^[a-zA-Z0-9._-]+$/.test(parts[i])) {
          warnings.push(
            this.createWarning(
              `Resource name part '${parts[i]}' contains special characters that may not be allowed for type ${resourceType}`,
              `resources/${name}`,
              'NAME_SPECIAL_CHARS'
            )
          );
        }
      }

      return;
    }

    // Standard resource validation (not a child resource)

    // Generic maximum length - only warn for long names
    if (name.length > 64) {
      warnings.push(
        this.createWarning(
          `Resource name '${name}' exceeds recommended maximum length of 64 characters`,
          `resources/${name}`,
          'NAME_TOO_LONG',
          'Consider shortening the name to 64 characters or fewer'
        )
      );
    }

    // Check for empty name
    if (name.length === 0) {
      errors.push(
        this.createError('Resource name cannot be empty', `resources/${name}`, 'NAME_EMPTY')
      );
    }

    // Check for special characters
    if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
      warnings.push(
        this.createWarning(
          `Resource name '${name}' contains special characters that may not be allowed for type ${resourceType}`,
          `resources/${name}`,
          'NAME_SPECIAL_CHARS'
        )
      );
    }
  }
}
