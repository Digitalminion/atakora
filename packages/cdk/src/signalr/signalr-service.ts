/**
 * L2 construct for Azure SignalR Service with intent-based API.
 *
 * @remarks
 * Higher-level construct with sensible defaults for SignalR Service.
 * Ideal for real-time web functionality and GraphQL subscriptions.
 *
 * @packageDocumentation
 */

import { Construct } from '@atakora/cdk';
import { constructIdToPurpose } from '@atakora/lib';
import { ArmSignalRService } from './signalr-service-arm';
import {
  SignalRSku,
  ServiceMode,
  FeatureFlag,
} from './signalr-service-types';
import type {
  SignalRServiceProps,
  ISignalRService,
  ServiceFeature,
} from './signalr-service-types';

/**
 * L2 construct for SignalR Service.
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 * Creates a SignalR Service for real-time web functionality.
 *
 * @example
 * **Minimal usage (serverless mode for Functions):**
 * ```typescript
 * const signalr = new SignalRService(stack, 'Realtime', {});
 * ```
 *
 * @example
 * **For GraphQL subscriptions:**
 * ```typescript
 * const signalr = new SignalRService(stack, 'GraphQLRealtime', {
 *   signalRName: 'graphql-realtime',
 *   mode: ServiceMode.SERVERLESS,
 *   sku: SignalRSku.STANDARD,
 *   capacity: 1,
 *   enableMessagingLogs: true,
 *   cors: {
 *     allowedOrigins: ['https://myapp.com', 'https://admin.myapp.com']
 *   }
 * });
 *
 * // Configure upstream to Azure Function
 * const signalrWithUpstream = new SignalRService(stack, 'Realtime', {
 *   mode: ServiceMode.SERVERLESS,
 *   upstreamTemplates: [{
 *     hubPattern: 'graphql',
 *     eventPattern: '*',
 *     categoryPattern: 'messages',
 *     urlTemplate: 'https://my-functions.azurewebsites.net/runtime/webhooks/signalr',
 *     auth: {
 *       type: 'ManagedIdentity'
 *     }
 *   }]
 * });
 * ```
 *
 * @example
 * **With standard mode (persistent connections):**
 * ```typescript
 * const signalr = new SignalRService(stack, 'Chat', {
 *   mode: ServiceMode.DEFAULT,
 *   sku: SignalRSku.STANDARD,
 *   capacity: 2,
 *   cors: {
 *     allowedOrigins: ['*'] // Allow all origins for development
 *   }
 * });
 * ```
 */
export class SignalRService extends Construct implements ISignalRService {
  private readonly armSignalR: ArmSignalRService;

  /**
   * SignalR Service name.
   */
  public readonly signalRName: string;

  /**
   * Location.
   */
  public readonly location: string;

  /**
   * Resource ID.
   */
  public readonly signalRId: string;

  /**
   * Hostname.
   */
  public readonly hostName: string;

  /**
   * Primary connection string.
   */
  public readonly primaryConnectionString?: string;

  /**
   * Primary access key.
   */
  public readonly primaryKey?: string;

  constructor(scope: Construct, id: string, props: SignalRServiceProps) {
    super(scope, id);

    // Get location from parent stack if not provided
    const parentStack = this.node.scopes.find((s: any) => s.location);
    this.location = props.location ?? (parentStack as any)?.location ?? 'eastus';
    this.signalRName = props.signalRName ?? this.generateSignalRName(id);

    // Build features array
    const features = this.buildFeatures(props);

    // Build upstream configuration
    const upstream = props.upstreamTemplates && props.upstreamTemplates.length > 0
      ? { templates: props.upstreamTemplates }
      : undefined;

    this.armSignalR = new ArmSignalRService(scope, `${id}-Resource`, {
      signalRName: this.signalRName,
      location: this.location,
      sku: {
        name: props.sku ?? SignalRSku.STANDARD,
        tier: this.getSkuTier(props.sku ?? SignalRSku.STANDARD),
        capacity: props.capacity ?? 1,
      },
      kind: props.mode ?? ServiceMode.SERVERLESS, // Default to serverless for Functions
      enableSystemIdentity: props.enableSystemIdentity ?? true,
      cors: props.cors,
      features,
      upstream,
      publicNetworkAccess: props.publicNetworkAccess,
      disableLocalAuth: props.disableLocalAuth ?? false,
      tags: props.tags,
    });

    this.signalRId = this.armSignalR.signalRId;
    this.hostName = this.armSignalR.hostName;
    this.primaryConnectionString = this.armSignalR.primaryConnectionString;
    this.primaryKey = this.armSignalR.primaryKey;
  }

  /**
   * Generates a SignalR Service name from construct ID.
   *
   * @param id - Construct ID
   * @returns Sanitized SignalR Service name
   */
  private generateSignalRName(id: string): string {
    const purpose = constructIdToPurpose(id, 'signalr', ['signalr', 'realtime', 'signalr-service']);
    return `signalr-${purpose}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').substring(0, 63);
  }

  /**
   * Gets the SKU tier from SKU name.
   *
   * @param sku - SKU name
   * @returns SKU tier
   */
  private getSkuTier(sku: SignalRSku): string {
    if (sku === SignalRSku.FREE) return 'Free';
    if (sku === SignalRSku.PREMIUM) return 'Premium';
    return 'Standard';
  }

  /**
   * Builds features array from props.
   *
   * @param props - SignalR Service props
   * @returns Features array
   */
  private buildFeatures(props: SignalRServiceProps): ServiceFeature[] | undefined {
    const features: ServiceFeature[] = [];

    // Service mode feature
    if (props.mode) {
      features.push({
        flag: FeatureFlag.SERVICE_MODE,
        value: props.mode,
      });
    }

    // Messaging logs
    if (props.enableMessagingLogs !== undefined) {
      features.push({
        flag: FeatureFlag.ENABLE_MESSAGING_LOGS,
        value: props.enableMessagingLogs ? 'True' : 'False',
      });
    }

    // Connectivity logs
    if (props.enableConnectivityLogs !== undefined) {
      features.push({
        flag: FeatureFlag.ENABLE_CONNECTIVITY_LOGS,
        value: props.enableConnectivityLogs ? 'True' : 'False',
      });
    }

    // Live trace
    if (props.enableLiveTrace !== undefined) {
      features.push({
        flag: FeatureFlag.ENABLE_LIVE_TRACE,
        value: props.enableLiveTrace ? 'True' : 'False',
      });
    }

    return features.length > 0 ? features : undefined;
  }

  /**
   * Grant SignalR access to a Function App.
   *
   * @param functionApp - Function App to grant access
   * @returns This instance for chaining
   *
   * @example
   * ```typescript
   * const functionApp = new FunctionApp(stack, 'Api', { ... });
   * signalr.grantAccess(functionApp);
   * ```
   */
  public grantAccess(functionApp: any): this {
    // SignalR App Server role
    const roleDefinitionId =
      '/providers/Microsoft.Authorization/roleDefinitions/420fcaa2-552c-430f-98ca-3264be4806c7';

    const { grantResourceRole } = require('@atakora/lib');
    grantResourceRole(this, `${functionApp.node.id}-SignalRGrant`, {
      principal: functionApp,
      roleDefinitionId,
      scope: this.signalRId,
    });

    return this;
  }

  /**
   * Grant full SignalR Service Owner access to a principal.
   *
   * @param principal - Principal to grant access
   * @returns This instance for chaining
   *
   * @example
   * ```typescript
   * const identity = new UserAssignedIdentity(stack, 'Identity', {});
   * signalr.grantOwner(identity);
   * ```
   */
  public grantOwner(principal: any): this {
    // SignalR Service Owner role
    const roleDefinitionId =
      '/providers/Microsoft.Authorization/roleDefinitions/7e4f1700-ea5a-4f59-8f37-079cfe29dce3';

    const { grantResourceRole } = require('@atakora/lib');
    grantResourceRole(this, `${principal.node.id}-OwnerGrant`, {
      principal,
      roleDefinitionId,
      scope: this.signalRId,
    });

    return this;
  }

  /**
   * Get the connection string reference for use in app settings.
   *
   * @returns ARM expression for connection string
   *
   * @example
   * ```typescript
   * const functionApp = new FunctionApp(stack, 'Api', {
   *   appSettings: {
   *     'AzureSignalRConnectionString': signalr.getConnectionStringReference()
   *   }
   * });
   * ```
   */
  public getConnectionStringReference(): string {
    return this.primaryConnectionString || '';
  }

  /**
   * Get the endpoint URL for the SignalR Service.
   *
   * @returns SignalR Service endpoint URL
   */
  public getEndpoint(): string {
    return `https://${this.hostName}`;
  }
}
