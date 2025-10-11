/**
 * Pagination Patterns
 *
 * Provides comprehensive pagination support following REST best practices
 * and ADR-015 specifications.
 *
 * Supports:
 * - Offset-based pagination (?offset=20&limit=10)
 * - Cursor-based pagination (?cursor=abc123&limit=10)
 * - Page-based pagination (?page=2&pageSize=20)
 * - RFC 8288 Link header generation
 *
 * @see ADR-015 REST Advanced Features - Section 2
 */
import type { IRestOperation, JsonSchema } from '../operation';
/**
 * Pagination strategy types
 */
export type PaginationStrategy = 'offset' | 'cursor' | 'page' | 'link';
/**
 * Pagination configuration
 */
export interface PaginationConfig<T extends PaginationStrategy = PaginationStrategy> {
    readonly strategy: T;
    readonly defaultPageSize: number;
    readonly maxPageSize: number;
    readonly includeTotalCount?: boolean;
    readonly cursorEncoding?: 'base64' | 'opaque';
}
/**
 * Base pagination parameters
 */
export interface BasePaginationParams {
    readonly limit?: number;
}
/**
 * Offset-based pagination parameters
 */
export interface OffsetPaginationParams extends BasePaginationParams {
    readonly offset?: number;
}
/**
 * Cursor-based pagination parameters
 */
export interface CursorPaginationParams extends BasePaginationParams {
    readonly cursor?: string;
}
/**
 * Page-based pagination parameters
 */
export interface PagePaginationParams {
    readonly page?: number;
    readonly pageSize?: number;
}
/**
 * Base pagination metadata
 */
export interface PaginationMetadata {
    readonly totalCount?: number;
    readonly hasNextPage: boolean;
    readonly hasPreviousPage: boolean;
    readonly pageSize: number;
}
/**
 * Offset pagination metadata
 */
export interface OffsetPaginationMetadata extends PaginationMetadata {
    readonly offset: number;
    readonly limit: number;
}
/**
 * Cursor pagination metadata
 */
export interface CursorPaginationMetadata extends PaginationMetadata {
    readonly nextCursor?: string;
    readonly previousCursor?: string;
}
/**
 * Page pagination metadata
 */
export interface PagePaginationMetadata extends PaginationMetadata {
    readonly currentPage: number;
    readonly totalPages?: number;
}
/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T, M extends PaginationMetadata = PaginationMetadata> {
    readonly data: readonly T[];
    readonly metadata: M;
}
/**
 * Configuration for offset-based pagination
 */
export interface OffsetPaginationConfig extends PaginationConfig<'offset'> {
    readonly strategy: 'offset';
}
/**
 * Configuration for cursor-based pagination
 */
export interface CursorPaginationConfig extends PaginationConfig<'cursor'> {
    readonly strategy: 'cursor';
    readonly cursorEncoding?: 'base64' | 'opaque';
}
/**
 * Configuration for page-based pagination
 */
export interface PagePaginationConfig extends PaginationConfig<'page'> {
    readonly strategy: 'page';
}
/**
 * Pagination helper interface
 */
export interface PaginationHelper<T> {
    /**
     * Adds pagination parameters to operation
     */
    addToOperation(operation: IRestOperation): IRestOperation;
    /**
     * Generates RFC 8288 Link headers
     */
    generateLinkHeader(currentUrl: string, total?: number): string;
    /**
     * Generates response metadata
     */
    generateMetadata(items: readonly T[], totalCount?: number): PaginationMetadata;
    /**
     * Creates paginated response schema
     */
    createResponseSchema(itemSchema: JsonSchema<T>): JsonSchema;
}
/**
 * Creates offset-based pagination helper
 *
 * @param config - Offset pagination configuration
 * @returns Pagination helper for offset-based pagination
 *
 * @example
 * ```typescript
 * const helper = offsetPagination<User>({
 *   strategy: 'offset',
 *   defaultPageSize: 20,
 *   maxPageSize: 100,
 *   includeTotalCount: true
 * });
 *
 * const operation = helper.addToOperation(baseOperation);
 * ```
 */
export declare function offsetPagination<T>(config: OffsetPaginationConfig): PaginationHelper<T>;
/**
 * Creates cursor-based pagination helper
 *
 * @param config - Cursor pagination configuration
 * @returns Pagination helper for cursor-based pagination
 *
 * @example
 * ```typescript
 * const helper = cursorPagination<User>({
 *   strategy: 'cursor',
 *   defaultPageSize: 20,
 *   maxPageSize: 100,
 *   cursorEncoding: 'base64'
 * });
 * ```
 */
export declare function cursorPagination<T>(config: CursorPaginationConfig): PaginationHelper<T>;
/**
 * Creates page-based pagination helper
 *
 * @param config - Page pagination configuration
 * @returns Pagination helper for page-based pagination
 *
 * @example
 * ```typescript
 * const helper = pagePagination<User>({
 *   strategy: 'page',
 *   defaultPageSize: 20,
 *   maxPageSize: 100,
 *   includeTotalCount: true
 * });
 * ```
 */
export declare function pagePagination<T>(config: PagePaginationConfig): PaginationHelper<T>;
/**
 * RFC 8288 Link Header Builder
 *
 * Utility for building RFC 8288 compliant Link headers for pagination.
 */
export declare class LinkHeaderBuilder {
    private links;
    /**
     * Adds a link relation
     *
     * @param url - URL for the link
     * @param rel - Relation type (first, prev, next, last)
     * @param params - Additional link parameters
     * @returns This builder for chaining
     */
    add(url: string, rel: string, params?: Record<string, string>): this;
    /**
     * Builds the Link header value
     *
     * @returns RFC 8288 compliant Link header value
     */
    build(): string;
    /**
     * Clears all links
     */
    clear(): this;
}
//# sourceMappingURL=pagination.d.ts.map