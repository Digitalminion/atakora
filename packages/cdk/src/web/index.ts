/**
 * Microsoft.Web resource constructs
 *
 * This namespace contains Azure web application resources including:
 * - App Services / Web Apps (Microsoft.Web/sites)
 * - App Service Plans / Server Farms (Microsoft.Web/serverfarms)
 * - Azure Functions (Microsoft.Web/sites/functions)
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

// Azure Functions exports
export { ArmFunctionApp } from './function-app-arm';
export { ArmFunction } from './function-arm';
export type {
  ArmFunctionAppProps,
  ArmFunctionProps,
  IFunctionApp,
  IAzureFunction,
  FunctionAppSiteConfig,
  HttpTriggerConfig,
  TimerTriggerConfig,
  TriggerConfig,
} from './function-app-types';
export {
  FunctionRuntime,
  AuthLevel,
  HttpMethod,
} from './function-app-types';

// Function trigger builders
export {
  HttpTrigger,
  httpTrigger,
  anonymousGet,
  anonymousPost,
  validateRoute,
  extractRouteParams,
} from './triggers/http-trigger';

export {
  TimerTrigger,
  timerTrigger,
  CronSchedules,
  validateCronExpression,
  validateTimeSpan,
  timeSpanToCron,
  describeCronExpression,
} from './triggers/timer-trigger';

// Function packaging
export {
  InlinePackager,
  createInlinePackager,
  packageInline,
  canPackageInline,
  estimateEncodedSize,
  decodeInlinePackage,
  INLINE_CODE_MAX_SIZE,
} from './packaging/inline-packager';
export type { InlinePackageResult } from './packaging/inline-packager';
