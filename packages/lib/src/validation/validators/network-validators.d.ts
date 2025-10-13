import { BaseValidationRule, ValidationContext } from '../validation-rule';
import { ValidationResult } from '../validation-result';
/**
 * Validates Virtual Network address space format
 */
export declare class VNetAddressSpaceValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Validates Virtual Network name format
 */
export declare class VNetNameValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Validates subnet is within VNet address space
 */
export declare class SubnetWithinVNetValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Validates subnets do not overlap
 */
export declare class SubnetOverlapValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Validates subnet has minimum usable IPs
 */
export declare class SubnetMinimumSizeValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Validates private endpoint subnet has network policies disabled
 */
export declare class PrivateEndpointSubnetPoliciesValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Validates NSG rule priority uniqueness
 */
export declare class NSGPriorityUniqueValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Validates NSG rule priority range
 */
export declare class NSGPriorityRangeValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Validates NSG port ranges
 */
export declare class NSGPortRangeValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Validates Public IP SKU compatibility with Standard Load Balancer/Application Gateway
 */
export declare class PublicIPSkuCompatibilityValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Validates Public IP allocation method for Standard SKU
 */
export declare class PublicIPAllocationMethodValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Validates Private DNS Zone location is global
 */
export declare class PrivateDnsZoneLocationValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Validates Private DNS Zone name format
 */
export declare class PrivateDnsZoneNameValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Validates Private Endpoint group ID is valid for resource type
 */
export declare class PrivateEndpointGroupIdValidator extends BaseValidationRule {
    constructor();
    validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[];
}
/**
 * Export all network validators
 */
export declare const networkValidators: (VNetAddressSpaceValidator | VNetNameValidator | SubnetWithinVNetValidator | SubnetOverlapValidator | SubnetMinimumSizeValidator | PrivateEndpointSubnetPoliciesValidator | NSGPriorityUniqueValidator | NSGPriorityRangeValidator | NSGPortRangeValidator | PublicIPSkuCompatibilityValidator | PublicIPAllocationMethodValidator | PrivateDnsZoneLocationValidator | PrivateDnsZoneNameValidator | PrivateEndpointGroupIdValidator)[];
//# sourceMappingURL=network-validators.d.ts.map