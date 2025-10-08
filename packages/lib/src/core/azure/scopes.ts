/**
 * Azure ARM deployment scopes.
 *
 * @remarks
 * Defines the hierarchy of Azure deployment scopes from tenant down to resource group.
 * Each scope has its own ARM template schema and allowed resource types.
 *
 * @see {@link https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/scope-functions}
 */
export enum DeploymentScope {
  /**
   * Tenant scope - Azure AD/Entra ID level.
   * Schema: https://schema.management.azure.com/schemas/2019-08-01/tenantDeploymentTemplate.json#
   */
  Tenant = 'tenant',

  /**
   * Management Group scope - Organizational grouping.
   * Schema: https://schema.management.azure.com/schemas/2019-08-01/managementGroupDeploymentTemplate.json#
   */
  ManagementGroup = 'managementGroup',

  /**
   * Subscription scope - Billing boundary, contains resource groups.
   * Schema: https://schema.management.azure.com/schemas/2018-05-01/subscriptionDeploymentTemplate.json#
   */
  Subscription = 'subscription',

  /**
   * Resource Group scope - Logical container for resources.
   * Schema: https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#
   */
  ResourceGroup = 'resourceGroup',
}

/**
 * ARM template schema URLs for each deployment scope.
 */
const SCOPE_SCHEMAS: Record<DeploymentScope, string> = {
  [DeploymentScope.Tenant]:
    'https://schema.management.azure.com/schemas/2019-08-01/tenantDeploymentTemplate.json#',
  [DeploymentScope.ManagementGroup]:
    'https://schema.management.azure.com/schemas/2019-08-01/managementGroupDeploymentTemplate.json#',
  [DeploymentScope.Subscription]:
    'https://schema.management.azure.com/schemas/2018-05-01/subscriptionDeploymentTemplate.json#',
  [DeploymentScope.ResourceGroup]:
    'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
};

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
export function getSchemaForScope(scope: DeploymentScope): string {
  return SCOPE_SCHEMAS[scope];
}

/**
 * Scope hierarchy relationships.
 * Defines which scopes can contain other scopes.
 */
const SCOPE_HIERARCHY: Record<DeploymentScope, DeploymentScope[]> = {
  // Tenant can contain management groups and subscriptions
  [DeploymentScope.Tenant]: [DeploymentScope.ManagementGroup, DeploymentScope.Subscription],

  // Management groups can contain other management groups and subscriptions
  [DeploymentScope.ManagementGroup]: [
    DeploymentScope.ManagementGroup,
    DeploymentScope.Subscription,
  ],

  // Subscriptions can contain resource groups
  [DeploymentScope.Subscription]: [DeploymentScope.ResourceGroup],

  // Resource groups cannot contain other scopes
  [DeploymentScope.ResourceGroup]: [],
};

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
export function canContain(parent: DeploymentScope, child: DeploymentScope): boolean {
  return SCOPE_HIERARCHY[parent].includes(child);
}

/**
 * Resources available at each deployment scope.
 *
 * @remarks
 * This is a representative list, not exhaustive.
 * Based on Azure ARM resource provider documentation.
 *
 * @see {@link https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/azure-services-resource-providers}
 */
export const SCOPE_AVAILABLE_RESOURCES: Record<DeploymentScope, string[]> = {
  // Tenant scope - Azure AD/Entra resources
  [DeploymentScope.Tenant]: [
    'Microsoft.Authorization/policyDefinitions',
    'Microsoft.Authorization/policySetDefinitions',
    'Microsoft.Management/managementGroups',
  ],

  // Management Group scope - Governance resources
  [DeploymentScope.ManagementGroup]: [
    'Microsoft.Authorization/policyDefinitions',
    'Microsoft.Authorization/policySetDefinitions',
    'Microsoft.Authorization/policyAssignments',
    'Microsoft.Authorization/roleDefinitions',
    'Microsoft.Authorization/roleAssignments',
    'Microsoft.Management/managementGroups',
  ],

  // Subscription scope - Subscription-level resources
  [DeploymentScope.Subscription]: [
    'Microsoft.Resources/resourceGroups',
    'Microsoft.Authorization/policyAssignments',
    'Microsoft.Authorization/roleAssignments',
    'Microsoft.Authorization/locks',
    'Microsoft.Insights/actionGroups',
    'Microsoft.Insights/activityLogAlerts',
    'Microsoft.Security/autoProvisioningSettings',
    'Microsoft.Security/securityContacts',
    'Microsoft.Consumption/budgets',
  ],

  // Resource Group scope - Most Azure resources
  [DeploymentScope.ResourceGroup]: [
    'Microsoft.Storage/storageAccounts',
    'Microsoft.KeyVault/vaults',
    'Microsoft.Network/virtualNetworks',
    'Microsoft.Network/networkSecurityGroups',
    'Microsoft.Network/publicIPAddresses',
    'Microsoft.Network/privateEndpoints',
    'Microsoft.Compute/virtualMachines',
    'Microsoft.Web/serverFarms',
    'Microsoft.Web/sites',
    'Microsoft.ContainerRegistry/registries',
    'Microsoft.Sql/servers',
    'Microsoft.DBforPostgreSQL/servers',
    'Microsoft.Cache/redis',
    'Microsoft.Search/searchServices',
    'Microsoft.CognitiveServices/accounts',
    'Microsoft.Insights/components',
    'Microsoft.OperationalInsights/workspaces',
    // ... and many more
  ],
};

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
export function getParentScope(scope: DeploymentScope): DeploymentScope | undefined {
  switch (scope) {
    case DeploymentScope.ResourceGroup:
      return DeploymentScope.Subscription;
    case DeploymentScope.Subscription:
      return DeploymentScope.ManagementGroup;
    case DeploymentScope.ManagementGroup:
      return DeploymentScope.Tenant;
    case DeploymentScope.Tenant:
      return undefined;
  }
}

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
export function getChildScopes(scope: DeploymentScope): DeploymentScope[] {
  return SCOPE_HIERARCHY[scope];
}
