/**
 * Resource Mapper
 *
 * Maps backend models to Azure ARM resources.
 *
 * @module @atakora/component/synthesis/resource-mapper
 */

import type { BackendObject } from '../backend/types';
import type {
  SynthesisContext,
  BackendAnalysis,
  ARMResource,
  CosmosDBConfig,
  FunctionAppConfig,
  StorageAccountConfig,
  AppInsightsConfig,
  VNetConfig,
} from './types';
import { ResourceNameGenerator } from '@atakora/lib';

/**
 * Resource Mapper
 *
 * Responsible for mapping backend components to ARM resources:
 * - CRUD models → Cosmos DB containers
 * - Event models → Service Bus queues
 * - Function models → Azure Functions
 * - Authentication → Key Vault + managed identities
 * - Storage → Storage Accounts
 * - Monitoring → Application Insights
 */
export class ResourceMapper {
  private readonly nameGenerator: ResourceNameGenerator;

  constructor() {
    this.nameGenerator = new ResourceNameGenerator();
  }
  /**
   * Synthesize storage resources
   *
   * @param backend - Backend object
   * @param context - Synthesis context
   * @param analysis - Backend analysis
   * @returns ARM resources for storage
   */
  async synthesizeStorage(
    backend: BackendObject,
    context: SynthesisContext,
    analysis: BackendAnalysis
  ): Promise<ARMResource[]> {
    const resources: ARMResource[] = [];

    // 1. Synthesize Cosmos DB if there are CRUD models
    if (analysis.models.crud.length > 0) {
      resources.push(...(await this.synthesizeCosmosDB(backend, context, analysis)));
    }

    // 2. Synthesize Storage Account for system needs
    resources.push(...(await this.synthesizeStorageAccount(backend, context)));

    // 3. Synthesize Key Vault for secrets
    if (backend.authentication || backend.settings.secrets) {
      resources.push(...(await this.synthesizeKeyVault(backend, context)));
    }

    return resources;
  }

  /**
   * Synthesize Cosmos DB resources
   *
   * @param backend - Backend object
   * @param context - Synthesis context
   * @param analysis - Backend analysis
   * @returns ARM resources for Cosmos DB
   */
  private async synthesizeCosmosDB(
    backend: BackendObject,
    context: SynthesisContext,
    analysis: BackendAnalysis
  ): Promise<ARMResource[]> {
    const resources: ARMResource[] = [];

    // Get effective configuration (default + attachment)
    const config = this.getCosmosDBConfig(backend, context);

    // Generate resource names
    const accountName = config.accountName || this.generateCosmosAccountName(context);
    const databaseName = config.databaseName || context.naming.project;

    // 1. Cosmos DB Account
    resources.push({
      type: 'Microsoft.DocumentDB/databaseAccounts',
      apiVersion: '2023-04-15',
      name: accountName,
      location: context.region,
      tags: context.tags,
      kind: 'GlobalDocumentDB',
      properties: {
        databaseAccountOfferType: 'Standard',
        consistencyPolicy: {
          defaultConsistencyLevel: config.consistencyLevel || 'Session',
        },
        locations: [
          {
            locationName: context.region,
            failoverPriority: 0,
            isZoneRedundant: context.environment === 'production',
          },
        ],
        enableAutomaticFailover: context.environment === 'production',
        enableMultipleWriteLocations: false,
        capabilities: config.enableAutoscale
          ? [{ name: 'EnableServerless' }]
          : [],
      },
    });

    // 2. Cosmos DB Database
    resources.push({
      type: 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases',
      apiVersion: '2023-04-15',
      name: `${accountName}/${databaseName}`,
      properties: {
        resource: {
          id: databaseName,
        },
        options: config.enableAutoscale
          ? {
              autoscaleSettings: {
                maxThroughput: config.maxThroughput || 4000,
              },
            }
          : {
              throughput: config.throughput || this.getDefaultThroughput(context),
            },
      },
      dependsOn: [
        `[resourceId('Microsoft.DocumentDB/databaseAccounts', '${accountName}')]`,
      ],
    });

    // 3. Cosmos DB Containers (one per CRUD model)
    for (const model of analysis.models.crud) {
      resources.push(
        ...(await this.synthesizeCosmosContainer(
          model,
          accountName,
          databaseName,
          context
        ))
      );
    }

    return resources;
  }

  /**
   * Synthesize Cosmos DB container for a CRUD model
   *
   * @param model - CRUD model
   * @param accountName - Cosmos DB account name
   * @param databaseName - Cosmos DB database name
   * @param context - Synthesis context
   * @returns ARM resources for container
   */
  private async synthesizeCosmosContainer(
    model: any,
    accountName: string,
    databaseName: string,
    context: SynthesisContext
  ): Promise<ARMResource[]> {
    const containerName = this.generateContainerName(model.name);
    const partitionKey = this.determinePartitionKey(model);

    return [
      {
        type: 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers',
        apiVersion: '2023-04-15',
        name: `${accountName}/${databaseName}/${containerName}`,
        properties: {
          resource: {
            id: containerName,
            partitionKey: {
              paths: [`/${partitionKey}`],
              kind: 'Hash',
            },
            indexingPolicy: this.generateIndexingPolicy(model),
          },
          options: {},
        },
        dependsOn: [
          `[resourceId('Microsoft.DocumentDB/databaseAccounts/sqlDatabases', '${accountName}', '${databaseName}')]`,
        ],
      },
    ];
  }

  /**
   * Synthesize Storage Account
   *
   * @param backend - Backend object
   * @param context - Synthesis context
   * @returns ARM resources for storage account
   */
  private async synthesizeStorageAccount(
    backend: BackendObject,
    context: SynthesisContext
  ): Promise<ARMResource[]> {
    const config = this.getStorageAccountConfig(backend, context);
    const accountName = config.name || this.generateStorageAccountName(context);

    return [
      {
        type: 'Microsoft.Storage/storageAccounts',
        apiVersion: '2023-01-01',
        name: accountName,
        location: context.region,
        tags: context.tags,
        sku: {
          name: config.sku || 'Standard_LRS',
        },
        kind: config.kind || 'StorageV2',
        properties: {
          accessTier: config.accessTier || 'Hot',
          supportsHttpsTrafficOnly: config.enableHttpsOnly !== false,
          allowBlobPublicAccess: config.enableBlobPublicAccess === true,
          minimumTlsVersion: 'TLS1_2',
        },
      },
    ];
  }

  /**
   * Synthesize Key Vault
   *
   * @param backend - Backend object
   * @param context - Synthesis context
   * @returns ARM resources for Key Vault
   */
  private async synthesizeKeyVault(
    backend: BackendObject,
    context: SynthesisContext
  ): Promise<ARMResource[]> {
    const vaultName = this.generateKeyVaultName(context);

    return [
      {
        type: 'Microsoft.KeyVault/vaults',
        apiVersion: '2023-02-01',
        name: vaultName,
        location: context.region,
        tags: context.tags,
        properties: {
          sku: {
            family: 'A',
            name: 'standard',
          },
          tenantId: '[subscription().tenantId]',
          enabledForDeployment: false,
          enabledForDiskEncryption: false,
          enabledForTemplateDeployment: true,
          enableSoftDelete: true,
          softDeleteRetentionInDays: context.environment === 'production' ? 90 : 7,
          enablePurgeProtection: context.environment === 'production',
          accessPolicies: [],
        },
      },
    ];
  }

  /**
   * Synthesize compute resources
   *
   * @param backend - Backend object
   * @param context - Synthesis context
   * @param analysis - Backend analysis
   * @returns ARM resources for compute
   */
  async synthesizeCompute(
    backend: BackendObject,
    context: SynthesisContext,
    analysis: BackendAnalysis
  ): Promise<ARMResource[]> {
    const resources: ARMResource[] = [];

    // Synthesize Function App if there are any models
    const hasModels =
      analysis.models.crud.length > 0 ||
      analysis.models.event.length > 0 ||
      analysis.models.function.length > 0;

    if (hasModels) {
      resources.push(...(await this.synthesizeFunctionApp(backend, context, analysis)));
    }

    return resources;
  }

  /**
   * Synthesize Function App
   *
   * @param backend - Backend object
   * @param context - Synthesis context
   * @param analysis - Backend analysis
   * @returns ARM resources for Function App
   */
  private async synthesizeFunctionApp(
    backend: BackendObject,
    context: SynthesisContext,
    analysis: BackendAnalysis
  ): Promise<ARMResource[]> {
    const resources: ARMResource[] = [];
    const config = this.getFunctionAppConfig(backend, context);

    const appServicePlanName = this.generateAppServicePlanName(context);
    const functionAppName = config.name || this.generateFunctionAppName(context);
    const storageAccountName = this.generateStorageAccountName(context);

    // 1. App Service Plan
    resources.push({
      type: 'Microsoft.Web/serverfarms',
      apiVersion: '2022-09-01',
      name: appServicePlanName,
      location: context.region,
      tags: context.tags,
      sku: {
        name: config.sku || (context.environment === 'production' ? 'EP1' : 'Y1'),
        tier: config.sku === 'Y1' ? 'Dynamic' : 'ElasticPremium',
      },
      properties: {
        reserved: true, // Linux
      },
    });

    // 2. Function App
    resources.push({
      type: 'Microsoft.Web/sites',
      apiVersion: '2022-09-01',
      name: functionAppName,
      location: context.region,
      tags: context.tags,
      kind: 'functionapp,linux',
      properties: {
        serverFarmId: `[resourceId('Microsoft.Web/serverfarms', '${appServicePlanName}')]`,
        siteConfig: {
          linuxFxVersion: `NODE|${config.runtimeVersion || '18'}`,
          appSettings: [
            {
              name: 'FUNCTIONS_WORKER_RUNTIME',
              value: config.runtime || 'node',
            },
            {
              name: 'FUNCTIONS_EXTENSION_VERSION',
              value: '~4',
            },
            {
              name: 'AzureWebJobsStorage',
              value: `[concat('DefaultEndpointsProtocol=https;AccountName=${storageAccountName};AccountKey=', listKeys(resourceId('Microsoft.Storage/storageAccounts', '${storageAccountName}'), '2023-01-01').keys[0].value)]`,
            },
            ...(config.appSettings
              ? Object.entries(config.appSettings).map(([name, value]) => ({
                  name,
                  value,
                }))
              : []),
          ],
          cors: config.cors
            ? {
                allowedOrigins: config.cors.allowedOrigins,
                supportCredentials: config.cors.supportCredentials,
              }
            : undefined,
        },
        httpsOnly: true,
      },
      identity: {
        type: 'SystemAssigned',
      },
      dependsOn: [
        `[resourceId('Microsoft.Web/serverfarms', '${appServicePlanName}')]`,
        `[resourceId('Microsoft.Storage/storageAccounts', '${storageAccountName}')]`,
      ],
    });

    return resources;
  }

  /**
   * Synthesize monitoring resources
   *
   * @param backend - Backend object
   * @param context - Synthesis context
   * @returns ARM resources for monitoring
   */
  async synthesizeMonitoring(
    backend: BackendObject,
    context: SynthesisContext
  ): Promise<ARMResource[]> {
    const resources: ARMResource[] = [];

    // Synthesize Application Insights
    resources.push(...(await this.synthesizeAppInsights(backend, context)));

    return resources;
  }

  /**
   * Synthesize Application Insights
   *
   * @param backend - Backend object
   * @param context - Synthesis context
   * @returns ARM resources for Application Insights
   */
  private async synthesizeAppInsights(
    backend: BackendObject,
    context: SynthesisContext
  ): Promise<ARMResource[]> {
    const config = this.getAppInsightsConfig(backend, context);
    const appInsightsName = config.name || this.generateAppInsightsName(context);

    return [
      {
        type: 'Microsoft.Insights/components',
        apiVersion: '2020-02-02',
        name: appInsightsName,
        location: context.region,
        tags: context.tags,
        kind: config.applicationType || 'web',
        properties: {
          Application_Type: config.applicationType || 'web',
          RetentionInDays: config.retentionInDays || (context.environment === 'production' ? 90 : 30),
          SamplingPercentage: config.samplingPercentage || 100,
          DisableIpMasking: config.disableIpMasking || false,
        },
      },
    ];
  }

  /**
   * Synthesize networking resources
   *
   * @param backend - Backend object
   * @param context - Synthesis context
   * @returns ARM resources for networking
   */
  async synthesizeNetworking(
    backend: BackendObject,
    context: SynthesisContext
  ): Promise<ARMResource[]> {
    const resources: ARMResource[] = [];

    // Synthesize VNet
    resources.push(...(await this.synthesizeVNet(backend, context)));

    return resources;
  }

  /**
   * Synthesize Virtual Network
   *
   * @param backend - Backend object
   * @param context - Synthesis context
   * @returns ARM resources for VNet
   */
  private async synthesizeVNet(
    backend: BackendObject,
    context: SynthesisContext
  ): Promise<ARMResource[]> {
    const config = this.getVNetConfig(backend, context);
    const vnetName = config.name || this.generateVNetName(context);

    return [
      {
        type: 'Microsoft.Network/virtualNetworks',
        apiVersion: '2023-04-01',
        name: vnetName,
        location: context.region,
        tags: context.tags,
        properties: {
          addressSpace: {
            addressPrefixes: [config.addressPrefix || '10.0.0.0/16'],
          },
          subnets: config.subnets || [
            {
              name: 'default',
              properties: {
                addressPrefix: '10.0.1.0/24',
              },
            },
          ],
          enableDdosProtection: config.enableDdosProtection || false,
        },
      },
    ];
  }

  /**
   * Synthesize performance resources
   *
   * @param backend - Backend object
   * @param context - Synthesis context
   * @returns ARM resources for performance
   */
  async synthesizePerformance(
    backend: BackendObject,
    context: SynthesisContext
  ): Promise<ARMResource[]> {
    // Performance resources (CDN, Cache, etc.) would be implemented here
    // For now, return empty array
    return [];
  }

  // ============================================================================
  // Configuration Helpers
  // ============================================================================

  private getCosmosDBConfig(backend: BackendObject, context: SynthesisContext): CosmosDBConfig {
    return backend.storage.database.isAttached()
      ? backend.storage.database.getConfig()
      : {};
  }

  private getFunctionAppConfig(backend: BackendObject, context: SynthesisContext): FunctionAppConfig {
    return backend.compute.functionApp.isAttached()
      ? backend.compute.functionApp.getConfig()
      : {};
  }

  private getStorageAccountConfig(backend: BackendObject, context: SynthesisContext): StorageAccountConfig {
    return backend.storage.account.isAttached()
      ? backend.storage.account.getConfig()
      : {};
  }

  private getAppInsightsConfig(backend: BackendObject, context: SynthesisContext): AppInsightsConfig {
    if (!backend.monitoring) return {};
    return backend.monitoring.appInsights.isAttached()
      ? backend.monitoring.appInsights.getConfig()
      : {};
  }

  private getVNetConfig(backend: BackendObject, context: SynthesisContext): VNetConfig {
    if (!backend.network) return {};
    return backend.network.vnet.isAttached()
      ? backend.network.vnet.getConfig()
      : {};
  }

  // ============================================================================
  // Naming Helpers (Using lib/naming ResourceNameGenerator)
  // ============================================================================

  private generateCosmosAccountName(context: SynthesisContext): string {
    return this.nameGenerator.generateName({
      resourceType: 'cosmos',
      organization: context.naming.organization,
      project: context.naming.project,
      environment: context.naming.environment,
      geography: context.naming.geography,
      instance: context.naming.instance,
    });
  }

  private generateStorageAccountName(context: SynthesisContext): string {
    return this.nameGenerator.generateName({
      resourceType: 'storage',
      organization: context.naming.organization,
      project: context.naming.project,
      environment: context.naming.environment,
      geography: context.naming.geography,
      instance: context.naming.instance,
    });
  }

  private generateKeyVaultName(context: SynthesisContext): string {
    return this.nameGenerator.generateName({
      resourceType: 'keyvault',
      organization: context.naming.organization,
      project: context.naming.project,
      environment: context.naming.environment,
      geography: context.naming.geography,
      instance: context.naming.instance,
    });
  }

  private generateAppServicePlanName(context: SynthesisContext): string {
    return this.nameGenerator.generateName({
      resourceType: 'appServicePlan',
      organization: context.naming.organization,
      project: context.naming.project,
      environment: context.naming.environment,
      geography: context.naming.geography,
      instance: context.naming.instance,
    });
  }

  private generateFunctionAppName(context: SynthesisContext): string {
    return this.nameGenerator.generateName({
      resourceType: 'appService',
      organization: context.naming.organization,
      project: context.naming.project,
      environment: context.naming.environment,
      geography: context.naming.geography,
      instance: context.naming.instance,
      purpose: 'func',
    });
  }

  private generateAppInsightsName(context: SynthesisContext): string {
    return this.nameGenerator.generateName({
      resourceType: 'applicationInsights',
      organization: context.naming.organization,
      project: context.naming.project,
      environment: context.naming.environment,
      geography: context.naming.geography,
      instance: context.naming.instance,
    });
  }

  private generateVNetName(context: SynthesisContext): string {
    return this.nameGenerator.generateName({
      resourceType: 'vnet',
      organization: context.naming.organization,
      project: context.naming.project,
      environment: context.naming.environment,
      geography: context.naming.geography,
      instance: context.naming.instance,
    });
  }

  private generateContainerName(modelName: string): string {
    // Convert to lowercase and pluralize
    return `${modelName.toLowerCase()}s`;
  }

  // ============================================================================
  // Schema Analysis Helpers
  // ============================================================================

  private determinePartitionKey(model: any): string {
    // Look for 'id' field first
    if (model.definition && model.definition.id) {
      return 'id';
    }

    // Look for fields marked as partition key
    if (model.definition) {
      for (const [fieldName, fieldDef] of Object.entries(model.definition)) {
        if ((fieldDef as any).isPartitionKey) {
          return fieldName;
        }
      }
    }

    // Default to 'id'
    return 'id';
  }

  private generateIndexingPolicy(model: any): any {
    // Generate indexing policy based on model fields
    return {
      automatic: true,
      indexingMode: 'consistent',
      includedPaths: [
        {
          path: '/*',
        },
      ],
      excludedPaths: [
        {
          path: '/"_etag"/?',
        },
      ],
    };
  }

  private getDefaultThroughput(context: SynthesisContext): number {
    switch (context.environment) {
      case 'production':
        return 4000;
      case 'staging':
        return 1000;
      case 'development':
        return 400;
      default:
        return 400;
    }
  }
}
