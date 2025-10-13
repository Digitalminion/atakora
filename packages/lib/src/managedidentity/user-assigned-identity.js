"use strict";
/**
 * Azure Managed Identity - User-Assigned Identity construct.
 *
 * @remarks
 * This module provides the UserAssignedIdentity construct, which represents
 * a user-assigned managed identity that can be assigned to multiple Azure resources
 * and used as a grantable identity in the RBAC grant pattern.
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
exports.UserAssignedIdentity = void 0;
var resource_1 = require("../core/resource");
var grants_1 = require("../core/grants");
/**
 * User-assigned managed identity resource.
 *
 * @remarks
 * A user-assigned managed identity is an Azure resource that can be assigned
 * to multiple resources (VMs, Function Apps, etc.) and used to authenticate
 * to Azure services without storing credentials in code.
 *
 * **Key Features**:
 * - Implements IGrantable for use in grant methods
 * - Can be assigned to multiple resources
 * - Independent lifecycle from resources
 * - Reusable across deployments
 *
 * **ARM Resource Type**: `Microsoft.ManagedIdentity/userAssignedIdentities`
 * **API Version**: `2023-01-31`
 *
 * @public
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { UserAssignedIdentity } from '@atakora/lib/managedidentity';
 *
 * const identity = new UserAssignedIdentity(resourceGroup, 'AppIdentity', {
 *   identityName: 'app-identity',
 *   location: 'eastus'
 * });
 *
 * // Use as grantee
 * storageAccount.grantBlobRead(identity);
 * ```
 *
 * @example
 * Assign to multiple resources:
 * ```typescript
 * const sharedIdentity = new UserAssignedIdentity(rg, 'SharedIdentity', {
 *   identityName: 'shared-identity',
 *   location: 'eastus'
 * });
 *
 * // Assign to Function App
 * const functionApp = new FunctionApp(rg, 'Api', {
 *   plan: plan,
 *   storageAccount: storage,
 *   identity: createUserAssignedIdentity([sharedIdentity.identityId])
 * });
 *
 * // Assign to VM
 * const vm = new VirtualMachine(rg, 'VM', {
 *   identity: createUserAssignedIdentity([sharedIdentity.identityId])
 * });
 *
 * // Grant permissions to the shared identity
 * keyVault.grantSecretRead(sharedIdentity);
 * ```
 *
 * @example
 * Import existing identity:
 * ```typescript
 * const existingIdentity = UserAssignedIdentity.fromIdentityName(
 *   scope,
 *   'ExistingIdentity',
 *   'my-existing-identity'
 * );
 * ```
 */
var UserAssignedIdentity = /** @class */ (function (_super) {
    __extends(UserAssignedIdentity, _super);
    /**
     * Creates a new UserAssignedIdentity construct.
     *
     * @param scope - Parent construct (must be or contain a ResourceGroup)
     * @param id - Unique identifier for this construct
     * @param props - User-assigned identity properties
     *
     * @throws {Error} If identityName is not provided or invalid
     *
     * @example
     * ```typescript
     * const identity = new UserAssignedIdentity(resourceGroup, 'AppIdentity', {
     *   identityName: 'app-identity',
     *   location: 'eastus',
     *   tags: { environment: 'production' }
     * });
     * ```
     */
    function UserAssignedIdentity(scope, id, props) {
        var _this = _super.call(this, scope, id, props) || this;
        /**
         * ARM resource type.
         */
        _this.resourceType = 'Microsoft.ManagedIdentity/userAssignedIdentities';
        /**
         * API version for the resource.
         */
        _this.apiVersion = '2023-01-31';
        /**
         * Principal type for RBAC assignments.
         *
         * @remarks
         * User-assigned identities are ServicePrincipal type in Azure AD.
         */
        _this.principalType = grants_1.PrincipalType.ManagedIdentity;
        _this.validateProps(props);
        _this.props = props;
        _this.identityName = props.identityName;
        _this.name = props.identityName;
        _this.location = props.location || _this.getDefaultLocation();
        _this.tags = props.tags;
        // Construct resource ID
        // Note: {subscriptionId} and {resourceGroupName} will be resolved during synthesis
        _this.resourceId = "[resourceId('Microsoft.ManagedIdentity/userAssignedIdentities', '".concat(_this.name, "')]");
        _this.identityId = _this.resourceId;
        return _this;
    }
    Object.defineProperty(UserAssignedIdentity.prototype, "principalId", {
        /**
         * Gets the principal ID for this user-assigned identity.
         *
         * @remarks
         * Returns an ARM reference expression that resolves at deployment time
         * to the actual principal ID (object ID) of the managed identity.
         *
         * **ARM Reference Format**:
         * `[reference(resourceId('Microsoft.ManagedIdentity/userAssignedIdentities', 'name')).principalId]`
         *
         * This value is used in role assignments to grant permissions to the identity.
         *
         * @example
         * ```typescript
         * const identity = new UserAssignedIdentity(rg, 'Identity', {
         *   identityName: 'my-identity'
         * });
         *
         * // principalId is used internally by grant methods
         * console.log(identity.principalId);
         * // Output: "[reference(resourceId('Microsoft.ManagedIdentity/userAssignedIdentities', 'my-identity')).principalId]"
         * ```
         */
        get: function () {
            return "[reference(".concat(this.resourceId, ").principalId]");
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(UserAssignedIdentity.prototype, "clientId", {
        /**
         * Gets the client ID for this user-assigned identity.
         *
         * @remarks
         * Returns an ARM reference expression that resolves at deployment time
         * to the client ID (application ID) of the managed identity.
         *
         * The client ID is used when configuring resources to use this identity.
         *
         * @example
         * ```typescript
         * const identity = new UserAssignedIdentity(rg, 'Identity', {
         *   identityName: 'my-identity'
         * });
         *
         * console.log(identity.clientId);
         * // Output: "[reference(resourceId('Microsoft.ManagedIdentity/userAssignedIdentities', 'my-identity')).clientId]"
         * ```
         */
        get: function () {
            return "[reference(".concat(this.resourceId, ").clientId]");
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Validates constructor properties.
     *
     * @param props - Properties to validate
     * @throws {Error} If validation fails
     *
     * @internal
     */
    UserAssignedIdentity.prototype.validateProps = function (props) {
        if (!props.identityName || props.identityName.trim() === '') {
            throw new Error('UserAssignedIdentity requires an identityName. ' +
                'Provide a valid name (3-128 characters, alphanumerics, hyphens, underscores).');
        }
        // Validate identity name format
        var namePattern = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;
        if (!namePattern.test(props.identityName)) {
            throw new Error("Invalid identityName '".concat(props.identityName, "'. ") +
                'Name must start with a letter or number and contain only alphanumerics, hyphens, and underscores.');
        }
        if (props.identityName.length < 3 || props.identityName.length > 128) {
            throw new Error("Invalid identityName '".concat(props.identityName, "'. ") +
                'Name must be between 3 and 128 characters.');
        }
    };
    /**
     * Transforms this resource to ARM template JSON representation.
     *
     * @returns ARM template resource object
     *
     * @example
     * Generated ARM template:
     * ```json
     * {
     *   "type": "Microsoft.ManagedIdentity/userAssignedIdentities",
     *   "apiVersion": "2023-01-31",
     *   "name": "app-identity",
     *   "location": "eastus",
     *   "tags": {
     *     "environment": "production"
     *   }
     * }
     * ```
     */
    UserAssignedIdentity.prototype.toArmTemplate = function () {
        return {
            type: this.resourceType,
            apiVersion: this.apiVersion,
            name: this.name,
            location: this.location,
            tags: this.tags || {},
        };
    };
    /**
     * Gets default location from parent scope.
     *
     * @returns Default location or 'eastus' if not found
     *
     * @internal
     */
    UserAssignedIdentity.prototype.getDefaultLocation = function () {
        // Try to get location from parent
        var current = this.node.scope;
        while (current) {
            var parent_1 = current;
            if (parent_1 && typeof parent_1.location === 'string') {
                return parent_1.location;
            }
            current = current.node.scope;
        }
        // Fallback to eastus
        return 'eastus';
    };
    /**
     * Imports an existing user-assigned identity by name.
     *
     * @param scope - Parent construct
     * @param id - Unique identifier for the imported construct
     * @param identityName - Name of the existing identity
     * @param resourceGroupName - Optional resource group name (defaults to parent's RG)
     * @returns User-assigned identity interface
     *
     * @remarks
     * Use this method to reference an existing user-assigned identity that was
     * created outside of this CDK application.
     *
     * @example
     * ```typescript
     * const existingIdentity = UserAssignedIdentity.fromIdentityName(
     *   scope,
     *   'ExistingIdentity',
     *   'my-existing-identity'
     * );
     *
     * // Use in grants
     * storageAccount.grantBlobRead(existingIdentity);
     * ```
     */
    UserAssignedIdentity.fromIdentityName = function (scope, id, identityName, resourceGroupName) {
        // Determine resource group name
        var rgName = resourceGroupName;
        if (!rgName) {
            // Try to get from parent scope
            var current = scope;
            while (current) {
                var parent_2 = current;
                if (parent_2 && typeof parent_2.resourceGroupName === 'string') {
                    rgName = parent_2.resourceGroupName;
                    break;
                }
                current = current.node.scope;
            }
        }
        var identityId = "[resourceId('Microsoft.ManagedIdentity/userAssignedIdentities', '".concat(identityName, "')]");
        var principalId = "[reference(".concat(identityId, ").principalId]");
        var clientId = "[reference(".concat(identityId, ").clientId]");
        return {
            identityName: identityName,
            identityId: identityId,
            principalId: principalId,
            clientId: clientId,
            principalType: grants_1.PrincipalType.ManagedIdentity,
            tenantId: undefined,
        };
    };
    /**
     * Imports an existing user-assigned identity by resource ID.
     *
     * @param scope - Parent construct
     * @param id - Unique identifier for the imported construct
     * @param identityId - Full resource ID of the identity
     * @returns User-assigned identity interface
     *
     * @remarks
     * Use this method when you have the full resource ID of an existing identity.
     *
     * @example
     * ```typescript
     * const existingIdentity = UserAssignedIdentity.fromIdentityId(
     *   scope,
     *   'ExistingIdentity',
     *   '/subscriptions/12345/resourceGroups/my-rg/providers/Microsoft.ManagedIdentity/userAssignedIdentities/my-identity'
     * );
     * ```
     */
    UserAssignedIdentity.fromIdentityId = function (scope, id, identityId) {
        // Extract identity name from resource ID
        var match = identityId.match(/\/userAssignedIdentities\/([^\/]+)$/);
        var identityName = match ? match[1] : 'imported-identity';
        var principalId = "[reference('".concat(identityId, "', '2023-01-31').principalId]");
        var clientId = "[reference('".concat(identityId, "', '2023-01-31').clientId]");
        return {
            identityName: identityName,
            identityId: identityId,
            principalId: principalId,
            clientId: clientId,
            principalType: grants_1.PrincipalType.ManagedIdentity,
            tenantId: undefined,
        };
    };
    return UserAssignedIdentity;
}(resource_1.Resource));
exports.UserAssignedIdentity = UserAssignedIdentity;
