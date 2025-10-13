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
exports.LimitValidator = void 0;
var validator_registry_1 = require("./validator-registry");
/**
 * Validates ARM template against Azure limits
 */
var LimitValidator = /** @class */ (function (_super) {
    __extends(LimitValidator, _super);
    function LimitValidator() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.name = 'LimitValidator';
        _this.limits = {
            maxTemplateSize: 4 * 1024 * 1024, // 4 MB
            maxResources: 800,
            maxParameters: 256,
            maxOutputs: 64,
            maxVariables: 256,
            warningThreshold: 80, // Warn at 80%
        };
        return _this;
    }
    LimitValidator.prototype.validate = function (template, stackName) {
        var errors = [];
        var warnings = [];
        // Check template size
        var templateJson = JSON.stringify(template);
        var templateSize = Buffer.byteLength(templateJson, 'utf-8');
        var maxSize = this.limits.maxTemplateSize;
        var warningSize = maxSize * (this.limits.warningThreshold / 100);
        if (templateSize > maxSize) {
            errors.push(this.createError("Template size (".concat(this.formatBytes(templateSize), ") exceeds maximum allowed size of ").concat(this.formatBytes(maxSize)), stackName, 'TEMPLATE_TOO_LARGE', 'Consider splitting this stack into multiple smaller stacks or using nested templates'));
        }
        else if (templateSize > warningSize) {
            warnings.push(this.createWarning("Template size (".concat(this.formatBytes(templateSize), ") is at ").concat(Math.round((templateSize / maxSize) * 100), "% of the maximum (").concat(this.formatBytes(maxSize), ")"), stackName, 'TEMPLATE_SIZE_WARNING', 'Consider splitting this stack if you plan to add more resources'));
        }
        // Check resource count
        var resourceCount = template.resources.length;
        var maxResources = this.limits.maxResources;
        var warningResources = maxResources * (this.limits.warningThreshold / 100);
        if (resourceCount > maxResources) {
            errors.push(this.createError("Resource count (".concat(resourceCount, ") exceeds maximum of ").concat(maxResources), stackName, 'TOO_MANY_RESOURCES', 'Split this stack into multiple stacks to reduce the resource count'));
        }
        else if (resourceCount > warningResources) {
            warnings.push(this.createWarning("Resource count (".concat(resourceCount, ") is at ").concat(Math.round((resourceCount / maxResources) * 100), "% of the maximum (").concat(maxResources, ")"), stackName, 'RESOURCE_COUNT_WARNING', "Consider splitting this stack if you plan to add more than ".concat(maxResources - resourceCount, " more resources")));
        }
        // Check parameter count
        var parameterCount = Object.keys(template.parameters || {}).length;
        var maxParameters = this.limits.maxParameters;
        var warningParameters = maxParameters * (this.limits.warningThreshold / 100);
        if (parameterCount > maxParameters) {
            errors.push(this.createError("Parameter count (".concat(parameterCount, ") exceeds maximum of ").concat(maxParameters), stackName, 'TOO_MANY_PARAMETERS', 'Reduce the number of parameters or use parameter files with fewer parameters per template'));
        }
        else if (parameterCount > warningParameters) {
            warnings.push(this.createWarning("Parameter count (".concat(parameterCount, ") is at ").concat(Math.round((parameterCount / maxParameters) * 100), "% of the maximum (").concat(maxParameters, ")"), stackName, 'PARAMETER_COUNT_WARNING'));
        }
        // Check output count
        var outputCount = Object.keys(template.outputs || {}).length;
        var maxOutputs = this.limits.maxOutputs;
        var warningOutputs = maxOutputs * (this.limits.warningThreshold / 100);
        if (outputCount > maxOutputs) {
            errors.push(this.createError("Output count (".concat(outputCount, ") exceeds maximum of ").concat(maxOutputs), stackName, 'TOO_MANY_OUTPUTS', 'Reduce the number of outputs or consolidate related outputs into objects'));
        }
        else if (outputCount > warningOutputs) {
            warnings.push(this.createWarning("Output count (".concat(outputCount, ") is at ").concat(Math.round((outputCount / maxOutputs) * 100), "% of the maximum (").concat(maxOutputs, ")"), stackName, 'OUTPUT_COUNT_WARNING'));
        }
        // Check variable count
        var variableCount = Object.keys(template.variables || {}).length;
        var maxVariables = this.limits.maxVariables;
        var warningVariables = maxVariables * (this.limits.warningThreshold / 100);
        if (variableCount > maxVariables) {
            errors.push(this.createError("Variable count (".concat(variableCount, ") exceeds maximum of ").concat(maxVariables), stackName, 'TOO_MANY_VARIABLES', 'Reduce the number of variables or move logic to runtime'));
        }
        else if (variableCount > warningVariables) {
            warnings.push(this.createWarning("Variable count (".concat(variableCount, ") is at ").concat(Math.round((variableCount / maxVariables) * 100), "% of the maximum (").concat(maxVariables, ")"), stackName, 'VARIABLE_COUNT_WARNING'));
        }
        return {
            valid: errors.length === 0,
            errors: errors,
            warnings: warnings,
        };
    };
    /**
     * Format bytes to human-readable string
     */
    LimitValidator.prototype.formatBytes = function (bytes) {
        if (bytes < 1024)
            return "".concat(bytes, " B");
        if (bytes < 1024 * 1024)
            return "".concat((bytes / 1024).toFixed(2), " KB");
        return "".concat((bytes / (1024 * 1024)).toFixed(2), " MB");
    };
    return LimitValidator;
}(validator_registry_1.BaseValidator));
exports.LimitValidator = LimitValidator;
