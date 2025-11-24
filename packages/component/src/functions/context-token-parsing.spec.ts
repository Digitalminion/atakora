/**
 * User Context Token Parsing Tests
 *
 * @remarks
 * Tests for token parsing and user context extraction from various token formats.
 * Tests JWT tokens, API keys, Azure AD tokens, and edge cases.
 */

import { describe, it, expect } from 'vitest';
import { createUserContextFromToken } from './context';

// ============================================================================
// Test Cases
// ============================================================================

describe('User Context Token Parsing', () => {
  describe('Standard JWT tokens', () => {
    it('should extract user ID from sub claim', () => {
      const token = {
        sub: 'user-12345',
        email: 'john@example.com',
        name: 'John Doe',
        roles: ['user', 'admin'],
      };

      const context = createUserContextFromToken(token);

      expect(context.id).toBe('user-12345');
      expect(context.email).toBe('john@example.com');
      expect(context.name).toBe('John Doe');
      expect(context.roles).toEqual(['user', 'admin']);
      expect(context.claims).toEqual(token);
    });

    it('should handle missing optional fields', () => {
      const token = {
        sub: 'user-123',
        email: 'user@example.com',
      };

      const context = createUserContextFromToken(token);

      expect(context.id).toBe('user-123');
      expect(context.email).toBe('user@example.com');
      expect(context.roles).toEqual([]);
      expect(context.name).toBe('user@example.com'); // Falls back to email
    });
  });

  describe('Azure AD tokens', () => {
    it('should extract user ID from oid claim', () => {
      const token = {
        oid: 'azure-obj-id-123',
        upn: 'user@tenant.onmicrosoft.com',
        name: 'Azure User',
        roles: ['Reader'],
      };

      const context = createUserContextFromToken(token);

      expect(context.id).toBe('azure-obj-id-123');
      expect(context.email).toBe('user@tenant.onmicrosoft.com');
      expect(context.name).toBe('Azure User');
    });

    it('should prefer sub over oid', () => {
      const token = {
        sub: 'subject-123',
        oid: 'object-456',
        email: 'user@example.com',
      };

      const context = createUserContextFromToken(token);

      expect(context.id).toBe('subject-123');
    });

    it('should extract email from upn if email missing', () => {
      const token = {
        sub: 'user-123',
        upn: 'user@tenant.onmicrosoft.com',
      };

      const context = createUserContextFromToken(token);

      expect(context.email).toBe('user@tenant.onmicrosoft.com');
    });

    it('should extract email from preferred_username', () => {
      const token = {
        sub: 'user-123',
        preferred_username: 'user@example.com',
      };

      const context = createUserContextFromToken(token);

      expect(context.email).toBe('user@example.com');
    });

    it('should extract email from unique_name (legacy)', () => {
      const token = {
        sub: 'user-123',
        unique_name: 'legacy@example.com',
      };

      const context = createUserContextFromToken(token);

      expect(context.email).toBe('legacy@example.com');
    });

    it('should extract roles from groups claim', () => {
      const token = {
        sub: 'user-123',
        email: 'user@example.com',
        groups: ['group-1', 'group-2', 'admin-group'],
      };

      const context = createUserContextFromToken(token);

      expect(context.roles).toEqual(['group-1', 'group-2', 'admin-group']);
    });

    it('should handle group objects with displayName', () => {
      const token = {
        sub: 'user-123',
        email: 'user@example.com',
        groups: [{ displayName: 'Administrators' }, { displayName: 'Users' }, 'group-id-123'],
      };

      const context = createUserContextFromToken(token);

      expect(context.roles).toContain('Administrators');
      expect(context.roles).toContain('Users');
      expect(context.roles).toContain('group-id-123');
    });

    it('should combine roles and groups', () => {
      const token = {
        sub: 'user-123',
        email: 'user@example.com',
        roles: ['admin', 'user'],
        groups: ['group-1', 'group-2'],
      };

      const context = createUserContextFromToken(token);

      expect(context.roles).toEqual(['admin', 'user', 'group-1', 'group-2']);
    });

    it('should handle wids (well-known directory roles)', () => {
      const token = {
        sub: 'user-123',
        email: 'user@example.com',
        wids: ['62e90394-69f5-4237-9190-012177145e10'], // Global Administrator
      };

      const context = createUserContextFromToken(token);

      expect(context.roles).toContain('wid:62e90394-69f5-4237-9190-012177145e10');
    });

    it('should remove duplicate roles', () => {
      const token = {
        sub: 'user-123',
        email: 'user@example.com',
        roles: ['admin', 'user', 'admin'],
        groups: ['admin', 'moderator'],
      };

      const context = createUserContextFromToken(token);

      expect(context.roles).toEqual(['admin', 'user', 'moderator']);
    });
  });

  describe('Service principal tokens', () => {
    it('should extract ID from appid claim', () => {
      const token = {
        appid: 'app-id-12345',
        roles: ['Application.ReadWrite'],
      };

      const context = createUserContextFromToken(token);

      expect(context.id).toBe('app-id-12345');
    });

    it('should prefer sub/oid over appid', () => {
      const token = {
        sub: 'subject-123',
        appid: 'app-id-456',
      };

      const context = createUserContextFromToken(token);

      expect(context.id).toBe('subject-123');
    });
  });

  describe('Custom claims', () => {
    it('should extract ID from custom userId claim', () => {
      const token = {
        userId: 'custom-user-id',
        email: 'user@example.com',
      };

      const context = createUserContextFromToken(token);

      expect(context.id).toBe('custom-user-id');
    });

    it('should extract name from given_name and family_name', () => {
      const token = {
        sub: 'user-123',
        email: 'user@example.com',
        given_name: 'John',
        family_name: 'Doe',
      };

      const context = createUserContextFromToken(token);

      expect(context.name).toBe('John Doe');
    });

    it('should handle partial name claims', () => {
      const token = {
        sub: 'user-123',
        email: 'user@example.com',
        given_name: 'John',
      };

      const context = createUserContextFromToken(token);

      expect(context.name).toBe('John');
    });

    it('should fall back to email for name', () => {
      const token = {
        sub: 'user-123',
        email: 'user@example.com',
      };

      const context = createUserContextFromToken(token);

      expect(context.name).toBe('user@example.com');
    });
  });

  describe('Edge cases', () => {
    it('should handle null token', () => {
      const context = createUserContextFromToken(null);

      expect(context.id).toBe('anonymous');
      expect(context.email).toBe('anonymous@unknown.com');
      expect(context.roles).toEqual([]);
      expect(context.name).toBe('Anonymous User');
    });

    it('should handle undefined token', () => {
      const context = createUserContextFromToken(undefined);

      expect(context.id).toBe('anonymous');
      expect(context.email).toBe('anonymous@unknown.com');
    });

    it('should handle empty token object', () => {
      const context = createUserContextFromToken({});

      expect(context.id).toBe('unknown');
      expect(context.email).toBe('unknown@example.com');
      expect(context.roles).toEqual([]);
    });

    it('should handle string token (invalid format)', () => {
      const context = createUserContextFromToken('invalid-token-string');

      expect(context.id).toBe('anonymous');
    });

    it('should trim whitespace from claims', () => {
      const token = {
        sub: '  user-123  ',
        email: '  user@example.com  ',
        name: '  John Doe  ',
        roles: ['  admin  ', '  user  '],
      };

      const context = createUserContextFromToken(token);

      expect(context.id).toBe('user-123');
      expect(context.email).toBe('user@example.com');
      expect(context.name).toBe('John Doe');
      expect(context.roles).toEqual(['admin', 'user']);
    });

    it('should filter out empty roles', () => {
      const token = {
        sub: 'user-123',
        email: 'user@example.com',
        roles: ['admin', '', '  ', 'user', null, undefined],
      };

      const context = createUserContextFromToken(token);

      expect(context.roles).toEqual(['admin', 'user']);
    });

    it('should handle non-string role values', () => {
      const token = {
        sub: 'user-123',
        email: 'user@example.com',
        roles: ['admin', 123, { invalid: 'object' }, true],
      };

      const context = createUserContextFromToken(token);

      expect(context.roles).toEqual(['admin']);
    });

    it('should handle non-array roles', () => {
      const token = {
        sub: 'user-123',
        email: 'user@example.com',
        roles: 'admin',
      };

      const context = createUserContextFromToken(token);

      expect(context.roles).toEqual([]);
    });
  });

  describe('Real-world token examples', () => {
    it('should parse Azure AD B2C token', () => {
      const token = {
        sub: '00000000-0000-0000-0000-000000000000',
        oid: 'b2c-user-oid',
        emails: ['user@example.com'],
        given_name: 'John',
        family_name: 'Doe',
        extension_AppRole: 'admin',
      };

      const context = createUserContextFromToken(token);

      expect(context.id).toBe('00000000-0000-0000-0000-000000000000');
      // Note: emails array is not handled in current implementation
      // This demonstrates a potential enhancement
    });

    it('should parse Entra ID (Azure AD) work account token', () => {
      const token = {
        aud: 'api://my-app',
        iss: 'https://login.microsoftonline.com/tenant-id/v2.0',
        iat: 1700000000,
        nbf: 1700000000,
        exp: 1700003600,
        sub: 'AAAAAaaaAAA-AaAaAaAAAaAa_AAAaAaAaAaAaAaA',
        oid: '00000000-0000-0000-0000-000000000000',
        upn: 'user@contoso.com',
        name: 'John Doe',
        groups: ['admin-group-id', 'user-group-id'],
        wids: ['62e90394-69f5-4237-9190-012177145e10'],
      };

      const context = createUserContextFromToken(token);

      expect(context.id).toBe('AAAAAaaaAAA-AaAaAaAAAaAa_AAAaAaAaAaAaAaA');
      expect(context.email).toBe('user@contoso.com');
      expect(context.name).toBe('John Doe');
      expect(context.roles).toContain('admin-group-id');
      expect(context.roles).toContain('wid:62e90394-69f5-4237-9190-012177145e10');
    });

    it('should parse API key token (custom format)', () => {
      const token = {
        sub: 'api-key-12345',
        email: 'service@example.com',
        roles: ['api-access'],
        apiKeyId: 'key-abcdef',
        scope: 'read:data write:data',
      };

      const context = createUserContextFromToken(token);

      expect(context.id).toBe('api-key-12345');
      expect(context.email).toBe('service@example.com');
      expect(context.roles).toEqual(['api-access']);
      expect(context.claims.apiKeyId).toBe('key-abcdef');
      expect(context.claims.scope).toBe('read:data write:data');
    });
  });
});
