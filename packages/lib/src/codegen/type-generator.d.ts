/**
 * TypeScript Type Generator - Generates TypeScript interfaces from ARM schema IR.
 *
 * @packageDocumentation
 */
import type { SchemaIR } from './types';
/**
 * Generates TypeScript interface code from schema IR.
 *
 * @remarks
 * Produces clean, well-documented TypeScript interfaces matching
 * the existing hand-written type patterns in the codebase.
 *
 * @example
 * ```typescript
 * const parser = new SchemaParser();
 * const ir = parser.parse('path/to/schema.json');
 *
 * const generator = new TypeGenerator();
 * const code = generator.generate(ir);
 *
 * fs.writeFileSync('generated-types.ts', code);
 * ```
 */
export declare class TypeGenerator {
    /**
     * Generate TypeScript types file from schema IR.
     *
     * @param ir - Schema intermediate representation
     * @returns Generated TypeScript code
     * @throws {Error} If referenced types are not defined
     */
    generate(ir: SchemaIR): string;
    /**
     * Generate file header with metadata and documentation.
     *
     * @param metadata - Schema metadata
     * @returns Header comment block
     */
    private generateFileHeader;
    /**
     * Generate TypeScript type alias for union types.
     *
     * @param name - Type definition name
     * @param typeDef - Type definition
     * @returns Generated type alias code
     */
    private generateTypeAlias;
    /**
     * Generate TypeScript interface for shared type definition.
     *
     * @param name - Type definition name
     * @param typeDef - Type definition
     * @returns Generated interface code
     */
    private generateInterface;
    /**
     * Generate resource props interface for L1 construct.
     *
     * @param resource - Resource definition
     * @param ir - Schema IR (for metadata)
     * @returns Generated interface code
     */
    private generateResourcePropsInterface;
    /**
     * Generate JSDoc comment for a property.
     *
     * @param prop - Property definition
     * @param indent - Indentation string
     * @returns JSDoc comment block
     */
    private generatePropertyDoc;
    /**
     * Generate TypeScript property declaration.
     *
     * @param prop - Property definition
     * @param indent - Indentation string
     * @returns Property declaration line
     */
    private generatePropertyDeclaration;
    /**
     * Convert name to PascalCase for type names.
     *
     * @param name - Original name
     * @returns PascalCase name
     */
    private toPascalCase;
    /**
     * Convert definition name to TypeScript type name.
     *
     * @param name - Definition name from schema
     * @returns Clean TypeScript type name
     */
    private toTypeName;
    /**
     * Collect all type references from a type definition.
     *
     * @param typeDef - Type definition to scan
     * @param referencedTypes - Set to collect references into
     */
    private collectTypeReferences;
    /**
     * Validate that all referenced types are actually defined.
     *
     * @param generatedTypes - Set of types that were generated
     * @param referencedTypes - Set of types that were referenced
     * @param metadata - Schema metadata for error messages
     * @throws {Error} If any referenced type is not defined
     */
    private validateTypeReferences;
}
//# sourceMappingURL=type-generator.d.ts.map