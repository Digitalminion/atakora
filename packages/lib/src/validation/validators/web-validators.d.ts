import { BaseValidationRule, ValidationContext } from '../validation-rule';
import { ValidationResult } from '../validation-result';
/**
 * Validates App Service Plan name format
 */
export declare class AppServicePlanNameValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Validates App Service Plan SKU configuration
 */
export declare class AppServicePlanSkuValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Validates App Service Plan zone redundancy configuration
 */
export declare class AppServicePlanZoneRedundancyValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Validates Function App name format
 */
export declare class FunctionAppNameValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Validates Function App storage account configuration
 */
export declare class FunctionAppStorageValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Validates Function App runtime version
 */
export declare class FunctionAppRuntimeValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Validates Function App always-on configuration
 */
export declare class FunctionAppAlwaysOnValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Validates Function App Application Insights configuration
 */
export declare class FunctionAppApplicationInsightsValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Export all web validators
 */
export declare const webValidators: (AppServicePlanNameValidator | AppServicePlanSkuValidator | AppServicePlanZoneRedundancyValidator | FunctionAppNameValidator | FunctionAppStorageValidator | FunctionAppRuntimeValidator | FunctionAppAlwaysOnValidator | FunctionAppApplicationInsightsValidator)[];
//# sourceMappingURL=web-validators.d.ts.map