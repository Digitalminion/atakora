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
exports.SubscriptionStack = void 0;
var construct_1 = require("./construct");
var scopes_1 = require("./azure/scopes");
var naming_1 = require("../naming");
var resource_group_stack_1 = require("./resource-group-stack");
/**
 * Stack that deploys at Azure subscription scope.
 *
 * @remarks
 * Subscription-scoped stacks can:
 * - Create resource groups
 * - Deploy subscription-level resources (policies, RBAC, budgets)
 * - Contain nested ResourceGroupStack deployments
 *
 * This matches the AuthR foundation stack pattern.
 *
 * @example
 * Basic usage:
 * ```typescript
 * const app = new App();
 *
 * const subscription = Subscription.fromId('12345678-1234-1234-1234-123456789abc');
 * const org = Organization.fromValue('digital-minion');
 * const project = new Project('authr');
 * const env = Environment.fromValue('nonprod');
 * const geo = Geography.fromValue('eastus');
 * const instance = Instance.fromNumber(1);
 *
 * const foundation = new SubscriptionStack(app, 'Foundation', {
 *   subscription,
 *   geography: geo,
 *   organization: org,
 *   project,
 *   environment: env,
 *   instance
 * });
 *
 * // Generate resource names
 * const rgName = foundation.generateResourceName('rg', 'data');
 * // Result: "rg-digital-minion-authr-data-nonprod-eus-00"
 * ```
 */
var SubscriptionStack = /** @class */ (function (_super) {
    __extends(SubscriptionStack, _super);
    /**
     * Creates a new SubscriptionStack.
     *
     * @param app - Parent App construct
     * @param id - Stack identifier
     * @param props - Stack properties
     */
    function SubscriptionStack(app, id, props) {
        var _a;
        var _this = _super.call(this, app, id) || this;
        /**
         * Deployment scope (always Subscription).
         */
        _this.scope = scopes_1.DeploymentScope.Subscription;
        /**
         * Nested ResourceGroupStacks.
         */
        _this.resourceGroupStacks = new Map();
        _this.subscriptionId = props.subscription.subscriptionId;
        _this.geography = props.geography;
        _this.location = props.geography.location;
        _this.tags = (_a = props.tags) !== null && _a !== void 0 ? _a : {};
        _this.organization = props.organization;
        _this.project = props.project;
        _this.environment = props.environment;
        _this.instance = props.instance;
        // Initialize naming service with unique hash for this synthesis
        _this.namingService = new naming_1.NamingService();
        // Initialize name generator with custom conventions if provided
        _this.nameGenerator = new naming_1.ResourceNameGenerator(props.namingConventions);
        // Mark this construct as a stack for synthesis
        _this.node.addMetadata('azure:arm:stack', {
            scope: 'subscription',
        });
        // Register with app
        app.registerStack(_this);
        return _this;
    }
    /**
     * Generate a resource name for this stack's context.
     *
     * @param resourceType - Azure resource type
     * @param purpose - Optional purpose identifier
     * @returns Generated resource name
     *
     * @example
     * ```typescript
     * const rgName = stack.generateResourceName('rg', 'data');
     * // Result: "rg-digital-minion-authr-data-nonprod-eus-00"
     * ```
     */
    SubscriptionStack.prototype.generateResourceName = function (resourceType, purpose) {
        return this.nameGenerator.generateForScope({
            scope: scopes_1.DeploymentScope.Subscription,
            resourceType: resourceType,
            organization: this.organization.resourceName,
            project: this.project.resourceName,
            environment: this.environment.abbreviation,
            geography: this.geography.abbreviation,
            instance: this.instance.resourceName,
            purpose: purpose,
        });
    };
    /**
     * Add a nested ResourceGroupStack.
     *
     * @param id - Stack identifier
     * @param resourceGroup - Resource group created in this subscription stack
     * @returns The new ResourceGroupStack
     *
     * @remarks
     * This will be fully implemented when ResourceGroup construct is available in Phase 2.
     */
    SubscriptionStack.prototype.addResourceGroupStack = function (id, resourceGroup) {
        var rgStack = new resource_group_stack_1.ResourceGroupStack(this, id, { resourceGroup: resourceGroup });
        this.resourceGroupStacks.set(id, rgStack);
        return rgStack;
    };
    return SubscriptionStack;
}(construct_1.Construct));
exports.SubscriptionStack = SubscriptionStack;
