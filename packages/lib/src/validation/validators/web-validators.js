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
exports.webValidators = exports.FunctionAppApplicationInsightsValidator = exports.FunctionAppAlwaysOnValidator = exports.FunctionAppRuntimeValidator = exports.FunctionAppStorageValidator = exports.FunctionAppNameValidator = exports.AppServicePlanZoneRedundancyValidator = exports.AppServicePlanSkuValidator = exports.AppServicePlanNameValidator = void 0;
var validation_rule_1 = require("../validation-rule");
var validation_result_1 = require("../validation-result");
var common_validators_1 = require("../common-validators");
/**
 * Validates App Service Plan name format
 */
var AppServicePlanNameValidator = /** @class */ (function (_super) {
    __extends(AppServicePlanNameValidator, _super);
    function AppServicePlanNameValidator() {
        return _super.call(this, 'appserviceplan-name-format', 'Validates App Service Plan name follows Azure naming rules', validation_result_1.ValidationSeverity.ERROR, ['Microsoft.Web/serverfarms']) || this;
    }
    AppServicePlanNameValidator.prototype.validate = function (resource, context) {
        var name = resource.name || resource.planName;
        if (!name) {
            return validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage('App Service Plan name is required')
                .build();
        }
        var results = [];
        // Length check (1-40)
        results.push((0, common_validators_1.validateLength)(name, 1, 40, 'App Service Plan name', this.name));
        // Pattern check (alphanumeric and hyphens only)
        var pattern = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/;
        results.push((0, common_validators_1.validatePattern)(name, pattern, 'App Service Plan name', this.name, 'App Service Plan names must contain only alphanumeric characters and hyphens, and cannot start or end with a hyphen'));
        return common_validators_1.collectResults.apply(void 0, results);
    };
    return AppServicePlanNameValidator;
}(validation_rule_1.BaseValidationRule));
exports.AppServicePlanNameValidator = AppServicePlanNameValidator;
/**
 * Validates App Service Plan SKU configuration
 */
var AppServicePlanSkuValidator = /** @class */ (function (_super) {
    __extends(AppServicePlanSkuValidator, _super);
    function AppServicePlanSkuValidator() {
        return _super.call(this, 'appserviceplan-sku', 'Validates App Service Plan SKU is valid and appropriate', validation_result_1.ValidationSeverity.ERROR, ['Microsoft.Web/serverfarms']) || this;
    }
    AppServicePlanSkuValidator.prototype.validate = function (resource, context) {
        var sku = resource.sku;
        if (!sku) {
            return validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage('App Service Plan SKU is required')
                .withSuggestion('Set sku with name, tier, size, family, and capacity')
                .build();
        }
        var results = [];
        // Validate SKU name
        var validSkuNames = [
            'F1',
            'D1',
            'B1',
            'B2',
            'B3',
            'S1',
            'S2',
            'S3',
            'P1',
            'P2',
            'P3',
            'P1v2',
            'P2v2',
            'P3v2',
            'P1v3',
            'P2v3',
            'P3v3',
            'EP1',
            'EP2',
            'EP3',
            'Y1',
        ];
        if (sku.name && !validSkuNames.includes(sku.name)) {
            results.push(validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage("Invalid SKU name: ".concat(sku.name))
                .withSuggestion("Valid SKU names: ".concat(validSkuNames.join(', ')))
                .build());
        }
        // Validate tier matches name
        var tierMapping = {
            F1: 'Free',
            D1: 'Shared',
            B1: 'Basic',
            B2: 'Basic',
            B3: 'Basic',
            S1: 'Standard',
            S2: 'Standard',
            S3: 'Standard',
            P1: 'Premium',
            P2: 'Premium',
            P3: 'Premium',
            P1v2: 'PremiumV2',
            P2v2: 'PremiumV2',
            P3v2: 'PremiumV2',
            P1v3: 'PremiumV3',
            P2v3: 'PremiumV3',
            P3v3: 'PremiumV3',
            EP1: 'ElasticPremium',
            EP2: 'ElasticPremium',
            EP3: 'ElasticPremium',
            Y1: 'Dynamic',
        };
        var expectedTier = tierMapping[sku.name];
        if (expectedTier && sku.tier && sku.tier !== expectedTier) {
            results.push(validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage("SKU tier \"".concat(sku.tier, "\" does not match name \"").concat(sku.name, "\""))
                .withSuggestion("Use tier: \"".concat(expectedTier, "\""))
                .build());
        }
        // Warn about free tier in production
        if (sku.name === 'F1' && (context === null || context === void 0 ? void 0 : context.environment) === 'production') {
            results.push(validation_result_1.ValidationResultBuilder.warning(this.name)
                .withMessage('Free tier (F1) in production environment')
                .withSuggestion('Use Basic, Standard, or Premium tier for production')
                .withDetails('Free tier has limited resources and no SLA')
                .build());
        }
        return results.length > 0 ? results : validation_result_1.ValidationResultBuilder.success(this.name).build();
    };
    return AppServicePlanSkuValidator;
}(validation_rule_1.BaseValidationRule));
exports.AppServicePlanSkuValidator = AppServicePlanSkuValidator;
/**
 * Validates App Service Plan zone redundancy configuration
 */
var AppServicePlanZoneRedundancyValidator = /** @class */ (function (_super) {
    __extends(AppServicePlanZoneRedundancyValidator, _super);
    function AppServicePlanZoneRedundancyValidator() {
        return _super.call(this, 'appserviceplan-zone-redundancy', 'Validates App Service Plan zone redundancy is properly configured', validation_result_1.ValidationSeverity.WARNING, ['Microsoft.Web/serverfarms']) || this;
    }
    AppServicePlanZoneRedundancyValidator.prototype.validate = function (resource, context) {
        var _a, _b;
        var zoneRedundant = (_a = resource.properties) === null || _a === void 0 ? void 0 : _a.zoneRedundant;
        var sku = resource.sku;
        if (zoneRedundant && (sku === null || sku === void 0 ? void 0 : sku.name)) {
            // Zone redundancy is only supported on specific SKUs
            var supportsZoneRedundancy = ['P1v2', 'P2v2', 'P3v2', 'P1v3', 'P2v3', 'P3v3'].includes(sku.name);
            if (!supportsZoneRedundancy) {
                return validation_result_1.ValidationResultBuilder.error(this.name)
                    .withMessage("SKU ".concat(sku.name, " does not support zone redundancy"))
                    .withSuggestion('Use PremiumV2 or PremiumV3 SKU for zone redundancy')
                    .build();
            }
            // Requires minimum capacity of 3
            if (sku.capacity && sku.capacity < 3) {
                return validation_result_1.ValidationResultBuilder.error(this.name)
                    .withMessage('Zone redundancy requires minimum capacity of 3')
                    .withSuggestion('Set sku.capacity to 3 or higher')
                    .build();
            }
        }
        // Recommend zone redundancy for production
        if (!zoneRedundant &&
            (context === null || context === void 0 ? void 0 : context.environment) === 'production' &&
            ((_b = sku === null || sku === void 0 ? void 0 : sku.name) === null || _b === void 0 ? void 0 : _b.startsWith('P'))) {
            return validation_result_1.ValidationResultBuilder.warning(this.name)
                .withMessage('Production App Service Plan without zone redundancy')
                .withSuggestion('Enable zoneRedundant for high availability')
                .withDetails('Zone redundancy provides automatic failover across availability zones')
                .build();
        }
        return validation_result_1.ValidationResultBuilder.success(this.name).build();
    };
    return AppServicePlanZoneRedundancyValidator;
}(validation_rule_1.BaseValidationRule));
exports.AppServicePlanZoneRedundancyValidator = AppServicePlanZoneRedundancyValidator;
/**
 * Validates Function App name format
 */
var FunctionAppNameValidator = /** @class */ (function (_super) {
    __extends(FunctionAppNameValidator, _super);
    function FunctionAppNameValidator() {
        return _super.call(this, 'functionapp-name-format', 'Validates Function App name follows Azure naming rules', validation_result_1.ValidationSeverity.ERROR, ['Microsoft.Web/sites']) || this;
    }
    FunctionAppNameValidator.prototype.validate = function (resource, context) {
        var kind = resource.kind;
        if (!kind || !kind.includes('functionapp')) {
            return validation_result_1.ValidationResultBuilder.success(this.name).build();
        }
        var name = resource.name || resource.siteName;
        if (!name) {
            return validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage('Function App name is required')
                .build();
        }
        var results = [];
        // Length check (2-60)
        results.push((0, common_validators_1.validateLength)(name, 2, 60, 'Function App name', this.name));
        // Pattern check (alphanumeric and hyphens only)
        var pattern = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/;
        results.push((0, common_validators_1.validatePattern)(name, pattern, 'Function App name', this.name, 'Function App names must contain only alphanumeric characters and hyphens, and cannot start or end with a hyphen'));
        return common_validators_1.collectResults.apply(void 0, results);
    };
    return FunctionAppNameValidator;
}(validation_rule_1.BaseValidationRule));
exports.FunctionAppNameValidator = FunctionAppNameValidator;
/**
 * Validates Function App storage account configuration
 */
var FunctionAppStorageValidator = /** @class */ (function (_super) {
    __extends(FunctionAppStorageValidator, _super);
    function FunctionAppStorageValidator() {
        return _super.call(this, 'functionapp-storage', 'Validates Function App has required storage account configuration', validation_result_1.ValidationSeverity.ERROR, ['Microsoft.Web/sites']) || this;
    }
    FunctionAppStorageValidator.prototype.validate = function (resource, context) {
        var _a, _b;
        var kind = resource.kind;
        if (!kind || !kind.includes('functionapp')) {
            return validation_result_1.ValidationResultBuilder.success(this.name).build();
        }
        var appSettings = ((_b = (_a = resource.properties) === null || _a === void 0 ? void 0 : _a.siteConfig) === null || _b === void 0 ? void 0 : _b.appSettings) || [];
        var azureWebJobsStorage = appSettings.find(function (s) { return s.name === 'AzureWebJobsStorage'; });
        if (!azureWebJobsStorage) {
            return validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage('Function App requires AzureWebJobsStorage app setting')
                .withSuggestion('Add AzureWebJobsStorage connection string to app settings')
                .withDetails('This storage account is used for internal function runtime operations')
                .build();
        }
        // Validate it's not empty
        if (!azureWebJobsStorage.value) {
            return validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage('AzureWebJobsStorage connection string is empty')
                .withSuggestion('Provide a valid storage account connection string')
                .build();
        }
        return validation_result_1.ValidationResultBuilder.success(this.name).build();
    };
    return FunctionAppStorageValidator;
}(validation_rule_1.BaseValidationRule));
exports.FunctionAppStorageValidator = FunctionAppStorageValidator;
/**
 * Validates Function App runtime version
 */
var FunctionAppRuntimeValidator = /** @class */ (function (_super) {
    __extends(FunctionAppRuntimeValidator, _super);
    function FunctionAppRuntimeValidator() {
        return _super.call(this, 'functionapp-runtime', 'Validates Function App runtime stack and version', validation_result_1.ValidationSeverity.WARNING, ['Microsoft.Web/sites']) || this;
    }
    FunctionAppRuntimeValidator.prototype.validate = function (resource, context) {
        var _a, _b;
        var kind = resource.kind;
        if (!kind || !kind.includes('functionapp')) {
            return validation_result_1.ValidationResultBuilder.success(this.name).build();
        }
        var appSettings = ((_b = (_a = resource.properties) === null || _a === void 0 ? void 0 : _a.siteConfig) === null || _b === void 0 ? void 0 : _b.appSettings) || [];
        var runtimeVersion = appSettings.find(function (s) { return s.name === 'FUNCTIONS_EXTENSION_VERSION'; });
        if (!runtimeVersion) {
            return validation_result_1.ValidationResultBuilder.warning(this.name)
                .withMessage('FUNCTIONS_EXTENSION_VERSION not specified')
                .withSuggestion('Set FUNCTIONS_EXTENSION_VERSION to ~4 for latest runtime')
                .build();
        }
        // Warn about old runtime versions
        if (runtimeVersion.value && ['~1', '~2', '~3'].includes(runtimeVersion.value)) {
            return validation_result_1.ValidationResultBuilder.warning(this.name)
                .withMessage("Runtime version ".concat(runtimeVersion.value, " is outdated"))
                .withSuggestion('Upgrade to ~4 for latest features and support')
                .withDetails('Older runtime versions may have reduced support')
                .build();
        }
        return validation_result_1.ValidationResultBuilder.success(this.name).build();
    };
    return FunctionAppRuntimeValidator;
}(validation_rule_1.BaseValidationRule));
exports.FunctionAppRuntimeValidator = FunctionAppRuntimeValidator;
/**
 * Validates Function App always-on configuration
 */
var FunctionAppAlwaysOnValidator = /** @class */ (function (_super) {
    __extends(FunctionAppAlwaysOnValidator, _super);
    function FunctionAppAlwaysOnValidator() {
        return _super.call(this, 'functionapp-always-on', 'Validates Function App always-on setting is appropriate for plan', validation_result_1.ValidationSeverity.WARNING, ['Microsoft.Web/sites']) || this;
    }
    FunctionAppAlwaysOnValidator.prototype.validate = function (resource, context) {
        var _a, _b, _c, _d, _e, _f;
        var kind = resource.kind;
        if (!kind || !kind.includes('functionapp')) {
            return validation_result_1.ValidationResultBuilder.success(this.name).build();
        }
        var alwaysOn = (_b = (_a = resource.properties) === null || _a === void 0 ? void 0 : _a.siteConfig) === null || _b === void 0 ? void 0 : _b.alwaysOn;
        var appServicePlanId = (_c = resource.properties) === null || _c === void 0 ? void 0 : _c.serverFarmId;
        // Get plan SKU from context if available
        var planSku = (_f = (_e = (_d = context === null || context === void 0 ? void 0 : context.resources) === null || _d === void 0 ? void 0 : _d.get(appServicePlanId)) === null || _e === void 0 ? void 0 : _e.sku) === null || _f === void 0 ? void 0 : _f.name;
        // Always-on is not supported on Consumption plan (Y1)
        if (alwaysOn && planSku === 'Y1') {
            return validation_result_1.ValidationResultBuilder.error(this.name)
                .withMessage('Always-on is not supported on Consumption plan')
                .withSuggestion('Remove alwaysOn setting or use Premium/Dedicated plan')
                .build();
        }
        // Recommend always-on for non-consumption plans
        if (!alwaysOn &&
            planSku &&
            planSku !== 'Y1' &&
            (context === null || context === void 0 ? void 0 : context.environment) === 'production') {
            return validation_result_1.ValidationResultBuilder.warning(this.name)
                .withMessage('Always-on is disabled on non-consumption plan')
                .withSuggestion('Enable always-on to prevent cold starts')
                .withDetails('Set siteConfig.alwaysOn: true')
                .build();
        }
        return validation_result_1.ValidationResultBuilder.success(this.name).build();
    };
    return FunctionAppAlwaysOnValidator;
}(validation_rule_1.BaseValidationRule));
exports.FunctionAppAlwaysOnValidator = FunctionAppAlwaysOnValidator;
/**
 * Validates Function App Application Insights configuration
 */
var FunctionAppApplicationInsightsValidator = /** @class */ (function (_super) {
    __extends(FunctionAppApplicationInsightsValidator, _super);
    function FunctionAppApplicationInsightsValidator() {
        return _super.call(this, 'functionapp-appinsights', 'Validates Function App has Application Insights configured', validation_result_1.ValidationSeverity.WARNING, ['Microsoft.Web/sites']) || this;
    }
    FunctionAppApplicationInsightsValidator.prototype.validate = function (resource, context) {
        var _a, _b;
        var kind = resource.kind;
        if (!kind || !kind.includes('functionapp')) {
            return validation_result_1.ValidationResultBuilder.success(this.name).build();
        }
        var appSettings = ((_b = (_a = resource.properties) === null || _a === void 0 ? void 0 : _a.siteConfig) === null || _b === void 0 ? void 0 : _b.appSettings) || [];
        var instrumentationKey = appSettings.find(function (s) { return s.name === 'APPINSIGHTS_INSTRUMENTATIONKEY'; });
        var connectionString = appSettings.find(function (s) { return s.name === 'APPLICATIONINSIGHTS_CONNECTION_STRING'; });
        if (!instrumentationKey && !connectionString) {
            return validation_result_1.ValidationResultBuilder.warning(this.name)
                .withMessage('Application Insights not configured')
                .withSuggestion('Add APPLICATIONINSIGHTS_CONNECTION_STRING app setting')
                .withDetails('Application Insights provides monitoring, logging, and diagnostics')
                .build();
        }
        return validation_result_1.ValidationResultBuilder.success(this.name).build();
    };
    return FunctionAppApplicationInsightsValidator;
}(validation_rule_1.BaseValidationRule));
exports.FunctionAppApplicationInsightsValidator = FunctionAppApplicationInsightsValidator;
/**
 * Export all web validators
 */
exports.webValidators = [
    new AppServicePlanNameValidator(),
    new AppServicePlanSkuValidator(),
    new AppServicePlanZoneRedundancyValidator(),
    new FunctionAppNameValidator(),
    new FunctionAppStorageValidator(),
    new FunctionAppRuntimeValidator(),
    new FunctionAppAlwaysOnValidator(),
    new FunctionAppApplicationInsightsValidator(),
];
