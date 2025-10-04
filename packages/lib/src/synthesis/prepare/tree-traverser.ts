import { IConstruct } from '../../core/construct';
import { App } from '../../core/app';

/**
 * Tree traversal result containing all constructs
 */
export interface TraversalResult {
  /**
   * All constructs in depth-first order
   */
  constructs: IConstruct[];

  /**
   * Map of stack ID to stack construct
   */
  stacks: Map<string, IConstruct>;

  /**
   * Map of construct ID to construct
   */
  constructsById: Map<string, IConstruct>;
}

/**
 * Traverses the construct tree from App to collect all nodes
 */
export class TreeTraverser {
  private visited = new Set<string>();

  /**
   * Traverse the construct tree starting from the app
   *
   * @param app - Root app construct
   * @returns Traversal result with all constructs
   */
  traverse(app: App): TraversalResult {
    this.visited.clear();

    const constructs: IConstruct[] = [];
    const stacks = new Map<string, IConstruct>();
    const constructsById = new Map<string, IConstruct>();

    // Start traversal from app
    this.traverseNode(app, constructs, stacks, constructsById);

    return {
      constructs,
      stacks,
      constructsById,
    };
  }

  /**
   * Recursively traverse a node and its children
   */
  private traverseNode(
    node: IConstruct,
    constructs: IConstruct[],
    stacks: Map<string, IConstruct>,
    constructsById: Map<string, IConstruct>
  ): void {
    const nodeId = node.node.path || node.node.id;

    // Detect circular references
    if (this.visited.has(nodeId)) {
      throw new Error(
        `Circular reference detected in construct tree at: ${nodeId}`
      );
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
    const metadata = node.node.metadata;
    if (metadata && metadata.some((m) => m.type === 'aws:cdk:stack' || m.type === 'azure:arm:stack')) {
      stacks.set(nodeId, node);
    }

    // Traverse children in depth-first order
    for (const child of node.node.children) {
      this.traverseNode(child, constructs, stacks, constructsById);
    }
  }

  /**
   * Get the stack that a construct belongs to
   *
   * @param construct - Construct to find stack for
   * @returns Stack construct or undefined if not in a stack
   */
  static findStack(construct: IConstruct): IConstruct | undefined {
    let current: IConstruct | undefined = construct;

    while (current) {
      const metadata = current.node.metadata;
      if (metadata && metadata.some((m) => m.type === 'aws:cdk:stack' || m.type === 'azure:arm:stack')) {
        return current;
      }

      current = current.node.scope;
    }

    return undefined;
  }

  /**
   * Get all children of a construct recursively
   *
   * @param construct - Parent construct
   * @returns Array of all descendant constructs
   */
  static getDescendants(construct: IConstruct): IConstruct[] {
    const descendants: IConstruct[] = [];

    function visit(node: IConstruct): void {
      for (const child of node.node.children) {
        descendants.push(child);
        visit(child);
      }
    }

    visit(construct);
    return descendants;
  }
}
