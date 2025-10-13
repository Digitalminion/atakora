/**
 * Azure ARM deployment scopes.
 *
 * @remarks
 * Defines the hierarchy of Azure deployment scopes from tenant down to resource group.
 * Each scope has its own ARM template schema and allowed resource types.
 *
 * @see {@link https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/scope-functions}
 */
export declare enum DeploymentScope {
    /**
     * Tenant scope - Azure AD/Entra ID level.
     * Schema: https://schema.management.azure.com/schemas/2019-08-01/tenantDeploymentTemplate.json#
     */
    Tenant = "tenant",
    /**
     * Management Group scope - Organizational grouping.
     * Schema: https://schema.management.azure.com/schemas/2019-08-01/managementGroupDeploymentTemplate.json#
     */
    ManagementGroup = "managementGroup",
    /**
     * Subscription scope - Billing boundary, contains resource groups.
     * Schema: https://schema.management.azure.com/schemas/2018-05-01/subscriptionDeploymentTemplate.json#
     */
    Subscription = "subscription",
    /**
     * Resource Group scope - Logical container for resources.
     * Schema: https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#
     */
    ResourceGroup = "resourceGroup"
}
/**
 * Get ARM template schema URL for a deployment scope.
 *
 * @param scope - Deployment scope
 * @returns ARM template schema URL
 *
 * @example
 * ```typescript
 * const schema = getSchemaForScope(DeploymentScope.Subscription);
 * // Returns: "https://schema.management.azure.com/schemas/2018-05-01/subscriptionDeploymentTemplate.json#"
 * ```
 */
export declare function getSchemaForScope(scope: DeploymentScope): string;
/**
 * Check if a scope can contain another scope.
 *
 * @param parent - Parent scope
 * @param child - Child scope
 * @returns True if parent can contain child
 *
 * @example
 * ```typescript
 * canContain(DeploymentScope.Subscription, DeploymentScope.ResourceGroup); // true
 * canContain(DeploymentScope.ResourceGroup, DeploymentScope.Subscription); // false
 * ```
 */
export declare function canContain(parent: DeploymentScope, child: DeploymentScope): boolean;
/**
 * Resources available at each deployment scope.
 *
 * @remarks
 * This is a representative list, not exhaustive.
 * Based on Azure ARM resource provider documentation.
 *
 * @see {@link https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/azure-services-resource-providers}
 */
export declare const SCOPE_AVAILABLE_RESOURCES: Record<DeploymentScope, string[]>;
/**
 * Get the parent scope for a given scope.
 *
 * @param scope - Current scope
 * @returns Parent scope or undefined if at top level (Tenant)
 *
 * @example
 * ```typescript
 * getParentScope(DeploymentScope.ResourceGroup);   // DeploymentScope.Subscription
 * getParentScope(DeploymentScope.Subscription);    // DeploymentScope.ManagementGroup
 * getParentScope(DeploymentScope.Tenant);          // undefined
 * ```
 */
export declare function getParentScope(scope: DeploymentScope): DeploymentScope | undefined;
/**
 * Get all child scopes that a scope can contain.
 *
 * @param scope - Parent scope
 * @returns Array of child scopes
 *
 * @example
 * ```typescript
 * getChildScopes(DeploymentScope.Subscription);
 * // Returns: [DeploymentScope.ResourceGroup]
 * ```
 */
export declare function getChildScopes(scope: DeploymentScope): DeploymentScope[];
//# sourceMappingURL=scopes.d.ts.map