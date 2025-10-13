/**
 * L2 construct for Azure Service Bus Queue.
 *
 * @packageDocumentation
 */

import { Construct } from '@atakora/cdk';
import type { IResourceGroup } from '@atakora/cdk';
import { IGrantable, GrantResult, WellKnownRoleIds, RoleAssignment } from '@atakora/lib';
import { ArmServiceBusQueue } from './service-bus-queue-arm';
import type {
  ServiceBusQueueProps,
  IServiceBusQueue,
  IServiceBusNamespace,
} from './service-bus-queue-types';

/**
 * L2 construct for Service Bus Queue.
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-naming.
 * Provides grant methods for Azure RBAC permissions.
 *
 * @example
 * ```typescript
 * const queue = new ServiceBusQueue(namespace, 'Orders', {
 *   maxDeliveryCount: 5,
 *   requiresDuplicateDetection: true
 * });
 *
 * // Grant send permission to a function app
 * queue.grantSend(producerFunction);
 *
 * // Grant receive permission to a function app
 * queue.grantReceive(consumerFunction);
 * ```
 */
export class ServiceBusQueue extends Construct implements IServiceBusQueue {
  private readonly armQueue: ArmServiceBusQueue;
  private readonly namespace: IServiceBusNamespace;
  private readonly parentResourceGroup: IResourceGroup;
  private grantCounter = 0;

  public readonly queueName: string;
  public readonly namespaceName: string;
  public readonly queueId: string;
  public readonly connectionString: string;
  public readonly tags: Record<string, string>;

  constructor(scope: Construct, id: string, props: ServiceBusQueueProps = {}) {
    super(scope, id);

    // Get parent context
    this.namespace = this.getParentNamespace(scope);
    this.parentResourceGroup = this.getParentResourceGroup(scope);

    // Resolve queue name
    this.queueName = props.queueName ?? this.resolveQueueName(id);
    this.namespaceName = this.namespace.namespaceName;

    // Merge tags
    this.tags = {
      ...this.getParentTags(scope),
      ...props.tags,
    };

    // Convert seconds to ISO 8601 duration format
    const lockDuration = props.lockDuration ? `PT${props.lockDuration}S` : undefined;
    const duplicateDetectionWindow = props.duplicateDetectionWindow ? `PT${props.duplicateDetectionWindow}S` : undefined;
    const defaultTtl = props.defaultMessageTimeToLive ? `PT${props.defaultMessageTimeToLive}S` : undefined;

    // Create underlying L1 resource
    this.armQueue = new ArmServiceBusQueue(scope, `${id}Queue`, {
      namespace: this.namespace,
      queueName: this.queueName,
      lockDuration,
      maxDeliveryCount: props.maxDeliveryCount,
      maxSizeInMegabytes: props.maxSizeInMegabytes,
      requiresDuplicateDetection: props.requiresDuplicateDetection,
      duplicateDetectionHistoryTimeWindow: duplicateDetectionWindow,
      defaultMessageTimeToLive: defaultTtl,
      deadLetteringOnMessageExpiration: props.deadLetteringOnMessageExpiration ?? true,
      enablePartitioning: props.enablePartitioning,
      requiresSession: props.requiresSession,
      enableBatchedOperations: props.enableBatchedOperations,
      tags: this.tags,
    });

    this.queueId = this.armQueue.queueId;
    this.connectionString = this.armQueue.connectionString;
  }

  /**
   * Grant send permission to an identity.
   *
   * @param grantee - Identity to grant permission to
   * @returns Grant result
   *
   * @example
   * ```typescript
   * queue.grantSend(producerFunction);
   * ```
   */
  public grantSend(grantee: IGrantable): GrantResult {
    const roleAssignment = new RoleAssignment(this, `GrantSend${this.grantCounter++}`, {
      scope: this.queueId,
      roleDefinitionId: WellKnownRoleIds.SERVICE_BUS_DATA_SENDER,
      principalId: grantee.principalId,
      principalType: grantee.principalType,
      tenantId: grantee.tenantId,
      description: `Send permission to Service Bus queue ${this.queueName}`,
    });

    return new GrantResult(
      roleAssignment,
      WellKnownRoleIds.SERVICE_BUS_DATA_SENDER,
      grantee,
      this.queueId
    );
  }

  /**
   * Grant receive permission to an identity.
   *
   * @param grantee - Identity to grant permission to
   * @returns Grant result
   *
   * @example
   * ```typescript
   * queue.grantReceive(consumerFunction);
   * ```
   */
  public grantReceive(grantee: IGrantable): GrantResult {
    const roleAssignment = new RoleAssignment(this, `GrantReceive${this.grantCounter++}`, {
      scope: this.queueId,
      roleDefinitionId: WellKnownRoleIds.SERVICE_BUS_DATA_RECEIVER,
      principalId: grantee.principalId,
      principalType: grantee.principalType,
      tenantId: grantee.tenantId,
      description: `Receive permission to Service Bus queue ${this.queueName}`,
    });

    return new GrantResult(
      roleAssignment,
      WellKnownRoleIds.SERVICE_BUS_DATA_RECEIVER,
      grantee,
      this.queueId
    );
  }

  /**
   * Grant both send and receive permissions.
   *
   * @param grantee - Identity to grant permissions to
   * @returns Grant result for receiver role (sender is also granted)
   *
   * @example
   * ```typescript
   * queue.grantSendReceive(functionApp);
   * ```
   */
  public grantSendReceive(grantee: IGrantable): GrantResult {
    this.grantSend(grantee);
    return this.grantReceive(grantee);
  }

  private getParentNamespace(scope: Construct): IServiceBusNamespace {
    let current: Construct | undefined = scope;

    while (current) {
      if (this.isServiceBusNamespace(current)) {
        return current as IServiceBusNamespace;
      }
      current = current.node.scope;
    }

    throw new Error('ServiceBusQueue must be created within or under a ServiceBusNamespace');
  }

  private isServiceBusNamespace(construct: any): construct is IServiceBusNamespace {
    return (
      construct &&
      typeof construct.namespaceName === 'string' &&
      typeof construct.namespaceId === 'string'
    );
  }

  private getParentResourceGroup(scope: Construct): IResourceGroup {
    let current: Construct | undefined = scope;

    while (current) {
      if (this.isResourceGroup(current)) {
        return current as IResourceGroup;
      }
      current = current.node.scope;
    }

    throw new Error('ServiceBusQueue must be created within or under a ResourceGroup');
  }

  private isResourceGroup(construct: any): construct is IResourceGroup {
    return (
      construct &&
      typeof construct.resourceGroupName === 'string' &&
      typeof construct.location === 'string'
    );
  }

  private getParentTags(scope: Construct): Record<string, string> {
    const parent = scope as any;
    if (parent && typeof parent.tags === 'object') {
      return parent.tags;
    }
    return {};
  }

  private resolveQueueName(id: string): string {
    // Convert construct ID to kebab-case for queue name
    return id
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase()
      .replace(/[^a-z0-9\-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
