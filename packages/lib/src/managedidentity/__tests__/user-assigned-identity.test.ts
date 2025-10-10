/**
 * Tests for UserAssignedIdentity construct.
 */

import { describe, it, expect } from 'vitest';
import { UserAssignedIdentity } from '../user-assigned-identity';
import { Construct } from '../../core/construct';
import { PrincipalType } from '../../core/grants';

// Mock ResourceGroup for testing
class MockResourceGroup extends Construct {
  public readonly resourceGroupName = 'test-rg';
  public readonly location = 'eastus';
  public readonly tags = { environment: 'test' };
}

describe('UserAssignedIdentity', () => {
  describe('constructor', () => {
    it('should create a user-assigned identity with required properties', () => {
      const rg = new MockResourceGroup(undefined as any, 'TestRG');
      const identity = new UserAssignedIdentity(rg, 'TestIdentity', {
        identityName: 'test-identity',
        location: 'eastus',
      });

      expect(identity.identityName).toBe('test-identity');
      expect(identity.name).toBe('test-identity');
      expect(identity.location).toBe('eastus');
      expect(identity.resourceType).toBe('Microsoft.ManagedIdentity/userAssignedIdentities');
      expect(identity.apiVersion).toBe('2023-01-31');
    });

    it('should default location to parent if not provided', () => {
      const rg = new MockResourceGroup(undefined as any, 'TestRG');
      const identity = new UserAssignedIdentity(rg, 'TestIdentity', {
        identityName: 'test-identity',
      });

      expect(identity.location).toBe('eastus'); // From mock RG
    });

    it('should include tags if provided', () => {
      const rg = new MockResourceGroup(undefined as any, 'TestRG');
      const identity = new UserAssignedIdentity(rg, 'TestIdentity', {
        identityName: 'test-identity',
        location: 'westus',
        tags: { project: 'test-project' },
      });

      expect(identity.tags).toEqual({ project: 'test-project' });
    });

    it('should throw error if identityName is empty', () => {
      const rg = new MockResourceGroup(undefined as any, 'TestRG');

      expect(() => {
        new UserAssignedIdentity(rg, 'TestIdentity', {
          identityName: '',
          location: 'eastus',
        });
      }).toThrow('UserAssignedIdentity requires an identityName');
    });

    it('should throw error if identityName is invalid format', () => {
      const rg = new MockResourceGroup(undefined as any, 'TestRG');

      expect(() => {
        new UserAssignedIdentity(rg, 'TestIdentity', {
          identityName: '-invalid',
          location: 'eastus',
        });
      }).toThrow('Invalid identityName');
    });

    it('should throw error if identityName is too short', () => {
      const rg = new MockResourceGroup(undefined as any, 'TestRG');

      expect(() => {
        new UserAssignedIdentity(rg, 'TestIdentity', {
          identityName: 'ab',
          location: 'eastus',
        });
      }).toThrow('must be between 3 and 128 characters');
    });

    it('should throw error if identityName is too long', () => {
      const rg = new MockResourceGroup(undefined as any, 'TestRG');
      const longName = 'a'.repeat(129);

      expect(() => {
        new UserAssignedIdentity(rg, 'TestIdentity', {
          identityName: longName,
          location: 'eastus',
        });
      }).toThrow('must be between 3 and 128 characters');
    });
  });

  describe('IGrantable implementation', () => {
    it('should implement IGrantable interface', () => {
      const rg = new MockResourceGroup(undefined as any, 'TestRG');
      const identity = new UserAssignedIdentity(rg, 'TestIdentity', {
        identityName: 'test-identity',
        location: 'eastus',
      });

      expect(identity.principalId).toBeDefined();
      expect(identity.principalType).toBe(PrincipalType.ManagedIdentity);
      expect(identity.tenantId).toBeUndefined();
    });

    it('should return ARM reference expression for principalId', () => {
      const rg = new MockResourceGroup(undefined as any, 'TestRG');
      const identity = new UserAssignedIdentity(rg, 'TestIdentity', {
        identityName: 'test-identity',
        location: 'eastus',
      });

      expect(identity.principalId).toContain('[reference(');
      expect(identity.principalId).toContain('Microsoft.ManagedIdentity/userAssignedIdentities');
      expect(identity.principalId).toContain('test-identity');
      expect(identity.principalId).toContain('.principalId]');
    });

    it('should return ARM reference expression for clientId', () => {
      const rg = new MockResourceGroup(undefined as any, 'TestRG');
      const identity = new UserAssignedIdentity(rg, 'TestIdentity', {
        identityName: 'test-identity',
        location: 'eastus',
      });

      expect(identity.clientId).toContain('[reference(');
      expect(identity.clientId).toContain('Microsoft.ManagedIdentity/userAssignedIdentities');
      expect(identity.clientId).toContain('test-identity');
      expect(identity.clientId).toContain('.clientId]');
    });
  });

  describe('toArmTemplate', () => {
    it('should generate correct ARM template', () => {
      const rg = new MockResourceGroup(undefined as any, 'TestRG');
      const identity = new UserAssignedIdentity(rg, 'TestIdentity', {
        identityName: 'test-identity',
        location: 'eastus',
        tags: { environment: 'test' },
      });

      const template = identity.toArmTemplate();

      expect(template).toEqual({
        type: 'Microsoft.ManagedIdentity/userAssignedIdentities',
        apiVersion: '2023-01-31',
        name: 'test-identity',
        location: 'eastus',
        tags: { environment: 'test' },
      });
    });

    it('should include empty tags object if no tags provided', () => {
      const rg = new MockResourceGroup(undefined as any, 'TestRG');
      const identity = new UserAssignedIdentity(rg, 'TestIdentity', {
        identityName: 'test-identity',
        location: 'eastus',
      });

      const template = identity.toArmTemplate();

      expect(template.tags).toEqual({});
    });
  });

  describe('fromIdentityName', () => {
    it('should import existing identity by name', () => {
      const rg = new MockResourceGroup(undefined as any, 'TestRG');
      const imported = UserAssignedIdentity.fromIdentityName(
        rg,
        'ImportedIdentity',
        'existing-identity'
      );

      expect(imported.identityName).toBe('existing-identity');
      expect(imported.principalId).toContain('existing-identity');
      expect(imported.principalType).toBe(PrincipalType.ManagedIdentity);
    });

    it('should generate correct resource ID for imported identity', () => {
      const rg = new MockResourceGroup(undefined as any, 'TestRG');
      const imported = UserAssignedIdentity.fromIdentityName(
        rg,
        'ImportedIdentity',
        'existing-identity'
      );

      expect(imported.identityId).toContain("resourceId('Microsoft.ManagedIdentity/userAssignedIdentities'");
      expect(imported.identityId).toContain('existing-identity');
    });
  });

  describe('fromIdentityId', () => {
    it('should import existing identity by resource ID', () => {
      const rg = new MockResourceGroup(undefined as any, 'TestRG');
      const resourceId =
        '/subscriptions/12345/resourceGroups/test-rg/providers/Microsoft.ManagedIdentity/userAssignedIdentities/my-identity';

      const imported = UserAssignedIdentity.fromIdentityId(
        rg,
        'ImportedIdentity',
        resourceId
      );

      expect(imported.identityName).toBe('my-identity');
      expect(imported.identityId).toBe(resourceId);
      expect(imported.principalType).toBe(PrincipalType.ManagedIdentity);
    });

    it('should extract identity name from resource ID', () => {
      const rg = new MockResourceGroup(undefined as any, 'TestRG');
      const resourceId =
        '/subscriptions/12345/resourceGroups/test-rg/providers/Microsoft.ManagedIdentity/userAssignedIdentities/extracted-name';

      const imported = UserAssignedIdentity.fromIdentityId(
        rg,
        'ImportedIdentity',
        resourceId
      );

      expect(imported.identityName).toBe('extracted-name');
    });

    it('should handle resource ID without valid identity name', () => {
      const rg = new MockResourceGroup(undefined as any, 'TestRG');
      const resourceId = '/invalid/resource/id';

      const imported = UserAssignedIdentity.fromIdentityId(
        rg,
        'ImportedIdentity',
        resourceId
      );

      expect(imported.identityName).toBe('imported-identity');
    });
  });

  describe('resourceId generation', () => {
    it('should generate correct resourceId format', () => {
      const rg = new MockResourceGroup(undefined as any, 'TestRG');
      const identity = new UserAssignedIdentity(rg, 'TestIdentity', {
        identityName: 'test-identity',
        location: 'eastus',
      });

      expect(identity.resourceId).toContain("resourceId('Microsoft.ManagedIdentity/userAssignedIdentities'");
      expect(identity.resourceId).toContain('test-identity');
      expect(identity.identityId).toBe(identity.resourceId);
    });
  });
});
