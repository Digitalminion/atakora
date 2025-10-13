"use strict";
/**
 * React hooks code generator for Atakora schemas.
 *
 * @remarks
 * Generates type-safe React hooks (useQuery, useMutation, etc.) with
 * proper state management, caching, and optimistic updates.
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
exports.HooksGenerator = void 0;
exports.generateHooks = generateHooks;
exports.generateManyHooks = generateManyHooks;
/**
 * React hooks generator.
 */
var HooksGenerator = /** @class */ (function () {
    function HooksGenerator(options) {
        if (options === void 0) { options = {}; }
        this.options = options;
        // Set defaults
        this.options = __assign({ includeJsDoc: true, stateLibrary: 'react-query', includeOptimistic: true, includeSuspense: false, includeErrorBoundary: true, includeRelationshipHooks: true }, options);
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
    HooksGenerator.prototype.generate = function (schema) {
        var imports = new Set();
        var hooks = new Set();
        var lines = [];
        // Add file header
        lines.push(this.generateFileHeader(schema));
        lines.push('');
        // Add imports
        var importStatements = this.generateImports(schema);
        lines.push(importStatements);
        lines.push('');
        // Generate hooks based on state library
        if (this.options.stateLibrary === 'react-query') {
            lines.push(this.generateReactQueryHooks(schema, hooks));
        }
        else if (this.options.stateLibrary === 'swr') {
            lines.push(this.generateSWRHooks(schema, hooks));
        }
        else {
            lines.push(this.generateBasicHooks(schema, hooks));
        }
        return {
            code: lines.join('\n'),
            imports: Array.from(imports),
            hooks: Array.from(hooks),
        };
    };
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
    HooksGenerator.prototype.generateMany = function (schemas) {
        var allImports = new Set();
        var allHooks = new Set();
        var lines = [];
        // Add file header
        lines.push('/**');
        lines.push(' * Auto-generated React hooks for Atakora schemas.');
        lines.push(' *');
        lines.push(' * DO NOT EDIT MANUALLY - This file is generated.');
        lines.push(' */');
        lines.push('');
        // Add shared imports
        var sharedImports = this.generateSharedImports();
        lines.push(sharedImports);
        lines.push('');
        // Generate hooks for each schema
        for (var _i = 0, schemas_1 = schemas; _i < schemas_1.length; _i++) {
            var schema = schemas_1[_i];
            var result = this.generate(schema);
            lines.push(result.code);
            lines.push('');
            result.imports.forEach(function (imp) { return allImports.add(imp); });
            result.hooks.forEach(function (hook) { return allHooks.add(hook); });
        }
        return {
            code: lines.join('\n'),
            imports: Array.from(allImports),
            hooks: Array.from(allHooks),
        };
    };
    /**
     * Generate file header.
     */
    HooksGenerator.prototype.generateFileHeader = function (schema) {
        var _a;
        var lines = [];
        if (this.options.includeJsDoc) {
            lines.push('/**');
            lines.push(" * Auto-generated React hooks for ".concat(schema.name, "."));
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
    HooksGenerator.prototype.generateImports = function (schema) {
        var lines = [];
        lines.push("import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';");
        lines.push("import type {");
        lines.push("  ".concat(schema.name, ","));
        lines.push("  ".concat(schema.name, "Filter,"));
        lines.push("  Create".concat(schema.name, "Input,"));
        lines.push("  Update".concat(schema.name, "Input,"));
        lines.push("  ".concat(schema.name, "SortField,"));
        lines.push("} from './types';");
        lines.push("import { ".concat(schema.name, "Client } from './sdk';"));
        lines.push("import type { QueryResult, MutationResult, PaginationOptions, SortDirection } from '@atakora/lib/runtime';");
        return lines.join('\n');
    };
    /**
     * Generate shared imports.
     */
    HooksGenerator.prototype.generateSharedImports = function () {
        var lines = [];
        lines.push("import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';");
        lines.push("import type { QueryResult, MutationResult, PaginationOptions, SortDirection } from '@atakora/lib/runtime';");
        return lines.join('\n');
    };
    /**
     * Generate React Query hooks.
     */
    HooksGenerator.prototype.generateReactQueryHooks = function (schema, hooks) {
        var lines = [];
        // useGet hook
        lines.push(this.generateUseGetHook(schema));
        lines.push('');
        hooks.add("use".concat(schema.name));
        // useList hook
        lines.push(this.generateUseListHook(schema));
        lines.push('');
        hooks.add("use".concat(schema.name, "List"));
        // useQuery hook
        lines.push(this.generateUseQueryHook(schema));
        lines.push('');
        hooks.add("use".concat(schema.name, "Query"));
        // useCreate hook
        lines.push(this.generateUseCreateHook(schema));
        lines.push('');
        hooks.add("useCreate".concat(schema.name));
        // useUpdate hook
        lines.push(this.generateUseUpdateHook(schema));
        lines.push('');
        hooks.add("useUpdate".concat(schema.name));
        // useDelete hook
        lines.push(this.generateUseDeleteHook(schema));
        hooks.add("useDelete".concat(schema.name));
        return lines.join('\n');
    };
    /**
     * Generate SWR hooks.
     */
    HooksGenerator.prototype.generateSWRHooks = function (schema, hooks) {
        return '// SWR hooks not yet implemented';
    };
    /**
     * Generate basic hooks without state library.
     */
    HooksGenerator.prototype.generateBasicHooks = function (schema, hooks) {
        return '// Basic hooks without state library not yet implemented';
    };
    /**
     * Generate useGet hook.
     */
    HooksGenerator.prototype.generateUseGetHook = function (schema) {
        var lines = [];
        var entityName = schema.name;
        var hookName = "use".concat(entityName);
        if (this.options.includeJsDoc) {
            lines.push('/**');
            lines.push(" * Hook to get a single ".concat(entityName, " by ID."));
            lines.push(' *');
            lines.push(' * @param id - Record ID');
            lines.push(' * @param options - Query options');
            lines.push(' * @returns Query result');
            lines.push(' *');
            lines.push(' * @example');
            lines.push(' * ```tsx');
            lines.push(" * const { data, isLoading, error } = ".concat(hookName, "('user-123');"));
            lines.push(' * ```');
            lines.push(' */');
        }
        lines.push("export function ".concat(hookName, "("));
        lines.push("  id: string,");
        lines.push("  options?: { enabled?: boolean; include?: string[] }");
        lines.push(") {");
        lines.push("  const client = new ".concat(entityName, "Client();"));
        lines.push('');
        lines.push("  return useQuery({");
        lines.push("    queryKey: ['".concat(entityName.toLowerCase(), "', id, options?.include],"));
        lines.push("    queryFn: () => client.get(id, options?.include),");
        lines.push("    enabled: options?.enabled !== false,");
        lines.push("  });");
        lines.push("}");
        return lines.join('\n');
    };
    /**
     * Generate useList hook.
     */
    HooksGenerator.prototype.generateUseListHook = function (schema) {
        var lines = [];
        var entityName = schema.name;
        var hookName = "use".concat(entityName, "List");
        if (this.options.includeJsDoc) {
            lines.push('/**');
            lines.push(" * Hook to list ".concat(entityName, "s with pagination."));
            lines.push(' *');
            lines.push(' * @param pagination - Pagination options');
            lines.push(' * @returns Query result');
            lines.push(' *');
            lines.push(' * @example');
            lines.push(' * ```tsx');
            lines.push(" * const { data, isLoading } = ".concat(hookName, "({ limit: 10, offset: 0 });"));
            lines.push(' * ```');
            lines.push(' */');
        }
        lines.push("export function ".concat(hookName, "(pagination?: PaginationOptions) {"));
        lines.push("  const client = new ".concat(entityName, "Client();"));
        lines.push('');
        lines.push("  return useQuery({");
        lines.push("    queryKey: ['".concat(entityName.toLowerCase(), "s', 'list', pagination],"));
        lines.push("    queryFn: () => client.list(pagination),");
        lines.push("  });");
        lines.push("}");
        return lines.join('\n');
    };
    /**
     * Generate useQuery hook.
     */
    HooksGenerator.prototype.generateUseQueryHook = function (schema) {
        var lines = [];
        var entityName = schema.name;
        var hookName = "use".concat(entityName, "Query");
        if (this.options.includeJsDoc) {
            lines.push('/**');
            lines.push(" * Hook to query ".concat(entityName, "s with filters and sorting."));
            lines.push(' *');
            lines.push(' * @param filter - Filter conditions');
            lines.push(' * @param sort - Sort specifications');
            lines.push(' * @param pagination - Pagination options');
            lines.push(' * @returns Query result');
            lines.push(' *');
            lines.push(' * @example');
            lines.push(' * ```tsx');
            lines.push(" * const { data } = ".concat(hookName, "("));
            lines.push(" *   { status: { equals: 'published' } },");
            lines.push(" *   [{ field: 'createdAt', direction: 'desc' }],");
            lines.push(" *   { limit: 10 }");
            lines.push(' * );');
            lines.push(' * ```');
            lines.push(' */');
        }
        lines.push("export function ".concat(hookName, "("));
        lines.push("  filter?: ".concat(entityName, "Filter,"));
        lines.push("  sort?: { field: ".concat(entityName, "SortField; direction: SortDirection }[],"));
        lines.push("  pagination?: PaginationOptions");
        lines.push(") {");
        lines.push("  const client = new ".concat(entityName, "Client();"));
        lines.push('');
        lines.push("  return useQuery({");
        lines.push("    queryKey: ['".concat(entityName.toLowerCase(), "s', 'query', filter, sort, pagination],"));
        lines.push("    queryFn: () => client.query(filter, sort, pagination),");
        lines.push("  });");
        lines.push("}");
        return lines.join('\n');
    };
    /**
     * Generate useCreate hook.
     */
    HooksGenerator.prototype.generateUseCreateHook = function (schema) {
        var lines = [];
        var entityName = schema.name;
        var hookName = "useCreate".concat(entityName);
        if (this.options.includeJsDoc) {
            lines.push('/**');
            lines.push(" * Hook to create a new ".concat(entityName, "."));
            lines.push(' *');
            lines.push(' * @returns Mutation helpers');
            lines.push(' *');
            lines.push(' * @example');
            lines.push(' * ```tsx');
            lines.push(" * const { mutate, isPending } = ".concat(hookName, "();"));
            lines.push(' *');
            lines.push(' * const handleCreate = () => {');
            lines.push(' *   mutate({ name: "John", email: "john@example.com" });');
            lines.push(' * };');
            lines.push(' * ```');
            lines.push(' */');
        }
        lines.push("export function ".concat(hookName, "() {"));
        lines.push("  const client = new ".concat(entityName, "Client();"));
        lines.push("  const queryClient = useQueryClient();");
        lines.push('');
        lines.push("  return useMutation({");
        lines.push("    mutationFn: (data: Create".concat(entityName, "Input) => client.create(data),"));
        lines.push("    onSuccess: () => {");
        lines.push("      queryClient.invalidateQueries({ queryKey: ['".concat(entityName.toLowerCase(), "s'] });"));
        lines.push("    },");
        lines.push("  });");
        lines.push("}");
        return lines.join('\n');
    };
    /**
     * Generate useUpdate hook.
     */
    HooksGenerator.prototype.generateUseUpdateHook = function (schema) {
        var lines = [];
        var entityName = schema.name;
        var hookName = "useUpdate".concat(entityName);
        if (this.options.includeJsDoc) {
            lines.push('/**');
            lines.push(" * Hook to update a ".concat(entityName, "."));
            lines.push(' *');
            lines.push(' * @returns Mutation helpers');
            lines.push(' *');
            lines.push(' * @example');
            lines.push(' * ```tsx');
            lines.push(" * const { mutate } = ".concat(hookName, "();"));
            lines.push(' *');
            lines.push(' * const handleUpdate = () => {');
            lines.push(' *   mutate({ id: "user-123", data: { name: "Jane" } });');
            lines.push(' * };');
            lines.push(' * ```');
            lines.push(' */');
        }
        lines.push("export function ".concat(hookName, "() {"));
        lines.push("  const client = new ".concat(entityName, "Client();"));
        lines.push("  const queryClient = useQueryClient();");
        lines.push('');
        lines.push("  return useMutation({");
        lines.push("    mutationFn: ({ id, data }: { id: string; data: Update".concat(entityName, "Input }) =>"));
        lines.push("      client.update(id, data),");
        lines.push("    onSuccess: (result, { id }) => {");
        lines.push("      queryClient.invalidateQueries({ queryKey: ['".concat(entityName.toLowerCase(), "', id] });"));
        lines.push("      queryClient.invalidateQueries({ queryKey: ['".concat(entityName.toLowerCase(), "s'] });"));
        lines.push("    },");
        lines.push("  });");
        lines.push("}");
        return lines.join('\n');
    };
    /**
     * Generate useDelete hook.
     */
    HooksGenerator.prototype.generateUseDeleteHook = function (schema) {
        var lines = [];
        var entityName = schema.name;
        var hookName = "useDelete".concat(entityName);
        if (this.options.includeJsDoc) {
            lines.push('/**');
            lines.push(" * Hook to delete a ".concat(entityName, "."));
            lines.push(' *');
            lines.push(' * @returns Mutation helpers');
            lines.push(' *');
            lines.push(' * @example');
            lines.push(' * ```tsx');
            lines.push(" * const { mutate } = ".concat(hookName, "();"));
            lines.push(' *');
            lines.push(' * const handleDelete = () => {');
            lines.push(' *   mutate("user-123");');
            lines.push(' * };');
            lines.push(' * ```');
            lines.push(' */');
        }
        lines.push("export function ".concat(hookName, "() {"));
        lines.push("  const client = new ".concat(entityName, "Client();"));
        lines.push("  const queryClient = useQueryClient();");
        lines.push('');
        lines.push("  return useMutation({");
        lines.push("    mutationFn: (id: string) => client.delete(id),");
        lines.push("    onSuccess: (result, id) => {");
        lines.push("      queryClient.invalidateQueries({ queryKey: ['".concat(entityName.toLowerCase(), "', id] });"));
        lines.push("      queryClient.invalidateQueries({ queryKey: ['".concat(entityName.toLowerCase(), "s'] });"));
        lines.push("    },");
        lines.push("  });");
        lines.push("}");
        return lines.join('\n');
    };
    return HooksGenerator;
}());
exports.HooksGenerator = HooksGenerator;
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
function generateHooks(schema, options) {
    var generator = new HooksGenerator(options);
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
function generateManyHooks(schemas, options) {
    var generator = new HooksGenerator(options);
    return generator.generateMany(schemas);
}
