import { Construct } from './construct';
import type { SubscriptionStack } from './subscription-stack';
import { DeploymentScope } from './azure/scopes';
/**
 * Interface for Resource Group reference.
 *
 * @remarks
 * Allows resources to reference a resource group without depending on the construct class.
 */
export interface IResourceGroup {
    /**
     * Name of the resource group.
     */
    readonly resourceGroupName: string;
    /**
     * Location of the resource group.
     */
    readonly location: string;
}
/**
 * Props for ResourceGroupStack.
 */
export interface ResourceGroupStackProps {
    /**
     * Resource group to deploy to.
     * Must be created in the parent SubscriptionStack.
     *
     * @remarks
     * This will be a ResourceGroup construct when implemented in Phase 2.
     * For now, accepts any object with resourceGroupName and location.
     */
    readonly resourceGroup: {
        readonly resourceGroupName: string;
        readonly location: string;
    };
    /**
     * Additional tags for resources in this stack.
     */
    readonly tags?: Record<string, string>;
}
/**
 * Stack that deploys to an Azure resource group.
 *
 * @remarks
 * Must be nested within a SubscriptionStack.
 * Deploys most Azure resources (Storage, VNets, App Services, etc.)
 *
 * ResourceGroupStack inherits naming context from its parent SubscriptionStack.
 *
 * @example
 * Basic usage (when ResourceGroup is available in Phase 2):
 * ```typescript
 * // In SubscriptionStack
 * const dataRg = new ResourceGroup(foundation, 'DataRG', {
 *   resourceGroupName: foundation.generateResourceName('rg', 'data'),
 *   location: foundation.location
 * });
 *
 * const dataStack = foundation.addResourceGroupStack('Data', dataRg);
 *
 * // Deploy resources to the RG stack
 * const storage = new StorageAccount(dataStack, 'Storage', {
 *   accountName: dataStack.generateResourceName('storage'),
 *   location: dataStack.location
 * });
 * ```
 *
 * @example
 * For Phase 1b (without ResourceGroup construct):
 * ```typescript
 * const dataStack = new ResourceGroupStack(foundation, 'Data', {
 *   resourceGroup: {
 *     resourceGroupName: 'rg-digital-minion-authr-data-nonprod-eus-00',
 *     location: 'eastus'
 *   }
 * });
 *
 * const storageName = dataStack.generateResourceName('storage');
 * ```
 */
export declare class ResourceGroupStack extends Construct {
    /**
     * Deployment scope (always ResourceGroup).
     */
    readonly scope: DeploymentScope.ResourceGroup;
    /**
     * Resource group name this stack deploys to.
     */
    readonly resourceGroupName: string;
    /**
     * Location inherited from resource group.
     */
    readonly location: string;
    /**
     * Tags merged with parent stack tags.
     */
    readonly tags: Record<string, string>;
    /**
     * Reference to parent subscription stack.
     */
    readonly subscriptionStack: SubscriptionStack;
    /**
     * Creates a new ResourceGroupStack.
     *
     * @param parent - Parent SubscriptionStack
     * @param id - Stack identifier
     * @param props - Stack properties
     */
    constructor(parent: SubscriptionStack, id: string, props: ResourceGroupStackProps);
    /**
     * Generate a resource name for this stack's context.
     *
     * @param resourceType - Azure resource type
     * @param purpose - Optional purpose identifier
     * @returns Generated resource name
     *
     * @remarks
     * Delegates to parent SubscriptionStack for name generation,
     * ensuring consistent naming across the entire stack hierarchy.
     *
     * @example
     * ```typescript
     * const storageName = stack.generateResourceName('storage');
     * // Result: "stdpauthrnonprodeus01"
     * ```
     */
    generateResourceName(resourceType: string, purpose?: string): string;
}
//# sourceMappingURL=resource-group-stack.d.ts.map