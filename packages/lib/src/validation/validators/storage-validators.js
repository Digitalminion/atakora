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
exports.storageValidators = exports.StorageAccountTlsVersionValidator = exports.StorageAccountNetworkAclsValidator = exports.StorageAccountPublicAccessValidator = exports.StorageAccountNameValidator = void 0;
var validation_rule_1 = require("../validation-rule");
var validation_result_1 = require("../validation-result");
var common_validators_1 = require("../common-validators");
/**
 * Validates Storage Account name format
 */
var StorageAccountNameValidator = /** @class */ (function (_super) {
    __extends(StorageAccountNameValidator, _super);
    function StorageAccountNameValidator() {
        return _super.call(this, 'storage-account-name-format', 'Validates Storage Account name follows Azure naming rules', validation_result_1.ValidationSeverity.ERROR, ['Microsoft.Storage/storageAccounts']) || this;
    }
    StorageAccountNameValidator.prototype.validate = function (resource, context) {
        var name = resource.name || resource.storageAccountName;
        if (!name) {
            return validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage('Storage Account name is required')
                .build();
        }
        var results = [];
        // Must be lowercase
        results.push((0, common_validators_1.validateLowercase)(name, 'Storage Account name', this.name));
        // Length check (3-24)
        results.push((0, common_validators_1.validateLength)(name, 3, 24, 'Storage Account name', this.name));
        // Pattern check (lowercase alphanumeric only, no hyphens)
        var pattern = /^[a-z0-9]+$/;
        results.push((0, common_validators_1.validatePattern)(name, pattern, 'Storage Account name', this.name, 'Storage Account names can only contain lowercase letters and numbers (no hyphens or special characters)'));
        // Add global uniqueness warning
        results.push((0, common_validators_1.warnGloballyUnique)(this.name, 'Storage Account'));
        return common_validators_1.collectResults.apply(void 0, results);
    };
    return StorageAccountNameValidator;
}(validation_rule_1.BaseValidationRule));
exports.StorageAccountNameValidator = StorageAccountNameValidator;
/**
 * Validates Storage Account public access consistency
 */
var StorageAccountPublicAccessValidator = /** @class */ (function (_super) {
    __extends(StorageAccountPublicAccessValidator, _super);
    function StorageAccountPublicAccessValidator() {
        return _super.call(this, 'storage-account-public-access', 'Validates Storage Account public access settings are consistent', validation_result_1.ValidationSeverity.ERROR, ['Microsoft.Storage/storageAccounts']) || this;
    }
    StorageAccountPublicAccessValidator.prototype.validate = function (resource, context) {
        var props = resource.properties || {};
        var allowBlobPublicAccess = props.allowBlobPublicAccess;
        var publicNetworkAccess = props.publicNetworkAccess;
        if (allowBlobPublicAccess && publicNetworkAccess === 'Disabled') {
            return validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage('Cannot allow blob public access when public network access is disabled')
                .withSuggestion('Set allowBlobPublicAccess: false or publicNetworkAccess: "Enabled"')
                .withDetails('These settings are mutually exclusive')
                .build();
        }
        return validation_result_1.ValidationResultBuilder.success(this.name).build();
    };
    return StorageAccountPublicAccessValidator;
}(validation_rule_1.BaseValidationRule));
exports.StorageAccountPublicAccessValidator = StorageAccountPublicAccessValidator;
/**
 * Validates Storage Account network ACLs have default action
 */
var StorageAccountNetworkAclsValidator = /** @class */ (function (_super) {
    __extends(StorageAccountNetworkAclsValidator, _super);
    function StorageAccountNetworkAclsValidator() {
        return _super.call(this, 'storage-account-network-acls', 'Validates Storage Account network ACLs have default action specified', validation_result_1.ValidationSeverity.ERROR, ['Microsoft.Storage/storageAccounts']) || this;
    }
    StorageAccountNetworkAclsValidator.prototype.validate = function (resource, context) {
        var _a;
        var networkAcls = (_a = resource.properties) === null || _a === void 0 ? void 0 : _a.networkAcls;
        if (!networkAcls) {
            return validation_result_1.ValidationResultBuilder.success(this.name).build();
        }
        if (!networkAcls.defaultAction) {
            return validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage('Network ACLs must specify defaultAction')
                .withSuggestion('Set networkAcls.defaultAction to "Allow" or "Deny"')
                .build();
        }
        return validation_result_1.ValidationResultBuilder.success(this.name).build();
    };
    return StorageAccountNetworkAclsValidator;
}(validation_rule_1.BaseValidationRule));
exports.StorageAccountNetworkAclsValidator = StorageAccountNetworkAclsValidator;
/**
 * Validates Storage Account TLS version
 */
var StorageAccountTlsVersionValidator = /** @class */ (function (_super) {
    __extends(StorageAccountTlsVersionValidator, _super);
    function StorageAccountTlsVersionValidator() {
        return _super.call(this, 'storage-account-tls-version', 'Validates Storage Account uses secure TLS version', validation_result_1.ValidationSeverity.WARNING, ['Microsoft.Storage/storageAccounts']) || this;
    }
    StorageAccountTlsVersionValidator.prototype.validate = function (resource, context) {
        var _a;
        var tlsVersion = (_a = resource.properties) === null || _a === void 0 ? void 0 : _a.minimumTlsVersion;
        if (!tlsVersion) {
            return validation_result_1.ValidationResultBuilder.warning(this.name)
                .withMessage('No minimum TLS version specified')
                .withSuggestion('Set minimumTlsVersion to "TLS1_2" or higher for security')
                .build();
        }
        if (['TLS1_0', 'TLS1_1'].includes(tlsVersion)) {
            return validation_result_1.ValidationResultBuilder.warning(this.name)
                .withMessage("TLS version ".concat(tlsVersion, " is deprecated"))
                .withSuggestion('Use TLS1_2 or TLS1_3 for better security')
                .build();
        }
        return validation_result_1.ValidationResultBuilder.success(this.name).build();
    };
    return StorageAccountTlsVersionValidator;
}(validation_rule_1.BaseValidationRule));
exports.StorageAccountTlsVersionValidator = StorageAccountTlsVersionValidator;
/**
 * Export all storage validators
 */
exports.storageValidators = [
    new StorageAccountNameValidator(),
    new StorageAccountPublicAccessValidator(),
    new StorageAccountNetworkAclsValidator(),
    new StorageAccountTlsVersionValidator(),
];
