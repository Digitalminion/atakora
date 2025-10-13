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
exports.Organization = void 0;
var types_1 = require("../types");
/**
 * Represents an organization name in Azure resource naming.
 *
 * @remarks
 * Organizations are typically business units or departments that own Azure resources.
 * This class normalizes organization names for consistent use across resource names.
 *
 * @example
 * Basic usage:
 * ```typescript
 * const org = new Organization('Digital Minion');
 * console.log(org.value);        // "Digital Minion"
 * console.log(org.title);        // "Digital Minion"
 * console.log(org.resourceName); // "digital-minion"
 * ```
 *
 * @example
 * With custom values:
 * ```typescript
 * const org = new Organization({
 *   value: 'Digital Minion Division',
 *   resourceName: 'dp',
 *   title: 'Digital Minion'
 * });
 * console.log(org.resourceName); // "dp"
 * ```
 */
var Organization = /** @class */ (function (_super) {
    __extends(Organization, _super);
    /**
     * Creates a new Organization instance.
     *
     * @param options - Organization name or configuration options
     *
     * @throws {Error} If organization value is empty or invalid
     *
     * @example
     * ```typescript
     * // Simple string
     * const org1 = new Organization('Digital Minion');
     *
     * // With custom resource name
     * const org2 = new Organization({
     *   value: 'Digital Minion',
     *   resourceName: 'dp'
     * });
     * ```
     */
    function Organization(options) {
        return _super.call(this, options) || this;
    }
    /**
     * Validates the organization value.
     *
     * @throws {Error} If validation fails
     */
    Organization.prototype.validate = function () {
        _super.prototype.validate.call(this);
        // Organization-specific validation
        if (this.resourceName.length > 30) {
            throw new Error("Organization resource name must not exceed 30 characters (current: ".concat(this.resourceName.length, ")"));
        }
        if (!/^[a-z0-9-]+$/.test(this.resourceName)) {
            throw new Error("Organization resource name can only contain lowercase letters, numbers, and hyphens");
        }
        if (this.resourceName.startsWith('-') || this.resourceName.endsWith('-')) {
            throw new Error("Organization resource name cannot start or end with a hyphen");
        }
    };
    /**
     * Creates an Organization from a known abbreviation or full name.
     *
     * @param value - Organization name or abbreviation
     * @returns Organization instance
     *
     * @example
     * ```typescript
     * const org = Organization.fromValue('Digital Minion');
     * // Uses abbreviation "dp" for resource name
     * ```
     */
    Organization.fromValue = function (value) {
        var normalized = value.toLowerCase().trim();
        var abbreviation = Organization.ABBREVIATIONS[normalized];
        if (abbreviation) {
            return new Organization({
                value: value,
                resourceName: abbreviation,
            });
        }
        return new Organization(value);
    };
    /**
     * Common organization abbreviations for well-known organizations.
     */
    Organization.ABBREVIATIONS = {
        'Digital Minion': 'dp',
        'digital-minion': 'dp',
        engineering: 'eng',
        marketing: 'mkt',
        'information technology': 'it',
        finance: 'fin',
        'human resources': 'hr',
        operations: 'ops',
        sales: 'sales',
    };
    return Organization;
}(types_1.NamingComponent));
exports.Organization = Organization;
