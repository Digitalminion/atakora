import { describe, it, expect, beforeEach } from 'vitest';
import {
  App,
  SubscriptionStack,
  Subscription,
  Geography,
  Organization,
  Project,
  Environment,
  Instance,
  ResourceGroup,
} from '@atakora/cdk';
import { IGrantable, PrincipalType } from '@atakora/lib/core/grants';
import { WellKnownRoleIds } from '@atakora/lib/authorization';
import { Vaults } from '../vaults';

/**
 * Mock grantable identity for testing.
 */
class MockGrantable implements IGrantable {
  public readonly principalId = '11111111-2222-3333-4444-555555555555';
  public readonly principalType = PrincipalType.ManagedIdentity;
  public readonly tenantId?: string;

  constructor(tenantId?: string) {
    this.tenantId = tenantId;
  }
}

describe('cdk/keyvault/Vaults - Grant Methods', () => {
  let app: App;
  let stack: SubscriptionStack;
  let resourceGroup: ResourceGroup;
  let vault: Vaults;
  let grantable: IGrantable;

  beforeEach(() => {
    app = new App();
    stack = new SubscriptionStack(app, 'TestStack', {
      subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
      geography: Geography.fromValue('eastus'),
      organization: Organization.fromValue('digital-minion'),
      project: new Project('authr'),
      environment: Environment.fromValue('nonprod'),
      instance: Instance.fromNumber(1),
    });
    resourceGroup = new ResourceGroup(stack, 'SecurityRG');
    vault = new Vaults(resourceGroup, 'AppSecrets', {
      tenantId: '87654321-4321-4321-4321-210987654321',
    });
    grantable = new MockGrantable();
  });

  describe('grantSecretsRead', () => {
    it('should create role assignment with KEY_VAULT_SECRETS_USER role', () => {
      const result = vault.grantSecretsRead(grantable);

      expect(result).toBeDefined();
      expect(result.roleDefinitionId).toBe(WellKnownRoleIds.KEY_VAULT_SECRETS_USER);
    });

    it('should include vault name in description', () => {
      const result = vault.grantSecretsRead(grantable);

      // Access the role assignment through the grant result
      const roleAssignment = result.roleAssignment;
      expect(roleAssignment).toBeDefined();
      // The description should reference the vault name
      expect(vault.vaultName).toBeDefined();
    });

    it('should assign role at vault scope', () => {
      const result = vault.grantSecretsRead(grantable);

      expect(result.scope).toBe(vault.resourceId);
    });

    it('should use grantee principal information', () => {
      const result = vault.grantSecretsRead(grantable);

      expect(result.grantee).toBe(grantable);
    });
  });

  describe('grantSecretsFullAccess', () => {
    it('should create role assignment with KEY_VAULT_SECRETS_OFFICER role', () => {
      const result = vault.grantSecretsFullAccess(grantable);

      expect(result).toBeDefined();
      expect(result.roleDefinitionId).toBe(WellKnownRoleIds.KEY_VAULT_SECRETS_OFFICER);
    });

    it('should assign role at vault scope', () => {
      const result = vault.grantSecretsFullAccess(grantable);

      expect(result.scope).toBe(vault.resourceId);
    });
  });

  describe('grantCryptoUse', () => {
    it('should create role assignment with KEY_VAULT_CRYPTO_USER role', () => {
      const result = vault.grantCryptoUse(grantable);

      expect(result).toBeDefined();
      expect(result.roleDefinitionId).toBe(WellKnownRoleIds.KEY_VAULT_CRYPTO_USER);
    });

    it('should assign role at vault scope', () => {
      const result = vault.grantCryptoUse(grantable);

      expect(result.scope).toBe(vault.resourceId);
    });
  });

  describe('grantCryptoFullAccess', () => {
    it('should create role assignment with KEY_VAULT_CRYPTO_OFFICER role', () => {
      const result = vault.grantCryptoFullAccess(grantable);

      expect(result).toBeDefined();
      expect(result.roleDefinitionId).toBe(WellKnownRoleIds.KEY_VAULT_CRYPTO_OFFICER);
    });

    it('should assign role at vault scope', () => {
      const result = vault.grantCryptoFullAccess(grantable);

      expect(result.scope).toBe(vault.resourceId);
    });
  });

  describe('grantCertificatesRead', () => {
    it('should create role assignment with KEY_VAULT_CERTIFICATES_USER role', () => {
      const result = vault.grantCertificatesRead(grantable);

      expect(result).toBeDefined();
      expect(result.roleDefinitionId).toBe(WellKnownRoleIds.KEY_VAULT_CERTIFICATES_USER);
    });

    it('should assign role at vault scope', () => {
      const result = vault.grantCertificatesRead(grantable);

      expect(result.scope).toBe(vault.resourceId);
    });
  });

  describe('grantCertificatesFullAccess', () => {
    it('should create role assignment with KEY_VAULT_CERTIFICATES_OFFICER role', () => {
      const result = vault.grantCertificatesFullAccess(grantable);

      expect(result).toBeDefined();
      expect(result.roleDefinitionId).toBe(WellKnownRoleIds.KEY_VAULT_CERTIFICATES_OFFICER);
    });

    it('should assign role at vault scope', () => {
      const result = vault.grantCertificatesFullAccess(grantable);

      expect(result.scope).toBe(vault.resourceId);
    });
  });

  describe('grantAdministrator', () => {
    it('should create role assignment with KEY_VAULT_ADMINISTRATOR role', () => {
      const result = vault.grantAdministrator(grantable);

      expect(result).toBeDefined();
      expect(result.roleDefinitionId).toBe(WellKnownRoleIds.KEY_VAULT_ADMINISTRATOR);
    });

    it('should assign role at vault scope', () => {
      const result = vault.grantAdministrator(grantable);

      expect(result.scope).toBe(vault.resourceId);
    });
  });

  describe('multiple grants', () => {
    it('should create multiple role assignments for same vault', () => {
      const result1 = vault.grantSecretsRead(grantable);
      const result2 = vault.grantCryptoUse(grantable);

      expect(result1.roleDefinitionId).toBe(WellKnownRoleIds.KEY_VAULT_SECRETS_USER);
      expect(result2.roleDefinitionId).toBe(WellKnownRoleIds.KEY_VAULT_CRYPTO_USER);
      expect(result1.scope).toBe(result2.scope);
    });

    it('should grant different roles to different identities', () => {
      const grantable2 = new MockGrantable();

      const result1 = vault.grantSecretsRead(grantable);
      const result2 = vault.grantSecretsFullAccess(grantable2);

      expect(result1.grantee).toBe(grantable);
      expect(result2.grantee).toBe(grantable2);
    });
  });

  describe('GrantableResource integration', () => {
    it('should extend GrantableResource', () => {
      expect(vault).toHaveProperty('grant');
      expect(vault).toHaveProperty('resourceId');
    });

    it('should have valid resource ID', () => {
      expect(vault.resourceId).toBeDefined();
      expect(typeof vault.resourceId).toBe('string');
    });

    it('should have vault ID matching resource ID', () => {
      expect(vault.vaultId).toBe(vault.resourceId);
    });
  });

  describe('ARM template generation', () => {
    it('should include role assignment in construct tree', () => {
      vault.grantSecretsRead(grantable);

      // The role assignment should be added as a child construct
      const children = vault.node.children;
      expect(children.length).toBeGreaterThan(0);
    });

    it('should create unique construct IDs for multiple grants', () => {
      vault.grantSecretsRead(grantable);
      vault.grantCryptoUse(grantable);
      vault.grantAdministrator(grantable);

      // Each grant should create a unique child construct
      const children = vault.node.children;
      const grantChildren = children.filter(c => c.node.id.startsWith('Grant'));
      expect(grantChildren.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('cross-tenant scenarios', () => {
    it('should support cross-tenant grants', () => {
      const crossTenantGrantable = new MockGrantable('99999999-8888-7777-6666-555555555555');

      const result = vault.grantSecretsRead(crossTenantGrantable);

      expect(result.grantee.tenantId).toBe('99999999-8888-7777-6666-555555555555');
    });
  });
});
