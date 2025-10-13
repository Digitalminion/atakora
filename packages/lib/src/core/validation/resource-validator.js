"use strict";
/**
 * Base resource validator for common validation patterns.
 *
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceValidator = void 0;
var validation_helpers_1 = require("./validation-helpers");
/**
 * Base validator providing common validation methods.
 *
 * @remarks
 * This class provides reusable validation methods for:
 * - Resource names
 * - Location/region
 * - Tags
 * - CIDR ranges
 * - Common Azure resource constraints
 */
var ResourceValidator = /** @class */ (function () {
    function ResourceValidator() {
    }
    /**
     * Validates a resource name against Azure naming constraints.
     *
     * @param name - Resource name to validate
     * @param resourceType - Type of resource (for error messages)
     * @param minLength - Minimum allowed length (default: 1)
     * @param maxLength - Maximum allowed length (default: 64)
     * @param pattern - Optional regex pattern the name must match
     * @returns Validation result
     */
    ResourceValidator.validateResourceName = function (name, resourceType, minLength, maxLength, pattern) {
        if (minLength === void 0) { minLength = 1; }
        if (maxLength === void 0) { maxLength = 64; }
        var builder = new validation_helpers_1.ValidationResultBuilder();
        if (!name || name.trim() === '') {
            builder.addError("".concat(resourceType, " name cannot be empty"), 'Resource names are required for all Azure resources', 'Provide a valid name for the resource');
            return builder.build();
        }
        if (name.length < minLength) {
            builder.addError("".concat(resourceType, " name is too short"), "Name '".concat(name, "' has ").concat(name.length, " characters but minimum is ").concat(minLength), "Provide a name with at least ".concat(minLength, " characters"));
        }
        if (name.length > maxLength) {
            builder.addError("".concat(resourceType, " name is too long"), "Name '".concat(name, "' has ").concat(name.length, " characters but maximum is ").concat(maxLength), "Shorten the name to ".concat(maxLength, " characters or less"));
        }
        if (pattern && !pattern.test(name)) {
            builder.addError("".concat(resourceType, " name has invalid format"), "Name '".concat(name, "' does not match the required pattern: ").concat(pattern), 'Check Azure naming conventions for this resource type');
        }
        return builder.build();
    };
    /**
     * Validates an Azure location/region.
     *
     * @param location - Location string to validate
     * @param required - Whether location is required (default: true)
     * @returns Validation result
     */
    ResourceValidator.validateLocation = function (location, required) {
        if (required === void 0) { required = true; }
        var builder = new validation_helpers_1.ValidationResultBuilder();
        if (!location || location.trim() === '') {
            if (required) {
                builder.addError('Location cannot be empty', 'Azure resources must be deployed to a specific region', 'Provide a valid Azure region (e.g., "eastus", "westus2")');
            }
        }
        return builder.build();
    };
    /**
     * Validates resource tags.
     *
     * @param tags - Tags object to validate
     * @param maxTags - Maximum number of tags allowed (default: 50)
     * @returns Validation result
     */
    ResourceValidator.validateTags = function (tags, maxTags) {
        if (maxTags === void 0) { maxTags = 50; }
        var builder = new validation_helpers_1.ValidationResultBuilder();
        if (!tags) {
            return builder.build();
        }
        var tagCount = Object.keys(tags).length;
        if (tagCount > maxTags) {
            builder.addError('Too many tags', "Resource has ".concat(tagCount, " tags but maximum is ").concat(maxTags), "Remove ".concat(tagCount - maxTags, " tags to meet Azure limits"));
        }
        // Validate tag names and values
        for (var _i = 0, _a = Object.entries(tags); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], value = _b[1];
            if (!key || key.trim() === '') {
                builder.addError('Tag name cannot be empty', undefined, 'Remove or rename the empty tag');
            }
            if (key.length > 512) {
                builder.addError("Tag name '".concat(key, "' is too long"), "Tag names must be 512 characters or less (got ".concat(key.length, ")"), 'Shorten the tag name');
            }
            if (value && value.length > 256) {
                builder.addError("Tag value for '".concat(key, "' is too long"), "Tag values must be 256 characters or less (got ".concat(value.length, ")"), 'Shorten the tag value');
            }
        }
        return builder.build();
    };
    /**
     * Validates a CIDR range.
     *
     * @param cidr - CIDR string to validate
     * @param propertyName - Name of the property being validated
     * @returns Validation result
     */
    ResourceValidator.validateCIDR = function (cidr, propertyName) {
        var builder = new validation_helpers_1.ValidationResultBuilder();
        if (!cidr || cidr.trim() === '') {
            builder.addError("".concat(propertyName, " cannot be empty"), 'CIDR ranges are required for network configuration', 'Provide a valid CIDR range (e.g., "10.0.0.0/16")');
            return builder.build();
        }
        if (!(0, validation_helpers_1.isValidCIDR)(cidr)) {
            builder.addError("".concat(propertyName, " has invalid CIDR format"), "Value '".concat(cidr, "' is not valid CIDR notation"), 'Use format: xxx.xxx.xxx.xxx/yy (e.g., "10.0.0.0/16")');
        }
        return builder.build();
    };
    /**
     * Validates an array of CIDR ranges.
     *
     * @param cidrs - Array of CIDR strings to validate
     * @param propertyName - Name of the property being validated
     * @param minCount - Minimum number of CIDRs required (default: 1)
     * @returns Validation result
     */
    ResourceValidator.validateCIDRArray = function (cidrs, propertyName, minCount) {
        var _this = this;
        if (minCount === void 0) { minCount = 1; }
        var builder = new validation_helpers_1.ValidationResultBuilder();
        if (!cidrs || cidrs.length === 0) {
            if (minCount > 0) {
                builder.addError("".concat(propertyName, " cannot be empty"), "At least ".concat(minCount, " CIDR range(s) required"), 'Provide valid CIDR ranges (e.g., ["10.0.0.0/16"])');
            }
            return builder.build();
        }
        if (cidrs.length < minCount) {
            builder.addError("".concat(propertyName, " has too few entries"), "Found ".concat(cidrs.length, " entries but minimum is ").concat(minCount), "Add ".concat(minCount - cidrs.length, " more CIDR range(s)"));
        }
        // Validate each CIDR
        cidrs.forEach(function (cidr, index) {
            var result = _this.validateCIDR(cidr, "".concat(propertyName, "[").concat(index, "]"));
            builder.merge(result);
        });
        return builder.build();
    };
    /**
     * Validates that required properties are present.
     *
     * @param value - Value to check
     * @param propertyName - Name of the property
     * @returns Validation result
     */
    ResourceValidator.validateRequired = function (value, propertyName) {
        var builder = new validation_helpers_1.ValidationResultBuilder();
        if (value === undefined || value === null) {
            builder.addError("".concat(propertyName, " is required"), 'This property must be provided', "Set a value for ".concat(propertyName));
        }
        return builder.build();
    };
    /**
     * Validates a string matches a pattern.
     *
     * @param value - String to validate
     * @param propertyName - Name of the property
     * @param pattern - Regex pattern to match
     * @param patternDescription - Human-readable description of the pattern
     * @returns Validation result
     */
    ResourceValidator.validatePattern = function (value, propertyName, pattern, patternDescription) {
        var builder = new validation_helpers_1.ValidationResultBuilder();
        if (!value) {
            return builder.build();
        }
        if (!pattern.test(value)) {
            builder.addError("".concat(propertyName, " has invalid format"), patternDescription
                ? "Value '".concat(value, "' does not match required format: ").concat(patternDescription)
                : "Value '".concat(value, "' does not match pattern: ").concat(pattern), 'Check the expected format for this property');
        }
        return builder.build();
    };
    /**
     * Validates a numeric value is within a range.
     *
     * @param value - Number to validate
     * @param propertyName - Name of the property
     * @param min - Minimum allowed value (inclusive)
     * @param max - Maximum allowed value (inclusive)
     * @returns Validation result
     */
    ResourceValidator.validateRange = function (value, propertyName, min, max) {
        var builder = new validation_helpers_1.ValidationResultBuilder();
        if (value === undefined) {
            return builder.build();
        }
        if (value < min || value > max) {
            builder.addError("".concat(propertyName, " is out of range"), "Value ".concat(value, " must be between ").concat(min, " and ").concat(max, " (inclusive)"), "Choose a value between ".concat(min, " and ").concat(max));
        }
        return builder.build();
    };
    return ResourceValidator;
}());
exports.ResourceValidator = ResourceValidator;
