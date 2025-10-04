import { describe, it, expect, beforeEach } from 'vitest';
import { TreeTraverser } from './tree-traverser';
import { App } from '../../core/app';
import { Construct } from '../../core/construct';
import { Resource } from '../../core/resource';

describe('synthesis/prepare/TreeTraverser', () => {
  let app: App;
  let traverser: TreeTraverser;

  beforeEach(() => {
    app = new App();
    traverser = new TreeTraverser();
  });

  describe('traverse()', () => {
    it('should traverse app with no stacks', () => {
      const result = traverser.traverse(app);

      expect(result.constructs).toHaveLength(1);
      expect(result.constructs[0]).toBe(app);
      expect(result.stacks.size).toBe(0);
      expect(result.constructsById.size).toBe(1);
    });

    it('should traverse app with single stack', () => {
      const stack = new Construct(app, 'TestStack');
      stack.node.addMetadata('azure:arm:stack', {});

      const result = traverser.traverse(app);

      expect(result.constructs).toHaveLength(2);
      expect(result.constructs).toContain(app);
      expect(result.constructs).toContain(stack);
      expect(result.stacks.size).toBe(1);
      expect(result.stacks.has(stack.node.path)).toBe(true);
    });

    it('should traverse construct tree in depth-first order', () => {
      const stack = new Construct(app, 'Stack');
      const child1 = new Construct(stack, 'Child1');
      const child2 = new Construct(stack, 'Child2');
      const grandchild = new Construct(child1, 'Grandchild');

      const result = traverser.traverse(app);

      expect(result.constructs).toHaveLength(5);
      // Depth-first order: app -> stack -> child1 -> grandchild -> child2
      expect(result.constructs[0]).toBe(app);
      expect(result.constructs[1]).toBe(stack);
      expect(result.constructs[2]).toBe(child1);
      expect(result.constructs[3]).toBe(grandchild);
      expect(result.constructs[4]).toBe(child2);
    });

    it('should identify stacks by metadata', () => {
      const stack1 = new Construct(app, 'Stack1');
      const stack2 = new Construct(app, 'Stack2');
      const nonStack = new Construct(app, 'NotAStack');

      stack1.node.addMetadata('azure:arm:stack', {});
      stack2.node.addMetadata('aws:cdk:stack', {});

      const result = traverser.traverse(app);

      expect(result.stacks.size).toBe(2);
      expect(result.stacks.has(stack1.node.path)).toBe(true);
      expect(result.stacks.has(stack2.node.path)).toBe(true);
      expect(result.stacks.has(nonStack.node.path)).toBe(false);
    });

    it('should populate constructsById map', () => {
      const stack = new Construct(app, 'Stack');
      const resource = new Construct(stack, 'Resource');

      const result = traverser.traverse(app);

      expect(result.constructsById.size).toBe(3);
      expect(result.constructsById.get(app.node.id)).toBe(app);
      expect(result.constructsById.get(stack.node.path)).toBe(stack);
      expect(result.constructsById.get(resource.node.path)).toBe(resource);
    });

    it('should clear visited set between traversals', () => {
      const stack = new Construct(app, 'Stack');

      const result1 = traverser.traverse(app);
      const result2 = traverser.traverse(app);

      expect(result1.constructs).toEqual(result2.constructs);
    });

    it('should throw error on circular reference', () => {
      const stack = new Construct(app, 'Stack');
      const child = new Construct(stack, 'Child');

      // Create circular reference (normally impossible, but force it for testing)
      Object.defineProperty(child.node, 'children', {
        get() {
          return [stack]; // Point back to parent
        },
      });

      expect(() => {
        traverser.traverse(app);
      }).toThrow(/Circular reference detected/);
    });

    it('should handle construct without explicit validation', () => {
      // Note: In practice, constructs without node property won't occur
      // due to type system, but we test graceful handling
      const result = traverser.traverse(app);

      expect(result.constructs).toBeDefined();
    });
  });

  describe('findStack()', () => {
    it('should find stack for direct child resource', () => {
      const stack = new Construct(app, 'Stack');
      stack.node.addMetadata('azure:arm:stack', {});
      const resource = new Construct(stack, 'Resource');

      const foundStack = TreeTraverser.findStack(resource);

      expect(foundStack).toBe(stack);
    });

    it('should find stack for nested resource', () => {
      const stack = new Construct(app, 'Stack');
      stack.node.addMetadata('azure:arm:stack', {});
      const parent = new Construct(stack, 'Parent');
      const child = new Construct(parent, 'Child');
      const resource = new Construct(child, 'Resource');

      const foundStack = TreeTraverser.findStack(resource);

      expect(foundStack).toBe(stack);
    });

    it('should return undefined if not in a stack', () => {
      const orphan = new Construct(app, 'Orphan');

      const foundStack = TreeTraverser.findStack(orphan);

      expect(foundStack).toBeUndefined();
    });

    it('should recognize aws:cdk:stack metadata', () => {
      const stack = new Construct(app, 'Stack');
      stack.node.addMetadata('aws:cdk:stack', {});
      const resource = new Construct(stack, 'Resource');

      const foundStack = TreeTraverser.findStack(resource);

      expect(foundStack).toBe(stack);
    });

    it('should find nearest stack in nested stack scenario', () => {
      const outerStack = new Construct(app, 'OuterStack');
      outerStack.node.addMetadata('azure:arm:stack', {});
      const innerStack = new Construct(outerStack, 'InnerStack');
      innerStack.node.addMetadata('azure:arm:stack', {});
      const resource = new Construct(innerStack, 'Resource');

      const foundStack = TreeTraverser.findStack(resource);

      // Should find the innermost stack
      expect(foundStack).toBe(innerStack);
    });
  });

  describe('getDescendants()', () => {
    it('should return empty array for leaf construct', () => {
      const leaf = new Construct(app, 'Leaf');

      const descendants = TreeTraverser.getDescendants(leaf);

      expect(descendants).toHaveLength(0);
    });

    it('should return direct children', () => {
      const parent = new Construct(app, 'Parent');
      const child1 = new Construct(parent, 'Child1');
      const child2 = new Construct(parent, 'Child2');

      const descendants = TreeTraverser.getDescendants(parent);

      expect(descendants).toHaveLength(2);
      expect(descendants).toContain(child1);
      expect(descendants).toContain(child2);
    });

    it('should return all descendants recursively', () => {
      const parent = new Construct(app, 'Parent');
      const child1 = new Construct(parent, 'Child1');
      const child2 = new Construct(parent, 'Child2');
      const grandchild1 = new Construct(child1, 'Grandchild1');
      const grandchild2 = new Construct(child1, 'Grandchild2');
      const grandchild3 = new Construct(child2, 'Grandchild3');

      const descendants = TreeTraverser.getDescendants(parent);

      expect(descendants).toHaveLength(5);
      expect(descendants).toContain(child1);
      expect(descendants).toContain(child2);
      expect(descendants).toContain(grandchild1);
      expect(descendants).toContain(grandchild2);
      expect(descendants).toContain(grandchild3);
    });

    it('should return descendants in depth-first order', () => {
      const parent = new Construct(app, 'Parent');
      const child1 = new Construct(parent, 'Child1');
      const child2 = new Construct(parent, 'Child2');
      const grandchild = new Construct(child1, 'Grandchild');

      const descendants = TreeTraverser.getDescendants(parent);

      // Depth-first: child1 -> grandchild -> child2
      expect(descendants[0]).toBe(child1);
      expect(descendants[1]).toBe(grandchild);
      expect(descendants[2]).toBe(child2);
    });
  });

  describe('edge cases', () => {
    it('should handle empty tree', () => {
      const emptyApp = new App();

      const result = traverser.traverse(emptyApp);

      expect(result.constructs).toHaveLength(1);
      expect(result.stacks.size).toBe(0);
    });

    it('should handle multiple stacks at same level', () => {
      const stack1 = new Construct(app, 'Stack1');
      const stack2 = new Construct(app, 'Stack2');
      const stack3 = new Construct(app, 'Stack3');

      stack1.node.addMetadata('azure:arm:stack', {});
      stack2.node.addMetadata('azure:arm:stack', {});
      stack3.node.addMetadata('azure:arm:stack', {});

      const result = traverser.traverse(app);

      expect(result.stacks.size).toBe(3);
    });

    it('should handle deeply nested construct tree', () => {
      let current: Construct = app;
      for (let i = 0; i < 100; i++) {
        current = new Construct(current, `Level${i}`);
      }

      const result = traverser.traverse(app);

      expect(result.constructs).toHaveLength(101); // app + 100 levels
    });
  });
});
