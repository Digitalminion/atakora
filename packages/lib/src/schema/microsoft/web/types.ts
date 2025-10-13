/**
 * Type definitions for Azure Web (Microsoft.Web).
 *
 * @remarks
 * Complete type definitions for Azure Web resources.
 *
 * **Resource Types**:
 * - Microsoft.Web/serverfarms (App Service Plans)
 * - Microsoft.Web/sites (Web Apps, Function Apps, API Apps)
 *
 * **API Version**: 2023-01-01
 *
 * @packageDocumentation
 */

import type {
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

// Server Farm (App Service Plan) Types

/**
 * Server Farm SKU configuration.
 */
export interface ServerFarmSku {
  /**
   * SKU name.
   */
  readonly name: ServerFarmSkuName;

  /**
   * SKU tier.
   */
  readonly tier: ServerFarmSkuTier;

  /**
   * SKU size (typically same as name).
   */
  readonly size?: string;

  /**
   * SKU family.
   */
  readonly family?: string;

  /**
   * Instance capacity (1-30).
   */
  readonly capacity?: number;
}

/**
 * Per-site scaling configuration.
 */
export interface PerSiteScalingConfiguration {
  /**
   * Enable per-site scaling.
   *
   * @remarks
   * When enabled, apps can scale independently.
   */
  readonly perSiteScaling?: boolean;

  /**
   * Maximum number of workers (instances) per site.
   */
  readonly maximumElasticWorkerCount?: number;
}

// App Service (Web App / Function App) Types

/**
 * Managed service identity configuration.
 */
export interface ManagedServiceIdentity {
  /**
   * Identity type.
   */
  readonly type: ManagedServiceIdentityType;

  /**
   * User-assigned identities.
   *
   * @remarks
   * Map of user-assigned identity resource IDs to empty objects.
   */
  readonly userAssignedIdentities?: Record<string, {}>;
}

/**
 * Site configuration for App Service.
 */
export interface SiteConfig {
  /**
   * Number of workers.
   */
  readonly numberOfWorkers?: number;

  /**
   * Default documents.
   */
  readonly defaultDocuments?: string[];

  /**
   * .NET Framework version.
   */
  readonly netFrameworkVersion?: string;

  /**
   * PHP version.
   */
  readonly phpVersion?: string;

  /**
   * Python version.
   */
  readonly pythonVersion?: string;

  /**
   * Node.js version.
   */
  readonly nodeVersion?: string;

  /**
   * PowerShell Core version.
   */
  readonly powerShellVersion?: string;

  /**
   * Linux FX version (runtime stack for Linux apps).
   *
   * @remarks
   * Format: "RUNTIME|VERSION" (e.g., "NODE|18-lts", "PYTHON|3.11", "DOTNETCORE|8.0")
   */
  readonly linuxFxVersion?: string;

  /**
   * Windows FX version (runtime stack for Windows apps).
   */
  readonly windowsFxVersion?: string;

  /**
   * Request tracing enabled.
   */
  readonly requestTracingEnabled?: boolean;

  /**
   * Request tracing expiration time.
   */
  readonly requestTracingExpirationTime?: string;

  /**
   * Remote debugging enabled.
   */
  readonly remoteDebuggingEnabled?: boolean;

  /**
   * Remote debugging version.
   */
  readonly remoteDebuggingVersion?: string;

  /**
   * HTTP logging enabled.
   */
  readonly httpLoggingEnabled?: boolean;

  /**
   * ACR use managed identity credentials.
   */
  readonly acrUseManagedIdentityCreds?: boolean;

  /**
   * ACR user-managed identity ID.
   */
  readonly acrUserManagedIdentityID?: string;

  /**
   * Detailed error logging enabled.
   */
  readonly detailedErrorLoggingEnabled?: boolean;

  /**
   * Publishing username.
   */
  readonly publishingUsername?: string;

  /**
   * App settings.
   */
  readonly appSettings?: NameValuePair[];

  /**
   * Connection strings.
   */
  readonly connectionStrings?: ConnStringInfo[];

  /**
   * Machine key.
   */
  readonly machineKey?: SiteMachineKey;

  /**
   * Handler mappings.
   */
  readonly handlerMappings?: HandlerMapping[];

  /**
   * Document root.
   */
  readonly documentRoot?: string;

  /**
   * SCM type.
   *
   * @remarks
   * Values: 'None' | 'Dropbox' | 'Tfs' | 'LocalGit' | 'GitHub' | 'CodePlexGit' | 'CodePlexHg' | 'BitbucketGit' | 'BitbucketHg' | 'ExternalGit' | 'ExternalHg' | 'OneDrive' | 'VSO' | 'VSTSRM'
   */
  readonly scmType?: string;

  /**
   * Use 32-bit worker process.
   */
  readonly use32BitWorkerProcess?: boolean;

  /**
   * Web Sockets enabled.
   */
  readonly webSocketsEnabled?: boolean;

  /**
   * Always on.
   *
   * @remarks
   * Keeps the app loaded even when there's no traffic.
   * Required for continuous WebJobs and triggered WebJobs.
   */
  readonly alwaysOn?: boolean;

  /**
   * Java version.
   */
  readonly javaVersion?: string;

  /**
   * Java container.
   */
  readonly javaContainer?: string;

  /**
   * Java container version.
   */
  readonly javaContainerVersion?: string;

  /**
   * App command line to launch.
   */
  readonly appCommandLine?: string;

  /**
   * Managed pipeline mode.
   *
   * @remarks
   * Values: 'Integrated' | 'Classic'
   */
  readonly managedPipelineMode?: 'Integrated' | 'Classic';

  /**
   * Virtual applications.
   */
  readonly virtualApplications?: VirtualApplication[];

  /**
   * Load balancing.
   *
   * @remarks
   * Values: 'WeightedRoundRobin' | 'LeastRequests' | 'LeastResponseTime' | 'WeightedTotalTraffic' | 'RequestHash' | 'PerSiteRoundRobin'
   */
  readonly loadBalancing?: string;

  /**
   * Experiments.
   */
  readonly experiments?: Experiments;

  /**
   * Limits.
   */
  readonly limits?: SiteLimits;

  /**
   * Auto heal enabled.
   */
  readonly autoHealEnabled?: boolean;

  /**
   * Auto heal rules.
   */
  readonly autoHealRules?: AutoHealRules;

  /**
   * Tracing options.
   */
  readonly tracingOptions?: string;

  /**
   * Virtual network name.
   */
  readonly vnetName?: string;

  /**
   * Virtual network route all enabled.
   */
  readonly vnetRouteAllEnabled?: boolean;

  /**
   * Virtual network private ports count.
   */
  readonly vnetPrivatePortsCount?: number;

  /**
   * CORS configuration.
   */
  readonly cors?: CorsSettings;

  /**
   * Push configuration.
   */
  readonly push?: PushSettings;

  /**
   * API definition.
   */
  readonly apiDefinition?: ApiDefinitionInfo;

  /**
   * API management configuration.
   */
  readonly apiManagementConfig?: ApiManagementConfig;

  /**
   * Auto swap slot name.
   */
  readonly autoSwapSlotName?: string;

  /**
   * Local MySQL enabled.
   */
  readonly localMySqlEnabled?: boolean;

  /**
   * Managed service identity ID.
   */
  readonly managedServiceIdentityId?: number;

  /**
   * X-managed service identity ID.
   */
  readonly xManagedServiceIdentityId?: number;

  /**
   * Key vault reference identity.
   */
  readonly keyVaultReferenceIdentity?: string;

  /**
   * IP security restrictions.
   */
  readonly ipSecurityRestrictions?: IpSecurityRestriction[];

  /**
   * IP security restrictions default action.
   *
   * @remarks
   * Values: 'Allow' | 'Deny'
   */
  readonly ipSecurityRestrictionsDefaultAction?: 'Allow' | 'Deny';

  /**
   * SCM IP security restrictions.
   */
  readonly scmIpSecurityRestrictions?: IpSecurityRestriction[];

  /**
   * SCM IP security restrictions default action.
   */
  readonly scmIpSecurityRestrictionsDefaultAction?: 'Allow' | 'Deny';

  /**
   * Use same IP security restrictions for SCM.
   */
  readonly scmIpSecurityRestrictionsUseMain?: boolean;

  /**
   * HTTP20 enabled.
   */
  readonly http20Enabled?: boolean;

  /**
   * Minimum TLS version.
   */
  readonly minTlsVersion?: MinTlsVersion;

  /**
   * SCM minimum TLS version.
   */
  readonly scmMinTlsVersion?: MinTlsVersion;

  /**
   * FTPS state.
   */
  readonly ftpsState?: FtpsState;

  /**
   * Pre-warmed instance count.
   */
  readonly preWarmedInstanceCount?: number;

  /**
   * Function app scale limit.
   */
  readonly functionAppScaleLimit?: number;

  /**
   * Health check path.
   */
  readonly healthCheckPath?: string;

  /**
   * Functions runtime scale monitoring enabled.
   */
  readonly functionsRuntimeScaleMonitoringEnabled?: boolean;

  /**
   * Website time zone.
   */
  readonly websiteTimeZone?: string;

  /**
   * Minimum TLS cipher suite.
   *
   * @remarks
   * Values: 'TLS_AES_128_GCM_SHA256' | 'TLS_AES_256_GCM_SHA384' | 'TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256' | etc.
   */
  readonly minTlsCipherSuite?: string;

  /**
   * Supported TLS cipher suites.
   */
  readonly supportedTlsCipherSuites?: string[];

  /**
   * Number of prewarmed instances.
   */
  readonly numberOfPrewarmedInstances?: number;
}

/**
 * Name-value pair for app settings.
 */
export interface NameValuePair {
  /**
   * Setting name.
   */
  readonly name: string;

  /**
   * Setting value.
   */
  readonly value: string;
}

/**
 * Connection string information.
 */
export interface ConnStringInfo {
  /**
   * Connection string name.
   */
  readonly name: string;

  /**
   * Connection string value.
   */
  readonly connectionString: string;

  /**
   * Connection string type.
   */
  readonly type: ConnectionStringType;
}

/**
 * Site machine key.
 */
export interface SiteMachineKey {
  /**
   * Machine key validation.
   */
  readonly validation?: string;

  /**
   * Validation key.
   */
  readonly validationKey?: string;

  /**
   * Decryption algorithm.
   */
  readonly decryption?: string;

  /**
   * Decryption key.
   */
  readonly decryptionKey?: string;
}

/**
 * Handler mapping.
 */
export interface HandlerMapping {
  /**
   * Extension.
   */
  readonly extension?: string;

  /**
   * Script processor.
   */
  readonly scriptProcessor?: string;

  /**
   * Arguments.
   */
  readonly arguments?: string;
}

/**
 * Virtual application.
 */
export interface VirtualApplication {
  /**
   * Virtual path.
   */
  readonly virtualPath?: string;

  /**
   * Physical path.
   */
  readonly physicalPath?: string;

  /**
   * Preload enabled.
   */
  readonly preloadEnabled?: boolean;

  /**
   * Virtual directories.
   */
  readonly virtualDirectories?: VirtualDirectory[];
}

/**
 * Virtual directory.
 */
export interface VirtualDirectory {
  /**
   * Virtual path.
   */
  readonly virtualPath?: string;

  /**
   * Physical path.
   */
  readonly physicalPath?: string;
}

/**
 * Experiments.
 */
export interface Experiments {
  /**
   * Ramp up rules.
   */
  readonly rampUpRules?: RampUpRule[];
}

/**
 * Ramp-up rule.
 */
export interface RampUpRule {
  /**
   * Action host name.
   */
  readonly actionHostName?: string;

  /**
   * Reroute percentage.
   */
  readonly reroutePercentage?: number;

  /**
   * Change step.
   */
  readonly changeStep?: number;

  /**
   * Change interval in minutes.
   */
  readonly changeIntervalInMinutes?: number;

  /**
   * Minimum reroute percentage.
   */
  readonly minReroutePercentage?: number;

  /**
   * Maximum reroute percentage.
   */
  readonly maxReroutePercentage?: number;

  /**
   * Change decision callback URL.
   */
  readonly changeDecisionCallbackUrl?: string;

  /**
   * Name.
   */
  readonly name?: string;
}

/**
 * Site limits.
 */
export interface SiteLimits {
  /**
   * Maximum allowed CPU usage percentage.
   */
  readonly maxPercentageCpu?: number;

  /**
   * Maximum allowed memory usage in MB.
   */
  readonly maxMemoryInMb?: number;

  /**
   * Maximum allowed disk size in MB.
   */
  readonly maxDiskSizeInMb?: number;
}

/**
 * Auto-heal rules.
 */
export interface AutoHealRules {
  /**
   * Conditions that trigger auto-heal.
   */
  readonly triggers?: AutoHealTriggers;

  /**
   * Actions to take when auto-heal is triggered.
   */
  readonly actions?: AutoHealActions;
}

/**
 * Auto-heal triggers.
 */
export interface AutoHealTriggers {
  /**
   * Requests trigger.
   */
  readonly requests?: RequestsBasedTrigger;

  /**
   * Private bytes in KB.
   */
  readonly privateBytesInKB?: number;

  /**
   * Status codes.
   */
  readonly statusCodes?: StatusCodesBasedTrigger[];

  /**
   * Slow requests.
   */
  readonly slowRequests?: SlowRequestsBasedTrigger;

  /**
   * Slow requests with path.
   */
  readonly slowRequestsWithPath?: SlowRequestsBasedTrigger[];
}

/**
 * Requests-based trigger.
 */
export interface RequestsBasedTrigger {
  /**
   * Request count.
   */
  readonly count?: number;

  /**
   * Time interval.
   */
  readonly timeInterval?: string;
}

/**
 * Status codes-based trigger.
 */
export interface StatusCodesBasedTrigger {
  /**
   * HTTP status code.
   */
  readonly status?: number;

  /**
   * Sub-status code.
   */
  readonly subStatus?: number;

  /**
   * Win32 status code.
   */
  readonly win32Status?: number;

  /**
   * Request count.
   */
  readonly count?: number;

  /**
   * Time interval.
   */
  readonly timeInterval?: string;

  /**
   * Request path.
   */
  readonly path?: string;
}

/**
 * Slow requests-based trigger.
 */
export interface SlowRequestsBasedTrigger {
  /**
   * Time taken threshold.
   */
  readonly timeTaken?: string;

  /**
   * Request path.
   */
  readonly path?: string;

  /**
   * Request count.
   */
  readonly count?: number;

  /**
   * Time interval.
   */
  readonly timeInterval?: string;
}

/**
 * Auto-heal actions.
 */
export interface AutoHealActions {
  /**
   * Action type.
   *
   * @remarks
   * Values: 'Recycle' | 'LogEvent' | 'CustomAction'
   */
  readonly actionType?: 'Recycle' | 'LogEvent' | 'CustomAction';

  /**
   * Custom action.
   */
  readonly customAction?: AutoHealCustomAction;

  /**
   * Minimum process execution time.
   */
  readonly minProcessExecutionTime?: string;
}

/**
 * Auto-heal custom action.
 */
export interface AutoHealCustomAction {
  /**
   * Executable.
   */
  readonly exe?: string;

  /**
   * Parameters.
   */
  readonly parameters?: string;
}

/**
 * CORS settings.
 */
export interface CorsSettings {
  /**
   * Allowed origins.
   */
  readonly allowedOrigins?: string[];

  /**
   * Support credentials.
   */
  readonly supportCredentials?: boolean;
}

/**
 * Push settings.
 */
export interface PushSettings {
  /**
   * Push enabled.
   */
  readonly isPushEnabled: boolean;

  /**
   * Tag whitelist JSON.
   */
  readonly tagWhitelistJson?: string;

  /**
   * Tags requiring authentication.
   */
  readonly tagsRequiringAuth?: string;

  /**
   * Dynamic tags JSON.
   */
  readonly dynamicTagsJson?: string;
}

/**
 * API definition information.
 */
export interface ApiDefinitionInfo {
  /**
   * API definition URL.
   */
  readonly url?: string;
}

/**
 * API Management configuration.
 */
export interface ApiManagementConfig {
  /**
   * API Management resource ID.
   */
  readonly id?: string;
}

/**
 * IP security restriction.
 */
export interface IpSecurityRestriction {
  /**
   * IP address or CIDR.
   */
  readonly ipAddress?: string;

  /**
   * Subnet mask.
   */
  readonly subnetMask?: string;

  /**
   * Virtual network subnet resource ID.
   */
  readonly vnetSubnetResourceId?: string;

  /**
   * Virtual network traffic tag.
   */
  readonly vnetTrafficTag?: number;

  /**
   * Subnet traffic tag.
   */
  readonly subnetTrafficTag?: number;

  /**
   * Action.
   *
   * @remarks
   * Values: 'Allow' | 'Deny'
   */
  readonly action?: 'Allow' | 'Deny';

  /**
   * Tag.
   *
   * @remarks
   * Values: 'Default' | 'XffProxy' | 'ServiceTag'
   */
  readonly tag?: 'Default' | 'XffProxy' | 'ServiceTag';

  /**
   * Priority.
   */
  readonly priority?: number;

  /**
   * Name.
   */
  readonly name?: string;

  /**
   * Description.
   */
  readonly description?: string;

  /**
   * HTTP headers.
   */
  readonly headers?: Record<string, string[]>;
}

/**
 * Host name SSL state.
 */
export interface HostNameSslState {
  /**
   * Host name.
   */
  readonly name?: string;

  /**
   * SSL state.
   *
   * @remarks
   * Values: 'Disabled' | 'SniEnabled' | 'IpBasedEnabled'
   */
  readonly sslState?: 'Disabled' | 'SniEnabled' | 'IpBasedEnabled';

  /**
   * Virtual IP address assigned to the hostname (IP-based SSL only).
   */
  readonly virtualIP?: string;

  /**
   * SSL certificate thumbprint.
   */
  readonly thumbprint?: string;

  /**
   * Use SNI.
   */
  readonly toUpdate?: boolean;

  /**
   * Host type.
   *
   * @remarks
   * Values: 'Standard' | 'Repository'
   */
  readonly hostType?: 'Standard' | 'Repository';
}

/**
 * Site authentication settings.
 */
export interface SiteAuthSettings {
  /**
   * Authentication enabled.
   */
  readonly enabled?: boolean;

  /**
   * Runtime version.
   */
  readonly runtimeVersion?: string;

  /**
   * Unauthenticated client action.
   *
   * @remarks
   * Values: 'RedirectToLoginPage' | 'AllowAnonymous'
   */
  readonly unauthenticatedClientAction?: 'RedirectToLoginPage' | 'AllowAnonymous';

  /**
   * Token store enabled.
   */
  readonly tokenStoreEnabled?: boolean;

  /**
   * Allowed external redirect URLs.
   */
  readonly allowedExternalRedirectUrls?: string[];

  /**
   * Default authentication provider.
   *
   * @remarks
   * Values: 'AzureActiveDirectory' | 'Facebook' | 'Google' | 'MicrosoftAccount' | 'Twitter' | 'Github'
   */
  readonly defaultProvider?: string;

  /**
   * Token refresh extension hours.
   */
  readonly tokenRefreshExtensionHours?: number;

  /**
   * Client ID.
   */
  readonly clientId?: string;

  /**
   * Client secret.
   */
  readonly clientSecret?: string;

  /**
   * Client secret setting name.
   */
  readonly clientSecretSettingName?: string;

  /**
   * Client secret certificate thumbprint.
   */
  readonly clientSecretCertificateThumbprint?: string;

  /**
   * Issuer URL.
   */
  readonly issuer?: string;

  /**
   * Validate issuer.
   */
  readonly validateIssuer?: boolean;

  /**
   * Allowed audiences.
   */
  readonly allowedAudiences?: string[];

  /**
   * Additional login parameters.
   */
  readonly additionalLoginParams?: string[];

  /**
   * Azure AD claims.
   */
  readonly aadClaimsAuthorization?: string;

  /**
   * Google client ID.
   */
  readonly googleClientId?: string;

  /**
   * Google client secret.
   */
  readonly googleClientSecret?: string;

  /**
   * Google client secret setting name.
   */
  readonly googleClientSecretSettingName?: string;

  /**
   * Google OAuth scopes.
   */
  readonly googleOAuthScopes?: string[];

  /**
   * Facebook app ID.
   */
  readonly facebookAppId?: string;

  /**
   * Facebook app secret.
   */
  readonly facebookAppSecret?: string;

  /**
   * Facebook app secret setting name.
   */
  readonly facebookAppSecretSettingName?: string;

  /**
   * Facebook OAuth scopes.
   */
  readonly facebookOAuthScopes?: string[];

  /**
   * GitHub client ID.
   */
  readonly gitHubClientId?: string;

  /**
   * GitHub client secret.
   */
  readonly gitHubClientSecret?: string;

  /**
   * GitHub client secret setting name.
   */
  readonly gitHubClientSecretSettingName?: string;

  /**
   * GitHub OAuth scopes.
   */
  readonly gitHubOAuthScopes?: string[];

  /**
   * Twitter consumer key.
   */
  readonly twitterConsumerKey?: string;

  /**
   * Twitter consumer secret.
   */
  readonly twitterConsumerSecret?: string;

  /**
   * Twitter consumer secret setting name.
   */
  readonly twitterConsumerSecretSettingName?: string;

  /**
   * Microsoft account client ID.
   */
  readonly microsoftAccountClientId?: string;

  /**
   * Microsoft account client secret.
   */
  readonly microsoftAccountClientSecret?: string;

  /**
   * Microsoft account client secret setting name.
   */
  readonly microsoftAccountClientSecretSettingName?: string;

  /**
   * Microsoft account OAuth scopes.
   */
  readonly microsoftAccountOAuthScopes?: string[];

  /**
   * Auth file path.
   */
  readonly authFilePath?: string;

  /**
   * Config version.
   */
  readonly configVersion?: string;
}

// Azure Functions specific types

/**
 * Azure Functions trigger configuration.
 */
export interface FunctionTrigger {
  /**
   * Trigger type.
   *
   * @remarks
   * Values: 'httpTrigger' | 'timerTrigger' | 'blobTrigger' | 'queueTrigger' | 'cosmosDBTrigger' | 'eventHubTrigger' | 'serviceBusTrigger'
   */
  readonly type: string;

  /**
   * Trigger name.
   */
  readonly name: string;

  /**
   * Direction.
   *
   * @remarks
   * Values: 'in' | 'out' | 'inout'
   */
  readonly direction: 'in' | 'out' | 'inout';

  /**
   * HTTP methods (for HTTP triggers).
   */
  readonly methods?: HttpMethod[];

  /**
   * Auth level (for HTTP triggers).
   */
  readonly authLevel?: AuthLevel;

  /**
   * Schedule expression (for timer triggers).
   */
  readonly schedule?: string;

  /**
   * Connection string setting name.
   */
  readonly connection?: string;

  /**
   * Path (for blob/queue triggers).
   */
  readonly path?: string;

  /**
   * Queue name (for queue triggers).
   */
  readonly queueName?: string;

  /**
   * Database name (for Cosmos DB triggers).
   */
  readonly databaseName?: string;

  /**
   * Container name (for Cosmos DB triggers).
   */
  readonly containerName?: string;

  /**
   * Create lease container if not exists.
   */
  readonly createLeaseContainerIfNotExists?: boolean;

  /**
   * Lease container name.
   */
  readonly leaseContainerName?: string;

  /**
   * Event hub name (for Event Hub triggers).
   */
  readonly eventHubName?: string;

  /**
   * Consumer group.
   */
  readonly consumerGroup?: string;

  /**
   * Cardinality.
   *
   * @remarks
   * Values: 'one' | 'many'
   */
  readonly cardinality?: 'one' | 'many';
}

/**
 * Azure Functions host configuration.
 */
export interface FunctionHostConfig {
  /**
   * Version.
   */
  readonly version?: string;

  /**
   * Extension bundle.
   */
  readonly extensionBundle?: {
    readonly id?: string;
    readonly version?: string;
  };

  /**
   * Logging configuration.
   */
  readonly logging?: {
    readonly applicationInsights?: {
      readonly samplingSettings?: {
        readonly isEnabled?: boolean;
        readonly maxTelemetryItemsPerSecond?: number;
      };
    };
  };

  /**
   * HTTP configuration.
   */
  readonly http?: {
    readonly routePrefix?: string;
  };
}
