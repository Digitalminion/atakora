/**
 * Validation result severity levels
 */
export enum ValidationSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

/**
 * Validation result
 */
export interface ValidationResult {
  severity: ValidationSeverity;
  code: string;
  message: string;
  target?: string;
  line?: number;
  suggestion?: string;
}

/**
 * Validation context containing template and metadata
 */
export interface ValidationContext {
  template: Record<string, unknown>;
  templatePath: string;
  subscriptionId?: string;
  resourceGroupName?: string;
}

/**
 * Base validator interface
 */
export interface Validator {
  name: string;
  validate(context: ValidationContext): ValidationResult[];
}
