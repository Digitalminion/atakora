/**
 * L1 construct for Azure Service Bus Queue.
 *
 * @packageDocumentation
 */

import { Resource, DeploymentScope } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { Construct } from '@atakora/cdk';
import type {
  ArmServiceBusQueueProps,
  IServiceBusQueue,
  EntityStatus,
} from './service-bus-queue-types';

/**
 * L1 construct for Service Bus Queue.
 *
 * @remarks
 * Direct mapping to Microsoft.ServiceBus/namespaces/queues ARM resource.
 * This is a child resource of Service Bus namespace.
 *
 * ARM API Version: 2021-11-01
 *
 * @example
 * ```typescript
 * const queue = new ArmServiceBusQueue(namespace, 'OrderQueue', {
 *   namespace: serviceBusNamespace,
 *   queueName: 'orders',
 *   maxDeliveryCount: 5,
 *   lockDuration: 'PT5M',
 *   requiresDuplicateDetection: true
 * });
 * ```
 */
export class ArmServiceBusQueue extends Resource implements IServiceBusQueue {
  public readonly resourceType: string = 'Microsoft.ServiceBus/namespaces/queues';
  public readonly apiVersion: string = '2021-11-01';
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  public readonly queueName: string;
  public readonly namespaceName: string;
  public readonly name: string;
  public readonly queueId: string;
  public readonly resourceId: string;
  public readonly connectionString: string;

  public readonly lockDuration: string;
  public readonly maxDeliveryCount: number;
  public readonly maxSizeInMegabytes: number;
  public readonly requiresDuplicateDetection: boolean;
  public readonly duplicateDetectionHistoryTimeWindow?: string;
  public readonly defaultMessageTimeToLive: string;
  public readonly deadLetteringOnMessageExpiration: boolean;
  public readonly enablePartitioning: boolean;
  public readonly requiresSession: boolean;
  public readonly autoDeleteOnIdle?: string;
  public readonly enableBatchedOperations: boolean;
  public readonly status?: EntityStatus;
  public readonly forwardTo?: string;
  public readonly forwardDeadLetteredMessagesTo?: string;
  public readonly tags: Record<string, string>;

  constructor(scope: Construct, id: string, props: ArmServiceBusQueueProps) {
    super(scope, id);

    this.validateProps(props);

    this.queueName = props.queueName;
    this.namespaceName = props.namespace.namespaceName;
    this.name = `${this.namespaceName}/${this.queueName}`;
    this.lockDuration = props.lockDuration ?? 'PT1M';
    this.maxDeliveryCount = props.maxDeliveryCount ?? 10;
    this.maxSizeInMegabytes = props.maxSizeInMegabytes ?? 1024;
    this.requiresDuplicateDetection = props.requiresDuplicateDetection ?? false;
    this.duplicateDetectionHistoryTimeWindow = props.duplicateDetectionHistoryTimeWindow;
    this.defaultMessageTimeToLive = props.defaultMessageTimeToLive ?? 'P14D';
    this.deadLetteringOnMessageExpiration = props.deadLetteringOnMessageExpiration ?? false;
    this.enablePartitioning = props.enablePartitioning ?? false;
    this.requiresSession = props.requiresSession ?? false;
    this.autoDeleteOnIdle = props.autoDeleteOnIdle;
    this.enableBatchedOperations = props.enableBatchedOperations ?? true;
    this.status = props.status;
    this.forwardTo = props.forwardTo;
    this.forwardDeadLetteredMessagesTo = props.forwardDeadLetteredMessagesTo;
    this.tags = props.tags ?? {};

    this.queueId = `[resourceId('Microsoft.ServiceBus/namespaces/queues', '${this.namespaceName}', '${this.queueName}')]`;
    this.resourceId = this.queueId;

    // Connection string uses listKeys function at runtime
    this.connectionString = `[listKeys(resourceId('Microsoft.ServiceBus/namespaces/queues/authorizationRules', '${this.namespaceName}', '${this.queueName}', 'RootManageSharedAccessKey'), '2021-11-01').primaryConnectionString]`;
  }

  protected validateProps(props: ArmServiceBusQueueProps): void {
    if (!props.namespace) {
      throw new Error('Service Bus namespace is required');
    }

    if (!props.queueName) {
      throw new Error('Queue name is required');
    }

    // Validate queue name
    if (props.queueName.length < 1 || props.queueName.length > 260) {
      throw new Error('Queue name must be 1-260 characters');
    }

    if (!/^[a-zA-Z0-9._\-]+$/.test(props.queueName)) {
      throw new Error('Queue name can only contain alphanumeric characters, periods, hyphens, and underscores');
    }

    // Validate max delivery count
    if (props.maxDeliveryCount !== undefined) {
      if (props.maxDeliveryCount < 1 || props.maxDeliveryCount > 2000) {
        throw new Error('Max delivery count must be between 1 and 2000');
      }
    }

    // Validate max size
    if (props.maxSizeInMegabytes !== undefined) {
      const validSizes = [1024, 2048, 3072, 4096, 5120];
      if (!validSizes.includes(props.maxSizeInMegabytes)) {
        throw new Error(`Max size must be one of: ${validSizes.join(', ')}`);
      }
    }
  }

  public toArmTemplate(): ArmResource {
    const properties: any = {
      lockDuration: this.lockDuration,
      maxDeliveryCount: this.maxDeliveryCount,
      maxSizeInMegabytes: this.maxSizeInMegabytes,
      requiresDuplicateDetection: this.requiresDuplicateDetection,
      defaultMessageTimeToLive: this.defaultMessageTimeToLive,
      deadLetteringOnMessageExpiration: this.deadLetteringOnMessageExpiration,
      enablePartitioning: this.enablePartitioning,
      requiresSession: this.requiresSession,
      enableBatchedOperations: this.enableBatchedOperations,
    };

    if (this.duplicateDetectionHistoryTimeWindow) {
      properties.duplicateDetectionHistoryTimeWindow = this.duplicateDetectionHistoryTimeWindow;
    }

    if (this.autoDeleteOnIdle) {
      properties.autoDeleteOnIdle = this.autoDeleteOnIdle;
    }

    if (this.status) {
      properties.status = this.status;
    }

    if (this.forwardTo) {
      properties.forwardTo = this.forwardTo;
    }

    if (this.forwardDeadLetteredMessagesTo) {
      properties.forwardDeadLetteredMessagesTo = this.forwardDeadLetteredMessagesTo;
    }

    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.name,
      properties,
      tags: Object.keys(this.tags).length > 0 ? this.tags : undefined,
      dependsOn: [
        `[resourceId('Microsoft.ServiceBus/namespaces', '${this.namespaceName}')]`,
      ],
    } as ArmResource;
  }
}
