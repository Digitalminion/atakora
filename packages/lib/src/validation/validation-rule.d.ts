import { ValidationResult, ValidationSeverity } from './validation-result';
/**
 * Context provided to validators for cross-resource validation
 */
export interface ValidationContext {
    /**
     * Environment (prod, nonprod, dev, etc.)
     */
    environment?: string;
    /**
     * Azure region
     */
    region?: string;
    /**
     * Subscription ID
     */
    subscriptionId?: string;
    /**
     * Resource group name
     */
    resourceGroupName?: string;
    /**
     * Other resources in the stack for cross-validation
     */
    resources?: Map<string, any>;
    /**
     * Custom context data
     */
    [key: string]: any;
}
/**
 * A validation rule that can be applied to resources
 */
export interface ValidationRule<TResource = any> {
    /**
     * Unique identifier for this rule
     */
    name: string;
    /**
     * Human-readable description of what this rule validates
     */
    description: string;
    /**
     * Default severity level for violations
     */
    severity: ValidationSeverity;
    /**
     * Resource types this rule applies to
     * @example ['Microsoft.Network/virtualNetworks', 'Microsoft.Network/virtualNetworks/subnets']
     */
    resourceTypes?: string[];
    /**
     * Validation function
     * @param resource - The resource to validate
     * @param context - Optional validation context
     * @returns Validation result(s)
     */
    validate(resource: TResource, context?: ValidationContext): ValidationResult | ValidationResult[];
    /**
     * Optional condition to determine if rule should run
     */
    condition?(resource: TResource, context?: ValidationContext): boolean;
}
/**
 * Base class for implementing validation rules
 */
export declare abstract class BaseValidationRule<TResource = any> implements ValidationRule<TResource> {
    readonly name: string;
    readonly description: string;
    readonly severity: ValidationSeverity;
    readonly resourceTypes?: string[];
    constructor(name: string, description: string, severity: ValidationSeverity, resourceTypes?: string[]);
    abstract validate(resource: TResource, context?: ValidationContext): ValidationResult | ValidationResult[];
    condition?(resource: TResource, context?: ValidationContext): boolean;
}
//# sourceMappingURL=validation-rule.d.ts.map