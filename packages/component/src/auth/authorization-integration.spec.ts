/**
 * Authorization Integration Tests
 */

import { describe, it, expect } from 'vitest';
import {
  checkOwnership,
  checkGroups,
  checkAuthenticated,
  checkPublic,
  evaluateAuthorizationRule,
  evaluateAuthorizationRules,
  type AuthorizationRuntimeContext,
  type AuthorizationRule,
} from './authorization-integration';
import { createUserContext, getAnonymousUserContext } from './user-context';
import type { TokenValidationResult } from './types';

describe('Authorization Integration', () => {
  describe('checkOwnership', () => {
    it('should return true when user owns the record', () => {
      const validationResult: TokenValidationResult = {
        valid: true,
        userId: 'user-123',
        claims: {},
      };

      const user = createUserContext(validationResult, [], 'test');
      const record = { id: 'post-1', userId: 'user-123', title: 'My Post' };

      expect(checkOwnership(user, record, 'userId')).toBe(true);
    });

    it('should return false when user does not own the record', () => {
      const validationResult: TokenValidationResult = {
        valid: true,
        userId: 'user-123',
        claims: {},
      };

      const user = createUserContext(validationResult, [], 'test');
      const record = { id: 'post-1', userId: 'user-456', title: 'Other Post' };

      expect(checkOwnership(user, record, 'userId')).toBe(false);
    });

    it('should return false when user is not authenticated', () => {
      const user = getAnonymousUserContext();
      const record = { id: 'post-1', userId: 'user-123' };

      expect(checkOwnership(user, record, 'userId')).toBe(false);
    });

    it('should return false when record is null', () => {
      const validationResult: TokenValidationResult = {
        valid: true,
        userId: 'user-123',
        claims: {},
      };

      const user = createUserContext(validationResult, [], 'test');

      expect(checkOwnership(user, null, 'userId')).toBe(false);
    });

    it('should return false when owner field is missing', () => {
      const validationResult: TokenValidationResult = {
        valid: true,
        userId: 'user-123',
        claims: {},
      };

      const user = createUserContext(validationResult, [], 'test');
      const record = { id: 'post-1', title: 'Post without owner' };

      expect(checkOwnership(user, record, 'userId')).toBe(false);
    });

    it('should work with different owner field names', () => {
      const validationResult: TokenValidationResult = {
        valid: true,
        userId: 'user-123',
        claims: {},
      };

      const user = createUserContext(validationResult, [], 'test');
      const record = { id: 'comment-1', authorId: 'user-123', text: 'Comment' };

      expect(checkOwnership(user, record, 'authorId')).toBe(true);
      expect(checkOwnership(user, record, 'userId')).toBe(false);
    });
  });

  describe('checkGroups', () => {
    it('should return true when user has one of the required groups', () => {
      const validationResult: TokenValidationResult = {
        valid: true,
        userId: 'user-123',
        claims: {},
      };

      const user = createUserContext(validationResult, ['user', 'editor'], 'test');

      expect(checkGroups(user, ['admin', 'editor'])).toBe(true);
      expect(checkGroups(user, ['editor', 'moderator'])).toBe(true);
    });

    it('should return false when user has none of the required groups', () => {
      const validationResult: TokenValidationResult = {
        valid: true,
        userId: 'user-123',
        claims: {},
      };

      const user = createUserContext(validationResult, ['user'], 'test');

      expect(checkGroups(user, ['admin', 'editor'])).toBe(false);
    });

    it('should return false when user is not authenticated', () => {
      const user = getAnonymousUserContext();

      expect(checkGroups(user, ['admin'])).toBe(false);
    });

    it('should return true if user has all required groups', () => {
      const validationResult: TokenValidationResult = {
        valid: true,
        userId: 'user-123',
        claims: {},
      };

      const user = createUserContext(validationResult, ['user', 'editor', 'admin'], 'test');

      expect(checkGroups(user, ['admin', 'editor'])).toBe(true);
    });

    it('should handle empty groups array', () => {
      const validationResult: TokenValidationResult = {
        valid: true,
        userId: 'user-123',
        claims: {},
      };

      const user = createUserContext(validationResult, ['user'], 'test');

      expect(checkGroups(user, [])).toBe(false);
    });
  });

  describe('checkAuthenticated', () => {
    it('should return true for authenticated user', () => {
      const validationResult: TokenValidationResult = {
        valid: true,
        userId: 'user-123',
        claims: {},
      };

      const user = createUserContext(validationResult, [], 'test');

      expect(checkAuthenticated(user)).toBe(true);
    });

    it('should return false for anonymous user', () => {
      const user = getAnonymousUserContext();

      expect(checkAuthenticated(user)).toBe(false);
    });
  });

  describe('checkPublic', () => {
    it('should always return true', () => {
      expect(checkPublic()).toBe(true);
    });
  });

  describe('evaluateAuthorizationRule', () => {
    let user: ReturnType<typeof createUserContext>;
    let record: any;

    beforeEach(() => {
      const validationResult: TokenValidationResult = {
        valid: true,
        userId: 'user-123',
        claims: {},
      };

      user = createUserContext(validationResult, ['user', 'editor'], 'test');
      record = { id: 'post-1', userId: 'user-123', title: 'My Post' };
    });

    describe('owner rules', () => {
      it('should allow access when user owns record', () => {
        const rule: AuthorizationRule = {
          type: 'owner',
          field: 'userId',
        };

        const context: AuthorizationRuntimeContext = {
          user,
          record,
          operation: 'update',
        };

        expect(evaluateAuthorizationRule(rule, context)).toBe(true);
      });

      it('should deny access when user does not own record', () => {
        const rule: AuthorizationRule = {
          type: 'owner',
          field: 'userId',
        };

        const otherRecord = { id: 'post-2', userId: 'user-456' };

        const context: AuthorizationRuntimeContext = {
          user,
          record: otherRecord,
          operation: 'update',
        };

        expect(evaluateAuthorizationRule(rule, context)).toBe(false);
      });

      it('should deny access when record is missing', () => {
        const rule: AuthorizationRule = {
          type: 'owner',
          field: 'userId',
        };

        const context: AuthorizationRuntimeContext = {
          user,
          operation: 'create',
        };

        expect(evaluateAuthorizationRule(rule, context)).toBe(false);
      });

      it('should respect operation filter', () => {
        const rule: AuthorizationRule = {
          type: 'owner',
          field: 'userId',
          operations: ['update', 'delete'],
        };

        // Allowed operation
        expect(
          evaluateAuthorizationRule(rule, {
            user,
            record,
            operation: 'update',
          })
        ).toBe(true);

        // Not allowed operation
        expect(
          evaluateAuthorizationRule(rule, {
            user,
            record,
            operation: 'read',
          })
        ).toBe(false);
      });
    });

    describe('groups rules', () => {
      it('should allow access when user is in required group', () => {
        const rule: AuthorizationRule = {
          type: 'groups',
          groups: ['admin', 'editor'],
        };

        const context: AuthorizationRuntimeContext = {
          user,
          operation: 'update',
        };

        expect(evaluateAuthorizationRule(rule, context)).toBe(true);
      });

      it('should deny access when user is not in required group', () => {
        const rule: AuthorizationRule = {
          type: 'groups',
          groups: ['admin', 'moderator'],
        };

        const context: AuthorizationRuntimeContext = {
          user,
          operation: 'update',
        };

        expect(evaluateAuthorizationRule(rule, context)).toBe(false);
      });

      it('should respect operation filter', () => {
        const rule: AuthorizationRule = {
          type: 'groups',
          groups: ['editor'],
          operations: ['update'],
        };

        // Allowed operation
        expect(
          evaluateAuthorizationRule(rule, {
            user,
            operation: 'update',
          })
        ).toBe(true);

        // Not allowed operation
        expect(
          evaluateAuthorizationRule(rule, {
            user,
            operation: 'delete',
          })
        ).toBe(false);
      });
    });

    describe('authenticated rules', () => {
      it('should allow access for authenticated user', () => {
        const rule: AuthorizationRule = {
          type: 'authenticated',
        };

        const context: AuthorizationRuntimeContext = {
          user,
          operation: 'read',
        };

        expect(evaluateAuthorizationRule(rule, context)).toBe(true);
      });

      it('should deny access for anonymous user', () => {
        const rule: AuthorizationRule = {
          type: 'authenticated',
        };

        const context: AuthorizationRuntimeContext = {
          user: getAnonymousUserContext(),
          operation: 'read',
        };

        expect(evaluateAuthorizationRule(rule, context)).toBe(false);
      });

      it('should respect operation filter', () => {
        const rule: AuthorizationRule = {
          type: 'authenticated',
          operations: ['read', 'list'],
        };

        // Allowed operation
        expect(
          evaluateAuthorizationRule(rule, {
            user,
            operation: 'read',
          })
        ).toBe(true);

        // Not allowed operation
        expect(
          evaluateAuthorizationRule(rule, {
            user,
            operation: 'update',
          })
        ).toBe(false);
      });
    });

    describe('public rules', () => {
      it('should allow access for authenticated user', () => {
        const rule: AuthorizationRule = {
          type: 'public',
        };

        const context: AuthorizationRuntimeContext = {
          user,
          operation: 'read',
        };

        expect(evaluateAuthorizationRule(rule, context)).toBe(true);
      });

      it('should allow access for anonymous user', () => {
        const rule: AuthorizationRule = {
          type: 'public',
        };

        const context: AuthorizationRuntimeContext = {
          user: getAnonymousUserContext(),
          operation: 'read',
        };

        expect(evaluateAuthorizationRule(rule, context)).toBe(true);
      });

      it('should respect operation filter', () => {
        const rule: AuthorizationRule = {
          type: 'public',
          operations: ['read', 'list'],
        };

        // Allowed operation
        expect(
          evaluateAuthorizationRule(rule, {
            user,
            operation: 'read',
          })
        ).toBe(true);

        // Not allowed operation
        expect(
          evaluateAuthorizationRule(rule, {
            user,
            operation: 'update',
          })
        ).toBe(false);
      });
    });
  });

  describe('evaluateAuthorizationRules', () => {
    let user: ReturnType<typeof createUserContext>;
    let record: any;

    beforeEach(() => {
      const validationResult: TokenValidationResult = {
        valid: true,
        userId: 'user-123',
        claims: {},
      };

      user = createUserContext(validationResult, ['user', 'editor'], 'test');
      record = { id: 'post-1', userId: 'user-123', title: 'My Post' };
    });

    it('should use OR logic - allow if any rule matches', () => {
      const rules: AuthorizationRule[] = [
        { type: 'owner', field: 'userId' },
        { type: 'groups', groups: ['admin'] }, // User doesn't have admin
      ];

      const context: AuthorizationRuntimeContext = {
        user,
        record,
        operation: 'update',
      };

      // Should pass because user is owner (even though not admin)
      expect(evaluateAuthorizationRules(rules, context)).toBe(true);
    });

    it('should deny if no rules match', () => {
      const rules: AuthorizationRule[] = [
        { type: 'groups', groups: ['admin'] }, // User doesn't have admin
        { type: 'groups', groups: ['moderator'] }, // User doesn't have moderator
      ];

      const context: AuthorizationRuntimeContext = {
        user,
        operation: 'delete',
      };

      expect(evaluateAuthorizationRules(rules, context)).toBe(false);
    });

    it('should deny if rules array is empty', () => {
      const context: AuthorizationRuntimeContext = {
        user,
        operation: 'update',
      };

      expect(evaluateAuthorizationRules([], context)).toBe(false);
    });

    it('should handle complex rule combinations', () => {
      const rules: AuthorizationRule[] = [
        // Owner can do anything
        { type: 'owner', field: 'userId' },
        // Admins can do anything
        { type: 'groups', groups: ['admin'] },
        // Editors can update
        { type: 'groups', groups: ['editor'], operations: ['update'] },
        // Anyone authenticated can read
        { type: 'authenticated', operations: ['read', 'list'] },
        // Public can list
        { type: 'public', operations: ['list'] },
      ];

      // Owner can update (even though not admin)
      expect(
        evaluateAuthorizationRules(rules, {
          user,
          record,
          operation: 'update',
        })
      ).toBe(true);

      // Editor can update
      expect(
        evaluateAuthorizationRules(rules, {
          user,
          operation: 'update',
        })
      ).toBe(true);

      // Authenticated user can read
      expect(
        evaluateAuthorizationRules(rules, {
          user,
          operation: 'read',
        })
      ).toBe(true);

      // Anonymous user can list
      expect(
        evaluateAuthorizationRules(rules, {
          user: getAnonymousUserContext(),
          operation: 'list',
        })
      ).toBe(true);

      // Editor cannot delete (no matching rule)
      expect(
        evaluateAuthorizationRules(rules, {
          user,
          record: { id: 'post-2', userId: 'other-user' },
          operation: 'delete',
        })
      ).toBe(false);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle blog post authorization', () => {
      // Schema: Post model with owner and groups rules
      const postRules: AuthorizationRule[] = [
        { type: 'owner', field: 'authorId' }, // Post author can do anything
        { type: 'groups', groups: ['admin'] }, // Admins can do anything
        { type: 'groups', groups: ['editor'], operations: ['update'] }, // Editors can update
        { type: 'authenticated', operations: ['read', 'list'] }, // Auth users can read
        { type: 'public', operations: ['list'] }, // Public can list
      ];

      // User 1: Post author
      const author = createUserContext(
        { valid: true, userId: 'user-1', claims: {} },
        ['user'],
        'test'
      );

      // User 2: Editor
      const editor = createUserContext(
        { valid: true, userId: 'user-2', claims: {} },
        ['user', 'editor'],
        'test'
      );

      // User 3: Admin
      const admin = createUserContext(
        { valid: true, userId: 'user-3', claims: {} },
        ['user', 'admin'],
        'test'
      );

      // User 4: Regular user
      const regularUser = createUserContext(
        { valid: true, userId: 'user-4', claims: {} },
        ['user'],
        'test'
      );

      // Anonymous user
      const anonymous = getAnonymousUserContext();

      const post = {
        id: 'post-123',
        authorId: 'user-1',
        title: 'Test Post',
      };

      // Author can delete
      expect(
        evaluateAuthorizationRules(postRules, {
          user: author,
          record: post,
          operation: 'delete',
        })
      ).toBe(true);

      // Editor can update but not delete
      expect(
        evaluateAuthorizationRules(postRules, {
          user: editor,
          record: post,
          operation: 'update',
        })
      ).toBe(true);

      expect(
        evaluateAuthorizationRules(postRules, {
          user: editor,
          record: post,
          operation: 'delete',
        })
      ).toBe(false);

      // Admin can delete
      expect(
        evaluateAuthorizationRules(postRules, {
          user: admin,
          record: post,
          operation: 'delete',
        })
      ).toBe(true);

      // Regular user can read but not update
      expect(
        evaluateAuthorizationRules(postRules, {
          user: regularUser,
          record: post,
          operation: 'read',
        })
      ).toBe(true);

      expect(
        evaluateAuthorizationRules(postRules, {
          user: regularUser,
          record: post,
          operation: 'update',
        })
      ).toBe(false);

      // Anonymous can list but not read individual
      expect(
        evaluateAuthorizationRules(postRules, {
          user: anonymous,
          operation: 'list',
        })
      ).toBe(true);

      expect(
        evaluateAuthorizationRules(postRules, {
          user: anonymous,
          record: post,
          operation: 'read',
        })
      ).toBe(false);
    });
  });
});
