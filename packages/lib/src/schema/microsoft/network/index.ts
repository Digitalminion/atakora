/**
 * Azure Network (Microsoft.Network) schema module.
 *
 * @remarks
 * Centralized type definitions and enums for Azure Network resources.
 *
 * @packageDocumentation
 */

// Export all enums
export {
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

// Export all types
export type {
  PublicIPAddressSkuConfig,
  PublicIPAddressDnsSettings,
  DdosSettings,
  SecurityRule,
  AddressSpace,
  DhcpOptions,
  VirtualNetworkPeering,
  ServiceEndpoint,
  ServiceEndpointPolicyDefinition,
  Delegation,
  Route,
  ApplicationGatewaySku,
  ApplicationGatewayIPConfiguration,
  ApplicationGatewayFrontendIPConfiguration,
  ApplicationGatewayFrontendPort,
  ApplicationGatewayBackendAddressPool,
  ApplicationGatewayBackendHttpSettings,
  ApplicationGatewayHttpListener,
  ApplicationGatewayRequestRoutingRule,
  SoaRecord,
  ARecord,
  AaaaRecord,
  MxRecord,
  NsRecord,
  PtrRecord,
  SrvRecord,
  TxtRecord,
  CnameRecord,
  CaaRecord,
} from './types';
