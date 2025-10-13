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
export class SDKGenerator {
  constructor(private options: SDKGeneratorOptions = {}) {
    // Set defaults
    this.options = {
      includeJsDoc: true,
      includeRetry: true,
      includeCache: false,
      includeOptimistic: false,
      clientType: 'fetch',
      baseUrl: '/api',
      includeAuth: true,
      ...options,
    };
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
  generate(schema: SchemaDefinition<any>): GeneratedSDK {
    const imports = new Set<string>();
    const classes = new Set<string>();
    const lines: string[] = [];

    // Add file header
    lines.push(this.generateFileHeader(schema));
    lines.push('');

    // Add imports
    const importStatements = this.generateImports(schema);
    lines.push(importStatements);
    lines.push('');

    // Generate client class
    const className = `${schema.name}Client`;
    const clientClass = this.generateClientClass(schema, imports);
    lines.push(clientClass);
    classes.add(className);

    return {
      code: lines.join('\n'),
      imports: Array.from(imports),
      classes: Array.from(classes),
    };
  }

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
  generateMany(schemas: SchemaDefinition<any>[]): GeneratedSDK {
    const allImports = new Set<string>();
    const allClasses = new Set<string>();
    const lines: string[] = [];

    // Add file header
    lines.push('/**');
    lines.push(' * Auto-generated client SDK for Atakora schemas.');
    lines.push(' *');
    lines.push(' * DO NOT EDIT MANUALLY - This file is generated.');
    lines.push(' */');
    lines.push('');

    // Add shared imports
    const sharedImports = this.generateSharedImports();
    lines.push(sharedImports);
    lines.push('');

    // Generate base client
    const baseClient = this.generateBaseClient();
    lines.push(baseClient);
    lines.push('');
    allClasses.add('BaseClient');

    // Generate each schema client
    for (const schema of schemas) {
      const result = this.generate(schema);
      lines.push(result.code);
      lines.push('');

      result.imports.forEach(imp => allImports.add(imp));
      result.classes.forEach(cls => allClasses.add(cls));
    }

    // Generate main SDK class
    const mainSDK = this.generateMainSDKClass(schemas);
    lines.push(mainSDK);
    allClasses.add('AtakoraSDK');

    return {
      code: lines.join('\n'),
      imports: Array.from(allImports),
      classes: Array.from(allClasses),
    };
  }

  /**
   * Generate file header.
   */
  private generateFileHeader(schema: SchemaDefinition<any>): string {
    const lines: string[] = [];

    if (this.options.includeJsDoc) {
      lines.push('/**');
      lines.push(` * Auto-generated client SDK for ${schema.name}.`);
      lines.push(' *');

      if (schema.metadata?.description) {
        lines.push(` * ${schema.metadata.description}`);
        lines.push(' *');
      }

      lines.push(' * DO NOT EDIT MANUALLY - This file is generated.');
      lines.push(' */');
    }

    return lines.join('\n');
  }

  /**
   * Generate imports.
   */
  private generateImports(schema: SchemaDefinition<any>): string {
    const lines: string[] = [];

    lines.push(`import type {`);
    lines.push(`  ${schema.name},`);
    lines.push(`  ${schema.name}Filter,`);
    lines.push(`  Create${schema.name}Input,`);
    lines.push(`  Update${schema.name}Input,`);
    lines.push(`  ${schema.name}SortField,`);
    lines.push(`} from './types';`);
    lines.push('');
    lines.push(`import type {`);
    lines.push(`  QueryResult,`);
    lines.push(`  MutationResult,`);
    lines.push(`  PaginationOptions,`);
    lines.push(`  SortDirection,`);
    lines.push(`} from '@atakora/lib/runtime';`);

    return lines.join('\n');
  }

  /**
   * Generate shared imports.
   */
  private generateSharedImports(): string {
    const lines: string[] = [];

    lines.push(`import type {`);
    lines.push(`  QueryResult,`);
    lines.push(`  MutationResult,`);
    lines.push(`  PaginationOptions,`);
    lines.push(`  SortDirection,`);
    lines.push(`} from '@atakora/lib/runtime';`);

    return lines.join('\n');
  }

  /**
   * Generate client class.
   */
  private generateClientClass(schema: SchemaDefinition<any>, imports: Set<string>): string {
    const lines: string[] = [];
    const className = `${schema.name}Client`;

    // Class JSDoc
    if (this.options.includeJsDoc) {
      lines.push('/**');
      lines.push(` * Client for ${schema.name} operations.`);
      lines.push(' */');
    }

    lines.push(`export class ${className} {`);
    lines.push(`  constructor(private baseUrl: string = '${this.options.baseUrl}') {}`);
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
  }

  /**
   * Generate get method.
   */
  private generateGetMethod(schema: SchemaDefinition<any>): string {
    const lines: string[] = [];

    if (this.options.includeJsDoc) {
      lines.push('  /**');
      lines.push(`   * Get a ${schema.name} by ID.`);
      lines.push('   *');
      lines.push('   * @param id - Record ID');
      lines.push('   * @param include - Relationships to include');
      lines.push('   * @returns Record or null');
      lines.push('   */');
    }

    lines.push(`  async get(id: string, include?: string[]): Promise<${schema.name} | null> {`);
    lines.push(`    const params = new URLSearchParams();`);
    lines.push(`    if (include) {`);
    lines.push(`      params.set('include', include.join(','));`);
    lines.push(`    }`);
    lines.push('');
    lines.push(`    const url = \`\${this.baseUrl}/${schema.name.toLowerCase()}s/\${id}\${params.toString() ? '?' + params.toString() : ''}\`;`);
    lines.push(`    const response = await this.fetch(url);`);
    lines.push('');
    lines.push(`    if (!response.ok) {`);
    lines.push(`      if (response.status === 404) return null;`);
    lines.push(`      throw new Error(\`Failed to get ${schema.name}: \${response.statusText}\`);`);
    lines.push(`    }`);
    lines.push('');
    lines.push(`    return response.json();`);
    lines.push(`  }`);

    return lines.join('\n');
  }

  /**
   * Generate list method.
   */
  private generateListMethod(schema: SchemaDefinition<any>): string {
    const lines: string[] = [];

    if (this.options.includeJsDoc) {
      lines.push('  /**');
      lines.push(`   * List ${schema.name}s with pagination.`);
      lines.push('   *');
      lines.push('   * @param options - Pagination options');
      lines.push('   * @returns Query result with data and metadata');
      lines.push('   */');
    }

    lines.push(`  async list(options?: PaginationOptions): Promise<QueryResult<${schema.name}>> {`);
    lines.push(`    const params = new URLSearchParams();`);
    lines.push(`    if (options?.limit) params.set('limit', String(options.limit));`);
    lines.push(`    if (options?.offset) params.set('offset', String(options.offset));`);
    lines.push(`    if (options?.cursor) params.set('cursor', options.cursor);`);
    lines.push('');
    lines.push(`    const url = \`\${this.baseUrl}/${schema.name.toLowerCase()}s?\${params.toString()}\`;`);
    lines.push(`    const response = await this.fetch(url);`);
    lines.push('');
    lines.push(`    if (!response.ok) {`);
    lines.push(`      throw new Error(\`Failed to list ${schema.name}s: \${response.statusText}\`);`);
    lines.push(`    }`);
    lines.push('');
    lines.push(`    return response.json();`);
    lines.push(`  }`);

    return lines.join('\n');
  }

  /**
   * Generate create method.
   */
  private generateCreateMethod(schema: SchemaDefinition<any>): string {
    const lines: string[] = [];

    if (this.options.includeJsDoc) {
      lines.push('  /**');
      lines.push(`   * Create a new ${schema.name}.`);
      lines.push('   *');
      lines.push('   * @param data - Record data');
      lines.push('   * @returns Mutation result');
      lines.push('   */');
    }

    lines.push(`  async create(data: Create${schema.name}Input): Promise<MutationResult<${schema.name}>> {`);
    lines.push(`    const url = \`\${this.baseUrl}/${schema.name.toLowerCase()}s\`;`);
    lines.push(`    const response = await this.fetch(url, {`);
    lines.push(`      method: 'POST',`);
    lines.push(`      headers: { 'Content-Type': 'application/json' },`);
    lines.push(`      body: JSON.stringify(data),`);
    lines.push(`    });`);
    lines.push('');
    lines.push(`    if (!response.ok) {`);
    lines.push(`      const error = await response.json().catch(() => ({ message: response.statusText }));`);
    lines.push(`      return {`);
    lines.push(`        success: false,`);
    lines.push(`        errors: [{ message: error.message || 'Failed to create', code: 'CREATE_ERROR' }],`);
    lines.push(`      };`);
    lines.push(`    }`);
    lines.push('');
    lines.push(`    const result = await response.json();`);
    lines.push(`    return { success: true, data: result };`);
    lines.push(`  }`);

    return lines.join('\n');
  }

  /**
   * Generate update method.
   */
  private generateUpdateMethod(schema: SchemaDefinition<any>): string {
    const lines: string[] = [];

    if (this.options.includeJsDoc) {
      lines.push('  /**');
      lines.push(`   * Update a ${schema.name}.`);
      lines.push('   *');
      lines.push('   * @param id - Record ID');
      lines.push('   * @param data - Updated data');
      lines.push('   * @returns Mutation result');
      lines.push('   */');
    }

    lines.push(`  async update(id: string, data: Update${schema.name}Input): Promise<MutationResult<${schema.name}>> {`);
    lines.push(`    const url = \`\${this.baseUrl}/${schema.name.toLowerCase()}s/\${id}\`;`);
    lines.push(`    const response = await this.fetch(url, {`);
    lines.push(`      method: 'PATCH',`);
    lines.push(`      headers: { 'Content-Type': 'application/json' },`);
    lines.push(`      body: JSON.stringify(data),`);
    lines.push(`    });`);
    lines.push('');
    lines.push(`    if (!response.ok) {`);
    lines.push(`      const error = await response.json().catch(() => ({ message: response.statusText }));`);
    lines.push(`      return {`);
    lines.push(`        success: false,`);
    lines.push(`        errors: [{ message: error.message || 'Failed to update', code: 'UPDATE_ERROR' }],`);
    lines.push(`      };`);
    lines.push(`    }`);
    lines.push('');
    lines.push(`    const result = await response.json();`);
    lines.push(`    return { success: true, data: result };`);
    lines.push(`  }`);

    return lines.join('\n');
  }

  /**
   * Generate delete method.
   */
  private generateDeleteMethod(schema: SchemaDefinition<any>): string {
    const lines: string[] = [];

    if (this.options.includeJsDoc) {
      lines.push('  /**');
      lines.push(`   * Delete a ${schema.name}.`);
      lines.push('   *');
      lines.push('   * @param id - Record ID');
      lines.push('   * @returns Mutation result');
      lines.push('   */');
    }

    lines.push(`  async delete(id: string): Promise<MutationResult<{ id: string }>> {`);
    lines.push(`    const url = \`\${this.baseUrl}/${schema.name.toLowerCase()}s/\${id}\`;`);
    lines.push(`    const response = await this.fetch(url, { method: 'DELETE' });`);
    lines.push('');
    lines.push(`    if (!response.ok) {`);
    lines.push(`      const error = await response.json().catch(() => ({ message: response.statusText }));`);
    lines.push(`      return {`);
    lines.push(`        success: false,`);
    lines.push(`        errors: [{ message: error.message || 'Failed to delete', code: 'DELETE_ERROR' }],`);
    lines.push(`      };`);
    lines.push(`    }`);
    lines.push('');
    lines.push(`    return { success: true, data: { id } };`);
    lines.push(`  }`);

    return lines.join('\n');
  }

  /**
   * Generate query method.
   */
  private generateQueryMethod(schema: SchemaDefinition<any>): string {
    const lines: string[] = [];

    if (this.options.includeJsDoc) {
      lines.push('  /**');
      lines.push(`   * Query ${schema.name}s with filters and sorting.`);
      lines.push('   *');
      lines.push('   * @param filter - Filter conditions');
      lines.push('   * @param sort - Sort specifications');
      lines.push('   * @param pagination - Pagination options');
      lines.push('   * @returns Query result');
      lines.push('   */');
    }

    lines.push(`  async query(`);
    lines.push(`    filter?: ${schema.name}Filter,`);
    lines.push(`    sort?: { field: ${schema.name}SortField; direction: SortDirection }[],`);
    lines.push(`    pagination?: PaginationOptions`);
    lines.push(`  ): Promise<QueryResult<${schema.name}>> {`);
    lines.push(`    const params = new URLSearchParams();`);
    lines.push(`    if (filter) params.set('filter', JSON.stringify(filter));`);
    lines.push(`    if (sort) params.set('sort', JSON.stringify(sort));`);
    lines.push(`    if (pagination?.limit) params.set('limit', String(pagination.limit));`);
    lines.push(`    if (pagination?.offset) params.set('offset', String(pagination.offset));`);
    lines.push(`    if (pagination?.cursor) params.set('cursor', pagination.cursor);`);
    lines.push('');
    lines.push(`    const url = \`\${this.baseUrl}/${schema.name.toLowerCase()}s/query?\${params.toString()}\`;`);
    lines.push(`    const response = await this.fetch(url);`);
    lines.push('');
    lines.push(`    if (!response.ok) {`);
    lines.push(`      throw new Error(\`Failed to query ${schema.name}s: \${response.statusText}\`);`);
    lines.push(`    }`);
    lines.push('');
    lines.push(`    return response.json();`);
    lines.push(`  }`);

    return lines.join('\n');
  }

  /**
   * Generate retry method.
   */
  private generateRetryMethod(): string {
    const lines: string[] = [];

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
  }

  /**
   * Generate fetch method.
   */
  private generateFetchMethod(): string {
    const lines: string[] = [];

    lines.push('  /**');
    lines.push('   * Make an HTTP request.');
    lines.push('   */');
    lines.push('  private async fetch(url: string, options?: RequestInit): Promise<Response> {');
    if (this.options.includeRetry) {
      lines.push('    return this.retry(() => fetch(url, options));');
    } else {
      lines.push('    return fetch(url, options);');
    }
    lines.push('  }');

    return lines.join('\n');
  }

  /**
   * Generate base client.
   */
  private generateBaseClient(): string {
    const lines: string[] = [];

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
  }

  /**
   * Generate main SDK class.
   */
  private generateMainSDKClass(schemas: SchemaDefinition<any>[]): string {
    const lines: string[] = [];

    lines.push('/**');
    lines.push(' * Main Atakora SDK with all entity clients.');
    lines.push(' */');
    lines.push('export class AtakoraSDK {');

    // Properties for each client
    for (const schema of schemas) {
      const propName = schema.name.charAt(0).toLowerCase() + schema.name.slice(1);
      lines.push(`  public ${propName}s: ${schema.name}Client;`);
    }

    lines.push('');
    lines.push(`  constructor(baseUrl: string = '${this.options.baseUrl}') {`);

    // Initialize each client
    for (const schema of schemas) {
      const propName = schema.name.charAt(0).toLowerCase() + schema.name.slice(1);
      lines.push(`    this.${propName}s = new ${schema.name}Client(baseUrl);`);
    }

    lines.push('  }');
    lines.push('}');

    return lines.join('\n');
  }
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
export function generateSDK(
  schema: SchemaDefinition<any>,
  options?: SDKGeneratorOptions
): GeneratedSDK {
  const generator = new SDKGenerator(options);
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
export function generateManySDK(
  schemas: SchemaDefinition<any>[],
  options?: SDKGeneratorOptions
): GeneratedSDK {
  const generator = new SDKGenerator(options);
  return generator.generateMany(schemas);
}
