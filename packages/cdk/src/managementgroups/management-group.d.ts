/**
 * Azure Management Group - L2 construct.
 *
 * @packageDocumentation
 */
import { Construct } from '@atakora/lib';
import { ManagementGroupProps } from './management-group-types';
/**
 * L2 construct for Azure Management Groups.
 *
 * @remarks
 * Creates and manages Azure management group hierarchy for organizing subscriptions.
 *
 * **Management Groups vs Subscriptions**:
 * - **Management Groups**: Organizational containers that hold subscriptions
 * - **Subscriptions**: Billing boundaries that hold resources
 *
 * **Hierarchy Levels**:
 * ```
 * Tenant Root Group
 * └── Custom Management Groups (up to 6 levels deep)
 *     └── Subscriptions
 *         └── Resource Groups
 *             └── Resources
 * ```
 *
 * **Use Cases**:
 * - **Organizational Structure**: Mirror company org chart (departments, teams)
 * - **Environment Separation**: Production, Development, Sandbox
 * - **Policy Inheritance**: Apply policies at high level, inherited by all children
 * - **RBAC at Scale**: Grant access to groups of subscriptions
 * - **Cost Management**: Track spending by department/team
 *
 * **Best Practices**:
 * 1. **Start Simple**: Don't over-complicate the hierarchy
 * 2. **Align with Organization**: Mirror your company structure
 * 3. **Plan for Growth**: Leave room for new subscriptions
 * 4. **Document Purpose**: Use clear display names and descriptions
 * 5. **Limit Depth**: Azure allows 6 levels, but 2-3 is usually sufficient
 *
 * @public
 *
 * @example
 * Create a simple hierarchy:
 * ```typescript
 * import { App, ManagementGroupStack } from '@atakora/cdk';
 * import { ManagementGroup } from '@atakora/cdk/managementgroups';
 *
 * const app = new App();
 *
 * // Stack for creating management groups (at tenant scope)
 * const tenantStack = new ManagementGroupStack(app, 'TenantMGs', {
 *   managementGroupId: 'root'
 * });
 *
 * // Top-level: Environment-based
 * const production = new ManagementGroup(tenantStack, 'Production', {
 *   name: 'mg-production',
 *   displayName: 'Production',
 *   description: 'All production subscriptions',
 *   parentId: '/providers/Microsoft.Management/managementGroups/root'
 * });
 *
 * const development = new ManagementGroup(tenantStack, 'Development', {
 *   name: 'mg-development',
 *   displayName: 'Development',
 *   description: 'All development subscriptions'
 * });
 * ```
 *
 * @example
 * Create a department-based hierarchy:
 * ```typescript
 * // Top-level: Departments
 * const engineering = new ManagementGroup(tenantStack, 'Engineering', {
 *   name: 'mg-engineering',
 *   displayName: 'Engineering Department',
 *   description: 'Engineering team subscriptions'
 * });
 *
 * const finance = new ManagementGroup(tenantStack, 'Finance', {
 *   name: 'mg-finance',
 *   displayName: 'Finance Department',
 *   description: 'Finance team subscriptions'
 * });
 *
 * // Second level: Engineering sub-teams
 * const engPlatform = new ManagementGroup(tenantStack, 'EngPlatform', {
 *   name: 'mg-eng-platform',
 *   displayName: 'Platform Team',
 *   description: 'Platform engineering subscriptions',
 *   parentId: engineering.managementGroupId
 * });
 *
 * const engProduct = new ManagementGroup(tenantStack, 'EngProduct', {
 *   name: 'mg-eng-product',
 *   displayName: 'Product Team',
 *   description: 'Product engineering subscriptions',
 *   parentId: engineering.managementGroupId
 * });
 * ```
 *
 * @example
 * Multi-level environment hierarchy:
 * ```typescript
 * // Level 1: Business units
 * const retail = new ManagementGroup(tenantStack, 'Retail', {
 *   name: 'mg-retail',
 *   displayName: 'Retail Business Unit'
 * });
 *
 * // Level 2: Environments within business unit
 * const retailProd = new ManagementGroup(tenantStack, 'RetailProd', {
 *   name: 'mg-retail-prod',
 *   displayName: 'Retail - Production',
 *   parentId: retail.managementGroupId
 * });
 *
 * const retailDev = new ManagementGroup(tenantStack, 'RetailDev', {
 *   name: 'mg-retail-dev',
 *   displayName: 'Retail - Development',
 *   parentId: retail.managementGroupId
 * });
 *
 * // Level 3: Applications within environment
 * const retailProdWebsite = new ManagementGroup(tenantStack, 'RetailProdWebsite', {
 *   name: 'mg-retail-prod-website',
 *   displayName: 'Retail Production - Website',
 *   description: 'Subscriptions for retail website production',
 *   parentId: retailProd.managementGroupId
 * });
 * ```
 *
 * @example
 * Apply policies to management group hierarchy:
 * ```typescript
 * import { PolicyAssignment, WellKnownPolicyIds } from '@atakora/cdk/policy';
 *
 * // Create management group
 * const production = new ManagementGroup(tenantStack, 'Production', {
 *   name: 'mg-production',
 *   displayName: 'Production'
 * });
 *
 * // Create stack for deploying TO the management group
 * const prodPolicyStack = new ManagementGroupStack(app, 'ProdPolicies', {
 *   managementGroupId: 'mg-production'
 * });
 *
 * // Apply policy - inherited by all child subscriptions
 * new PolicyAssignment(prodPolicyStack, 'RequireHTTPS', {
 *   policyDefinitionId: WellKnownPolicyIds.STORAGE_HTTPS_ONLY,
 *   displayName: 'Require HTTPS in production'
 * });
 * ```
 */
export declare class ManagementGroup extends Construct {
    /**
     * Underlying L1 construct.
     * @internal
     */
    private readonly armManagementGroup;
    /**
     * Management group name (ID).
     */
    readonly managementGroupName: string;
    /**
     * Full management group resource ID.
     */
    readonly managementGroupId: string;
    /**
     * Display name of the management group.
     */
    readonly displayName: string;
    /**
     * Creates a new ManagementGroup.
     *
     * @param scope - Parent construct (typically ManagementGroupStack or TenantStack)
     * @param id - Unique construct ID
     * @param props - Management group properties
     *
     * @throws {Error} If name is invalid
     * @throws {Error} If displayName exceeds length limit
     */
    constructor(scope: Construct, id: string, props: ManagementGroupProps);
    /**
     * Gets the management group name from the full resource ID.
     *
     * @returns Management group name
     *
     * @example
     * ```typescript
     * const mg = new ManagementGroup(stack, 'MG', {
     *   name: 'mg-production',
     *   displayName: 'Production'
     * });
     *
     * console.log(mg.getManagementGroupName()); // 'mg-production'
     * ```
     */
    getManagementGroupName(): string;
}
//# sourceMappingURL=management-group.d.ts.map