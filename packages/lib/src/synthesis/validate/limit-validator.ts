import { ArmTemplate, ValidationResult } from '../types';
import { BaseValidator } from './validator-registry';

/**
 * ARM template limits
 * @see https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/best-practices
 */
interface TemplateLimits {
  maxTemplateSize: number;
  maxResources: number;
  maxParameters: number;
  maxOutputs: number;
  maxVariables: number;
  warningThreshold: number; // Percentage
}

/**
 * Validates ARM template against Azure limits
 */
export class LimitValidator extends BaseValidator {
  readonly name = 'LimitValidator';

  private limits: TemplateLimits = {
    maxTemplateSize: 4 * 1024 * 1024, // 4 MB
    maxResources: 800,
    maxParameters: 256,
    maxOutputs: 64,
    maxVariables: 256,
    warningThreshold: 80, // Warn at 80%
  };

  validate(template: ArmTemplate, stackName: string): ValidationResult {
    const errors = [];
    const warnings = [];

    // Check template size
    const templateJson = JSON.stringify(template);
    const templateSize = Buffer.byteLength(templateJson, 'utf-8');
    const maxSize = this.limits.maxTemplateSize;
    const warningSize = maxSize * (this.limits.warningThreshold / 100);

    if (templateSize > maxSize) {
      errors.push(
        this.createError(
          `Template size (${this.formatBytes(templateSize)}) exceeds maximum allowed size of ${this.formatBytes(maxSize)}`,
          stackName,
          'TEMPLATE_TOO_LARGE',
          'Consider splitting this stack into multiple smaller stacks or using nested templates'
        )
      );
    } else if (templateSize > warningSize) {
      warnings.push(
        this.createWarning(
          `Template size (${this.formatBytes(templateSize)}) is at ${Math.round((templateSize / maxSize) * 100)}% of the maximum (${this.formatBytes(maxSize)})`,
          stackName,
          'TEMPLATE_SIZE_WARNING',
          'Consider splitting this stack if you plan to add more resources'
        )
      );
    }

    // Check resource count
    const resourceCount = template.resources.length;
    const maxResources = this.limits.maxResources;
    const warningResources = maxResources * (this.limits.warningThreshold / 100);

    if (resourceCount > maxResources) {
      errors.push(
        this.createError(
          `Resource count (${resourceCount}) exceeds maximum of ${maxResources}`,
          stackName,
          'TOO_MANY_RESOURCES',
          'Split this stack into multiple stacks to reduce the resource count'
        )
      );
    } else if (resourceCount > warningResources) {
      warnings.push(
        this.createWarning(
          `Resource count (${resourceCount}) is at ${Math.round((resourceCount / maxResources) * 100)}% of the maximum (${maxResources})`,
          stackName,
          'RESOURCE_COUNT_WARNING',
          `Consider splitting this stack if you plan to add more than ${maxResources - resourceCount} more resources`
        )
      );
    }

    // Check parameter count
    const parameterCount = Object.keys(template.parameters || {}).length;
    const maxParameters = this.limits.maxParameters;
    const warningParameters = maxParameters * (this.limits.warningThreshold / 100);

    if (parameterCount > maxParameters) {
      errors.push(
        this.createError(
          `Parameter count (${parameterCount}) exceeds maximum of ${maxParameters}`,
          stackName,
          'TOO_MANY_PARAMETERS',
          'Reduce the number of parameters or use parameter files with fewer parameters per template'
        )
      );
    } else if (parameterCount > warningParameters) {
      warnings.push(
        this.createWarning(
          `Parameter count (${parameterCount}) is at ${Math.round((parameterCount / maxParameters) * 100)}% of the maximum (${maxParameters})`,
          stackName,
          'PARAMETER_COUNT_WARNING'
        )
      );
    }

    // Check output count
    const outputCount = Object.keys(template.outputs || {}).length;
    const maxOutputs = this.limits.maxOutputs;
    const warningOutputs = maxOutputs * (this.limits.warningThreshold / 100);

    if (outputCount > maxOutputs) {
      errors.push(
        this.createError(
          `Output count (${outputCount}) exceeds maximum of ${maxOutputs}`,
          stackName,
          'TOO_MANY_OUTPUTS',
          'Reduce the number of outputs or consolidate related outputs into objects'
        )
      );
    } else if (outputCount > warningOutputs) {
      warnings.push(
        this.createWarning(
          `Output count (${outputCount}) is at ${Math.round((outputCount / maxOutputs) * 100)}% of the maximum (${maxOutputs})`,
          stackName,
          'OUTPUT_COUNT_WARNING'
        )
      );
    }

    // Check variable count
    const variableCount = Object.keys(template.variables || {}).length;
    const maxVariables = this.limits.maxVariables;
    const warningVariables = maxVariables * (this.limits.warningThreshold / 100);

    if (variableCount > maxVariables) {
      errors.push(
        this.createError(
          `Variable count (${variableCount}) exceeds maximum of ${maxVariables}`,
          stackName,
          'TOO_MANY_VARIABLES',
          'Reduce the number of variables or move logic to runtime'
        )
      );
    } else if (variableCount > warningVariables) {
      warnings.push(
        this.createWarning(
          `Variable count (${variableCount}) is at ${Math.round((variableCount / maxVariables) * 100)}% of the maximum (${maxVariables})`,
          stackName,
          'VARIABLE_COUNT_WARNING'
        )
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}
