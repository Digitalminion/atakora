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
exports.Instance = void 0;
var types_1 = require("../types");
/**
 * Represents an instance identifier in Azure resource naming.
 *
 * @remarks
 * Instances differentiate multiple deployments of the same resource type.
 * Typically numeric (e.g., "01", "02") but can be alphanumeric.
 *
 * @example
 * Numeric instance:
 * ```typescript
 * const instance = new Instance('01');
 * console.log(instance.value);        // "01"
 * console.log(instance.title);        // "01"
 * console.log(instance.resourceName); // "01"
 * ```
 *
 * @example
 * Alphanumeric instance:
 * ```typescript
 * const instance = new Instance('primary');
 * console.log(instance.value);        // "primary"
 * console.log(instance.title);        // "Primary"
 * console.log(instance.resourceName); // "primary"
 * ```
 */
var Instance = /** @class */ (function (_super) {
    __extends(Instance, _super);
    /**
     * Creates a new Instance instance.
     *
     * @param options - Instance identifier or configuration options
     *
     * @throws {Error} If instance value is empty or invalid
     *
     * @example
     * ```typescript
     * const instance1 = new Instance('01');
     * const instance2 = new Instance('primary');
     * const instance3 = new Instance({
     *   value: '1',
     *   resourceName: '01'
     * });
     * ```
     */
    function Instance(options) {
        return _super.call(this, options) || this;
    }
    /**
     * Normalizes instance value to Title Case.
     * For numeric values, returns as-is.
     *
     * @param value - Input value
     * @returns Normalized title
     */
    Instance.prototype.normalizeToTitle = function (value) {
        // If it's purely numeric, return as-is
        if (/^\d+$/.test(value.trim())) {
            return value.trim();
        }
        // Otherwise use standard title casing
        return _super.prototype.normalizeToTitle.call(this, value);
    };
    /**
     * Validates the instance value.
     *
     * @throws {Error} If validation fails
     */
    Instance.prototype.validate = function () {
        _super.prototype.validate.call(this);
        // Instance-specific validation
        if (this.resourceName.length > 10) {
            throw new Error("Instance identifier must not exceed 10 characters (current: ".concat(this.resourceName.length, ")"));
        }
        if (!/^[a-z0-9-]+$/.test(this.resourceName)) {
            throw new Error("Instance identifier can only contain lowercase letters, numbers, and hyphens");
        }
    };
    /**
     * Creates an Instance from a numeric value, ensuring proper zero-padding.
     *
     * @param num - Numeric instance identifier
     * @param padLength - Number of digits to pad to (default: 2)
     * @returns Instance with zero-padded identifier
     *
     * @example
     * ```typescript
     * const instance1 = Instance.fromNumber(1);    // "01"
     * const instance2 = Instance.fromNumber(42);   // "42"
     * const instance3 = Instance.fromNumber(3, 3); // "003"
     * ```
     */
    Instance.fromNumber = function (num, padLength) {
        if (padLength === void 0) { padLength = 2; }
        if (!Number.isInteger(num) || num < 0) {
            throw new Error('Instance number must be a non-negative integer');
        }
        var padded = num.toString().padStart(padLength, '0');
        return new Instance(padded);
    };
    /**
     * Checks if the instance identifier is numeric.
     *
     * @returns True if instance is purely numeric
     */
    Instance.prototype.isNumeric = function () {
        return /^\d+$/.test(this.resourceName);
    };
    /**
     * Gets the numeric value if instance is numeric.
     *
     * @returns Numeric value or undefined if not numeric
     */
    Instance.prototype.toNumber = function () {
        if (this.isNumeric()) {
            return parseInt(this.resourceName, 10);
        }
        return undefined;
    };
    /**
     * Predefined instance identifiers for common use cases.
     */
    Instance.INSTANCE_01 = new Instance('01');
    Instance.INSTANCE_02 = new Instance('02');
    Instance.INSTANCE_03 = new Instance('03');
    Instance.PRIMARY = new Instance('primary');
    Instance.SECONDARY = new Instance('secondary');
    Instance.TERTIARY = new Instance('tertiary');
    return Instance;
}(types_1.NamingComponent));
exports.Instance = Instance;
