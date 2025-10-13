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

// ============================================================================
// FRAMEWORK CORE EXPORTS
// Re-exported from @atakora/lib for public API
// ============================================================================

/**
 * Core construct classes
 */
export {
  // Construct tree fundamentals
  Construct,
  Node,

  // Application root
  App,

  // Stack types for different deployment scopes
  ManagementGroupStack,
  SubscriptionStack,
  ResourceGroupStack,

  // Base resource class (for custom resources)
  Resource,
} from '@atakora/lib';

/**
 * Core construct types
 */
export type {
  // Construct interfaces
  IConstruct,

  // App configuration
  AppProps,
  UserProfile,
  ProjectConfig,

  // Stack configuration
  ManagementGroupStackProps,
  SubscriptionStackProps,
  ResourceGroupStackProps,

  // Resource base types
  ResourceProps,
  ArmResource,
} from '@atakora/lib';

// ============================================================================
// NAMING AND CONTEXT EXPORTS
// Components for resource naming conventions
// ============================================================================

/**
 * Naming context components
 */
export {
  // Business context
  Organization,
  Project,
  Environment,
  Instance,

  // Azure context
  Geography,
  Subscription,
  DeploymentScope,
} from '@atakora/lib';

/**
 * Naming types and interfaces
 */
export type {
  INamingComponent,
  NamingComponentOptions,
} from '@atakora/lib';

// ============================================================================
// AZURE SCOPE UTILITIES
// Utilities for working with Azure deployment scopes
// ============================================================================

/**
 * Scope utility functions
 */
export {
  getSchemaForScope,
  canContain,
  getParentScope,
  getChildScopes,
  SCOPE_AVAILABLE_RESOURCES,
} from '@atakora/lib';

// ============================================================================
// MANAGED IDENTITY EXPORTS
// Support for Azure Managed Identity configurations
// ============================================================================

/**
 * Managed Identity utilities
 */
export {
  ManagedIdentityType,
  createSystemAssignedIdentity,
  createUserAssignedIdentity,
  createSystemAndUserAssignedIdentity,
  validateManagedIdentity,
} from '@atakora/lib';

/**
 * Managed Identity types
 */
export type {
  ManagedServiceIdentity,
  UserAssignedIdentityValue,
  IIdentityResource,
  IdentityResourceProps,
} from '@atakora/lib';

// ============================================================================
// VALIDATION FRAMEWORK EXPORTS
// Validation system for resources and configurations
// ============================================================================

/**
 * Validation classes and utilities
 */
export {
  ValidationResult,
  ValidationError,
  ValidationSeverity,
  ValidationResultBuilder,
  isValidCIDR,
  isWithinCIDR,
  cidrsOverlap,
  isValidPortRange,
} from '@atakora/lib';

/**
 * Validation types
 */
export type {
  ResourceValidator,
} from '@atakora/lib';

// ============================================================================
// RBAC AND GRANT SYSTEM EXPORTS
// Azure role-based access control and permission grants
// ============================================================================

/**
 * Grant system interfaces and types
 */
export type {
  IGrantable,
  IGrantResult,
} from '@atakora/lib';

/**
 * Grant system classes and utilities
 */
export {
  PrincipalType,
  GrantableResource,
  WellKnownRoleIds,
  RoleAssignment,
  GrantResult,
} from '@atakora/lib';

/**
 * Grant error classes
 */
export {
  GrantError,
  MissingIdentityError,
  InvalidRoleAssignmentError,
} from '@atakora/lib';

// ============================================================================
// UTILITY FUNCTION EXPORTS
// Helper functions for common CDK operations
// ============================================================================

/**
 * Utility functions
 */
export {
  // Naming utilities
  constructIdToPurpose,
  getServiceAbbreviation,
} from '@atakora/lib';

// ============================================================================
// ADVANCED TYPE EXPORTS
// Types for advanced scenarios and custom implementations
// ============================================================================

/**
 * Synthesis types (for advanced users working with ARM templates directly)
 */
export type {
  CloudAssembly,
  StackManifest,
  // ArmTemplate, ArmParameter, ArmOutput - not yet exported from lib
} from '@atakora/lib';

/**
 * Resource reference types (for cross-resource references)
 */
export type {
  IResourceGroup,
} from '@atakora/lib';

// ============================================================================
// TESTING UTILITIES (if needed by users)
// ============================================================================

/**
 * Testing utilities for CDK applications
 * @alpha
 */
// Testing utilities not yet exported from lib

// ============================================================================
// VERSION INFORMATION
// ============================================================================

/**
 * CDK version information
 */
export const CDK_VERSION = '1.0.0';

/**
 * Check if the CDK version is compatible with a given version requirement
 * @param requirement - Semantic version requirement (e.g., "^1.0.0")
 * @returns True if compatible
 */
export function isCompatibleVersion(requirement: string): boolean {
  // Implementation would use semver library
  // For now, simple stub
  return true;
}

// ============================================================================
// NAMESPACE RE-EXPORTS (for convenience)
// Users should normally import from subpaths, but we provide these for
// backwards compatibility and convenience
// ============================================================================

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
// export * as compute from './compute'; // TODO: Enable when compute index exists

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
 * @deprecated Import directly from '@atakora/cdk/cdn' instead
 */
export * as cdn from './cdn';

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

// Note: API REST module is available via '@atakora/cdk/api/rest'
// It's not re-exported here due to naming conflicts with the api namespace

// Note: Data Stack is now in @atakora/component/data as a high-level composite