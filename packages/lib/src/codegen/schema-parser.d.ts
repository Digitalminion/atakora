/**
 * ARM Schema Parser - Parses Azure ARM JSON schemas into intermediate representation.
 *
 * @packageDocumentation
 */
import type { SchemaIR } from './types';
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
export declare class SchemaParser {
    private schemaCache;
    /**
     * Parse an ARM schema file.
     *
     * @param schemaPath - Path to schema JSON file
     * @returns Schema intermediate representation
     *
     * @throws {Error} If schema file cannot be read or parsed
     */
    parse(schemaPath: string): SchemaIR;
    /**
     * Load schema JSON file with caching.
     *
     * @param schemaPath - Path to schema file
     * @returns Parsed JSON schema
     */
    private loadSchema;
    /**
     * Extract schema metadata from schema ID and title.
     *
     * @param schema - Parsed schema JSON
     * @param schemaPath - File path
     * @returns Schema metadata
     */
    private extractMetadata;
    /**
     * Parse resource definitions section of schema.
     *
     * @param resourceDefs - Resource definitions object
     * @param schema - Full schema (for reference resolution)
     * @returns Array of resource definitions
     */
    private parseResourceDefinitions;
    /**
     * Parse a single resource definition.
     *
     * @param name - Resource definition name
     * @param def - Resource definition object
     * @param schema - Full schema
     * @returns Resource definition
     */
    private parseResourceDefinition;
    /**
     * Parse properties object into property definitions.
     *
     * @param props - Properties object from schema
     * @param schema - Full schema
     * @returns Array of property definitions
     */
    private parseProperties;
    /**
     * Parse a single property definition.
     *
     * @param name - Property name
     * @param propDef - Property definition from schema
     * @param schema - Full schema
     * @returns Property definition
     */
    private parseProperty;
    /**
     * Parse type definition from schema property.
     *
     * @param typeDef - Type definition object
     * @param schema - Full schema
     * @returns Type definition
     */
    private parseType;
    /**
     * Resolve $ref reference to type definition.
     *
     * @param ref - Reference string
     * @param schema - Full schema
     * @returns Type definition
     */
    private resolveReference;
    /**
     * Parse union type (oneOf).
     *
     * @param oneOf - Array of type options
     * @param schema - Full schema
     * @returns Union type definition
     */
    private parseUnionType;
    /**
     * Parse enum type.
     *
     * @param typeDef - Type definition with enum
     * @returns Enum type definition
     */
    private parseEnumType;
    /**
     * Parse object type.
     *
     * @param typeDef - Type definition for object
     * @param schema - Full schema
     * @returns Object type definition
     */
    private parseObjectType;
    /**
     * Parse array type.
     *
     * @param typeDef - Type definition for array
     * @param schema - Full schema
     * @returns Array type definition
     */
    private parseArrayType;
    /**
     * Extract property constraints for validation.
     *
     * @param propDef - Property definition
     * @returns Constraints object if any constraints exist
     */
    private extractConstraints;
    /**
     * Parse definitions section of schema.
     *
     * @param defs - Definitions object
     * @param schema - Full schema
     * @returns Map of definition name to type
     */
    private parseDefinitions;
    /**
     * Convert definition name to TypeScript type name.
     *
     * @param name - Definition name from schema
     * @returns TypeScript-friendly type name
     */
    private toTypeName;
}
//# sourceMappingURL=schema-parser.d.ts.map