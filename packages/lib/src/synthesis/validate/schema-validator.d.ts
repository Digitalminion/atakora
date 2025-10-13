import { ArmTemplate, ValidationResult } from '../types';
import { BaseValidator } from './validator-registry';
/**
 * Validates ARM templates against JSON schemas
 */
export declare class SchemaValidator extends BaseValidator {
    readonly name = "SchemaValidator";
    private ajv;
    constructor();
    validate(template: ArmTemplate, stackName: string): ValidationResult;
    /**
     * Format Ajv error message
     */
    private formatAjvError;
    /**
     * Get error path
     */
    private getErrorPath;
    /**
     * Get error suggestion
     */
    private getErrorSuggestion;
    /**
     * Custom validation rules
     */
    private validateCustomRules;
}
//# sourceMappingURL=schema-validator.d.ts.map