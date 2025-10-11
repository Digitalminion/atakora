/**
 * Type definitions for Azure Storage Queue constructs.
 *
 * @packageDocumentation
 */

/**
 * Properties for ArmStorageQueues (L1 construct).
 *
 * @remarks
 * Direct mapping to Microsoft.Storage/storageAccounts/queueServices/queues ARM resource.
 * All properties are explicit with no defaults or auto-generation.
 *
 * ARM API Version: 2025-01-01
 *
 * @example
 * ```typescript
 * const props: ArmStorageQueuesProps = {
 *   storageAccountName: 'stgauthr001',
 *   queueName: 'orders',
 *   metadata: {
 *     purpose: 'order-processing'
 *   }
 * };
 * ```
 */
export interface ArmStorageQueuesProps {
  /**
   * Name of the parent storage account.
   *
   * @remarks
   * Must reference an existing storage account.
   */
  readonly storageAccountName: string;

  /**
   * Name of the queue.
   *
   * @remarks
   * - Must be 3-63 characters
   * - Lowercase alphanumeric and hyphens only
   * - Cannot start or end with hyphen
   * - Cannot have consecutive hyphens
   * - Pattern: ^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$
   */
  readonly queueName: string;

  /**
   * Metadata key-value pairs for the queue.
   *
   * @remarks
   * Optional metadata to associate with the queue.
   */
  readonly metadata?: Record<string, string>;
}

/**
 * Properties for StorageQueues (L2 construct).
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 * Designed for developer productivity with minimal required properties.
 *
 * @example
 * ```typescript
 * // Minimal usage - auto-generates queue name
 * const queue = new StorageQueues(storageAccount, 'OrderQueue');
 *
 * // With custom properties
 * const queue = new StorageQueues(storageAccount, 'OrderQueue', {
 *   queueName: 'orders',
 *   metadata: {
 *     purpose: 'order-processing',
 *     team: 'backend'
 *   }
 * });
 * ```
 */
export interface StorageQueuesProps {
  /**
   * Name of the queue.
   *
   * @remarks
   * If not provided, will be auto-generated from the construct ID.
   * - Format: lowercase with hyphens
   * - Example: `order-queue`
   */
  readonly queueName?: string;

  /**
   * Metadata key-value pairs for the queue.
   *
   * @remarks
   * Optional metadata to associate with the queue.
   */
  readonly metadata?: Record<string, string>;
}

/**
 * Interface for Storage Queue reference.
 *
 * @remarks
 * Allows resources to reference a storage queue without depending on the construct class.
 */
export interface IStorageQueue {
  /**
   * Name of the queue.
   */
  readonly queueName: string;

  /**
   * Name of the parent storage account.
   */
  readonly storageAccountName: string;

  /**
   * Resource ID of the queue.
   */
  readonly queueId: string;

  /**
   * Queue URL.
   *
   * @remarks
   * Format: `https://{storageAccountName}.queue.core.windows.net/{queueName}`
   */
  readonly queueUrl: string;
}
