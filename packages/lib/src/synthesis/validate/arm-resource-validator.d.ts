/**
 * ARM Resource Validator - Integrates the new validation framework with synthesis pipeline
 *
 * @packageDocumentation
 */
import { ArmTemplate, ValidationResult } from '../types';
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
export declare class ArmResourceValidator extends BaseValidator {
    readonly name = "arm-resource-validator";
    private static registeredValidators;
    /**
     * Validates ARM template using the comprehensive validation framework
     *
     * @param template - Generated ARM template
     * @param stackName - Name of the stack being validated
     * @returns Validation result with errors and warnings
     */
    validate(template: ArmTemplate, stackName: string): ValidationResult;
    /**
     * Builds validation context from ARM resources
     *
     * @param armResources - All ARM resources in the template
     * @param stackName - Name of the stack
     * @returns Validation context for cross-resource validation
     */
    private buildContext;
    /**
     * Extracts environment from stack name
     *
     * @param stackName - Stack name to parse
     * @returns Environment string (prod, dev, etc.) or undefined
     */
    private extractEnvironment;
}
//# sourceMappingURL=arm-resource-validator.d.ts.map