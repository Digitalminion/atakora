/**
 * Unified Type System for Schema and Validation
 *
 * @remarks
 * This module provides a single source of truth for field definitions
 * that are used by both the schema field builders and the validation engine.
 * This eliminates the parallel type systems and ensures type safety throughout.
 *
 * @packageDocumentation
 */

/**
 * Core field types supported by the system
 */
export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'datetime'
  | 'date'
  | 'id'
  | 'enum'
  | 'array'
  | 'object'
  | 'json'
  | 'binary'
  | 'ref'
  | 'email'
  | 'url'
  | 'uuid';

/**
 * Validation rule types unified across the system
 *
 * @remarks
 * These validation rules are used directly by both field builders
 * and the validation engine, ensuring consistency.
 */
export type UnifiedValidationRule =
  // Common validations
  | { type: 'required'; message?: string }
  | { type: 'optional'; message?: string }
  | { type: 'nullable'; message?: string }

  // String validations
  | { type: 'minLength'; value: number; message?: string }
  | { type: 'maxLength'; value: number; message?: string }
  | { type: 'pattern'; pattern: RegExp; message?: string }
  | { type: 'regex'; pattern: RegExp; message?: string }
  | { type: 'email'; message?: string }
  | { type: 'url'; message?: string }
  | { type: 'uuid'; message?: string }
  | { type: 'phone'; message?: string }

  // Number validations
  | { type: 'min'; value: number; message?: string }
  | { type: 'max'; value: number; message?: string }
  | { type: 'integer'; message?: string }
  | { type: 'positive'; message?: string }
  | { type: 'negative'; message?: string }

  // Array validations
  | { type: 'minItems'; value: number; message?: string }
  | { type: 'maxItems'; value: number; message?: string }
  | { type: 'unique'; message?: string }

  // Enum validation
  | { type: 'format'; value: any; message?: string }

  // Custom validation
  | { type: 'custom'; validator: (value: any) => boolean; message?: string };

/**
 * Metadata for field definitions
 *
 * @remarks
 * Additional information about fields that doesn't affect validation
 * but provides useful context for documentation, deprecation, etc.
 */
export interface FieldMetadata {
  /**
   * Human-readable description of the field
   */
  description?: string;

  /**
   * Whether the field is deprecated
   */
  deprecated?: boolean | string;

  /**
   * Deprecation message if field is deprecated
   */
  deprecationMessage?: string;

  /**
   * Version when the deprecated field will be removed
   */
  removeInVersion?: string;

  /**
   * Example value for documentation
   */
  example?: any;

  /**
   * Whether the field is read-only
   */
  readOnly?: boolean;

  /**
   * Whether the field is computed
   */
  computed?: boolean;

  /**
   * Computation function for computed fields
   */
  computeFn?: () => any;
}

/**
 * Unified field definition that serves as single source of truth
 *
 * @remarks
 * This interface is used by both field builders and the validation engine.
 * Field builders produce this structure directly, and the validation engine
 * consumes it without transformation.
 *
 * @typeParam T - The TypeScript type of the field value
 */
export interface UnifiedFieldDefinition<T = any> {
  /**
   * The field type identifier
   */
  type: FieldType;

  /**
   * TypeScript type for type inference (phantom type)
   */
  dataType?: T;

  /**
   * Whether the field is required
   */
  required: boolean;

  /**
   * Whether the field can be null
   */
  nullable: boolean;

  /**
   * Default value for the field
   */
  default?: T;

  /**
   * All validation rules for the field
   */
  validations: UnifiedValidationRule[];

  /**
   * Field metadata for documentation and runtime behavior
   */
  metadata?: FieldMetadata;

  // Type-specific properties

  /**
   * For string fields: minimum length
   */
  minLength?: number;

  /**
   * For string fields: maximum length
   */
  maxLength?: number;

  /**
   * For string fields: validation pattern
   */
  pattern?: RegExp;

  /**
   * For string fields: format type
   */
  format?: 'email' | 'url' | 'uuid' | 'phone';

  /**
   * For number fields: minimum value
   */
  min?: number;

  /**
   * For number fields: maximum value
   */
  max?: number;

  /**
   * For number fields: whether only integers are allowed
   */
  integer?: boolean;

  /**
   * For enum fields: allowed values
   */
  values?: readonly string[];

  /**
   * For array fields: item definition
   */
  itemDefinition?: UnifiedFieldDefinition<any>;

  /**
   * For array fields: minimum items
   */
  minItems?: number;

  /**
   * For array fields: maximum items
   */
  maxItems?: number;

  /**
   * For array fields: whether items must be unique
   */
  unique?: boolean;

  /**
   * For object fields: schema definition
   */
  schema?: Record<string, UnifiedFieldDefinition<any>>;

  /**
   * For ref fields: referenced model name
   */
  modelName?: string;

  /**
   * For ref fields: referenced field name
   */
  fieldName?: string;

  /**
   * For binary fields: maximum size in bytes
   */
  maxSizeBytes?: number;

  /**
   * For id fields: prefix for generated IDs
   */
  prefix?: string;
}

/**
 * Helper type to extract the data type from a field definition
 */
export type InferFieldType<T> = T extends UnifiedFieldDefinition<infer U> ? U : never;

/**
 * Helper type to convert a record of field definitions to their data types
 */
export type InferFieldTypes<T extends Record<string, UnifiedFieldDefinition>> = {
  [K in keyof T]: InferFieldType<T[K]>;
};

/**
 * Type guard to check if a value is a UnifiedFieldDefinition
 */
export function isUnifiedFieldDefinition(value: any): value is UnifiedFieldDefinition {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.type === 'string' &&
    typeof value.required === 'boolean' &&
    typeof value.nullable === 'boolean' &&
    Array.isArray(value.validations)
  );
}

/**
 * Create a unified field definition with defaults
 *
 * @remarks
 * Helper function to create a properly initialized field definition
 * with all required properties set to sensible defaults.
 */
export function createUnifiedFieldDefinition<T = any>(
  type: FieldType,
  partial?: Partial<UnifiedFieldDefinition<T>>
): UnifiedFieldDefinition<T> {
  return {
    type,
    required: false,
    nullable: false,
    validations: [],
    ...partial,
  };
}

/**
 * Convert legacy ValidationRule to UnifiedValidationRule
 *
 * @remarks
 * Temporary compatibility function for migrating existing code.
 * This function ensures backward compatibility during the transition.
 *
 * @deprecated Will be removed once all code is migrated
 */
export function toUnifiedValidationRule(rule: any): UnifiedValidationRule {
  // For now, they're compatible, but this provides a migration path
  return rule as UnifiedValidationRule;
}

/**
 * Check if a field definition has a specific validation rule
 */
export function hasValidationRule(
  field: UnifiedFieldDefinition,
  ruleType: UnifiedValidationRule['type']
): boolean {
  return field.validations.some((rule) => rule.type === ruleType);
}

/**
 * Get a specific validation rule from a field definition
 */
export function getValidationRule<T extends UnifiedValidationRule>(
  field: UnifiedFieldDefinition,
  ruleType: T['type']
): T | undefined {
  return field.validations.find((rule) => rule.type === ruleType) as T | undefined;
}

/**
 * Merge validation rules, removing duplicates
 */
export function mergeValidationRules(
  ...ruleSets: UnifiedValidationRule[][]
): UnifiedValidationRule[] {
  const merged: UnifiedValidationRule[] = [];
  const seen = new Set<string>();

  for (const rules of ruleSets) {
    for (const rule of rules) {
      const key = `${rule.type}:${JSON.stringify((rule as any).value || '')}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(rule);
      }
    }
  }

  return merged;
}
