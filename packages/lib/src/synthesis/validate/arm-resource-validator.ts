/**
 * ARM Resource Validator - Integrates the new validation framework with synthesis pipeline
 *
 * @packageDocumentation
 */

import { Resource } from '../../core/resource';
import { ArmTemplate, ValidationResult, ValidationError, ValidationSeverity } from '../types';
import { validatorRegistry, registerAllValidators, ValidationContext } from '../../validation';
import { BaseValidator } from './validator-registry';

/**
 * ARM Resource Validator that runs the new validation framework during synthesis
 *
 * @remarks
 * This validator integrates the comprehensive Azure resource validation framework
 * into the synthesis pipeline. It runs validation rules against ARM resources
 * before deployment to catch common configuration errors.
 *
 * The validator:
 * - Registers all validation rules on first use
 * - Runs resource-specific validators based on resource type
 * - Converts validation results to synthesis pipeline format
 * - Provides a validation context with cross-resource information
 *
 * **Validation Coverage**:
 * - Network resources (VNet, Subnet, NSG, Public IP, Private Endpoints)
 * - Storage accounts
 * - Key Vaults
 * - Cosmos DB accounts
 * - Cognitive Services (OpenAI)
 * - Web services (App Service Plans, Function Apps)
 *
 * @example
 * ```typescript
 * const synthesizer = new Synthesizer();
 * synthesizer.addValidator(new ArmResourceValidator());
 * ```
 */
export class ArmResourceValidator extends BaseValidator {
  readonly name = 'arm-resource-validator';
  private static registeredValidators = false;

  /**
   * Validates ARM template using the comprehensive validation framework
   *
   * @param template - Generated ARM template
   * @param stackName - Name of the stack being validated
   * @returns Validation result with errors and warnings
   */
  validate(template: ArmTemplate, stackName: string): ValidationResult {
    // Register all validators on first use
    if (!ArmResourceValidator.registeredValidators) {
      registerAllValidators();
      ArmResourceValidator.registeredValidators = true;
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Build validation context
    const context = this.buildContext(template.resources, stackName);

    // Validate each ARM resource
    for (const armResource of template.resources) {
      const resourceType = armResource.type;

      // Run validators for this resource type
      const validationResults = validatorRegistry.validate(resourceType, armResource, context);

      // Convert to synthesis format
      for (const result of validationResults) {
        if (!result.valid) {
          const path = result.path || `${stackName}.${armResource.name}`;

          if (result.severity === 'error') {
            errors.push(
              this.createError(result.message || 'Validation failed', path, result.ruleName, result.suggestion)
            );
          } else if (result.severity === 'warning') {
            warnings.push(
              this.createWarning(result.message || 'Validation warning', path, result.ruleName, result.suggestion)
            );
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Builds validation context from ARM resources
   *
   * @param armResources - All ARM resources in the template
   * @param stackName - Name of the stack
   * @returns Validation context for cross-resource validation
   */
  private buildContext(armResources: any[], stackName: string): ValidationContext {
    const resourceMap = new Map<string, any>();

    // Map resources by name for cross-resource lookups
    for (const resource of armResources) {
      if (resource.name) {
        resourceMap.set(resource.name, resource);
      }
    }

    // Extract environment from stack name if available
    const environment = this.extractEnvironment(stackName);

    return {
      resources: resourceMap,
      environment,
    };
  }

  /**
   * Extracts environment from stack name
   *
   * @param stackName - Stack name to parse
   * @returns Environment string (prod, dev, etc.) or undefined
   */
  private extractEnvironment(stackName: string): string | undefined {
    const lower = stackName.toLowerCase();
    if (lower.includes('prod')) return 'production';
    if (lower.includes('dev')) return 'development';
    if (lower.includes('test')) return 'test';
    if (lower.includes('staging')) return 'staging';
    return undefined;
  }
}
