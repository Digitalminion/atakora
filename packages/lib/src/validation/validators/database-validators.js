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
exports.databaseValidators = exports.CosmosDbNetworkAclsValidator = exports.CosmosDbCapabilitiesValidator = exports.CosmosDbAutomaticFailoverValidator = exports.CosmosDbBackupPolicyValidator = exports.CosmosDbMultiRegionValidator = exports.CosmosDbConsistencyValidator = exports.CosmosDbAccountNameValidator = void 0;
var validation_rule_1 = require("../validation-rule");
var validation_result_1 = require("../validation-result");
var common_validators_1 = require("../common-validators");
/**
 * Validates Cosmos DB account name format
 */
var CosmosDbAccountNameValidator = /** @class */ (function (_super) {
    __extends(CosmosDbAccountNameValidator, _super);
    function CosmosDbAccountNameValidator() {
        return _super.call(this, 'cosmosdb-account-name-format', 'Validates Cosmos DB account name follows Azure naming rules', validation_result_1.ValidationSeverity.ERROR, ['Microsoft.DocumentDB/databaseAccounts']) || this;
    }
    CosmosDbAccountNameValidator.prototype.validate = function (resource, context) {
        var name = resource.name || resource.accountName;
        if (!name) {
            return validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage('Cosmos DB account name is required')
                .build();
        }
        var results = [];
        // Must be lowercase
        results.push((0, common_validators_1.validateLowercase)(name, 'Cosmos DB account name', this.name));
        // Length check (3-44)
        results.push((0, common_validators_1.validateLength)(name, 3, 44, 'Cosmos DB account name', this.name));
        // Pattern check (lowercase alphanumeric and hyphens only)
        var pattern = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
        results.push((0, common_validators_1.validatePattern)(name, pattern, 'Cosmos DB account name', this.name, 'Cosmos DB account names must contain only lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen'));
        // Add global uniqueness warning
        results.push((0, common_validators_1.warnGloballyUnique)(this.name, 'Cosmos DB account'));
        return common_validators_1.collectResults.apply(void 0, results);
    };
    return CosmosDbAccountNameValidator;
}(validation_rule_1.BaseValidationRule));
exports.CosmosDbAccountNameValidator = CosmosDbAccountNameValidator;
/**
 * Validates Cosmos DB consistency level configuration
 */
var CosmosDbConsistencyValidator = /** @class */ (function (_super) {
    __extends(CosmosDbConsistencyValidator, _super);
    function CosmosDbConsistencyValidator() {
        return _super.call(this, 'cosmosdb-consistency-level', 'Validates Cosmos DB consistency level is valid', validation_result_1.ValidationSeverity.ERROR, ['Microsoft.DocumentDB/databaseAccounts']) || this;
    }
    CosmosDbConsistencyValidator.prototype.validate = function (resource, context) {
        var _a;
        var consistency = (_a = resource.properties) === null || _a === void 0 ? void 0 : _a.consistencyPolicy;
        if (!consistency) {
            return validation_result_1.ValidationResultBuilder.warning(this.name)
                .withMessage('No consistency policy specified')
                .withSuggestion('Consider setting consistencyPolicy with defaultConsistencyLevel')
                .withDetails('Default is "Session" if not specified')
                .build();
        }
        var validLevels = ['Strong', 'BoundedStaleness', 'Session', 'ConsistentPrefix', 'Eventual'];
        var level = consistency.defaultConsistencyLevel;
        if (!level) {
            return validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage('defaultConsistencyLevel is required in consistencyPolicy')
                .withSuggestion("Valid values: ".concat(validLevels.join(', ')))
                .build();
        }
        var enumResult = (0, common_validators_1.validateEnum)(level, validLevels, 'defaultConsistencyLevel', this.name);
        if (enumResult) {
            return enumResult;
        }
        // Validate BoundedStaleness parameters
        if (level === 'BoundedStaleness') {
            var maxStalenessPrefix = consistency.maxStalenessPrefix;
            var maxIntervalInSeconds = consistency.maxIntervalInSeconds;
            if (maxStalenessPrefix === undefined && maxIntervalInSeconds === undefined) {
                return validation_result_1.ValidationResultBuilder.error(this.name)
                    .withMessage('BoundedStaleness requires maxStalenessPrefix or maxIntervalInSeconds')
                    .withSuggestion('Set maxStalenessPrefix (10-2147483647) or maxIntervalInSeconds (5-86400)')
                    .build();
            }
        }
        return validation_result_1.ValidationResultBuilder.success(this.name).build();
    };
    return CosmosDbConsistencyValidator;
}(validation_rule_1.BaseValidationRule));
exports.CosmosDbConsistencyValidator = CosmosDbConsistencyValidator;
/**
 * Validates Cosmos DB multi-region configuration
 */
var CosmosDbMultiRegionValidator = /** @class */ (function (_super) {
    __extends(CosmosDbMultiRegionValidator, _super);
    function CosmosDbMultiRegionValidator() {
        return _super.call(this, 'cosmosdb-multi-region', 'Validates Cosmos DB multi-region consistency requirements', validation_result_1.ValidationSeverity.WARNING, ['Microsoft.DocumentDB/databaseAccounts']) || this;
    }
    CosmosDbMultiRegionValidator.prototype.validate = function (resource, context) {
        var _a, _b, _c;
        var locations = (_a = resource.properties) === null || _a === void 0 ? void 0 : _a.locations;
        if (!locations || locations.length <= 1) {
            return validation_result_1.ValidationResultBuilder.success(this.name).build();
        }
        var consistency = (_c = (_b = resource.properties) === null || _b === void 0 ? void 0 : _b.consistencyPolicy) === null || _c === void 0 ? void 0 : _c.defaultConsistencyLevel;
        if (consistency === 'Strong') {
            return validation_result_1.ValidationResultBuilder.warning(this.name)
                .withMessage('Strong consistency with multiple regions increases latency')
                .withSuggestion('Consider using BoundedStaleness for multi-region deployments')
                .withDetails('Strong consistency requires synchronous replication across all regions')
                .build();
        }
        // Check for write regions
        var writeRegions = locations.filter(function (loc) { return loc.failoverPriority === 0; });
        if (writeRegions.length > 1) {
            return validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage('Only one region can have failoverPriority: 0 (primary write region)')
                .withSuggestion('Ensure failoverPriority values are unique starting from 0')
                .build();
        }
        return validation_result_1.ValidationResultBuilder.success(this.name).build();
    };
    return CosmosDbMultiRegionValidator;
}(validation_rule_1.BaseValidationRule));
exports.CosmosDbMultiRegionValidator = CosmosDbMultiRegionValidator;
/**
 * Validates Cosmos DB backup policy configuration
 */
var CosmosDbBackupPolicyValidator = /** @class */ (function (_super) {
    __extends(CosmosDbBackupPolicyValidator, _super);
    function CosmosDbBackupPolicyValidator() {
        return _super.call(this, 'cosmosdb-backup-policy', 'Validates Cosmos DB backup policy configuration', validation_result_1.ValidationSeverity.WARNING, ['Microsoft.DocumentDB/databaseAccounts']) || this;
    }
    CosmosDbBackupPolicyValidator.prototype.validate = function (resource, context) {
        var _a, _b, _c;
        var backupPolicy = (_a = resource.properties) === null || _a === void 0 ? void 0 : _a.backupPolicy;
        if (!backupPolicy) {
            return validation_result_1.ValidationResultBuilder.warning(this.name)
                .withMessage('No backup policy specified')
                .withSuggestion('Consider configuring continuous or periodic backup')
                .withDetails('Default is periodic backup with 8-hour intervals')
                .build();
        }
        var backupType = backupPolicy.type;
        if (backupType === 'Periodic') {
            var intervalInMinutes = (_b = backupPolicy.periodicModeProperties) === null || _b === void 0 ? void 0 : _b.backupIntervalInMinutes;
            var retentionInHours = (_c = backupPolicy.periodicModeProperties) === null || _c === void 0 ? void 0 : _c.backupRetentionIntervalInHours;
            if (!intervalInMinutes || intervalInMinutes < 60) {
                return validation_result_1.ValidationResultBuilder.warning(this.name)
                    .withMessage('Backup interval should be at least 60 minutes')
                    .withSuggestion('Set backupIntervalInMinutes to 60 or higher')
                    .build();
            }
            if (!retentionInHours || retentionInHours < 8) {
                return validation_result_1.ValidationResultBuilder.warning(this.name)
                    .withMessage('Backup retention should be at least 8 hours')
                    .withSuggestion('Set backupRetentionIntervalInHours to 8 or higher')
                    .build();
            }
        }
        return validation_result_1.ValidationResultBuilder.success(this.name).build();
    };
    return CosmosDbBackupPolicyValidator;
}(validation_rule_1.BaseValidationRule));
exports.CosmosDbBackupPolicyValidator = CosmosDbBackupPolicyValidator;
/**
 * Validates Cosmos DB automatic failover configuration
 */
var CosmosDbAutomaticFailoverValidator = /** @class */ (function (_super) {
    __extends(CosmosDbAutomaticFailoverValidator, _super);
    function CosmosDbAutomaticFailoverValidator() {
        return _super.call(this, 'cosmosdb-automatic-failover', 'Validates Cosmos DB automatic failover settings', validation_result_1.ValidationSeverity.WARNING, ['Microsoft.DocumentDB/databaseAccounts']) || this;
    }
    CosmosDbAutomaticFailoverValidator.prototype.validate = function (resource, context) {
        var _a, _b;
        var locations = (_a = resource.properties) === null || _a === void 0 ? void 0 : _a.locations;
        var enableAutomaticFailover = (_b = resource.properties) === null || _b === void 0 ? void 0 : _b.enableAutomaticFailover;
        if (!locations || locations.length <= 1) {
            if (enableAutomaticFailover) {
                return validation_result_1.ValidationResultBuilder.warning(this.name)
                    .withMessage('Automatic failover requires multiple regions')
                    .withSuggestion('Add additional regions to locations array')
                    .build();
            }
            return validation_result_1.ValidationResultBuilder.success(this.name).build();
        }
        // Multi-region deployment
        if (!enableAutomaticFailover) {
            return validation_result_1.ValidationResultBuilder.warning(this.name)
                .withMessage('Multi-region deployment without automatic failover')
                .withSuggestion('Consider enabling automatic failover for high availability')
                .withDetails('Set enableAutomaticFailover: true')
                .build();
        }
        return validation_result_1.ValidationResultBuilder.success(this.name).build();
    };
    return CosmosDbAutomaticFailoverValidator;
}(validation_rule_1.BaseValidationRule));
exports.CosmosDbAutomaticFailoverValidator = CosmosDbAutomaticFailoverValidator;
/**
 * Validates Cosmos DB capabilities are compatible
 */
var CosmosDbCapabilitiesValidator = /** @class */ (function (_super) {
    __extends(CosmosDbCapabilitiesValidator, _super);
    function CosmosDbCapabilitiesValidator() {
        return _super.call(this, 'cosmosdb-capabilities', 'Validates Cosmos DB capabilities are compatible', validation_result_1.ValidationSeverity.ERROR, ['Microsoft.DocumentDB/databaseAccounts']) || this;
    }
    CosmosDbCapabilitiesValidator.prototype.validate = function (resource, context) {
        var _a, _b;
        var capabilities = ((_a = resource.properties) === null || _a === void 0 ? void 0 : _a.capabilities) || [];
        if (capabilities.length === 0) {
            return validation_result_1.ValidationResultBuilder.success(this.name).build();
        }
        var capabilityNames = capabilities.map(function (c) { return c.name; });
        // Check for incompatible capabilities
        var apiCapabilities = [
            'EnableCassandra',
            'EnableGremlin',
            'EnableMongo',
            'EnableTable',
        ];
        var enabledApis = apiCapabilities.filter(function (api) { return capabilityNames.includes(api); });
        if (enabledApis.length > 1) {
            return validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage('Cannot enable multiple API capabilities')
                .withSuggestion('Use only one API capability (Cassandra, Gremlin, Mongo, or Table)')
                .withDetails("Currently enabled: ".concat(enabledApis.join(', ')))
                .build();
        }
        // Serverless incompatibilities
        if (capabilityNames.includes('EnableServerless')) {
            if (capabilityNames.includes('EnableAnalyticalStorage')) {
                return validation_result_1.ValidationResultBuilder.error(this.name)
                    .withMessage('Serverless mode is incompatible with analytical storage')
                    .withSuggestion('Remove EnableAnalyticalStorage capability')
                    .build();
            }
            var locations = ((_b = resource.properties) === null || _b === void 0 ? void 0 : _b.locations) || [];
            if (locations.length > 1) {
                return validation_result_1.ValidationResultBuilder.error(this.name)
                    .withMessage('Serverless mode does not support multi-region writes')
                    .withSuggestion('Use single region for serverless accounts')
                    .build();
            }
        }
        return validation_result_1.ValidationResultBuilder.success(this.name).build();
    };
    return CosmosDbCapabilitiesValidator;
}(validation_rule_1.BaseValidationRule));
exports.CosmosDbCapabilitiesValidator = CosmosDbCapabilitiesValidator;
/**
 * Validates Cosmos DB network ACLs configuration
 */
var CosmosDbNetworkAclsValidator = /** @class */ (function (_super) {
    __extends(CosmosDbNetworkAclsValidator, _super);
    function CosmosDbNetworkAclsValidator() {
        return _super.call(this, 'cosmosdb-network-acls', 'Validates Cosmos DB network ACLs and firewall rules', validation_result_1.ValidationSeverity.WARNING, ['Microsoft.DocumentDB/databaseAccounts']) || this;
    }
    CosmosDbNetworkAclsValidator.prototype.validate = function (resource, context) {
        var _a, _b, _c;
        var publicNetworkAccess = (_a = resource.properties) === null || _a === void 0 ? void 0 : _a.publicNetworkAccess;
        var ipRules = ((_b = resource.properties) === null || _b === void 0 ? void 0 : _b.ipRules) || [];
        var virtualNetworkRules = ((_c = resource.properties) === null || _c === void 0 ? void 0 : _c.virtualNetworkRules) || [];
        if (publicNetworkAccess === 'Disabled') {
            if (virtualNetworkRules.length === 0) {
                return validation_result_1.ValidationResultBuilder.warning(this.name)
                    .withMessage('Public network access disabled without virtual network rules')
                    .withSuggestion('Add virtual network rules or use private endpoints for access')
                    .withDetails('Account will be inaccessible without private connectivity')
                    .build();
            }
        }
        // Check for overly permissive IP rules
        var hasWildcard = ipRules.some(function (rule) {
            return rule.ipAddressOrRange === '0.0.0.0/0' || rule.ipAddressOrRange === '*';
        });
        if (hasWildcard) {
            return validation_result_1.ValidationResultBuilder.warning(this.name)
                .withMessage('IP rules allow access from all addresses (0.0.0.0/0)')
                .withSuggestion('Restrict IP rules to specific address ranges')
                .withDetails('Consider using virtual network rules or private endpoints instead')
                .build();
        }
        return validation_result_1.ValidationResultBuilder.success(this.name).build();
    };
    return CosmosDbNetworkAclsValidator;
}(validation_rule_1.BaseValidationRule));
exports.CosmosDbNetworkAclsValidator = CosmosDbNetworkAclsValidator;
/**
 * Export all database validators
 */
exports.databaseValidators = [
    new CosmosDbAccountNameValidator(),
    new CosmosDbConsistencyValidator(),
    new CosmosDbMultiRegionValidator(),
    new CosmosDbBackupPolicyValidator(),
    new CosmosDbAutomaticFailoverValidator(),
    new CosmosDbCapabilitiesValidator(),
    new CosmosDbNetworkAclsValidator(),
];
