"use strict";
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
exports.validatorRegistry = exports.ValidatorRegistry = void 0;
var validation_result_1 = require("./validation-result");
/**
 * Registry for validation rules
 */
var ValidatorRegistry = /** @class */ (function () {
    function ValidatorRegistry() {
        this.rules = new Map();
        this.globalRules = [];
    }
    /**
     * Get the singleton instance
     */
    ValidatorRegistry.getInstance = function () {
        if (!ValidatorRegistry.instance) {
            ValidatorRegistry.instance = new ValidatorRegistry();
        }
        return ValidatorRegistry.instance;
    };
    /**
     * Register a validation rule for a specific resource type
     * @param resourceType - ARM resource type (e.g., 'Microsoft.Network/virtualNetworks')
     * @param rule - Validation rule to register
     */
    ValidatorRegistry.prototype.register = function (resourceType, rule) {
        if (!this.rules.has(resourceType)) {
            this.rules.set(resourceType, []);
        }
        this.rules.get(resourceType).push(rule);
    };
    /**
     * Register a global validation rule that applies to all resources
     * @param rule - Validation rule to register
     */
    ValidatorRegistry.prototype.registerGlobal = function (rule) {
        this.globalRules.push(rule);
    };
    /**
     * Register multiple rules at once
     * @param resourceType - ARM resource type
     * @param rules - Array of validation rules
     */
    ValidatorRegistry.prototype.registerMany = function (resourceType, rules) {
        var _this = this;
        rules.forEach(function (rule) { return _this.register(resourceType, rule); });
    };
    /**
     * Get all rules for a resource type
     * @param resourceType - ARM resource type
     * @returns Array of validation rules
     */
    ValidatorRegistry.prototype.getRules = function (resourceType) {
        var typeRules = this.rules.get(resourceType) || [];
        return __spreadArray(__spreadArray([], this.globalRules, true), typeRules, true);
    };
    /**
     * Validate a resource against all applicable rules
     * @param resourceType - ARM resource type
     * @param resource - Resource to validate
     * @param context - Optional validation context
     * @returns Array of validation results
     */
    ValidatorRegistry.prototype.validate = function (resourceType, resource, context) {
        var rules = this.getRules(resourceType);
        var results = [];
        for (var _i = 0, rules_1 = rules; _i < rules_1.length; _i++) {
            var rule = rules_1[_i];
            // Check if rule should run
            if (rule.condition && !rule.condition(resource, context)) {
                continue;
            }
            try {
                var result = rule.validate(resource, context);
                if (Array.isArray(result)) {
                    results.push.apply(results, result);
                }
                else {
                    results.push(result);
                }
            }
            catch (error) {
                // Validation rule threw an error - treat as validation failure
                results.push({
                    valid: false,
                    severity: validation_result_1.ValidationSeverity.ERROR,
                    ruleName: rule.name,
                    message: "Validation rule threw error: ".concat(error instanceof Error ? error.message : String(error)),
                });
            }
        }
        return results;
    };
    /**
     * Check if any validation results have errors
     * @param results - Array of validation results
     * @returns True if any result is an error
     */
    ValidatorRegistry.prototype.hasErrors = function (results) {
        return results.some(function (r) { return !r.valid && r.severity === validation_result_1.ValidationSeverity.ERROR; });
    };
    /**
     * Check if any validation results have warnings
     * @param results - Array of validation results
     * @returns True if any result is a warning
     */
    ValidatorRegistry.prototype.hasWarnings = function (results) {
        return results.some(function (r) { return !r.valid && r.severity === validation_result_1.ValidationSeverity.WARNING; });
    };
    /**
     * Get only error results
     * @param results - Array of validation results
     * @returns Array of error results
     */
    ValidatorRegistry.prototype.getErrors = function (results) {
        return results.filter(function (r) { return !r.valid && r.severity === validation_result_1.ValidationSeverity.ERROR; });
    };
    /**
     * Get only warning results
     * @param results - Array of validation results
     * @returns Array of warning results
     */
    ValidatorRegistry.prototype.getWarnings = function (results) {
        return results.filter(function (r) { return !r.valid && r.severity === validation_result_1.ValidationSeverity.WARNING; });
    };
    /**
     * Get only info results
     * @param results - Array of validation results
     * @returns Array of info results
     */
    ValidatorRegistry.prototype.getInfo = function (results) {
        return results.filter(function (r) { return r.severity === validation_result_1.ValidationSeverity.INFO; });
    };
    /**
     * Clear all registered rules (useful for testing)
     */
    ValidatorRegistry.prototype.clear = function () {
        this.rules.clear();
        this.globalRules = [];
    };
    /**
     * Get count of registered rules
     */
    ValidatorRegistry.prototype.getRuleCount = function () {
        var count = this.globalRules.length;
        this.rules.forEach(function (rules) { return (count += rules.length); });
        return count;
    };
    return ValidatorRegistry;
}());
exports.ValidatorRegistry = ValidatorRegistry;
/**
 * Get the global validator registry instance
 */
exports.validatorRegistry = ValidatorRegistry.getInstance();
