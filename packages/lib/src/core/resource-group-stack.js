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
exports.ResourceGroupStack = void 0;
var construct_1 = require("./construct");
var scopes_1 = require("./azure/scopes");
/**
 * Stack that deploys to an Azure resource group.
 *
 * @remarks
 * Must be nested within a SubscriptionStack.
 * Deploys most Azure resources (Storage, VNets, App Services, etc.)
 *
 * ResourceGroupStack inherits naming context from its parent SubscriptionStack.
 *
 * @example
 * Basic usage (when ResourceGroup is available in Phase 2):
 * ```typescript
 * // In SubscriptionStack
 * const dataRg = new ResourceGroup(foundation, 'DataRG', {
 *   resourceGroupName: foundation.generateResourceName('rg', 'data'),
 *   location: foundation.location
 * });
 *
 * const dataStack = foundation.addResourceGroupStack('Data', dataRg);
 *
 * // Deploy resources to the RG stack
 * const storage = new StorageAccount(dataStack, 'Storage', {
 *   accountName: dataStack.generateResourceName('storage'),
 *   location: dataStack.location
 * });
 * ```
 *
 * @example
 * For Phase 1b (without ResourceGroup construct):
 * ```typescript
 * const dataStack = new ResourceGroupStack(foundation, 'Data', {
 *   resourceGroup: {
 *     resourceGroupName: 'rg-digital-minion-authr-data-nonprod-eus-00',
 *     location: 'eastus'
 *   }
 * });
 *
 * const storageName = dataStack.generateResourceName('storage');
 * ```
 */
var ResourceGroupStack = /** @class */ (function (_super) {
    __extends(ResourceGroupStack, _super);
    /**
     * Creates a new ResourceGroupStack.
     *
     * @param parent - Parent SubscriptionStack
     * @param id - Stack identifier
     * @param props - Stack properties
     */
    function ResourceGroupStack(parent, id, props) {
        var _this = _super.call(this, parent, id) || this;
        /**
         * Deployment scope (always ResourceGroup).
         */
        _this.scope = scopes_1.DeploymentScope.ResourceGroup;
        _this.subscriptionStack = parent;
        _this.resourceGroupName = props.resourceGroup.resourceGroupName;
        _this.location = props.resourceGroup.location;
        // Merge tags with parent
        _this.tags = __assign(__assign({}, parent.tags), props.tags);
        // Mark this construct as a stack for synthesis
        _this.node.addMetadata('azure:arm:stack', {
            scope: 'resourceGroup',
        });
        return _this;
    }
    /**
     * Generate a resource name for this stack's context.
     *
     * @param resourceType - Azure resource type
     * @param purpose - Optional purpose identifier
     * @returns Generated resource name
     *
     * @remarks
     * Delegates to parent SubscriptionStack for name generation,
     * ensuring consistent naming across the entire stack hierarchy.
     *
     * @example
     * ```typescript
     * const storageName = stack.generateResourceName('storage');
     * // Result: "stdpauthrnonprodeus01"
     * ```
     */
    ResourceGroupStack.prototype.generateResourceName = function (resourceType, purpose) {
        return this.subscriptionStack.generateResourceName(resourceType, purpose);
    };
    return ResourceGroupStack;
}(construct_1.Construct));
exports.ResourceGroupStack = ResourceGroupStack;
