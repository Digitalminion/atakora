/**
 * Validation Code Generator - Generates runtime validation functions from ARM schemas.
 *
 * @packageDocumentation
 */
import type { SchemaIR } from './types';
/**
 * Validation error result.
 */
export interface ValidationError {
    /** Property path where error occurred */
    readonly path: string;
    /** Error message */
    readonly message: string;
    /** Error code */
    readonly code: string;
    /** Suggested fix */
    readonly fix?: string;
}
/**
 * Validation result.
 */
export interface ValidationResult {
    /** Validation passed */
    readonly valid: boolean;
    /** Validation errors */
    readonly errors: ValidationError[];
}
/**
 * Generates runtime validation code from ARM schema constraints.
 *
 * @remarks
 * Produces TypeScript validator functions that check:
 * - Required properties
 * - String length constraints
 * - Numeric range constraints
 * - Regex patterns
 * - Enum values
 *
 * @example
 * ```typescript
 * const parser = new SchemaParser();
 * const ir = parser.parse('path/to/schema.json');
 *
 * const generator = new ValidationGenerator();
 * const code = generator.generate(ir);
 *
 * fs.writeFileSync('validators.ts', code);
 * ```
 */
export declare class ValidationGenerator {
    /**
     * Generate validation code from schema IR.
     *
     * @param ir - Schema intermediate representation
     * @returns Generated validation code
     */
    generate(ir: SchemaIR): string;
    /**
     * Generate file header.
     */
    private generateFileHeader;
    /**
     * Generate imports.
     */
    private generateImports;
    /**
     * Generate validator function for a resource.
     */
    private generateResourceValidator;
    /**
     * Generate validation code for a property with constraints.
     */
    private generatePropertyValidation;
    /**
     * Convert name to PascalCase.
     */
    private toPascalCase;
}
//# sourceMappingURL=validation-generator.d.ts.map