import { describe, it, expect, beforeEach } from 'vitest';
import { SchemaValidator } from './schema-validator';
import { ArmTemplate } from '../types';

describe('synthesis/validate/SchemaValidator', () => {
  let validator: SchemaValidator;

  beforeEach(() => {
    validator = new SchemaValidator();
  });

  describe('validate()', () => {
    it('should validate valid ARM template', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Storage/storageAccounts',
            apiVersion: '2023-01-01',
            name: 'mystorageaccount',
            location: 'eastus',
          },
        ],
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required $schema', () => {
      const template = {
        contentVersion: '1.0.0.0',
        resources: [],
      } as any;

      const result = validator.validate(template, 'TestStack');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.message.toLowerCase().includes('schema'))).toBe(true);
    });

    it('should detect missing required contentVersion', () => {
      const template = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        resources: [],
      } as any;

      const result = validator.validate(template, 'TestStack');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('contentVersion');
    });

    it('should detect missing required resources', () => {
      const template = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
      } as any;

      const result = validator.validate(template, 'TestStack');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.message.toLowerCase().includes('resource'))).toBe(true);
    });

    it('should detect invalid $schema format', () => {
      const template: ArmTemplate = {
        $schema: 'not-a-valid-uri',
        contentVersion: '1.0.0.0',
        resources: [],
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('format'))).toBe(true);
    });

    it('should detect invalid contentVersion format', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: 'invalid',
        resources: [],
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.warnings.some(w => w.message.includes('Content version'))).toBe(true);
    });

    it('should validate resource with all required fields', () => {
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
    });

    it('should detect duplicate resource names', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Storage/storageAccounts',
            apiVersion: '2023-01-01',
            name: 'duplicate',
          },
          {
            type: 'Microsoft.Network/virtualNetworks',
            apiVersion: '2023-04-01',
            name: 'duplicate',
          },
        ],
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Duplicate resource name'))).toBe(true);
    });

    it('should warn about empty resources array', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [],
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.warnings.some(w => w.message.includes('no resources'))).toBe(true);
    });

    it('should warn about HTTP schema', () => {
      const template: ArmTemplate = {
        $schema: 'http://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [],
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.warnings.some(w => w.message.includes('HTTPS'))).toBe(true);
    });

    it('should validate parameters section', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        parameters: {
          location: {
            type: 'string',
            defaultValue: 'eastus',
          },
        },
        resources: [],
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.valid).toBe(true);
    });

    it('should validate outputs section', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [],
        outputs: {
          resourceId: {
            type: 'string',
            value: '[resourceId("Microsoft.Storage/storageAccounts", "storage1")]',
          },
        },
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.valid).toBe(true);
    });

    it('should validate resource with optional properties', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Storage/storageAccounts',
            apiVersion: '2023-01-01',
            name: 'storage1',
            location: 'eastus',
            tags: {
              environment: 'nonprod',
            },
            dependsOn: ['[resourceId("Microsoft.Network/virtualNetworks", "vnet1")]'],
            properties: {
              accountType: 'Standard_LRS',
            },
            sku: {
              name: 'Standard_LRS',
            },
            kind: 'StorageV2',
          },
        ],
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.valid).toBe(true);
    });

    it('should provide error path for nested validation errors', () => {
      const template = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            // Missing required fields
            name: 'incomplete',
          },
        ],
      } as any;

      const result = validator.validate(template, 'TestStack');

      expect(result.valid).toBe(false);
      expect(result.errors[0].path).toBeDefined();
    });

    it('should provide suggestions for common errors', () => {
      const template = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Storage/storageAccounts',
            name: 'storage1',
            // Missing apiVersion
          },
        ],
      } as any;

      const result = validator.validate(template, 'TestStack');

      expect(result.valid).toBe(false);
      expect(result.errors[0].suggestion).toBeDefined();
    });

    it('should validate complex nested template', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        parameters: {
          location: {
            type: 'string',
          },
          environment: {
            type: 'string',
            allowedValues: ['nonprod', 'prod'],
          },
        },
        variables: {
          storageAccountName: '[concat("storage", uniqueString(resourceGroup().id))]',
        },
        resources: [
          {
            type: 'Microsoft.Storage/storageAccounts',
            apiVersion: '2023-01-01',
            name: '[variables("storageAccountName")]',
            location: '[parameters("location")]',
          },
        ],
        outputs: {
          storageAccountId: {
            type: 'string',
            value: '[resourceId("Microsoft.Storage/storageAccounts", variables("storageAccountName"))]',
          },
        },
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.valid).toBe(true);
    });

    it('should handle validator name property', () => {
      expect(validator.name).toBe('SchemaValidator');
    });
  });
});
