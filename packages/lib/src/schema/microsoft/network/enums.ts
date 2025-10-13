/**
 * Enums for Azure Network (Microsoft.Network).
 *
 * @remarks
 * Curated enums for Azure Network resources including public IPs, NSGs, subnets, and more.
 *
 * **Resource Types**:
 * - Microsoft.Network/publicIPAddresses
 * - Microsoft.Network/networkSecurityGroups
 * - Microsoft.Network/virtualNetworks/subnets
 *
 * **API Version**: 2023-11-01
 *
 * @packageDocumentation
 */

// Public IP Address enums

/**
 * SKU name for public IP address.
 */
export enum PublicIPAddressSku {
  BASIC = 'Basic',
  STANDARD = 'Standard',
}

/**
 * Public IP address allocation method.
 */
export enum PublicIPAllocationMethod {
  STATIC = 'Static',
  DYNAMIC = 'Dynamic',
}

/**
 * IP address version.
 */
export enum IpVersion {
  IPV4 = 'IPv4',
  IPV6 = 'IPv6',
}

// Network Security Group enums

/**
 * Network protocol for security rules.
 */
export enum SecurityRuleProtocol {
  TCP = 'Tcp',
  UDP = 'Udp',
  ICMP = 'Icmp',
  ESP = 'Esp',
  AH = 'Ah',
  ANY = '*',
}

/**
 * Access type for security rules.
 */
export enum SecurityRuleAccess {
  ALLOW = 'Allow',
  DENY = 'Deny',
}

/**
 * Direction for security rules.
 */
export enum SecurityRuleDirection {
  INBOUND = 'Inbound',
  OUTBOUND = 'Outbound',
}

// Subnet enums

/**
 * Network policies for private endpoints.
 */
export enum PrivateEndpointNetworkPolicies {
  ENABLED = 'Enabled',
  DISABLED = 'Disabled',
  NETWORK_SECURITY_GROUP_ENABLED = 'NetworkSecurityGroupEnabled',
  ROUTE_TABLE_ENABLED = 'RouteTableEnabled',
}

/**
 * Network policies for private link service.
 */
export enum PrivateLinkServiceNetworkPolicies {
  ENABLED = 'Enabled',
  DISABLED = 'Disabled',
}

/**
 * Sharing scope for the subnet.
 */
export enum SharingScope {
  TENANT = 'Tenant',
  DELEGATED_SERVICES = 'DelegatedServices',
}

// Application Gateway enums

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

// WAF Policy enums

/**
 * WAF policy mode.
 */
export enum WafPolicyMode {
  Prevention = 'Prevention',
  Detection = 'Detection',
}

/**
 * WAF rule set type.
 */
export enum WafRuleSetType {
  OWASP = 'OWASP',
  Microsoft_BotManagerRuleSet = 'Microsoft_BotManagerRuleSet',
}

/**
 * WAF rule set version.
 */
export enum WafRuleSetVersion {
  V3_2 = '3.2',
  V3_1 = '3.1',
  V3_0 = '3.0',
}

/**
 * WAF state.
 */
export enum WafState {
  Enabled = 'Enabled',
  Disabled = 'Disabled',
}

/**
 * WAF custom rule action.
 */
export enum WafCustomRuleAction {
  Allow = 'Allow',
  Block = 'Block',
  Log = 'Log',
}

/**
 * WAF custom rule type.
 */
export enum WafCustomRuleType {
  MatchRule = 'MatchRule',
  RateLimitRule = 'RateLimitRule',
}

/**
 * WAF match variable.
 */
export enum WafMatchVariable {
  RemoteAddr = 'RemoteAddr',
  RequestMethod = 'RequestMethod',
  QueryString = 'QueryString',
  PostArgs = 'PostArgs',
  RequestUri = 'RequestUri',
  RequestHeaders = 'RequestHeaders',
  RequestBody = 'RequestBody',
  RequestCookies = 'RequestCookies',
}

/**
 * WAF operator.
 */
export enum WafOperator {
  IPMatch = 'IPMatch',
  Equal = 'Equal',
  Contains = 'Contains',
  LessThan = 'LessThan',
  GreaterThan = 'GreaterThan',
  LessThanOrEqual = 'LessThanOrEqual',
  GreaterThanOrEqual = 'GreaterThanOrEqual',
  BeginsWith = 'BeginsWith',
  EndsWith = 'EndsWith',
  Regex = 'Regex',
  GeoMatch = 'GeoMatch',
}

// DNS Zone enums

/**
 * DNS zone type.
 */
export enum DnsZoneType {
  Public = 'Public',
  Private = 'Private',
}

/**
 * DNS record type.
 */
export enum DnsRecordType {
  /**
   * Address record - maps domain name to IPv4 address
   */
  A = 'A',

  /**
   * IPv6 address record - maps domain name to IPv6 address
   */
  AAAA = 'AAAA',

  /**
   * Canonical name record - alias for another domain name
   */
  CNAME = 'CNAME',

  /**
   * Mail exchange record - mail server for domain
   */
  MX = 'MX',

  /**
   * Name server record - delegates subdomain to different name server
   */
  NS = 'NS',

  /**
   * Pointer record - reverse DNS lookup
   */
  PTR = 'PTR',

  /**
   * Start of authority record - administrative info about zone
   */
  SOA = 'SOA',

  /**
   * Service locator - information about services
   */
  SRV = 'SRV',

  /**
   * Text record - arbitrary text data
   */
  TXT = 'TXT',

  /**
   * Certification authority authorization - specifies which CAs can issue certs
   */
  CAA = 'CAA',
}
