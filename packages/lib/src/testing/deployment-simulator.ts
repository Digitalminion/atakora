/**
 * Deployment simulator for validating timing and dependency issues.
 *
 * @remarks
 * This simulator checks for deployment issues that occur at runtime,
 * such as network lockdown before private endpoints are available.
 *
 * @packageDocumentation
 */

import { ArmTemplate, ArmResource, ValidationError, ValidationSeverity } from '../synthesis/types';

/**
 * Deployment simulation result
 */
export interface DeploymentSimulationResult {
  /**
   * Whether the deployment would succeed
   */
  success: boolean;

  /**
   * Validation errors found during simulation
   */
  errors: ValidationError[];

  /**
   * Warnings about potential issues
   */
  warnings: ValidationError[];

  /**
   * Simulated deployment order
   */
  deploymentOrder: string[];

  /**
   * Resources that would timeout during deployment
   */
  timeoutRisks: string[];
}

/**
 * Resource deployment state
 */
interface ResourceState {
  resourceId: string;
  type: string;
  name: string;
  deployed: boolean;
  dependencies: string[];
  publiclyAccessible: boolean;
}

/**
 * Deployment simulator for checking timing and dependency issues
 */
export class DeploymentSimulator {
  private errors: ValidationError[] = [];
  private warnings: ValidationError[] = [];
  private timeoutRisks: string[] = [];

  /**
   * Simulate deployment of an ARM template
   *
   * @param template - ARM template to simulate
   * @returns Simulation result with errors and warnings
   */
  simulate(template: ArmTemplate): DeploymentSimulationResult {
    this.errors = [];
    this.warnings = [];
    this.timeoutRisks = [];

    // Build resource states
    const resourceStates = this.buildResourceStates(template.resources);

    // Simulate deployment order
    const deploymentOrder = this.calculateDeploymentOrder(resourceStates);

    // Check for network lockdown issues
    this.checkNetworkLockdownIssues(resourceStates, deploymentOrder);

    // Check for circular dependencies
    this.checkCircularDependencies(resourceStates);

    // Check for missing dependencies
    this.checkMissingDependencies(resourceStates, template.resources);

    return {
      success: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      deploymentOrder,
      timeoutRisks: this.timeoutRisks,
    };
  }

  /**
   * Build resource states from ARM resources
   */
  private buildResourceStates(resources: ArmResource[]): Map<string, ResourceState> {
    const states = new Map<string, ResourceState>();

    for (const resource of resources) {
      const resourceId = this.getResourceId(resource);
      const publiclyAccessible = this.isPubliclyAccessible(resource);

      states.set(resourceId, {
        resourceId,
        type: resource.type,
        name: this.getResourceName(resource),
        deployed: false,
        dependencies: resource.dependsOn || [],
        publiclyAccessible,
      });
    }

    return states;
  }

  /**
   * Calculate deployment order based on dependencies
   */
  private calculateDeploymentOrder(states: Map<string, ResourceState>): string[] {
    const order: string[] = [];
    const deployed = new Set<string>();

    // Simple topological sort
    const canDeploy = (state: ResourceState): boolean => {
      return state.dependencies.every((dep) => {
        // Check if dependency is already deployed
        return deployed.has(dep) || !this.extractResourceName(dep);
      });
    };

    let changed = true;
    while (changed && deployed.size < states.size) {
      changed = false;

      for (const [resourceId, state] of states) {
        if (!deployed.has(resourceId) && canDeploy(state)) {
          order.push(resourceId);
          deployed.add(resourceId);
          changed = true;
        }
      }
    }

    return order;
  }

  /**
   * Check for network lockdown issues
   *
   * @remarks
   * Detects scenarios where a service has public network access disabled
   * before a private endpoint is available, causing deployment timeouts.
   */
  private checkNetworkLockdownIssues(
    states: Map<string, ResourceState>,
    deploymentOrder: string[]
  ): void {
    for (const resourceId of deploymentOrder) {
      const state = states.get(resourceId);
      if (!state) continue;

      // Check if this is a service with network restrictions
      if (this.hasNetworkRestrictions(state) && !state.publiclyAccessible) {
        // Check if a private endpoint is deployed before this resource
        const hasPrivateEndpointDependency = this.hasPrivateEndpointDependency(
          state,
          states,
          deploymentOrder
        );

        if (!hasPrivateEndpointDependency) {
          this.errors.push({
            severity: ValidationSeverity.ERROR,
            message: `Resource "${state.name}" has public network access disabled but no private endpoint dependency`,
            path: resourceId,
            code: 'NETWORK_LOCKDOWN_WITHOUT_ENDPOINT',
            suggestion:
              'Enable public access during deployment, then lock down post-deployment using a separate update. ' +
              'Or ensure private endpoint is created first with explicit dependency.',
          });

          this.timeoutRisks.push(resourceId);
        }
      }
    }
  }

  /**
   * Check if resource has network restrictions
   */
  private hasNetworkRestrictions(state: ResourceState): boolean {
    const networkRestrictedTypes = [
      'Microsoft.Storage/storageAccounts',
      'Microsoft.CognitiveServices/accounts',
      'Microsoft.DBforPostgreSQL/flexibleServers',
      'Microsoft.DBforMySQL/flexibleServers',
      'Microsoft.KeyVault/vaults',
    ];

    return networkRestrictedTypes.includes(state.type);
  }

  /**
   * Check if resource has a private endpoint dependency
   */
  private hasPrivateEndpointDependency(
    state: ResourceState,
    allStates: Map<string, ResourceState>,
    deploymentOrder: string[]
  ): boolean {
    // Check explicit dependencies
    for (const dep of state.dependencies) {
      const depState = this.findResourceByPartialId(dep, allStates);
      if (depState && depState.type === 'Microsoft.Network/privateEndpoints') {
        return true;
      }
    }

    // Check if a private endpoint is deployed before this resource
    const resourceIndex = deploymentOrder.indexOf(state.resourceId);
    for (let i = 0; i < resourceIndex; i++) {
      const priorState = allStates.get(deploymentOrder[i]);
      if (priorState && priorState.type === 'Microsoft.Network/privateEndpoints') {
        // Check if this private endpoint targets our resource
        // In real implementation, would check privateLinkServiceConnections
        return true;
      }
    }

    return false;
  }

  /**
   * Check for circular dependencies
   */
  private checkCircularDependencies(states: Map<string, ResourceState>): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const detectCycle = (resourceId: string, path: string[]): boolean => {
      if (recursionStack.has(resourceId)) {
        this.errors.push({
          severity: ValidationSeverity.ERROR,
          message: `Circular dependency detected: ${path.join(' -> ')} -> ${resourceId}`,
          path: resourceId,
          code: 'CIRCULAR_DEPENDENCY',
          suggestion: 'Remove or restructure dependencies to eliminate the cycle',
        });
        return true;
      }

      if (visited.has(resourceId)) {
        return false;
      }

      visited.add(resourceId);
      recursionStack.add(resourceId);

      const state = states.get(resourceId);
      if (state) {
        for (const dep of state.dependencies) {
          const depState = this.findResourceByPartialId(dep, states);
          if (depState && detectCycle(depState.resourceId, [...path, resourceId])) {
            return true;
          }
        }
      }

      recursionStack.delete(resourceId);
      return false;
    };

    for (const resourceId of states.keys()) {
      if (!visited.has(resourceId)) {
        detectCycle(resourceId, []);
      }
    }
  }

  /**
   * Check for missing dependencies
   */
  private checkMissingDependencies(
    states: Map<string, ResourceState>,
    resources: ArmResource[]
  ): void {
    for (const resource of resources) {
      const deps = resource.dependsOn || [];

      for (const dep of deps) {
        const depName = this.extractResourceName(dep);
        if (depName) {
          const found = this.findResourceByPartialId(dep, states);

          if (!found) {
            this.warnings.push({
              severity: ValidationSeverity.WARNING,
              message: `Resource "${this.getResourceName(resource)}" depends on "${depName}" which is not found in template`,
              path: this.getResourceId(resource),
              code: 'MISSING_DEPENDENCY',
              suggestion: 'Ensure all dependencies are included in the template',
            });
          }
        }
      }
    }
  }

  /**
   * Check if resource is publicly accessible
   */
  private isPubliclyAccessible(resource: ArmResource): boolean {
    const props = resource.properties || {};

    // Check publicNetworkAccess property
    if ('publicNetworkAccess' in props) {
      return props.publicNetworkAccess !== 'Disabled';
    }

    // Check networkAcls
    if ('networkAcls' in props && props.networkAcls) {
      return props.networkAcls.defaultAction !== 'Deny';
    }

    // Default to publicly accessible
    return true;
  }

  /**
   * Get resource ID
   */
  private getResourceId(resource: ArmResource): string {
    return `${resource.type}/${this.getResourceName(resource)}`;
  }

  /**
   * Get resource name (handle ARM expressions)
   */
  private getResourceName(resource: ArmResource): string {
    if (typeof resource.name === 'string') {
      // Remove ARM expression brackets if present
      return resource.name.replace(/^\[|\]$/g, '');
    }
    return 'unknown';
  }

  /**
   * Extract resource name from dependency string
   */
  private extractResourceName(dependency: string): string | null {
    // Handle resourceId() function calls
    const match = dependency.match(/resourceId\([^,]+,\s*['"]([^'"]+)['"]/);
    if (match) {
      return match[1];
    }

    // Handle direct references
    const parts = dependency.split('/');
    return parts[parts.length - 1] || null;
  }

  /**
   * Find resource by partial ID match
   */
  private findResourceByPartialId(
    partialId: string,
    states: Map<string, ResourceState>
  ): ResourceState | undefined {
    const searchName = this.extractResourceName(partialId);
    if (!searchName) return undefined;

    for (const state of states.values()) {
      if (state.name === searchName || state.resourceId.includes(searchName)) {
        return state;
      }
    }

    return undefined;
  }
}
