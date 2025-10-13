import { ArmTemplate, ValidationResult } from '../types';
import { BaseValidator } from './validator-registry';
/**
 * Validates Azure resource naming conventions
 */
export declare class NamingValidator extends BaseValidator {
    readonly name = "NamingValidator";
    private namingRules;
    validate(template: ArmTemplate, stackName: string): ValidationResult;
    /**
     * Validate generic resource name (when no specific rule exists)
     */
    private validateGenericName;
}
//# sourceMappingURL=naming-validator.d.ts.map