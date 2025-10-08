/**
 * Azure App Service Plan constructs.
 *
 * @remarks
 * Provides both L1 (ARM direct mapping) and L2 (intent-based) constructs
 * for creating Azure App Service Plans (serverfarms).
 *
 * **Resource Type**: Microsoft.Web/serverfarms
 * **API Version**: 2023-01-01
 * **Deployment Scope**: ResourceGroup
 *
 * @packageDocumentation
 *
 * @example
 * L1 usage (explicit control):
 * ```typescript
 * import { ArmAppServicePlan, AppServicePlanSkuName, AppServicePlanSkuTier } from '@atakora/lib';
 *
 * const plan = new ArmAppServicePlan(resourceGroup, 'Plan', {
 *   planName: 'asp-authr-001',
 *   location: 'eastus',
 *   sku: {
 *     name: AppServicePlanSkuName.B1,
 *     tier: AppServicePlanSkuTier.BASIC
 *   },
 *   kind: AppServicePlanKind.LINUX,
 *   reserved: true
 * });
 * ```
 *
 * @example
 * L2 usage (auto-generation):
 * ```typescript
 * import { AppServicePlan } from '@atakora/lib';
 *
 * const plan = new AppServicePlan(resourceGroup, 'ApiPlan');
 * // Auto-generates name, defaults to Linux B1
 * ```
 */

// L1 construct (ARM direct mapping)
export { ArmAppServicePlan } from './arm-app-service-plan';

// L2 construct (intent-based)
export { AppServicePlan } from './app-service-plan';

// Type definitions
export type {
  ArmAppServicePlanProps,
  AppServicePlanProps,
  IAppServicePlan,
  AppServicePlanSku,
} from './types';

// Enums
export { AppServicePlanSkuName, AppServicePlanSkuTier, AppServicePlanKind } from './types';
