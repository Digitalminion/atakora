"use strict";
/**
 * Management Group Stack for Azure CDK.
 *
 * @packageDocumentation
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
exports.ManagementGroupStack = void 0;
var construct_1 = require("./construct");
var scopes_1 = require("./azure/scopes");
/**
 * Stack that deploys at Azure Management Group scope.
 *
 * @remarks
 * Management Group-scoped stacks can:
 * - Deploy policy definitions and assignments
 * - Deploy role definitions and assignments
 * - Manage governance across multiple subscriptions
 * - Create nested management groups
 *
 * **Use Cases**:
 * - Enterprise-wide policy governance
 * - Custom role definitions for multiple subscriptions
 * - Organizational hierarchy management
 * - Compliance enforcement at scale
 *
 * **Management Group Hierarchy**:
 * - Root Management Group (Tenant level)
 *   - Department Management Groups
 *     - Environment Management Groups (e.g., Production, Non-Production)
 *       - Subscriptions
 *
 * @public
 *
 * @example
 * Deploy policies to a management group:
 * ```typescript
 * import { App, ManagementGroupStack } from '@atakora/cdk';
 * import { PolicyAssignment, WellKnownPolicyIds } from '@atakora/cdk/policy';
 *
 * const app = new App();
 *
 * const productionMG = new ManagementGroupStack(app, 'ProductionMG', {
 *   managementGroupId: 'mg-production',
 *   displayName: 'Production Management Group',
 *   description: 'Governance for all production subscriptions'
 * });
 *
 * // Apply policy to all subscriptions in this management group
 * new PolicyAssignment(productionMG, 'RequireHTTPS', {
 *   policyDefinitionId: WellKnownPolicyIds.STORAGE_HTTPS_ONLY,
 *   displayName: 'Require HTTPS for all storage accounts'
 * });
 *
 * app.synth();
 * ```
 *
 * @example
 * Organization-wide governance structure:
 * ```typescript
 * // Root management group (inherited by all)
 * const rootMG = new ManagementGroupStack(app, 'RootMG', {
 *   managementGroupId: 'org-root'
 * });
 *
 * // Apply organization-wide policies
 * new PolicyAssignment(rootMG, 'AllowedLocations', {
 *   policyDefinitionId: WellKnownPolicyIds.ALLOWED_LOCATIONS,
 *   parameters: {
 *     listOfAllowedLocations: {
 *       value: ['eastus', 'eastus2', 'westus2']
 *     }
 *   }
 * });
 *
 * // Department-specific management group
 * const engineeringMG = new ManagementGroupStack(app, 'EngineeringMG', {
 *   managementGroupId: 'mg-engineering'
 * });
 *
 * // Engineering-specific policies
 * new PolicyAssignment(engineeringMG, 'RequireTags', {
 *   policyDefinitionId: WellKnownPolicyIds.REQUIRE_TAG_ON_RESOURCES,
 *   parameters: {
 *     tagName: { value: 'Department' }
 *   }
 * });
 * ```
 */
var ManagementGroupStack = /** @class */ (function (_super) {
    __extends(ManagementGroupStack, _super);
    /**
     * Creates a new ManagementGroupStack.
     *
     * @param app - Parent App construct
     * @param id - Stack identifier
     * @param props - Stack properties
     */
    function ManagementGroupStack(app, id, props) {
        var _this = _super.call(this, app, id) || this;
        /**
         * Deployment scope (always ManagementGroup).
         */
        _this.scope = scopes_1.DeploymentScope.ManagementGroup;
        // Normalize management group ID to full resource ID format if needed
        _this.managementGroupId = _this.normalizeManagementGroupId(props.managementGroupId);
        _this.displayName = props.displayName;
        _this.description = props.description;
        // Mark this construct as a stack for synthesis
        _this.node.addMetadata('azure:arm:stack', {
            scope: 'managementGroup',
            managementGroupId: _this.managementGroupId,
        });
        // Register with app
        app.registerStack(_this);
        return _this;
    }
    /**
     * Normalizes management group ID to full resource ID format.
     *
     * @param id - Management group ID or name
     * @returns Full resource ID
     * @internal
     */
    ManagementGroupStack.prototype.normalizeManagementGroupId = function (id) {
        // If already a full resource ID, return as-is
        if (id.startsWith('/providers/Microsoft.Management/managementGroups/')) {
            return id;
        }
        // Otherwise, construct full resource ID
        return "/providers/Microsoft.Management/managementGroups/".concat(id);
    };
    /**
     * Gets the management group name from the full resource ID.
     *
     * @returns Management group name
     *
     * @example
     * ```typescript
     * const stack = new ManagementGroupStack(app, 'MG', {
     *   managementGroupId: '/providers/Microsoft.Management/managementGroups/my-mg'
     * });
     *
     * console.log(stack.getManagementGroupName()); // 'my-mg'
     * ```
     */
    ManagementGroupStack.prototype.getManagementGroupName = function () {
        var parts = this.managementGroupId.split('/');
        return parts[parts.length - 1];
    };
    return ManagementGroupStack;
}(construct_1.Construct));
exports.ManagementGroupStack = ManagementGroupStack;
