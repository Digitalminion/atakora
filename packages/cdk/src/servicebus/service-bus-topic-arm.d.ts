/**
 * L1 (ARM) constructs for Service Bus Topics.
 *
 * @remarks
 * Direct ARM resource mappings for Microsoft.ServiceBus/namespaces/topics.
 *
 * @packageDocumentation
 */
import { Resource, Construct, DeploymentScope } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { ArmServiceBusTopicProps, IServiceBusTopic } from './service-bus-topic-types';
/**
 * L1 construct for Service Bus Topic.
 *
 * @remarks
 * Direct mapping to Microsoft.ServiceBus/namespaces/topics ARM resource.
 * This is a child resource of Service Bus namespace.
 *
 * **ARM Resource Type**: `Microsoft.ServiceBus/namespaces/topics`
 * **API Version**: `2021-11-01`
 * **Deployment Scope**: ResourceGroup (as child resource)
 */
export declare class ArmServiceBusTopic extends Resource implements IServiceBusTopic {
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
     * Parent namespace.
     */
    readonly namespace: any;
    /**
     * Topic name.
     */
    readonly topicName: string;
    /**
     * Resource name (same as topicName).
     */
    readonly name: string;
    /**
     * Maximum size in megabytes.
     */
    readonly maxSizeInMegabytes?: number;
    /**
     * Default message time to live.
     */
    readonly defaultMessageTimeToLive?: string;
    /**
     * Duplicate detection history time window.
     */
    readonly duplicateDetectionHistoryTimeWindow?: string;
    /**
     * Enable batched operations.
     */
    readonly enableBatchedOperations?: boolean;
    /**
     * Requires duplicate detection.
     */
    readonly requiresDuplicateDetection?: boolean;
    /**
     * Enable partitioning.
     */
    readonly enablePartitioning?: boolean;
    /**
     * Support ordering.
     */
    readonly supportOrdering?: boolean;
    /**
     * Auto delete on idle.
     */
    readonly autoDeleteOnIdle?: string;
    /**
     * Entity status.
     */
    readonly status?: string;
    /**
     * ARM resource ID.
     */
    readonly resourceId: string;
    /**
     * Topic ID (alias for resourceId).
     */
    readonly topicId: string;
    constructor(scope: Construct, id: string, props: ArmServiceBusTopicProps);
    protected validateProps(props: ArmServiceBusTopicProps): void;
    toArmTemplate(): ArmResource;
}
//# sourceMappingURL=service-bus-topic-arm.d.ts.map