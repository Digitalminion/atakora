/**
 * Type definitions for Azure Storage Queue Service constructs.
 *
 * @packageDocumentation
 */

import { schema } from '@atakora/lib';

/**
 * CORS rule for queue service.
 */
export interface QueueCorsRule {
  /**
   * Allowed origins (e.g., "*" or "https://example.com").
   */
  readonly allowedOrigins: string[];

  /**
   * Allowed HTTP methods.
   */
  readonly allowedMethods: ('DELETE' | 'GET' | 'HEAD' | 'MERGE' | 'POST' | 'OPTIONS' | 'PUT' | 'PATCH')[];

  /**
   * Allowed headers.
   */
  readonly allowedHeaders: string[];

  /**
   * Exposed headers.
   */
  readonly exposedHeaders: string[];

  /**
   * Max age in seconds for preflight requests.
   */
  readonly maxAgeInSeconds: number;
}

/**
 * Properties for ArmQueueServices (L1 construct).
 *
 * @remarks
 * Direct mapping to Microsoft.Storage/storageAccounts/queueServices ARM resource.
 * The queue service name is always "default" in Azure.
 *
 * ARM API Version: 2025-01-01
 *
 * @example
 * ```typescript
 * const props: ArmQueueServicesProps = {
 *   storageAccountName: 'stgauthr001',
 *   cors: {
 *     corsRules: [{
 *       allowedOrigins: ['*'],
 *       allowedMethods: ['GET', 'POST'],
 *       allowedHeaders: ['*'],
 *       exposedHeaders: ['*'],
 *       maxAgeInSeconds: 3600
 *     }]
 *   }
 * };
 * ```
 */
export interface ArmQueueServicesProps {
  /**
   * Name of the parent storage account.
   */
  readonly storageAccountName: string;

  /**
   * CORS configuration for the queue service.
   */
  readonly cors?: {
    readonly corsRules: QueueCorsRule[];
  };
}

/**
 * Properties for QueueServices (L2 construct).
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 *
 * @example
 * ```typescript
 * const queueService = new QueueServices(storageAccount, 'QueueService', {
 *   cors: {
 *     corsRules: [{
 *       allowedOrigins: ['*'],
 *       allowedMethods: ['GET', 'POST'],
 *       allowedHeaders: ['*'],
 *       exposedHeaders: ['*'],
 *       maxAgeInSeconds: 3600
 *     }]
 *   }
 * });
 * ```
 */
export interface QueueServicesProps {
  /**
   * CORS configuration for the queue service.
   */
  readonly cors?: {
    readonly corsRules: QueueCorsRule[];
  };
}

/**
 * Interface for Queue Service reference.
 *
 * @remarks
 * Allows resources to reference a queue service without depending on the construct class.
 */
export interface IQueueService {
  /**
   * Name of the queue service (always "default").
   */
  readonly queueServiceName: string;

  /**
   * Name of the parent storage account.
   */
  readonly storageAccountName: string;

  /**
   * Resource ID of the queue service.
   */
  readonly queueServiceId: string;
}
