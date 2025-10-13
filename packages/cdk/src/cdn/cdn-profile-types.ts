/**
 * Type definitions for CDN Profile constructs.
 *
 * @packageDocumentation
 */

import { schema } from '@atakora/lib';

/**
 * CDN SKU name.
 */
export const CdnSkuName = schema.cdn.CdnSkuName;
export type CdnSkuName = typeof CdnSkuName[keyof typeof CdnSkuName];

/**
 * CDN SKU configuration.
 */
export interface CdnSku {
  /**
   * SKU name/tier.
   */
  readonly name: CdnSkuName;
}

/**
 * ARM properties for CDN Profile (L1 construct).
 *
 * @remarks
 * Direct mapping to Microsoft.Cdn/profiles ARM resource.
 *
 * ARM API Version: 2024-02-01
 *
 * @example
 * ```typescript
 * const props: ArmCdnProfilesProps = {
 *   profileName: 'my-cdn-profile',
 *   location: 'global',
 *   sku: {
 *     name: CdnSkuName.STANDARD_MICROSOFT
 *   }
 * };
 * ```
 */
export interface ArmCdnProfilesProps {
  /**
   * CDN profile name.
   *
   * @remarks
   * - Must be globally unique
   * - 1-260 characters
   * - Alphanumeric and hyphens
   * - Cannot start or end with hyphen
   */
  readonly profileName: string;

  /**
   * Azure region for the CDN profile.
   *
   * @remarks
   * CDN profiles are typically deployed to 'global' location,
   * but can be regional for specific SKUs.
   */
  readonly location: string;

  /**
   * CDN SKU configuration (required).
   */
  readonly sku: CdnSku;

  /**
   * Tags to apply to the CDN profile.
   */
  readonly tags?: Record<string, string>;
}

/**
 * L2 CDN Profile properties.
 *
 * @remarks
 * Intent-based API with sensible defaults.
 *
 * @example
 * ```typescript
 * // Minimal - auto-generates name, uses Microsoft CDN
 * const profile = new CdnProfiles(resourceGroup, 'MyCdn');
 *
 * // With custom SKU
 * const profile = new CdnProfiles(resourceGroup, 'MyCdn', {
 *   sku: CdnSkuName.PREMIUM_VERIZON
 * });
 * ```
 */
export interface CdnProfilesProps {
  /**
   * CDN profile name.
   *
   * @remarks
   * If not provided, will be auto-generated using the stack's naming context.
   * - Format: `cdn-{org}-{project}-{purpose}-{env}-{instance}`
   * - Example: `cdn-dp-authr-web-prod-01`
   */
  readonly profileName?: string;

  /**
   * CDN SKU name.
   *
   * @remarks
   * Defaults to Standard_Microsoft.
   */
  readonly sku?: CdnSkuName;

  /**
   * Azure region for the CDN profile.
   *
   * @remarks
   * Defaults to 'global' for CDN profiles.
   * CDN is a global service, but the profile resource needs a location.
   */
  readonly location?: string;

  /**
   * Tags to apply to the CDN profile.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Interface for CDN Profile reference.
 */
export interface ICdnProfile {
  /**
   * CDN profile name.
   */
  readonly profileName: string;

  /**
   * CDN profile resource ID.
   */
  readonly profileId: string;

  /**
   * Location of the CDN profile.
   */
  readonly location: string;

  /**
   * CDN SKU.
   */
  readonly sku: CdnSku;
}
