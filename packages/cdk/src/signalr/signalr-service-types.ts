/**
 * Type definitions for Azure SignalR Service constructs.
 *
 * @remarks
 * Types for Azure SignalR Service (Microsoft.SignalRService/SignalR).
 *
 * @packageDocumentation
 */

import { schema } from '@atakora/lib';

/**
 * SignalR Service SKU tiers.
 */
export const SignalRSku = schema.signalr.SignalRSku;
export type SignalRSku = typeof SignalRSku[keyof typeof SignalRSku];

/**
 * SignalR Service mode.
 */
export const ServiceMode = schema.signalr.ServiceMode;
export type ServiceMode = typeof ServiceMode[keyof typeof ServiceMode];

/**
 * Feature flags for SignalR Service.
 */
export const FeatureFlag = schema.signalr.FeatureFlag;
export type FeatureFlag = typeof FeatureFlag[keyof typeof FeatureFlag];

/**
 * CORS settings for SignalR Service.
 */
export interface CorsSettings {
  /**
   * Allowed origins.
   *
   * @remarks
   * Use ['*'] to allow all origins.
   * Example: ['https://example.com', 'https://app.example.com']
   */
  readonly allowedOrigins: string[];
}

/**
 * SignalR Service features.
 */
export interface ServiceFeature {
  /**
   * Feature flag.
   */
  readonly flag: FeatureFlag | string;

  /**
   * Feature value.
   */
  readonly value: string;

  /**
   * Feature properties (optional).
   */
  readonly properties?: Record<string, string>;
}

/**
 * Upstream authentication settings.
 */
export interface UpstreamAuthSettings {
  /**
   * Auth type (ManagedIdentity or None).
   */
  readonly type?: 'ManagedIdentity' | 'None';

  /**
   * Managed identity resource.
   */
  readonly managedIdentity?: {
    readonly resource?: string;
  };
}

/**
 * Upstream template for event handlers.
 */
export interface UpstreamTemplate {
  /**
   * Hub pattern (supports wildcards).
   *
   * @remarks
   * Example: '*' for all hubs, 'chat' for specific hub
   */
  readonly hubPattern: string;

  /**
   * Event pattern (supports wildcards).
   *
   * @remarks
   * Example: '*' for all events, 'message' for specific event
   */
  readonly eventPattern: string;

  /**
   * Category pattern (supports wildcards).
   *
   * @remarks
   * Categories: 'connections', 'messages'
   */
  readonly categoryPattern: string;

  /**
   * Upstream URL template.
   *
   * @remarks
   * Supports templates: {hub}, {event}, {category}
   * Example: 'https://myapp.com/api/signalr/{event}'
   */
  readonly urlTemplate: string;

  /**
   * Authentication settings.
   */
  readonly auth?: UpstreamAuthSettings;
}

/**
 * Network ACL action.
 */
export const AclAction = schema.signalr.AclAction;
export type AclAction = typeof AclAction[keyof typeof AclAction];

/**
 * Public network access.
 */
export const PublicNetworkAccess = schema.signalr.PublicNetworkAccess;
export type PublicNetworkAccess = typeof PublicNetworkAccess[keyof typeof PublicNetworkAccess];

/**
 * Private endpoint ACL.
 */
export interface PrivateEndpointAcl {
  /**
   * Private endpoint name.
   */
  readonly name: string;

  /**
   * Allow or deny.
   */
  readonly allow?: string[];

  /**
   * Deny specific request types.
   */
  readonly deny?: string[];
}

/**
 * Network ACL configuration.
 */
export interface NetworkAcl {
  /**
   * Default action.
   */
  readonly defaultAction?: AclAction;

  /**
   * Public network ACL.
   */
  readonly publicNetwork?: {
    readonly allow?: string[];
    readonly deny?: string[];
  };

  /**
   * Private endpoint ACLs.
   */
  readonly privateEndpoints?: PrivateEndpointAcl[];
}

/**
 * Properties for ArmSignalRService (L1 construct).
 *
 * @remarks
 * Direct mapping to Microsoft.SignalRService/SignalR ARM resource.
 *
 * ARM API Version: 2023-02-01
 */
export interface ArmSignalRServiceProps {
  /**
   * SignalR Service name.
   *
   * @remarks
   * Must be 3-63 characters, alphanumeric and hyphens.
   * Must start with letter, end with letter or number.
   * Globally unique across Azure.
   */
  readonly signalRName: string;

  /**
   * Azure region.
   */
  readonly location: string;

  /**
   * SKU configuration.
   */
  readonly sku: {
    readonly name: SignalRSku;
    readonly tier?: string;
    readonly capacity?: number;
  };

  /**
   * Service mode.
   *
   * @remarks
   * Defaults to Default mode if not specified.
   */
  readonly kind?: ServiceMode;

  /**
   * Enable system-assigned managed identity.
   */
  readonly enableSystemIdentity?: boolean;

  /**
   * User-assigned managed identities.
   */
  readonly userAssignedIdentities?: Record<string, {}>;

  /**
   * CORS settings.
   */
  readonly cors?: CorsSettings;

  /**
   * Service features and flags.
   */
  readonly features?: ServiceFeature[];

  /**
   * Upstream templates for serverless mode.
   */
  readonly upstream?: {
    readonly templates?: UpstreamTemplate[];
  };

  /**
   * Network ACLs.
   */
  readonly networkACLs?: NetworkAcl;

  /**
   * Public network access.
   */
  readonly publicNetworkAccess?: PublicNetworkAccess;

  /**
   * Disable local authentication (use Azure AD only).
   */
  readonly disableLocalAuth?: boolean;

  /**
   * Disable Azure AD authentication.
   */
  readonly disableAadAuth?: boolean;

  /**
   * Resource tags.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Properties for SignalRService (L2 construct).
 *
 * @remarks
 * Intent-based API with sensible defaults.
 */
export interface SignalRServiceProps {
  /**
   * SignalR Service name (optional - auto-generated if not provided).
   */
  readonly signalRName?: string;

  /**
   * Azure region (optional - inherits from parent if not specified).
   */
  readonly location?: string;

  /**
   * SKU tier (optional - defaults to Standard).
   */
  readonly sku?: SignalRSku;

  /**
   * Unit capacity (optional - defaults to 1).
   *
   * @remarks
   * Free tier: 1 only
   * Standard: 1, 2, 5, 10, 20, 50, 100
   * Premium: 1, 2, 5, 10, 20, 50, 100
   */
  readonly capacity?: number;

  /**
   * Service mode (optional - defaults to Serverless for Functions integration).
   */
  readonly mode?: ServiceMode;

  /**
   * Enable system-assigned managed identity (optional - defaults to true).
   */
  readonly enableSystemIdentity?: boolean;

  /**
   * CORS settings (optional).
   */
  readonly cors?: CorsSettings;

  /**
   * Enable messaging logs (optional - defaults to false).
   */
  readonly enableMessagingLogs?: boolean;

  /**
   * Enable connectivity logs (optional - defaults to false).
   */
  readonly enableConnectivityLogs?: boolean;

  /**
   * Enable live trace (optional - defaults to false).
   */
  readonly enableLiveTrace?: boolean;

  /**
   * Upstream templates for serverless event handlers.
   *
   * @remarks
   * Typically points to Azure Functions endpoints.
   */
  readonly upstreamTemplates?: UpstreamTemplate[];

  /**
   * Public network access (optional - defaults to Enabled).
   */
  readonly publicNetworkAccess?: PublicNetworkAccess;

  /**
   * Disable local authentication (optional - defaults to false).
   */
  readonly disableLocalAuth?: boolean;

  /**
   * Resource tags (optional - merged with parent tags).
   */
  readonly tags?: Record<string, string>;
}

/**
 * Interface for SignalR Service reference.
 */
export interface ISignalRService {
  /**
   * Name of the SignalR Service.
   */
  readonly signalRName: string;

  /**
   * Location of the SignalR Service.
   */
  readonly location: string;

  /**
   * Resource ID of the SignalR Service.
   */
  readonly signalRId: string;

  /**
   * Hostname of the SignalR Service.
   *
   * @remarks
   * Format: <serviceName>.service.signalr.net
   */
  readonly hostName: string;

  /**
   * Primary connection string (output only).
   */
  readonly primaryConnectionString?: string;

  /**
   * Primary access key (output only).
   */
  readonly primaryKey?: string;
}
