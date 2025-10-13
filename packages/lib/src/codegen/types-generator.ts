/**
 * TypeScript types code generator for Atakora schemas.
 *
 * @remarks
 * Generates TypeScript interfaces, types, filter types, and input types
 * from Atakora schema definitions with JSDoc documentation.
 *
 * @packageDocumentation
 */

import type { SchemaDefinition } from '../schema/atakora/schema-types';
import { getFieldMetadata } from '../schema/atakora/field-types';

/**
 * Code generation options.
 */
export interface TypeGeneratorOptions {
  /**
   * Include JSDoc comments.
   */
  includeJsDoc?: boolean;

  /**
   * Generate filter types.
   */
  generateFilters?: boolean;

  /**
   * Generate input types for mutations.
   */
  generateInputs?: boolean;

  /**
   * Include relationship types.
   */
  includeRelationships?: boolean;

  /**
   * Include computed fields.
   */
  includeComputed?: boolean;

  /**
   * Target TypeScript version.
   */
  targetVersion?: 'es5' | 'es2015' | 'es2020' | 'esnext';

  /**
   * Use strict null checks.
   */
  strictNullChecks?: boolean;
}

/**
 * Generated code result.
 */
export interface GeneratedCode {
  /**
   * Generated TypeScript code.
   */
  code: string;

  /**
   * Import statements needed.
   */
  imports: string[];

  /**
   * Type names generated.
   */
  types: string[];
}

/**
 * TypeScript types generator.
 */
export class TypesGenerator {
  constructor(private options: TypeGeneratorOptions = {}) {
    // Set defaults
    this.options = {
      includeJsDoc: true,
      generateFilters: true,
      generateInputs: true,
      includeRelationships: true,
      includeComputed: true,
      targetVersion: 'es2020',
      strictNullChecks: true,
      ...options,
    };
  }

  /**
   * Generate TypeScript types for a schema.
   *
   * @param schema - Schema definition
   * @returns Generated code
   *
   * @example
   * ```typescript
   * const generator = new TypesGenerator();
   * const { code } = generator.generate(UserSchema);
   * console.log(code);
   * ```
   */
  generate(schema: SchemaDefinition<any>): GeneratedCode {
    const imports = new Set<string>();
    const types = new Set<string>();
    const lines: string[] = [];

    // Add file header
    lines.push(this.generateFileHeader(schema));
    lines.push('');

    // Generate main entity interface
    const entityType = this.generateEntityInterface(schema, imports);
    lines.push(entityType);
    lines.push('');
    types.add(schema.name);

    // Generate filter type
    if (this.options.generateFilters) {
      const filterType = this.generateFilterType(schema, imports);
      lines.push(filterType);
      lines.push('');
      types.add(`${schema.name}Filter`);
    }

    // Generate input types
    if (this.options.generateInputs) {
      const createInput = this.generateCreateInputType(schema, imports);
      lines.push(createInput);
      lines.push('');
      types.add(`Create${schema.name}Input`);

      const updateInput = this.generateUpdateInputType(schema, imports);
      lines.push(updateInput);
      lines.push('');
      types.add(`Update${schema.name}Input`);
    }

    // Generate sort enum
    const sortEnum = this.generateSortEnum(schema);
    lines.push(sortEnum);
    lines.push('');
    types.add(`${schema.name}SortField`);

    return {
      code: lines.join('\n'),
      imports: Array.from(imports),
      types: Array.from(types),
    };
  }

  /**
   * Generate types for multiple schemas.
   *
   * @param schemas - Schema definitions
   * @returns Generated code
   *
   * @example
   * ```typescript
   * const generator = new TypesGenerator();
   * const { code } = generator.generateMany([UserSchema, PostSchema, CommentSchema]);
   * ```
   */
  generateMany(schemas: SchemaDefinition<any>[]): GeneratedCode {
    const allImports = new Set<string>();
    const allTypes = new Set<string>();
    const lines: string[] = [];

    // Add file header
    lines.push('/**');
    lines.push(' * Auto-generated TypeScript types for Atakora schemas.');
    lines.push(' *');
    lines.push(' * DO NOT EDIT MANUALLY - This file is generated.');
    lines.push(' */');
    lines.push('');

    // Generate each schema
    for (const schema of schemas) {
      const result = this.generate(schema);
      lines.push(result.code);
      lines.push('');

      result.imports.forEach(imp => allImports.add(imp));
      result.types.forEach(type => allTypes.add(type));
    }

    return {
      code: lines.join('\n'),
      imports: Array.from(allImports),
      types: Array.from(allTypes),
    };
  }

  /**
   * Generate file header with documentation.
   */
  private generateFileHeader(schema: SchemaDefinition<any>): string {
    const lines: string[] = [];

    if (this.options.includeJsDoc) {
      lines.push('/**');
      lines.push(` * Auto-generated types for ${schema.name} schema.`);
      lines.push(' *');

      if (schema.metadata?.description) {
        lines.push(` * ${schema.metadata.description}`);
        lines.push(' *');
      }

      lines.push(' * DO NOT EDIT MANUALLY - This file is generated.');
      lines.push(' */');
    }

    return lines.join('\n');
  }

  /**
   * Generate main entity interface.
   */
  private generateEntityInterface(schema: SchemaDefinition<any>, imports: Set<string>): string {
    const lines: string[] = [];

    // Add JSDoc
    if (this.options.includeJsDoc) {
      lines.push('/**');
      lines.push(` * ${schema.metadata?.displayName || schema.name} entity.`);

      if (schema.metadata?.description) {
        lines.push(' *');
        lines.push(` * ${schema.metadata.description}`);
      }

      lines.push(' */');
    }

    lines.push(`export interface ${schema.name} {`);

    // Add fields
    const shape = schema.fields.shape;
    for (const [fieldName, fieldSchema] of Object.entries(shape)) {
      const metadata = getFieldMetadata(fieldSchema as any);

      // Add field JSDoc
      if (this.options.includeJsDoc && metadata) {
        lines.push('  /**');
        if (metadata.label) {
          lines.push(`   * ${metadata.label}`);
        }
        if (metadata.helpText) {
          lines.push(`   * ${metadata.helpText}`);
        }
        lines.push('   */');
      }

      const fieldType = this.zodTypeToTypeScript(fieldSchema);
      const optional = this.isOptionalField(fieldSchema) ? '?' : '';
      lines.push(`  ${fieldName}${optional}: ${fieldType};`);
    }

    // Add relationships
    if (this.options.includeRelationships && schema.relationships) {
      lines.push('');
      lines.push('  // Relationships');

      for (const [relName, rel] of Object.entries(schema.relationships)) {
        const relType = this.getRelationshipType(rel);
        lines.push(`  ${relName}?: ${relType};`);
      }
    }

    // Add computed fields
    if (this.options.includeComputed && schema.computed) {
      lines.push('');
      lines.push('  // Computed fields');

      for (const [fieldName, computed] of Object.entries(schema.computed)) {
        const fieldType = this.computedTypeToTypeScript(computed.type);
        if (this.options.includeJsDoc && computed.description) {
          lines.push('  /**');
          lines.push(`   * ${computed.description}`);
          lines.push('   */');
        }
        lines.push(`  ${fieldName}?: ${fieldType};`);
      }
    }

    lines.push('}');

    return lines.join('\n');
  }

  /**
   * Generate filter type.
   */
  private generateFilterType(schema: SchemaDefinition<any>, imports: Set<string>): string {
    const lines: string[] = [];

    if (this.options.includeJsDoc) {
      lines.push('/**');
      lines.push(` * Filter options for ${schema.name} queries.`);
      lines.push(' */');
    }

    lines.push(`export interface ${schema.name}Filter {`);

    const shape = schema.fields.shape;
    for (const [fieldName, fieldSchema] of Object.entries(shape)) {
      const fieldType = this.zodTypeToTypeScript(fieldSchema);
      const filterType = this.getFilterTypeForField(fieldType);
      lines.push(`  ${fieldName}?: ${filterType};`);
    }

    lines.push('');
    lines.push('  // Logical operators');
    lines.push(`  AND?: ${schema.name}Filter[];`);
    lines.push(`  OR?: ${schema.name}Filter[];`);
    lines.push(`  NOT?: ${schema.name}Filter;`);

    lines.push('}');

    return lines.join('\n');
  }

  /**
   * Generate create input type.
   */
  private generateCreateInputType(schema: SchemaDefinition<any>, imports: Set<string>): string {
    const lines: string[] = [];

    if (this.options.includeJsDoc) {
      lines.push('/**');
      lines.push(` * Input type for creating a ${schema.name}.`);
      lines.push(' */');
    }

    lines.push(`export interface Create${schema.name}Input {`);

    const shape = schema.fields.shape;
    for (const [fieldName, fieldSchema] of Object.entries(shape)) {
      const metadata = getFieldMetadata(fieldSchema as any);

      // Skip auto-generated fields
      if (metadata?.autoGenerate || metadata?.readonly) {
        continue;
      }

      const fieldType = this.zodTypeToTypeScript(fieldSchema);
      const optional = this.isOptionalField(fieldSchema) ? '?' : '';
      lines.push(`  ${fieldName}${optional}: ${fieldType};`);
    }

    lines.push('}');

    return lines.join('\n');
  }

  /**
   * Generate update input type.
   */
  private generateUpdateInputType(schema: SchemaDefinition<any>, imports: Set<string>): string {
    const lines: string[] = [];

    if (this.options.includeJsDoc) {
      lines.push('/**');
      lines.push(` * Input type for updating a ${schema.name}.`);
      lines.push(' */');
    }

    lines.push(`export interface Update${schema.name}Input {`);

    const shape = schema.fields.shape;
    for (const [fieldName, fieldSchema] of Object.entries(shape)) {
      const metadata = getFieldMetadata(fieldSchema as any);

      // Skip auto-generated and readonly fields
      if (metadata?.autoGenerate || metadata?.autoUpdate || metadata?.readonly) {
        continue;
      }

      const fieldType = this.zodTypeToTypeScript(fieldSchema);
      lines.push(`  ${fieldName}?: ${fieldType};`);
    }

    lines.push('}');

    return lines.join('\n');
  }

  /**
   * Generate sort enum.
   */
  private generateSortEnum(schema: SchemaDefinition<any>): string {
    const lines: string[] = [];

    if (this.options.includeJsDoc) {
      lines.push('/**');
      lines.push(` * Sortable fields for ${schema.name}.`);
      lines.push(' */');
    }

    const shape = schema.fields.shape;
    const fields = Object.keys(shape);

    lines.push(`export type ${schema.name}SortField =`);
    fields.forEach((field, index) => {
      const suffix = index < fields.length - 1 ? ' |' : ';';
      lines.push(`  | '${field}'${suffix}`);
    });

    return lines.join('\n');
  }

  /**
   * Convert Zod type to TypeScript type.
   */
  private zodTypeToTypeScript(zodType: any): string {
    const typeName = zodType._def?.typeName;

    switch (typeName) {
      case 'ZodString':
        return 'string';
      case 'ZodNumber':
        return 'number';
      case 'ZodBoolean':
        return 'boolean';
      case 'ZodDate':
        return 'Date';
      case 'ZodArray':
        const innerType = this.zodTypeToTypeScript(zodType._def.type);
        return `${innerType}[]`;
      case 'ZodObject':
        return 'Record<string, any>'; // Could be more specific
      case 'ZodEnum':
        const values = zodType._def.values as string[];
        return values.map(v => `'${v}'`).join(' | ');
      case 'ZodOptional':
        return this.zodTypeToTypeScript(zodType._def.innerType);
      case 'ZodNullable':
        return `${this.zodTypeToTypeScript(zodType._def.innerType)} | null`;
      case 'ZodDefault':
        return this.zodTypeToTypeScript(zodType._def.innerType);
      default:
        return 'any';
    }
  }

  /**
   * Check if a field is optional.
   */
  private isOptionalField(zodType: any): boolean {
    const typeName = zodType._def?.typeName;
    return typeName === 'ZodOptional' || typeName === 'ZodNullable';
  }

  /**
   * Get filter type for a field type.
   */
  private getFilterTypeForField(fieldType: string): string {
    if (fieldType === 'string') {
      return '{ equals?: string; contains?: string; startsWith?: string; endsWith?: string; in?: string[]; notIn?: string[] }';
    } else if (fieldType === 'number') {
      return '{ equals?: number; gt?: number; gte?: number; lt?: number; lte?: number; in?: number[]; notIn?: number[] }';
    } else if (fieldType === 'boolean') {
      return '{ equals?: boolean }';
    } else if (fieldType === 'Date') {
      return '{ equals?: Date; gt?: Date; gte?: Date; lt?: Date; lte?: Date }';
    } else {
      return `{ equals?: ${fieldType}; in?: ${fieldType}[]; notIn?: ${fieldType}[] }`;
    }
  }

  /**
   * Get TypeScript type for relationship.
   */
  private getRelationshipType(relationship: any): string {
    const targetName = relationship.target || relationship.targets?.[0] || 'any';

    switch (relationship.type) {
      case 'hasOne':
      case 'belongsTo':
        return targetName;
      case 'hasMany':
      case 'manyToMany':
        return `${targetName}[]`;
      case 'polymorphic':
        const targets = relationship.targets || [];
        return targets.join(' | ') || 'any';
      default:
        return 'any';
    }
  }

  /**
   * Convert computed field type to TypeScript.
   */
  private computedTypeToTypeScript(type: string): string {
    switch (type) {
      case 'string':
        return 'string';
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'date':
        return 'Date';
      case 'array':
        return 'any[]';
      case 'object':
        return 'Record<string, any>';
      default:
        return 'any';
    }
  }
}

/**
 * Generate TypeScript types for a schema.
 *
 * @param schema - Schema definition
 * @param options - Generator options
 * @returns Generated code
 *
 * @example
 * ```typescript
 * const { code } = generateTypes(UserSchema, {
 *   includeJsDoc: true,
 *   generateFilters: true,
 *   generateInputs: true
 * });
 *
 * console.log(code);
 * ```
 */
export function generateTypes(
  schema: SchemaDefinition<any>,
  options?: TypeGeneratorOptions
): GeneratedCode {
  const generator = new TypesGenerator(options);
  return generator.generate(schema);
}

/**
 * Generate TypeScript types for multiple schemas.
 *
 * @param schemas - Schema definitions
 * @param options - Generator options
 * @returns Generated code
 *
 * @example
 * ```typescript
 * const { code } = generateManyTypes([UserSchema, PostSchema, CommentSchema]);
 * await fs.writeFile('generated-types.ts', code);
 * ```
 */
export function generateManyTypes(
  schemas: SchemaDefinition<any>[],
  options?: TypeGeneratorOptions
): GeneratedCode {
  const generator = new TypesGenerator(options);
  return generator.generateMany(schemas);
}
