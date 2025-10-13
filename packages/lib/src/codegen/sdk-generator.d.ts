/**
 * Client SDK code generator for Atakora schemas.
 *
 * @remarks
 * Generates type-safe client SDK with entity methods, error handling,
 * retry logic, and optimistic updates.
 *
 * @packageDocumentation
 */
import type { SchemaDefinition } from '../schema/atakora/schema-types';
/**
 * SDK generation options.
 */
export interface SDKGeneratorOptions {
    /**
     * Include JSDoc comments.
     */
    includeJsDoc?: boolean;
    /**
     * Generate retry logic.
     */
    includeRetry?: boolean;
    /**
     * Generate caching logic.
     */
    includeCache?: boolean;
    /**
     * Generate optimistic updates.
     */
    includeOptimistic?: boolean;
    /**
     * API client type (fetch, axios, graphql).
     */
    clientType?: 'fetch' | 'axios' | 'graphql';
    /**
     * Base URL for API calls.
     */
    baseUrl?: string;
    /**
     * Include authentication helpers.
     */
    includeAuth?: boolean;
}
/**
 * Generated SDK result.
 */
export interface GeneratedSDK {
    /**
     * Generated SDK code.
     */
    code: string;
    /**
     * Import statements needed.
     */
    imports: string[];
    /**
     * Class names generated.
     */
    classes: string[];
}
/**
 * SDK code generator.
 */
export declare class SDKGenerator {
    private options;
    constructor(options?: SDKGeneratorOptions);
    /**
     * Generate client SDK for a schema.
     *
     * @param schema - Schema definition
     * @returns Generated SDK code
     *
     * @example
     * ```typescript
     * const generator = new SDKGenerator({ clientType: 'fetch' });
     * const { code } = generator.generate(UserSchema);
     * console.log(code);
     * ```
     */
    generate(schema: SchemaDefinition<any>): GeneratedSDK;
    /**
     * Generate SDK for multiple schemas with shared client.
     *
     * @param schemas - Schema definitions
     * @returns Generated SDK code
     *
     * @example
     * ```typescript
     * const generator = new SDKGenerator();
     * const { code } = generator.generateMany([UserSchema, PostSchema, CommentSchema]);
     * ```
     */
    generateMany(schemas: SchemaDefinition<any>[]): GeneratedSDK;
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
     * Generate client class.
     */
    private generateClientClass;
    /**
     * Generate get method.
     */
    private generateGetMethod;
    /**
     * Generate list method.
     */
    private generateListMethod;
    /**
     * Generate create method.
     */
    private generateCreateMethod;
    /**
     * Generate update method.
     */
    private generateUpdateMethod;
    /**
     * Generate delete method.
     */
    private generateDeleteMethod;
    /**
     * Generate query method.
     */
    private generateQueryMethod;
    /**
     * Generate retry method.
     */
    private generateRetryMethod;
    /**
     * Generate fetch method.
     */
    private generateFetchMethod;
    /**
     * Generate base client.
     */
    private generateBaseClient;
    /**
     * Generate main SDK class.
     */
    private generateMainSDKClass;
}
/**
 * Generate client SDK for a schema.
 *
 * @param schema - Schema definition
 * @param options - Generator options
 * @returns Generated SDK code
 *
 * @example
 * ```typescript
 * const { code } = generateSDK(UserSchema, {
 *   clientType: 'fetch',
 *   includeRetry: true,
 *   baseUrl: '/api'
 * });
 *
 * await fs.writeFile('user-client.ts', code);
 * ```
 */
export declare function generateSDK(schema: SchemaDefinition<any>, options?: SDKGeneratorOptions): GeneratedSDK;
/**
 * Generate SDK for multiple schemas.
 *
 * @param schemas - Schema definitions
 * @param options - Generator options
 * @returns Generated SDK code
 *
 * @example
 * ```typescript
 * const { code } = generateManySDK([UserSchema, PostSchema, CommentSchema]);
 * await fs.writeFile('sdk.ts', code);
 * ```
 */
export declare function generateManySDK(schemas: SchemaDefinition<any>[], options?: SDKGeneratorOptions): GeneratedSDK;
//# sourceMappingURL=sdk-generator.d.ts.map