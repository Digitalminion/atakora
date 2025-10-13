/**
 * Type definitions for Public IP Address constructs.
 *
 * @packageDocumentation
 */

import { schema } from '@atakora/lib';

/**
 * SKU name for public IP address.
 */
export const PublicIPAddressSku = schema.network.PublicIPAddressSku;
export type PublicIPAddressSku = typeof PublicIPAddressSku[keyof typeof PublicIPAddressSku];

/**
 * Public IP address allocation method.
 */
export const PublicIPAllocationMethod = schema.network.PublicIPAllocationMethod;
export type PublicIPAllocationMethod = typeof PublicIPAllocationMethod[keyof typeof PublicIPAllocationMethod];

/**
 * IP address version.
 */
export const IpVersion = schema.network.IpVersion;
export type IpVersion = typeof IpVersion[keyof typeof IpVersion];

/**
 * SKU configuration.
 */
export interface PublicIPAddressSkuConfig {
  /**
   * SKU name.
   */
  readonly name: PublicIPAddressSku;
}

/**
 * Properties for ArmPublicIpAddress (L1 construct).
 *
 * @remarks
 * Direct mapping to Microsoft.Network/publicIPAddresses ARM resource.
 * All properties are explicit with no defaults or auto-generation.
 *
 * ARM API Version: 2023-11-01
 *
 * @example
 * ```typescript
 * const props: ArmPublicIpAddressProps = {
 *   publicIpAddressName: 'pip-myapp-001',
 *   location: 'eastus',
 *   sku: { name: PublicIPAddressSku.STANDARD },
 *   properties: {
 *     publicIPAllocationMethod: PublicIPAllocationMethod.STATIC,
 *     ipVersion: IpVersion.IPV4
 *   }
 * };
 * ```
 */
export interface ArmPublicIpAddressProps {
  /**
   * Public IP address name.
   *
   * @remarks
   * - Must be 1-80 characters
   * - Alphanumeric, periods, underscores, and hyphens allowed
   * - Must start with alphanumeric
   * - Must end with alphanumeric or underscore
   * - Pattern: ^[a-zA-Z0-9][a-zA-Z0-9._-]{0,78}[a-zA-Z0-9_]$
   */
  readonly publicIpAddressName: string;

  /**
   * Azure region where the public IP address will be created.
   */
  readonly location: string;

  /**
   * SKU configuration (required).
   */
  readonly sku: PublicIPAddressSkuConfig;

  /**
   * Public IP address properties.
   */
  readonly properties?: {
    /**
     * IP address allocation method.
     *
     * @remarks
     * Standard SKU requires Static allocation method.
     */
    readonly publicIPAllocationMethod: PublicIPAllocationMethod;

    /**
     * IP address version.
     *
     * @remarks
     * Defaults to IPv4.
     */
    readonly ipVersion?: IpVersion;

    /**
     * Domain name label.
     *
     * @remarks
     * Creates a DNS name: {domainNameLabel}.{location}.cloudapp.azure.com
     * - Must be 3-63 characters
     * - Lowercase letters, numbers, and hyphens only
     * - Must start with a letter
     * - Must end with a letter or number
     */
    readonly domainNameLabel?: string;

    /**
     * Idle timeout in minutes.
     *
     * @remarks
     * - Must be between 4 and 30 minutes
     * - Only applicable to TCP connections
     */
    readonly idleTimeoutInMinutes?: number;
  };

  /**
   * Tags to apply to the public IP address.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Properties for PublicIpAddress (L2 construct).
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 * Designed for developer productivity with minimal required properties.
 *
 * @example
 * ```typescript
 * // Minimal usage - auto-generates name and uses defaults
 * const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp');
 *
 * // With custom properties
 * const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp', {
 *   sku: PublicIPAddressSku.BASIC,
 *   publicIPAllocationMethod: PublicIPAllocationMethod.DYNAMIC,
 *   domainNameLabel: 'myapp'
 * });
 * ```
 */
export interface PublicIPAddressesProps {
  /**
   * Public IP address name.
   *
   * @remarks
   * If not provided, will be auto-generated using the stack's naming context.
   * - Format: `pip-{org}-{project}-{purpose}-{env}-{geo}-{instance}`
   * - Example: `pip-dp-authr-app-np-eus-01`
   *
   * The `purpose` is derived from the construct ID.
   */
  readonly publicIpAddressName?: string;

  /**
   * Azure region where the public IP address will be created.
   *
   * @remarks
   * If not provided, defaults to the parent resource group's location.
   */
  readonly location?: string;

  /**
   * SKU name.
   *
   * @remarks
   * Defaults to Standard.
   */
  readonly sku?: PublicIPAddressSku;

  /**
   * IP address allocation method.
   *
   * @remarks
   * Defaults to Static.
   * Standard SKU requires Static allocation method.
   */
  readonly publicIPAllocationMethod?: PublicIPAllocationMethod;

  /**
   * IP address version.
   *
   * @remarks
   * Defaults to IPv4.
   */
  readonly ipVersion?: IpVersion;

  /**
   * Domain name label.
   *
   * @remarks
   * Creates a DNS name: {domainNameLabel}.{location}.cloudapp.azure.com
   */
  readonly domainNameLabel?: string;

  /**
   * Idle timeout in minutes.
   *
   * @remarks
   * Defaults to 4 minutes.
   * Must be between 4 and 30 minutes.
   */
  readonly idleTimeoutInMinutes?: number;

  /**
   * Tags to apply to the public IP address.
   *
   * @remarks
   * These tags will be merged with the parent's tags.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Interface for Public IP Address reference.
 *
 * @remarks
 * Allows resources to reference a public IP address without depending on the construct class.
 */
export interface IPublicIpAddress {
  /**
   * Name of the public IP address.
   */
  readonly publicIpAddressName: string;

  /**
   * Location of the public IP address.
   */
  readonly location: string;

  /**
   * Resource ID of the public IP address.
   */
  readonly publicIpAddressId: string;
}
