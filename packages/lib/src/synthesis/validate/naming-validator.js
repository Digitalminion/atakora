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
exports.NamingValidator = void 0;
var validator_registry_1 = require("./validator-registry");
/**
 * Validates Azure resource naming conventions
 */
var NamingValidator = /** @class */ (function (_super) {
    __extends(NamingValidator, _super);
    function NamingValidator() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.name = 'NamingValidator';
        _this.namingRules = {
            'Microsoft.Storage/storageAccounts': {
                maxLength: 24,
                minLength: 3,
                allowedPattern: /^[a-z0-9]+$/,
                allowedChars: 'lowercase letters and numbers only',
                examples: ['mystorageaccount', 'storage123'],
            },
            'Microsoft.Resources/resourceGroups': {
                maxLength: 90,
                minLength: 1,
                allowedPattern: /^[\w\-().]+$/,
                allowedChars: 'alphanumerics, hyphens, periods, parentheses, underscores',
                examples: ['my-resource-group', 'rg_prod'],
            },
            'Microsoft.Network/virtualNetworks': {
                maxLength: 64,
                minLength: 1,
                allowedPattern: /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9_]$/,
                allowedChars: 'alphanumerics, hyphens, periods, underscores',
                examples: ['my-vnet', 'vnet-prod-001'],
            },
            'Microsoft.Compute/virtualMachines': {
                maxLength: 64,
                minLength: 1,
                allowedPattern: /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/,
                allowedChars: 'alphanumerics and hyphens',
                examples: ['my-vm', 'vm-prod-001'],
            },
            'Microsoft.KeyVault/vaults': {
                maxLength: 24,
                minLength: 3,
                allowedPattern: /^[a-zA-Z][a-zA-Z0-9-]*[a-zA-Z0-9]$/,
                allowedChars: 'alphanumerics and hyphens, must start with letter',
                examples: ['my-keyvault', 'kv-prod-001'],
            },
        };
        return _this;
    }
    NamingValidator.prototype.validate = function (template, stackName) {
        var _a;
        var errors = [];
        var warnings = [];
        for (var _i = 0, _b = template.resources; _i < _b.length; _i++) {
            var resource = _b[_i];
            var rule = this.namingRules[resource.type];
            if (!rule) {
                // No specific rule for this resource type
                // Apply generic validation
                this.validateGenericName(resource.name, resource.type, errors, warnings);
                continue;
            }
            // Validate length
            if (resource.name.length > rule.maxLength) {
                errors.push(this.createError("Resource name '".concat(resource.name, "' exceeds maximum length of ").concat(rule.maxLength, " characters"), "resources/".concat(resource.name), 'NAME_TOO_LONG', "Shorten the name to ".concat(rule.maxLength, " characters or fewer. Examples: ").concat((_a = rule.examples) === null || _a === void 0 ? void 0 : _a.join(', '))));
            }
            if (rule.minLength && resource.name.length < rule.minLength) {
                errors.push(this.createError("Resource name '".concat(resource.name, "' is shorter than minimum length of ").concat(rule.minLength, " characters"), "resources/".concat(resource.name), 'NAME_TOO_SHORT'));
            }
            // Validate pattern
            if (rule.allowedPattern && !rule.allowedPattern.test(resource.name)) {
                errors.push(this.createError("Resource name '".concat(resource.name, "' contains invalid characters. ").concat(rule.allowedChars ? "Allowed: ".concat(rule.allowedChars) : ''), "resources/".concat(resource.name), 'INVALID_NAME_FORMAT', rule.examples ? "Try names like: ".concat(rule.examples.join(', ')) : undefined));
            }
            // Check for common issues
            if (resource.name.startsWith('-') || resource.name.endsWith('-')) {
                warnings.push(this.createWarning("Resource name '".concat(resource.name, "' starts or ends with a hyphen, which may not be allowed"), "resources/".concat(resource.name), 'NAME_HYPHEN_EDGE'));
            }
            if (resource.name.includes('__')) {
                warnings.push(this.createWarning("Resource name '".concat(resource.name, "' contains consecutive underscores"), "resources/".concat(resource.name), 'NAME_DOUBLE_UNDERSCORE'));
            }
            if (resource.name.includes('--')) {
                warnings.push(this.createWarning("Resource name '".concat(resource.name, "' contains consecutive hyphens"), "resources/".concat(resource.name), 'NAME_DOUBLE_HYPHEN'));
            }
        }
        return {
            valid: errors.length === 0,
            errors: errors,
            warnings: warnings,
        };
    };
    /**
     * Validate generic resource name (when no specific rule exists)
     */
    NamingValidator.prototype.validateGenericName = function (name, resourceType, errors, warnings) {
        // Check if this is a child resource (contains /)
        var isChildResource = name.includes('/');
        if (isChildResource) {
            // Child resources use parent/child format - validate each part separately
            var parts = name.split('/');
            // Validate parent name doesn't exceed reasonable length
            if (parts[0].length > 64) {
                warnings.push(this.createWarning("Parent resource name '".concat(parts[0], "' in '").concat(name, "' exceeds recommended maximum length of 64 characters"), "resources/".concat(name), 'NAME_TOO_LONG', 'Consider shortening the parent resource name'));
            }
            // Validate child name doesn't exceed reasonable length
            if (parts[1] && parts[1].length > 64) {
                warnings.push(this.createWarning("Child resource name '".concat(parts[1], "' in '").concat(name, "' exceeds recommended maximum length of 64 characters"), "resources/".concat(name), 'NAME_TOO_LONG', 'Consider shortening the child resource name'));
            }
            // Validate each part for special characters (excluding the / separator)
            for (var i = 0; i < parts.length; i++) {
                if (!/^[a-zA-Z0-9._-]+$/.test(parts[i])) {
                    warnings.push(this.createWarning("Resource name part '".concat(parts[i], "' contains special characters that may not be allowed for type ").concat(resourceType), "resources/".concat(name), 'NAME_SPECIAL_CHARS'));
                }
            }
            return;
        }
        // Standard resource validation (not a child resource)
        // Generic maximum length - only warn for long names
        if (name.length > 64) {
            warnings.push(this.createWarning("Resource name '".concat(name, "' exceeds recommended maximum length of 64 characters"), "resources/".concat(name), 'NAME_TOO_LONG', 'Consider shortening the name to 64 characters or fewer'));
        }
        // Check for empty name
        if (name.length === 0) {
            errors.push(this.createError('Resource name cannot be empty', "resources/".concat(name), 'NAME_EMPTY'));
        }
        // Check for special characters
        if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
            warnings.push(this.createWarning("Resource name '".concat(name, "' contains special characters that may not be allowed for type ").concat(resourceType), "resources/".concat(name), 'NAME_SPECIAL_CHARS'));
        }
    };
    return NamingValidator;
}(validator_registry_1.BaseValidator));
exports.NamingValidator = NamingValidator;
