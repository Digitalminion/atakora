import { Construct, Resource, DeploymentScope } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { ArmEventHubProps } from './event-hub-types';
/**
 * L1 construct for Azure Event Hub.
 *
 * @remarks
 * Direct mapping to Microsoft.EventHub/namespaces/eventhubs ARM resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.EventHub/namespaces/eventhubs`
 * **API Version**: `2021-11-01`
 * **Deployment Scope**: ResourceGroup
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * auto-naming and defaults, use the {@link EventHub} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmEventHub } from '@atakora/cdk/eventhub';
 *
 * const eventHub = new ArmEventHub(resourceGroup, 'EventHub', {
 *   namespaceName: 'evhns-myapp-prod',
 *   eventHubName: 'events',
 *   location: 'eastus',
 *   partitionCount: 4,
 *   messageRetentionInDays: 7
 * });
 * ```
 */
export declare class ArmEventHub extends Resource {
    /**
     * ARM resource type.
     */
    readonly resourceType: string;
    /**
     * API version for the resource.
     */
    readonly apiVersion: string;
    /**
     * Deployment scope for Event Hubs.
     */
    readonly scope: DeploymentScope.ResourceGroup;
    /**
     * Namespace name containing the Event Hub.
     */
    readonly namespaceName: string;
    /**
     * Name of the Event Hub.
     */
    readonly eventHubName: string;
    /**
     * Resource name (same as eventHubName).
     */
    readonly name: string;
    /**
     * Azure region where the Event Hub is located.
     */
    readonly location: string;
    /**
     * Number of partitions.
     */
    readonly partitionCount?: number;
    /**
     * Message retention in days.
     */
    readonly messageRetentionInDays?: number;
    /**
     * Capture description configuration.
     */
    readonly captureDescription?: any;
    /**
     * Tags applied to the Event Hub.
     */
    readonly tags: Record<string, string>;
    /**
     * ARM resource ID.
     *
     * @remarks
     * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.EventHub/namespaces/{namespaceName}/eventhubs/{eventHubName}`
     */
    readonly resourceId: string;
    /**
     * Event Hub resource ID (alias for resourceId).
     */
    readonly eventHubId: string;
    /**
     * Creates a new ArmEventHub construct.
     *
     * @param scope - Parent construct (typically a ResourceGroup)
     * @param id - Unique identifier for this construct within the parent scope
     * @param props - Event Hub properties
     *
     * @throws {Error} If eventHubName is invalid
     * @throws {Error} If location is empty
     */
    constructor(scope: Construct, id: string, props: ArmEventHubProps);
    /**
     * Validates Event Hub properties against ARM constraints.
     *
     * @param props - Properties to validate
     * @throws {Error} If validation fails
     */
    protected validateProps(props: ArmEventHubProps): void;
    /**
     * Generates ARM template representation of this resource.
     *
     * @remarks
     * Called during synthesis to produce the ARM template JSON.
     * This will be implemented by Grace's synthesis pipeline.
     *
     * @returns ARM template resource object
     */
    toArmTemplate(): ArmResource;
}
//# sourceMappingURL=event-hub-arm.d.ts.map