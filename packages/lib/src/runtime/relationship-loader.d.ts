/**
 * Relationship loader with batch loading and caching.
 *
 * @remarks
 * Provides efficient relationship loading with batching to prevent N+1 queries,
 * caching for performance, and support for eager and lazy loading.
 *
 * @packageDocumentation
 */
import type { SchemaDefinition } from '../schema/atakora/schema-types';
/**
 * Data loader function type.
 */
export type DataLoaderFn<TKey, TValue> = (keys: TKey[]) => Promise<Map<TKey, TValue | TValue[]>>;
/**
 * Batch loader options.
 */
export interface BatchLoaderOptions {
    /**
     * Maximum batch size.
     */
    maxBatchSize?: number;
    /**
     * Batch delay in milliseconds.
     */
    batchDelay?: number;
    /**
     * Enable caching.
     */
    cache?: boolean;
    /**
     * Cache TTL in milliseconds.
     */
    cacheTtl?: number;
}
/**
 * Batch loader for efficient data loading.
 */
declare class BatchLoader<TKey, TValue> {
    private loaderFn;
    private options;
    private queue;
    private batchTimer;
    private cache;
    constructor(loaderFn: DataLoaderFn<TKey, TValue>, options?: BatchLoaderOptions);
    /**
     * Load a value by key.
     */
    load(key: TKey): Promise<TValue | TValue[] | undefined>;
    /**
     * Load multiple values by keys.
     */
    loadMany(keys: TKey[]): Promise<Array<TValue | TValue[] | undefined>>;
    /**
     * Execute batched load.
     */
    private executeBatch;
    /**
     * Clear cache.
     */
    clearCache(): void;
    /**
     * Prime cache with a value.
     */
    prime(key: TKey, value: TValue | TValue[]): void;
}
/**
 * Relationship loader context.
 */
export interface RelationshipLoaderContext {
    /**
     * Schema registry for resolving relationships.
     */
    schemaRegistry: Map<string, SchemaDefinition<any>>;
    /**
     * Data loader function factory.
     */
    createLoader?: <TKey, TValue>(schemaName: string, loaderFn: DataLoaderFn<TKey, TValue>) => BatchLoader<TKey, TValue>;
    /**
     * Batch loader options.
     */
    batchOptions?: BatchLoaderOptions;
}
/**
 * Relationship loader for a schema.
 */
export declare class RelationshipLoader<TSchema extends SchemaDefinition<any>> {
    private schema;
    private context;
    private loaders;
    constructor(schema: TSchema, context: RelationshipLoaderContext);
    /**
     * Load a has-one relationship.
     *
     * @param relationshipName - Relationship name
     * @param record - Parent record
     * @returns Related record or undefined
     *
     * @example
     * ```typescript
     * const user = await userQuery.get('user-123').execute();
     * const profile = await loader.loadHasOne('profile', user);
     * ```
     */
    loadHasOne(relationshipName: string, record: any): Promise<any | undefined>;
    /**
     * Load a has-many relationship.
     *
     * @param relationshipName - Relationship name
     * @param record - Parent record
     * @returns Array of related records
     *
     * @example
     * ```typescript
     * const user = await userQuery.get('user-123').execute();
     * const posts = await loader.loadHasMany('posts', user);
     * ```
     */
    loadHasMany(relationshipName: string, record: any): Promise<any[]>;
    /**
     * Load a belongs-to relationship.
     *
     * @param relationshipName - Relationship name
     * @param record - Child record
     * @returns Related record or undefined
     *
     * @example
     * ```typescript
     * const post = await postQuery.get('post-123').execute();
     * const author = await loader.loadBelongsTo('author', post);
     * ```
     */
    loadBelongsTo(relationshipName: string, record: any): Promise<any | undefined>;
    /**
     * Load a many-to-many relationship.
     *
     * @param relationshipName - Relationship name
     * @param record - Record
     * @returns Array of related records
     *
     * @example
     * ```typescript
     * const post = await postQuery.get('post-123').execute();
     * const categories = await loader.loadManyToMany('categories', post);
     * ```
     */
    loadManyToMany(relationshipName: string, record: any): Promise<any[]>;
    /**
     * Load a polymorphic relationship.
     *
     * @param relationshipName - Relationship name
     * @param record - Record
     * @returns Related record or undefined
     *
     * @example
     * ```typescript
     * const comment = await commentQuery.get('comment-123').execute();
     * const commentable = await loader.loadPolymorphic('commentable', comment);
     * ```
     */
    loadPolymorphic(relationshipName: string, record: any): Promise<any | undefined>;
    /**
     * Load a relationship automatically based on type.
     *
     * @param relationshipName - Relationship name
     * @param record - Record
     * @returns Related record(s)
     *
     * @example
     * ```typescript
     * const user = await userQuery.get('user-123').execute();
     * const posts = await loader.load('posts', user);
     * ```
     */
    load(relationshipName: string, record: any): Promise<any>;
    /**
     * Load multiple relationships for a record.
     *
     * @param relationshipNames - Relationship names
     * @param record - Record
     * @returns Record with loaded relationships
     *
     * @example
     * ```typescript
     * const post = await postQuery.get('post-123').execute();
     * const withRelations = await loader.loadMany(['author', 'comments', 'categories'], post);
     * ```
     */
    loadMany(relationshipNames: string[], record: any): Promise<any>;
    /**
     * Load relationships for multiple records.
     *
     * @param relationshipNames - Relationship names
     * @param records - Records
     * @returns Records with loaded relationships
     *
     * @example
     * ```typescript
     * const posts = await postQuery.list().execute();
     * const withRelations = await loader.loadManyForRecords(['author'], posts.data);
     * ```
     */
    loadManyForRecords(relationshipNames: string[], records: any[]): Promise<any[]>;
    /**
     * Clear all loader caches.
     */
    clearCache(): void;
    /**
     * Get or create a batch loader for a relationship.
     */
    private getOrCreateLoader;
    /**
     * Register a custom loader for a relationship.
     *
     * @param targetSchema - Target schema name
     * @param foreignKey - Foreign key field
     * @param loaderFn - Custom loader function
     *
     * @example
     * ```typescript
     * loader.registerLoader('Post', 'authorId', async (authorIds) => {
     *   const posts = await database.query('SELECT * FROM posts WHERE authorId IN (?)', [authorIds]);
     *   const grouped = new Map();
     *   for (const post of posts) {
     *     const existing = grouped.get(post.authorId) || [];
     *     existing.push(post);
     *     grouped.set(post.authorId, existing);
     *   }
     *   return grouped;
     * });
     * ```
     */
    registerLoader(targetSchema: string, foreignKey: string, loaderFn: DataLoaderFn<any, any>): void;
}
/**
 * Create a relationship loader for a schema.
 *
 * @param schema - Schema definition
 * @param context - Loader context
 * @returns Relationship loader instance
 *
 * @example
 * ```typescript
 * const loader = createRelationshipLoader(UserSchema, {
 *   schemaRegistry: globalSchemaRegistry,
 *   batchOptions: {
 *     maxBatchSize: 100,
 *     batchDelay: 10,
 *     cache: true,
 *     cacheTtl: 60000
 *   }
 * });
 *
 * const user = await userQuery.get('user-123').execute();
 * const posts = await loader.loadHasMany('posts', user);
 * ```
 */
export declare function createRelationshipLoader<TSchema extends SchemaDefinition<any>>(schema: TSchema, context: RelationshipLoaderContext): RelationshipLoader<TSchema>;
export {};
//# sourceMappingURL=relationship-loader.d.ts.map