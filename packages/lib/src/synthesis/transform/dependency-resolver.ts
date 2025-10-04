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

      // Check for existing dependsOn
      if (resource.dependsOn?.includes(otherResource.name)) {
        dependencies.add(otherId);
      }
    }

    return dependencies;
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
        return resource;
      }

      // Convert dependency IDs to resource names
      const dependsOn = Array.from(node.dependencies).map((depId) => {
        const depNode = this.nodes.get(depId);
        if (!depNode) return depId;
        return `[resourceId('${depNode.resource.type}', '${depNode.resource.name}')]`;
      });

      return {
        ...resource,
        dependsOn,
      };
    });
  }

  /**
   * Perform topological sort of resources
   */
  topologicalSort(resources: ArmResource[]): ArmResource[] {
    const sorted: ArmResource[] = [];
    const visited = new Set<string>();

    const visit = (resourceId: string): void => {
      if (visited.has(resourceId)) return;

      const node = this.nodes.get(resourceId);
      if (!node) return;

      // Visit dependencies first
      for (const depId of node.dependencies) {
        visit(depId);
      }

      visited.add(resourceId);
      sorted.push(node.resource);
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
