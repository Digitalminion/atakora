import { IConstruct } from '../../core/construct';
import { Resource } from '../../core/resource';
import { TreeTraverser } from './tree-traverser';

/**
 * Scope type for deployment
 */
export enum DeploymentScope {
  SUBSCRIPTION = 'subscription',
  RESOURCE_GROUP = 'resourceGroup',
}

/**
 * Stack information
 */
export interface StackInfo {
  /**
   * Stack name
   */
  name: string;

  /**
   * Stack construct
   */
  construct: IConstruct;

  /**
   * Deployment scope
   */
  scope: DeploymentScope;

  /**
   * Resources in this stack
   */
  resources: Resource[];
}

/**
 * Collects resources and groups them by stack
 */
export class ResourceCollector {
  /**
   * Collect all resources grouped by stack
   *
   * @param constructs - All constructs from tree traversal
   * @param stacks - Map of stack constructs
   * @returns Map of stack name to stack info
   */
  collect(constructs: IConstruct[], stacks: Map<string, IConstruct>): Map<string, StackInfo> {
    const stackInfoMap = new Map<string, StackInfo>();

    // Initialize stack info for each stack
    for (const [stackId, stackConstruct] of stacks.entries()) {
      const scope = this.determineScope(stackConstruct);
      stackInfoMap.set(stackId, {
        name: stackConstruct.node.id,
        construct: stackConstruct,
        scope,
        resources: [],
      });
    }

    // Collect resources and assign to stacks
    for (const construct of constructs) {
      if (this.isResource(construct)) {
        const resource = construct as Resource;
        const stack = TreeTraverser.findStack(construct);

        if (!stack) {
          throw new Error(`Resource ${resource.node.path} is not part of any stack`);
        }

        const stackId = stack.node.path || stack.node.id;
        const stackInfo = stackInfoMap.get(stackId);

        if (!stackInfo) {
          throw new Error(`Stack ${stackId} not found for resource ${resource.node.path}`);
        }

        stackInfo.resources.push(resource);
      }
    }

    return stackInfoMap;
  }

  /**
   * Check if a construct is a Resource
   */
  private isResource(construct: IConstruct): boolean {
    return construct instanceof Resource;
  }

  /**
   * Determine the deployment scope of a stack
   */
  private determineScope(stack: IConstruct): DeploymentScope {
    // Check constructor name or metadata to determine scope
    const constructorName = stack.constructor.name;

    if (constructorName === 'SubscriptionStack') {
      return DeploymentScope.SUBSCRIPTION;
    }

    if (constructorName === 'ResourceGroupStack') {
      return DeploymentScope.RESOURCE_GROUP;
    }

    // Default to resource group
    return DeploymentScope.RESOURCE_GROUP;
  }

  /**
   * Validate that resources are properly organized
   */
  validateResources(stackInfoMap: Map<string, StackInfo>): void {
    for (const [stackId, stackInfo] of stackInfoMap.entries()) {
      // Check for subscription-scoped resources in resource group stacks
      if (stackInfo.scope === DeploymentScope.RESOURCE_GROUP) {
        for (const resource of stackInfo.resources) {
          if (this.isSubscriptionScopedResource(resource.resourceType)) {
            throw new Error(
              `Subscription-scoped resource ${resource.resourceType} cannot be deployed in ResourceGroupStack ${stackId}`
            );
          }
        }
      }
    }
  }

  /**
   * Check if a resource type is subscription-scoped
   */
  private isSubscriptionScopedResource(resourceType: string): boolean {
    const subscriptionScopedTypes = [
      'Microsoft.Resources/resourceGroups',
      'Microsoft.Authorization/policyDefinitions',
      'Microsoft.Authorization/policyAssignments',
      'Microsoft.Management/managementGroups',
    ];

    return subscriptionScopedTypes.includes(resourceType);
  }
}
