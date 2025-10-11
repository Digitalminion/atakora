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
import type { IRestOperation } from '../operation';
/**
 * Filter syntax types
 */
export type FilterSyntax = 'rsql' | 'odata' | 'mongo' | 'simple';
/**
 * Filter operators
 */
export type FilterOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'like' | 'contains' | 'startsWith' | 'endsWith';
/**
 * Filtering configuration
 */
export interface FilteringConfig {
    readonly enabled: boolean;
    readonly operators?: readonly FilterOperator[];
    readonly maxFilters?: number;
    readonly syntax?: FilterSyntax;
    readonly allowedFields?: readonly string[];
    readonly deniedFields?: readonly string[];
    readonly caseSensitive?: boolean;
}
/**
 * Sorting configuration
 */
export interface SortingConfig {
    readonly enabled: boolean;
    readonly defaultSort?: readonly SortField[];
    readonly maxSortFields?: number;
    readonly allowedFields?: readonly string[];
    readonly deniedFields?: readonly string[];
}
/**
 * Sort field definition
 */
export interface SortField {
    readonly field: string;
    readonly direction: 'asc' | 'desc';
}
/**
 * Field selection configuration
 */
export interface FieldSelectionConfig {
    readonly enabled: boolean;
    readonly parameterName?: string;
    readonly separator?: string;
    readonly allowedFields?: readonly string[];
    readonly deniedFields?: readonly string[];
    readonly alwaysInclude?: readonly string[];
}
/**
 * Filter expression
 */
export interface FilterExpression {
    readonly field: string;
    readonly operator: FilterOperator;
    readonly value: any;
    readonly combinator?: 'AND' | 'OR';
}
/**
 * Filter validation result
 */
export interface FilterValidationResult {
    readonly valid: boolean;
    readonly errors: readonly string[];
    readonly expressions?: readonly FilterExpression[];
}
/**
 * Sort validation result
 */
export interface SortValidationResult {
    readonly valid: boolean;
    readonly errors: readonly string[];
    readonly fields?: readonly SortField[];
}
/**
 * Field selection validation result
 */
export interface FieldSelectionValidationResult {
    readonly valid: boolean;
    readonly errors: readonly string[];
    readonly fields?: readonly string[];
}
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
export declare class FilterParser {
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
    static rsql(expression: string): readonly FilterExpression[];
    /**
     * Parses OData filter expression
     *
     * @param expression - OData expression (e.g., "status eq 'active' and category eq 'electronics'")
     * @returns Array of filter expressions
     */
    static odata(expression: string): readonly FilterExpression[];
    /**
     * Parses MongoDB query object
     *
     * @param query - MongoDB query object
     * @returns Array of filter expressions
     */
    static mongodb(query: Record<string, any>): readonly FilterExpression[];
    /**
     * Parses simple key-value filter parameters
     *
     * @param params - Simple key-value parameters
     * @returns Array of filter expressions
     */
    static simple(params: Record<string, string>): readonly FilterExpression[];
    private static rsqlOperatorToStandard;
    private static odataOperatorToStandard;
    private static mongoOperatorToStandard;
    private static parseValue;
}
/**
 * Filtering Helper
 *
 * Manages filtering configuration and validation.
 */
export declare class FilteringHelper {
    private readonly config;
    constructor(config: FilteringConfig);
    /**
     * Adds filtering query parameters to operation
     *
     * @param operation - REST operation to enhance
     * @returns Operation with filtering parameters added
     */
    addFilterParams(operation: IRestOperation): IRestOperation;
    /**
     * Validates filter expression
     *
     * @param filter - Filter string or object to validate
     * @returns Validation result with errors if any
     */
    validateFilter(filter: string | Record<string, any>): FilterValidationResult;
}
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
export declare function sorting(fields: readonly SortField[]): SortingConfig;
/**
 * Sorting Helper
 *
 * Manages sorting configuration and validation.
 */
export declare class SortingHelper {
    private readonly config;
    constructor(config: SortingConfig);
    /**
     * Adds sorting query parameters to operation
     *
     * @param operation - REST operation to enhance
     * @returns Operation with sorting parameters added
     */
    addSortParams(operation: IRestOperation): IRestOperation;
    /**
     * Parses sort parameter string
     *
     * @param sort - Sort string (e.g., "createdAt:desc,name:asc")
     * @returns Array of sort fields
     */
    parseSort(sort: string): readonly SortField[];
    /**
     * Validates sort parameter
     *
     * @param sort - Sort string to validate
     * @returns Validation result with errors if any
     */
    validateSort(sort: string): SortValidationResult;
}
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
export declare function fieldSelection(allowList?: readonly string[], denyList?: readonly string[]): FieldSelectionConfig;
/**
 * Field Selection Helper
 *
 * Manages sparse fieldsets (field selection) for responses.
 */
export declare class FieldSelectionHelper {
    private readonly config;
    constructor(config: FieldSelectionConfig);
    /**
     * Adds field selection query parameters to operation
     *
     * @param operation - REST operation to enhance
     * @returns Operation with field selection parameters added
     */
    addFieldSelectionParams(operation: IRestOperation): IRestOperation;
    /**
     * Parses fields parameter
     *
     * @param fields - Fields string (e.g., "id,name,email")
     * @returns Array of field names
     */
    parseFields(fields: string): readonly string[];
    /**
     * Validates field selection
     *
     * @param fields - Fields string to validate
     * @returns Validation result with errors if any
     */
    validateFields(fields: string): FieldSelectionValidationResult;
    /**
     * Applies field selection to a data object
     *
     * @param data - Data object to filter
     * @param fields - Fields to include
     * @returns Filtered data object
     */
    applyFieldSelection<T extends Record<string, any>>(data: T, fields: readonly string[]): Partial<T>;
}
//# sourceMappingURL=filtering.d.ts.map