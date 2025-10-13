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
import {
  type IBackendComponent,
  type IComponentDefinition,
  type IResourceRequirement,
  type ResourceMap,
  type ValidationResult,
  type ComponentOutputs,
  isBackendManaged,
} from '../backend';

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
export class DataStack extends Construct implements IDataStack, IBackendComponent<DataStackProps> {
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

  // IBackendComponent implementation
  public readonly componentId: string;
  public readonly componentType = 'DataStack';
  public readonly config: DataStackProps;

  private sharedResources?: ResourceMap;
  private backendManaged: boolean = false;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id);

    // Store component metadata
    this.componentId = id;
    this.config = props;

    // Check if backend-managed
    this.backendManaged = isBackendManaged(scope);

    this.databaseName = props.databaseName || 'MainDB';

    // Backend-managed mode: Resources will be injected later via initialize()
    // Traditional mode: Create resources now
    if (!this.backendManaged) {
      // Store references
      this.cosmosAccount = props.cosmosAccount;
      this.serviceBusNamespace = props.serviceBusNamespace;
      this.signalRService = props.signalRService;
      this.functionApp = props.functionApp;

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
    } else {
      // Placeholder - will be replaced in initialize()
      this.cosmosAccount = null as any;
      this.manifest = null as any;
    }
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

  // ============================================================================
  // Backend Pattern Support
  // ============================================================================

  /**
   * Define a Data Stack component for use with defineBackend().
   * Returns a component definition that declares resource requirements.
   *
   * @param id - Component identifier
   * @param config - Component configuration
   * @returns Component definition
   *
   * @example
   * ```typescript
   * import { defineBackend } from '@atakora/component/backend';
   * import { DataStack } from '@atakora/component/data';
   *
   * const backend = defineBackend({
   *   dataStack: DataStack.define('DataStack', {
   *     schemas: [UserSchema, PostSchema],
   *     enableEvents: true,
   *     enableGraphQL: true,
   *     enableRealtime: true
   *   })
   * });
   * ```
   */
  public static define(id: string, config: DataStackProps): IComponentDefinition<DataStackProps> {
    return {
      componentId: id,
      componentType: 'DataStack',
      config,
      factory: (scope: Construct, componentId: string, componentConfig: DataStackProps, resources: ResourceMap) => {
        const instance = new DataStack(scope, componentId, componentConfig);
        instance.initialize(resources, scope);
        return instance;
      },
    };
  }

  /**
   * Get resource requirements for this component.
   * Declares what Azure resources this component needs.
   *
   * @returns Array of resource requirements
   */
  public getRequirements(): ReadonlyArray<IResourceRequirement> {
    const requirements: IResourceRequirement[] = [];

    // Cosmos DB requirement for data storage
    requirements.push({
      resourceType: 'cosmos',
      requirementKey: `${this.componentId}-cosmos`,
      priority: 20,
      config: {
        enableServerless: true,
        consistency: 'Session',
        publicNetworkAccess: 'Disabled',
        databases: this.config.schemas?.map(schema => ({
          name: this.databaseName,
          containers: [{
            name: schema.name || `${this.componentId}-container`,
            partitionKey: schema.partitionKey || '/id',
          }]
        })) || [{
          name: this.databaseName,
          containers: [],
        }],
      },
      metadata: {
        source: this.componentId,
        version: '1.0.0',
        description: `Cosmos DB for ${this.componentId} data stack`,
      },
    });

    // Functions requirement for GraphQL resolvers
    if (this.config.enableGraphQL !== false) {
      requirements.push({
        resourceType: 'functions',
        requirementKey: `${this.componentId}-functions`,
        priority: 20,
        config: {
          runtime: 'node',
          version: '20',
          sku: 'Y1',
          environmentVariables: {
            COSMOS_ENDPOINT: '${cosmos.documentEndpoint}',
            DATABASE_NAME: this.databaseName,
          },
        },
        metadata: {
          source: this.componentId,
          version: '1.0.0',
          description: `Functions for ${this.componentId} GraphQL resolvers`,
        },
      });
    }

    // Service Bus requirement for event-driven architecture
    if (this.config.enableEvents !== false) {
      requirements.push({
        resourceType: 'servicebus',
        requirementKey: `${this.componentId}-servicebus`,
        priority: 20,
        config: {
          sku: 'Standard',
          topics: this.config.schemas?.map(s => s.name || 'default') || [],
        },
        metadata: {
          source: this.componentId,
          version: '1.0.0',
          description: `Service Bus for ${this.componentId} events`,
        },
      });
    }

    return requirements;
  }

  /**
   * Initialize component with shared resources from the backend.
   * Called by the backend after resources are provisioned.
   *
   * @param resources - Map of provisioned resources
   * @param scope - CDK construct scope
   */
  public initialize(resources: ResourceMap, scope: Construct): void {
    if (!this.backendManaged) {
      // Already initialized in traditional mode
      return;
    }

    this.sharedResources = resources;

    // Extract shared resources
    const cosmosKey = `cosmos:${this.componentId}-cosmos`;
    (this as any).cosmosAccount = resources.get(cosmosKey) as IDatabaseAccount;

    if (!this.cosmosAccount) {
      throw new Error(`Required Cosmos DB resource not found: ${cosmosKey}`);
    }

    // Optional: Extract Functions App if GraphQL is enabled
    if (this.config.enableGraphQL !== false) {
      const functionsKey = `functions:${this.componentId}-functions`;
      (this as any).functionApp = resources.get(functionsKey) as IFunctionApp;

      if (!this.functionApp) {
        throw new Error(`Required Functions App resource not found: ${functionsKey}`);
      }
    }

    // Optional: Extract Service Bus if events are enabled
    if (this.config.enableEvents !== false) {
      const serviceBusKey = `servicebus:${this.componentId}-servicebus`;
      (this as any).serviceBusNamespace = resources.get(serviceBusKey) as IServiceBusNamespace;
    }

    // Synthesize infrastructure
    const synthesizer = new DataStackSynthesizer();
    (this as any).manifest = synthesizer.synthesize(this.config.schemas, {
      outdir: './cdk.out',
      databaseName: this.databaseName,
      enableEvents: this.config.enableEvents ?? true,
      enableGraphQL: this.config.enableGraphQL ?? true,
      ...this.config.synthesisOptions,
    });

    // Create infrastructure resources with injected resources
    this.createCosmosInfrastructure(this.config);
    this.createServiceBusInfrastructure(this.config);
    this.createGraphQLInfrastructure(this.config);
    this.createRealtimeInfrastructure(this.config);
  }

  /**
   * Validate that provided resources meet this component's requirements.
   *
   * @param resources - Map of resources to validate
   * @returns Validation result
   */
  public validateResources(resources: ResourceMap): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate Cosmos DB resource
    const cosmosKey = `cosmos:${this.componentId}-cosmos`;
    if (!resources.has(cosmosKey)) {
      errors.push(`Missing required Cosmos DB resource: ${cosmosKey}`);
    }

    // Validate Functions App resource if GraphQL is enabled
    if (this.config.enableGraphQL !== false) {
      const functionsKey = `functions:${this.componentId}-functions`;
      if (!resources.has(functionsKey)) {
        errors.push(`Missing required Functions App resource: ${functionsKey}`);
      }
    }

    // Validate Service Bus resource if events are enabled
    if (this.config.enableEvents !== false) {
      const serviceBusKey = `servicebus:${this.componentId}-servicebus`;
      if (!resources.has(serviceBusKey)) {
        warnings.push(`Missing optional Service Bus resource: ${serviceBusKey}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Get component outputs for cross-component references.
   *
   * @returns Component outputs
   */
  public getOutputs(): ComponentOutputs {
    return {
      componentId: this.componentId,
      componentType: this.componentType,
      databaseName: this.databaseName,
      containers: Array.from(this.containerMap.keys()),
      topics: Array.from(this.topicMap.keys()),
      resolvers: this.resolverList.map(r => ({
        resolverName: r.resolverName,
        entityName: r.entityName,
        operation: r.operation,
      })),
    };
  }
}
