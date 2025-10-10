/**
 * TypeScript type generator from OpenAPI schemas.
 *
 * Generates type-safe TypeScript interfaces from OpenAPI 3.0/3.1 schemas with:
 * - Readonly properties for immutability
 * - Discriminated unions for oneOf
 * - Type intersections for allOf
 * - Union types for anyOf
 * - Comprehensive TSDoc with constraints
 * - Circular reference handling
 */

import {
  JsonSchema,
  OpenApiDefinition,
  TypeGeneratorOptions,
  GeneratedTypes,
  TypeDefinition,
  AzureMsEnum,
} from './types';
import { getReferenceName, isReference } from './reference-resolver';
import { extractConstraints } from './schema-validator';

/**
 * TypeScript type generator from OpenAPI schemas.
 *
 * Features:
 * - Generates readonly interfaces
 * - Handles complex types (allOf, anyOf, oneOf)
 * - Detects and handles circular types
 * - Adds comprehensive TSDoc with constraints
 * - Preserves OpenAPI metadata in comments
 * - Supports Azure x-ms-* extensions
 */
export class TypeGenerator {
  private readonly options: Required<TypeGeneratorOptions>;
  private readonly generatedTypes = new Map<string, TypeDefinition>();
  private readonly circularTypes = new Set<string>();
  private readonly typeStack: string[] = [];

  constructor(options: TypeGeneratorOptions = {}) {
    this.options = {
      output: options.output ?? '',
      readonly: options.readonly ?? true,
      strictNullChecks: options.strictNullChecks ?? true,
      exportType: options.exportType ?? true,
      includeConstraints: options.includeConstraints ?? true,
      generateEnums: options.generateEnums ?? true,
      typePrefix: options.typePrefix ?? '',
      typeSuffix: options.typeSuffix ?? '',
      typeMappings: options.typeMappings ?? {},
    };
  }

  /**
   * Generate TypeScript types from OpenAPI specification.
   *
   * @param spec - OpenAPI specification
   * @returns Generated types with metadata
   */
  generateTypes(spec: OpenApiDefinition): GeneratedTypes {
    this.generatedTypes.clear();
    this.circularTypes.clear();
    this.typeStack.length = 0;

    const warnings: string[] = [];

    // Generate types from components/schemas
    if (spec.components?.schemas) {
      for (const [name, schema] of Object.entries(spec.components.schemas)) {
        if (isReference(schema)) {
          warnings.push(`Skipping reference in schemas: ${name}`);
          continue;
        }

        try {
          // Narrow type - we already checked it's not a reference
          this.generateType(name, schema as JsonSchema);
        } catch (error) {
          warnings.push(
            `Failed to generate type for ${name}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    }

    // Sort types by dependencies (topological sort)
    const sortedTypes = this.topologicalSort();

    // Generate complete code
    const code = this.generateCode(sortedTypes);

    return {
      types: sortedTypes,
      code,
      metadata: {
        totalTypes: sortedTypes.length,
        circularTypes: Array.from(this.circularTypes),
        warnings,
      },
    };
  }

  /**
   * Generate a TypeScript type from a JSON schema.
   *
   * @param name - Type name
   * @param schema - JSON schema
   * @returns Type definition
   */
  generateType(name: string, schema: JsonSchema): TypeDefinition {
    const typeName = this.formatTypeName(name);

    // Check if already generated
    if (this.generatedTypes.has(typeName)) {
      return this.generatedTypes.get(typeName)!;
    }

    // Check for circular reference
    if (this.typeStack.includes(typeName)) {
      this.circularTypes.add(typeName);
      // Return placeholder for circular reference
      return {
        name: typeName,
        code: '',
        dependencies: [],
        isCircular: true,
      };
    }

    this.typeStack.push(typeName);

    try {
      const typeDef = this.schemaToType(schema, typeName);
      this.generatedTypes.set(typeName, typeDef);
      return typeDef;
    } finally {
      this.typeStack.pop();
    }
  }

  /**
   * Convert a JSON schema to TypeScript type definition.
   *
   * @param schema - JSON schema
   * @param name - Type name
   * @returns Type definition
   */
  schemaToType(schema: JsonSchema, name: string): TypeDefinition {
    const dependencies: string[] = [];
    const isCircular = this.circularTypes.has(name);

    // Handle composition schemas
    if (schema.allOf) {
      return this.handleAllOf(schema, name);
    }
    if (schema.oneOf) {
      return this.handleOneOf(schema, name);
    }
    if (schema.anyOf) {
      return this.handleAnyOf(schema, name);
    }

    // Handle type
    let typeCode: string;
    const schemaType = schema.type;

    if (Array.isArray(schemaType)) {
      // Union type for multiple types (OpenAPI 3.1)
      typeCode = schemaType.map((t) => this.primitiveTypeToTS(t)).join(' | ');
    } else if (schemaType === 'object' || schema.properties) {
      // Object type
      const { code, deps } = this.generateInterface(schema, name);
      typeCode = code;
      dependencies.push(...deps);
    } else if (schemaType === 'array') {
      // Array type
      const itemType = this.getArrayItemType(schema);
      // schema.items can be a single schema or array of schemas
      if (schema.items) {
        if (Array.isArray(schema.items)) {
          for (const item of schema.items) {
            dependencies.push(...this.extractDependencies(item as JsonSchema));
          }
        } else {
          dependencies.push(...this.extractDependencies(schema.items as JsonSchema));
        }
      }
      typeCode = this.options.readonly ? `readonly ${itemType}[]` : `${itemType}[]`;
    } else if (schema.enum) {
      // Enum type
      typeCode = this.generateEnum(schema, name);
    } else if (schemaType) {
      // Primitive type
      // schemaType could be a single type or array of types
      if (Array.isArray(schemaType)) {
        typeCode = schemaType.map((t) => this.primitiveTypeToTS(t as string)).join(' | ');
      } else {
        typeCode = this.primitiveTypeToTS(schemaType as string);
      }
    } else {
      // Unknown type
      typeCode = 'unknown';
    }

    // Handle nullable (OpenAPI 3.0)
    if (schema.nullable && this.options.strictNullChecks) {
      typeCode = `${typeCode} | null`;
    }

    // Generate documentation
    const documentation = this.generateDocumentation(schema, name);

    // Generate full type alias or interface
    const exportKeyword = this.options.exportType ? 'export ' : '';
    const code =
      typeCode.includes('{') || typeCode.includes('interface')
        ? typeCode
        : `${documentation}${exportKeyword}type ${name} = ${typeCode};`;

    return {
      name,
      code,
      dependencies,
      isCircular,
      documentation,
    };
  }

  /**
   * Generate TypeScript interface from object schema.
   */
  private generateInterface(
    schema: JsonSchema,
    name: string
  ): { code: string; deps: string[] } {
    const dependencies: string[] = [];
    const properties: string[] = [];

    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        if (isReference(propSchema)) {
          const refName = getReferenceName(propSchema.$ref);
          dependencies.push(refName);
          continue;
        }

        const isRequired = schema.required?.includes(propName) ?? false;
        const optional = isRequired ? '' : '?';
        const readonly = this.options.readonly ? 'readonly ' : '';

        // Generate property type
        const propType = this.schemaToTypeString(propSchema);
        dependencies.push(...this.extractDependencies(propSchema));

        // Generate property documentation
        const propDoc = this.generatePropertyDocumentation(propSchema, propName);

        properties.push(`${propDoc}  ${readonly}${propName}${optional}: ${propType};`);
      }
    }

    // Handle additionalProperties
    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      const valueType = this.schemaToTypeString(schema.additionalProperties);
      dependencies.push(...this.extractDependencies(schema.additionalProperties));
      properties.push(
        `  ${this.options.readonly ? 'readonly ' : ''}[key: string]: ${valueType};`
      );
    }

    const documentation = this.generateDocumentation(schema, name);
    const exportKeyword = this.options.exportType ? 'export ' : '';
    const code = `${documentation}${exportKeyword}interface ${name} {\n${properties.join('\n')}\n}`;

    return { code, deps: dependencies };
  }

  /**
   * Handle allOf composition (intersection).
   */
  private handleAllOf(schema: JsonSchema, name: string): TypeDefinition {
    const dependencies: string[] = [];
    const baseTypes: string[] = [];
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];

    for (const subSchema of schema.allOf!) {
      if (isReference(subSchema)) {
        const refName = getReferenceName(subSchema.$ref);
        baseTypes.push(refName);
        dependencies.push(refName);
      } else if (subSchema.properties) {
        // Merge properties
        Object.assign(properties, subSchema.properties);
        if (subSchema.required) {
          required.push(...subSchema.required);
        }
      } else {
        // Inline type
        const inlineType = this.schemaToTypeString(subSchema);
        baseTypes.push(inlineType);
        dependencies.push(...this.extractDependencies(subSchema));
      }
    }

    // Generate as interface extending base types
    const documentation = this.generateDocumentation(schema, name);
    const exportKeyword = this.options.exportType ? 'export ' : '';

    if (Object.keys(properties).length > 0) {
      // Interface with extensions
      const extendsClause = baseTypes.length > 0 ? ` extends ${baseTypes.join(', ')}` : '';
      const propLines: string[] = [];

      for (const [propName, propSchema] of Object.entries(properties)) {
        const isRequired = required.includes(propName);
        const optional = isRequired ? '' : '?';
        const readonly = this.options.readonly ? 'readonly ' : '';
        const propType = this.schemaToTypeString(propSchema);
        const propDoc = this.generatePropertyDocumentation(propSchema, propName);

        propLines.push(`${propDoc}  ${readonly}${propName}${optional}: ${propType};`);
        dependencies.push(...this.extractDependencies(propSchema));
      }

      const code = `${documentation}${exportKeyword}interface ${name}${extendsClause} {\n${propLines.join('\n')}\n}`;
      return { name, code, dependencies, isCircular: false, documentation };
    } else {
      // Type alias for intersection
      const code = `${documentation}${exportKeyword}type ${name} = ${baseTypes.join(' & ')};`;
      return { name, code, dependencies, isCircular: false, documentation };
    }
  }

  /**
   * Handle oneOf composition (discriminated union).
   */
  private handleOneOf(schema: JsonSchema, name: string): TypeDefinition {
    const dependencies: string[] = [];
    const unionTypes: string[] = [];

    for (let i = 0; i < schema.oneOf!.length; i++) {
      const subSchema = schema.oneOf![i];

      if (isReference(subSchema)) {
        const refName = getReferenceName(subSchema.$ref);
        unionTypes.push(refName);
        dependencies.push(refName);
      } else {
        // Generate inline type
        const inlineName = `${name}Option${i + 1}`;
        const inlineType = this.generateType(inlineName, subSchema);
        unionTypes.push(inlineName);
        dependencies.push(inlineName);
      }
    }

    const documentation = this.generateDocumentation(schema, name);
    const exportKeyword = this.options.exportType ? 'export ' : '';
    const code = `${documentation}${exportKeyword}type ${name} = ${unionTypes.join(' | ')};`;

    return { name, code, dependencies, isCircular: false, documentation };
  }

  /**
   * Handle anyOf composition (union).
   */
  private handleAnyOf(schema: JsonSchema, name: string): TypeDefinition {
    const dependencies: string[] = [];
    const unionTypes: string[] = [];

    for (let i = 0; i < schema.anyOf!.length; i++) {
      const subSchema = schema.anyOf![i];

      if (isReference(subSchema)) {
        const refName = getReferenceName(subSchema.$ref);
        unionTypes.push(refName);
        dependencies.push(refName);
      } else {
        const inlineType = this.schemaToTypeString(subSchema);
        unionTypes.push(inlineType);
        dependencies.push(...this.extractDependencies(subSchema));
      }
    }

    const documentation = this.generateDocumentation(schema, name);
    const exportKeyword = this.options.exportType ? 'export ' : '';
    const code = `${documentation}${exportKeyword}type ${name} = ${unionTypes.join(' | ')};`;

    return { name, code, dependencies, isCircular: false, documentation };
  }

  /**
   * Generate enum type.
   */
  private generateEnum(schema: JsonSchema, name: string): string {
    if (!schema.enum) return 'unknown';

    // Check for x-ms-enum extension
    const msEnum = schema['x-ms-enum'] as AzureMsEnum | undefined;

    if (this.options.generateEnums && msEnum) {
      // Generate TypeScript enum
      const values: string[] = [];

      for (const enumValue of schema.enum) {
        const value = String(enumValue);
        const enumInfo = msEnum.values?.find((v) => v.value === value);
        const enumName = enumInfo?.name || this.toEnumMemberName(value);
        const description = enumInfo?.description;

        if (description) {
          values.push(`  /** ${description} */`);
        }
        values.push(`  ${enumName} = '${value}',`);
      }

      return `enum ${name} {\n${values.join('\n')}\n}`;
    } else {
      // Generate union type
      return schema.enum.map((v) => JSON.stringify(v)).join(' | ');
    }
  }

  /**
   * Convert schema to TypeScript type string.
   */
  private schemaToTypeString(schema: JsonSchema): string {
    if (isReference(schema)) {
      return getReferenceName(schema.$ref);
    }

    const schemaType = schema.type;

    if (Array.isArray(schemaType)) {
      return schemaType.map((t) => this.primitiveTypeToTS(t)).join(' | ');
    }

    if (schemaType === 'array') {
      const itemType = this.getArrayItemType(schema);
      return this.options.readonly ? `readonly ${itemType}[]` : `${itemType}[]`;
    }

    if (schemaType === 'object') {
      if (schema.properties) {
        // Inline object
        const props: string[] = [];
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
          const isRequired = schema.required?.includes(propName) ?? false;
          const optional = isRequired ? '' : '?';
          const readonly = this.options.readonly ? 'readonly ' : '';
          const propType = this.schemaToTypeString(propSchema);
          props.push(`${readonly}${propName}${optional}: ${propType}`);
        }
        return `{ ${props.join('; ')} }`;
      }
      return 'Record<string, unknown>';
    }

    if (schema.enum) {
      return schema.enum.map((v) => JSON.stringify(v)).join(' | ');
    }

    if (schemaType) {
      // schemaType could be a single type or array of types
      if (Array.isArray(schemaType)) {
        return schemaType.map((t) => this.primitiveTypeToTS(t as string)).join(' | ');
      }
      return this.primitiveTypeToTS(schemaType as string);
    }

    return 'unknown';
  }

  /**
   * Get array item type.
   */
  private getArrayItemType(schema: JsonSchema): string {
    if (!schema.items) return 'unknown';

    // schema.items can be a single schema or array of schemas (for tuple types)
    if (Array.isArray(schema.items)) {
      // Tuple type
      const types = schema.items.map((item) => this.schemaToTypeString(item as JsonSchema));
      return `[${types.join(', ')}]`;
    }

    // Single item type
    return this.schemaToTypeString(schema.items as JsonSchema);
  }

  /**
   * Map JSON Schema primitive type to TypeScript type.
   */
  private primitiveTypeToTS(type: string): string {
    const mapping = this.options.typeMappings[type];
    if (mapping) return mapping;

    switch (type) {
      case 'string':
        return 'string';
      case 'number':
      case 'integer':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'null':
        return 'null';
      case 'object':
        return 'Record<string, unknown>';
      case 'array':
        return 'unknown[]';
      default:
        return 'unknown';
    }
  }

  /**
   * Generate TSDoc documentation for a schema.
   */
  private generateDocumentation(schema: JsonSchema, name: string): string {
    if (!this.options.includeConstraints) {
      return schema.description ? `/**\n * ${schema.description}\n */\n` : '';
    }

    const lines: string[] = [];

    // Title or name
    lines.push(`/**`);
    if (schema.title) {
      lines.push(` * ${schema.title}`);
    } else {
      lines.push(` * ${name}`);
    }

    // Description
    if (schema.description) {
      lines.push(` *`);
      lines.push(` * ${schema.description}`);
    }

    // Constraints
    const constraints = extractConstraints(schema);
    if (Object.keys(constraints).length > 0) {
      lines.push(` *`);
      lines.push(` * Constraints:`);

      for (const [key, value] of Object.entries(constraints)) {
        lines.push(` * - ${key}: ${JSON.stringify(value)}`);
      }
    }

    // Example
    if (schema.examples && schema.examples.length > 0) {
      lines.push(` *`);
      lines.push(` * @example ${JSON.stringify(schema.examples[0])}`);
    }

    // Deprecated
    if (schema.deprecated) {
      lines.push(` *`);
      lines.push(` * @deprecated`);
    }

    lines.push(` */`);

    return lines.join('\n') + '\n';
  }

  /**
   * Generate property documentation.
   */
  private generatePropertyDocumentation(schema: JsonSchema, propName: string): string {
    if (!this.options.includeConstraints || !schema.description) {
      return '';
    }

    return `  /**\n   * ${schema.description}\n   */\n`;
  }

  /**
   * Extract dependencies from a schema.
   */
  private extractDependencies(schema: JsonSchema | undefined): string[] {
    if (!schema) return [];

    const deps: string[] = [];

    // Check if this is a reference first
    if (isReference(schema)) {
      deps.push(getReferenceName(schema.$ref));
      return deps; // References don't have other properties to check
    }

    // Now we know it's a JsonSchema, not a reference
    if (schema.properties) {
      for (const propSchema of Object.values(schema.properties)) {
        deps.push(...this.extractDependencies(propSchema));
      }
    }

    if (schema.items) {
      if (Array.isArray(schema.items)) {
        for (const item of schema.items) {
          deps.push(...this.extractDependencies(item as JsonSchema));
        }
      } else {
        deps.push(...this.extractDependencies(schema.items as JsonSchema));
      }
    }

    if (schema.allOf) {
      for (const subSchema of schema.allOf) {
        deps.push(...this.extractDependencies(subSchema as JsonSchema));
      }
    }

    if (schema.anyOf) {
      for (const subSchema of schema.anyOf) {
        deps.push(...this.extractDependencies(subSchema as JsonSchema));
      }
    }

    if (schema.oneOf) {
      for (const subSchema of schema.oneOf) {
        deps.push(...this.extractDependencies(subSchema as JsonSchema));
      }
    }

    return deps;
  }

  /**
   * Topological sort of types by dependencies.
   */
  private topologicalSort(): TypeDefinition[] {
    const sorted: TypeDefinition[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (name: string): void => {
      if (visited.has(name)) return;
      if (visiting.has(name)) {
        // Circular dependency - already handled
        return;
      }

      visiting.add(name);

      const typeDef = this.generatedTypes.get(name);
      if (typeDef) {
        // Visit dependencies first
        for (const dep of typeDef.dependencies) {
          visit(dep);
        }

        sorted.push(typeDef);
        visited.add(name);
      }

      visiting.delete(name);
    };

    for (const name of this.generatedTypes.keys()) {
      visit(name);
    }

    return sorted;
  }

  /**
   * Generate complete TypeScript code.
   */
  private generateCode(types: readonly TypeDefinition[]): string {
    const lines: string[] = [];

    // Header
    lines.push('/**');
    lines.push(' * Generated TypeScript types from OpenAPI specification.');
    lines.push(' *');
    lines.push(' * DO NOT EDIT MANUALLY.');
    lines.push(' * This file is auto-generated by the Atakora OpenAPI type generator.');
    lines.push(' */');
    lines.push('');

    // Linting directives
    lines.push('/* eslint-disable */');
    lines.push('/* tslint:disable */');
    lines.push('');

    // Types
    for (const typeDef of types) {
      lines.push(typeDef.code);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format type name with prefix/suffix.
   */
  private formatTypeName(name: string): string {
    return `${this.options.typePrefix}${name}${this.options.typeSuffix}`;
  }

  /**
   * Convert string to enum member name.
   */
  private toEnumMemberName(value: string): string {
    // Convert kebab-case or snake_case to PascalCase
    return value
      .split(/[-_]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join('');
  }
}
