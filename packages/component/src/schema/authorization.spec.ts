/**
 * Authorization Builder Tests
 *
 * Comprehensive tests for authorization rule building and configuration.
 */

import { describe, it, expect } from 'vitest';
import { AuthorizationBuilder } from './authorization';
import type { AuthorizationRule } from './types';

// ============================================================================
// Owner-based Authorization
// ============================================================================

describe('AuthorizationBuilder - Owner Rules', () => {
  it('should create owner rule with all operations', () => {
    const builder = new AuthorizationBuilder();
    const rule = builder.owner('userId').all();

    expect(rule.type).toBe('owner');
    expect(rule.field).toBe('userId');
    expect(rule.operations).toBeUndefined(); // undefined means all
  });

  it('should create owner rule for create operation', () => {
    const builder = new AuthorizationBuilder();
    const rule = builder.owner('userId').create()._build();

    expect(rule.type).toBe('owner');
    expect(rule.field).toBe('userId');
    expect(rule.operations).toEqual(['create']);
  });

  it('should create owner rule for read operation', () => {
    const builder = new AuthorizationBuilder();
    const rule = builder.owner('userId').read()._build();

    expect(rule.type).toBe('owner');
    expect(rule.field).toBe('userId');
    expect(rule.operations).toEqual(['read']);
  });

  it('should create owner rule for update operation', () => {
    const builder = new AuthorizationBuilder();
    const rule = builder.owner('userId').update()._build();

    expect(rule.type).toBe('owner');
    expect(rule.field).toBe('userId');
    expect(rule.operations).toEqual(['update']);
  });

  it('should create owner rule for delete operation', () => {
    const builder = new AuthorizationBuilder();
    const rule = builder.owner('userId').delete()._build();

    expect(rule.type).toBe('owner');
    expect(rule.field).toBe('userId');
    expect(rule.operations).toEqual(['delete']);
  });

  it('should support different owner field names', () => {
    const builder = new AuthorizationBuilder();

    const rule1 = builder.owner('authorId').all();
    const rule2 = builder.owner('ownerId').all();
    const rule3 = builder.owner('createdBy').all();

    expect(rule1.field).toBe('authorId');
    expect(rule2.field).toBe('ownerId');
    expect(rule3.field).toBe('createdBy');
  });
});

// ============================================================================
// Group-based Authorization
// ============================================================================

describe('AuthorizationBuilder - Group Rules', () => {
  it('should create group rule with all operations', () => {
    const builder = new AuthorizationBuilder();
    const rule = builder.groups(['admin']).all();

    expect(rule.type).toBe('groups');
    expect(rule.groups).toEqual(['admin']);
    expect(rule.operations).toBeUndefined(); // undefined means all
  });

  it('should create group rule for create operation', () => {
    const builder = new AuthorizationBuilder();
    const rule = builder.groups(['editor']).create()._build();

    expect(rule.type).toBe('groups');
    expect(rule.groups).toEqual(['editor']);
    expect(rule.operations).toEqual(['create']);
  });

  it('should create group rule for read operation', () => {
    const builder = new AuthorizationBuilder();
    const rule = builder.groups(['viewer']).read()._build();

    expect(rule.type).toBe('groups');
    expect(rule.groups).toEqual(['viewer']);
    expect(rule.operations).toEqual(['read']);
  });

  it('should create group rule for update operation', () => {
    const builder = new AuthorizationBuilder();
    const rule = builder.groups(['editor']).update()._build();

    expect(rule.type).toBe('groups');
    expect(rule.groups).toEqual(['editor']);
    expect(rule.operations).toEqual(['update']);
  });

  it('should create group rule for delete operation', () => {
    const builder = new AuthorizationBuilder();
    const rule = builder.groups(['admin']).delete()._build();

    expect(rule.type).toBe('groups');
    expect(rule.groups).toEqual(['admin']);
    expect(rule.operations).toEqual(['delete']);
  });

  it('should support multiple groups', () => {
    const builder = new AuthorizationBuilder();
    const rule = builder.groups(['admin', 'editor', 'moderator']).all();

    expect(rule.groups).toEqual(['admin', 'editor', 'moderator']);
  });

  it('should support single group', () => {
    const builder = new AuthorizationBuilder();
    const rule = builder.groups(['admin']).all();

    expect(rule.groups).toEqual(['admin']);
  });
});

// ============================================================================
// Authenticated Authorization
// ============================================================================

describe('AuthorizationBuilder - Authenticated Rules', () => {
  it('should create authenticated rule for all operations', () => {
    const builder = new AuthorizationBuilder();
    const rule = builder.authenticated();

    expect(rule.type).toBe('authenticated');
    expect(rule.operations).toBeUndefined(); // undefined means all
  });

  it('should create authenticated rule with specific operations', () => {
    const builder = new AuthorizationBuilder();
    const rule = builder.authenticated(['read', 'list']);

    expect(rule.type).toBe('authenticated');
    expect(rule.operations).toEqual(['read', 'list']);
  });

  it('should support single operation', () => {
    const builder = new AuthorizationBuilder();
    const rule = builder.authenticated(['read']);

    expect(rule.operations).toEqual(['read']);
  });

  it('should support multiple operations', () => {
    const builder = new AuthorizationBuilder();
    const rule = builder.authenticated(['create', 'read', 'update', 'delete']);

    expect(rule.operations).toEqual(['create', 'read', 'update', 'delete']);
  });
});

// ============================================================================
// Public Authorization
// ============================================================================

describe('AuthorizationBuilder - Public Rules', () => {
  it('should create public rule for all operations', () => {
    const builder = new AuthorizationBuilder();
    const rule = builder.public();

    expect(rule.type).toBe('public');
    expect(rule.operations).toBeUndefined(); // undefined means all
  });

  it('should create public rule with specific operations', () => {
    const builder = new AuthorizationBuilder();
    const rule = builder.public(['read', 'list']);

    expect(rule.type).toBe('public');
    expect(rule.operations).toEqual(['read', 'list']);
  });

  it('should support read-only public access', () => {
    const builder = new AuthorizationBuilder();
    const rule = builder.public(['read']);

    expect(rule.operations).toEqual(['read']);
  });

  it('should support list-only public access', () => {
    const builder = new AuthorizationBuilder();
    const rule = builder.public(['list']);

    expect(rule.operations).toEqual(['list']);
  });
});

// ============================================================================
// Rule Combinations
// ============================================================================

describe('AuthorizationBuilder - Rule Combinations', () => {
  it('should support owner and admin rules', () => {
    const builder = new AuthorizationBuilder();
    const rules = [builder.owner('userId').all(), builder.groups(['admin']).all()];

    expect(rules).toHaveLength(2);
    expect(rules[0].type).toBe('owner');
    expect(rules[1].type).toBe('groups');
  });

  it('should support owner with specific operations and public read', () => {
    const builder = new AuthorizationBuilder();
    const rules = [builder.owner('userId').update()._build(), builder.public(['read', 'list'])];

    expect(rules).toHaveLength(2);
    expect(rules[0].operations).toEqual(['update']);
    expect(rules[1].operations).toEqual(['read', 'list']);
  });

  it('should support complex multi-rule authorization', () => {
    const builder = new AuthorizationBuilder();
    const rules = [
      builder.owner('ownerId').all(),
      builder.groups(['admin']).all(),
      builder.groups(['editor']).update()._build(),
      builder.authenticated(['read']),
      builder.public(['list']),
    ];

    expect(rules).toHaveLength(5);
    expect(rules[0].type).toBe('owner');
    expect(rules[1].type).toBe('groups');
    expect(rules[2].type).toBe('groups');
    expect(rules[3].type).toBe('authenticated');
    expect(rules[4].type).toBe('public');
  });

  it('should support multiple groups with different operations', () => {
    const builder = new AuthorizationBuilder();
    const rules = [
      builder.groups(['admin']).all(),
      builder.groups(['editor']).create()._build(),
      builder.groups(['editor']).update()._build(),
      builder.groups(['viewer']).read()._build(),
    ];

    expect(rules).toHaveLength(4);
    expect(rules[0].groups).toEqual(['admin']);
    expect(rules[1].groups).toEqual(['editor']);
    expect(rules[1].operations).toEqual(['create']);
    expect(rules[3].operations).toEqual(['read']);
  });
});

// ============================================================================
// Real-World Authorization Patterns
// ============================================================================

describe('AuthorizationBuilder - Real-World Patterns', () => {
  it('should model blog post authorization', () => {
    const builder = new AuthorizationBuilder();
    const rules = [
      builder.owner('authorId').all(),
      builder.groups(['admin', 'moderator']).all(),
      builder.authenticated(['read', 'list']),
    ];

    expect(rules).toHaveLength(3);
    expect(rules[0].type).toBe('owner');
    expect(rules[1].groups).toEqual(['admin', 'moderator']);
    expect(rules[2].operations).toEqual(['read', 'list']);
  });

  it('should model document collaboration authorization', () => {
    const builder = new AuthorizationBuilder();
    const rules = [
      builder.owner('createdBy').all(),
      builder.groups(['collaborators']).update()._build(),
      builder.groups(['viewers']).read()._build(),
      builder.groups(['admin']).all(),
    ];

    expect(rules).toHaveLength(4);
    expect(rules[1].groups).toEqual(['collaborators']);
    expect(rules[1].operations).toEqual(['update']);
  });

  it('should model multi-tenant data authorization', () => {
    const builder = new AuthorizationBuilder();
    const rules = [
      builder.groups(['tenant-admin']).all(),
      builder.groups(['tenant-user']).read(),
      builder.owner('userId').update(),
    ];

    expect(rules).toHaveLength(3);
  });

  it('should model public API with rate-limited writes', () => {
    const builder = new AuthorizationBuilder();
    const rules = [builder.public(['read', 'list']), builder.authenticated(['create'])];

    expect(rules).toHaveLength(2);
    expect(rules[0].operations).toEqual(['read', 'list']);
    expect(rules[1].operations).toEqual(['create']);
  });

  it('should model admin-only resource', () => {
    const builder = new AuthorizationBuilder();
    const rules = [builder.groups(['admin', 'super-admin']).all()];

    expect(rules).toHaveLength(1);
    expect(rules[0].groups).toEqual(['admin', 'super-admin']);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('AuthorizationBuilder - Edge Cases', () => {
  it('should handle empty group array', () => {
    const builder = new AuthorizationBuilder();
    const rule = builder.groups([]).all();

    expect(rule.groups).toEqual([]);
  });

  it('should handle empty operations array', () => {
    const builder = new AuthorizationBuilder();
    const rule = builder.authenticated([]);

    expect(rule.operations).toEqual([]);
  });

  it('should create independent builder instances', () => {
    const builder1 = new AuthorizationBuilder();
    const builder2 = new AuthorizationBuilder();

    const rule1 = builder1.owner('userId').all();
    const rule2 = builder2.owner('ownerId').all();

    expect(rule1.field).toBe('userId');
    expect(rule2.field).toBe('ownerId');
  });

  it('should create independent rules from same builder', () => {
    const builder = new AuthorizationBuilder();

    const rule1 = builder.owner('userId').all();
    const rule2 = builder.owner('authorId').read()._build();

    expect(rule1.field).toBe('userId');
    expect(rule2.field).toBe('authorId');
    expect(rule1.operations).toBeUndefined();
    expect(rule2.operations).toEqual(['read']);
  });
});

// ============================================================================
// Operation Types
// ============================================================================

describe('AuthorizationBuilder - Operation Types', () => {
  it('should support all CRUD operations', () => {
    const builder = new AuthorizationBuilder();

    const createRule = builder.authenticated(['create']);
    const readRule = builder.authenticated(['read']);
    const updateRule = builder.authenticated(['update']);
    const deleteRule = builder.authenticated(['delete']);
    const listRule = builder.authenticated(['list']);

    expect(createRule.operations).toEqual(['create']);
    expect(readRule.operations).toEqual(['read']);
    expect(updateRule.operations).toEqual(['update']);
    expect(deleteRule.operations).toEqual(['delete']);
    expect(listRule.operations).toEqual(['list']);
  });

  it('should support multiple operations in single rule', () => {
    const builder = new AuthorizationBuilder();
    const rule = builder.authenticated(['create', 'read', 'update', 'delete', 'list']);

    expect(rule.operations).toHaveLength(5);
    expect(rule.operations).toContain('create');
    expect(rule.operations).toContain('read');
    expect(rule.operations).toContain('update');
    expect(rule.operations).toContain('delete');
    expect(rule.operations).toContain('list');
  });
});

// ============================================================================
// Type Safety
// ============================================================================

describe('AuthorizationBuilder - Type Safety', () => {
  it('should return correctly typed owner rules', () => {
    const builder = new AuthorizationBuilder();
    const rule: AuthorizationRule = builder.owner('userId').all();

    expect(rule.type).toBe('owner');
  });

  it('should return correctly typed group rules', () => {
    const builder = new AuthorizationBuilder();
    const rule: AuthorizationRule = builder.groups(['admin']).all();

    expect(rule.type).toBe('groups');
  });

  it('should return correctly typed authenticated rules', () => {
    const builder = new AuthorizationBuilder();
    const rule: AuthorizationRule = builder.authenticated();

    expect(rule.type).toBe('authenticated');
  });

  it('should return correctly typed public rules', () => {
    const builder = new AuthorizationBuilder();
    const rule: AuthorizationRule = builder.public();

    expect(rule.type).toBe('public');
  });
});

// ============================================================================
// Integration with Model Builders
// ============================================================================

describe('AuthorizationBuilder - Model Integration', () => {
  it('should work with authorization callback pattern', () => {
    const rules = ((allow: AuthorizationBuilder) => [
      allow.owner('userId').all(),
      allow.groups(['admin']).all(),
    ])(new AuthorizationBuilder());

    expect(rules).toHaveLength(2);
    expect(rules[0].type).toBe('owner');
    expect(rules[1].type).toBe('groups');
  });

  it('should allow complex authorization logic', () => {
    const createRules = (isPublic: boolean) => {
      return (allow: AuthorizationBuilder) => {
        const rules = [allow.owner('userId').all()];

        if (isPublic) {
          rules.push(allow.public(['read', 'list']));
        }

        return rules;
      };
    };

    const publicRules = createRules(true)(new AuthorizationBuilder());
    const privateRules = createRules(false)(new AuthorizationBuilder());

    expect(publicRules).toHaveLength(2);
    expect(privateRules).toHaveLength(1);
  });
});
