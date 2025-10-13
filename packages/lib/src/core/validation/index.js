"use strict";
/**
 * Validation framework for Azure resources.
 *
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllErrors = exports.searchErrors = exports.getErrorsByCategory = exports.getErrorDefinition = exports.createValidationError = exports.CatalogValidationError = exports.CatalogErrorSeverity = exports.ErrorCategory = exports.ErrorCatalog = exports.ResourceValidator = exports.isValidPortRange = exports.cidrsOverlap = exports.isWithinCIDR = exports.parseCIDR = exports.isValidCIDR = exports.ValidationResultBuilder = exports.ValidationError = exports.ValidationSeverity = void 0;
var validation_helpers_1 = require("./validation-helpers");
Object.defineProperty(exports, "ValidationSeverity", { enumerable: true, get: function () { return validation_helpers_1.ValidationSeverity; } });
Object.defineProperty(exports, "ValidationError", { enumerable: true, get: function () { return validation_helpers_1.ValidationError; } });
Object.defineProperty(exports, "ValidationResultBuilder", { enumerable: true, get: function () { return validation_helpers_1.ValidationResultBuilder; } });
Object.defineProperty(exports, "isValidCIDR", { enumerable: true, get: function () { return validation_helpers_1.isValidCIDR; } });
Object.defineProperty(exports, "parseCIDR", { enumerable: true, get: function () { return validation_helpers_1.parseCIDR; } });
Object.defineProperty(exports, "isWithinCIDR", { enumerable: true, get: function () { return validation_helpers_1.isWithinCIDR; } });
Object.defineProperty(exports, "cidrsOverlap", { enumerable: true, get: function () { return validation_helpers_1.cidrsOverlap; } });
Object.defineProperty(exports, "isValidPortRange", { enumerable: true, get: function () { return validation_helpers_1.isValidPortRange; } });
var resource_validator_1 = require("./resource-validator");
Object.defineProperty(exports, "ResourceValidator", { enumerable: true, get: function () { return resource_validator_1.ResourceValidator; } });
// Error catalog exports
var error_catalog_1 = require("./error-catalog");
Object.defineProperty(exports, "ErrorCatalog", { enumerable: true, get: function () { return error_catalog_1.ErrorCatalog; } });
Object.defineProperty(exports, "ErrorCategory", { enumerable: true, get: function () { return error_catalog_1.ErrorCategory; } });
Object.defineProperty(exports, "CatalogErrorSeverity", { enumerable: true, get: function () { return error_catalog_1.ErrorSeverity; } });
Object.defineProperty(exports, "CatalogValidationError", { enumerable: true, get: function () { return error_catalog_1.ValidationError; } });
Object.defineProperty(exports, "createValidationError", { enumerable: true, get: function () { return error_catalog_1.createValidationError; } });
Object.defineProperty(exports, "getErrorDefinition", { enumerable: true, get: function () { return error_catalog_1.getErrorDefinition; } });
Object.defineProperty(exports, "getErrorsByCategory", { enumerable: true, get: function () { return error_catalog_1.getErrorsByCategory; } });
Object.defineProperty(exports, "searchErrors", { enumerable: true, get: function () { return error_catalog_1.searchErrors; } });
Object.defineProperty(exports, "getAllErrors", { enumerable: true, get: function () { return error_catalog_1.getAllErrors; } });
