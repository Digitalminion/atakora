/**
 * User Context Tests
 */

import { describe, it, expect } from 'vitest';
import {
  createUserContext,
  getAnonymousUserContext,
  isExtendedUserContext,
  isUserContext,
  type ExtendedUserContext,
} from './user-context';
import type { TokenValidationResult } from './types';

describe('User Context', () => {
  describe('createUserContext', () => {
    it('should create user context from validation result', () => {
      const validationResult: TokenValidationResult = {
        valid: true,
        userId: 'user-123',
        email: 'john@example.com',
        claims: {
          sub: 'user-123',
          email: 'john@example.com',
          name: 'John Doe',
          groups: ['developers', 'users'],
        },
      };

      const roles = ['user', 'developer'];
      const context = createUserContext(validationResult, roles, 'entra');

      expect(context.id).toBe('user-123');
      expect(context.email).toBe('john@example.com');
      expect(context.name).toBe('John Doe');
      expect(context.roles).toEqual(['user', 'developer']);
      expect(context.groups).toEqual(['user', 'developer']);
      expect(context.isAuthenticated).toBe(true);
      expect(context.provider).toBe('entra');
    });

    it('should create immutable user context', () => {
      const validationResult: TokenValidationResult = {
        valid: true,
        userId: 'user-123',
        claims: {},
      };

      const context = createUserContext(validationResult, ['user'], 'test');

      // Context should be frozen
      expect(Object.isFrozen(context)).toBe(true);

      // Groups array should be frozen
      expect(Object.isFrozen(context.groups)).toBe(true);

      // Claims should be frozen
      expect(Object.isFrozen(context.claims)).toBe(true);
    });

    it('should throw if validation result is invalid', () => {
      const invalidResult: TokenValidationResult = {
        valid: false,
        error: 'Token expired',
      };

      expect(() => {
        createUserContext(invalidResult, [], 'test');
      }).toThrow('Cannot create user context from invalid validation result');
    });

    it('should throw if user ID is missing', () => {
      const resultWithoutUserId: TokenValidationResult = {
        valid: true,
        // userId is missing
        claims: {},
      };

      expect(() => {
        createUserContext(resultWithoutUserId, [], 'test');
      }).toThrow('User ID is required to create user context');
    });

    it('should handle missing email and name', () => {
      const minimalResult: TokenValidationResult = {
        valid: true,
        userId: 'user-123',
        claims: {},
      };

      const context = createUserContext(minimalResult, [], 'test');

      expect(context.id).toBe('user-123');
      expect(context.email).toBeUndefined();
      expect(context.name).toBeUndefined();
    });

    it('should default provider to "unknown"', () => {
      const validationResult: TokenValidationResult = {
        valid: true,
        userId: 'user-123',
        claims: {},
      };

      const context = createUserContext(validationResult, []);

      expect(context.provider).toBe('unknown');
    });

    it('should include session ID when provided', () => {
      const validationResult: TokenValidationResult = {
        valid: true,
        userId: 'user-123',
        claims: {},
      };

      const context = createUserContext(validationResult, [], 'entra', 'session-456');

      expect(context.sessionId).toBe('session-456');
    });
  });

  describe('User Context Helper Methods', () => {
    let context: ExtendedUserContext;

    beforeEach(() => {
      const validationResult: TokenValidationResult = {
        valid: true,
        userId: 'user-123',
        claims: {},
      };

      context = createUserContext(validationResult, ['user', 'editor', 'developer'], 'test');
    });

    describe('hasRole', () => {
      it('should return true if user has role', () => {
        expect(context.hasRole('editor')).toBe(true);
        expect(context.hasRole('developer')).toBe(true);
      });

      it('should return false if user does not have role', () => {
        expect(context.hasRole('admin')).toBe(false);
        expect(context.hasRole('moderator')).toBe(false);
      });
    });

    describe('hasAnyRole', () => {
      it('should return true if user has at least one role', () => {
        expect(context.hasAnyRole(['admin', 'editor'])).toBe(true);
        expect(context.hasAnyRole(['developer', 'moderator'])).toBe(true);
      });

      it('should return false if user has none of the roles', () => {
        expect(context.hasAnyRole(['admin', 'moderator'])).toBe(false);
      });

      it('should return false for empty array', () => {
        expect(context.hasAnyRole([])).toBe(false);
      });
    });

    describe('hasAllRoles', () => {
      it('should return true if user has all roles', () => {
        expect(context.hasAllRoles(['user', 'editor'])).toBe(true);
        expect(context.hasAllRoles(['editor', 'developer'])).toBe(true);
      });

      it('should return false if user is missing any role', () => {
        expect(context.hasAllRoles(['user', 'admin'])).toBe(false);
        expect(context.hasAllRoles(['editor', 'moderator'])).toBe(false);
      });

      it('should return true for empty array', () => {
        expect(context.hasAllRoles([])).toBe(true);
      });
    });

    describe('isInGroup', () => {
      it('should return true if user is in group', () => {
        expect(context.isInGroup('editor')).toBe(true);
        expect(context.isInGroup('developer')).toBe(true);
      });

      it('should return false if user is not in group', () => {
        expect(context.isInGroup('admin')).toBe(false);
      });

      it('should work the same as hasRole', () => {
        expect(context.isInGroup('editor')).toBe(context.hasRole('editor'));
        expect(context.isInGroup('admin')).toBe(context.hasRole('admin'));
      });
    });
  });

  describe('getAnonymousUserContext', () => {
    it('should create anonymous user context', () => {
      const context = getAnonymousUserContext();

      expect(context.id).toBe('anonymous');
      expect(context.email).toBeUndefined();
      expect(context.name).toBeUndefined();
      expect(context.roles).toEqual([]);
      expect(context.groups).toEqual([]);
      expect(context.isAuthenticated).toBe(false);
      expect(context.provider).toBe('none');
      expect(context.sessionId).toBeUndefined();
    });

    it('should have helper methods that always return false', () => {
      const context = getAnonymousUserContext();

      expect(context.hasRole('admin')).toBe(false);
      expect(context.hasAnyRole(['admin', 'user'])).toBe(false);
      expect(context.hasAllRoles([])).toBe(false);
      expect(context.isInGroup('users')).toBe(false);
    });

    it('should be immutable', () => {
      const context = getAnonymousUserContext();

      expect(Object.isFrozen(context)).toBe(true);
      expect(Object.isFrozen(context.groups)).toBe(true);
    });
  });

  describe('isExtendedUserContext', () => {
    it('should return true for valid extended user context', () => {
      const validationResult: TokenValidationResult = {
        valid: true,
        userId: 'user-123',
        claims: {},
      };

      const context = createUserContext(validationResult, [], 'test');

      expect(isExtendedUserContext(context)).toBe(true);
    });

    it('should return true for anonymous user context', () => {
      const context = getAnonymousUserContext();

      expect(isExtendedUserContext(context)).toBe(true);
    });

    it('should return false for invalid values', () => {
      expect(isExtendedUserContext(null)).toBe(false);
      expect(isExtendedUserContext(undefined)).toBe(false);
      expect(isExtendedUserContext({})).toBe(false);
      expect(isExtendedUserContext({ id: 'test' })).toBe(false);
      expect(isExtendedUserContext({ id: 'test', roles: [] })).toBe(false);
    });

    it('should require helper methods', () => {
      const incomplete = {
        id: 'user-123',
        roles: [],
        groups: [],
        isAuthenticated: true,
        // Missing helper methods
      };

      expect(isExtendedUserContext(incomplete)).toBe(false);
    });
  });

  describe('isUserContext', () => {
    it('should return true for base user context', () => {
      const baseContext = {
        id: 'user-123',
        email: 'john@example.com',
        roles: ['user'],
        claims: {},
        provider: 'entra',
      };

      expect(isUserContext(baseContext)).toBe(true);
    });

    it('should return true for extended user context', () => {
      const validationResult: TokenValidationResult = {
        valid: true,
        userId: 'user-123',
        claims: {},
      };

      const context = createUserContext(validationResult, [], 'test');

      expect(isUserContext(context)).toBe(true);
    });

    it('should return false for invalid values', () => {
      expect(isUserContext(null)).toBe(false);
      expect(isUserContext(undefined)).toBe(false);
      expect(isUserContext({})).toBe(false);
      expect(isUserContext({ id: 'test' })).toBe(false);
    });
  });

  describe('Integration Examples', () => {
    it('should work with complete authentication flow', () => {
      // Step 1: Token validation
      const validationResult: TokenValidationResult = {
        valid: true,
        userId: 'user-123',
        email: 'john@example.com',
        claims: {
          sub: 'user-123',
          email: 'john@example.com',
          name: 'John Doe',
          groups: ['developers', 'editors'],
        },
      };

      // Step 2: Role mapping (simulated)
      const roles = ['user', 'editor', 'developer'];

      // Step 3: Create user context
      const context = createUserContext(validationResult, roles, 'entra', 'session-789');

      // Step 4: Use in authorization
      expect(context.hasRole('editor')).toBe(true);
      expect(context.hasAnyRole(['admin', 'editor'])).toBe(true);
      expect(context.isAuthenticated).toBe(true);

      // Verify all properties
      expect(context.id).toBe('user-123');
      expect(context.email).toBe('john@example.com');
      expect(context.name).toBe('John Doe');
      expect(context.roles).toEqual(['user', 'editor', 'developer']);
      expect(context.provider).toBe('entra');
      expect(context.sessionId).toBe('session-789');
    });

    it('should handle API key authentication', () => {
      const validationResult: TokenValidationResult = {
        valid: true,
        userId: 'service-key-1',
        claims: {
          keyId: 'service-key-1',
          type: 'api-key',
        },
      };

      const roles = ['service', 'admin'];

      const context = createUserContext(validationResult, roles, 'apiKeys');

      expect(context.id).toBe('service-key-1');
      expect(context.email).toBeUndefined();
      expect(context.hasRole('admin')).toBe(true);
      expect(context.hasRole('service')).toBe(true);
      expect(context.provider).toBe('apiKeys');
    });
  });
});
