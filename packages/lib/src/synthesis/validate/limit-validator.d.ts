import { ArmTemplate, ValidationResult } from '../types';
import { BaseValidator } from './validator-registry';
/**
 * Validates ARM template against Azure limits
 */
export declare class LimitValidator extends BaseValidator {
    readonly name = "LimitValidator";
    private limits;
    validate(template: ArmTemplate, stackName: string): ValidationResult;
    /**
     * Format bytes to human-readable string
     */
    private formatBytes;
}
//# sourceMappingURL=limit-validator.d.ts.map