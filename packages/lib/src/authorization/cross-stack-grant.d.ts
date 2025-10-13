/**
 * Azure RBAC - Cross-Stack Grant Utility.
 *
 * @remarks
 * This module provides utilities for creating role assignments across stack boundaries.
 * When granting permissions to resources in different stacks, the principal ID and resource
 * IDs may not be available until deployment. This utility handles token resolution and
 * dependency management for cross-stack grants.
 *
 * **Key Concepts**:
 * - **Cross-Stack Grants**: Role assignments where the resource and grantee exist in different stacks
 * - **Token Resolution**: Azure ARM templates handle references automatically through expressions
 * - **Dependency Management**: The construct system ensures proper deployment ordering
 *
 * **When to Use**:
 * - Granting a Function App in Stack A access to Storage in Stack B
 * - Granting an Identity in Stack A access to KeyVault in Stack B
 * - Any scenario where resources span multiple deployment stacks
 *
 * @packageDocumentation
 */
import { Construct } from '../core/construct';
import { IGrantable } from '../core/grants';
import { RoleAssignment } from './role-assignment';
/**
 * Resource with an Azure resource ID.
 *
 * @remarks
 * Minimal interface for resources that can be granted access to.
 * The resourceId can be a static string or an ARM template reference expression.
 *
 * @public
 */
export interface IResourceWithId {
    /**
     * Azure resource ID.
     *
     * @remarks
     * Can be:
     * - A static resource ID string
     * - An ARM reference expression that resolves at deployment time
     */
    readonly resourceId: string;
}
/**
 * Properties for creating a cross-stack grant.
 *
 * @public
 */
export interface CrossStackGrantProps {
    /**
     * Resource to grant access to.
     *
     * @remarks
     * Must have a resourceId property. The ID can be a reference expression
     * that resolves during deployment.
     */
    readonly resource: IResourceWithId;
    /**
     * Identity receiving the grant.
     *
     * @remarks
     * The grantee's principalId can be a reference expression that resolves
     * during deployment, enabling cross-stack grants.
     */
    readonly grantee: IGrantable;
    /**
     * Role definition ID to assign.
     *
     * @remarks
     * Use WellKnownRoleIds for built-in roles or provide a custom role ID.
     *
     * @example
     * ```typescript
     * roleDefinitionId: WellKnownRoleIds.STORAGE_BLOB_DATA_READER
     * ```
     */
    readonly roleDefinitionId: string;
    /**
     * Optional description for the assignment.
     *
     * @remarks
     * Helpful for documenting cross-stack grant purposes.
     * Maximum 1024 characters.
     *
     * @example
     * ```typescript
     * description: 'Cross-stack blob read access for function app processing'
     * ```
     */
    readonly description?: string;
}
/**
 * Properties for creating multiple cross-stack grants.
 *
 * @public
 */
export interface CrossStackGrantMultipleProps {
    /**
     * Resource to grant access to.
     */
    readonly resource: IResourceWithId;
    /**
     * Role definition ID to assign.
     */
    readonly roleDefinitionId: string;
    /**
     * Optional description for the assignment.
     */
    readonly description?: string;
}
/**
 * Utility for creating role assignments across stack boundaries.
 *
 * @remarks
 * When granting permissions to resources in different stacks, the principal ID
 * and resource IDs may not be available until deployment. This utility handles
 * token resolution and dependency management for cross-stack grants.
 *
 * **How It Works**:
 * 1. Accepts resource IDs and principal IDs as strings (which may contain ARM expressions)
 * 2. Creates RoleAssignment constructs in the target stack
 * 3. Azure ARM handles reference resolution during deployment
 * 4. Construct system ensures proper deployment ordering
 *
 * **Design Philosophy**:
 * - Simplicity: Just create role assignments in the right stack
 * - Rely on Azure ARM's built-in reference resolution
 * - Maintain type safety through interfaces
 * - Enable explicit dependency management when needed
 *
 * @public
 *
 * @example
 * Basic cross-stack grant:
 * ```typescript
 * // Stack A: Storage account
 * const stackA = new SubscriptionStack(app, 'StorageStack', { ... });
 * const storage = new StorageAccounts(stackA, 'Storage', {
 *   storageAccountName: 'mystorageaccount',
 *   location: 'eastus'
 * });
 *
 * // Stack B: Function app
 * const stackB = new SubscriptionStack(app, 'ComputeStack', { ... });
 * const functionApp = new FunctionApp(stackB, 'Function', { ... });
 *
 * // Cross-stack grant: Create in stack where grantee lives
 * CrossStackGrant.create(stackB, 'StorageGrant', {
 *   resource: storage,
 *   grantee: functionApp,
 *   roleDefinitionId: WellKnownRoleIds.STORAGE_BLOB_DATA_READER,
 *   description: 'Function app reads blobs from shared storage'
 * });
 * ```
 *
 * @example
 * Multiple grants to same resource:
 * ```typescript
 * const stackA = new SubscriptionStack(app, 'DataStack', { ... });
 * const keyVault = new Vaults(stackA, 'Vault', { ... });
 * const cosmos = new DatabaseAccounts(stackA, 'Cosmos', { ... });
 *
 * const stackB = new SubscriptionStack(app, 'AppStack', { ... });
 * const functionApp = new FunctionApp(stackB, 'Function', { ... });
 *
 * // Grant access to multiple resources in data stack
 * CrossStackGrant.createMultiple(stackB, 'DataAccess', functionApp, [
 *   {
 *     resource: keyVault,
 *     roleDefinitionId: WellKnownRoleIds.KEY_VAULT_SECRETS_USER,
 *     description: 'Read secrets from shared vault'
 *   },
 *   {
 *     resource: cosmos,
 *     roleDefinitionId: WellKnownRoleIds.COSMOS_DB_DATA_READER,
 *     description: 'Read data from shared cosmos'
 *   }
 * ]);
 * ```
 *
 * @example
 * With explicit dependencies:
 * ```typescript
 * const grant = CrossStackGrant.create(stackB, 'KeyVaultGrant', {
 *   resource: keyVault,
 *   grantee: functionApp,
 *   roleDefinitionId: WellKnownRoleIds.KEY_VAULT_SECRETS_USER
 * });
 *
 * // Ensure function app configuration waits for grant
 * functionAppConfig.node.addDependency(grant);
 * ```
 */
export declare class CrossStackGrant {
    /**
     * Creates a role assignment for cross-stack scenarios.
     *
     * @remarks
     * Creates the role assignment in the specified stack. Best practice is to
     * create the assignment in the stack where the grantee (principal) lives.
     *
     * **Token Resolution**:
     * - Resource IDs can be ARM reference expressions like `[resourceId('...')]`
     * - Principal IDs can be ARM reference expressions like `[reference('...').principalId]`
     * - Azure ARM automatically resolves these during deployment
     *
     * **Deployment Ordering**:
     * - The construct system tracks dependencies automatically
     * - You can add explicit dependencies using `node.addDependency()` if needed
     *
     * @param scope - The stack where the role assignment should be created
     * @param id - Construct ID for the role assignment
     * @param props - Grant configuration
     * @returns The created role assignment construct
     *
     * @example
     * ```typescript
     * const grant = CrossStackGrant.create(functionStack, 'StorageAccess', {
     *   resource: storageAccount, // from different stack
     *   grantee: functionApp,      // from current stack
     *   roleDefinitionId: WellKnownRoleIds.STORAGE_BLOB_DATA_READER,
     *   description: 'Cross-stack blob read access'
     * });
     * ```
     */
    static create(scope: Construct, id: string, props: CrossStackGrantProps): RoleAssignment;
    /**
     * Creates multiple role assignments for the same grantee across different resources.
     *
     * @remarks
     * Convenient method for granting a single identity access to multiple resources
     * in different stacks. Each grant gets a unique ID by appending the index.
     *
     * **Naming Convention**:
     * - Base ID: `DataAccess`
     * - Generated IDs: `DataAccess0`, `DataAccess1`, `DataAccess2`, etc.
     *
     * **Use Cases**:
     * - Function app needs access to multiple data services
     * - Application identity needs multiple KeyVault and Storage permissions
     * - Service principal requires access to shared infrastructure
     *
     * @param scope - The stack where role assignments should be created
     * @param baseId - Base construct ID (will be suffixed with index)
     * @param grantee - Identity receiving all grants
     * @param grants - Array of resource/role pairs
     * @returns Array of created role assignments
     *
     * @example
     * ```typescript
     * const assignments = CrossStackGrant.createMultiple(
     *   appStack,
     *   'SharedResourceAccess',
     *   functionApp,
     *   [
     *     {
     *       resource: storageAccount,
     *       roleDefinitionId: WellKnownRoleIds.STORAGE_BLOB_DATA_READER,
     *       description: 'Read blobs'
     *     },
     *     {
     *       resource: keyVault,
     *       roleDefinitionId: WellKnownRoleIds.KEY_VAULT_SECRETS_USER,
     *       description: 'Read secrets'
     *     },
     *     {
     *       resource: cosmosDb,
     *       roleDefinitionId: WellKnownRoleIds.COSMOS_DB_DATA_READER,
     *       description: 'Read cosmos data'
     *     }
     *   ]
     * );
     *
     * // All assignments created: SharedResourceAccess0, SharedResourceAccess1, SharedResourceAccess2
     * ```
     */
    static createMultiple(scope: Construct, baseId: string, grantee: IGrantable, grants: ReadonlyArray<CrossStackGrantMultipleProps>): RoleAssignment[];
}
//# sourceMappingURL=cross-stack-grant.d.ts.map