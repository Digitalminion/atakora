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
exports.cognitiveServicesValidators = exports.CognitiveServicesCustomSubdomainValidator = exports.CognitiveServicesSkuValidator = exports.CognitiveServicesNetworkAclsValidator = exports.OpenAIDeploymentNameValidator = exports.OpenAIDeploymentCapacityValidator = exports.OpenAIDeploymentModelValidator = exports.CognitiveServicesAccountNameValidator = void 0;
var validation_rule_1 = require("../validation-rule");
var validation_result_1 = require("../validation-result");
var common_validators_1 = require("../common-validators");
/**
 * Validates Cognitive Services account name format
 */
var CognitiveServicesAccountNameValidator = /** @class */ (function (_super) {
    __extends(CognitiveServicesAccountNameValidator, _super);
    function CognitiveServicesAccountNameValidator() {
        return _super.call(this, 'cognitiveservices-account-name-format', 'Validates Cognitive Services account name follows Azure naming rules', validation_result_1.ValidationSeverity.ERROR, ['Microsoft.CognitiveServices/accounts']) || this;
    }
    CognitiveServicesAccountNameValidator.prototype.validate = function (resource, context) {
        var name = resource.name || resource.accountName;
        if (!name) {
            return validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage('Cognitive Services account name is required')
                .build();
        }
        var results = [];
        // Length check (2-64)
        results.push((0, common_validators_1.validateLength)(name, 2, 64, 'Cognitive Services account name', this.name));
        // Pattern check (alphanumeric and hyphens only)
        var pattern = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/;
        results.push((0, common_validators_1.validatePattern)(name, pattern, 'Cognitive Services account name', this.name, 'Cognitive Services account names must contain only alphanumeric characters and hyphens, and cannot start or end with a hyphen'));
        // Add global uniqueness warning
        results.push((0, common_validators_1.warnGloballyUnique)(this.name, 'Cognitive Services account'));
        return common_validators_1.collectResults.apply(void 0, results);
    };
    return CognitiveServicesAccountNameValidator;
}(validation_rule_1.BaseValidationRule));
exports.CognitiveServicesAccountNameValidator = CognitiveServicesAccountNameValidator;
/**
 * Validates OpenAI deployment model and version
 */
var OpenAIDeploymentModelValidator = /** @class */ (function (_super) {
    __extends(OpenAIDeploymentModelValidator, _super);
    function OpenAIDeploymentModelValidator() {
        return _super.call(this, 'openai-deployment-model', 'Validates OpenAI deployment has valid model and version', validation_result_1.ValidationSeverity.ERROR, ['Microsoft.CognitiveServices/accounts/deployments']) || this;
    }
    OpenAIDeploymentModelValidator.prototype.validate = function (resource, context) {
        var _a;
        var model = (_a = resource.properties) === null || _a === void 0 ? void 0 : _a.model;
        if (!model) {
            return validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage('OpenAI deployment must specify a model')
                .withSuggestion('Set properties.model with name and version')
                .build();
        }
        var results = [];
        if (!model.name) {
            results.push(validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage('Model name is required')
                .withSuggestion('Set model.name (e.g., "gpt-4", "gpt-35-turbo", "text-embedding-ada-002")')
                .build());
        }
        if (!model.version) {
            results.push(validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage('Model version is required')
                .withSuggestion('Set model.version (e.g., "0613", "1106")')
                .build());
        }
        return results.length > 0 ? results : validation_result_1.ValidationResultBuilder.success(this.name).build();
    };
    return OpenAIDeploymentModelValidator;
}(validation_rule_1.BaseValidationRule));
exports.OpenAIDeploymentModelValidator = OpenAIDeploymentModelValidator;
/**
 * Validates OpenAI deployment capacity (TPM) is within limits
 */
var OpenAIDeploymentCapacityValidator = /** @class */ (function (_super) {
    __extends(OpenAIDeploymentCapacityValidator, _super);
    function OpenAIDeploymentCapacityValidator() {
        return _super.call(this, 'openai-deployment-capacity', 'Validates OpenAI deployment capacity is within quota limits', validation_result_1.ValidationSeverity.WARNING, ['Microsoft.CognitiveServices/accounts/deployments']) || this;
    }
    OpenAIDeploymentCapacityValidator.prototype.validate = function (resource, context) {
        var sku = resource.sku;
        var capacity = sku === null || sku === void 0 ? void 0 : sku.capacity;
        if (!capacity) {
            return validation_result_1.ValidationResultBuilder.warning(this.name)
                .withMessage('No capacity specified for OpenAI deployment')
                .withSuggestion('Set sku.capacity in thousands of tokens per minute (TPM)')
                .withDetails('Default capacity may be insufficient for production workloads')
                .build();
        }
        // Warn about very low capacity
        if (capacity < 10) {
            return validation_result_1.ValidationResultBuilder.warning(this.name)
                .withMessage("Deployment capacity is ".concat(capacity, "K TPM, which may be too low"))
                .withSuggestion('Consider increasing capacity for production workloads')
                .withDetails('Low capacity may cause throttling under load')
                .build();
        }
        // Warn about very high capacity
        if (capacity > 300) {
            return validation_result_1.ValidationResultBuilder.warning(this.name)
                .withMessage("Deployment capacity is ".concat(capacity, "K TPM, which may exceed quota"))
                .withSuggestion('Verify your subscription has sufficient quota')
                .withDetails('High capacity may require quota increase request')
                .build();
        }
        return validation_result_1.ValidationResultBuilder.success(this.name).build();
    };
    return OpenAIDeploymentCapacityValidator;
}(validation_rule_1.BaseValidationRule));
exports.OpenAIDeploymentCapacityValidator = OpenAIDeploymentCapacityValidator;
/**
 * Validates OpenAI deployment naming for uniqueness
 */
var OpenAIDeploymentNameValidator = /** @class */ (function (_super) {
    __extends(OpenAIDeploymentNameValidator, _super);
    function OpenAIDeploymentNameValidator() {
        return _super.call(this, 'openai-deployment-name', 'Validates OpenAI deployment name is unique and descriptive', validation_result_1.ValidationSeverity.WARNING, ['Microsoft.CognitiveServices/accounts/deployments']) || this;
    }
    OpenAIDeploymentNameValidator.prototype.validate = function (resource, context) {
        var _a, _b;
        var name = resource.name || resource.deploymentName;
        if (!name) {
            return validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage('OpenAI deployment name is required')
                .build();
        }
        var model = (_b = (_a = resource.properties) === null || _a === void 0 ? void 0 : _a.model) === null || _b === void 0 ? void 0 : _b.name;
        // Warn if deployment name doesn't indicate the model
        if (model && !name.toLowerCase().includes(model.toLowerCase())) {
            return validation_result_1.ValidationResultBuilder.warning(this.name)
                .withMessage('Deployment name does not indicate the model type')
                .withSuggestion("Consider including \"".concat(model, "\" in the deployment name for clarity"))
                .withDetails('Descriptive names help identify deployments when multiple models are used')
                .build();
        }
        return validation_result_1.ValidationResultBuilder.success(this.name).build();
    };
    return OpenAIDeploymentNameValidator;
}(validation_rule_1.BaseValidationRule));
exports.OpenAIDeploymentNameValidator = OpenAIDeploymentNameValidator;
/**
 * Validates Cognitive Services network ACLs configuration
 */
var CognitiveServicesNetworkAclsValidator = /** @class */ (function (_super) {
    __extends(CognitiveServicesNetworkAclsValidator, _super);
    function CognitiveServicesNetworkAclsValidator() {
        return _super.call(this, 'cognitiveservices-network-acls', 'Validates Cognitive Services network ACLs are configured appropriately', validation_result_1.ValidationSeverity.WARNING, ['Microsoft.CognitiveServices/accounts']) || this;
    }
    CognitiveServicesNetworkAclsValidator.prototype.validate = function (resource, context) {
        var _a;
        var networkAcls = (_a = resource.properties) === null || _a === void 0 ? void 0 : _a.networkAcls;
        if (!networkAcls) {
            return validation_result_1.ValidationResultBuilder.warning(this.name)
                .withMessage('No network ACLs configured')
                .withSuggestion('Consider restricting access with network ACLs or private endpoints')
                .withDetails('By default, Cognitive Services accounts are accessible from all networks')
                .build();
        }
        var defaultAction = networkAcls.defaultAction;
        if (defaultAction === 'Allow') {
            return validation_result_1.ValidationResultBuilder.warning(this.name)
                .withMessage('Network ACLs allow access from all networks')
                .withSuggestion('Set defaultAction to "Deny" and specify allowed networks')
                .withDetails('Unrestricted access may pose security risks')
                .build();
        }
        return validation_result_1.ValidationResultBuilder.success(this.name).build();
    };
    return CognitiveServicesNetworkAclsValidator;
}(validation_rule_1.BaseValidationRule));
exports.CognitiveServicesNetworkAclsValidator = CognitiveServicesNetworkAclsValidator;
/**
 * Validates Cognitive Services SKU is appropriate for workload
 */
var CognitiveServicesSkuValidator = /** @class */ (function (_super) {
    __extends(CognitiveServicesSkuValidator, _super);
    function CognitiveServicesSkuValidator() {
        return _super.call(this, 'cognitiveservices-sku', 'Validates Cognitive Services SKU is appropriate for the workload', validation_result_1.ValidationSeverity.WARNING, ['Microsoft.CognitiveServices/accounts']) || this;
    }
    CognitiveServicesSkuValidator.prototype.validate = function (resource, context) {
        var sku = resource.sku;
        if (!sku || !sku.name) {
            return validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage('SKU name is required')
                .withSuggestion('Set sku.name (e.g., "S0", "S1", "F0")')
                .build();
        }
        var skuName = sku.name;
        var kind = resource.kind;
        // Warn about free tier in production
        if (skuName === 'F0' && (context === null || context === void 0 ? void 0 : context.environment) === 'production') {
            return validation_result_1.ValidationResultBuilder.warning(this.name)
                .withMessage('Free tier (F0) SKU in production environment')
                .withSuggestion('Use a standard SKU (S0 or higher) for production workloads')
                .withDetails('Free tier has limited quota and no SLA')
                .build();
        }
        // OpenAI-specific SKU validation
        if (kind === 'OpenAI' && skuName !== 'S0') {
            return validation_result_1.ValidationResultBuilder.warning(this.name)
                .withMessage("SKU \"".concat(skuName, "\" may not be supported for OpenAI"))
                .withSuggestion('Use "S0" SKU for OpenAI accounts')
                .build();
        }
        return validation_result_1.ValidationResultBuilder.success(this.name).build();
    };
    return CognitiveServicesSkuValidator;
}(validation_rule_1.BaseValidationRule));
exports.CognitiveServicesSkuValidator = CognitiveServicesSkuValidator;
/**
 * Validates Cognitive Services custom subdomain configuration
 */
var CognitiveServicesCustomSubdomainValidator = /** @class */ (function (_super) {
    __extends(CognitiveServicesCustomSubdomainValidator, _super);
    function CognitiveServicesCustomSubdomainValidator() {
        return _super.call(this, 'cognitiveservices-custom-subdomain', 'Validates custom subdomain is configured when required', validation_result_1.ValidationSeverity.ERROR, ['Microsoft.CognitiveServices/accounts']) || this;
    }
    CognitiveServicesCustomSubdomainValidator.prototype.validate = function (resource, context) {
        var _a, _b, _c, _d;
        var customSubDomainName = (_a = resource.properties) === null || _a === void 0 ? void 0 : _a.customSubDomainName;
        var kind = resource.kind;
        var networkAcls = (_b = resource.properties) === null || _b === void 0 ? void 0 : _b.networkAcls;
        var privateEndpoints = ((_d = (_c = resource.properties) === null || _c === void 0 ? void 0 : _c.privateEndpointConnections) === null || _d === void 0 ? void 0 : _d.length) > 0;
        // Custom subdomain is required for certain scenarios
        var requiresCustomSubdomain = kind === 'OpenAI' ||
            privateEndpoints ||
            (networkAcls && networkAcls.defaultAction === 'Deny');
        if (requiresCustomSubdomain && !customSubDomainName) {
            return validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage('Custom subdomain is required for this configuration')
                .withSuggestion('Set properties.customSubDomainName')
                .withDetails(kind === 'OpenAI'
                ? 'OpenAI accounts require a custom subdomain'
                : 'Private endpoints and network restrictions require a custom subdomain')
                .build();
        }
        // Validate subdomain format
        if (customSubDomainName) {
            var pattern = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
            if (!pattern.test(customSubDomainName)) {
                return validation_result_1.ValidationResultBuilder.error(this.name)
                    .withMessage('Custom subdomain name has invalid format')
                    .withSuggestion('Use only lowercase letters, numbers, and hyphens')
                    .withDetails('Cannot start or end with a hyphen')
                    .build();
            }
            if (customSubDomainName.length < 2 || customSubDomainName.length > 64) {
                return validation_result_1.ValidationResultBuilder.error(this.name)
                    .withMessage('Custom subdomain name must be 2-64 characters')
                    .withDetails("Current length: ".concat(customSubDomainName.length))
                    .build();
            }
        }
        return validation_result_1.ValidationResultBuilder.success(this.name).build();
    };
    return CognitiveServicesCustomSubdomainValidator;
}(validation_rule_1.BaseValidationRule));
exports.CognitiveServicesCustomSubdomainValidator = CognitiveServicesCustomSubdomainValidator;
/**
 * Export all cognitive services validators
 */
exports.cognitiveServicesValidators = [
    new CognitiveServicesAccountNameValidator(),
    new OpenAIDeploymentModelValidator(),
    new OpenAIDeploymentCapacityValidator(),
    new OpenAIDeploymentNameValidator(),
    new CognitiveServicesNetworkAclsValidator(),
    new CognitiveServicesSkuValidator(),
    new CognitiveServicesCustomSubdomainValidator(),
];
