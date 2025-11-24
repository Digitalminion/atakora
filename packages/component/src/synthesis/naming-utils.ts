/**
 * Resource Naming Utilities for Backend Synthesis
 *
 * @module @atakora/component/synthesis/naming-utils
 *
 * @remarks
 * This module provides convenient utilities for generating Azure-compliant
 * resource names during backend synthesis. It wraps the ResourceNameGenerator
 * from @atakora/lib and provides synthesis-specific methods.
 *
 * All generated names comply with Azure naming constraints:
 * - Storage Account: 3-24 chars, alphanumeric, globally unique
 * - Key Vault: 3-24 chars, alphanumeric and hyphens
 * - Cosmos DB: 3-44 chars, lowercase alphanumeric and hyphens
 * - Function App: 2-60 chars, alphanumeric and hyphens
 * - App Service Plan: 1-40 chars, alphanumeric and hyphens
 * - API Management: 1-50 chars, alphanumeric and hyphens
 * - Application Insights: 1-260 chars
 * - Resource Group: 1-90 chars, alphanumeric, periods, underscores, hyphens, parentheses
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ResourceNamingUtility } from './naming-utils';
 *
 * const namingUtil = new ResourceNamingUtility();
 *
 * const context: SynthesisContext = {
 *   naming: {
 *     organization: 'digitalminion',
 *     project: 'myapp',
 *     environment: 'prod',
 *     geography: 'eus',
 *     instance: '01',
 *   },
 *   // ... other context properties
 * };
 *
 * const cosmosName = namingUtil.generateCosmosAccountName(context);
 * // Result: "cosdb-digitalminion-myapp-prod-eus-01"
 *
 * const storageName = namingUtil.generateStorageAccountName(context);
 * // Result: "stdigitalminionmyappprodus01" (no hyphens, max 24 chars)
 * ```
 */

import { ResourceNameGenerator } from '@atakora/lib';
import type { SynthesisContext } from './types';

/**
 * Utility class for generating Azure-compliant resource names during synthesis.
 *
 * @remarks
 * This class provides convenient methods for generating resource names that are:
 * - Consistent with organizational naming conventions
 * - Compliant with Azure resource-specific constraints
 * - Based on synthesis context parameters
 *
 * The class wraps {@link ResourceNameGenerator} from @atakora/lib and provides
 * synthesis-specific convenience methods.
 *
 * @example
 * ```typescript
 * const namingUtil = new ResourceNamingUtility();
 *
 * const context: SynthesisContext = {
 *   naming: {
 *     organization: 'dm',
 *     project: 'api',
 *     environment: 'dev',
 *     geography: 'eus',
 *     instance: '01',
 *   },
 *   // ... other properties
 * };
 *
 * // Generate names for different resource types
 * const cosmosName = namingUtil.generateCosmosAccountName(context);
 * const storageName = namingUtil.generateStorageAccountName(context);
 * const kvName = namingUtil.generateKeyVaultName(context);
 * ```
 */
export class ResourceNamingUtility {
  private readonly nameGenerator: ResourceNameGenerator;

  /**
   * Creates a new ResourceNamingUtility instance.
   *
   * @example
   * ```typescript
   * const namingUtil = new ResourceNamingUtility();
   * ```
   */
  constructor() {
    this.nameGenerator = new ResourceNameGenerator();
  }

  /**
   * Generate Cosmos DB account name.
   *
   * @param context - Synthesis context containing naming parameters
   * @returns Azure-compliant Cosmos DB account name
   *
   * @remarks
   * **Format:** `cosdb-{org}-{project}-{env}-{geo}-{instance}`
   *
   * **Constraints:**
   * - Length: 3-44 characters
   * - Allowed: lowercase letters, numbers, and hyphens
   * - Must start with letter or number
   * - Globally unique across Azure
   *
   * @example
   * ```typescript
   * const context: SynthesisContext = {
   *   naming: {
   *     organization: 'digitalminion',
   *     project: 'myapp',
   *     environment: 'prod',
   *     geography: 'eus',
   *     instance: '01',
   *   },
   *   // ...
   * };
   *
   * const name = namingUtil.generateCosmosAccountName(context);
   * // Result: "cosdb-digitalminion-myapp-prod-eus-01"
   * ```
   */
  public generateCosmosAccountName(context: SynthesisContext): string {
    return this.nameGenerator.generateName({
      resourceType: 'cosmos',
      organization: context.naming.organization,
      project: context.naming.project,
      environment: context.naming.environment,
      geography: context.naming.geography,
      instance: context.naming.instance,
    });
  }

  /**
   * Generate Storage Account name.
   *
   * @param context - Synthesis context containing naming parameters
   * @returns Azure-compliant Storage Account name
   *
   * @remarks
   * **Format:** `sto{org}{project}{env}{geo}{instance}` (no hyphens)
   *
   * **Constraints:**
   * - Length: 3-24 characters
   * - Allowed: lowercase letters and numbers only (no hyphens)
   * - Must be globally unique across Azure
   *
   * **Note:** Storage accounts automatically remove hyphens and convert to lowercase.
   *
   * @example
   * ```typescript
   * const context: SynthesisContext = {
   *   naming: {
   *     organization: 'dm',
   *     project: 'api',
   *     environment: 'dev',
   *     geography: 'eus',
   *     instance: '01',
   *   },
   *   // ...
   * };
   *
   * const name = namingUtil.generateStorageAccountName(context);
   * // Result: "stdmapideveus01" (max 24 chars, no hyphens)
   * ```
   */
  public generateStorageAccountName(context: SynthesisContext): string {
    return this.nameGenerator.generateName({
      resourceType: 'storage',
      organization: context.naming.organization,
      project: context.naming.project,
      environment: context.naming.environment,
      geography: context.naming.geography,
      instance: context.naming.instance,
    });
  }

  /**
   * Generate Key Vault name.
   *
   * @param context - Synthesis context containing naming parameters
   * @returns Azure-compliant Key Vault name
   *
   * @remarks
   * **Format:** `kv-{org}-{project}-{env}-{geo}-{instance}`
   *
   * **Constraints:**
   * - Length: 3-24 characters
   * - Allowed: alphanumeric and hyphens
   * - Must start with letter
   * - Must end with letter or digit
   * - Globally unique across Azure
   *
   * @example
   * ```typescript
   * const context: SynthesisContext = {
   *   naming: {
   *     organization: 'dm',
   *     project: 'app',
   *     environment: 'prod',
   *     geography: 'wus2',
   *     instance: '01',
   *   },
   *   // ...
   * };
   *
   * const name = namingUtil.generateKeyVaultName(context);
   * // Result: "kv-dm-app-prod-wus2-01" (max 24 chars)
   * ```
   */
  public generateKeyVaultName(context: SynthesisContext): string {
    return this.nameGenerator.generateName({
      resourceType: 'keyvault',
      organization: context.naming.organization,
      project: context.naming.project,
      environment: context.naming.environment,
      geography: context.naming.geography,
      instance: context.naming.instance,
    });
  }

  /**
   * Generate Function App name.
   *
   * @param context - Synthesis context containing naming parameters
   * @param purpose - Optional purpose identifier (e.g., 'api', 'worker')
   * @returns Azure-compliant Function App name
   *
   * @remarks
   * **Format:** `appsrv-{purpose}-{org}-{project}-{env}-{geo}-{instance}`
   *
   * **Constraints:**
   * - Length: 2-60 characters
   * - Allowed: alphanumeric and hyphens
   * - Must start and end with alphanumeric
   * - Globally unique across Azure (part of *.azurewebsites.net domain)
   *
   * @example
   * ```typescript
   * const context: SynthesisContext = {
   *   naming: {
   *     organization: 'digitalminion',
   *     project: 'myapp',
   *     environment: 'prod',
   *     geography: 'eus',
   *     instance: '01',
   *   },
   *   // ...
   * };
   *
   * const name = namingUtil.generateFunctionAppName(context);
   * // Result: "appsrv-func-digitalminion-myapp-prod-eus-01"
   *
   * const apiName = namingUtil.generateFunctionAppName(context, 'api');
   * // Result: "appsrv-api-digitalminion-myapp-prod-eus-01"
   * ```
   */
  public generateFunctionAppName(context: SynthesisContext, purpose?: string): string {
    return this.nameGenerator.generateName({
      resourceType: 'appService',
      organization: context.naming.organization,
      project: context.naming.project,
      environment: context.naming.environment,
      geography: context.naming.geography,
      instance: context.naming.instance,
      purpose: purpose ?? 'func',
    });
  }

  /**
   * Generate App Service Plan name.
   *
   * @param context - Synthesis context containing naming parameters
   * @param purpose - Optional purpose identifier (e.g., 'consumption', 'premium')
   * @returns Azure-compliant App Service Plan name
   *
   * @remarks
   * **Format:** `aspsrvpl-{purpose}-{org}-{project}-{env}-{geo}-{instance}`
   *
   * **Constraints:**
   * - Length: 1-40 characters
   * - Allowed: alphanumeric and hyphens
   *
   * @example
   * ```typescript
   * const context: SynthesisContext = {
   *   naming: {
   *     organization: 'dm',
   *     project: 'api',
   *     environment: 'prod',
   *     geography: 'eus',
   *     instance: '01',
   *   },
   *   // ...
   * };
   *
   * const name = namingUtil.generateAppServicePlanName(context);
   * // Result: "aspsrvpl-dm-api-prod-eus-01"
   *
   * const premiumName = namingUtil.generateAppServicePlanName(context, 'premium');
   * // Result: "aspsrvpl-premium-dm-api-prod-eus-01"
   * ```
   */
  public generateAppServicePlanName(context: SynthesisContext, purpose?: string): string {
    return this.nameGenerator.generateName({
      resourceType: 'appServicePlan',
      organization: context.naming.organization,
      project: context.naming.project,
      environment: context.naming.environment,
      geography: context.naming.geography,
      instance: context.naming.instance,
      purpose,
    });
  }

  /**
   * Generate API Management service name.
   *
   * @param context - Synthesis context containing naming parameters
   * @returns Azure-compliant API Management service name
   *
   * @remarks
   * **Format:** `apim-{org}-{project}-{env}-{geo}-{instance}`
   *
   * **Constraints:**
   * - Length: 1-50 characters
   * - Allowed: alphanumeric and hyphens
   * - Must start with letter
   * - Must end with alphanumeric
   * - Globally unique across Azure (part of *.azure-api.net domain)
   *
   * @example
   * ```typescript
   * const context: SynthesisContext = {
   *   naming: {
   *     organization: 'digitalminion',
   *     project: 'myapp',
   *     environment: 'prod',
   *     geography: 'eus',
   *     instance: '01',
   *   },
   *   // ...
   * };
   *
   * const name = namingUtil.generateApiManagementName(context);
   * // Result: "apim-digitalminion-myapp-prod-eus-01"
   * ```
   */
  public generateApiManagementName(context: SynthesisContext): string {
    return this.nameGenerator.generateName({
      resourceType: 'apim',
      organization: context.naming.organization,
      project: context.naming.project,
      environment: context.naming.environment,
      geography: context.naming.geography,
      instance: context.naming.instance,
    });
  }

  /**
   * Generate Application Insights name.
   *
   * @param context - Synthesis context containing naming parameters
   * @param purpose - Optional purpose identifier (e.g., 'func', 'web')
   * @returns Azure-compliant Application Insights name
   *
   * @remarks
   * **Format:** `ai-{purpose}-{org}-{project}-{env}-{geo}-{instance}`
   *
   * **Constraints:**
   * - Length: 1-260 characters
   * - Allowed: alphanumeric, periods, underscores, hyphens, parentheses
   *
   * @example
   * ```typescript
   * const context: SynthesisContext = {
   *   naming: {
   *     organization: 'dm',
   *     project: 'api',
   *     environment: 'dev',
   *     geography: 'eus',
   *     instance: '01',
   *   },
   *   // ...
   * };
   *
   * const name = namingUtil.generateAppInsightsName(context);
   * // Result: "ai-dm-api-dev-eus-01"
   *
   * const funcName = namingUtil.generateAppInsightsName(context, 'func');
   * // Result: "ai-func-dm-api-dev-eus-01"
   * ```
   */
  public generateAppInsightsName(context: SynthesisContext, purpose?: string): string {
    return this.nameGenerator.generateName({
      resourceType: 'applicationInsights',
      organization: context.naming.organization,
      project: context.naming.project,
      environment: context.naming.environment,
      geography: context.naming.geography,
      instance: context.naming.instance,
      purpose,
    });
  }

  /**
   * Generate Log Analytics Workspace name.
   *
   * @param context - Synthesis context containing naming parameters
   * @returns Azure-compliant Log Analytics Workspace name
   *
   * @remarks
   * **Format:** `law-{org}-{project}-{env}-{geo}-{instance}`
   *
   * **Constraints:**
   * - Length: 4-63 characters
   * - Allowed: alphanumeric and hyphens
   *
   * @example
   * ```typescript
   * const context: SynthesisContext = {
   *   naming: {
   *     organization: 'digitalminion',
   *     project: 'platform',
   *     environment: 'prod',
   *     geography: 'eus',
   *     instance: '01',
   *   },
   *   // ...
   * };
   *
   * const name = namingUtil.generateLogAnalyticsName(context);
   * // Result: "law-digitalminion-platform-prod-eus-01"
   * ```
   */
  public generateLogAnalyticsName(context: SynthesisContext): string {
    return this.nameGenerator.generateName({
      resourceType: 'logAnalytics',
      organization: context.naming.organization,
      project: context.naming.project,
      environment: context.naming.environment,
      geography: context.naming.geography,
      instance: context.naming.instance,
    });
  }

  /**
   * Generate resource group name (for reference).
   *
   * @param context - Synthesis context containing naming parameters
   * @param purpose - Optional purpose identifier (e.g., 'data', 'compute', 'network')
   * @returns Azure-compliant resource group name
   *
   * @remarks
   * **Format:** `rg-{purpose}-{org}-{project}-{env}-{geo}-{instance}`
   *
   * **Constraints:**
   * - Length: 1-90 characters
   * - Allowed: alphanumeric, periods, underscores, hyphens, parentheses
   * - Cannot end with period
   *
   * **Note:** Resource groups are typically created outside synthesis,
   * but this method is provided for reference and documentation.
   *
   * @example
   * ```typescript
   * const context: SynthesisContext = {
   *   naming: {
   *     organization: 'dm',
   *     project: 'api',
   *     environment: 'prod',
   *     geography: 'eus',
   *     instance: '01',
   *   },
   *   // ...
   * };
   *
   * const name = namingUtil.generateResourceGroupName(context);
   * // Result: "rg-dm-api-prod-eus-01"
   *
   * const dataRgName = namingUtil.generateResourceGroupName(context, 'data');
   * // Result: "rg-data-dm-api-prod-eus-01"
   * ```
   */
  public generateResourceGroupName(context: SynthesisContext, purpose?: string): string {
    return this.nameGenerator.generateName({
      resourceType: 'rg',
      organization: context.naming.organization,
      project: context.naming.project,
      environment: context.naming.environment,
      geography: context.naming.geography,
      instance: context.naming.instance,
      purpose,
    });
  }

  /**
   * Generate Virtual Network name.
   *
   * @param context - Synthesis context containing naming parameters
   * @param purpose - Optional purpose identifier (e.g., 'main', 'isolation')
   * @returns Azure-compliant Virtual Network name
   *
   * @remarks
   * **Format:** `vnet-{purpose}-{org}-{project}-{env}-{geo}-{instance}`
   *
   * **Constraints:**
   * - Length: 2-64 characters
   * - Allowed: alphanumeric, periods, underscores, hyphens
   * - Must start with alphanumeric
   * - Must end with alphanumeric or underscore
   *
   * @example
   * ```typescript
   * const context: SynthesisContext = {
   *   naming: {
   *     organization: 'digitalminion',
   *     project: 'platform',
   *     environment: 'prod',
   *     geography: 'eus',
   *     instance: '01',
   *   },
   *   // ...
   * };
   *
   * const name = namingUtil.generateVNetName(context);
   * // Result: "vnet-digitalminion-platform-prod-eus-01"
   *
   * const isolationName = namingUtil.generateVNetName(context, 'isolation');
   * // Result: "vnet-isolation-digitalminion-platform-prod-eus-01"
   * ```
   */
  public generateVNetName(context: SynthesisContext, purpose?: string): string {
    return this.nameGenerator.generateName({
      resourceType: 'vnet',
      organization: context.naming.organization,
      project: context.naming.project,
      environment: context.naming.environment,
      geography: context.naming.geography,
      instance: context.naming.instance,
      purpose,
    });
  }

  /**
   * Generate Subnet name.
   *
   * @param context - Synthesis context containing naming parameters
   * @param purpose - Purpose identifier for the subnet (e.g., 'data', 'func', 'gateway')
   * @returns Azure-compliant Subnet name
   *
   * @remarks
   * **Format:** `subnet-{purpose}-{org}-{project}-{env}-{geo}-{instance}`
   *
   * **Constraints:**
   * - Length: 1-80 characters
   * - Allowed: alphanumeric, periods, underscores, hyphens
   * - Must start with alphanumeric
   * - Must end with alphanumeric or underscore
   *
   * **Note:** Purpose is recommended for subnets to distinguish their role.
   *
   * @example
   * ```typescript
   * const context: SynthesisContext = {
   *   naming: {
   *     organization: 'dm',
   *     project: 'api',
   *     environment: 'prod',
   *     geography: 'eus',
   *     instance: '01',
   *   },
   *   // ...
   * };
   *
   * const funcSubnet = namingUtil.generateSubnetName(context, 'func');
   * // Result: "subnet-func-dm-api-prod-eus-01"
   *
   * const dataSubnet = namingUtil.generateSubnetName(context, 'data');
   * // Result: "subnet-data-dm-api-prod-eus-01"
   * ```
   */
  public generateSubnetName(context: SynthesisContext, purpose: string): string {
    return this.nameGenerator.generateName({
      resourceType: 'subnet',
      organization: context.naming.organization,
      project: context.naming.project,
      environment: context.naming.environment,
      geography: context.naming.geography,
      instance: context.naming.instance,
      purpose,
    });
  }

  /**
   * Generate Network Security Group name.
   *
   * @param context - Synthesis context containing naming parameters
   * @param purpose - Optional purpose identifier (e.g., 'func', 'data')
   * @returns Azure-compliant Network Security Group name
   *
   * @remarks
   * **Format:** `nsg-{purpose}-{org}-{project}-{env}-{geo}-{instance}`
   *
   * **Constraints:**
   * - Length: 1-80 characters
   * - Allowed: alphanumeric, periods, underscores, hyphens
   * - Must start with alphanumeric
   * - Must end with alphanumeric or underscore
   *
   * @example
   * ```typescript
   * const context: SynthesisContext = {
   *   naming: {
   *     organization: 'dm',
   *     project: 'api',
   *     environment: 'prod',
   *     geography: 'eus',
   *     instance: '01',
   *   },
   *   // ...
   * };
   *
   * const name = namingUtil.generateNsgName(context, 'func');
   * // Result: "nsg-func-dm-api-prod-eus-01"
   * ```
   */
  public generateNsgName(context: SynthesisContext, purpose?: string): string {
    return this.nameGenerator.generateName({
      resourceType: 'nsg',
      organization: context.naming.organization,
      project: context.naming.project,
      environment: context.naming.environment,
      geography: context.naming.geography,
      instance: context.naming.instance,
      purpose,
    });
  }

  /**
   * Generate a custom resource name with specified resource type.
   *
   * @param context - Synthesis context containing naming parameters
   * @param resourceType - Resource type identifier
   * @param purpose - Optional purpose identifier
   * @returns Azure-compliant resource name
   *
   * @remarks
   * This method provides flexibility for generating names for resource types
   * not explicitly covered by dedicated methods. It uses the underlying
   * ResourceNameGenerator to apply appropriate naming conventions and constraints.
   *
   * @example
   * ```typescript
   * const context: SynthesisContext = {
   *   naming: {
   *     organization: 'dm',
   *     project: 'api',
   *     environment: 'dev',
   *     geography: 'eus',
   *     instance: '01',
   *   },
   *   // ...
   * };
   *
   * // Generate custom resource names
   * const searchName = namingUtil.generateCustomName(context, 'search');
   * const cacheName = namingUtil.generateCustomName(context, 'redis', 'cache');
   * ```
   */
  public generateCustomName(
    context: SynthesisContext,
    resourceType: string,
    purpose?: string
  ): string {
    return this.nameGenerator.generateName({
      resourceType,
      organization: context.naming.organization,
      project: context.naming.project,
      environment: context.naming.environment,
      geography: context.naming.geography,
      instance: context.naming.instance,
      purpose,
    });
  }

  /**
   * Gets the underlying ResourceNameGenerator instance.
   *
   * @returns The ResourceNameGenerator instance
   *
   * @remarks
   * Provides direct access to the underlying generator for advanced scenarios
   * or custom naming requirements not covered by the convenience methods.
   *
   * @example
   * ```typescript
   * const namingUtil = new ResourceNamingUtility();
   * const generator = namingUtil.getGenerator();
   *
   * // Use generator methods directly
   * const pattern = generator.getPattern('storage');
   * const maxLength = generator.getMaxLength('keyvault');
   * ```
   */
  public getGenerator(): ResourceNameGenerator {
    return this.nameGenerator;
  }
}

/**
 * Convenience function to create a ResourceNamingUtility instance.
 *
 * @returns New ResourceNamingUtility instance
 *
 * @example
 * ```typescript
 * import { createNamingUtility } from './naming-utils';
 *
 * const namingUtil = createNamingUtility();
 * const cosmosName = namingUtil.generateCosmosAccountName(context);
 * ```
 */
export function createNamingUtility(): ResourceNamingUtility {
  return new ResourceNamingUtility();
}
