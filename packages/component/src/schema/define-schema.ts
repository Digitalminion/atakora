/**
 * Schema Definition
 *
 * Main function for defining application schemas.
 */

import type { SchemaDefinitionInput, SchemaObject, ProcessedModel } from './types';
import {
  validateSchemaDefinition,
  processModels,
  extractModelNames,
} from './utils';

// ============================================================================
// Schema Definition Function
// ============================================================================

/**
 * Define application schema
 *
 * Creates a schema object containing all data models (CRUD, events, functions).
 * This is the single source of truth for your application's data contracts.
 *
 * Auto-generates:
 * - REST API endpoints
 * - Database containers
 * - Event queues
 * - Azure Functions
 * - TypeScript types
 * - Validation logic
 *
 * @param definition - Schema definition with models
 * @returns Schema object with metadata and type information
 *
 * @example
 * ```typescript
 * import { defineSchema, a, c, e, f } from '@atakora/component';
 *
 * export const schema = defineSchema({
 *   schema: a.schema({
 *     // CRUD Models
 *     User: c.model({
 *       id: a.id(),
 *       email: a.string().required().email(),
 *       name: a.string().required(),
 *     }),
 *
 *     // Event Models
 *     DataUploaded: e.model({
 *       datasetId: a.string().required(),
 *       fileUrl: a.string().url().required(),
 *     }),
 *
 *     // Function Models
 *     GenerateReport: f.model({
 *       input: {
 *         datasetId: a.string().required(),
 *       },
 *       output: {
 *         reportUrl: a.string().url().required(),
 *       },
 *     }),
 *   }),
 * });
 *
 * // Type-safe access
 * type User = typeof schema.models.User;
 * ```
 */
export function defineSchema<T extends SchemaDefinitionInput>(
  definition: T
): SchemaObject<T> {
  // Validate schema structure
  validateSchemaDefinition(definition);

  // Process all models
  const models = processModels(definition.schema);

  // Extract model names by category
  const modelNames = extractModelNames(models);

  // Create schema object
  const schemaObject: SchemaObject<T> = {
    schema: definition.schema,
    models,
    _metadata: {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      models: modelNames,
    },
    _raw: definition,
  };

  return schemaObject;
}

// ============================================================================
// Schema Introspection Utilities
// ============================================================================

/**
 * Get all model names from schema
 *
 * @param schema - Schema object
 * @returns Array of all model names
 */
export function getModelNames(schema: SchemaObject): string[] {
  return Object.keys(schema.models);
}

/**
 * Get CRUD model names from schema
 *
 * @param schema - Schema object
 * @returns Array of CRUD model names
 */
export function getCrudModelNames(schema: SchemaObject): string[] {
  return schema._metadata.models.crud;
}

/**
 * Get event model names from schema
 *
 * @param schema - Schema object
 * @returns Array of event model names
 */
export function getEventModelNames(schema: SchemaObject): string[] {
  return schema._metadata.models.events;
}

/**
 * Get function model names from schema
 *
 * @param schema - Schema object
 * @returns Array of function model names
 */
export function getFunctionModelNames(schema: SchemaObject): string[] {
  return schema._metadata.models.functions;
}

/**
 * Get model by name
 *
 * @param schema - Schema object
 * @param name - Model name
 * @returns Processed model or undefined
 */
export function getModel(schema: SchemaObject, name: string): ProcessedModel | undefined {
  return schema.models[name];
}

/**
 * Check if model exists
 *
 * @param schema - Schema object
 * @param name - Model name
 * @returns True if model exists
 */
export function hasModel(schema: SchemaObject, name: string): boolean {
  return name in schema.models;
}

/**
 * Get schema metadata
 *
 * @param schema - Schema object
 * @returns Schema metadata
 */
export function getSchemaMetadata(schema: SchemaObject) {
  return schema._metadata;
}

/**
 * Get schema statistics
 *
 * @param schema - Schema object
 * @returns Statistics about the schema
 */
export function getSchemaStats(schema: SchemaObject) {
  const { crud, events, functions } = schema._metadata.models;

  return {
    totalModels: crud.length + events.length + functions.length,
    crudModels: crud.length,
    eventModels: events.length,
    functionModels: functions.length,
    models: {
      crud,
      events,
      functions,
    },
  };
}
