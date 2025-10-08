import { ArmExpressionValidator } from './validators/arm-expression-validator';
import { NsgValidator } from './validators/nsg-validator';
import { ResourceReferenceValidator } from './validators/resource-reference-validator';
import { Validator, ValidationContext, ValidationResult, ValidationSeverity } from './types';

export * from './types';
export * from './validators/arm-expression-validator';
export * from './validators/nsg-validator';
export * from './validators/resource-reference-validator';

/**
 * Template validator that runs all validation checks
 */
export class TemplateValidator {
  private validators: Validator[];

  constructor() {
    this.validators = [
      new ArmExpressionValidator(),
      new NsgValidator(),
      new ResourceReferenceValidator(),
    ];
  }

  /**
   * Validates an ARM template
   *
   * @param context - Validation context
   * @returns Array of validation results
   */
  validate(context: ValidationContext): ValidationResult[] {
    const allResults: ValidationResult[] = [];

    for (const validator of this.validators) {
      try {
        const results = validator.validate(context);
        allResults.push(...results);
      } catch (error) {
        allResults.push({
          severity: ValidationSeverity.ERROR,
          code: 'ValidatorError',
          message: `Validator '${validator.name}' failed: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }

    return allResults;
  }

  /**
   * Checks if validation results contain errors
   *
   * @param results - Validation results
   * @returns True if there are errors
   */
  hasErrors(results: ValidationResult[]): boolean {
    return results.some((r) => r.severity === ValidationSeverity.ERROR);
  }

  /**
   * Formats validation results for console output
   *
   * @param results - Validation results
   * @returns Formatted string
   */
  formatResults(results: ValidationResult[]): string {
    if (results.length === 0) {
      return '✓ Template validation passed';
    }

    const lines: string[] = [];
    const errors = results.filter((r) => r.severity === ValidationSeverity.ERROR);
    const warnings = results.filter((r) => r.severity === ValidationSeverity.WARNING);
    const infos = results.filter((r) => r.severity === ValidationSeverity.INFO);

    if (errors.length > 0) {
      lines.push(`\n❌ ${errors.length} error(s) found:\n`);
      for (const error of errors) {
        lines.push(`  [${error.code}] ${error.message}`);
        if (error.target) {
          lines.push(`    at: ${error.target}`);
        }
        if (error.suggestion) {
          lines.push(`    suggestion: ${error.suggestion}`);
        }
        lines.push('');
      }
    }

    if (warnings.length > 0) {
      lines.push(`\n⚠️  ${warnings.length} warning(s) found:\n`);
      for (const warning of warnings) {
        lines.push(`  [${warning.code}] ${warning.message}`);
        if (warning.target) {
          lines.push(`    at: ${warning.target}`);
        }
        if (warning.suggestion) {
          lines.push(`    suggestion: ${warning.suggestion}`);
        }
        lines.push('');
      }
    }

    if (infos.length > 0) {
      lines.push(`\nℹ️  ${infos.length} info message(s):\n`);
      for (const info of infos) {
        lines.push(`  [${info.code}] ${info.message}`);
        lines.push('');
      }
    }

    return lines.join('\n');
  }
}
