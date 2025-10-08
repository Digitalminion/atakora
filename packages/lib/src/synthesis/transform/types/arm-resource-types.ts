/**
 * Strongly-typed ARM template base interfaces and common resource types
 *
 * These types provide the foundation for all ARM resource definitions
 * and ensure correct structure for ARM template generation.
 */

import { ArmResourceId } from './arm-network-types';

/**
 * ARM template parameter types
 */
export type ArmParameterType =
  | 'string'
  | 'int'
  | 'bool'
  | 'object'
  | 'array'
  | 'secureString'
  | 'secureObject';

/**
 * ARM output types
 */
export type ArmOutputType = 'string' | 'int' | 'bool' | 'object' | 'array';

/**
 * ARM parameter definition
 *
 * @example
 * {
 *   type: 'string',
 *   defaultValue: 'myvalue',
 *   metadata: {
 *     description: 'A parameter description'
 *   }
 * }
 */
export interface ArmParameter {
  /**
   * Parameter type
   */
  readonly type: ArmParameterType;

  /**
   * Default value for the parameter
   */
  readonly defaultValue?: unknown;

  /**
   * Allowed values
   *
   * Restricts parameter to specific values
   */
  readonly allowedValues?: readonly unknown[];

  /**
   * Minimum value (for int parameters)
   */
  readonly minValue?: number;

  /**
   * Maximum value (for int parameters)
   */
  readonly maxValue?: number;

  /**
   * Minimum length (for string/array parameters)
   */
  readonly minLength?: number;

  /**
   * Maximum length (for string/array parameters)
   */
  readonly maxLength?: number;

  /**
   * Parameter metadata
   */
  readonly metadata?: {
    /**
     * Parameter description
     */
    readonly description?: string;

    /**
     * Additional metadata properties
     */
    readonly [key: string]: unknown;
  };
}

/**
 * ARM output definition
 *
 * @example
 * {
 *   type: 'string',
 *   value: '[resourceId("Microsoft.Network/virtualNetworks", "myVNet")]',
 *   metadata: {
 *     description: 'Virtual network resource ID'
 *   }
 * }
 */
export interface ArmOutput {
  /**
   * Output type
   */
  readonly type: ArmOutputType;

  /**
   * Output value
   *
   * Can be a literal value or an ARM expression
   */
  readonly value: unknown;

  /**
   * Output metadata
   */
  readonly metadata?: {
    /**
     * Output description
     */
    readonly description?: string;

    /**
     * Additional metadata properties
     */
    readonly [key: string]: unknown;
  };
}

/**
 * ARM resource SKU
 *
 * Used by many resource types to specify pricing tier and capacity
 *
 * @example
 * {
 *   name: 'Standard',
 *   tier: 'Standard',
 *   capacity: 1
 * }
 */
export interface ArmSku {
  /**
   * SKU name
   *
   * Format varies by resource type
   */
  readonly name: string;

  /**
   * SKU tier
   *
   * Common values: Free, Basic, Standard, Premium
   */
  readonly tier?: string;

  /**
   * SKU size
   *
   * Size designation (e.g., S1, S2, P1, P2)
   */
  readonly size?: string;

  /**
   * SKU family
   *
   * Family designation (e.g., C, P, D)
   */
  readonly family?: string;

  /**
   * SKU capacity
   *
   * Number of instances or scale units
   */
  readonly capacity?: number;
}

/**
 * Managed identity configuration
 *
 * Used for Azure AD authentication by the resource
 *
 * @example
 * // System-assigned identity
 * {
 *   type: 'SystemAssigned'
 * }
 *
 * @example
 * // User-assigned identity
 * {
 *   type: 'UserAssigned',
 *   userAssignedIdentities: {
 *     '[resourceId("Microsoft.ManagedIdentity/userAssignedIdentities", "myIdentity")]': {}
 *   }
 * }
 */
export interface ArmManagedIdentity {
  /**
   * Identity type
   *
   * - SystemAssigned: Azure automatically creates and manages the identity
   * - UserAssigned: You create and manage the identity
   * - SystemAssigned,UserAssigned: Both types enabled
   * - None: No managed identity
   */
  readonly type: 'SystemAssigned' | 'UserAssigned' | 'SystemAssigned,UserAssigned' | 'None';

  /**
   * User-assigned identities
   *
   * Required when type includes 'UserAssigned'
   *
   * Key: Resource ID of the user-assigned identity (ARM expression)
   * Value: Empty object (placeholder for Azure-populated properties)
   */
  readonly userAssignedIdentities?: Record<ArmResourceId, Record<string, never>>;
}

/**
 * Base ARM resource interface
 *
 * All ARM resources extend this base interface
 *
 * @example
 * interface MyCustomResource extends ArmResourceBase {
 *   type: 'Microsoft.Custom/resources';
 *   properties: {
 *     customProp: string;
 *   };
 * }
 */
export interface ArmResourceBase {
  /**
   * Resource type
   *
   * Format: 'Microsoft.Provider/resourceType'
   * For child resources: 'Microsoft.Provider/parentType/childType'
   *
   * @example 'Microsoft.Network/virtualNetworks'
   * @example 'Microsoft.Storage/storageAccounts/blobServices/containers'
   */
  readonly type: string;

  /**
   * API version
   *
   * Format: YYYY-MM-DD or YYYY-MM-DD-preview
   *
   * @example '2023-04-01'
   * @example '2023-01-01-preview'
   */
  readonly apiVersion: string;

  /**
   * Resource name
   *
   * For child resources, use format: 'parent/child'
   *
   * Constraints vary by resource type (see specific resource interfaces)
   *
   * @example 'myVirtualNetwork'
   * @example 'storageAccount/default/container' (for child resources)
   */
  readonly name: string;

  /**
   * Azure region
   *
   * Some resources are global and don't require location
   *
   * @example 'eastus'
   * @example 'westeurope'
   * @example 'global'
   */
  readonly location?: string;

  /**
   * Resource tags
   *
   * Key-value pairs for organizing and categorizing resources
   *
   * Tag constraints:
   * - Maximum 50 tags per resource
   * - Tag name: 1-512 characters
   * - Tag value: 0-256 characters
   * - Case-insensitive keys, case-sensitive values
   *
   * @example
   * {
   *   environment: 'production',
   *   costCenter: 'engineering',
   *   owner: 'team@example.com'
   * }
   */
  readonly tags?: Record<string, string>;

  /**
   * Resource dependencies
   *
   * Array of ARM resource ID expressions that must be deployed before this resource
   *
   * Format: Each dependency must be a resourceId() ARM expression
   *
   * @example
   * [
   *   "[resourceId('Microsoft.Network/networkSecurityGroups', 'myNSG')]",
   *   "[resourceId('Microsoft.Network/routeTables', 'myRouteTable')]"
   * ]
   */
  readonly dependsOn?: readonly ArmResourceId[];

  /**
   * Resource properties
   *
   * Specific properties vary by resource type
   */
  readonly properties?: Record<string, unknown>;

  /**
   * Resource SKU
   *
   * Pricing tier and capacity configuration
   * Not all resource types support SKU
   */
  readonly sku?: ArmSku;

  /**
   * Resource kind
   *
   * Subtype or variant of the resource
   * Not all resource types support kind
   *
   * @example 'StorageV2' (for storage accounts)
   * @example 'FunctionApp' (for app services)
   */
  readonly kind?: string;

  /**
   * Managed identity configuration
   *
   * Not all resource types support managed identity
   */
  readonly identity?: ArmManagedIdentity;

  /**
   * Resource zones
   *
   * Availability zones for zone-redundant resources
   *
   * @example ['1', '2', '3']
   */
  readonly zones?: readonly string[];

  /**
   * Extended location
   *
   * Used for Edge Zones and other extended location types
   */
  readonly extendedLocation?: {
    readonly name: string;
    readonly type: 'EdgeZone' | string;
  };

  /**
   * Resource plan
   *
   * Used for Marketplace resources
   */
  readonly plan?: {
    readonly name: string;
    readonly publisher: string;
    readonly product: string;
    readonly promotionCode?: string;
    readonly version?: string;
  };

  /**
   * Resource comments
   *
   * Human-readable comments about the resource
   * Ignored by Azure Resource Manager
   */
  readonly comments?: string;

  /**
   * Copy iteration
   *
   * Used to create multiple instances of a resource
   */
  readonly copy?: {
    readonly name: string;
    readonly count: number | string;
    readonly mode?: 'Serial' | 'Parallel';
    readonly batchSize?: number;
  };

  /**
   * Resource condition
   *
   * ARM expression that determines whether to deploy the resource
   *
   * @example "[equals(parameters('deployVNet'), 'true')]"
   */
  readonly condition?: string;
}

/**
 * ARM template structure
 *
 * Top-level ARM template that contains all deployment resources
 *
 * @example
 * const template: ArmTemplateDocument = {
 *   $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
 *   contentVersion: '1.0.0.0',
 *   parameters: {
 *     location: {
 *       type: 'string',
 *       defaultValue: 'eastus'
 *     }
 *   },
 *   resources: [
 *     {
 *       type: 'Microsoft.Network/virtualNetworks',
 *       apiVersion: '2023-04-01',
 *       name: 'myVNet',
 *       location: '[parameters("location")]',
 *       properties: {
 *         addressSpace: {
 *           addressPrefixes: ['10.0.0.0/16']
 *         }
 *       }
 *     }
 *   ],
 *   outputs: {
 *     vnetId: {
 *       type: 'string',
 *       value: '[resourceId("Microsoft.Network/virtualNetworks", "myVNet")]'
 *     }
 *   }
 * };
 */
export interface ArmTemplateDocument {
  /**
   * JSON schema reference
   *
   * Standard value:
   * 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#'
   */
  readonly $schema: string;

  /**
   * Content version
   *
   * Format: Major.Minor.Build.Revision
   *
   * @default '1.0.0.0'
   */
  readonly contentVersion: string;

  /**
   * Template metadata
   */
  readonly metadata?: {
    /**
     * Template description
     */
    readonly description?: string;

    /**
     * Template author
     */
    readonly author?: string;

    /**
     * Additional metadata
     */
    readonly [key: string]: unknown;
  };

  /**
   * Template parameters
   *
   * Input values that can be specified at deployment time
   */
  readonly parameters?: Record<string, ArmParameter>;

  /**
   * Template variables
   *
   * Computed values used within the template
   */
  readonly variables?: Record<string, unknown>;

  /**
   * Template functions
   *
   * Custom template functions (rarely used)
   */
  readonly functions?: readonly {
    readonly namespace: string;
    readonly members: Record<string, unknown>;
  }[];

  /**
   * Resources to deploy
   *
   * Array of Azure resources to create/update
   */
  readonly resources: readonly ArmResourceBase[];

  /**
   * Template outputs
   *
   * Values to return after deployment
   */
  readonly outputs?: Record<string, ArmOutput>;
}

/**
 * Deployment scope levels
 */
export type ArmDeploymentScope =
  | 'resourceGroup'
  | 'subscription'
  | 'managementGroup'
  | 'tenant';

/**
 * Common Azure regions
 */
export const AZURE_REGIONS = [
  // Americas
  'eastus',
  'eastus2',
  'southcentralus',
  'westus2',
  'westus3',
  'centralus',
  'northcentralus',
  'westcentralus',
  'westus',
  'canadacentral',
  'canadaeast',
  'brazilsouth',
  'brazilsoutheast',

  // Europe
  'northeurope',
  'westeurope',
  'uksouth',
  'ukwest',
  'francecentral',
  'francesouth',
  'germanywestcentral',
  'germanynorth',
  'norwayeast',
  'norwaywest',
  'swedencentral',
  'switzerlandnorth',
  'switzerlandwest',

  // Asia Pacific
  'southeastasia',
  'eastasia',
  'australiaeast',
  'australiasoutheast',
  'australiacentral',
  'australiacentral2',
  'japaneast',
  'japanwest',
  'koreacentral',
  'koreasouth',
  'centralindia',
  'southindia',
  'westindia',

  // Middle East & Africa
  'uaenorth',
  'uaecentral',
  'southafricanorth',
  'southafricawest',
  'qatarcentral',

  // Government
  'usgovvirginia',
  'usgovtexas',
  'usgovarizona',
  'usgovwyoming',
  'usdodeast',
  'usdodcentral',

  // China
  'chinanorth',
  'chinaeast',
  'chinanorth2',
  'chinaeast2',
  'chinanorth3',
] as const;

/**
 * Azure region type
 */
export type AzureRegion = (typeof AZURE_REGIONS)[number];

/**
 * Resource group configuration
 *
 * Note: Resource groups are not deployed via ARM templates,
 * but this interface is useful for representing RG metadata
 */
export interface ResourceGroupConfig {
  /**
   * Resource group name
   *
   * Constraints:
   * - Length: 1-90 characters
   * - Pattern: alphanumerics, periods, underscores, hyphens, parentheses
   * - Cannot end with period
   */
  readonly name: string;

  /**
   * Azure region
   */
  readonly location: AzureRegion | string;

  /**
   * Resource group tags
   */
  readonly tags?: Record<string, string>;
}

/**
 * Common API versions for Azure resource types
 *
 * These are the latest stable API versions as of template generation
 */
export const COMMON_API_VERSIONS = {
  'Microsoft.Network/virtualNetworks': '2023-04-01',
  'Microsoft.Network/networkSecurityGroups': '2023-04-01',
  'Microsoft.Network/publicIPAddresses': '2023-04-01',
  'Microsoft.Network/loadBalancers': '2023-04-01',
  'Microsoft.Network/networkInterfaces': '2023-04-01',
  'Microsoft.Network/routeTables': '2023-04-01',
  'Microsoft.Network/natGateways': '2023-04-01',
  'Microsoft.Storage/storageAccounts': '2023-01-01',
  'Microsoft.Compute/virtualMachines': '2023-03-01',
  'Microsoft.Compute/availabilitySets': '2023-03-01',
  'Microsoft.Compute/virtualMachineScaleSets': '2023-03-01',
  'Microsoft.KeyVault/vaults': '2023-02-01',
  'Microsoft.Resources/deployments': '2022-09-01',
  'Microsoft.Authorization/roleAssignments': '2022-04-01',
  'Microsoft.ManagedIdentity/userAssignedIdentities': '2023-01-31',
  'Microsoft.ContainerRegistry/registries': '2023-01-01-preview',
  'Microsoft.ContainerService/managedClusters': '2023-05-01',
  'Microsoft.Web/serverfarms': '2022-09-01',
  'Microsoft.Web/sites': '2022-09-01',
  'Microsoft.Sql/servers': '2022-05-01-preview',
  'Microsoft.DBforPostgreSQL/flexibleServers': '2022-12-01',
  'Microsoft.DBforMySQL/flexibleServers': '2022-01-01',
} as const;
