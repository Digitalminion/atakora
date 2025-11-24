/**
 * Schema Integration System
 *
 * This module provides utilities for integrating schema definitions with backend objects,
 * ensuring type preservation and providing helper functions for model access.
 *
 * @module @atakora/component/backend/schema-integration
 */

import type { SchemaObject, SchemaDefinitionInput, ProcessedModel } from '../schema/types';
import type { BackendObject, AuthDefinition } from './types';

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a value is a valid SchemaObject
 *
 * @param value - Value to check
 * @returns True if value is a SchemaObject
 *
 * @remarks
 * Validates that the object has the required structure:
 * - schema property with models
 * - models property with ProcessedModel entries
 * - _metadata property with version
 */
export function isSchemaObject(value: any): value is SchemaObject {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'schema' in value &&
      'models' in value &&
      '_metadata' in value &&
      value._metadata?.version
  );
}

/**
 * Check if a backend has a valid schema integration
 *
 * @param backend - Backend object to check
 * @returns True if backend has valid schema integration
 */
export function hasSchemaIntegration<
  T extends { schema: Record<string, any> },
  A extends AuthDefinition,
>(backend: BackendObject<T, A>): boolean {
  return isSchemaObject(backend.schema);
}

// ============================================================================
// Schema Validation
// ============================================================================

/**
 * Validate schema structure
 *
 * @param schema - Schema object to validate
 * @throws Error if schema is invalid
 *
 * @remarks
 * Validates that:
 * - Schema has models defined
 * - Each model has valid configuration
 * - Model names are valid identifiers
 */
export function validateSchemaStructure<T extends SchemaDefinitionInput>(
  schema: SchemaObject<T>
): void {
  if (!schema) {
    throw new Error('Schema is required');
  }

  if (!isSchemaObject(schema)) {
    throw new Error('Invalid schema object structure');
  }

  if (!schema.models || typeof schema.models !== 'object') {
    throw new Error('Schema must have a models property');
  }

  const modelNames = Object.keys(schema.models);
  if (modelNames.length === 0) {
    throw new Error('Schema must have at least one model defined');
  }

  // Validate each model
  for (const [modelName, model] of Object.entries(schema.models)) {
    if (!modelName || typeof modelName !== 'string') {
      throw new Error('Model name must be a non-empty string');
    }

    // Validate model name format (PascalCase recommended)
    if (!/^[A-Z][a-zA-Z0-9]*$/.test(modelName)) {
      throw new Error(
        `Model name "${modelName}" must start with uppercase letter and contain only alphanumeric characters`
      );
    }

    if (!model || typeof model !== 'object') {
      throw new Error(`Invalid model configuration for "${modelName}"`);
    }

    if (!model.config || !model.config.type) {
      throw new Error(`Model "${modelName}" missing configuration or type`);
    }

    const validTypes = ['crud', 'event', 'function'];
    if (!validTypes.includes(model.config.type)) {
      throw new Error(
        `Model "${modelName}" has invalid type "${model.config.type}". Must be one of: ${validTypes.join(', ')}`
      );
    }
  }
}

// ============================================================================
// Schema Integration
// ============================================================================

/**
 * Integrate schema with backend object
 *
 * @param schema - Schema object to integrate
 * @param backend - Backend object to integrate with
 *
 * @remarks
 * This function:
 * 1. Validates schema structure
 * 2. Ensures schema is properly connected to backend
 * 3. Sets up model access helpers
 *
 * This is called internally by defineBackend() and typically
 * doesn't need to be called directly.
 */
export function integrateSchema<T extends SchemaDefinitionInput, A extends AuthDefinition>(
  schema: SchemaObject<T>,
  backend: BackendObject<T, A>
): void {
  // Validate schema structure
  validateSchemaStructure(schema);

  // Verify backend reference
  if (!backend) {
    throw new Error('Backend object is required');
  }

  // Schema is already assigned to backend.schema by defineBackend()
  // This function validates and ensures proper integration
}

// ============================================================================
// Model Access Helpers
// ============================================================================

/**
 * Get a model by name from the backend
 *
 * @typeParam T - Schema definition type
 * @typeParam A - Authentication definition type
 * @typeParam K - Model name type (must be key of schema)
 *
 * @param backend - Backend object
 * @param modelName - Name of the model to retrieve
 * @returns Processed model configuration
 *
 * @throws Error if model doesn't exist
 *
 * @example
 * ```typescript
 * const userModel = getModel(backend, 'User');
 * console.log(userModel.config.type); // 'crud'
 * ```
 */
export function getModel<
  T extends { schema: Record<string, any> },
  A extends AuthDefinition,
  K extends keyof T & string,
>(backend: BackendObject<T, A>, modelName: K): ProcessedModel {
  if (!hasSchemaIntegration(backend)) {
    throw new Error('Backend does not have valid schema integration');
  }

  const model = backend.schema.models[modelName];
  if (!model) {
    const availableModels = Object.keys(backend.schema.models).join(', ');
    throw new Error(`Model "${String(modelName)}" not found. Available models: ${availableModels}`);
  }

  return model;
}

/**
 * Check if a model exists in the backend schema
 *
 * @param backend - Backend object
 * @param modelName - Name of the model to check
 * @returns True if model exists
 *
 * @example
 * ```typescript
 * if (hasModel(backend, 'User')) {
 *   // Access user model safely
 * }
 * ```
 */
export function hasModel<T extends { schema: Record<string, any> }, A extends AuthDefinition>(
  backend: BackendObject<T, A>,
  modelName: string
): boolean {
  if (!hasSchemaIntegration(backend)) {
    return false;
  }

  return modelName in backend.schema.models;
}

/**
 * Get all model names from the backend schema
 *
 * @param backend - Backend object
 * @returns Array of model names
 *
 * @example
 * ```typescript
 * const models = getModelNames(backend);
 * console.log(models); // ['User', 'Post', 'Comment']
 * ```
 */
export function getModelNames<T extends SchemaDefinitionInput, A extends AuthDefinition>(
  backend: BackendObject<T, A>
): string[] {
  if (!hasSchemaIntegration(backend)) {
    return [];
  }

  return Object.keys(backend.schema.models);
}

/**
 * Get models filtered by type
 *
 * @param backend - Backend object
 * @param type - Model type to filter by
 * @returns Array of model names of the specified type
 *
 * @example
 * ```typescript
 * const crudModels = getModelsByType(backend, 'crud');
 * const eventModels = getModelsByType(backend, 'event');
 * ```
 */
export function getModelsByType<T extends SchemaDefinitionInput, A extends AuthDefinition>(
  backend: BackendObject<T, A>,
  type: 'crud' | 'event' | 'function'
): string[] {
  if (!hasSchemaIntegration(backend)) {
    return [];
  }

  return Object.entries(backend.schema.models)
    .filter(([_, model]) => model.config.type === type)
    .map(([name]) => name);
}

/**
 * Get model count by type
 *
 * @param backend - Backend object
 * @returns Object with counts for each model type
 *
 * @example
 * ```typescript
 * const counts = getModelCounts(backend);
 * console.log(counts); // { crud: 3, event: 2, function: 1 }
 * ```
 */
export function getModelCounts<T extends SchemaDefinitionInput, A extends AuthDefinition>(
  backend: BackendObject<T, A>
): { crud: number; event: number; function: number } {
  if (!hasSchemaIntegration(backend)) {
    return { crud: 0, event: 0, function: 0 };
  }

  const models = Object.values(backend.schema.models);

  return {
    crud: models.filter((m) => m.config.type === 'crud').length,
    event: models.filter((m) => m.config.type === 'event').length,
    function: models.filter((m) => m.config.type === 'function').length,
  };
}

/**
 * Get the original schema definition
 *
 * @param backend - Backend object
 * @returns Original schema input
 *
 * @remarks
 * Returns the schema exactly as it was defined by the user,
 * before any processing or transformation.
 *
 * @example
 * ```typescript
 * const schema = getOriginalSchema(backend);
 * console.log(schema.User); // Original model builder
 * ```
 */
export function getOriginalSchema<
  T extends { schema: Record<string, any> },
  A extends AuthDefinition,
>(backend: BackendObject<T, A>): any {
  if (!hasSchemaIntegration(backend)) {
    throw new Error('Backend does not have valid schema integration');
  }

  return backend.schema.schema;
}

/**
 * Get schema metadata
 *
 * @param backend - Backend object
 * @returns Schema metadata including version and model categorization
 *
 * @example
 * ```typescript
 * const metadata = getSchemaMetadata(backend);
 * console.log(metadata.version); // '2.0.0'
 * console.log(metadata.models.crud); // ['User', 'Post']
 * ```
 */
export function getSchemaMetadata<T extends SchemaDefinitionInput, A extends AuthDefinition>(
  backend: BackendObject<T, A>
) {
  if (!hasSchemaIntegration(backend)) {
    throw new Error('Backend does not have valid schema integration');
  }

  return backend.schema._metadata;
}

// ============================================================================
// Type-Safe Model Access
// ============================================================================

/**
 * Create a type-safe model accessor for a backend
 *
 * @param backend - Backend object
 * @returns Function to access models in a type-safe way
 *
 * @remarks
 * This creates a helper function that provides better TypeScript
 * autocomplete when accessing models.
 *
 * @example
 * ```typescript
 * const models = createModelAccessor(backend);
 * const user = models('User'); // Type-safe!
 * ```
 */
export function createModelAccessor<T extends SchemaDefinitionInput, A extends AuthDefinition>(
  backend: BackendObject<T, A>
) {
  return function accessor<K extends keyof T & string>(modelName: K): ProcessedModel {
    return getModel(backend, modelName);
  };
}

/**
 * Create a helper object for accessing models by category
 *
 * @param backend - Backend object
 * @returns Object with categorized model accessors
 *
 * @example
 * ```typescript
 * const categorized = categorizeModels(backend);
 * console.log(categorized.crud); // ['User', 'Post']
 * console.log(categorized.events); // ['UserCreated', 'PostPublished']
 * console.log(categorized.functions); // ['GenerateReport']
 * ```
 */
export function categorizeModels<T extends SchemaDefinitionInput, A extends AuthDefinition>(
  backend: BackendObject<T, A>
): {
  crud: string[];
  events: string[];
  functions: string[];
} {
  if (!hasSchemaIntegration(backend)) {
    return { crud: [], events: [], functions: [] };
  }

  const metadata = backend.schema._metadata;

  return {
    crud: metadata.models.crud,
    events: metadata.models.events,
    functions: metadata.models.functions,
  };
}
