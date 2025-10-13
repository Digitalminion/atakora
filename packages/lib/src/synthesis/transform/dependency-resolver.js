"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DependencyResolver = void 0;
var resource_1 = require("../../core/resource");
/**
 * Resolves resource dependencies and detects cycles
 */
var DependencyResolver = /** @class */ (function () {
    function DependencyResolver() {
        this.nodes = new Map();
    }
    /**
     * Resolve dependencies for resources
     *
     * @param resources - ARM resources to analyze
     * @param constructs - Original construct resources for dependency analysis
     * @returns Resources with dependsOn fields populated
     */
    DependencyResolver.prototype.resolve = function (resources, constructs) {
        // Build dependency graph
        this.buildGraph(resources, constructs);
        // Detect cycles
        this.detectCycles();
        // Add dependsOn fields to resources
        return this.addDependsOn(resources);
    };
    /**
     * Build dependency graph from resources
     */
    DependencyResolver.prototype.buildGraph = function (resources, constructs) {
        this.nodes.clear();
        // Initialize nodes
        for (var _i = 0, resources_1 = resources; _i < resources_1.length; _i++) {
            var resource = resources_1[_i];
            var resourceId = this.getResourceIdentifier(resource);
            this.nodes.set(resourceId, {
                resource: resource,
                dependencies: new Set(),
                dependents: new Set(),
            });
        }
        // Detect dependencies
        for (var i = 0; i < resources.length; i++) {
            var resource = resources[i];
            var construct = constructs[i];
            var resourceId = this.getResourceIdentifier(resource);
            var node = this.nodes.get(resourceId);
            // Auto-detect dependencies from resource properties
            var detectedDeps = this.detectDependencies(resource, resources);
            for (var _a = 0, detectedDeps_1 = detectedDeps; _a < detectedDeps_1.length; _a++) {
                var dep = detectedDeps_1[_a];
                node.dependencies.add(dep);
                var depNode = this.nodes.get(dep);
                if (depNode) {
                    depNode.dependents.add(resourceId);
                }
            }
            // Check for explicit dependencies in construct metadata
            var explicitDeps = this.extractExplicitDependencies(construct, resources);
            for (var _b = 0, explicitDeps_1 = explicitDeps; _b < explicitDeps_1.length; _b++) {
                var dep = explicitDeps_1[_b];
                node.dependencies.add(dep);
                var depNode = this.nodes.get(dep);
                if (depNode) {
                    depNode.dependents.add(resourceId);
                }
            }
        }
    };
    /**
     * Detect dependencies by analyzing resource properties
     */
    DependencyResolver.prototype.detectDependencies = function (resource, allResources) {
        var dependencies = new Set();
        // Check for resource ID references in properties
        var propertiesStr = JSON.stringify(resource.properties || {});
        // Check if there are any separate subnet resources in the template
        // If not, we're using inline subnets and should depend on VNets instead
        var hasSeparateSubnets = allResources.some(function (r) { return r.type === 'Microsoft.Network/virtualNetworks/subnets'; });
        for (var _i = 0, allResources_1 = allResources; _i < allResources_1.length; _i++) {
            var otherResource = allResources_1[_i];
            if (otherResource === resource)
                continue;
            var otherId = this.getResourceIdentifier(otherResource);
            // Look for references to other resources
            if (propertiesStr.includes(otherResource.name)) {
                dependencies.add(otherId);
            }
            // Check for parent-child relationships based on resource type
            // Child resources must depend on their parent
            var parentType = this.getParentResourceType(resource.type);
            if (parentType && otherResource.type === parentType) {
                // Check if the parent resource name matches the child's parent name
                var parentName = this.getParentResourceName(resource.name);
                if (parentName && otherResource.name === parentName) {
                    dependencies.add(otherId);
                }
            }
            // CRITICAL: Check for Subnet dependencies on NSGs
            // Subnets that reference NSGs must be created AFTER the NSG exists
            // This prevents "AnotherOperationInProgress" errors during deployment
            if (resource.type === 'Microsoft.Network/virtualNetworks/subnets' &&
                otherResource.type === 'Microsoft.Network/networkSecurityGroups') {
                // Check if subnet properties reference this NSG
                if (resource.properties && typeof resource.properties === 'object') {
                    var props = resource.properties;
                    var nsg = props.networkSecurityGroup;
                    if (nsg === null || nsg === void 0 ? void 0 : nsg.id) {
                        // Extract NSG name from the resourceId expression or full path
                        var nsgIdStr = String(nsg.id);
                        var otherResourceName = otherResource.name;
                        // Check if the NSG ID references this particular NSG
                        // Handle both ARM expressions like [resourceId('Microsoft.Network/networkSecurityGroups', 'nsg-name')]
                        // and direct name references
                        if (nsgIdStr.includes(otherResourceName)) {
                            dependencies.add(otherId);
                        }
                    }
                }
            }
            // CRITICAL: Handle inline subnet references
            // When subnets are inline (no separate subnet resources), resources that reference
            // subnets should depend on the VNet instead, not the non-existent subnet resource
            if (!hasSeparateSubnets && propertiesStr.includes('virtualNetworks/subnets')) {
                // Resource references a subnet - check if we should depend on the VNet
                if (otherResource.type === 'Microsoft.Network/virtualNetworks') {
                    // Check if the subnet reference is for this VNet
                    if (propertiesStr.includes(otherResource.name)) {
                        dependencies.add(otherId);
                    }
                }
            }
            // Check for subnet dependencies (VMs depend on subnets)
            // Only if separate subnet resources exist
            if (hasSeparateSubnets &&
                resource.type === 'Microsoft.Compute/virtualMachines' &&
                otherResource.type === 'Microsoft.Network/virtualNetworks/subnets') {
                dependencies.add(otherId);
            }
            // Check for network interface dependencies
            if (resource.type === 'Microsoft.Compute/virtualMachines' &&
                otherResource.type === 'Microsoft.Network/networkInterfaces') {
                dependencies.add(otherId);
            }
            // Check for App Service Plan dependencies
            if (resource.type === 'Microsoft.Web/sites' &&
                otherResource.type === 'Microsoft.Web/serverfarms') {
                // App Service always depends on its App Service Plan
                dependencies.add(otherId);
            }
        }
        return dependencies;
    };
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
    DependencyResolver.prototype.getParentResourceType = function (resourceType) {
        var parts = resourceType.split('/');
        // Parent-child resources have at least 3 parts: provider/parentType/childType
        if (parts.length < 3) {
            return null;
        }
        // Return parent type (provider/parentType)
        return parts.slice(0, -1).join('/');
    };
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
    DependencyResolver.prototype.getParentResourceName = function (resourceName) {
        var parts = resourceName.split('/');
        // Parent-child resources have at least 2 parts: parentName/childName
        if (parts.length < 2) {
            return null;
        }
        // Return parent name (everything before the last slash)
        return parts.slice(0, -1).join('/');
    };
    /**
     * Extract explicit dependencies from construct
     */
    DependencyResolver.prototype.extractExplicitDependencies = function (construct, allResources) {
        var dependencies = new Set();
        // Check construct node for dependencies
        var node = construct.node;
        if (node.dependencies) {
            var _loop_1 = function (dep) {
                if (dep instanceof resource_1.Resource) {
                    // Find corresponding ARM resource
                    var armResource = allResources.find(function (r) { return r.name === dep.name; });
                    if (armResource) {
                        dependencies.add(this_1.getResourceIdentifier(armResource));
                    }
                }
            };
            var this_1 = this;
            for (var _i = 0, _a = node.dependencies; _i < _a.length; _i++) {
                var dep = _a[_i];
                _loop_1(dep);
            }
        }
        return dependencies;
    };
    /**
     * Detect circular dependencies using DFS
     */
    DependencyResolver.prototype.detectCycles = function () {
        var visited = new Set();
        var recursionStack = new Set();
        for (var _i = 0, _a = this.nodes; _i < _a.length; _i++) {
            var nodeId = _a[_i][0];
            if (!visited.has(nodeId)) {
                this.detectCyclesRecursive(nodeId, visited, recursionStack, []);
            }
        }
    };
    /**
     * Recursive cycle detection
     */
    DependencyResolver.prototype.detectCyclesRecursive = function (nodeId, visited, recursionStack, path) {
        visited.add(nodeId);
        recursionStack.add(nodeId);
        path.push(nodeId);
        var node = this.nodes.get(nodeId);
        if (!node)
            return;
        for (var _i = 0, _a = node.dependencies; _i < _a.length; _i++) {
            var depId = _a[_i];
            if (!visited.has(depId)) {
                this.detectCyclesRecursive(depId, visited, recursionStack, __spreadArray([], path, true));
            }
            else if (recursionStack.has(depId)) {
                // Cycle detected
                var cycleStart = path.indexOf(depId);
                var cycle = __spreadArray(__spreadArray([], path.slice(cycleStart), true), [depId], false);
                throw new Error("Circular dependency detected: ".concat(cycle.join(' → ')));
            }
        }
        recursionStack.delete(nodeId);
    };
    /**
     * Add dependsOn fields to resources
     *
     * @remarks
     * Filters out invalid subnet resource dependencies when using inline subnets.
     * When subnets are defined inline within VNets, separate subnet resources don't exist,
     * so dependencies on them must be removed.
     */
    DependencyResolver.prototype.addDependsOn = function (resources) {
        var _this = this;
        // Check if there are any separate subnet resources in the template
        var hasSeparateSubnets = resources.some(function (r) { return r.type === 'Microsoft.Network/virtualNetworks/subnets'; });
        return resources.map(function (resource) {
            var resourceId = _this.getResourceIdentifier(resource);
            var node = _this.nodes.get(resourceId);
            // Convert auto-detected dependency IDs to resourceId expressions
            var autoDependsOn = node
                ? Array.from(node.dependencies).map(function (depId) {
                    var depNode = _this.nodes.get(depId);
                    if (!depNode)
                        return depId;
                    return _this.generateResourceIdExpression(depNode.resource);
                })
                : [];
            // Get any explicit dependsOn from resource template
            var explicitDependsOn = resource.dependsOn || [];
            // Merge explicit and auto-detected dependencies
            // Use a Set to deduplicate
            var allDependsOn = Array.from(new Set(__spreadArray(__spreadArray([], explicitDependsOn, true), autoDependsOn, true)));
            // CRITICAL: Remove subnet resource dependencies when using inline subnets
            // If no separate subnet resources exist, filter out any dependencies on subnet resources
            if (!hasSeparateSubnets) {
                allDependsOn = allDependsOn.filter(function (dep) {
                    // Remove dependencies that reference Microsoft.Network/virtualNetworks/subnets
                    var depStr = String(dep);
                    return !depStr.includes("'Microsoft.Network/virtualNetworks/subnets'");
                });
            }
            if (allDependsOn.length === 0) {
                // Remove any existing dependsOn from resource template
                var dependsOn = resource.dependsOn, resourceWithoutDependsOn = __rest(resource, ["dependsOn"]);
                return resourceWithoutDependsOn;
            }
            return __assign(__assign({}, resource), { dependsOn: allDependsOn });
        });
    };
    /**
     * Generate ARM resourceId expression for a resource
     *
     * @remarks
     * Handles both regular and child resources:
     * - Regular: [resourceId('Microsoft.Storage/storageAccounts', 'myaccount')]
     * - Child: [resourceId('Microsoft.Network/virtualNetworks/subnets', 'vnet-name', 'subnet-name')]
     */
    DependencyResolver.prototype.generateResourceIdExpression = function (resource) {
        var nameParts = resource.name.split('/');
        if (nameParts.length === 1) {
            // Simple resource: [resourceId('type', 'name')]
            return "[resourceId('".concat(resource.type, "', '").concat(resource.name, "')]");
        }
        // Child resource: [resourceId('type', 'parent-name', 'child-name', ...)]
        var nameArgs = nameParts.map(function (part) { return "'".concat(part, "'"); }).join(', ');
        return "[resourceId('".concat(resource.type, "', ").concat(nameArgs, ")]");
    };
    /**
     * Perform topological sort of resources
     */
    DependencyResolver.prototype.topologicalSort = function (resources) {
        var _this = this;
        var sorted = [];
        var visited = new Set();
        // Create a map of resource ID to resource object (with updated dependsOn)
        var resourceMap = new Map();
        for (var _i = 0, resources_2 = resources; _i < resources_2.length; _i++) {
            var resource = resources_2[_i];
            resourceMap.set(this.getResourceIdentifier(resource), resource);
        }
        var visit = function (resourceId) {
            if (visited.has(resourceId))
                return;
            var node = _this.nodes.get(resourceId);
            if (!node)
                return;
            // Visit dependencies first
            for (var _i = 0, _a = node.dependencies; _i < _a.length; _i++) {
                var depId = _a[_i];
                visit(depId);
            }
            visited.add(resourceId);
            // Use the updated resource from the map, not the original from the node
            var updatedResource = resourceMap.get(resourceId) || node.resource;
            sorted.push(updatedResource);
        };
        for (var _a = 0, resources_3 = resources; _a < resources_3.length; _a++) {
            var resource = resources_3[_a];
            visit(this.getResourceIdentifier(resource));
        }
        return sorted;
    };
    /**
     * Get unique identifier for a resource
     */
    DependencyResolver.prototype.getResourceIdentifier = function (resource) {
        return "".concat(resource.type, "/").concat(resource.name);
    };
    return DependencyResolver;
}());
exports.DependencyResolver = DependencyResolver;
