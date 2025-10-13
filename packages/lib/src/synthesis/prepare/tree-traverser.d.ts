import { IConstruct } from '../../core/construct';
import { App } from '../../core/app';
/**
 * Result of tree traversal containing all discovered constructs.
 *
 * @remarks
 * The traversal result provides multiple views of the construct tree:
 * - `constructs`: All constructs in depth-first traversal order
 * - `stacks`: Only stack constructs for synthesis
 * - `constructsById`: Index for fast construct lookup
 */
export interface TraversalResult {
    /**
     * All constructs in depth-first order.
     *
     * @remarks
     * Includes every construct in the tree from App down to individual resources.
     * Order matches depth-first traversal (parent before children, siblings in order).
     */
    constructs: IConstruct[];
    /**
     * Map of stack ID to stack construct.
     *
     * @remarks
     * Only includes constructs marked as stacks (via metadata).
     * Key is the construct path, value is the stack construct itself.
     */
    stacks: Map<string, IConstruct>;
    /**
     * Map of construct ID to construct for fast lookup.
     *
     * @remarks
     * Provides O(1) access to any construct by its path or ID.
     * Key is the construct path, value is the construct.
     */
    constructsById: Map<string, IConstruct>;
}
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
export declare class TreeTraverser {
    private visited;
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
    traverse(app: App): TraversalResult;
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
    private traverseNode;
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
    static findStack(construct: IConstruct): IConstruct | undefined;
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
    static getDescendants(construct: IConstruct): IConstruct[];
}
//# sourceMappingURL=tree-traverser.d.ts.map