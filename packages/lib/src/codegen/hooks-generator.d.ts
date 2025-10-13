/**
 * React hooks code generator for Atakora schemas.
 *
 * @remarks
 * Generates type-safe React hooks (useQuery, useMutation, etc.) with
 * proper state management, caching, and optimistic updates.
 *
 * @packageDocumentation
 */
import type { SchemaDefinition } from '../schema/atakora/schema-types';
/**
 * Hooks generation options.
 */
export interface HooksGeneratorOptions {
    /**
     * Include JSDoc comments.
     */
    includeJsDoc?: boolean;
    /**
     * State management library (react-query, swr, redux).
     */
    stateLibrary?: 'react-query' | 'swr' | 'zustand' | 'none';
    /**
     * Include optimistic updates.
     */
    includeOptimistic?: boolean;
    /**
     * Include suspense support.
     */
    includeSuspense?: boolean;
    /**
     * Include error boundaries.
     */
    includeErrorBoundary?: boolean;
    /**
     * Generate custom hooks for relationships.
     */
    includeRelationshipHooks?: boolean;
}
/**
 * Generated hooks result.
 */
export interface GeneratedHooks {
    /**
     * Generated hooks code.
     */
    code: string;
    /**
     * Import statements needed.
     */
    imports: string[];
    /**
     * Hook names generated.
     */
    hooks: string[];
}
/**
 * React hooks generator.
 */
export declare class HooksGenerator {
    private options;
    constructor(options?: HooksGeneratorOptions);
    /**
     * Generate React hooks for a schema.
     *
     * @param schema - Schema definition
     * @returns Generated hooks code
     *
     * @example
     * ```typescript
     * const generator = new HooksGenerator({ stateLibrary: 'react-query' });
     * const { code } = generator.generate(UserSchema);
     * console.log(code);
     * ```
     */
    generate(schema: SchemaDefinition<any>): GeneratedHooks;
    /**
     * Generate hooks for multiple schemas.
     *
     * @param schemas - Schema definitions
     * @returns Generated hooks code
     *
     * @example
     * ```typescript
     * const generator = new HooksGenerator();
     * const { code } = generator.generateMany([UserSchema, PostSchema, CommentSchema]);
     * ```
     */
    generateMany(schemas: SchemaDefinition<any>[]): GeneratedHooks;
    /**
     * Generate file header.
     */
    private generateFileHeader;
    /**
     * Generate imports.
     */
    private generateImports;
    /**
     * Generate shared imports.
     */
    private generateSharedImports;
    /**
     * Generate React Query hooks.
     */
    private generateReactQueryHooks;
    /**
     * Generate SWR hooks.
     */
    private generateSWRHooks;
    /**
     * Generate basic hooks without state library.
     */
    private generateBasicHooks;
    /**
     * Generate useGet hook.
     */
    private generateUseGetHook;
    /**
     * Generate useList hook.
     */
    private generateUseListHook;
    /**
     * Generate useQuery hook.
     */
    private generateUseQueryHook;
    /**
     * Generate useCreate hook.
     */
    private generateUseCreateHook;
    /**
     * Generate useUpdate hook.
     */
    private generateUseUpdateHook;
    /**
     * Generate useDelete hook.
     */
    private generateUseDeleteHook;
}
/**
 * Generate React hooks for a schema.
 *
 * @param schema - Schema definition
 * @param options - Generator options
 * @returns Generated hooks code
 *
 * @example
 * ```typescript
 * const { code } = generateHooks(UserSchema, {
 *   stateLibrary: 'react-query',
 *   includeOptimistic: true
 * });
 *
 * await fs.writeFile('user-hooks.ts', code);
 * ```
 */
export declare function generateHooks(schema: SchemaDefinition<any>, options?: HooksGeneratorOptions): GeneratedHooks;
/**
 * Generate React hooks for multiple schemas.
 *
 * @param schemas - Schema definitions
 * @param options - Generator options
 * @returns Generated hooks code
 *
 * @example
 * ```typescript
 * const { code } = generateManyHooks([UserSchema, PostSchema, CommentSchema]);
 * await fs.writeFile('hooks.ts', code);
 * ```
 */
export declare function generateManyHooks(schemas: SchemaDefinition<any>[], options?: HooksGeneratorOptions): GeneratedHooks;
//# sourceMappingURL=hooks-generator.d.ts.map