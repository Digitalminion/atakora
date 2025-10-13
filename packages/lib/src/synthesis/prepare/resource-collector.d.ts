import { IConstruct } from '../../core/construct';
import { Resource } from '../../core/resource';
/**
 * Deployment scope for ARM templates.
 *
 * @remarks
 * Defines where an ARM template will be deployed in the Azure hierarchy.
 * Each scope has different capabilities and allowed resource types.
 *
 * @see {@link https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/deploy-to-subscription}
 */
export declare enum DeploymentScope {
    /**
     * Subscription-level deployment.
     * Can create resource groups and subscription-scoped resources.
     */
    SUBSCRIPTION = "subscription",
    /**
     * Resource group-level deployment.
     * Can create most Azure resources within an existing resource group.
     */
    RESOURCE_GROUP = "resourceGroup"
}
/**
 * Metadata about a stack and its resources.
 *
 * @remarks
 * Contains everything needed to transform a stack to an ARM template:
 * - Stack identity and deployment scope
 * - All resources contained in the stack
 * - Reference to the stack construct for accessing properties
 */
export interface StackInfo {
    /**
     * Stack name (used for template file naming).
     *
     * @example "Foundation", "Data", "Networking"
     */
    name: string;
    /**
     * Stack construct instance.
     *
     * @remarks
     * Reference to the original stack construct (SubscriptionStack or ResourceGroupStack).
     * Used to access stack properties like location, tags, subscription ID, etc.
     */
    construct: IConstruct;
    /**
     * Deployment scope for this stack.
     *
     * @remarks
     * Determines which ARM template schema to use and which resource types are allowed.
     * - **SUBSCRIPTION**: Can create resource groups and subscription-level resources
     * - **RESOURCE_GROUP**: Can create most Azure resources within a resource group
     */
    scope: DeploymentScope;
    /**
     * All resources contained in this stack.
     *
     * @remarks
     * Resources are collected during tree traversal. Each resource will be transformed
     * to ARM JSON during the transform phase.
     *
     * Resources are NOT sorted yet - dependency resolution and sorting happens in the
     * transform phase.
     */
    resources: Resource[];
}
/**
 * Collects resources from the construct tree and groups them by stack.
 *
 * @remarks
 * The ResourceCollector is part of the synthesis preparation phase. It takes the
 * flat list of constructs from tree traversal and organizes them into a structured
 * format suitable for ARM template generation.
 *
 * **Collection Process**:
 * 1. **Initialize Stacks**: Creates StackInfo for each discovered stack
 * 2. **Collect Resources**: Identifies Resource constructs and assigns them to stacks
 * 3. **Validate Organization**: Ensures resources are in appropriate stacks for their scope
 *
 * **Stack Assignment**:
 * Resources are assigned to stacks by walking up the construct tree to find the
 * closest ancestor stack. This uses {@link TreeTraverser.findStack}.
 *
 * **Scope Validation**:
 * Validates that subscription-scoped resources (like resource groups) are not
 * deployed in resource group stacks. This prevents deployment errors.
 *
 * **Error Handling**:
 * - Throws if a resource is not part of any stack
 * - Throws if a subscription-scoped resource is in a resource group stack
 * - Provides clear error messages with construct paths
 *
 * @example
 * Basic usage:
 * ```typescript
 * const traverser = new TreeTraverser();
 * const traversalResult = traverser.traverse(app);
 *
 * const collector = new ResourceCollector();
 * const stackInfoMap = collector.collect(
 *   traversalResult.constructs,
 *   traversalResult.stacks
 * );
 *
 * // Validate resource organization
 * collector.validateResources(stackInfoMap);
 *
 * // Now have resources grouped by stack
 * for (const [stackId, stackInfo] of stackInfoMap.entries()) {
 *   console.log(`Stack: ${stackInfo.name}`);
 *   console.log(`  Scope: ${stackInfo.scope}`);
 *   console.log(`  Resources: ${stackInfo.resources.length}`);
 * }
 * ```
 *
 * @see {@link TreeTraverser} for construct tree traversal
 * @see {@link ResourceTransformer} for next phase (transform to ARM JSON)
 */
export declare class ResourceCollector {
    /**
     * Collect all resources grouped by stack
     *
     * @param constructs - All constructs from tree traversal
     * @param stacks - Map of stack constructs
     * @returns Map of stack name to stack info
     */
    collect(constructs: IConstruct[], stacks: Map<string, IConstruct>): Map<string, StackInfo>;
    /**
     * Check if a construct is a Resource
     */
    private isResource;
    /**
     * Determine the deployment scope of a stack
     */
    private determineScope;
    /**
     * Validate that resources are properly organized
     */
    validateResources(stackInfoMap: Map<string, StackInfo>): void;
    /**
     * Check if a resource type is subscription-scoped
     */
    private isSubscriptionScopedResource;
}
//# sourceMappingURL=resource-collector.d.ts.map