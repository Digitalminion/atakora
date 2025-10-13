"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.networkValidators = exports.PrivateEndpointGroupIdValidator = exports.PrivateDnsZoneNameValidator = exports.PrivateDnsZoneLocationValidator = exports.PublicIPAllocationMethodValidator = exports.PublicIPSkuCompatibilityValidator = exports.NSGPortRangeValidator = exports.NSGPriorityRangeValidator = exports.NSGPriorityUniqueValidator = exports.PrivateEndpointSubnetPoliciesValidator = exports.SubnetMinimumSizeValidator = exports.SubnetOverlapValidator = exports.SubnetWithinVNetValidator = exports.VNetNameValidator = exports.VNetAddressSpaceValidator = void 0;
var validation_rule_1 = require("../validation-rule");
var validation_result_1 = require("../validation-result");
var common_validators_1 = require("../common-validators");
var validation_helpers_1 = require("../../core/validation/validation-helpers");
/**
 * Validates Virtual Network address space format
 */
var VNetAddressSpaceValidator = /** @class */ (function (_super) {
    __extends(VNetAddressSpaceValidator, _super);
    function VNetAddressSpaceValidator() {
        return _super.call(this, 'vnet-address-space-format', 'Validates VNet address space is valid CIDR notation', validation_result_1.ValidationSeverity.ERROR, ['Microsoft.Network/virtualNetworks']) || this;
    }
    VNetAddressSpaceValidator.prototype.validate = function (resource, context) {
        var _a, _b, _c;
        var addressSpace = ((_c = (_b = (_a = resource.properties) === null || _a === void 0 ? void 0 : _a.addressSpace) === null || _b === void 0 ? void 0 : _b.addressPrefixes) === null || _c === void 0 ? void 0 : _c[0]) || resource.addressSpace;
        if (!addressSpace) {
            return validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage('VNet must have at least one address space')
                .withSuggestion('Add addressSpace with CIDR notation (e.g., "10.0.0.0/16")')
                .build();
        }
        if (!(0, validation_helpers_1.isValidCIDR)(addressSpace)) {
            return validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage('VNet address space is not valid CIDR notation')
                .withDetails("Address space: ".concat(addressSpace))
                .withSuggestion('Use format: x.x.x.x/y where x is 0-255 and y is 0-32')
                .build();
        }
        return validation_result_1.ValidationResultBuilder.success(this.name).build();
    };
    return VNetAddressSpaceValidator;
}(validation_rule_1.BaseValidationRule));
exports.VNetAddressSpaceValidator = VNetAddressSpaceValidator;
/**
 * Validates Virtual Network name format
 */
var VNetNameValidator = /** @class */ (function (_super) {
    __extends(VNetNameValidator, _super);
    function VNetNameValidator() {
        return _super.call(this, 'vnet-name-format', 'Validates VNet name follows Azure naming rules', validation_result_1.ValidationSeverity.ERROR, ['Microsoft.Network/virtualNetworks']) || this;
    }
    VNetNameValidator.prototype.validate = function (resource, context) {
        var name = resource.name || resource.virtualNetworkName;
        if (!name) {
            return validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage('VNet name is required')
                .build();
        }
        var results = [];
        // Length check
        var lengthResult = (0, common_validators_1.validateLength)(name, 2, 64, 'VNet name', this.name);
        if (lengthResult)
            results.push(lengthResult);
        // Pattern check
        var pattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9_]$/;
        var patternResult = (0, common_validators_1.validatePattern)(name, pattern, 'VNet name', this.name, 'VNet name must start and end with alphanumeric, can contain letters, numbers, underscores, periods, hyphens');
        if (patternResult)
            results.push(patternResult);
        return results.length > 0 ? results : validation_result_1.ValidationResultBuilder.success(this.name).build();
    };
    return VNetNameValidator;
}(validation_rule_1.BaseValidationRule));
exports.VNetNameValidator = VNetNameValidator;
/**
 * Validates subnet is within VNet address space
 */
var SubnetWithinVNetValidator = /** @class */ (function (_super) {
    __extends(SubnetWithinVNetValidator, _super);
    function SubnetWithinVNetValidator() {
        return _super.call(this, 'subnet-within-vnet', 'Validates subnet address prefix is within VNet address space', validation_result_1.ValidationSeverity.ERROR, ['Microsoft.Network/virtualNetworks/subnets']) || this;
    }
    SubnetWithinVNetValidator.prototype.validate = function (resource, context) {
        var _a;
        var subnetPrefix = ((_a = resource.properties) === null || _a === void 0 ? void 0 : _a.addressPrefix) || resource.addressPrefix;
        var vnetPrefix = context === null || context === void 0 ? void 0 : context.vnetAddressSpace;
        if (!subnetPrefix) {
            return validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage('Subnet must have address prefix')
                .build();
        }
        if (!(0, validation_helpers_1.isValidCIDR)(subnetPrefix)) {
            return validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage('Subnet address prefix is not valid CIDR notation')
                .withDetails("Address prefix: ".concat(subnetPrefix))
                .build();
        }
        if (vnetPrefix && !(0, validation_helpers_1.isWithinCIDR)(subnetPrefix, vnetPrefix)) {
            return validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage('Subnet address prefix is not within VNet address space')
                .withDetails("Subnet: ".concat(subnetPrefix, ", VNet: ").concat(vnetPrefix))
                .withSuggestion('Subnet must be a subset of the VNet address space')
                .build();
        }
        return validation_result_1.ValidationResultBuilder.success(this.name).build();
    };
    return SubnetWithinVNetValidator;
}(validation_rule_1.BaseValidationRule));
exports.SubnetWithinVNetValidator = SubnetWithinVNetValidator;
/**
 * Validates subnets do not overlap
 */
var SubnetOverlapValidator = /** @class */ (function (_super) {
    __extends(SubnetOverlapValidator, _super);
    function SubnetOverlapValidator() {
        return _super.call(this, 'subnet-no-overlap', 'Validates subnets do not have overlapping address ranges', validation_result_1.ValidationSeverity.ERROR, ['Microsoft.Network/virtualNetworks/subnets']) || this;
    }
    SubnetOverlapValidator.prototype.validate = function (resource, context) {
        var _a;
        var subnetPrefix = ((_a = resource.properties) === null || _a === void 0 ? void 0 : _a.addressPrefix) || resource.addressPrefix;
        var existingSubnets = (context === null || context === void 0 ? void 0 : context.existingSubnets) || [];
        if (!subnetPrefix) {
            return validation_result_1.ValidationResultBuilder.success(this.name).build();
        }
        var overlapping = existingSubnets.filter(function (subnet) {
            var _a;
            var existingPrefix = ((_a = subnet.properties) === null || _a === void 0 ? void 0 : _a.addressPrefix) || subnet.addressPrefix;
            return existingPrefix && existingPrefix !== subnetPrefix && (0, validation_helpers_1.cidrsOverlap)(subnetPrefix, existingPrefix);
        });
        if (overlapping.length > 0) {
            var names = overlapping.map(function (s) { return s.name || s.subnetName; }).join(', ');
            return validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage('Subnet address range overlaps with existing subnets')
                .withDetails("Overlapping subnets: ".concat(names))
                .withSuggestion('Choose a non-overlapping address range')
                .build();
        }
        return validation_result_1.ValidationResultBuilder.success(this.name).build();
    };
    return SubnetOverlapValidator;
}(validation_rule_1.BaseValidationRule));
exports.SubnetOverlapValidator = SubnetOverlapValidator;
/**
 * Validates subnet has minimum usable IPs
 */
var SubnetMinimumSizeValidator = /** @class */ (function (_super) {
    __extends(SubnetMinimumSizeValidator, _super);
    function SubnetMinimumSizeValidator() {
        return _super.call(this, 'subnet-minimum-size', 'Validates subnet has at least 3 usable IP addresses', validation_result_1.ValidationSeverity.WARNING, ['Microsoft.Network/virtualNetworks/subnets']) || this;
    }
    SubnetMinimumSizeValidator.prototype.validate = function (resource, context) {
        var _a;
        var subnetPrefix = ((_a = resource.properties) === null || _a === void 0 ? void 0 : _a.addressPrefix) || resource.addressPrefix;
        if (!subnetPrefix) {
            return validation_result_1.ValidationResultBuilder.success(this.name).build();
        }
        var prefixLength = parseInt(subnetPrefix.split('/')[1]);
        var totalIps = Math.pow(2, 32 - prefixLength);
        var usableIps = totalIps - 5; // Azure reserves 5 IPs per subnet
        if (usableIps < 3) {
            return validation_result_1.ValidationResultBuilder.warning(this.name)
                .withMessage("Subnet /".concat(prefixLength, " has only ").concat(usableIps, " usable IP addresses"))
                .withSuggestion('Use /29 or larger subnet for at least 3 usable IPs')
                .withDetails('Azure reserves first 4 and last 1 IP address in each subnet')
                .build();
        }
        return validation_result_1.ValidationResultBuilder.success(this.name).build();
    };
    return SubnetMinimumSizeValidator;
}(validation_rule_1.BaseValidationRule));
exports.SubnetMinimumSizeValidator = SubnetMinimumSizeValidator;
/**
 * Validates private endpoint subnet has network policies disabled
 */
var PrivateEndpointSubnetPoliciesValidator = /** @class */ (function (_super) {
    __extends(PrivateEndpointSubnetPoliciesValidator, _super);
    function PrivateEndpointSubnetPoliciesValidator() {
        return _super.call(this, 'private-endpoint-subnet-policies', 'Validates subnet has network policies disabled for private endpoints', validation_result_1.ValidationSeverity.ERROR, ['Microsoft.Network/virtualNetworks/subnets']) || this;
    }
    PrivateEndpointSubnetPoliciesValidator.prototype.validate = function (resource, context) {
        var _a;
        // Only validate if this subnet will have private endpoints
        var hasPrivateEndpoints = context === null || context === void 0 ? void 0 : context.hasPrivateEndpoints;
        if (!hasPrivateEndpoints) {
            return validation_result_1.ValidationResultBuilder.success(this.name).build();
        }
        var policies = (_a = resource.properties) === null || _a === void 0 ? void 0 : _a.privateEndpointNetworkPolicies;
        if (policies !== 'Disabled') {
            return validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage('Subnet must have privateEndpointNetworkPolicies set to "Disabled" for private endpoints')
                .withSuggestion('Set privateEndpointNetworkPolicies: "Disabled" on the subnet')
                .withDetails('This must be configured before creating private endpoints')
                .build();
        }
        return validation_result_1.ValidationResultBuilder.success(this.name).build();
    };
    return PrivateEndpointSubnetPoliciesValidator;
}(validation_rule_1.BaseValidationRule));
exports.PrivateEndpointSubnetPoliciesValidator = PrivateEndpointSubnetPoliciesValidator;
/**
 * Validates NSG rule priority uniqueness
 */
var NSGPriorityUniqueValidator = /** @class */ (function (_super) {
    __extends(NSGPriorityUniqueValidator, _super);
    function NSGPriorityUniqueValidator() {
        return _super.call(this, 'nsg-priority-unique', 'Validates NSG rule priorities are unique', validation_result_1.ValidationSeverity.ERROR, ['Microsoft.Network/networkSecurityGroups']) || this;
    }
    NSGPriorityUniqueValidator.prototype.validate = function (resource, context) {
        var _a;
        var rules = ((_a = resource.properties) === null || _a === void 0 ? void 0 : _a.securityRules) || resource.securityRules || [];
        var priorities = rules.map(function (r) { var _a; return r.priority || ((_a = r.properties) === null || _a === void 0 ? void 0 : _a.priority); });
        var duplicates = priorities.filter(function (p, i) { return priorities.indexOf(p) !== i; });
        if (duplicates.length > 0) {
            var uniqueDuplicates = __spreadArray([], new Set(duplicates), true);
            return validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage('NSG has rules with duplicate priorities')
                .withDetails("Duplicate priorities: ".concat(uniqueDuplicates.join(', ')))
                .withSuggestion('Each rule must have a unique priority between 100 and 4096')
                .build();
        }
        return validation_result_1.ValidationResultBuilder.success(this.name).build();
    };
    return NSGPriorityUniqueValidator;
}(validation_rule_1.BaseValidationRule));
exports.NSGPriorityUniqueValidator = NSGPriorityUniqueValidator;
/**
 * Validates NSG rule priority range
 */
var NSGPriorityRangeValidator = /** @class */ (function (_super) {
    __extends(NSGPriorityRangeValidator, _super);
    function NSGPriorityRangeValidator() {
        return _super.call(this, 'nsg-priority-range', 'Validates NSG rule priorities are in valid range', validation_result_1.ValidationSeverity.ERROR, ['Microsoft.Network/networkSecurityGroups']) || this;
    }
    NSGPriorityRangeValidator.prototype.validate = function (resource, context) {
        var _this = this;
        var _a;
        var rules = ((_a = resource.properties) === null || _a === void 0 ? void 0 : _a.securityRules) || resource.securityRules || [];
        var results = [];
        rules.forEach(function (rule, index) {
            var _a;
            var priority = rule.priority || ((_a = rule.properties) === null || _a === void 0 ? void 0 : _a.priority);
            var ruleName = rule.name || "rule-".concat(index);
            var rangeResult = (0, common_validators_1.validateRange)(priority, 100, 4096, "Priority for rule '".concat(ruleName, "'"), _this.name);
            if (rangeResult) {
                results.push(rangeResult);
            }
        });
        return results.length > 0 ? results : validation_result_1.ValidationResultBuilder.success(this.name).build();
    };
    return NSGPriorityRangeValidator;
}(validation_rule_1.BaseValidationRule));
exports.NSGPriorityRangeValidator = NSGPriorityRangeValidator;
/**
 * Validates NSG port ranges
 */
var NSGPortRangeValidator = /** @class */ (function (_super) {
    __extends(NSGPortRangeValidator, _super);
    function NSGPortRangeValidator() {
        return _super.call(this, 'nsg-port-range-format', 'Validates NSG rule port ranges are valid', validation_result_1.ValidationSeverity.ERROR, ['Microsoft.Network/networkSecurityGroups']) || this;
    }
    NSGPortRangeValidator.prototype.validate = function (resource, context) {
        var _this = this;
        var _a;
        var rules = ((_a = resource.properties) === null || _a === void 0 ? void 0 : _a.securityRules) || resource.securityRules || [];
        var results = [];
        rules.forEach(function (rule, index) {
            var ruleName = rule.name || "rule-".concat(index);
            var props = rule.properties || rule;
            var ports = __spreadArray(__spreadArray([
                props.destinationPortRange,
                props.sourcePortRange
            ], (props.destinationPortRanges || []), true), (props.sourcePortRanges || []), true).filter(Boolean);
            var invalid = ports.filter(function (p) { return !(0, validation_helpers_1.isValidPortRange)(p); });
            if (invalid.length > 0) {
                results.push(validation_result_1.ValidationResultBuilder.error(_this.name)
                    .withMessage("Rule '".concat(ruleName, "' has invalid port range format"))
                    .withDetails("Invalid ports: ".concat(invalid.join(', ')))
                    .withSuggestion('Use format: single port (80), range (80-443), or wildcard (*)')
                    .build());
            }
        });
        return results.length > 0 ? results : validation_result_1.ValidationResultBuilder.success(this.name).build();
    };
    return NSGPortRangeValidator;
}(validation_rule_1.BaseValidationRule));
exports.NSGPortRangeValidator = NSGPortRangeValidator;
/**
 * Validates Public IP SKU compatibility with Standard Load Balancer/Application Gateway
 */
var PublicIPSkuCompatibilityValidator = /** @class */ (function (_super) {
    __extends(PublicIPSkuCompatibilityValidator, _super);
    function PublicIPSkuCompatibilityValidator() {
        return _super.call(this, 'public-ip-sku-compatibility', 'Validates Public IP SKU is compatible with attached resources', validation_result_1.ValidationSeverity.ERROR, ['Microsoft.Network/publicIPAddresses']) || this;
    }
    PublicIPSkuCompatibilityValidator.prototype.validate = function (resource, context) {
        var _a;
        var sku = ((_a = resource.sku) === null || _a === void 0 ? void 0 : _a.name) || resource.sku;
        var targetResourceSku = context === null || context === void 0 ? void 0 : context.targetResourceSku;
        if (targetResourceSku === 'Standard' && sku !== 'Standard') {
            return validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage('Standard SKU resources require Standard SKU Public IP')
                .withDetails("Public IP SKU: ".concat(sku, ", Target resource SKU: ").concat(targetResourceSku))
                .withSuggestion('Change Public IP SKU to Standard')
                .build();
        }
        return validation_result_1.ValidationResultBuilder.success(this.name).build();
    };
    return PublicIPSkuCompatibilityValidator;
}(validation_rule_1.BaseValidationRule));
exports.PublicIPSkuCompatibilityValidator = PublicIPSkuCompatibilityValidator;
/**
 * Validates Public IP allocation method for Standard SKU
 */
var PublicIPAllocationMethodValidator = /** @class */ (function (_super) {
    __extends(PublicIPAllocationMethodValidator, _super);
    function PublicIPAllocationMethodValidator() {
        return _super.call(this, 'public-ip-allocation-method', 'Validates Public IP allocation method matches SKU requirements', validation_result_1.ValidationSeverity.ERROR, ['Microsoft.Network/publicIPAddresses']) || this;
    }
    PublicIPAllocationMethodValidator.prototype.validate = function (resource, context) {
        var _a, _b;
        var sku = ((_a = resource.sku) === null || _a === void 0 ? void 0 : _a.name) || resource.sku;
        var allocationMethod = ((_b = resource.properties) === null || _b === void 0 ? void 0 : _b.publicIPAllocationMethod) || resource.publicIPAllocationMethod;
        if (sku === 'Standard' && allocationMethod !== 'Static') {
            return validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage('Standard SKU Public IP must use Static allocation method')
                .withSuggestion('Set publicIPAllocationMethod to "Static"')
                .build();
        }
        return validation_result_1.ValidationResultBuilder.success(this.name).build();
    };
    return PublicIPAllocationMethodValidator;
}(validation_rule_1.BaseValidationRule));
exports.PublicIPAllocationMethodValidator = PublicIPAllocationMethodValidator;
/**
 * Validates Private DNS Zone location is global
 */
var PrivateDnsZoneLocationValidator = /** @class */ (function (_super) {
    __extends(PrivateDnsZoneLocationValidator, _super);
    function PrivateDnsZoneLocationValidator() {
        return _super.call(this, 'private-dns-zone-location', 'Validates Private DNS Zone location is set to global', validation_result_1.ValidationSeverity.ERROR, ['Microsoft.Network/privateDnsZones']) || this;
    }
    PrivateDnsZoneLocationValidator.prototype.validate = function (resource, context) {
        var location = resource.location;
        if (location && location.toLowerCase() !== 'global') {
            return validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage("Private DNS Zone location must be 'global', not '".concat(location, "'"))
                .withSuggestion('Set location: "global" or omit the location property')
                .withDetails('Private DNS Zones are global resources and do not belong to a specific region')
                .build();
        }
        return validation_result_1.ValidationResultBuilder.success(this.name).build();
    };
    return PrivateDnsZoneLocationValidator;
}(validation_rule_1.BaseValidationRule));
exports.PrivateDnsZoneLocationValidator = PrivateDnsZoneLocationValidator;
/**
 * Validates Private DNS Zone name format
 */
var PrivateDnsZoneNameValidator = /** @class */ (function (_super) {
    __extends(PrivateDnsZoneNameValidator, _super);
    function PrivateDnsZoneNameValidator() {
        return _super.call(this, 'private-dns-zone-name-format', 'Validates Private DNS Zone name is valid DNS format', validation_result_1.ValidationSeverity.ERROR, ['Microsoft.Network/privateDnsZones']) || this;
    }
    PrivateDnsZoneNameValidator.prototype.validate = function (resource, context) {
        var zoneName = resource.name || resource.privateZoneName || resource.zoneName;
        if (!zoneName) {
            return validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage('Private DNS Zone name is required')
                .build();
        }
        // Must be valid DNS name format
        var pattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/;
        if (!pattern.test(zoneName)) {
            return validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage('Private DNS Zone name must be valid DNS format')
                .withDetails("Zone name: ".concat(zoneName))
                .withSuggestion('Use lowercase, alphanumeric characters, hyphens, and dots only')
                .build();
        }
        return validation_result_1.ValidationResultBuilder.success(this.name).build();
    };
    return PrivateDnsZoneNameValidator;
}(validation_rule_1.BaseValidationRule));
exports.PrivateDnsZoneNameValidator = PrivateDnsZoneNameValidator;
/**
 * Validates Private Endpoint group ID is valid for resource type
 */
var PrivateEndpointGroupIdValidator = /** @class */ (function (_super) {
    __extends(PrivateEndpointGroupIdValidator, _super);
    function PrivateEndpointGroupIdValidator() {
        return _super.call(this, 'private-endpoint-group-id', 'Validates Private Endpoint group ID is valid for target resource type', validation_result_1.ValidationSeverity.ERROR, ['Microsoft.Network/privateEndpoints']) || this;
    }
    PrivateEndpointGroupIdValidator.prototype.validate = function (resource, context) {
        var _a, _b, _c, _d;
        var groupIds = ((_d = (_c = (_b = (_a = resource.properties) === null || _a === void 0 ? void 0 : _a.privateLinkServiceConnections) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.properties) === null || _d === void 0 ? void 0 : _d.groupIds) || resource.groupIds;
        var targetResourceType = context === null || context === void 0 ? void 0 : context.targetResourceType;
        if (!groupIds || groupIds.length === 0) {
            return validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage('Private Endpoint must specify group IDs')
                .withSuggestion('Add groupIds array with appropriate subresource names')
                .build();
        }
        var validGroupIds = {
            'Microsoft.Storage/storageAccounts': ['blob', 'file', 'queue', 'table', 'web', 'dfs'],
            'Microsoft.KeyVault/vaults': ['vault'],
            'Microsoft.DocumentDB/databaseAccounts': ['Sql'],
            'Microsoft.CognitiveServices/accounts': ['account'],
            'Microsoft.Search/searchServices': ['searchService'],
            'Microsoft.Sql/servers': ['sqlServer'],
            'Microsoft.Web/sites': ['sites'],
        };
        if (targetResourceType && validGroupIds[targetResourceType]) {
            var valid_1 = validGroupIds[targetResourceType];
            var invalid = groupIds.filter(function (id) { return !valid_1.includes(id); });
            if (invalid.length > 0) {
                return validation_result_1.ValidationResultBuilder.error(this.name)
                    .withMessage("Invalid group IDs for ".concat(targetResourceType))
                    .withDetails("Invalid IDs: ".concat(invalid.join(', ')))
                    .withSuggestion("Valid group IDs: ".concat(valid_1.join(', ')))
                    .build();
            }
        }
        return validation_result_1.ValidationResultBuilder.success(this.name).build();
    };
    return PrivateEndpointGroupIdValidator;
}(validation_rule_1.BaseValidationRule));
exports.PrivateEndpointGroupIdValidator = PrivateEndpointGroupIdValidator;
/**
 * Export all network validators
 */
exports.networkValidators = [
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
