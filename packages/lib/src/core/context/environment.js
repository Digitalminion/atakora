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
exports.Environment = void 0;
var types_1 = require("../types");
/**
 * Represents an environment in Azure resource naming.
 *
 * @remarks
 * Environments represent deployment stages such as development, staging, and production.
 * This class normalizes environment names and provides standard abbreviations.
 *
 * @example
 * Basic usage:
 * ```typescript
 * const env = new Environment('production');
 * console.log(env.value);        // "production"
 * console.log(env.title);        // "Production"
 * console.log(env.resourceName); // "production"
 * console.log(env.abbreviation); // "prod"
 * ```
 *
 * @example
 * Using abbreviations:
 * ```typescript
 * const env = Environment.fromValue('development');
 * console.log(env.abbreviation); // "dev"
 * ```
 */
var Environment = /** @class */ (function (_super) {
    __extends(Environment, _super);
    /**
     * Creates a new Environment instance.
     *
     * @param options - Environment name or configuration options
     *
     * @throws {Error} If environment value is empty or invalid
     *
     * @example
     * ```typescript
     * const env1 = new Environment('production');
     * const env2 = new Environment({
     *   value: 'production',
     *   resourceName: 'prod',
     *   abbreviation: 'prod'
     * });
     * ```
     */
    function Environment(options) {
        var _a, _b, _c;
        var _this = _super.call(this, options) || this;
        if (typeof options === 'string') {
            _this.abbreviation = (_a = Environment.ABBREVIATIONS[options.toLowerCase()]) !== null && _a !== void 0 ? _a : _this.resourceName;
        }
        else {
            _this.abbreviation =
                (_c = (_b = options.abbreviation) !== null && _b !== void 0 ? _b : Environment.ABBREVIATIONS[options.value.toLowerCase()]) !== null && _c !== void 0 ? _c : _this.resourceName;
        }
        return _this;
    }
    /**
     * Validates the environment value.
     *
     * @throws {Error} If validation fails
     */
    Environment.prototype.validate = function () {
        _super.prototype.validate.call(this);
        // Environment-specific validation
        if (this.resourceName.length > 15) {
            throw new Error("Environment resource name must not exceed 15 characters (current: ".concat(this.resourceName.length, ")"));
        }
        if (!/^[a-z0-9-]+$/.test(this.resourceName)) {
            throw new Error("Environment resource name can only contain lowercase letters, numbers, and hyphens");
        }
    };
    /**
     * Creates an Environment from a value, automatically applying abbreviations.
     *
     * @param value - Environment name
     * @returns Environment instance with appropriate abbreviation
     *
     * @example
     * ```typescript
     * const env = Environment.fromValue('production');
     * console.log(env.abbreviation); // "prod"
     * console.log(env.resourceName); // "production"
     * ```
     */
    Environment.fromValue = function (value) {
        var normalized = value.toLowerCase().trim();
        var abbreviation = Environment.ABBREVIATIONS[normalized];
        return new Environment({
            value: value,
            abbreviation: abbreviation,
        });
    };
    /**
     * Gets a list of all supported environments.
     *
     * @returns Array of supported environment names
     */
    Environment.getSupportedEnvironments = function () {
        return Object.keys(Environment.ABBREVIATIONS);
    };
    /**
     * Checks if an environment is supported.
     *
     * @param environment - Environment name to check
     * @returns True if environment is supported
     */
    Environment.isSupported = function (environment) {
        return environment.toLowerCase() in Environment.ABBREVIATIONS;
    };
    /**
     * Standard environment abbreviations.
     */
    Environment.ABBREVIATIONS = {
        development: 'dev',
        dev: 'dev',
        test: 'test',
        testing: 'test',
        qa: 'qa',
        'quality-assurance': 'qa',
        staging: 'stg',
        stg: 'stg',
        uat: 'uat',
        'user-acceptance': 'uat',
        nonprod: 'nonprod',
        'non-prod': 'nonprod',
        'non-production': 'nonprod',
        production: 'prod',
        prod: 'prod',
        sandbox: 'sbx',
        sbx: 'sbx',
        demo: 'demo',
        poc: 'poc',
        'proof-of-concept': 'poc',
    };
    /**
     * Predefined environment instances for common use cases.
     */
    Environment.DEV = new Environment('development');
    Environment.TEST = new Environment('test');
    Environment.QA = new Environment('qa');
    Environment.STAGING = new Environment('staging');
    Environment.UAT = new Environment('uat');
    Environment.NONPROD = new Environment('nonprod');
    Environment.PROD = new Environment('production');
    Environment.SANDBOX = new Environment('sandbox');
    Environment.DEMO = new Environment('demo');
    Environment.POC = new Environment('poc');
    return Environment;
}(types_1.NamingComponent));
exports.Environment = Environment;
