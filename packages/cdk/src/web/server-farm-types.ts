/**
 * Type definitions for App Service Plan (Server Farm) constructs.
 *
 * @packageDocumentation
 */

import { schema } from '@atakora/lib';

/**
 * SKU name for Server Farm.
 */
export const ServerFarmSkuName = schema.web.ServerFarmSkuName;
export type ServerFarmSkuName = typeof ServerFarmSkuName[keyof typeof ServerFarmSkuName];

/**
 * SKU tier for Server Farm.
 */
export const ServerFarmSkuTier = schema.web.ServerFarmSkuTier;
export type ServerFarmSkuTier = typeof ServerFarmSkuTier[keyof typeof ServerFarmSkuTier];

/**
 * Kind of Server Farm.
 */
export const ServerFarmKind = schema.web.ServerFarmKind;
export type ServerFarmKind = typeof ServerFarmKind[keyof typeof ServerFarmKind];

/**
 * SKU configuration for Server Farm.
 */
export interface ServerFarmSku {
  /**
   * SKU name.
   */
  readonly name: ServerFarmSkuName;

  /**
   * SKU tier.
   */
  readonly tier: ServerFarmSkuTier;

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
 * Properties for ArmServerFarms (L1 construct).
 *
 * @remarks
 * Direct mapping to Microsoft.Web/serverfarms ARM resource.
 * All properties are explicit with no defaults or auto-generation.
 *
 * ARM API Version: 2023-01-01
 *
 * @example
 * ```typescript
 * const props: ArmServerFarmsProps = {
 *   planName: 'asp-authr-001',
 *   location: 'eastus',
 *   sku: {
 *     name: ServerFarmSkuName.B1,
 *     tier: ServerFarmSkuTier.BASIC
 *   },
 *   kind: ServerFarmKind.LINUX,
 *   reserved: true
 * };
 * ```
 */
export interface ArmServerFarmsProps {
  /**
   * Server Farm name.
   *
   * @remarks
   * - Must be 1-40 characters
   * - Alphanumeric and hyphens only
   * - Pattern: ^[a-zA-Z0-9-]{1,40}$
   */
  readonly planName: string;

  /**
   * Azure region where the Server Farm will be created.
   */
  readonly location: string;

  /**
   * SKU configuration (required).
   */
  readonly sku: ServerFarmSku;

  /**
   * Kind of Server Farm.
   *
   * @remarks
   * Defaults to 'app' if not specified.
   * Use 'linux' for Linux plans, 'windows' for Windows plans.
   */
  readonly kind?: ServerFarmKind;

  /**
   * Reserved flag.
   *
   * @remarks
   * - true for Linux Server Farms
   * - false for Windows Server Farms
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
   * Tags to apply to the Server Farm.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Properties for ServerFarms (L2 construct).
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 * Designed for developer productivity with minimal required properties.
 *
 * @example
 * ```typescript
 * // Minimal usage - auto-generates name and uses defaults
 * const plan = new ServerFarms(resourceGroup, 'AppPlan');
 *
 * // With custom properties
 * const plan = new ServerFarms(resourceGroup, 'AppPlan', {
 *   sku: ServerFarmSkuName.S1,
 *   kind: ServerFarmKind.LINUX,
 *   capacity: 2
 * });
 * ```
 */
export interface ServerFarmsProps {
  /**
   * Server Farm name.
   *
   * @remarks
   * If not provided, will be auto-generated using the stack's naming context.
   * - Format: `asp-{org}-{project}-{purpose}-{env}-{geo}-{instance}`
   * - Example: `asp-dp-authr-api-np-eus-01`
   *
   * The `purpose` is derived from the construct ID.
   */
  readonly planName?: string;

  /**
   * Azure region where the Server Farm will be created.
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
  readonly sku?: ServerFarmSkuName;

  /**
   * Kind of Server Farm.
   *
   * @remarks
   * Defaults to 'linux'.
   */
  readonly kind?: ServerFarmKind;

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
   * Tags to apply to the Server Farm.
   *
   * @remarks
   * These tags will be merged with the parent's tags.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Interface for App Service Plan (Server Farm) reference.
 *
 * @remarks
 * Allows resources to reference a Server Farm without depending on the construct class.
 */
export interface IServerFarm {
  /**
   * Name of the Server Farm.
   */
  readonly planName: string;

  /**
   * Location of the Server Farm.
   */
  readonly location: string;

  /**
   * Resource ID of the Server Farm.
   */
  readonly planId: string;
}
