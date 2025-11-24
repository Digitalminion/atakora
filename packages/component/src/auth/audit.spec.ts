/**
 * Security Audit Logging System Tests
 *
 * @module auth/audit.spec
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SecurityAuditor,
  SecurityEvent,
  SecurityEventType,
  RiskLevel,
  createConsoleAuditor,
  createHighRiskAuditor,
  createMultiHandlerAuditor,
} from './audit';

describe('SecurityAuditor', () => {
  let auditor: SecurityAuditor;

  beforeEach(() => {
    auditor = new SecurityAuditor();
  });

  describe('Event Emission', () => {
    it('should emit events with timestamp', () => {
      const handler = vi.fn();
      auditor.onEvent(handler);

      auditor.emit({
        type: 'auth.success',
        userId: 'user123',
      });

      expect(handler).toHaveBeenCalledTimes(1);
      const event = handler.mock.calls[0][0] as SecurityEvent;
      expect(event.timestamp).toBeDefined();
      expect(new Date(event.timestamp).getTime()).toBeCloseTo(Date.now(), -2);
    });

    it('should notify all registered handlers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      auditor.onEvent(handler1);
      auditor.onEvent(handler2);
      auditor.onEvent(handler3);

      auditor.emit({
        type: 'auth.failure',
        userId: 'user456',
      });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler3).toHaveBeenCalledTimes(1);
    });

    it('should handle handler errors gracefully', () => {
      const goodHandler = vi.fn();
      const badHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      const anotherGoodHandler = vi.fn();

      auditor.onEvent(goodHandler);
      auditor.onEvent(badHandler);
      auditor.onEvent(anotherGoodHandler);

      // Should not throw
      expect(() => {
        auditor.emit({
          type: 'auth.success',
          userId: 'user789',
        });
      }).not.toThrow();

      expect(goodHandler).toHaveBeenCalled();
      expect(badHandler).toHaveBeenCalled();
      expect(anotherGoodHandler).toHaveBeenCalled();
    });

    it('should handle async handler errors gracefully', async () => {
      const handler = vi.fn(async () => {
        throw new Error('Async handler error');
      });

      auditor.onEvent(handler);

      // Should not throw
      expect(() => {
        auditor.emit({
          type: 'auth.success',
          userId: 'user999',
        });
      }).not.toThrow();

      expect(handler).toHaveBeenCalled();
    });

    it('should support unsubscribing handlers', () => {
      const handler = vi.fn();
      const unsubscribe = auditor.onEvent(handler);

      auditor.emit({ type: 'auth.success' });
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();

      auditor.emit({ type: 'auth.success' });
      expect(handler).toHaveBeenCalledTimes(1); // Still 1, not called again
    });
  });

  describe('Risk Scoring', () => {
    it('should automatically calculate risk scores', () => {
      const handler = vi.fn();
      auditor.onEvent(handler);

      // Low risk event
      auditor.emit({
        type: 'auth.success',
        userId: 'user123',
      });

      let event = handler.mock.calls[0][0] as SecurityEvent;
      expect(event.risk).toBe('low');

      // High risk event
      auditor.emit({
        type: 'auth.rate.limited',
        userId: 'user456',
      });

      event = handler.mock.calls[1][0] as SecurityEvent;
      expect(event.risk).toBe('high');

      // Critical risk event
      auditor.emit({
        type: 'auth.suspicious.activity',
        userId: 'user789',
      });

      event = handler.mock.calls[2][0] as SecurityEvent;
      expect(event.risk).toBe('critical');
    });

    it('should escalate risk based on failure count', () => {
      const handler = vi.fn();
      auditor.onEvent(handler);

      // First failure - low risk
      auditor.emit({
        type: 'auth.failure',
        userId: 'user123',
        metadata: { attempts: 1 },
      });

      let event = handler.mock.calls[0][0] as SecurityEvent;
      expect(event.risk).toBe('low');

      // 4th failure - medium risk
      auditor.emit({
        type: 'auth.failure',
        userId: 'user123',
        metadata: { attempts: 4 },
      });

      event = handler.mock.calls[1][0] as SecurityEvent;
      expect(event.risk).toBe('medium');

      // 6th failure - high risk
      auditor.emit({
        type: 'auth.failure',
        userId: 'user123',
        metadata: { attempts: 6 },
      });

      event = handler.mock.calls[2][0] as SecurityEvent;
      expect(event.risk).toBe('high');

      // 11th failure - critical risk
      auditor.emit({
        type: 'auth.failure',
        userId: 'user123',
        metadata: { attempts: 11 },
      });

      event = handler.mock.calls[3][0] as SecurityEvent;
      expect(event.risk).toBe('critical');
    });

    it('should track failure counts by user', () => {
      const handler = vi.fn();
      auditor.onEvent(handler);

      // Multiple failures for same user
      for (let i = 0; i < 7; i++) {
        auditor.emit({
          type: 'auth.failure',
          userId: 'user123',
        });
      }

      const lastEvent = handler.mock.calls[6][0] as SecurityEvent;
      expect(lastEvent.risk).toBe('high'); // 7 failures = high risk
    });

    it('should track failure counts by IP', () => {
      const handler = vi.fn();
      auditor.onEvent(handler);

      // Multiple failures from same IP
      for (let i = 0; i < 12; i++) {
        auditor.emit({
          type: 'auth.failure',
          ip: '192.168.1.1',
        });
      }

      const lastEvent = handler.mock.calls[11][0] as SecurityEvent;
      expect(lastEvent.risk).toBe('critical'); // 12 failures = critical risk
    });

    it('should reset failure counts on success', () => {
      const handler = vi.fn();
      auditor.onEvent(handler);

      // Some failures
      for (let i = 0; i < 5; i++) {
        auditor.emit({
          type: 'auth.failure',
          userId: 'user123',
        });
      }

      // Success resets the counter
      auditor.emit({
        type: 'auth.success',
        userId: 'user123',
      });

      // Next failure should be low risk again
      auditor.emit({
        type: 'auth.failure',
        userId: 'user123',
      });

      const lastEvent = handler.mock.calls[handler.mock.calls.length - 1][0] as SecurityEvent;
      expect(lastEvent.risk).toBe('low');
    });

    it('should use custom risk scorer if provided', () => {
      const customScorer = vi.fn(() => 'medium' as RiskLevel);
      auditor = new SecurityAuditor({
        customRiskScorer: customScorer,
      });

      const handler = vi.fn();
      auditor.onEvent(handler);

      auditor.emit({
        type: 'auth.success',
        userId: 'user123',
      });

      expect(customScorer).toHaveBeenCalled();
      const event = handler.mock.calls[0][0] as SecurityEvent;
      expect(event.risk).toBe('medium');
    });

    it('should not override explicitly set risk', () => {
      const handler = vi.fn();
      auditor.onEvent(handler);

      auditor.emit({
        type: 'auth.success',
        userId: 'user123',
        risk: 'critical', // Explicitly set
      } as SecurityEvent);

      const event = handler.mock.calls[0][0] as SecurityEvent;
      expect(event.risk).toBe('critical'); // Should keep explicit value
    });
  });

  describe('Secret Redaction', () => {
    it('should redact tokens from metadata', () => {
      const handler = vi.fn();
      auditor.onEvent(handler);

      auditor.emit({
        type: 'auth.failure',
        metadata: {
          token:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
          reason: 'Invalid token',
        },
      });

      const event = handler.mock.calls[0][0] as SecurityEvent;
      expect(event.metadata?.token).toBe('[REDACTED]');
      expect(event.metadata?.reason).toBe('Invalid token');
    });

    it('should redact API keys from metadata', () => {
      const handler = vi.fn();
      auditor.onEvent(handler);

      auditor.emit({
        type: 'auth.failure',
        metadata: {
          apiKey: 'sk_live_1234567890abcdef',
          api_key: 'pk_test_abcdefghijklmnop',
          message: 'API key validation failed',
        },
      });

      const event = handler.mock.calls[0][0] as SecurityEvent;
      expect(event.metadata?.apiKey).toBe('[REDACTED]');
      expect(event.metadata?.api_key).toBe('[REDACTED]');
      expect(event.metadata?.message).toBe('API key validation failed');
    });

    it('should redact passwords from metadata', () => {
      const handler = vi.fn();
      auditor.onEvent(handler);

      auditor.emit({
        type: 'auth.failure',
        metadata: {
          password: 'supersecret123',
          newPassword: 'newsecret456',
          oldPassword: 'oldsecret789',
          username: 'john.doe',
        },
      });

      const event = handler.mock.calls[0][0] as SecurityEvent;
      expect(event.metadata?.password).toBe('[REDACTED]');
      expect(event.metadata?.newPassword).toBe('[REDACTED]');
      expect(event.metadata?.oldPassword).toBe('[REDACTED]');
      expect(event.metadata?.username).toBe('john.doe');
    });

    it('should redact Bearer tokens from strings', () => {
      const handler = vi.fn();
      auditor.onEvent(handler);

      auditor.emit({
        type: 'auth.failure',
        metadata: {
          authHeader: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
          error: 'Invalid Bearer token provided',
        },
      });

      const event = handler.mock.calls[0][0] as SecurityEvent;
      expect(event.metadata?.authHeader).toContain('[REDACTED]');
      expect(event.metadata?.authHeader).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });

    it('should redact nested secrets', () => {
      const handler = vi.fn();
      auditor.onEvent(handler);

      auditor.emit({
        type: 'auth.failure',
        metadata: {
          request: {
            headers: {
              authorization: 'Bearer secret123',
              'x-api-key': 'api_key_456',
            },
            body: {
              username: 'user@example.com',
              password: 'password789',
            },
          },
        },
      });

      const event = handler.mock.calls[0][0] as SecurityEvent;
      expect(event.metadata?.request.headers.authorization).toBe('[REDACTED]');
      expect(event.metadata?.request.headers['x-api-key']).toBe('[REDACTED]');
      expect(event.metadata?.request.body.username).toBe('user@example.com');
      expect(event.metadata?.request.body.password).toBe('[REDACTED]');
    });

    it('should redact secrets in arrays', () => {
      const handler = vi.fn();
      auditor.onEvent(handler);

      auditor.emit({
        type: 'auth.failure',
        metadata: {
          tokens: ['token1_abcdef123456', 'token2_ghijkl789012', 'regular_string'],
          apiKeys: [
            { key: 'sk_live_123', name: 'Production' },
            { key: 'sk_test_456', name: 'Testing' },
          ],
        },
      });

      const event = handler.mock.calls[0][0] as SecurityEvent;
      expect(event.metadata?.tokens[0]).toBe('[REDACTED]');
      expect(event.metadata?.tokens[1]).toBe('[REDACTED]');
      expect(event.metadata?.tokens[2]).toBe('regular_string');
      expect(event.metadata?.apiKeys[0].key).toBe('[REDACTED]');
      expect(event.metadata?.apiKeys[0].name).toBe('Production');
    });

    it('should allow disabling secret redaction', () => {
      auditor = new SecurityAuditor({
        redactSecrets: false,
      });

      const handler = vi.fn();
      auditor.onEvent(handler);

      auditor.emit({
        type: 'auth.failure',
        metadata: {
          token: 'secret_token_12345',
          password: 'password123',
        },
      });

      const event = handler.mock.calls[0][0] as SecurityEvent;
      expect(event.metadata?.token).toBe('secret_token_12345');
      expect(event.metadata?.password).toBe('password123');
    });

    it('should use custom secret patterns', () => {
      auditor = new SecurityAuditor({
        secretPatterns: [/custom_secret_\w+/g],
      });

      const handler = vi.fn();
      auditor.onEvent(handler);

      auditor.emit({
        type: 'auth.failure',
        metadata: {
          custom: 'custom_secret_12345',
          standard: 'password123', // Won't be redacted with custom patterns only
        },
      });

      const event = handler.mock.calls[0][0] as SecurityEvent;
      expect(event.metadata?.custom).toBe('[REDACTED]');
      expect(event.metadata?.standard).toBe('password123');
    });
  });

  describe('Event History', () => {
    it('should store event history', () => {
      auditor.emit({ type: 'auth.success', userId: 'user1' });
      auditor.emit({ type: 'auth.failure', userId: 'user2' });
      auditor.emit({ type: 'auth.mfa.required', userId: 'user3' });

      const events = auditor.getRecentEvents();
      expect(events).toHaveLength(3);
      expect(events[0].type).toBe('auth.mfa.required'); // Most recent first
      expect(events[1].type).toBe('auth.failure');
      expect(events[2].type).toBe('auth.success');
    });

    it('should limit event history to 1000 events', () => {
      // Add 1005 events
      for (let i = 0; i < 1005; i++) {
        auditor.emit({ type: 'auth.success', userId: `user${i}` });
      }

      const events = auditor.getRecentEvents();
      expect(events).toHaveLength(1000);
      expect(events[999].userId).toBe('user5'); // Oldest should be user5 (0-4 were removed)
    });

    it('should filter events by risk level', () => {
      auditor.emit({ type: 'auth.success' }); // low
      auditor.emit({ type: 'auth.failure', metadata: { attempts: 5 } }); // medium
      auditor.emit({ type: 'auth.rate.limited' }); // high
      auditor.emit({ type: 'auth.suspicious.activity' }); // critical

      const highRiskEvents = auditor.getRecentEvents({ minRisk: 'high' });
      expect(highRiskEvents).toHaveLength(2);
      expect(highRiskEvents[0].type).toBe('auth.suspicious.activity');
      expect(highRiskEvents[1].type).toBe('auth.rate.limited');
    });

    it('should filter events by type', () => {
      auditor.emit({ type: 'auth.success', userId: 'user1' });
      auditor.emit({ type: 'auth.failure', userId: 'user2' });
      auditor.emit({ type: 'auth.success', userId: 'user3' });
      auditor.emit({ type: 'auth.failure', userId: 'user4' });

      const failureEvents = auditor.getRecentEvents({ type: 'auth.failure' });
      expect(failureEvents).toHaveLength(2);
      expect(failureEvents[0].userId).toBe('user4');
      expect(failureEvents[1].userId).toBe('user2');
    });

    it('should limit returned events', () => {
      for (let i = 0; i < 10; i++) {
        auditor.emit({ type: 'auth.success', userId: `user${i}` });
      }

      const events = auditor.getRecentEvents({ limit: 3 });
      expect(events).toHaveLength(3);
      expect(events[0].userId).toBe('user9'); // Most recent
    });

    it('should combine filters', () => {
      auditor.emit({ type: 'auth.success' }); // low
      auditor.emit({ type: 'auth.failure', metadata: { attempts: 6 } }); // high
      auditor.emit({ type: 'auth.mfa.failure', metadata: { attempts: 7 } }); // high
      auditor.emit({ type: 'auth.rate.limited' }); // high
      auditor.emit({ type: 'auth.suspicious.activity' }); // critical

      const filtered = auditor.getRecentEvents({
        minRisk: 'high',
        type: 'auth.failure',
        limit: 1,
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe('auth.failure');
    });

    it('should clear event history', () => {
      auditor.emit({ type: 'auth.success' });
      auditor.emit({ type: 'auth.failure' });

      expect(auditor.getRecentEvents()).toHaveLength(2);

      auditor.clearHistory();

      expect(auditor.getRecentEvents()).toHaveLength(0);
    });
  });

  describe('Handler Management', () => {
    it('should return handler count', () => {
      expect(auditor.getHandlerCount()).toBe(0);

      const unsubscribe1 = auditor.onEvent(() => {});
      expect(auditor.getHandlerCount()).toBe(1);

      const unsubscribe2 = auditor.onEvent(() => {});
      expect(auditor.getHandlerCount()).toBe(2);

      unsubscribe1();
      expect(auditor.getHandlerCount()).toBe(1);

      unsubscribe2();
      expect(auditor.getHandlerCount()).toBe(0);
    });
  });

  describe('Integration Examples', () => {
    it('should work with auth success flow', () => {
      const handler = vi.fn();
      auditor.onEvent(handler);

      // Simulate authentication flow
      auditor.emit({
        type: 'auth.success',
        userId: 'user123',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        provider: 'entra',
        metadata: {
          method: 'oauth',
          scope: 'read write',
        },
      });

      const event = handler.mock.calls[0][0] as SecurityEvent;
      expect(event.type).toBe('auth.success');
      expect(event.userId).toBe('user123');
      expect(event.provider).toBe('entra');
      expect(event.risk).toBe('low');
    });

    it('should work with MFA flow', () => {
      const handler = vi.fn();
      auditor.onEvent(handler);

      // MFA required
      auditor.emit({
        type: 'auth.mfa.required',
        userId: 'user123',
        metadata: {
          reason: 'elevation',
          method: 'totp',
        },
      });

      // MFA success
      auditor.emit({
        type: 'auth.mfa.success',
        userId: 'user123',
        metadata: {
          method: 'totp',
        },
      });

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler.mock.calls[0][0].type).toBe('auth.mfa.required');
      expect(handler.mock.calls[1][0].type).toBe('auth.mfa.success');
    });

    it('should work with session lifecycle', () => {
      const handler = vi.fn();
      auditor.onEvent(handler);

      // Session created
      auditor.emit({
        type: 'auth.session.created',
        userId: 'user123',
        metadata: {
          sessionId: 'sess_123',
          duration: '1h',
        },
      });

      // Session expired
      auditor.emit({
        type: 'auth.session.expired',
        userId: 'user123',
        metadata: {
          sessionId: 'sess_123',
          reason: 'timeout',
        },
      });

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler.mock.calls[0][0].type).toBe('auth.session.created');
      expect(handler.mock.calls[1][0].type).toBe('auth.session.expired');
    });
  });

  describe('Preset Auditors', () => {
    it('should create console auditor', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      const auditor = createConsoleAuditor();

      auditor.emit({ type: 'auth.success', userId: 'user123' });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should create high risk auditor', () => {
      const handler = vi.fn();
      const auditor = createHighRiskAuditor(handler);

      auditor.emit({ type: 'auth.success' }); // low risk
      expect(handler).not.toHaveBeenCalled();

      auditor.emit({ type: 'auth.rate.limited' }); // high risk
      expect(handler).toHaveBeenCalledTimes(1);

      auditor.emit({ type: 'auth.suspicious.activity' }); // critical risk
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should create multi-handler auditor', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      const auditor = createMultiHandlerAuditor([handler1, handler2, handler3]);

      auditor.emit({ type: 'auth.success' });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler3).toHaveBeenCalledTimes(1);
    });
  });

  describe('All Auth Events Are Logged', () => {
    const allEventTypes: SecurityEventType[] = [
      'auth.success',
      'auth.failure',
      'auth.mfa.required',
      'auth.mfa.success',
      'auth.mfa.failure',
      'auth.session.created',
      'auth.session.expired',
      'auth.session.invalidated',
      'auth.rate.limited',
      'auth.suspicious.activity',
    ];

    it('should handle all defined event types', () => {
      const handler = vi.fn();
      auditor.onEvent(handler);

      allEventTypes.forEach((type) => {
        auditor.emit({ type });
      });

      expect(handler).toHaveBeenCalledTimes(allEventTypes.length);

      allEventTypes.forEach((type, index) => {
        expect(handler.mock.calls[index][0].type).toBe(type);
      });
    });
  });

  describe('Metadata Preservation', () => {
    it('should preserve non-secret metadata', () => {
      const handler = vi.fn();
      auditor.onEvent(handler);

      const metadata = {
        attempts: 3,
        provider: 'entra',
        method: 'oauth',
        scope: 'read write',
        sessionId: 'sess_123',
        duration: '1h',
        reason: 'Invalid credentials',
        timestamp: Date.now(),
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      auditor.emit({
        type: 'auth.failure',
        metadata,
      });

      const event = handler.mock.calls[0][0] as SecurityEvent;
      expect(event.metadata).toEqual(metadata);
    });

    it('should handle complex metadata structures', () => {
      const handler = vi.fn();
      auditor.onEvent(handler);

      const metadata = {
        request: {
          method: 'POST',
          path: '/api/auth/login',
          query: { redirect: '/dashboard' },
        },
        response: {
          status: 401,
          error: 'Unauthorized',
        },
        context: {
          environment: 'production',
          version: '1.0.0',
        },
      };

      auditor.emit({
        type: 'auth.failure',
        metadata,
      });

      const event = handler.mock.calls[0][0] as SecurityEvent;
      expect(event.metadata).toEqual(metadata);
    });
  });
});
