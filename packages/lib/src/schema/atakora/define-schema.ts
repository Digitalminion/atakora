/**
 * Main schema definition function and validation.
 *
 * @remarks
 * Provides the `defineSchema` function for creating data model definitions
 * with full type inference and validation.
 *
 * @packageDocumentation
 */

import type { z } from 'zod';
import type {
  SchemaDefinition,
  InferSchemaType,
} from './schema-types';
import { validateAuthorizationRules } from './authorization';
import { validateRelationship } from './relationships';

/**
 * Define a data schema with full type inference.
 *
 * @param name - Entity name
 * @param definition - Schema definition
 * @returns Validated schema definition
 *
 * @example
 * ```typescript
 * import { defineSchema, Fields, allow, hasMany, belongsTo } from '@atakora/lib/schema/atakora';
 * import { z } from 'zod';
 *
 * const UserSchema = defineSchema('User', {
 *   fields: z.object({
 *     id: Fields.id(),
 *     email: Fields.email().unique(),
 *     name: z.string().min(1).max(100),
 *     role: z.enum(['admin', 'user', 'guest']).default('user'),
 *     createdAt: Fields.createdAt(),
 *     updatedAt: Fields.updatedAt()
 *   }),
 *
 *   authorization: {
 *     create: allow.authenticated(),
 *     read: allow.public(),
 *     update: allow.owner('id').or(allow.role('admin')),
 *     delete: allow.role('admin'),
 *     fields: {
 *       email: allow.owner('id').or(allow.role('admin'))
 *     }
 *   },
 *
 *   indexes: {
 *     byEmail: { fields: ['email'], unique: true },
 *     byRole: { fields: ['role', 'createdAt'] }
 *   },
 *
 *   relationships: {
 *     posts: hasMany('Post', 'authorId'),
 *     profile: hasOne('Profile', 'userId')
 *   },
 *
 *   hooks: {
 *     beforeCreate: async (data, context) => {
 *       // Normalize email
 *       data.email = data.email.toLowerCase();
 *       return data;
 *     },
 *     afterCreate: async (data, context) => {
 *       // Send welcome email
 *       console.log(`User created: ${data.email}`);
 *     }
 *   }
 * });
 *
 * // Type inference works automatically
 * type User = InferSchemaType<typeof UserSchema>;
 * ```
 */
export function defineSchema<TFields extends z.ZodRawShape>(
  name: string,
  definition: Omit<SchemaDefinition<TFields>, 'name'>
): SchemaDefinition<TFields> {
  const schema: SchemaDefinition<TFields> = {
    name,
    ...definition,
  };

  // Validate the schema
  const validation = validateSchema(schema);
  if (!validation.valid) {
    throw new Error(
      `Invalid schema definition for '${name}':\n${validation.errors.join('\n')}`
    );
  }

  return schema;
}

/**
 * Validate a schema definition.
 *
 * @param schema - Schema to validate
 * @returns Validation result
 */
export function validateSchema(
  schema: SchemaDefinition<any>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate name
  if (!schema.name || schema.name.trim() === '') {
    errors.push('Schema name cannot be empty');
  }

  if (!/^[A-Z][a-zA-Z0-9]*$/.test(schema.name)) {
    errors.push(
      `Schema name '${schema.name}' must start with uppercase letter and contain only alphanumeric characters`
    );
  }

  // Validate fields
  if (!schema.fields) {
    errors.push('Schema must have a fields definition');
  }

  // Validate authorization rules if present
  if (schema.authorization) {
    const authValidation = validateAuthorizationRules(schema.authorization);
    if (!authValidation.valid) {
      errors.push(...authValidation.errors);
    }
  }

  // Validate relationships if present
  if (schema.relationships) {
    for (const [name, rel] of Object.entries(schema.relationships)) {
      const relValidation = validateRelationship(name, rel);
      if (!relValidation.valid) {
        errors.push(...relValidation.errors);
      }
    }
  }

  // Validate indexes if present
  if (schema.indexes) {
    for (const [name, index] of Object.entries(schema.indexes)) {
      if (!index.fields || index.fields.length === 0) {
        errors.push(`Index '${name}' must have at least one field`);
      }
    }
  }

  // Validate computed fields if present
  if (schema.computed) {
    for (const [name, computed] of Object.entries(schema.computed)) {
      if (!computed.compute) {
        errors.push(`Computed field '${name}' must have a compute function`);
      }
      if (!computed.type) {
        errors.push(`Computed field '${name}' must have a type`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get the primary key field from a schema.
 *
 * @param schema - Schema definition
 * @returns Primary key field name or undefined
 */
export function getPrimaryKeyField(schema: SchemaDefinition<any>): string | undefined {
  const shape = schema.fields.shape;

  for (const [fieldName, fieldSchema] of Object.entries(shape)) {
    if ((fieldSchema as any)._metadata?.primaryKey) {
      return fieldName;
    }
  }

  // Default to 'id' if no explicit primary key
  if ('id' in shape) {
    return 'id';
  }

  return undefined;
}

/**
 * Get all unique fields from a schema.
 *
 * @param schema - Schema definition
 * @returns Array of unique field names
 */
export function getUniqueFields(schema: SchemaDefinition<any>): string[] {
  const shape = schema.fields.shape;
  const uniqueFields: string[] = [];

  for (const [fieldName, fieldSchema] of Object.entries(shape)) {
    if ((fieldSchema as any)._metadata?.unique) {
      uniqueFields.push(fieldName);
    }
  }

  return uniqueFields;
}

/**
 * Get all indexed fields from a schema.
 *
 * @param schema - Schema definition
 * @returns Array of indexed field names
 */
export function getIndexedFields(schema: SchemaDefinition<any>): string[] {
  const shape = schema.fields.shape;
  const indexedFields: string[] = [];

  for (const [fieldName, fieldSchema] of Object.entries(shape)) {
    if ((fieldSchema as any)._metadata?.indexed) {
      indexedFields.push(fieldName);
    }
  }

  return indexedFields;
}

/**
 * Get all auto-generated fields from a schema.
 *
 * @param schema - Schema definition
 * @returns Map of field names to generation type
 */
export function getAutoGeneratedFields(
  schema: SchemaDefinition<any>
): Map<string, 'uuid' | 'cuid' | 'increment' | 'timestamp'> {
  const shape = schema.fields.shape;
  const autoFields = new Map<string, 'uuid' | 'cuid' | 'increment' | 'timestamp'>();

  for (const [fieldName, fieldSchema] of Object.entries(shape)) {
    const metadata = (fieldSchema as any)._metadata;
    if (metadata?.autoGenerate) {
      autoFields.set(fieldName, metadata.autoGenerate);
    }
  }

  return autoFields;
}

/**
 * Get all auto-updated fields from a schema.
 *
 * @param schema - Schema definition
 * @returns Array of auto-updated field names
 */
export function getAutoUpdatedFields(schema: SchemaDefinition<any>): string[] {
  const shape = schema.fields.shape;
  const autoUpdatedFields: string[] = [];

  for (const [fieldName, fieldSchema] of Object.entries(shape)) {
    if ((fieldSchema as any)._metadata?.autoUpdate) {
      autoUpdatedFields.push(fieldName);
    }
  }

  return autoUpdatedFields;
}

/**
 * Extract field metadata from a schema.
 *
 * @param schema - Schema definition
 * @returns Map of field names to metadata
 */
export function extractFieldMetadata(schema: SchemaDefinition<any>): Map<string, any> {
  const shape = schema.fields.shape;
  const metadata = new Map<string, any>();

  for (const [fieldName, fieldSchema] of Object.entries(shape)) {
    const fieldMetadata = (fieldSchema as any)._metadata;
    if (fieldMetadata) {
      metadata.set(fieldName, fieldMetadata);
    }
  }

  return metadata;
}

/**
 * Check if a schema has a specific relationship.
 *
 * @param schema - Schema definition
 * @param relationshipName - Relationship name
 * @returns True if relationship exists
 */
export function hasRelationship(
  schema: SchemaDefinition<any>,
  relationshipName: string
): boolean {
  return !!schema.relationships?.[relationshipName];
}

/**
 * Get relationship by name.
 *
 * @param schema - Schema definition
 * @param relationshipName - Relationship name
 * @returns Relationship definition or undefined
 */
export function getRelationship(
  schema: SchemaDefinition<any>,
  relationshipName: string
): any {
  return schema.relationships?.[relationshipName];
}

/**
 * Get all relationships of a specific type.
 *
 * @param schema - Schema definition
 * @param type - Relationship type
 * @returns Array of relationship names
 */
export function getRelationshipsByType(
  schema: SchemaDefinition<any>,
  type: 'hasOne' | 'hasMany' | 'belongsTo' | 'manyToMany' | 'polymorphic'
): string[] {
  if (!schema.relationships) {
    return [];
  }

  return Object.entries(schema.relationships)
    .filter(([_, rel]) => rel.type === type)
    .map(([name]) => name);
}

/**
 * Schema registry for managing multiple schemas.
 */
export class SchemaRegistry {
  private schemas = new Map<string, SchemaDefinition<any>>();

  /**
   * Register a schema.
   */
  register(schema: SchemaDefinition<any>): void {
    if (this.schemas.has(schema.name)) {
      throw new Error(`Schema '${schema.name}' is already registered`);
    }
    this.schemas.set(schema.name, schema);
  }

  /**
   * Get a schema by name.
   */
  get(name: string): SchemaDefinition<any> | undefined {
    return this.schemas.get(name);
  }

  /**
   * Check if a schema exists.
   */
  has(name: string): boolean {
    return this.schemas.has(name);
  }

  /**
   * Get all registered schemas.
   */
  all(): SchemaDefinition<any>[] {
    return Array.from(this.schemas.values());
  }

  /**
   * Get all schema names.
   */
  names(): string[] {
    return Array.from(this.schemas.keys());
  }

  /**
   * Clear all schemas.
   */
  clear(): void {
    this.schemas.clear();
  }

  /**
   * Validate all relationships across schemas.
   */
  validateRelationships(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const schemaNames = new Set(this.names());

    for (const schema of this.all()) {
      if (!schema.relationships) continue;

      for (const [relName, rel] of Object.entries(schema.relationships)) {
        // Check if target schema exists
        if ('target' in rel && rel.target && !schemaNames.has(rel.target)) {
          errors.push(
            `Schema '${schema.name}' has relationship '${relName}' targeting unknown schema '${rel.target}'`
          );
        }

        // Check polymorphic targets
        if ('targets' in rel && rel.targets) {
          for (const target of rel.targets) {
            if (!schemaNames.has(target)) {
              errors.push(
                `Schema '${schema.name}' has polymorphic relationship '${relName}' targeting unknown schema '${target}'`
              );
            }
          }
        }

        // Check through table for many-to-many
        if ('through' in rel && rel.through && !schemaNames.has(rel.through)) {
          errors.push(
            `Schema '${schema.name}' has many-to-many relationship '${relName}' with unknown through table '${rel.through}'`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Global schema registry instance.
 */
export const globalSchemaRegistry = new SchemaRegistry();
