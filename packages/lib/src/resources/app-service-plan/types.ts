/**
 * Type definitions for App Service Plan constructs.
 *
 * @packageDocumentation
 */

/**
 * SKU name for App Service Plan.
 */
export enum AppServicePlanSkuName {
  F1 = 'F1',
  B1 = 'B1',
  B2 = 'B2',
  B3 = 'B3',
  S1 = 'S1',
  S2 = 'S2',
  S3 = 'S3',
  P1V2 = 'P1v2',
  P2V2 = 'P2v2',
  P3V2 = 'P3v2',
  P1V3 = 'P1v3',
  P2V3 = 'P2v3',
  P3V3 = 'P3v3',
}

/**
 * SKU tier for App Service Plan.
 */
export enum AppServicePlanSkuTier {
  FREE = 'Free',
  BASIC = 'Basic',
  STANDARD = 'Standard',
  PREMIUM = 'Premium',
  PREMIUM_V2 = 'PremiumV2',
  PREMIUM_V3 = 'PremiumV3',
}

/**
 * Kind of App Service Plan.
 */
export enum AppServicePlanKind {
  LINUX = 'linux',
  WINDOWS = 'windows',
  APP = 'app',
}

/**
 * SKU configuration for App Service Plan.
 */
export interface AppServicePlanSku {
  /**
   * SKU name.
   */
  readonly name: AppServicePlanSkuName;

  /**
   * SKU tier.
   */
  readonly tier: AppServicePlanSkuTier;

  /**
   * SKU size (optional, typically same as name).
   */
  readonly size?: string;

  /**
   * SKU family (optional).
   */
  readonly family?: string;

  /**
   * Instance capacity.
   *
   * @remarks
   * Number of instances (1-30).
   */
  readonly capacity?: number;
}

/**
 * Properties for ArmAppServicePlan (L1 construct).
 *
 * @remarks
 * Direct mapping to Microsoft.Web/serverfarms ARM resource.
 * All properties are explicit with no defaults or auto-generation.
 *
 * ARM API Version: 2023-01-01
 *
 * @example
 * ```typescript
 * const props: ArmAppServicePlanProps = {
 *   planName: 'asp-colorai-001',
 *   location: 'eastus',
 *   sku: {
 *     name: AppServicePlanSkuName.B1,
 *     tier: AppServicePlanSkuTier.BASIC
 *   },
 *   kind: AppServicePlanKind.LINUX,
 *   reserved: true
 * };
 * ```
 */
export interface ArmAppServicePlanProps {
  /**
   * App Service Plan name.
   *
   * @remarks
   * - Must be 1-40 characters
   * - Alphanumeric and hyphens only
   * - Pattern: ^[a-zA-Z0-9-]{1,40}$
   */
  readonly planName: string;

  /**
   * Azure region where the App Service Plan will be created.
   */
  readonly location: string;

  /**
   * SKU configuration (required).
   */
  readonly sku: AppServicePlanSku;

  /**
   * Kind of App Service Plan.
   *
   * @remarks
   * Defaults to 'app' if not specified.
   * Use 'linux' for Linux plans, 'windows' for Windows plans.
   */
  readonly kind?: AppServicePlanKind;

  /**
   * Reserved flag.
   *
   * @remarks
   * - true for Linux App Service Plans
   * - false for Windows App Service Plans
   * - Required for Linux plans
   */
  readonly reserved?: boolean;

  /**
   * Enable zone redundancy.
   *
   * @remarks
   * Requires Premium tier SKU.
   */
  readonly zoneRedundant?: boolean;

  /**
   * Tags to apply to the App Service Plan.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Properties for AppServicePlan (L2 construct).
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 * Designed for developer productivity with minimal required properties.
 *
 * @example
 * ```typescript
 * // Minimal usage - auto-generates name and uses defaults
 * const plan = new AppServicePlan(resourceGroup, 'AppPlan');
 *
 * // With custom properties
 * const plan = new AppServicePlan(resourceGroup, 'AppPlan', {
 *   sku: AppServicePlanSkuName.S1,
 *   kind: AppServicePlanKind.LINUX,
 *   capacity: 2
 * });
 * ```
 */
export interface AppServicePlanProps {
  /**
   * App Service Plan name.
   *
   * @remarks
   * If not provided, will be auto-generated using the stack's naming context.
   * - Format: `asp-{org}-{project}-{purpose}-{env}-{geo}-{instance}`
   * - Example: `asp-dp-colorai-api-np-eus-01`
   *
   * The `purpose` is derived from the construct ID.
   */
  readonly planName?: string;

  /**
   * Azure region where the App Service Plan will be created.
   *
   * @remarks
   * If not provided, defaults to the parent resource group's location.
   */
  readonly location?: string;

  /**
   * SKU name.
   *
   * @remarks
   * Defaults to B1 (Basic tier).
   */
  readonly sku?: AppServicePlanSkuName;

  /**
   * Kind of App Service Plan.
   *
   * @remarks
   * Defaults to 'linux'.
   */
  readonly kind?: AppServicePlanKind;

  /**
   * Reserved flag for Linux plans.
   *
   * @remarks
   * - Defaults to true (Linux plan)
   * - Set to false for Windows plans
   * - Auto-detected from kind if not specified
   */
  readonly reserved?: boolean;

  /**
   * Instance capacity.
   *
   * @remarks
   * Number of instances (1-30).
   * Defaults to 1.
   */
  readonly capacity?: number;

  /**
   * Enable zone redundancy.
   *
   * @remarks
   * Requires Premium tier SKU.
   * Defaults to false.
   */
  readonly zoneRedundant?: boolean;

  /**
   * Tags to apply to the App Service Plan.
   *
   * @remarks
   * These tags will be merged with the parent's tags.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Interface for App Service Plan reference.
 *
 * @remarks
 * Allows resources to reference an App Service Plan without depending on the construct class.
 */
export interface IAppServicePlan {
  /**
   * Name of the App Service Plan.
   */
  readonly planName: string;

  /**
   * Location of the App Service Plan.
   */
  readonly location: string;

  /**
   * Resource ID of the App Service Plan.
   */
  readonly planId: string;
}
