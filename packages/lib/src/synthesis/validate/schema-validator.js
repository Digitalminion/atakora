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
exports.SchemaValidator = void 0;
var ajv_1 = require("ajv");
var ajv_formats_1 = require("ajv-formats");
var validator_registry_1 = require("./validator-registry");
/**
 * ARM template JSON schema
 */
var ARM_TEMPLATE_SCHEMA = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    required: ['$schema', 'contentVersion', 'resources'],
    properties: {
        $schema: {
            type: 'string',
            format: 'uri',
        },
        contentVersion: {
            type: 'string',
            pattern: '^[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+$',
        },
        parameters: {
            type: 'object',
            additionalProperties: {
                type: 'object',
                required: ['type'],
                properties: {
                    type: {
                        enum: ['string', 'int', 'bool', 'object', 'array', 'secureString', 'secureObject'],
                    },
                    defaultValue: {},
                    allowedValues: {
                        type: 'array',
                    },
                    minValue: {
                        type: 'number',
                    },
                    maxValue: {
                        type: 'number',
                    },
                    minLength: {
                        type: 'number',
                    },
                    maxLength: {
                        type: 'number',
                    },
                    metadata: {
                        type: 'object',
                    },
                },
            },
        },
        variables: {
            type: 'object',
        },
        resources: {
            type: 'array',
            items: {
                type: 'object',
                required: ['type', 'apiVersion', 'name'],
                properties: {
                    type: {
                        type: 'string',
                    },
                    apiVersion: {
                        type: 'string',
                    },
                    name: {
                        type: 'string',
                    },
                    location: {
                        type: 'string',
                    },
                    tags: {
                        type: 'object',
                        additionalProperties: {
                            type: 'string',
                        },
                    },
                    dependsOn: {
                        type: 'array',
                        items: {
                            type: 'string',
                        },
                    },
                    properties: {
                        type: 'object',
                    },
                    sku: {
                        type: 'object',
                    },
                    kind: {
                        type: 'string',
                    },
                    identity: {
                        type: 'object',
                    },
                },
            },
        },
        outputs: {
            type: 'object',
            additionalProperties: {
                type: 'object',
                required: ['type', 'value'],
                properties: {
                    type: {
                        enum: ['string', 'int', 'bool', 'object', 'array'],
                    },
                    value: {},
                    metadata: {
                        type: 'object',
                    },
                },
            },
        },
    },
};
/**
 * Validates ARM templates against JSON schemas
 */
var SchemaValidator = /** @class */ (function (_super) {
    __extends(SchemaValidator, _super);
    function SchemaValidator() {
        var _this = _super.call(this) || this;
        _this.name = 'SchemaValidator';
        _this.ajv = new ajv_1.default({
            allErrors: true,
            verbose: true,
            strict: false,
        });
        // Working around ajv-formats compatibility issue
        // Ensure opts and opts.code exist before calling addFormats
        if (!_this.ajv.opts) {
            // @ts-ignore - opts may not be defined in type definitions
            _this.ajv.opts = { code: {} };
        }
        else if (!_this.ajv.opts.code) {
            // @ts-ignore - opts.code may not be defined in type definitions
            _this.ajv.opts.code = {};
        }
        // Disable format limit keywords to avoid additional compatibility issues
        // We only need basic format validation for ARM templates
        (0, ajv_formats_1.default)(_this.ajv, { keywords: false });
        return _this;
    }
    SchemaValidator.prototype.validate = function (template, stackName) {
        var errors = [];
        var warnings = [];
        // Validate against ARM template schema
        var validate = this.ajv.compile(ARM_TEMPLATE_SCHEMA);
        var valid = validate(template);
        if (!valid && validate.errors) {
            for (var _i = 0, _a = validate.errors; _i < _a.length; _i++) {
                var error = _a[_i];
                errors.push(this.createError(this.formatAjvError(error), this.getErrorPath(error, stackName), 'SCHEMA_VALIDATION_ERROR', this.getErrorSuggestion(error)));
            }
        }
        // Additional custom validations
        this.validateCustomRules(template, stackName, errors, warnings);
        return {
            valid: errors.length === 0,
            errors: errors,
            warnings: warnings,
        };
    };
    /**
     * Format Ajv error message
     */
    SchemaValidator.prototype.formatAjvError = function (error) {
        var _a;
        var path = error.instancePath || 'template';
        var message = error.message || 'Validation error';
        switch (error.keyword) {
            case 'required':
                return "Missing required property: ".concat(error.params.missingProperty);
            case 'type':
                return "Expected type ".concat(error.params.type, " at ").concat(path);
            case 'enum':
                return "Value must be one of: ".concat((_a = error.params.allowedValues) === null || _a === void 0 ? void 0 : _a.join(', '));
            case 'pattern':
                return "Value at ".concat(path, " does not match required pattern");
            case 'format':
                return "Invalid format at ".concat(path, ": expected ").concat(error.params.format);
            default:
                return "".concat(path, ": ").concat(message);
        }
    };
    /**
     * Get error path
     */
    SchemaValidator.prototype.getErrorPath = function (error, stackName) {
        if (!error.instancePath) {
            return stackName;
        }
        return "".concat(stackName).concat(error.instancePath);
    };
    /**
     * Get error suggestion
     */
    SchemaValidator.prototype.getErrorSuggestion = function (error) {
        var _a;
        switch (error.keyword) {
            case 'required':
                return "Add the required property '".concat(error.params.missingProperty, "' to the object");
            case 'enum':
                return "Use one of the allowed values: ".concat((_a = error.params.allowedValues) === null || _a === void 0 ? void 0 : _a.join(', '));
            case 'pattern':
                return 'Ensure the value matches the expected pattern';
            default:
                return undefined;
        }
    };
    /**
     * Custom validation rules
     */
    SchemaValidator.prototype.validateCustomRules = function (template, stackName, errors, warnings) {
        // Check for empty resources array
        if (template.resources && template.resources.length === 0) {
            warnings.push(this.createWarning('Template contains no resources', stackName, 'EMPTY_TEMPLATE'));
        }
        // Check for duplicate resource names
        var resourceNames = new Set();
        if (template.resources) {
            for (var _i = 0, _a = template.resources; _i < _a.length; _i++) {
                var resource = _a[_i];
                if (resourceNames.has(resource.name)) {
                    errors.push(this.createError("Duplicate resource name: ".concat(resource.name), "".concat(stackName, "/resources/").concat(resource.name), 'DUPLICATE_RESOURCE_NAME', 'Each resource must have a unique name within the template'));
                }
                resourceNames.add(resource.name);
            }
        }
        // Check $schema format
        if (template.$schema && !template.$schema.startsWith('https://')) {
            warnings.push(this.createWarning('Template $schema should use HTTPS', "".concat(stackName, "/$schema"), 'SCHEMA_HTTP'));
        }
        // Validate contentVersion format
        if (!/^\d+\.\d+\.\d+\.\d+$/.test(template.contentVersion)) {
            warnings.push(this.createWarning("Content version '".concat(template.contentVersion, "' does not follow recommended format (e.g., 1.0.0.0)"), "".concat(stackName, "/contentVersion"), 'INVALID_CONTENT_VERSION'));
        }
    };
    return SchemaValidator;
}(validator_registry_1.BaseValidator));
exports.SchemaValidator = SchemaValidator;
