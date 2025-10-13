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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = void 0;
var construct_1 = require("./construct");
var fs = require("fs");
var path = require("path");
/**
 * Root of the construct tree.
 *
 * @remarks
 * The App represents the entire ARM deployment application.
 * It contains one or more stacks and orchestrates the synthesis process.
 *
 * The App is the root construct and does not have a parent.
 * All stacks must be children of the App.
 *
 * @example
 * Basic usage:
 * ```typescript
 * const app = new App();
 *
 * const stack = new SubscriptionStack(app, 'MyStack', {
 *   subscription: Subscription.fromId('...'),
 *   location: 'eastus',
 *   organization: new Organization('digital-minion'),
 *   project: new Project('authr'),
 *   environment: Environment.fromValue('nonprod'),
 *   instance: Instance.fromNumber(1)
 * });
 *
 * app.synth();  // Generate ARM templates (when implemented by Grace)
 * ```
 *
 * @example
 * With custom output directory:
 * ```typescript
 * const app = new App({
 *   outdir: './dist/arm-templates'
 * });
 * ```
 */
var App = /** @class */ (function (_super) {
    __extends(App, _super);
    /**
     * Creates a new App instance.
     *
     * @param props - App configuration
     */
    function App(props) {
        var _a, _b, _c;
        // App is the root construct with no parent
        var _this = _super.call(this, undefined, '') || this;
        /**
         * Registered stacks in this app.
         */
        _this.stacks = new Map();
        _this.outdir = (_a = props === null || props === void 0 ? void 0 : props.outdir) !== null && _a !== void 0 ? _a : 'arm.out';
        // Load project config
        var projectConfig = _this.loadProjectConfig(props === null || props === void 0 ? void 0 : props.projectConfigPath);
        // Load user config unless disabled
        if (!(props === null || props === void 0 ? void 0 : props.disableUserConfig)) {
            var profileName = (_c = (_b = props === null || props === void 0 ? void 0 : props.profile) !== null && _b !== void 0 ? _b : projectConfig === null || projectConfig === void 0 ? void 0 : projectConfig.profile) !== null && _c !== void 0 ? _c : 'default';
            _this.userProfile = _this.loadUserProfile(profileName);
        }
        // Build merged context
        var mergedContext = _this.buildContext(props, projectConfig, _this.userProfile);
        // Set context
        for (var _i = 0, _d = Object.entries(mergedContext); _i < _d.length; _i++) {
            var _e = _d[_i], key = _e[0], value = _e[1];
            _this.node.setContext(key, value);
        }
        return _this;
    }
    /**
     * Synthesize all stacks to ARM templates.
     *
     * @returns Cloud assembly containing all generated templates
     *
     * @remarks
     * Orchestrates the synthesis pipeline to generate ARM templates from the construct tree.
     */
    App.prototype.synth = function () {
        return __awaiter(this, void 0, void 0, function () {
            var Synthesizer, synthesizer, assembly;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('../synthesis'); })];
                    case 1:
                        Synthesizer = (_a.sent()).Synthesizer;
                        synthesizer = new Synthesizer();
                        return [4 /*yield*/, synthesizer.synthesize(this, {
                                outdir: this.outdir,
                            })];
                    case 2:
                        assembly = _a.sent();
                        return [2 /*return*/, assembly];
                }
            });
        });
    };
    /**
     * Register a stack with this app.
     *
     * @param stack - Stack to register
     * @internal
     *
     * @remarks
     * Called automatically by stack constructors.
     * Should not be called directly by users.
     */
    App.prototype.registerStack = function (stack) {
        this.stacks.set(stack.node.id, stack);
    };
    Object.defineProperty(App.prototype, "allStacks", {
        /**
         * Get all registered stacks.
         *
         * @returns Array of all stacks in this app
         */
        get: function () {
            return Array.from(this.stacks.values());
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Load project configuration from azure-arm.json
     *
     * @param configPath - Path to project config file
     * @returns Project configuration or undefined if not found
     * @private
     */
    App.prototype.loadProjectConfig = function (configPath) {
        var projectConfigPath = configPath !== null && configPath !== void 0 ? configPath : path.join(process.cwd(), 'azure-arm.json');
        if (!fs.existsSync(projectConfigPath)) {
            return undefined;
        }
        try {
            var content = fs.readFileSync(projectConfigPath, 'utf-8');
            return JSON.parse(content);
        }
        catch (error) {
            console.warn("Warning: Failed to load project config from ".concat(projectConfigPath, ": ").concat(error instanceof Error ? error.message : 'Unknown error'));
            return undefined;
        }
    };
    /**
     * Load user profile from ~/.azure-arm/config.json
     *
     * @param profileName - Name of the profile to load
     * @returns User profile or undefined if not found
     * @private
     */
    App.prototype.loadUserProfile = function (profileName) {
        try {
            // Import ConfigManager dynamically to avoid circular dependencies
            // and to make it optional (CLI might not be installed)
            var configManagerPath = '../../../cli/src/config/config-manager';
            // Try to load ConfigManager, but don't fail if CLI is not available
            var ConfigManager = void 0;
            try {
                ConfigManager = require(configManagerPath).ConfigManager;
            }
            catch (_a) {
                // CLI not available, silently skip user config
                return undefined;
            }
            if (!ConfigManager) {
                return undefined;
            }
            var configManager = new ConfigManager();
            var profile = configManager.getProfile(profileName);
            if (!profile) {
                console.error("Warning: Profile '".concat(profileName, "' not found in user config"));
                return undefined;
            }
            // Type guard for profile
            var profileData = profile;
            return {
                tenantId: profileData.tenantId || '',
                subscriptionId: profileData.subscriptionId || '',
                subscriptionName: profileData.subscriptionName,
                cloud: profileData.cloud,
                defaultLocation: profileData.location,
            };
        }
        catch (error) {
            console.warn("Warning: Failed to load user profile '".concat(profileName, "': ").concat(error instanceof Error ? error.message : 'Unknown error'));
            return undefined;
        }
    };
    /**
     * Build merged context from all sources
     *
     * @param props - App props
     * @param projectConfig - Project configuration
     * @param userProfile - User profile
     * @returns Merged context object
     * @private
     */
    App.prototype.buildContext = function (props, projectConfig, userProfile) {
        var context = {};
        // 1. Start with project context
        if (projectConfig === null || projectConfig === void 0 ? void 0 : projectConfig.context) {
            Object.assign(context, projectConfig.context);
        }
        // 2. Inject user profile values (subscriptionId, tenantId, etc.)
        if (userProfile) {
            context.subscriptionId = userProfile.subscriptionId;
            context.tenantId = userProfile.tenantId;
            if (userProfile.cloud) {
                context.cloud = userProfile.cloud;
            }
            if (userProfile.defaultLocation) {
                context.defaultLocation = userProfile.defaultLocation;
            }
            if (userProfile.subscriptionName) {
                context.subscriptionName = userProfile.subscriptionName;
            }
        }
        // 3. Override with explicit props context
        if (props === null || props === void 0 ? void 0 : props.context) {
            Object.assign(context, props.context);
        }
        return context;
    };
    /**
     * Get the user profile loaded by this app
     *
     * @returns User profile or undefined
     */
    App.prototype.getUserProfile = function () {
        return this.userProfile;
    };
    /**
     * Get subscription ID from context
     *
     * @returns Subscription ID or undefined
     */
    App.prototype.getSubscriptionId = function () {
        return this.node.tryGetContext('subscriptionId');
    };
    /**
     * Get tenant ID from context
     *
     * @returns Tenant ID or undefined
     */
    App.prototype.getTenantId = function () {
        return this.node.tryGetContext('tenantId');
    };
    return App;
}(construct_1.Construct));
exports.App = App;
