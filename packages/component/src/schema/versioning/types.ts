/**
 * Schema Versioning Types
 *
 * Core type definitions for schema versioning, migration, and evolution support.
 * Enables safe schema changes over time with data migration capabilities.
 */

// ============================================================================
// Version Types
// ============================================================================

/**
 * Semantic version string (e.g., '1.0.0', '2.1.3')
 */
export type SemanticVersion = `${number}.${number}.${number}`;

/**
 * Schema version information
 */
export interface SchemaVersion {
  /** Semantic version of the schema */
  version: SemanticVersion;
  /** ISO timestamp when this version was created */
  createdAt: string;
  /** Optional description of changes in this version */
  description?: string;
  /** Whether this version contains breaking changes */
  breaking?: boolean;
}

// ============================================================================
// Schema Change Types
// ============================================================================

/**
 * Base schema change interface
 */
export interface BaseSchemaChange {
  /** Model affected by the change */
  model: string;
  /** Optional description of why this change was made */
  reason?: string;
}

/**
 * Add a new field to a model
 */
export interface AddFieldChange extends BaseSchemaChange {
  type: 'addField';
  /** Name of the new field */
  field: string;
  /** Field definition (as field builder config) */
  definition: any;
  /** Default value for existing records */
  defaultValue?: any;
}

/**
 * Remove a field from a model
 */
export interface RemoveFieldChange extends BaseSchemaChange {
  type: 'removeField';
  /** Name of the field to remove */
  field: string;
  /** Whether to archive the data before removal */
  archive?: boolean;
}

/**
 * Rename a field in a model
 */
export interface RenameFieldChange extends BaseSchemaChange {
  type: 'renameField';
  /** Original field name */
  from: string;
  /** New field name */
  to: string;
}

/**
 * Change the type of a field
 */
export interface ChangeFieldTypeChange extends BaseSchemaChange {
  type: 'changeType';
  /** Name of the field */
  field: string;
  /** Original type */
  fromType: string;
  /** New type */
  toType: string;
  /** Optional transform function for data conversion */
  transform?: (value: any) => any;
}

/**
 * Add a new model to the schema
 */
export interface AddModelChange {
  type: 'addModel';
  /** Name of the new model */
  model: string;
  /** Model definition */
  definition: any;
  /** Optional description */
  reason?: string;
}

/**
 * Remove a model from the schema
 */
export interface RemoveModelChange {
  type: 'removeModel';
  /** Name of the model to remove */
  model: string;
  /** Whether to archive the data before removal */
  archive?: boolean;
  /** Optional description */
  reason?: string;
}

/**
 * Rename a model
 */
export interface RenameModelChange {
  type: 'renameModel';
  /** Original model name */
  from: string;
  /** New model name */
  to: string;
  /** Optional description */
  reason?: string;
}

/**
 * Mark a field as deprecated
 */
export interface DeprecateFieldChange extends BaseSchemaChange {
  type: 'deprecateField';
  /** Name of the field to deprecate */
  field: string;
  /** Deprecation message */
  message: string;
  /** Version when field will be removed */
  removeInVersion?: SemanticVersion;
}

/**
 * Union of all schema change types
 */
export type SchemaChange =
  | AddFieldChange
  | RemoveFieldChange
  | RenameFieldChange
  | ChangeFieldTypeChange
  | AddModelChange
  | RemoveModelChange
  | RenameModelChange
  | DeprecateFieldChange;

// ============================================================================
// Migration Types
// ============================================================================

/**
 * Data transformation function for migrations
 */
export type DataTransformer<TFrom = any, TTo = any> = (data: TFrom) => TTo;

/**
 * Migration validation result
 */
export interface MigrationValidation {
  /** Whether the migration is valid */
  valid: boolean;
  /** Any errors found */
  errors: string[];
  /** Any warnings */
  warnings: string[];
  /** Whether this migration contains breaking changes */
  breaking: boolean;
}

/**
 * Schema migration definition
 */
export interface Migration {
  /** Source schema version */
  from: SemanticVersion;
  /** Target schema version */
  to: SemanticVersion;
  /** List of changes in this migration */
  changes: SchemaChange[];
  /** Data transformation function */
  transform?: DataTransformer;
  /** Pre-migration validation */
  validate?: (data: any) => MigrationValidation;
  /** Post-migration validation */
  verify?: (data: any) => boolean;
  /** Rollback function to reverse the migration */
  rollback?: DataTransformer;
  /** Migration description */
  description?: string;
  /** ISO timestamp when migration was created */
  createdAt?: string;
  /** Whether this migration can be automatically applied */
  auto?: boolean;
}

/**
 * Migration chain for multi-step migrations
 */
export interface MigrationChain {
  /** Starting version */
  from: SemanticVersion;
  /** Target version */
  to: SemanticVersion;
  /** Ordered list of migrations to apply */
  migrations: Migration[];
  /** Total number of steps */
  steps: number;
}

/**
 * Migration execution result
 */
export interface MigrationResult {
  /** Whether migration succeeded */
  success: boolean;
  /** Final schema version after migration */
  version: SemanticVersion;
  /** Number of records migrated */
  recordsProcessed?: number;
  /** Any errors encountered */
  errors?: string[];
  /** Any warnings */
  warnings?: string[];
  /** Execution time in milliseconds */
  duration?: number;
  /** Rollback available */
  canRollback: boolean;
}

// ============================================================================
// Versioned Schema Types
// ============================================================================

/**
 * Field deprecation information
 */
export interface FieldDeprecation {
  /** Deprecation message */
  message: string;
  /** Version when deprecated */
  deprecatedIn: SemanticVersion;
  /** Version when field will be removed */
  removeIn?: SemanticVersion;
  /** Suggested alternative */
  alternative?: string;
}

/**
 * Versioned field configuration
 */
export interface VersionedFieldConfig {
  /** Field configuration */
  config: any;
  /** Deprecation information if field is deprecated */
  deprecated?: FieldDeprecation;
  /** Version when field was added */
  addedIn?: SemanticVersion;
  /** Version when field was last modified */
  modifiedIn?: SemanticVersion;
}

/**
 * Versioned model configuration
 */
export interface VersionedModelConfig {
  /** Model fields */
  fields: Record<string, VersionedFieldConfig>;
  /** Version when model was added */
  addedIn?: SemanticVersion;
  /** Version when model was last modified */
  modifiedIn?: SemanticVersion;
  /** Deprecation information if model is deprecated */
  deprecated?: {
    message: string;
    deprecatedIn: SemanticVersion;
    removeIn?: SemanticVersion;
  };
}

/**
 * Versioned schema definition
 */
export interface VersionedSchema {
  /** Current schema version */
  version: SemanticVersion;
  /** Schema definition */
  schema: any;
  /** Available migrations */
  migrations?: Migration[];
  /** Version history */
  history?: SchemaVersion[];
  /** Versioned models */
  models?: Record<string, VersionedModelConfig>;
}

/**
 * Schema comparison result
 */
export interface SchemaComparison {
  /** Source version */
  from: SemanticVersion;
  /** Target version */
  to: SemanticVersion;
  /** List of changes between versions */
  changes: SchemaChange[];
  /** Whether changes contain breaking changes */
  breaking: boolean;
  /** Suggested migration */
  suggestedMigration?: Migration;
}

// ============================================================================
// Breaking Change Detection Types
// ============================================================================

/**
 * Types of breaking changes
 */
export enum BreakingChangeType {
  /** Field removed without deprecation */
  FIELD_REMOVED = 'FIELD_REMOVED',
  /** Required field added without default */
  REQUIRED_FIELD_ADDED = 'REQUIRED_FIELD_ADDED',
  /** Field type changed incompatibly */
  INCOMPATIBLE_TYPE_CHANGE = 'INCOMPATIBLE_TYPE_CHANGE',
  /** Model removed without deprecation */
  MODEL_REMOVED = 'MODEL_REMOVED',
  /** Field made required from optional */
  FIELD_MADE_REQUIRED = 'FIELD_MADE_REQUIRED',
  /** Enum values removed */
  ENUM_VALUES_REMOVED = 'ENUM_VALUES_REMOVED',
  /** Validation made stricter */
  STRICTER_VALIDATION = 'STRICTER_VALIDATION',
}

/**
 * Breaking change information
 */
export interface BreakingChange {
  /** Type of breaking change */
  type: BreakingChangeType;
  /** Affected model */
  model?: string;
  /** Affected field */
  field?: string;
  /** Description of the breaking change */
  description: string;
  /** Suggested fix */
  suggestion?: string;
}

/**
 * Breaking change analysis result
 */
export interface BreakingChangeAnalysis {
  /** Whether breaking changes were found */
  hasBreakingChanges: boolean;
  /** List of breaking changes */
  breakingChanges: BreakingChange[];
  /** Safe changes that are non-breaking */
  safeChanges: SchemaChange[];
  /** Recommended version bump (major, minor, patch) */
  recommendedVersionBump: 'major' | 'minor' | 'patch';
}

// ============================================================================
// Version Utilities Types
// ============================================================================

/**
 * Version range specification
 */
export interface VersionRange {
  /** Minimum version (inclusive) */
  min?: SemanticVersion;
  /** Maximum version (inclusive) */
  max?: SemanticVersion;
  /** Exact version match */
  exact?: SemanticVersion;
  /** Version pattern (e.g., '1.x.x') */
  pattern?: string;
}
