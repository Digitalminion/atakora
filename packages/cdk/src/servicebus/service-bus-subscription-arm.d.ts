/**
 * L1 (ARM) constructs for Service Bus Subscriptions.
 *
 * @remarks
 * Direct ARM resource mappings for Microsoft.ServiceBus/namespaces/topics/subscriptions.
 *
 * @packageDocumentation
 */
import { Resource, Construct, DeploymentScope } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { ArmServiceBusSubscriptionProps, IServiceBusSubscription } from './service-bus-topic-types';
/**
 * L1 construct for Service Bus Subscription.
 *
 * @remarks
 * Direct mapping to Microsoft.ServiceBus/namespaces/topics/subscriptions ARM resource.
 * This is a child resource of Service Bus topic.
 *
 * **ARM Resource Type**: `Microsoft.ServiceBus/namespaces/topics/subscriptions`
 * **API Version**: `2021-11-01`
 * **Deployment Scope**: ResourceGroup (as child resource)
 */
export declare class ArmServiceBusSubscription extends Resource implements IServiceBusSubscription {
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
     * Parent topic.
     */
    readonly topic: any;
    /**
     * Subscription name.
     */
    readonly subscriptionName: string;
    /**
     * Resource name (same as subscriptionName).
     */
    readonly name: string;
    /**
     * Lock duration.
     */
    readonly lockDuration?: string;
    /**
     * Enable batched operations.
     */
    readonly enableBatchedOperations?: boolean;
    /**
     * Default message time to live.
     */
    readonly defaultMessageTimeToLive?: string;
    /**
     * Auto delete on idle.
     */
    readonly autoDeleteOnIdle?: string;
    /**
     * Dead lettering on message expiration.
     */
    readonly deadLetteringOnMessageExpiration?: boolean;
    /**
     * Dead lettering on filter evaluation exceptions.
     */
    readonly deadLetteringOnFilterEvaluationExceptions?: boolean;
    /**
     * Maximum delivery count.
     */
    readonly maxDeliveryCount?: number;
    /**
     * Requires session.
     */
    readonly requiresSession?: boolean;
    /**
     * Forward to.
     */
    readonly forwardTo?: string;
    /**
     * Forward dead lettered messages to.
     */
    readonly forwardDeadLetteredMessagesTo?: string;
    /**
     * Entity status.
     */
    readonly status?: string;
    /**
     * ARM resource ID.
     */
    readonly resourceId: string;
    /**
     * Subscription ID (alias for resourceId).
     */
    readonly subscriptionId: string;
    constructor(scope: Construct, id: string, props: ArmServiceBusSubscriptionProps);
    protected validateProps(props: ArmServiceBusSubscriptionProps): void;
    toArmTemplate(): ArmResource;
}
//# sourceMappingURL=service-bus-subscription-arm.d.ts.map