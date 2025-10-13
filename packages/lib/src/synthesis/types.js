"use strict";
/**
 * Core synthesis types and interfaces for ARM template generation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationSeverity = void 0;
/**
 * Validation severity levels
 */
var ValidationSeverity;
(function (ValidationSeverity) {
    ValidationSeverity["ERROR"] = "error";
    ValidationSeverity["WARNING"] = "warning";
    ValidationSeverity["INFO"] = "info";
})(ValidationSeverity || (exports.ValidationSeverity = ValidationSeverity = {}));
