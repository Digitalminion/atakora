import { BaseValidationRule, ValidationContext } from '../validation-rule';
import { ValidationResult } from '../validation-result';
/**
 * Validates Key Vault name format
 */
export declare class KeyVaultNameValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Validates Key Vault soft delete and purge protection configuration
 */
export declare class KeyVaultSoftDeleteValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Validates Key Vault soft delete retention period
 */
export declare class KeyVaultRetentionValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Validates Key Vault RBAC vs Access Policies configuration
 */
export declare class KeyVaultRbacAccessPolicyValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Validates Key Vault network ACLs configuration
 */
export declare class KeyVaultNetworkAclsValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Validates Key Vault public network access with private endpoints
 */
export declare class KeyVaultPublicAccessValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Export all Key Vault validators
 */
export declare const keyVaultValidators: (KeyVaultNameValidator | KeyVaultSoftDeleteValidator | KeyVaultRetentionValidator | KeyVaultRbacAccessPolicyValidator | KeyVaultNetworkAclsValidator | KeyVaultPublicAccessValidator)[];
//# sourceMappingURL=keyvault-validators.d.ts.map