import { describe, it, expect } from 'vitest';
import { ResourceFactory } from './resource-factory';
import type { SchemaIR, ResourceDefinition } from './types';

describe('ResourceFactory', () => {
  const factory = new ResourceFactory();

  const mockIR: SchemaIR = {
    provider: 'Microsoft.Storage',
    apiVersion: '2023-01-01',
    resources: [],
    definitions: new Map(),
    metadata: {
      schemaPath: '/path/to/schema.json',
      provider: 'Microsoft.Storage',
      apiVersion: '2023-01-01',
      schemaId: 'test-schema',
      generatedAt: '2025-01-01T00:00:00Z',
    },
  };

  const mockResource: ResourceDefinition = {
    name: 'storageAccounts',
    armType: 'Microsoft.Storage/storageAccounts',
    description: 'Storage account resource',
    properties: [
      {
        name: 'name',
        type: { kind: 'primitive', tsType: 'string' },
        description: 'Storage account name',
        required: true,
        constraints: {
          minLength: 3,
          maxLength: 24,
          pattern: '^[a-z0-9]+$',
        },
      },
      {
        name: 'location',
        type: { kind: 'primitive', tsType: 'string' },
        description: 'Resource location',
        required: true,
      },
      {
        name: 'tags',
        type: { kind: 'primitive', tsType: 'Record<string, string>' },
        description: 'Resource tags',
        required: false,
      },
      {
        name: 'sku',
        type: { kind: 'reference', tsType: 'Sku', refName: 'Sku' },
        description: 'SKU configuration',
        required: true,
      },
    ],
    required: ['name', 'location', 'sku'],
  };

  describe('generateResource', () => {
    it('should generate a complete L1 construct class', () => {
      const code = factory.generateResource(mockResource, mockIR);

      // Check imports
      expect(code).toContain("import { Construct } from '../../core/construct';");
      expect(code).toContain("import { Resource } from '../../core/resource';");
      expect(code).toContain("import type { ArmStorageAccountsProps } from './types';");

      // Check class declaration
      expect(code).toContain('export class ArmStorageAccounts extends Resource {');
    });

    it('should include ARM resource type and API version constants', () => {
      const code = factory.generateResource(mockResource, mockIR);

      expect(code).toContain(
        "public readonly resourceType: string = 'Microsoft.Storage/storageAccounts';"
      );
      expect(code).toContain(
        "public readonly apiVersion: string = '2023-01-01';"
      );
    });

    it('should generate properties with correct types', () => {
      const code = factory.generateResource(mockResource, mockIR);

      expect(code).toContain('public readonly name: string;');
      expect(code).toContain('public readonly location: string;');
      expect(code).toContain('public readonly tags?: Record<string, string>;');
      expect(code).toContain('public readonly sku: Sku;');
    });

    it('should generate constructor with property assignments', () => {
      const code = factory.generateResource(mockResource, mockIR);

      expect(code).toContain('constructor(scope: Construct, id: string, props: ArmStorageAccountsProps)');
      expect(code).toContain('this.validateProps(props);');
      expect(code).toContain('this.name = props.name;');
      expect(code).toContain('this.location = props.location;');
    });

    it('should generate validation method with constraint checks', () => {
      const code = factory.generateResource(mockResource, mockIR);

      // Required validation
      expect(code).toContain("if (!props.name)");
      expect(code).toContain("throw new Error('name is required')");

      // Length validation
      expect(code).toContain('if (props.name.length < 3)');
      expect(code).toContain('if (props.name.length > 24)');

      // Pattern validation
      expect(code).toContain('const pattern = /^[a-z0-9]+$/;');
      expect(code).toContain('if (!pattern.test(props.name))');
    });

    it('should generate toArmTemplate method', () => {
      const code = factory.generateResource(mockResource, mockIR);

      expect(code).toContain('public toArmTemplate(): object {');
      expect(code).toContain('type: this.resourceType');
      expect(code).toContain('apiVersion: this.apiVersion');
      expect(code).toContain('name: this.name');
      expect(code).toContain('location: this.location');
    });

    it('should include proper JSDoc documentation', () => {
      const code = factory.generateResource(mockResource, mockIR);

      expect(code).toContain('/**');
      expect(code).toContain(' * L1 construct for Microsoft.Storage/storageAccounts.');
      expect(code).toContain(' * **ARM Resource Type**: `Microsoft.Storage/storageAccounts`');
      expect(code).toContain(' * **API Version**: `2023-01-01`');
    });

    it('should handle optional properties correctly', () => {
      const code = factory.generateResource(mockResource, mockIR);

      // Optional property should have ? in declaration
      expect(code).toContain('public readonly tags?: Record<string, string>;');

      // Optional property should be conditionally added in toArmTemplate
      expect(code).toContain('if (this.tags !== undefined)');
    });
  });

  describe('edge cases', () => {
    it('should handle resources with no constraints', () => {
      const simpleResource: ResourceDefinition = {
        name: 'simpleResource',
        armType: 'Microsoft.Test/simpleResources',
        properties: [
          {
            name: 'name',
            type: { kind: 'primitive', tsType: 'string' },
            required: true,
          },
        ],
        required: ['name'],
      };

      const code = factory.generateResource(simpleResource, mockIR);

      expect(code).toContain('export class ArmSimpleResource extends Resource');
      expect(code).toContain('private validateProps');
    });

    it('should handle resources with complex nested properties', () => {
      const complexResource: ResourceDefinition = {
        name: 'complexResource',
        armType: 'Microsoft.Test/complexResources',
        properties: [
          {
            name: 'name',
            type: { kind: 'primitive', tsType: 'string' },
            required: true,
          },
          {
            name: 'config',
            type: {
              kind: 'object',
              tsType: 'object',
              properties: [
                {
                  name: 'enabled',
                  type: { kind: 'primitive', tsType: 'boolean' },
                  required: false,
                },
              ],
            },
            required: false,
          },
        ],
        required: ['name'],
      };

      const code = factory.generateResource(complexResource, mockIR);

      expect(code).toBeDefined();
      expect(code.length).toBeGreaterThan(0);
    });
  });
});
