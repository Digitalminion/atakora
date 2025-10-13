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
export type FilterOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'notIn'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'between'
  | 'isNull'
  | 'isNotNull';

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
export class QueryBuilder<TSchema extends SchemaDefinition<any>> {
  private options: QueryOptions = {};

  constructor(
    private schema: TSchema,
    private schemaRegistry?: Map<string, SchemaDefinition<any>>
  ) {}

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
  get(id: string): QueryBuilder<TSchema> {
    this.options.filters = [
      {
        field: 'id',
        operator: 'eq',
        value: id,
      },
    ];
    this.options.pagination = { limit: 1 };
    return this;
  }

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
  list(options?: { limit?: number; offset?: number }): QueryBuilder<TSchema> {
    if (options) {
      this.options.pagination = {
        ...this.options.pagination,
        ...options,
      };
    }
    return this;
  }

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
  where<K extends keyof InferSchemaType<TSchema>>(
    field: K,
    operator: FilterOperator,
    value?: any
  ): QueryBuilder<TSchema> {
    if (!this.options.filters) {
      this.options.filters = [];
    }

    this.options.filters.push({
      field: field as string,
      operator,
      value,
    });

    return this;
  }

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
  and(filters: Filter[]): QueryBuilder<TSchema> {
    if (!this.options.filters) {
      this.options.filters = [];
    }

    this.options.filters.push({
      and: filters,
    });

    return this;
  }

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
  or(filters: Filter[]): QueryBuilder<TSchema> {
    if (!this.options.filters) {
      this.options.filters = [];
    }

    this.options.filters.push({
      or: filters,
    });

    return this;
  }

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
  include(...relationships: string[]): QueryBuilder<TSchema> {
    if (!this.options.include) {
      this.options.include = [];
    }

    this.options.include.push(...relationships);
    return this;
  }

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
  select<K extends keyof InferSchemaType<TSchema>>(...fields: K[]): QueryBuilder<TSchema> {
    this.options.select = fields as string[];
    return this;
  }

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
  orderBy<K extends keyof InferSchemaType<TSchema>>(
    field: K,
    direction: SortDirection = 'asc'
  ): QueryBuilder<TSchema> {
    if (!this.options.sort) {
      this.options.sort = [];
    }

    this.options.sort.push({
      field: field as string,
      direction,
    });

    return this;
  }

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
  limit(limit: number): QueryBuilder<TSchema> {
    if (!this.options.pagination) {
      this.options.pagination = {};
    }
    this.options.pagination.limit = limit;
    return this;
  }

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
  offset(offset: number): QueryBuilder<TSchema> {
    if (!this.options.pagination) {
      this.options.pagination = {};
    }
    this.options.pagination.offset = offset;
    return this;
  }

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
  cursor(cursor: string): QueryBuilder<TSchema> {
    if (!this.options.pagination) {
      this.options.pagination = {};
    }
    this.options.pagination.cursor = cursor;
    return this;
  }

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
  withAuth(context: AuthorizationContext): QueryBuilder<TSchema> {
    this.options.authContext = context;
    return this;
  }

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
  toGraphQL(): GraphQLQuery {
    const entityName = this.schema.name;
    const operationName = this.options.filters?.some(f => 'field' in f && f.field === 'id')
      ? `get${entityName}`
      : `list${entityName}s`;

    // Build field selection
    const fields = this.buildFieldSelection();

    // Build filter arguments
    const filterArgs = this.buildFilterArgs();

    // Build query
    const query = `
      query ${operationName}${this.buildVariableDefinitions()} {
        ${operationName.charAt(0).toLowerCase() + operationName.slice(1)}${filterArgs} {
          ${fields}
        }
      }
    `.trim();

    const variables = this.buildVariables();

    return { query, variables };
  }

  /**
   * Build field selection for GraphQL.
   */
  private buildFieldSelection(): string {
    const fields: string[] = [];

    // Add selected fields or all schema fields
    if (this.options.select && this.options.select.length > 0) {
      fields.push(...this.options.select);
    } else {
      // Get all field names from schema
      const shape = this.schema.fields.shape;
      fields.push(...Object.keys(shape));
    }

    // Add included relationships
    if (this.options.include && this.options.include.length > 0) {
      for (const rel of this.options.include) {
        const relationship = this.schema.relationships?.[rel];
        if (relationship) {
          const targetSchema = this.schemaRegistry?.get(
            'target' in relationship ? relationship.target : ''
          );
          if (targetSchema) {
            const targetFields = Object.keys(targetSchema.fields.shape);
            fields.push(`${rel} { ${targetFields.join(' ')} }`);
          } else {
            fields.push(`${rel} { id }`);
          }
        }
      }
    }

    return fields.join('\n');
  }

  /**
   * Build filter arguments for GraphQL.
   */
  private buildFilterArgs(): string {
    const args: string[] = [];

    if (this.options.filters && this.options.filters.length > 0) {
      args.push('filter: $filter');
    }

    if (this.options.sort && this.options.sort.length > 0) {
      args.push('sort: $sort');
    }

    if (this.options.pagination) {
      if (this.options.pagination.limit !== undefined) {
        args.push('limit: $limit');
      }
      if (this.options.pagination.offset !== undefined) {
        args.push('offset: $offset');
      }
      if (this.options.pagination.cursor) {
        args.push('cursor: $cursor');
      }
    }

    return args.length > 0 ? `(${args.join(', ')})` : '';
  }

  /**
   * Build variable definitions for GraphQL.
   */
  private buildVariableDefinitions(): string {
    const defs: string[] = [];

    if (this.options.filters && this.options.filters.length > 0) {
      defs.push('$filter: FilterInput');
    }

    if (this.options.sort && this.options.sort.length > 0) {
      defs.push('$sort: [SortInput!]');
    }

    if (this.options.pagination) {
      if (this.options.pagination.limit !== undefined) {
        defs.push('$limit: Int');
      }
      if (this.options.pagination.offset !== undefined) {
        defs.push('$offset: Int');
      }
      if (this.options.pagination.cursor) {
        defs.push('$cursor: String');
      }
    }

    return defs.length > 0 ? `(${defs.join(', ')})` : '';
  }

  /**
   * Build variables object for GraphQL.
   */
  private buildVariables(): Record<string, any> {
    const variables: Record<string, any> = {};

    if (this.options.filters && this.options.filters.length > 0) {
      variables.filter = this.serializeFilters(this.options.filters);
    }

    if (this.options.sort && this.options.sort.length > 0) {
      variables.sort = this.options.sort;
    }

    if (this.options.pagination) {
      if (this.options.pagination.limit !== undefined) {
        variables.limit = this.options.pagination.limit;
      }
      if (this.options.pagination.offset !== undefined) {
        variables.offset = this.options.pagination.offset;
      }
      if (this.options.pagination.cursor) {
        variables.cursor = this.options.pagination.cursor;
      }
    }

    return variables;
  }

  /**
   * Serialize filters to GraphQL format.
   */
  private serializeFilters(filters: Filter[]): any {
    if (filters.length === 1) {
      return this.serializeFilter(filters[0]);
    }

    return {
      and: filters.map(f => this.serializeFilter(f)),
    };
  }

  /**
   * Serialize a single filter.
   */
  private serializeFilter(filter: Filter): any {
    if ('and' in filter) {
      return { and: filter.and?.map(f => this.serializeFilter(f)) };
    }

    if ('or' in filter) {
      return { or: filter.or?.map(f => this.serializeFilter(f)) };
    }

    if ('not' in filter) {
      return { not: filter.not ? this.serializeFilter(filter.not) : undefined };
    }

    // Filter condition
    const condition = filter as FilterCondition;
    return {
      [condition.field]: {
        [condition.operator]: condition.value,
      },
    };
  }

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
  async execute(): Promise<QueryResult<InferSchemaType<TSchema>>> {
    // This would be implemented by the actual data provider
    // For now, return empty result
    throw new Error(
      'Query execution not implemented. Use toGraphQL() to generate query string and execute with your data provider.'
    );
  }

  /**
   * Get current query options.
   *
   * @returns Query options
   */
  getOptions(): QueryOptions {
    return this.options;
  }

  /**
   * Clone the query builder.
   *
   * @returns New query builder with same options
   */
  clone(): QueryBuilder<TSchema> {
    const cloned = new QueryBuilder(this.schema, this.schemaRegistry);
    cloned.options = JSON.parse(JSON.stringify(this.options));
    return cloned;
  }
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
export function createQueryBuilder<TSchema extends SchemaDefinition<any>>(
  schema: TSchema,
  registry?: Map<string, SchemaDefinition<any>>
): QueryBuilder<TSchema> {
  return new QueryBuilder(schema, registry);
}
