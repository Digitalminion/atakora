/**
 * Functions App Component
 *
 * @remarks
 * High-level component that bundles everything needed to run Azure Functions:
 * - App Service Plan (hosting plan)
 * - Storage Account (dedicated for function runtime - always created)
 * - Function App (the actual function app)
 * - Managed Identity (for secure access to resources)
 * - Application Insights (optional monitoring)
 *
 * This component makes it easy to create a function app without worrying about
 * all the individual dependencies.
 *
 * IMPORTANT: Each Functions App creates its own dedicated storage account for
 * runtime operations. This follows Azure best practices and ensures proper
 * isolation between Functions runtime and application data storage.
 *
 * @see {@link https://learn.microsoft.com/azure/azure-functions/storage-considerations}
 *
 * @packageDocumentation
 */

import { Construct } from '@atakora/cdk';
import { FunctionApp } from '@atakora/cdk/functions';
import { ServerFarms, ServerFarmSkuName, ServerFarmSkuTier } from '@atakora/cdk/web';
import { StorageAccounts, StorageAccountSkuName, StorageAccountKind, TlsVersion, NetworkAclDefaultAction, NetworkAclBypass } from '@atakora/cdk/storage';
import { FunctionRuntime as CdkFunctionRuntime } from '@atakora/cdk/functions';
import { ManagedServiceIdentityType } from '@atakora/cdk/functions';
import type { FunctionsAppProps, FunctionRuntime } from './types';
import { FunctionAppPresets } from './types';
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
 * Functions App Component
 *
 * @remarks
 * Bundles App Service Plan, Storage Account, and Function App into a single component.
 * Handles all the wiring and configuration automatically.
 *
 * @example
 * Traditional usage (backward compatible):
 * ```typescript
 * import { FunctionsApp } from '@atakora/component/functions';
 * import { ResourceGroupStack } from '@atakora/cdk';
 *
 * const stack = new ResourceGroupStack(app, 'MyStack', {
 *   resourceGroupName: 'rg-myapp-prod',
 *   location: 'eastus'
 * });
 *
 * const functionsApp = new FunctionsApp(stack, 'Api', {
 *   runtime: FunctionRuntime.NODE,
 *   runtimeVersion: '20',
 *   environment: {
 *     NODE_ENV: 'production'
 *   }
 * });
 *
 * // Now define functions and attach them to functionsApp.functionApp
 * ```
 *
 * @example
 * Backend pattern usage:
 * ```typescript
 * import { defineBackend } from '@atakora/component/backend';
 * import { FunctionsApp } from '@atakora/component/functions';
 *
 * const backend = defineBackend({
 *   functions: FunctionsApp.define('ApiFunction', {
 *     runtime: 'node',
 *     runtimeVersion: '20'
 *   })
 * });
 * ```
 */
export class FunctionsApp extends Construct implements IBackendComponent<FunctionsAppProps> {
  /**
   * App Service Plan (hosting plan)
   */
  public readonly plan: ServerFarms;

  /**
   * Storage Account (dedicated for function runtime operations)
   *
   * @remarks
   * This storage account is automatically created and dedicated to this Functions App.
   * It is used for:
   * - Function app content and deployment packages (blob storage)
   * - Trigger coordination and scale controller operations (queue storage)
   * - Function execution history, locks, and leases (table storage)
   *
   * Per Azure best practices, this storage is isolated from application data storage.
   */
  public readonly storage: StorageAccounts;

  /**
   * Function App (the actual function app where functions are deployed)
   */
  public readonly functionApp: FunctionApp;

  /**
   * Function App name
   */
  public readonly functionAppName: string;

  /**
   * Default hostname (e.g., myapp.azurewebsites.net)
   */
  public readonly defaultHostName: string;

  /**
   * Function App resource ID
   */
  public readonly functionAppId: string;

  /**
   * Location of the resources
   */
  public readonly location: string;

  /**
   * Global environment variables
   */
  public readonly environment: Record<string, string>;

  // IBackendComponent implementation
  public readonly componentId: string;
  public readonly componentType = 'FunctionsApp';
  public readonly config: FunctionsAppProps;

  private sharedResources?: ResourceMap;
  private backendManaged: boolean = false;

  constructor(scope: Construct, id: string, props: FunctionsAppProps = {}) {
    super(scope, id);

    // Store component metadata
    this.componentId = id;
    this.config = props;

    // Check if backend-managed
    this.backendManaged = isBackendManaged(scope);

    this.location = props.location ?? this.getLocationFromParent(scope);
    this.environment = props.environment ?? {};

    // Use existing or create new App Service Plan
    this.plan = props.existingPlan ?? this.createAppServicePlan(id, props);

    // ALWAYS create dedicated storage account for Functions runtime
    // Per ADR-001, Functions Apps must not share storage with application data
    this.storage = this.createFunctionRuntimeStorage(id, props);

    // Create Function App
    this.functionApp = this.createFunctionApp(id, props);

    // Set convenience properties
    this.functionAppName = this.functionApp.functionAppName;
    this.defaultHostName = this.functionApp.defaultHostName;
    this.functionAppId = this.functionApp.functionAppId;

    // TODO: Add Application Insights if monitoring enabled
    // if (props.enableMonitoring !== false) {
    //   const insights = new Components(this, 'Insights', {
    //     location: this.location,
    //     applicationType: 'web',
    //     tags: props.tags
    //   });
    //
    //   this.functionApp.addEnvironmentVariable(
    //     'APPINSIGHTS_INSTRUMENTATIONKEY',
    //     insights.instrumentationKey
    //   );
    // }
  }

  /**
   * Creates App Service Plan
   */
  private createAppServicePlan(id: string, props: FunctionsAppProps): ServerFarms {
    // Default to consumption plan (Y1) - TODO: Make configurable from props.plan
    return new ServerFarms(this, 'Plan', {
      location: this.location,
      // TODO: Fix SKU types - need to check ServerFarmsProps interface
      // sku: 'Y1',
      tags: props.tags,
    } as any);
  }

  /**
   * Creates dedicated storage account for Functions runtime operations
   *
   * @remarks
   * Per ADR-001 (Azure Functions App Storage Separation), each Functions App
   * MUST have its own dedicated storage account for runtime operations.
   *
   * This storage account is configured specifically for Functions requirements:
   * - Standard_LRS tier (sufficient for most scenarios)
   * - StorageV2 kind (required for all storage services)
   * - TLS 1.2 minimum version
   * - HTTPS-only traffic
   * - No public blob access
   * - Azure Services bypass enabled (required for Functions provisioning)
   *
   * The storage account is tagged to indicate its purpose and ownership.
   *
   * @param id - Construct ID for naming
   * @param props - Component properties
   * @returns Configured StorageAccounts construct
   */
  private createFunctionRuntimeStorage(id: string, props: FunctionsAppProps): StorageAccounts {
    return new StorageAccounts(this, 'RuntimeStorage', {
      location: this.location,
      sku: StorageAccountSkuName.STANDARD_LRS,
      kind: StorageAccountKind.STORAGE_V2,
      minimumTlsVersion: TlsVersion.TLS1_2,
      enableBlobPublicAccess: false,
      networkAcls: {
        defaultAction: NetworkAclDefaultAction.ALLOW, // Functions need access during provisioning
        bypass: NetworkAclBypass.AZURE_SERVICES,
      },
      tags: {
        ...props.tags,
        'storage-purpose': 'functions-runtime',
        'managed-by': 'functions-app',
      },
    });
  }

  /**
   * Creates Function App
   */
  private createFunctionApp(id: string, props: FunctionsAppProps): FunctionApp {
    const runtime = this.convertRuntimeToCdk(props.runtime);
    const enableIdentity = props.enableManagedIdentity !== false;

    return new FunctionApp(this, 'FunctionApp', {
      functionAppName: props.name,
      plan: {
        planId: this.plan.planId,
        location: this.location,
      },
      storageAccount: {
        storageAccountId: this.storage.storageAccountId,
        storageAccountName: this.storage.storageAccountName,
      },
      runtime,
      runtimeVersion: props.runtimeVersion ?? this.getDefaultRuntimeVersion(runtime),
      environment: this.environment,
      identity: enableIdentity
        ? {
            type: ManagedServiceIdentityType.SYSTEM_ASSIGNED,
          }
        : undefined,
      tags: props.tags,
    });
  }

  /**
   * Converts component runtime enum to CDK runtime enum
   */
  private convertRuntimeToCdk(runtime?: FunctionRuntime): CdkFunctionRuntime {
    if (!runtime) {
      return CdkFunctionRuntime.NODE;
    }

    // Map component runtime to CDK runtime
    const runtimeMap: Record<string, CdkFunctionRuntime> = {
      node: CdkFunctionRuntime.NODE,
      python: CdkFunctionRuntime.PYTHON,
      dotnet: CdkFunctionRuntime.DOTNET,
      java: CdkFunctionRuntime.JAVA,
      powershell: CdkFunctionRuntime.POWERSHELL,
    };

    return runtimeMap[runtime] ?? CdkFunctionRuntime.NODE;
  }

  /**
   * Gets default runtime version based on runtime
   */
  private getDefaultRuntimeVersion(runtime: CdkFunctionRuntime): string {
    switch (runtime) {
      case CdkFunctionRuntime.NODE:
        return '20';
      case CdkFunctionRuntime.PYTHON:
        return '3.11';
      case CdkFunctionRuntime.DOTNET:
        return '8.0';
      case CdkFunctionRuntime.JAVA:
        return '17';
      case CdkFunctionRuntime.POWERSHELL:
        return '7.2';
      default:
        return '20';
    }
  }

  /**
   * Gets location from parent stack
   */
  private getLocationFromParent(scope: Construct): string {
    let current: Construct | undefined = scope;

    while (current) {
      const parent = current as any;
      if (parent && typeof parent.location === 'string') {
        return parent.location;
      }
      current = current.node.scope;
    }

    return 'eastus'; // Fallback default
  }

  /**
   * Adds a global environment variable to the function app
   *
   * @param key - Environment variable name
   * @param value - Environment variable value
   *
   * @example
   * ```typescript
   * functionsApp.addEnvironmentVariable('API_KEY', 'secret');
   * functionsApp.addEnvironmentVariable('LOG_LEVEL', 'debug');
   * ```
   */
  public addEnvironmentVariable(key: string, value: string): void {
    this.environment[key] = value;
    this.functionApp.addEnvironmentVariable(key, value);
  }

  /**
   * Adds multiple environment variables
   *
   * @param variables - Record of environment variables
   *
   * @example
   * ```typescript
   * functionsApp.addEnvironmentVariables({
   *   API_KEY: 'secret',
   *   LOG_LEVEL: 'debug',
   *   ENABLE_CACHING: 'true'
   * });
   * ```
   */
  public addEnvironmentVariables(variables: Record<string, string>): void {
    Object.entries(variables).forEach(([key, value]) => {
      this.addEnvironmentVariable(key, value);
    });
  }

  // ============================================================================
  // Backend Pattern Support
  // ============================================================================

  /**
   * Define a Functions App component for use with defineBackend().
   *
   * @param id - Component identifier
   * @param config - Component configuration
   * @returns Component definition
   */
  public static define(id: string, config: FunctionsAppProps = {}): IComponentDefinition<FunctionsAppProps> {
    return {
      componentId: id,
      componentType: 'FunctionsApp',
      config,
      factory: (scope: Construct, componentId: string, componentConfig: FunctionsAppProps, resources: ResourceMap) => {
        const instance = new FunctionsApp(scope, componentId, componentConfig);
        instance.initialize(resources, scope);
        return instance;
      },
    };
  }

  /**
   * Get resource requirements for this component.
   *
   * @returns Array of resource requirements
   */
  public getRequirements(): ReadonlyArray<IResourceRequirement> {
    const requirements: IResourceRequirement[] = [];

    // Functions App requirement (self)
    requirements.push({
      resourceType: 'functions',
      requirementKey: this.componentId,
      priority: 10,
      config: {
        runtime: this.config.runtime || 'node',
        version: this.config.runtimeVersion || '20',
        sku: 'Y1',
        alwaysOn: false,
        environmentVariables: this.config.environment || {},
      },
      metadata: {
        source: this.componentId,
        version: '1.0.0',
        description: 'Azure Functions App',
      },
    });

    // Storage requirement for runtime
    requirements.push({
      resourceType: 'storage',
      requirementKey: `${this.componentId}-runtime`,
      priority: 10,
      config: {
        sku: 'Standard_LRS',
        kind: 'StorageV2',
        accessTier: 'Hot',
        enableHttpsOnly: true,
      },
      metadata: {
        source: this.componentId,
        version: '1.0.0',
        description: 'Storage for Functions runtime',
      },
    });

    return requirements;
  }

  /**
   * Initialize component with shared resources from the backend.
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
    // In backend mode, resources are shared - nothing additional to initialize
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

    const functionsKey = `functions:${this.componentId}`;
    if (!resources.has(functionsKey)) {
      errors.push(`Missing required Functions App resource: ${functionsKey}`);
    }

    const storageKey = `storage:${this.componentId}-runtime`;
    if (!resources.has(storageKey)) {
      warnings.push(`Missing optional Storage resource: ${storageKey}`);
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
      functionAppId: this.functionAppId,
      functionAppName: this.functionAppName,
      defaultHostName: this.defaultHostName,
      location: this.location,
    };
  }
}
