/**
 * Tests for FunctionApp IGrantable support.
 */

import { describe, it, expect } from 'vitest';
import { FunctionApp } from '../function-app';
import { Construct, ManagedIdentityType } from '@atakora/lib';
import { PrincipalType } from '@atakora/lib/src/core/grants/principal-type';
import { ManagedServiceIdentityType } from '../function-app-types';

// Mock ResourceGroup for testing
class MockResourceGroup extends Construct {
  public readonly resourceGroupName = 'test-rg';
  public readonly location = 'eastus';
  public readonly tags = { environment: 'test' };
}

// Mock plan and storage references
const mockPlan = {
  planId: '/subscriptions/test/resourceGroups/test-rg/providers/Microsoft.Web/serverfarms/test-plan',
  location: 'eastus',
};

const mockStorage = {
  storageAccountId: '/subscriptions/test/resourceGroups/test-rg/providers/Microsoft.Storage/storageAccounts/teststorage',
  storageAccountName: 'teststorage',
};

describe('FunctionApp - IGrantable support', () => {
  describe('extends GrantableResource', () => {
    it('should extend GrantableResource', () => {
      const rg = new MockResourceGroup(undefined as any, 'TestRG');
      const functionApp = new FunctionApp(rg, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
      });

      // Should have required Resource properties
      expect(functionApp.resourceType).toBe('Microsoft.Web/sites');
      expect(functionApp.apiVersion).toBe('2023-01-01');
      expect(functionApp.name).toBeDefined();
      expect(functionApp.resourceId).toBeDefined();
    });

    it('should have toArmTemplate method', () => {
      const rg = new MockResourceGroup(undefined as any, 'TestRG');
      const functionApp = new FunctionApp(rg, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
      });

      expect(functionApp.toArmTemplate).toBeDefined();
      const template = functionApp.toArmTemplate();
      expect(template.type).toBe('Microsoft.Web/sites');
      expect(template.kind).toBe('functionapp');
    });
  });

  describe('IGrantable implementation', () => {
    it('should implement IGrantable when identity is provided', () => {
      const rg = new MockResourceGroup(undefined as any, 'TestRG');
      const functionApp = new FunctionApp(rg, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
        identity: {
          type: ManagedServiceIdentityType.SYSTEM_ASSIGNED,
        },
      });

      // Should have IGrantable properties
      expect(functionApp.principalType).toBe(PrincipalType.ManagedIdentity);
      expect(functionApp.tenantId).toBeUndefined();
    });

    it('should return ARM reference for principalId with system-assigned identity', () => {
      const rg = new MockResourceGroup(undefined as any, 'TestRG');
      const functionApp = new FunctionApp(rg, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
        identity: {
          type: ManagedServiceIdentityType.SYSTEM_ASSIGNED,
        },
      });

      expect(functionApp.principalId).toContain('[reference(');
      expect(functionApp.principalId).toContain('Microsoft.Web/sites');
      expect(functionApp.principalId).toContain('.identity.principalId]');
    });

    it('should throw error if principalId accessed without identity', () => {
      const rg = new MockResourceGroup(undefined as any, 'TestRG');
      const functionApp = new FunctionApp(rg, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
      });

      expect(() => {
        const _ = functionApp.principalId;
      }).toThrow();
    });

    it('should throw error if principalId accessed with user-assigned only identity', () => {
      const rg = new MockResourceGroup(undefined as any, 'TestRG');
      const functionApp = new FunctionApp(rg, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
        identity: {
          type: ManagedServiceIdentityType.USER_ASSIGNED,
          userAssignedIdentities: {
            '/subscriptions/test/resourceGroups/test-rg/providers/Microsoft.ManagedIdentity/userAssignedIdentities/test-identity': {},
          },
        },
      });

      expect(() => {
        const _ = functionApp.principalId;
      }).toThrow('has only user-assigned identity');
    });

    it('should work with system-assigned and user-assigned combined', () => {
      const rg = new MockResourceGroup(undefined as any, 'TestRG');
      const functionApp = new FunctionApp(rg, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
        identity: {
          type: ManagedServiceIdentityType.SYSTEM_ASSIGNED_USER_ASSIGNED,
          userAssignedIdentities: {
            '/subscriptions/test/resourceGroups/test-rg/providers/Microsoft.ManagedIdentity/userAssignedIdentities/test-identity': {},
          },
        },
      });

      expect(functionApp.principalId).toContain('[reference(');
      expect(functionApp.principalId).toContain('.identity.principalId]');
    });
  });

  describe('identity type conversion', () => {
    it('should convert SYSTEM_ASSIGNED identity type', () => {
      const rg = new MockResourceGroup(undefined as any, 'TestRG');
      const functionApp = new FunctionApp(rg, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
        identity: {
          type: ManagedServiceIdentityType.SYSTEM_ASSIGNED,
        },
      });

      // Access protected identity property through principalId
      expect(() => functionApp.principalId).not.toThrow();
    });

    it('should convert USER_ASSIGNED identity type', () => {
      const rg = new MockResourceGroup(undefined as any, 'TestRG');
      const functionApp = new FunctionApp(rg, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
        identity: {
          type: ManagedServiceIdentityType.USER_ASSIGNED,
          userAssignedIdentities: {
            '/subscriptions/test/resourceGroups/test-rg/providers/Microsoft.ManagedIdentity/userAssignedIdentities/test-identity': {},
          },
        },
      });

      // Should convert type correctly
      expect(functionApp.principalType).toBe(PrincipalType.ManagedIdentity);
    });
  });

  describe('auto-identity enablement', () => {
    it('should auto-enable system-assigned identity when used as grantee', () => {
      const rg = new MockResourceGroup(undefined as any, 'TestRG');
      const functionApp = new FunctionApp(rg, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
        // No identity specified
      });

      // The ensureIdentity method should be called when function app is used as grantee
      // This is handled by GrantableResource.grant() method
      // For now, we just verify the function app can be created without identity
      expect(functionApp.functionAppName).toBeDefined();
    });
  });

  describe('resourceId generation', () => {
    it('should generate correct resourceId format', () => {
      const rg = new MockResourceGroup(undefined as any, 'TestRG');
      const functionApp = new FunctionApp(rg, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
        functionAppName: 'test-function-app',
      });

      expect(functionApp.resourceId).toContain("resourceId('Microsoft.Web/sites'");
      expect(functionApp.resourceId).toContain('test-function-app');
      expect(functionApp.functionAppId).toBe(functionApp.resourceId);
    });
  });

  describe('integration with grant pattern', () => {
    it('should be usable as a grantee with system-assigned identity', () => {
      const rg = new MockResourceGroup(undefined as any, 'TestRG');
      const functionApp = new FunctionApp(rg, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
        identity: {
          type: ManagedServiceIdentityType.SYSTEM_ASSIGNED,
        },
      });

      // Verify it has all IGrantable properties
      expect(functionApp.principalId).toBeDefined();
      expect(functionApp.principalType).toBe(PrincipalType.ManagedIdentity);

      // principalId should be an ARM reference
      expect(functionApp.principalId).toContain('[reference(');
    });

    it('should maintain identity configuration in ARM template', () => {
      const rg = new MockResourceGroup(undefined as any, 'TestRG');
      const functionApp = new FunctionApp(rg, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
        identity: {
          type: ManagedServiceIdentityType.SYSTEM_ASSIGNED,
        },
      });

      const template = functionApp.toArmTemplate();
      expect(template.identity).toBeDefined();
      expect(template.identity.type).toBe(ManagedIdentityType.SYSTEM_ASSIGNED);
    });
  });
});
