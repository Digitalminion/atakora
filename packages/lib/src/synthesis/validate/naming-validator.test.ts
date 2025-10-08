import { describe, it, expect, beforeEach } from 'vitest';
import { NamingValidator } from './naming-validator';
import { ArmTemplate } from '../types';

describe('synthesis/validate/NamingValidator', () => {
  let validator: NamingValidator;

  beforeEach(() => {
    validator = new NamingValidator();
  });

  describe('validate()', () => {
    it('should validate storage account names', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Storage/storageAccounts',
            apiVersion: '2023-01-01',
            name: 'mystorageaccount',
          },
        ],
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect storage account name too long', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Storage/storageAccounts',
            apiVersion: '2023-01-01',
            name: 'thisisaverylongstorageaccountname',
          },
        ],
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('exceeds maximum length'))).toBe(true);
    });

    it('should detect storage account name too short', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Storage/storageAccounts',
            apiVersion: '2023-01-01',
            name: 'ab',
          },
        ],
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('shorter than minimum length'))).toBe(
        true
      );
    });

    it('should detect invalid characters in storage account name', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Storage/storageAccounts',
            apiVersion: '2023-01-01',
            name: 'my-storage-account',
          },
        ],
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('invalid characters'))).toBe(true);
    });

    it('should validate key vault names', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.KeyVault/vaults',
            apiVersion: '2023-02-01',
            name: 'my-keyvault',
          },
        ],
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.valid).toBe(true);
    });

    it('should detect key vault name not starting with letter', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.KeyVault/vaults',
            apiVersion: '2023-02-01',
            name: '1-keyvault',
          },
        ],
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('invalid characters'))).toBe(true);
    });

    it('should validate resource group names', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Resources/resourceGroups',
            apiVersion: '2021-04-01',
            name: 'my-resource-group',
          },
        ],
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.valid).toBe(true);
    });

    it('should validate virtual network names', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Network/virtualNetworks',
            apiVersion: '2023-04-01',
            name: 'my-vnet-001',
          },
        ],
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.valid).toBe(true);
    });

    it('should validate virtual machine names', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Compute/virtualMachines',
            apiVersion: '2023-03-01',
            name: 'my-vm-001',
          },
        ],
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.valid).toBe(true);
    });

    it('should warn about names starting with hyphen', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Compute/virtualMachines',
            apiVersion: '2023-03-01',
            name: '-myvm',
          },
        ],
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.warnings.some((w) => w.message.includes('starts or ends with a hyphen'))).toBe(
        true
      );
    });

    it('should warn about names ending with hyphen', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Compute/virtualMachines',
            apiVersion: '2023-03-01',
            name: 'myvm-',
          },
        ],
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.warnings.some((w) => w.message.includes('starts or ends with a hyphen'))).toBe(
        true
      );
    });

    it('should warn about consecutive underscores', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Network/virtualNetworks',
            apiVersion: '2023-04-01',
            name: 'my__vnet',
          },
        ],
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.warnings.some((w) => w.message.includes('consecutive underscores'))).toBe(true);
    });

    it('should warn about consecutive hyphens', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Network/virtualNetworks',
            apiVersion: '2023-04-01',
            name: 'my--vnet',
          },
        ],
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.warnings.some((w) => w.message.includes('consecutive hyphens'))).toBe(true);
    });

    it('should apply generic validation for unknown resource types', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.CustomProvider/customResources',
            apiVersion: '2023-01-01',
            name: 'my-custom-resource',
          },
        ],
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.valid).toBe(true);
    });

    it('should detect generic name too long', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.CustomProvider/customResources',
            apiVersion: '2023-01-01',
            name: 'a'.repeat(65),
          },
        ],
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('exceeds'))).toBe(true);
    });

    it('should detect empty resource name', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.CustomProvider/customResources',
            apiVersion: '2023-01-01',
            name: '',
          },
        ],
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('empty'))).toBe(true);
    });

    it('should warn about special characters in generic names', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.CustomProvider/customResources',
            apiVersion: '2023-01-01',
            name: 'my@resource',
          },
        ],
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.warnings.some((w) => w.message.includes('special characters'))).toBe(true);
    });

    it('should validate multiple resources', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Storage/storageAccounts',
            apiVersion: '2023-01-01',
            name: 'storage1',
          },
          {
            type: 'Microsoft.KeyVault/vaults',
            apiVersion: '2023-02-01',
            name: 'keyvault1',
          },
          {
            type: 'Microsoft.Network/virtualNetworks',
            apiVersion: '2023-04-01',
            name: 'vnet1',
          },
        ],
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.valid).toBe(true);
    });

    it('should provide suggestions for naming errors', () => {
      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Storage/storageAccounts',
            apiVersion: '2023-01-01',
            name: 'My-Storage-Account',
          },
        ],
      };

      const result = validator.validate(template, 'TestStack');

      expect(result.errors[0].suggestion).toBeDefined();
      expect(result.errors[0].suggestion).toContain('like:');
    });

    it('should have correct validator name', () => {
      expect(validator.name).toBe('NamingValidator');
    });
  });
});
