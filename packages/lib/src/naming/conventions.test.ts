import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CONVENTIONS,
  DEFAULT_PATTERNS,
  DEFAULT_MAX_LENGTHS,
  DEFAULT_SEPARATOR,
  DEFAULT_MAX_LENGTH,
  mergeConventions,
  SPECIAL_CASE_RESOURCES,
  isSpecialCaseResource,
  getSpecialCaseRules,
} from './conventions';

describe('naming/conventions', () => {
  describe('Constants', () => {
    it('should export default separator', () => {
      expect(DEFAULT_SEPARATOR).toBe('-');
    });

    it('should export default max length', () => {
      expect(DEFAULT_MAX_LENGTH).toBe(60);
    });

    it('should have storage pattern', () => {
      expect(DEFAULT_PATTERNS.storage).toBe('sto');
    });

    it('should have keyvault pattern', () => {
      expect(DEFAULT_PATTERNS.keyvault).toBe('kv');
    });

    it('should have vnet pattern', () => {
      expect(DEFAULT_PATTERNS.vnet).toBe('vnet');
    });

    it('should have storage max length of 24', () => {
      expect(DEFAULT_MAX_LENGTHS.storage).toBe(24);
    });

    it('should have keyvault max length of 24', () => {
      expect(DEFAULT_MAX_LENGTHS.keyvault).toBe(24);
    });

    it('should have complete default conventions', () => {
      expect(DEFAULT_CONVENTIONS).toMatchObject({
        separator: '-',
        maxLength: 60,
        patterns: expect.objectContaining({
          storage: 'sto',
          keyvault: 'kv',
          vnet: 'vnet',
        }),
        maxLengths: expect.objectContaining({
          storage: 24,
          keyvault: 24,
        }),
      });
    });
  });

  describe('mergeConventions()', () => {
    it('should return defaults when no config provided', () => {
      const result = mergeConventions();
      expect(result).toEqual(DEFAULT_CONVENTIONS);
    });

    it('should return defaults when undefined config provided', () => {
      const result = mergeConventions(undefined);
      expect(result).toEqual(DEFAULT_CONVENTIONS);
    });

    it('should override separator', () => {
      const result = mergeConventions({ separator: '_' });
      expect(result.separator).toBe('_');
      expect(result.maxLength).toBe(DEFAULT_MAX_LENGTH);
    });

    it('should override maxLength', () => {
      const result = mergeConventions({ maxLength: 50 });
      expect(result.maxLength).toBe(50);
      expect(result.separator).toBe(DEFAULT_SEPARATOR);
    });

    it('should merge custom patterns with defaults', () => {
      const result = mergeConventions({
        patterns: { storage: 'stor', custom: 'cust' },
      });
      expect(result.patterns.storage).toBe('stor');
      expect(result.patterns.custom).toBe('cust');
      expect(result.patterns.keyvault).toBe('kv'); // from defaults
    });

    it('should merge custom maxLengths with defaults', () => {
      const result = mergeConventions({
        maxLengths: { storage: 30, custom: 40 },
      });
      expect(result.maxLengths.storage).toBe(30);
      expect(result.maxLengths.custom).toBe(40);
      expect(result.maxLengths.keyvault).toBe(24); // from defaults
    });

    it('should handle multiple overrides simultaneously', () => {
      const result = mergeConventions({
        separator: '.',
        maxLength: 80,
        patterns: { storage: 'store' },
        maxLengths: { storage: 32 },
      });
      expect(result.separator).toBe('.');
      expect(result.maxLength).toBe(80);
      expect(result.patterns.storage).toBe('store');
      expect(result.maxLengths.storage).toBe(32);
    });
  });

  describe('Special case resources', () => {
    it('should have special rules for storage accounts', () => {
      expect(SPECIAL_CASE_RESOURCES.storage).toMatchObject({
        removeHyphens: true,
        forceLowercase: true,
      });
    });

    it('should have special rules for key vaults', () => {
      expect(SPECIAL_CASE_RESOURCES.keyvault).toMatchObject({
        forceLowercase: true,
      });
    });

    describe('isSpecialCaseResource()', () => {
      it('should return true for storage', () => {
        expect(isSpecialCaseResource('storage')).toBe(true);
      });

      it('should return true for keyvault', () => {
        expect(isSpecialCaseResource('keyvault')).toBe(true);
      });

      it('should return false for vnet', () => {
        expect(isSpecialCaseResource('vnet')).toBe(false);
      });

      it('should return false for unknown types', () => {
        expect(isSpecialCaseResource('unknown')).toBe(false);
      });
    });

    describe('getSpecialCaseRules()', () => {
      it('should return rules for storage', () => {
        const rules = getSpecialCaseRules('storage');
        expect(rules).toMatchObject({
          removeHyphens: true,
          forceLowercase: true,
        });
      });

      it('should return rules for keyvault', () => {
        const rules = getSpecialCaseRules('keyvault');
        expect(rules).toMatchObject({
          forceLowercase: true,
        });
      });

      it('should return undefined for non-special resources', () => {
        const rules = getSpecialCaseRules('vnet');
        expect(rules).toBeUndefined();
      });
    });
  });
});
