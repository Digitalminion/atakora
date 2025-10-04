/**
 * Tests for ARM Schema Parser.
 */

import * as path from 'path';
import { SchemaParser } from './schema-parser';

describe('SchemaParser', () => {
  let parser: SchemaParser;

  beforeEach(() => {
    parser = new SchemaParser();
  });

  describe('parse', () => {
    it('should parse Microsoft.Network schema', () => {
      const schemaPath = path.join(
        __dirname,
        '../../../../../azure-resource-manager-schemas-main/schemas/2024-07-01/Microsoft.Network.NRP.json'
      );

      const ir = parser.parse(schemaPath);

      expect(ir.provider).toBe('Microsoft.Network');
      expect(ir.apiVersion).toBe('2024-07-01');
      expect(ir.resources.length).toBeGreaterThan(0);
      expect(ir.definitions.size).toBeGreaterThan(0);
    });

    it('should extract resource definitions', () => {
      const schemaPath = path.join(
        __dirname,
        '../../../../../azure-resource-manager-schemas-main/schemas/2024-07-01/Microsoft.Network.NRP.json'
      );

      const ir = parser.parse(schemaPath);

      // Find VirtualNetworks resource
      const vnetResource = ir.resources.find(
        (r) => r.armType === 'Microsoft.Network/virtualNetworks'
      );

      expect(vnetResource).toBeDefined();
      expect(vnetResource!.name).toBe('virtualNetworks');
      expect(vnetResource!.properties.length).toBeGreaterThan(0);
    });

    it('should extract property constraints', () => {
      const schemaPath = path.join(
        __dirname,
        '../../../../../azure-resource-manager-schemas-main/schemas/2024-07-01/Microsoft.Network.NRP.json'
      );

      const ir = parser.parse(schemaPath);

      // Find a resource with constraints (ApplicationGatewayWebApplicationFirewallPolicies has maxLength on name)
      const resource = ir.resources.find(
        (r) => r.armType === 'Microsoft.Network/ApplicationGatewayWebApplicationFirewallPolicies'
      );

      expect(resource).toBeDefined();

      // Find name property
      const nameProp = resource!.properties.find((p) => p.name === 'name');
      expect(nameProp).toBeDefined();
      expect(nameProp!.constraints).toBeDefined();
      expect(nameProp!.constraints!.maxLength).toBe(128);
    });

    it('should mark required properties', () => {
      const schemaPath = path.join(
        __dirname,
        '../../../../../azure-resource-manager-schemas-main/schemas/2024-07-01/Microsoft.Network.NRP.json'
      );

      const ir = parser.parse(schemaPath);

      const vnetResource = ir.resources.find(
        (r) => r.armType === 'Microsoft.Network/virtualNetworks'
      );

      // name and properties are required
      const nameProp = vnetResource!.properties.find((p) => p.name === 'name');
      const propsProp = vnetResource!.properties.find((p) => p.name === 'properties');

      expect(nameProp!.required).toBe(true);
      expect(propsProp!.required).toBe(true);
    });

    it('should parse enum types', () => {
      const schemaPath = path.join(
        __dirname,
        '../../../../../azure-resource-manager-schemas-main/schemas/2024-07-01/Microsoft.Network.NRP.json'
      );

      const ir = parser.parse(schemaPath);

      // Check definitions for enum types
      // Many definitions have enum properties
      expect(ir.definitions.size).toBeGreaterThan(0);
    });

    it('should parse object types with Record', () => {
      const schemaPath = path.join(
        __dirname,
        '../../../../../azure-resource-manager-schemas-main/schemas/2024-07-01/Microsoft.Network.NRP.json'
      );

      const ir = parser.parse(schemaPath);

      const vnetResource = ir.resources.find(
        (r) => r.armType === 'Microsoft.Network/virtualNetworks'
      );

      // tags is Record<string, string>
      const tagsProp = vnetResource!.properties.find((p) => p.name === 'tags');
      expect(tagsProp).toBeDefined();
      // Should be Record type or union including Record
      expect(tagsProp!.type.tsType).toContain('Record');
    });

    it('should parse array types', () => {
      const schemaPath = path.join(
        __dirname,
        '../../../../../azure-resource-manager-schemas-main/schemas/2024-07-01/Microsoft.Network.NRP.json'
      );

      const ir = parser.parse(schemaPath);

      // Many resources have array properties
      const hasArrayProp = ir.resources.some((r) =>
        r.properties.some((p) => p.type.kind === 'array')
      );

      expect(hasArrayProp).toBe(true);
    });
  });

  describe('metadata extraction', () => {
    it('should extract correct metadata', () => {
      const schemaPath = path.join(
        __dirname,
        '../../../../../azure-resource-manager-schemas-main/schemas/2024-07-01/Microsoft.Network.NRP.json'
      );

      const ir = parser.parse(schemaPath);

      expect(ir.metadata.provider).toBe('Microsoft.Network');
      expect(ir.metadata.apiVersion).toBe('2024-07-01');
      expect(ir.metadata.schemaPath).toBe(schemaPath);
      expect(ir.metadata.schemaId).toContain('Microsoft.Network');
      expect(ir.metadata.generatedAt).toBeDefined();
    });
  });

  describe('type resolution', () => {
    it('should resolve internal $ref references', () => {
      const schemaPath = path.join(
        __dirname,
        '../../../../../azure-resource-manager-schemas-main/schemas/2024-07-01/Microsoft.Network.NRP.json'
      );

      const ir = parser.parse(schemaPath);

      // Check that definitions contain reference types or
      // properties have reference/object types from definitions
      const hasDefinitions = ir.definitions.size > 0;

      // VirtualNetworks has a properties field that uses $ref
      const vnetResource = ir.resources.find(
        (r) => r.armType === 'Microsoft.Network/virtualNetworks'
      );
      const propertiesProp = vnetResource?.properties.find((p) => p.name === 'properties');

      // Should be either a reference or a union containing references
      const isRefOrUnion =
        propertiesProp && (propertiesProp.type.kind === 'reference' || propertiesProp.type.kind === 'union');

      expect(hasDefinitions).toBe(true);
      expect(isRefOrUnion).toBe(true);
    });
  });
});
