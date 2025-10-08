import { describe, it, expect } from 'vitest';
import {
  DeploymentScope,
  getSchemaForScope,
  canContain,
  getParentScope,
  getChildScopes,
  SCOPE_AVAILABLE_RESOURCES,
} from './scopes';

describe('azure/scopes', () => {
  describe('DeploymentScope enum', () => {
    it('should have Tenant scope', () => {
      expect(DeploymentScope.Tenant).toBe('tenant');
    });

    it('should have ManagementGroup scope', () => {
      expect(DeploymentScope.ManagementGroup).toBe('managementGroup');
    });

    it('should have Subscription scope', () => {
      expect(DeploymentScope.Subscription).toBe('subscription');
    });

    it('should have ResourceGroup scope', () => {
      expect(DeploymentScope.ResourceGroup).toBe('resourceGroup');
    });
  });

  describe('getSchemaForScope()', () => {
    it('should return correct schema for Tenant scope', () => {
      const schema = getSchemaForScope(DeploymentScope.Tenant);
      expect(schema).toBe(
        'https://schema.management.azure.com/schemas/2019-08-01/tenantDeploymentTemplate.json#'
      );
    });

    it('should return correct schema for ManagementGroup scope', () => {
      const schema = getSchemaForScope(DeploymentScope.ManagementGroup);
      expect(schema).toBe(
        'https://schema.management.azure.com/schemas/2019-08-01/managementGroupDeploymentTemplate.json#'
      );
    });

    it('should return correct schema for Subscription scope', () => {
      const schema = getSchemaForScope(DeploymentScope.Subscription);
      expect(schema).toBe(
        'https://schema.management.azure.com/schemas/2018-05-01/subscriptionDeploymentTemplate.json#'
      );
    });

    it('should return correct schema for ResourceGroup scope', () => {
      const schema = getSchemaForScope(DeploymentScope.ResourceGroup);
      expect(schema).toBe(
        'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#'
      );
    });

    it('should return valid HTTPS URLs', () => {
      const allScopes = [
        DeploymentScope.Tenant,
        DeploymentScope.ManagementGroup,
        DeploymentScope.Subscription,
        DeploymentScope.ResourceGroup,
      ];

      for (const scope of allScopes) {
        const schema = getSchemaForScope(scope);
        expect(schema).toMatch(/^https:\/\//);
        expect(schema).toMatch(/schema\.management\.azure\.com/);
        expect(schema).toMatch(/\.json#$/);
      }
    });
  });

  describe('canContain()', () => {
    describe('Tenant scope', () => {
      it('should contain ManagementGroup', () => {
        expect(canContain(DeploymentScope.Tenant, DeploymentScope.ManagementGroup)).toBe(true);
      });

      it('should contain Subscription', () => {
        expect(canContain(DeploymentScope.Tenant, DeploymentScope.Subscription)).toBe(true);
      });

      it('should not contain ResourceGroup directly', () => {
        expect(canContain(DeploymentScope.Tenant, DeploymentScope.ResourceGroup)).toBe(false);
      });

      it('should not contain itself', () => {
        expect(canContain(DeploymentScope.Tenant, DeploymentScope.Tenant)).toBe(false);
      });
    });

    describe('ManagementGroup scope', () => {
      it('should contain other ManagementGroups (nested)', () => {
        expect(canContain(DeploymentScope.ManagementGroup, DeploymentScope.ManagementGroup)).toBe(
          true
        );
      });

      it('should contain Subscription', () => {
        expect(canContain(DeploymentScope.ManagementGroup, DeploymentScope.Subscription)).toBe(
          true
        );
      });

      it('should not contain Tenant', () => {
        expect(canContain(DeploymentScope.ManagementGroup, DeploymentScope.Tenant)).toBe(false);
      });

      it('should not contain ResourceGroup directly', () => {
        expect(canContain(DeploymentScope.ManagementGroup, DeploymentScope.ResourceGroup)).toBe(
          false
        );
      });
    });

    describe('Subscription scope', () => {
      it('should contain ResourceGroup', () => {
        expect(canContain(DeploymentScope.Subscription, DeploymentScope.ResourceGroup)).toBe(true);
      });

      it('should not contain Tenant', () => {
        expect(canContain(DeploymentScope.Subscription, DeploymentScope.Tenant)).toBe(false);
      });

      it('should not contain ManagementGroup', () => {
        expect(canContain(DeploymentScope.Subscription, DeploymentScope.ManagementGroup)).toBe(
          false
        );
      });

      it('should not contain itself', () => {
        expect(canContain(DeploymentScope.Subscription, DeploymentScope.Subscription)).toBe(false);
      });
    });

    describe('ResourceGroup scope', () => {
      it('should not contain any other scope', () => {
        expect(canContain(DeploymentScope.ResourceGroup, DeploymentScope.Tenant)).toBe(false);
        expect(canContain(DeploymentScope.ResourceGroup, DeploymentScope.ManagementGroup)).toBe(
          false
        );
        expect(canContain(DeploymentScope.ResourceGroup, DeploymentScope.Subscription)).toBe(false);
        expect(canContain(DeploymentScope.ResourceGroup, DeploymentScope.ResourceGroup)).toBe(
          false
        );
      });
    });
  });

  describe('getParentScope()', () => {
    it('should return ManagementGroup for Subscription', () => {
      expect(getParentScope(DeploymentScope.Subscription)).toBe(DeploymentScope.ManagementGroup);
    });

    it('should return Subscription for ResourceGroup', () => {
      expect(getParentScope(DeploymentScope.ResourceGroup)).toBe(DeploymentScope.Subscription);
    });

    it('should return Tenant for ManagementGroup', () => {
      expect(getParentScope(DeploymentScope.ManagementGroup)).toBe(DeploymentScope.Tenant);
    });

    it('should return undefined for Tenant (top level)', () => {
      expect(getParentScope(DeploymentScope.Tenant)).toBeUndefined();
    });
  });

  describe('getChildScopes()', () => {
    it('should return correct children for Tenant', () => {
      const children = getChildScopes(DeploymentScope.Tenant);
      expect(children).toContain(DeploymentScope.ManagementGroup);
      expect(children).toContain(DeploymentScope.Subscription);
      expect(children).toHaveLength(2);
    });

    it('should return correct children for ManagementGroup', () => {
      const children = getChildScopes(DeploymentScope.ManagementGroup);
      expect(children).toContain(DeploymentScope.ManagementGroup);
      expect(children).toContain(DeploymentScope.Subscription);
      expect(children).toHaveLength(2);
    });

    it('should return ResourceGroup for Subscription', () => {
      const children = getChildScopes(DeploymentScope.Subscription);
      expect(children).toContain(DeploymentScope.ResourceGroup);
      expect(children).toHaveLength(1);
    });

    it('should return empty array for ResourceGroup', () => {
      const children = getChildScopes(DeploymentScope.ResourceGroup);
      expect(children).toHaveLength(0);
    });
  });

  describe('SCOPE_AVAILABLE_RESOURCES', () => {
    it('should have resources for all scopes', () => {
      expect(SCOPE_AVAILABLE_RESOURCES[DeploymentScope.Tenant]).toBeDefined();
      expect(SCOPE_AVAILABLE_RESOURCES[DeploymentScope.ManagementGroup]).toBeDefined();
      expect(SCOPE_AVAILABLE_RESOURCES[DeploymentScope.Subscription]).toBeDefined();
      expect(SCOPE_AVAILABLE_RESOURCES[DeploymentScope.ResourceGroup]).toBeDefined();
    });

    describe('Tenant scope resources', () => {
      it('should include policy definitions', () => {
        expect(SCOPE_AVAILABLE_RESOURCES[DeploymentScope.Tenant]).toContain(
          'Microsoft.Authorization/policyDefinitions'
        );
      });

      it('should include management groups', () => {
        expect(SCOPE_AVAILABLE_RESOURCES[DeploymentScope.Tenant]).toContain(
          'Microsoft.Management/managementGroups'
        );
      });
    });

    describe('ManagementGroup scope resources', () => {
      it('should include policy assignments', () => {
        expect(SCOPE_AVAILABLE_RESOURCES[DeploymentScope.ManagementGroup]).toContain(
          'Microsoft.Authorization/policyAssignments'
        );
      });

      it('should include role definitions', () => {
        expect(SCOPE_AVAILABLE_RESOURCES[DeploymentScope.ManagementGroup]).toContain(
          'Microsoft.Authorization/roleDefinitions'
        );
      });
    });

    describe('Subscription scope resources', () => {
      it('should include resource groups', () => {
        expect(SCOPE_AVAILABLE_RESOURCES[DeploymentScope.Subscription]).toContain(
          'Microsoft.Resources/resourceGroups'
        );
      });

      it('should include action groups', () => {
        expect(SCOPE_AVAILABLE_RESOURCES[DeploymentScope.Subscription]).toContain(
          'Microsoft.Insights/actionGroups'
        );
      });

      it('should include budgets', () => {
        expect(SCOPE_AVAILABLE_RESOURCES[DeploymentScope.Subscription]).toContain(
          'Microsoft.Consumption/budgets'
        );
      });
    });

    describe('ResourceGroup scope resources', () => {
      it('should include storage accounts', () => {
        expect(SCOPE_AVAILABLE_RESOURCES[DeploymentScope.ResourceGroup]).toContain(
          'Microsoft.Storage/storageAccounts'
        );
      });

      it('should include virtual networks', () => {
        expect(SCOPE_AVAILABLE_RESOURCES[DeploymentScope.ResourceGroup]).toContain(
          'Microsoft.Network/virtualNetworks'
        );
      });

      it('should include key vaults', () => {
        expect(SCOPE_AVAILABLE_RESOURCES[DeploymentScope.ResourceGroup]).toContain(
          'Microsoft.KeyVault/vaults'
        );
      });

      it('should include app services', () => {
        expect(SCOPE_AVAILABLE_RESOURCES[DeploymentScope.ResourceGroup]).toContain(
          'Microsoft.Web/sites'
        );
      });

      it('should include cognitive services', () => {
        expect(SCOPE_AVAILABLE_RESOURCES[DeploymentScope.ResourceGroup]).toContain(
          'Microsoft.CognitiveServices/accounts'
        );
      });
    });

    it('should have more resources in ResourceGroup than other scopes', () => {
      const tenantCount = SCOPE_AVAILABLE_RESOURCES[DeploymentScope.Tenant].length;
      const mgCount = SCOPE_AVAILABLE_RESOURCES[DeploymentScope.ManagementGroup].length;
      const subCount = SCOPE_AVAILABLE_RESOURCES[DeploymentScope.Subscription].length;
      const rgCount = SCOPE_AVAILABLE_RESOURCES[DeploymentScope.ResourceGroup].length;

      expect(rgCount).toBeGreaterThan(tenantCount);
      expect(rgCount).toBeGreaterThan(mgCount);
      expect(rgCount).toBeGreaterThan(subCount);
    });
  });

  describe('Scope hierarchy validation', () => {
    it('should have consistent parent-child relationships', () => {
      // If A can contain B, then B's parent should be A (for direct containment)
      // Exception: ManagementGroup can contain ManagementGroup (self-reference)

      // Subscription's parent should be ManagementGroup
      const subParent = getParentScope(DeploymentScope.Subscription);
      expect(subParent).toBe(DeploymentScope.ManagementGroup);
      expect(canContain(DeploymentScope.ManagementGroup, DeploymentScope.Subscription)).toBe(true);

      // ResourceGroup's parent should be Subscription
      const rgParent = getParentScope(DeploymentScope.ResourceGroup);
      expect(rgParent).toBe(DeploymentScope.Subscription);
      expect(canContain(DeploymentScope.Subscription, DeploymentScope.ResourceGroup)).toBe(true);

      // ManagementGroup's parent should be Tenant
      const mgParent = getParentScope(DeploymentScope.ManagementGroup);
      expect(mgParent).toBe(DeploymentScope.Tenant);
      expect(canContain(DeploymentScope.Tenant, DeploymentScope.ManagementGroup)).toBe(true);
    });
  });
});
