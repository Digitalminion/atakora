/**
 * L1 (ARM) construct for Azure SignalR Service.
 *
 * @remarks
 * Direct ARM resource mapping for Microsoft.SignalRService/SignalR.
 *
 * @packageDocumentation
 */

import { Resource, Construct, DeploymentScope } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type {
  ArmSignalRServiceProps,
  ISignalRService,
} from './signalr-service-types';

/**
 * L1 construct for SignalR Service.
 *
 * @remarks
 * Direct mapping to Microsoft.SignalRService/SignalR ARM resource.
 *
 * **ARM Resource Type**: `Microsoft.SignalRService/SignalR`
 * **API Version**: `2023-02-01`
 * **Deployment Scope**: ResourceGroup
 */
export class ArmSignalRService extends Resource implements ISignalRService {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.SignalRService/SignalR';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2023-02-01';

  /**
   * Deployment scope.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * SignalR Service name.
   */
  public readonly signalRName: string;

  /**
   * Resource name (same as signalRName).
   */
  public readonly name: string;

  /**
   * Location.
   */
  public readonly location: string;

  /**
   * SKU configuration.
   */
  public readonly sku: any;

  /**
   * Service kind/mode.
   */
  public readonly kind?: string;

  /**
   * Enable system identity.
   */
  public readonly enableSystemIdentity?: boolean;

  /**
   * User-assigned identities.
   */
  public readonly userAssignedIdentities?: Record<string, {}>;

  /**
   * CORS settings.
   */
  public readonly cors?: any;

  /**
   * Service features.
   */
  public readonly features?: any[];

  /**
   * Upstream configuration.
   */
  public readonly upstream?: any;

  /**
   * Network ACLs.
   */
  public readonly networkACLs?: any;

  /**
   * Public network access.
   */
  public readonly publicNetworkAccess?: string;

  /**
   * Disable local auth.
   */
  public readonly disableLocalAuth?: boolean;

  /**
   * Disable AAD auth.
   */
  public readonly disableAadAuth?: boolean;

  /**
   * Tags.
   */
  public readonly tags?: Record<string, string>;

  /**
   * ARM resource ID.
   */
  public readonly resourceId: string;

  /**
   * SignalR ID (alias for resourceId).
   */
  public readonly signalRId: string;

  /**
   * Hostname.
   */
  public readonly hostName: string;

  /**
   * Primary connection string (output).
   */
  public readonly primaryConnectionString?: string;

  /**
   * Primary access key (output).
   */
  public readonly primaryKey?: string;

  constructor(scope: Construct, id: string, props: ArmSignalRServiceProps) {
    super(scope, id);

    this.validateProps(props);

    this.signalRName = props.signalRName;
    this.name = props.signalRName;
    this.location = props.location;
    this.sku = props.sku;
    this.kind = props.kind;
    this.enableSystemIdentity = props.enableSystemIdentity;
    this.userAssignedIdentities = props.userAssignedIdentities;
    this.cors = props.cors;
    this.features = props.features;
    this.upstream = props.upstream;
    this.networkACLs = props.networkACLs;
    this.publicNetworkAccess = props.publicNetworkAccess;
    this.disableLocalAuth = props.disableLocalAuth;
    this.disableAadAuth = props.disableAadAuth;
    this.tags = props.tags;

    this.resourceId = `[resourceId('Microsoft.SignalRService/SignalR', '${this.signalRName}')]`;
    this.signalRId = this.resourceId;
    this.hostName = `${this.signalRName}.service.signalr.net`;

    // Connection string reference for outputs
    this.primaryConnectionString = `[listKeys(${this.resourceId}, '${this.apiVersion}').primaryConnectionString]`;
    this.primaryKey = `[listKeys(${this.resourceId}, '${this.apiVersion}').primaryKey]`;
  }

  protected validateProps(props: ArmSignalRServiceProps): void {
    if (!props.signalRName || props.signalRName.trim() === '') {
      throw new Error('SignalR Service name cannot be empty');
    }

    if (props.signalRName.length < 3 || props.signalRName.length > 63) {
      throw new Error('SignalR Service name must be between 3 and 63 characters');
    }

    if (!/^[a-zA-Z][a-zA-Z0-9-]*[a-zA-Z0-9]$/.test(props.signalRName)) {
      throw new Error(
        'SignalR Service name must start with a letter, end with letter or number, and contain only alphanumeric characters and hyphens'
      );
    }

    if (!props.location || props.location.trim() === '') {
      throw new Error('Location cannot be empty');
    }
  }

  public toArmTemplate(): ArmResource {
    const properties: any = {};

    if (this.cors) {
      properties.cors = this.cors;
    }

    if (this.features && this.features.length > 0) {
      properties.features = this.features;
    }

    if (this.upstream) {
      properties.upstream = this.upstream;
    }

    if (this.networkACLs) {
      properties.networkACLs = this.networkACLs;
    }

    if (this.publicNetworkAccess !== undefined) {
      properties.publicNetworkAccess = this.publicNetworkAccess;
    }

    if (this.disableLocalAuth !== undefined) {
      properties.disableLocalAuth = this.disableLocalAuth;
    }

    if (this.disableAadAuth !== undefined) {
      properties.disableAadAuth = this.disableAadAuth;
    }

    // Build identity object
    const identity: any = {};
    if (this.enableSystemIdentity) {
      identity.type = this.userAssignedIdentities ? 'SystemAssigned,UserAssigned' : 'SystemAssigned';
    } else if (this.userAssignedIdentities) {
      identity.type = 'UserAssigned';
    }

    if (this.userAssignedIdentities) {
      identity.userAssignedIdentities = this.userAssignedIdentities;
    }

    const resource: any = {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.signalRName,
      location: this.location,
      sku: this.sku,
      properties,
    };

    if (this.kind) {
      resource.kind = this.kind;
    }

    if (identity.type) {
      resource.identity = identity;
    }

    if (this.tags) {
      resource.tags = this.tags;
    }

    return resource as ArmResource;
  }
}
