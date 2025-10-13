"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NamingComponent = void 0;
/**
 * Abstract base class for naming component value objects.
 * Provides common normalization and validation logic.
 *
 * @abstract
 */
var NamingComponent = /** @class */ (function () {
    /**
     * Creates a new naming component.
     *
     * @param options - Configuration options or simple string value
     */
    function NamingComponent(options) {
        var _a, _b;
        if (typeof options === 'string') {
            this.value = options;
            this.resourceName = this.normalizeToResourceName(options);
            this.title = this.normalizeToTitle(options);
        }
        else {
            this.value = options.value;
            this.resourceName = (_a = options.resourceName) !== null && _a !== void 0 ? _a : this.normalizeToResourceName(options.value);
            this.title = (_b = options.title) !== null && _b !== void 0 ? _b : this.normalizeToTitle(options.value);
        }
        this.validate();
    }
    /**
     * Validates the component value.
     * Subclasses can override to provide specific validation.
     *
     * @throws {Error} If validation fails
     */
    NamingComponent.prototype.validate = function () {
        if (!this.value || this.value.trim().length === 0) {
            throw new Error("".concat(this.constructor.name, " value cannot be empty"));
        }
        if (!this.resourceName || this.resourceName.trim().length === 0) {
            throw new Error("".concat(this.constructor.name, " resource name cannot be empty"));
        }
    };
    /**
     * Normalizes a value to kebab-case for resource names.
     *
     * @param value - Input value
     * @returns Kebab-cased string
     *
     * @example
     * ```typescript
     * normalizeToResourceName("Digital Minion") // "digital-minion"
     * normalizeToResourceName("authr") // "authr"
     * normalizeToResourceName("East US 2") // "east-us-2"
     * ```
     */
    NamingComponent.prototype.normalizeToResourceName = function (value) {
        return value
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '-') // Replace whitespace with hyphens
            .replace(/[^a-z0-9-]/g, '') // Remove non-alphanumeric except hyphens
            .replace(/-+/g, '-') // Collapse multiple hyphens
            .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    };
    /**
     * Normalizes a value to Title Case for display.
     *
     * @param value - Input value
     * @returns Title-cased string
     *
     * @example
     * ```typescript
     * normalizeToTitle("Digital Minion") // "Digital Minion"
     * normalizeToTitle("authr") // "Colorai"
     * normalizeToTitle("east-us-2") // "East-Us-2"
     * ```
     */
    NamingComponent.prototype.normalizeToTitle = function (value) {
        return value
            .trim()
            .split(/\s+/)
            .map(function (word) { return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(); })
            .join(' ');
    };
    /**
     * Returns the resource name representation when coerced to string.
     */
    NamingComponent.prototype.toString = function () {
        return this.resourceName;
    };
    /**
     * Returns a JSON representation of the component.
     */
    NamingComponent.prototype.toJSON = function () {
        return {
            value: this.value,
            title: this.title,
            resourceName: this.resourceName,
        };
    };
    return NamingComponent;
}());
exports.NamingComponent = NamingComponent;
