/**
 * Core types and classes for Azure resource naming and deployment configuration.
 *
 * @remarks
 * This module provides the foundational infrastructure for building Azure ARM templates
 * using the construct pattern (inspired by AWS CDK).
 *
 * **Framework Components**:
 * - **App**: Root construct, contains stacks
 * - **SubscriptionStack**: Deploys at subscription scope
 * - **ResourceGroupStack**: Deploys at resource group scope
 * - **Resource**: Base class for all Azure resources
 * - **Construct**: Re-exported from constructs library
 *
 * **Context Components** (non-Azure specific):
 * - **Organization**: Business unit or department
 * - **Project**: Application or workload
 * - **Environment**: Deployment stage (dev, prod, etc.)
 * - **Instance**: Unique identifier for resource instances
 *
 * **Azure Components** (Azure-specific):
 * - **Geography**: Azure deployment region/location
 * - **Subscription**: Azure subscription for billing boundary
 * - **DeploymentScope**: Scope hierarchy enum
 *
 * @packageDocumentation
 *
 * @example
 * Complete example:
 * ```typescript
 * import {
 *   App,
 *   SubscriptionStack,
 *   Subscription,
 *   Geography,
 *   Organization,
 *   Project,
 *   Environment,
 *   Instance
 * } from '@atakora/lib';
 *
 * const app = new App();
 *
 * const foundation = new SubscriptionStack(app, 'Foundation', {
 *   subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
 *   geography: Geography.fromValue('eastus'),
 *   organization: Organization.fromValue('digital-minion'),
 *   project: new Project('authr'),
 *   environment: Environment.fromValue('nonprod'),
 *   instance: Instance.fromNumber(1)
 * });
 *
 * const rgName = foundation.generateResourceName('rg', 'data');
 * // Result: "rg-digital-minion-authr-data-nonprod-eus-00"
 * ```
 */

// Base types and interfaces
export type { INamingComponent, NamingComponentOptions } from './types';
export { NamingComponent } from './types';

// Framework classes (construct tree)
export { Construct, IConstruct, Node } from './construct';
export { Resource } from './resource';
export type { ResourceProps } from './resource';
export { App } from './app';
export type { AppProps, UserProfile, ProjectConfig } from './app';
export { SubscriptionStack } from './subscription-stack';
export type { SubscriptionStackProps } from './subscription-stack';
export { ResourceGroupStack } from './resource-group-stack';
export type { ResourceGroupStackProps } from './resource-group-stack';

// Context components (non-Azure specific)
export { Organization } from './context';
export { Project } from './context';
export { Environment } from './context';
export { Instance } from './context';

// Azure-specific components
export { Geography, Subscription, DeploymentScope } from './azure';
export {
  getSchemaForScope,
  canContain,
  getParentScope,
  getChildScopes,
  SCOPE_AVAILABLE_RESOURCES,
} from './azure';

// Managed Identity support
export {
  ManagedIdentityType,
  createSystemAssignedIdentity,
  createUserAssignedIdentity,
  createSystemAndUserAssignedIdentity,
  validateManagedIdentity,
} from './identity';
export type {
  ManagedServiceIdentity,
  UserAssignedIdentityValue,
  IIdentityResource,
  IdentityResourceProps,
} from './identity';
