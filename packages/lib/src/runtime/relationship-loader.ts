/**
 * Relationship loader with batch loading and caching.
 *
 * @remarks
 * Provides efficient relationship loading with batching to prevent N+1 queries,
 * caching for performance, and support for eager and lazy loading.
 *
 * @packageDocumentation
 */

import type {
  SchemaDefinition,
  RelationshipDefinition,
  HasOneRelationship,
  HasManyRelationship,
  BelongsToRelationship,
  ManyToManyRelationship,
  PolymorphicRelationship,
} from '../schema/atakora/schema-types';

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
 * Cached value with expiry.
 */
interface CachedValue<T> {
  value: T;
  expiresAt: number;
}

/**
 * Batch loader for efficient data loading.
 */
class BatchLoader<TKey, TValue> {
  private queue: Array<{
    key: TKey;
    resolve: (value: TValue | TValue[] | undefined) => void;
    reject: (error: Error) => void;
  }> = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private cache = new Map<TKey, CachedValue<TValue | TValue[]>>();

  constructor(
    private loaderFn: DataLoaderFn<TKey, TValue>,
    private options: BatchLoaderOptions = {}
  ) {}

  /**
   * Load a value by key.
   */
  async load(key: TKey): Promise<TValue | TValue[] | undefined> {
    // Check cache first
    if (this.options.cache) {
      const cached = this.cache.get(key);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
      }
    }

    return new Promise<TValue | TValue[] | undefined>((resolve, reject) => {
      this.queue.push({ key, resolve, reject });

      // Clear existing timer
      if (this.batchTimer) {
        clearTimeout(this.batchTimer);
      }

      // Check if we should execute immediately
      const maxBatchSize = this.options.maxBatchSize || 100;
      if (this.queue.length >= maxBatchSize) {
        this.executeBatch();
      } else {
        // Schedule batch execution
        const delay = this.options.batchDelay || 10;
        this.batchTimer = setTimeout(() => {
          this.executeBatch();
        }, delay);
      }
    });
  }

  /**
   * Load multiple values by keys.
   */
  async loadMany(keys: TKey[]): Promise<Array<TValue | TValue[] | undefined>> {
    return Promise.all(keys.map(key => this.load(key)));
  }

  /**
   * Execute batched load.
   */
  private async executeBatch(): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }

    const batch = this.queue.splice(0, this.queue.length);
    this.batchTimer = null;

    try {
      const keys = batch.map(item => item.key);
      const results = await this.loaderFn(keys);

      // Cache and resolve
      const cacheTtl = this.options.cacheTtl || 60000; // 1 minute default
      for (const item of batch) {
        const value = results.get(item.key);

        if (this.options.cache && value !== undefined) {
          this.cache.set(item.key, {
            value,
            expiresAt: Date.now() + cacheTtl,
          });
        }

        item.resolve(value);
      }
    } catch (error) {
      // Reject all items in batch
      for (const item of batch) {
        item.reject(error as Error);
      }
    }
  }

  /**
   * Clear cache.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Prime cache with a value.
   */
  prime(key: TKey, value: TValue | TValue[]): void {
    if (this.options.cache) {
      const cacheTtl = this.options.cacheTtl || 60000;
      this.cache.set(key, {
        value,
        expiresAt: Date.now() + cacheTtl,
      });
    }
  }
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
  createLoader?: <TKey, TValue>(
    schemaName: string,
    loaderFn: DataLoaderFn<TKey, TValue>
  ) => BatchLoader<TKey, TValue>;

  /**
   * Batch loader options.
   */
  batchOptions?: BatchLoaderOptions;
}

/**
 * Relationship loader for a schema.
 */
export class RelationshipLoader<TSchema extends SchemaDefinition<any>> {
  private loaders = new Map<string, BatchLoader<any, any>>();

  constructor(
    private schema: TSchema,
    private context: RelationshipLoaderContext
  ) {}

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
  async loadHasOne(relationshipName: string, record: any): Promise<any | undefined> {
    const relationship = this.schema.relationships?.[relationshipName] as HasOneRelationship;
    if (!relationship || relationship.type !== 'hasOne') {
      throw new Error(`Has-one relationship '${relationshipName}' not found`);
    }

    const loader = this.getOrCreateLoader(relationship.target, relationship.foreignKey);
    const localKey = relationship.localKey || 'id';
    const foreignKeyValue = record[localKey];

    if (!foreignKeyValue) {
      return undefined;
    }

    const results = await loader.load(foreignKeyValue);
    return Array.isArray(results) ? results[0] : results;
  }

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
  async loadHasMany(relationshipName: string, record: any): Promise<any[]> {
    const relationship = this.schema.relationships?.[relationshipName] as HasManyRelationship;
    if (!relationship || relationship.type !== 'hasMany') {
      throw new Error(`Has-many relationship '${relationshipName}' not found`);
    }

    const loader = this.getOrCreateLoader(relationship.target, relationship.foreignKey);
    const localKey = relationship.localKey || 'id';
    const foreignKeyValue = record[localKey];

    if (!foreignKeyValue) {
      return [];
    }

    const results = await loader.load(foreignKeyValue);
    return Array.isArray(results) ? results : results ? [results] : [];
  }

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
  async loadBelongsTo(relationshipName: string, record: any): Promise<any | undefined> {
    const relationship = this.schema.relationships?.[relationshipName] as BelongsToRelationship;
    if (!relationship || relationship.type !== 'belongsTo') {
      throw new Error(`Belongs-to relationship '${relationshipName}' not found`);
    }

    const loader = this.getOrCreateLoader(relationship.target, 'id');
    const foreignKeyValue = record[relationship.foreignKey];

    if (!foreignKeyValue) {
      return undefined;
    }

    const results = await loader.load(foreignKeyValue);
    return Array.isArray(results) ? results[0] : results;
  }

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
  async loadManyToMany(relationshipName: string, record: any): Promise<any[]> {
    const relationship = this.schema.relationships?.[relationshipName] as ManyToManyRelationship;
    if (!relationship || relationship.type !== 'manyToMany') {
      throw new Error(`Many-to-many relationship '${relationshipName}' not found`);
    }

    // Load through join table
    const throughLoader = this.getOrCreateLoader(
      relationship.through,
      relationship.foreignKey || `${this.schema.name.toLowerCase()}Id`
    );

    const foreignKeyValue = record.id;
    if (!foreignKeyValue) {
      return [];
    }

    const joinRecords = await throughLoader.load(foreignKeyValue);
    const joinArray = Array.isArray(joinRecords) ? joinRecords : joinRecords ? [joinRecords] : [];

    if (joinArray.length === 0) {
      return [];
    }

    // Load target records
    const targetLoader = this.getOrCreateLoader(relationship.target, 'id');
    const targetKey = relationship.targetKey || `${relationship.target.toLowerCase()}Id`;
    const targetIds = joinArray.map((join: any) => join[targetKey]).filter(Boolean);

    if (targetIds.length === 0) {
      return [];
    }

    const targetRecords = await targetLoader.loadMany(targetIds);
    return targetRecords.filter(Boolean).flat();
  }

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
  async loadPolymorphic(relationshipName: string, record: any): Promise<any | undefined> {
    const relationship = this.schema.relationships?.[relationshipName] as PolymorphicRelationship;
    if (!relationship || relationship.type !== 'polymorphic') {
      throw new Error(`Polymorphic relationship '${relationshipName}' not found`);
    }

    const typeValue = record[relationship.typeField];
    const foreignKeyValue = record[relationship.foreignKey];

    if (!typeValue || !foreignKeyValue) {
      return undefined;
    }

    // Find matching target type
    const targetSchema = relationship.targets.find(
      target => target.toLowerCase() === typeValue.toLowerCase()
    );

    if (!targetSchema) {
      return undefined;
    }

    const loader = this.getOrCreateLoader(targetSchema, 'id');
    const results = await loader.load(foreignKeyValue);
    return Array.isArray(results) ? results[0] : results;
  }

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
  async load(relationshipName: string, record: any): Promise<any> {
    const relationship = this.schema.relationships?.[relationshipName];
    if (!relationship) {
      throw new Error(`Relationship '${relationshipName}' not found`);
    }

    switch (relationship.type) {
      case 'hasOne':
        return this.loadHasOne(relationshipName, record);
      case 'hasMany':
        return this.loadHasMany(relationshipName, record);
      case 'belongsTo':
        return this.loadBelongsTo(relationshipName, record);
      case 'manyToMany':
        return this.loadManyToMany(relationshipName, record);
      case 'polymorphic':
        return this.loadPolymorphic(relationshipName, record);
      default:
        throw new Error(`Unknown relationship type: ${(relationship as any).type}`);
    }
  }

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
  async loadMany(relationshipNames: string[], record: any): Promise<any> {
    const result = { ...record };

    await Promise.all(
      relationshipNames.map(async name => {
        result[name] = await this.load(name, record);
      })
    );

    return result;
  }

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
  async loadManyForRecords(relationshipNames: string[], records: any[]): Promise<any[]> {
    return Promise.all(records.map(record => this.loadMany(relationshipNames, record)));
  }

  /**
   * Clear all loader caches.
   */
  clearCache(): void {
    for (const loader of this.loaders.values()) {
      loader.clearCache();
    }
  }

  /**
   * Get or create a batch loader for a relationship.
   */
  private getOrCreateLoader(targetSchema: string, foreignKey: string): BatchLoader<any, any> {
    const loaderKey = `${targetSchema}:${foreignKey}`;
    let loader = this.loaders.get(loaderKey);

    if (!loader) {
      // Create default loader function
      const loaderFn: DataLoaderFn<any, any> = async (keys: any[]) => {
        // Placeholder - actual implementation would query database
        console.warn(
          `No custom loader provided for ${targetSchema}.${foreignKey}, returning empty results`
        );
        return new Map();
      };

      loader = new BatchLoader(loaderFn, this.context.batchOptions);
      this.loaders.set(loaderKey, loader);
    }

    return loader;
  }

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
  registerLoader(
    targetSchema: string,
    foreignKey: string,
    loaderFn: DataLoaderFn<any, any>
  ): void {
    const loaderKey = `${targetSchema}:${foreignKey}`;
    const loader = new BatchLoader(loaderFn, this.context.batchOptions);
    this.loaders.set(loaderKey, loader);
  }
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
export function createRelationshipLoader<TSchema extends SchemaDefinition<any>>(
  schema: TSchema,
  context: RelationshipLoaderContext
): RelationshipLoader<TSchema> {
  return new RelationshipLoader(schema, context);
}
