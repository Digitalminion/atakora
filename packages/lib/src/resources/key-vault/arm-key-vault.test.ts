import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../core/app';
import { SubscriptionStack } from '../../core/subscription-stack';
import { Subscription } from '../../core/azure/subscription';
import { Geography } from '../../core/azure/geography';
import { Organization } from '../../core/context/organization';
import { Project } from '../../core/context/project';
import { Environment } from '../../core/context/environment';
import { Instance } from '../../core/context/instance';
import { ArmKeyVault } from './arm-key-vault';
import { KeyVaultSkuName, PublicNetworkAccess, NetworkAclDefaultAction } from './types';
import type { ArmKeyVaultProps } from './types';

describe('resources/key-vault/ArmKeyVault', () => {
  let app: App;
  let stack: SubscriptionStack;

  beforeEach(() => {
    app = new App();
    stack = new SubscriptionStack(app, 'TestStack', {
      subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
      geography: Geography.fromValue('eastus'),
      organization: Organization.fromValue('digital-products'),
      project: new Project('colorai'),
      environment: Environment.fromValue('nonprod'),
      instance: Instance.fromNumber(1),
    });
  });

  describe('constructor', () => {
    it('should create Key Vault with required properties', () => {
      const vault = new ArmKeyVault(stack, 'Vault', {
        vaultName: 'kv-test-001',
        location: 'eastus',
        tenantId: '12345678-1234-1234-1234-123456789abc',
        sku: {
          family: 'A',
          name: KeyVaultSkuName.STANDARD,
        },
      });

      expect(vault.vaultName).toBe('kv-test-001');
      expect(vault.name).toBe('kv-test-001');
      expect(vault.location).toBe('eastus');
      expect(vault.tenantId).toBe('12345678-1234-1234-1234-123456789abc');
      expect(vault.sku.family).toBe('A');
      expect(vault.sku.name).toBe('standard');
      expect(vault.tags).toEqual({});
    });

    it('should create Key Vault with all properties', () => {
      const vault = new ArmKeyVault(stack, 'Vault', {
        vaultName: 'kv-test-002',
        location: 'eastus',
        tenantId: '87654321-4321-4321-4321-cba987654321',
        sku: {
          family: 'A',
          name: KeyVaultSkuName.PREMIUM,
        },
        properties: {
          enableRbacAuthorization: true,
          enableSoftDelete: true,
          softDeleteRetentionInDays: 90,
          enablePurgeProtection: true,
          publicNetworkAccess: PublicNetworkAccess.DISABLED,
        },
        tags: {
          environment: 'test',
        },
      });

      expect(vault.enableRbacAuthorization).toBe(true);
      expect(vault.enableSoftDelete).toBe(true);
      expect(vault.softDeleteRetentionInDays).toBe(90);
      expect(vault.enablePurgeProtection).toBe(true);
      expect(vault.publicNetworkAccess).toBe('disabled');
      expect(vault.tags).toEqual({ environment: 'test' });
    });

    it('should set correct resource type', () => {
      const vault = new ArmKeyVault(stack, 'Vault', {
        vaultName: 'kv-test-003',
        location: 'eastus',
        tenantId: '12345678-1234-1234-1234-123456789abc',
        sku: {
          family: 'A',
          name: KeyVaultSkuName.STANDARD,
        },
      });

      expect(vault.resourceType).toBe('Microsoft.KeyVault/vaults');
    });

    it('should set correct API version', () => {
      const vault = new ArmKeyVault(stack, 'Vault', {
        vaultName: 'kv-test-004',
        location: 'eastus',
        tenantId: '12345678-1234-1234-1234-123456789abc',
        sku: {
          family: 'A',
          name: KeyVaultSkuName.STANDARD,
        },
      });

      expect(vault.apiVersion).toBe('2024-11-01');
    });

    it('should generate resource ID', () => {
      const vault = new ArmKeyVault(stack, 'Vault', {
        vaultName: 'kv-test-005',
        location: 'eastus',
        tenantId: '12345678-1234-1234-1234-123456789abc',
        sku: {
          family: 'A',
          name: KeyVaultSkuName.STANDARD,
        },
      });

      expect(vault.resourceId).toContain('/vaults/kv-test-005');
      expect(vault.vaultId).toBe(vault.resourceId);
    });

    it('should have ResourceGroup deployment scope', () => {
      const vault = new ArmKeyVault(stack, 'Vault', {
        vaultName: 'kv-test-006',
        location: 'eastus',
        tenantId: '12345678-1234-1234-1234-123456789abc',
        sku: {
          family: 'A',
          name: KeyVaultSkuName.STANDARD,
        },
      });

      expect(vault.scope).toBe('resourceGroup');
    });
  });

  describe('validation', () => {
    it('should throw error for empty vault name', () => {
      expect(() => {
        new ArmKeyVault(stack, 'Vault', {
          vaultName: '',
          location: 'eastus',
          tenantId: '12345678-1234-1234-1234-123456789abc',
          sku: {
            family: 'A',
            name: KeyVaultSkuName.STANDARD,
          },
        });
      }).toThrow(/Key Vault name cannot be empty/);
    });

    it('should throw error for name shorter than 3 characters', () => {
      expect(() => {
        new ArmKeyVault(stack, 'Vault', {
          vaultName: 'kv',
          location: 'eastus',
          tenantId: '12345678-1234-1234-1234-123456789abc',
          sku: {
            family: 'A',
            name: KeyVaultSkuName.STANDARD,
          },
        });
      }).toThrow(/must be 3-24 characters/);
    });

    it('should throw error for name longer than 24 characters', () => {
      expect(() => {
        new ArmKeyVault(stack, 'Vault', {
          vaultName: 'kv-' + 'a'.repeat(23),
          location: 'eastus',
          tenantId: '12345678-1234-1234-1234-123456789abc',
          sku: {
            family: 'A',
            name: KeyVaultSkuName.STANDARD,
          },
        });
      }).toThrow(/must be 3-24 characters/);
    });

    it('should accept name at exactly 3 characters', () => {
      const vault = new ArmKeyVault(stack, 'Vault', {
        vaultName: 'kv1',
        location: 'eastus',
        tenantId: '12345678-1234-1234-1234-123456789abc',
        sku: {
          family: 'A',
          name: KeyVaultSkuName.STANDARD,
        },
      });

      expect(vault.vaultName).toBe('kv1');
    });

    it('should accept name at exactly 24 characters', () => {
      const name = 'a'.repeat(24);
      const vault = new ArmKeyVault(stack, 'Vault', {
        vaultName: name,
        location: 'eastus',
        tenantId: '12345678-1234-1234-1234-123456789abc',
        sku: {
          family: 'A',
          name: KeyVaultSkuName.STANDARD,
        },
      });

      expect(vault.vaultName).toBe(name);
    });

    it('should throw error for name starting with hyphen', () => {
      expect(() => {
        new ArmKeyVault(stack, 'Vault', {
          vaultName: '-kvtest',
          location: 'eastus',
          tenantId: '12345678-1234-1234-1234-123456789abc',
          sku: {
            family: 'A',
            name: KeyVaultSkuName.STANDARD,
          },
        });
      }).toThrow(/cannot start or end with a hyphen/);
    });

    it('should throw error for name ending with hyphen', () => {
      expect(() => {
        new ArmKeyVault(stack, 'Vault', {
          vaultName: 'kvtest-',
          location: 'eastus',
          tenantId: '12345678-1234-1234-1234-123456789abc',
          sku: {
            family: 'A',
            name: KeyVaultSkuName.STANDARD,
          },
        });
      }).toThrow(/cannot start or end with a hyphen/);
    });

    it('should throw error for consecutive hyphens', () => {
      expect(() => {
        new ArmKeyVault(stack, 'Vault', {
          vaultName: 'kv--test',
          location: 'eastus',
          tenantId: '12345678-1234-1234-1234-123456789abc',
          sku: {
            family: 'A',
            name: KeyVaultSkuName.STANDARD,
          },
        });
      }).toThrow(/cannot contain consecutive hyphens/);
    });

    it('should accept valid alphanumeric names with hyphens', () => {
      const validNames = ['kv-test-001', 'keyvault123', 'my-vault-01', 'kv1234567890'];

      validNames.forEach((name) => {
        const vault = new ArmKeyVault(stack, `Vault-${name}`, {
          vaultName: name,
          location: 'eastus',
          tenantId: '12345678-1234-1234-1234-123456789abc',
          sku: {
            family: 'A',
            name: KeyVaultSkuName.STANDARD,
          },
        });

        expect(vault.vaultName).toBe(name);
      });
    });

    it('should throw error for empty location', () => {
      expect(() => {
        new ArmKeyVault(stack, 'Vault', {
          vaultName: 'kv-test',
          location: '',
          tenantId: '12345678-1234-1234-1234-123456789abc',
          sku: {
            family: 'A',
            name: KeyVaultSkuName.STANDARD,
          },
        });
      }).toThrow(/Location cannot be empty/);
    });

    it('should throw error for empty tenant ID', () => {
      expect(() => {
        new ArmKeyVault(stack, 'Vault', {
          vaultName: 'kv-test',
          location: 'eastus',
          tenantId: '',
          sku: {
            family: 'A',
            name: KeyVaultSkuName.STANDARD,
          },
        });
      }).toThrow(/Tenant ID cannot be empty/);
    });

    it('should throw error for invalid tenant ID format', () => {
      expect(() => {
        new ArmKeyVault(stack, 'Vault', {
          vaultName: 'kv-test',
          location: 'eastus',
          tenantId: 'not-a-valid-uuid',
          sku: {
            family: 'A',
            name: KeyVaultSkuName.STANDARD,
          },
        });
      }).toThrow(/must be a valid UUID/);
    });

    it('should accept valid UUID tenant IDs', () => {
      const validTenantIds = [
        '12345678-1234-1234-1234-123456789abc',
        '00000000-0000-0000-0000-000000000000',
        'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF',
      ];

      validTenantIds.forEach((tenantId) => {
        const vault = new ArmKeyVault(stack, `Vault-${tenantId}`, {
          vaultName: 'kv-test',
          location: 'eastus',
          tenantId,
          sku: {
            family: 'A',
            name: KeyVaultSkuName.STANDARD,
          },
        });

        expect(vault.tenantId).toBe(tenantId);
      });
    });

    it('should throw error when SKU is not provided', () => {
      expect(() => {
        new ArmKeyVault(stack, 'Vault', {
          vaultName: 'kv-test',
          location: 'eastus',
          tenantId: '12345678-1234-1234-1234-123456789abc',
        } as any);
      }).toThrow(/SKU must be provided/);
    });

    it('should throw error when SKU family is not A', () => {
      expect(() => {
        new ArmKeyVault(stack, 'Vault', {
          vaultName: 'kv-test',
          location: 'eastus',
          tenantId: '12345678-1234-1234-1234-123456789abc',
          sku: {
            family: 'B' as any,
            name: KeyVaultSkuName.STANDARD,
          },
        });
      }).toThrow(/SKU family must be 'A'/);
    });

    it('should throw error for soft delete retention less than 7 days', () => {
      expect(() => {
        new ArmKeyVault(stack, 'Vault', {
          vaultName: 'kv-test',
          location: 'eastus',
          tenantId: '12345678-1234-1234-1234-123456789abc',
          sku: {
            family: 'A',
            name: KeyVaultSkuName.STANDARD,
          },
          properties: {
            softDeleteRetentionInDays: 6,
          },
        });
      }).toThrow(/must be between 7 and 90/);
    });

    it('should throw error for soft delete retention more than 90 days', () => {
      expect(() => {
        new ArmKeyVault(stack, 'Vault', {
          vaultName: 'kv-test',
          location: 'eastus',
          tenantId: '12345678-1234-1234-1234-123456789abc',
          sku: {
            family: 'A',
            name: KeyVaultSkuName.STANDARD,
          },
          properties: {
            softDeleteRetentionInDays: 91,
          },
        });
      }).toThrow(/must be between 7 and 90/);
    });

    it('should accept soft delete retention at 7 days', () => {
      const vault = new ArmKeyVault(stack, 'Vault', {
        vaultName: 'kv-test',
        location: 'eastus',
        tenantId: '12345678-1234-1234-1234-123456789abc',
        sku: {
          family: 'A',
          name: KeyVaultSkuName.STANDARD,
        },
        properties: {
          softDeleteRetentionInDays: 7,
        },
      });

      expect(vault.softDeleteRetentionInDays).toBe(7);
    });

    it('should accept soft delete retention at 90 days', () => {
      const vault = new ArmKeyVault(stack, 'Vault', {
        vaultName: 'kv-test',
        location: 'eastus',
        tenantId: '12345678-1234-1234-1234-123456789abc',
        sku: {
          family: 'A',
          name: KeyVaultSkuName.STANDARD,
        },
        properties: {
          softDeleteRetentionInDays: 90,
        },
      });

      expect(vault.softDeleteRetentionInDays).toBe(90);
    });
  });

  describe('SKU options', () => {
    it('should support standard SKU', () => {
      const vault = new ArmKeyVault(stack, 'Vault', {
        vaultName: 'kv-standard',
        location: 'eastus',
        tenantId: '12345678-1234-1234-1234-123456789abc',
        sku: {
          family: 'A',
          name: KeyVaultSkuName.STANDARD,
        },
      });

      expect(vault.sku.name).toBe('standard');
    });

    it('should support premium SKU', () => {
      const vault = new ArmKeyVault(stack, 'Vault', {
        vaultName: 'kv-premium',
        location: 'eastus',
        tenantId: '12345678-1234-1234-1234-123456789abc',
        sku: {
          family: 'A',
          name: KeyVaultSkuName.PREMIUM,
        },
      });

      expect(vault.sku.name).toBe('premium');
    });
  });

  describe('toArmTemplate', () => {
    it('should generate ARM template with minimal properties', () => {
      const vault = new ArmKeyVault(stack, 'Vault', {
        vaultName: 'kv-test',
        location: 'eastus',
        tenantId: '12345678-1234-1234-1234-123456789abc',
        sku: {
          family: 'A',
          name: KeyVaultSkuName.STANDARD,
        },
      });

      const template: any = vault.toArmTemplate();

      expect(template).toEqual({
        type: 'Microsoft.KeyVault/vaults',
        apiVersion: '2024-11-01',
        name: 'kv-test',
        location: 'eastus',
        properties: {
          tenantId: '12345678-1234-1234-1234-123456789abc',
          sku: {
            family: 'A',
            name: 'standard',
          },
        },
        tags: undefined,
      });
    });

    it('should generate ARM template with all properties', () => {
      const vault = new ArmKeyVault(stack, 'Vault', {
        vaultName: 'kv-full',
        location: 'eastus',
        tenantId: '12345678-1234-1234-1234-123456789abc',
        sku: {
          family: 'A',
          name: KeyVaultSkuName.PREMIUM,
        },
        properties: {
          enableRbacAuthorization: true,
          enableSoftDelete: true,
          softDeleteRetentionInDays: 90,
          enablePurgeProtection: true,
          publicNetworkAccess: PublicNetworkAccess.DISABLED,
          networkAcls: {
            defaultAction: NetworkAclDefaultAction.DENY,
          },
        },
        tags: {
          environment: 'prod',
        },
      });

      const template: any = vault.toArmTemplate();

      expect(template.properties).toMatchObject({
        tenantId: '12345678-1234-1234-1234-123456789abc',
        sku: {
          family: 'A',
          name: 'premium',
        },
        enableRbacAuthorization: true,
        enableSoftDelete: true,
        softDeleteRetentionInDays: 90,
        enablePurgeProtection: true,
        publicNetworkAccess: 'disabled',
        networkAcls: {
          defaultAction: 'Deny',
        },
      });
      expect(template.tags).toEqual({ environment: 'prod' });
    });
  });
});
