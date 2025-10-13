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
export type FilterOperator =
  | 'eq'          // Equal
  | 'ne'          // Not equal
  | 'gt'          // Greater than
  | 'gte'         // Greater than or equal
  | 'lt'          // Less than
  | 'lte'         // Less than or equal
  | 'in'          // In array
  | 'nin'         // Not in array
  | 'like'        // Pattern match
  | 'contains'    // Contains substring
  | 'startsWith'  // Starts with
  | 'endsWith';   // Ends with

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
export class FilterParser {
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
  static rsql(expression: string): readonly FilterExpression[] {
    const filters: FilterExpression[] = [];
    const parts = expression.split(/[;,]/);

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      // Match RSQL operators: ==, !=, =gt=, =ge=, =lt=, =le=, =in=, =out=
      const match = trimmed.match(/^(\w+)(==|!=|=gt=|=ge=|=lt=|=le=|=in=|=out=)(.+)$/);
      if (!match) continue;

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
  static odata(expression: string): readonly FilterExpression[] {
    const filters: FilterExpression[] = [];

    // Simple OData parser - handles basic expressions
    // For production, consider using a proper OData parser library
    const parts = expression.split(/\s+(and|or)\s+/i);
    let currentCombinator: 'AND' | 'OR' = 'AND';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();

      if (part.toLowerCase() === 'and') {
        currentCombinator = 'AND';
        continue;
      } else if (part.toLowerCase() === 'or') {
        currentCombinator = 'OR';
        continue;
      }

      // Match: field operator 'value' or field operator value
      const match = part.match(/^(\w+)\s+(eq|ne|gt|ge|lt|le|in)\s+(.+)$/i);
      if (!match) continue;

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
  static mongodb(query: Record<string, any>): readonly FilterExpression[] {
    const filters: FilterExpression[] = [];

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
      } else {
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
  static simple(params: Record<string, string>): readonly FilterExpression[] {
    const filters: FilterExpression[] = [];

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

  private static rsqlOperatorToStandard(op: string): FilterOperator {
    const map: Record<string, FilterOperator> = {
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

  private static odataOperatorToStandard(op: string): FilterOperator {
    const map: Record<string, FilterOperator> = {
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

  private static mongoOperatorToStandard(op: string): FilterOperator {
    const map: Record<string, FilterOperator> = {
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

  private static parseValue(value: string): any {
    // Try to parse as number
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      return parseFloat(value);
    }

    // Try to parse as boolean
    if (value === 'true') return true;
    if (value === 'false') return false;

    // Try to parse as null
    if (value === 'null') return null;

    // Return as string
    return value;
  }
}

/**
 * Filtering Helper
 *
 * Manages filtering configuration and validation.
 */
export class FilteringHelper {
  constructor(private readonly config: FilteringConfig) {}

  /**
   * Adds filtering query parameters to operation
   *
   * @param operation - REST operation to enhance
   * @returns Operation with filtering parameters added
   */
  addFilterParams(operation: IRestOperation): IRestOperation {
    if (!this.config.enabled) return operation;

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
          type: 'object' as const,
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
  validateFilter(filter: string | Record<string, any>): FilterValidationResult {
    const errors: string[] = [];
    let expressions: readonly FilterExpression[] = [];

    try {
      switch (this.config.syntax) {
        case 'rsql':
          expressions = FilterParser.rsql(filter as string);
          break;
        case 'odata':
          expressions = FilterParser.odata(filter as string);
          break;
        case 'mongo':
          expressions = FilterParser.mongodb(
            typeof filter === 'string' ? JSON.parse(filter) : filter
          );
          break;
        case 'simple':
          expressions = FilterParser.simple(filter as Record<string, string>);
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
    } catch (error) {
      errors.push(`Invalid filter syntax: ${(error as Error).message}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      expressions: errors.length === 0 ? expressions : undefined,
    };
  }
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
export function sorting(fields: readonly SortField[]): SortingConfig {
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
export class SortingHelper {
  constructor(private readonly config: SortingConfig) {}

  /**
   * Adds sorting query parameters to operation
   *
   * @param operation - REST operation to enhance
   * @returns Operation with sorting parameters added
   */
  addSortParams(operation: IRestOperation): IRestOperation {
    if (!this.config.enabled) return operation;

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
          type: 'object' as const,
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
  parseSort(sort: string): readonly SortField[] {
    return sort.split(',').map(part => {
      const [field, direction = 'asc'] = part.trim().split(':');
      return {
        field: field.trim(),
        direction: direction.toLowerCase() as 'asc' | 'desc',
      };
    });
  }

  /**
   * Validates sort parameter
   *
   * @param sort - Sort string to validate
   * @returns Validation result with errors if any
   */
  validateSort(sort: string): SortValidationResult {
    const errors: string[] = [];
    let fields: readonly SortField[] = [];

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
    } catch (error) {
      errors.push(`Invalid sort syntax: ${(error as Error).message}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      fields: errors.length === 0 ? fields : undefined,
    };
  }
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
export function fieldSelection(
  allowList?: readonly string[],
  denyList?: readonly string[]
): FieldSelectionConfig {
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
export class FieldSelectionHelper {
  constructor(private readonly config: FieldSelectionConfig) {}

  /**
   * Adds field selection query parameters to operation
   *
   * @param operation - REST operation to enhance
   * @returns Operation with field selection parameters added
   */
  addFieldSelectionParams(operation: IRestOperation): IRestOperation {
    if (!this.config.enabled) return operation;

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
          type: 'object' as const,
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
  parseFields(fields: string): readonly string[] {
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
  validateFields(fields: string): FieldSelectionValidationResult {
    const errors: string[] = [];
    let parsed: readonly string[] = [];

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
    } catch (error) {
      errors.push(`Invalid fields syntax: ${(error as Error).message}`);
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
  applyFieldSelection<T extends Record<string, any>>(
    data: T,
    fields: readonly string[]
  ): Partial<T> {
    const result: Partial<T> = {};

    for (const field of fields) {
      if (field in data) {
        result[field as keyof T] = data[field];
      }
    }

    return result;
  }
}
