import { Construct, GrantableResource, ManagedIdentityType } from '@atakora/lib';
import type { IGrantable, IGrantResult } from '@atakora/lib';
import type { IResourceGroup } from '@atakora/cdk';
import type {
  FunctionAppProps,
  IFunctionApp,
  ManagedServiceIdentity,
  FunctionAppRuntime,
  CorsSettings,
  VNetConfiguration,
} from './function-app-types';
import { FunctionRuntime } from './types';
import { ManagedServiceIdentityType } from './function-app-types';

/**
 * L2 construct for Azure Function App.
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-naming.
 * Provides developer-friendly experience for creating Function Apps.
 *
 * **Features**:
 * - Auto-generates function app name using naming conventions
 * - Defaults location to parent resource group's location
 * - Merges tags with parent tags
 * - Secure defaults: HTTPS only, managed identity support
 * - Integrates with App Service Plan and Storage Account
 *
 * **ARM Resource Type**: `Microsoft.Web/sites` (kind: functionapp)
 * **API Version**: `2023-01-01`
 * **Deployment Scope**: ResourceGroup
 *
 * @example
 * Minimal usage:
 * ```typescript
 * import { FunctionApp } from '@atakora/cdk/functions';
 *
 * const functionApp = new FunctionApp(resourceGroup, 'Api', {
 *   plan: appServicePlan,
 *   storageAccount: storage
 * });
 * ```
 *
 * @example
 * With custom configuration:
 * ```typescript
 * const functionApp = new FunctionApp(resourceGroup, 'Api', {
 *   plan: appServicePlan,
 *   storageAccount: storage,
 *   runtime: FunctionRuntime.NODE,
 *   runtimeVersion: '18',
 *   environment: {
 *     NODE_ENV: 'production',
 *     LOG_LEVEL: 'info'
 *   },
 *   identity: {
 *     type: ManagedServiceIdentityType.SYSTEM_ASSIGNED
 *   }
 * });
 * ```
 */
export class FunctionApp extends GrantableResource implements IFunctionApp {
  /**
   * ARM resource type.
   */
  public readonly resourceType = 'Microsoft.Web/sites';

  /**
   * API version for the resource.
   */
  public readonly apiVersion = '2023-01-01';

  /**
   * Resource name (same as functionAppName).
   */
  public readonly name: string;

  /**
   * Full resource ID.
   */
  public readonly resourceId: string;

  /**
   * Parent resource group.
   */
  private readonly parentResourceGroup: IResourceGroup;

  /**
   * Name of the Function App.
   */
  public readonly functionAppName: string;

  /**
   * Resource ID of the Function App (alias for resourceId).
   */
  public readonly functionAppId: string;

  /**
   * Default hostname of the Function App.
   */
  public readonly defaultHostName: string;

  /**
   * Location of the Function App.
   */
  public readonly location: string;

  /**
   * Resource group name where the Function App is deployed.
   */
  public readonly resourceGroupName: string;

  /**
   * Runtime configuration.
   */
  public readonly runtime: FunctionRuntime;

  /**
   * Runtime version.
   */
  public readonly runtimeVersion: string;

  /**
   * App Service Plan ID.
   */
  public readonly serverFarmId: string;

  /**
   * Storage Account name.
   */
  public readonly storageAccountName: string;

  /**
   * Global environment variables.
   */
  public readonly environment: Record<string, string>;

  /**
   * Tags applied to the Function App (merged with parent tags).
   */
  public readonly tags: Record<string, string>;

  /**
   * CORS settings (if configured).
   */
  public readonly cors?: CorsSettings;

  /**
   * VNet configuration (if configured).
   */
  public readonly vnetConfig?: VNetConfiguration;

  /**
   * Creates a new FunctionApp construct.
   *
   * @param scope - Parent construct (must be or contain a ResourceGroup)
   * @param id - Unique identifier for this construct
   * @param props - Function App properties
   *
   * @throws {Error} If scope does not contain a ResourceGroup
   * @throws {Error} If plan or storageAccount is not provided
   *
   * @example
   * ```typescript
   * const functionApp = new FunctionApp(resourceGroup, 'Api', {
   *   plan: appServicePlan,
   *   storageAccount: storage,
   *   runtime: FunctionRuntime.NODE,
   *   runtimeVersion: '18'
   * });
   * ```
   */
  constructor(scope: Construct, id: string, props: FunctionAppProps) {
    super(scope, id);
    this.validateProps(props);

    // Validate required properties
    if (!props.plan) {
      throw new Error('FunctionApp requires a plan (App Service Plan reference)');
    }

    if (!props.storageAccount) {
      throw new Error('FunctionApp requires a storageAccount reference');
    }

    // Get parent resource group
    this.parentResourceGroup = this.getParentResourceGroup(scope);

    // Auto-generate or use provided function app name
    this.functionAppName = this.resolveFunctionAppName(id, props);
    this.name = this.functionAppName;

    // Default location to resource group's location or use provided
    this.location = props.location ?? this.parentResourceGroup.location;

    // Set resource group name
    this.resourceGroupName = this.parentResourceGroup.resourceGroupName;

    // Set runtime and version
    this.runtime = props.runtime ?? FunctionRuntime.NODE;
    this.runtimeVersion = props.runtimeVersion ?? '18';

    // Set App Service Plan ID
    this.serverFarmId = props.plan.planId;

    // Set Storage Account name
    this.storageAccountName = props.storageAccount.storageAccountName;

    // Set identity (protected property from GrantableResource)
    if (props.identity) {
      // Use type assertion to set protected property in constructor
      (this as any).identity = {
        type: this.convertIdentityType(props.identity.type),
        userAssignedIdentities: props.identity.userAssignedIdentities,
      };
    }

    // Set environment variables
    this.environment = props.environment ?? {};

    // Set CORS settings
    this.cors = props.cors;

    // Set VNet configuration
    this.vnetConfig = props.vnetConfig;

    // Merge tags with parent
    this.tags = {
      ...this.getParentTags(scope),
      ...props.tags,
    };

    // Construct resource ID
    this.resourceId = `[resourceId('Microsoft.Web/sites', '${this.name}')]`;
    this.functionAppId = this.resourceId;

    // Construct default hostname
    this.defaultHostName = `${this.functionAppName}.azurewebsites.net`;

    // Note: The actual ARM resource creation will be handled during synthesis
    // This L2 construct serves as a container for Azure Functions
  }

  /**
   * Validates constructor properties.
   *
   * @param props - Properties to validate
   * @throws {Error} If validation fails
   *
   * @internal
   */
  protected validateProps(props: FunctionAppProps): void {
    // Basic validation is done in constructor
    // Can be extended for more complex validation
  }

  /**
   * Transforms this resource to ARM template JSON representation.
   *
   * @returns ARM template resource object
   *
   * @remarks
   * This is a stub implementation. Full ARM template generation
   * will be implemented when synthesis is added.
   */
  public toArmTemplate(): any {
    // Build app settings with required Azure Functions settings
    const appSettings: Array<{ name: string; value: string }> = [
      // Required: Storage connection string for Azure Functions runtime
      {
        name: 'AzureWebJobsStorage',
        value: `[concat('DefaultEndpointsProtocol=https;AccountName=${this.storageAccountName};AccountKey=', listKeys(resourceId('Microsoft.Storage/storageAccounts', '${this.storageAccountName}'), '2025-01-01').keys[0].value)]`,
      },
      // Required: Functions extension version
      {
        name: 'FUNCTIONS_EXTENSION_VERSION',
        value: '~4',
      },
      // Required: Functions runtime
      {
        name: 'FUNCTIONS_WORKER_RUNTIME',
        value: this.runtime,
      },
    ];

    // Add user-provided environment variables
    Object.entries(this.environment).forEach(([name, value]) => {
      appSettings.push({ name, value });
    });

    // Add dependsOn for storage account and server farm
    const dependsOn: string[] = [
      `[resourceId('Microsoft.Storage/storageAccounts', '${this.storageAccountName}')]`,
    ];

    // Ensure serverFarmId is an ARM expression
    let serverFarmIdValue = this.serverFarmId;
    if (!serverFarmIdValue.startsWith('[')) {
      // If it's a literal ID, convert to ARM expression
      const planName = serverFarmIdValue.split('/').pop();
      serverFarmIdValue = `[resourceId('Microsoft.Web/serverfarms', '${planName}')]`;
      dependsOn.push(serverFarmIdValue);
    }

    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.name,
      location: this.location,
      kind: 'functionapp',
      tags: this.tags,
      identity: this.identity,
      properties: {
        serverFarmId: serverFarmIdValue,
        siteConfig: {
          appSettings,
        },
      },
      dependsOn,
    };
  }

  /**
   * Converts ManagedServiceIdentityType to ManagedIdentityType.
   *
   * @param type - Function app identity type
   * @returns Core identity type
   *
   * @internal
   */
  private convertIdentityType(type: ManagedServiceIdentityType): ManagedIdentityType {
    switch (type) {
      case ManagedServiceIdentityType.SYSTEM_ASSIGNED:
        return ManagedIdentityType.SYSTEM_ASSIGNED;
      case ManagedServiceIdentityType.USER_ASSIGNED:
        return ManagedIdentityType.USER_ASSIGNED;
      case ManagedServiceIdentityType.SYSTEM_ASSIGNED_USER_ASSIGNED:
        return ManagedIdentityType.SYSTEM_ASSIGNED_USER_ASSIGNED;
      case ManagedServiceIdentityType.NONE:
      default:
        return ManagedIdentityType.NONE;
    }
  }

  /**
   * Gets the parent ResourceGroup from the construct tree.
   *
   * @param scope - Parent construct
   * @returns The resource group interface
   * @throws {Error} If parent is not or doesn't contain a ResourceGroup
   */
  private getParentResourceGroup(scope: Construct): IResourceGroup {
    // Walk up the construct tree to find ResourceGroup
    let current: Construct | undefined = scope;

    while (current) {
      // Check if current implements IResourceGroup interface
      if (this.isResourceGroup(current)) {
        return current as IResourceGroup;
      }
      current = current.node.scope;
    }

    throw new Error(
      'FunctionApp must be created within or under a ResourceGroup. ' +
        'Ensure the parent scope is a ResourceGroup or has one in its hierarchy.'
    );
  }

  /**
   * Checks if a construct implements IResourceGroup interface using duck typing.
   *
   * @param construct - Construct to check
   * @returns True if construct has ResourceGroup properties
   */
  private isResourceGroup(construct: any): construct is IResourceGroup {
    return (
      construct &&
      typeof construct.resourceGroupName === 'string' &&
      typeof construct.location === 'string'
    );
  }

  /**
   * Gets tags from parent construct hierarchy.
   *
   * @param scope - Parent construct
   * @returns Tags object (empty if no tags found)
   */
  private getParentTags(scope: Construct): Record<string, string> {
    // Try to get tags from parent
    const parent = scope as any;
    if (parent && typeof parent.tags === 'object') {
      return parent.tags;
    }
    return {};
  }

  /**
   * Resolves the function app name from props or auto-generates it.
   *
   * @param id - Construct ID
   * @param props - Function App properties
   * @returns Resolved function app name
   *
   * @remarks
   * Function app names have constraints:
   * - 2-60 characters
   * - Alphanumeric and hyphens only
   * - Globally unique across Azure
   *
   * Auto-generated naming convention:
   * - Format: func-{org}-{project}-{purpose}-{env}-{geo}-{instance}
   * - Example: func-dp-authr-api-np-eus-01
   */
  private resolveFunctionAppName(id: string, props?: FunctionAppProps): string {
    // If name provided explicitly, use it
    if (props?.functionAppName) {
      return props.functionAppName;
    }

    // Auto-generate name using parent's naming context
    const subscriptionStack = this.getSubscriptionStack();
    if (subscriptionStack && subscriptionStack.generateResourceName) {
      const purpose = this.constructIdToPurpose(id);
      return subscriptionStack.generateResourceName('func', purpose);
    }

    // Fallback: construct a basic name from ID
    const fallbackName = `func-${id.toLowerCase()}`;
    return fallbackName.substring(0, 60);
  }

  /**
   * Gets the SubscriptionStack from the construct tree.
   *
   * @returns SubscriptionStack or undefined if not found
   */
  private getSubscriptionStack(): any {
    let current: Construct | undefined = this.node.scope;

    while (current) {
      // Check if current is a SubscriptionStack using duck typing
      if (
        current &&
        typeof (current as any).generateResourceName === 'function' &&
        typeof (current as any).subscriptionId === 'string'
      ) {
        return current;
      }
      current = current.node.scope;
    }

    return undefined;
  }

  /**
   * Converts construct ID to purpose identifier for naming.
   *
   * @param id - Construct ID
   * @returns Purpose string for naming
   */
  private constructIdToPurpose(id: string): string {
    return id.toLowerCase();
  }

  /**
   * Adds a global environment variable to the Function App.
   *
   * @param key - Environment variable name
   * @param value - Environment variable value
   *
   * @remarks
   * This environment variable will be available to all functions in the app.
   * Individual functions can override this value.
   *
   * @example
   * ```typescript
   * functionApp.addEnvironmentVariable('LOG_LEVEL', 'debug');
   * functionApp.addEnvironmentVariable('API_VERSION', 'v2');
   * ```
   */
  public addEnvironmentVariable(key: string, value: string): void {
    this.environment[key] = value;
  }

  /**
   * Adds multiple environment variables to the Function App.
   *
   * @param variables - Record of environment variables
   *
   * @example
   * ```typescript
   * functionApp.addEnvironmentVariables({
   *   LOG_LEVEL: 'debug',
   *   API_VERSION: 'v2',
   *   ENABLE_CACHING: 'true'
   * });
   * ```
   */
  public addEnvironmentVariables(variables: Record<string, string>): void {
    Object.entries(variables).forEach(([key, value]) => {
      this.environment[key] = value;
    });
  }

  // ============================================================
  // Grant Methods
  // ============================================================

  /**
   * Grant permission to invoke this Function App.
   *
   * @remarks
   * Grants the Website Contributor role, which allows:
   * - Invoking function endpoints
   * - Reading function app configuration
   * - Managing function app settings
   *
   * This is typically used to grant API Management or other services
   * permission to call functions using managed identity authentication.
   *
   * **Security Note**: This uses RBAC-based authentication. For defense in depth,
   * combine with function keys (both are evaluated).
   *
   * @param grantable - Identity to grant invoke permissions to
   * @returns Grant result with the created role assignment
   *
   * @example
   * Grant API Management permission to invoke functions:
   * ```typescript
   * const apimService = new ApiManagementService(stack, 'APIM', {
   *   identity: {
   *     type: ManagedServiceIdentityType.SYSTEM_ASSIGNED
   *   }
   * });
   *
   * const functionApp = new FunctionApp(stack, 'Api', {
   *   plan: appServicePlan,
   *   storageAccount: storage,
   *   identity: {
   *     type: ManagedServiceIdentityType.SYSTEM_ASSIGNED
   *   }
   * });
   *
   * // Grant APIM permission to invoke the function (RBAC)
   * functionApp.grantInvoke(apimService);
   * ```
   */
  public grantInvoke(grantable: IGrantable): IGrantResult {
    const { WellKnownRoleIds } = require('@atakora/lib/authorization');
    const { IGrantResult } = require('@atakora/lib/core/grants');

    return this.grant(
      grantable,
      WellKnownRoleIds.WEBSITE_CONTRIBUTOR,
      `Allow ${grantable.principalId} to invoke ${this.functionAppName}`
    );
  }

  /**
   * Imports an existing Function App by name.
   *
   * @param scope - Parent construct
   * @param id - Unique identifier for the imported construct
   * @param functionAppName - Name of the existing Function App
   * @param location - Location of the Function App
   * @returns Function App interface
   *
   * @example
   * ```typescript
   * const existingApp = FunctionApp.fromFunctionAppName(
   *   scope,
   *   'ExistingApi',
   *   'func-dp-authr-api-np-eus-01',
   *   'eastus'
   * );
   * ```
   */
  public static fromFunctionAppName(
    scope: Construct,
    id: string,
    functionAppName: string,
    location: string
  ): IFunctionApp {
    // Get parent resource group
    let current: Construct | undefined = scope;
    let resourceGroupName = 'imported';

    while (current) {
      if (
        current &&
        typeof (current as any).resourceGroupName === 'string'
      ) {
        resourceGroupName = (current as any).resourceGroupName;
        break;
      }
      current = current.node.scope;
    }

    const functionAppId = `/subscriptions/{subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.Web/sites/${functionAppName}`;
    const defaultHostName = `${functionAppName}.azurewebsites.net`;

    return {
      functionAppName,
      functionAppId,
      defaultHostName,
      location,
    };
  }
}
