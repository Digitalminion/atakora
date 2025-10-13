"use strict";
/**
 * Validation Framework for Azure CDK Resources
 *
 * This module provides a comprehensive validation framework for Azure resources
 * to catch common configuration errors before deployment.
 */
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
exports.allValidators = exports.webValidators = exports.cognitiveServicesValidators = exports.databaseValidators = exports.keyVaultValidators = exports.storageValidators = exports.networkValidators = exports.collectResults = exports.validateEndsWith = exports.validateStartsWith = exports.validateNoConsecutive = exports.validateLowercase = exports.warnGloballyUnique = exports.validateAzureResourceName = exports.validateEnum = exports.validateRange = exports.validateRequired = exports.validatePattern = exports.validateLength = exports.validatorRegistry = exports.ValidatorRegistry = exports.BaseValidationRule = exports.ValidationResultBuilder = exports.ValidationSeverity = void 0;
exports.registerAllValidators = registerAllValidators;
// Core validation framework
var validation_result_1 = require("./validation-result");
Object.defineProperty(exports, "ValidationSeverity", { enumerable: true, get: function () { return validation_result_1.ValidationSeverity; } });
Object.defineProperty(exports, "ValidationResultBuilder", { enumerable: true, get: function () { return validation_result_1.ValidationResultBuilder; } });
var validation_rule_1 = require("./validation-rule");
Object.defineProperty(exports, "BaseValidationRule", { enumerable: true, get: function () { return validation_rule_1.BaseValidationRule; } });
var validator_registry_1 = require("./validator-registry");
Object.defineProperty(exports, "ValidatorRegistry", { enumerable: true, get: function () { return validator_registry_1.ValidatorRegistry; } });
Object.defineProperty(exports, "validatorRegistry", { enumerable: true, get: function () { return validator_registry_1.validatorRegistry; } });
// Common validators and helpers
var common_validators_1 = require("./common-validators");
Object.defineProperty(exports, "validateLength", { enumerable: true, get: function () { return common_validators_1.validateLength; } });
Object.defineProperty(exports, "validatePattern", { enumerable: true, get: function () { return common_validators_1.validatePattern; } });
Object.defineProperty(exports, "validateRequired", { enumerable: true, get: function () { return common_validators_1.validateRequired; } });
Object.defineProperty(exports, "validateRange", { enumerable: true, get: function () { return common_validators_1.validateRange; } });
Object.defineProperty(exports, "validateEnum", { enumerable: true, get: function () { return common_validators_1.validateEnum; } });
Object.defineProperty(exports, "validateAzureResourceName", { enumerable: true, get: function () { return common_validators_1.validateAzureResourceName; } });
Object.defineProperty(exports, "warnGloballyUnique", { enumerable: true, get: function () { return common_validators_1.warnGloballyUnique; } });
Object.defineProperty(exports, "validateLowercase", { enumerable: true, get: function () { return common_validators_1.validateLowercase; } });
Object.defineProperty(exports, "validateNoConsecutive", { enumerable: true, get: function () { return common_validators_1.validateNoConsecutive; } });
Object.defineProperty(exports, "validateStartsWith", { enumerable: true, get: function () { return common_validators_1.validateStartsWith; } });
Object.defineProperty(exports, "validateEndsWith", { enumerable: true, get: function () { return common_validators_1.validateEndsWith; } });
Object.defineProperty(exports, "collectResults", { enumerable: true, get: function () { return common_validators_1.collectResults; } });
// Resource-specific validators
var network_validators_1 = require("./validators/network-validators");
Object.defineProperty(exports, "networkValidators", { enumerable: true, get: function () { return network_validators_1.networkValidators; } });
var storage_validators_1 = require("./validators/storage-validators");
Object.defineProperty(exports, "storageValidators", { enumerable: true, get: function () { return storage_validators_1.storageValidators; } });
var keyvault_validators_1 = require("./validators/keyvault-validators");
Object.defineProperty(exports, "keyVaultValidators", { enumerable: true, get: function () { return keyvault_validators_1.keyVaultValidators; } });
var database_validators_1 = require("./validators/database-validators");
Object.defineProperty(exports, "databaseValidators", { enumerable: true, get: function () { return database_validators_1.databaseValidators; } });
var cognitiveservices_validators_1 = require("./validators/cognitiveservices-validators");
Object.defineProperty(exports, "cognitiveServicesValidators", { enumerable: true, get: function () { return cognitiveservices_validators_1.cognitiveServicesValidators; } });
var web_validators_1 = require("./validators/web-validators");
Object.defineProperty(exports, "webValidators", { enumerable: true, get: function () { return web_validators_1.webValidators; } });
// All validators combined
var network_validators_2 = require("./validators/network-validators");
var storage_validators_2 = require("./validators/storage-validators");
var keyvault_validators_2 = require("./validators/keyvault-validators");
var database_validators_2 = require("./validators/database-validators");
var cognitiveservices_validators_2 = require("./validators/cognitiveservices-validators");
var web_validators_2 = require("./validators/web-validators");
var validator_registry_2 = require("./validator-registry");
exports.allValidators = __spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([], network_validators_2.networkValidators, true), storage_validators_2.storageValidators, true), keyvault_validators_2.keyVaultValidators, true), database_validators_2.databaseValidators, true), cognitiveservices_validators_2.cognitiveServicesValidators, true), web_validators_2.webValidators, true);
/**
 * Register all validators with the global registry
 */
function registerAllValidators() {
    var registry = validator_registry_2.validatorRegistry;
    exports.allValidators.forEach(function (validator) {
        if (validator.resourceTypes && validator.resourceTypes.length > 0) {
            validator.resourceTypes.forEach(function (resourceType) {
                registry.register(resourceType, validator);
            });
        }
        else {
            registry.registerGlobal(validator);
        }
    });
}
