import { BaseValidationRule, ValidationContext } from '../validation-rule';
import { ValidationResult } from '../validation-result';
/**
 * Validates Cognitive Services account name format
 */
export declare class CognitiveServicesAccountNameValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Validates OpenAI deployment model and version
 */
export declare class OpenAIDeploymentModelValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Validates OpenAI deployment capacity (TPM) is within limits
 */
export declare class OpenAIDeploymentCapacityValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Validates OpenAI deployment naming for uniqueness
 */
export declare class OpenAIDeploymentNameValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Validates Cognitive Services network ACLs configuration
 */
export declare class CognitiveServicesNetworkAclsValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Validates Cognitive Services SKU is appropriate for workload
 */
export declare class CognitiveServicesSkuValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Validates Cognitive Services custom subdomain configuration
 */
export declare class CognitiveServicesCustomSubdomainValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Export all cognitive services validators
 */
export declare const cognitiveServicesValidators: (CognitiveServicesAccountNameValidator | OpenAIDeploymentModelValidator | OpenAIDeploymentCapacityValidator | OpenAIDeploymentNameValidator | CognitiveServicesNetworkAclsValidator | CognitiveServicesSkuValidator | CognitiveServicesCustomSubdomainValidator)[];
//# sourceMappingURL=cognitiveservices-validators.d.ts.map