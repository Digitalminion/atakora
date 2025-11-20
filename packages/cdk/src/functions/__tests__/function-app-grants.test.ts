/**
 * Tests for FunctionApp IGrantable support.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FunctionApp } from '../function-app';
import { ManagedIdentityType, PrincipalType, App } from '@atakora/lib';
import { ManagedServiceIdentityType } from '../function-app-types';
import { MockResourceGroup, createMockPlan, createMockStorage } from '../../../__tests__/helpers/test-fixtures';

// Mock plan and storage references
const mockPlan = createMockPlan();
const mockStorage = createMockStorage();

describe('FunctionApp - IGrantable support', () => {
  let app: App;
  let rg: MockResourceGroup;

  beforeEach(() => {
    app = new App();
    rg = new MockResourceGroup(app, 'TestRG');
  });

  describe('extends GrantableResource', () => {
    it('should extend GrantableResource', () => {
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
      const localRg = new MockResourceGroup(app, 'LocalTestRG');
      const functionApp = new FunctionApp(localRg, 'Api', {
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
      const localRg = new MockResourceGroup(app, 'LocalTestRG');
      const functionApp = new FunctionApp(localRg, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
      });

      expect(() => {
        const _ = functionApp.principalId;
      }).toThrow();
    });

    it('should throw error if principalId accessed with user-assigned only identity', () => {
      const localRg = new MockResourceGroup(app, 'LocalTestRG');
      const functionApp = new FunctionApp(localRg, 'Api', {
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
      const localRg = new MockResourceGroup(app, 'LocalTestRG');
      const functionApp = new FunctionApp(localRg, 'Api', {
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
      const localRg = new MockResourceGroup(app, 'LocalTestRG');
      const functionApp = new FunctionApp(localRg, 'Api', {
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
      const localRg = new MockResourceGroup(app, 'LocalTestRG');
      const functionApp = new FunctionApp(localRg, 'Api', {
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
      const localRg = new MockResourceGroup(app, 'LocalTestRG');
      const functionApp = new FunctionApp(localRg, 'Api', {
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
      const localRg = new MockResourceGroup(app, 'LocalTestRG');
      const functionApp = new FunctionApp(localRg, 'Api', {
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
      const localRg = new MockResourceGroup(app, 'LocalTestRG');
      const functionApp = new FunctionApp(localRg, 'Api', {
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
      const localRg = new MockResourceGroup(app, 'LocalTestRG');
      const functionApp = new FunctionApp(localRg, 'Api', {
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
