"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreeTraverser = void 0;
/**
 * Traverses the construct tree to discover all constructs and stacks.
 *
 * @remarks
 * The TreeTraverser walks the construct tree in depth-first order starting from
 * the App root, collecting all constructs and identifying stacks for synthesis.
 *
 * **Traversal Algorithm**:
 * - Depth-first pre-order traversal (parent before children)
 * - Detects circular references to prevent infinite loops
 * - Validates construct structure during traversal
 * - Identifies stacks by metadata markers
 *
 * **Stack Detection**:
 * Stacks are identified by metadata type `azure:arm:stack` or `aws:cdk:stack`.
 * This metadata is added by stack constructors (SubscriptionStack, ResourceGroupStack).
 *
 * **Error Handling**:
 * - Throws on circular references
 * - Throws on invalid constructs (missing node property)
 * - Provides clear error messages with construct paths
 *
 * @example
 * Basic traversal:
 * ```typescript
 * const app = new App();
 * const stack = new SubscriptionStack(app, 'MyStack', { ... });
 * const vnet = new VirtualNetwork(stack, 'VNet', { ... });
 *
 * const traverser = new TreeTraverser();
 * const result = traverser.traverse(app);
 *
 * console.log(result.constructs.length);  // 3 (app, stack, vnet)
 * console.log(result.stacks.size);        // 1 (stack)
 * ```
 *
 * @example
 * Finding a specific construct:
 * ```typescript
 * const result = traverser.traverse(app);
 * const vnet = result.constructsById.get('MyStack/VNet');
 * ```
 *
 * @see {@link ResourceCollector} for grouping resources by stack
 */
var TreeTraverser = /** @class */ (function () {
    function TreeTraverser() {
        this.visited = new Set();
    }
    /**
     * Traverses the construct tree starting from the app.
     *
     * @param app - Root app construct to start traversal from
     * @returns Traversal result containing all constructs, stacks, and lookup index
     *
     * @throws {Error} If circular reference detected or invalid construct found
     *
     * @remarks
     * Performs depth-first traversal of the entire construct tree:
     *
     * 1. **Clear State**: Resets visited set for fresh traversal
     * 2. **Initialize Collections**: Creates empty arrays and maps for results
     * 3. **Traverse**: Walks tree recursively starting from app
     * 4. **Return Results**: Returns all discovered constructs and stacks
     *
     * The traversal is safe to call multiple times on the same traverser instance.
     * Each call resets the visited set to prevent stale state.
     *
     * @example
     * ```typescript
     * const traverser = new TreeTraverser();
     * const result1 = traverser.traverse(app1);
     * const result2 = traverser.traverse(app2);  // Safe - state is reset
     * ```
     */
    TreeTraverser.prototype.traverse = function (app) {
        this.visited.clear();
        var constructs = [];
        var stacks = new Map();
        var constructsById = new Map();
        // Start traversal from app
        this.traverseNode(app, constructs, stacks, constructsById);
        return {
            constructs: constructs,
            stacks: stacks,
            constructsById: constructsById,
        };
    };
    /**
     * Recursively traverses a node and its children in depth-first order.
     *
     * @param node - Current construct to traverse
     * @param constructs - Array to collect all constructs
     * @param stacks - Map to collect stack constructs
     * @param constructsById - Map to index constructs by path
     *
     * @throws {Error} If circular reference detected or construct is invalid
     *
     * @remarks
     * This is the recursive core of tree traversal. For each node:
     *
     * 1. **Check Visited**: Throws if node already visited (circular reference)
     * 2. **Validate**: Throws if node structure is invalid (missing node property)
     * 3. **Mark Visited**: Adds to visited set to detect cycles
     * 4. **Collect**: Adds to constructs array and constructsById map
     * 5. **Check Stack**: If node has stack metadata, adds to stacks map
     * 6. **Recurse**: Calls itself on each child node
     *
     * **Stack Detection**: Checks for metadata types `azure:arm:stack` or `aws:cdk:stack`.
     * These are set by stack constructors (SubscriptionStack, ResourceGroupStack).
     *
     * @internal
     */
    TreeTraverser.prototype.traverseNode = function (node, constructs, stacks, constructsById) {
        var nodeId = node.node.path || node.node.id;
        // Detect circular references
        if (this.visited.has(nodeId)) {
            throw new Error("Circular reference detected in construct tree at: ".concat(nodeId));
        }
        // Validate node
        if (!node.node) {
            throw new Error('Invalid construct: missing node property');
        }
        this.visited.add(nodeId);
        // Add to collections
        constructs.push(node);
        constructsById.set(nodeId, node);
        // Check if this is a stack (has metadata indicating stack scope)
        var metadata = node.node.metadata;
        if (metadata &&
            metadata.some(function (m) { return m.type === 'aws:cdk:stack' || m.type === 'azure:arm:stack'; })) {
            stacks.set(nodeId, node);
        }
        // Traverse children in depth-first order
        for (var _i = 0, _a = node.node.children; _i < _a.length; _i++) {
            var child = _a[_i];
            this.traverseNode(child, constructs, stacks, constructsById);
        }
    };
    /**
     * Finds the stack that a construct belongs to by walking up the tree.
     *
     * @param construct - Construct to find stack for
     * @returns Stack construct or undefined if not in a stack
     *
     * @remarks
     * Walks up the construct tree from the given construct to its ancestors,
     * checking each node for stack metadata. Returns the first stack found.
     *
     * **Stack Detection**: Checks for metadata types `azure:arm:stack` or `aws:cdk:stack`.
     *
     * Returns `undefined` if the construct is not part of any stack (e.g., if it's
     * a direct child of App or if no stack is in the ancestry chain).
     *
     * @example
     * ```typescript
     * const app = new App();
     * const stack = new SubscriptionStack(app, 'MyStack', { ... });
     * const vnet = new VirtualNetwork(stack, 'VNet', { ... });
     * const subnet = new Subnet(vnet, 'Subnet', { ... });
     *
     * const foundStack = TreeTraverser.findStack(subnet);
     * console.log(foundStack === stack);  // true
     * ```
     */
    TreeTraverser.findStack = function (construct) {
        var current = construct;
        while (current) {
            var metadata = current.node.metadata;
            if (metadata &&
                metadata.some(function (m) { return m.type === 'aws:cdk:stack' || m.type === 'azure:arm:stack'; })) {
                return current;
            }
            current = current.node.scope;
        }
        return undefined;
    };
    /**
     * Gets all descendants of a construct recursively.
     *
     * @param construct - Parent construct to get descendants for
     * @returns Array of all descendant constructs in depth-first order
     *
     * @remarks
     * Returns all constructs below the given construct in the tree hierarchy.
     * Does NOT include the construct itself, only its descendants.
     *
     * The order is depth-first: for each child, includes the child then all of
     * its descendants before moving to the next sibling.
     *
     * @example
     * ```typescript
     * const stack = new SubscriptionStack(app, 'MyStack', { ... });
     * const vnet = new VirtualNetwork(stack, 'VNet', { ... });
     * const subnet1 = new Subnet(vnet, 'Subnet1', { ... });
     * const subnet2 = new Subnet(vnet, 'Subnet2', { ... });
     *
     * const descendants = TreeTraverser.getDescendants(stack);
     * // Returns: [vnet, subnet1, subnet2]
     * ```
     */
    TreeTraverser.getDescendants = function (construct) {
        var descendants = [];
        function visit(node) {
            for (var _i = 0, _a = node.node.children; _i < _a.length; _i++) {
                var child = _a[_i];
                descendants.push(child);
                visit(child);
            }
        }
        visit(construct);
        return descendants;
    };
    return TreeTraverser;
}());
exports.TreeTraverser = TreeTraverser;
