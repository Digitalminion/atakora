"use strict";
/**
 * Comprehensive error catalog for Atakora validation errors.
 *
 * Every validation error in the system is defined here with:
 * - Unique error code
 * - Clear title and message
 * - Detailed description
 * - Code example showing correct usage
 * - Actionable suggestion for fixing
 * - Link to documentation
 * - Severity level
 *
 * @module error-catalog
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationError = exports.ErrorCatalog = exports.ErrorCategory = exports.ErrorSeverity = void 0;
exports.createValidationError = createValidationError;
exports.getErrorDefinition = getErrorDefinition;
exports.getErrorsByCategory = getErrorsByCategory;
exports.searchErrors = searchErrors;
exports.getAllErrors = getAllErrors;
/**
 * Error severity levels
 */
var ErrorSeverity;
(function (ErrorSeverity) {
    /** Critical error that blocks synthesis */
    ErrorSeverity["ERROR"] = "error";
    /** Warning that should be addressed but doesn't block */
    ErrorSeverity["WARNING"] = "warning";
    /** Informational message */
    ErrorSeverity["INFO"] = "info";
})(ErrorSeverity || (exports.ErrorSeverity = ErrorSeverity = {}));
/**
 * Error category for organization
 */
var ErrorCategory;
(function (ErrorCategory) {
    ErrorCategory["ARM_STRUCTURE"] = "ARM Structure";
    ErrorCategory["DEPLOYMENT"] = "Deployment";
    ErrorCategory["NETWORKING"] = "Networking";
    ErrorCategory["SECURITY"] = "Security";
    ErrorCategory["TYPE_SAFETY"] = "Type Safety";
    ErrorCategory["SCHEMA"] = "Schema";
})(ErrorCategory || (exports.ErrorCategory = ErrorCategory = {}));
/**
 * Comprehensive error catalog
 *
 * Organized by error code for easy lookup
 */
exports.ErrorCatalog = {
    //
    // ARM Structure Errors (ARM001-ARM099)
    //
    ARM001: {
        code: 'ARM001',
        category: ErrorCategory.ARM_STRUCTURE,
        title: 'Invalid Delegation Structure',
        message: 'Delegation structure requires properties wrapper',
        description: "ARM requires delegation objects to be wrapped in a properties field. The serviceName must be inside properties: { serviceName: \"...\" }. This is an ARM-specific requirement that applies to subnet delegations.",
        example: "{\n  name: 'webapp-delegation',\n  properties: {\n    serviceName: 'Microsoft.Web/serverFarms'\n  }\n}",
        suggestion: 'Wrap your delegation serviceName in a properties object',
        relatedDocs: '/docs/guides/common-validation-errors.md#arm001',
        severity: ErrorSeverity.ERROR,
    },
    ARM002: {
        code: 'ARM002',
        category: ErrorCategory.ARM_STRUCTURE,
        title: 'Subnet Address Prefix Incorrect',
        message: 'Subnet addressPrefix must be inside properties object',
        description: "ARM subnet structure requires addressPrefix to be nested inside the properties field, not at the root level of the subnet object. This is part of ARM's resource property pattern.",
        example: "{\n  name: 'MySubnet',\n  properties: {\n    addressPrefix: '10.0.1.0/24'\n  }\n}",
        suggestion: 'Move addressPrefix into the properties object',
        relatedDocs: '/docs/guides/common-validation-errors.md#arm002',
        severity: ErrorSeverity.ERROR,
    },
    ARM003: {
        code: 'ARM003',
        category: ErrorCategory.ARM_STRUCTURE,
        title: 'Invalid Resource Reference',
        message: 'Resource reference must use ARM expression syntax',
        description: "Resource references in ARM templates must use ARM expression syntax with resourceId() function, not literal strings. Literal strings don't establish proper dependencies and won't resolve correctly during deployment.",
        example: "{\n  networkSecurityGroup: {\n    id: \"[resourceId('Microsoft.Network/networkSecurityGroups', 'MyNSG')]\"\n  }\n}",
        suggestion: "Use resourceId() ARM expression instead of literal string. Pass the construct directly or use ResourceReference.fromId() for existing resources.",
        relatedDocs: '/docs/guides/common-validation-errors.md#arm003',
        severity: ErrorSeverity.ERROR,
    },
    //
    // Deployment Errors (ARM004-ARM099)
    //
    ARM004: {
        code: 'ARM004',
        category: ErrorCategory.DEPLOYMENT,
        title: 'Network Access Lockdown Before Deployment',
        message: 'Network access locked down before deployment prevents provisioning',
        description: "The resource has publicNetworkAccess set to 'Disabled' in the deployment template. Azure Resource Manager needs network access to provision resources. Setting publicNetworkAccess to 'Disabled' before deployment prevents ARM from completing provisioning, causing timeouts or failures.",
        example: "// Deploy with access enabled\nconst storage = new StorageAccount(stack, 'Storage', {\n  publicNetworkAccess: 'Enabled', // Allow during deployment\n});\n\n// Lock down post-deployment using policy or template update",
        suggestion: "Set publicNetworkAccess to 'Enabled' for initial deployment, then lock down using Azure Policy or a second deployment after the resource is fully provisioned.",
        relatedDocs: '/docs/guides/common-validation-errors.md#arm004',
        severity: ErrorSeverity.ERROR,
    },
    //
    // Networking Errors (NET001-NET099)
    //
    NET001: {
        code: 'NET001',
        category: ErrorCategory.NETWORKING,
        title: 'Subnet CIDR Outside VNet Range',
        message: 'Subnet CIDR {subnetCidr} is not within VNet range {vnetCidr}',
        description: "The subnet's addressPrefix (CIDR range) falls outside the VNet's addressSpace. All subnets must be within their parent VNet's address range. Check your CIDR calculations.",
        example: "const vnet = new VirtualNetwork(stack, 'VNet', {\n  addressSpace: ['10.0.0.0/16'],\n});\n\nconst subnet = new Subnet(vnet, 'AppSubnet', {\n  addressPrefix: '10.0.1.0/24', // Within VNet range\n});",
        suggestion: 'Ensure the subnet CIDR is within the VNet address space. For VNet 10.0.0.0/16, subnets must be 10.0.x.x/y where y >= 16.',
        relatedDocs: '/docs/guides/common-validation-errors.md#net001',
        severity: ErrorSeverity.ERROR,
    },
    NET002: {
        code: 'NET002',
        category: ErrorCategory.NETWORKING,
        title: 'Overlapping Subnet Address Spaces',
        message: 'Subnet address spaces overlap: {subnet1} and {subnet2}',
        description: "Two or more subnets have overlapping CIDR ranges. Each subnet must have a unique, non-overlapping address space within the VNet. Overlapping subnets cause deployment failures.",
        example: "const subnet1 = new Subnet(vnet, 'Subnet1', {\n  addressPrefix: '10.0.1.0/24',\n});\n\nconst subnet2 = new Subnet(vnet, 'Subnet2', {\n  addressPrefix: '10.0.2.0/24', // No overlap\n});",
        suggestion: 'Assign non-overlapping CIDR ranges to each subnet. Use a subnet planning tool or calculator to avoid overlaps.',
        relatedDocs: '/docs/guides/common-validation-errors.md#net002',
        severity: ErrorSeverity.ERROR,
    },
    //
    // Security Errors (SEC001-SEC099)
    //
    SEC001: {
        code: 'SEC001',
        category: ErrorCategory.SECURITY,
        title: 'NSG Rule Priority Conflict',
        message: 'NSG rule priority conflict: rules {rule1} and {rule2} both have priority {priority}',
        description: "Two or more NSG rules have the same priority value. Each security rule in a Network Security Group must have a unique priority between 100 and 4096. Lower numbers have higher priority.",
        example: "const nsg = new NetworkSecurityGroup(stack, 'NSG', {\n  securityRules: [\n    { name: 'AllowHTTPS', priority: 100, ... },\n    { name: 'AllowHTTP', priority: 110, ... }, // Unique priority\n  ],\n});",
        suggestion: 'Assign unique priorities to each NSG rule. Leave gaps (10-100) between priorities to allow for future rules.',
        relatedDocs: '/docs/guides/common-validation-errors.md#sec001',
        severity: ErrorSeverity.ERROR,
    },
    //
    // Type Safety Errors (TYPE001-TYPE099)
    //
    TYPE001: {
        code: 'TYPE001',
        category: ErrorCategory.TYPE_SAFETY,
        title: 'Invalid Property Type',
        message: 'Property {property} has invalid type {actual}, expected {expected}',
        description: "A property value doesn't match the expected type. This is caught at compile-time by TypeScript but reported here for runtime scenarios.",
        example: "const vnet = new VirtualNetwork(stack, 'VNet', {\n  addressSpace: ['10.0.0.0/16'], // Array of strings\n});",
        suggestion: 'Check the property type definition and ensure your value matches. Use TypeScript for compile-time validation.',
        relatedDocs: '/docs/guides/validation-architecture.md#layer-1-compile-time-type-safety',
        severity: ErrorSeverity.ERROR,
    },
    //
    // Schema Errors (SCHEMA001-SCHEMA099)
    //
    SCHEMA001: {
        code: 'SCHEMA001',
        category: ErrorCategory.SCHEMA,
        title: 'Schema Validation Failed',
        message: 'Resource {resource} failed schema validation: {details}',
        description: "The generated ARM resource doesn't match Azure's schema requirements. This could be due to missing required fields, invalid values, or incorrect structure.",
        example: "// Ensure all required fields are provided and match schema",
        suggestion: 'Check the Azure ARM schema documentation for the resource type and API version. Ensure all required properties are set.',
        relatedDocs: '/docs/guides/validation-architecture.md#layer-5-schema-compliance-synthesis-time',
        severity: ErrorSeverity.ERROR,
    },
};
/**
 * Validation error class with error catalog integration
 */
var ValidationError = /** @class */ (function (_super) {
    __extends(ValidationError, _super);
    function ValidationError(errorCode, context) {
        var _this = this;
        var errorDef = exports.ErrorCatalog[errorCode];
        var message = interpolate(errorDef.message, context);
        _this = _super.call(this, message) || this;
        _this.name = 'ValidationError';
        _this.code = errorDef.code;
        _this.category = errorDef.category;
        _this.title = errorDef.title;
        _this.message = message;
        _this.description = errorDef.description;
        _this.example = errorDef.example;
        _this.suggestion = interpolate(errorDef.suggestion, context);
        _this.relatedDocs = errorDef.relatedDocs;
        _this.severity = errorDef.severity;
        _this.context = context;
        // Ensure proper prototype chain for instanceof checks
        Object.setPrototypeOf(_this, ValidationError.prototype);
        return _this;
    }
    /**
     * Format error for display
     */
    ValidationError.prototype.format = function () {
        var lines = ["ValidationError [".concat(this.code, "]: ").concat(this.title), "  ".concat(this.message)];
        if (this.context) {
            lines.push('');
            lines.push('Context:');
            Object.entries(this.context).forEach(function (_a) {
                var key = _a[0], value = _a[1];
                lines.push("  ".concat(key, ": ").concat(value));
            });
        }
        lines.push('');
        lines.push('Suggestion:');
        lines.push("  ".concat(this.suggestion));
        lines.push('');
        lines.push('Documentation:');
        lines.push("  ".concat(this.relatedDocs));
        if (this.example) {
            lines.push('');
            lines.push('Example:');
            this.example.split('\n').forEach(function (line) {
                lines.push("  ".concat(line));
            });
        }
        return lines.join('\n');
    };
    /**
     * Get error as JSON
     */
    ValidationError.prototype.toJSON = function () {
        return {
            code: this.code,
            category: this.category,
            title: this.title,
            message: this.message,
            description: this.description,
            suggestion: this.suggestion,
            relatedDocs: this.relatedDocs,
            severity: this.severity,
            context: this.context,
            example: this.example,
        };
    };
    return ValidationError;
}(Error));
exports.ValidationError = ValidationError;
/**
 * Interpolate placeholders in strings with context values
 *
 * Example: interpolate("Value {x} is invalid", { x: "foo" }) -> "Value foo is invalid"
 */
function interpolate(template, context) {
    if (!context)
        return template;
    return template.replace(/\{(\w+)\}/g, function (match, key) {
        return context[key] !== undefined ? context[key] : match;
    });
}
/**
 * Type-safe error creation helper
 *
 * @example
 * throw createValidationError('ARM001');
 * throw createValidationError('NET001', { subnetCidr: '192.168.1.0/24', vnetCidr: '10.0.0.0/16' });
 */
function createValidationError(code, context) {
    return new ValidationError(code, context);
}
/**
 * Get error definition without throwing
 */
function getErrorDefinition(code) {
    return exports.ErrorCatalog[code];
}
/**
 * Get all errors in a category
 */
function getErrorsByCategory(category) {
    return Object.values(exports.ErrorCatalog).filter(function (error) { return error.category === category; });
}
/**
 * Search errors by keyword
 */
function searchErrors(keyword) {
    var lowerKeyword = keyword.toLowerCase();
    return Object.values(exports.ErrorCatalog).filter(function (error) {
        return (error.code.toLowerCase().includes(lowerKeyword) ||
            error.title.toLowerCase().includes(lowerKeyword) ||
            error.description.toLowerCase().includes(lowerKeyword) ||
            error.message.toLowerCase().includes(lowerKeyword));
    });
}
/**
 * Export error definitions for documentation generation
 */
function getAllErrors() {
    return Object.values(exports.ErrorCatalog);
}
