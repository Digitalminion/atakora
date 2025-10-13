import { BaseValidationRule, ValidationContext } from '../validation-rule';
import { ValidationResult } from '../validation-result';
/**
 * Validates Cosmos DB account name format
 */
export declare class CosmosDbAccountNameValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Validates Cosmos DB consistency level configuration
 */
export declare class CosmosDbConsistencyValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Validates Cosmos DB multi-region configuration
 */
export declare class CosmosDbMultiRegionValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Validates Cosmos DB backup policy configuration
 */
export declare class CosmosDbBackupPolicyValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Validates Cosmos DB automatic failover configuration
 */
export declare class CosmosDbAutomaticFailoverValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Validates Cosmos DB capabilities are compatible
 */
export declare class CosmosDbCapabilitiesValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Validates Cosmos DB network ACLs configuration
 */
export declare class CosmosDbNetworkAclsValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Export all database validators
 */
export declare const databaseValidators: (CosmosDbAccountNameValidator | CosmosDbConsistencyValidator | CosmosDbMultiRegionValidator | CosmosDbBackupPolicyValidator | CosmosDbAutomaticFailoverValidator | CosmosDbCapabilitiesValidator | CosmosDbNetworkAclsValidator)[];
//# sourceMappingURL=database-validators.d.ts.map