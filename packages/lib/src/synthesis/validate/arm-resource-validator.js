"use strict";
/**
 * ARM Resource Validator - Integrates the new validation framework with synthesis pipeline
 *
 * @packageDocumentation
 */
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
exports.ArmResourceValidator = void 0;
var validation_1 = require("../../validation");
var validator_registry_1 = require("./validator-registry");
/**
 * ARM Resource Validator that runs the new validation framework during synthesis
 *
 * @remarks
 * This validator integrates the comprehensive Azure resource validation framework
 * into the synthesis pipeline. It runs validation rules against ARM resources
 * before deployment to catch common configuration errors.
 *
 * The validator:
 * - Registers all validation rules on first use
 * - Runs resource-specific validators based on resource type
 * - Converts validation results to synthesis pipeline format
 * - Provides a validation context with cross-resource information
 *
 * **Validation Coverage**:
 * - Network resources (VNet, Subnet, NSG, Public IP, Private Endpoints)
 * - Storage accounts
 * - Key Vaults
 * - Cosmos DB accounts
 * - Cognitive Services (OpenAI)
 * - Web services (App Service Plans, Function Apps)
 *
 * @example
 * ```typescript
 * const synthesizer = new Synthesizer();
 * synthesizer.addValidator(new ArmResourceValidator());
 * ```
 */
var ArmResourceValidator = /** @class */ (function (_super) {
    __extends(ArmResourceValidator, _super);
    function ArmResourceValidator() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.name = 'arm-resource-validator';
        return _this;
    }
    /**
     * Validates ARM template using the comprehensive validation framework
     *
     * @param template - Generated ARM template
     * @param stackName - Name of the stack being validated
     * @returns Validation result with errors and warnings
     */
    ArmResourceValidator.prototype.validate = function (template, stackName) {
        // Register all validators on first use
        if (!ArmResourceValidator.registeredValidators) {
            (0, validation_1.registerAllValidators)();
            ArmResourceValidator.registeredValidators = true;
        }
        var errors = [];
        var warnings = [];
        // Build validation context
        var context = this.buildContext(template.resources, stackName);
        // Validate each ARM resource
        for (var _i = 0, _a = template.resources; _i < _a.length; _i++) {
            var armResource = _a[_i];
            var resourceType = armResource.type;
            // Run validators for this resource type
            var validationResults = validation_1.validatorRegistry.validate(resourceType, armResource, context);
            // Convert to synthesis format
            for (var _b = 0, validationResults_1 = validationResults; _b < validationResults_1.length; _b++) {
                var result = validationResults_1[_b];
                if (!result.valid) {
                    var path = result.path || "".concat(stackName, ".").concat(armResource.name);
                    if (result.severity === 'error') {
                        errors.push(this.createError(result.message || 'Validation failed', path, result.ruleName, result.suggestion));
                    }
                    else if (result.severity === 'warning') {
                        warnings.push(this.createWarning(result.message || 'Validation warning', path, result.ruleName, result.suggestion));
                    }
                }
            }
        }
        return {
            valid: errors.length === 0,
            errors: errors,
            warnings: warnings,
        };
    };
    /**
     * Builds validation context from ARM resources
     *
     * @param armResources - All ARM resources in the template
     * @param stackName - Name of the stack
     * @returns Validation context for cross-resource validation
     */
    ArmResourceValidator.prototype.buildContext = function (armResources, stackName) {
        var resourceMap = new Map();
        // Map resources by name for cross-resource lookups
        for (var _i = 0, armResources_1 = armResources; _i < armResources_1.length; _i++) {
            var resource = armResources_1[_i];
            if (resource.name) {
                resourceMap.set(resource.name, resource);
            }
        }
        // Extract environment from stack name if available
        var environment = this.extractEnvironment(stackName);
        return {
            resources: resourceMap,
            environment: environment,
        };
    };
    /**
     * Extracts environment from stack name
     *
     * @param stackName - Stack name to parse
     * @returns Environment string (prod, dev, etc.) or undefined
     */
    ArmResourceValidator.prototype.extractEnvironment = function (stackName) {
        var lower = stackName.toLowerCase();
        if (lower.includes('prod'))
            return 'production';
        if (lower.includes('dev'))
            return 'development';
        if (lower.includes('test'))
            return 'test';
        if (lower.includes('staging'))
            return 'staging';
        return undefined;
    };
    ArmResourceValidator.registeredValidators = false;
    return ArmResourceValidator;
}(validator_registry_1.BaseValidator));
exports.ArmResourceValidator = ArmResourceValidator;
