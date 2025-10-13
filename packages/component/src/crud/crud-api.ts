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

/**
 * CRUD API Component
 *
 * @example
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
 */
export class CrudApi extends Construct {
  /**
   * Cosmos DB account
   */
  public readonly database: DatabaseAccounts;

  /**
   * Functions App (hosting for Azure Functions)
   */
  public readonly functionsApp: FunctionsApp;

  /**
   * Log Analytics Workspace (if monitoring is enabled)
   */
  public readonly logAnalyticsWorkspace?: ILogAnalyticsWorkspace;

  /**
   * Application Insights instance (if monitoring is enabled)
   */
  public readonly applicationInsights?: IApplicationInsights;

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
  public readonly operations: ReadonlyArray<CrudOperation>;

  /**
   * Generated function code for deployment
   */
  public readonly generatedFunctions: GeneratedFunctionApp;

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

  constructor(scope: Construct, id: string, props: CrudApiProps) {
    super(scope, id);

    this.entityName = props.entityName;
    this.entityNamePlural = props.entityNamePlural ?? `${props.entityName}s`;
    this.partitionKey = props.partitionKey ?? '/id';

    // Generate resource names
    const entityKebab = this.toKebabCase(this.entityName);
    const entityPluralKebab = this.toKebabCase(this.entityNamePlural);

    this.databaseName = props.databaseName ?? `${entityKebab}-db`;
    this.containerName = props.containerName ?? entityPluralKebab;

    // Create or use existing Cosmos DB account
    this.database = props.cosmosAccount ?? new DatabaseAccounts(this, 'DatabaseAccount', {
      location: props.location,
      enableServerless: true,
      publicNetworkAccess: PublicNetworkAccess.DISABLED,
      tags: props.tags,
    });

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
}
