import { describe, it, expect, beforeEach } from 'vitest';
import { ResourceTransformer } from './resource-transformer';
import { Resource, type ResourceProps } from '../../core/resource';
import { App } from '../../core/app';
import { Construct } from '../../core/construct';
import { ArmResource } from '../types';

// Test resource implementation
class TestResource extends Resource {
  readonly resourceType: string;
  readonly resourceId: string;
  readonly name: string;

  constructor(
    scope: Construct,
    id: string,
    props: ResourceProps & { resourceType: string; name: string }
  ) {
    super(scope, id, props);
    this.resourceType = props.resourceType;
    this.name = props.name;
    this.resourceId = `/test/${this.resourceType}/${this.name}`;
  }
}

describe('synthesis/transform/ResourceTransformer', () => {
  let transformer: ResourceTransformer;
  let app: App;
  let stack: Construct;

  beforeEach(() => {
    transformer = new ResourceTransformer();
    app = new App();
    stack = new Construct(app, 'TestStack');
  });

  describe('transform()', () => {
    it('should transform basic resource to ARM JSON', () => {
      const resource = new TestResource(stack, 'Storage', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'mystorageaccount',
      });

      const armResource = transformer.transform(resource);

      expect(armResource.type).toBe('Microsoft.Storage/storageAccounts');
      expect(armResource.name).toBe('mystorageaccount');
      expect(armResource.apiVersion).toBe('2023-01-01');
    });

    it('should include location if specified', () => {
      const resource = new TestResource(stack, 'Storage', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'mystorageaccount',
        location: 'eastus',
      });

      const armResource = transformer.transform(resource);

      expect(armResource.location).toBe('eastus');
    });

    it('should include tags if specified', () => {
      const resource = new TestResource(stack, 'Storage', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'mystorageaccount',
        tags: {
          environment: 'nonprod',
          project: 'authr',
        },
      });

      const armResource = transformer.transform(resource);

      expect(armResource.tags).toEqual({
        environment: 'nonprod',
        project: 'authr',
      });
    });

    it('should not include empty tags object', () => {
      const resource = new TestResource(stack, 'Storage', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'mystorageaccount',
        tags: {},
      });

      const armResource = transformer.transform(resource);

      expect(armResource.tags).toBeUndefined();
    });

    it('should extract properties from resource', () => {
      const resource = new TestResource(stack, 'Storage', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'mystorageaccount',
      });

      (resource as any).properties = {
        accessTier: 'Hot',
        supportsHttpsTrafficOnly: true,
      };

      const armResource = transformer.transform(resource);

      expect(armResource.properties).toEqual({
        accessTier: 'Hot',
        supportsHttpsTrafficOnly: true,
      });
    });

    it('should extract SKU from resource', () => {
      const resource = new TestResource(stack, 'Storage', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'mystorageaccount',
      });

      (resource as any).sku = {
        name: 'Standard_LRS',
        tier: 'Standard',
      };

      const armResource = transformer.transform(resource);

      expect(armResource.sku).toEqual({
        name: 'Standard_LRS',
        tier: 'Standard',
      });
    });

    it('should extract kind from resource', () => {
      const resource = new TestResource(stack, 'Storage', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'mystorageaccount',
      });

      (resource as any).kind = 'StorageV2';

      const armResource = transformer.transform(resource);

      expect(armResource.kind).toBe('StorageV2');
    });

    it('should extract identity from resource', () => {
      const resource = new TestResource(stack, 'Storage', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'mystorageaccount',
      });

      (resource as any).identity = {
        type: 'SystemAssigned',
      };

      const armResource = transformer.transform(resource);

      expect(armResource.identity).toEqual({
        type: 'SystemAssigned',
      });
    });

    it('should use resource apiVersion if specified', () => {
      const resource = new TestResource(stack, 'Storage', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'mystorageaccount',
      });

      (resource as any).apiVersion = '2024-01-01';

      const armResource = transformer.transform(resource);

      expect(armResource.apiVersion).toBe('2024-01-01');
    });

    it('should use default apiVersion for known resource types', () => {
      const resourceTypes = [
        { type: 'Microsoft.Storage/storageAccounts', version: '2023-01-01' },
        { type: 'Microsoft.Network/virtualNetworks', version: '2023-04-01' },
        { type: 'Microsoft.Compute/virtualMachines', version: '2023-03-01' },
        { type: 'Microsoft.Resources/resourceGroups', version: '2021-04-01' },
        { type: 'Microsoft.KeyVault/vaults', version: '2023-02-01' },
      ];

      for (let i = 0; i < resourceTypes.length; i++) {
        const { type, version } = resourceTypes[i];
        const resource = new TestResource(stack, `Test${i}`, {
          resourceType: type,
          name: `test${i}`,
        });

        const armResource = transformer.transform(resource);

        expect(armResource.apiVersion).toBe(version);
      }
    });

    it('should use fallback apiVersion for unknown resource types', () => {
      const resource = new TestResource(stack, 'Custom', {
        resourceType: 'Custom.Provider/customResources',
        name: 'custom1',
      });

      const armResource = transformer.transform(resource);

      expect(armResource.apiVersion).toBe('2023-01-01');
    });

    it('should clean undefined values from output', () => {
      const resource = new TestResource(stack, 'Storage', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'mystorageaccount',
      });

      (resource as any).properties = {
        definedValue: 'value',
        undefinedValue: undefined,
        nullValue: null,
      };

      const armResource = transformer.transform(resource);

      expect(armResource.properties).toEqual({
        definedValue: 'value',
        nullValue: null,
      });
      expect('undefinedValue' in armResource.properties!).toBe(false);
    });

    it('should clean undefined values from nested objects', () => {
      const resource = new TestResource(stack, 'Storage', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'mystorageaccount',
      });

      (resource as any).properties = {
        nested: {
          value1: 'defined',
          value2: undefined,
          deepNested: {
            value3: 'defined',
            value4: undefined,
          },
        },
      };

      const armResource = transformer.transform(resource);

      expect(armResource.properties).toEqual({
        nested: {
          value1: 'defined',
          deepNested: {
            value3: 'defined',
          },
        },
      });
    });

    it('should clean undefined values from arrays', () => {
      const resource = new TestResource(stack, 'Storage', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'mystorageaccount',
      });

      (resource as any).properties = {
        items: [{ value: 'defined', undef: undefined }, { value: 'defined2' }],
      };

      const armResource = transformer.transform(resource);

      expect(armResource.properties).toEqual({
        items: [{ value: 'defined' }, { value: 'defined2' }],
      });
    });

    it('should remove empty nested objects after cleaning', () => {
      const resource = new TestResource(stack, 'Storage', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'mystorageaccount',
      });

      (resource as any).properties = {
        emptyAfterClean: {
          allUndefined: undefined,
        },
        kept: 'value',
      };

      const armResource = transformer.transform(resource);

      expect(armResource.properties).toEqual({
        kept: 'value',
      });
      expect('emptyAfterClean' in armResource.properties!).toBe(false);
    });
  });

  describe('transformAll()', () => {
    it('should transform multiple resources', () => {
      const resource1 = new TestResource(stack, 'Storage1', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'storage1',
      });

      const resource2 = new TestResource(stack, 'Storage2', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'storage2',
      });

      const armResources = transformer.transformAll([resource1, resource2]);

      expect(armResources).toHaveLength(2);
      expect(armResources[0].name).toBe('storage1');
      expect(armResources[1].name).toBe('storage2');
    });

    it('should handle empty array', () => {
      const armResources = transformer.transformAll([]);

      expect(armResources).toHaveLength(0);
    });
  });

  describe('generateResourceId()', () => {
    it('should generate resource ID reference', () => {
      const armResource: ArmResource = {
        type: 'Microsoft.Storage/storageAccounts',
        apiVersion: '2023-01-01',
        name: 'mystorageaccount',
      };

      const resourceId = ResourceTransformer.generateResourceId(armResource);

      expect(resourceId).toBe(
        "[resourceId('Microsoft.Storage/storageAccounts', 'mystorageaccount')]"
      );
    });

    it('should handle different resource types', () => {
      const armResource: ArmResource = {
        type: 'Microsoft.Network/virtualNetworks',
        apiVersion: '2023-04-01',
        name: 'vnet-001',
      };

      const resourceId = ResourceTransformer.generateResourceId(armResource);

      expect(resourceId).toBe("[resourceId('Microsoft.Network/virtualNetworks', 'vnet-001')]");
    });
  });

  describe('edge cases', () => {
    it('should handle resource with all optional fields', () => {
      const resource = new TestResource(stack, 'Full', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'fullresource',
        location: 'eastus',
        tags: { env: 'test' },
      });

      (resource as any).apiVersion = '2024-01-01';
      (resource as any).properties = { tier: 'Standard' };
      (resource as any).sku = { name: 'Standard_LRS' };
      (resource as any).kind = 'StorageV2';
      (resource as any).identity = { type: 'SystemAssigned' };

      const armResource = transformer.transform(resource);

      expect(armResource).toEqual({
        type: 'Microsoft.Storage/storageAccounts',
        apiVersion: '2024-01-01',
        name: 'fullresource',
        location: 'eastus',
        tags: { env: 'test' },
        properties: { tier: 'Standard' },
        sku: { name: 'Standard_LRS' },
        kind: 'StorageV2',
        identity: { type: 'SystemAssigned' },
      });
    });

    it('should handle resource with minimal fields', () => {
      const resource = new TestResource(stack, 'Minimal', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'minimal',
      });

      const armResource = transformer.transform(resource);

      expect(armResource).toEqual({
        type: 'Microsoft.Storage/storageAccounts',
        apiVersion: '2023-01-01',
        name: 'minimal',
      });
    });

    it('should preserve null values', () => {
      const resource = new TestResource(stack, 'Storage', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'storage',
      });

      (resource as any).properties = {
        explicitNull: null,
        normalValue: 'value',
      };

      const armResource = transformer.transform(resource);

      expect(armResource.properties).toEqual({
        explicitNull: null,
        normalValue: 'value',
      });
    });
  });
});
