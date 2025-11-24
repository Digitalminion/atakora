/**
 * Tests for authentication error classes
 */

import { describe, it, expect } from 'vitest';
import {
  AuthError,
  AuthDefinitionError,
  TokenValidationError,
  RoleMappingError,
  ProviderConfigError,
  SessionConfigError,
  MfaConfigError,
  createAuthError,
  formatAuthError,
  AuthErrorMessages,
} from './errors';

describe('auth/errors', () => {
  describe('AuthError', () => {
    it('should create base error with message and code', () => {
      const error = new AuthError('Test error', 'TEST_CODE');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AuthError);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('AuthError');
    });

    it('should include context if provided', () => {
      const context = { provider: 'test', field: 'value' };
      const error = new AuthError('Test error', 'TEST_CODE', context);

      expect(error.context).toEqual(context);
    });

    it('should have proper stack trace', () => {
      const error = new AuthError('Test error', 'TEST_CODE');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('AuthError');
    });
  });

  describe('Specific error classes', () => {
    describe('AuthDefinitionError', () => {
      it('should create auth definition error', () => {
        const error = new AuthDefinitionError('Invalid definition');

        expect(error).toBeInstanceOf(AuthError);
        expect(error).toBeInstanceOf(AuthDefinitionError);
        expect(error.message).toBe('Invalid definition');
        expect(error.code).toBe('AUTH_DEFINITION_ERROR');
        expect(error.name).toBe('AuthDefinitionError');
      });

      it('should accept context', () => {
        const context = { provider: 'Primary' };
        const error = new AuthDefinitionError('Invalid', context);

        expect(error.context).toEqual(context);
      });
    });

    describe('TokenValidationError', () => {
      it('should create token validation error', () => {
        const error = new TokenValidationError('Token expired');

        expect(error).toBeInstanceOf(AuthError);
        expect(error).toBeInstanceOf(TokenValidationError);
        expect(error.message).toBe('Token expired');
        expect(error.code).toBe('TOKEN_VALIDATION_ERROR');
        expect(error.name).toBe('TokenValidationError');
      });
    });

    describe('RoleMappingError', () => {
      it('should create role mapping error', () => {
        const error = new RoleMappingError('Role mapping failed');

        expect(error).toBeInstanceOf(AuthError);
        expect(error).toBeInstanceOf(RoleMappingError);
        expect(error.message).toBe('Role mapping failed');
        expect(error.code).toBe('ROLE_MAPPING_ERROR');
        expect(error.name).toBe('RoleMappingError');
      });
    });

    describe('ProviderConfigError', () => {
      it('should create provider config error', () => {
        const error = new ProviderConfigError('Invalid config', 'Primary');

        expect(error).toBeInstanceOf(AuthError);
        expect(error).toBeInstanceOf(ProviderConfigError);
        expect(error.message).toBe('Invalid config');
        expect(error.code).toBe('PROVIDER_CONFIG_ERROR');
        expect(error.name).toBe('ProviderConfigError');
        expect(error.context?.provider).toBe('Primary');
      });

      it('should merge context with provider name', () => {
        const context = { field: 'tenant' };
        const error = new ProviderConfigError('Invalid', 'Primary', context);

        expect(error.context).toEqual({
          provider: 'Primary',
          field: 'tenant',
        });
      });
    });

    describe('SessionConfigError', () => {
      it('should create session config error', () => {
        const error = new SessionConfigError('Invalid duration');

        expect(error).toBeInstanceOf(AuthError);
        expect(error).toBeInstanceOf(SessionConfigError);
        expect(error.message).toBe('Invalid duration');
        expect(error.code).toBe('SESSION_CONFIG_ERROR');
        expect(error.name).toBe('SessionConfigError');
      });
    });

    describe('MfaConfigError', () => {
      it('should create MFA config error', () => {
        const error = new MfaConfigError('Invalid MFA type');

        expect(error).toBeInstanceOf(AuthError);
        expect(error).toBeInstanceOf(MfaConfigError);
        expect(error.message).toBe('Invalid MFA type');
        expect(error.code).toBe('MFA_CONFIG_ERROR');
        expect(error.name).toBe('MfaConfigError');
      });
    });
  });

  describe('createAuthError', () => {
    it('should create auth definition error', () => {
      const error = createAuthError('definition', 'Test message');

      expect(error).toBeInstanceOf(AuthDefinitionError);
      expect(error.message).toBe('Test message');
    });

    it('should create token validation error', () => {
      const error = createAuthError('token', 'Test message');

      expect(error).toBeInstanceOf(TokenValidationError);
      expect(error.message).toBe('Test message');
    });

    it('should create role mapping error', () => {
      const error = createAuthError('role', 'Test message');

      expect(error).toBeInstanceOf(RoleMappingError);
      expect(error.message).toBe('Test message');
    });

    it('should create provider config error', () => {
      const error = createAuthError('provider', 'Test message', { provider: 'Primary' });

      expect(error).toBeInstanceOf(ProviderConfigError);
      expect(error.message).toBe('Test message');
      expect(error.context?.provider).toBe('Primary');
    });

    it('should create session config error', () => {
      const error = createAuthError('session', 'Test message');

      expect(error).toBeInstanceOf(SessionConfigError);
      expect(error.message).toBe('Test message');
    });

    it('should create MFA config error', () => {
      const error = createAuthError('mfa', 'Test message');

      expect(error).toBeInstanceOf(MfaConfigError);
      expect(error.message).toBe('Test message');
    });

    it('should create generic auth error for unknown type', () => {
      const error = createAuthError('unknown' as any, 'Test message');

      expect(error).toBeInstanceOf(AuthError);
      expect(error.code).toBe('UNKNOWN_AUTH_ERROR');
    });

    it('should pass context to created error', () => {
      const context = { field: 'test', value: 123 };
      const error = createAuthError('definition', 'Test message', context);

      expect(error.context).toEqual(context);
    });
  });

  describe('formatAuthError', () => {
    it('should format error message without details', () => {
      const formatted = formatAuthError('Test error');
      expect(formatted).toBe('Test error');
    });

    it('should format error message with details', () => {
      const details = {
        provider: 'Primary',
        field: 'tenant',
        value: null,
      };

      const formatted = formatAuthError('Test error', details);

      expect(formatted).toContain('Test error');
      expect(formatted).toContain('Details:');
      expect(formatted).toContain('provider: "Primary"');
      expect(formatted).toContain('field: "tenant"');
      expect(formatted).toContain('value: null');
    });

    it('should handle empty details object', () => {
      const formatted = formatAuthError('Test error', {});
      expect(formatted).toBe('Test error');
    });
  });

  describe('AuthErrorMessages', () => {
    it('should have definition error messages', () => {
      expect(AuthErrorMessages.EMPTY_DEFINITION).toBe('Authentication definition cannot be empty');
      expect(AuthErrorMessages.NO_PROVIDERS).toBe(
        'At least one authentication provider must be defined'
      );
    });

    it('should have provider name error message', () => {
      const message = AuthErrorMessages.INVALID_PROVIDER_NAME('test-name');
      expect(message).toContain('Invalid provider name "test-name"');
      expect(message).toContain('PascalCase');
    });

    it('should have duplicate provider error message', () => {
      const message = AuthErrorMessages.DUPLICATE_PROVIDER('Primary');
      expect(message).toContain('Duplicate provider name "Primary"');
    });

    it('should have provider config error messages', () => {
      const missingMessage = AuthErrorMessages.MISSING_REQUIRED_CONFIG('Primary', 'tenant');
      expect(missingMessage).toContain('Provider "Primary"');
      expect(missingMessage).toContain('missing required configuration field: tenant');

      const invalidMessage = AuthErrorMessages.INVALID_CONFIG_VALUE('Primary', 'tenant', 123);
      expect(invalidMessage).toContain('Provider "Primary"');
      expect(invalidMessage).toContain('invalid value for field "tenant": 123');

      const buildMessage = AuthErrorMessages.PROVIDER_BUILD_FAILED('Primary', 'Build error');
      expect(buildMessage).toContain('Failed to build provider "Primary": Build error');
    });

    it('should have token error messages', () => {
      expect(AuthErrorMessages.INVALID_TOKEN_FORMAT).toBe('Invalid token format');
      expect(AuthErrorMessages.TOKEN_EXPIRED).toBe('Authentication token has expired');
      expect(AuthErrorMessages.TOKEN_SIGNATURE_INVALID).toBe('Token signature validation failed');

      const issuerMessage = AuthErrorMessages.TOKEN_ISSUER_MISMATCH('expected', 'actual');
      expect(issuerMessage).toContain('Expected: expected');
      expect(issuerMessage).toContain('Actual: actual');

      const audienceMessage = AuthErrorMessages.TOKEN_AUDIENCE_MISMATCH('expected', 'actual');
      expect(audienceMessage).toContain('Expected: expected');
      expect(audienceMessage).toContain('Actual: actual');
    });

    it('should have role error messages', () => {
      const mappingMessage = AuthErrorMessages.ROLE_MAPPING_FAILED('Mapping error');
      expect(mappingMessage).toContain('Failed to map user roles: Mapping error');

      const invalidMessage = AuthErrorMessages.INVALID_ROLE('test-role');
      expect(invalidMessage).toContain('Invalid role "test-role"');
    });

    it('should have session error messages', () => {
      expect(AuthErrorMessages.INVALID_SESSION_DURATION).toBe('Session duration must be positive');

      const storageMessage = AuthErrorMessages.UNSUPPORTED_SESSION_STORAGE('filesystem');
      expect(storageMessage).toContain('Unsupported session storage type: filesystem');
    });

    it('should have MFA error messages', () => {
      const challengeMessage = AuthErrorMessages.INVALID_MFA_CHALLENGE('biometric');
      expect(challengeMessage).toContain('Invalid MFA challenge type: biometric');

      expect(AuthErrorMessages.MFA_REQUIRED).toBe('Multi-factor authentication is required');
    });
  });
});
