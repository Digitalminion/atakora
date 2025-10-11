"use strict";
/**
 * Filtering, Sorting, and Field Selection
 *
 * Provides comprehensive query capabilities for REST APIs following
 * ADR-015 specifications.
 *
 * Supports:
 * - Multiple filter syntaxes (RSQL, OData, MongoDB, Simple)
 * - Multi-field sorting with direction control
 * - Sparse fieldsets (field selection)
 * - Validation and sanitization
 *
 * @see ADR-015 REST Advanced Features - Section 3
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FieldSelectionHelper = exports.SortingHelper = exports.FilteringHelper = exports.FilterParser = void 0;
exports.sorting = sorting;
exports.fieldSelection = fieldSelection;
/**
 * Filter Parser
 *
 * Parses filter expressions from different syntaxes.
 *
 * @example
 * ```typescript
 * // RSQL syntax
 * const rsql = FilterParser.rsql('status==active;category==electronics');
 *
 * // OData syntax
 * const odata = FilterParser.odata("status eq 'active' and category eq 'electronics'");
 *
 * // MongoDB query
 * const mongo = FilterParser.mongodb({ status: 'active', category: 'electronics' });
 *
 * // Simple key-value
 * const simple = FilterParser.simple({ status: 'active', category: 'electronics' });
 * ```
 */
class FilterParser {
    /**
     * Parses RSQL filter expression
     *
     * @param expression - RSQL expression (e.g., "status==active;category==electronics")
     * @returns Array of filter expressions
     *
     * @example
     * ```typescript
     * FilterParser.rsql('status==active;price=gt=100')
     * // Returns: [
     * //   { field: 'status', operator: 'eq', value: 'active' },
     * //   { field: 'price', operator: 'gt', value: '100' }
     * // ]
     * ```
     */
    static rsql(expression) {
        const filters = [];
        const parts = expression.split(/[;,]/);
        for (const part of parts) {
            const trimmed = part.trim();
            if (!trimmed)
                continue;
            // Match RSQL operators: ==, !=, =gt=, =ge=, =lt=, =le=, =in=, =out=
            const match = trimmed.match(/^(\w+)(==|!=|=gt=|=ge=|=lt=|=le=|=in=|=out=)(.+)$/);
            if (!match)
                continue;
            const [, field, rsqlOp, value] = match;
            const operator = this.rsqlOperatorToStandard(rsqlOp);
            filters.push({
                field,
                operator,
                value: this.parseValue(value),
                combinator: 'AND',
            });
        }
        return filters;
    }
    /**
     * Parses OData filter expression
     *
     * @param expression - OData expression (e.g., "status eq 'active' and category eq 'electronics'")
     * @returns Array of filter expressions
     */
    static odata(expression) {
        const filters = [];
        // Simple OData parser - handles basic expressions
        // For production, consider using a proper OData parser library
        const parts = expression.split(/\s+(and|or)\s+/i);
        let currentCombinator = 'AND';
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i].trim();
            if (part.toLowerCase() === 'and') {
                currentCombinator = 'AND';
                continue;
            }
            else if (part.toLowerCase() === 'or') {
                currentCombinator = 'OR';
                continue;
            }
            // Match: field operator 'value' or field operator value
            const match = part.match(/^(\w+)\s+(eq|ne|gt|ge|lt|le|in)\s+(.+)$/i);
            if (!match)
                continue;
            const [, field, odataOp, value] = match;
            const operator = this.odataOperatorToStandard(odataOp.toLowerCase());
            filters.push({
                field,
                operator,
                value: this.parseValue(value.replace(/^['"]|['"]$/g, '')),
                combinator: currentCombinator,
            });
        }
        return filters;
    }
    /**
     * Parses MongoDB query object
     *
     * @param query - MongoDB query object
     * @returns Array of filter expressions
     */
    static mongodb(query) {
        const filters = [];
        for (const [field, value] of Object.entries(query)) {
            if (typeof value === 'object' && value !== null) {
                // Handle MongoDB operators like { $gt: 10 }
                for (const [mongoOp, opValue] of Object.entries(value)) {
                    const operator = this.mongoOperatorToStandard(mongoOp);
                    filters.push({
                        field,
                        operator,
                        value: opValue,
                        combinator: 'AND',
                    });
                }
            }
            else {
                // Simple equality
                filters.push({
                    field,
                    operator: 'eq',
                    value,
                    combinator: 'AND',
                });
            }
        }
        return filters;
    }
    /**
     * Parses simple key-value filter parameters
     *
     * @param params - Simple key-value parameters
     * @returns Array of filter expressions
     */
    static simple(params) {
        const filters = [];
        for (const [field, value] of Object.entries(params)) {
            filters.push({
                field,
                operator: 'eq',
                value: this.parseValue(value),
                combinator: 'AND',
            });
        }
        return filters;
    }
    static rsqlOperatorToStandard(op) {
        const map = {
            '==': 'eq',
            '!=': 'ne',
            '=gt=': 'gt',
            '=ge=': 'gte',
            '=lt=': 'lt',
            '=le=': 'lte',
            '=in=': 'in',
            '=out=': 'nin',
        };
        return map[op] || 'eq';
    }
    static odataOperatorToStandard(op) {
        const map = {
            'eq': 'eq',
            'ne': 'ne',
            'gt': 'gt',
            'ge': 'gte',
            'lt': 'lt',
            'le': 'lte',
            'in': 'in',
        };
        return map[op] || 'eq';
    }
    static mongoOperatorToStandard(op) {
        const map = {
            '$eq': 'eq',
            '$ne': 'ne',
            '$gt': 'gt',
            '$gte': 'gte',
            '$lt': 'lt',
            '$lte': 'lte',
            '$in': 'in',
            '$nin': 'nin',
        };
        return map[op] || 'eq';
    }
    static parseValue(value) {
        // Try to parse as number
        if (/^-?\d+(\.\d+)?$/.test(value)) {
            return parseFloat(value);
        }
        // Try to parse as boolean
        if (value === 'true')
            return true;
        if (value === 'false')
            return false;
        // Try to parse as null
        if (value === 'null')
            return null;
        // Return as string
        return value;
    }
}
exports.FilterParser = FilterParser;
/**
 * Filtering Helper
 *
 * Manages filtering configuration and validation.
 */
class FilteringHelper {
    constructor(config) {
        this.config = config;
    }
    /**
     * Adds filtering query parameters to operation
     *
     * @param operation - REST operation to enhance
     * @returns Operation with filtering parameters added
     */
    addFilterParams(operation) {
        if (!this.config.enabled)
            return operation;
        const queryProperties = { ...operation.queryParameters?.schema.properties };
        switch (this.config.syntax) {
            case 'simple':
                // Simple key-value filtering - fields added dynamically
                // No specific filter parameter needed
                break;
            case 'rsql':
                queryProperties.filter = {
                    type: 'string',
                    description: 'RSQL filter expression (e.g., status==active;category==electronics)',
                };
                break;
            case 'odata':
                queryProperties.$filter = {
                    type: 'string',
                    description: "OData filter expression (e.g., status eq 'active' and category eq 'electronics')",
                };
                break;
            case 'mongo':
                queryProperties.filter = {
                    type: 'string',
                    description: 'MongoDB-style filter JSON (e.g., {"status":"active","category":"electronics"})',
                };
                break;
        }
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
    /**
     * Validates filter expression
     *
     * @param filter - Filter string or object to validate
     * @returns Validation result with errors if any
     */
    validateFilter(filter) {
        const errors = [];
        let expressions = [];
        try {
            switch (this.config.syntax) {
                case 'rsql':
                    expressions = FilterParser.rsql(filter);
                    break;
                case 'odata':
                    expressions = FilterParser.odata(filter);
                    break;
                case 'mongo':
                    expressions = FilterParser.mongodb(typeof filter === 'string' ? JSON.parse(filter) : filter);
                    break;
                case 'simple':
                    expressions = FilterParser.simple(filter);
                    break;
            }
            // Validate max filters
            if (this.config.maxFilters && expressions.length > this.config.maxFilters) {
                errors.push(`Maximum ${this.config.maxFilters} filters allowed`);
            }
            // Validate fields
            for (const expr of expressions) {
                if (this.config.allowedFields && !this.config.allowedFields.includes(expr.field)) {
                    errors.push(`Field '${expr.field}' is not allowed for filtering`);
                }
                if (this.config.deniedFields?.includes(expr.field)) {
                    errors.push(`Field '${expr.field}' is denied for filtering`);
                }
                // Validate operators
                if (this.config.operators && !this.config.operators.includes(expr.operator)) {
                    errors.push(`Operator '${expr.operator}' is not allowed`);
                }
            }
        }
        catch (error) {
            errors.push(`Invalid filter syntax: ${error.message}`);
        }
        return {
            valid: errors.length === 0,
            errors,
            expressions: errors.length === 0 ? expressions : undefined,
        };
    }
}
exports.FilteringHelper = FilteringHelper;
/**
 * Sorting helper function
 *
 * @param fields - Array of sort fields
 * @returns Sort configuration
 *
 * @example
 * ```typescript
 * const config = sorting([
 *   { field: 'createdAt', direction: 'desc' },
 *   { field: 'name', direction: 'asc' }
 * ]);
 * ```
 */
function sorting(fields) {
    return {
        enabled: true,
        defaultSort: fields,
    };
}
/**
 * Sorting Helper
 *
 * Manages sorting configuration and validation.
 */
class SortingHelper {
    constructor(config) {
        this.config = config;
    }
    /**
     * Adds sorting query parameters to operation
     *
     * @param operation - REST operation to enhance
     * @returns Operation with sorting parameters added
     */
    addSortParams(operation) {
        if (!this.config.enabled)
            return operation;
        const queryProperties = { ...operation.queryParameters?.schema.properties };
        const defaultSort = this.config.defaultSort
            ? this.config.defaultSort.map(s => `${s.field}:${s.direction}`).join(',')
            : undefined;
        queryProperties.sort = {
            type: 'string',
            description: 'Sort fields in format: field1:asc,field2:desc',
            default: defaultSort,
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
    /**
     * Parses sort parameter string
     *
     * @param sort - Sort string (e.g., "createdAt:desc,name:asc")
     * @returns Array of sort fields
     */
    parseSort(sort) {
        return sort.split(',').map(part => {
            const [field, direction = 'asc'] = part.trim().split(':');
            return {
                field: field.trim(),
                direction: direction.toLowerCase(),
            };
        });
    }
    /**
     * Validates sort parameter
     *
     * @param sort - Sort string to validate
     * @returns Validation result with errors if any
     */
    validateSort(sort) {
        const errors = [];
        let fields = [];
        try {
            fields = this.parseSort(sort);
            // Validate max sort fields
            if (this.config.maxSortFields && fields.length > this.config.maxSortFields) {
                errors.push(`Maximum ${this.config.maxSortFields} sort fields allowed`);
            }
            // Validate fields
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
        }
        catch (error) {
            errors.push(`Invalid sort syntax: ${error.message}`);
        }
        return {
            valid: errors.length === 0,
            errors,
            fields: errors.length === 0 ? fields : undefined,
        };
    }
}
exports.SortingHelper = SortingHelper;
/**
 * Field selection helper function
 *
 * @param allowList - Fields that can be selected
 * @param denyList - Fields that cannot be selected
 * @returns Field selection configuration
 *
 * @example
 * ```typescript
 * const config = fieldSelection(['id', 'name', 'email'], ['password', 'ssn']);
 * ```
 */
function fieldSelection(allowList, denyList) {
    return {
        enabled: true,
        allowedFields: allowList,
        deniedFields: denyList,
    };
}
/**
 * Field Selection Helper
 *
 * Manages sparse fieldsets (field selection) for responses.
 */
class FieldSelectionHelper {
    constructor(config) {
        this.config = config;
    }
    /**
     * Adds field selection query parameters to operation
     *
     * @param operation - REST operation to enhance
     * @returns Operation with field selection parameters added
     */
    addFieldSelectionParams(operation) {
        if (!this.config.enabled)
            return operation;
        const queryProperties = { ...operation.queryParameters?.schema.properties };
        const paramName = this.config.parameterName || 'fields';
        queryProperties[paramName] = {
            type: 'string',
            description: 'Comma-separated list of fields to include in response',
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
    /**
     * Parses fields parameter
     *
     * @param fields - Fields string (e.g., "id,name,email")
     * @returns Array of field names
     */
    parseFields(fields) {
        const separator = this.config.separator || ',';
        const parsed = fields.split(separator).map(f => f.trim()).filter(Boolean);
        // Always include required fields
        if (this.config.alwaysInclude) {
            return [...new Set([...this.config.alwaysInclude, ...parsed])];
        }
        return parsed;
    }
    /**
     * Validates field selection
     *
     * @param fields - Fields string to validate
     * @returns Validation result with errors if any
     */
    validateFields(fields) {
        const errors = [];
        let parsed = [];
        try {
            parsed = this.parseFields(fields);
            // Validate fields
            for (const field of parsed) {
                if (this.config.allowedFields && !this.config.allowedFields.includes(field)) {
                    errors.push(`Field '${field}' is not allowed for selection`);
                }
                if (this.config.deniedFields?.includes(field)) {
                    errors.push(`Field '${field}' is denied for selection`);
                }
            }
        }
        catch (error) {
            errors.push(`Invalid fields syntax: ${error.message}`);
        }
        return {
            valid: errors.length === 0,
            errors,
            fields: errors.length === 0 ? parsed : undefined,
        };
    }
    /**
     * Applies field selection to a data object
     *
     * @param data - Data object to filter
     * @param fields - Fields to include
     * @returns Filtered data object
     */
    applyFieldSelection(data, fields) {
        const result = {};
        for (const field of fields) {
            if (field in data) {
                result[field] = data[field];
            }
        }
        return result;
    }
}
exports.FieldSelectionHelper = FieldSelectionHelper;
