# ADR-015: REST API Advanced Features

## Context

Building on the REST API Core Architecture defined in ADR-014, we need to implement advanced features that are essential for production-ready REST APIs. These features parallel the GraphQL advanced features (ADR-012) and address requirements for versioning, pagination, caching, authentication, rate limiting, and observability.

Azure API Management provides capabilities for many of these features, but we need to design how they integrate with our TypeScript-first approach while ensuring they work seamlessly in both Government and Commercial clouds.

Current requirements:
- Multiple API versioning strategies (path, header, query, content negotiation)
- Standard pagination patterns (offset, cursor, page-based)
- Filtering, sorting, and field selection
- HTTP caching with ETag and Last-Modified support
- OAuth 2.0, OpenID Connect, and Azure AD authentication
- Fine-grained rate limiting and throttling
- Request/response validation with JSON Schema
- RFC 7807 Problem Details error handling
- HATEOAS and hypermedia support
- Batch operations and webhooks
- Comprehensive observability and tracing

## Decision

We will implement a comprehensive suite of REST API advanced features that leverage Azure services while maintaining type safety and developer ergonomics, mirroring the depth and quality of our GraphQL implementation.

### 1. API Versioning Strategies

```typescript
// API versioning configuration
export interface ApiVersioningConfig {
  readonly strategy: VersioningStrategy;
  readonly defaultVersion?: string;
  readonly deprecatedVersions?: DeprecatedVersion[];
  readonly versionFormat?: VersionFormat;
}

export type VersioningStrategy =
  | 'path'                // /v1/users, /v2/users
  | 'header'              // Api-Version: 2023-01-01
  | 'queryParameter'      // ?api-version=2
  | 'contentNegotiation'  // Accept: application/vnd.api.v2+json
  | 'custom';             // Custom extraction logic

export type VersionFormat =
  | 'numeric'       // 1, 2, 3
  | 'semver'        // 1.0.0, 2.1.0
  | 'date'          // 2023-01-01
  | 'prefixed';     // v1, v2

// Deprecated version configuration
export interface DeprecatedVersion {
  readonly version: string;
  readonly deprecatedAt: Date;
  readonly sunsetAt?: Date;
  readonly message?: string;
  readonly migrationGuide?: string;
}

// Path-based versioning
export class PathBasedVersioning implements IVersioningStrategy {
  constructor(private readonly config: PathVersioningConfig) {}

  extractVersion(request: HttpRequest): string | undefined {
    const pathMatch = request.path.match(this.config.pattern);
    return pathMatch ? pathMatch[1] : undefined;
  }

  applyVersion(operation: IRestOperation, version: string): IRestOperation {
    return {
      ...operation,
      path: `/${version}${operation.path}`
    };
  }

  generateVersionedPaths(operation: IRestOperation, versions: string[]): IRestOperation[] {
    return versions.map(version => this.applyVersion(operation, version));
  }
}

// Header-based versioning
export class HeaderBasedVersioning implements IVersioningStrategy {
  constructor(private readonly config: HeaderVersioningConfig) {}

  extractVersion(request: HttpRequest): string | undefined {
    return request.headers[this.config.headerName];
  }

  applyVersion(operation: IRestOperation, version: string): IRestOperation {
    return {
      ...operation,
      headerParameters: {
        ...operation.headerParameters,
        schema: {
          ...operation.headerParameters?.schema,
          properties: {
            ...operation.headerParameters?.schema.properties,
            [this.config.headerName]: {
              type: 'string',
              description: `API version (e.g., ${version})`,
              enum: this.config.supportedVersions,
              default: this.config.defaultVersion
            }
          }
        }
      }
    };
  }

  // Validation policy for version header
  createValidationPolicy(): IPolicy {
    return checkHeader({
      name: this.config.headerName,
      required: !this.config.defaultVersion,
      failedStatusCode: 400,
      failedErrorMessage: `Missing or invalid ${this.config.headerName} header`
    });
  }
}

// Query parameter versioning
export class QueryParameterVersioning implements IVersioningStrategy {
  constructor(private readonly config: QueryVersioningConfig) {}

  extractVersion(request: HttpRequest): string | undefined {
    return request.query[this.config.parameterName];
  }

  applyVersion(operation: IRestOperation, version: string): IRestOperation {
    return {
      ...operation,
      queryParameters: {
        ...operation.queryParameters,
        schema: {
          ...operation.queryParameters?.schema,
          properties: {
            ...operation.queryParameters?.schema.properties,
            [this.config.parameterName]: {
              type: 'string',
              description: 'API version',
              enum: this.config.supportedVersions,
              default: this.config.defaultVersion
            }
          }
        }
      }
    };
  }
}

// Content negotiation versioning
export class ContentNegotiationVersioning implements IVersioningStrategy {
  constructor(private readonly config: ContentVersioningConfig) {}

  extractVersion(request: HttpRequest): string | undefined {
    const acceptHeader = request.headers['accept'];
    if (!acceptHeader) return undefined;

    // Parse Accept header for version
    // e.g., application/vnd.api.v2+json
    const match = acceptHeader.match(/application\/vnd\.[^.]+\.v(\d+)\+json/);
    return match ? match[1] : undefined;
  }

  applyVersion(operation: IRestOperation, version: string): IRestOperation {
    // Modify response content types to include version
    const versionedResponses = { ...operation.responses };

    for (const [statusCode, response] of Object.entries(versionedResponses)) {
      if (response?.content) {
        const versionedContent: ContentTypeDefinition = {};

        for (const [contentType, mediaType] of Object.entries(response.content)) {
          if (contentType === 'application/json') {
            versionedContent[`application/vnd.api.v${version}+json`] = mediaType;
          } else {
            versionedContent[contentType] = mediaType;
          }
        }

        versionedResponses[statusCode] = {
          ...response,
          content: versionedContent
        };
      }
    }

    return {
      ...operation,
      responses: versionedResponses
    };
  }
}

// Version deprecation manager
export class VersionDeprecationManager {
  constructor(private readonly config: ApiVersioningConfig) {}

  // Check if version is deprecated
  isDeprecated(version: string): boolean {
    return this.config.deprecatedVersions?.some(v => v.version === version) || false;
  }

  // Get deprecation info
  getDeprecationInfo(version: string): DeprecatedVersion | undefined {
    return this.config.deprecatedVersions?.find(v => v.version === version);
  }

  // Create deprecation warning policy
  createDeprecationPolicy(version: string): IPolicy {
    const info = this.getDeprecationInfo(version);
    if (!info) return noop();

    return setHeader({
      name: 'Deprecation',
      value: 'true',
      existsAction: 'override'
    }).and(setHeader({
      name: 'Sunset',
      value: info.sunsetAt?.toUTCString() || '',
      existsAction: 'override'
    })).and(setHeader({
      name: 'Link',
      value: info.migrationGuide ? `<${info.migrationGuide}>; rel="deprecation"` : '',
      existsAction: 'override'
    }));
  }

  // Check if version has reached sunset
  isSunset(version: string): boolean {
    const info = this.getDeprecationInfo(version);
    if (!info?.sunsetAt) return false;

    return new Date() >= info.sunsetAt;
  }

  // Create sunset rejection policy
  createSunsetPolicy(version: string): IPolicy {
    return returnResponse({
      statusCode: 410,
      body: {
        type: 'https://httpstatuses.io/410',
        title: 'Gone',
        status: 410,
        detail: `API version ${version} has been sunset and is no longer available`,
        instance: '@request.url'
      }
    });
  }
}
```

### 2. Pagination Patterns

```typescript
// Pagination configuration
export interface PaginationConfig<T extends PaginationStrategy = PaginationStrategy> {
  readonly strategy: T;
  readonly defaultPageSize: number;
  readonly maxPageSize: number;
  readonly includeTotalCount?: boolean;
  readonly cursorEncoding?: 'base64' | 'opaque';
}

export type PaginationStrategy = 'offset' | 'cursor' | 'page' | 'link';

// Pagination parameters for different strategies
export interface OffsetPaginationParams {
  readonly offset?: number;
  readonly limit?: number;
}

export interface CursorPaginationParams {
  readonly cursor?: string;
  readonly limit?: number;
}

export interface PagePaginationParams {
  readonly page?: number;
  readonly pageSize?: number;
}

// Pagination response metadata
export interface PaginationMetadata {
  readonly totalCount?: number;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
  readonly pageSize: number;
}

// Offset-based pagination
export interface OffsetPaginationMetadata extends PaginationMetadata {
  readonly offset: number;
  readonly limit: number;
}

// Cursor-based pagination
export interface CursorPaginationMetadata extends PaginationMetadata {
  readonly nextCursor?: string;
  readonly previousCursor?: string;
}

// Page-based pagination
export interface PagePaginationMetadata extends PaginationMetadata {
  readonly currentPage: number;
  readonly totalPages?: number;
}

// Pagination helper
export class PaginationHelper {
  // Add pagination parameters to operation
  static addPaginationParams<T extends PaginationStrategy>(
    operation: IRestOperation,
    config: PaginationConfig<T>
  ): IRestOperation {
    const queryProperties = { ...operation.queryParameters?.schema.properties };

    switch (config.strategy) {
      case 'offset':
        queryProperties.offset = {
          type: 'integer',
          minimum: 0,
          default: 0,
          description: 'Number of items to skip'
        };
        queryProperties.limit = {
          type: 'integer',
          minimum: 1,
          maximum: config.maxPageSize,
          default: config.defaultPageSize,
          description: 'Maximum number of items to return'
        };
        break;

      case 'cursor':
        queryProperties.cursor = {
          type: 'string',
          description: 'Pagination cursor for next page'
        };
        queryProperties.limit = {
          type: 'integer',
          minimum: 1,
          maximum: config.maxPageSize,
          default: config.defaultPageSize,
          description: 'Maximum number of items to return'
        };
        break;

      case 'page':
        queryProperties.page = {
          type: 'integer',
          minimum: 1,
          default: 1,
          description: 'Page number'
        };
        queryProperties.pageSize = {
          type: 'integer',
          minimum: 1,
          maximum: config.maxPageSize,
          default: config.defaultPageSize,
          description: 'Number of items per page'
        };
        break;
    }

    return {
      ...operation,
      queryParameters: {
        ...operation.queryParameters,
        schema: {
          ...operation.queryParameters?.schema,
          properties: queryProperties
        }
      }
    };
  }

  // Create paginated response schema
  static createPaginatedResponseSchema<T>(
    itemSchema: JsonSchema<T>,
    strategy: PaginationStrategy
  ): JsonSchema {
    const metadataSchema = this.getMetadataSchema(strategy);

    return {
      type: 'object',
      required: ['data', 'metadata'],
      properties: {
        data: {
          type: 'array',
          items: itemSchema,
          description: 'Array of items in current page'
        },
        metadata: metadataSchema
      }
    };
  }

  private static getMetadataSchema(strategy: PaginationStrategy): JsonSchema {
    const baseSchema: JsonSchema = {
      type: 'object',
      required: ['hasNextPage', 'hasPreviousPage', 'pageSize'],
      properties: {
        totalCount: {
          type: 'integer',
          description: 'Total number of items across all pages'
        },
        hasNextPage: {
          type: 'boolean',
          description: 'Indicates if there is a next page'
        },
        hasPreviousPage: {
          type: 'boolean',
          description: 'Indicates if there is a previous page'
        },
        pageSize: {
          type: 'integer',
          description: 'Number of items in current page'
        }
      }
    };

    switch (strategy) {
      case 'offset':
        return {
          ...baseSchema,
          properties: {
            ...baseSchema.properties,
            offset: {
              type: 'integer',
              description: 'Current offset value'
            },
            limit: {
              type: 'integer',
              description: 'Current limit value'
            }
          }
        };

      case 'cursor':
        return {
          ...baseSchema,
          properties: {
            ...baseSchema.properties,
            nextCursor: {
              type: 'string',
              nullable: true,
              description: 'Cursor for next page'
            },
            previousCursor: {
              type: 'string',
              nullable: true,
              description: 'Cursor for previous page'
            }
          }
        };

      case 'page':
        return {
          ...baseSchema,
          properties: {
            ...baseSchema.properties,
            currentPage: {
              type: 'integer',
              description: 'Current page number'
            },
            totalPages: {
              type: 'integer',
              description: 'Total number of pages'
            }
          }
        };

      default:
        return baseSchema;
    }
  }

  // RFC 8288 Link header pagination
  static createLinkHeaderPolicy(config: PaginationConfig): IPolicy {
    return setHeader({
      name: 'Link',
      value: `@{
        var links = new List<string>();

        if (context.Response.Body.As<JObject>()["metadata"]["hasNextPage"] == true) {
          links.Add($"<{context.Request.Url}?page={(int)context.Variables["page"] + 1}>; rel=\"next\"");
        }

        if (context.Response.Body.As<JObject>()["metadata"]["hasPreviousPage"] == true) {
          links.Add($"<{context.Request.Url}?page={(int)context.Variables["page"] - 1}>; rel=\"prev\"");
        }

        links.Add($"<{context.Request.Url}?page=1>; rel=\"first\"");

        if (context.Response.Body.As<JObject>()["metadata"]["totalPages"] != null) {
          links.Add($"<{context.Request.Url}?page={context.Response.Body.As<JObject>()["metadata"]["totalPages"]}>; rel=\"last\"");
        }

        return string.Join(", ", links);
      }`,
      existsAction: 'override'
    });
  }
}
```

### 3. Filtering, Sorting, and Field Selection

```typescript
// Filtering configuration
export interface FilteringConfig {
  readonly enabled: boolean;
  readonly operators?: FilterOperator[];
  readonly maxFilters?: number;
  readonly syntax?: FilterSyntax;
  readonly allowedFields?: string[];
  readonly deniedFields?: string[];
}

export type FilterSyntax = 'rsql' | 'odata' | 'mongo' | 'simple';

export type FilterOperator =
  | 'eq'   // Equal
  | 'ne'   // Not equal
  | 'gt'   // Greater than
  | 'gte'  // Greater than or equal
  | 'lt'   // Less than
  | 'lte'  // Less than or equal
  | 'in'   // In array
  | 'nin'  // Not in array
  | 'like' // Pattern match
  | 'contains'
  | 'startsWith'
  | 'endsWith';

// Sorting configuration
export interface SortingConfig {
  readonly enabled: boolean;
  readonly defaultSort?: SortField[];
  readonly maxSortFields?: number;
  readonly allowedFields?: string[];
  readonly deniedFields?: string[];
}

export interface SortField {
  readonly field: string;
  readonly direction: 'asc' | 'desc';
}

// Field selection configuration
export interface FieldSelectionConfig {
  readonly enabled: boolean;
  readonly parameterName?: string; // Default: 'fields'
  readonly separator?: string;     // Default: ','
  readonly allowedFields?: string[];
  readonly deniedFields?: string[];
  readonly alwaysInclude?: string[]; // Fields always included (e.g., 'id')
}

// Filtering helper
export class FilteringHelper {
  constructor(private readonly config: FilteringConfig) {}

  // Add filtering query parameters
  addFilterParams(operation: IRestOperation): IRestOperation {
    if (!this.config.enabled) return operation;

    const queryProperties = { ...operation.queryParameters?.schema.properties };

    switch (this.config.syntax) {
      case 'simple':
        // Simple key-value filtering: ?status=active&category=electronics
        // Fields are added dynamically based on schema
        break;

      case 'rsql':
        // RSQL syntax: ?filter=status==active;category==electronics
        queryProperties.filter = {
          type: 'string',
          description: 'RSQL filter expression',
          example: 'status==active;category==electronics'
        };
        break;

      case 'odata':
        // OData syntax: ?$filter=status eq 'active' and category eq 'electronics'
        queryProperties.$filter = {
          type: 'string',
          description: 'OData filter expression',
          example: "status eq 'active' and category eq 'electronics'"
        };
        break;

      case 'mongo':
        // MongoDB query syntax: ?filter={"status":"active","category":"electronics"}
        queryProperties.filter = {
          type: 'string',
          description: 'MongoDB-style filter JSON',
          example: '{"status":"active","category":"electronics"}'
        };
        break;
    }

    return {
      ...operation,
      queryParameters: {
        ...operation.queryParameters,
        schema: {
          ...operation.queryParameters?.schema,
          properties: queryProperties
        }
      }
    };
  }

  // Validate filter expression
  validateFilter(filter: string): FilterValidationResult {
    const errors: string[] = [];

    switch (this.config.syntax) {
      case 'rsql':
        return this.validateRsqlFilter(filter);
      case 'odata':
        return this.validateODataFilter(filter);
      case 'mongo':
        return this.validateMongoFilter(filter);
      default:
        return { valid: true, errors: [] };
    }
  }

  private validateRsqlFilter(filter: string): FilterValidationResult {
    // Parse RSQL: field==value;field2!=value2
    const errors: string[] = [];
    const parts = filter.split(/[;,]/);

    for (const part of parts) {
      const match = part.match(/^(\w+)(==|!=|=gt=|=ge=|=lt=|=le=|=in=|=out=)(.+)$/);
      if (!match) {
        errors.push(`Invalid RSQL syntax: ${part}`);
        continue;
      }

      const [, field, operator] = match;

      if (this.config.allowedFields && !this.config.allowedFields.includes(field)) {
        errors.push(`Field '${field}' is not allowed for filtering`);
      }

      if (this.config.deniedFields?.includes(field)) {
        errors.push(`Field '${field}' is denied for filtering`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private validateODataFilter(filter: string): FilterValidationResult {
    // Parse OData: field eq 'value' and field2 ne 'value2'
    const errors: string[] = [];

    // Simple validation - extract field names
    const fieldRegex = /(\w+)\s+(eq|ne|gt|ge|lt|le|in)/g;
    let match;

    while ((match = fieldRegex.exec(filter)) !== null) {
      const field = match[1];

      if (this.config.allowedFields && !this.config.allowedFields.includes(field)) {
        errors.push(`Field '${field}' is not allowed for filtering`);
      }

      if (this.config.deniedFields?.includes(field)) {
        errors.push(`Field '${field}' is denied for filtering`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private validateMongoFilter(filter: string): FilterValidationResult {
    const errors: string[] = [];

    try {
      const parsed = JSON.parse(filter);

      for (const field of Object.keys(parsed)) {
        if (this.config.allowedFields && !this.config.allowedFields.includes(field)) {
          errors.push(`Field '${field}' is not allowed for filtering`);
        }

        if (this.config.deniedFields?.includes(field)) {
          errors.push(`Field '${field}' is denied for filtering`);
        }
      }
    } catch (error) {
      errors.push('Invalid JSON in filter parameter');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Create filter validation policy
  createValidationPolicy(): IPolicy {
    return validate({
      content: [
        {
          schema: {
            type: 'object',
            properties: {
              filter: {
                type: 'string',
                // Custom validation would be in C# policy expression
              }
            }
          }
        }
      ],
      errorMessage: 'Invalid filter parameters',
      errorStatusCode: 400
    });
  }
}

// Sorting helper
export class SortingHelper {
  constructor(private readonly config: SortingConfig) {}

  // Add sorting query parameters
  addSortParams(operation: IRestOperation): IRestOperation {
    if (!this.config.enabled) return operation;

    const queryProperties = { ...operation.queryParameters?.schema.properties };

    queryProperties.sort = {
      type: 'string',
      description: 'Sort fields: field1:asc,field2:desc',
      example: 'createdAt:desc,name:asc',
      default: this.config.defaultSort ?
        this.config.defaultSort.map(s => `${s.field}:${s.direction}`).join(',') :
        undefined
    };

    return {
      ...operation,
      queryParameters: {
        ...operation.queryParameters,
        schema: {
          ...operation.queryParameters?.schema,
          properties: queryProperties
        }
      }
    };
  }

  // Parse sort parameter
  parseSort(sort: string): SortField[] {
    return sort.split(',').map(part => {
      const [field, direction = 'asc'] = part.split(':');
      return {
        field: field.trim(),
        direction: direction.toLowerCase() as 'asc' | 'desc'
      };
    });
  }

  // Validate sort fields
  validateSort(sort: string): SortValidationResult {
    const errors: string[] = [];
    const fields = this.parseSort(sort);

    if (this.config.maxSortFields && fields.length > this.config.maxSortFields) {
      errors.push(`Maximum ${this.config.maxSortFields} sort fields allowed`);
    }

    for (const { field, direction } of fields) {
      if (this.config.allowedFields && !this.config.allowedFields.includes(field)) {
        errors.push(`Field '${field}' is not allowed for sorting`);
      }

      if (this.config.deniedFields?.includes(field)) {
        errors.push(`Field '${field}' is denied for sorting`);
      }

      if (!['asc', 'desc'].includes(direction)) {
        errors.push(`Invalid sort direction '${direction}' for field '${field}'`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      fields
    };
  }
}

// Field selection helper
export class FieldSelectionHelper {
  constructor(private readonly config: FieldSelectionConfig) {}

  // Add field selection query parameters
  addFieldSelectionParams(operation: IRestOperation): IRestOperation {
    if (!this.config.enabled) return operation;

    const queryProperties = { ...operation.queryParameters?.schema.properties };
    const paramName = this.config.parameterName || 'fields';

    queryProperties[paramName] = {
      type: 'string',
      description: `Comma-separated list of fields to include (e.g., id,name,email)`,
      example: 'id,name,email'
    };

    return {
      ...operation,
      queryParameters: {
        ...operation.queryParameters,
        schema: {
          ...operation.queryParameters?.schema,
          properties: queryProperties
        }
      }
    };
  }

  // Parse fields parameter
  parseFields(fields: string): string[] {
    const separator = this.config.separator || ',';
    const parsed = fields.split(separator).map(f => f.trim());

    // Always include required fields
    if (this.config.alwaysInclude) {
      return [...new Set([...this.config.alwaysInclude, ...parsed])];
    }

    return parsed;
  }

  // Validate field selection
  validateFields(fields: string): FieldSelectionValidationResult {
    const errors: string[] = [];
    const parsed = this.parseFields(fields);

    for (const field of parsed) {
      if (this.config.allowedFields && !this.config.allowedFields.includes(field)) {
        errors.push(`Field '${field}' is not allowed for selection`);
      }

      if (this.config.deniedFields?.includes(field)) {
        errors.push(`Field '${field}' is denied for selection`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      fields: parsed
    };
  }

  // Create field projection policy for response transformation
  createProjectionPolicy(): IPolicy {
    const paramName = this.config.parameterName || 'fields';

    return choose({
      when: {
        condition: `@(context.Request.Url.Query.ContainsKey("${paramName}"))`,
        operations: [
          setBody({
            template: 'liquid',
            value: `@{
              var fields = context.Request.Url.Query["${paramName}"].Split(',');
              var body = context.Response.Body.As<JObject>();
              var filtered = new JObject();

              foreach (var field in fields) {
                if (body[field] != null) {
                  filtered[field] = body[field];
                }
              }

              return filtered.ToString();
            }`
          })
        ]
      }
    });
  }
}
```

### 4. HTTP Caching

```typescript
// Caching configuration
export interface HttpCachingConfig {
  readonly enabled: boolean;
  readonly strategy: CacheStrategy;
  readonly defaultTtl?: number;
  readonly varyBy?: VaryByConfig;
  readonly staleWhileRevalidate?: boolean;
  readonly staleIfError?: boolean;
}

export type CacheStrategy =
  | 'etag'          // ETag-based caching
  | 'lastModified'  // Last-Modified-based caching
  | 'both'          // Both ETag and Last-Modified
  | 'custom';       // Custom Cache-Control headers

// Vary configuration
export interface VaryByConfig {
  readonly headers?: string[];
  readonly queryParameters?: string[];
  readonly user?: boolean;
}

// HTTP caching helper
export class HttpCachingHelper {
  constructor(private readonly config: HttpCachingConfig) {}

  // Add caching to operation
  addCaching(operation: IRestOperation, ttl?: number): IRestOperation {
    if (!this.config.enabled) return operation;

    // Add conditional request headers to operation
    const headerProperties = { ...operation.headerParameters?.schema.properties };

    if (this.config.strategy === 'etag' || this.config.strategy === 'both') {
      headerProperties['If-None-Match'] = {
        type: 'string',
        description: 'ETag for conditional request'
      };
    }

    if (this.config.strategy === 'lastModified' || this.config.strategy === 'both') {
      headerProperties['If-Modified-Since'] = {
        type: 'string',
        format: 'date-time',
        description: 'Date for conditional request'
      };
    }

    // Add 304 Not Modified response
    const responses = { ...operation.responses };
    responses[304] = {
      description: 'Not Modified - Resource has not changed',
      headers: this.getCacheHeaders()
    };

    return {
      ...operation,
      headerParameters: {
        ...operation.headerParameters,
        schema: {
          ...operation.headerParameters?.schema,
          properties: headerProperties
        }
      },
      responses
    };
  }

  // Create ETag generation policy
  createETagPolicy(): IPolicy {
    return choose({
      when: {
        condition: '@(context.Response.StatusCode == 200)',
        operations: [
          cache({
            key: '@(context.Request.Url.Path + context.Request.Url.QueryString)',
            duration: this.config.defaultTtl || 300,
            varyByHeaders: this.config.varyBy?.headers,
            varyByQueryParameters: this.config.varyBy?.queryParameters
          }),
          setHeader({
            name: 'ETag',
            value: '@{
              var body = context.Response.Body.As<string>();
              using (var md5 = System.Security.Cryptography.MD5.Create()) {
                var hash = md5.ComputeHash(System.Text.Encoding.UTF8.GetBytes(body));
                return "\"" + Convert.ToBase64String(hash) + "\"";
              }
            }',
            existsAction: 'override'
          }),
          setHeader({
            name: 'Cache-Control',
            value: `public, max-age=${this.config.defaultTtl || 300}`,
            existsAction: 'override'
          })
        ]
      }
    });
  }

  // Create conditional request handling policy
  createConditionalRequestPolicy(): IPolicy {
    return choose({
      when: {
        condition: '@{
          var ifNoneMatch = context.Request.Headers.GetValueOrDefault("If-None-Match", "");
          var etag = context.Response.Headers.GetValueOrDefault("ETag", "");
          return !string.IsNullOrEmpty(ifNoneMatch) && ifNoneMatch == etag;
        }',
        operations: [
          returnResponse({
            statusCode: 304,
            setHeaders: {
              'ETag': '@(context.Response.Headers.GetValueOrDefault("ETag", ""))',
              'Cache-Control': '@(context.Response.Headers.GetValueOrDefault("Cache-Control", ""))'
            }
          })
        ]
      }
    });
  }

  // Create Last-Modified policy
  createLastModifiedPolicy(): IPolicy {
    return choose({
      when: {
        condition: '@(context.Response.StatusCode == 200)',
        operations: [
          setHeader({
            name: 'Last-Modified',
            value: '@(DateTime.UtcNow.ToString("r"))',
            existsAction: 'override'
          }),
          setHeader({
            name: 'Cache-Control',
            value: `public, max-age=${this.config.defaultTtl || 300}`,
            existsAction: 'override'
          })
        ]
      }
    });
  }

  // Cache invalidation policy
  createInvalidationPolicy(patterns: string[]): IPolicy {
    return choose({
      when: {
        condition: `@(context.Request.Method == "POST" || context.Request.Method == "PUT" || context.Request.Method == "DELETE")`,
        operations: [
          cacheRemove({
            key: patterns.map(p => `@(${p})`).join(',')
          })
        ]
      }
    });
  }

  private getCacheHeaders(): Record<string, HeaderDefinition> {
    const headers: Record<string, HeaderDefinition> = {};

    if (this.config.strategy === 'etag' || this.config.strategy === 'both') {
      headers['ETag'] = {
        schema: { type: 'string' },
        description: 'Entity tag for resource'
      };
    }

    if (this.config.strategy === 'lastModified' || this.config.strategy === 'both') {
      headers['Last-Modified'] = {
        schema: { type: 'string', format: 'date-time' },
        description: 'Last modification date'
      };
    }

    headers['Cache-Control'] = {
      schema: { type: 'string' },
      description: 'Cache control directives'
    };

    return headers;
  }
}

// Cache key generator
export class CacheKeyGenerator {
  // Generate cache key from request
  static generate(
    request: HttpRequest,
    varyBy?: VaryByConfig
  ): string {
    const parts: string[] = [
      request.method,
      request.path,
      request.query ? JSON.stringify(request.query) : ''
    ];

    if (varyBy?.headers) {
      for (const header of varyBy.headers) {
        parts.push(request.headers[header] || '');
      }
    }

    if (varyBy?.queryParameters) {
      for (const param of varyBy.queryParameters) {
        parts.push(request.query?.[param] || '');
      }
    }

    if (varyBy?.user && request.user) {
      parts.push(request.user.id);
    }

    return crypto
      .createHash('sha256')
      .update(parts.join(':'))
      .digest('hex');
  }
}
```

### 5. Authentication and Authorization

```typescript
// Authentication configuration
export interface AuthenticationConfig {
  readonly providers: AuthenticationProvider[];
  readonly defaultProvider?: string;
  readonly requireAuthentication?: boolean;
  readonly tokenValidation?: TokenValidationConfig;
}

export interface AuthenticationProvider {
  readonly name: string;
  readonly type: AuthenticationType;
  readonly config: AuthenticationProviderConfig;
}

export type AuthenticationType =
  | 'oauth2'
  | 'openIdConnect'
  | 'azureAd'
  | 'apiKey'
  | 'clientCertificate'
  | 'basic'
  | 'custom';

// OAuth 2.0 configuration
export interface OAuth2Config extends AuthenticationProviderConfig {
  readonly type: 'oauth2';
  readonly flows: OAuth2Flows;
  readonly tokenUrl: string;
  readonly authorizationUrl?: string;
  readonly refreshUrl?: string;
  readonly scopes: Record<string, string>;
}

export interface OAuth2Flows {
  readonly authorizationCode?: OAuth2Flow;
  readonly clientCredentials?: OAuth2Flow;
  readonly implicit?: OAuth2Flow;
  readonly password?: OAuth2Flow;
  readonly deviceCode?: OAuth2Flow;
}

export interface OAuth2Flow {
  readonly authorizationUrl?: string;
  readonly tokenUrl?: string;
  readonly refreshUrl?: string;
  readonly scopes: Record<string, string>;
}

// OpenID Connect configuration
export interface OpenIdConnectConfig extends AuthenticationProviderConfig {
  readonly type: 'openIdConnect';
  readonly issuer: string;
  readonly discoveryUrl?: string;
  readonly clientId: string;
  readonly clientSecret?: string;
  readonly scopes?: string[];
  readonly responseType?: 'code' | 'token' | 'id_token';
  readonly responseMode?: 'query' | 'fragment' | 'form_post';
}

// Azure AD configuration
export interface AzureAdConfig extends AuthenticationProviderConfig {
  readonly type: 'azureAd';
  readonly tenantId: string;
  readonly clientId: string;
  readonly clientSecret?: string;
  readonly audience?: string;
  readonly scopes?: string[];
  readonly instance?: 'https://login.microsoftonline.com' | 'https://login.microsoftonline.us';
}

// API Key configuration
export interface ApiKeyConfig extends AuthenticationProviderConfig {
  readonly type: 'apiKey';
  readonly in: 'header' | 'query' | 'cookie';
  readonly name: string;
  readonly prefix?: string;
}

// Client certificate configuration
export interface ClientCertificateConfig extends AuthenticationProviderConfig {
  readonly type: 'clientCertificate';
  readonly thumbprints?: string[];
  readonly issuer?: string;
  readonly subject?: string;
  readonly validateChain?: boolean;
  readonly validateRevocation?: boolean;
}

// Token validation configuration
export interface TokenValidationConfig {
  readonly validateIssuer?: boolean;
  readonly validateAudience?: boolean;
  readonly validateLifetime?: boolean;
  readonly validateSignature?: boolean;
  readonly clockSkew?: number; // seconds
  readonly requiredClaims?: string[];
}

// Authorization configuration
export interface AuthorizationConfig {
  readonly strategy: AuthorizationStrategy;
  readonly rules: AuthorizationRule[];
  readonly defaultAction?: 'allow' | 'deny';
}

export type AuthorizationStrategy = 'rbac' | 'abac' | 'policy' | 'custom';

// Role-based access control
export interface RbacRule extends AuthorizationRule {
  readonly type: 'rbac';
  readonly roles: string[];
  readonly requireAll?: boolean;
}

// Attribute-based access control
export interface AbacRule extends AuthorizationRule {
  readonly type: 'abac';
  readonly conditions: AbacCondition[];
  readonly combinator: 'AND' | 'OR';
}

export interface AbacCondition {
  readonly attribute: string;
  readonly operator: 'eq' | 'ne' | 'in' | 'nin' | 'contains' | 'matches';
  readonly value: any;
}

// Authentication manager
export class AuthenticationManager {
  constructor(private readonly config: AuthenticationConfig) {}

  // Create authentication policies
  createAuthenticationPolicies(): IPolicy[] {
    const policies: IPolicy[] = [];

    for (const provider of this.config.providers) {
      switch (provider.type) {
        case 'oauth2':
          policies.push(this.createOAuth2Policy(provider.config as OAuth2Config));
          break;
        case 'azureAd':
          policies.push(this.createAzureAdPolicy(provider.config as AzureAdConfig));
          break;
        case 'apiKey':
          policies.push(this.createApiKeyPolicy(provider.config as ApiKeyConfig));
          break;
        case 'clientCertificate':
          policies.push(this.createClientCertPolicy(provider.config as ClientCertificateConfig));
          break;
      }
    }

    return policies;
  }

  private createOAuth2Policy(config: OAuth2Config): IPolicy {
    return validateJwt({
      headerName: 'Authorization',
      scheme: 'Bearer',
      requiredClaims: [],
      audiences: [],
      openIdConfigUrl: `${config.authorizationUrl}/.well-known/openid-configuration`,
      failedValidationStatusCode: 401,
      failedValidationErrorMessage: 'Unauthorized'
    });
  }

  private createAzureAdPolicy(config: AzureAdConfig): IPolicy {
    const openIdUrl = `${config.instance}/${config.tenantId}/v2.0/.well-known/openid-configuration`;

    return validateJwt({
      headerName: 'Authorization',
      scheme: 'Bearer',
      requiredClaims: [
        { name: 'aud', match: 'all', values: [config.audience || config.clientId] }
      ],
      audiences: [config.audience || config.clientId],
      openIdConfigUrl: openIdUrl,
      failedValidationStatusCode: 401,
      failedValidationErrorMessage: 'Unauthorized - Invalid Azure AD token'
    });
  }

  private createApiKeyPolicy(config: ApiKeyConfig): IPolicy {
    switch (config.in) {
      case 'header':
        return checkHeader({
          name: config.name,
          required: true,
          failedStatusCode: 401,
          failedErrorMessage: 'Missing or invalid API key'
        });

      case 'query':
        return choose({
          when: {
            condition: `@(!context.Request.Url.Query.ContainsKey("${config.name}"))`,
            operations: [
              returnResponse({
                statusCode: 401,
                body: {
                  type: 'https://httpstatuses.io/401',
                  title: 'Unauthorized',
                  status: 401,
                  detail: 'Missing or invalid API key'
                }
              })
            ]
          }
        });

      default:
        return noop();
    }
  }

  private createClientCertPolicy(config: ClientCertificateConfig): IPolicy {
    return choose({
      when: {
        condition: '@(context.Request.Certificate == null)',
        operations: [
          returnResponse({
            statusCode: 401,
            body: {
              type: 'https://httpstatuses.io/401',
              title: 'Unauthorized',
              status: 401,
              detail: 'Client certificate required'
            }
          })
        ]
      },
      otherwise: config.thumbprints ? {
        condition: `@(!new[] { ${config.thumbprints.map(t => `"${t}"`).join(', ')} }.Contains(context.Request.Certificate.Thumbprint))`,
        operations: [
          returnResponse({
            statusCode: 403,
            body: {
              type: 'https://httpstatuses.io/403',
              title: 'Forbidden',
              status: 403,
              detail: 'Client certificate not authorized'
            }
          })
        ]
      } : undefined
    });
  }

  // Create authorization policies
  createAuthorizationPolicies(config: AuthorizationConfig): IPolicy[] {
    const policies: IPolicy[] = [];

    for (const rule of config.rules) {
      switch (rule.type) {
        case 'rbac':
          policies.push(this.createRbacPolicy(rule as RbacRule));
          break;
        case 'abac':
          policies.push(this.createAbacPolicy(rule as AbacRule));
          break;
      }
    }

    return policies;
  }

  private createRbacPolicy(rule: RbacRule): IPolicy {
    const rolesCheck = rule.requireAll
      ? rule.roles.map(role => `context.User.Claims.Any(c => c.Type == "roles" && c.Value == "${role}")`).join(' && ')
      : rule.roles.map(role => `context.User.Claims.Any(c => c.Type == "roles" && c.Value == "${role}")`).join(' || ');

    return choose({
      when: {
        condition: `@(!(${rolesCheck}))`,
        operations: [
          returnResponse({
            statusCode: 403,
            body: {
              type: 'https://httpstatuses.io/403',
              title: 'Forbidden',
              status: 403,
              detail: `Required roles: ${rule.roles.join(', ')}`
            }
          })
        ]
      }
    });
  }

  private createAbacPolicy(rule: AbacRule): IPolicy {
    const conditions = rule.conditions.map(cond =>
      this.buildAbacCondition(cond)
    );

    const combined = rule.combinator === 'AND'
      ? conditions.join(' && ')
      : conditions.join(' || ');

    return choose({
      when: {
        condition: `@(!(${combined}))`,
        operations: [
          returnResponse({
            statusCode: 403,
            body: {
              type: 'https://httpstatuses.io/403',
              title: 'Forbidden',
              status: 403,
              detail: 'Access denied based on attributes'
            }
          })
        ]
      }
    });
  }

  private buildAbacCondition(condition: AbacCondition): string {
    const getValue = (attr: string) => {
      if (attr.startsWith('user.')) {
        const claim = attr.substring(5);
        return `context.User.Claims.FirstOrDefault(c => c.Type == "${claim}")?.Value`;
      }
      return `"${attr}"`;
    };

    const value = getValue(condition.attribute);

    switch (condition.operator) {
      case 'eq':
        return `${value} == "${condition.value}"`;
      case 'ne':
        return `${value} != "${condition.value}"`;
      case 'in':
        return `new[] { ${condition.value.map((v: any) => `"${v}"`).join(', ')} }.Contains(${value})`;
      case 'contains':
        return `${value}?.Contains("${condition.value}") == true`;
      default:
        return 'true';
    }
  }
}
```

### 6. Rate Limiting and Throttling

```typescript
// Rate limiting configuration
export interface RateLimitingConfig {
  readonly enabled: boolean;
  readonly strategy: RateLimitStrategy;
  readonly limits: RateLimitRule[];
  readonly keyExtractor?: RateLimitKeyExtractor;
  readonly responseHeaders?: boolean; // Include X-RateLimit-* headers
  readonly retryAfter?: boolean; // Include Retry-After header
}

export type RateLimitStrategy = 'fixedWindow' | 'slidingWindow' | 'tokenBucket' | 'leakyBucket';

// Rate limit rule
export interface RateLimitRule {
  readonly scope: RateLimitScope;
  readonly limit: number;
  readonly window: number; // seconds
  readonly burst?: number; // For token bucket
  readonly priority?: number;
}

export type RateLimitScope =
  | 'global'
  | 'perIp'
  | 'perUser'
  | 'perApiKey'
  | 'perSubscription'
  | 'perOperation'
  | 'custom';

export type RateLimitKeyExtractor = (request: HttpRequest) => string;

// Rate limiter
export class RateLimiter {
  constructor(private readonly config: RateLimitingConfig) {}

  // Create rate limit policy
  createPolicy(rule: RateLimitRule): IPolicy {
    const key = this.getKeyExpression(rule.scope);

    switch (this.config.strategy) {
      case 'fixedWindow':
        return this.createFixedWindowPolicy(rule, key);
      case 'slidingWindow':
        return this.createSlidingWindowPolicy(rule, key);
      case 'tokenBucket':
        return this.createTokenBucketPolicy(rule, key);
      default:
        return this.createFixedWindowPolicy(rule, key);
    }
  }

  private createFixedWindowPolicy(rule: RateLimitRule, key: string): IPolicy {
    return rateLimit({
      calls: rule.limit,
      renewalPeriod: rule.window,
      counterKey: key,
      incrementCondition: '@(context.Response.StatusCode >= 200 && context.Response.StatusCode < 300)',
      retryAfterHeaderVariable: this.config.retryAfter ? 'retryAfter' : undefined
    }).and(
      this.config.responseHeaders ? this.createRateLimitHeaders(rule) : noop()
    );
  }

  private createSlidingWindowPolicy(rule: RateLimitRule, key: string): IPolicy {
    // Azure API Management sliding window implementation
    return rateLimit({
      calls: rule.limit,
      renewalPeriod: rule.window,
      counterKey: key,
      incrementCondition: '@(context.Response.StatusCode >= 200 && context.Response.StatusCode < 300)',
      retryAfterHeaderVariable: this.config.retryAfter ? 'retryAfter' : undefined,
      // Use sliding window algorithm
      estimateBehavior: 'sliding'
    }).and(
      this.config.responseHeaders ? this.createRateLimitHeaders(rule) : noop()
    );
  }

  private createTokenBucketPolicy(rule: RateLimitRule, key: string): IPolicy {
    // Token bucket with burst capacity
    return rateLimit({
      calls: rule.limit,
      renewalPeriod: rule.window,
      counterKey: key,
      incrementCondition: '@(context.Response.StatusCode >= 200 && context.Response.StatusCode < 300)',
      retryAfterHeaderVariable: this.config.retryAfter ? 'retryAfter' : undefined,
      // Burst capacity
      refillRate: Math.floor(rule.limit / rule.window),
      capacity: rule.burst || rule.limit
    }).and(
      this.config.responseHeaders ? this.createRateLimitHeaders(rule) : noop()
    );
  }

  private getKeyExpression(scope: RateLimitScope): string {
    switch (scope) {
      case 'global':
        return '@("global")';
      case 'perIp':
        return '@(context.Request.IpAddress)';
      case 'perUser':
        return '@(context.User?.Id ?? "anonymous")';
      case 'perApiKey':
        return '@(context.Subscription?.Key ?? "no-key")';
      case 'perSubscription':
        return '@(context.Subscription?.Id ?? "no-subscription")';
      case 'perOperation':
        return '@(context.Operation.Id)';
      default:
        return '@("default")';
    }
  }

  private createRateLimitHeaders(rule: RateLimitRule): IPolicy {
    return setHeader({
      name: 'X-RateLimit-Limit',
      value: rule.limit.toString(),
      existsAction: 'override'
    }).and(setHeader({
      name: 'X-RateLimit-Remaining',
      value: '@{
        var key = context.Variables["rateLimitKey"];
        var counter = context.Variables["rateLimitCounter"];
        return (rule.limit - counter).ToString();
      }',
      existsAction: 'override'
    })).and(setHeader({
      name: 'X-RateLimit-Reset',
      value: '@{
        var resetTime = DateTimeOffset.UtcNow.AddSeconds(rule.window);
        return resetTime.ToUnixTimeSeconds().ToString();
      }',
      existsAction: 'override'
    }));
  }

  // Quota policy for longer-term limits (monthly, etc.)
  createQuotaPolicy(limit: number, period: 'hour' | 'day' | 'month'): IPolicy {
    return quota({
      calls: limit,
      renewalPeriod: this.getPeriodSeconds(period),
      counterKey: '@(context.Subscription?.Key ?? "anonymous")'
    });
  }

  private getPeriodSeconds(period: 'hour' | 'day' | 'month'): number {
    switch (period) {
      case 'hour': return 3600;
      case 'day': return 86400;
      case 'month': return 2592000; // 30 days
    }
  }
}

// Rate limit exceeded response
export const RateLimitExceededResponse: ErrorResponse = {
  type: 'https://httpstatuses.io/429',
  title: 'Too Many Requests',
  status: 429,
  detail: 'Rate limit exceeded. Please retry after the specified time.'
};
```

### 7. Request/Response Validation

```typescript
// Validation configuration
export interface ValidationConfig {
  readonly validateRequest?: boolean;
  readonly validateResponse?: boolean;
  readonly validateContentType?: boolean;
  readonly validateSchema?: boolean;
  readonly maxRequestSize?: number; // bytes
  readonly allowedContentTypes?: string[];
  readonly strictMode?: boolean; // Fail on additional properties
}

// Validation helper
export class ValidationHelper {
  constructor(private readonly config: ValidationConfig) {}

  // Create request validation policy
  createRequestValidationPolicy(operation: IRestOperation): IPolicy {
    const policies: IPolicy[] = [];

    // Validate content type
    if (this.config.validateContentType && operation.requestBody) {
      const allowedTypes = Object.keys(operation.requestBody.content);
      policies.push(this.createContentTypeValidation(allowedTypes));
    }

    // Validate request size
    if (this.config.maxRequestSize) {
      policies.push(this.createSizeValidation(this.config.maxRequestSize));
    }

    // Validate request body schema
    if (this.config.validateSchema && operation.requestBody) {
      policies.push(this.createSchemaValidation(operation.requestBody));
    }

    // Validate required parameters
    if (operation.pathParameters || operation.queryParameters) {
      policies.push(this.createParameterValidation(operation));
    }

    return policies.length > 0 ? sequence(...policies) : noop();
  }

  // Create response validation policy
  createResponseValidationPolicy(operation: IRestOperation): IPolicy {
    if (!this.config.validateResponse) return noop();

    return choose({
      when: Object.entries(operation.responses).map(([statusCode, response]) => {
        if (!response?.content) return null;

        const schema = this.getResponseSchema(response);
        if (!schema) return null;

        return {
          condition: `@(context.Response.StatusCode == ${statusCode})`,
          operations: [
            validate({
              content: [{
                schema,
                errorMessage: `Response does not match schema for status ${statusCode}`,
                errorStatusCode: 500
              }]
            })
          ]
        };
      }).filter(Boolean)
    });
  }

  private createContentTypeValidation(allowedTypes: string[]): IPolicy {
    return choose({
      when: {
        condition: `@{
          var contentType = context.Request.Headers.GetValueOrDefault("Content-Type", "");
          var allowed = new[] { ${allowedTypes.map(t => `"${t}"`).join(', ')} };
          return !allowed.Any(a => contentType.StartsWith(a));
        }`,
        operations: [
          returnResponse({
            statusCode: 415,
            body: {
              type: 'https://httpstatuses.io/415',
              title: 'Unsupported Media Type',
              status: 415,
              detail: `Content-Type must be one of: ${allowedTypes.join(', ')}`
            }
          })
        ]
      }
    });
  }

  private createSizeValidation(maxSize: number): IPolicy {
    return choose({
      when: {
        condition: `@(context.Request.Body.Length > ${maxSize})`,
        operations: [
          returnResponse({
            statusCode: 413,
            body: {
              type: 'https://httpstatuses.io/413',
              title: 'Payload Too Large',
              status: 413,
              detail: `Request body must not exceed ${maxSize} bytes`
            }
          })
        ]
      }
    });
  }

  private createSchemaValidation(requestBody: RequestBodyDefinition): IPolicy {
    const contentType = Object.keys(requestBody.content)[0];
    const mediaType = requestBody.content[contentType];

    if (!mediaType?.schema) return noop();

    return validate({
      content: [{
        schema: mediaType.schema,
        errorMessage: 'Request body validation failed',
        errorStatusCode: 400
      }],
      errors: [{
        source: 'body',
        reason: 'Schema validation failed'
      }]
    });
  }

  private createParameterValidation(operation: IRestOperation): IPolicy {
    const checks: IPolicy[] = [];

    // Validate path parameters
    if (operation.pathParameters?.schema.required) {
      for (const param of operation.pathParameters.schema.required) {
        checks.push(checkHeader({
          name: `path-${param}`,
          required: true,
          failedStatusCode: 400,
          failedErrorMessage: `Missing required path parameter: ${param}`
        }));
      }
    }

    // Validate query parameters
    if (operation.queryParameters?.schema.required) {
      for (const param of operation.queryParameters.schema.required) {
        checks.push(choose({
          when: {
            condition: `@(!context.Request.Url.Query.ContainsKey("${param}"))`,
            operations: [
              returnResponse({
                statusCode: 400,
                body: {
                  type: 'https://httpstatuses.io/400',
                  title: 'Bad Request',
                  status: 400,
                  detail: `Missing required query parameter: ${param}`
                }
              })
            ]
          }
        }));
      }
    }

    return checks.length > 0 ? sequence(...checks) : noop();
  }

  private getResponseSchema(response: ResponseSchema): JsonSchema | undefined {
    const contentType = Object.keys(response.content || {})[0];
    if (!contentType) return undefined;

    return response.content?.[contentType]?.schema;
  }

  // Input sanitization for XSS and injection prevention
  createSanitizationPolicy(): IPolicy {
    return setBody({
      template: 'liquid',
      value: `@{
        var body = context.Request.Body.As<string>();

        // Remove potential XSS patterns
        body = System.Text.RegularExpressions.Regex.Replace(body, @"<script[^>]*>.*?</script>", "", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        body = System.Text.RegularExpressions.Regex.Replace(body, @"javascript:", "", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        body = System.Text.RegularExpressions.Regex.Replace(body, @"on\w+\s*=", "", System.Text.RegularExpressions.RegexOptions.IgnoreCase);

        return body;
      }`
    });
  }
}
```

### 8. Error Handling and RFC 7807 Problem Details

```typescript
// RFC 7807 Problem Details implementation
export class ProblemDetailsFactory {
  // Create problem details for common HTTP errors
  static badRequest(detail?: string, extensions?: Record<string, any>): ErrorResponse {
    return {
      type: 'https://httpstatuses.io/400',
      title: 'Bad Request',
      status: 400,
      detail: detail || 'The request is invalid',
      ...extensions
    };
  }

  static unauthorized(detail?: string, extensions?: Record<string, any>): ErrorResponse {
    return {
      type: 'https://httpstatuses.io/401',
      title: 'Unauthorized',
      status: 401,
      detail: detail || 'Authentication is required',
      ...extensions
    };
  }

  static forbidden(detail?: string, extensions?: Record<string, any>): ErrorResponse {
    return {
      type: 'https://httpstatuses.io/403',
      title: 'Forbidden',
      status: 403,
      detail: detail || 'Access to this resource is forbidden',
      ...extensions
    };
  }

  static notFound(resource?: string, extensions?: Record<string, any>): ErrorResponse {
    return {
      type: 'https://httpstatuses.io/404',
      title: 'Not Found',
      status: 404,
      detail: resource ? `${resource} not found` : 'The requested resource was not found',
      ...extensions
    };
  }

  static conflict(detail?: string, extensions?: Record<string, any>): ErrorResponse {
    return {
      type: 'https://httpstatuses.io/409',
      title: 'Conflict',
      status: 409,
      detail: detail || 'The request conflicts with the current state',
      ...extensions
    };
  }

  static unprocessableEntity(
    validationErrors: ValidationError[],
    extensions?: Record<string, any>
  ): ErrorResponse {
    return {
      type: 'https://httpstatuses.io/422',
      title: 'Unprocessable Entity',
      status: 422,
      detail: 'Validation failed',
      errors: validationErrors,
      ...extensions
    };
  }

  static tooManyRequests(
    retryAfter?: number,
    extensions?: Record<string, any>
  ): ErrorResponse {
    return {
      type: 'https://httpstatuses.io/429',
      title: 'Too Many Requests',
      status: 429,
      detail: 'Rate limit exceeded',
      retryAfter,
      ...extensions
    };
  }

  static internalServerError(
    detail?: string,
    extensions?: Record<string, any>
  ): ErrorResponse {
    return {
      type: 'https://httpstatuses.io/500',
      title: 'Internal Server Error',
      status: 500,
      detail: detail || 'An unexpected error occurred',
      ...extensions
    };
  }

  static serviceUnavailable(
    retryAfter?: number,
    extensions?: Record<string, any>
  ): ErrorResponse {
    return {
      type: 'https://httpstatuses.io/503',
      title: 'Service Unavailable',
      status: 503,
      detail: 'The service is temporarily unavailable',
      retryAfter,
      ...extensions
    };
  }

  // Create error response policy
  static createErrorPolicy(): IPolicy {
    return onError({
      operations: [
        setBody({
          template: 'liquid',
          value: `@{
            var error = context.LastError;
            var problem = new {
              type = "https://httpstatuses.io/" + context.Response.StatusCode,
              title = error.Reason,
              status = context.Response.StatusCode,
              detail = error.Message,
              instance = context.Request.Url.Path,
              traceId = context.RequestId
            };

            return JsonConvert.SerializeObject(problem);
          }`
        }),
        setHeader({
          name: 'Content-Type',
          value: 'application/problem+json',
          existsAction: 'override'
        }),
        setStatus({
          code: '@(context.Response.StatusCode)',
          reason: '@(context.LastError.Reason)'
        })
      ]
    });
  }

  // Global error handler
  static createGlobalErrorHandler(
    logErrors: boolean = true,
    includeStackTrace: boolean = false
  ): IPolicy {
    return onError({
      operations: [
        ...(logErrors ? [
          trace({
            severity: 'error',
            message: '@(context.LastError.Message)',
            variables: {
              source: '@(context.LastError.Source)',
              reason: '@(context.LastError.Reason)',
              stackTrace: includeStackTrace ? '@(context.LastError.StackTrace)' : undefined
            }
          })
        ] : []),
        choose({
          when: [
            {
              condition: '@(context.Response.StatusCode >= 400 && context.Response.StatusCode < 500)',
              operations: [
                returnResponse({
                  statusCode: '@(context.Response.StatusCode)',
                  body: {
                    type: '@("https://httpstatuses.io/" + context.Response.StatusCode)',
                    title: '@(context.LastError.Reason)',
                    status: '@(context.Response.StatusCode)',
                    detail: '@(context.LastError.Message)',
                    instance: '@(context.Request.Url.Path)',
                    traceId: '@(context.RequestId)'
                  },
                  setHeaders: {
                    'Content-Type': 'application/problem+json'
                  }
                })
              ]
            }
          ],
          otherwise: {
            condition: 'true',
            operations: [
              returnResponse({
                statusCode: 500,
                body: {
                  type: 'https://httpstatuses.io/500',
                  title: 'Internal Server Error',
                  status: 500,
                  detail: includeStackTrace ?
                    '@(context.LastError.Message)' :
                    'An unexpected error occurred',
                  instance: '@(context.Request.Url.Path)',
                  traceId: '@(context.RequestId)'
                },
                setHeaders: {
                  'Content-Type': 'application/problem+json'
                }
              })
            ]
          }
        })
      ]
    });
  }
}
```

### 9. Observability and Tracing

```typescript
// Observability configuration
export interface ObservabilityConfig {
  readonly tracing?: TracingConfig;
  readonly logging?: LoggingConfig;
  readonly metrics?: MetricsConfig;
  readonly applicationInsights?: ApplicationInsightsConfig;
}

// Distributed tracing configuration
export interface TracingConfig {
  readonly enabled: boolean;
  readonly provider: 'applicationInsights' | 'openTelemetry' | 'custom';
  readonly samplingRate?: number; // 0.0 to 1.0
  readonly propagateTraceContext?: boolean;
  readonly w3cTraceContext?: boolean;
  readonly includeRequestBody?: boolean;
  readonly includeResponseBody?: boolean;
}

// Logging configuration
export interface LoggingConfig {
  readonly enabled: boolean;
  readonly logLevel: LogLevel;
  readonly logRequests?: boolean;
  readonly logResponses?: boolean;
  readonly logHeaders?: boolean;
  readonly logBody?: boolean;
  readonly maskSensitiveData?: boolean;
  readonly sensitiveHeaders?: string[];
  readonly sensitiveFields?: string[];
}

export type LogLevel = 'verbose' | 'information' | 'warning' | 'error';

// Metrics configuration
export interface MetricsConfig {
  readonly enabled: boolean;
  readonly includeDefaultMetrics?: boolean;
  readonly customMetrics?: CustomMetric[];
  readonly aggregationWindow?: number; // seconds
}

export interface CustomMetric {
  readonly name: string;
  readonly type: 'counter' | 'gauge' | 'histogram';
  readonly description?: string;
  readonly unit?: string;
  readonly extractor: (request: HttpRequest, response: HttpResponse) => number;
}

// Observability helper
export class ObservabilityHelper {
  constructor(private readonly config: ObservabilityConfig) {}

  // Create tracing policies
  createTracingPolicies(): IPolicy[] {
    if (!this.config.tracing?.enabled) return [];

    const policies: IPolicy[] = [];

    // W3C Trace Context propagation
    if (this.config.tracing.w3cTraceContext) {
      policies.push(this.createW3CTraceContextPolicy());
    }

    // Request/response tracing
    policies.push(this.createRequestTracingPolicy());
    policies.push(this.createResponseTracingPolicy());

    return policies;
  }

  private createW3CTraceContextPolicy(): IPolicy {
    return setHeader({
      name: 'traceparent',
      value: '@{
        var traceId = context.RequestId;
        var spanId = Guid.NewGuid().ToString("N").Substring(0, 16);
        return $"00-{traceId}-{spanId}-01";
      }',
      existsAction: 'skip'
    }).and(setHeader({
      name: 'tracestate',
      value: '@(context.Request.Headers.GetValueOrDefault("tracestate", ""))',
      existsAction: 'skip'
    }));
  }

  private createRequestTracingPolicy(): IPolicy {
    return trace({
      severity: 'information',
      message: 'Request received',
      variables: {
        method: '@(context.Request.Method)',
        url: '@(context.Request.Url.ToString())',
        ipAddress: '@(context.Request.IpAddress)',
        userAgent: '@(context.Request.Headers.GetValueOrDefault("User-Agent", ""))',
        correlationId: '@(context.RequestId)',
        timestamp: '@(DateTime.UtcNow.ToString("o"))',
        ...(this.config.tracing?.includeRequestBody ? {
          body: '@(context.Request.Body.As<string>())'
        } : {})
      }
    });
  }

  private createResponseTracingPolicy(): IPolicy {
    return trace({
      severity: 'information',
      message: 'Response sent',
      variables: {
        statusCode: '@(context.Response.StatusCode)',
        duration: '@((DateTime.UtcNow - context.Variables["requestStartTime"]).TotalMilliseconds)',
        correlationId: '@(context.RequestId)',
        timestamp: '@(DateTime.UtcNow.ToString("o"))',
        ...(this.config.tracing?.includeResponseBody ? {
          body: '@(context.Response.Body.As<string>())'
        } : {})
      }
    });
  }

  // Create logging policies
  createLoggingPolicies(): IPolicy[] {
    if (!this.config.logging?.enabled) return [];

    const policies: IPolicy[] = [];

    if (this.config.logging.logRequests) {
      policies.push(this.createRequestLoggingPolicy());
    }

    if (this.config.logging.logResponses) {
      policies.push(this.createResponseLoggingPolicy());
    }

    return policies;
  }

  private createRequestLoggingPolicy(): IPolicy {
    return trace({
      severity: this.config.logging!.logLevel,
      message: '@($"Request: {context.Request.Method} {context.Request.Url.Path}")',
      variables: {
        ...(this.config.logging!.logHeaders ? {
          headers: '@(context.Request.Headers.Select(h => $"{h.Key}: {string.Join(",", h.Value)}").Aggregate((a,b) => $"{a}\\n{b}"))'
        } : {}),
        ...(this.config.logging!.logBody ? {
          body: this.getMaskedBody('request')
        } : {})
      }
    });
  }

  private createResponseLoggingPolicy(): IPolicy {
    return trace({
      severity: this.config.logging!.logLevel,
      message: '@($"Response: {context.Response.StatusCode}")',
      variables: {
        statusCode: '@(context.Response.StatusCode)',
        duration: '@((DateTime.UtcNow - context.Variables["requestStartTime"]).TotalMilliseconds)',
        ...(this.config.logging!.logBody ? {
          body: this.getMaskedBody('response')
        } : {})
      }
    });
  }

  private getMaskedBody(source: 'request' | 'response'): string {
    if (!this.config.logging?.maskSensitiveData) {
      return source === 'request'
        ? '@(context.Request.Body.As<string>())'
        : '@(context.Response.Body.As<string>())';
    }

    const fields = this.config.logging.sensitiveFields || [];
    const pattern = fields.map(f => `"${f}"\\s*:\\s*"[^"]*"`).join('|');

    return `@{
      var body = ${source === 'request' ? 'context.Request' : 'context.Response'}.Body.As<string>();
      return System.Text.RegularExpressions.Regex.Replace(
        body,
        "${pattern}",
        m => m.Value.Replace(m.Value.Split(':')[1].Trim(), "\\"***\\"")
      );
    }`;
  }

  // Create metrics policies
  createMetricsPolicies(): IPolicy[] {
    if (!this.config.metrics?.enabled) return [];

    const policies: IPolicy[] = [];

    if (this.config.metrics.includeDefaultMetrics) {
      policies.push(this.createDefaultMetricsPolicy());
    }

    if (this.config.metrics.customMetrics) {
      for (const metric of this.config.metrics.customMetrics) {
        policies.push(this.createCustomMetricPolicy(metric));
      }
    }

    return policies;
  }

  private createDefaultMetricsPolicy(): IPolicy {
    return emitMetric({
      name: 'RequestDuration',
      value: '@((DateTime.UtcNow - context.Variables["requestStartTime"]).TotalMilliseconds)',
      namespace: 'ApiManagement',
      dimensions: {
        ApiId: '@(context.Api.Id)',
        OperationId: '@(context.Operation.Id)',
        StatusCode: '@(context.Response.StatusCode)',
        Region: '@(context.Deployment.Region)'
      }
    });
  }

  private createCustomMetricPolicy(metric: CustomMetric): IPolicy {
    return emitMetric({
      name: metric.name,
      value: `@(${metric.extractor.toString()})`,
      namespace: 'CustomMetrics',
      unit: metric.unit
    });
  }

  // Application Insights integration
  createApplicationInsightsPolicy(): IPolicy {
    if (!this.config.applicationInsights) return noop();

    return trace({
      severity: 'information',
      message: 'Application Insights telemetry',
      source: 'application-insights',
      variables: {
        operation: '@(context.Operation.Name)',
        duration: '@((DateTime.UtcNow - context.Variables["requestStartTime"]).TotalMilliseconds)',
        success: '@(context.Response.StatusCode < 400)',
        responseCode: '@(context.Response.StatusCode)',
        userId: '@(context.User?.Id)',
        sessionId: '@(context.Request.Headers.GetValueOrDefault("x-session-id", ""))',
        correlationId: '@(context.RequestId)'
      }
    });
  }

  // Correlation ID management
  createCorrelationIdPolicy(): IPolicy {
    return choose({
      when: {
        condition: '@(!context.Request.Headers.ContainsKey("x-correlation-id"))',
        operations: [
          setHeader({
            name: 'x-correlation-id',
            value: '@(context.RequestId)',
            existsAction: 'override'
          })
        ]
      }
    }).and(setHeader({
      name: 'x-correlation-id',
      value: '@(context.Request.Headers.GetValueOrDefault("x-correlation-id", context.RequestId))',
      existsAction: 'override',
      target: 'response'
    }));
  }
}
```

## Alternatives Considered

### Alternative 1: Minimal Feature Set

Implement only basic REST operations without advanced features:

**Rejected because:**
- Insufficient for production use cases
- Security vulnerabilities without proper rate limiting and validation
- Poor developer experience without pagination and filtering
- Cannot compete with other API frameworks

### Alternative 2: Third-Party Integration Only

Rely entirely on third-party libraries (Express, Fastify) for advanced features:

**Rejected because:**
- Not optimized for Azure API Management
- Additional dependencies and complexity
- May not support Government cloud
- Integration overhead

### Alternative 3: Code Generation Only

Generate all policies and configurations from annotations:

**Rejected because:**
- Less flexible than programmatic approach
- Harder to customize
- Requires complex code generation pipeline
- Poor debugging experience

## Consequences

### Positive Consequences

1. **Production Ready**: Complete feature set for enterprise REST APIs
2. **Standards Compliant**: RFC 7807, OpenAPI, OAuth 2.0, W3C Trace Context
3. **Performance**: Caching, rate limiting, and efficient pagination
4. **Security**: Authentication, authorization, validation, and input sanitization
5. **Observability**: Comprehensive logging, tracing, and metrics
6. **Developer Experience**: Type-safe APIs with excellent IntelliSense
7. **Azure Native**: Optimized for Azure services and clouds

### Negative Consequences

1. **Complexity**: Many features to understand and configure
2. **Learning Curve**: Developers need to understand REST best practices
3. **Resource Usage**: Caching and logging increase memory/storage needs
4. **Testing Overhead**: More features require more comprehensive testing

### Trade-offs

1. **Features vs Simplicity**: Comprehensive feature set over minimal implementation
2. **Performance vs Observability**: Detailed logging may impact performance
3. **Security vs Usability**: Strict validation over permissive acceptance
4. **Standards vs Flexibility**: RFC compliance over custom approaches

## Success Criteria

1. **API Coverage**: Support for all standard REST patterns
2. **Type Safety**: 100% TypeScript coverage
3. **Performance**: < 50ms p95 overhead for policies
4. **Security**: Zero unauthorized access incidents
5. **Observability**: 100% of requests traced
6. **Developer Velocity**: REST API with advanced features in < 100 lines of code
7. **Adoption**: 80% of new APIs use advanced features

## Implementation Roadmap

### Phase 1: Versioning & Pagination (Week 1)
- Implement all versioning strategies
- Add pagination helpers
- Create deprecation manager
- Unit tests for versioning and pagination

### Phase 2: Filtering & Caching (Week 2)
- Implement filtering with multiple syntaxes
- Add sorting and field selection
- Create HTTP caching helpers
- Integration tests

### Phase 3: Authentication & Authorization (Week 3)
- Implement OAuth 2.0 and Azure AD
- Add RBAC and ABAC
- Create API key authentication
- Security tests

### Phase 4: Rate Limiting & Validation (Week 4)
- Implement rate limiting strategies
- Add request/response validation
- Create input sanitization
- Performance tests

### Phase 5: Error Handling & Observability (Week 5)
- Implement RFC 7807 Problem Details
- Add distributed tracing
- Create metrics collection
- End-to-end tests

### Phase 6: Production Readiness (Week 6)
- Performance optimization
- Security audit
- Government cloud testing
- Documentation and examples

## Related Decisions

- **ADR-014**: REST API Core Architecture - Foundation for these features
- **ADR-012**: GraphQL Advanced Features - Parallel implementation for GraphQL
- **ADR-010**: API Stack Architecture - Integration with RestApiStack

## References

- [RFC 7807: Problem Details for HTTP APIs](https://tools.ietf.org/html/rfc7807)
- [RFC 8288: Web Linking (Link Header)](https://tools.ietf.org/html/rfc8288)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Azure API Management Policies](https://docs.microsoft.com/en-us/azure/api-management/api-management-policies)
- [REST API Design Best Practices](https://restfulapi.net/)
