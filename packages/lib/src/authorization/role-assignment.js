"use strict";
/**
 * Azure RBAC - RoleAssignment L2 construct.
 *
 * @remarks
 * This module provides the L2 (developer-friendly layer) construct for Azure role assignments.
 * It wraps the L1 RoleAssignmentArm construct with a cleaner API.
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
exports.RoleAssignment = void 0;
var construct_1 = require("../core/construct");
var role_assignment_arm_1 = require("./role-assignment-arm");
/**
 * L2 construct for Azure role assignments with developer-friendly API.
 *
 * @remarks
 * This is the recommended construct for creating role assignments.
 * It provides a clean API and wraps the L1 RoleAssignmentArm construct.
 *
 * **Key Features**:
 * - Developer-friendly property names
 * - Clean API with sensible defaults
 * - Immutability enforced
 * - Wraps L1 construct for ARM template generation
 *
 * **Design Philosophy**:
 * Role assignments are immutable by design. All configuration must be
 * provided at construction time. This ensures consistency and prevents
 * surprising runtime mutations.
 *
 * @public
 *
 * @example
 * Basic role assignment:
 * ```typescript
 * const assignment = new RoleAssignment(stack, 'BlobReaderRole', {
 *   scope: storageAccount.resourceId,
 *   roleDefinitionId: WellKnownRoleIds.STORAGE_BLOB_DATA_READER,
 *   principalId: vm.principalId,
 *   principalType: PrincipalType.ManagedIdentity,
 *   description: 'VM reads configuration from blob storage'
 * });
 * ```
 *
 * @example
 * With ABAC condition:
 * ```typescript
 * const assignment = new RoleAssignment(stack, 'ConditionalWrite', {
 *   scope: storageAccount.resourceId,
 *   roleDefinitionId: WellKnownRoleIds.STORAGE_BLOB_DATA_CONTRIBUTOR,
 *   principalId: app.principalId,
 *   principalType: PrincipalType.ManagedIdentity,
 *   condition: `@Resource[Microsoft.Storage/storageAccounts/blobServices/containers:name] StringStartsWith 'data-'`,
 *   conditionVersion: '2.0',
 *   description: 'App can only write to data-* containers'
 * });
 * ```
 *
 * @example
 * Establishing dependencies:
 * ```typescript
 * const grant = new RoleAssignment(stack, 'KeyVaultAccess', {
 *   scope: keyVault.resourceId,
 *   roleDefinitionId: WellKnownRoleIds.KEY_VAULT_SECRETS_USER,
 *   principalId: functionApp.principalId,
 *   principalType: PrincipalType.ManagedIdentity
 * });
 *
 * // Ensure function app configuration waits for KeyVault access
 * appSettings.node.addDependency(grant);
 * ```
 */
var RoleAssignment = /** @class */ (function (_super) {
    __extends(RoleAssignment, _super);
    /**
     * Creates a new RoleAssignment instance.
     *
     * @param scope - Parent construct
     * @param id - Unique construct ID
     * @param props - Role assignment properties
     */
    function RoleAssignment(scope, id, props) {
        var _this = _super.call(this, scope, id) || this;
        // Store properties for public access
        _this.roleDefinitionId = props.roleDefinitionId;
        _this.scope = props.scope;
        _this.principalId = props.principalId;
        // Create underlying L1 resource
        _this.armRoleAssignment = new role_assignment_arm_1.RoleAssignmentArm(_this, 'Resource', props);
        _this.roleAssignmentId = _this.armRoleAssignment.resourceId;
        return _this;
    }
    /**
     * Adds a description to the role assignment.
     *
     * @remarks
     * **NOTE**: This method throws an error because role assignments are immutable.
     * Descriptions must be set during construction for immutability.
     *
     * This method exists to satisfy the IGrantResult interface but enforces
     * the immutability principle.
     *
     * @param description - Description to add
     * @throws {Error} Always throws - descriptions must be set at construction
     *
     * @internal
     */
    RoleAssignment.prototype.addDescription = function (description) {
        throw new Error('RoleAssignment is immutable: description must be set during construction. ' +
            "Received: \"".concat(description, "\". ") +
            'Pass description in RoleAssignmentProps instead.');
    };
    /**
     * Adds an Azure ABAC condition to the assignment.
     *
     * @remarks
     * **NOTE**: This method throws an error because role assignments are immutable.
     * Conditions must be set during construction for immutability.
     *
     * This method exists to satisfy the IGrantResult interface but enforces
     * the immutability principle.
     *
     * @param condition - ABAC condition to add
     * @param version - Condition version (default '2.0')
     * @throws {Error} Always throws - conditions must be set at construction
     *
     * @internal
     */
    RoleAssignment.prototype.addCondition = function (condition, version) {
        if (version === void 0) { version = '2.0'; }
        throw new Error('RoleAssignment is immutable: condition must be set during construction. ' +
            "Received: \"".concat(condition, "\" (version: ").concat(version, "). ") +
            'Pass condition and conditionVersion in RoleAssignmentProps instead.');
    };
    Object.defineProperty(RoleAssignment.prototype, "armResource", {
        /**
         * Gets a reference to the underlying L1 construct.
         *
         * @remarks
         * Provides access to the ARM resource for advanced scenarios.
         * Most users should not need to access this.
         *
         * @internal
         */
        get: function () {
            return this.armRoleAssignment;
        },
        enumerable: false,
        configurable: true
    });
    return RoleAssignment;
}(construct_1.Construct));
exports.RoleAssignment = RoleAssignment;
