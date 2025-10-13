/**
 * Data Stack type definitions.
 *
 * @remarks
 * Types for the composite L3 Data Stack construct that orchestrates
 * Cosmos DB, Service Bus, SignalR, Functions, and GraphQL resolvers.
 *
 * @packageDocumentation
 */

import type { IDatabaseAccount } from '@atakora/cdk/documentdb';
import type { IServiceBusNamespace } from '@atakora/cdk/servicebus';
import type { IFunctionApp } from '@atakora/cdk/functions';
import type { IApplicationInsights } from '@atakora/cdk/insights';
import type { ILogAnalyticsWorkspace } from '@atakora/cdk/operationalinsights';
import type { SchemaDefinition } from '@atakora/lib';
import type { DataStackSynthesisOptions } from '@atakora/lib';

/**
 * SignalR Service interface (placeholder until Agent 1 completes it).
 */
export interface ISignalRService {
  readonly serviceName: string;
  readonly location: string;
  readonly serviceId: string;
  readonly hostName: string;
}

/**
 * Properties for DataStack construct.
 */
export interface DataStackProps {
  /**
   * Schema definitions to synthesize.
   */
  readonly schemas: SchemaDefinition<any>[];

  /**
   * Cosmos DB account (required).
   */
  readonly cosmosAccount: IDatabaseAccount;

  /**
   * Service Bus namespace (optional - created if not provided).
   */
  readonly serviceBusNamespace?: IServiceBusNamespace;

  /**
   * SignalR service (optional - created if not provided).
   */
  readonly signalRService?: ISignalRService;

  /**
   * Function App (optional - created if not provided).
   */
  readonly functionApp?: IFunctionApp;

  /**
   * Database name (optional - defaults to 'MainDB').
   */
  readonly databaseName?: string;

  /**
   * Enable event-driven architecture (Service Bus).
   */
  readonly enableEvents?: boolean;

  /**
   * Enable GraphQL API.
   */
  readonly enableGraphQL?: boolean;

  /**
   * Enable real-time subscriptions (SignalR).
   */
  readonly enableRealtime?: boolean;

  /**
   * Enable monitoring (Application Insights).
   * @default true
   */
  readonly enableMonitoring?: boolean;

  /**
   * Use an existing Log Analytics Workspace.
   * If not provided and monitoring is enabled, a new workspace will be created.
   */
  readonly logAnalyticsWorkspace?: ILogAnalyticsWorkspace;

  /**
   * Use an existing Application Insights instance.
   * If not provided and monitoring is enabled, a new instance will be created.
   */
  readonly applicationInsights?: IApplicationInsights;

  /**
   * Log retention in days.
   * @default 90
   */
  readonly logRetentionInDays?: number;

  /**
   * Enable Cosmos DB diagnostic settings.
   * @default true
   */
  readonly enableCosmosDiagnostics?: boolean;

  /**
   * Synthesis options.
   */
  readonly synthesisOptions?: Partial<DataStackSynthesisOptions>;

  /**
   * Resource tags.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Container reference for accessing synthesized containers.
 */
export interface ICosmosContainer {
  readonly containerName: string;
  readonly databaseName: string;
  readonly partitionKeyPath: string;
  readonly containerId: string;
}

/**
 * Topic reference for accessing synthesized topics.
 */
export interface IServiceBusTopic {
  readonly topicName: string;
  readonly namespaceName: string;
  readonly topicId: string;
}

/**
 * Resolver reference for accessing synthesized resolvers.
 */
export interface IGraphQLResolver {
  readonly resolverName: string;
  readonly entityName: string;
  readonly operation: string;
  readonly functionName: string;
}

/**
 * Data Stack interface for accessing synthesized resources.
 */
export interface IDataStack {
  /**
   * Database name.
   */
  readonly databaseName: string;

  /**
   * Cosmos DB account.
   */
  readonly cosmosAccount: IDatabaseAccount;

  /**
   * Service Bus namespace (if events enabled).
   */
  readonly serviceBusNamespace?: IServiceBusNamespace;

  /**
   * SignalR service (if realtime enabled).
   */
  readonly signalRService?: ISignalRService;

  /**
   * Function App (if GraphQL enabled).
   */
  readonly functionApp?: IFunctionApp;

  /**
   * Log Analytics Workspace (if monitoring enabled).
   */
  readonly logAnalyticsWorkspace?: ILogAnalyticsWorkspace;

  /**
   * Application Insights instance (if monitoring enabled).
   */
  readonly applicationInsights?: IApplicationInsights;

  /**
   * Get a container by entity name.
   */
  getContainer(entityName: string): ICosmosContainer | undefined;

  /**
   * Get a topic by entity name.
   */
  getTopic(entityName: string): IServiceBusTopic | undefined;

  /**
   * Get all resolvers.
   */
  getResolvers(): IGraphQLResolver[];

  /**
   * Get resolvers for a specific entity.
   */
  getResolversForEntity(entityName: string): IGraphQLResolver[];
}
