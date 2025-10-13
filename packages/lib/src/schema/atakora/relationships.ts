/**
 * Relationship helper functions for schema definitions.
 *
 * @remarks
 * Provides convenient builder functions for defining relationships
 * between entities in the data schema.
 *
 * @packageDocumentation
 */

import type {
  HasOneRelationship,
  HasManyRelationship,
  BelongsToRelationship,
  ManyToManyRelationship,
  PolymorphicRelationship,
  CascadeOptions,
} from './schema-types';
import type { z } from 'zod';

/**
 * Define a has-one relationship (1:1).
 *
 * @param target - Target entity name
 * @param foreignKey - Foreign key field name in target entity
 * @param options - Optional configuration
 * @returns Has-one relationship definition
 *
 * @example
 * ```typescript
 * const UserSchema = defineSchema('User', {
 *   fields: z.object({
 *     id: z.string().uuid()
 *   }),
 *   relationships: {
 *     profile: hasOne('Profile', 'userId', {
 *       cascade: { onDelete: 'cascade' }
 *     })
 *   }
 * });
 * ```
 */
export function hasOne(
  target: string,
  foreignKey: string,
  options?: {
    localKey?: string;
    cascade?: CascadeOptions;
  }
): HasOneRelationship {
  return {
    type: 'hasOne',
    target,
    foreignKey,
    localKey: options?.localKey,
    cascade: options?.cascade,
  };
}

/**
 * Define a has-many relationship (1:N).
 *
 * @param target - Target entity name
 * @param foreignKey - Foreign key field name in target entity
 * @param options - Optional configuration
 * @returns Has-many relationship definition
 *
 * @example
 * ```typescript
 * const UserSchema = defineSchema('User', {
 *   fields: z.object({
 *     id: z.string().uuid()
 *   }),
 *   relationships: {
 *     posts: hasMany('Post', 'authorId', {
 *       cascade: { onDelete: 'set null' }
 *     })
 *   }
 * });
 * ```
 */
export function hasMany(
  target: string,
  foreignKey: string,
  options?: {
    localKey?: string;
    cascade?: CascadeOptions;
  }
): HasManyRelationship {
  return {
    type: 'hasMany',
    target,
    foreignKey,
    localKey: options?.localKey,
    cascade: options?.cascade,
  };
}

/**
 * Define a belongs-to relationship (N:1).
 *
 * @param target - Target entity name
 * @param foreignKey - Foreign key field name in current entity
 * @param options - Optional configuration
 * @returns Belongs-to relationship definition
 *
 * @example
 * ```typescript
 * const PostSchema = defineSchema('Post', {
 *   fields: z.object({
 *     id: z.string().uuid(),
 *     authorId: z.string().uuid()
 *   }),
 *   relationships: {
 *     author: belongsTo('User', 'authorId')
 *   }
 * });
 * ```
 */
export function belongsTo(
  target: string,
  foreignKey: string,
  options?: {
    targetKey?: string;
  }
): BelongsToRelationship {
  return {
    type: 'belongsTo',
    target,
    foreignKey,
    targetKey: options?.targetKey,
  };
}

/**
 * Define a many-to-many relationship (N:M).
 *
 * @param target - Target entity name
 * @param through - Junction table name
 * @param options - Optional configuration
 * @returns Many-to-many relationship definition
 *
 * @example
 * ```typescript
 * const PostSchema = defineSchema('Post', {
 *   fields: z.object({
 *     id: z.string().uuid()
 *   }),
 *   relationships: {
 *     tags: manyToMany('Tag', 'PostTags', {
 *       foreignKey: 'postId',
 *       targetKey: 'tagId',
 *       throughFields: z.object({
 *         addedAt: z.date().default(() => new Date()),
 *         addedBy: z.string().uuid()
 *       })
 *     })
 *   }
 * });
 * ```
 */
export function manyToMany(
  target: string,
  through: string,
  options?: {
    foreignKey?: string;
    targetKey?: string;
    throughFields?: z.ZodRawShape;
  }
): ManyToManyRelationship {
  return {
    type: 'manyToMany',
    target,
    through,
    foreignKey: options?.foreignKey,
    targetKey: options?.targetKey,
    throughFields: options?.throughFields,
  };
}

/**
 * Define a polymorphic relationship.
 *
 * @param targets - Array of possible target entity names
 * @param options - Configuration with foreign key and type field
 * @returns Polymorphic relationship definition
 *
 * @example
 * ```typescript
 * const CommentSchema = defineSchema('Comment', {
 *   fields: z.object({
 *     id: z.string().uuid(),
 *     commentableId: z.string().uuid(),
 *     commentableType: z.enum(['Post', 'Article', 'Video'])
 *   }),
 *   relationships: {
 *     commentable: polymorphic(['Post', 'Article', 'Video'], {
 *       foreignKey: 'commentableId',
 *       typeField: 'commentableType'
 *     })
 *   }
 * });
 * ```
 */
export function polymorphic(
  targets: string[],
  options: {
    foreignKey: string;
    typeField: string;
  }
): PolymorphicRelationship {
  return {
    type: 'polymorphic',
    targets,
    foreignKey: options.foreignKey,
    typeField: options.typeField,
  };
}

/**
 * Cascade configuration builder.
 *
 * @example
 * ```typescript
 * const cascadeDelete = cascade().onDelete('cascade').build();
 * const cascadeAll = cascade().onDelete('cascade').onUpdate('cascade').build();
 * ```
 */
export class CascadeBuilder {
  private _onDelete?: 'cascade' | 'set null' | 'restrict';
  private _onUpdate?: 'cascade' | 'set null' | 'restrict';

  /**
   * Set cascade behavior on delete.
   */
  onDelete(behavior: 'cascade' | 'set null' | 'restrict'): this {
    this._onDelete = behavior;
    return this;
  }

  /**
   * Set cascade behavior on update.
   */
  onUpdate(behavior: 'cascade' | 'set null' | 'restrict'): this {
    this._onUpdate = behavior;
    return this;
  }

  /**
   * Build the cascade options.
   */
  build(): CascadeOptions {
    return {
      onDelete: this._onDelete,
      onUpdate: this._onUpdate,
    };
  }
}

/**
 * Create a cascade configuration builder.
 */
export function cascade(): CascadeBuilder {
  return new CascadeBuilder();
}

/**
 * Relationship type guards.
 */
export const RelationshipTypeGuards = {
  /**
   * Check if relationship is has-one.
   */
  isHasOne(rel: any): rel is HasOneRelationship {
    return rel.type === 'hasOne';
  },

  /**
   * Check if relationship is has-many.
   */
  isHasMany(rel: any): rel is HasManyRelationship {
    return rel.type === 'hasMany';
  },

  /**
   * Check if relationship is belongs-to.
   */
  isBelongsTo(rel: any): rel is BelongsToRelationship {
    return rel.type === 'belongsTo';
  },

  /**
   * Check if relationship is many-to-many.
   */
  isManyToMany(rel: any): rel is ManyToManyRelationship {
    return rel.type === 'manyToMany';
  },

  /**
   * Check if relationship is polymorphic.
   */
  isPolymorphic(rel: any): rel is PolymorphicRelationship {
    return rel.type === 'polymorphic';
  },
};

/**
 * Get the inverse relationship type.
 *
 * @param relType - Relationship type
 * @returns Inverse relationship type
 *
 * @example
 * ```typescript
 * getInverseRelationType('hasMany') // returns 'belongsTo'
 * getInverseRelationType('belongsTo') // returns 'hasMany'
 * ```
 */
export function getInverseRelationType(
  relType: string
): string | undefined {
  const inverseMap: Record<string, string> = {
    hasOne: 'belongsTo',
    hasMany: 'belongsTo',
    belongsTo: 'hasMany',
    manyToMany: 'manyToMany',
  };

  return inverseMap[relType];
}

/**
 * Validate relationship configuration.
 *
 * @param name - Relationship name
 * @param rel - Relationship definition
 * @returns Validation result
 */
export function validateRelationship(
  name: string,
  rel: any
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!rel.type) {
    errors.push(`Relationship '${name}' is missing 'type' property`);
  }

  if (!rel.target && !rel.targets) {
    errors.push(`Relationship '${name}' is missing 'target' or 'targets' property`);
  }

  switch (rel.type) {
    case 'hasOne':
    case 'hasMany':
    case 'belongsTo':
      if (!rel.foreignKey) {
        errors.push(`Relationship '${name}' is missing 'foreignKey' property`);
      }
      break;

    case 'manyToMany':
      if (!rel.through) {
        errors.push(`Many-to-many relationship '${name}' is missing 'through' property`);
      }
      break;

    case 'polymorphic':
      if (!Array.isArray(rel.targets) || rel.targets.length === 0) {
        errors.push(`Polymorphic relationship '${name}' must have at least one target`);
      }
      if (!rel.foreignKey) {
        errors.push(`Polymorphic relationship '${name}' is missing 'foreignKey' property`);
      }
      if (!rel.typeField) {
        errors.push(`Polymorphic relationship '${name}' is missing 'typeField' property`);
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
