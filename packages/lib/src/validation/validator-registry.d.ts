import { ValidationRule, ValidationContext } from './validation-rule';
import { ValidationResult } from './validation-result';
/**
 * Registry for validation rules
 */
export declare class ValidatorRegistry {
    private static instance;
    private rules;
    private globalRules;
    private constructor();
    /**
     * Get the singleton instance
     */
    static getInstance(): ValidatorRegistry;
    /**
     * Register a validation rule for a specific resource type
     * @param resourceType - ARM resource type (e.g., 'Microsoft.Network/virtualNetworks')
     * @param rule - Validation rule to register
     */
    register(resourceType: string, rule: ValidationRule): void;
    /**
     * Register a global validation rule that applies to all resources
     * @param rule - Validation rule to register
     */
    registerGlobal(rule: ValidationRule): void;
    /**
     * Register multiple rules at once
     * @param resourceType - ARM resource type
     * @param rules - Array of validation rules
     */
    registerMany(resourceType: string, rules: ValidationRule[]): void;
    /**
     * Get all rules for a resource type
     * @param resourceType - ARM resource type
     * @returns Array of validation rules
     */
    getRules(resourceType: string): ValidationRule[];
    /**
     * Validate a resource against all applicable rules
     * @param resourceType - ARM resource type
     * @param resource - Resource to validate
     * @param context - Optional validation context
     * @returns Array of validation results
     */
    validate(resourceType: string, resource: any, context?: ValidationContext): ValidationResult[];
    /**
     * Check if any validation results have errors
     * @param results - Array of validation results
     * @returns True if any result is an error
     */
    hasErrors(results: ValidationResult[]): boolean;
    /**
     * Check if any validation results have warnings
     * @param results - Array of validation results
     * @returns True if any result is a warning
     */
    hasWarnings(results: ValidationResult[]): boolean;
    /**
     * Get only error results
     * @param results - Array of validation results
     * @returns Array of error results
     */
    getErrors(results: ValidationResult[]): ValidationResult[];
    /**
     * Get only warning results
     * @param results - Array of validation results
     * @returns Array of warning results
     */
    getWarnings(results: ValidationResult[]): ValidationResult[];
    /**
     * Get only info results
     * @param results - Array of validation results
     * @returns Array of info results
     */
    getInfo(results: ValidationResult[]): ValidationResult[];
    /**
     * Clear all registered rules (useful for testing)
     */
    clear(): void;
    /**
     * Get count of registered rules
     */
    getRuleCount(): number;
}
/**
 * Get the global validator registry instance
 */
export declare const validatorRegistry: ValidatorRegistry;
//# sourceMappingURL=validator-registry.d.ts.map