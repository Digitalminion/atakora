"use strict";
/**
 * Client SDK code generator for Atakora schemas.
 *
 * @remarks
 * Generates type-safe client SDK with entity methods, error handling,
 * retry logic, and optimistic updates.
 *
 * @packageDocumentation
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SDKGenerator = void 0;
exports.generateSDK = generateSDK;
exports.generateManySDK = generateManySDK;
/**
 * SDK code generator.
 */
var SDKGenerator = /** @class */ (function () {
    function SDKGenerator(options) {
        if (options === void 0) { options = {}; }
        this.options = options;
        // Set defaults
        this.options = __assign({ includeJsDoc: true, includeRetry: true, includeCache: false, includeOptimistic: false, clientType: 'fetch', baseUrl: '/api', includeAuth: true }, options);
    }
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
    SDKGenerator.prototype.generate = function (schema) {
        var imports = new Set();
        var classes = new Set();
        var lines = [];
        // Add file header
        lines.push(this.generateFileHeader(schema));
        lines.push('');
        // Add imports
        var importStatements = this.generateImports(schema);
        lines.push(importStatements);
        lines.push('');
        // Generate client class
        var className = "".concat(schema.name, "Client");
        var clientClass = this.generateClientClass(schema, imports);
        lines.push(clientClass);
        classes.add(className);
        return {
            code: lines.join('\n'),
            imports: Array.from(imports),
            classes: Array.from(classes),
        };
    };
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
    SDKGenerator.prototype.generateMany = function (schemas) {
        var allImports = new Set();
        var allClasses = new Set();
        var lines = [];
        // Add file header
        lines.push('/**');
        lines.push(' * Auto-generated client SDK for Atakora schemas.');
        lines.push(' *');
        lines.push(' * DO NOT EDIT MANUALLY - This file is generated.');
        lines.push(' */');
        lines.push('');
        // Add shared imports
        var sharedImports = this.generateSharedImports();
        lines.push(sharedImports);
        lines.push('');
        // Generate base client
        var baseClient = this.generateBaseClient();
        lines.push(baseClient);
        lines.push('');
        allClasses.add('BaseClient');
        // Generate each schema client
        for (var _i = 0, schemas_1 = schemas; _i < schemas_1.length; _i++) {
            var schema = schemas_1[_i];
            var result = this.generate(schema);
            lines.push(result.code);
            lines.push('');
            result.imports.forEach(function (imp) { return allImports.add(imp); });
            result.classes.forEach(function (cls) { return allClasses.add(cls); });
        }
        // Generate main SDK class
        var mainSDK = this.generateMainSDKClass(schemas);
        lines.push(mainSDK);
        allClasses.add('AtakoraSDK');
        return {
            code: lines.join('\n'),
            imports: Array.from(allImports),
            classes: Array.from(allClasses),
        };
    };
    /**
     * Generate file header.
     */
    SDKGenerator.prototype.generateFileHeader = function (schema) {
        var _a;
        var lines = [];
        if (this.options.includeJsDoc) {
            lines.push('/**');
            lines.push(" * Auto-generated client SDK for ".concat(schema.name, "."));
            lines.push(' *');
            if ((_a = schema.metadata) === null || _a === void 0 ? void 0 : _a.description) {
                lines.push(" * ".concat(schema.metadata.description));
                lines.push(' *');
            }
            lines.push(' * DO NOT EDIT MANUALLY - This file is generated.');
            lines.push(' */');
        }
        return lines.join('\n');
    };
    /**
     * Generate imports.
     */
    SDKGenerator.prototype.generateImports = function (schema) {
        var lines = [];
        lines.push("import type {");
        lines.push("  ".concat(schema.name, ","));
        lines.push("  ".concat(schema.name, "Filter,"));
        lines.push("  Create".concat(schema.name, "Input,"));
        lines.push("  Update".concat(schema.name, "Input,"));
        lines.push("  ".concat(schema.name, "SortField,"));
        lines.push("} from './types';");
        lines.push('');
        lines.push("import type {");
        lines.push("  QueryResult,");
        lines.push("  MutationResult,");
        lines.push("  PaginationOptions,");
        lines.push("  SortDirection,");
        lines.push("} from '@atakora/lib/runtime';");
        return lines.join('\n');
    };
    /**
     * Generate shared imports.
     */
    SDKGenerator.prototype.generateSharedImports = function () {
        var lines = [];
        lines.push("import type {");
        lines.push("  QueryResult,");
        lines.push("  MutationResult,");
        lines.push("  PaginationOptions,");
        lines.push("  SortDirection,");
        lines.push("} from '@atakora/lib/runtime';");
        return lines.join('\n');
    };
    /**
     * Generate client class.
     */
    SDKGenerator.prototype.generateClientClass = function (schema, imports) {
        var lines = [];
        var className = "".concat(schema.name, "Client");
        // Class JSDoc
        if (this.options.includeJsDoc) {
            lines.push('/**');
            lines.push(" * Client for ".concat(schema.name, " operations."));
            lines.push(' */');
        }
        lines.push("export class ".concat(className, " {"));
        lines.push("  constructor(private baseUrl: string = '".concat(this.options.baseUrl, "') {}"));
        lines.push('');
        // Get by ID
        lines.push(this.generateGetMethod(schema));
        lines.push('');
        // List/query
        lines.push(this.generateListMethod(schema));
        lines.push('');
        // Create
        lines.push(this.generateCreateMethod(schema));
        lines.push('');
        // Update
        lines.push(this.generateUpdateMethod(schema));
        lines.push('');
        // Delete
        lines.push(this.generateDeleteMethod(schema));
        lines.push('');
        // Query method
        lines.push(this.generateQueryMethod(schema));
        lines.push('');
        // Helper methods
        if (this.options.includeRetry) {
            lines.push(this.generateRetryMethod());
            lines.push('');
        }
        lines.push(this.generateFetchMethod());
        lines.push('}');
        return lines.join('\n');
    };
    /**
     * Generate get method.
     */
    SDKGenerator.prototype.generateGetMethod = function (schema) {
        var lines = [];
        if (this.options.includeJsDoc) {
            lines.push('  /**');
            lines.push("   * Get a ".concat(schema.name, " by ID."));
            lines.push('   *');
            lines.push('   * @param id - Record ID');
            lines.push('   * @param include - Relationships to include');
            lines.push('   * @returns Record or null');
            lines.push('   */');
        }
        lines.push("  async get(id: string, include?: string[]): Promise<".concat(schema.name, " | null> {"));
        lines.push("    const params = new URLSearchParams();");
        lines.push("    if (include) {");
        lines.push("      params.set('include', include.join(','));");
        lines.push("    }");
        lines.push('');
        lines.push("    const url = `${this.baseUrl}/".concat(schema.name.toLowerCase(), "s/${id}${params.toString() ? '?' + params.toString() : ''}`;"));
        lines.push("    const response = await this.fetch(url);");
        lines.push('');
        lines.push("    if (!response.ok) {");
        lines.push("      if (response.status === 404) return null;");
        lines.push("      throw new Error(`Failed to get ".concat(schema.name, ": ${response.statusText}`);"));
        lines.push("    }");
        lines.push('');
        lines.push("    return response.json();");
        lines.push("  }");
        return lines.join('\n');
    };
    /**
     * Generate list method.
     */
    SDKGenerator.prototype.generateListMethod = function (schema) {
        var lines = [];
        if (this.options.includeJsDoc) {
            lines.push('  /**');
            lines.push("   * List ".concat(schema.name, "s with pagination."));
            lines.push('   *');
            lines.push('   * @param options - Pagination options');
            lines.push('   * @returns Query result with data and metadata');
            lines.push('   */');
        }
        lines.push("  async list(options?: PaginationOptions): Promise<QueryResult<".concat(schema.name, ">> {"));
        lines.push("    const params = new URLSearchParams();");
        lines.push("    if (options?.limit) params.set('limit', String(options.limit));");
        lines.push("    if (options?.offset) params.set('offset', String(options.offset));");
        lines.push("    if (options?.cursor) params.set('cursor', options.cursor);");
        lines.push('');
        lines.push("    const url = `${this.baseUrl}/".concat(schema.name.toLowerCase(), "s?${params.toString()}`;"));
        lines.push("    const response = await this.fetch(url);");
        lines.push('');
        lines.push("    if (!response.ok) {");
        lines.push("      throw new Error(`Failed to list ".concat(schema.name, "s: ${response.statusText}`);"));
        lines.push("    }");
        lines.push('');
        lines.push("    return response.json();");
        lines.push("  }");
        return lines.join('\n');
    };
    /**
     * Generate create method.
     */
    SDKGenerator.prototype.generateCreateMethod = function (schema) {
        var lines = [];
        if (this.options.includeJsDoc) {
            lines.push('  /**');
            lines.push("   * Create a new ".concat(schema.name, "."));
            lines.push('   *');
            lines.push('   * @param data - Record data');
            lines.push('   * @returns Mutation result');
            lines.push('   */');
        }
        lines.push("  async create(data: Create".concat(schema.name, "Input): Promise<MutationResult<").concat(schema.name, ">> {"));
        lines.push("    const url = `${this.baseUrl}/".concat(schema.name.toLowerCase(), "s`;"));
        lines.push("    const response = await this.fetch(url, {");
        lines.push("      method: 'POST',");
        lines.push("      headers: { 'Content-Type': 'application/json' },");
        lines.push("      body: JSON.stringify(data),");
        lines.push("    });");
        lines.push('');
        lines.push("    if (!response.ok) {");
        lines.push("      const error = await response.json().catch(() => ({ message: response.statusText }));");
        lines.push("      return {");
        lines.push("        success: false,");
        lines.push("        errors: [{ message: error.message || 'Failed to create', code: 'CREATE_ERROR' }],");
        lines.push("      };");
        lines.push("    }");
        lines.push('');
        lines.push("    const result = await response.json();");
        lines.push("    return { success: true, data: result };");
        lines.push("  }");
        return lines.join('\n');
    };
    /**
     * Generate update method.
     */
    SDKGenerator.prototype.generateUpdateMethod = function (schema) {
        var lines = [];
        if (this.options.includeJsDoc) {
            lines.push('  /**');
            lines.push("   * Update a ".concat(schema.name, "."));
            lines.push('   *');
            lines.push('   * @param id - Record ID');
            lines.push('   * @param data - Updated data');
            lines.push('   * @returns Mutation result');
            lines.push('   */');
        }
        lines.push("  async update(id: string, data: Update".concat(schema.name, "Input): Promise<MutationResult<").concat(schema.name, ">> {"));
        lines.push("    const url = `${this.baseUrl}/".concat(schema.name.toLowerCase(), "s/${id}`;"));
        lines.push("    const response = await this.fetch(url, {");
        lines.push("      method: 'PATCH',");
        lines.push("      headers: { 'Content-Type': 'application/json' },");
        lines.push("      body: JSON.stringify(data),");
        lines.push("    });");
        lines.push('');
        lines.push("    if (!response.ok) {");
        lines.push("      const error = await response.json().catch(() => ({ message: response.statusText }));");
        lines.push("      return {");
        lines.push("        success: false,");
        lines.push("        errors: [{ message: error.message || 'Failed to update', code: 'UPDATE_ERROR' }],");
        lines.push("      };");
        lines.push("    }");
        lines.push('');
        lines.push("    const result = await response.json();");
        lines.push("    return { success: true, data: result };");
        lines.push("  }");
        return lines.join('\n');
    };
    /**
     * Generate delete method.
     */
    SDKGenerator.prototype.generateDeleteMethod = function (schema) {
        var lines = [];
        if (this.options.includeJsDoc) {
            lines.push('  /**');
            lines.push("   * Delete a ".concat(schema.name, "."));
            lines.push('   *');
            lines.push('   * @param id - Record ID');
            lines.push('   * @returns Mutation result');
            lines.push('   */');
        }
        lines.push("  async delete(id: string): Promise<MutationResult<{ id: string }>> {");
        lines.push("    const url = `${this.baseUrl}/".concat(schema.name.toLowerCase(), "s/${id}`;"));
        lines.push("    const response = await this.fetch(url, { method: 'DELETE' });");
        lines.push('');
        lines.push("    if (!response.ok) {");
        lines.push("      const error = await response.json().catch(() => ({ message: response.statusText }));");
        lines.push("      return {");
        lines.push("        success: false,");
        lines.push("        errors: [{ message: error.message || 'Failed to delete', code: 'DELETE_ERROR' }],");
        lines.push("      };");
        lines.push("    }");
        lines.push('');
        lines.push("    return { success: true, data: { id } };");
        lines.push("  }");
        return lines.join('\n');
    };
    /**
     * Generate query method.
     */
    SDKGenerator.prototype.generateQueryMethod = function (schema) {
        var lines = [];
        if (this.options.includeJsDoc) {
            lines.push('  /**');
            lines.push("   * Query ".concat(schema.name, "s with filters and sorting."));
            lines.push('   *');
            lines.push('   * @param filter - Filter conditions');
            lines.push('   * @param sort - Sort specifications');
            lines.push('   * @param pagination - Pagination options');
            lines.push('   * @returns Query result');
            lines.push('   */');
        }
        lines.push("  async query(");
        lines.push("    filter?: ".concat(schema.name, "Filter,"));
        lines.push("    sort?: { field: ".concat(schema.name, "SortField; direction: SortDirection }[],"));
        lines.push("    pagination?: PaginationOptions");
        lines.push("  ): Promise<QueryResult<".concat(schema.name, ">> {"));
        lines.push("    const params = new URLSearchParams();");
        lines.push("    if (filter) params.set('filter', JSON.stringify(filter));");
        lines.push("    if (sort) params.set('sort', JSON.stringify(sort));");
        lines.push("    if (pagination?.limit) params.set('limit', String(pagination.limit));");
        lines.push("    if (pagination?.offset) params.set('offset', String(pagination.offset));");
        lines.push("    if (pagination?.cursor) params.set('cursor', pagination.cursor);");
        lines.push('');
        lines.push("    const url = `${this.baseUrl}/".concat(schema.name.toLowerCase(), "s/query?${params.toString()}`;"));
        lines.push("    const response = await this.fetch(url);");
        lines.push('');
        lines.push("    if (!response.ok) {");
        lines.push("      throw new Error(`Failed to query ".concat(schema.name, "s: ${response.statusText}`);"));
        lines.push("    }");
        lines.push('');
        lines.push("    return response.json();");
        lines.push("  }");
        return lines.join('\n');
    };
    /**
     * Generate retry method.
     */
    SDKGenerator.prototype.generateRetryMethod = function () {
        var lines = [];
        lines.push('  /**');
        lines.push('   * Retry a request with exponential backoff.');
        lines.push('   */');
        lines.push('  private async retry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {');
        lines.push('    let lastError: Error;');
        lines.push('    for (let i = 0; i < maxRetries; i++) {');
        lines.push('      try {');
        lines.push('        return await fn();');
        lines.push('      } catch (error) {');
        lines.push('        lastError = error as Error;');
        lines.push('        if (i < maxRetries - 1) {');
        lines.push('          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));');
        lines.push('        }');
        lines.push('      }');
        lines.push('    }');
        lines.push('    throw lastError!;');
        lines.push('  }');
        return lines.join('\n');
    };
    /**
     * Generate fetch method.
     */
    SDKGenerator.prototype.generateFetchMethod = function () {
        var lines = [];
        lines.push('  /**');
        lines.push('   * Make an HTTP request.');
        lines.push('   */');
        lines.push('  private async fetch(url: string, options?: RequestInit): Promise<Response> {');
        if (this.options.includeRetry) {
            lines.push('    return this.retry(() => fetch(url, options));');
        }
        else {
            lines.push('    return fetch(url, options);');
        }
        lines.push('  }');
        return lines.join('\n');
    };
    /**
     * Generate base client.
     */
    SDKGenerator.prototype.generateBaseClient = function () {
        var lines = [];
        lines.push('/**');
        lines.push(' * Base client with shared functionality.');
        lines.push(' */');
        lines.push('export class BaseClient {');
        lines.push('  constructor(protected baseUrl: string) {}');
        lines.push('');
        lines.push('  protected async fetch(url: string, options?: RequestInit): Promise<Response> {');
        lines.push('    return fetch(url, options);');
        lines.push('  }');
        lines.push('}');
        return lines.join('\n');
    };
    /**
     * Generate main SDK class.
     */
    SDKGenerator.prototype.generateMainSDKClass = function (schemas) {
        var lines = [];
        lines.push('/**');
        lines.push(' * Main Atakora SDK with all entity clients.');
        lines.push(' */');
        lines.push('export class AtakoraSDK {');
        // Properties for each client
        for (var _i = 0, schemas_2 = schemas; _i < schemas_2.length; _i++) {
            var schema = schemas_2[_i];
            var propName = schema.name.charAt(0).toLowerCase() + schema.name.slice(1);
            lines.push("  public ".concat(propName, "s: ").concat(schema.name, "Client;"));
        }
        lines.push('');
        lines.push("  constructor(baseUrl: string = '".concat(this.options.baseUrl, "') {"));
        // Initialize each client
        for (var _a = 0, schemas_3 = schemas; _a < schemas_3.length; _a++) {
            var schema = schemas_3[_a];
            var propName = schema.name.charAt(0).toLowerCase() + schema.name.slice(1);
            lines.push("    this.".concat(propName, "s = new ").concat(schema.name, "Client(baseUrl);"));
        }
        lines.push('  }');
        lines.push('}');
        return lines.join('\n');
    };
    return SDKGenerator;
}());
exports.SDKGenerator = SDKGenerator;
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
function generateSDK(schema, options) {
    var generator = new SDKGenerator(options);
    return generator.generate(schema);
}
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
function generateManySDK(schemas, options) {
    var generator = new SDKGenerator(options);
    return generator.generateMany(schemas);
}
