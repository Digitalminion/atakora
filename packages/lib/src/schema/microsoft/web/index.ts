/**
 * Azure Web (Microsoft.Web) schema module.
 *
 * @remarks
 * Centralized type definitions and enums for Azure Web resources.
 *
 * @packageDocumentation
 */

// Export all enums
export {
  ServerFarmSkuName,
  ServerFarmSkuTier,
  ServerFarmKind,
  AppServiceKind,
  ManagedServiceIdentityType,
  FtpsState,
  MinTlsVersion,
  ConnectionStringType,
  FunctionRuntime,
  AuthLevel,
  HttpMethod,
} from './enums';

// Export all types
export type {
  ServerFarmSku,
  PerSiteScalingConfiguration,
  ManagedServiceIdentity,
  SiteConfig,
  NameValuePair,
  ConnStringInfo,
  SiteMachineKey,
  HandlerMapping,
  VirtualApplication,
  VirtualDirectory,
  Experiments,
  RampUpRule,
  SiteLimits,
  AutoHealRules,
  AutoHealTriggers,
  AutoHealActions,
  AutoHealCustomAction,
  RequestsBasedTrigger,
  StatusCodesBasedTrigger,
  SlowRequestsBasedTrigger,
  CorsSettings,
  PushSettings,
  ApiDefinitionInfo,
  ApiManagementConfig,
  IpSecurityRestriction,
  HostNameSslState,
  SiteAuthSettings,
  FunctionTrigger,
  FunctionHostConfig,
} from './types';
