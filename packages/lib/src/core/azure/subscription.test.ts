import { describe, it, expect } from 'vitest';
import { Subscription } from './subscription';

describe('azure/Subscription', () => {
  describe('constructor', () => {
    it('should create subscription with valid GUID', () => {
      const sub = new Subscription({
        subscriptionId: '12345678-1234-1234-1234-123456789abc',
      });

      expect(sub.subscriptionId).toBe('12345678-1234-1234-1234-123456789abc');
      expect(sub.abbreviation).toBeDefined();
      expect(sub.resourceName).toBeDefined();
    });

    it('should accept display name', () => {
      const sub = new Subscription({
        subscriptionId: '12345678-1234-1234-1234-123456789abc',
        displayName: 'NonProd Subscription',
      });

      expect(sub.displayName).toBe('NonProd Subscription');
    });

    it('should accept tenant ID', () => {
      const sub = new Subscription({
        subscriptionId: '12345678-1234-1234-1234-123456789abc',
        tenantId: '87654321-4321-4321-4321-cba987654321',
      });

      expect(sub.tenantId).toBe('87654321-4321-4321-4321-cba987654321');
    });

    it('should accept custom abbreviation', () => {
      const sub = new Subscription({
        subscriptionId: '12345678-1234-1234-1234-123456789abc',
        abbreviation: 'nonprod',
      });

      expect(sub.abbreviation).toBe('nonprod');
    });

    it('should accept custom resource name', () => {
      const sub = new Subscription({
        subscriptionId: '12345678-1234-1234-1234-123456789abc',
        resourceName: 'sub-custom',
      });

      expect(sub.resourceName).toBe('sub-custom');
    });

    it('should generate abbreviation from last 2 chars of GUID', () => {
      const sub = new Subscription({
        subscriptionId: '12345678-1234-1234-1234-123456789abc',
      });

      expect(sub.abbreviation).toBe('subbc');
    });

    it('should generate resource name from display name', () => {
      const sub = new Subscription({
        subscriptionId: '12345678-1234-1234-1234-123456789abc',
        displayName: 'NonProd Subscription',
      });

      expect(sub.resourceName).toBe('sub-nonprod-subscription');
    });

    it('should generate resource name with abbreviation fallback', () => {
      const sub = new Subscription({
        subscriptionId: '12345678-1234-1234-1234-123456789abc',
      });

      expect(sub.resourceName).toMatch(/^sub-sub[a-z0-9]{2}$/);
    });

    it('should throw error for invalid GUID format', () => {
      expect(() => {
        new Subscription({
          subscriptionId: 'invalid-guid',
        });
      }).toThrow(/Invalid subscription ID format/);
    });

    it('should throw error for empty subscription ID', () => {
      expect(() => {
        new Subscription({
          subscriptionId: '',
        });
      }).toThrow(/Invalid subscription ID format/);
    });

    it('should throw error for GUID with wrong format', () => {
      expect(() => {
        new Subscription({
          subscriptionId: '12345678-1234-1234-1234', // Too short
        });
      }).toThrow(/Invalid subscription ID format/);
    });
  });

  describe('fromId()', () => {
    it('should create subscription from ID only', () => {
      const sub = Subscription.fromId('12345678-1234-1234-1234-123456789abc');

      expect(sub.subscriptionId).toBe('12345678-1234-1234-1234-123456789abc');
      expect(sub.abbreviation).toBeDefined();
      expect(sub.resourceName).toBeDefined();
    });

    it('should throw error for invalid ID', () => {
      expect(() => {
        Subscription.fromId('invalid');
      }).toThrow(/Invalid subscription ID format/);
    });
  });

  describe('validateSubscriptionId()', () => {
    it('should accept valid lowercase GUID', () => {
      expect(Subscription.validateSubscriptionId('12345678-1234-1234-1234-123456789abc')).toBe(
        true
      );
    });

    it('should accept valid uppercase GUID', () => {
      expect(Subscription.validateSubscriptionId('12345678-1234-1234-1234-123456789ABC')).toBe(
        true
      );
    });

    it('should accept valid mixed case GUID', () => {
      expect(Subscription.validateSubscriptionId('12345678-AbCd-1234-1234-123456789abc')).toBe(
        true
      );
    });

    it('should reject empty string', () => {
      expect(Subscription.validateSubscriptionId('')).toBe(false);
    });

    it('should reject invalid format - missing hyphens', () => {
      expect(Subscription.validateSubscriptionId('12345678123412341234123456789abc')).toBe(false);
    });

    it('should reject invalid format - wrong segment lengths', () => {
      expect(Subscription.validateSubscriptionId('1234-1234-1234-1234-123456789abc')).toBe(false);
    });

    it('should reject invalid format - invalid characters', () => {
      expect(Subscription.validateSubscriptionId('12345678-1234-1234-1234-12345678ZZZZ')).toBe(
        false
      );
    });

    it('should reject invalid format - too short', () => {
      expect(Subscription.validateSubscriptionId('12345678-1234-1234-1234')).toBe(false);
    });

    it('should reject invalid format - too long', () => {
      expect(Subscription.validateSubscriptionId('12345678-1234-1234-1234-123456789abcdef')).toBe(
        false
      );
    });
  });

  describe('Resource name generation', () => {
    it('should normalize display name with spaces', () => {
      const sub = new Subscription({
        subscriptionId: '12345678-1234-1234-1234-123456789abc',
        displayName: 'My Test Subscription',
      });

      expect(sub.resourceName).toBe('sub-my-test-subscription');
    });

    it('should handle display name with special characters', () => {
      const sub = new Subscription({
        subscriptionId: '12345678-1234-1234-1234-123456789abc',
        displayName: 'My Test Subscription!@#',
      });

      expect(sub.resourceName).toBe('sub-my-test-subscription');
    });

    it('should handle display name with multiple spaces', () => {
      const sub = new Subscription({
        subscriptionId: '12345678-1234-1234-1234-123456789abc',
        displayName: 'My    Test    Subscription',
      });

      expect(sub.resourceName).toBe('sub-my-test-subscription');
    });

    it('should handle display name with leading/trailing hyphens', () => {
      const sub = new Subscription({
        subscriptionId: '12345678-1234-1234-1234-123456789abc',
        displayName: '---My Subscription---',
      });

      expect(sub.resourceName).toBe('sub-my-subscription');
    });
  });

  describe('Integration', () => {
    it('should create fully configured subscription', () => {
      const sub = new Subscription({
        subscriptionId: '12345678-1234-1234-1234-123456789abc',
        displayName: 'AuthR NonProd',
        tenantId: '87654321-4321-4321-4321-cba987654321',
        abbreviation: 'nonprod',
      });

      expect(sub.subscriptionId).toBe('12345678-1234-1234-1234-123456789abc');
      expect(sub.displayName).toBe('AuthR NonProd');
      expect(sub.tenantId).toBe('87654321-4321-4321-4321-cba987654321');
      expect(sub.abbreviation).toBe('nonprod');
      expect(sub.resourceName).toBe('sub-authr-nonprod');
    });
  });
});
