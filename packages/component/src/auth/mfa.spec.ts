/**
 * Unit Tests for MFA Configuration Builder
 */

import { describe, it, expect } from 'vitest';
import { MfaBuilder, mfa } from './mfa';
import { hours, minutes } from '../common/duration';
import { MfaConfigError } from './errors';

describe('MfaBuilder', () => {
  describe('constructor', () => {
    it('should create builder with default values', () => {
      const builder = new MfaBuilder();
      const config = builder._build();

      expect(config.required).toBe(false);
      expect(config.requiredForRoles).toBeUndefined();
      expect(config.challengeType).toBe('totp');
      expect(config.gracePeriod).toBeUndefined();
    });
  });

  describe('require()', () => {
    it('should enable MFA for specific roles', () => {
      const builder = new MfaBuilder();
      builder.require(['admin']);
      const config = builder._build();

      expect(config.required).toBe(true);
      expect(config.requiredForRoles).toEqual(['admin']);
    });

    it('should accept multiple roles', () => {
      const builder = new MfaBuilder();
      builder.require(['admin', 'finance', 'executive']);
      const config = builder._build();

      expect(config.required).toBe(true);
      expect(config.requiredForRoles).toEqual(['admin', 'finance', 'executive']);
    });

    it('should return this for chaining', () => {
      const builder = new MfaBuilder();
      const result = builder.require(['admin']);

      expect(result).toBe(builder);
    });

    it('should throw error for empty roles array', () => {
      const builder = new MfaBuilder();

      expect(() => {
        builder.require([]);
      }).toThrow(MfaConfigError);
    });

    it('should throw error for non-array input', () => {
      const builder = new MfaBuilder();

      expect(() => {
        builder.require(null as any);
      }).toThrow(MfaConfigError);

      expect(() => {
        builder.require(undefined as any);
      }).toThrow(MfaConfigError);

      expect(() => {
        builder.require('admin' as any);
      }).toThrow(MfaConfigError);
    });

    it('should throw error for empty string role names', () => {
      const builder = new MfaBuilder();

      expect(() => {
        builder.require(['']);
      }).toThrow(MfaConfigError);

      expect(() => {
        builder.require(['admin', '']);
      }).toThrow(MfaConfigError);

      expect(() => {
        builder.require(['   ']);
      }).toThrow(MfaConfigError);
    });

    it('should throw error for non-string role names', () => {
      const builder = new MfaBuilder();

      expect(() => {
        builder.require([123 as any]);
      }).toThrow(MfaConfigError);

      expect(() => {
        builder.require([null as any]);
      }).toThrow(MfaConfigError);

      expect(() => {
        builder.require([undefined as any]);
      }).toThrow(MfaConfigError);
    });

    it('should throw error with context for invalid roles', () => {
      const builder = new MfaBuilder();

      try {
        builder.require([]);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(MfaConfigError);
        expect((error as MfaConfigError).message).toContain('non-empty array');
        expect((error as MfaConfigError).context).toBeDefined();
      }
    });
  });

  describe('challenge()', () => {
    it('should set TOTP challenge type', () => {
      const builder = new MfaBuilder();
      builder.challenge('totp');
      const config = builder._build();

      expect(config.challengeType).toBe('totp');
    });

    it('should set SMS challenge type', () => {
      const builder = new MfaBuilder();
      builder.challenge('sms');
      const config = builder._build();

      expect(config.challengeType).toBe('sms');
    });

    it('should set email challenge type', () => {
      const builder = new MfaBuilder();
      builder.challenge('email');
      const config = builder._build();

      expect(config.challengeType).toBe('email');
    });

    it('should return this for chaining', () => {
      const builder = new MfaBuilder();
      const result = builder.challenge('totp');

      expect(result).toBe(builder);
    });

    it('should override previous challenge type', () => {
      const builder = new MfaBuilder();
      builder.challenge('sms');
      builder.challenge('totp');
      const config = builder._build();

      expect(config.challengeType).toBe('totp');
    });
  });

  describe('gracePeriod()', () => {
    it('should set grace period duration', () => {
      const builder = new MfaBuilder();
      builder.gracePeriod(hours(1));
      const config = builder._build();

      expect(config.gracePeriod).toBeDefined();
      expect(config.gracePeriod!.toHours()).toBe(1);
    });

    it('should accept various duration units', () => {
      const builder1 = new MfaBuilder().gracePeriod(minutes(15));
      expect(builder1._build().gracePeriod!.toMinutes()).toBe(15);

      const builder2 = new MfaBuilder().gracePeriod(hours(2));
      expect(builder2._build().gracePeriod!.toHours()).toBe(2);
    });

    it('should return this for chaining', () => {
      const builder = new MfaBuilder();
      const result = builder.gracePeriod(hours(1));

      expect(result).toBe(builder);
    });

    it('should throw error for non-positive grace period', () => {
      const builder = new MfaBuilder();

      expect(() => {
        builder.gracePeriod(hours(0));
      }).toThrow(MfaConfigError);

      expect(() => {
        builder.gracePeriod(hours(-1));
      }).toThrow(MfaConfigError);
    });

    it('should throw error with context for invalid grace period', () => {
      const builder = new MfaBuilder();

      try {
        builder.gracePeriod(hours(-2));
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(MfaConfigError);
        expect((error as MfaConfigError).message).toContain('positive');
        expect((error as MfaConfigError).context).toBeDefined();
      }
    });
  });

  describe('_build()', () => {
    it('should return complete MFA config', () => {
      const builder = new MfaBuilder()
        .require(['admin', 'finance'])
        .challenge('totp')
        .gracePeriod(hours(1));

      const config = builder._build();

      expect(config).toMatchObject({
        required: true,
        requiredForRoles: ['admin', 'finance'],
        challengeType: 'totp',
        gracePeriod: expect.objectContaining({
          value: 1,
          unit: 'h',
        }),
      });
    });

    it('should return minimal config with defaults', () => {
      const builder = new MfaBuilder();
      const config = builder._build();

      expect(config.required).toBe(false);
      expect(config.requiredForRoles).toBeUndefined();
      expect(config.challengeType).toBe('totp');
      expect(config.gracePeriod).toBeUndefined();
    });

    it('should return MFA disabled when require not called', () => {
      const builder = new MfaBuilder().challenge('sms').gracePeriod(hours(1));

      const config = builder._build();

      expect(config.required).toBe(false);
      expect(config.requiredForRoles).toBeUndefined();
    });

    it('should return immutable config', () => {
      const builder = new MfaBuilder().require(['admin']);
      const config1 = builder._build();
      const config2 = builder._build();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2);
    });
  });

  describe('method chaining', () => {
    it('should support fluent API chaining', () => {
      const config = new MfaBuilder()
        .require(['admin'])
        .challenge('totp')
        .gracePeriod(hours(1))
        ._build();

      expect(config.required).toBe(true);
      expect(config.requiredForRoles).toEqual(['admin']);
      expect(config.challengeType).toBe('totp');
      expect(config.gracePeriod!.toHours()).toBe(1);
    });

    it('should allow any order of method calls', () => {
      const config = new MfaBuilder()
        .gracePeriod(hours(1))
        .challenge('totp')
        .require(['admin'])
        ._build();

      expect(config.required).toBe(true);
      expect(config.requiredForRoles).toEqual(['admin']);
      expect(config.challengeType).toBe('totp');
      expect(config.gracePeriod!.toHours()).toBe(1);
    });
  });

  describe('factory function', () => {
    it('should create MfaBuilder instance', () => {
      const builder = mfa();

      expect(builder).toBeInstanceOf(MfaBuilder);
    });

    it('should return new instance each time', () => {
      const builder1 = mfa();
      const builder2 = mfa();

      expect(builder1).not.toBe(builder2);
    });
  });

  describe('real-world scenarios', () => {
    it('should configure MFA for admin users with TOTP', () => {
      const config = new MfaBuilder().require(['admin']).challenge('totp')._build();

      expect(config.required).toBe(true);
      expect(config.requiredForRoles).toEqual(['admin']);
      expect(config.challengeType).toBe('totp');
    });

    it('should configure MFA for multiple sensitive roles', () => {
      const config = new MfaBuilder()
        .require(['admin', 'finance', 'executive'])
        .challenge('totp')
        .gracePeriod(hours(1))
        ._build();

      expect(config.required).toBe(true);
      expect(config.requiredForRoles).toEqual(['admin', 'finance', 'executive']);
      expect(config.challengeType).toBe('totp');
      expect(config.gracePeriod!.toHours()).toBe(1);
    });

    it('should configure SMS-based MFA', () => {
      const config = new MfaBuilder().require(['admin']).challenge('sms')._build();

      expect(config.required).toBe(true);
      expect(config.challengeType).toBe('sms');
    });

    it('should configure email-based MFA with grace period', () => {
      const config = new MfaBuilder()
        .require(['admin'])
        .challenge('email')
        .gracePeriod(minutes(30))
        ._build();

      expect(config.required).toBe(true);
      expect(config.challengeType).toBe('email');
      expect(config.gracePeriod!.toMinutes()).toBe(30);
    });

    it('should configure MFA for all authenticated users', () => {
      const config = new MfaBuilder().require(['authenticated']).challenge('totp')._build();

      expect(config.required).toBe(true);
      expect(config.requiredForRoles).toEqual(['authenticated']);
    });

    it('should configure disabled MFA (default)', () => {
      const config = new MfaBuilder()._build();

      expect(config.required).toBe(false);
      expect(config.requiredForRoles).toBeUndefined();
      expect(config.challengeType).toBe('totp'); // Default
    });
  });
});
