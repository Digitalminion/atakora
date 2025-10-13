/**
 * Atakora CDK - Azure Infrastructure as Code
 *
 * @remarks
 * This is the main entry point for the Atakora CDK.
 * Import framework classes and utilities from here.
 * Import Azure resources from their respective namespaces.
 *
 * ## Import Patterns
 *
 * **Framework classes** (App, Stack, Resource, etc.):
 * ```typescript
 * import { App, SubscriptionStack, ResourceGroupStack } from '@atakora/cdk';
 * ```
 *
 * **Azure resources** (organized by Microsoft.* namespaces):
 * ```typescript
 * import { VirtualNetworks, NetworkSecurityGroups } from '@atakora/cdk/network';
 * import { StorageAccounts } from '@atakora/cdk/storage';
 * import { Sites, ServerFarms } from '@atakora/cdk/web';
 * ```
 *
 * ## Example Usage
 *
 * ```typescript
 * import { App, ResourceGroupStack } from '@atakora/cdk';
 * import { VirtualNetworks } from '@atakora/cdk/network';
 * import { StorageAccounts } from '@atakora/cdk/storage';
 *
 * const app = new App();
 *
 * const stack = new ResourceGroupStack(app, 'MyStack', {
 *   resourceGroupName: 'rg-myapp-prod',
 *   location: 'eastus'
 * });
 *
 * const vnet = new VirtualNetworks(stack, 'VNet', {
 *   addressPrefixes: ['10.0.0.0/16']
 * });
 *
 * const storage = new StorageAccounts(stack, 'Storage', {
 *   kind: 'StorageV2'
 * });
 *
 * app.synth();
 * ```
 *
 * @packageDocumentation
 */
/**
 * Core construct classes
 */
export { Construct, Node, App, ManagementGroupStack, SubscriptionStack, ResourceGroupStack, Resource, } from '@atakora/lib';
/**
 * Core construct types
 */
export type { IConstruct, AppProps, UserProfile, ProjectConfig, ManagementGroupStackProps, SubscriptionStackProps, ResourceGroupStackProps, ResourceProps, ArmResource, } from '@atakora/lib';
/**
 * Naming context components
 */
export { Organization, Project, Environment, Instance, Geography, Subscription, DeploymentScope, } from '@atakora/lib';
/**
 * Naming types and interfaces
 */
export type { INamingComponent, NamingComponentOptions, } from '@atakora/lib';
/**
 * Scope utility functions
 */
export { getSchemaForScope, canContain, getParentScope, getChildScopes, SCOPE_AVAILABLE_RESOURCES, } from '@atakora/lib';
/**
 * Managed Identity utilities
 */
export { ManagedIdentityType, createSystemAssignedIdentity, createUserAssignedIdentity, createSystemAndUserAssignedIdentity, validateManagedIdentity, } from '@atakora/lib';
/**
 * Managed Identity types
 */
export type { ManagedServiceIdentity, UserAssignedIdentityValue, IIdentityResource, IdentityResourceProps, } from '@atakora/lib';
/**
 * Validation classes and utilities
 */
export { ValidationResult, ValidationError, ValidationSeverity, ValidationResultBuilder, isValidCIDR, isWithinCIDR, cidrsOverlap, isValidPortRange, } from '@atakora/lib';
/**
 * Validation types
 */
export type { ResourceValidator, } from '@atakora/lib';
/**
 * Utility functions
 */
export { constructIdToPurpose, getServiceAbbreviation, } from '@atakora/lib';
/**
 * Synthesis types (for advanced users working with ARM templates directly)
 */
export type { CloudAssembly, StackManifest, } from '@atakora/lib';
/**
 * Resource reference types (for cross-resource references)
 */
export type { IResourceGroup, } from '@atakora/lib';
/**
 * Testing utilities for CDK applications
 * @alpha
 */
/**
 * CDK version information
 */
export declare const CDK_VERSION = "1.0.0";
/**
 * Check if the CDK version is compatible with a given version requirement
 * @param requirement - Semantic version requirement (e.g., "^1.0.0")
 * @returns True if compatible
 */
export declare function isCompatibleVersion(requirement: string): boolean;
/**
 * @deprecated Import directly from '@atakora/cdk/network' instead
 */
export * as network from './network';
/**
 * @deprecated Import directly from '@atakora/cdk/storage' instead
 */
export * as storage from './storage';
/**
 * @deprecated Import directly from '@atakora/cdk/compute' instead
 */
/**
 * @deprecated Import directly from '@atakora/cdk/web' instead
 */
export * as web from './web';
/**
 * @deprecated Import directly from '@atakora/cdk/keyvault' instead
 */
export * as keyvault from './keyvault';
/**
 * @deprecated Import directly from '@atakora/cdk/sql' instead
 */
export * as sql from './sql';
/**
 * @deprecated Import directly from '@atakora/cdk/insights' instead
 */
export * as insights from './insights';
/**
 * @deprecated Import directly from '@atakora/cdk/operationalinsights' instead
 */
export * as operationalinsights from './operationalinsights';
/**
 * @deprecated Import directly from '@atakora/cdk/documentdb' instead
 */
export * as documentdb from './documentdb';
/**
 * @deprecated Import directly from '@atakora/cdk/cache' instead
 */
export * as cache from './cache';
/**
 * @deprecated Import directly from '@atakora/cdk/cognitiveservices' instead
 */
export * as cognitiveservices from './cognitiveservices';
/**
 * @deprecated Import directly from '@atakora/cdk/search' instead
 */
export * as search from './search';
/**
 * @deprecated Import directly from '@atakora/cdk/apimanagement' instead
 */
export * as apimanagement from './apimanagement';
/**
 * @deprecated Import directly from '@atakora/cdk/resources' instead
 */
export * as resources from './resources';
/**
 * @deprecated Import directly from '@atakora/cdk/eventhub' instead
 */
export * as eventhub from './eventhub';
/**
 * @deprecated Import directly from '@atakora/cdk/servicebus' instead
 */
export * as servicebus from './servicebus';
/**
 * @deprecated Import directly from '@atakora/cdk/functions' instead
 */
export * as functions from './functions';
/**
 * Subscription-level RBAC authorization
 */
export * as authorization from './authorization';
/**
 * Azure Policy for compliance and governance
 */
export * as policy from './policy';
/**
 * Azure Cost Management budgets for cost control
 */
export * as budget from './budget';
/**
 * Azure Resource Locks for resource protection
 */
export * as locks from './locks';
/**
 * Azure monitoring and activity log alerts
 */
export * as monitoring from './monitoring';
/**
 * Azure Management Group creation and management
 */
export * as managementgroups from './managementgroups';
/**
 * Azure SignalR Service for real-time communication
 */
export * as signalr from './signalr';
//# sourceMappingURL=index.d.ts.map