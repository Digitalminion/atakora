/**
 * Microsoft.Web resource constructs
 *
 * This namespace contains Azure web application resources including:
 * - App Services / Web Apps (Microsoft.Web/sites)
 * - App Service Plans / Server Farms (Microsoft.Web/serverfarms)
 *
 * @packageDocumentation
 */

// App Service (Sites) exports
export { ArmSites } from './site-arm';
export { Sites } from './sites';
export type {
  ArmSitesProps,
  SitesProps,
  ISite,
  SiteConfig,
  NameValuePair,
  ConnectionStringInfo,
  CorsSettings,
  IpSecurityRestriction,
  ManagedServiceIdentity,
} from './site-types';
export {
  AppServiceKind,
  ManagedIdentityType,
  FtpsState,
  MinTlsVersion,
  ConnectionStringType,
} from './site-types';

// App Service Plan (ServerFarms) exports
export { ArmServerFarms } from './server-farm-arm';
export { ServerFarms } from './server-farms';
export type {
  ArmServerFarmsProps,
  ServerFarmsProps,
  IServerFarm,
  ServerFarmSku,
} from './server-farm-types';
export {
  ServerFarmSkuName,
  ServerFarmSkuTier,
  ServerFarmKind,
} from './server-farm-types';
