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
import type {
  ArmServiceBusTopicProps,
  IServiceBusTopic,
} from './service-bus-topic-types';

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
export class ArmServiceBusTopic extends Resource implements IServiceBusTopic {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.ServiceBus/namespaces/topics';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2021-11-01';

  /**
   * Deployment scope.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * Parent namespace.
   */
  public readonly namespace: any;

  /**
   * Topic name.
   */
  public readonly topicName: string;

  /**
   * Resource name (same as topicName).
   */
  public readonly name: string;

  /**
   * Maximum size in megabytes.
   */
  public readonly maxSizeInMegabytes?: number;

  /**
   * Default message time to live.
   */
  public readonly defaultMessageTimeToLive?: string;

  /**
   * Duplicate detection history time window.
   */
  public readonly duplicateDetectionHistoryTimeWindow?: string;

  /**
   * Enable batched operations.
   */
  public readonly enableBatchedOperations?: boolean;

  /**
   * Requires duplicate detection.
   */
  public readonly requiresDuplicateDetection?: boolean;

  /**
   * Enable partitioning.
   */
  public readonly enablePartitioning?: boolean;

  /**
   * Support ordering.
   */
  public readonly supportOrdering?: boolean;

  /**
   * Auto delete on idle.
   */
  public readonly autoDeleteOnIdle?: string;

  /**
   * Entity status.
   */
  public readonly status?: string;

  /**
   * ARM resource ID.
   */
  public readonly resourceId: string;

  /**
   * Topic ID (alias for resourceId).
   */
  public readonly topicId: string;

  constructor(scope: Construct, id: string, props: ArmServiceBusTopicProps) {
    super(scope, id);

    this.validateProps(props);

    this.namespace = props.namespace;
    this.topicName = props.topicName;
    this.name = props.topicName;
    this.maxSizeInMegabytes = props.maxSizeInMegabytes;
    this.defaultMessageTimeToLive = props.defaultMessageTimeToLive;
    this.duplicateDetectionHistoryTimeWindow = props.duplicateDetectionHistoryTimeWindow;
    this.enableBatchedOperations = props.enableBatchedOperations;
    this.requiresDuplicateDetection = props.requiresDuplicateDetection;
    this.enablePartitioning = props.enablePartitioning;
    this.supportOrdering = props.supportOrdering;
    this.autoDeleteOnIdle = props.autoDeleteOnIdle;
    this.status = props.status;

    this.resourceId = `${this.namespace.namespaceId}/topics/${this.topicName}`;
    this.topicId = this.resourceId;
  }

  protected validateProps(props: ArmServiceBusTopicProps): void {
    if (!props.topicName || props.topicName.trim() === '') {
      throw new Error('Topic name cannot be empty');
    }

    if (props.topicName.length < 1 || props.topicName.length > 260) {
      throw new Error('Topic name must be between 1 and 260 characters');
    }

    if (props.topicName.startsWith('-') || props.topicName.endsWith('-')) {
      throw new Error('Topic name cannot start or end with hyphen');
    }

    if (!/^[a-zA-Z0-9-]+$/.test(props.topicName)) {
      throw new Error('Topic name can only contain alphanumeric characters and hyphens');
    }

    if (props.maxSizeInMegabytes) {
      const validSizes = [1024, 2048, 3072, 4096, 5120, 10240, 20480, 40960, 81920];
      if (!validSizes.includes(props.maxSizeInMegabytes)) {
        throw new Error(
          `Max size must be one of: ${validSizes.join(', ')} MB`
        );
      }
    }
  }

  public toArmTemplate(): ArmResource {
    const properties: any = {};

    if (this.maxSizeInMegabytes !== undefined) {
      properties.maxSizeInMegabytes = this.maxSizeInMegabytes;
    }

    if (this.defaultMessageTimeToLive !== undefined) {
      properties.defaultMessageTimeToLive = this.defaultMessageTimeToLive;
    }

    if (this.duplicateDetectionHistoryTimeWindow !== undefined) {
      properties.duplicateDetectionHistoryTimeWindow = this.duplicateDetectionHistoryTimeWindow;
    }

    if (this.enableBatchedOperations !== undefined) {
      properties.enableBatchedOperations = this.enableBatchedOperations;
    }

    if (this.requiresDuplicateDetection !== undefined) {
      properties.requiresDuplicateDetection = this.requiresDuplicateDetection;
    }

    if (this.enablePartitioning !== undefined) {
      properties.enablePartitioning = this.enablePartitioning;
    }

    if (this.supportOrdering !== undefined) {
      properties.supportOrdering = this.supportOrdering;
    }

    if (this.autoDeleteOnIdle !== undefined) {
      properties.autoDeleteOnIdle = this.autoDeleteOnIdle;
    }

    if (this.status !== undefined) {
      properties.status = this.status;
    }

    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: `${this.namespace.namespaceName}/${this.topicName}`,
      properties,
      dependsOn: [this.namespace.namespaceId],
    } as ArmResource;
  }
}
