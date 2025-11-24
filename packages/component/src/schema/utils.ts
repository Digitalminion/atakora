/**
 * Schema Utility Functions
 *
 * Helper functions for processing and validating schema definitions.
 */

import type { FieldConfig, ModelConfig, ProcessedModel } from './types';
import type { BaseFieldBuilder } from './field-types';
import type { CrudModelBuilder } from './crud-model';
import type { EventModelBuilder } from './event-model';
import type { FunctionModelBuilder } from './function-model';

// ============================================================================
// Field Processing
// ============================================================================

/**
 * Process field definitions into configuration objects
 *
 * @param fields - Object containing field builders
 * @returns Processed field configurations
 */
export function processFields(fields: any): Record<string, FieldConfig> {
  if (!fields || typeof fields !== 'object') {
    throw new Error('Fields must be an object');
  }

  const processed: Record<string, FieldConfig> = {};

  for (const [fieldName, fieldBuilder] of Object.entries(fields)) {
    // Validate field name
    validateFieldName(fieldName);

    // Extract configuration from builder
    if (fieldBuilder && typeof fieldBuilder === 'object' && '_build' in fieldBuilder) {
      processed[fieldName] = (fieldBuilder as any)._build();
    } else {
      throw new Error(`Invalid field builder for "${fieldName}". Use a.string(), a.number(), etc.`);
    }
  }

  return processed;
}

/**
 * Validate field name follows conventions
 */
function validateFieldName(name: string): void {
  if (!name) {
    throw new Error('Field name cannot be empty');
  }

  // Check reserved words first (these bypass normal naming rules)
  const reserved = ['constructor', 'prototype', '__proto__', 'toString', 'valueOf'];
  if (reserved.includes(name)) {
    throw new Error(`Field name "${name}" is a reserved word`);
  }

  // Must start with letter or underscore
  if (!/^[a-zA-Z_]/.test(name)) {
    throw new Error(`Field name "${name}" must start with a letter or underscore`);
  }

  // Can contain letters, numbers, underscores, hyphens, and dots
  // This allows for flexibility in field naming, especially for Cosmos DB
  if (!/^[a-zA-Z_][a-zA-Z0-9_\-\.]*$/.test(name)) {
    throw new Error(
      `Field name "${name}" can only contain letters, numbers, underscores, hyphens, and dots`
    );
  }
}

// ============================================================================
// Model Processing
// ============================================================================

/**
 * Process model definitions into processed model objects
 *
 * @param models - Object containing model builders
 * @returns Processed models with metadata
 */
export function processModels(models: any): Record<string, ProcessedModel> {
  if (!models || typeof models !== 'object') {
    throw new Error('Models must be an object');
  }

  const processed: Record<string, ProcessedModel> = {};

  for (const [modelName, modelBuilder] of Object.entries(models)) {
    // Validate model name (PascalCase)
    validateModelName(modelName);

    // Process model based on type
    const processedModel = processModel(modelName, modelBuilder);
    processed[modelName] = processedModel;
  }

  return processed;
}

/**
 * Process a single model
 */
function processModel(name: string, builder: any): ProcessedModel {
  if (!builder || typeof builder !== 'object' || !builder._config) {
    throw new Error(`Invalid model builder for "${name}". Use c.model(), e.model(), or f.model()`);
  }

  const config: ModelConfig = builder._config;

  return {
    name,
    config,
    metadata: {
      isCrud: config.type === 'crud',
      isEvent: config.type === 'event',
      isFunction: config.type === 'function',
    },
  };
}

/**
 * Validate model name follows PascalCase convention
 */
function validateModelName(name: string): void {
  if (!name) {
    throw new Error('Model name cannot be empty');
  }

  // Must be PascalCase (start with uppercase letter)
  if (!/^[A-Z]/.test(name)) {
    throw new Error(`Model name "${name}" must start with an uppercase letter (PascalCase)`);
  }

  // Can only contain letters and numbers
  if (!/^[A-Za-z0-9]+$/.test(name)) {
    throw new Error(`Model name "${name}" can only contain letters and numbers`);
  }

  // Check reserved words
  const reserved = ['Schema', 'Model', 'Builder', 'Config', 'Type'];
  if (reserved.includes(name)) {
    throw new Error(`Model name "${name}" is a reserved word`);
  }
}

// ============================================================================
// Model Categorization
// ============================================================================

/**
 * Extract model names by category
 *
 * @param models - Processed models
 * @returns Object with categorized model names
 */
export function extractModelNames(models: Record<string, ProcessedModel>): {
  crud: string[];
  events: string[];
  functions: string[];
} {
  const crud: string[] = [];
  const events: string[] = [];
  const functions: string[] = [];

  for (const [name, model] of Object.entries(models)) {
    if (model.metadata.isCrud) {
      crud.push(name);
    } else if (model.metadata.isEvent) {
      events.push(name);
    } else if (model.metadata.isFunction) {
      functions.push(name);
    }
  }

  return { crud, events, functions };
}

// ============================================================================
// Schema Validation
// ============================================================================

/**
 * Validate complete schema definition
 *
 * @param definition - Schema definition to validate
 */
export function validateSchemaDefinition(definition: any): void {
  if (!definition) {
    throw new Error('Schema definition is required');
  }

  if (!definition.schema) {
    throw new Error('Schema definition must include a "schema" property');
  }

  if (typeof definition.schema !== 'object') {
    throw new Error('Schema must be an object');
  }

  const modelCount = Object.keys(definition.schema).length;
  if (modelCount === 0) {
    throw new Error('Schema must contain at least one model');
  }

  // Check for duplicate model names (case-insensitive)
  const modelNames = Object.keys(definition.schema);
  const lowerCaseNames = modelNames.map((n) => n.toLowerCase());
  const uniqueNames = new Set(lowerCaseNames);

  if (uniqueNames.size !== modelNames.length) {
    throw new Error('Schema contains duplicate model names (case-insensitive)');
  }
}

// ============================================================================
// Type Utilities
// ============================================================================

/**
 * Check if value is a field builder
 */
export function isFieldBuilder(value: any): value is BaseFieldBuilder<any, any> {
  return !!value && typeof value === 'object' && '_build' in value && !('_config' in value);
}

/**
 * Check if value is a CRUD model builder
 */
export function isCrudModel(value: any): value is CrudModelBuilder {
  return (
    !!value && typeof value === 'object' && '_config' in value && value._config.type === 'crud'
  );
}

/**
 * Check if value is an event model builder
 */
export function isEventModel(value: any): value is EventModelBuilder {
  return (
    !!value && typeof value === 'object' && '_config' in value && value._config.type === 'event'
  );
}

/**
 * Check if value is a function model builder
 */
export function isFunctionModel(value: any): value is FunctionModelBuilder {
  return (
    !!value && typeof value === 'object' && '_config' in value && value._config.type === 'function'
  );
}
