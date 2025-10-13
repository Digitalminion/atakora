/**
 * Relationship helper functions for schema definitions.
 *
 * @remarks
 * Provides convenient builder functions for defining relationships
 * between entities in the data schema.
 *
 * @packageDocumentation
 */
import type { HasOneRelationship, HasManyRelationship, BelongsToRelationship, ManyToManyRelationship, PolymorphicRelationship, CascadeOptions } from './schema-types';
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
export declare function hasOne(target: string, foreignKey: string, options?: {
    localKey?: string;
    cascade?: CascadeOptions;
}): HasOneRelationship;
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
export declare function hasMany(target: string, foreignKey: string, options?: {
    localKey?: string;
    cascade?: CascadeOptions;
}): HasManyRelationship;
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
export declare function belongsTo(target: string, foreignKey: string, options?: {
    targetKey?: string;
}): BelongsToRelationship;
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
export declare function manyToMany(target: string, through: string, options?: {
    foreignKey?: string;
    targetKey?: string;
    throughFields?: z.ZodRawShape;
}): ManyToManyRelationship;
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
export declare function polymorphic(targets: string[], options: {
    foreignKey: string;
    typeField: string;
}): PolymorphicRelationship;
/**
 * Cascade configuration builder.
 *
 * @example
 * ```typescript
 * const cascadeDelete = cascade().onDelete('cascade').build();
 * const cascadeAll = cascade().onDelete('cascade').onUpdate('cascade').build();
 * ```
 */
export declare class CascadeBuilder {
    private _onDelete?;
    private _onUpdate?;
    /**
     * Set cascade behavior on delete.
     */
    onDelete(behavior: 'cascade' | 'set null' | 'restrict'): this;
    /**
     * Set cascade behavior on update.
     */
    onUpdate(behavior: 'cascade' | 'set null' | 'restrict'): this;
    /**
     * Build the cascade options.
     */
    build(): CascadeOptions;
}
/**
 * Create a cascade configuration builder.
 */
export declare function cascade(): CascadeBuilder;
/**
 * Relationship type guards.
 */
export declare const RelationshipTypeGuards: {
    /**
     * Check if relationship is has-one.
     */
    isHasOne(rel: any): rel is HasOneRelationship;
    /**
     * Check if relationship is has-many.
     */
    isHasMany(rel: any): rel is HasManyRelationship;
    /**
     * Check if relationship is belongs-to.
     */
    isBelongsTo(rel: any): rel is BelongsToRelationship;
    /**
     * Check if relationship is many-to-many.
     */
    isManyToMany(rel: any): rel is ManyToManyRelationship;
    /**
     * Check if relationship is polymorphic.
     */
    isPolymorphic(rel: any): rel is PolymorphicRelationship;
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
export declare function getInverseRelationType(relType: string): string | undefined;
/**
 * Validate relationship configuration.
 *
 * @param name - Relationship name
 * @param rel - Relationship definition
 * @returns Validation result
 */
export declare function validateRelationship(name: string, rel: any): {
    valid: boolean;
    errors: string[];
};
//# sourceMappingURL=relationships.d.ts.map