/**
 * Azure CDN schema module (Microsoft.Cdn).
 *
 * @remarks
 * Type definitions and enums for Azure CDN resources.
 *
 * @packageDocumentation
 */

// Export all enums
export {
  CdnSkuName,
  QueryStringCachingBehavior,
  OptimizationType,
  ProtocolType,
  EndpointResourceState,
  CustomHttpsProvisioningState,
  CertificateSource,
  MinimumTlsVersion,
  RedirectType,
  GeoFilterAction,
} from './enums';

// Export all types
export type {
  Sku,
  ManagedServiceIdentity,
  UserAssignedIdentity,
  ProfileProperties,
  CdnProfile,
  DeepCreatedOrigin,
  DeepCreatedOriginGroup,
  GeoFilter,
  UrlSigningKey,
  DeliveryRule,
  DeliveryRuleCondition,
  DeliveryRuleAction,
  EndpointPropertiesUpdateParametersDeliveryPolicy,
  EndpointProperties,
  CdnEndpoint,
  CdnManagedHttpsParameters,
  UserManagedHttpsParameters,
  CustomDomainProperties,
  CdnCustomDomain,
  OriginProperties,
  CdnOrigin,
} from './types';
