import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResourceNameGenerator } from './generator';
import type { ResourceNameParams } from './types';

describe('naming/generator', () => {
  describe('ResourceNameGenerator', () => {
    describe('constructor', () => {
      it('should create instance with default conventions', () => {
        const generator = new ResourceNameGenerator();
        const conventions = generator.getConventions();
        expect(conventions.separator).toBe('-');
        expect(conventions.maxLength).toBe(60);
      });

      it('should accept custom separator', () => {
        const generator = new ResourceNameGenerator({ separator: '_' });
        const conventions = generator.getConventions();
        expect(conventions.separator).toBe('_');
      });

      it('should accept custom max length', () => {
        const generator = new ResourceNameGenerator({ maxLength: 50 });
        const conventions = generator.getConventions();
        expect(conventions.maxLength).toBe(50);
      });

      it('should accept custom patterns', () => {
        const generator = new ResourceNameGenerator({
          patterns: { storage: 'stor' },
        });
        expect(generator.getPattern('storage')).toBe('stor');
      });

      it('should accept custom max lengths', () => {
        const generator = new ResourceNameGenerator({
          maxLengths: { storage: 30 },
        });
        expect(generator.getMaxLength('storage')).toBe(30);
      });
    });

    describe('generateName()', () => {
      let generator: ResourceNameGenerator;

      beforeEach(() => {
        generator = new ResourceNameGenerator();
      });

      const baseParams: ResourceNameParams = {
        resourceType: 'vnet',
        organization: 'digital-minion',
        project: 'authr',
        environment: 'nonprod',
        geography: 'eastus',
        instance: '01',
      };

      it('should generate basic resource name', () => {
        const name = generator.generateName(baseParams);
        expect(name).toBe('vnet-digital-minion-authr-nonprod-eastus-01');
      });

      it('should include purpose when provided', () => {
        const name = generator.generateName({
          ...baseParams,
          purpose: 'data',
        });
        expect(name).toBe('vnet-data-digital-minion-authr-nonprod-eastus-01');
      });

      it('should include additional suffix when provided', () => {
        const name = generator.generateName({
          ...baseParams,
          additionalSuffix: 'backup',
        });
        expect(name).toBe('vnet-digital-minion-authr-nonprod-eastus-01-backup');
      });

      it('should handle storage accounts specially (no hyphens, lowercase)', () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const name = generator.generateName({
          ...baseParams,
          resourceType: 'storage',
        });

        // Name gets truncated to 24 chars max for storage
        expect(name).toBe('stodigitalminionauthrnon'); // truncated
        expect(name).not.toContain('-');
        expect(name.length).toBeLessThanOrEqual(24);

        consoleWarnSpy.mockRestore();
      });

      it('should handle key vault specially (lowercase)', () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const name = generator.generateName({
          ...baseParams,
          resourceType: 'keyvault',
        });

        // Name gets truncated to 24 chars max for key vaults
        expect(name).toBe('kv-digital-minion-authr'); // truncated
        expect(name).toMatch(/^[a-z0-9-]+$/);
        expect(name.length).toBeLessThanOrEqual(24);

        consoleWarnSpy.mockRestore();
      });

      it('should truncate names exceeding max length', () => {
        const name = generator.generateName({
          resourceType: 'storage',
          organization: 'very-long-organization-name',
          project: 'very-long-project-name',
          environment: 'nonprod',
          geography: 'eastus',
          instance: '01',
        });

        expect(name.length).toBeLessThanOrEqual(24);
      });

      it('should throw error for missing required parameters', () => {
        expect(() => {
          generator.generateName({
            ...baseParams,
            organization: '',
          });
        }).toThrow(/Invalid name generation parameters/);
      });

      it('should throw error for undefined required parameters', () => {
        expect(() => {
          generator.generateName({
            resourceType: 'vnet',
            organization: 'org',
            project: 'proj',
            environment: 'env',
            geography: 'geo',
            instance: undefined as any,
          });
        }).toThrow(/Invalid name generation parameters/);
      });

      it('should use custom separator', () => {
        const customGen = new ResourceNameGenerator({ separator: '_' });
        const name = customGen.generateName(baseParams);
        expect(name).toBe('vnet_digital-minion_authr_nonprod_eastus_01');
      });

      it('should respect custom patterns', () => {
        const customGen = new ResourceNameGenerator({
          patterns: { vnet: 'virtualnet' },
        });
        const name = customGen.generateName(baseParams);
        expect(name).toContain('virtualnet');
      });
    });

    describe('validateName()', () => {
      let generator: ResourceNameGenerator;

      beforeEach(() => {
        generator = new ResourceNameGenerator();
      });

      it('should validate correct storage account names', () => {
        const result = generator.validateName('mystorage123', 'storage');
        expect(result.isValid).toBe(true);
      });

      it('should reject invalid storage account names', () => {
        const result = generator.validateName('my-storage-123', 'storage');
        expect(result.isValid).toBe(false);
      });

      it('should validate correct key vault names', () => {
        const result = generator.validateName('my-vault-01', 'keyvault');
        expect(result.isValid).toBe(true);
      });

      it('should reject invalid key vault names', () => {
        const result = generator.validateName('1-vault', 'keyvault');
        expect(result.isValid).toBe(false);
      });

      it('should provide error messages', () => {
        const result = generator.validateName('', 'storage');
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe('getPattern()', () => {
      let generator: ResourceNameGenerator;
      let consoleWarnSpy: any;

      beforeEach(() => {
        generator = new ResourceNameGenerator();
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      });

      afterEach(() => {
        consoleWarnSpy.mockRestore();
      });

      it('should return pattern for known resource types', () => {
        expect(generator.getPattern('storage')).toBe('sto');
        expect(generator.getPattern('keyvault')).toBe('kv');
        expect(generator.getPattern('vnet')).toBe('vnet');
      });

      it('should return resource type as pattern for unknown types', () => {
        const pattern = generator.getPattern('unknown-type');
        expect(pattern).toBe('unknown-type');
      });

      it('should use custom patterns when provided', () => {
        const customGen = new ResourceNameGenerator({
          patterns: { storage: 'stor' },
        });
        expect(customGen.getPattern('storage')).toBe('stor');
      });
    });

    describe('getMaxLength()', () => {
      let generator: ResourceNameGenerator;

      beforeEach(() => {
        generator = new ResourceNameGenerator();
      });

      it('should return specific max length for known types', () => {
        expect(generator.getMaxLength('storage')).toBe(24);
        expect(generator.getMaxLength('keyvault')).toBe(24);
        expect(generator.getMaxLength('rg')).toBe(90);
      });

      it('should return default max length for unknown types', () => {
        expect(generator.getMaxLength('unknown')).toBe(60);
      });

      it('should use custom max lengths when provided', () => {
        const customGen = new ResourceNameGenerator({
          maxLengths: { storage: 30 },
        });
        expect(customGen.getMaxLength('storage')).toBe(30);
      });

      it('should use custom default max length', () => {
        const customGen = new ResourceNameGenerator({ maxLength: 50 });
        expect(customGen.getMaxLength('unknown')).toBe(50);
      });
    });

    describe('getConventions()', () => {
      it('should return frozen conventions object', () => {
        const generator = new ResourceNameGenerator();
        const conventions = generator.getConventions();

        expect(conventions).toBeDefined();
        expect(Object.isFrozen(conventions)).toBe(true);
      });

      it('should return conventions with all properties', () => {
        const generator = new ResourceNameGenerator();
        const conventions = generator.getConventions();

        expect(conventions).toHaveProperty('separator');
        expect(conventions).toHaveProperty('maxLength');
        expect(conventions).toHaveProperty('patterns');
        expect(conventions).toHaveProperty('maxLengths');
      });
    });

    describe('willTruncate()', () => {
      let generator: ResourceNameGenerator;

      beforeEach(() => {
        generator = new ResourceNameGenerator();
      });

      it('should return true for names exceeding max length', () => {
        const longName = 'a'.repeat(25);
        expect(generator.willTruncate(longName, 'storage')).toBe(true);
      });

      it('should return false for names within max length', () => {
        const shortName = 'mystorage123';
        expect(generator.willTruncate(shortName, 'storage')).toBe(false);
      });

      it('should return false for names exactly at max length', () => {
        const exactName = 'a'.repeat(24);
        expect(generator.willTruncate(exactName, 'storage')).toBe(false);
      });
    });

    describe('Integration tests', () => {
      it('should generate and validate consistent names', () => {
        const generator = new ResourceNameGenerator();

        const params: ResourceNameParams = {
          resourceType: 'storage',
          organization: 'dp',
          project: 'authr',
          environment: 'nonprod',
          geography: 'eus',
          instance: '01',
        };

        const name = generator.generateName(params);
        const validation = generator.validateName(name, 'storage');

        expect(validation.isValid).toBe(true);
      });

      it('should handle all common resource types', () => {
        const generator = new ResourceNameGenerator();

        const resourceTypes = [
          'rg',
          'vnet',
          'subnet',
          'nsg',
          'storage',
          'keyvault',
          'cosmos',
          'appService',
          'appGateway',
        ];

        const params = {
          organization: 'dp',
          project: 'test',
          environment: 'dev',
          geography: 'eus',
          instance: '01',
        };

        for (const resourceType of resourceTypes) {
          const name = generator.generateName({ ...params, resourceType });
          expect(name).toBeDefined();
          expect(name.length).toBeGreaterThan(0);
        }
      });
    });
  });
});
