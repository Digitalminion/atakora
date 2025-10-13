"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GrantableResource = exports.validateManagedIdentity = exports.createSystemAndUserAssignedIdentity = exports.createUserAssignedIdentity = exports.createSystemAssignedIdentity = exports.ManagedIdentityType = exports.SCOPE_AVAILABLE_RESOURCES = exports.getChildScopes = exports.getParentScope = exports.canContain = exports.getSchemaForScope = exports.DeploymentScope = exports.Subscription = exports.Geography = exports.Instance = exports.Environment = exports.Project = exports.Organization = exports.ResourceGroupStack = exports.SubscriptionStack = exports.ManagementGroupStack = exports.AzureApp = exports.App = exports.Resource = exports.Node = exports.Construct = exports.NamingComponent = void 0;
var types_1 = require("./types");
Object.defineProperty(exports, "NamingComponent", { enumerable: true, get: function () { return types_1.NamingComponent; } });
// Framework classes (construct tree)
var construct_1 = require("./construct");
Object.defineProperty(exports, "Construct", { enumerable: true, get: function () { return construct_1.Construct; } });
Object.defineProperty(exports, "Node", { enumerable: true, get: function () { return construct_1.Node; } });
var resource_1 = require("./resource");
Object.defineProperty(exports, "Resource", { enumerable: true, get: function () { return resource_1.Resource; } });
var app_1 = require("./app");
Object.defineProperty(exports, "App", { enumerable: true, get: function () { return app_1.App; } });
var azure_app_1 = require("./azure-app");
Object.defineProperty(exports, "AzureApp", { enumerable: true, get: function () { return azure_app_1.AzureApp; } });
var management_group_stack_1 = require("./management-group-stack");
Object.defineProperty(exports, "ManagementGroupStack", { enumerable: true, get: function () { return management_group_stack_1.ManagementGroupStack; } });
var subscription_stack_1 = require("./subscription-stack");
Object.defineProperty(exports, "SubscriptionStack", { enumerable: true, get: function () { return subscription_stack_1.SubscriptionStack; } });
var resource_group_stack_1 = require("./resource-group-stack");
Object.defineProperty(exports, "ResourceGroupStack", { enumerable: true, get: function () { return resource_group_stack_1.ResourceGroupStack; } });
// Context components (non-Azure specific)
var context_1 = require("./context");
Object.defineProperty(exports, "Organization", { enumerable: true, get: function () { return context_1.Organization; } });
var context_2 = require("./context");
Object.defineProperty(exports, "Project", { enumerable: true, get: function () { return context_2.Project; } });
var context_3 = require("./context");
Object.defineProperty(exports, "Environment", { enumerable: true, get: function () { return context_3.Environment; } });
var context_4 = require("./context");
Object.defineProperty(exports, "Instance", { enumerable: true, get: function () { return context_4.Instance; } });
// Azure-specific components
var azure_1 = require("./azure");
Object.defineProperty(exports, "Geography", { enumerable: true, get: function () { return azure_1.Geography; } });
Object.defineProperty(exports, "Subscription", { enumerable: true, get: function () { return azure_1.Subscription; } });
Object.defineProperty(exports, "DeploymentScope", { enumerable: true, get: function () { return azure_1.DeploymentScope; } });
var azure_2 = require("./azure");
Object.defineProperty(exports, "getSchemaForScope", { enumerable: true, get: function () { return azure_2.getSchemaForScope; } });
Object.defineProperty(exports, "canContain", { enumerable: true, get: function () { return azure_2.canContain; } });
Object.defineProperty(exports, "getParentScope", { enumerable: true, get: function () { return azure_2.getParentScope; } });
Object.defineProperty(exports, "getChildScopes", { enumerable: true, get: function () { return azure_2.getChildScopes; } });
Object.defineProperty(exports, "SCOPE_AVAILABLE_RESOURCES", { enumerable: true, get: function () { return azure_2.SCOPE_AVAILABLE_RESOURCES; } });
// Managed Identity support
var identity_1 = require("./identity");
Object.defineProperty(exports, "ManagedIdentityType", { enumerable: true, get: function () { return identity_1.ManagedIdentityType; } });
Object.defineProperty(exports, "createSystemAssignedIdentity", { enumerable: true, get: function () { return identity_1.createSystemAssignedIdentity; } });
Object.defineProperty(exports, "createUserAssignedIdentity", { enumerable: true, get: function () { return identity_1.createUserAssignedIdentity; } });
Object.defineProperty(exports, "createSystemAndUserAssignedIdentity", { enumerable: true, get: function () { return identity_1.createSystemAndUserAssignedIdentity; } });
Object.defineProperty(exports, "validateManagedIdentity", { enumerable: true, get: function () { return identity_1.validateManagedIdentity; } });
// Validation framework
__exportStar(require("./validation"), exports);
// Azure RBAC grant system
__exportStar(require("./grants"), exports);
var grantable_resource_1 = require("./grantable-resource");
Object.defineProperty(exports, "GrantableResource", { enumerable: true, get: function () { return grantable_resource_1.GrantableResource; } });
