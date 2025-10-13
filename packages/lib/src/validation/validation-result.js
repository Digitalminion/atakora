"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationResultBuilder = exports.ValidationSeverity = void 0;
/**
 * Validation result severity levels
 */
var ValidationSeverity;
(function (ValidationSeverity) {
    /**
     * Critical error - deployment will fail
     */
    ValidationSeverity["ERROR"] = "error";
    /**
     * Warning - deployment may succeed but could cause runtime issues
     */
    ValidationSeverity["WARNING"] = "warning";
    /**
     * Informational - best practice recommendation
     */
    ValidationSeverity["INFO"] = "info";
})(ValidationSeverity || (exports.ValidationSeverity = ValidationSeverity = {}));
/**
 * Builder for creating validation results
 */
var ValidationResultBuilder = /** @class */ (function () {
    function ValidationResultBuilder(ruleName, severity) {
        this.result = {
            valid: true,
            severity: severity,
            ruleName: ruleName,
        };
    }
    /**
     * Mark validation as failed
     */
    ValidationResultBuilder.prototype.invalid = function () {
        this.result.valid = false;
        return this;
    };
    /**
     * Set error message
     */
    ValidationResultBuilder.prototype.withMessage = function (message) {
        this.result.message = message;
        return this;
    };
    /**
     * Set suggestion for fixing the issue
     */
    ValidationResultBuilder.prototype.withSuggestion = function (suggestion) {
        this.result.suggestion = suggestion;
        return this;
    };
    /**
     * Set additional details
     */
    ValidationResultBuilder.prototype.withDetails = function (details) {
        this.result.details = details;
        return this;
    };
    /**
     * Set resource path
     */
    ValidationResultBuilder.prototype.withPath = function (path) {
        this.result.path = path;
        return this;
    };
    /**
     * Build and return the validation result
     */
    ValidationResultBuilder.prototype.build = function () {
        return this.result;
    };
    /**
     * Create an error result
     */
    ValidationResultBuilder.error = function (ruleName) {
        return new ValidationResultBuilder(ruleName, ValidationSeverity.ERROR).invalid();
    };
    /**
     * Create a warning result
     */
    ValidationResultBuilder.warning = function (ruleName) {
        return new ValidationResultBuilder(ruleName, ValidationSeverity.WARNING);
    };
    /**
     * Create an info result
     */
    ValidationResultBuilder.info = function (ruleName) {
        return new ValidationResultBuilder(ruleName, ValidationSeverity.INFO);
    };
    /**
     * Create a success result
     */
    ValidationResultBuilder.success = function (ruleName) {
        return new ValidationResultBuilder(ruleName, ValidationSeverity.INFO);
    };
    return ValidationResultBuilder;
}());
exports.ValidationResultBuilder = ValidationResultBuilder;
