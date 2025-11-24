/**
 * Schema Introspection Utilities
 *
 * Utilities for analyzing and extracting information from schema definitions.
 * These utilities are used by synthesizers to discover models, fields, and relationships.
 *
 * @module @atakora/component/synthesis/schema-introspection
 *
 * @remarks
 * The SchemaIntrospector provides methods to:
 * - Discover CRUD, event, and function models
 * - Extract field information and types
 * - Identify relationships between models
 * - Validate model types with type guards
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { SchemaIntrospector } from '@atakora/component/synthesis';
 * import { defineSchema } from '@atakora/component/schema';
 *
 * const schema = defineSchema({ ... });
 * const introspector = new SchemaIntrospector();
 *
 * const crudModels = introspector.getCrudModels(schema);
 * const eventModels = introspector.getEventModels(schema);
 * const functionModels = introspector.getFunctionModels(schema);
 * ```
 */

import type {
  SchemaObject,
  ProcessedModel,
  ModelConfig,
  CrudModelConfig,
  EventModelConfig,
  FunctionModelConfig,
  FieldConfig,
  RefFieldConfig,
} from '../schema/types';

// ============================================================================
// Introspection Result Types
// ============================================================================

/**
 * Information about a discovered model
 */
export interface ModelInfo {
  /** Model name */
  readonly name: string;
  /** Model type classification */
  readonly type: 'crud' | 'event' | 'function';
  /** Raw model configuration */
  readonly definition: ModelConfig;
  /** Extracted field information */
  readonly fields: readonly FieldInfo[];
  /** Model metadata */
  readonly metadata: {
    readonly isCrud: boolean;
    readonly isEvent: boolean;
    readonly isFunction: boolean;
  };
}

/**
 * Information about a discovered field
 */
export interface FieldInfo {
  /** Field name */
  readonly name: string;
  /** Field type (string, number, ref, etc.) */
  readonly type: string;
  /** Whether field is required */
  readonly required: boolean;
  /** Field constraints (min, max, pattern, etc.) */
  readonly constraints?: Readonly<Record<string, any>>;
  /** For ref fields, the referenced model name */
  readonly refModelName?: string;
  /** For array fields, the item type information */
  readonly itemType?: string;
}

/**
 * Information about relationships between models
 */
export interface RelationshipInfo {
  /** Source model name */
  readonly sourceModel: string;
  /** Source field name */
  readonly sourceField: string;
  /** Target model name */
  readonly targetModel: string;
  /** Relationship type */
  readonly type: 'one-to-one' | 'one-to-many' | 'many-to-one';
  /** On delete behavior */
  readonly onDelete?: 'cascade' | 'set_null' | 'restrict';
}

/**
 * Statistics about a schema
 */
export interface SchemaStats {
  /** Total number of models */
  readonly totalModels: number;
  /** Number of CRUD models */
  readonly crudModels: number;
  /** Number of event models */
  readonly eventModels: number;
  /** Number of function models */
  readonly functionModels: number;
  /** Total number of fields across all models */
  readonly totalFields: number;
  /** Number of relationships between models */
  readonly relationships: number;
}

// ============================================================================
// Schema Introspector Class
// ============================================================================

/**
 * Utility class for introspecting schema definitions
 *
 * @remarks
 * Provides methods to analyze schema objects and extract information about
 * models, fields, and relationships. Used by synthesizers to understand
 * the schema structure and generate appropriate resources.
 *
 * @example
 * ```typescript
 * const introspector = new SchemaIntrospector();
 * const crudModels = introspector.getCrudModels(schema);
 *
 * for (const model of crudModels) {
 *   console.log(`Model: ${model.name}`);
 *   console.log(`Fields: ${model.fields.length}`);
 *   for (const field of model.fields) {
 *     console.log(`  - ${field.name}: ${field.type}`);
 *   }
 * }
 * ```
 */
export class SchemaIntrospector {
  /**
   * Get all CRUD models from schema
   *
   * @param schema - Schema object to introspect
   * @returns Array of CRUD model information
   *
   * @example
   * ```typescript
   * const introspector = new SchemaIntrospector();
   * const crudModels = introspector.getCrudModels(schema);
   *
   * console.log(`Found ${crudModels.length} CRUD models`);
   * for (const model of crudModels) {
   *   console.log(`- ${model.name}: ${model.fields.length} fields`);
   * }
   * ```
   */
  getCrudModels(schema: SchemaObject): readonly ModelInfo[] {
    const models: ModelInfo[] = [];

    for (const [name, processedModel] of Object.entries(schema.models)) {
      if (this.isCrudModel(processedModel.config)) {
        models.push({
          name,
          type: 'crud',
          definition: processedModel.config,
          fields: this.extractFields(processedModel.config),
          metadata: processedModel.metadata,
        });
      }
    }

    return models;
  }

  /**
   * Get all event models from schema
   *
   * @param schema - Schema object to introspect
   * @returns Array of event model information
   *
   * @example
   * ```typescript
   * const introspector = new SchemaIntrospector();
   * const eventModels = introspector.getEventModels(schema);
   *
   * console.log(`Found ${eventModels.length} event models`);
   * for (const model of eventModels) {
   *   console.log(`- ${model.name}: ${model.fields.length} fields`);
   * }
   * ```
   */
  getEventModels(schema: SchemaObject): readonly ModelInfo[] {
    const models: ModelInfo[] = [];

    for (const [name, processedModel] of Object.entries(schema.models)) {
      if (this.isEventModel(processedModel.config)) {
        models.push({
          name,
          type: 'event',
          definition: processedModel.config,
          fields: this.extractFields(processedModel.config),
          metadata: processedModel.metadata,
        });
      }
    }

    return models;
  }

  /**
   * Get all function models from schema
   *
   * @param schema - Schema object to introspect
   * @returns Array of function model information
   *
   * @example
   * ```typescript
   * const introspector = new SchemaIntrospector();
   * const functionModels = introspector.getFunctionModels(schema);
   *
   * console.log(`Found ${functionModels.length} function models`);
   * for (const model of functionModels) {
   *   console.log(`- ${model.name}`);
   * }
   * ```
   */
  getFunctionModels(schema: SchemaObject): readonly ModelInfo[] {
    const models: ModelInfo[] = [];

    for (const [name, processedModel] of Object.entries(schema.models)) {
      if (this.isFunctionModel(processedModel.config)) {
        models.push({
          name,
          type: 'function',
          definition: processedModel.config,
          fields: this.extractFunctionFields(processedModel.config),
          metadata: processedModel.metadata,
        });
      }
    }

    return models;
  }

  /**
   * Get all models of any type from schema
   *
   * @param schema - Schema object to introspect
   * @returns Array of all model information
   *
   * @example
   * ```typescript
   * const introspector = new SchemaIntrospector();
   * const allModels = introspector.getAllModels(schema);
   *
   * console.log(`Total models: ${allModels.length}`);
   * ```
   */
  getAllModels(schema: SchemaObject): readonly ModelInfo[] {
    return [
      ...this.getCrudModels(schema),
      ...this.getEventModels(schema),
      ...this.getFunctionModels(schema),
    ];
  }

  /**
   * Get a specific model by name
   *
   * @param schema - Schema object to introspect
   * @param name - Model name to find
   * @returns Model information or undefined if not found
   *
   * @example
   * ```typescript
   * const introspector = new SchemaIntrospector();
   * const userModel = introspector.getModel(schema, 'User');
   *
   * if (userModel) {
   *   console.log(`Found ${userModel.name} model with ${userModel.fields.length} fields`);
   * }
   * ```
   */
  getModel(schema: SchemaObject, name: string): ModelInfo | undefined {
    const processedModel = schema.models[name];
    if (!processedModel) {
      return undefined;
    }

    const type = this.getModelType(processedModel.config);
    if (!type) {
      return undefined;
    }

    let fields: readonly FieldInfo[];
    if (type === 'function') {
      fields = this.extractFunctionFields(processedModel.config as FunctionModelConfig);
    } else if (type === 'crud' || type === 'event') {
      fields = this.extractFields(processedModel.config as CrudModelConfig | EventModelConfig);
    } else {
      fields = [];
    }

    return {
      name,
      type,
      definition: processedModel.config,
      fields,
      metadata: processedModel.metadata,
    };
  }

  /**
   * Type guard: Check if model config is a CRUD model
   *
   * @param config - Model configuration to check
   * @returns True if config is a CRUD model
   *
   * @example
   * ```typescript
   * const introspector = new SchemaIntrospector();
   * const model = schema.models.User;
   *
   * if (introspector.isCrudModel(model.config)) {
   *   console.log('User is a CRUD model');
   * }
   * ```
   */
  isCrudModel(config: ModelConfig): config is CrudModelConfig {
    return config && typeof config === 'object' && config.type === 'crud';
  }

  /**
   * Type guard: Check if model config is an event model
   *
   * @param config - Model configuration to check
   * @returns True if config is an event model
   *
   * @example
   * ```typescript
   * const introspector = new SchemaIntrospector();
   * const model = schema.models.DataUploaded;
   *
   * if (introspector.isEventModel(model.config)) {
   *   console.log('DataUploaded is an event model');
   * }
   * ```
   */
  isEventModel(config: ModelConfig): config is EventModelConfig {
    return config && typeof config === 'object' && config.type === 'event';
  }

  /**
   * Type guard: Check if model config is a function model
   *
   * @param config - Model configuration to check
   * @returns True if config is a function model
   *
   * @example
   * ```typescript
   * const introspector = new SchemaIntrospector();
   * const model = schema.models.GenerateReport;
   *
   * if (introspector.isFunctionModel(model.config)) {
   *   console.log('GenerateReport is a function model');
   * }
   * ```
   */
  isFunctionModel(config: ModelConfig): config is FunctionModelConfig {
    return config && typeof config === 'object' && config.type === 'function';
  }

  /**
   * Extract field information from a model configuration
   *
   * @param config - Model configuration (CRUD or Event)
   * @returns Array of field information
   *
   * @example
   * ```typescript
   * const introspector = new SchemaIntrospector();
   * const model = schema.models.User;
   * const fields = introspector.extractFields(model.config);
   *
   * for (const field of fields) {
   *   console.log(`${field.name}: ${field.type} (required: ${field.required})`);
   * }
   * ```
   */
  extractFields(config: CrudModelConfig | EventModelConfig): readonly FieldInfo[] {
    if (!config || !config.fields) {
      return [];
    }

    const fields: FieldInfo[] = [];

    for (const [name, fieldConfig] of Object.entries(config.fields)) {
      fields.push(this.createFieldInfo(name, fieldConfig));
    }

    return fields;
  }

  /**
   * Extract field information from a function model
   *
   * @param config - Function model configuration
   * @returns Array of field information (input and output fields combined)
   *
   * @remarks
   * Function models have separate input and output fields. This method combines
   * them for unified introspection. To distinguish between input and output fields,
   * check the field name prefix or use the raw config.
   */
  extractFunctionFields(config: FunctionModelConfig): readonly FieldInfo[] {
    const fields: FieldInfo[] = [];

    // Extract input fields
    if (config.input) {
      for (const [name, fieldConfig] of Object.entries(config.input)) {
        fields.push(this.createFieldInfo(name, fieldConfig));
      }
    }

    // Extract output fields
    if (config.output) {
      for (const [name, fieldConfig] of Object.entries(config.output)) {
        fields.push(this.createFieldInfo(name, fieldConfig));
      }
    }

    return fields;
  }

  /**
   * Find all relationships between models in the schema
   *
   * @param schema - Schema object to introspect
   * @returns Array of relationship information
   *
   * @remarks
   * Relationships are identified by ref fields that reference other models.
   * This method scans all CRUD models for ref fields and builds a relationship graph.
   *
   * @example
   * ```typescript
   * const introspector = new SchemaIntrospector();
   * const relationships = introspector.findRelationships(schema);
   *
   * for (const rel of relationships) {
   *   console.log(`${rel.sourceModel}.${rel.sourceField} -> ${rel.targetModel}`);
   * }
   * ```
   */
  findRelationships(schema: SchemaObject): readonly RelationshipInfo[] {
    const relationships: RelationshipInfo[] = [];
    const crudModels = this.getCrudModels(schema);

    for (const model of crudModels) {
      for (const field of model.fields) {
        if (field.type === 'ref' && field.refModelName) {
          const refConfig = this.getFieldConfig(model.definition, field.name) as RefFieldConfig;

          relationships.push({
            sourceModel: model.name,
            sourceField: field.name,
            targetModel: field.refModelName,
            type: 'many-to-one', // Default assumption for ref fields
            onDelete: refConfig?.onDelete,
          });
        }
      }
    }

    return relationships;
  }

  /**
   * Get model count by type
   *
   * @param schema - Schema object to introspect
   * @returns Object with counts for each model type
   *
   * @example
   * ```typescript
   * const introspector = new SchemaIntrospector();
   * const counts = introspector.getModelCounts(schema);
   *
   * console.log(`CRUD: ${counts.crud}, Events: ${counts.event}, Functions: ${counts.function}`);
   * ```
   */
  getModelCounts(schema: SchemaObject): {
    readonly crud: number;
    readonly event: number;
    readonly function: number;
  } {
    return {
      crud: this.getCrudModels(schema).length,
      event: this.getEventModels(schema).length,
      function: this.getFunctionModels(schema).length,
    };
  }

  /**
   * Get comprehensive statistics about the schema
   *
   * @param schema - Schema object to introspect
   * @returns Statistics object with counts and metrics
   *
   * @example
   * ```typescript
   * const introspector = new SchemaIntrospector();
   * const stats = introspector.getSchemaStats(schema);
   *
   * console.log(`Total models: ${stats.totalModels}`);
   * console.log(`Total fields: ${stats.totalFields}`);
   * console.log(`Relationships: ${stats.relationships}`);
   * ```
   */
  getSchemaStats(schema: SchemaObject): SchemaStats {
    const allModels = this.getAllModels(schema);
    const counts = this.getModelCounts(schema);
    const relationships = this.findRelationships(schema);

    const totalFields = allModels.reduce((sum, model) => sum + model.fields.length, 0);

    return {
      totalModels: allModels.length,
      crudModels: counts.crud,
      eventModels: counts.event,
      functionModels: counts.function,
      totalFields,
      relationships: relationships.length,
    };
  }

  /**
   * Check if a field is a reference to another model
   *
   * @param field - Field information to check
   * @returns True if field is a reference
   *
   * @example
   * ```typescript
   * const introspector = new SchemaIntrospector();
   * const model = introspector.getModel(schema, 'Post');
   *
   * for (const field of model.fields) {
   *   if (introspector.isReferenceField(field)) {
   *     console.log(`${field.name} references ${field.refModelName}`);
   *   }
   * }
   * ```
   */
  isReferenceField(field: FieldInfo): boolean {
    return field.type === 'ref' && !!field.refModelName;
  }

  /**
   * Check if a model has any reference fields
   *
   * @param model - Model information to check
   * @returns True if model has at least one reference field
   *
   * @example
   * ```typescript
   * const introspector = new SchemaIntrospector();
   * const model = introspector.getModel(schema, 'Post');
   *
   * if (introspector.hasReferences(model)) {
   *   console.log('Post has references to other models');
   * }
   * ```
   */
  hasReferences(model: ModelInfo): boolean {
    return model.fields.some((field) => this.isReferenceField(field));
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Get the type of a model configuration
   */
  private getModelType(config: ModelConfig): 'crud' | 'event' | 'function' | undefined {
    if (this.isCrudModel(config)) return 'crud';
    if (this.isEventModel(config)) return 'event';
    if (this.isFunctionModel(config)) return 'function';
    return undefined;
  }

  /**
   * Create a FieldInfo object from a field configuration
   */
  private createFieldInfo(name: string, fieldConfig: FieldConfig): FieldInfo {
    const info: FieldInfo = {
      name,
      type: this.getFieldType(fieldConfig),
      required: this.isFieldRequired(fieldConfig),
      constraints: this.getFieldConstraints(fieldConfig),
    };

    // Add ref-specific information
    if (fieldConfig.type === 'ref') {
      const refConfig = fieldConfig as RefFieldConfig;
      return {
        ...info,
        refModelName: refConfig.modelName,
      };
    }

    // Add array-specific information
    if (fieldConfig.type === 'array') {
      const arrayConfig = fieldConfig as any;
      return {
        ...info,
        itemType: arrayConfig.itemType?._type || arrayConfig.itemType?.type || 'unknown',
      };
    }

    return info;
  }

  /**
   * Get field type string from field configuration
   */
  private getFieldType(field: FieldConfig): string {
    if (!field || !field.type) {
      return 'unknown';
    }
    return field.type;
  }

  /**
   * Check if field is required
   */
  private isFieldRequired(field: FieldConfig): boolean {
    // Check both required property and validations array
    if (field.required === true) {
      return true;
    }

    if (field.validations && Array.isArray(field.validations)) {
      return field.validations.some((v) => v.type === 'required');
    }

    return false;
  }

  /**
   * Get field constraints (min, max, pattern, etc.)
   */
  private getFieldConstraints(field: FieldConfig): Record<string, any> {
    const constraints: Record<string, any> = {};

    // Extract type-specific constraints
    if ('minLength' in field && field.minLength !== undefined) {
      constraints.minLength = field.minLength;
    }
    if ('maxLength' in field && field.maxLength !== undefined) {
      constraints.maxLength = field.maxLength;
    }
    if ('pattern' in field && field.pattern !== undefined) {
      constraints.pattern = field.pattern;
    }
    if ('min' in field && field.min !== undefined) {
      constraints.min = field.min;
    }
    if ('max' in field && field.max !== undefined) {
      constraints.max = field.max;
    }
    if ('integer' in field && field.integer !== undefined) {
      constraints.integer = field.integer;
    }
    if ('values' in field && field.values !== undefined) {
      constraints.values = field.values;
    }

    // Extract from validations array
    if (field.validations && Array.isArray(field.validations)) {
      for (const validation of field.validations) {
        if (validation.type !== 'required') {
          constraints[validation.type] = 'value' in validation ? validation.value : true;
        }
      }
    }

    return constraints;
  }

  /**
   * Get field configuration from model by field name
   */
  private getFieldConfig(modelConfig: ModelConfig, fieldName: string): FieldConfig | undefined {
    if ('fields' in modelConfig) {
      return modelConfig.fields[fieldName];
    }
    return undefined;
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Convenience function to create a SchemaIntrospector instance
 *
 * @returns New SchemaIntrospector instance
 *
 * @example
 * ```typescript
 * import { createSchemaIntrospector } from '@atakora/component/synthesis';
 *
 * const introspector = createSchemaIntrospector();
 * const crudModels = introspector.getCrudModels(schema);
 * ```
 */
export function createSchemaIntrospector(): SchemaIntrospector {
  return new SchemaIntrospector();
}

/**
 * Convenience function to get all CRUD models from a schema
 *
 * @param schema - Schema object to introspect
 * @returns Array of CRUD model information
 *
 * @example
 * ```typescript
 * import { getCrudModels } from '@atakora/component/synthesis';
 *
 * const crudModels = getCrudModels(schema);
 * console.log(`Found ${crudModels.length} CRUD models`);
 * ```
 */
export function getCrudModels(schema: SchemaObject): readonly ModelInfo[] {
  const introspector = new SchemaIntrospector();
  return introspector.getCrudModels(schema);
}

/**
 * Convenience function to get all event models from a schema
 *
 * @param schema - Schema object to introspect
 * @returns Array of event model information
 *
 * @example
 * ```typescript
 * import { getEventModels } from '@atakora/component/synthesis';
 *
 * const eventModels = getEventModels(schema);
 * console.log(`Found ${eventModels.length} event models`);
 * ```
 */
export function getEventModels(schema: SchemaObject): readonly ModelInfo[] {
  const introspector = new SchemaIntrospector();
  return introspector.getEventModels(schema);
}

/**
 * Convenience function to get all function models from a schema
 *
 * @param schema - Schema object to introspect
 * @returns Array of function model information
 *
 * @example
 * ```typescript
 * import { getFunctionModels } from '@atakora/component/synthesis';
 *
 * const functionModels = getFunctionModels(schema);
 * console.log(`Found ${functionModels.length} function models`);
 * ```
 */
export function getFunctionModels(schema: SchemaObject): readonly ModelInfo[] {
  const introspector = new SchemaIntrospector();
  return introspector.getFunctionModels(schema);
}

/**
 * Convenience function to get schema statistics
 *
 * @param schema - Schema object to introspect
 * @returns Schema statistics
 *
 * @example
 * ```typescript
 * import { getSchemaStats } from '@atakora/component/synthesis';
 *
 * const stats = getSchemaStats(schema);
 * console.log(`Total: ${stats.totalModels} models, ${stats.totalFields} fields`);
 * ```
 */
export function getSchemaStats(schema: SchemaObject): SchemaStats {
  const introspector = new SchemaIntrospector();
  return introspector.getSchemaStats(schema);
}
