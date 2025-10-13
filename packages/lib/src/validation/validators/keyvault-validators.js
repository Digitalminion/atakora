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
Object.defineProperty(exports, "__esModule", { value: true });
exports.keyVaultValidators = exports.KeyVaultPublicAccessValidator = exports.KeyVaultNetworkAclsValidator = exports.KeyVaultRbacAccessPolicyValidator = exports.KeyVaultRetentionValidator = exports.KeyVaultSoftDeleteValidator = exports.KeyVaultNameValidator = void 0;
var validation_rule_1 = require("../validation-rule");
var validation_result_1 = require("../validation-result");
var common_validators_1 = require("../common-validators");
/**
 * Validates Key Vault name format
 */
var KeyVaultNameValidator = /** @class */ (function (_super) {
    __extends(KeyVaultNameValidator, _super);
    function KeyVaultNameValidator() {
        return _super.call(this, 'keyvault-name-format', 'Validates Key Vault name follows Azure naming rules', validation_result_1.ValidationSeverity.ERROR, ['Microsoft.KeyVault/vaults']) || this;
    }
    KeyVaultNameValidator.prototype.validate = function (resource, context) {
        var name = resource.name || resource.vaultName;
        if (!name) {
            return validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage('Key Vault name is required')
                .build();
        }
        var results = [];
        // Length check (3-24)
        results.push((0, common_validators_1.validateLength)(name, 3, 24, 'Key Vault name', this.name));
        // Must start with letter
        results.push((0, common_validators_1.validateStartsWith)(name, 'letter', 'Key Vault name', this.name));
        // Must end with letter or number
        results.push((0, common_validators_1.validateEndsWith)(name, 'alphanumeric', 'Key Vault name', this.name));
        // No consecutive hyphens
        results.push((0, common_validators_1.validateNoConsecutive)(name, '-', 'Key Vault name', this.name));
        // Pattern check (alphanumeric and hyphens only)
        var pattern = /^[a-zA-Z][a-zA-Z0-9-]*[a-zA-Z0-9]$/;
        results.push((0, common_validators_1.validatePattern)(name, pattern, 'Key Vault name', this.name, 'Key Vault names must contain only alphanumeric characters and hyphens'));
        // Add global uniqueness warning
        results.push((0, common_validators_1.warnGloballyUnique)(this.name, 'Key Vault'));
        return common_validators_1.collectResults.apply(void 0, results);
    };
    return KeyVaultNameValidator;
}(validation_rule_1.BaseValidationRule));
exports.KeyVaultNameValidator = KeyVaultNameValidator;
/**
 * Validates Key Vault soft delete and purge protection configuration
 */
var KeyVaultSoftDeleteValidator = /** @class */ (function (_super) {
    __extends(KeyVaultSoftDeleteValidator, _super);
    function KeyVaultSoftDeleteValidator() {
        return _super.call(this, 'keyvault-soft-delete', 'Validates Key Vault soft delete and purge protection settings', validation_result_1.ValidationSeverity.ERROR, ['Microsoft.KeyVault/vaults']) || this;
    }
    KeyVaultSoftDeleteValidator.prototype.validate = function (resource, context) {
        var props = resource.properties || {};
        var enablePurgeProtection = props.enablePurgeProtection;
        var enableSoftDelete = props.enableSoftDelete;
        var results = [];
        // Purge protection requires soft delete
        if (enablePurgeProtection && enableSoftDelete === false) {
            results.push(validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage('Purge protection requires soft delete to be enabled')
                .withSuggestion('Set enableSoftDelete: true')
                .build());
        }
        // Soft delete cannot be disabled (Azure policy requirement)
        if (enableSoftDelete === false) {
            results.push(validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage('Soft delete cannot be disabled (Azure policy requirement)')
                .withSuggestion('Remove enableSoftDelete property or set to true')
                .withDetails('Soft delete is required for compliance and data protection')
                .build());
        }
        return results.length > 0 ? results : validation_result_1.ValidationResultBuilder.success(this.name).build();
    };
    return KeyVaultSoftDeleteValidator;
}(validation_rule_1.BaseValidationRule));
exports.KeyVaultSoftDeleteValidator = KeyVaultSoftDeleteValidator;
/**
 * Validates Key Vault soft delete retention period
 */
var KeyVaultRetentionValidator = /** @class */ (function (_super) {
    __extends(KeyVaultRetentionValidator, _super);
    function KeyVaultRetentionValidator() {
        return _super.call(this, 'keyvault-retention-period', 'Validates Key Vault soft delete retention period is within valid range', validation_result_1.ValidationSeverity.ERROR, ['Microsoft.KeyVault/vaults']) || this;
    }
    KeyVaultRetentionValidator.prototype.validate = function (resource, context) {
        var _a;
        var retentionDays = (_a = resource.properties) === null || _a === void 0 ? void 0 : _a.softDeleteRetentionInDays;
        if (!retentionDays) {
            return validation_result_1.ValidationResultBuilder.warning(this.name)
                .withMessage('No soft delete retention period specified')
                .withSuggestion('Consider setting softDeleteRetentionInDays to 90 for maximum protection')
                .build();
        }
        var rangeResult = (0, common_validators_1.validateRange)(retentionDays, 7, 90, 'Soft delete retention period', this.name);
        if (rangeResult) {
            return rangeResult;
        }
        if (retentionDays < 90) {
            return validation_result_1.ValidationResultBuilder.warning(this.name)
                .withMessage("Soft delete retention period is ".concat(retentionDays, " days"))
                .withSuggestion('Consider using 90-day retention for maximum data protection')
                .build();
        }
        return validation_result_1.ValidationResultBuilder.success(this.name).build();
    };
    return KeyVaultRetentionValidator;
}(validation_rule_1.BaseValidationRule));
exports.KeyVaultRetentionValidator = KeyVaultRetentionValidator;
/**
 * Validates Key Vault RBAC vs Access Policies configuration
 */
var KeyVaultRbacAccessPolicyValidator = /** @class */ (function (_super) {
    __extends(KeyVaultRbacAccessPolicyValidator, _super);
    function KeyVaultRbacAccessPolicyValidator() {
        return _super.call(this, 'keyvault-rbac-access-policy', 'Warns when both RBAC and access policies are configured', validation_result_1.ValidationSeverity.WARNING, ['Microsoft.KeyVault/vaults']) || this;
    }
    KeyVaultRbacAccessPolicyValidator.prototype.validate = function (resource, context) {
        var props = resource.properties || {};
        var rbacEnabled = props.enableRbacAuthorization;
        var hasAccessPolicies = props.accessPolicies && props.accessPolicies.length > 0;
        if (rbacEnabled && hasAccessPolicies) {
            return validation_result_1.ValidationResultBuilder.warning(this.name)
                .withMessage('Both RBAC and access policies are configured')
                .withSuggestion('Use RBAC exclusively for simpler management')
                .withDetails('RBAC is the recommended authorization method')
                .build();
        }
        return validation_result_1.ValidationResultBuilder.success(this.name).build();
    };
    return KeyVaultRbacAccessPolicyValidator;
}(validation_rule_1.BaseValidationRule));
exports.KeyVaultRbacAccessPolicyValidator = KeyVaultRbacAccessPolicyValidator;
/**
 * Validates Key Vault network ACLs configuration
 */
var KeyVaultNetworkAclsValidator = /** @class */ (function (_super) {
    __extends(KeyVaultNetworkAclsValidator, _super);
    function KeyVaultNetworkAclsValidator() {
        return _super.call(this, 'keyvault-network-acls', 'Validates Key Vault network ACLs allow Azure services when needed', validation_result_1.ValidationSeverity.WARNING, ['Microsoft.KeyVault/vaults']) || this;
    }
    KeyVaultNetworkAclsValidator.prototype.validate = function (resource, context) {
        var _a;
        var networkAcls = (_a = resource.properties) === null || _a === void 0 ? void 0 : _a.networkAcls;
        if (!networkAcls) {
            return validation_result_1.ValidationResultBuilder.success(this.name).build();
        }
        var defaultAction = networkAcls.defaultAction;
        var bypass = networkAcls.bypass;
        if (defaultAction === 'Deny' &&
            (!bypass || !bypass.includes('AzureServices'))) {
            return validation_result_1.ValidationResultBuilder.warning(this.name)
                .withMessage('Network ACLs deny all access without Azure Services bypass')
                .withSuggestion('Consider adding bypass: "AzureServices" to allow trusted Azure services')
                .withDetails('This allows services like Azure Backup and Azure Site Recovery to access the vault')
                .build();
        }
        return validation_result_1.ValidationResultBuilder.success(this.name).build();
    };
    return KeyVaultNetworkAclsValidator;
}(validation_rule_1.BaseValidationRule));
exports.KeyVaultNetworkAclsValidator = KeyVaultNetworkAclsValidator;
/**
 * Validates Key Vault public network access with private endpoints
 */
var KeyVaultPublicAccessValidator = /** @class */ (function (_super) {
    __extends(KeyVaultPublicAccessValidator, _super);
    function KeyVaultPublicAccessValidator() {
        return _super.call(this, 'keyvault-public-access', 'Validates Key Vault has private endpoints before disabling public access', validation_result_1.ValidationSeverity.ERROR, ['Microsoft.KeyVault/vaults']) || this;
    }
    KeyVaultPublicAccessValidator.prototype.validate = function (resource, context) {
        var _a;
        var publicAccess = (_a = resource.properties) === null || _a === void 0 ? void 0 : _a.publicNetworkAccess;
        var hasPrivateEndpoints = context === null || context === void 0 ? void 0 : context.hasPrivateEndpoints;
        if (publicAccess === 'disabled' &&
            (!hasPrivateEndpoints || hasPrivateEndpoints === false)) {
            return validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage('Public network access disabled without private endpoints')
                .withSuggestion('Create private endpoints before disabling public access')
                .withDetails('Without either, the vault will be inaccessible')
                .build();
        }
        return validation_result_1.ValidationResultBuilder.success(this.name).build();
    };
    return KeyVaultPublicAccessValidator;
}(validation_rule_1.BaseValidationRule));
exports.KeyVaultPublicAccessValidator = KeyVaultPublicAccessValidator;
/**
 * Export all Key Vault validators
 */
exports.keyVaultValidators = [
    new KeyVaultNameValidator(),
    new KeyVaultSoftDeleteValidator(),
    new KeyVaultRetentionValidator(),
    new KeyVaultRbacAccessPolicyValidator(),
    new KeyVaultNetworkAclsValidator(),
    new KeyVaultPublicAccessValidator(),
];
