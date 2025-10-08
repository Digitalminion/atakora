import { describe, it, expect } from 'vitest';
import {
  validateResourceName,
  validateGenerationParams,
  getValidationRules,
  isNameTooLong,
  STORAGE_ACCOUNT_RULES,
  KEY_VAULT_RULES,
  RESOURCE_GROUP_RULES,
  VIRTUAL_NETWORK_RULES,
  COSMOS_DB_RULES,
  DEFAULT_VALIDATION_RULES,
} from './validation';

describe('naming/validation', () => {
  describe('Validation rule constants', () => {
    it('should have storage account rules', () => {
      expect(STORAGE_ACCOUNT_RULES).toMatchObject({
        minLength: 3,
        maxLength: 24,
        globallyUnique: true,
        caseSensitive: false,
      });
      expect(STORAGE_ACCOUNT_RULES.pattern).toBeInstanceOf(RegExp);
    });

    it('should have key vault rules', () => {
      expect(KEY_VAULT_RULES).toMatchObject({
        minLength: 3,
        maxLength: 24,
        globallyUnique: true,
        caseSensitive: false,
      });
      expect(KEY_VAULT_RULES.pattern).toBeInstanceOf(RegExp);
    });

    it('should have resource group rules', () => {
      expect(RESOURCE_GROUP_RULES).toMatchObject({
        minLength: 1,
        maxLength: 90,
        globallyUnique: false,
        caseSensitive: false,
      });
    });

    it('should have virtual network rules', () => {
      expect(VIRTUAL_NETWORK_RULES).toMatchObject({
        minLength: 2,
        maxLength: 64,
        globallyUnique: false,
        caseSensitive: false,
      });
    });

    it('should have cosmos db rules', () => {
      expect(COSMOS_DB_RULES).toMatchObject({
        minLength: 3,
        maxLength: 44,
        globallyUnique: true,
        caseSensitive: false,
      });
    });

    it('should have default validation rules', () => {
      expect(DEFAULT_VALIDATION_RULES).toMatchObject({
        minLength: 1,
        maxLength: 64,
        globallyUnique: false,
        caseSensitive: false,
      });
    });
  });

  describe('getValidationRules()', () => {
    it('should return storage rules for storage type', () => {
      const rules = getValidationRules('storage');
      expect(rules).toEqual(STORAGE_ACCOUNT_RULES);
    });

    it('should return keyvault rules for keyvault type', () => {
      const rules = getValidationRules('keyvault');
      expect(rules).toEqual(KEY_VAULT_RULES);
    });

    it('should return default rules for unknown type', () => {
      const rules = getValidationRules('unknown');
      expect(rules).toEqual(DEFAULT_VALIDATION_RULES);
    });
  });

  describe('validateResourceName()', () => {
    describe('General validation', () => {
      it('should reject empty names', () => {
        const result = validateResourceName('', 'vnet');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Resource name cannot be empty');
      });

      it('should reject whitespace-only names', () => {
        const result = validateResourceName('   ', 'vnet');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Resource name cannot be empty');
      });

      it('should validate name length minimum', () => {
        const result = validateResourceName('a', 'vnet'); // min is 2, so 1 char should fail
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('at least'))).toBe(true);
      });

      it('should validate name length maximum', () => {
        const longName = 'a'.repeat(100);
        const result = validateResourceName(longName, 'vnet'); // max is 64
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('not exceed'))).toBe(true);
      });

      it('should accept valid names', () => {
        const result = validateResourceName('valid-resource-name', 'vnet');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Storage account validation', () => {
      it('should reject uppercase letters', () => {
        const result = validateResourceName('MyStorage123', 'storage');
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('lowercase'))).toBe(true);
      });

      it('should reject hyphens', () => {
        const result = validateResourceName('my-storage-123', 'storage');
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('lowercase letters and numbers'))).toBe(true);
      });

      it('should reject special characters', () => {
        const result = validateResourceName('mystorage_123', 'storage');
        expect(result.isValid).toBe(false);
      });

      it('should accept valid storage names', () => {
        const result = validateResourceName('mystorage123', 'storage');
        expect(result.isValid).toBe(true);
        expect(result.warnings.some((w) => w.includes('globally unique'))).toBe(true);
      });

      it('should reject names that are too short', () => {
        const result = validateResourceName('ab', 'storage');
        expect(result.isValid).toBe(false);
      });

      it('should reject names that are too long', () => {
        const result = validateResourceName('a'.repeat(25), 'storage');
        expect(result.isValid).toBe(false);
      });
    });

    describe('Key Vault validation', () => {
      it('should reject names not starting with letter', () => {
        const result = validateResourceName('1-my-vault', 'keyvault');
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('start with a letter'))).toBe(true);
      });

      it('should reject names not ending with alphanumeric', () => {
        const result = validateResourceName('my-vault-', 'keyvault');
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('end with'))).toBe(true);
      });

      it('should reject consecutive hyphens', () => {
        const result = validateResourceName('my--vault', 'keyvault');
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('consecutive hyphens'))).toBe(true);
      });

      it('should accept valid key vault names', () => {
        const result = validateResourceName('my-vault-01', 'keyvault');
        expect(result.isValid).toBe(true);
        expect(result.warnings.some((w) => w.includes('globally unique'))).toBe(true);
      });

      it('should reject names that are too short', () => {
        const result = validateResourceName('ab', 'keyvault');
        expect(result.isValid).toBe(false);
      });

      it('should reject names that are too long', () => {
        const result = validateResourceName('a' + '-b'.repeat(12), 'keyvault');
        expect(result.isValid).toBe(false);
      });
    });

    describe('Resource Group validation', () => {
      it('should reject names ending with period', () => {
        const result = validateResourceName('my-rg.', 'rg');
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('cannot end with a period'))).toBe(true);
      });

      it('should warn about names starting with special chars', () => {
        const result = validateResourceName('_my-rg', 'rg');
        expect(result.warnings.some((w) => w.includes('alphanumeric'))).toBe(true);
      });

      it('should accept valid resource group names', () => {
        const result = validateResourceName('my-resource-group', 'rg');
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('validateGenerationParams()', () => {
    const validParams = {
      resourceType: 'vnet',
      organization: 'digital-products',
      project: 'colorai',
      environment: 'nonprod',
      geography: 'eastus',
      instance: '01',
    };

    it('should accept all required parameters', () => {
      const result = validateGenerationParams(validParams);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing resourceType', () => {
      const result = validateGenerationParams({ ...validParams, resourceType: '' });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('resourceType'))).toBe(true);
    });

    it('should reject missing organization', () => {
      const result = validateGenerationParams({ ...validParams, organization: '' });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('organization'))).toBe(true);
    });

    it('should reject missing project', () => {
      const result = validateGenerationParams({ ...validParams, project: '' });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('project'))).toBe(true);
    });

    it('should reject missing environment', () => {
      const result = validateGenerationParams({ ...validParams, environment: '' });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('environment'))).toBe(true);
    });

    it('should reject missing geography', () => {
      const result = validateGenerationParams({ ...validParams, geography: '' });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('geography'))).toBe(true);
    });

    it('should reject missing instance', () => {
      const result = validateGenerationParams({ ...validParams, instance: '' });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('instance'))).toBe(true);
    });

    it('should reject whitespace-only values', () => {
      const result = validateGenerationParams({ ...validParams, project: '   ' });
      expect(result.isValid).toBe(false);
    });

    it('should reject undefined parameters', () => {
      const result = validateGenerationParams({ ...validParams, organization: undefined });
      expect(result.isValid).toBe(false);
    });
  });

  describe('isNameTooLong()', () => {
    it('should return true for storage names exceeding 24 chars', () => {
      const name = 'a'.repeat(25);
      expect(isNameTooLong(name, 'storage')).toBe(true);
    });

    it('should return false for storage names at exactly 24 chars', () => {
      const name = 'a'.repeat(24);
      expect(isNameTooLong(name, 'storage')).toBe(false);
    });

    it('should return false for storage names under 24 chars', () => {
      const name = 'a'.repeat(20);
      expect(isNameTooLong(name, 'storage')).toBe(false);
    });

    it('should use default max length for unknown types', () => {
      const name = 'a'.repeat(65);
      expect(isNameTooLong(name, 'unknown')).toBe(true);
    });

    it('should return false when name is within limits', () => {
      const name = 'short-name';
      expect(isNameTooLong(name, 'vnet')).toBe(false);
    });
  });
});
