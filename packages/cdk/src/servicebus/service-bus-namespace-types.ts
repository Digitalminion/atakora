/**
 * Type definitions for Service Bus Namespace constructs.
 *
 * @packageDocumentation
 */

/**
 * Service Bus SKU tier.
 */
export enum ServiceBusSku {
  /**
   * Basic tier - shared messaging, up to 256KB messages.
   */
  BASIC = 'Basic',

  /**
   * Standard tier - shared messaging, topics/subscriptions, up to 256KB messages.
   */
  STANDARD = 'Standard',

  /**
   * Premium tier - dedicated resources, up to 1MB messages, geo-disaster recovery.
   */
  PREMIUM = 'Premium',
}

/**
 * Properties for ArmServiceBusNamespace (L1 construct).
 *
 * @remarks
 * Direct mapping to Microsoft.ServiceBus/namespaces ARM resource.
 * All properties are explicit with no defaults or auto-generation.
 *
 * ARM API Version: 2021-11-01
 *
 * @example
 * ```typescript
 * const props: ArmServiceBusNamespaceProps = {
 *   namespaceName: 'sb-myapp-prod',
 *   location: 'eastus',
 *   sku: {
 *     name: ServiceBusSku.STANDARD,
 *     tier: ServiceBusSku.STANDARD
 *   }
 * };
 * ```
 */
export interface ArmServiceBusNamespaceProps {
  /**
   * Service Bus namespace name.
   *
   * @remarks
   * Must be 6-50 characters, alphanumeric and hyphens.
   * Must be globally unique across Azure.
   */
  readonly namespaceName: string;

  /**
   * Azure region where the namespace will be created.
   */
  readonly location: string;

  /**
   * SKU configuration.
   */
  readonly sku: {
    readonly name: ServiceBusSku;
    readonly tier: ServiceBusSku;
    readonly capacity?: number;
  };

  /**
   * Enable zone redundancy.
   *
   * @remarks
   * Only available for Premium tier.
   */
  readonly zoneRedundant?: boolean;

  /**
   * Disable local auth (use Azure AD only).
   */
  readonly disableLocalAuth?: boolean;

  /**
   * Minimum TLS version.
   */
  readonly minimumTlsVersion?: '1.0' | '1.1' | '1.2';

  /**
   * Tags to apply to the namespace.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Properties for ServiceBusNamespace (L2 construct).
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 * Designed for developer productivity with minimal required properties.
 *
 * @example
 * ```typescript
 * // Minimal usage
 * const namespace = new ServiceBusNamespace(resourceGroup, 'Messaging', {});
 *
 * // With custom properties
 * const namespace = new ServiceBusNamespace(resourceGroup, 'Messaging', {
 *   namespaceName: 'sb-myapp-prod',
 *   sku: ServiceBusSku.PREMIUM,
 *   zoneRedundant: true
 * });
 * ```
 */
export interface ServiceBusNamespaceProps {
  /**
   * Service Bus namespace name.
   *
   * @remarks
   * If not provided, will be auto-generated using the stack's naming context.
   */
  readonly namespaceName?: string;

  /**
   * Azure region where the namespace will be created.
   *
   * @remarks
   * If not provided, defaults to the parent resource group's location.
   */
  readonly location?: string;

  /**
   * SKU tier.
   *
   * @remarks
   * Defaults to Standard tier.
   */
  readonly sku?: ServiceBusSku;

  /**
   * Enable zone redundancy.
   *
   * @remarks
   * Only available for Premium tier.
   * Defaults to false.
   */
  readonly zoneRedundant?: boolean;

  /**
   * Disable local auth (use Azure AD only).
   *
   * @remarks
   * Defaults to false (local auth enabled).
   */
  readonly disableLocalAuth?: boolean;

  /**
   * Minimum TLS version.
   *
   * @remarks
   * Defaults to '1.2'.
   */
  readonly minimumTlsVersion?: '1.0' | '1.1' | '1.2';

  /**
   * Tags to apply to the namespace.
   *
   * @remarks
   * These tags will be merged with the parent's tags.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Interface for Service Bus Namespace reference.
 *
 * @remarks
 * Allows resources to reference a Service Bus Namespace without depending on the construct class.
 */
export interface IServiceBusNamespace {
  /**
   * Name of the Service Bus namespace.
   */
  readonly namespaceName: string;

  /**
   * Location of the Service Bus namespace.
   */
  readonly location: string;

  /**
   * Resource ID of the Service Bus namespace.
   */
  readonly namespaceId: string;
}
