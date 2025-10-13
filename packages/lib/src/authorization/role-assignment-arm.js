"use strict";
/**
 * Azure RBAC - RoleAssignment L1 construct.
 *
 * @remarks
 * This module provides the L1 (ARM template layer) construct for Azure role assignments.
 * It maps directly to the Microsoft.Authorization/roleAssignments ARM resource type.
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
exports.RoleAssignmentArm = void 0;
var resource_1 = require("../core/resource");
var grants_1 = require("../core/grants");
var validation_1 = require("../core/validation");
/**
 * L1 construct for Azure role assignments.
 *
 * @remarks
 * Creates a Microsoft.Authorization/roleAssignments resource in the ARM template.
 * This is the low-level construct that provides direct ARM template mapping.
 *
 * **Key Features**:
 * - Deterministic GUID generation for idempotent deployments
 * - Direct ARM template property mapping
 * - Support for ABAC conditions
 * - Cross-tenant role assignment support
 *
 * **Usage Pattern**:
 * Use the L2 RoleAssignment construct for most scenarios. Use this L1 construct
 * when you need direct control over ARM template generation.
 *
 * @public
 *
 * @example
 * Basic role assignment:
 * ```typescript
 * const roleAssignment = new RoleAssignmentArm(stack, 'StorageReaderRole', {
 *   scope: storageAccount.resourceId,
 *   roleDefinitionId: WellKnownRoleIds.STORAGE_BLOB_DATA_READER,
 *   principalId: vm.principalId,
 *   principalType: PrincipalType.ManagedIdentity,
 *   description: 'VM needs read access to storage'
 * });
 * ```
 *
 * @example
 * With ABAC condition:
 * ```typescript
 * const roleAssignment = new RoleAssignmentArm(stack, 'ConditionalAccess', {
 *   scope: storageAccount.resourceId,
 *   roleDefinitionId: WellKnownRoleIds.STORAGE_BLOB_DATA_CONTRIBUTOR,
 *   principalId: app.principalId,
 *   principalType: PrincipalType.ManagedIdentity,
 *   condition: `@Resource[Microsoft.Storage/storageAccounts/blobServices/containers:name] StringEquals 'data'`,
 *   conditionVersion: '2.0'
 * });
 * ```
 */
var RoleAssignmentArm = /** @class */ (function (_super) {
    __extends(RoleAssignmentArm, _super);
    /**
     * Creates a new RoleAssignmentArm instance.
     *
     * @param scope - Parent construct
     * @param id - Unique construct ID
     * @param props - Role assignment properties
     */
    function RoleAssignmentArm(scope, id, props) {
        var _this = _super.call(this, scope, id, props) || this;
        _this.resourceType = 'Microsoft.Authorization/roleAssignments';
        _this.apiVersion = '2022-04-01';
        _this.validateProps(props);
        _this.props = props;
        // Generate deterministic GUID for idempotency
        _this.name = _this.generateAssignmentGuid();
        // Construct resource ID
        // Role assignments are deployed at the scope level
        _this.resourceId = "".concat(props.scope, "/providers/Microsoft.Authorization/roleAssignments/").concat(_this.name);
        return _this;
    }
    /**
     * Validates role assignment properties.
     *
     * @param props - Properties to validate
     * @throws {ValidationError} If validation fails
     *
     * @internal
     */
    RoleAssignmentArm.prototype.validateProps = function (props) {
        if (!props.scope || props.scope.trim() === '') {
            throw new validation_1.ValidationError('Role assignment requires a scope', 'The scope property specifies where the role is assigned', 'Provide a valid Azure resource ID for the scope');
        }
        if (!props.roleDefinitionId || props.roleDefinitionId.trim() === '') {
            throw new validation_1.ValidationError('Role assignment requires a roleDefinitionId', 'The roleDefinitionId identifies which role to assign', 'Provide a valid role definition ID (use WellKnownRoleIds for built-in roles)');
        }
        if (!props.principalId || props.principalId.trim() === '') {
            throw new validation_1.ValidationError('Role assignment requires a principalId', 'The principalId identifies who receives the role', 'Provide a valid principal ID (Azure AD object ID or ARM reference)');
        }
        if (!props.principalType) {
            throw new validation_1.ValidationError('Role assignment requires a principalType', 'The principalType indicates what kind of identity is receiving the role', 'Provide a valid PrincipalType (e.g., PrincipalType.ManagedIdentity)');
        }
        if (props.description && props.description.length > 1024) {
            throw new validation_1.ValidationError('Role assignment description cannot exceed 1024 characters', "Current description length: ".concat(props.description.length, " characters"), 'Shorten the description to 1024 characters or less');
        }
        if (props.condition && !props.conditionVersion) {
            throw new validation_1.ValidationError('conditionVersion is required when condition is specified', 'ABAC conditions require a version to be specified', "Set conditionVersion to '2.0'");
        }
        if (props.principalType === grants_1.PrincipalType.ForeignGroup && !props.tenantId) {
            throw new validation_1.ValidationError('tenantId is required for ForeignGroup principal type', 'Cross-tenant group assignments require the tenant ID', 'Provide the tenant ID where the foreign group exists');
        }
    };
    /**
     * Transforms this role assignment to ARM template format.
     *
     * @returns ARM template resource object
     *
     * @example
     * Generated ARM template:
     * ```json
     * {
     *   "type": "Microsoft.Authorization/roleAssignments",
     *   "apiVersion": "2022-04-01",
     *   "scope": "/subscriptions/.../resourceGroups/.../providers/Microsoft.Storage/storageAccounts/myaccount",
     *   "name": "[guid('...', '...', '...')]",
     *   "properties": {
     *     "roleDefinitionId": "/subscriptions/.../providers/Microsoft.Authorization/roleDefinitions/...",
     *     "principalId": "[reference(...).identity.principalId]",
     *     "principalType": "ServicePrincipal",
     *     "description": "..."
     *   }
     * }
     * ```
     */
    RoleAssignmentArm.prototype.toArmTemplate = function () {
        var properties = {
            roleDefinitionId: this.props.roleDefinitionId,
            principalId: this.props.principalId,
            principalType: this.props.principalType,
        };
        // Add optional properties
        if (this.props.tenantId) {
            properties.tenantId = this.props.tenantId;
        }
        if (this.props.description) {
            properties.description = this.props.description;
        }
        if (this.props.condition) {
            properties.condition = this.props.condition;
            properties.conditionVersion = this.props.conditionVersion || '2.0';
        }
        if (this.props.skipPrincipalValidation) {
            properties.delegatedManagedIdentityResourceId = null;
        }
        return {
            type: this.resourceType,
            apiVersion: this.apiVersion,
            name: this.name,
            // Role assignments are deployed at scope, so we use the 'scope' property
            // instead of inheriting location
            properties: properties,
        };
    };
    /**
     * Generates a deterministic GUID for the role assignment.
     *
     * @remarks
     * Using a deterministic GUID based on scope, role, and principal
     * ensures idempotent deployments. The same combination will always
     * generate the same GUID, preventing duplicate role assignments.
     *
     * **ARM guid() Function**:
     * The guid() function in ARM templates creates a deterministic GUID
     * from the input strings. We construct an ARM expression that will be
     * evaluated during deployment.
     *
     * @returns ARM expression that generates a GUID
     *
     * @internal
     *
     * @example
     * ```typescript
     * // Returns: "[guid('/subscriptions/.../storageAccounts/myaccount', 'role-id', 'principal-id')]"
     * ```
     */
    RoleAssignmentArm.prototype.generateAssignmentGuid = function () {
        // Use ARM guid() function for deterministic GUID generation
        // The function combines scope, role, and principal to create a unique but deterministic GUID
        return "[guid('".concat(this.props.scope, "', '").concat(this.props.roleDefinitionId, "', '").concat(this.props.principalId, "')]");
    };
    return RoleAssignmentArm;
}(resource_1.Resource));
exports.RoleAssignmentArm = RoleAssignmentArm;
