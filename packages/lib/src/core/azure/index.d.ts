/**
 * Azure-specific configuration components.
 *
 * @remarks
 * This module provides Azure-specific configuration objects that define
 * how and where resources will be deployed to Azure.
 *
 * Azure components include:
 * - **Geography**: Azure region/location where ARM templates will be deployed
 * - **Subscription**: Azure subscription for billing and resource grouping
 * - **DeploymentScope**: Defines the scope hierarchy (Tenant, ManagementGroup, Subscription, ResourceGroup)
 *
 * These components are specific to Azure infrastructure and may include
 * Azure-specific validation, constraints, and metadata.
 *
 * @packageDocumentation
 *
 * @example
 * Geography usage:
 * ```typescript
 * import { Geography } from '@atakora/lib/core/azure';
 *
 * const geo = Geography.fromValue('eastus');
 * console.log(geo.location);     // "eastus" - Use for ARM template deployment
 * console.log(geo.abbreviation); // "eus" - Use in resource names
 * console.log(geo.displayName);  // "East US" - Human-readable name
 * ```
 *
 * @example
 * Subscription usage:
 * ```typescript
 * import { Subscription } from '@atakora/lib/core/azure';
 *
 * const sub = new Subscription({
 *   subscriptionId: '12345678-1234-1234-1234-123456789abc',
 *   displayName: 'Production'
 * });
 * ```
 *
 * @example
 * Deployment scope:
 * ```typescript
 * import { DeploymentScope, getSchemaForScope } from '@atakora/lib/core/azure';
 *
 * const schema = getSchemaForScope(DeploymentScope.Subscription);
 * ```
 */
export { Geography } from './geography';
export { Subscription } from './subscription';
export { DeploymentScope, getSchemaForScope, canContain, getParentScope, getChildScopes, SCOPE_AVAILABLE_RESOURCES, } from './scopes';
//# sourceMappingURL=index.d.ts.map