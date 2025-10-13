/**
 * React hooks code generator for Atakora schemas.
 *
 * @remarks
 * Generates type-safe React hooks (useQuery, useMutation, etc.) with
 * proper state management, caching, and optimistic updates.
 *
 * @packageDocumentation
 */

import type { SchemaDefinition } from '../schema/atakora/schema-types';

/**
 * Hooks generation options.
 */
export interface HooksGeneratorOptions {
  /**
   * Include JSDoc comments.
   */
  includeJsDoc?: boolean;

  /**
   * State management library (react-query, swr, redux).
   */
  stateLibrary?: 'react-query' | 'swr' | 'zustand' | 'none';

  /**
   * Include optimistic updates.
   */
  includeOptimistic?: boolean;

  /**
   * Include suspense support.
   */
  includeSuspense?: boolean;

  /**
   * Include error boundaries.
   */
  includeErrorBoundary?: boolean;

  /**
   * Generate custom hooks for relationships.
   */
  includeRelationshipHooks?: boolean;
}

/**
 * Generated hooks result.
 */
export interface GeneratedHooks {
  /**
   * Generated hooks code.
   */
  code: string;

  /**
   * Import statements needed.
   */
  imports: string[];

  /**
   * Hook names generated.
   */
  hooks: string[];
}

/**
 * React hooks generator.
 */
export class HooksGenerator {
  constructor(private options: HooksGeneratorOptions = {}) {
    // Set defaults
    this.options = {
      includeJsDoc: true,
      stateLibrary: 'react-query',
      includeOptimistic: true,
      includeSuspense: false,
      includeErrorBoundary: true,
      includeRelationshipHooks: true,
      ...options,
    };
  }

  /**
   * Generate React hooks for a schema.
   *
   * @param schema - Schema definition
   * @returns Generated hooks code
   *
   * @example
   * ```typescript
   * const generator = new HooksGenerator({ stateLibrary: 'react-query' });
   * const { code } = generator.generate(UserSchema);
   * console.log(code);
   * ```
   */
  generate(schema: SchemaDefinition<any>): GeneratedHooks {
    const imports = new Set<string>();
    const hooks = new Set<string>();
    const lines: string[] = [];

    // Add file header
    lines.push(this.generateFileHeader(schema));
    lines.push('');

    // Add imports
    const importStatements = this.generateImports(schema);
    lines.push(importStatements);
    lines.push('');

    // Generate hooks based on state library
    if (this.options.stateLibrary === 'react-query') {
      lines.push(this.generateReactQueryHooks(schema, hooks));
    } else if (this.options.stateLibrary === 'swr') {
      lines.push(this.generateSWRHooks(schema, hooks));
    } else {
      lines.push(this.generateBasicHooks(schema, hooks));
    }

    return {
      code: lines.join('\n'),
      imports: Array.from(imports),
      hooks: Array.from(hooks),
    };
  }

  /**
   * Generate hooks for multiple schemas.
   *
   * @param schemas - Schema definitions
   * @returns Generated hooks code
   *
   * @example
   * ```typescript
   * const generator = new HooksGenerator();
   * const { code } = generator.generateMany([UserSchema, PostSchema, CommentSchema]);
   * ```
   */
  generateMany(schemas: SchemaDefinition<any>[]): GeneratedHooks {
    const allImports = new Set<string>();
    const allHooks = new Set<string>();
    const lines: string[] = [];

    // Add file header
    lines.push('/**');
    lines.push(' * Auto-generated React hooks for Atakora schemas.');
    lines.push(' *');
    lines.push(' * DO NOT EDIT MANUALLY - This file is generated.');
    lines.push(' */');
    lines.push('');

    // Add shared imports
    const sharedImports = this.generateSharedImports();
    lines.push(sharedImports);
    lines.push('');

    // Generate hooks for each schema
    for (const schema of schemas) {
      const result = this.generate(schema);
      lines.push(result.code);
      lines.push('');

      result.imports.forEach(imp => allImports.add(imp));
      result.hooks.forEach(hook => allHooks.add(hook));
    }

    return {
      code: lines.join('\n'),
      imports: Array.from(allImports),
      hooks: Array.from(allHooks),
    };
  }

  /**
   * Generate file header.
   */
  private generateFileHeader(schema: SchemaDefinition<any>): string {
    const lines: string[] = [];

    if (this.options.includeJsDoc) {
      lines.push('/**');
      lines.push(` * Auto-generated React hooks for ${schema.name}.`);
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

    lines.push(`import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';`);
    lines.push(`import type {`);
    lines.push(`  ${schema.name},`);
    lines.push(`  ${schema.name}Filter,`);
    lines.push(`  Create${schema.name}Input,`);
    lines.push(`  Update${schema.name}Input,`);
    lines.push(`  ${schema.name}SortField,`);
    lines.push(`} from './types';`);
    lines.push(`import { ${schema.name}Client } from './sdk';`);
    lines.push(`import type { QueryResult, MutationResult, PaginationOptions, SortDirection } from '@atakora/lib/runtime';`);

    return lines.join('\n');
  }

  /**
   * Generate shared imports.
   */
  private generateSharedImports(): string {
    const lines: string[] = [];

    lines.push(`import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';`);
    lines.push(`import type { QueryResult, MutationResult, PaginationOptions, SortDirection } from '@atakora/lib/runtime';`);

    return lines.join('\n');
  }

  /**
   * Generate React Query hooks.
   */
  private generateReactQueryHooks(schema: SchemaDefinition<any>, hooks: Set<string>): string {
    const lines: string[] = [];

    // useGet hook
    lines.push(this.generateUseGetHook(schema));
    lines.push('');
    hooks.add(`use${schema.name}`);

    // useList hook
    lines.push(this.generateUseListHook(schema));
    lines.push('');
    hooks.add(`use${schema.name}List`);

    // useQuery hook
    lines.push(this.generateUseQueryHook(schema));
    lines.push('');
    hooks.add(`use${schema.name}Query`);

    // useCreate hook
    lines.push(this.generateUseCreateHook(schema));
    lines.push('');
    hooks.add(`useCreate${schema.name}`);

    // useUpdate hook
    lines.push(this.generateUseUpdateHook(schema));
    lines.push('');
    hooks.add(`useUpdate${schema.name}`);

    // useDelete hook
    lines.push(this.generateUseDeleteHook(schema));
    hooks.add(`useDelete${schema.name}`);

    return lines.join('\n');
  }

  /**
   * Generate SWR hooks.
   */
  private generateSWRHooks(schema: SchemaDefinition<any>, hooks: Set<string>): string {
    return '// SWR hooks not yet implemented';
  }

  /**
   * Generate basic hooks without state library.
   */
  private generateBasicHooks(schema: SchemaDefinition<any>, hooks: Set<string>): string {
    return '// Basic hooks without state library not yet implemented';
  }

  /**
   * Generate useGet hook.
   */
  private generateUseGetHook(schema: SchemaDefinition<any>): string {
    const lines: string[] = [];
    const entityName = schema.name;
    const hookName = `use${entityName}`;

    if (this.options.includeJsDoc) {
      lines.push('/**');
      lines.push(` * Hook to get a single ${entityName} by ID.`);
      lines.push(' *');
      lines.push(' * @param id - Record ID');
      lines.push(' * @param options - Query options');
      lines.push(' * @returns Query result');
      lines.push(' *');
      lines.push(' * @example');
      lines.push(' * ```tsx');
      lines.push(` * const { data, isLoading, error } = ${hookName}('user-123');`);
      lines.push(' * ```');
      lines.push(' */');
    }

    lines.push(`export function ${hookName}(`);
    lines.push(`  id: string,`);
    lines.push(`  options?: { enabled?: boolean; include?: string[] }`);
    lines.push(`) {`);
    lines.push(`  const client = new ${entityName}Client();`);
    lines.push('');
    lines.push(`  return useQuery({`);
    lines.push(`    queryKey: ['${entityName.toLowerCase()}', id, options?.include],`);
    lines.push(`    queryFn: () => client.get(id, options?.include),`);
    lines.push(`    enabled: options?.enabled !== false,`);
    lines.push(`  });`);
    lines.push(`}`);

    return lines.join('\n');
  }

  /**
   * Generate useList hook.
   */
  private generateUseListHook(schema: SchemaDefinition<any>): string {
    const lines: string[] = [];
    const entityName = schema.name;
    const hookName = `use${entityName}List`;

    if (this.options.includeJsDoc) {
      lines.push('/**');
      lines.push(` * Hook to list ${entityName}s with pagination.`);
      lines.push(' *');
      lines.push(' * @param pagination - Pagination options');
      lines.push(' * @returns Query result');
      lines.push(' *');
      lines.push(' * @example');
      lines.push(' * ```tsx');
      lines.push(` * const { data, isLoading } = ${hookName}({ limit: 10, offset: 0 });`);
      lines.push(' * ```');
      lines.push(' */');
    }

    lines.push(`export function ${hookName}(pagination?: PaginationOptions) {`);
    lines.push(`  const client = new ${entityName}Client();`);
    lines.push('');
    lines.push(`  return useQuery({`);
    lines.push(`    queryKey: ['${entityName.toLowerCase()}s', 'list', pagination],`);
    lines.push(`    queryFn: () => client.list(pagination),`);
    lines.push(`  });`);
    lines.push(`}`);

    return lines.join('\n');
  }

  /**
   * Generate useQuery hook.
   */
  private generateUseQueryHook(schema: SchemaDefinition<any>): string {
    const lines: string[] = [];
    const entityName = schema.name;
    const hookName = `use${entityName}Query`;

    if (this.options.includeJsDoc) {
      lines.push('/**');
      lines.push(` * Hook to query ${entityName}s with filters and sorting.`);
      lines.push(' *');
      lines.push(' * @param filter - Filter conditions');
      lines.push(' * @param sort - Sort specifications');
      lines.push(' * @param pagination - Pagination options');
      lines.push(' * @returns Query result');
      lines.push(' *');
      lines.push(' * @example');
      lines.push(' * ```tsx');
      lines.push(` * const { data } = ${hookName}(`);
      lines.push(` *   { status: { equals: 'published' } },`);
      lines.push(` *   [{ field: 'createdAt', direction: 'desc' }],`);
      lines.push(` *   { limit: 10 }`);
      lines.push(' * );');
      lines.push(' * ```');
      lines.push(' */');
    }

    lines.push(`export function ${hookName}(`);
    lines.push(`  filter?: ${entityName}Filter,`);
    lines.push(`  sort?: { field: ${entityName}SortField; direction: SortDirection }[],`);
    lines.push(`  pagination?: PaginationOptions`);
    lines.push(`) {`);
    lines.push(`  const client = new ${entityName}Client();`);
    lines.push('');
    lines.push(`  return useQuery({`);
    lines.push(`    queryKey: ['${entityName.toLowerCase()}s', 'query', filter, sort, pagination],`);
    lines.push(`    queryFn: () => client.query(filter, sort, pagination),`);
    lines.push(`  });`);
    lines.push(`}`);

    return lines.join('\n');
  }

  /**
   * Generate useCreate hook.
   */
  private generateUseCreateHook(schema: SchemaDefinition<any>): string {
    const lines: string[] = [];
    const entityName = schema.name;
    const hookName = `useCreate${entityName}`;

    if (this.options.includeJsDoc) {
      lines.push('/**');
      lines.push(` * Hook to create a new ${entityName}.`);
      lines.push(' *');
      lines.push(' * @returns Mutation helpers');
      lines.push(' *');
      lines.push(' * @example');
      lines.push(' * ```tsx');
      lines.push(` * const { mutate, isPending } = ${hookName}();`);
      lines.push(' *');
      lines.push(' * const handleCreate = () => {');
      lines.push(' *   mutate({ name: "John", email: "john@example.com" });');
      lines.push(' * };');
      lines.push(' * ```');
      lines.push(' */');
    }

    lines.push(`export function ${hookName}() {`);
    lines.push(`  const client = new ${entityName}Client();`);
    lines.push(`  const queryClient = useQueryClient();`);
    lines.push('');
    lines.push(`  return useMutation({`);
    lines.push(`    mutationFn: (data: Create${entityName}Input) => client.create(data),`);
    lines.push(`    onSuccess: () => {`);
    lines.push(`      queryClient.invalidateQueries({ queryKey: ['${entityName.toLowerCase()}s'] });`);
    lines.push(`    },`);
    lines.push(`  });`);
    lines.push(`}`);

    return lines.join('\n');
  }

  /**
   * Generate useUpdate hook.
   */
  private generateUseUpdateHook(schema: SchemaDefinition<any>): string {
    const lines: string[] = [];
    const entityName = schema.name;
    const hookName = `useUpdate${entityName}`;

    if (this.options.includeJsDoc) {
      lines.push('/**');
      lines.push(` * Hook to update a ${entityName}.`);
      lines.push(' *');
      lines.push(' * @returns Mutation helpers');
      lines.push(' *');
      lines.push(' * @example');
      lines.push(' * ```tsx');
      lines.push(` * const { mutate } = ${hookName}();`);
      lines.push(' *');
      lines.push(' * const handleUpdate = () => {');
      lines.push(' *   mutate({ id: "user-123", data: { name: "Jane" } });');
      lines.push(' * };');
      lines.push(' * ```');
      lines.push(' */');
    }

    lines.push(`export function ${hookName}() {`);
    lines.push(`  const client = new ${entityName}Client();`);
    lines.push(`  const queryClient = useQueryClient();`);
    lines.push('');
    lines.push(`  return useMutation({`);
    lines.push(`    mutationFn: ({ id, data }: { id: string; data: Update${entityName}Input }) =>`);
    lines.push(`      client.update(id, data),`);
    lines.push(`    onSuccess: (result, { id }) => {`);
    lines.push(`      queryClient.invalidateQueries({ queryKey: ['${entityName.toLowerCase()}', id] });`);
    lines.push(`      queryClient.invalidateQueries({ queryKey: ['${entityName.toLowerCase()}s'] });`);
    lines.push(`    },`);
    lines.push(`  });`);
    lines.push(`}`);

    return lines.join('\n');
  }

  /**
   * Generate useDelete hook.
   */
  private generateUseDeleteHook(schema: SchemaDefinition<any>): string {
    const lines: string[] = [];
    const entityName = schema.name;
    const hookName = `useDelete${entityName}`;

    if (this.options.includeJsDoc) {
      lines.push('/**');
      lines.push(` * Hook to delete a ${entityName}.`);
      lines.push(' *');
      lines.push(' * @returns Mutation helpers');
      lines.push(' *');
      lines.push(' * @example');
      lines.push(' * ```tsx');
      lines.push(` * const { mutate } = ${hookName}();`);
      lines.push(' *');
      lines.push(' * const handleDelete = () => {');
      lines.push(' *   mutate("user-123");');
      lines.push(' * };');
      lines.push(' * ```');
      lines.push(' */');
    }

    lines.push(`export function ${hookName}() {`);
    lines.push(`  const client = new ${entityName}Client();`);
    lines.push(`  const queryClient = useQueryClient();`);
    lines.push('');
    lines.push(`  return useMutation({`);
    lines.push(`    mutationFn: (id: string) => client.delete(id),`);
    lines.push(`    onSuccess: (result, id) => {`);
    lines.push(`      queryClient.invalidateQueries({ queryKey: ['${entityName.toLowerCase()}', id] });`);
    lines.push(`      queryClient.invalidateQueries({ queryKey: ['${entityName.toLowerCase()}s'] });`);
    lines.push(`    },`);
    lines.push(`  });`);
    lines.push(`}`);

    return lines.join('\n');
  }
}

/**
 * Generate React hooks for a schema.
 *
 * @param schema - Schema definition
 * @param options - Generator options
 * @returns Generated hooks code
 *
 * @example
 * ```typescript
 * const { code } = generateHooks(UserSchema, {
 *   stateLibrary: 'react-query',
 *   includeOptimistic: true
 * });
 *
 * await fs.writeFile('user-hooks.ts', code);
 * ```
 */
export function generateHooks(
  schema: SchemaDefinition<any>,
  options?: HooksGeneratorOptions
): GeneratedHooks {
  const generator = new HooksGenerator(options);
  return generator.generate(schema);
}

/**
 * Generate React hooks for multiple schemas.
 *
 * @param schemas - Schema definitions
 * @param options - Generator options
 * @returns Generated hooks code
 *
 * @example
 * ```typescript
 * const { code } = generateManyHooks([UserSchema, PostSchema, CommentSchema]);
 * await fs.writeFile('hooks.ts', code);
 * ```
 */
export function generateManyHooks(
  schemas: SchemaDefinition<any>[],
  options?: HooksGeneratorOptions
): GeneratedHooks {
  const generator = new HooksGenerator(options);
  return generator.generateMany(schemas);
}
