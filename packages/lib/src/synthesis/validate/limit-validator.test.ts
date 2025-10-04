import { describe, it, expect, beforeEach } from 'vitest';
import { LimitValidator } from './limit-validator';
import { ArmTemplate } from '../types';

describe('synthesis/validate/LimitValidator', () => {
  let validator: LimitValidator;

  beforeEach(() => {
    validator = new LimitValidator();
  });

  describe('validate()', () => {
    it('should validate template within limits', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Storage/storageAccounts',
            apiVersion: '2023-01-01',
            name: 'storage1',
          },
        ],
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect too many resources', () => {
      const resources = [];
      for (let i = 0; i < 850; i++) {
        resources.push({
          type: 'Microsoft.Storage/storageAccounts',
          apiVersion: '2023-01-01',
          name: `storage${i}`,
        });
      }

      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources,
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Resource count'))).toBe(true);
      expect(result.errors.some(e => e.message.includes('800'))).toBe(true);
    });

    it('should warn when approaching resource limit', () => {
      const resources = [];
      for (let i = 0; i < 650; i++) {
        resources.push({
          type: 'Microsoft.Storage/storageAccounts',
          apiVersion: '2023-01-01',
          name: `storage${i}`,
        });
      }

      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources,
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.message.includes('Resource count'))).toBe(true);
      expect(result.warnings.some(w => w.message.includes('81%'))).toBe(true);
    });

    it('should detect too many parameters', () => {
      const parameters: any = {};
      for (let i = 0; i < 300; i++) {
        parameters[`param${i}`] = { type: 'string' };
      }

      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        parameters,
        resources: [],
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Parameter count'))).toBe(true);
      expect(result.errors.some(e => e.message.includes('256'))).toBe(true);
    });

    it('should warn when approaching parameter limit', () => {
      const parameters: any = {};
      for (let i = 0; i < 210; i++) {
        parameters[`param${i}`] = { type: 'string' };
      }

      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        parameters,
        resources: [],
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.message.includes('Parameter count'))).toBe(true);
    });

    it('should detect too many outputs', () => {
      const outputs: any = {};
      for (let i = 0; i < 70; i++) {
        outputs[`output${i}`] = { type: 'string', value: 'test' };
      }

      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [],
        outputs,
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Output count'))).toBe(true);
      expect(result.errors.some(e => e.message.includes('64'))).toBe(true);
    });

    it('should warn when approaching output limit', () => {
      const outputs: any = {};
      for (let i = 0; i < 55; i++) {
        outputs[`output${i}`] = { type: 'string', value: 'test' };
      }

      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [],
        outputs,
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.message.includes('Output count'))).toBe(true);
    });

    it('should detect too many variables', () => {
      const variables: any = {};
      for (let i = 0; i < 300; i++) {
        variables[`var${i}`] = 'value';
      }

      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [],
        variables,
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Variable count'))).toBe(true);
      expect(result.errors.some(e => e.message.includes('256'))).toBe(true);
    });

    it('should warn when approaching variable limit', () => {
      const variables: any = {};
      for (let i = 0; i < 210; i++) {
        variables[`var${i}`] = 'value';
      }

      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [],
        variables,
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.message.includes('Variable count'))).toBe(true);
    });

    it('should detect template size exceeding limit', () => {
      // Create a very large template
      const resources = [];
      for (let i = 0; i < 500; i++) {
        resources.push({
          type: 'Microsoft.Storage/storageAccounts',
          apiVersion: '2023-01-01',
          name: `storage${i}`,
          properties: {
            // Add large properties to increase size
            description: 'x'.repeat(10000),
          },
        });
      }

      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources,
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Template size'))).toBe(true);
      expect(result.errors.some(e => e.message.includes('MB'))).toBe(true);
    });

    it('should warn when approaching template size limit', () => {
      // Create a template at 85% of size limit (need ~3.4MB for 85% of 4MB)
      const resources = [];
      for (let i = 0; i < 340; i++) {
        resources.push({
          type: 'Microsoft.Storage/storageAccounts',
          apiVersion: '2023-01-01',
          name: `storage${i}`,
          properties: {
            description: 'x'.repeat(10000),
          },
        });
      }

      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources,
      };

      const result = validator.validate(template, 'TestStack');

      // Should have size warning
      expect(result.warnings.some(w => w.message.includes('Template size'))).toBe(true);
    });

    it('should format bytes correctly', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Storage/storageAccounts',
            apiVersion: '2023-01-01',
            name: 'storage1',
          },
        ],
      };

      const result = validator.validate(template, 'TestStack');

      // Template is valid, no errors
      expect(result.valid).toBe(true);
    });

    it('should provide suggestions for limit errors', () => {
      const resources = [];
      for (let i = 0; i < 850; i++) {
        resources.push({
          type: 'Microsoft.Storage/storageAccounts',
          apiVersion: '2023-01-01',
          name: `storage${i}`,
        });
      }

      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources,
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.errors[0].suggestion).toBeDefined();
      expect(result.errors[0].suggestion?.toLowerCase()).toContain('split');
    });

    it('should handle empty template sections', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [],
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.valid).toBe(true);
    });

    it('should handle template with all sections', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        parameters: {
          location: { type: 'string' },
        },
        variables: {
          storageName: 'storage1',
        },
        resources: [
          {
            type: 'Microsoft.Storage/storageAccounts',
            apiVersion: '2023-01-01',
            name: 'storage1',
          },
        ],
        outputs: {
          storageId: { type: 'string', value: 'test' },
        },
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.valid).toBe(true);
    });

    it('should have correct validator name', () => {
      expect(validator.name).toBe('LimitValidator');
    });
  });
});
