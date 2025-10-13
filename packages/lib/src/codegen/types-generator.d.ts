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
export declare class TypesGenerator {
    private options;
    constructor(options?: TypeGeneratorOptions);
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
    generate(schema: SchemaDefinition<any>): GeneratedCode;
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
    generateMany(schemas: SchemaDefinition<any>[]): GeneratedCode;
    /**
     * Generate file header with documentation.
     */
    private generateFileHeader;
    /**
     * Generate main entity interface.
     */
    private generateEntityInterface;
    /**
     * Generate filter type.
     */
    private generateFilterType;
    /**
     * Generate create input type.
     */
    private generateCreateInputType;
    /**
     * Generate update input type.
     */
    private generateUpdateInputType;
    /**
     * Generate sort enum.
     */
    private generateSortEnum;
    /**
     * Convert Zod type to TypeScript type.
     */
    private zodTypeToTypeScript;
    /**
     * Check if a field is optional.
     */
    private isOptionalField;
    /**
     * Get filter type for a field type.
     */
    private getFilterTypeForField;
    /**
     * Get TypeScript type for relationship.
     */
    private getRelationshipType;
    /**
     * Convert computed field type to TypeScript.
     */
    private computedTypeToTypeScript;
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
export declare function generateTypes(schema: SchemaDefinition<any>, options?: TypeGeneratorOptions): GeneratedCode;
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
export declare function generateManyTypes(schemas: SchemaDefinition<any>[], options?: TypeGeneratorOptions): GeneratedCode;
//# sourceMappingURL=types-generator.d.ts.map