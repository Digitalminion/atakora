"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCOPE_AVAILABLE_RESOURCES = exports.getChildScopes = exports.getParentScope = exports.canContain = exports.getSchemaForScope = exports.DeploymentScope = exports.Subscription = exports.Geography = void 0;
// Export Azure-specific components
var geography_1 = require("./geography");
Object.defineProperty(exports, "Geography", { enumerable: true, get: function () { return geography_1.Geography; } });
var subscription_1 = require("./subscription");
Object.defineProperty(exports, "Subscription", { enumerable: true, get: function () { return subscription_1.Subscription; } });
var scopes_1 = require("./scopes");
Object.defineProperty(exports, "DeploymentScope", { enumerable: true, get: function () { return scopes_1.DeploymentScope; } });
Object.defineProperty(exports, "getSchemaForScope", { enumerable: true, get: function () { return scopes_1.getSchemaForScope; } });
Object.defineProperty(exports, "canContain", { enumerable: true, get: function () { return scopes_1.canContain; } });
Object.defineProperty(exports, "getParentScope", { enumerable: true, get: function () { return scopes_1.getParentScope; } });
Object.defineProperty(exports, "getChildScopes", { enumerable: true, get: function () { return scopes_1.getChildScopes; } });
Object.defineProperty(exports, "SCOPE_AVAILABLE_RESOURCES", { enumerable: true, get: function () { return scopes_1.SCOPE_AVAILABLE_RESOURCES; } });
