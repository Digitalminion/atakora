import { describe, it, expect } from 'vitest';
import { generateScopedName, validateScopedParams } from './scoped-naming';
import { DeploymentScope } from '../core/azure/scopes';

describe('naming/scoped-naming', () => {
  describe('generateScopedName()', () => {
    describe('Tenant scope', () => {
      it('should generate tenant-scoped name with just prefix', () => {
        const name = generateScopedName({
          scope: DeploymentScope.Tenant,
          resourceType: 'policy',
        });

        expect(name).toBeDefined();
        // Tenant scope: just the resource type pattern
        expect(name.length).toBeGreaterThan(0);
      });

      it('should generate tenant-scoped name with purpose', () => {
        const name = generateScopedName({
          scope: DeploymentScope.Tenant,
          resourceType: 'policy',
          purpose: 'security',
        });

        expect(name).toContain('security');
      });

      it('should not require organization for tenant scope', () => {
        expect(() => {
          generateScopedName({
            scope: DeploymentScope.Tenant,
            resourceType: 'policy',
          });
        }).not.toThrow();
      });
    });

    describe('ManagementGroup scope', () => {
      it('should generate management group name with org', () => {
        const name = generateScopedName({
          scope: DeploymentScope.ManagementGroup,
          resourceType: 'mg',
          organization: 'digital-products',
        });

        expect(name).toContain('digital-products');
      });

      it('should generate management group name with purpose', () => {
        const name = generateScopedName({
          scope: DeploymentScope.ManagementGroup,
          resourceType: 'mg',
          organization: 'digital-products',
          purpose: 'platform',
        });

        expect(name).toContain('digital-products');
        expect(name).toContain('platform');
      });

      it('should require organization for management group scope', () => {
        expect(() => {
          generateScopedName({
            scope: DeploymentScope.ManagementGroup,
            resourceType: 'mg',
          });
        }).toThrow(/organization is required/);
      });

      it('should not require project/environment for management group scope', () => {
        expect(() => {
          generateScopedName({
            scope: DeploymentScope.ManagementGroup,
            resourceType: 'mg',
            organization: 'digital-products',
          });
        }).not.toThrow();
      });
    });

    describe('Subscription scope', () => {
      const baseParams = {
        scope: DeploymentScope.Subscription,
        resourceType: 'rg',
        organization: 'digital-products',
        project: 'colorai',
        environment: 'nonprod',
        geography: 'eastus',
        instance: '01',
      };

      it('should generate full subscription-scoped name', () => {
        const name = generateScopedName(baseParams);

        expect(name).toContain('digital-products');
        expect(name).toContain('colorai');
        expect(name).toContain('nonprod');
        expect(name).toContain('eastus');
        expect(name).toContain('01');
      });

      it('should include purpose when provided', () => {
        const name = generateScopedName({
          ...baseParams,
          purpose: 'data',
        });

        expect(name).toContain('data');
        expect(name).toContain('digital-products');
        expect(name).toContain('colorai');
      });

      it('should require all naming components for subscription scope', () => {
        expect(() => {
          generateScopedName({
            scope: DeploymentScope.Subscription,
            resourceType: 'rg',
            organization: 'digital-products',
            project: 'colorai',
            // Missing: environment, geography, instance
          });
        }).toThrow();
      });

      it('should require organization', () => {
        expect(() => {
          generateScopedName({
            ...baseParams,
            organization: undefined,
          });
        }).toThrow(/organization is required/);
      });

      it('should require project', () => {
        expect(() => {
          generateScopedName({
            ...baseParams,
            project: undefined,
          });
        }).toThrow(/project is required/);
      });

      it('should require environment', () => {
        expect(() => {
          generateScopedName({
            ...baseParams,
            environment: undefined,
          });
        }).toThrow(/environment is required/);
      });

      it('should require geography', () => {
        expect(() => {
          generateScopedName({
            ...baseParams,
            geography: undefined,
          });
        }).toThrow(/geography is required/);
      });

      it('should require instance', () => {
        expect(() => {
          generateScopedName({
            ...baseParams,
            instance: undefined,
          });
        }).toThrow(/instance is required/);
      });
    });

    describe('ResourceGroup scope', () => {
      const baseParams = {
        scope: DeploymentScope.ResourceGroup,
        resourceType: 'storage',
        organization: 'dp',
        project: 'colorai',
        environment: 'nonprod',
        geography: 'eus',
        instance: '01',
      };

      it('should generate full resource group-scoped name', () => {
        const name = generateScopedName(baseParams);

        expect(name).toContain('dp');
        expect(name).toContain('colorai');
        expect(name).toContain('nonprod');
        expect(name).toContain('eus');
        expect(name).toContain('01');
      });

      it('should handle storage accounts (special case)', () => {
        const name = generateScopedName(baseParams);

        // Storage accounts: no hyphens, lowercase only
        expect(name).not.toContain('-');
        expect(name).toMatch(/^[a-z0-9]+$/);
      });

      it('should handle key vaults (special case)', () => {
        const name = generateScopedName({
          ...baseParams,
          resourceType: 'keyvault',
        });

        // Key vaults: lowercase only, hyphens allowed
        expect(name).toMatch(/^[a-z0-9-]+$/);
      });

      it('should truncate names exceeding max length', () => {
        const name = generateScopedName({
          scope: DeploymentScope.ResourceGroup,
          resourceType: 'storage',
          organization: 'very-long-organization-name',
          project: 'very-long-project-name',
          environment: 'nonprod',
          geography: 'eastus',
          instance: '01',
        });

        // Storage max length is 24
        expect(name.length).toBeLessThanOrEqual(24);
      });

      it('should require all naming components for resource group scope', () => {
        expect(() => {
          generateScopedName({
            scope: DeploymentScope.ResourceGroup,
            resourceType: 'storage',
            organization: 'dp',
            // Missing other params
          });
        }).toThrow();
      });
    });

    describe('Additional suffix', () => {
      it('should append additional suffix for tenant scope', () => {
        const name = generateScopedName({
          scope: DeploymentScope.Tenant,
          resourceType: 'policy',
          additionalSuffix: 'backup',
        });

        expect(name).toContain('backup');
      });

      it('should append additional suffix for subscription scope', () => {
        const name = generateScopedName({
          scope: DeploymentScope.Subscription,
          resourceType: 'rg',
          organization: 'dp',
          project: 'colorai',
          environment: 'nonprod',
          geography: 'eus',
          instance: '01',
          additionalSuffix: 'backup',
        });

        expect(name).toContain('backup');
      });
    });

    describe('Custom conventions', () => {
      it('should use custom separator', () => {
        const name = generateScopedName(
          {
            scope: DeploymentScope.Subscription,
            resourceType: 'rg',
            organization: 'dp',
            project: 'colorai',
            environment: 'nonprod',
            geography: 'eus',
            instance: '01',
          },
          {
            separator: '_',
            maxLength: 60,
            patterns: {},
            maxLengths: {},
          }
        );

        expect(name).toContain('_');
      });

      it('should use custom pattern', () => {
        const name = generateScopedName(
          {
            scope: DeploymentScope.Subscription,
            resourceType: 'rg',
            organization: 'dp',
            project: 'colorai',
            environment: 'nonprod',
            geography: 'eus',
            instance: '01',
          },
          {
            separator: '-',
            maxLength: 60,
            patterns: { rg: 'resource-group' },
            maxLengths: {},
          }
        );

        expect(name).toContain('resource-group');
      });
    });
  });

  describe('validateScopedParams()', () => {
    describe('Tenant scope validation', () => {
      it('should accept valid tenant params', () => {
        const result = validateScopedParams({
          scope: DeploymentScope.Tenant,
          resourceType: 'policy',
        });

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject missing resource type', () => {
        const result = validateScopedParams({
          scope: DeploymentScope.Tenant,
          resourceType: '',
        });

        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('resourceType'))).toBe(true);
      });

      it('should not require organization', () => {
        const result = validateScopedParams({
          scope: DeploymentScope.Tenant,
          resourceType: 'policy',
        });

        expect(result.isValid).toBe(true);
      });
    });

    describe('ManagementGroup scope validation', () => {
      it('should accept valid management group params', () => {
        const result = validateScopedParams({
          scope: DeploymentScope.ManagementGroup,
          resourceType: 'mg',
          organization: 'digital-products',
        });

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject missing organization', () => {
        const result = validateScopedParams({
          scope: DeploymentScope.ManagementGroup,
          resourceType: 'mg',
        });

        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('organization'))).toBe(true);
      });

      it('should not require project/environment', () => {
        const result = validateScopedParams({
          scope: DeploymentScope.ManagementGroup,
          resourceType: 'mg',
          organization: 'digital-products',
        });

        expect(result.isValid).toBe(true);
      });
    });

    describe('Subscription scope validation', () => {
      const validParams = {
        scope: DeploymentScope.Subscription,
        resourceType: 'rg',
        organization: 'digital-products',
        project: 'colorai',
        environment: 'nonprod',
        geography: 'eastus',
        instance: '01',
      };

      it('should accept valid subscription params', () => {
        const result = validateScopedParams(validParams);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject missing organization', () => {
        const result = validateScopedParams({
          ...validParams,
          organization: undefined,
        });

        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('organization'))).toBe(true);
      });

      it('should reject missing project', () => {
        const result = validateScopedParams({
          ...validParams,
          project: undefined,
        });

        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('project'))).toBe(true);
      });

      it('should reject missing environment', () => {
        const result = validateScopedParams({
          ...validParams,
          environment: undefined,
        });

        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('environment'))).toBe(true);
      });

      it('should reject missing geography', () => {
        const result = validateScopedParams({
          ...validParams,
          geography: undefined,
        });

        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('geography'))).toBe(true);
      });

      it('should reject missing instance', () => {
        const result = validateScopedParams({
          ...validParams,
          instance: undefined,
        });

        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('instance'))).toBe(true);
      });

      it('should reject empty string values', () => {
        const result = validateScopedParams({
          ...validParams,
          project: '   ',
        });

        expect(result.isValid).toBe(false);
      });
    });

    describe('ResourceGroup scope validation', () => {
      const validParams = {
        scope: DeploymentScope.ResourceGroup,
        resourceType: 'storage',
        organization: 'dp',
        project: 'colorai',
        environment: 'nonprod',
        geography: 'eus',
        instance: '01',
      };

      it('should accept valid resource group params', () => {
        const result = validateScopedParams(validParams);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should require all naming components', () => {
        const result = validateScopedParams({
          scope: DeploymentScope.ResourceGroup,
          resourceType: 'storage',
          organization: 'dp',
        });

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });
});
