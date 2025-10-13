"use strict";
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCOPE_AVAILABLE_RESOURCES = exports.DeploymentScope = void 0;
exports.getSchemaForScope = getSchemaForScope;
exports.canContain = canContain;
exports.getParentScope = getParentScope;
exports.getChildScopes = getChildScopes;
/**
 * Azure ARM deployment scopes.
 *
 * @remarks
 * Defines the hierarchy of Azure deployment scopes from tenant down to resource group.
 * Each scope has its own ARM template schema and allowed resource types.
 *
 * @see {@link https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/scope-functions}
 */
var DeploymentScope;
(function (DeploymentScope) {
    /**
     * Tenant scope - Azure AD/Entra ID level.
     * Schema: https://schema.management.azure.com/schemas/2019-08-01/tenantDeploymentTemplate.json#
     */
    DeploymentScope["Tenant"] = "tenant";
    /**
     * Management Group scope - Organizational grouping.
     * Schema: https://schema.management.azure.com/schemas/2019-08-01/managementGroupDeploymentTemplate.json#
     */
    DeploymentScope["ManagementGroup"] = "managementGroup";
    /**
     * Subscription scope - Billing boundary, contains resource groups.
     * Schema: https://schema.management.azure.com/schemas/2018-05-01/subscriptionDeploymentTemplate.json#
     */
    DeploymentScope["Subscription"] = "subscription";
    /**
     * Resource Group scope - Logical container for resources.
     * Schema: https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#
     */
    DeploymentScope["ResourceGroup"] = "resourceGroup";
})(DeploymentScope || (exports.DeploymentScope = DeploymentScope = {}));
/**
 * ARM template schema URLs for each deployment scope.
 */
var SCOPE_SCHEMAS = (_a = {},
    _a[DeploymentScope.Tenant] = 'https://schema.management.azure.com/schemas/2019-08-01/tenantDeploymentTemplate.json#',
    _a[DeploymentScope.ManagementGroup] = 'https://schema.management.azure.com/schemas/2019-08-01/managementGroupDeploymentTemplate.json#',
    _a[DeploymentScope.Subscription] = 'https://schema.management.azure.com/schemas/2018-05-01/subscriptionDeploymentTemplate.json#',
    _a[DeploymentScope.ResourceGroup] = 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
    _a);
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
function getSchemaForScope(scope) {
    return SCOPE_SCHEMAS[scope];
}
/**
 * Scope hierarchy relationships.
 * Defines which scopes can contain other scopes.
 */
var SCOPE_HIERARCHY = (_b = {},
    // Tenant can contain management groups and subscriptions
    _b[DeploymentScope.Tenant] = [DeploymentScope.ManagementGroup, DeploymentScope.Subscription],
    // Management groups can contain other management groups and subscriptions
    _b[DeploymentScope.ManagementGroup] = [
        DeploymentScope.ManagementGroup,
        DeploymentScope.Subscription,
    ],
    // Subscriptions can contain resource groups
    _b[DeploymentScope.Subscription] = [DeploymentScope.ResourceGroup],
    // Resource groups cannot contain other scopes
    _b[DeploymentScope.ResourceGroup] = [],
    _b);
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
function canContain(parent, child) {
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
exports.SCOPE_AVAILABLE_RESOURCES = (_c = {},
    // Tenant scope - Azure AD/Entra resources
    _c[DeploymentScope.Tenant] = [
        'Microsoft.Authorization/policyDefinitions',
        'Microsoft.Authorization/policySetDefinitions',
        'Microsoft.Management/managementGroups',
    ],
    // Management Group scope - Governance resources
    _c[DeploymentScope.ManagementGroup] = [
        'Microsoft.Authorization/policyDefinitions',
        'Microsoft.Authorization/policySetDefinitions',
        'Microsoft.Authorization/policyAssignments',
        'Microsoft.Authorization/roleDefinitions',
        'Microsoft.Authorization/roleAssignments',
        'Microsoft.Management/managementGroups',
    ],
    // Subscription scope - Subscription-level resources
    _c[DeploymentScope.Subscription] = [
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
    _c[DeploymentScope.ResourceGroup] = [
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
    _c);
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
function getParentScope(scope) {
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
function getChildScopes(scope) {
    return SCOPE_HIERARCHY[scope];
}
