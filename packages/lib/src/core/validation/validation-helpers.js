"use strict";
/**
 * Validation framework helper types and utilities.
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
exports.ValidationResultBuilder = exports.ValidationError = exports.ValidationSeverity = void 0;
exports.isValidCIDR = isValidCIDR;
exports.parseCIDR = parseCIDR;
exports.isWithinCIDR = isWithinCIDR;
exports.cidrsOverlap = cidrsOverlap;
exports.isValidPortRange = isValidPortRange;
/**
 * Severity level for validation issues.
 */
var ValidationSeverity;
(function (ValidationSeverity) {
    /** Error that will prevent deployment */
    ValidationSeverity["ERROR"] = "error";
    /** Warning that may cause issues but won't prevent deployment */
    ValidationSeverity["WARNING"] = "warning";
    /** Informational message about best practices */
    ValidationSeverity["INFO"] = "info";
})(ValidationSeverity || (exports.ValidationSeverity = ValidationSeverity = {}));
/**
 * Custom error class for validation failures.
 *
 * @remarks
 * Thrown when validation fails with actionable error messages.
 * Includes detailed context to help developers fix the issue.
 */
var ValidationError = /** @class */ (function (_super) {
    __extends(ValidationError, _super);
    /**
     * Creates a new ValidationError.
     *
     * @param message - Short description of the problem
     * @param details - Detailed explanation of what went wrong
     * @param suggestion - Suggested fix or remediation steps
     * @param propertyPath - Property path where the error occurred
     */
    function ValidationError(message, details, suggestion, propertyPath) {
        var _this = _super.call(this, message) || this;
        _this.name = 'ValidationError';
        _this.details = details;
        _this.suggestion = suggestion;
        _this.propertyPath = propertyPath;
        // Maintain proper stack trace in V8 environments
        if (Error.captureStackTrace) {
            Error.captureStackTrace(_this, ValidationError);
        }
        return _this;
    }
    /**
     * Formats the error message with all available context.
     */
    ValidationError.prototype.toString = function () {
        var result = "".concat(this.name, ": ").concat(this.message);
        if (this.propertyPath) {
            result += "\n  Property: ".concat(this.propertyPath);
        }
        if (this.details) {
            result += "\n  Details: ".concat(this.details);
        }
        if (this.suggestion) {
            result += "\n  Suggestion: ".concat(this.suggestion);
        }
        return result;
    };
    return ValidationError;
}(Error));
exports.ValidationError = ValidationError;
/**
 * Builder for creating ValidationResult objects.
 */
var ValidationResultBuilder = /** @class */ (function () {
    function ValidationResultBuilder() {
        this.issues = [];
    }
    /**
     * Adds an error to the validation result.
     *
     * @param message - Short description of the problem
     * @param details - Detailed explanation
     * @param suggestion - Suggested fix
     * @param propertyPath - Property path where the error occurred
     */
    ValidationResultBuilder.prototype.addError = function (message, details, suggestion, propertyPath) {
        this.issues.push({
            severity: ValidationSeverity.ERROR,
            message: message,
            details: details,
            suggestion: suggestion,
            propertyPath: propertyPath,
        });
        return this;
    };
    /**
     * Adds a warning to the validation result.
     *
     * @param message - Short description of the problem
     * @param details - Detailed explanation
     * @param suggestion - Suggested fix
     * @param propertyPath - Property path where the warning occurred
     */
    ValidationResultBuilder.prototype.addWarning = function (message, details, suggestion, propertyPath) {
        this.issues.push({
            severity: ValidationSeverity.WARNING,
            message: message,
            details: details,
            suggestion: suggestion,
            propertyPath: propertyPath,
        });
        return this;
    };
    /**
     * Adds an info message to the validation result.
     *
     * @param message - Short description
     * @param details - Detailed explanation
     * @param suggestion - Suggested improvement
     * @param propertyPath - Property path where the info applies
     */
    ValidationResultBuilder.prototype.addInfo = function (message, details, suggestion, propertyPath) {
        this.issues.push({
            severity: ValidationSeverity.INFO,
            message: message,
            details: details,
            suggestion: suggestion,
            propertyPath: propertyPath,
        });
        return this;
    };
    /**
     * Merges another validation result into this builder.
     *
     * @param result - Validation result to merge
     */
    ValidationResultBuilder.prototype.merge = function (result) {
        var _a;
        (_a = this.issues).push.apply(_a, result.issues);
        return this;
    };
    /**
     * Builds the final ValidationResult.
     */
    ValidationResultBuilder.prototype.build = function () {
        var errorCount = this.issues.filter(function (i) { return i.severity === ValidationSeverity.ERROR; }).length;
        var warningCount = this.issues.filter(function (i) { return i.severity === ValidationSeverity.WARNING; }).length;
        var infoCount = this.issues.filter(function (i) { return i.severity === ValidationSeverity.INFO; }).length;
        return {
            isValid: errorCount === 0,
            issues: __spreadArray([], this.issues, true),
            errorCount: errorCount,
            warningCount: warningCount,
            infoCount: infoCount,
        };
    };
    return ValidationResultBuilder;
}());
exports.ValidationResultBuilder = ValidationResultBuilder;
/**
 * Validates CIDR notation format.
 *
 * @param cidr - CIDR string to validate
 * @returns True if valid CIDR notation
 */
function isValidCIDR(cidr) {
    var cidrPattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/;
    var match = cidrPattern.exec(cidr);
    if (!match) {
        return false;
    }
    // Validate each octet is 0-255
    for (var i = 1; i <= 4; i++) {
        var octet = parseInt(match[i], 10);
        if (octet < 0 || octet > 255) {
            return false;
        }
    }
    // Validate prefix length is 0-32
    var prefixLength = parseInt(match[5], 10);
    if (prefixLength < 0 || prefixLength > 32) {
        return false;
    }
    return true;
}
/**
 * Parses a CIDR range into its components.
 *
 * @param cidr - CIDR string to parse
 * @returns IP address and prefix length, or null if invalid
 */
function parseCIDR(cidr) {
    if (!isValidCIDR(cidr)) {
        return null;
    }
    var _a = cidr.split('/'), ip = _a[0], prefixStr = _a[1];
    return {
        ip: ip,
        prefixLength: parseInt(prefixStr, 10),
    };
}
/**
 * Converts an IP address to a 32-bit integer.
 *
 * @param ip - IP address string (e.g., "10.0.0.0")
 * @returns 32-bit integer representation
 */
function ipToInt(ip) {
    var parts = ip.split('.').map(function (p) { return parseInt(p, 10); });
    return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
}
/**
 * Checks if one CIDR range is within another.
 *
 * @param childCidr - The CIDR range to check
 * @param parentCidr - The CIDR range that should contain the child
 * @returns True if childCidr is within parentCidr
 */
function isWithinCIDR(childCidr, parentCidr) {
    var child = parseCIDR(childCidr);
    var parent = parseCIDR(parentCidr);
    if (!child || !parent) {
        return false;
    }
    // Calculate network addresses
    var childInt = ipToInt(child.ip);
    var parentInt = ipToInt(parent.ip);
    // Calculate network masks
    var childMask = ~0 << (32 - child.prefixLength);
    var parentMask = ~0 << (32 - parent.prefixLength);
    // Calculate network addresses by applying masks
    var childNetwork = childInt & childMask;
    var parentNetwork = parentInt & parentMask;
    // Child prefix length must be >= parent prefix length
    if (child.prefixLength < parent.prefixLength) {
        return false;
    }
    // Check if child network address matches parent network address when masked
    return (childNetwork & parentMask) === parentNetwork;
}
/**
 * Checks if two CIDR ranges overlap.
 *
 * @param cidr1 - First CIDR range
 * @param cidr2 - Second CIDR range
 * @returns True if the ranges overlap
 */
function cidrsOverlap(cidr1, cidr2) {
    var range1 = parseCIDR(cidr1);
    var range2 = parseCIDR(cidr2);
    if (!range1 || !range2) {
        return false;
    }
    var ip1 = ipToInt(range1.ip);
    var ip2 = ipToInt(range2.ip);
    var mask1 = ~0 << (32 - range1.prefixLength);
    var mask2 = ~0 << (32 - range2.prefixLength);
    var network1 = ip1 & mask1;
    var network2 = ip2 & mask2;
    // Calculate broadcast addresses
    var broadcast1 = network1 | ~mask1;
    var broadcast2 = network2 | ~mask2;
    // Check if ranges overlap
    return network1 <= broadcast2 && network2 <= broadcast1;
}
/**
 * Validates port range format and values.
 *
 * @param portRange - Port range string (e.g., "80", "443-443", "1000-2000", "*")
 * @returns True if valid port range
 */
function isValidPortRange(portRange) {
    // Wildcard is allowed
    if (portRange === '*') {
        return true;
    }
    // Single port or port range
    var parts = portRange.split('-');
    if (parts.length === 1) {
        // Single port
        var port = parseInt(parts[0], 10);
        return !isNaN(port) && port >= 0 && port <= 65535;
    }
    else if (parts.length === 2) {
        // Port range
        var start = parseInt(parts[0], 10);
        var end = parseInt(parts[1], 10);
        return (!isNaN(start) &&
            !isNaN(end) &&
            start >= 0 &&
            start <= 65535 &&
            end >= 0 &&
            end <= 65535 &&
            start <= end);
    }
    return false;
}
