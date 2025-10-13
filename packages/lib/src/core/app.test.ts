import { describe, it, expect } from 'vitest';
import { App } from './app';
import { Construct } from './construct';

describe('core/App', () => {
  describe('constructor', () => {
    it('should create app with default outdir', () => {
      const app = new App();

      expect(app.outdir).toBe('arm.out');
    });

    it('should create app with custom outdir', () => {
      const app = new App({
        outdir: './dist/arm-templates',
      });

      expect(app.outdir).toBe('./dist/arm-templates');
    });

    it('should create app without props', () => {
      const app = new App();

      expect(app).toBeDefined();
      expect(app.outdir).toBeDefined();
    });

    it('should set context when provided', () => {
      const app = new App({
        context: {
          environment: 'nonprod',
          region: 'eastus',
        },
      });

      expect(app.node.tryGetContext('environment')).toBe('nonprod');
      expect(app.node.tryGetContext('region')).toBe('eastus');
    });

    it('should handle empty context', () => {
      const app = new App({
        context: {},
      });

      expect(app).toBeDefined();
    });
  });

  describe('registerStack()', () => {
    it('should register a stack', () => {
      const app = new App();

      // Create a mock stack
      const stack = new Construct(app, 'TestStack');

      app.registerStack(stack);

      expect(app.allStacks).toContainEqual(stack);
    });

    it('should track multiple stacks', () => {
      const app = new App();

      const stack1 = new Construct(app, 'Stack1');
      const stack2 = new Construct(app, 'Stack2');

      app.registerStack(stack1);
      app.registerStack(stack2);

      expect(app.allStacks).toHaveLength(2);
      expect(app.allStacks).toContainEqual(stack1);
      expect(app.allStacks).toContainEqual(stack2);
    });

    it('should allow same stack to be registered multiple times', () => {
      const app = new App();

      const stack = new Construct(app, 'TestStack');

      app.registerStack(stack);
      app.registerStack(stack); // Register again

      // Should only have one entry (Map uses id as key)
      expect(app.allStacks).toHaveLength(1);
    });
  });

  describe('allStacks', () => {
    it('should return empty array when no stacks registered', () => {
      const app = new App();

      expect(app.allStacks).toHaveLength(0);
    });

    it('should return all registered stacks', () => {
      const app = new App();

      const stack1 = new Construct(app, 'Stack1');
      const stack2 = new Construct(app, 'Stack2');
      const stack3 = new Construct(app, 'Stack3');

      app.registerStack(stack1);
      app.registerStack(stack2);
      app.registerStack(stack3);

      expect(app.allStacks).toHaveLength(3);
    });

    it('should return readonly array', () => {
      const app = new App();

      const stacks = app.allStacks;
      expect(stacks).toBeDefined();
      expect(Array.isArray(stacks)).toBe(true);
    });
  });

  describe('synth()', () => {
    it('should synthesize successfully with no stacks', async () => {
      const app = new App();

      const assembly = await app.synth();

      expect(assembly).toBeDefined();
      expect(assembly.directory).toBe('arm.out');
    }, 10000); // 10 second timeout

    it('should return cloud assembly with stacks object', async () => {
      const app = new App();

      const assembly = await app.synth();

      expect(assembly.stacks).toBeDefined();
      expect(typeof assembly.stacks).toBe('object');
    });
  });

  describe('Construct tree', () => {
    it('should be the root construct', () => {
      const app = new App();

      // App should not have a parent
      expect(app.node.scope).toBeUndefined();
    });

    it('should have empty id', () => {
      const app = new App();

      expect(app.node.id).toBe('');
    });

    it('should allow children constructs', () => {
      const app = new App();

      const child = new Construct(app, 'Child');

      expect(child.node.scope).toBe(app);
      expect(app.node.children).toContainEqual(child);
    });
  });

  describe('Context management', () => {
    it('should retrieve context values', () => {
      const app = new App({
        context: {
          key1: 'value1',
          key2: 123,
          key3: { nested: 'value' },
        },
      });

      expect(app.node.tryGetContext('key1')).toBe('value1');
      expect(app.node.tryGetContext('key2')).toBe(123);
      expect(app.node.tryGetContext('key3')).toEqual({ nested: 'value' });
    });

    it('should return undefined for missing context keys', () => {
      const app = new App();

      expect(app.node.tryGetContext('nonexistent')).toBeUndefined();
    });

    it('should allow setting context after construction', () => {
      const app = new App();

      app.node.setContext('newKey', 'newValue');

      expect(app.node.tryGetContext('newKey')).toBe('newValue');
    });
  });
});
