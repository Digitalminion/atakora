/**
 * Management Group Stack for Azure CDK.
 *
 * @packageDocumentation
 */
import { Construct } from './construct';
import type { App } from './app';
import { DeploymentScope } from './azure/scopes';
/**
 * Props for ManagementGroupStack.
 *
 * @public
 */
export interface ManagementGroupStackProps {
    /**
     * Management group ID or name.
     *
     * @remarks
     * Can be either the management group name or full ID.
     * Full ID format: /providers/Microsoft.Management/managementGroups/{groupId}
     */
    readonly managementGroupId: string;
    /**
     * Display name for the management group deployment.
     *
     * @remarks
     * Optional. Used for documentation purposes.
     */
    readonly displayName?: string;
    /**
     * Description of the management group deployment.
     */
    readonly description?: string;
}
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
export declare class ManagementGroupStack extends Construct {
    /**
     * Deployment scope (always ManagementGroup).
     */
    readonly scope: DeploymentScope.ManagementGroup;
    /**
     * Management group ID.
     *
     * @remarks
     * Normalized to the full resource ID format.
     */
    readonly managementGroupId: string;
    /**
     * Display name for the management group.
     */
    readonly displayName?: string;
    /**
     * Description of the deployment.
     */
    readonly description?: string;
    /**
     * Creates a new ManagementGroupStack.
     *
     * @param app - Parent App construct
     * @param id - Stack identifier
     * @param props - Stack properties
     */
    constructor(app: App, id: string, props: ManagementGroupStackProps);
    /**
     * Normalizes management group ID to full resource ID format.
     *
     * @param id - Management group ID or name
     * @returns Full resource ID
     * @internal
     */
    private normalizeManagementGroupId;
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
    getManagementGroupName(): string;
}
//# sourceMappingURL=management-group-stack.d.ts.map