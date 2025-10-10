/**
 * Type definitions for Event Hub constructs.
 *
 * @packageDocumentation
 */

/**
 * Properties for ArmEventHub (L1 construct).
 *
 * @remarks
 * Direct mapping to Microsoft.EventHub/namespaces/eventhubs ARM resource.
 * All properties are explicit with no defaults or auto-generation.
 *
 * ARM API Version: 2021-11-01
 *
 * @example
 * ```typescript
 * const props: ArmEventHubProps = {
 *   namespaceName: 'evhns-myapp-prod',
 *   eventHubName: 'events',
 *   location: 'eastus',
 *   partitionCount: 4,
 *   messageRetentionInDays: 7
 * };
 * ```
 */
export interface ArmEventHubProps {
  /**
   * Event Hub namespace name.
   *
   * @remarks
   * Parent namespace containing the Event Hub.
   * Must be 6-50 characters, alphanumeric and hyphens.
   */
  readonly namespaceName: string;

  /**
   * Event Hub name.
   *
   * @remarks
   * Must be 1-256 characters.
   */
  readonly eventHubName: string;

  /**
   * Azure region where the Event Hub will be created.
   */
  readonly location: string;

  /**
   * Number of partitions.
   *
   * @remarks
   * Range: 1-32 (Basic/Standard), 1-2000 (Premium/Dedicated).
   * Cannot be changed after creation.
   */
  readonly partitionCount?: number;

  /**
   * Message retention in days.
   *
   * @remarks
   * Range: 1-7 days (Basic/Standard), 1-90 days (Premium/Dedicated).
   */
  readonly messageRetentionInDays?: number;

  /**
   * Capture description configuration.
   */
  readonly captureDescription?: EventHubCaptureDescription;

  /**
   * Tags to apply to the Event Hub.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Event Hub capture configuration.
 */
export interface EventHubCaptureDescription {
  /**
   * Enable capture.
   */
  readonly enabled: boolean;

  /**
   * Capture encoding format.
   */
  readonly encoding?: 'Avro' | 'AvroDeflate';

  /**
   * Time window for capture in seconds.
   */
  readonly intervalInSeconds?: number;

  /**
   * Size window for capture in bytes.
   */
  readonly sizeLimitInBytes?: number;

  /**
   * Destination for captured data.
   */
  readonly destination?: {
    readonly name: 'EventHubArchive.AzureBlockBlob';
    readonly storageAccountResourceId: string;
    readonly blobContainer: string;
    readonly archiveNameFormat?: string;
  };
}

/**
 * Properties for EventHub (L2 construct).
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 * Designed for developer productivity with minimal required properties.
 *
 * @example
 * ```typescript
 * // Minimal usage
 * const eventHub = new EventHub(resourceGroup, 'Events', {
 *   namespaceName: 'evhns-myapp-prod'
 * });
 *
 * // With custom properties
 * const eventHub = new EventHub(resourceGroup, 'Events', {
 *   namespaceName: 'evhns-myapp-prod',
 *   eventHubName: 'telemetry',
 *   partitionCount: 8,
 *   messageRetentionInDays: 3
 * });
 * ```
 */
export interface EventHubProps {
  /**
   * Event Hub namespace name.
   *
   * @remarks
   * Required. The namespace that will contain this Event Hub.
   */
  readonly namespaceName: string;

  /**
   * Event Hub name.
   *
   * @remarks
   * If not provided, will be auto-generated using the stack's naming context.
   */
  readonly eventHubName?: string;

  /**
   * Azure region where the Event Hub will be created.
   *
   * @remarks
   * If not provided, defaults to the parent resource group's location.
   */
  readonly location?: string;

  /**
   * Number of partitions.
   *
   * @remarks
   * Defaults to 4.
   * Cannot be changed after creation.
   */
  readonly partitionCount?: number;

  /**
   * Message retention in days.
   *
   * @remarks
   * Defaults to 7 days.
   */
  readonly messageRetentionInDays?: number;

  /**
   * Capture description configuration.
   */
  readonly captureDescription?: EventHubCaptureDescription;

  /**
   * Tags to apply to the Event Hub.
   *
   * @remarks
   * These tags will be merged with the parent's tags.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Interface for Event Hub reference.
 *
 * @remarks
 * Allows resources to reference an Event Hub without depending on the construct class.
 */
export interface IEventHub {
  /**
   * Namespace name containing the Event Hub.
   */
  readonly namespaceName: string;

  /**
   * Name of the Event Hub.
   */
  readonly eventHubName: string;

  /**
   * Location of the Event Hub.
   */
  readonly location: string;

  /**
   * Resource ID of the Event Hub.
   */
  readonly eventHubId: string;
}
