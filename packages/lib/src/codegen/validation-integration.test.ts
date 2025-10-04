/**
 * Integration tests for validation generation.
 */

import * as path from 'path';
import { SchemaParser } from './schema-parser';
import { ValidationGenerator } from './validation-generator';

describe('Validation Integration', () => {
  it('should generate complete validation code', () => {
    const schemaPath = path.join(
      __dirname,
      '../../../../../azure-resource-manager-schemas-main/schemas/2024-07-01/Microsoft.Network.NRP.json'
    );

    const parser = new SchemaParser();
    const ir = parser.parse(schemaPath);

    const generator = new ValidationGenerator();
    const code = generator.generate(ir);

    // Verify structure
    expect(code).toContain('export interface ValidationError');
    expect(code).toContain('export interface ValidationResult');
    expect(code).toContain('export function validate');

    // Verify it has validation logic
    expect(code).toContain('REQUIRED_PROPERTY_MISSING');
    expect(code).toContain('errors.push');
    expect(code).toContain('return {');
    expect(code).toContain('valid: errors.length === 0');
  });

  it('should validate required properties correctly', () => {
    const schemaPath = path.join(
      __dirname,
      '../../../../../azure-resource-manager-schemas-main/schemas/2024-07-01/Microsoft.Network.NRP.json'
    );

    const parser = new SchemaParser();
    const ir = parser.parse(schemaPath);

    const generator = new ValidationGenerator();
    const code = generator.generate(ir);

    // Check that required validation exists
    expect(code).toMatch(/if \(props\.\w+ === undefined \|\| props\.\w+ === null\)/);
    expect(code).toContain('Required property');
  });

  it('should validate constraints correctly', () => {
    const schemaPath = path.join(
      __dirname,
      '../../../../../azure-resource-manager-schemas-main/schemas/2024-07-01/Microsoft.Network.NRP.json'
    );

    const parser = new SchemaParser();
    const ir = parser.parse(schemaPath);

    const generator = new ValidationGenerator();
    const code = generator.generate(ir);

    // Should have various constraint validations
    const hasLengthValidation = code.includes('.length >') || code.includes('.length <');
    const hasPatternValidation = code.includes('RegExp') || code.includes('.test(');
    const hasEnumValidation = code.includes('allowedValues');

    // At least one type of validation should be present
    expect(hasLengthValidation || hasPatternValidation || hasEnumValidation).toBe(true);
  });

  it('should include helpful error messages', () => {
    const schemaPath = path.join(
      __dirname,
      '../../../../../azure-resource-manager-schemas-main/schemas/2024-07-01/Microsoft.Network.NRP.json'
    );

    const parser = new SchemaParser();
    const ir = parser.parse(schemaPath);

    const generator = new ValidationGenerator();
    const code = generator.generate(ir);

    // All errors should have these fields
    expect(code).toContain('path:');
    expect(code).toContain('message:');
    expect(code).toContain('code:');
    expect(code).toContain('fix:');
  });

  it('should generate validators for all resources', () => {
    const schemaPath = path.join(
      __dirname,
      '../../../../../azure-resource-manager-schemas-main/schemas/2024-07-01/Microsoft.Network.NRP.json'
    );

    const parser = new SchemaParser();
    const ir = parser.parse(schemaPath);

    const generator = new ValidationGenerator();
    const code = generator.generate(ir);

    // Should have multiple validators
    const functionCount = (code.match(/export function validate/g) || []).length;
    expect(functionCount).toBeGreaterThan(10); // Network has 100+ resources
  });
});
