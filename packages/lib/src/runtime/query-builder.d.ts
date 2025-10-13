/**
 * Type-safe query builder for Atakora schemas.
 *
 * @remarks
 * Provides a fluent API for building queries with type safety,
 * relationship loading, filtering, pagination, and sorting.
 *
 * @packageDocumentation
 */
import type { SchemaDefinition, InferSchemaType, AuthorizationContext } from '../schema/atakora/schema-types';
/**
 * Filter operators for query building.
 */
export type FilterOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'notIn' | 'contains' | 'startsWith' | 'endsWith' | 'between' | 'isNull' | 'isNotNull';
/**
 * Filter condition.
 */
export interface FilterCondition<T = any> {
    field: string;
    operator: FilterOperator;
    value?: T;
}
/**
 * Logical filter group.
 */
export interface FilterGroup {
    and?: Filter[];
    or?: Filter[];
    not?: Filter;
}
/**
 * Filter type (condition or group).
 */
export type Filter = FilterCondition | FilterGroup;
/**
 * Sort direction.
 */
export type SortDirection = 'asc' | 'desc';
/**
 * Sort specification.
 */
export interface SortSpec {
    field: string;
    direction: SortDirection;
}
/**
 * Pagination options.
 */
export interface PaginationOptions {
    limit?: number;
    offset?: number;
    cursor?: string;
}
/**
 * Query options.
 */
export interface QueryOptions {
    filters?: Filter[];
    sort?: SortSpec[];
    pagination?: PaginationOptions;
    include?: string[];
    select?: string[];
    authContext?: AuthorizationContext;
}
/**
 * Query result with pagination metadata.
 */
export interface QueryResult<T> {
    data: T[];
    total: number;
    hasMore: boolean;
    cursor?: string;
}
/**
 * GraphQL query string result.
 */
export interface GraphQLQuery {
    query: string;
    variables: Record<string, any>;
}
/**
 * Type-safe query builder for a schema.
 */
export declare class QueryBuilder<TSchema extends SchemaDefinition<any>> {
    private schema;
    private schemaRegistry?;
    private options;
    constructor(schema: TSchema, schemaRegistry?: Map<string, SchemaDefinition<any>>);
    /**
     * Get a single record by ID.
     *
     * @param id - Record ID
     * @returns Query builder for chaining
     *
     * @example
     * ```typescript
     * const user = await userQuery.get('user-123').execute();
     * ```
     */
    get(id: string): QueryBuilder<TSchema>;
    /**
     * List all records with optional filtering.
     *
     * @param options - List options
     * @returns Query builder for chaining
     *
     * @example
     * ```typescript
     * const posts = await postQuery.list({ limit: 10 }).execute();
     * ```
     */
    list(options?: {
        limit?: number;
        offset?: number;
    }): QueryBuilder<TSchema>;
    /**
     * Add filter conditions.
     *
     * @param field - Field name
     * @param operator - Filter operator
     * @param value - Filter value
     * @returns Query builder for chaining
     *
     * @example
     * ```typescript
     * const posts = await postQuery
     *   .where('status', 'eq', 'published')
     *   .where('viewCount', 'gt', 1000)
     *   .execute();
     * ```
     */
    where<K extends keyof InferSchemaType<TSchema>>(field: K, operator: FilterOperator, value?: any): QueryBuilder<TSchema>;
    /**
     * Add AND filter group.
     *
     * @param filters - Filter conditions
     * @returns Query builder for chaining
     *
     * @example
     * ```typescript
     * const posts = await postQuery
     *   .and([
     *     { field: 'status', operator: 'eq', value: 'published' },
     *     { field: 'featured', operator: 'eq', value: true }
     *   ])
     *   .execute();
     * ```
     */
    and(filters: Filter[]): QueryBuilder<TSchema>;
    /**
     * Add OR filter group.
     *
     * @param filters - Filter conditions
     * @returns Query builder for chaining
     *
     * @example
     * ```typescript
     * const posts = await postQuery
     *   .or([
     *     { field: 'status', operator: 'eq', value: 'published' },
     *     { field: 'status', operator: 'eq', value: 'archived' }
     *   ])
     *   .execute();
     * ```
     */
    or(filters: Filter[]): QueryBuilder<TSchema>;
    /**
     * Include related entities.
     *
     * @param relationships - Relationship names to include
     * @returns Query builder for chaining
     *
     * @example
     * ```typescript
     * const posts = await postQuery
     *   .include('author', 'comments')
     *   .execute();
     * ```
     */
    include(...relationships: string[]): QueryBuilder<TSchema>;
    /**
     * Select specific fields.
     *
     * @param fields - Field names to select
     * @returns Query builder for chaining
     *
     * @example
     * ```typescript
     * const posts = await postQuery
     *   .select('id', 'title', 'excerpt')
     *   .execute();
     * ```
     */
    select<K extends keyof InferSchemaType<TSchema>>(...fields: K[]): QueryBuilder<TSchema>;
    /**
     * Add sorting.
     *
     * @param field - Field to sort by
     * @param direction - Sort direction
     * @returns Query builder for chaining
     *
     * @example
     * ```typescript
     * const posts = await postQuery
     *   .orderBy('publishedAt', 'desc')
     *   .orderBy('title', 'asc')
     *   .execute();
     * ```
     */
    orderBy<K extends keyof InferSchemaType<TSchema>>(field: K, direction?: SortDirection): QueryBuilder<TSchema>;
    /**
     * Set pagination limit.
     *
     * @param limit - Maximum number of records
     * @returns Query builder for chaining
     *
     * @example
     * ```typescript
     * const posts = await postQuery.limit(10).execute();
     * ```
     */
    limit(limit: number): QueryBuilder<TSchema>;
    /**
     * Set pagination offset.
     *
     * @param offset - Number of records to skip
     * @returns Query builder for chaining
     *
     * @example
     * ```typescript
     * const posts = await postQuery.offset(20).limit(10).execute();
     * ```
     */
    offset(offset: number): QueryBuilder<TSchema>;
    /**
     * Set cursor-based pagination.
     *
     * @param cursor - Pagination cursor
     * @returns Query builder for chaining
     *
     * @example
     * ```typescript
     * const posts = await postQuery.cursor('next-page-token').execute();
     * ```
     */
    cursor(cursor: string): QueryBuilder<TSchema>;
    /**
     * Set authorization context.
     *
     * @param context - Authorization context
     * @returns Query builder for chaining
     *
     * @example
     * ```typescript
     * const posts = await postQuery
     *   .withAuth({ user: currentUser, operation: 'read' })
     *   .execute();
     * ```
     */
    withAuth(context: AuthorizationContext): QueryBuilder<TSchema>;
    /**
     * Generate GraphQL query string.
     *
     * @returns GraphQL query and variables
     *
     * @example
     * ```typescript
     * const { query, variables } = postQuery
     *   .where('status', 'eq', 'published')
     *   .toGraphQL();
     * ```
     */
    toGraphQL(): GraphQLQuery;
    /**
     * Build field selection for GraphQL.
     */
    private buildFieldSelection;
    /**
     * Build filter arguments for GraphQL.
     */
    private buildFilterArgs;
    /**
     * Build variable definitions for GraphQL.
     */
    private buildVariableDefinitions;
    /**
     * Build variables object for GraphQL.
     */
    private buildVariables;
    /**
     * Serialize filters to GraphQL format.
     */
    private serializeFilters;
    /**
     * Serialize a single filter.
     */
    private serializeFilter;
    /**
     * Execute the query (placeholder - actual implementation would call API).
     *
     * @returns Query result
     *
     * @example
     * ```typescript
     * const result = await postQuery
     *   .where('status', 'eq', 'published')
     *   .orderBy('publishedAt', 'desc')
     *   .limit(10)
     *   .execute();
     * ```
     */
    execute(): Promise<QueryResult<InferSchemaType<TSchema>>>;
    /**
     * Get current query options.
     *
     * @returns Query options
     */
    getOptions(): QueryOptions;
    /**
     * Clone the query builder.
     *
     * @returns New query builder with same options
     */
    clone(): QueryBuilder<TSchema>;
}
/**
 * Create a query builder for a schema.
 *
 * @param schema - Schema definition
 * @param registry - Optional schema registry for relationship resolution
 * @returns Query builder instance
 *
 * @example
 * ```typescript
 * const postQuery = createQueryBuilder(PostSchema);
 * const result = await postQuery
 *   .where('status', 'eq', 'published')
 *   .include('author', 'comments')
 *   .orderBy('publishedAt', 'desc')
 *   .limit(10)
 *   .execute();
 * ```
 */
export declare function createQueryBuilder<TSchema extends SchemaDefinition<any>>(schema: TSchema, registry?: Map<string, SchemaDefinition<any>>): QueryBuilder<TSchema>;
//# sourceMappingURL=query-builder.d.ts.map