import { ValidationRule, ValidationContext } from './validation-rule';
import { ValidationResult, ValidationSeverity } from './validation-result';

/**
 * Registry for validation rules
 */
export class ValidatorRegistry {
  private static instance: ValidatorRegistry;
  private rules: Map<string, ValidationRule[]> = new Map();
  private globalRules: ValidationRule[] = [];

  private constructor() {}

  /**
   * Get the singleton instance
   */
  static getInstance(): ValidatorRegistry {
    if (!ValidatorRegistry.instance) {
      ValidatorRegistry.instance = new ValidatorRegistry();
    }
    return ValidatorRegistry.instance;
  }

  /**
   * Register a validation rule for a specific resource type
   * @param resourceType - ARM resource type (e.g., 'Microsoft.Network/virtualNetworks')
   * @param rule - Validation rule to register
   */
  register(resourceType: string, rule: ValidationRule): void {
    if (!this.rules.has(resourceType)) {
      this.rules.set(resourceType, []);
    }
    this.rules.get(resourceType)!.push(rule);
  }

  /**
   * Register a global validation rule that applies to all resources
   * @param rule - Validation rule to register
   */
  registerGlobal(rule: ValidationRule): void {
    this.globalRules.push(rule);
  }

  /**
   * Register multiple rules at once
   * @param resourceType - ARM resource type
   * @param rules - Array of validation rules
   */
  registerMany(resourceType: string, rules: ValidationRule[]): void {
    rules.forEach((rule) => this.register(resourceType, rule));
  }

  /**
   * Get all rules for a resource type
   * @param resourceType - ARM resource type
   * @returns Array of validation rules
   */
  getRules(resourceType: string): ValidationRule[] {
    const typeRules = this.rules.get(resourceType) || [];
    return [...this.globalRules, ...typeRules];
  }

  /**
   * Validate a resource against all applicable rules
   * @param resourceType - ARM resource type
   * @param resource - Resource to validate
   * @param context - Optional validation context
   * @returns Array of validation results
   */
  validate(resourceType: string, resource: any, context?: ValidationContext): ValidationResult[] {
    const rules = this.getRules(resourceType);
    const results: ValidationResult[] = [];

    for (const rule of rules) {
      // Check if rule should run
      if (rule.condition && !rule.condition(resource, context)) {
        continue;
      }

      try {
        const result = rule.validate(resource, context);
        if (Array.isArray(result)) {
          results.push(...result);
        } else {
          results.push(result);
        }
      } catch (error) {
        // Validation rule threw an error - treat as validation failure
        results.push({
          valid: false,
          severity: ValidationSeverity.ERROR,
          ruleName: rule.name,
          message: `Validation rule threw error: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }

    return results;
  }

  /**
   * Check if any validation results have errors
   * @param results - Array of validation results
   * @returns True if any result is an error
   */
  hasErrors(results: ValidationResult[]): boolean {
    return results.some((r) => !r.valid && r.severity === ValidationSeverity.ERROR);
  }

  /**
   * Check if any validation results have warnings
   * @param results - Array of validation results
   * @returns True if any result is a warning
   */
  hasWarnings(results: ValidationResult[]): boolean {
    return results.some((r) => !r.valid && r.severity === ValidationSeverity.WARNING);
  }

  /**
   * Get only error results
   * @param results - Array of validation results
   * @returns Array of error results
   */
  getErrors(results: ValidationResult[]): ValidationResult[] {
    return results.filter((r) => !r.valid && r.severity === ValidationSeverity.ERROR);
  }

  /**
   * Get only warning results
   * @param results - Array of validation results
   * @returns Array of warning results
   */
  getWarnings(results: ValidationResult[]): ValidationResult[] {
    return results.filter((r) => !r.valid && r.severity === ValidationSeverity.WARNING);
  }

  /**
   * Get only info results
   * @param results - Array of validation results
   * @returns Array of info results
   */
  getInfo(results: ValidationResult[]): ValidationResult[] {
    return results.filter((r) => r.severity === ValidationSeverity.INFO);
  }

  /**
   * Clear all registered rules (useful for testing)
   */
  clear(): void {
    this.rules.clear();
    this.globalRules = [];
  }

  /**
   * Get count of registered rules
   */
  getRuleCount(): number {
    let count = this.globalRules.length;
    this.rules.forEach((rules) => (count += rules.length));
    return count;
  }
}

/**
 * Get the global validator registry instance
 */
export const validatorRegistry = ValidatorRegistry.getInstance();
