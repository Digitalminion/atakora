/**
 * Functions App Component
 *
 * @remarks
 * High-level component that bundles everything needed to run Azure Functions:
 * - App Service Plan (hosting plan)
 * - Storage Account (required for function app state)
 * - Function App (the actual function app)
 * - Managed Identity (for secure access to resources)
 * - Application Insights (optional monitoring)
 *
 * This component makes it easy to create a function app without worrying about
 * all the individual dependencies.
 *
 * @packageDocumentation
 */

import { Construct } from '@atakora/cdk';
import { FunctionApp } from '@atakora/cdk/functions';
import { ServerFarms, ServerFarmSkuName, ServerFarmSkuTier } from '@atakora/cdk/web';
import { StorageAccounts, StorageAccountSkuName, StorageAccountKind } from '@atakora/cdk/storage';
import { FunctionRuntime as CdkFunctionRuntime } from '@atakora/cdk/functions';
import { ManagedServiceIdentityType } from '@atakora/cdk/functions';
import type { FunctionsAppProps, FunctionRuntime } from './types';
import { FunctionAppPresets } from './types';

/**
 * Functions App Component
 *
 * @remarks
 * Bundles App Service Plan, Storage Account, and Function App into a single component.
 * Handles all the wiring and configuration automatically.
 *
 * @example
 * Simple serverless function app:
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
 * Premium plan for production APIs:
 * ```typescript
 * const functionsApp = new FunctionsApp(stack, 'Api', {
 *   runtime: FunctionRuntime.NODE,
 *   plan: FunctionAppPresets.PREMIUM_EP1.plan,
 *   environment: {
 *     NODE_ENV: 'production',
 *     LOG_LEVEL: 'info'
 *   }
 * });
 * ```
 */
export class FunctionsApp extends Construct {
  /**
   * App Service Plan (hosting plan)
   */
  public readonly plan: ServerFarms;

  /**
   * Storage Account (required for function app state)
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

  constructor(scope: Construct, id: string, props: FunctionsAppProps = {}) {
    super(scope, id);

    this.location = props.location ?? this.getLocationFromParent(scope);
    this.environment = props.environment ?? {};

    // Use existing or create new App Service Plan
    this.plan = props.existingPlan ?? this.createAppServicePlan(id, props);

    // Use existing or create new Storage Account
    this.storage = props.existingStorage ?? this.createStorageAccount(id, props);

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
   * Creates Storage Account
   */
  private createStorageAccount(id: string, props: FunctionsAppProps): StorageAccounts {
    return new StorageAccounts(this, 'Storage', {
      location: this.location,
      sku: StorageAccountSkuName.STANDARD_LRS, // Locally redundant storage is sufficient for function state
      kind: StorageAccountKind.STORAGE_V2,
      tags: props.tags,
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
}
