/**
 * L2 construct for Azure Service Bus Namespace with grant capabilities.
 *
 * @remarks
 * Provides an intent-based API with sensible defaults and built-in grant methods
 * for role-based access control (RBAC).
 *
 * **Features**:
 * - Auto-generates namespace names following naming conventions
 * - Inherits and merges tags from parent
 * - Applies sensible defaults (Standard SKU, TLS 1.2)
 * - Extends GrantableResource for RBAC grant pattern
 * - Built-in grant methods for common Service Bus permissions
 *
 * **Grant Methods**:
 * - `grantDataReceiver()` - Receive messages from queues/subscriptions
 * - `grantDataSender()` - Send messages to queues/topics
 * - `grantDataOwner()` - Full Service Bus access
 *
 * @packageDocumentation
 */
import { Construct, GrantableResource } from '@atakora/lib';
import type { IGrantable, IGrantResult, ArmResource } from '@atakora/lib';
import type { ServiceBusNamespaceProps, IServiceBusNamespace } from './service-bus-namespace-types';
/**
 * L2 Service Bus Namespace construct with grant capabilities.
 *
 * @remarks
 * Intent-based API that simplifies Service Bus Namespace creation with sensible defaults
 * and provides built-in RBAC grant methods.
 *
 * **Default Behavior**:
 * - Auto-generates namespace name if not provided
 * - Inherits location from parent resource group
 * - Uses Standard SKU by default
 * - Sets minimumTlsVersion to '1.2' for security
 * - Merges tags from parent stack
 *
 * **Grant Pattern**:
 * This class extends GrantableResource, enabling resources with managed identities
 * to receive Service Bus permissions through semantic grant methods.
 *
 * @example
 * Basic usage with minimal configuration:
 * ```typescript
 * import { ServiceBusNamespace } from '@atakora/cdk/servicebus';
 *
 * const namespace = new ServiceBusNamespace(resourceGroup, 'Messaging', {});
 * ```
 *
 * @example
 * With custom configuration:
 * ```typescript
 * import { ServiceBusNamespace, ServiceBusSku } from '@atakora/cdk/servicebus';
 *
 * const namespace = new ServiceBusNamespace(resourceGroup, 'Messaging', {
 *   namespaceName: 'sb-myapp-prod',
 *   sku: ServiceBusSku.PREMIUM,
 *   zoneRedundant: true,
 *   tags: { costCenter: '12345' }
 * });
 * ```
 *
 * @example
 * Granting permissions to a managed identity:
 * ```typescript
 * // Function App with managed identity
 * const consumerApp = new FunctionApp(stack, 'Consumer', {
 *   // ... function app config
 * });
 *
 * // Grant Service Bus data receiver access
 * namespace.grantDataReceiver(consumerApp);
 *
 * // Another app that sends messages
 * const producerApp = new FunctionApp(stack, 'Producer', {
 *   // ... function app config
 * });
 *
 * // Grant Service Bus data sender access
 * namespace.grantDataSender(producerApp);
 * ```
 *
 * @public
 */
export declare class ServiceBusNamespace extends GrantableResource implements IServiceBusNamespace {
    /**
     * Underlying L1 Service Bus Namespace construct.
     *
     * @remarks
     * Provides access to the ARM-level construct for advanced scenarios.
     */
    private readonly armNamespace;
    /**
     * ARM resource type.
     */
    readonly resourceType: string;
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
     * Resource ID of the Service Bus namespace.
     */
    readonly resourceId: string;
    /**
     * Resource ID of the Service Bus namespace (alias).
     */
    readonly namespaceId: string;
    /**
     * Creates a new L2 Service Bus Namespace construct.
     *
     * @param scope - Parent construct (typically a ResourceGroupStack)
     * @param id - Unique identifier for this construct within the parent scope
     * @param props - Service Bus Namespace properties
     *
     * @throws {Error} If parent is not a ResourceGroupStack (when location not provided)
     */
    constructor(scope: Construct, id: string, props: ServiceBusNamespaceProps);
    /**
     * Validates Service Bus Namespace properties.
     *
     * @param props - Properties to validate
     * @internal
     */
    protected validateProps(props: ServiceBusNamespaceProps): void;
    /**
     * Generates ARM template representation.
     *
     * @returns ARM template resource object
     * @internal
     */
    toArmTemplate(): ArmResource;
    /**
     * Grant Service Bus data receiver access (receive messages).
     *
     * @remarks
     * Allows the grantee to receive messages from Service Bus queues and subscriptions including:
     * - Receive messages
     * - Complete messages
     * - Read entity metadata
     *
     * This is a data plane permission for consuming messages.
     *
     * **Role**: Azure Service Bus Data Receiver
     * **GUID**: `4f6d3b9b-027b-4f4c-9142-0e5a2a2247e0`
     *
     * @param grantable - Identity to grant permissions to (resource with managed identity)
     * @returns Grant result for further configuration or dependency management
     *
     * @example
     * ```typescript
     * const consumer = new FunctionApp(stack, 'Consumer', { ... });
     * const namespace = new ServiceBusNamespace(stack, 'Messaging', { ... });
     *
     * // Grant receive permissions
     * namespace.grantDataReceiver(consumer);
     * ```
     *
     * @public
     */
    grantDataReceiver(grantable: IGrantable): IGrantResult;
    /**
     * Grant Service Bus data sender access (send messages).
     *
     * @remarks
     * Allows the grantee to send messages to Service Bus queues and topics including:
     * - Send messages
     * - Read entity metadata
     *
     * This is a data plane permission for producing messages.
     *
     * **Role**: Azure Service Bus Data Sender
     * **GUID**: `69a216fc-b8fb-44d8-bc22-1f3c2cd27a39`
     *
     * @param grantable - Identity to grant permissions to (resource with managed identity)
     * @returns Grant result for further configuration or dependency management
     *
     * @example
     * ```typescript
     * const producer = new FunctionApp(stack, 'Producer', { ... });
     * const namespace = new ServiceBusNamespace(stack, 'Messaging', { ... });
     *
     * // Grant send permissions
     * namespace.grantDataSender(producer);
     * ```
     *
     * @public
     */
    grantDataSender(grantable: IGrantable): IGrantResult;
    /**
     * Grant Service Bus data owner access (full access).
     *
     * @remarks
     * Allows the grantee full access to Service Bus entities including:
     * - All data receiver permissions
     * - All data sender permissions
     * - Manage queues, topics, and subscriptions
     * - Manage sessions
     *
     * This is the highest level of Service Bus data plane permission.
     *
     * **Role**: Azure Service Bus Data Owner
     * **GUID**: `090c5cfd-751d-490a-894a-3ce6f1109419`
     *
     * @param grantable - Identity to grant permissions to (resource with managed identity)
     * @returns Grant result for further configuration or dependency management
     *
     * @example
     * ```typescript
     * const admin = new FunctionApp(stack, 'Admin', { ... });
     * const namespace = new ServiceBusNamespace(stack, 'Messaging', { ... });
     *
     * // Grant full access
     * namespace.grantDataOwner(admin);
     * ```
     *
     * @public
     */
    grantDataOwner(grantable: IGrantable): IGrantResult;
    /**
     * Import an existing Service Bus Namespace by name.
     *
     * @remarks
     * Creates a reference to an existing Service Bus Namespace without managing its lifecycle.
     * Useful for referencing namespaces created outside the current stack.
     *
     * @param scope - Parent construct
     * @param id - Unique identifier for this reference
     * @param namespaceName - Name of the existing Service Bus Namespace
     * @param location - Azure region where the namespace is located
     * @returns Service Bus Namespace reference implementing IServiceBusNamespace
     *
     * @example
     * ```typescript
     * const existingNamespace = ServiceBusNamespace.fromNamespaceName(
     *   stack,
     *   'ExistingMessaging',
     *   'sb-prod-eastus',
     *   'eastus'
     * );
     *
     * // Can be used for grants
     * existingNamespace.grantDataReceiver(myApp);
     * ```
     *
     * @public
     */
    static fromNamespaceName(scope: Construct, id: string, namespaceName: string, location: string): IServiceBusNamespace;
    /**
     * Generates a resource-specific name following naming conventions.
     *
     * @param serviceAbbreviation - Azure service abbreviation (e.g., 'sb')
     * @param purpose - Purpose derived from construct ID
     * @returns Generated resource name
     *
     * @internal
     */
    private generateResourceName;
    /**
     * Merges tags from parent stack with provided tags.
     *
     * @param tags - Additional tags to merge
     * @returns Merged tag collection
     *
     * @internal
     */
    private mergeTags;
}
//# sourceMappingURL=service-bus-namespace.d.ts.map