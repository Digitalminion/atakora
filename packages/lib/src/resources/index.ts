/**
 * Azure ARM resource constructs.
 *
 * @remarks
 * This module exports all Azure resource constructs (L1 and L2).
 *
 * **L1 Constructs** (Arm prefix): Direct ARM template mapping, maximum control
 * **L2 Constructs** (no prefix): Intent-based API, auto-generation, sensible defaults
 *
 * @packageDocumentation
 */

// Resource Group
export {
  ResourceGroup,
  ArmResourceGroup,
  type ResourceGroupProps,
  type ArmResourceGroupProps,
  type IResourceGroup,
} from './resource-group';

// Virtual Network
export {
  VirtualNetwork,
  ArmVirtualNetwork,
  type VirtualNetworkProps,
  type ArmVirtualNetworkProps,
  type IVirtualNetwork,
  type AddressSpace,
  type DhcpOptions,
  type InlineSubnetProps,
} from './virtual-network';

// Subnet
export {
  Subnet,
  ArmSubnet,
  type SubnetProps,
  type ArmSubnetProps,
  type ISubnet,
  type ServiceEndpoint,
  type Delegation,
  type NetworkSecurityGroupReference,
  PrivateEndpointNetworkPolicies,
  PrivateLinkServiceNetworkPolicies,
  SharingScope,
} from './subnet';

// Network Security Group
export {
  NetworkSecurityGroup,
  ArmNetworkSecurityGroup,
  type NetworkSecurityGroupProps,
  type ArmNetworkSecurityGroupProps,
  type INetworkSecurityGroup,
  type SecurityRule,
  SecurityRuleProtocol,
  SecurityRuleAccess,
  SecurityRuleDirection,
} from './network-security-group';

// Log Analytics Workspace
export {
  LogAnalyticsWorkspace,
  ArmLogAnalyticsWorkspace,
  type LogAnalyticsWorkspaceProps,
  type ArmLogAnalyticsWorkspaceProps,
  type ILogAnalyticsWorkspace,
  type WorkspaceSkuConfig,
  type WorkspaceCapping,
  WorkspaceSku,
  PublicNetworkAccess,
} from './log-analytics-workspace';

// Private DNS Zone
export {
  PrivateDnsZone,
  ArmPrivateDnsZone,
  type PrivateDnsZoneProps,
  type ArmPrivateDnsZoneProps,
  type IPrivateDnsZone,
} from './private-dns-zone';

// API Management
export {
  ApiManagement,
  ArmApiManagement,
  ApiManagementApi,
  ArmApiManagementApi,
  ApiManagementProduct,
  ArmApiManagementProduct,
  ApiManagementSubscription,
  ArmApiManagementSubscription,
  ApiManagementPolicy,
  ArmApiManagementPolicy,
  type ApiManagementProps,
  type ArmApiManagementProps,
  type IApiManagement,
  type ApiManagementSku,
  type ApiManagementIdentity,
  type HostnameConfiguration,
  type VirtualNetworkConfiguration,
  type AdditionalLocation,
  type ApiManagementApiProps,
  type ArmApiManagementApiProps,
  type IApiManagementApi,
  type SubscriptionKeyParameterNames,
  type ApiManagementProductProps,
  type ArmApiManagementProductProps,
  type IApiManagementProduct,
  type ApiManagementSubscriptionProps,
  type ArmApiManagementSubscriptionProps,
  type IApiManagementSubscription,
  type ApiManagementPolicyProps,
  type ArmApiManagementPolicyProps,
  type IApiManagementPolicy,
  ApiManagementSkuName,
  VirtualNetworkType,
  HostnameType,
  ApiProtocol,
  ApiType,
  ProductState,
  SubscriptionState,
  PolicyFormat,
} from './api-management';

// Application Insights
export {
  ApplicationInsights,
  ArmApplicationInsights,
  type ApplicationInsightsProps,
  type ArmApplicationInsightsProps,
  type IApplicationInsights,
  ApplicationType,
  FlowType,
  RequestSource,
  IngestionMode,
} from './application-insights';

// Action Group
export {
  ActionGroup,
  ArmActionGroup,
  type ActionGroupProps,
  type ArmActionGroupProps,
  type IActionGroup,
  type EmailReceiver,
  type SmsReceiver,
  type WebhookReceiver,
  type AzureAppPushReceiver,
  type AutomationRunbookReceiver,
  type VoiceReceiver,
  type LogicAppReceiver,
  type AzureFunctionReceiver,
  type ArmRoleReceiver,
  type EventHubReceiver,
} from './action-group';

// Metric Alert
export {
  MetricAlert,
  ArmMetricAlert,
  type MetricAlertProps,
  type ArmMetricAlertProps,
  type IMetricAlert,
  type MetricAlertCriterion,
  type StaticThresholdCriterion,
  type DynamicThresholdCriterion,
  type MetricDimension,
  type MetricAlertAction,
  CriterionType,
  MetricAlertOperator,
  TimeAggregation,
  DynamicThresholdSensitivity,
} from './metric-alert';

// Autoscale Setting
export {
  AutoscaleSetting,
  ArmAutoscaleSetting,
  type AutoscaleSettingProps,
  type ArmAutoscaleSettingProps,
  type IAutoscaleSetting,
  type AutoscaleProfile,
  type AutoscaleRule,
  type MetricTrigger,
  type ScaleAction,
  type AutoscaleNotification,
  MetricOperator,
  TimeAggregationType,
  ScaleDirection,
  ScaleType,
  RecurrenceFrequency,
} from './autoscale-setting';

// Diagnostic Setting
export {
  DiagnosticSetting,
  ArmDiagnosticSetting,
  type DiagnosticSettingProps,
  type ArmDiagnosticSettingProps,
  type IDiagnosticSetting,
  type LogSettings,
  type MetricSettings,
} from './diagnostic-setting';

// Storage Account
export {
  StorageAccount,
  ArmStorageAccount,
  type StorageAccountProps,
  type ArmStorageAccountProps,
  type IStorageAccount,
  type StorageAccountSku,
  type NetworkAcls,
  StorageAccountSkuName,
  StorageAccountKind,
  AccessTier,
  TlsVersion,
  StoragePublicNetworkAccess,
  NetworkAclDefaultAction,
  NetworkAclBypass,
} from './storage-account';

// Key Vault
export {
  KeyVault,
  ArmKeyVault,
  type KeyVaultProps,
  type ArmKeyVaultProps,
  type IKeyVault,
  type KeyVaultSku,
  type NetworkRuleSet,
  type IpRule,
  type VirtualNetworkRule,
  KeyVaultSkuName,
  KeyVaultPublicNetworkAccess,
} from './key-vault';

// Cosmos DB
export {
  CosmosDbAccount,
  ArmCosmosDbAccount,
  type CosmosDbAccountProps,
  type ArmCosmosDbAccountProps,
  type ICosmosDbAccount,
  type ConsistencyPolicy,
  type Location,
  type Capability,
  CosmosDbKind,
  DatabaseAccountOfferType,
  ConsistencyLevel,
} from './cosmos-db';

// Search Service
export {
  SearchService,
  ArmSearchService,
  type SearchServiceProps,
  type ArmSearchServiceProps,
  type ISearchService,
  type SearchServiceSkuConfig,
  SearchServiceSku,
  HostingMode,
  SearchPublicNetworkAccess,
} from './search-service';

// OpenAI Service
export {
  OpenAIService,
  ArmOpenAIService,
  type OpenAIServiceProps,
  type ArmOpenAIServiceProps,
  type IOpenAIService,
  type OpenAISku,
  type OpenAINetworkRuleSet,
  type OpenAIIpRule,
  type OpenAIVirtualNetworkRule,
  CognitiveServicesSku,
  OpenAIPublicNetworkAccess,
  OpenAINetworkRuleAction,
} from './openai-service';

// Private Endpoint
export {
  PrivateEndpoint,
  ArmPrivateEndpoint,
  type PrivateEndpointProps,
  type ArmPrivateEndpointProps,
  type IPrivateEndpoint,
  type PrivateLinkServiceConnection,
  type PrivateDnsZoneGroup,
  type PrivateDnsZoneConfig as PrivateEndpointDnsZoneConfig,
  type SubnetReference,
  type IPrivateLinkResource,
} from './private-endpoint';

// Virtual Network Link
export {
  VirtualNetworkLink,
  ArmVirtualNetworkLink,
  type VirtualNetworkLinkProps,
  type ArmVirtualNetworkLinkProps,
  type IVirtualNetworkLink,
} from './private-dns-zone';

// App Service Plan
export {
  AppServicePlan,
  ArmAppServicePlan,
  type AppServicePlanProps,
  type ArmAppServicePlanProps,
  type IAppServicePlan,
  type AppServicePlanSku,
  AppServicePlanSkuName,
  AppServicePlanSkuTier,
  AppServicePlanKind,
} from './app-service-plan';

// App Service
export {
  AppService,
  ArmAppService,
  type AppServiceProps,
  type ArmAppServiceProps,
  type IAppService,
  type ManagedServiceIdentity,
  type NameValuePair,
  type ConnectionStringInfo,
  type VirtualNetworkSubnetResourceId,
  type SiteConfig,
  type CorsSettings,
  type IpSecurityRestriction,
  AppServiceKind,
  ManagedIdentityType,
  FtpsState,
  MinTlsVersion,
  ConnectionStringType,
} from './app-service';

// Public IP Address
export {
  PublicIpAddress,
  ArmPublicIpAddress,
  type PublicIpAddressProps,
  type ArmPublicIpAddressProps,
  type IPublicIpAddress,
  type PublicIPAddressSkuConfig,
  PublicIPAddressSku,
  PublicIPAllocationMethod,
  IpVersion,
} from './public-ip-address';

// WAF Policy
export {
  WafPolicy,
  ArmWafPolicy,
  type WafPolicyProps,
  type ArmWafPolicyProps,
  type IWafPolicy,
  type PolicySettings,
  type ManagedRules,
  type ManagedRuleSet,
  type RuleGroupOverride,
  type RuleOverride,
  type CustomRule,
  type MatchCondition,
  type MatchConditionVariable,
  type ManagedRuleExclusion,
  WafPolicyMode,
  WafRuleSetType,
  WafRuleSetVersion,
  WafState,
  WafCustomRuleAction,
  WafCustomRuleType,
  WafMatchVariable,
  WafOperator,
} from './waf-policy';

// Application Gateway
export {
  ApplicationGateway,
  ArmApplicationGateway,
  type ApplicationGatewayProps,
  type ArmApplicationGatewayProps,
  type IApplicationGateway,
  type ApplicationGatewaySku,
  type GatewayIPConfiguration,
  type FrontendIPConfiguration,
  type FrontendPort,
  type BackendAddressPool,
  type BackendAddress,
  type BackendHttpSettings,
  type HttpListener,
  type RequestRoutingRule,
  type RedirectConfiguration,
  type Probe,
  type ProbeMatchCondition,
  type SslCertificate,
  type WebApplicationFirewallConfiguration,
  type FirewallPolicyReference,
  type SubnetReference as AppGatewaySubnetReference,
  type PublicIPAddressReference,
  type BackendConfig,
  type ListenerConfig,
  ApplicationGatewaySkuName,
  ApplicationGatewayTier,
  ApplicationGatewayProtocol,
  ApplicationGatewayRequestRoutingRuleType,
  ApplicationGatewayRedirectType,
  ApplicationGatewayCookieBasedAffinity,
} from './application-gateway';
