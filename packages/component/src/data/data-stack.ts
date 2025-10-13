/**
 * Data Stack - Composite L3 construct for Atakora data infrastructure.
 *
 * @remarks
 * Orchestrates the creation of all data infrastructure from Atakora schemas:
 * - Cosmos DB databases and containers
 * - Service Bus topics and subscriptions
 * - GraphQL resolvers and Functions
 * - SignalR for real-time subscriptions
 *
 * @packageDocumentation
 */

import { Construct } from 'constructs';
import type { IDatabaseAccount } from '@atakora/cdk/documentdb';
import type { IServiceBusNamespace } from '@atakora/cdk/servicebus';
import type { IFunctionApp } from '@atakora/cdk/functions';
import type {
  DataStackProps,
  IDataStack,
  ICosmosContainer,
  IServiceBusTopic,
  IGraphQLResolver,
  ISignalRService,
} from './data-stack-types';
import {
  DataStackSynthesizer,
  type DataStackManifest,
  type CosmosContainerConfig,
  type TopicConfig,
  type ResolverConfig,
} from '@atakora/lib';
import {
  ArmComponents,
  ApplicationType,
  ArmDiagnosticSettings,
  type IApplicationInsights,
  PublicNetworkAccess as InsightsPublicNetworkAccess,
} from '@atakora/cdk/insights';
import {
  ArmWorkspaces,
  type ILogAnalyticsWorkspace,
  PublicNetworkAccess as WorkspacePublicNetworkAccess,
  WorkspaceSku,
} from '@atakora/cdk/operationalinsights';

/**
 * Data Stack construct.
 *
 * @remarks
 * L3 composite construct that uses the DataStackSynthesizer to generate
 * all necessary Azure infrastructure from Atakora schemas.
 *
 * @example
 * ```typescript
 * const dataStack = new DataStack(scope, 'DataStack', {
 *   schemas: [UserSchema, PostSchema, CommentSchema],
 *   cosmosAccount,
 *   enableEvents: true,
 *   enableGraphQL: true,
 *   enableRealtime: true,
 * });
 *
 * // Access synthesized resources
 * const userContainer = dataStack.getContainer('User');
 * const postTopic = dataStack.getTopic('Post');
 * const resolvers = dataStack.getResolvers();
 * ```
 */
export class DataStack extends Construct implements IDataStack {
  public readonly databaseName: string;
  public readonly cosmosAccount: IDatabaseAccount;
  public readonly serviceBusNamespace?: IServiceBusNamespace;
  public readonly signalRService?: ISignalRService;
  public readonly functionApp?: IFunctionApp;
  public readonly logAnalyticsWorkspace?: ILogAnalyticsWorkspace;
  public readonly applicationInsights?: IApplicationInsights;

  private readonly manifest: DataStackManifest;
  private readonly containerMap: Map<string, ICosmosContainer> = new Map();
  private readonly topicMap: Map<string, IServiceBusTopic> = new Map();
  private readonly resolverList: IGraphQLResolver[] = [];

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id);

    // Store references
    this.cosmosAccount = props.cosmosAccount;
    this.serviceBusNamespace = props.serviceBusNamespace;
    this.signalRService = props.signalRService;
    this.functionApp = props.functionApp;
    this.databaseName = props.databaseName || 'MainDB';

    // Configure observability (monitoring is enabled by default)
    const enableMonitoring = props.enableMonitoring !== false;

    if (enableMonitoring) {
      // Create or use existing Log Analytics Workspace
      this.logAnalyticsWorkspace = props.logAnalyticsWorkspace ?? new ArmWorkspaces(this, 'LogAnalytics', {
        workspaceName: `log-data-stack`,
        location: 'eastus',
        sku: { name: WorkspaceSku.PER_GB_2018 },
        retentionInDays: props.logRetentionInDays ?? 90,
        publicNetworkAccessForIngestion: WorkspacePublicNetworkAccess.DISABLED,
        publicNetworkAccessForQuery: WorkspacePublicNetworkAccess.DISABLED,
        tags: props.tags,
      });

      // Create or use existing Application Insights
      this.applicationInsights = props.applicationInsights ?? new ArmComponents(this, 'AppInsights', {
        name: `appi-data-stack`,
        location: 'eastus',
        kind: 'web',
        applicationType: ApplicationType.WEB,
        workspaceResourceId: this.logAnalyticsWorkspace!.workspaceId,
        retentionInDays: props.logRetentionInDays ?? 90,
        disableLocalAuth: true,
        publicNetworkAccessForIngestion: InsightsPublicNetworkAccess.DISABLED,
        publicNetworkAccessForQuery: InsightsPublicNetworkAccess.DISABLED,
        tags: props.tags,
      });

      // Configure Cosmos DB diagnostic settings (enabled by default when monitoring is enabled)
      if (props.enableCosmosDiagnostics !== false) {
        new ArmDiagnosticSettings(this, 'CosmosDiagnostics', {
          name: 'data-stack-cosmos-diagnostics',
          targetResourceId: this.cosmosAccount.accountId,
          workspaceId: this.logAnalyticsWorkspace!.workspaceId,
          logs: [
            {
              category: 'DataPlaneRequests',
              enabled: true,
              retentionPolicy: {
                enabled: true,
                days: props.logRetentionInDays ?? 90,
              },
            },
            {
              category: 'QueryRuntimeStatistics',
              enabled: true,
              retentionPolicy: {
                enabled: true,
                days: props.logRetentionInDays ?? 90,
              },
            },
            {
              category: 'PartitionKeyStatistics',
              enabled: true,
              retentionPolicy: {
                enabled: true,
                days: props.logRetentionInDays ?? 90,
              },
            },
          ],
          metrics: [
            {
              category: 'Requests',
              enabled: true,
              retentionPolicy: {
                enabled: true,
                days: props.logRetentionInDays ?? 90,
              },
            },
          ],
        });
      }
    }

    // Synthesize infrastructure
    const synthesizer = new DataStackSynthesizer();
    this.manifest = synthesizer.synthesize(props.schemas, {
      outdir: './cdk.out',
      databaseName: this.databaseName,
      enableEvents: props.enableEvents ?? true,
      enableGraphQL: props.enableGraphQL ?? true,
      ...props.synthesisOptions,
    });

    // Create infrastructure resources
    this.createCosmosInfrastructure(props);
    this.createServiceBusInfrastructure(props);
    this.createGraphQLInfrastructure(props);
    this.createRealtimeInfrastructure(props);
  }

  /**
   * Create Cosmos DB infrastructure.
   */
  private createCosmosInfrastructure(props: DataStackProps): void {
    // TODO: Once Agent 1 completes Cosmos DB database and container constructs,
    // replace these placeholders with actual resource creation

    // For now, just track the configurations
    for (const containerConfig of this.manifest.cosmos.containers) {
      const container: ICosmosContainer = {
        containerName: containerConfig.containerName,
        databaseName: this.databaseName,
        partitionKeyPath: containerConfig.partitionKeyPath,
        containerId: `${this.cosmosAccount.accountId}/databases/${this.databaseName}/containers/${containerConfig.containerName}`,
      };

      this.containerMap.set(containerConfig.containerName, container);
    }

    // Note: Actual implementation will be:
    // const database = new CosmosDatabase(this, 'Database', {
    //   account: this.cosmosAccount,
    //   databaseName: this.databaseName,
    // });
    //
    // for (const containerConfig of this.manifest.cosmos.containers) {
    //   const container = new CosmosContainer(this, `Container-${containerConfig.containerName}`, {
    //     database,
    //     containerName: containerConfig.containerName,
    //     partitionKeyPath: containerConfig.partitionKeyPath,
    //     indexingPolicy: containerConfig.indexingPolicy,
    //     uniqueKeyPolicy: containerConfig.uniqueKeyPolicy,
    //   });
    //   this.containerMap.set(containerConfig.containerName, container);
    // }
  }

  /**
   * Create Service Bus infrastructure.
   */
  private createServiceBusInfrastructure(props: DataStackProps): void {
    if (!props.enableEvents || !this.serviceBusNamespace) {
      return;
    }

    // TODO: Once Agent 1 completes Service Bus topic and subscription constructs,
    // replace these placeholders with actual resource creation

    // For now, just track the configurations
    for (const topicConfig of this.manifest.serviceBus.topics) {
      const topic: IServiceBusTopic = {
        topicName: topicConfig.topicName,
        namespaceName: this.serviceBusNamespace.namespaceName,
        topicId: `${this.serviceBusNamespace.namespaceId}/topics/${topicConfig.topicName}`,
      };

      this.topicMap.set(topicConfig.entityName, topic);
    }

    // Note: Actual implementation will be:
    // for (const topicConfig of this.manifest.serviceBus.topics) {
    //   const topic = new ServiceBusTopic(this, `Topic-${topicConfig.topicName}`, {
    //     namespace: this.serviceBusNamespace,
    //     topicName: topicConfig.topicName,
    //     requiresDuplicateDetection: topicConfig.requiresDuplicateDetection,
    //     enablePartitioning: topicConfig.enablePartitioning,
    //   });
    //   this.topicMap.set(topicConfig.entityName, topic);
    // }
    //
    // for (const subConfig of this.manifest.serviceBus.subscriptions) {
    //   const topic = this.topicMap.get(subConfig.subscriberEntity);
    //   if (topic) {
    //     new ServiceBusSubscription(this, `Sub-${subConfig.subscriptionName}`, {
    //       topic,
    //       subscriptionName: subConfig.subscriptionName,
    //       filter: subConfig.filter,
    //     });
    //   }
    // }
  }

  /**
   * Create GraphQL infrastructure.
   */
  private createGraphQLInfrastructure(props: DataStackProps): void {
    if (!props.enableGraphQL) {
      return;
    }

    // TODO: Once Function App constructs are ready, create actual functions

    // For now, just track the resolver configurations
    for (const resolverConfig of this.manifest.resolvers.configs) {
      const resolver: IGraphQLResolver = {
        resolverName: resolverConfig.resolverName,
        entityName: resolverConfig.entityName,
        operation: resolverConfig.operation,
        functionName: resolverConfig.handlerName,
      };

      this.resolverList.push(resolver);
    }

    // Note: Actual implementation will be:
    // for (const resolverConfig of this.manifest.resolvers.configs) {
    //   const fn = new Function(this.functionApp, `Fn-${resolverConfig.handlerName}`, {
    //     functionName: resolverConfig.handlerName,
    //     handler: 'index.handler',
    //     runtime: 'node20',
    //     code: generateResolverCode(resolverConfig),
    //     environment: {
    //       COSMOS_ENDPOINT: this.cosmosAccount.documentEndpoint,
    //       DATABASE_NAME: this.databaseName,
    //     },
    //   });
    //
    //   // Grant Cosmos DB access
    //   grantCosmosAccess(fn, this.cosmosAccount);
    // }
  }

  /**
   * Create real-time infrastructure.
   */
  private createRealtimeInfrastructure(props: DataStackProps): void {
    if (!props.enableRealtime || !this.signalRService) {
      return;
    }

    // TODO: Once SignalR constructs are ready, wire up subscriptions

    // Note: Actual implementation will be:
    // for (const resolverConfig of this.manifest.resolvers.configs) {
    //   if (resolverConfig.operation === 'subscription') {
    //     // Create SignalR hub connection
    //   }
    // }
  }

  /**
   * Get a container by entity name.
   */
  public getContainer(entityName: string): ICosmosContainer | undefined {
    return this.containerMap.get(entityName);
  }

  /**
   * Get a topic by entity name.
   */
  public getTopic(entityName: string): IServiceBusTopic | undefined {
    return this.topicMap.get(entityName);
  }

  /**
   * Get all resolvers.
   */
  public getResolvers(): IGraphQLResolver[] {
    return this.resolverList;
  }

  /**
   * Get resolvers for a specific entity.
   */
  public getResolversForEntity(entityName: string): IGraphQLResolver[] {
    return this.resolverList.filter((r) => r.entityName === entityName);
  }

  /**
   * Get the synthesis manifest.
   */
  public getManifest(): DataStackManifest {
    return this.manifest;
  }
}
