"use strict";
/**
 * TypeScript types code generator for Atakora schemas.
 *
 * @remarks
 * Generates TypeScript interfaces, types, filter types, and input types
 * from Atakora schema definitions with JSDoc documentation.
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
exports.TypesGenerator = void 0;
exports.generateTypes = generateTypes;
exports.generateManyTypes = generateManyTypes;
var field_types_1 = require("../schema/atakora/field-types");
/**
 * TypeScript types generator.
 */
var TypesGenerator = /** @class */ (function () {
    function TypesGenerator(options) {
        if (options === void 0) { options = {}; }
        this.options = options;
        // Set defaults
        this.options = __assign({ includeJsDoc: true, generateFilters: true, generateInputs: true, includeRelationships: true, includeComputed: true, targetVersion: 'es2020', strictNullChecks: true }, options);
    }
    /**
     * Generate TypeScript types for a schema.
     *
     * @param schema - Schema definition
     * @returns Generated code
     *
     * @example
     * ```typescript
     * const generator = new TypesGenerator();
     * const { code } = generator.generate(UserSchema);
     * console.log(code);
     * ```
     */
    TypesGenerator.prototype.generate = function (schema) {
        var imports = new Set();
        var types = new Set();
        var lines = [];
        // Add file header
        lines.push(this.generateFileHeader(schema));
        lines.push('');
        // Generate main entity interface
        var entityType = this.generateEntityInterface(schema, imports);
        lines.push(entityType);
        lines.push('');
        types.add(schema.name);
        // Generate filter type
        if (this.options.generateFilters) {
            var filterType = this.generateFilterType(schema, imports);
            lines.push(filterType);
            lines.push('');
            types.add("".concat(schema.name, "Filter"));
        }
        // Generate input types
        if (this.options.generateInputs) {
            var createInput = this.generateCreateInputType(schema, imports);
            lines.push(createInput);
            lines.push('');
            types.add("Create".concat(schema.name, "Input"));
            var updateInput = this.generateUpdateInputType(schema, imports);
            lines.push(updateInput);
            lines.push('');
            types.add("Update".concat(schema.name, "Input"));
        }
        // Generate sort enum
        var sortEnum = this.generateSortEnum(schema);
        lines.push(sortEnum);
        lines.push('');
        types.add("".concat(schema.name, "SortField"));
        return {
            code: lines.join('\n'),
            imports: Array.from(imports),
            types: Array.from(types),
        };
    };
    /**
     * Generate types for multiple schemas.
     *
     * @param schemas - Schema definitions
     * @returns Generated code
     *
     * @example
     * ```typescript
     * const generator = new TypesGenerator();
     * const { code } = generator.generateMany([UserSchema, PostSchema, CommentSchema]);
     * ```
     */
    TypesGenerator.prototype.generateMany = function (schemas) {
        var allImports = new Set();
        var allTypes = new Set();
        var lines = [];
        // Add file header
        lines.push('/**');
        lines.push(' * Auto-generated TypeScript types for Atakora schemas.');
        lines.push(' *');
        lines.push(' * DO NOT EDIT MANUALLY - This file is generated.');
        lines.push(' */');
        lines.push('');
        // Generate each schema
        for (var _i = 0, schemas_1 = schemas; _i < schemas_1.length; _i++) {
            var schema = schemas_1[_i];
            var result = this.generate(schema);
            lines.push(result.code);
            lines.push('');
            result.imports.forEach(function (imp) { return allImports.add(imp); });
            result.types.forEach(function (type) { return allTypes.add(type); });
        }
        return {
            code: lines.join('\n'),
            imports: Array.from(allImports),
            types: Array.from(allTypes),
        };
    };
    /**
     * Generate file header with documentation.
     */
    TypesGenerator.prototype.generateFileHeader = function (schema) {
        var _a;
        var lines = [];
        if (this.options.includeJsDoc) {
            lines.push('/**');
            lines.push(" * Auto-generated types for ".concat(schema.name, " schema."));
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
     * Generate main entity interface.
     */
    TypesGenerator.prototype.generateEntityInterface = function (schema, imports) {
        var _a, _b;
        var lines = [];
        // Add JSDoc
        if (this.options.includeJsDoc) {
            lines.push('/**');
            lines.push(" * ".concat(((_a = schema.metadata) === null || _a === void 0 ? void 0 : _a.displayName) || schema.name, " entity."));
            if ((_b = schema.metadata) === null || _b === void 0 ? void 0 : _b.description) {
                lines.push(' *');
                lines.push(" * ".concat(schema.metadata.description));
            }
            lines.push(' */');
        }
        lines.push("export interface ".concat(schema.name, " {"));
        // Add fields
        var shape = schema.fields.shape;
        for (var _i = 0, _c = Object.entries(shape); _i < _c.length; _i++) {
            var _d = _c[_i], fieldName = _d[0], fieldSchema = _d[1];
            var metadata = (0, field_types_1.getFieldMetadata)(fieldSchema);
            // Add field JSDoc
            if (this.options.includeJsDoc && metadata) {
                lines.push('  /**');
                if (metadata.label) {
                    lines.push("   * ".concat(metadata.label));
                }
                if (metadata.helpText) {
                    lines.push("   * ".concat(metadata.helpText));
                }
                lines.push('   */');
            }
            var fieldType = this.zodTypeToTypeScript(fieldSchema);
            var optional = this.isOptionalField(fieldSchema) ? '?' : '';
            lines.push("  ".concat(fieldName).concat(optional, ": ").concat(fieldType, ";"));
        }
        // Add relationships
        if (this.options.includeRelationships && schema.relationships) {
            lines.push('');
            lines.push('  // Relationships');
            for (var _e = 0, _f = Object.entries(schema.relationships); _e < _f.length; _e++) {
                var _g = _f[_e], relName = _g[0], rel = _g[1];
                var relType = this.getRelationshipType(rel);
                lines.push("  ".concat(relName, "?: ").concat(relType, ";"));
            }
        }
        // Add computed fields
        if (this.options.includeComputed && schema.computed) {
            lines.push('');
            lines.push('  // Computed fields');
            for (var _h = 0, _j = Object.entries(schema.computed); _h < _j.length; _h++) {
                var _k = _j[_h], fieldName = _k[0], computed = _k[1];
                var fieldType = this.computedTypeToTypeScript(computed.type);
                if (this.options.includeJsDoc && computed.description) {
                    lines.push('  /**');
                    lines.push("   * ".concat(computed.description));
                    lines.push('   */');
                }
                lines.push("  ".concat(fieldName, "?: ").concat(fieldType, ";"));
            }
        }
        lines.push('}');
        return lines.join('\n');
    };
    /**
     * Generate filter type.
     */
    TypesGenerator.prototype.generateFilterType = function (schema, imports) {
        var lines = [];
        if (this.options.includeJsDoc) {
            lines.push('/**');
            lines.push(" * Filter options for ".concat(schema.name, " queries."));
            lines.push(' */');
        }
        lines.push("export interface ".concat(schema.name, "Filter {"));
        var shape = schema.fields.shape;
        for (var _i = 0, _a = Object.entries(shape); _i < _a.length; _i++) {
            var _b = _a[_i], fieldName = _b[0], fieldSchema = _b[1];
            var fieldType = this.zodTypeToTypeScript(fieldSchema);
            var filterType = this.getFilterTypeForField(fieldType);
            lines.push("  ".concat(fieldName, "?: ").concat(filterType, ";"));
        }
        lines.push('');
        lines.push('  // Logical operators');
        lines.push("  AND?: ".concat(schema.name, "Filter[];"));
        lines.push("  OR?: ".concat(schema.name, "Filter[];"));
        lines.push("  NOT?: ".concat(schema.name, "Filter;"));
        lines.push('}');
        return lines.join('\n');
    };
    /**
     * Generate create input type.
     */
    TypesGenerator.prototype.generateCreateInputType = function (schema, imports) {
        var lines = [];
        if (this.options.includeJsDoc) {
            lines.push('/**');
            lines.push(" * Input type for creating a ".concat(schema.name, "."));
            lines.push(' */');
        }
        lines.push("export interface Create".concat(schema.name, "Input {"));
        var shape = schema.fields.shape;
        for (var _i = 0, _a = Object.entries(shape); _i < _a.length; _i++) {
            var _b = _a[_i], fieldName = _b[0], fieldSchema = _b[1];
            var metadata = (0, field_types_1.getFieldMetadata)(fieldSchema);
            // Skip auto-generated fields
            if ((metadata === null || metadata === void 0 ? void 0 : metadata.autoGenerate) || (metadata === null || metadata === void 0 ? void 0 : metadata.readonly)) {
                continue;
            }
            var fieldType = this.zodTypeToTypeScript(fieldSchema);
            var optional = this.isOptionalField(fieldSchema) ? '?' : '';
            lines.push("  ".concat(fieldName).concat(optional, ": ").concat(fieldType, ";"));
        }
        lines.push('}');
        return lines.join('\n');
    };
    /**
     * Generate update input type.
     */
    TypesGenerator.prototype.generateUpdateInputType = function (schema, imports) {
        var lines = [];
        if (this.options.includeJsDoc) {
            lines.push('/**');
            lines.push(" * Input type for updating a ".concat(schema.name, "."));
            lines.push(' */');
        }
        lines.push("export interface Update".concat(schema.name, "Input {"));
        var shape = schema.fields.shape;
        for (var _i = 0, _a = Object.entries(shape); _i < _a.length; _i++) {
            var _b = _a[_i], fieldName = _b[0], fieldSchema = _b[1];
            var metadata = (0, field_types_1.getFieldMetadata)(fieldSchema);
            // Skip auto-generated and readonly fields
            if ((metadata === null || metadata === void 0 ? void 0 : metadata.autoGenerate) || (metadata === null || metadata === void 0 ? void 0 : metadata.autoUpdate) || (metadata === null || metadata === void 0 ? void 0 : metadata.readonly)) {
                continue;
            }
            var fieldType = this.zodTypeToTypeScript(fieldSchema);
            lines.push("  ".concat(fieldName, "?: ").concat(fieldType, ";"));
        }
        lines.push('}');
        return lines.join('\n');
    };
    /**
     * Generate sort enum.
     */
    TypesGenerator.prototype.generateSortEnum = function (schema) {
        var lines = [];
        if (this.options.includeJsDoc) {
            lines.push('/**');
            lines.push(" * Sortable fields for ".concat(schema.name, "."));
            lines.push(' */');
        }
        var shape = schema.fields.shape;
        var fields = Object.keys(shape);
        lines.push("export type ".concat(schema.name, "SortField ="));
        fields.forEach(function (field, index) {
            var suffix = index < fields.length - 1 ? ' |' : ';';
            lines.push("  | '".concat(field, "'").concat(suffix));
        });
        return lines.join('\n');
    };
    /**
     * Convert Zod type to TypeScript type.
     */
    TypesGenerator.prototype.zodTypeToTypeScript = function (zodType) {
        var _a;
        var typeName = (_a = zodType._def) === null || _a === void 0 ? void 0 : _a.typeName;
        switch (typeName) {
            case 'ZodString':
                return 'string';
            case 'ZodNumber':
                return 'number';
            case 'ZodBoolean':
                return 'boolean';
            case 'ZodDate':
                return 'Date';
            case 'ZodArray':
                var innerType = this.zodTypeToTypeScript(zodType._def.type);
                return "".concat(innerType, "[]");
            case 'ZodObject':
                return 'Record<string, any>'; // Could be more specific
            case 'ZodEnum':
                var values = zodType._def.values;
                return values.map(function (v) { return "'".concat(v, "'"); }).join(' | ');
            case 'ZodOptional':
                return this.zodTypeToTypeScript(zodType._def.innerType);
            case 'ZodNullable':
                return "".concat(this.zodTypeToTypeScript(zodType._def.innerType), " | null");
            case 'ZodDefault':
                return this.zodTypeToTypeScript(zodType._def.innerType);
            default:
                return 'any';
        }
    };
    /**
     * Check if a field is optional.
     */
    TypesGenerator.prototype.isOptionalField = function (zodType) {
        var _a;
        var typeName = (_a = zodType._def) === null || _a === void 0 ? void 0 : _a.typeName;
        return typeName === 'ZodOptional' || typeName === 'ZodNullable';
    };
    /**
     * Get filter type for a field type.
     */
    TypesGenerator.prototype.getFilterTypeForField = function (fieldType) {
        if (fieldType === 'string') {
            return '{ equals?: string; contains?: string; startsWith?: string; endsWith?: string; in?: string[]; notIn?: string[] }';
        }
        else if (fieldType === 'number') {
            return '{ equals?: number; gt?: number; gte?: number; lt?: number; lte?: number; in?: number[]; notIn?: number[] }';
        }
        else if (fieldType === 'boolean') {
            return '{ equals?: boolean }';
        }
        else if (fieldType === 'Date') {
            return '{ equals?: Date; gt?: Date; gte?: Date; lt?: Date; lte?: Date }';
        }
        else {
            return "{ equals?: ".concat(fieldType, "; in?: ").concat(fieldType, "[]; notIn?: ").concat(fieldType, "[] }");
        }
    };
    /**
     * Get TypeScript type for relationship.
     */
    TypesGenerator.prototype.getRelationshipType = function (relationship) {
        var _a;
        var targetName = relationship.target || ((_a = relationship.targets) === null || _a === void 0 ? void 0 : _a[0]) || 'any';
        switch (relationship.type) {
            case 'hasOne':
            case 'belongsTo':
                return targetName;
            case 'hasMany':
            case 'manyToMany':
                return "".concat(targetName, "[]");
            case 'polymorphic':
                var targets = relationship.targets || [];
                return targets.join(' | ') || 'any';
            default:
                return 'any';
        }
    };
    /**
     * Convert computed field type to TypeScript.
     */
    TypesGenerator.prototype.computedTypeToTypeScript = function (type) {
        switch (type) {
            case 'string':
                return 'string';
            case 'number':
                return 'number';
            case 'boolean':
                return 'boolean';
            case 'date':
                return 'Date';
            case 'array':
                return 'any[]';
            case 'object':
                return 'Record<string, any>';
            default:
                return 'any';
        }
    };
    return TypesGenerator;
}());
exports.TypesGenerator = TypesGenerator;
/**
 * Generate TypeScript types for a schema.
 *
 * @param schema - Schema definition
 * @param options - Generator options
 * @returns Generated code
 *
 * @example
 * ```typescript
 * const { code } = generateTypes(UserSchema, {
 *   includeJsDoc: true,
 *   generateFilters: true,
 *   generateInputs: true
 * });
 *
 * console.log(code);
 * ```
 */
function generateTypes(schema, options) {
    var generator = new TypesGenerator(options);
    return generator.generate(schema);
}
/**
 * Generate TypeScript types for multiple schemas.
 *
 * @param schemas - Schema definitions
 * @param options - Generator options
 * @returns Generated code
 *
 * @example
 * ```typescript
 * const { code } = generateManyTypes([UserSchema, PostSchema, CommentSchema]);
 * await fs.writeFile('generated-types.ts', code);
 * ```
 */
function generateManyTypes(schemas, options) {
    var generator = new TypesGenerator(options);
    return generator.generateMany(schemas);
}
