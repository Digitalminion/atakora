import { Construct, Resource, DeploymentScope } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import { ServiceBusSku, type ArmServiceBusNamespaceProps } from './service-bus-namespace-types';
/**
 * L1 construct for Azure Service Bus Namespace.
 *
 * @remarks
 * Direct mapping to Microsoft.ServiceBus/namespaces ARM resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.ServiceBus/namespaces`
 * **API Version**: `2021-11-01`
 * **Deployment Scope**: ResourceGroup
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * auto-naming and defaults, use the {@link ServiceBusNamespace} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmServiceBusNamespace, ServiceBusSku } from '@atakora/cdk/servicebus';
 *
 * const namespace = new ArmServiceBusNamespace(resourceGroup, 'Namespace', {
 *   namespaceName: 'sb-myapp-prod',
 *   location: 'eastus',
 *   sku: {
 *     name: ServiceBusSku.STANDARD,
 *     tier: ServiceBusSku.STANDARD
 *   }
 * });
 * ```
 */
export declare class ArmServiceBusNamespace extends Resource {
    /**
     * ARM resource type.
     */
    readonly resourceType: string;
    /**
     * API version for the resource.
     */
    readonly apiVersion: string;
    /**
     * Deployment scope for Service Bus Namespaces.
     */
    readonly scope: DeploymentScope.ResourceGroup;
    /**
     * Name of the Service Bus namespace.
     */
    readonly namespaceName: string;
    /**
     * Resource name (same as namespaceName).
     */
    readonly name: string;
    /**
     * Azure region where the namespace is located.
     */
    readonly location: string;
    /**
     * SKU configuration.
     */
    readonly sku: {
        readonly name: ServiceBusSku;
        readonly tier: ServiceBusSku;
        readonly capacity?: number;
    };
    /**
     * Zone redundancy enabled.
     */
    readonly zoneRedundant?: boolean;
    /**
     * Disable local auth.
     */
    readonly disableLocalAuth?: boolean;
    /**
     * Minimum TLS version.
     */
    readonly minimumTlsVersion?: string;
    /**
     * Tags applied to the namespace.
     */
    readonly tags: Record<string, string>;
    /**
     * ARM resource ID.
     *
     * @remarks
     * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ServiceBus/namespaces/{namespaceName}`
     */
    readonly resourceId: string;
    /**
     * Service Bus namespace resource ID (alias for resourceId).
     */
    readonly namespaceId: string;
    /**
     * Creates a new ArmServiceBusNamespace construct.
     *
     * @param scope - Parent construct (typically a ResourceGroup)
     * @param id - Unique identifier for this construct within the parent scope
     * @param props - Service Bus Namespace properties
     *
     * @throws {Error} If namespaceName is invalid
     * @throws {Error} If location is empty
     */
    constructor(scope: Construct, id: string, props: ArmServiceBusNamespaceProps);
    /**
     * Validates Service Bus Namespace properties against ARM constraints.
     *
     * @param props - Properties to validate
     * @throws {Error} If validation fails
     */
    protected validateProps(props: ArmServiceBusNamespaceProps): void;
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
//# sourceMappingURL=service-bus-namespace-arm.d.ts.map