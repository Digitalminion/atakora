"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceCollector = exports.DeploymentScope = void 0;
var resource_1 = require("../../core/resource");
var tree_traverser_1 = require("./tree-traverser");
/**
 * Deployment scope for ARM templates.
 *
 * @remarks
 * Defines where an ARM template will be deployed in the Azure hierarchy.
 * Each scope has different capabilities and allowed resource types.
 *
 * @see {@link https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/deploy-to-subscription}
 */
var DeploymentScope;
(function (DeploymentScope) {
    /**
     * Subscription-level deployment.
     * Can create resource groups and subscription-scoped resources.
     */
    DeploymentScope["SUBSCRIPTION"] = "subscription";
    /**
     * Resource group-level deployment.
     * Can create most Azure resources within an existing resource group.
     */
    DeploymentScope["RESOURCE_GROUP"] = "resourceGroup";
})(DeploymentScope || (exports.DeploymentScope = DeploymentScope = {}));
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
var ResourceCollector = /** @class */ (function () {
    function ResourceCollector() {
    }
    /**
     * Collect all resources grouped by stack
     *
     * @param constructs - All constructs from tree traversal
     * @param stacks - Map of stack constructs
     * @returns Map of stack name to stack info
     */
    ResourceCollector.prototype.collect = function (constructs, stacks) {
        var stackInfoMap = new Map();
        // Initialize stack info for each stack
        for (var _i = 0, _a = stacks.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], stackId = _b[0], stackConstruct = _b[1];
            var scope = this.determineScope(stackConstruct);
            stackInfoMap.set(stackId, {
                name: stackConstruct.node.id,
                construct: stackConstruct,
                scope: scope,
                resources: [],
            });
        }
        // Collect resources and assign to stacks
        for (var _c = 0, constructs_1 = constructs; _c < constructs_1.length; _c++) {
            var construct = constructs_1[_c];
            if (this.isResource(construct)) {
                var resource = construct;
                var stack = tree_traverser_1.TreeTraverser.findStack(construct);
                if (!stack) {
                    throw new Error("Resource ".concat(resource.node.path, " is not part of any stack"));
                }
                var stackId = stack.node.path || stack.node.id;
                var stackInfo = stackInfoMap.get(stackId);
                if (!stackInfo) {
                    throw new Error("Stack ".concat(stackId, " not found for resource ").concat(resource.node.path));
                }
                stackInfo.resources.push(resource);
            }
        }
        return stackInfoMap;
    };
    /**
     * Check if a construct is a Resource
     */
    ResourceCollector.prototype.isResource = function (construct) {
        return construct instanceof resource_1.Resource;
    };
    /**
     * Determine the deployment scope of a stack
     */
    ResourceCollector.prototype.determineScope = function (stack) {
        // Check constructor name or metadata to determine scope
        var constructorName = stack.constructor.name;
        if (constructorName === 'SubscriptionStack') {
            return DeploymentScope.SUBSCRIPTION;
        }
        if (constructorName === 'ResourceGroupStack') {
            return DeploymentScope.RESOURCE_GROUP;
        }
        // Default to resource group
        return DeploymentScope.RESOURCE_GROUP;
    };
    /**
     * Validate that resources are properly organized
     */
    ResourceCollector.prototype.validateResources = function (stackInfoMap) {
        for (var _i = 0, _a = stackInfoMap.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], stackId = _b[0], stackInfo = _b[1];
            // Check for subscription-scoped resources in resource group stacks
            if (stackInfo.scope === DeploymentScope.RESOURCE_GROUP) {
                for (var _c = 0, _d = stackInfo.resources; _c < _d.length; _c++) {
                    var resource = _d[_c];
                    if (this.isSubscriptionScopedResource(resource.resourceType)) {
                        throw new Error("Subscription-scoped resource ".concat(resource.resourceType, " cannot be deployed in ResourceGroupStack ").concat(stackId));
                    }
                }
            }
        }
    };
    /**
     * Check if a resource type is subscription-scoped
     */
    ResourceCollector.prototype.isSubscriptionScopedResource = function (resourceType) {
        var subscriptionScopedTypes = [
            'Microsoft.Resources/resourceGroups',
            'Microsoft.Authorization/policyDefinitions',
            'Microsoft.Authorization/policyAssignments',
            'Microsoft.Management/managementGroups',
        ];
        return subscriptionScopedTypes.includes(resourceType);
    };
    return ResourceCollector;
}());
exports.ResourceCollector = ResourceCollector;
