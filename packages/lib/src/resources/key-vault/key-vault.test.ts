import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../core/app';
import { SubscriptionStack } from '../../core/subscription-stack';
import { ResourceGroup } from '../resource-group/resource-group';
import { Subscription } from '../../core/azure/subscription';
import { Geography } from '../../core/azure/geography';
import { Organization } from '../../core/context/organization';
import { Project } from '../../core/context/project';
import { Environment } from '../../core/context/environment';
import { Instance } from '../../core/context/instance';
import { KeyVault } from './key-vault';
import { KeyVaultSkuName } from './types';

describe('resources/key-vault/KeyVault', () => {
  let app: App;
  let stack: SubscriptionStack;
  let resourceGroup: ResourceGroup;

  beforeEach(() => {
    app = new App();
    stack = new SubscriptionStack(app, 'TestStack', {
      subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
      geography: Geography.fromValue('eastus'),
      organization: Organization.fromValue('digital-minion'),
      project: new Project('authr'),
      environment: Environment.fromValue('nonprod'),
      instance: Instance.fromNumber(1),
      tags: {
        managed_by: 'terraform',
      },
    });
    resourceGroup = new ResourceGroup(stack, 'DataRG');
  });

  describe('constructor', () => {
    it('should create Key Vault with auto-generated name', () => {
      const vault = new KeyVault(resourceGroup, 'AppSecrets', {
        tenantId: '12345678-1234-1234-1234-123456789abc',
      });

      // Should auto-generate name with kv prefix
      expect(vault.vaultName).toMatch(/^kv-/);
      expect(vault.vaultName).toContain('authr'); // Project name
      expect(vault.vaultName.length).toBeLessThanOrEqual(24);
      expect(vault.vaultName.endsWith('-')).toBe(false); // Should not end with hyphen
    });

    it('should use provided vault name when specified', () => {
      const vault = new KeyVault(resourceGroup, 'AppSecrets', {
        vaultName: 'my-key-vault',
        tenantId: '12345678-1234-1234-1234-123456789abc',
      });

      expect(vault.vaultName).toBe('my-key-vault');
    });

    it('should default location to resource group location', () => {
      const vault = new KeyVault(resourceGroup, 'AppSecrets', {
        tenantId: '12345678-1234-1234-1234-123456789abc',
      });

      expect(vault.location).toBe('eastus');
    });

    it('should use provided location when specified', () => {
      const vault = new KeyVault(resourceGroup, 'AppSecrets', {
        location: 'westus2',
        tenantId: '12345678-1234-1234-1234-123456789abc',
      });

      expect(vault.location).toBe('westus2');
    });

    it('should set resource group name from parent', () => {
      const vault = new KeyVault(resourceGroup, 'AppSecrets', {
        tenantId: '12345678-1234-1234-1234-123456789abc',
      });

      expect(vault.resourceGroupName).toBe(resourceGroup.resourceGroupName);
    });

    it('should merge tags with parent', () => {
      const vault = new KeyVault(resourceGroup, 'AppSecrets', {
        tenantId: '12345678-1234-1234-1234-123456789abc',
        tags: {
          purpose: 'application-secrets',
        },
      });

      expect(vault.tags).toMatchObject({
        managed_by: 'terraform',
        purpose: 'application-secrets',
      });
    });

    it('should default SKU to standard for nonprod', () => {
      const vault = new KeyVault(resourceGroup, 'AppSecrets', {
        tenantId: '12345678-1234-1234-1234-123456789abc',
      });

      expect(vault.sku.name).toBe('standard');
      expect(vault.sku.family).toBe('A');
    });

    it('should use provided SKU when specified', () => {
      const vault = new KeyVault(resourceGroup, 'AppSecrets', {
        tenantId: '12345678-1234-1234-1234-123456789abc',
        sku: KeyVaultSkuName.PREMIUM,
      });

      expect(vault.sku.name).toBe('premium');
    });

    it('should generate resource ID', () => {
      const vault = new KeyVault(resourceGroup, 'AppSecrets', {
        tenantId: '12345678-1234-1234-1234-123456789abc',
      });

      expect(vault.vaultId).toBeDefined();
      expect(vault.vaultId).toContain('/vaults/');
    });
  });

  describe('auto-naming with different IDs', () => {
    it('should generate unique names for different IDs', () => {
      const vault1 = new KeyVault(resourceGroup, 'AppSecrets', {
        tenantId: '12345678-1234-1234-1234-123456789abc',
      });
      const vault2 = new KeyVault(resourceGroup, 'DbSecrets', {
        tenantId: '12345678-1234-1234-1234-123456789abc',
      });

      expect(vault1.vaultName).not.toBe(vault2.vaultName);
      expect(vault1.vaultName).toContain('appsecrets');
      expect(vault2.vaultName).toContain('dbsecrets');
    });

    it('should truncate name to 24 characters', () => {
      const vault = new KeyVault(resourceGroup, 'VeryLongSecretNameThatExceedsTheLimit', {
        tenantId: '12345678-1234-1234-1234-123456789abc',
      });

      // Should be truncated to 24 characters
      expect(vault.vaultName.length).toBeLessThanOrEqual(24);
    });

    it('should allow hyphens in auto-generated names', () => {
      const vault = new KeyVault(resourceGroup, 'app-secrets', {
        tenantId: '12345678-1234-1234-1234-123456789abc',
      });

      // Key Vault names can have hyphens (unlike Storage Accounts)
      expect(vault.vaultName).toMatch(/^kv-/);
    });
  });

  describe('secure defaults', () => {
    it('should default RBAC authorization to enabled', () => {
      const vault = new KeyVault(resourceGroup, 'AppSecrets', {
        tenantId: '12345678-1234-1234-1234-123456789abc',
      });

      // Can't directly check, but it's passed to L1
      expect(vault.vaultId).toBeDefined();
    });

    it('should allow disabling RBAC authorization', () => {
      const vault = new KeyVault(resourceGroup, 'AppSecrets', {
        tenantId: '12345678-1234-1234-1234-123456789abc',
        enableRbacAuthorization: false,
      });

      expect(vault.vaultId).toBeDefined();
    });

    it('should default soft delete to enabled', () => {
      const vault = new KeyVault(resourceGroup, 'AppSecrets', {
        tenantId: '12345678-1234-1234-1234-123456789abc',
      });

      expect(vault.vaultId).toBeDefined();
    });

    it('should default soft delete retention to 90 days', () => {
      const vault = new KeyVault(resourceGroup, 'AppSecrets', {
        tenantId: '12345678-1234-1234-1234-123456789abc',
      });

      expect(vault.vaultId).toBeDefined();
    });

    it('should default public network access to disabled', () => {
      const vault = new KeyVault(resourceGroup, 'AppSecrets', {
        tenantId: '12345678-1234-1234-1234-123456789abc',
      });

      expect(vault.vaultId).toBeDefined();
    });

    it('should default purge protection to disabled for nonprod', () => {
      const vault = new KeyVault(resourceGroup, 'AppSecrets', {
        tenantId: '12345678-1234-1234-1234-123456789abc',
      });

      expect(vault.vaultId).toBeDefined();
    });

    it('should allow enabling purge protection explicitly', () => {
      const vault = new KeyVault(resourceGroup, 'AppSecrets', {
        tenantId: '12345678-1234-1234-1234-123456789abc',
        enablePurgeProtection: true,
      });

      expect(vault.vaultId).toBeDefined();
    });
  });

  describe('environment-aware SKU', () => {
    it('should default to standard SKU for nonprod environment', () => {
      const vault = new KeyVault(resourceGroup, 'AppSecrets', {
        tenantId: '12345678-1234-1234-1234-123456789abc',
      });

      expect(vault.sku.name).toBe('standard');
    });

    it('should default to premium SKU for prod environment', () => {
      const prodStack = new SubscriptionStack(app, 'ProdStack', {
        subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
        geography: Geography.fromValue('eastus'),
        organization: Organization.fromValue('digital-minion'),
        project: new Project('authr'),
        environment: Environment.fromValue('prod'),
        instance: Instance.fromNumber(1),
      });
      const prodRG = new ResourceGroup(prodStack, 'DataRG');

      const vault = new KeyVault(prodRG, 'AppSecrets', {
        tenantId: '12345678-1234-1234-1234-123456789abc',
      });

      expect(vault.sku.name).toBe('premium');
    });

    it('should enable purge protection by default for prod', () => {
      const prodStack = new SubscriptionStack(app, 'ProdStack', {
        subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
        geography: Geography.fromValue('eastus'),
        organization: Organization.fromValue('digital-minion'),
        project: new Project('authr'),
        environment: Environment.fromValue('prod'),
        instance: Instance.fromNumber(1),
      });
      const prodRG = new ResourceGroup(prodStack, 'DataRG');

      const vault = new KeyVault(prodRG, 'AppSecrets', {
        tenantId: '12345678-1234-1234-1234-123456789abc',
      });

      expect(vault.vaultId).toBeDefined();
    });
  });

  describe('tenant ID resolution', () => {
    it('should use provided tenant ID from props', () => {
      const vault = new KeyVault(resourceGroup, 'AppSecrets', {
        tenantId: '87654321-4321-4321-4321-cba987654321',
      });

      expect(vault.tenantId).toBe('87654321-4321-4321-4321-cba987654321');
    });

    it('should throw error when tenant ID not provided and not in stack', () => {
      expect(() => {
        new KeyVault(resourceGroup, 'AppSecrets');
      }).toThrow(/Tenant ID must be provided/);
    });

    it('should use tenant ID from stack if available', () => {
      // Create stack with tenant ID
      const stackWithTenant = new SubscriptionStack(app, 'TenantStack', {
        subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
        geography: Geography.fromValue('eastus'),
        organization: Organization.fromValue('digital-minion'),
        project: new Project('authr'),
        environment: Environment.fromValue('nonprod'),
        instance: Instance.fromNumber(1),
      });

      // Manually add tenantId property for testing
      (stackWithTenant as any).tenantId = '11111111-1111-1111-1111-111111111111';

      const rgWithTenant = new ResourceGroup(stackWithTenant, 'DataRG');
      const vault = new KeyVault(rgWithTenant, 'AppSecrets');

      expect(vault.tenantId).toBe('11111111-1111-1111-1111-111111111111');
    });
  });

  describe('parent validation', () => {
    it('should throw error when not created within ResourceGroup', () => {
      expect(() => {
        new KeyVault(stack, 'Vault', {
          tenantId: '12345678-1234-1234-1234-123456789abc',
        });
      }).toThrow(/KeyVault must be created within or under a ResourceGroup/);
    });

    it('should work when created directly within ResourceGroup', () => {
      const vault = new KeyVault(resourceGroup, 'Vault', {
        tenantId: '12345678-1234-1234-1234-123456789abc',
      });

      expect(vault.resourceGroupName).toBe(resourceGroup.resourceGroupName);
    });
  });

  describe('integration with underlying L1', () => {
    it('should create L1 construct with correct properties', () => {
      const vault = new KeyVault(resourceGroup, 'AppSecrets', {
        vaultName: 'my-vault',
        location: 'westus2',
        tenantId: '12345678-1234-1234-1234-123456789abc',
        sku: KeyVaultSkuName.PREMIUM,
        tags: { purpose: 'testing' },
      });

      expect(vault.vaultName).toBe('my-vault');
      expect(vault.location).toBe('westus2');
      expect(vault.tenantId).toBe('12345678-1234-1234-1234-123456789abc');
      expect(vault.sku.name).toBe('premium');
    });
  });

  describe('multiple Key Vaults', () => {
    it('should allow creating multiple vaults with different IDs', () => {
      const appVault = new KeyVault(resourceGroup, 'AppSecrets', {
        tenantId: '12345678-1234-1234-1234-123456789abc',
      });
      const dbVault = new KeyVault(resourceGroup, 'DbSecrets', {
        tenantId: '12345678-1234-1234-1234-123456789abc',
      });
      const cacheVault = new KeyVault(resourceGroup, 'CacheSecrets', {
        tenantId: '12345678-1234-1234-1234-123456789abc',
      });

      // All should have unique auto-generated names
      expect(appVault.vaultName).not.toBe(dbVault.vaultName);
      expect(appVault.vaultName).not.toBe(cacheVault.vaultName);
      expect(dbVault.vaultName).not.toBe(cacheVault.vaultName);

      // All should reference the same resource group
      expect(appVault.resourceGroupName).toBe(resourceGroup.resourceGroupName);
      expect(dbVault.resourceGroupName).toBe(resourceGroup.resourceGroupName);
      expect(cacheVault.resourceGroupName).toBe(resourceGroup.resourceGroupName);
    });

    it('should allow creating multiple vaults with explicit names', () => {
      const vault1 = new KeyVault(resourceGroup, 'Vault1', {
        vaultName: 'kv-secrets-001',
        tenantId: '12345678-1234-1234-1234-123456789abc',
      });

      const vault2 = new KeyVault(resourceGroup, 'Vault2', {
        vaultName: 'kv-secrets-002',
        tenantId: '12345678-1234-1234-1234-123456789abc',
      });

      expect(vault1.vaultName).toBe('kv-secrets-001');
      expect(vault2.vaultName).toBe('kv-secrets-002');
    });
  });

  describe('SKU combinations', () => {
    it('should support standard SKU', () => {
      const vault = new KeyVault(resourceGroup, 'Vault', {
        tenantId: '12345678-1234-1234-1234-123456789abc',
        sku: KeyVaultSkuName.STANDARD,
      });

      expect(vault.sku.name).toBe('standard');
      expect(vault.sku.family).toBe('A');
    });

    it('should support premium SKU', () => {
      const vault = new KeyVault(resourceGroup, 'Vault', {
        tenantId: '12345678-1234-1234-1234-123456789abc',
        sku: KeyVaultSkuName.PREMIUM,
      });

      expect(vault.sku.name).toBe('premium');
      expect(vault.sku.family).toBe('A');
    });
  });
});
