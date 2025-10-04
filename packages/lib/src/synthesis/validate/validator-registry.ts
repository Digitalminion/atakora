import { ArmTemplate, ValidationResult, ValidationError, ValidationSeverity } from '../types';

/**
 * Base validator interface
 */
export interface Validator {
  /**
   * Validator name
   */
  readonly name: string;

  /**
   * Validate an ARM template
   *
   * @param template - ARM template to validate
   * @param stackName - Name of the stack being validated
   * @returns Validation result
   */
  validate(template: ArmTemplate, stackName: string): Promise<ValidationResult> | ValidationResult;
}

/**
 * Registry for managing validators
 */
export class ValidatorRegistry {
  private validators: Validator[] = [];

  /**
   * Register a validator
   *
   * @param validator - Validator to register
   */
  register(validator: Validator): void {
    this.validators.push(validator);
  }

  /**
   * Validate a template using all registered validators
   *
   * @param template - ARM template to validate
   * @param stackName - Name of the stack being validated
   * @returns Combined validation result
   */
  async validateAll(template: ArmTemplate, stackName: string): Promise<ValidationResult> {
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationError[] = [];

    for (const validator of this.validators) {
      const result = await validator.validate(template, stackName);

      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
    };
  }

  /**
   * Get all registered validators
   */
  getValidators(): readonly Validator[] {
    return this.validators;
  }

  /**
   * Clear all validators
   */
  clear(): void {
    this.validators = [];
  }

  /**
   * Create a default validator registry with common validators
   */
  static createDefault(): ValidatorRegistry {
    const registry = new ValidatorRegistry();
    // Validators will be added when implemented
    return registry;
  }
}

/**
 * Base abstract validator class
 */
export abstract class BaseValidator implements Validator {
  abstract readonly name: string;

  abstract validate(template: ArmTemplate, stackName: string): ValidationResult;

  /**
   * Create an error
   */
  protected createError(
    message: string,
    path?: string,
    code?: string,
    suggestion?: string
  ): ValidationError {
    return {
      severity: ValidationSeverity.ERROR,
      message,
      path,
      code,
      suggestion,
    };
  }

  /**
   * Create a warning
   */
  protected createWarning(
    message: string,
    path?: string,
    code?: string,
    suggestion?: string
  ): ValidationError {
    return {
      severity: ValidationSeverity.WARNING,
      message,
      path,
      code,
      suggestion,
    };
  }

  /**
   * Create an info message
   */
  protected createInfo(
    message: string,
    path?: string,
    code?: string
  ): ValidationError {
    return {
      severity: ValidationSeverity.INFO,
      message,
      path,
      code,
    };
  }
}
