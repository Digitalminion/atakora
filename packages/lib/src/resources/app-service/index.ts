/**
 * App Service (Web App) constructs for Azure ARM templates.
 *
 * @packageDocumentation
 */

// L1 Construct
export { ArmAppService } from './arm-app-service';

// L2 Construct
export { AppService } from './app-service';

// Types and Enums
export type {
  ArmAppServiceProps,
  AppServiceProps,
  IAppService,
  ManagedServiceIdentity,
  NameValuePair,
  ConnectionStringInfo,
  VirtualNetworkSubnetResourceId,
  SiteConfig,
  CorsSettings,
  IpSecurityRestriction,
} from './types';

export {
  AppServiceKind,
  ManagedIdentityType,
  FtpsState,
  MinTlsVersion,
  ConnectionStringType,
} from './types';
