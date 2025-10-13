/**
 * Type definitions for Azure Network (Microsoft.Network).
 *
 * @remarks
 * Complete type definitions for Azure Network resources.
 *
 * **Resource Types**:
 * - Microsoft.Network/publicIPAddresses
 * - Microsoft.Network/networkSecurityGroups
 * - Microsoft.Network/virtualNetworks
 * - Microsoft.Network/applicationGateways
 * - Microsoft.Network/dnsZones
 *
 * **API Version**: 2023-11-01
 *
 * @packageDocumentation
 */

import type {
  PublicIPAddressSku,
  PublicIPAllocationMethod,
  IpVersion,
  SecurityRuleProtocol,
  SecurityRuleAccess,
  SecurityRuleDirection,
  PrivateEndpointNetworkPolicies,
  PrivateLinkServiceNetworkPolicies,
  SharingScope,
  ApplicationGatewaySkuName,
  ApplicationGatewayTier,
  ApplicationGatewayProtocol,
  ApplicationGatewayRequestRoutingRuleType,
  ApplicationGatewayRedirectType,
  ApplicationGatewayCookieBasedAffinity,
  WafPolicyMode,
  WafRuleSetType,
  WafRuleSetVersion,
  WafState,
  WafCustomRuleAction,
  WafCustomRuleType,
  WafMatchVariable,
  WafOperator,
  DnsZoneType,
  DnsRecordType,
} from './enums';

// Public IP Address Types

/**
 * Public IP Address SKU configuration.
 */
export interface PublicIPAddressSkuConfig {
  /**
   * SKU name.
   */
  readonly name: PublicIPAddressSku;

  /**
   * SKU tier.
   *
   * @remarks
   * Values: 'Regional' | 'Global'
   */
  readonly tier?: 'Regional' | 'Global';
}

/**
 * DNS settings for public IP address.
 */
export interface PublicIPAddressDnsSettings {
  /**
   * Domain name label.
   *
   * @remarks
   * Creates a DNS name: {domainNameLabel}.{location}.cloudapp.azure.com
   */
  readonly domainNameLabel?: string;

  /**
   * Reverse FQDN.
   */
  readonly reverseFqdn?: string;
}

/**
 * DDoS settings for public IP address.
 */
export interface DdosSettings {
  /**
   * DDoS protection plan.
   */
  readonly ddosProtectionPlan?: {
    /**
     * Resource ID of DDoS protection plan.
     */
    readonly id: string;
  };

  /**
   * Protection mode.
   *
   * @remarks
   * Values: 'VirtualNetworkInherited' | 'Enabled' | 'Disabled'
   */
  readonly protectionMode?: 'VirtualNetworkInherited' | 'Enabled' | 'Disabled';
}

// Network Security Group Types

/**
 * Security rule configuration.
 */
export interface SecurityRule {
  /**
   * Rule name.
   */
  readonly name: string;

  /**
   * Rule properties.
   */
  readonly properties: {
    /**
     * Rule description.
     */
    readonly description?: string;

    /**
     * Network protocol.
     */
    readonly protocol: SecurityRuleProtocol;

    /**
     * Source port range.
     *
     * @remarks
     * Can be '*', a single port number (e.g., '80'), or a range (e.g., '1024-65535')
     */
    readonly sourcePortRange?: string;

    /**
     * Source port ranges.
     */
    readonly sourcePortRanges?: string[];

    /**
     * Destination port range.
     */
    readonly destinationPortRange?: string;

    /**
     * Destination port ranges.
     */
    readonly destinationPortRanges?: string[];

    /**
     * Source address prefix.
     *
     * @remarks
     * Can be CIDR, IP address, '*', or service tag
     */
    readonly sourceAddressPrefix?: string;

    /**
     * Source address prefixes.
     */
    readonly sourceAddressPrefixes?: string[];

    /**
     * Destination address prefix.
     */
    readonly destinationAddressPrefix?: string;

    /**
     * Destination address prefixes.
     */
    readonly destinationAddressPrefixes?: string[];

    /**
     * Access type.
     */
    readonly access: SecurityRuleAccess;

    /**
     * Priority (100-4096).
     */
    readonly priority: number;

    /**
     * Traffic direction.
     */
    readonly direction: SecurityRuleDirection;

    /**
     * Source application security groups.
     */
    readonly sourceApplicationSecurityGroups?: Array<{ readonly id: string }>;

    /**
     * Destination application security groups.
     */
    readonly destinationApplicationSecurityGroups?: Array<{ readonly id: string }>;
  };
}

// Virtual Network Types

/**
 * Address space configuration.
 */
export interface AddressSpace {
  /**
   * Address prefixes (CIDR blocks).
   */
  readonly addressPrefixes: string[];
}

/**
 * DHCP options configuration.
 */
export interface DhcpOptions {
  /**
   * DNS servers.
   */
  readonly dnsServers: string[];
}

/**
 * Virtual network peering configuration.
 */
export interface VirtualNetworkPeering {
  /**
   * Peering name.
   */
  readonly name: string;

  /**
   * Peering properties.
   */
  readonly properties: {
    /**
     * Remote virtual network resource ID.
     */
    readonly remoteVirtualNetwork: {
      readonly id: string;
    };

    /**
     * Allow virtual network access.
     */
    readonly allowVirtualNetworkAccess?: boolean;

    /**
     * Allow forwarded traffic.
     */
    readonly allowForwardedTraffic?: boolean;

    /**
     * Allow gateway transit.
     */
    readonly allowGatewayTransit?: boolean;

    /**
     * Use remote gateways.
     */
    readonly useRemoteGateways?: boolean;

    /**
     * Remote address space.
     */
    readonly remoteAddressSpace?: AddressSpace;

    /**
     * Remote BGP communities.
     */
    readonly remoteBgpCommunities?: {
      readonly virtualNetworkCommunity?: string;
      readonly regionalCommunity?: string;
    };
  };
}

/**
 * Service endpoint configuration.
 */
export interface ServiceEndpoint {
  /**
   * Service type.
   *
   * @remarks
   * Examples: 'Microsoft.Storage', 'Microsoft.Sql', 'Microsoft.KeyVault'
   */
  readonly service: string;

  /**
   * Service locations.
   */
  readonly locations?: string[];
}

/**
 * Service endpoint policy definition.
 */
export interface ServiceEndpointPolicyDefinition {
  /**
   * Policy definition name.
   */
  readonly name: string;

  /**
   * Policy definition properties.
   */
  readonly properties: {
    /**
     * Description.
     */
    readonly description?: string;

    /**
     * Service name.
     */
    readonly service: string;

    /**
     * Service resources.
     */
    readonly serviceResources: string[];
  };
}

/**
 * Delegation configuration.
 */
export interface Delegation {
  /**
   * Delegation name.
   */
  readonly name: string;

  /**
   * Delegation properties.
   */
  readonly properties: {
    /**
     * Service name.
     *
     * @remarks
     * Example: 'Microsoft.ContainerInstance/containerGroups'
     */
    readonly serviceName: string;

    /**
     * Actions allowed for the service.
     */
    readonly actions?: string[];
  };
}

/**
 * Route table route configuration.
 */
export interface Route {
  /**
   * Route name.
   */
  readonly name: string;

  /**
   * Route properties.
   */
  readonly properties: {
    /**
     * Address prefix (CIDR).
     */
    readonly addressPrefix: string;

    /**
     * Next hop type.
     *
     * @remarks
     * Values: 'VirtualNetworkGateway' | 'VnetLocal' | 'Internet' | 'VirtualAppliance' | 'None'
     */
    readonly nextHopType: 'VirtualNetworkGateway' | 'VnetLocal' | 'Internet' | 'VirtualAppliance' | 'None';

    /**
     * Next hop IP address.
     *
     * @remarks
     * Required when nextHopType is 'VirtualAppliance'
     */
    readonly nextHopIpAddress?: string;
  };
}

// Application Gateway Types

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
   * Capacity (instance count).
   */
  readonly capacity?: number;
}

/**
 * Application Gateway IP configuration.
 */
export interface ApplicationGatewayIPConfiguration {
  /**
   * Configuration name.
   */
  readonly name: string;

  /**
   * Configuration properties.
   */
  readonly properties: {
    /**
     * Subnet resource ID.
     */
    readonly subnet: {
      readonly id: string;
    };
  };
}

/**
 * Application Gateway frontend IP configuration.
 */
export interface ApplicationGatewayFrontendIPConfiguration {
  /**
   * Configuration name.
   */
  readonly name: string;

  /**
   * Configuration properties.
   */
  readonly properties: {
    /**
     * Private IP address.
     */
    readonly privateIPAddress?: string;

    /**
     * Private IP allocation method.
     *
     * @remarks
     * Values: 'Static' | 'Dynamic'
     */
    readonly privateIPAllocationMethod?: 'Static' | 'Dynamic';

    /**
     * Subnet resource ID.
     */
    readonly subnet?: {
      readonly id: string;
    };

    /**
     * Public IP address resource ID.
     */
    readonly publicIPAddress?: {
      readonly id: string;
    };
  };
}

/**
 * Application Gateway frontend port.
 */
export interface ApplicationGatewayFrontendPort {
  /**
   * Port name.
   */
  readonly name: string;

  /**
   * Port properties.
   */
  readonly properties: {
    /**
     * Port number.
     */
    readonly port: number;
  };
}

/**
 * Application Gateway backend address pool.
 */
export interface ApplicationGatewayBackendAddressPool {
  /**
   * Pool name.
   */
  readonly name: string;

  /**
   * Pool properties.
   */
  readonly properties?: {
    /**
     * Backend addresses.
     */
    readonly backendAddresses?: Array<{
      /**
       * FQDN of backend.
       */
      readonly fqdn?: string;

      /**
       * IP address of backend.
       */
      readonly ipAddress?: string;
    }>;
  };
}

/**
 * Application Gateway backend HTTP settings.
 */
export interface ApplicationGatewayBackendHttpSettings {
  /**
   * Settings name.
   */
  readonly name: string;

  /**
   * Settings properties.
   */
  readonly properties: {
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
    readonly cookieBasedAffinity?: ApplicationGatewayCookieBasedAffinity;

    /**
     * Request timeout in seconds.
     */
    readonly requestTimeout?: number;

    /**
     * Probe resource ID.
     */
    readonly probe?: {
      readonly id: string;
    };

    /**
     * Trusted root certificates.
     */
    readonly trustedRootCertificates?: Array<{
      readonly id: string;
    }>;

    /**
     * Pick host name from backend address.
     */
    readonly pickHostNameFromBackendAddress?: boolean;

    /**
     * Host name.
     */
    readonly hostName?: string;

    /**
     * Path.
     */
    readonly path?: string;
  };
}

/**
 * Application Gateway HTTP listener.
 */
export interface ApplicationGatewayHttpListener {
  /**
   * Listener name.
   */
  readonly name: string;

  /**
   * Listener properties.
   */
  readonly properties: {
    /**
     * Frontend IP configuration resource ID.
     */
    readonly frontendIPConfiguration: {
      readonly id: string;
    };

    /**
     * Frontend port resource ID.
     */
    readonly frontendPort: {
      readonly id: string;
    };

    /**
     * Protocol.
     */
    readonly protocol: ApplicationGatewayProtocol;

    /**
     * SSL certificate resource ID.
     */
    readonly sslCertificate?: {
      readonly id: string;
    };

    /**
     * Host name.
     */
    readonly hostName?: string;

    /**
     * Host names.
     */
    readonly hostNames?: string[];

    /**
     * Require server name indication.
     */
    readonly requireServerNameIndication?: boolean;
  };
}

/**
 * Application Gateway request routing rule.
 */
export interface ApplicationGatewayRequestRoutingRule {
  /**
   * Rule name.
   */
  readonly name: string;

  /**
   * Rule properties.
   */
  readonly properties: {
    /**
     * Rule type.
     */
    readonly ruleType: ApplicationGatewayRequestRoutingRuleType;

    /**
     * Priority.
     */
    readonly priority?: number;

    /**
     * HTTP listener resource ID.
     */
    readonly httpListener: {
      readonly id: string;
    };

    /**
     * Backend address pool resource ID.
     */
    readonly backendAddressPool?: {
      readonly id: string;
    };

    /**
     * Backend HTTP settings resource ID.
     */
    readonly backendHttpSettings?: {
      readonly id: string;
    };

    /**
     * Redirect configuration resource ID.
     */
    readonly redirectConfiguration?: {
      readonly id: string;
    };

    /**
     * URL path map resource ID.
     */
    readonly urlPathMap?: {
      readonly id: string;
    };

    /**
     * Rewrite rule set resource ID.
     */
    readonly rewriteRuleSet?: {
      readonly id: string;
    };
  };
}

// DNS Zone Types

/**
 * DNS zone SOA record.
 */
export interface SoaRecord {
  /**
   * Primary name server.
   */
  readonly host: string;

  /**
   * Email address of zone admin (with @ replaced by .).
   */
  readonly email: string;

  /**
   * Serial number.
   */
  readonly serialNumber: number;

  /**
   * Refresh time in seconds.
   */
  readonly refreshTime: number;

  /**
   * Retry time in seconds.
   */
  readonly retryTime: number;

  /**
   * Expire time in seconds.
   */
  readonly expireTime: number;

  /**
   * Minimum TTL in seconds.
   */
  readonly minimumTtl: number;
}

/**
 * DNS A record.
 */
export interface ARecord {
  /**
   * IPv4 address.
   */
  readonly ipv4Address: string;
}

/**
 * DNS AAAA record.
 */
export interface AaaaRecord {
  /**
   * IPv6 address.
   */
  readonly ipv6Address: string;
}

/**
 * DNS MX record.
 */
export interface MxRecord {
  /**
   * Preference value.
   */
  readonly preference: number;

  /**
   * Mail exchange server.
   */
  readonly exchange: string;
}

/**
 * DNS NS record.
 */
export interface NsRecord {
  /**
   * Name server domain name.
   */
  readonly nsdname: string;
}

/**
 * DNS PTR record.
 */
export interface PtrRecord {
  /**
   * PTR domain name.
   */
  readonly ptrdname: string;
}

/**
 * DNS SRV record.
 */
export interface SrvRecord {
  /**
   * Priority.
   */
  readonly priority: number;

  /**
   * Weight.
   */
  readonly weight: number;

  /**
   * Port.
   */
  readonly port: number;

  /**
   * Target domain name.
   */
  readonly target: string;
}

/**
 * DNS TXT record.
 */
export interface TxtRecord {
  /**
   * Text values.
   */
  readonly value: string[];
}

/**
 * DNS CNAME record.
 */
export interface CnameRecord {
  /**
   * Canonical name.
   */
  readonly cname: string;
}

/**
 * DNS CAA record.
 */
export interface CaaRecord {
  /**
   * Flags (0 or 128).
   */
  readonly flags: number;

  /**
   * Tag ('issue', 'issuewild', or 'iodef').
   */
  readonly tag: string;

  /**
   * Value.
   */
  readonly value: string;
}
