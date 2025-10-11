"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkHeaderBuilder = void 0;
exports.offsetPagination = offsetPagination;
exports.cursorPagination = cursorPagination;
exports.pagePagination = pagePagination;
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
function offsetPagination(config) {
    return new OffsetPaginationHelper(config);
}
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
function cursorPagination(config) {
    return new CursorPaginationHelper(config);
}
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
function pagePagination(config) {
    return new PagePaginationHelper(config);
}
/**
 * Offset-based pagination helper implementation
 */
class OffsetPaginationHelper {
    constructor(config) {
        this.config = config;
    }
    addToOperation(operation) {
        const queryProperties = {
            ...operation.queryParameters?.schema.properties,
            offset: {
                type: 'integer',
                minimum: 0,
                default: 0,
                description: 'Number of items to skip before starting to collect the result set',
                example: 0,
            },
            limit: {
                type: 'integer',
                minimum: 1,
                maximum: this.config.maxPageSize,
                default: this.config.defaultPageSize,
                description: 'Maximum number of items to return',
                example: this.config.defaultPageSize,
            },
        };
        return {
            ...operation,
            queryParameters: {
                ...operation.queryParameters,
                schema: {
                    ...operation.queryParameters?.schema,
                    type: 'object',
                    properties: queryProperties,
                },
            },
        };
    }
    generateLinkHeader(currentUrl, totalCount) {
        const url = new URL(currentUrl);
        const offset = parseInt(url.searchParams.get('offset') || '0', 10);
        const limit = parseInt(url.searchParams.get('limit') || this.config.defaultPageSize.toString(), 10);
        const links = [];
        // Previous link
        if (offset > 0) {
            const prevOffset = Math.max(0, offset - limit);
            url.searchParams.set('offset', prevOffset.toString());
            url.searchParams.set('limit', limit.toString());
            links.push(`<${url.toString()}>; rel="prev"`);
        }
        // Next link
        if (!totalCount || offset + limit < totalCount) {
            const nextOffset = offset + limit;
            url.searchParams.set('offset', nextOffset.toString());
            url.searchParams.set('limit', limit.toString());
            links.push(`<${url.toString()}>; rel="next"`);
        }
        // First link
        url.searchParams.set('offset', '0');
        url.searchParams.set('limit', limit.toString());
        links.push(`<${url.toString()}>; rel="first"`);
        // Last link (if total count is known)
        if (totalCount !== undefined) {
            const lastOffset = Math.max(0, Math.floor((totalCount - 1) / limit) * limit);
            url.searchParams.set('offset', lastOffset.toString());
            url.searchParams.set('limit', limit.toString());
            links.push(`<${url.toString()}>; rel="last"`);
        }
        return links.join(', ');
    }
    generateMetadata(items, totalCount) {
        // In practice, offset and limit would come from request context
        // This is a simplified version
        const offset = 0;
        const limit = this.config.defaultPageSize;
        const pageSize = items.length;
        return {
            offset,
            limit,
            pageSize,
            totalCount: this.config.includeTotalCount ? totalCount : undefined,
            hasNextPage: totalCount !== undefined ? offset + limit < totalCount : pageSize === limit,
            hasPreviousPage: offset > 0,
        };
    }
    createResponseSchema(itemSchema) {
        const metadataProperties = {
            offset: {
                type: 'integer',
                description: 'Number of items skipped',
            },
            limit: {
                type: 'integer',
                description: 'Maximum number of items requested',
            },
            pageSize: {
                type: 'integer',
                description: 'Actual number of items in current result set',
            },
            hasNextPage: {
                type: 'boolean',
                description: 'Indicates if there are more items available',
            },
            hasPreviousPage: {
                type: 'boolean',
                description: 'Indicates if there are previous items available',
            },
        };
        if (this.config.includeTotalCount) {
            metadataProperties.totalCount = {
                type: 'integer',
                description: 'Total number of items across all pages',
            };
        }
        return {
            type: 'object',
            required: ['data', 'metadata'],
            properties: {
                data: {
                    type: 'array',
                    items: itemSchema,
                    description: 'Array of items in the current result set',
                },
                metadata: {
                    type: 'object',
                    required: ['offset', 'limit', 'pageSize', 'hasNextPage', 'hasPreviousPage'],
                    properties: metadataProperties,
                },
            },
        };
    }
}
/**
 * Cursor-based pagination helper implementation
 */
class CursorPaginationHelper {
    constructor(config) {
        this.config = config;
    }
    addToOperation(operation) {
        const queryProperties = {
            ...operation.queryParameters?.schema.properties,
            cursor: {
                type: 'string',
                description: 'Pagination cursor for the next page of results',
                example: 'eyJpZCI6MTIzfQ==',
            },
            limit: {
                type: 'integer',
                minimum: 1,
                maximum: this.config.maxPageSize,
                default: this.config.defaultPageSize,
                description: 'Maximum number of items to return',
                example: this.config.defaultPageSize,
            },
        };
        return {
            ...operation,
            queryParameters: {
                ...operation.queryParameters,
                schema: {
                    ...operation.queryParameters?.schema,
                    type: 'object',
                    properties: queryProperties,
                },
            },
        };
    }
    generateLinkHeader(currentUrl, totalCount) {
        const url = new URL(currentUrl);
        const links = [];
        // For cursor-based pagination, we need the cursors from the response
        // This is a simplified version - in practice, you'd get these from metadata
        const nextCursor = url.searchParams.get('nextCursor');
        const prevCursor = url.searchParams.get('prevCursor');
        const limit = url.searchParams.get('limit') || this.config.defaultPageSize.toString();
        if (prevCursor) {
            url.searchParams.set('cursor', prevCursor);
            url.searchParams.set('limit', limit);
            links.push(`<${url.toString()}>; rel="prev"`);
        }
        if (nextCursor) {
            url.searchParams.set('cursor', nextCursor);
            url.searchParams.set('limit', limit);
            links.push(`<${url.toString()}>; rel="next"`);
        }
        return links.join(', ');
    }
    generateMetadata(items, totalCount) {
        const pageSize = items.length;
        const limit = this.config.defaultPageSize;
        // In practice, cursors would be generated based on the items
        const nextCursor = pageSize === limit ? this.encodeCursor({ hasMore: true }) : undefined;
        const previousCursor = undefined; // Would need to track this
        return {
            pageSize,
            totalCount: this.config.includeTotalCount ? totalCount : undefined,
            hasNextPage: pageSize === limit,
            hasPreviousPage: false, // Would need request context to determine
            nextCursor,
            previousCursor,
        };
    }
    createResponseSchema(itemSchema) {
        const metadataProperties = {
            pageSize: {
                type: 'integer',
                description: 'Number of items in current page',
            },
            hasNextPage: {
                type: 'boolean',
                description: 'Indicates if there is a next page',
            },
            hasPreviousPage: {
                type: 'boolean',
                description: 'Indicates if there is a previous page',
            },
            nextCursor: {
                type: 'string',
                nullable: true,
                description: 'Cursor for the next page',
            },
            previousCursor: {
                type: 'string',
                nullable: true,
                description: 'Cursor for the previous page',
            },
        };
        if (this.config.includeTotalCount) {
            metadataProperties.totalCount = {
                type: 'integer',
                nullable: true,
                description: 'Total number of items (if available)',
            };
        }
        return {
            type: 'object',
            required: ['data', 'metadata'],
            properties: {
                data: {
                    type: 'array',
                    items: itemSchema,
                    description: 'Array of items in the current page',
                },
                metadata: {
                    type: 'object',
                    required: ['pageSize', 'hasNextPage', 'hasPreviousPage'],
                    properties: metadataProperties,
                },
            },
        };
    }
    encodeCursor(data) {
        if (this.config.cursorEncoding === 'base64') {
            return Buffer.from(JSON.stringify(data)).toString('base64');
        }
        // Opaque encoding - in practice, this might be a token or ID
        return JSON.stringify(data);
    }
    decodeCursor(cursor) {
        if (this.config.cursorEncoding === 'base64') {
            return JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
        }
        return JSON.parse(cursor);
    }
}
/**
 * Page-based pagination helper implementation
 */
class PagePaginationHelper {
    constructor(config) {
        this.config = config;
    }
    addToOperation(operation) {
        const queryProperties = {
            ...operation.queryParameters?.schema.properties,
            page: {
                type: 'integer',
                minimum: 1,
                default: 1,
                description: 'Page number to retrieve (1-indexed)',
                example: 1,
            },
            pageSize: {
                type: 'integer',
                minimum: 1,
                maximum: this.config.maxPageSize,
                default: this.config.defaultPageSize,
                description: 'Number of items per page',
                example: this.config.defaultPageSize,
            },
        };
        return {
            ...operation,
            queryParameters: {
                ...operation.queryParameters,
                schema: {
                    ...operation.queryParameters?.schema,
                    type: 'object',
                    properties: queryProperties,
                },
            },
        };
    }
    generateLinkHeader(currentUrl, totalCount) {
        const url = new URL(currentUrl);
        const page = parseInt(url.searchParams.get('page') || '1', 10);
        const pageSize = parseInt(url.searchParams.get('pageSize') || this.config.defaultPageSize.toString(), 10);
        const links = [];
        // First link
        url.searchParams.set('page', '1');
        url.searchParams.set('pageSize', pageSize.toString());
        links.push(`<${url.toString()}>; rel="first"`);
        // Previous link
        if (page > 1) {
            url.searchParams.set('page', (page - 1).toString());
            url.searchParams.set('pageSize', pageSize.toString());
            links.push(`<${url.toString()}>; rel="prev"`);
        }
        // Next link
        const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : undefined;
        if (!totalPages || page < totalPages) {
            url.searchParams.set('page', (page + 1).toString());
            url.searchParams.set('pageSize', pageSize.toString());
            links.push(`<${url.toString()}>; rel="next"`);
        }
        // Last link (if total count is known)
        if (totalPages) {
            url.searchParams.set('page', totalPages.toString());
            url.searchParams.set('pageSize', pageSize.toString());
            links.push(`<${url.toString()}>; rel="last"`);
        }
        return links.join(', ');
    }
    generateMetadata(items, totalCount) {
        // In practice, page and pageSize would come from request context
        const currentPage = 1;
        const pageSize = items.length;
        const totalPages = totalCount
            ? Math.ceil(totalCount / this.config.defaultPageSize)
            : undefined;
        return {
            currentPage,
            pageSize,
            totalCount: this.config.includeTotalCount ? totalCount : undefined,
            totalPages: this.config.includeTotalCount ? totalPages : undefined,
            hasNextPage: totalPages !== undefined ? currentPage < totalPages : pageSize === this.config.defaultPageSize,
            hasPreviousPage: currentPage > 1,
        };
    }
    createResponseSchema(itemSchema) {
        const metadataProperties = {
            currentPage: {
                type: 'integer',
                description: 'Current page number (1-indexed)',
                minimum: 1,
                example: 1,
            },
            pageSize: {
                type: 'integer',
                description: 'Number of items in current page',
            },
            hasNextPage: {
                type: 'boolean',
                description: 'Indicates if there is a next page',
            },
            hasPreviousPage: {
                type: 'boolean',
                description: 'Indicates if there is a previous page',
            },
        };
        if (this.config.includeTotalCount) {
            metadataProperties.totalCount = {
                type: 'integer',
                description: 'Total number of items across all pages',
            };
            metadataProperties.totalPages = {
                type: 'integer',
                description: 'Total number of pages',
            };
        }
        return {
            type: 'object',
            required: ['data', 'metadata'],
            properties: {
                data: {
                    type: 'array',
                    items: itemSchema,
                    description: 'Array of items in the current page',
                },
                metadata: {
                    type: 'object',
                    required: ['currentPage', 'pageSize', 'hasNextPage', 'hasPreviousPage'],
                    properties: metadataProperties,
                },
            },
        };
    }
}
/**
 * RFC 8288 Link Header Builder
 *
 * Utility for building RFC 8288 compliant Link headers for pagination.
 */
class LinkHeaderBuilder {
    constructor() {
        this.links = [];
    }
    /**
     * Adds a link relation
     *
     * @param url - URL for the link
     * @param rel - Relation type (first, prev, next, last)
     * @param params - Additional link parameters
     * @returns This builder for chaining
     */
    add(url, rel, params) {
        this.links.push({ url, rel, params });
        return this;
    }
    /**
     * Builds the Link header value
     *
     * @returns RFC 8288 compliant Link header value
     */
    build() {
        return this.links
            .map(link => {
            let result = `<${link.url}>; rel="${link.rel}"`;
            if (link.params) {
                for (const [key, value] of Object.entries(link.params)) {
                    result += `; ${key}="${value}"`;
                }
            }
            return result;
        })
            .join(', ');
    }
    /**
     * Clears all links
     */
    clear() {
        this.links = [];
        return this;
    }
}
exports.LinkHeaderBuilder = LinkHeaderBuilder;
