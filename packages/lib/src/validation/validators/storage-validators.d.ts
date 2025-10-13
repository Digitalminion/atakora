import { BaseValidationRule, ValidationContext } from '../validation-rule';
import { ValidationResult } from '../validation-result';
/**
 * Validates Storage Account name format
 */
export declare class StorageAccountNameValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Validates Storage Account public access consistency
 */
export declare class StorageAccountPublicAccessValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Validates Storage Account network ACLs have default action
 */
export declare class StorageAccountNetworkAclsValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Validates Storage Account TLS version
 */
export declare class StorageAccountTlsVersionValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Export all storage validators
 */
export declare const storageValidators: (StorageAccountNameValidator | StorageAccountPublicAccessValidator | StorageAccountNetworkAclsValidator | StorageAccountTlsVersionValidator)[];
//# sourceMappingURL=storage-validators.d.ts.map