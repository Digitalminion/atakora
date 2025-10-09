/**
 * Type definitions for Application Gateway constructs.
 *
 * @packageDocumentation
 */

/**
 * Application Gateway SKU name.
 */
export enum ApplicationGatewaySkuName {
  Standard_v2 = 'Standard_v2',
  WAF_v2 = 'WAF_v2',
}

/**
 * Application Gateway SKU tier.
 */
export enum ApplicationGatewayTier {
  Standard_v2 = 'Standard_v2',
  WAF_v2 = 'WAF_v2',
}

/**
 * Application Gateway protocol.
 */
export enum ApplicationGatewayProtocol {
  Http = 'Http',
  Https = 'Https',
}

/**
 * Application Gateway request routing rule type.
 */
export enum ApplicationGatewayRequestRoutingRuleType {
  Basic = 'Basic',
  PathBasedRouting = 'PathBasedRouting',
}

/**
 * Application Gateway redirect type.
 */
export enum ApplicationGatewayRedirectType {
  Permanent = 'Permanent',
  Found = 'Found',
  SeeOther = 'SeeOther',
  Temporary = 'Temporary',
}

/**
 * Application Gateway cookie based affinity.
 */
export enum ApplicationGatewayCookieBasedAffinity {
  Enabled = 'Enabled',
  Disabled = 'Disabled',
}

/**
 * Application Gateway SKU configuration.
 */
export interface ApplicationGatewaySku {
  /**
   * SKU name.
   */
  readonly name: ApplicationGatewaySkuName;

  /**
   * SKU tier.
   */
  readonly tier: ApplicationGatewayTier;

  /**
   * SKU capacity (number of instances).
   *
   * @remarks
   * For v2 SKUs, this is the instance count for manual scaling.
   * Minimum: 1, Maximum: 125
   */
  readonly capacity?: number;
}

/**
 * Subnet reference for Gateway IP Configuration.
 */
export interface SubnetReference {
  /**
   * Resource ID of the subnet.
   *
   * @example '/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Network/virtualNetworks/{vnet}/subnets/{subnet}'
   */
  readonly id: string;
}

/**
 * Gateway IP Configuration.
 *
 * @remarks
 * Defines which subnet the Application Gateway is deployed into.
 */
export interface GatewayIPConfiguration {
  /**
   * Name of the gateway IP configuration.
   */
  readonly name: string;

  /**
   * Subnet where Application Gateway will be deployed.
   */
  readonly subnet: SubnetReference;
}

/**
 * Public IP address reference.
 */
export interface PublicIPAddressReference {
  /**
   * Resource ID of the public IP address.
   *
   * @example '/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Network/publicIPAddresses/{pip}'
   */
  readonly id: string;
}

/**
 * Frontend IP Configuration.
 */
export interface FrontendIPConfiguration {
  /**
   * Name of the frontend IP configuration.
   */
  readonly name: string;

  /**
   * Public IP address reference.
   */
  readonly publicIPAddress?: PublicIPAddressReference;

  /**
   * Private IP address.
   */
  readonly privateIPAddress?: string;

  /**
   * Private IP allocation method.
   */
  readonly privateIPAllocationMethod?: 'Static' | 'Dynamic';

  /**
   * Subnet reference for private frontend IP.
   */
  readonly subnet?: SubnetReference;
}

/**
 * Frontend Port.
 */
export interface FrontendPort {
  /**
   * Name of the frontend port.
   */
  readonly name: string;

  /**
   * Port number.
   */
  readonly port: number;
}

/**
 * Backend address.
 */
export interface BackendAddress {
  /**
   * Fully qualified domain name (FQDN).
   */
  readonly fqdn?: string;

  /**
   * IP address.
   */
  readonly ipAddress?: string;
}

/**
 * Backend Address Pool.
 */
export interface BackendAddressPool {
  /**
   * Name of the backend address pool.
   */
  readonly name: string;

  /**
   * Array of backend addresses.
   */
  readonly backendAddresses?: BackendAddress[];
}

/**
 * Probe match condition.
 */
export interface ProbeMatchCondition {
  /**
   * Allowed status codes.
   *
   * @example ['200-399']
   */
  readonly statusCodes: string[];
}

/**
 * Health probe configuration.
 */
export interface Probe {
  /**
   * Name of the probe.
   */
  readonly name: string;

  /**
   * Protocol used for the probe.
   */
  readonly protocol: ApplicationGatewayProtocol;

  /**
   * Path for the probe.
   */
  readonly path: string;

  /**
   * Probe interval in seconds.
   */
  readonly interval: number;

  /**
   * Probe timeout in seconds.
   */
  readonly timeout: number;

  /**
   * Unhealthy threshold.
   */
  readonly unhealthyThreshold: number;

  /**
   * Pick host name from backend HTTP settings.
   */
  readonly pickHostNameFromBackendHttpSettings?: boolean;

  /**
   * Minimum number of servers.
   */
  readonly minServers?: number;

  /**
   * Host name.
   */
  readonly host?: string;

  /**
   * Match condition.
   */
  readonly match?: ProbeMatchCondition;
}

/**
 * Backend HTTP Settings.
 */
export interface BackendHttpSettings {
  /**
   * Name of the backend HTTP settings.
   */
  readonly name: string;

  /**
   * Port number.
   */
  readonly port: number;

  /**
   * Protocol.
   */
  readonly protocol: ApplicationGatewayProtocol;

  /**
   * Cookie based affinity.
   */
  readonly cookieBasedAffinity: ApplicationGatewayCookieBasedAffinity;

  /**
   * Request timeout in seconds.
   */
  readonly requestTimeout: number;

  /**
   * Probe reference.
   */
  readonly probe?: { id: string };

  /**
   * Pick host name from backend address.
   */
  readonly pickHostNameFromBackendAddress?: boolean;

  /**
   * Host name.
   */
  readonly hostName?: string;
}

/**
 * SSL certificate configuration.
 */
export interface SslCertificate {
  /**
   * Name of the SSL certificate.
   */
  readonly name: string;

  /**
   * Key Vault secret ID.
   */
  readonly keyVaultSecretId?: string;

  /**
   * Base64 encoded certificate data.
   */
  readonly data?: string;

  /**
   * Certificate password.
   */
  readonly password?: string;
}

/**
 * HTTP Listener.
 */
export interface HttpListener {
  /**
   * Name of the HTTP listener.
   */
  readonly name: string;

  /**
   * Frontend IP configuration reference.
   */
  readonly frontendIPConfiguration: { id: string };

  /**
   * Frontend port reference.
   */
  readonly frontendPort: { id: string };

  /**
   * Protocol.
   */
  readonly protocol: ApplicationGatewayProtocol;

  /**
   * Host name.
   */
  readonly hostName?: string;

  /**
   * Require server name indication.
   */
  readonly requireServerNameIndication?: boolean;

  /**
   * SSL certificate reference.
   */
  readonly sslCertificate?: { id: string };
}

/**
 * Request Routing Rule.
 */
export interface RequestRoutingRule {
  /**
   * Name of the request routing rule.
   */
  readonly name: string;

  /**
   * Rule type.
   */
  readonly ruleType: ApplicationGatewayRequestRoutingRuleType;

  /**
   * Priority (1-20000).
   */
  readonly priority: number;

  /**
   * HTTP listener reference.
   */
  readonly httpListener: { id: string };

  /**
   * Backend address pool reference.
   */
  readonly backendAddressPool?: { id: string };

  /**
   * Backend HTTP settings reference.
   */
  readonly backendHttpSettings?: { id: string };

  /**
   * Redirect configuration reference.
   */
  readonly redirectConfiguration?: { id: string };

  /**
   * URL path map reference.
   */
  readonly urlPathMap?: { id: string };
}

/**
 * Redirect Configuration.
 */
export interface RedirectConfiguration {
  /**
   * Name of the redirect configuration.
   */
  readonly name: string;

  /**
   * Redirect type.
   */
  readonly redirectType: ApplicationGatewayRedirectType;

  /**
   * Target listener reference.
   */
  readonly targetListener?: { id: string };

  /**
   * Target URL.
   */
  readonly targetUrl?: string;

  /**
   * Include path in redirect.
   */
  readonly includePath?: boolean;

  /**
   * Include query string in redirect.
   */
  readonly includeQueryString?: boolean;
}

/**
 * Web Application Firewall Configuration (legacy).
 *
 * @remarks
 * This is the legacy inline WAF configuration.
 * For v2 SKUs, prefer using a separate WAF Policy resource.
 */
export interface WebApplicationFirewallConfiguration {
  /**
   * Enable WAF.
   */
  readonly enabled: boolean;

  /**
   * WAF mode.
   */
  readonly firewallMode: 'Detection' | 'Prevention';

  /**
   * Rule set type.
   */
  readonly ruleSetType: string;

  /**
   * Rule set version.
   */
  readonly ruleSetVersion: string;

  /**
   * Disabled rule groups.
   */
  readonly disabledRuleGroups?: any[];

  /**
   * Request body check.
   */
  readonly requestBodyCheck?: boolean;

  /**
   * Max request body size in KB.
   */
  readonly maxRequestBodySizeInKb?: number;

  /**
   * File upload limit in MB.
   */
  readonly fileUploadLimitInMb?: number;

  /**
   * Exclusions.
   */
  readonly exclusions?: any[];
}

/**
 * WAF Policy reference.
 */
export interface FirewallPolicyReference {
  /**
   * Resource ID of the WAF policy.
   *
   * @example '/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Network/ApplicationGatewayWebApplicationFirewallPolicies/{policy}'
   */
  readonly id: string;
}

/**
 * Properties for ArmApplicationGateway (L1 construct).
 *
 * @remarks
 * Direct mapping to Microsoft.Network/applicationGateways ARM resource.
 * All properties are explicit with no defaults or auto-generation.
 *
 * ARM API Version: 2023-11-01
 *
 * @example
 * ```typescript
 * const props: ArmApplicationGatewayProps = {
 *   gatewayName: 'appgw-prod-eastus-01',
 *   location: 'eastus',
 *   resourceGroupName: 'rg-network',
 *   sku: {
 *     name: ApplicationGatewaySkuName.WAF_v2,
 *     tier: ApplicationGatewayTier.WAF_v2,
 *     capacity: 2
 *   },
 *   gatewayIPConfigurations: [...],
 *   frontendPorts: [...],
 *   frontendIPConfigurations: [...],
 *   backendAddressPools: [...],
 *   backendHttpSettingsCollection: [...],
 *   httpListeners: [...],
 *   requestRoutingRules: [...]
 * };
 * ```
 */
export interface ArmApplicationGatewayProps {
  /**
   * Name of the application gateway.
   *
   * @remarks
   * Must be 1-80 characters.
   */
  readonly gatewayName: string;

  /**
   * Azure region where the application gateway will be created.
   */
  readonly location: string;

  /**
   * Resource group name where the gateway will be deployed.
   */
  readonly resourceGroupName: string;

  /**
   * SKU configuration.
   */
  readonly sku: ApplicationGatewaySku;

  /**
   * Gateway IP configurations.
   */
  readonly gatewayIPConfigurations: GatewayIPConfiguration[];

  /**
   * Frontend IP configurations.
   */
  readonly frontendIPConfigurations: FrontendIPConfiguration[];

  /**
   * Frontend ports.
   */
  readonly frontendPorts: FrontendPort[];

  /**
   * Backend address pools.
   */
  readonly backendAddressPools: BackendAddressPool[];

  /**
   * Backend HTTP settings collection.
   */
  readonly backendHttpSettingsCollection: BackendHttpSettings[];

  /**
   * HTTP listeners.
   */
  readonly httpListeners: HttpListener[];

  /**
   * Request routing rules.
   */
  readonly requestRoutingRules: RequestRoutingRule[];

  /**
   * Probes.
   */
  readonly probes?: Probe[];

  /**
   * SSL certificates.
   */
  readonly sslCertificates?: SslCertificate[];

  /**
   * Redirect configurations.
   */
  readonly redirectConfigurations?: RedirectConfiguration[];

  /**
   * Web Application Firewall configuration (legacy).
   *
   * @remarks
   * For v2 SKUs, prefer using firewallPolicy instead.
   */
  readonly webApplicationFirewallConfiguration?: WebApplicationFirewallConfiguration;

  /**
   * Firewall policy reference.
   */
  readonly firewallPolicy?: FirewallPolicyReference;

  /**
   * Enable HTTP/2.
   */
  readonly enableHttp2?: boolean;

  /**
   * Tags to apply to the application gateway.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Backend configuration for L2 construct.
 */
export interface BackendConfig {
  /**
   * Name of the backend.
   */
  readonly name: string;

  /**
   * Backend addresses (FQDNs or IPs).
   */
  readonly addresses: string[];

  /**
   * Backend port.
   */
  readonly port: number;

  /**
   * Backend protocol.
   */
  readonly protocol: ApplicationGatewayProtocol;

  /**
   * Health probe path.
   */
  readonly probePath?: string;
}

/**
 * Listener configuration for L2 construct.
 */
export interface ListenerConfig {
  /**
   * Name of the listener.
   */
  readonly name: string;

  /**
   * Port number.
   */
  readonly port: number;

  /**
   * Protocol.
   */
  readonly protocol: ApplicationGatewayProtocol;

  /**
   * Host name.
   */
  readonly hostName?: string;

  /**
   * SSL certificate name (if HTTPS).
   */
  readonly sslCertificateName?: string;
}

/**
 * Properties for ApplicationGateway (L2 construct).
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 * Designed for developer productivity with minimal required properties.
 *
 * @example
 * ```typescript
 * // Minimal usage - auto-generates name, uses stack location and RG
 * const appgw = new ApplicationGateway(resourceGroup, 'MainAppGw', {
 *   subnetId: '/subscriptions/.../subnets/appgw',
 *   publicIpAddressId: '/subscriptions/.../publicIPAddresses/pip'
 * });
 *
 * // With custom properties
 * const appgw = new ApplicationGateway(resourceGroup, 'MainAppGw', {
 *   gatewayName: 'my-custom-appgw',
 *   subnetId: '/subscriptions/.../subnets/appgw',
 *   publicIpAddressId: '/subscriptions/.../publicIPAddresses/pip',
 *   sku: {
 *     name: ApplicationGatewaySkuName.WAF_v2,
 *     tier: ApplicationGatewayTier.WAF_v2,
 *     capacity: 2
 *   }
 * });
 * ```
 */
export interface ApplicationGatewaysProps {
  /**
   * Name of the application gateway.
   *
   * @remarks
   * If not provided, will be auto-generated using the parent's naming context.
   */
  readonly gatewayName?: string;

  /**
   * Azure region where the application gateway will be created.
   *
   * @remarks
   * If not provided, defaults to the parent resource group's location.
   */
  readonly location?: string;

  /**
   * Subnet ID where the application gateway will be deployed.
   */
  readonly subnetId: string;

  /**
   * Public IP address ID for the frontend.
   */
  readonly publicIpAddressId?: string;

  /**
   * SKU configuration.
   *
   * @remarks
   * Defaults to WAF_v2 with capacity 1.
   */
  readonly sku?: ApplicationGatewaySku;

  /**
   * WAF Policy ID.
   */
  readonly wafPolicyId?: string;

  /**
   * Enable HTTP/2.
   *
   * @default false
   */
  readonly enableHttp2?: boolean;

  /**
   * Tags to apply to the application gateway.
   *
   * @remarks
   * These tags will be merged with the parent's tags.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Interface for Application Gateway reference.
 *
 * @remarks
 * Allows resources to reference an application gateway without depending on the construct class.
 */
export interface IApplicationGateway {
  /**
   * Name of the application gateway.
   */
  readonly gatewayName: string;

  /**
   * Location of the application gateway.
   */
  readonly location: string;

  /**
   * Resource group name where the gateway is deployed.
   */
  readonly resourceGroupName: string;

  /**
   * SKU configuration.
   */
  readonly sku: ApplicationGatewaySku;
}
