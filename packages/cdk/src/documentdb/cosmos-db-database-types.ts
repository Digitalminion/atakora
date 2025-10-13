/**
 * Type definitions for Cosmos DB SQL Database constructs.
 *
 * @remarks
 * Types for Cosmos DB SQL databases that are children of database accounts.
 *
 * @packageDocumentation
 */

import { schema } from '@atakora/lib';
import type { IDatabaseAccount } from './cosmos-db-types';

/**
 * Throughput mode for database.
 */
export const ThroughputMode = schema.documentdb.ThroughputMode;
export type ThroughputMode = typeof ThroughputMode[keyof typeof ThroughputMode];

/**
 * Throughput configuration for database.
 */
export interface ThroughputConfig {
  /**
   * Throughput mode.
   */
  readonly mode: ThroughputMode;

  /**
   * Throughput in RU/s (for manual mode).
   *
   * @remarks
   * Minimum: 400 RU/s
   * Increments: 100 RU/s
   * Only used when mode is MANUAL.
   */
  readonly throughput?: number;

  /**
   * Maximum throughput in RU/s (for autoscale mode).
   *
   * @remarks
   * Minimum: 1000 RU/s
   * Increments: 1000 RU/s
   * Only used when mode is AUTOSCALE.
   */
  readonly maxThroughput?: number;
}

/**
 * Properties for ArmCosmosDBDatabase (L1 construct).
 *
 * @remarks
 * Direct mapping to Microsoft.DocumentDB/databaseAccounts/sqlDatabases ARM resource.
 *
 * ARM API Version: 2024-08-15
 */
export interface ArmCosmosDBDatabaseProps {
  /**
   * Parent Cosmos DB database account.
   */
  readonly account: IDatabaseAccount;

  /**
   * Database name.
   *
   * @remarks
   * Must be 1-255 characters.
   */
  readonly databaseName: string;

  /**
   * Throughput configuration.
   *
   * @remarks
   * Optional. If not specified, database inherits throughput from containers.
   */
  readonly throughput?: ThroughputConfig;

  /**
   * Tags to apply to the database.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Properties for CosmosDBDatabase (L2 construct).
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 */
export interface CosmosDBDatabaseProps {
  /**
   * Parent Cosmos DB database account.
   */
  readonly account: IDatabaseAccount;

  /**
   * Database name (optional - auto-generated if not provided).
   */
  readonly databaseName?: string;

  /**
   * Throughput in RU/s (for manual provisioned throughput).
   *
   * @remarks
   * If not specified, containers will have their own throughput.
   * Minimum: 400 RU/s
   * Increments: 100 RU/s
   */
  readonly throughput?: number;

  /**
   * Maximum throughput in RU/s (for autoscale mode).
   *
   * @remarks
   * If specified, enables autoscale mode.
   * Minimum: 1000 RU/s
   * Increments: 1000 RU/s
   */
  readonly maxThroughput?: number;

  /**
   * Tags to apply to the database.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Interface for Cosmos DB Database reference.
 */
export interface ICosmosDBDatabase {
  /**
   * Name of the Cosmos DB database.
   */
  readonly databaseName: string;

  /**
   * Resource ID of the Cosmos DB database.
   */
  readonly databaseId: string;

  /**
   * Parent account.
   */
  readonly account: IDatabaseAccount;
}
