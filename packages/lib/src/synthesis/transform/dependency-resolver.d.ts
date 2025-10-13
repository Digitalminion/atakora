import { ArmResource } from '../types';
import { Resource } from '../../core/resource';
/**
 * Resolves resource dependencies and detects cycles
 */
export declare class DependencyResolver {
    private nodes;
    /**
     * Resolve dependencies for resources
     *
     * @param resources - ARM resources to analyze
     * @param constructs - Original construct resources for dependency analysis
     * @returns Resources with dependsOn fields populated
     */
    resolve(resources: ArmResource[], constructs: Resource[]): ArmResource[];
    /**
     * Build dependency graph from resources
     */
    private buildGraph;
    /**
     * Detect dependencies by analyzing resource properties
     */
    private detectDependencies;
    /**
     * Extract parent resource type from a child resource type
     *
     * @remarks
     * For hierarchical resource types like "Microsoft.Network/virtualNetworks/subnets",
     * this returns the parent type "Microsoft.Network/virtualNetworks"
     *
     * @param resourceType - Full resource type string
     * @returns Parent resource type or null if no parent
     */
    private getParentResourceType;
    /**
     * Extract parent resource name from a child resource name
     *
     * @remarks
     * For child resources with names like "vnet-name/subnet-name",
     * this returns "vnet-name"
     *
     * @param resourceName - Full resource name string
     * @returns Parent resource name or null if no parent
     */
    private getParentResourceName;
    /**
     * Extract explicit dependencies from construct
     */
    private extractExplicitDependencies;
    /**
     * Detect circular dependencies using DFS
     */
    private detectCycles;
    /**
     * Recursive cycle detection
     */
    private detectCyclesRecursive;
    /**
     * Add dependsOn fields to resources
     *
     * @remarks
     * Filters out invalid subnet resource dependencies when using inline subnets.
     * When subnets are defined inline within VNets, separate subnet resources don't exist,
     * so dependencies on them must be removed.
     */
    private addDependsOn;
    /**
     * Generate ARM resourceId expression for a resource
     *
     * @remarks
     * Handles both regular and child resources:
     * - Regular: [resourceId('Microsoft.Storage/storageAccounts', 'myaccount')]
     * - Child: [resourceId('Microsoft.Network/virtualNetworks/subnets', 'vnet-name', 'subnet-name')]
     */
    private generateResourceIdExpression;
    /**
     * Perform topological sort of resources
     */
    topologicalSort(resources: ArmResource[]): ArmResource[];
    /**
     * Get unique identifier for a resource
     */
    private getResourceIdentifier;
}
//# sourceMappingURL=dependency-resolver.d.ts.map