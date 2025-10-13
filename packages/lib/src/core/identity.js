"use strict";
/**
 * Managed Identity support for Azure resources.
 *
 * @remarks
 * This module provides shared types and utilities for resources that support
 * Azure Managed Identities (both system-assigned and user-assigned).
 *
 * Managed identities eliminate the need for developers to manage credentials by
 * providing an automatically managed identity in Azure AD.
 *
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManagedIdentityType = void 0;
exports.createSystemAssignedIdentity = createSystemAssignedIdentity;
exports.createUserAssignedIdentity = createUserAssignedIdentity;
exports.createSystemAndUserAssignedIdentity = createSystemAndUserAssignedIdentity;
exports.validateManagedIdentity = validateManagedIdentity;
/**
 * Type of managed identity for Azure resources.
 *
 * @remarks
 * - **SystemAssigned**: Azure creates and manages the identity lifecycle
 * - **UserAssigned**: You create and manage the identity separately
 * - **SystemAssigned,UserAssigned**: Both system and user identities
 * - **None**: No managed identity
 */
var ManagedIdentityType;
(function (ManagedIdentityType) {
    /**
     * System-assigned managed identity.
     *
     * @remarks
     * Azure automatically creates and manages this identity.
     * Lifecycle is tied to the resource.
     */
    ManagedIdentityType["SYSTEM_ASSIGNED"] = "SystemAssigned";
    /**
     * User-assigned managed identity.
     *
     * @remarks
     * You create and manage this identity as a separate Azure resource.
     * Can be shared across multiple resources.
     */
    ManagedIdentityType["USER_ASSIGNED"] = "UserAssigned";
    /**
     * Both system-assigned and user-assigned identities.
     *
     * @remarks
     * Combines both identity types on the same resource.
     */
    ManagedIdentityType["SYSTEM_ASSIGNED_USER_ASSIGNED"] = "SystemAssigned,UserAssigned";
    /**
     * No managed identity.
     */
    ManagedIdentityType["NONE"] = "None";
})(ManagedIdentityType || (exports.ManagedIdentityType = ManagedIdentityType = {}));
/**
 * Helper function to create a system-assigned identity configuration.
 *
 * @returns Managed identity configured for system-assigned
 *
 * @example
 * ```typescript
 * const app = new AppService(rg, 'WebApp', {
 *   serverFarmId: plan.planId,
 *   identity: createSystemAssignedIdentity()
 * });
 * ```
 */
function createSystemAssignedIdentity() {
    return {
        type: ManagedIdentityType.SYSTEM_ASSIGNED,
    };
}
/**
 * Helper function to create a user-assigned identity configuration.
 *
 * @param identityIds - Resource IDs of user-assigned identities
 * @returns Managed identity configured for user-assigned
 *
 * @example
 * ```typescript
 * const app = new AppService(rg, 'WebApp', {
 *   serverFarmId: plan.planId,
 *   identity: createUserAssignedIdentity([
 *     '/subscriptions/.../userAssignedIdentities/my-identity'
 *   ])
 * });
 * ```
 */
function createUserAssignedIdentity(identityIds) {
    var userAssignedIdentities = {};
    for (var _i = 0, identityIds_1 = identityIds; _i < identityIds_1.length; _i++) {
        var id = identityIds_1[_i];
        userAssignedIdentities[id] = {};
    }
    return {
        type: ManagedIdentityType.USER_ASSIGNED,
        userAssignedIdentities: userAssignedIdentities,
    };
}
/**
 * Helper function to create a combined system and user-assigned identity configuration.
 *
 * @param identityIds - Resource IDs of user-assigned identities
 * @returns Managed identity configured for both system and user-assigned
 *
 * @example
 * ```typescript
 * const app = new AppService(rg, 'WebApp', {
 *   serverFarmId: plan.planId,
 *   identity: createSystemAndUserAssignedIdentity([
 *     '/subscriptions/.../userAssignedIdentities/my-identity'
 *   ])
 * });
 * ```
 */
function createSystemAndUserAssignedIdentity(identityIds) {
    var userAssignedIdentities = {};
    for (var _i = 0, identityIds_2 = identityIds; _i < identityIds_2.length; _i++) {
        var id = identityIds_2[_i];
        userAssignedIdentities[id] = {};
    }
    return {
        type: ManagedIdentityType.SYSTEM_ASSIGNED_USER_ASSIGNED,
        userAssignedIdentities: userAssignedIdentities,
    };
}
/**
 * Helper function to validate managed identity configuration.
 *
 * @param identity - Managed identity configuration to validate
 * @throws Error if configuration is invalid
 *
 * @internal
 */
function validateManagedIdentity(identity) {
    if (!identity) {
        return;
    }
    var type = identity.type, userAssignedIdentities = identity.userAssignedIdentities;
    // Validate that user-assigned identities are provided when type includes UserAssigned
    if ((type === ManagedIdentityType.USER_ASSIGNED ||
        type === ManagedIdentityType.SYSTEM_ASSIGNED_USER_ASSIGNED) &&
        (!userAssignedIdentities || Object.keys(userAssignedIdentities).length === 0)) {
        throw new Error("User-assigned identities must be provided when identity type is '".concat(type, "'"));
    }
    // Validate that user-assigned identities are NOT provided when type is SystemAssigned or None
    if ((type === ManagedIdentityType.SYSTEM_ASSIGNED || type === ManagedIdentityType.NONE) &&
        userAssignedIdentities &&
        Object.keys(userAssignedIdentities).length > 0) {
        throw new Error("User-assigned identities should not be provided when identity type is '".concat(type, "'"));
    }
    // Validate resource ID format for user-assigned identities
    if (userAssignedIdentities) {
        for (var _i = 0, _a = Object.keys(userAssignedIdentities); _i < _a.length; _i++) {
            var identityId = _a[_i];
            if (!identityId.includes('/providers/Microsoft.ManagedIdentity/userAssignedIdentities/')) {
                throw new Error("Invalid user-assigned identity resource ID: ".concat(identityId, ". ") +
                    "Expected format: /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.ManagedIdentity/userAssignedIdentities/{name}");
            }
        }
    }
}
