"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateLength = validateLength;
exports.validatePattern = validatePattern;
exports.validateRequired = validateRequired;
exports.validateRange = validateRange;
exports.validateEnum = validateEnum;
exports.validateAzureResourceName = validateAzureResourceName;
exports.warnGloballyUnique = warnGloballyUnique;
exports.validateLowercase = validateLowercase;
exports.validateNoConsecutive = validateNoConsecutive;
exports.validateStartsWith = validateStartsWith;
exports.validateEndsWith = validateEndsWith;
exports.collectResults = collectResults;
var validation_result_1 = require("./validation-result");
/**
 * Common validation patterns and helpers
 */
/**
 * Validate string length
 */
function validateLength(value, min, max, fieldName, ruleName) {
    if (value.length < min || value.length > max) {
        return validation_result_1.ValidationResultBuilder.error(ruleName)
            .withMessage("".concat(fieldName, " must be ").concat(min, "-").concat(max, " characters"))
            .withDetails("Current length: ".concat(value.length))
            .build();
    }
    return null;
}
/**
 * Validate string pattern (regex)
 */
function validatePattern(value, pattern, fieldName, ruleName, errorMessage) {
    if (!pattern.test(value)) {
        return validation_result_1.ValidationResultBuilder.error(ruleName)
            .withMessage(errorMessage || "".concat(fieldName, " does not match required pattern"))
            .withDetails("Value: ".concat(value, ", Pattern: ").concat(pattern))
            .build();
    }
    return null;
}
/**
 * Validate required field
 */
function validateRequired(value, fieldName, ruleName) {
    if (value === undefined || value === null || value === '') {
        return validation_result_1.ValidationResultBuilder.error(ruleName)
            .withMessage("".concat(fieldName, " is required"))
            .build();
    }
    return null;
}
/**
 * Validate number range
 */
function validateRange(value, min, max, fieldName, ruleName) {
    if (value < min || value > max) {
        return validation_result_1.ValidationResultBuilder.error(ruleName)
            .withMessage("".concat(fieldName, " must be between ").concat(min, " and ").concat(max))
            .withDetails("Current value: ".concat(value))
            .build();
    }
    return null;
}
/**
 * Validate enum value
 */
function validateEnum(value, validValues, fieldName, ruleName) {
    if (!validValues.includes(value)) {
        return validation_result_1.ValidationResultBuilder.error(ruleName)
            .withMessage("Invalid value for ".concat(fieldName))
            .withSuggestion("Valid values: ".concat(validValues.join(', ')))
            .withDetails("Current value: ".concat(value))
            .build();
    }
    return null;
}
/**
 * Validate Azure resource name format (general)
 */
function validateAzureResourceName(name, minLength, maxLength, pattern, ruleName, additionalRules) {
    // Check length
    var lengthResult = validateLength(name, minLength, maxLength, 'Resource name', ruleName);
    if (lengthResult)
        return lengthResult;
    // Check pattern
    var patternResult = validatePattern(name, pattern, 'Resource name', ruleName, additionalRules || 'Name contains invalid characters');
    if (patternResult)
        return patternResult;
    return null;
}
/**
 * Validate globally unique resource name (add warning)
 */
function warnGloballyUnique(ruleName, resourceType) {
    return validation_result_1.ValidationResultBuilder.warning(ruleName)
        .withMessage("".concat(resourceType, " names must be globally unique across Azure"))
        .withSuggestion('Consider adding a hash suffix for uniqueness')
        .build();
}
/**
 * Validate lowercase requirement
 */
function validateLowercase(value, fieldName, ruleName) {
    if (value !== value.toLowerCase()) {
        return validation_result_1.ValidationResultBuilder.error(ruleName)
            .withMessage("".concat(fieldName, " must be lowercase"))
            .withSuggestion("Use: ".concat(value.toLowerCase()))
            .build();
    }
    return null;
}
/**
 * Validate no consecutive characters (e.g., no '--')
 */
function validateNoConsecutive(value, char, fieldName, ruleName) {
    var pattern = new RegExp("".concat(char, "{2,}"));
    if (pattern.test(value)) {
        return validation_result_1.ValidationResultBuilder.error(ruleName)
            .withMessage("".concat(fieldName, " cannot contain consecutive '").concat(char, "' characters"))
            .build();
    }
    return null;
}
/**
 * Validate string starts with specific character type
 */
function validateStartsWith(value, requirement, fieldName, ruleName) {
    var patterns = {
        letter: /^[a-zA-Z]/,
        alphanumeric: /^[a-zA-Z0-9]/,
        lowercase: /^[a-z]/,
    };
    if (!patterns[requirement].test(value)) {
        return validation_result_1.ValidationResultBuilder.error(ruleName)
            .withMessage("".concat(fieldName, " must start with ").concat(requirement, " character"))
            .build();
    }
    return null;
}
/**
 * Validate string ends with specific character type
 */
function validateEndsWith(value, requirement, fieldName, ruleName) {
    var patterns = {
        letter: /[a-zA-Z]$/,
        alphanumeric: /[a-zA-Z0-9]$/,
        lowercase: /[a-z]$/,
    };
    if (!patterns[requirement].test(value)) {
        return validation_result_1.ValidationResultBuilder.error(ruleName)
            .withMessage("".concat(fieldName, " must end with ").concat(requirement, " character"))
            .build();
    }
    return null;
}
/**
 * Create a validation result array from nullable results
 */
function collectResults() {
    var results = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        results[_i] = arguments[_i];
    }
    return results.filter(function (r) { return r !== null; });
}
