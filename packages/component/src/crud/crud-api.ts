/**
 * CRUD API Component
 *
 * @remarks
 * High-level component that creates a complete CRUD API infrastructure including:
 * - Cosmos DB database and container
 * - Azure Functions for each CRUD operation
 * - RBAC permissions and managed identities
 * - Optional API Management integration
 * - Optional Application Insights monitoring
 *
 * @packageDocumentation
 */

import { Construct } from '@atakora/cdk';
import { DatabaseAccounts, PublicNetworkAccess } from '@atakora/cdk/documentdb';
import type { CrudApiProps, CrudOperation } from './types';
import { FunctionsApp } from '../functions';
import { FunctionRuntime } from '../functions';
import { generateCrudFunctions, type GeneratedFunctionApp } from './function-generator';
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
 * CRUD API Component
 *
 * @example
 * Traditional usage (backward compatible):
 * ```typescript
 * import { CrudApi } from '@atakora/component/crud';
 * import { ResourceGroupStack } from '@atakora/cdk';
 *
 * const stack = new ResourceGroupStack(app, 'MyStack', {
 *   resourceGroupName: 'rg-myapp-prod',
 *   location: 'eastus'
 * });
 *
 * const userApi = new CrudApi(stack, 'UserApi', {
 *   entityName: 'User',
 *   schema: {
 *     id: 'string',
 *     name: { type: 'string', required: true },
 *     email: { type: 'string', format: 'email', required: true },
 *     role: { type: 'string', validation: { enum: ['admin', 'user'] } },
 *     createdAt: 'timestamp'
 *   },
 *   partitionKey: '/id'
 * });
 *
 * // Access generated resources
 * console.log(userApi.database.resourceId);
 * console.log(userApi.apiEndpoint);
 * console.log(userApi.operations);
 * ```
 *
 * @example
 * Backend pattern usage (with shared resources):
 * ```typescript
 * import { CrudApi } from '@atakora/component/crud';
 * import { defineBackend } from '@atakora/component/backend';
 *
 * const backend = defineBackend({
 *   userApi: CrudApi.define('UserApi', {
 *     entityName: 'User',
 *     schema: { ... },
 *     partitionKey: '/id'
 *   })
 * });
 * ```
 */
export class CrudApi extends Construct implements IBackendComponent<CrudApiProps> {
  /**
   * Cosmos DB account
   */
  public database: DatabaseAccounts;

  /**
   * Functions App (hosting for Azure Functions)
   */
  public functionsApp!: FunctionsApp;

  /**
   * Log Analytics Workspace (if monitoring is enabled)
   */
  public logAnalyticsWorkspace?: ILogAnalyticsWorkspace;

  /**
   * Application Insights instance (if monitoring is enabled)
   */
  public applicationInsights?: IApplicationInsights;

  /**
   * Database name
   */
  public readonly databaseName: string;

  /**
   * Container name
   */
  public readonly containerName: string;

  /**
   * Entity name (singular)
   */
  public readonly entityName: string;

  /**
   * Entity name (plural)
   */
  public readonly entityNamePlural: string;

  /**
   * Generated CRUD operations
   */
  public operations!: ReadonlyArray<CrudOperation>;

  /**
   * Generated function code for deployment
   */
  public generatedFunctions!: GeneratedFunctionApp;

  /**
   * Partition key path
   */
  public readonly partitionKey: string;

  /**
   * API endpoint (once API Management is implemented)
   */
  public get apiEndpoint(): string {
    // TODO: Return APIM endpoint once implemented
    return `https://api.example.com/${this.containerName}`;
  }

  // IBackendComponent implementation
  public readonly componentId: string;
  public readonly componentType = 'CrudApi';
  public readonly config: CrudApiProps;

  private sharedResources?: ResourceMap;
  private backendManaged: boolean = false;

  constructor(scope: Construct, id: string, props: CrudApiProps) {
    super(scope, id);

    // Store component metadata
    this.componentId = id;
    this.config = props;

    // Check if backend-managed
    this.backendManaged = isBackendManaged(scope);

    this.entityName = props.entityName;
    this.entityNamePlural = props.entityNamePlural ?? `${props.entityName}s`;
    this.partitionKey = props.partitionKey ?? '/id';

    // Generate resource names
    const entityKebab = this.toKebabCase(this.entityName);
    const entityPluralKebab = this.toKebabCase(this.entityNamePlural);

    this.databaseName = props.databaseName ?? `${entityKebab}-db`;
    this.containerName = props.containerName ?? entityPluralKebab;

    // Backend-managed mode: Resources will be injected later via initialize()
    // Traditional mode: Create resources now
    if (!this.backendManaged) {
      // Create or use existing Cosmos DB account
      this.database = props.cosmosAccount ?? new DatabaseAccounts(this, 'DatabaseAccount', {
        location: props.location,
        enableServerless: true,
        publicNetworkAccess: PublicNetworkAccess.DISABLED,
        tags: props.tags,
      });
    } else {
      // Placeholder - will be replaced in initialize()
      this.database = null as any;
    }

    // Only create these resources in traditional (non-backend) mode
    if (!this.backendManaged) {
      this.initializeTraditionalMode(props, entityKebab, entityPluralKebab);
    }
  }

  /**
   * Initialize component in traditional mode (creates own resources)
   * @internal
   */
  private initializeTraditionalMode(
    props: CrudApiProps,
    entityKebab: string,
    entityPluralKebab: string
  ): void {
    // Configure observability (monitoring is enabled by default)
    const enableMonitoring = props.enableMonitoring !== false;

    if (enableMonitoring) {
      // Create or use existing Log Analytics Workspace
      this.logAnalyticsWorkspace = props.logAnalyticsWorkspace ?? new ArmWorkspaces(this, 'LogAnalytics', {
        workspaceName: `log-${entityKebab}-${props.location || 'eus'}`,
        location: props.location || 'eastus',
        sku: { name: WorkspaceSku.PER_GB_2018 },
        retentionInDays: props.logRetentionInDays ?? 90,
        publicNetworkAccessForIngestion: WorkspacePublicNetworkAccess.DISABLED,
        publicNetworkAccessForQuery: WorkspacePublicNetworkAccess.DISABLED,
        tags: props.tags,
      });

      // Create or use existing Application Insights
      this.applicationInsights = props.applicationInsights ?? new ArmComponents(this, 'AppInsights', {
        name: `appi-${entityKebab}-${props.location || 'eus'}`,
        location: props.location || 'eastus',
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
          name: `${entityKebab}-cosmos-diagnostics`,
          targetResourceId: this.database.accountId,
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

    // Create or use existing Functions App
    this.functionsApp = props.functionsApp ?? new FunctionsApp(this, 'Functions', {
      runtime: FunctionRuntime.NODE,
      runtimeVersion: '20',
      location: props.location,
      tags: props.tags,
    });

    // Generate function code from templates
    this.generatedFunctions = generateCrudFunctions({
      entityName: this.entityName,
      entityNamePlural: this.entityNamePlural,
      databaseName: this.databaseName,
      containerName: this.containerName,
      schema: props.schema,
      partitionKey: this.partitionKey,
      applicationInsightsConnectionString: this.applicationInsights?.connectionString,
    });

    // Add Cosmos DB environment variables to functions app
    const envVars: Record<string, string> = {
      COSMOS_ENDPOINT: this.database.documentEndpoint,
      ...this.generatedFunctions.environmentVariables,
    };

    // Add Application Insights environment variables if monitoring is enabled
    if (this.applicationInsights) {
      envVars.APPLICATIONINSIGHTS_CONNECTION_STRING = this.applicationInsights.connectionString;
      envVars.ApplicationInsightsAgent_EXTENSION_VERSION = '~3';
    }

    this.functionsApp.addEnvironmentVariables(envVars);

    // Create Cosmos DB database and container
    const { CosmosDBDatabase, CosmosDBContainer } = require('@atakora/cdk/documentdb');

    const cosmosDatabase = new CosmosDBDatabase(this, 'Database', {
      account: this.database,
      databaseName: this.databaseName,
    });

    const cosmosContainer = new CosmosDBContainer(this, 'Container', {
      database: cosmosDatabase,
      containerName: this.containerName,
      partitionKeyPath: this.partitionKey,
    });

    // Grant function app write access to Cosmos DB container
    // This allows all CRUD operations (create, read, update, delete, list)
    cosmosContainer.grantWriteData(this.functionsApp.functionApp);

    // Define CRUD operations metadata
    // Note: The actual functions will be deployed to functionsApp.functionApp
    // TODO: Create individual Azure Function definitions for each operation
    const operations: CrudOperation[] = [
      {
        operation: 'create',
        functionApp: this.functionsApp.functionApp,
        functionName: `create-${entityKebab}`,
        httpMethod: 'POST',
        pathPattern: `/${entityPluralKebab}`,
      },
      {
        operation: 'read',
        functionApp: this.functionsApp.functionApp,
        functionName: `read-${entityKebab}`,
        httpMethod: 'GET',
        pathPattern: `/${entityPluralKebab}/{id}`,
      },
      {
        operation: 'update',
        functionApp: this.functionsApp.functionApp,
        functionName: `update-${entityKebab}`,
        httpMethod: 'PUT',
        pathPattern: `/${entityPluralKebab}/{id}`,
      },
      {
        operation: 'delete',
        functionApp: this.functionsApp.functionApp,
        functionName: `delete-${entityKebab}`,
        httpMethod: 'DELETE',
        pathPattern: `/${entityPluralKebab}/{id}`,
      },
      {
        operation: 'list',
        functionApp: this.functionsApp.functionApp,
        functionName: `list-${entityPluralKebab}`,
        httpMethod: 'GET',
        pathPattern: `/${entityPluralKebab}`,
      },
    ];

    this.operations = operations;

    // TODO: Grant Cosmos DB RBAC permissions to function apps
    // Each function needs appropriate permissions (read/write)
    // createFunction: write permission
    // readFunction: read permission
    // updateFunction: write permission
    // deleteFunction: write permission
    // listFunction: read permission

    // TODO: Configure API Management (if enabled)
    // if (props.enableApiManagement) {
    //   const apim = new ApiManagementService(this, 'APIM', {
    //     location: props.location,
    //     identity: { type: ManagedServiceIdentityType.SYSTEM_ASSIGNED },
    //     tags: props.tags
    //   });
    //
    //   // Grant APIM permission to invoke functions
    //   operations.forEach(op => op.functionApp.grantInvoke(apim));
    //
    //   // Configure REST API operations
    //   // ... REST API configuration
    // }
  }

  /**
   * Convert string to kebab-case
   */
  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  // ============================================================================
  // Backend Pattern Support
  // ============================================================================

  /**
   * Define a CRUD API component for use with defineBackend().
   * Returns a component definition that declares resource requirements.
   *
   * @param id - Component identifier
   * @param config - Component configuration
   * @returns Component definition
   *
   * @example
   * ```typescript
   * import { defineBackend } from '@atakora/component/backend';
   * import { CrudApi } from '@atakora/component/crud';
   *
   * const backend = defineBackend({
   *   userApi: CrudApi.define('UserApi', {
   *     entityName: 'User',
   *     schema: {
   *       id: 'string',
   *       name: { type: 'string', required: true },
   *       email: { type: 'string', required: true }
   *     },
   *     partitionKey: '/id'
   *   })
   * });
   * ```
   */
  public static define(id: string, config: CrudApiProps): IComponentDefinition<CrudApiProps> {
    const entityKebab = CrudApi.toKebabCaseStatic(config.entityName);
    const databaseName = config.databaseName ?? `${entityKebab}-db`;
    const containerName = config.containerName ?? CrudApi.toKebabCaseStatic(
      config.entityNamePlural ?? `${config.entityName}s`
    );
    const partitionKey = config.partitionKey ?? '/id';

    return {
      componentId: id,
      componentType: 'CrudApi',
      config,
      factory: (scope: Construct, componentId: string, componentConfig: CrudApiProps, resources: ResourceMap) => {
        // Just create the instance - backend will call initialize() later
        const instance = new CrudApi(scope, componentId, componentConfig);
        return instance;
      },
    };
  }

  /**
   * Static version of toKebabCase for use in static methods
   * @internal
   */
  private static toKebabCaseStatic(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  /**
   * Get resource requirements for this component.
   * Declares what Azure resources this component needs.
   *
   * @returns Array of resource requirements
   */
  public getRequirements(): ReadonlyArray<IResourceRequirement> {
    const entityKebab = this.toKebabCase(this.entityName);
    const requirements: IResourceRequirement[] = [];

    // Cosmos DB requirement
    requirements.push({
      resourceType: 'cosmos',
      requirementKey: `${this.componentId}-cosmos`,
      priority: 20,
      config: {
        enableServerless: true,
        consistency: 'Session',
        publicNetworkAccess: 'Disabled',
        location: this.config.location,
        databases: [
          {
            name: this.databaseName,
            containers: [
              {
                name: this.containerName,
                partitionKey: this.partitionKey,
                indexingPolicy: {
                  automatic: true,
                  indexingMode: 'Consistent',
                },
              },
            ],
          },
        ],
      },
      metadata: {
        source: this.componentId,
        version: '1.0.0',
        description: `Cosmos DB for ${this.entityName} CRUD API`,
      },
    });

    // Storage requirement for Functions runtime
    // IMPORTANT: This must come before functions requirement so it's provisioned first
    requirements.push({
      resourceType: 'storage',
      requirementKey: `${this.componentId}-storage`,
      priority: 20,
      config: {
        sku: 'Standard_LRS',
        kind: 'StorageV2',
        accessTier: 'Hot',
        enableHttpsOnly: true,
        location: this.config.location,
      },
      metadata: {
        source: this.componentId,
        version: '1.0.0',
        description: `Storage for ${this.entityName} Functions runtime`,
      },
    });

    // Functions App requirement
    // Depends on storage being provisioned first
    requirements.push({
      resourceType: 'functions',
      requirementKey: `${this.componentId}-functions`,
      priority: 20,
      config: {
        runtime: 'node',
        version: '20',
        sku: 'Y1',
        location: this.config.location,
        environmentVariables: {
          COSMOS_ENDPOINT: '${cosmos.documentEndpoint}',
          DATABASE_NAME: this.databaseName,
          CONTAINER_NAME: this.containerName,
          // Additional env vars will be added during initialize()
        },
      },
      metadata: {
        source: this.componentId,
        version: '1.0.0',
        description: `Functions App for ${this.entityName} CRUD operations`,
      },
    });

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
    const functionsKey = `functions:${this.componentId}-functions`;

    this.database = resources.get(cosmosKey) as DatabaseAccounts;
    this.functionsApp = resources.get(functionsKey) as FunctionsApp;

    if (!this.database) {
      throw new Error(`Required Cosmos DB resource not found: ${cosmosKey}`);
    }

    if (!this.functionsApp) {
      throw new Error(`Required Functions App resource not found: ${functionsKey}`);
    }

    // Generate function code
    (this as any).generatedFunctions = generateCrudFunctions({
      entityName: this.entityName,
      entityNamePlural: this.entityNamePlural,
      databaseName: this.databaseName,
      containerName: this.containerName,
      schema: this.config.schema,
      partitionKey: this.partitionKey,
      applicationInsightsConnectionString: this.applicationInsights?.connectionString,
    });

    // Configure functions app with environment variables
    const envVars: Record<string, string> = {
      COSMOS_ENDPOINT: this.database.documentEndpoint,
      DATABASE_NAME: this.databaseName,
      CONTAINER_NAME: this.containerName,
      ...this.generatedFunctions.environmentVariables,
    };

    this.functionsApp.addEnvironmentVariables(envVars);

    // Define operations metadata
    const entityKebab = this.toKebabCase(this.entityName);
    const entityPluralKebab = this.toKebabCase(this.entityNamePlural);

    const operations: CrudOperation[] = [
      {
        operation: 'create',
        functionApp: this.functionsApp.functionApp,
        functionName: `create-${entityKebab}`,
        httpMethod: 'POST',
        pathPattern: `/${entityPluralKebab}`,
      },
      {
        operation: 'read',
        functionApp: this.functionsApp.functionApp,
        functionName: `read-${entityKebab}`,
        httpMethod: 'GET',
        pathPattern: `/${entityPluralKebab}/{id}`,
      },
      {
        operation: 'update',
        functionApp: this.functionsApp.functionApp,
        functionName: `update-${entityKebab}`,
        httpMethod: 'PUT',
        pathPattern: `/${entityPluralKebab}/{id}`,
      },
      {
        operation: 'delete',
        functionApp: this.functionsApp.functionApp,
        functionName: `delete-${entityKebab}`,
        httpMethod: 'DELETE',
        pathPattern: `/${entityPluralKebab}/{id}`,
      },
      {
        operation: 'list',
        functionApp: this.functionsApp.functionApp,
        functionName: `list-${entityPluralKebab}`,
        httpMethod: 'GET',
        pathPattern: `/${entityPluralKebab}`,
      },
    ];

    (this as any).operations = operations;
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

    // Validate Functions App resource
    const functionsKey = `functions:${this.componentId}-functions`;
    if (!resources.has(functionsKey)) {
      errors.push(`Missing required Functions App resource: ${functionsKey}`);
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
      apiEndpoint: this.apiEndpoint,
      databaseName: this.databaseName,
      containerName: this.containerName,
      operations: this.operations.map((op) => ({
        operation: op.operation,
        functionName: op.functionName,
        httpMethod: op.httpMethod,
        pathPattern: op.pathPattern,
      })),
    };
  }
}
