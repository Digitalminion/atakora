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
/**
 * Type of managed identity for Azure resources.
 *
 * @remarks
 * - **SystemAssigned**: Azure creates and manages the identity lifecycle
 * - **UserAssigned**: You create and manage the identity separately
 * - **SystemAssigned,UserAssigned**: Both system and user identities
 * - **None**: No managed identity
 */
export declare enum ManagedIdentityType {
    /**
     * System-assigned managed identity.
     *
     * @remarks
     * Azure automatically creates and manages this identity.
     * Lifecycle is tied to the resource.
     */
    SYSTEM_ASSIGNED = "SystemAssigned",
    /**
     * User-assigned managed identity.
     *
     * @remarks
     * You create and manage this identity as a separate Azure resource.
     * Can be shared across multiple resources.
     */
    USER_ASSIGNED = "UserAssigned",
    /**
     * Both system-assigned and user-assigned identities.
     *
     * @remarks
     * Combines both identity types on the same resource.
     */
    SYSTEM_ASSIGNED_USER_ASSIGNED = "SystemAssigned,UserAssigned",
    /**
     * No managed identity.
     */
    NONE = "None"
}
/**
 * Managed service identity configuration for Azure resources.
 *
 * @remarks
 * Used to configure managed identities on resources that support them,
 * such as:
 * - App Service / Function Apps
 * - Virtual Machines
 * - Azure Container Instances
 * - Azure Kubernetes Service
 * - Logic Apps
 * - Azure Data Factory
 *
 * @example
 * System-assigned identity:
 * ```typescript
 * const identity: ManagedServiceIdentity = {
 *   type: ManagedIdentityType.SYSTEM_ASSIGNED
 * };
 * ```
 *
 * @example
 * User-assigned identity:
 * ```typescript
 * const identity: ManagedServiceIdentity = {
 *   type: ManagedIdentityType.USER_ASSIGNED,
 *   userAssignedIdentities: {
 *     '/subscriptions/.../resourceGroups/.../providers/Microsoft.ManagedIdentity/userAssignedIdentities/my-identity': {}
 *   }
 * };
 * ```
 *
 * @example
 * Both system and user-assigned:
 * ```typescript
 * const identity: ManagedServiceIdentity = {
 *   type: ManagedIdentityType.SYSTEM_ASSIGNED_USER_ASSIGNED,
 *   userAssignedIdentities: {
 *     '/subscriptions/.../resourceGroups/.../providers/Microsoft.ManagedIdentity/userAssignedIdentities/my-identity': {}
 *   }
 * };
 * ```
 */
export interface ManagedServiceIdentity {
    /**
     * Type of managed identity.
     */
    readonly type: ManagedIdentityType;
    /**
     * User-assigned identity resource IDs.
     *
     * @remarks
     * Map of user-assigned identity resource IDs to empty objects.
     * Required when type includes UserAssigned.
     *
     * Format:
     * ```
     * {
     *   "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.ManagedIdentity/userAssignedIdentities/{name}": {}
     * }
     * ```
     */
    readonly userAssignedIdentities?: Record<string, UserAssignedIdentityValue>;
}
/**
 * Value for user-assigned identity in the userAssignedIdentities map.
 *
 * @remarks
 * Currently an empty object, but defined as a type for future extensibility.
 * Azure may add properties in the future (e.g., clientId, principalId in responses).
 */
export interface UserAssignedIdentityValue {
}
/**
 * Interface for resources that support managed identities.
 *
 * @remarks
 * Implement this interface on resources that support Azure Managed Identities.
 * This provides a consistent API across all identity-enabled resources.
 */
export interface IIdentityResource {
    /**
     * Managed service identity configuration.
     */
    readonly identity?: ManagedServiceIdentity;
}
/**
 * Props mixin for resources that support managed identities.
 *
 * @remarks
 * Use this in resource props interfaces to add identity support:
 *
 * @example
 * ```typescript
 * export interface MyResourceProps extends IdentityResourceProps {
 *   // ... other props
 * }
 * ```
 */
export interface IdentityResourceProps {
    /**
     * Managed service identity configuration.
     *
     * @remarks
     * Configures managed identity for the resource.
     *
     * For most resources, defaults to system-assigned identity when not specified.
     * Check the specific resource documentation for default behavior.
     */
    readonly identity?: ManagedServiceIdentity;
}
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
export declare function createSystemAssignedIdentity(): ManagedServiceIdentity;
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
export declare function createUserAssignedIdentity(identityIds: string[]): ManagedServiceIdentity;
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
export declare function createSystemAndUserAssignedIdentity(identityIds: string[]): ManagedServiceIdentity;
/**
 * Helper function to validate managed identity configuration.
 *
 * @param identity - Managed identity configuration to validate
 * @throws Error if configuration is invalid
 *
 * @internal
 */
export declare function validateManagedIdentity(identity?: ManagedServiceIdentity): void;
//# sourceMappingURL=identity.d.ts.map