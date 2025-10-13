"use strict";
/**
 * Azure RBAC grant system - Error classes.
 *
 * @remarks
 * This module defines specialized error types for grant operations.
 * All errors extend ValidationError to maintain consistency with the
 * framework's validation system.
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
exports.InvalidRoleAssignmentError = exports.MissingIdentityError = exports.GrantError = void 0;
var validation_1 = require("../validation");
/**
 * Error thrown when grant operations fail.
 *
 * @remarks
 * Base error class for all grant-related errors.
 * Provides structured error information with context-aware messages.
 *
 * **Error Structure**:
 * - **message**: Short description of the problem
 * - **details**: Detailed explanation of what went wrong
 * - **suggestion**: Recommended remediation steps
 *
 * @public
 *
 * @example
 * ```typescript
 * throw new GrantError(
 *   'Failed to create role assignment',
 *   'Role definition ID is invalid or does not exist',
 *   'Verify the role definition exists and you have permission to assign it'
 * );
 * ```
 */
var GrantError = /** @class */ (function (_super) {
    __extends(GrantError, _super);
    /**
     * Creates a new GrantError.
     *
     * @param message - Short description of the problem
     * @param details - Detailed explanation of what went wrong
     * @param suggestion - Suggested fix or remediation steps
     */
    function GrantError(message, details, suggestion) {
        var _this = _super.call(this, message, details, suggestion) || this;
        _this.name = 'GrantError';
        return _this;
    }
    return GrantError;
}(validation_1.ValidationError));
exports.GrantError = GrantError;
/**
 * Error thrown when a resource doesn't have a managed identity.
 *
 * @remarks
 * This error indicates that a grant operation was attempted on a resource
 * that doesn't implement IGrantable or doesn't have an identity configured.
 *
 * **Common Causes**:
 * - Resource doesn't have managed identity enabled
 * - Resource type doesn't support managed identities
 * - Identity configuration is incomplete
 *
 * **Resolution Steps**:
 * 1. Enable system-assigned or user-assigned identity on the resource
 * 2. Verify the resource type supports managed identities
 * 3. Use an explicit identity construct if the resource doesn't support identities
 *
 * @public
 *
 * @example
 * Thrown when attempting to grant to a resource without identity:
 * ```typescript
 * const storage = new StorageAccount(stack, 'Storage', {
 *   // No identity configured
 * });
 *
 * const vm = new VirtualMachine(stack, 'VM', {
 *   // No identity configured
 * });
 *
 * // This will throw MissingIdentityError
 * storage.grantRead(vm);
 * ```
 *
 * @example
 * Correct usage with identity:
 * ```typescript
 * const vm = new VirtualMachine(stack, 'VM', {
 *   identity: { type: ManagedIdentityType.SystemAssigned }
 * });
 *
 * // Now this works
 * storage.grantRead(vm);
 * ```
 */
var MissingIdentityError = /** @class */ (function (_super) {
    __extends(MissingIdentityError, _super);
    /**
     * Creates a new MissingIdentityError.
     *
     * @param resourceId - Identifier of the resource missing an identity
     *
     * @example
     * ```typescript
     * if (!resource.identity) {
     *   throw new MissingIdentityError(resource.node.path);
     * }
     * ```
     */
    function MissingIdentityError(resourceId) {
        var _this = _super.call(this, "Resource '".concat(resourceId, "' does not have a managed identity"), 'Grant operations require the grantee to have a managed identity', 'Enable a managed identity on the resource or use an explicit identity construct') || this;
        _this.name = 'MissingIdentityError';
        return _this;
    }
    return MissingIdentityError;
}(GrantError));
exports.MissingIdentityError = MissingIdentityError;
/**
 * Error thrown when role assignment validation fails.
 *
 * @remarks
 * This error indicates that the role assignment configuration is invalid
 * according to Azure RBAC rules.
 *
 * **Common Validation Failures**:
 * - Invalid role definition ID format
 * - Invalid principal ID (not a valid GUID)
 * - Invalid principal type for the given identity
 * - Scope is not a valid Azure resource ID
 * - ABAC condition syntax errors
 * - Role doesn't support conditions
 * - Cross-tenant assignment without tenant ID
 *
 * **Azure Requirements**:
 * - Principal ID must be a valid GUID
 * - Role definition ID must be a valid Azure resource ID
 * - Scope must be a valid Azure resource ID
 * - ABAC conditions must use version 2.0 syntax
 * - Only data plane roles support conditions
 *
 * @public
 *
 * @example
 * Invalid principal ID:
 * ```typescript
 * throw new InvalidRoleAssignmentError(
 *   'Invalid principal ID format',
 *   'Principal ID must be a valid GUID'
 * );
 * ```
 *
 * @example
 * Invalid ABAC condition:
 * ```typescript
 * throw new InvalidRoleAssignmentError(
 *   'Role does not support conditions',
 *   'Storage Blob Data Reader supports conditions, but Reader does not'
 * );
 * ```
 *
 * @example
 * Missing tenant ID for cross-tenant:
 * ```typescript
 * throw new InvalidRoleAssignmentError(
 *   'Cross-tenant assignment requires tenant ID',
 *   'When using PrincipalType.ForeignGroup, tenantId must be specified'
 * );
 * ```
 */
var InvalidRoleAssignmentError = /** @class */ (function (_super) {
    __extends(InvalidRoleAssignmentError, _super);
    /**
     * Creates a new InvalidRoleAssignmentError.
     *
     * @param message - Short description of the validation failure
     * @param details - Detailed explanation of what is invalid
     *
     * @example
     * ```typescript
     * if (!isValidGuid(principalId)) {
     *   throw new InvalidRoleAssignmentError(
     *     'Invalid principal ID format',
     *     `Expected a valid GUID, got: ${principalId}`
     *   );
     * }
     * ```
     *
     * @example
     * ```typescript
     * if (principalType === PrincipalType.ForeignGroup && !tenantId) {
     *   throw new InvalidRoleAssignmentError(
     *     'Missing tenant ID for foreign group',
     *     'ForeignGroup principal type requires tenantId to be specified'
     *   );
     * }
     * ```
     */
    function InvalidRoleAssignmentError(message, details) {
        var _this = _super.call(this, message, details, 'Check the Azure RBAC documentation for valid role assignment configurations') || this;
        _this.name = 'InvalidRoleAssignmentError';
        return _this;
    }
    return InvalidRoleAssignmentError;
}(GrantError));
exports.InvalidRoleAssignmentError = InvalidRoleAssignmentError;
