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
import type { ArmSignalRServiceProps, ISignalRService } from './signalr-service-types';
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
export declare class ArmSignalRService extends Resource implements ISignalRService {
    /**
     * ARM resource type.
     */
    readonly resourceType: string;
    /**
     * API version for the resource.
     */
    readonly apiVersion: string;
    /**
     * Deployment scope.
     */
    readonly scope: DeploymentScope.ResourceGroup;
    /**
     * SignalR Service name.
     */
    readonly signalRName: string;
    /**
     * Resource name (same as signalRName).
     */
    readonly name: string;
    /**
     * Location.
     */
    readonly location: string;
    /**
     * SKU configuration.
     */
    readonly sku: any;
    /**
     * Service kind/mode.
     */
    readonly kind?: string;
    /**
     * Enable system identity.
     */
    readonly enableSystemIdentity?: boolean;
    /**
     * User-assigned identities.
     */
    readonly userAssignedIdentities?: Record<string, {}>;
    /**
     * CORS settings.
     */
    readonly cors?: any;
    /**
     * Service features.
     */
    readonly features?: any[];
    /**
     * Upstream configuration.
     */
    readonly upstream?: any;
    /**
     * Network ACLs.
     */
    readonly networkACLs?: any;
    /**
     * Public network access.
     */
    readonly publicNetworkAccess?: string;
    /**
     * Disable local auth.
     */
    readonly disableLocalAuth?: boolean;
    /**
     * Disable AAD auth.
     */
    readonly disableAadAuth?: boolean;
    /**
     * Tags.
     */
    readonly tags?: Record<string, string>;
    /**
     * ARM resource ID.
     */
    readonly resourceId: string;
    /**
     * SignalR ID (alias for resourceId).
     */
    readonly signalRId: string;
    /**
     * Hostname.
     */
    readonly hostName: string;
    /**
     * Primary connection string (output).
     */
    readonly primaryConnectionString?: string;
    /**
     * Primary access key (output).
     */
    readonly primaryKey?: string;
    constructor(scope: Construct, id: string, props: ArmSignalRServiceProps);
    protected validateProps(props: ArmSignalRServiceProps): void;
    toArmTemplate(): ArmResource;
}
//# sourceMappingURL=signalr-service-arm.d.ts.map