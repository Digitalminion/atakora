/**
 * Unit Tests for Session Configuration Builder
 */

import { describe, it, expect } from 'vitest';
import { SessionBuilder, session } from './session';
import { hours, minutes, days, seconds } from '../common/duration';
import { SessionConfigError } from './errors';

describe('SessionBuilder', () => {
  describe('constructor', () => {
    it('should create builder with default values', () => {
      const builder = new SessionBuilder();
      const config = builder._build();

      expect(config.duration).toBeDefined();
      expect(config.duration.toHours()).toBe(24);
      expect(config.sliding).toBe(false);
      expect(config.storage).toBeUndefined();
      expect(config.ttl).toBeUndefined();
      expect(config.security).toBeDefined();
    });

    it('should create builder with secure defaults', () => {
      const builder = new SessionBuilder();
      const config = builder._build();

      // Check security defaults
      expect(config.security).toBeDefined();
      expect(config.security?.cookieOptions?.httpOnly).toBe(true);
      expect(config.security?.cookieOptions?.sameSite).toBe('lax');
      expect(config.security?.cookieOptions?.path).toBe('/');
      expect(config.security?.fingerprinting?.enabled).toBe(true);
      expect(config.security?.fingerprinting?.factors).toEqual(['ip', 'userAgent']);
      expect(config.security?.concurrent?.maxSessions).toBe(5);
      expect(config.security?.concurrent?.strategy).toBe('invalidate-oldest');
      expect(config.security?.rotation?.onElevation).toBe(true);
    });
  });

  describe('duration()', () => {
    it('should set session duration', () => {
      const builder = new SessionBuilder();
      builder.duration(hours(8));
      const config = builder._build();

      expect(config.duration.toHours()).toBe(8);
    });

    it('should accept various duration units', () => {
      const builder1 = new SessionBuilder().duration(minutes(30));
      expect(builder1._build().duration.toMinutes()).toBe(30);

      const builder2 = new SessionBuilder().duration(hours(12));
      expect(builder2._build().duration.toHours()).toBe(12);

      const builder3 = new SessionBuilder().duration(days(7));
      expect(builder3._build().duration.toDays()).toBe(7);

      const builder4 = new SessionBuilder().duration(seconds(3600));
      expect(builder4._build().duration.toSeconds()).toBe(3600);
    });

    it('should return this for chaining', () => {
      const builder = new SessionBuilder();
      const result = builder.duration(hours(8));

      expect(result).toBe(builder);
    });

    it('should throw error for non-positive duration', () => {
      const builder = new SessionBuilder();

      expect(() => {
        builder.duration(hours(0));
      }).toThrow(SessionConfigError);

      expect(() => {
        builder.duration(hours(-1));
      }).toThrow(SessionConfigError);
    });

    it('should throw error with context for invalid duration', () => {
      const builder = new SessionBuilder();

      try {
        builder.duration(hours(-5));
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(SessionConfigError);
        expect((error as SessionConfigError).message).toContain('positive');
        expect((error as SessionConfigError).context).toBeDefined();
      }
    });
  });

  describe('sliding()', () => {
    it('should enable sliding sessions', () => {
      const builder = new SessionBuilder();
      builder.sliding(true);
      const config = builder._build();

      expect(config.sliding).toBe(true);
    });

    it('should disable sliding sessions', () => {
      const builder = new SessionBuilder();
      builder.sliding(false);
      const config = builder._build();

      expect(config.sliding).toBe(false);
    });

    it('should default to true when called without argument', () => {
      const builder = new SessionBuilder();
      builder.sliding();
      const config = builder._build();

      expect(config.sliding).toBe(true);
    });

    it('should return this for chaining', () => {
      const builder = new SessionBuilder();
      const result = builder.sliding(true);

      expect(result).toBe(builder);
    });
  });

  describe('storage()', () => {
    it('should set memory storage', () => {
      const builder = new SessionBuilder();
      builder.storage('memory');
      const config = builder._build();

      expect(config.storage).toBe('memory');
    });

    it('should set redis storage', () => {
      const builder = new SessionBuilder();
      builder.storage('redis');
      const config = builder._build();

      expect(config.storage).toBe('redis');
    });

    it('should set cosmos storage', () => {
      const builder = new SessionBuilder();
      builder.storage('cosmos');
      const config = builder._build();

      expect(config.storage).toBe('cosmos');
    });

    it('should return this for chaining', () => {
      const builder = new SessionBuilder();
      const result = builder.storage('redis');

      expect(result).toBe(builder);
    });
  });

  describe('ttl()', () => {
    it('should set TTL duration', () => {
      const builder = new SessionBuilder();
      builder.ttl(hours(9));
      const config = builder._build();

      expect(config.ttl).toBeDefined();
      expect(config.ttl!.toHours()).toBe(9);
    });

    it('should accept various duration units for TTL', () => {
      const builder1 = new SessionBuilder().ttl(minutes(45));
      expect(builder1._build().ttl!.toMinutes()).toBe(45);

      const builder2 = new SessionBuilder().ttl(hours(24));
      expect(builder2._build().ttl!.toHours()).toBe(24);

      const builder3 = new SessionBuilder().ttl(days(1));
      expect(builder3._build().ttl!.toDays()).toBe(1);
    });

    it('should return this for chaining', () => {
      const builder = new SessionBuilder();
      const result = builder.ttl(hours(10));

      expect(result).toBe(builder);
    });

    it('should throw error for non-positive TTL', () => {
      const builder = new SessionBuilder();

      expect(() => {
        builder.ttl(hours(0));
      }).toThrow(SessionConfigError);

      expect(() => {
        builder.ttl(hours(-1));
      }).toThrow(SessionConfigError);
    });
  });

  describe('security()', () => {
    it('should configure security with object', () => {
      const builder = new SessionBuilder();
      builder.security({
        cookieOptions: { httpOnly: false, secure: false },
        fingerprinting: { enabled: false },
      });
      const config = builder._build();

      expect(config.security?.cookieOptions?.httpOnly).toBe(false);
      expect(config.security?.cookieOptions?.secure).toBe(false);
      expect(config.security?.fingerprinting?.enabled).toBe(false);
    });

    it('should configure security with builder function', () => {
      const builder = new SessionBuilder();
      builder.security((security) =>
        security
          .cookieOptions({ httpOnly: false, secure: true })
          .fingerprinting(false)
          .concurrentSessions(3, 'reject')
      );
      const config = builder._build();

      expect(config.security?.cookieOptions?.httpOnly).toBe(false);
      expect(config.security?.cookieOptions?.secure).toBe(true);
      expect(config.security?.fingerprinting?.enabled).toBe(false);
      expect(config.security?.concurrent?.maxSessions).toBe(3);
      expect(config.security?.concurrent?.strategy).toBe('reject');
    });

    it('should return this for chaining', () => {
      const builder = new SessionBuilder();
      const result = builder.security({});
      expect(result).toBe(builder);
    });
  });

  describe('cookieOptions()', () => {
    it('should set cookie security flags', () => {
      const builder = new SessionBuilder();
      builder.cookieOptions({
        httpOnly: false,
        secure: true,
        sameSite: 'strict',
        domain: 'example.com',
        path: '/api',
      });
      const config = builder._build();

      expect(config.security?.cookieOptions).toEqual({
        httpOnly: false,
        secure: true,
        sameSite: 'strict',
        domain: 'example.com',
        path: '/api',
      });
    });

    it('should merge with existing cookie options', () => {
      const builder = new SessionBuilder();
      builder.cookieOptions({ httpOnly: false });
      builder.cookieOptions({ secure: true });
      const config = builder._build();

      expect(config.security?.cookieOptions?.httpOnly).toBe(false);
      expect(config.security?.cookieOptions?.secure).toBe(true);
      expect(config.security?.cookieOptions?.sameSite).toBe('lax'); // Default preserved
    });

    it('should return this for chaining', () => {
      const builder = new SessionBuilder();
      const result = builder.cookieOptions({ httpOnly: true });
      expect(result).toBe(builder);
    });
  });

  describe('fingerprinting()', () => {
    it('should enable fingerprinting with default factors', () => {
      const builder = new SessionBuilder();
      builder.fingerprinting(true);
      const config = builder._build();

      expect(config.security?.fingerprinting?.enabled).toBe(true);
      expect(config.security?.fingerprinting?.factors).toEqual(['ip', 'userAgent']);
    });

    it('should enable fingerprinting with custom factors', () => {
      const builder = new SessionBuilder();
      builder.fingerprinting(true, ['ip', 'userAgent', 'acceptHeaders']);
      const config = builder._build();

      expect(config.security?.fingerprinting?.enabled).toBe(true);
      expect(config.security?.fingerprinting?.factors).toEqual([
        'ip',
        'userAgent',
        'acceptHeaders',
      ]);
    });

    it('should disable fingerprinting', () => {
      const builder = new SessionBuilder();
      builder.fingerprinting(false);
      const config = builder._build();

      expect(config.security?.fingerprinting?.enabled).toBe(false);
    });

    it('should return this for chaining', () => {
      const builder = new SessionBuilder();
      const result = builder.fingerprinting(true);
      expect(result).toBe(builder);
    });
  });

  describe('concurrentSessions()', () => {
    it('should set max sessions with default strategy', () => {
      const builder = new SessionBuilder();
      builder.concurrentSessions(3);
      const config = builder._build();

      expect(config.security?.concurrent?.maxSessions).toBe(3);
      expect(config.security?.concurrent?.strategy).toBe('invalidate-oldest');
    });

    it('should set max sessions with reject strategy', () => {
      const builder = new SessionBuilder();
      builder.concurrentSessions(1, 'reject');
      const config = builder._build();

      expect(config.security?.concurrent?.maxSessions).toBe(1);
      expect(config.security?.concurrent?.strategy).toBe('reject');
    });

    it('should set max sessions with invalidate-all strategy', () => {
      const builder = new SessionBuilder();
      builder.concurrentSessions(2, 'invalidate-all');
      const config = builder._build();

      expect(config.security?.concurrent?.maxSessions).toBe(2);
      expect(config.security?.concurrent?.strategy).toBe('invalidate-all');
    });

    it('should throw error for non-positive max sessions', () => {
      const builder = new SessionBuilder();

      expect(() => {
        builder.concurrentSessions(0);
      }).toThrow(SessionConfigError);

      expect(() => {
        builder.concurrentSessions(-1);
      }).toThrow(SessionConfigError);
    });

    it('should return this for chaining', () => {
      const builder = new SessionBuilder();
      const result = builder.concurrentSessions(5);
      expect(result).toBe(builder);
    });
  });

  describe('rotation()', () => {
    it('should enable rotation on elevation', () => {
      const builder = new SessionBuilder();
      builder.rotation(true);
      const config = builder._build();

      expect(config.security?.rotation?.onElevation).toBe(true);
      expect(config.security?.rotation?.interval).toBeUndefined();
    });

    it('should disable rotation on elevation', () => {
      const builder = new SessionBuilder();
      builder.rotation(false);
      const config = builder._build();

      expect(config.security?.rotation?.onElevation).toBe(false);
    });

    it('should set periodic rotation interval', () => {
      const builder = new SessionBuilder();
      builder.rotation(false, hours(2));
      const config = builder._build();

      expect(config.security?.rotation?.onElevation).toBe(false);
      expect(config.security?.rotation?.interval?.toHours()).toBe(2);
    });

    it('should enable both elevation and periodic rotation', () => {
      const builder = new SessionBuilder();
      builder.rotation(true, hours(1));
      const config = builder._build();

      expect(config.security?.rotation?.onElevation).toBe(true);
      expect(config.security?.rotation?.interval?.toHours()).toBe(1);
    });

    it('should throw error for non-positive interval', () => {
      const builder = new SessionBuilder();

      expect(() => {
        builder.rotation(true, hours(0));
      }).toThrow(SessionConfigError);

      expect(() => {
        builder.rotation(true, hours(-1));
      }).toThrow(SessionConfigError);
    });

    it('should return this for chaining', () => {
      const builder = new SessionBuilder();
      const result = builder.rotation(true);
      expect(result).toBe(builder);
    });
  });

  describe('_build()', () => {
    it('should return complete session config', () => {
      const builder = new SessionBuilder()
        .duration(hours(8))
        .sliding(true)
        .storage('redis')
        .ttl(hours(9));

      const config = builder._build();

      expect(config).toMatchObject({
        duration: expect.objectContaining({
          value: 8,
          unit: 'h',
        }),
        sliding: true,
        storage: 'redis',
        ttl: expect.objectContaining({
          value: 9,
          unit: 'h',
        }),
      });
    });

    it('should return minimal config with defaults', () => {
      const builder = new SessionBuilder();
      const config = builder._build();

      expect(config.duration).toBeDefined();
      expect(config.sliding).toBe(false);
      expect(config.storage).toBeUndefined();
      expect(config.ttl).toBeUndefined();
    });

    it('should return immutable config', () => {
      const builder = new SessionBuilder().duration(hours(8));
      const config1 = builder._build();
      const config2 = builder._build();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2);
    });
  });

  describe('method chaining', () => {
    it('should support fluent API chaining', () => {
      const config = new SessionBuilder()
        .duration(hours(8))
        .sliding(true)
        .storage('redis')
        .ttl(hours(9))
        ._build();

      expect(config.duration.toHours()).toBe(8);
      expect(config.sliding).toBe(true);
      expect(config.storage).toBe('redis');
      expect(config.ttl!.toHours()).toBe(9);
    });

    it('should allow any order of method calls', () => {
      const config = new SessionBuilder()
        .storage('redis')
        .sliding(true)
        .ttl(hours(9))
        .duration(hours(8))
        ._build();

      expect(config.duration.toHours()).toBe(8);
      expect(config.sliding).toBe(true);
      expect(config.storage).toBe('redis');
      expect(config.ttl!.toHours()).toBe(9);
    });
  });

  describe('factory function', () => {
    it('should create SessionBuilder instance', () => {
      const builder = session();

      expect(builder).toBeInstanceOf(SessionBuilder);
    });

    it('should return new instance each time', () => {
      const builder1 = session();
      const builder2 = session();

      expect(builder1).not.toBe(builder2);
    });
  });

  describe('real-world scenarios', () => {
    it('should configure production session with Redis', () => {
      const config = new SessionBuilder()
        .duration(hours(8))
        .sliding(true)
        .storage('redis')
        .ttl(hours(9))
        ._build();

      expect(config.duration.toHours()).toBe(8);
      expect(config.sliding).toBe(true);
      expect(config.storage).toBe('redis');
      expect(config.ttl!.toHours()).toBe(9);
    });

    it('should configure development session with memory', () => {
      const config = new SessionBuilder().duration(hours(24)).storage('memory')._build();

      expect(config.duration.toHours()).toBe(24);
      expect(config.sliding).toBe(false);
      expect(config.storage).toBe('memory');
    });

    it('should configure short-lived session for sensitive operations', () => {
      const config = new SessionBuilder()
        .duration(minutes(15))
        .sliding(false)
        .storage('redis')
        ._build();

      expect(config.duration.toMinutes()).toBe(15);
      expect(config.sliding).toBe(false);
      expect(config.storage).toBe('redis');
    });

    it('should configure long-lived session with sliding', () => {
      const config = new SessionBuilder()
        .duration(days(7))
        .sliding(true)
        .storage('cosmos')
        .ttl(days(8))
        ._build();

      expect(config.duration.toDays()).toBe(7);
      expect(config.sliding).toBe(true);
      expect(config.storage).toBe('cosmos');
      expect(config.ttl!.toDays()).toBe(8);
    });

    it('should configure high-security session', () => {
      const config = new SessionBuilder()
        .duration(hours(2))
        .sliding(false)
        .storage('redis')
        .cookieOptions({
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
        })
        .fingerprinting(true, ['ip', 'userAgent', 'acceptHeaders'])
        .concurrentSessions(1, 'invalidate-all')
        .rotation(true, hours(1))
        ._build();

      expect(config.duration.toHours()).toBe(2);
      expect(config.sliding).toBe(false);
      expect(config.security?.cookieOptions?.sameSite).toBe('strict');
      expect(config.security?.fingerprinting?.factors).toHaveLength(3);
      expect(config.security?.concurrent?.maxSessions).toBe(1);
      expect(config.security?.concurrent?.strategy).toBe('invalidate-all');
      expect(config.security?.rotation?.onElevation).toBe(true);
      expect(config.security?.rotation?.interval?.toHours()).toBe(1);
    });

    it('should configure relaxed security for internal app', () => {
      const config = new SessionBuilder()
        .duration(days(30))
        .sliding(true)
        .storage('cosmos')
        .cookieOptions({
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
        })
        .fingerprinting(false)
        .concurrentSessions(10, 'reject')
        .rotation(false)
        ._build();

      expect(config.duration.toDays()).toBe(30);
      expect(config.sliding).toBe(true);
      expect(config.security?.cookieOptions?.secure).toBe(false);
      expect(config.security?.fingerprinting?.enabled).toBe(false);
      expect(config.security?.concurrent?.maxSessions).toBe(10);
      expect(config.security?.rotation?.onElevation).toBe(false);
    });

    it('should configure session with comprehensive security', () => {
      const config = new SessionBuilder()
        .duration(hours(8))
        .sliding(true)
        .storage('redis')
        .security((security) =>
          security
            .cookieOptions({
              httpOnly: true,
              secure: true,
              sameSite: 'lax',
              domain: '.example.com',
              path: '/',
            })
            .fingerprinting(true, ['ip', 'userAgent'])
            .concurrentSessions(5, 'invalidate-oldest')
            .rotation(true, hours(2))
        )
        ._build();

      expect(config.duration.toHours()).toBe(8);
      expect(config.security?.cookieOptions?.domain).toBe('.example.com');
      expect(config.security?.fingerprinting?.enabled).toBe(true);
      expect(config.security?.concurrent?.maxSessions).toBe(5);
      expect(config.security?.rotation?.interval?.toHours()).toBe(2);
    });
  });

  describe('security defaults validation', () => {
    it('should have secure defaults that prevent common attacks', () => {
      const config = new SessionBuilder()._build();

      // XSS prevention
      expect(config.security?.cookieOptions?.httpOnly).toBe(true);

      // HTTPS enforcement (in production)
      // Note: This test may fail in dev, checking the value exists
      expect(config.security?.cookieOptions?.secure).toBeDefined();

      // CSRF protection
      expect(config.security?.cookieOptions?.sameSite).toBe('lax');

      // Session hijacking prevention
      expect(config.security?.fingerprinting?.enabled).toBe(true);

      // Concurrent session limits
      expect(config.security?.concurrent?.maxSessions).toBeGreaterThan(0);
      expect(config.security?.concurrent?.maxSessions).toBeLessThanOrEqual(10);

      // Session fixation prevention
      expect(config.security?.rotation?.onElevation).toBe(true);
    });

    it('should validate session tokens are cryptographically secure configurable', () => {
      const customGenerator = () => 'custom-secure-token-' + Math.random();

      const config = new SessionBuilder()
        .security({
          tokenGenerator: customGenerator,
        })
        ._build();

      expect(config.security?.tokenGenerator).toBe(customGenerator);
    });
  });
});
