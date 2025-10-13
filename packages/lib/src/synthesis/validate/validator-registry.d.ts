import { ArmTemplate, ValidationResult, ValidationError } from '../types';
/**
 * Base validator interface
 */
export interface Validator {
    /**
     * Validator name
     */
    readonly name: string;
    /**
     * Validate an ARM template
     *
     * @param template - ARM template to validate
     * @param stackName - Name of the stack being validated
     * @returns Validation result
     */
    validate(template: ArmTemplate, stackName: string): Promise<ValidationResult> | ValidationResult;
}
/**
 * Registry for managing validators
 */
export declare class ValidatorRegistry {
    private validators;
    /**
     * Register a validator
     *
     * @param validator - Validator to register
     */
    register(validator: Validator): void;
    /**
     * Validate a template using all registered validators
     *
     * @param template - ARM template to validate
     * @param stackName - Name of the stack being validated
     * @returns Combined validation result
     */
    validateAll(template: ArmTemplate, stackName: string): Promise<ValidationResult>;
    /**
     * Get all registered validators
     */
    getValidators(): readonly Validator[];
    /**
     * Clear all validators
     */
    clear(): void;
    /**
     * Create a default validator registry with common validators
     */
    static createDefault(): ValidatorRegistry;
}
/**
 * Base abstract validator class
 */
export declare abstract class BaseValidator implements Validator {
    abstract readonly name: string;
    abstract validate(template: ArmTemplate, stackName: string): ValidationResult;
    /**
     * Create an error
     */
    protected createError(message: string, path?: string, code?: string, suggestion?: string): ValidationError;
    /**
     * Create a warning
     */
    protected createWarning(message: string, path?: string, code?: string, suggestion?: string): ValidationError;
    /**
     * Create an info message
     */
    protected createInfo(message: string, path?: string, code?: string): ValidationError;
}
//# sourceMappingURL=validator-registry.d.ts.map