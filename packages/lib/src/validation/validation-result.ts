/**
 * Validation result severity levels
 */
export enum ValidationSeverity {
  /**
   * Critical error - deployment will fail
   */
  ERROR = 'error',

  /**
   * Warning - deployment may succeed but could cause runtime issues
   */
  WARNING = 'warning',

  /**
   * Informational - best practice recommendation
   */
  INFO = 'info',
}

/**
 * Result of a validation check
 */
export interface ValidationResult {
  /**
   * Whether the validation passed
   */
  valid: boolean;

  /**
   * Severity level of the result
   */
  severity: ValidationSeverity;

  /**
   * Validation rule name that produced this result
   */
  ruleName: string;

  /**
   * Human-readable message describing the issue
   */
  message?: string;

  /**
   * Suggested fix or remediation
   */
  suggestion?: string;

  /**
   * Additional contextual details
   */
  details?: string;

  /**
   * Path to the resource or property with the issue
   */
  path?: string;
}

/**
 * Builder for creating validation results
 */
export class ValidationResultBuilder {
  private result: ValidationResult;

  constructor(ruleName: string, severity: ValidationSeverity) {
    this.result = {
      valid: true,
      severity,
      ruleName,
    };
  }

  /**
   * Mark validation as failed
   */
  invalid(): this {
    this.result.valid = false;
    return this;
  }

  /**
   * Set error message
   */
  withMessage(message: string): this {
    this.result.message = message;
    return this;
  }

  /**
   * Set suggestion for fixing the issue
   */
  withSuggestion(suggestion: string): this {
    this.result.suggestion = suggestion;
    return this;
  }

  /**
   * Set additional details
   */
  withDetails(details: string): this {
    this.result.details = details;
    return this;
  }

  /**
   * Set resource path
   */
  withPath(path: string): this {
    this.result.path = path;
    return this;
  }

  /**
   * Build and return the validation result
   */
  build(): ValidationResult {
    return this.result;
  }

  /**
   * Create an error result
   */
  static error(ruleName: string): ValidationResultBuilder {
    return new ValidationResultBuilder(ruleName, ValidationSeverity.ERROR).invalid();
  }

  /**
   * Create a warning result
   */
  static warning(ruleName: string): ValidationResultBuilder {
    return new ValidationResultBuilder(ruleName, ValidationSeverity.WARNING);
  }

  /**
   * Create an info result
   */
  static info(ruleName: string): ValidationResultBuilder {
    return new ValidationResultBuilder(ruleName, ValidationSeverity.INFO);
  }

  /**
   * Create a success result
   */
  static success(ruleName: string): ValidationResultBuilder {
    return new ValidationResultBuilder(ruleName, ValidationSeverity.INFO);
  }
}
