import { BaseValidationRule, ValidationContext } from '../validation-rule';
import { ValidationResult, ValidationResultBuilder, ValidationSeverity } from '../validation-result';
import {
  validateLength,
  validatePattern,
  validateRequired,
  validateRange,
  validateLowercase,
  validateNoConsecutive,
  validateStartsWith,
  validateEndsWith,
  collectResults,
} from '../common-validators';
import { isValidCIDR, isWithinCIDR, cidrsOverlap, isValidPortRange } from '../../core/validation/validation-helpers';

/**
 * Validates Virtual Network address space format
 */
export class VNetAddressSpaceValidator extends BaseValidationRule {
  constructor() {
    super(
      'vnet-address-space-format',
      'Validates VNet address space is valid CIDR notation',
      ValidationSeverity.ERROR,
      ['Microsoft.Network/virtualNetworks']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const addressSpace = resource.properties?.addressSpace?.addressPrefixes?.[0] || resource.addressSpace;

    if (!addressSpace) {
      return ValidationResultBuilder.error(this.name)
        .withMessage('VNet must have at least one address space')
        .withSuggestion('Add addressSpace with CIDR notation (e.g., "10.0.0.0/16")')
        .build();
    }

    if (!isValidCIDR(addressSpace)) {
      return ValidationResultBuilder.error(this.name)
        .withMessage('VNet address space is not valid CIDR notation')
        .withDetails(`Address space: ${addressSpace}`)
        .withSuggestion('Use format: x.x.x.x/y where x is 0-255 and y is 0-32')
        .build();
    }

    return ValidationResultBuilder.success(this.name).build();
  }
}

/**
 * Validates Virtual Network name format
 */
export class VNetNameValidator extends BaseValidationRule {
  constructor() {
    super(
      'vnet-name-format',
      'Validates VNet name follows Azure naming rules',
      ValidationSeverity.ERROR,
      ['Microsoft.Network/virtualNetworks']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const name = resource.name || resource.virtualNetworkName;

    if (!name) {
      return ValidationResultBuilder.error(this.name)
        .withMessage('VNet name is required')
        .build();
    }

    const results: ValidationResult[] = [];

    // Length check
    const lengthResult = validateLength(name, 2, 64, 'VNet name', this.name);
    if (lengthResult) results.push(lengthResult);

    // Pattern check
    const pattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9_]$/;
    const patternResult = validatePattern(
      name,
      pattern,
      'VNet name',
      this.name,
      'VNet name must start and end with alphanumeric, can contain letters, numbers, underscores, periods, hyphens'
    );
    if (patternResult) results.push(patternResult);

    return results.length > 0 ? results : ValidationResultBuilder.success(this.name).build();
  }
}

/**
 * Validates subnet is within VNet address space
 */
export class SubnetWithinVNetValidator extends BaseValidationRule {
  constructor() {
    super(
      'subnet-within-vnet',
      'Validates subnet address prefix is within VNet address space',
      ValidationSeverity.ERROR,
      ['Microsoft.Network/virtualNetworks/subnets']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const subnetPrefix = resource.properties?.addressPrefix || resource.addressPrefix;
    const vnetPrefix = context?.vnetAddressSpace;

    if (!subnetPrefix) {
      return ValidationResultBuilder.error(this.name)
        .withMessage('Subnet must have address prefix')
        .build();
    }

    if (!isValidCIDR(subnetPrefix)) {
      return ValidationResultBuilder.error(this.name)
        .withMessage('Subnet address prefix is not valid CIDR notation')
        .withDetails(`Address prefix: ${subnetPrefix}`)
        .build();
    }

    if (vnetPrefix && !isWithinCIDR(subnetPrefix, vnetPrefix)) {
      return ValidationResultBuilder.error(this.name)
        .withMessage('Subnet address prefix is not within VNet address space')
        .withDetails(`Subnet: ${subnetPrefix}, VNet: ${vnetPrefix}`)
        .withSuggestion('Subnet must be a subset of the VNet address space')
        .build();
    }

    return ValidationResultBuilder.success(this.name).build();
  }
}

/**
 * Validates subnets do not overlap
 */
export class SubnetOverlapValidator extends BaseValidationRule {
  constructor() {
    super(
      'subnet-no-overlap',
      'Validates subnets do not have overlapping address ranges',
      ValidationSeverity.ERROR,
      ['Microsoft.Network/virtualNetworks/subnets']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const subnetPrefix = resource.properties?.addressPrefix || resource.addressPrefix;
    const existingSubnets = context?.existingSubnets || [];

    if (!subnetPrefix) {
      return ValidationResultBuilder.success(this.name).build();
    }

    const overlapping = existingSubnets.filter((subnet: any) => {
      const existingPrefix = subnet.properties?.addressPrefix || subnet.addressPrefix;
      return existingPrefix && existingPrefix !== subnetPrefix && cidrsOverlap(subnetPrefix, existingPrefix);
    });

    if (overlapping.length > 0) {
      const names = overlapping.map((s: any) => s.name || s.subnetName).join(', ');
      return ValidationResultBuilder.error(this.name)
        .withMessage('Subnet address range overlaps with existing subnets')
        .withDetails(`Overlapping subnets: ${names}`)
        .withSuggestion('Choose a non-overlapping address range')
        .build();
    }

    return ValidationResultBuilder.success(this.name).build();
  }
}

/**
 * Validates subnet has minimum usable IPs
 */
export class SubnetMinimumSizeValidator extends BaseValidationRule {
  constructor() {
    super(
      'subnet-minimum-size',
      'Validates subnet has at least 3 usable IP addresses',
      ValidationSeverity.WARNING,
      ['Microsoft.Network/virtualNetworks/subnets']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const subnetPrefix = resource.properties?.addressPrefix || resource.addressPrefix;

    if (!subnetPrefix) {
      return ValidationResultBuilder.success(this.name).build();
    }

    const prefixLength = parseInt(subnetPrefix.split('/')[1]);
    const totalIps = Math.pow(2, 32 - prefixLength);
    const usableIps = totalIps - 5; // Azure reserves 5 IPs per subnet

    if (usableIps < 3) {
      return ValidationResultBuilder.warning(this.name)
        .withMessage(`Subnet /${prefixLength} has only ${usableIps} usable IP addresses`)
        .withSuggestion('Use /29 or larger subnet for at least 3 usable IPs')
        .withDetails('Azure reserves first 4 and last 1 IP address in each subnet')
        .build();
    }

    return ValidationResultBuilder.success(this.name).build();
  }
}

/**
 * Validates private endpoint subnet has network policies disabled
 */
export class PrivateEndpointSubnetPoliciesValidator extends BaseValidationRule {
  constructor() {
    super(
      'private-endpoint-subnet-policies',
      'Validates subnet has network policies disabled for private endpoints',
      ValidationSeverity.ERROR,
      ['Microsoft.Network/virtualNetworks/subnets']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    // Only validate if this subnet will have private endpoints
    const hasPrivateEndpoints = context?.hasPrivateEndpoints;
    if (!hasPrivateEndpoints) {
      return ValidationResultBuilder.success(this.name).build();
    }

    const policies = resource.properties?.privateEndpointNetworkPolicies;

    if (policies !== 'Disabled') {
      return ValidationResultBuilder.error(this.name)
        .withMessage('Subnet must have privateEndpointNetworkPolicies set to "Disabled" for private endpoints')
        .withSuggestion('Set privateEndpointNetworkPolicies: "Disabled" on the subnet')
        .withDetails('This must be configured before creating private endpoints')
        .build();
    }

    return ValidationResultBuilder.success(this.name).build();
  }
}

/**
 * Validates NSG rule priority uniqueness
 */
export class NSGPriorityUniqueValidator extends BaseValidationRule {
  constructor() {
    super(
      'nsg-priority-unique',
      'Validates NSG rule priorities are unique',
      ValidationSeverity.ERROR,
      ['Microsoft.Network/networkSecurityGroups']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const rules = resource.properties?.securityRules || resource.securityRules || [];

    const priorities = rules.map((r: any) => r.priority || r.properties?.priority);
    const duplicates = priorities.filter((p: number, i: number) => priorities.indexOf(p) !== i);

    if (duplicates.length > 0) {
      const uniqueDuplicates = [...new Set(duplicates)];
      return ValidationResultBuilder.error(this.name)
        .withMessage('NSG has rules with duplicate priorities')
        .withDetails(`Duplicate priorities: ${uniqueDuplicates.join(', ')}`)
        .withSuggestion('Each rule must have a unique priority between 100 and 4096')
        .build();
    }

    return ValidationResultBuilder.success(this.name).build();
  }
}

/**
 * Validates NSG rule priority range
 */
export class NSGPriorityRangeValidator extends BaseValidationRule {
  constructor() {
    super(
      'nsg-priority-range',
      'Validates NSG rule priorities are in valid range',
      ValidationSeverity.ERROR,
      ['Microsoft.Network/networkSecurityGroups']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const rules = resource.properties?.securityRules || resource.securityRules || [];
    const results: ValidationResult[] = [];

    rules.forEach((rule: any, index: number) => {
      const priority = rule.priority || rule.properties?.priority;
      const ruleName = rule.name || `rule-${index}`;

      const rangeResult = validateRange(priority, 100, 4096, `Priority for rule '${ruleName}'`, this.name);
      if (rangeResult) {
        results.push(rangeResult);
      }
    });

    return results.length > 0 ? results : ValidationResultBuilder.success(this.name).build();
  }
}

/**
 * Validates NSG port ranges
 */
export class NSGPortRangeValidator extends BaseValidationRule {
  constructor() {
    super(
      'nsg-port-range-format',
      'Validates NSG rule port ranges are valid',
      ValidationSeverity.ERROR,
      ['Microsoft.Network/networkSecurityGroups']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const rules = resource.properties?.securityRules || resource.securityRules || [];
    const results: ValidationResult[] = [];

    rules.forEach((rule: any, index: number) => {
      const ruleName = rule.name || `rule-${index}`;
      const props = rule.properties || rule;

      const ports = [
        props.destinationPortRange,
        props.sourcePortRange,
        ...(props.destinationPortRanges || []),
        ...(props.sourcePortRanges || []),
      ].filter(Boolean);

      const invalid = ports.filter((p: string) => !isValidPortRange(p));

      if (invalid.length > 0) {
        results.push(
          ValidationResultBuilder.error(this.name)
            .withMessage(`Rule '${ruleName}' has invalid port range format`)
            .withDetails(`Invalid ports: ${invalid.join(', ')}`)
            .withSuggestion('Use format: single port (80), range (80-443), or wildcard (*)')
            .build()
        );
      }
    });

    return results.length > 0 ? results : ValidationResultBuilder.success(this.name).build();
  }
}

/**
 * Validates Public IP SKU compatibility with Standard Load Balancer/Application Gateway
 */
export class PublicIPSkuCompatibilityValidator extends BaseValidationRule {
  constructor() {
    super(
      'public-ip-sku-compatibility',
      'Validates Public IP SKU is compatible with attached resources',
      ValidationSeverity.ERROR,
      ['Microsoft.Network/publicIPAddresses']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const sku = resource.sku?.name || resource.sku;
    const targetResourceSku = context?.targetResourceSku;

    if (targetResourceSku === 'Standard' && sku !== 'Standard') {
      return ValidationResultBuilder.error(this.name)
        .withMessage('Standard SKU resources require Standard SKU Public IP')
        .withDetails(`Public IP SKU: ${sku}, Target resource SKU: ${targetResourceSku}`)
        .withSuggestion('Change Public IP SKU to Standard')
        .build();
    }

    return ValidationResultBuilder.success(this.name).build();
  }
}

/**
 * Validates Public IP allocation method for Standard SKU
 */
export class PublicIPAllocationMethodValidator extends BaseValidationRule {
  constructor() {
    super(
      'public-ip-allocation-method',
      'Validates Public IP allocation method matches SKU requirements',
      ValidationSeverity.ERROR,
      ['Microsoft.Network/publicIPAddresses']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const sku = resource.sku?.name || resource.sku;
    const allocationMethod = resource.properties?.publicIPAllocationMethod || resource.publicIPAllocationMethod;

    if (sku === 'Standard' && allocationMethod !== 'Static') {
      return ValidationResultBuilder.error(this.name)
        .withMessage('Standard SKU Public IP must use Static allocation method')
        .withSuggestion('Set publicIPAllocationMethod to "Static"')
        .build();
    }

    return ValidationResultBuilder.success(this.name).build();
  }
}

/**
 * Validates Private DNS Zone location is global
 */
export class PrivateDnsZoneLocationValidator extends BaseValidationRule {
  constructor() {
    super(
      'private-dns-zone-location',
      'Validates Private DNS Zone location is set to global',
      ValidationSeverity.ERROR,
      ['Microsoft.Network/privateDnsZones']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const location = resource.location;

    if (location && location.toLowerCase() !== 'global') {
      return ValidationResultBuilder.error(this.name)
        .withMessage(`Private DNS Zone location must be 'global', not '${location}'`)
        .withSuggestion('Set location: "global" or omit the location property')
        .withDetails('Private DNS Zones are global resources and do not belong to a specific region')
        .build();
    }

    return ValidationResultBuilder.success(this.name).build();
  }
}

/**
 * Validates Private DNS Zone name format
 */
export class PrivateDnsZoneNameValidator extends BaseValidationRule {
  constructor() {
    super(
      'private-dns-zone-name-format',
      'Validates Private DNS Zone name is valid DNS format',
      ValidationSeverity.ERROR,
      ['Microsoft.Network/privateDnsZones']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const zoneName = resource.name || resource.privateZoneName || resource.zoneName;

    if (!zoneName) {
      return ValidationResultBuilder.error(this.name)
        .withMessage('Private DNS Zone name is required')
        .build();
    }

    // Must be valid DNS name format
    const pattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/;

    if (!pattern.test(zoneName)) {
      return ValidationResultBuilder.error(this.name)
        .withMessage('Private DNS Zone name must be valid DNS format')
        .withDetails(`Zone name: ${zoneName}`)
        .withSuggestion('Use lowercase, alphanumeric characters, hyphens, and dots only')
        .build();
    }

    return ValidationResultBuilder.success(this.name).build();
  }
}

/**
 * Validates Private Endpoint group ID is valid for resource type
 */
export class PrivateEndpointGroupIdValidator extends BaseValidationRule {
  constructor() {
    super(
      'private-endpoint-group-id',
      'Validates Private Endpoint group ID is valid for target resource type',
      ValidationSeverity.ERROR,
      ['Microsoft.Network/privateEndpoints']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const groupIds = resource.properties?.privateLinkServiceConnections?.[0]?.properties?.groupIds || resource.groupIds;
    const targetResourceType = context?.targetResourceType;

    if (!groupIds || groupIds.length === 0) {
      return ValidationResultBuilder.error(this.name)
        .withMessage('Private Endpoint must specify group IDs')
        .withSuggestion('Add groupIds array with appropriate subresource names')
        .build();
    }

    const validGroupIds: Record<string, string[]> = {
      'Microsoft.Storage/storageAccounts': ['blob', 'file', 'queue', 'table', 'web', 'dfs'],
      'Microsoft.KeyVault/vaults': ['vault'],
      'Microsoft.DocumentDB/databaseAccounts': ['Sql'],
      'Microsoft.CognitiveServices/accounts': ['account'],
      'Microsoft.Search/searchServices': ['searchService'],
      'Microsoft.Sql/servers': ['sqlServer'],
      'Microsoft.Web/sites': ['sites'],
    };

    if (targetResourceType && validGroupIds[targetResourceType]) {
      const valid = validGroupIds[targetResourceType];
      const invalid = groupIds.filter((id: string) => !valid.includes(id));

      if (invalid.length > 0) {
        return ValidationResultBuilder.error(this.name)
          .withMessage(`Invalid group IDs for ${targetResourceType}`)
          .withDetails(`Invalid IDs: ${invalid.join(', ')}`)
          .withSuggestion(`Valid group IDs: ${valid.join(', ')}`)
          .build();
      }
    }

    return ValidationResultBuilder.success(this.name).build();
  }
}

/**
 * Export all network validators
 */
export const networkValidators = [
  new VNetAddressSpaceValidator(),
  new VNetNameValidator(),
  new SubnetWithinVNetValidator(),
  new SubnetOverlapValidator(),
  new SubnetMinimumSizeValidator(),
  new PrivateEndpointSubnetPoliciesValidator(),
  new NSGPriorityUniqueValidator(),
  new NSGPriorityRangeValidator(),
  new NSGPortRangeValidator(),
  new PublicIPSkuCompatibilityValidator(),
  new PublicIPAllocationMethodValidator(),
  new PrivateDnsZoneLocationValidator(),
  new PrivateDnsZoneNameValidator(),
  new PrivateEndpointGroupIdValidator(),
];
