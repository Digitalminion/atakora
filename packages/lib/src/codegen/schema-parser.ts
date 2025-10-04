/**
 * ARM Schema Parser - Parses Azure ARM JSON schemas into intermediate representation.
 *
 * @packageDocumentation
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  SchemaIR,
  ResourceDefinition,
  PropertyDefinition,
  TypeDefinition,
  PropertyConstraints,
  SchemaMetadata,
} from './types';

/**
 * Parses ARM JSON schemas into intermediate representation.
 *
 * @remarks
 * Handles schema references, type resolution, and constraint extraction.
 * Caches loaded schemas for performance.
 *
 * @example
 * ```typescript
 * const parser = new SchemaParser();
 * const ir = parser.parse('../azure-resource-manager-schemas-main/schemas/2024-07-01/Microsoft.Network.NRP.json');
 *
 * console.log(`Provider: ${ir.provider}`);
 * console.log(`Resources: ${ir.resources.length}`);
 * ```
 */
export class SchemaParser {
  private schemaCache = new Map<string, any>();

  /**
   * Parse an ARM schema file.
   *
   * @param schemaPath - Path to schema JSON file
   * @returns Schema intermediate representation
   *
   * @throws {Error} If schema file cannot be read or parsed
   */
  public parse(schemaPath: string): SchemaIR {
    const schemaJson = this.loadSchema(schemaPath);

    // Extract metadata
    const metadata = this.extractMetadata(schemaJson, schemaPath);

    // Parse resource definitions
    const resources = this.parseResourceDefinitions(
      schemaJson.resourceDefinitions || {},
      schemaJson
    );

    // Parse shared definitions
    const definitions = this.parseDefinitions(
      schemaJson.definitions || {},
      schemaJson
    );

    return {
      provider: metadata.provider,
      apiVersion: metadata.apiVersion,
      resources,
      definitions,
      metadata,
    };
  }

  /**
   * Load schema JSON file with caching.
   *
   * @param schemaPath - Path to schema file
   * @returns Parsed JSON schema
   */
  private loadSchema(schemaPath: string): any {
    if (this.schemaCache.has(schemaPath)) {
      return this.schemaCache.get(schemaPath);
    }

    const content = fs.readFileSync(schemaPath, 'utf-8');
    const schema = JSON.parse(content);
    this.schemaCache.set(schemaPath, schema);

    return schema;
  }

  /**
   * Extract schema metadata from schema ID and title.
   *
   * @param schema - Parsed schema JSON
   * @param schemaPath - File path
   * @returns Schema metadata
   */
  private extractMetadata(schema: any, schemaPath: string): SchemaMetadata {
    // Parse schema ID: "https://schema.management.azure.com/schemas/2024-07-01/Microsoft.Network.NRP.json#"
    const schemaId = schema.id || schema.$id || '';
    const match = schemaId.match(/schemas\/([^\/]+)\/([^\/]+)\.json/);

    return {
      schemaPath,
      provider: schema.title || 'Unknown',
      apiVersion: match ? match[1] : 'unknown',
      schemaId,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Parse resource definitions section of schema.
   *
   * @param resourceDefs - Resource definitions object
   * @param schema - Full schema (for reference resolution)
   * @returns Array of resource definitions
   */
  private parseResourceDefinitions(
    resourceDefs: Record<string, any>,
    schema: any
  ): ResourceDefinition[] {
    const resources: ResourceDefinition[] = [];

    for (const [name, def] of Object.entries(resourceDefs)) {
      const resource = this.parseResourceDefinition(name, def, schema);
      resources.push(resource);
    }

    return resources;
  }

  /**
   * Parse a single resource definition.
   *
   * @param name - Resource definition name
   * @param def - Resource definition object
   * @param schema - Full schema
   * @returns Resource definition
   */
  private parseResourceDefinition(
    name: string,
    def: any,
    schema: any
  ): ResourceDefinition {
    // Extract ARM type from def.properties.type.enum[0]
    const armType = def.properties?.type?.enum?.[0] || name;

    // Parse properties
    const properties = this.parseProperties(def.properties || {}, schema);

    // Extract required fields
    const required = def.required || [];

    // Mark required properties
    for (const prop of properties) {
      if (required.includes(prop.name)) {
        (prop as any).required = true;
      }
    }

    return {
      name,
      armType,
      description: def.description,
      properties,
      required,
    };
  }

  /**
   * Parse properties object into property definitions.
   *
   * @param props - Properties object from schema
   * @param schema - Full schema
   * @returns Array of property definitions
   */
  private parseProperties(
    props: Record<string, any>,
    schema: any
  ): PropertyDefinition[] {
    const properties: PropertyDefinition[] = [];

    for (const [name, propDef] of Object.entries(props)) {
      // Skip ARM metadata properties
      if (['type', 'apiVersion'].includes(name)) {
        continue;
      }

      const property = this.parseProperty(name, propDef, schema);
      properties.push(property);
    }

    return properties;
  }

  /**
   * Parse a single property definition.
   *
   * @param name - Property name
   * @param propDef - Property definition from schema
   * @param schema - Full schema
   * @returns Property definition
   */
  private parseProperty(
    name: string,
    propDef: any,
    schema: any
  ): PropertyDefinition {
    // Resolve type
    const type = this.parseType(propDef, schema);

    // Extract constraints
    const constraints = this.extractConstraints(propDef);

    return {
      name,
      type,
      description: propDef.description,
      required: false, // Set by parent resource definition
      constraints,
    };
  }

  /**
   * Parse type definition from schema property.
   *
   * @param typeDef - Type definition object
   * @param schema - Full schema
   * @returns Type definition
   */
  private parseType(typeDef: any, schema: any): TypeDefinition {
    // Handle $ref
    if (typeDef.$ref) {
      return this.resolveReference(typeDef.$ref, schema);
    }

    // Handle oneOf (union type)
    if (typeDef.oneOf) {
      return this.parseUnionType(typeDef.oneOf, schema);
    }

    // Handle enum
    if (typeDef.enum) {
      return this.parseEnumType(typeDef);
    }

    // Handle primitive types
    const jsonType = typeDef.type;

    switch (jsonType) {
      case 'string':
        return { kind: 'primitive', tsType: 'string' };

      case 'integer':
      case 'number':
        return { kind: 'primitive', tsType: 'number' };

      case 'boolean':
        return { kind: 'primitive', tsType: 'boolean' };

      case 'object':
        return this.parseObjectType(typeDef, schema);

      case 'array':
        return this.parseArrayType(typeDef, schema);

      default:
        return { kind: 'primitive', tsType: 'any' };
    }
  }

  /**
   * Resolve $ref reference to type definition.
   *
   * @param ref - Reference string
   * @param schema - Full schema
   * @returns Type definition
   */
  private resolveReference(ref: string, schema: any): TypeDefinition {
    // Internal ref: "#/definitions/SomeType"
    if (ref.startsWith('#/definitions/')) {
      const defName = ref.substring('#/definitions/'.length);

      if (schema.definitions && schema.definitions[defName]) {
        const def = schema.definitions[defName];

        // For simple object definitions, expand inline
        // For complex types, return reference
        if (def.type === 'object' && !def.properties) {
          return this.parseType(def, schema);
        }

        // Return reference type (will be expanded later)
        return {
          kind: 'reference',
          tsType: this.toTypeName(defName),
          refName: defName,
        };
      }
    }

    // External ref (common definitions): just reference by name
    if (ref.includes('common/definitions.json')) {
      const match = ref.match(/#\/definitions\/(\w+)/);
      if (match) {
        return {
          kind: 'primitive',
          tsType: 'any', // Fallback for common definitions
        };
      }
    }

    return { kind: 'primitive', tsType: 'any' };
  }

  /**
   * Parse union type (oneOf).
   *
   * @param oneOf - Array of type options
   * @param schema - Full schema
   * @returns Union type definition
   */
  private parseUnionType(oneOf: any[], schema: any): TypeDefinition {
    const unionTypes = oneOf.map((t) => this.parseType(t, schema));

    // If one option is expression, just use the other type
    // (expressions are ARM template runtime values)
    const nonExprTypes = unionTypes.filter(
      (t) => !t.tsType.includes('expression')
    );

    if (nonExprTypes.length === 1) {
      return nonExprTypes[0];
    }

    const tsType = unionTypes.map((t) => t.tsType).join(' | ');

    return {
      kind: 'union',
      tsType,
      unionTypes,
    };
  }

  /**
   * Parse enum type.
   *
   * @param typeDef - Type definition with enum
   * @returns Enum type definition
   */
  private parseEnumType(typeDef: any): TypeDefinition {
    const enumValues = typeDef.enum;

    // Generate union of string literals
    const tsType = enumValues
      .map((v: any) => {
        if (typeof v === 'string') {
          return `'${v}'`;
        }
        return v;
      })
      .join(' | ');

    return {
      kind: 'enum',
      tsType,
      enumValues,
    };
  }

  /**
   * Parse object type.
   *
   * @param typeDef - Type definition for object
   * @param schema - Full schema
   * @returns Object type definition
   */
  private parseObjectType(typeDef: any, schema: any): TypeDefinition {
    // Check for additionalProperties (Record type)
    if (typeDef.additionalProperties) {
      const valueType = this.parseType(typeDef.additionalProperties, schema);
      return {
        kind: 'object',
        tsType: `Record<string, ${valueType.tsType}>`,
      };
    }

    // Parse properties
    const properties = typeDef.properties
      ? this.parseProperties(typeDef.properties, schema)
      : [];

    return {
      kind: 'object',
      tsType: 'object', // Will be expanded to interface
      properties,
    };
  }

  /**
   * Parse array type.
   *
   * @param typeDef - Type definition for array
   * @param schema - Full schema
   * @returns Array type definition
   */
  private parseArrayType(typeDef: any, schema: any): TypeDefinition {
    const elementType = typeDef.items
      ? this.parseType(typeDef.items, schema)
      : ({ kind: 'primitive', tsType: 'any' } as TypeDefinition);

    return {
      kind: 'array',
      tsType: `${elementType.tsType}[]`,
      elementType,
    };
  }

  /**
   * Extract property constraints for validation.
   *
   * @param propDef - Property definition
   * @returns Constraints object if any constraints exist
   */
  private extractConstraints(
    propDef: any
  ): PropertyConstraints | undefined {
    // Build constraints object without readonly restriction
    const constraints: {
      minLength?: number;
      maxLength?: number;
      minimum?: number;
      maximum?: number;
      pattern?: string;
      enum?: any[];
      const?: any;
    } = {};

    if (propDef.minLength !== undefined) {
      constraints.minLength = propDef.minLength;
    }

    if (propDef.maxLength !== undefined) {
      constraints.maxLength = propDef.maxLength;
    }

    if (propDef.minimum !== undefined) {
      constraints.minimum = propDef.minimum;
    }

    if (propDef.maximum !== undefined) {
      constraints.maximum = propDef.maximum;
    }

    if (propDef.pattern) {
      constraints.pattern = propDef.pattern;
    }

    if (propDef.enum) {
      constraints.enum = propDef.enum;
    }

    if (propDef.const !== undefined) {
      constraints.const = propDef.const;
    }

    return Object.keys(constraints).length > 0 ? (constraints as PropertyConstraints) : undefined;
  }

  /**
   * Parse definitions section of schema.
   *
   * @param defs - Definitions object
   * @param schema - Full schema
   * @returns Map of definition name to type
   */
  private parseDefinitions(
    defs: Record<string, any>,
    schema: any
  ): Map<string, TypeDefinition> {
    const definitions = new Map<string, TypeDefinition>();

    for (const [name, def] of Object.entries(defs)) {
      const type = this.parseType(def, schema);
      definitions.set(name, type);
    }

    return definitions;
  }

  /**
   * Convert definition name to TypeScript type name.
   *
   * @param name - Definition name from schema
   * @returns TypeScript-friendly type name
   */
  private toTypeName(name: string): string {
    // Remove Format suffix: "AddressSpacePropertiesFormat" -> "AddressSpace"
    return name.replace(/PropertiesFormat$/, '').replace(/Format$/, '');
  }
}
