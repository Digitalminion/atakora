/**
 * Microsoft.Network resource constructs
 *
 * This namespace contains Azure networking resources including:
 * - Virtual Networks (Microsoft.Network/virtualNetworks)
 * - Subnets (Microsoft.Network/virtualNetworks/subnets)
 * - Network Security Groups (Microsoft.Network/networkSecurityGroups)
 * - Public IP Addresses (Microsoft.Network/publicIPAddresses)
 * - Private DNS Zones (Microsoft.Network/privateDnsZones)
 * - Public DNS Zones (Microsoft.Network/dnsZones)
 * - Private Endpoints (Microsoft.Network/privateEndpoints)
 * - Application Gateways (Microsoft.Network/applicationGateways)
 * - WAF Policies (Microsoft.Network/ApplicationGatewayWebApplicationFirewallPolicies)
 *
 * @packageDocumentation
 */

// Virtual Network exports
export { ArmVirtualNetwork } from './virtual-network-arm';
export { VirtualNetworks } from './virtual-networks';
export type {
  ArmVirtualNetworkProps,
  VirtualNetworksProps,
  IVirtualNetwork,
  AddressSpace,
  DhcpOptions,
  InlineSubnetProps,
} from './virtual-network-types';

// Subnet exports
export { ArmSubnet } from './subnet-arm';
export { Subnets } from './subnets';
export type {
  ArmSubnetProps,
  SubnetsProps,
  ISubnet,
  ServiceEndpoint,
  Delegation,
  NetworkSecurityGroupReference,
} from './subnet-types';
export {
  PrivateEndpointNetworkPolicies,
  PrivateLinkServiceNetworkPolicies,
  SharingScope,
} from './subnet-types';

// Network Security Group exports
export { ArmNetworkSecurityGroup } from './network-security-group-arm';
export { NetworkSecurityGroups } from './network-security-groups';
export type {
  ArmNetworkSecurityGroupProps,
  NetworkSecurityGroupsProps,
  INetworkSecurityGroup,
  SecurityRule,
} from './network-security-group-types';
export { SecurityRuleProtocol, SecurityRuleAccess, SecurityRuleDirection } from './network-security-group-types';

// Public IP Address exports
export { ArmPublicIpAddress } from './public-ip-address-arm';
export { PublicIPAddresses } from './public-ip-addresses';
export type {
  ArmPublicIpAddressProps,
  PublicIPAddressesProps,
  IPublicIpAddress,
  PublicIPAddressSkuConfig,
} from './public-ip-address-types';
export { PublicIPAddressSku, PublicIPAllocationMethod, IpVersion } from './public-ip-address-types';

// Private DNS Zone exports
export { ArmPrivateDnsZone } from './private-dns-zone-arm';
export { PrivateDnsZones } from './private-dns-zones';
export type { ArmPrivateDnsZoneProps, PrivateDnsZonesProps, IPrivateDnsZone } from './private-dns-zone-types';

// Public DNS Zone exports
export { ArmPublicDnsZone } from './public-dns-zone-arm';
export { PublicDnsZones } from './public-dns-zones';
export type { ArmPublicDnsZoneProps, PublicDnsZonesProps, IPublicDnsZone } from './public-dns-zone-types';
export { DnsZoneType } from './public-dns-zone-types';

// DNS Record exports
export { ArmDnsCNameRecords } from './dns-cname-record-arm';
export { ArmDnsTxtRecords } from './dns-txt-record-arm';
export { DnsCNameRecords } from './dns-cname-records';
export { DnsTxtRecords } from './dns-txt-records';
export type {
  ArmDnsCNameRecordProps,
  ArmDnsTxtRecordProps,
  DnsCNameRecordsProps,
  DnsTxtRecordsProps,
  IDnsCNameRecord,
  IDnsTxtRecord,
  DnsRecordType,
} from './dns-record-types';
export { DnsRecordType as DnsRecordTypeEnum } from './dns-record-types';

// Virtual Network Link exports (for Private DNS Zone)
export { ArmVirtualNetworkLink } from './virtual-network-link-arm';
export { VirtualNetworkLinks } from './virtual-network-links';
export type {
  ArmVirtualNetworkLinkProps,
  VirtualNetworkLinksProps,
  IVirtualNetworkLink,
} from './virtual-network-link-types';

// Private Endpoint exports
export { ArmPrivateEndpoint } from './private-endpoint-arm';
export { PrivateEndpoints } from './private-endpoints';
export type {
  ArmPrivateEndpointProps,
  PrivateEndpointsProps,
  IPrivateEndpoint,
  PrivateLinkServiceConnection,
  PrivateDnsZoneGroup,
  PrivateDnsZoneConfig,
  SubnetReference,
  ISubnet as ISubnetReference,
  IPrivateDnsZone as IPrivateDnsZoneReference,
  IPrivateLinkResource,
} from './private-endpoint-types';

// Application Gateway exports
export { ArmApplicationGateway } from './application-gateway-arm';
export { ApplicationGateways } from './application-gateways';
export type {
  ArmApplicationGatewayProps,
  ApplicationGatewaysProps,
  IApplicationGateway,
  ApplicationGatewaySku,
  GatewayIPConfiguration,
  FrontendIPConfiguration,
  FrontendPort,
  BackendAddressPool,
  BackendHttpSettings,
  HttpListener,
  RequestRoutingRule,
  Probe,
  SslCertificate,
  RedirectConfiguration,
} from './application-gateway-types';
export {
  ApplicationGatewaySkuName,
  ApplicationGatewayTier,
  ApplicationGatewayProtocol,
  ApplicationGatewayCookieBasedAffinity,
  ApplicationGatewayRequestRoutingRuleType,
  ApplicationGatewayRedirectType,
} from './application-gateway-types';

// WAF Policy exports
export { ArmWafPolicy } from './waf-policy-arm';
export { ApplicationGatewayWebApplicationFirewallPolicies } from './application-gateway-web-application-firewall-policies';
export type {
  ArmWafPolicyProps,
  ApplicationGatewayWebApplicationFirewallPoliciesProps,
  IWafPolicy,
  PolicySettings,
  ManagedRules,
  ManagedRuleSet,
  ManagedRuleExclusion,
  CustomRule,
  MatchCondition,
  RuleGroupOverride,
} from './waf-policy-types';
export {
  WafPolicyMode,
  WafState,
  WafRuleSetType,
  WafMatchVariable,
  WafOperator,
} from './waf-policy-types';
