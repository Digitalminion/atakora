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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureApp = void 0;
var fs = require("fs");
var path = require("path");
var os = require("os");
var app_1 = require("./app");
/**
 * Extended App that automatically loads configuration from user and project config files.
 *
 * @remarks
 * AzureApp extends the base App to automatically load and merge configuration from:
 * 1. User config file (`~/.azure-arm/config.json`) - Contains Azure subscription/tenant info
 * 2. Project config file (`./azure-arm.json`) - Contains project-specific context
 *
 * The resolved configuration is automatically injected into the construct tree context,
 * making subscription IDs and tenant IDs available to all child constructs.
 *
 * @example
 * Basic usage with automatic config loading:
 * ```typescript
 * import { AzureApp, SubscriptionStack } from '@atakora/lib';
 *
 * // Automatically loads config from:
 * // - ~/.azure-arm/config.json (user config via active profile)
 * // - ./azure-arm.json (project config)
 * const app = new AzureApp();
 *
 * // Stack inherits subscriptionId from active profile
 * const stack = new SubscriptionStack(app, 'Foundation', {
 *   location: 'eastus'  // subscriptionId injected automatically from config
 * });
 *
 * app.synth();
 * ```
 *
 * @example
 * With custom config paths:
 * ```typescript
 * const app = new AzureApp({
 *   projectConfigPath: './config/azure.json',
 *   userConfigPath: '/custom/path/config.json'
 * });
 * ```
 *
 * @example
 * With additional context:
 * ```typescript
 * const app = new AzureApp({
 *   context: {
 *     customValue: 'foo',
 *     anotherValue: 'bar'
 *   }
 * });
 * ```
 */
var AzureApp = /** @class */ (function (_super) {
    __extends(AzureApp, _super);
    /**
     * Creates a new AzureApp instance with automatic config loading.
     *
     * @param props - App configuration options
     */
    function AzureApp(props) {
        var _this = this;
        var _a, _b;
        // Load configurations
        var projectConfigPath = (_a = props === null || props === void 0 ? void 0 : props.projectConfigPath) !== null && _a !== void 0 ? _a : './azure-arm.json';
        var userConfigPath = (_b = props === null || props === void 0 ? void 0 : props.userConfigPath) !== null && _b !== void 0 ? _b : path.join(os.homedir(), '.azure-arm', 'config.json');
        // Load project config (may not exist, that's okay)
        var projectConfig = AzureApp.loadProjectConfig(projectConfigPath);
        // Load user config and resolve active profile
        var userConfig = AzureApp.loadUserConfig(userConfigPath, projectConfig.profile);
        // Merge contexts: user config < project config < props.context
        var mergedContext = __assign(__assign(__assign({}, (userConfig
            ? __assign({ subscriptionId: userConfig.subscriptionId, tenantId: userConfig.tenantId, cloud: userConfig.cloud }, (userConfig.location && { defaultLocation: userConfig.location })) : {})), projectConfig.context), props === null || props === void 0 ? void 0 : props.context);
        // Call parent constructor with merged context
        _this = _super.call(this, __assign(__assign({}, props), { context: mergedContext })) || this;
        // Store resolved configs
        _this.userConfig = userConfig;
        _this.projectConfig = projectConfig;
        return _this;
    }
    /**
     * Load project configuration from disk.
     *
     * @param configPath - Path to project config file
     * @returns Project configuration object
     *
     * @internal
     */
    AzureApp.loadProjectConfig = function (configPath) {
        // Return empty config if file doesn't exist
        if (!fs.existsSync(configPath)) {
            return { context: {} };
        }
        try {
            var content = fs.readFileSync(configPath, 'utf-8');
            var config = JSON.parse(content);
            return __assign({ profile: config.profile, context: config.context || {} }, config);
        }
        catch (error) {
            throw new Error("Failed to load project config from ".concat(configPath, ": ").concat(error instanceof Error ? error.message : 'Unknown error'));
        }
    };
    /**
     * Load user configuration and resolve the active profile.
     *
     * @param configPath - Path to user config file
     * @param profileOverride - Optional profile name from project config
     * @returns Resolved profile configuration or null if not found
     *
     * @internal
     */
    AzureApp.loadUserConfig = function (configPath, profileOverride) {
        // Return null if file doesn't exist (user hasn't run `azure-arm config login` yet)
        if (!fs.existsSync(configPath)) {
            return null;
        }
        try {
            var content = fs.readFileSync(configPath, 'utf-8');
            var userConfig = JSON.parse(content);
            // Determine which profile to use
            var profileName = profileOverride || userConfig.activeProfile || 'default';
            // Return the profile or null if it doesn't exist
            return userConfig.profiles[profileName] || null;
        }
        catch (error) {
            throw new Error("Failed to load user config from ".concat(configPath, ": ").concat(error instanceof Error ? error.message : 'Unknown error'));
        }
    };
    /**
     * Get the subscription ID from the loaded configuration.
     *
     * @returns Subscription ID if available, undefined otherwise
     */
    AzureApp.prototype.getSubscriptionId = function () {
        return this.node.tryGetContext('subscriptionId');
    };
    /**
     * Get the tenant ID from the loaded configuration.
     *
     * @returns Tenant ID if available, undefined otherwise
     */
    AzureApp.prototype.getTenantId = function () {
        return this.node.tryGetContext('tenantId');
    };
    /**
     * Get the cloud environment from the loaded configuration.
     *
     * @returns Cloud environment name if available, undefined otherwise
     */
    AzureApp.prototype.getCloud = function () {
        return this.node.tryGetContext('cloud');
    };
    /**
     * Get the default location from the loaded configuration.
     *
     * @returns Default location if available, undefined otherwise
     */
    AzureApp.prototype.getDefaultLocation = function () {
        return this.node.tryGetContext('defaultLocation');
    };
    return AzureApp;
}(app_1.App));
exports.AzureApp = AzureApp;
