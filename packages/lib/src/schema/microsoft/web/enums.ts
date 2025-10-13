/**
 * Enums for Azure Web (Microsoft.Web).
 *
 * @remarks
 * Curated enums for Azure Web resources including App Service Plans and Web Apps.
 *
 * **Resource Types**:
 * - Microsoft.Web/serverfarms
 * - Microsoft.Web/sites
 *
 * **API Version**: 2023-01-01
 *
 * @packageDocumentation
 */

// Server Farm (App Service Plan) enums

/**
 * SKU name for Server Farm.
 */
export enum ServerFarmSkuName {
  F1 = 'F1',
  B1 = 'B1',
  B2 = 'B2',
  B3 = 'B3',
  S1 = 'S1',
  S2 = 'S2',
  S3 = 'S3',
  P1V2 = 'P1v2',
  P2V2 = 'P2v2',
  P3V2 = 'P3v2',
  P1V3 = 'P1v3',
  P2V3 = 'P2v3',
  P3V3 = 'P3v3',
}

/**
 * SKU tier for Server Farm.
 */
export enum ServerFarmSkuTier {
  FREE = 'Free',
  BASIC = 'Basic',
  STANDARD = 'Standard',
  PREMIUM = 'Premium',
  PREMIUM_V2 = 'PremiumV2',
  PREMIUM_V3 = 'PremiumV3',
}

/**
 * Kind of Server Farm.
 */
export enum ServerFarmKind {
  LINUX = 'linux',
  WINDOWS = 'windows',
  APP = 'app',
}

// App Service (Web App) enums

/**
 * Kind of App Service.
 */
export enum AppServiceKind {
  APP = 'app',
  FUNCTIONAPP = 'functionapp',
  API = 'api',
}

/**
 * Managed service identity type for App Services and Function Apps.
 */
export enum ManagedServiceIdentityType {
  /**
   * No identity.
   */
  NONE = 'None',

  /**
   * System-assigned managed identity.
   */
  SYSTEM_ASSIGNED = 'SystemAssigned',

  /**
   * User-assigned managed identity.
   */
  USER_ASSIGNED = 'UserAssigned',

  /**
   * Both system-assigned and user-assigned identities.
   */
  SYSTEM_ASSIGNED_USER_ASSIGNED = 'SystemAssigned,UserAssigned',
}

/**
 * FTPS state for the App Service.
 */
export enum FtpsState {
  ALL_ALLOWED = 'AllAllowed',
  FTPS_ONLY = 'FtpsOnly',
  DISABLED = 'Disabled',
}

/**
 * Minimum TLS version.
 */
export enum MinTlsVersion {
  TLS_1_0 = '1.0',
  TLS_1_1 = '1.1',
  TLS_1_2 = '1.2',
  TLS_1_3 = '1.3',
}

/**
 * Connection string type.
 */
export enum ConnectionStringType {
  MYSQL = 'MySql',
  SQL_SERVER = 'SQLServer',
  SQL_AZURE = 'SQLAzure',
  CUSTOM = 'Custom',
  NOTIFICATION_HUB = 'NotificationHub',
  SERVICE_BUS = 'ServiceBus',
  EVENT_HUB = 'EventHub',
  API_HUB = 'ApiHub',
  DOC_DB = 'DocDb',
  REDIS_CACHE = 'RedisCache',
  POSTGRESQL = 'PostgreSQL',
}

// Azure Functions enums

/**
 * Function runtime for Azure Functions.
 */
export enum FunctionRuntime {
  NODE = 'node',
  PYTHON = 'python',
  DOTNET = 'dotnet',
  JAVA = 'java',
  POWERSHELL = 'powershell',
  CUSTOM = 'custom',
}

/**
 * Authentication level for HTTP triggers.
 */
export enum AuthLevel {
  ANONYMOUS = 'anonymous',
  FUNCTION = 'function',
  ADMIN = 'admin',
}

/**
 * HTTP methods.
 */
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS',
}
