/**
 * Tests for TypeScript Type Generator.
 */

import * as path from 'path';
import { SchemaParser } from './schema-parser';
import { TypeGenerator } from './type-generator';

describe('TypeGenerator', () => {
  let parser: SchemaParser;
  let generator: TypeGenerator;

  beforeEach(() => {
    parser = new SchemaParser();
    generator = new TypeGenerator();
  });

  describe('generate', () => {
    it('should generate valid TypeScript code', () => {
      const schemaPath = path.join(
        __dirname,
        '../../../../../azure-resource-manager-schemas-main/schemas/2024-07-01/Microsoft.Network.NRP.json'
      );

      const ir = parser.parse(schemaPath);
      const code = generator.generate(ir);

      // Should have file header
      expect(code).toContain('Type definitions for Microsoft.Network');
      expect(code).toContain('API Version');
      expect(code).toContain('2024-07-01');

      // Should generate export statements
      expect(code).toContain('export interface');

      // Should not be empty
      expect(code.length).toBeGreaterThan(1000);
    });

    it('should generate resource props interfaces', () => {
      const schemaPath = path.join(
        __dirname,
        '../../../../../azure-resource-manager-schemas-main/schemas/2024-07-01/Microsoft.Network.NRP.json'
      );

      const ir = parser.parse(schemaPath);
      const code = generator.generate(ir);

      // Should generate VirtualNetworks props interface
      expect(code).toContain('export interface ArmVirtualNetworksProps');

      // Should have ARM resource type comment
      expect(code).toContain('Microsoft.Network/virtualNetworks');
    });

    it('should generate property documentation', () => {
      const schemaPath = path.join(
        __dirname,
        '../../../../../azure-resource-manager-schemas-main/schemas/2024-07-01/Microsoft.Network.NRP.json'
      );

      const ir = parser.parse(schemaPath);
      const code = generator.generate(ir);

      // Should have JSDoc comments
      expect(code).toContain('/**');
      expect(code).toContain(' * ');
      expect(code).toContain(' */');
    });

    it('should handle constraints in documentation', () => {
      const schemaPath = path.join(
        __dirname,
        '../../../../../azure-resource-manager-schemas-main/schemas/2024-07-01/Microsoft.Network.NRP.json'
      );

      const ir = parser.parse(schemaPath);
      const code = generator.generate(ir);

      // ApplicationGatewayWebApplicationFirewallPolicies has maxLength constraint on name
      if (code.includes('ApplicationGatewayWebApplicationFirewallPolicies')) {
        // Should document length constraint
        expect(code).toMatch(/Length:|maxLength|characters/i);
      }
    });

    it('should generate readonly properties', () => {
      const schemaPath = path.join(
        __dirname,
        '../../../../../azure-resource-manager-schemas-main/schemas/2024-07-01/Microsoft.Network.NRP.json'
      );

      const ir = parser.parse(schemaPath);
      const code = generator.generate(ir);

      // All properties should be readonly
      expect(code).toContain('readonly ');

      // Optional properties should have ?
      expect(code).toMatch(/readonly \w+\?:/);

      // Required properties should not have ?
      expect(code).toMatch(/readonly name:/);
    });

    it('should not include ARM metadata properties', () => {
      const schemaPath = path.join(
        __dirname,
        '../../../../../azure-resource-manager-schemas-main/schemas/2024-07-01/Microsoft.Network.NRP.json'
      );

      const ir = parser.parse(schemaPath);
      const code = generator.generate(ir);

      // Should not generate 'type' or 'apiVersion' properties
      // (these are handled by constructs automatically)
      const propsInterfaceMatch = code.match(/export interface Arm\w+Props \{([^}]+)\}/s);

      if (propsInterfaceMatch) {
        const propsBody = propsInterfaceMatch[1];
        expect(propsBody).not.toMatch(/readonly type:/);
        expect(propsBody).not.toMatch(/readonly apiVersion:/);
      }
    });
  });

  describe('type formatting', () => {
    it('should generate proper TypeScript types', () => {
      const schemaPath = path.join(
        __dirname,
        '../../../../../azure-resource-manager-schemas-main/schemas/2024-07-01/Microsoft.Network.NRP.json'
      );

      const ir = parser.parse(schemaPath);
      const code = generator.generate(ir);

      // Should have basic types
      expect(code).toMatch(/: string/);
      expect(code).toMatch(/: number|: boolean/);

      // Should have array types
      expect(code).toMatch(/: \w+\[\]/);

      // Should have Record types for objects
      expect(code).toMatch(/: Record<string, /);
    });
  });
});
