/**
 * Tests for Validation Generator.
 */

import * as path from 'path';
import { SchemaParser } from './schema-parser';
import { ValidationGenerator } from './validation-generator';

describe('ValidationGenerator', () => {
  let parser: SchemaParser;
  let generator: ValidationGenerator;

  beforeEach(() => {
    parser = new SchemaParser();
    generator = new ValidationGenerator();
  });

  describe('generate', () => {
    it('should generate validation code', () => {
      const schemaPath = path.join(
        __dirname,
        '../../../../../azure-resource-manager-schemas-main/schemas/2024-07-01/Microsoft.Network.NRP.json'
      );

      const ir = parser.parse(schemaPath);
      const code = generator.generate(ir);

      // Should have file header
      expect(code).toContain('Runtime validators for Microsoft.Network');
      expect(code).toContain('2024-07-01');

      // Should export validation functions
      expect(code).toContain('export function validate');

      // Should have ValidationResult interface
      expect(code).toContain('interface ValidationResult');
      expect(code).toContain('interface ValidationError');

      expect(code.length).toBeGreaterThan(1000);
    });

    it('should generate validators for resources', () => {
      const schemaPath = path.join(
        __dirname,
        '../../../../../azure-resource-manager-schemas-main/schemas/2024-07-01/Microsoft.Network.NRP.json'
      );

      const ir = parser.parse(schemaPath);
      const code = generator.generate(ir);

      // Should have validator for VirtualNetworks
      expect(code).toContain('export function validateVirtualNetworks');
      expect(code).toContain('ValidationResult');
    });

    it('should validate required properties', () => {
      const schemaPath = path.join(
        __dirname,
        '../../../../../azure-resource-manager-schemas-main/schemas/2024-07-01/Microsoft.Network.NRP.json'
      );

      const ir = parser.parse(schemaPath);
      const code = generator.generate(ir);

      // Should check for required properties
      expect(code).toContain('REQUIRED_PROPERTY_MISSING');
      expect(code).toContain('Required property');
    });

    it('should validate string length constraints', () => {
      const schemaPath = path.join(
        __dirname,
        '../../../../../azure-resource-manager-schemas-main/schemas/2024-07-01/Microsoft.Network.NRP.json'
      );

      const ir = parser.parse(schemaPath);
      const code = generator.generate(ir);

      // Should have length validation code
      if (code.includes('.length')) {
        expect(code).toMatch(/STRING_TOO_SHORT|STRING_TOO_LONG/);
      }
    });

    it('should validate numeric range constraints', () => {
      const schemaPath = path.join(
        __dirname,
        '../../../../../azure-resource-manager-schemas-main/schemas/2024-07-01/Microsoft.Network.NRP.json'
      );

      const ir = parser.parse(schemaPath);
      const code = generator.generate(ir);

      // Should have numeric validation if there are numeric constraints
      if (code.includes('typeof') && code.includes('number')) {
        expect(code).toMatch(/VALUE_TOO_SMALL|VALUE_TOO_LARGE/);
      }
    });

    it('should validate pattern constraints', () => {
      const schemaPath = path.join(
        __dirname,
        '../../../../../azure-resource-manager-schemas-main/schemas/2024-07-01/Microsoft.Network.NRP.json'
      );

      const ir = parser.parse(schemaPath);
      const code = generator.generate(ir);

      // Should have pattern validation if there are patterns
      if (code.includes('RegExp')) {
        expect(code).toContain('PATTERN_MISMATCH');
        expect(code).toContain('.test(');
      }
    });

    it('should validate enum constraints', () => {
      const schemaPath = path.join(
        __dirname,
        '../../../../../azure-resource-manager-schemas-main/schemas/2024-07-01/Microsoft.Network.NRP.json'
      );

      const ir = parser.parse(schemaPath);
      const code = generator.generate(ir);

      // Should have enum validation if there are enums
      if (code.includes('allowedValues')) {
        expect(code).toContain('INVALID_ENUM_VALUE');
        expect(code).toContain('.includes(');
      }
    });

    it('should provide helpful error messages', () => {
      const schemaPath = path.join(
        __dirname,
        '../../../../../azure-resource-manager-schemas-main/schemas/2024-07-01/Microsoft.Network.NRP.json'
      );

      const ir = parser.parse(schemaPath);
      const code = generator.generate(ir);

      // Should have error messages and fixes
      expect(code).toContain('message:');
      expect(code).toContain('code:');
      expect(code).toContain('fix:');
      expect(code).toContain('path:');
    });
  });

  describe('generated validators', () => {
    it('should be valid TypeScript', () => {
      const schemaPath = path.join(
        __dirname,
        '../../../../../azure-resource-manager-schemas-main/schemas/2024-07-01/Microsoft.Network.NRP.json'
      );

      const ir = parser.parse(schemaPath);
      const code = generator.generate(ir);

      // Basic syntax checks
      expect(code).toContain('export function');
      expect(code).toContain('return {');
      expect(code).toContain('};');

      // Should have proper structure
      const functionMatches = code.match(/export function \w+/g);
      expect(functionMatches).toBeDefined();
      expect(functionMatches!.length).toBeGreaterThan(0);
    });
  });
});
