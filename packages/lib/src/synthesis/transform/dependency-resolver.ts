import { ArmResource } from '../types';
import { Resource } from '../../core/resource';

/**
 * Dependency graph node
 */
interface DependencyNode {
  resource: ArmResource;
  dependencies: Set<string>;
  dependents: Set<string>;
}

/**
 * Resolves resource dependencies and detects cycles
 */
export class DependencyResolver {
  private nodes = new Map<string, DependencyNode>();

  /**
   * Resolve dependencies for resources
   *
   * @param resources - ARM resources to analyze
   * @param constructs - Original construct resources for dependency analysis
   * @returns Resources with dependsOn fields populated
   */
  resolve(resources: ArmResource[], constructs: Resource[]): ArmResource[] {
    // Build dependency graph
    this.buildGraph(resources, constructs);

    // Detect cycles
    this.detectCycles();

    // Add dependsOn fields to resources
    return this.addDependsOn(resources);
  }

  /**
   * Build dependency graph from resources
   */
  private buildGraph(resources: ArmResource[], constructs: Resource[]): void {
    this.nodes.clear();

    // Initialize nodes
    for (const resource of resources) {
      const resourceId = this.getResourceIdentifier(resource);
      this.nodes.set(resourceId, {
        resource,
        dependencies: new Set(),
        dependents: new Set(),
      });
    }

    // Detect dependencies
    for (let i = 0; i < resources.length; i++) {
      const resource = resources[i];
      const construct = constructs[i];
      const resourceId = this.getResourceIdentifier(resource);
      const node = this.nodes.get(resourceId)!;

      // Auto-detect dependencies from resource properties
      const detectedDeps = this.detectDependencies(resource, resources);
      for (const dep of detectedDeps) {
        node.dependencies.add(dep);
        const depNode = this.nodes.get(dep);
        if (depNode) {
          depNode.dependents.add(resourceId);
        }
      }

      // Check for explicit dependencies in construct metadata
      const explicitDeps = this.extractExplicitDependencies(construct, resources);
      for (const dep of explicitDeps) {
        node.dependencies.add(dep);
        const depNode = this.nodes.get(dep);
        if (depNode) {
          depNode.dependents.add(resourceId);
        }
      }
    }
  }

  /**
   * Detect dependencies by analyzing resource properties
   */
  private detectDependencies(
    resource: ArmResource,
    allResources: ArmResource[]
  ): Set<string> {
    const dependencies = new Set<string>();

    // Check for resource ID references in properties
    const propertiesStr = JSON.stringify(resource.properties || {});

    for (const otherResource of allResources) {
      if (otherResource === resource) continue;

      const otherId = this.getResourceIdentifier(otherResource);

      // Look for references to other resources
      if (propertiesStr.includes(otherResource.name)) {
        dependencies.add(otherId);
      }

      // Check for parent-child relationships based on resource type
      // Child resources must depend on their parent
      const parentType = this.getParentResourceType(resource.type);
      if (parentType && otherResource.type === parentType) {
        // Check if the parent resource name matches the child's parent name
        const parentName = this.getParentResourceName(resource.name);
        if (parentName && otherResource.name === parentName) {
          dependencies.add(otherId);
        }
      }

      // Check for subnet dependencies (VMs depend on subnets)
      if (
        resource.type === 'Microsoft.Compute/virtualMachines' &&
        otherResource.type === 'Microsoft.Network/virtualNetworks/subnets'
      ) {
        dependencies.add(otherId);
      }

      // Check for network interface dependencies
      if (
        resource.type === 'Microsoft.Compute/virtualMachines' &&
        otherResource.type === 'Microsoft.Network/networkInterfaces'
      ) {
        dependencies.add(otherId);
      }

      // Check for App Service Plan dependencies
      if (
        resource.type === 'Microsoft.Web/sites' &&
        otherResource.type === 'Microsoft.Web/serverfarms'
      ) {
        // App Service always depends on its App Service Plan
        dependencies.add(otherId);
      }
    }

    return dependencies;
  }

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
  private getParentResourceType(resourceType: string): string | null {
    const parts = resourceType.split('/');

    // Parent-child resources have at least 3 parts: provider/parentType/childType
    if (parts.length < 3) {
      return null;
    }

    // Return parent type (provider/parentType)
    return parts.slice(0, -1).join('/');
  }

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
  private getParentResourceName(resourceName: string): string | null {
    const parts = resourceName.split('/');

    // Parent-child resources have at least 2 parts: parentName/childName
    if (parts.length < 2) {
      return null;
    }

    // Return parent name (everything before the last slash)
    return parts.slice(0, -1).join('/');
  }

  /**
   * Extract explicit dependencies from construct
   */
  private extractExplicitDependencies(
    construct: Resource,
    allResources: ArmResource[]
  ): Set<string> {
    const dependencies = new Set<string>();

    // Check construct node for dependencies
    const node = construct.node;
    if (node.dependencies) {
      for (const dep of node.dependencies) {
        if (dep instanceof Resource) {
          // Find corresponding ARM resource
          const armResource = allResources.find((r) => r.name === dep.name);
          if (armResource) {
            dependencies.add(this.getResourceIdentifier(armResource));
          }
        }
      }
    }

    return dependencies;
  }

  /**
   * Detect circular dependencies using DFS
   */
  private detectCycles(): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    for (const [nodeId] of this.nodes) {
      if (!visited.has(nodeId)) {
        this.detectCyclesRecursive(nodeId, visited, recursionStack, []);
      }
    }
  }

  /**
   * Recursive cycle detection
   */
  private detectCyclesRecursive(
    nodeId: string,
    visited: Set<string>,
    recursionStack: Set<string>,
    path: string[]
  ): void {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const node = this.nodes.get(nodeId);
    if (!node) return;

    for (const depId of node.dependencies) {
      if (!visited.has(depId)) {
        this.detectCyclesRecursive(depId, visited, recursionStack, [...path]);
      } else if (recursionStack.has(depId)) {
        // Cycle detected
        const cycleStart = path.indexOf(depId);
        const cycle = [...path.slice(cycleStart), depId];
        throw new Error(
          `Circular dependency detected: ${cycle.join(' → ')}`
        );
      }
    }

    recursionStack.delete(nodeId);
  }

  /**
   * Add dependsOn fields to resources
   */
  private addDependsOn(resources: ArmResource[]): ArmResource[] {
    return resources.map((resource) => {
      const resourceId = this.getResourceIdentifier(resource);
      const node = this.nodes.get(resourceId);

      if (!node || node.dependencies.size === 0) {
        // Remove any existing dependsOn from resource template
        const { dependsOn, ...resourceWithoutDependsOn } = resource;
        return resourceWithoutDependsOn;
      }

      // Convert dependency IDs to resourceId expressions
      const dependsOn = Array.from(node.dependencies).map((depId) => {
        const depNode = this.nodes.get(depId);
        if (!depNode) return depId;

        return this.generateResourceIdExpression(depNode.resource);
      });

      return {
        ...resource,
        dependsOn,
      };
    });
  }

  /**
   * Generate ARM resourceId expression for a resource
   *
   * @remarks
   * Handles both regular and child resources:
   * - Regular: [resourceId('Microsoft.Storage/storageAccounts', 'myaccount')]
   * - Child: [resourceId('Microsoft.Network/virtualNetworks/subnets', 'vnet-name', 'subnet-name')]
   */
  private generateResourceIdExpression(resource: ArmResource): string {
    const nameParts = resource.name.split('/');

    if (nameParts.length === 1) {
      // Simple resource: [resourceId('type', 'name')]
      return `[resourceId('${resource.type}', '${resource.name}')]`;
    }

    // Child resource: [resourceId('type', 'parent-name', 'child-name', ...)]
    const nameArgs = nameParts.map(part => `'${part}'`).join(', ');
    return `[resourceId('${resource.type}', ${nameArgs})]`;
  }

  /**
   * Perform topological sort of resources
   */
  topologicalSort(resources: ArmResource[]): ArmResource[] {
    const sorted: ArmResource[] = [];
    const visited = new Set<string>();

    // Create a map of resource ID to resource object (with updated dependsOn)
    const resourceMap = new Map<string, ArmResource>();
    for (const resource of resources) {
      resourceMap.set(this.getResourceIdentifier(resource), resource);
    }

    const visit = (resourceId: string): void => {
      if (visited.has(resourceId)) return;

      const node = this.nodes.get(resourceId);
      if (!node) return;

      // Visit dependencies first
      for (const depId of node.dependencies) {
        visit(depId);
      }

      visited.add(resourceId);
      // Use the updated resource from the map, not the original from the node
      const updatedResource = resourceMap.get(resourceId) || node.resource;
      sorted.push(updatedResource);
    };

    for (const resource of resources) {
      visit(this.getResourceIdentifier(resource));
    }

    return sorted;
  }

  /**
   * Get unique identifier for a resource
   */
  private getResourceIdentifier(resource: ArmResource): string {
    return `${resource.type}/${resource.name}`;
  }
}
