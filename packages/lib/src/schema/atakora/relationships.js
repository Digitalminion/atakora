"use strict";
/**
 * Relationship helper functions for schema definitions.
 *
 * @remarks
 * Provides convenient builder functions for defining relationships
 * between entities in the data schema.
 *
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelationshipTypeGuards = exports.CascadeBuilder = void 0;
exports.hasOne = hasOne;
exports.hasMany = hasMany;
exports.belongsTo = belongsTo;
exports.manyToMany = manyToMany;
exports.polymorphic = polymorphic;
exports.cascade = cascade;
exports.getInverseRelationType = getInverseRelationType;
exports.validateRelationship = validateRelationship;
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
function hasOne(target, foreignKey, options) {
    return {
        type: 'hasOne',
        target: target,
        foreignKey: foreignKey,
        localKey: options === null || options === void 0 ? void 0 : options.localKey,
        cascade: options === null || options === void 0 ? void 0 : options.cascade,
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
function hasMany(target, foreignKey, options) {
    return {
        type: 'hasMany',
        target: target,
        foreignKey: foreignKey,
        localKey: options === null || options === void 0 ? void 0 : options.localKey,
        cascade: options === null || options === void 0 ? void 0 : options.cascade,
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
function belongsTo(target, foreignKey, options) {
    return {
        type: 'belongsTo',
        target: target,
        foreignKey: foreignKey,
        targetKey: options === null || options === void 0 ? void 0 : options.targetKey,
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
function manyToMany(target, through, options) {
    return {
        type: 'manyToMany',
        target: target,
        through: through,
        foreignKey: options === null || options === void 0 ? void 0 : options.foreignKey,
        targetKey: options === null || options === void 0 ? void 0 : options.targetKey,
        throughFields: options === null || options === void 0 ? void 0 : options.throughFields,
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
function polymorphic(targets, options) {
    return {
        type: 'polymorphic',
        targets: targets,
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
var CascadeBuilder = /** @class */ (function () {
    function CascadeBuilder() {
    }
    /**
     * Set cascade behavior on delete.
     */
    CascadeBuilder.prototype.onDelete = function (behavior) {
        this._onDelete = behavior;
        return this;
    };
    /**
     * Set cascade behavior on update.
     */
    CascadeBuilder.prototype.onUpdate = function (behavior) {
        this._onUpdate = behavior;
        return this;
    };
    /**
     * Build the cascade options.
     */
    CascadeBuilder.prototype.build = function () {
        return {
            onDelete: this._onDelete,
            onUpdate: this._onUpdate,
        };
    };
    return CascadeBuilder;
}());
exports.CascadeBuilder = CascadeBuilder;
/**
 * Create a cascade configuration builder.
 */
function cascade() {
    return new CascadeBuilder();
}
/**
 * Relationship type guards.
 */
exports.RelationshipTypeGuards = {
    /**
     * Check if relationship is has-one.
     */
    isHasOne: function (rel) {
        return rel.type === 'hasOne';
    },
    /**
     * Check if relationship is has-many.
     */
    isHasMany: function (rel) {
        return rel.type === 'hasMany';
    },
    /**
     * Check if relationship is belongs-to.
     */
    isBelongsTo: function (rel) {
        return rel.type === 'belongsTo';
    },
    /**
     * Check if relationship is many-to-many.
     */
    isManyToMany: function (rel) {
        return rel.type === 'manyToMany';
    },
    /**
     * Check if relationship is polymorphic.
     */
    isPolymorphic: function (rel) {
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
function getInverseRelationType(relType) {
    var inverseMap = {
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
function validateRelationship(name, rel) {
    var errors = [];
    if (!rel.type) {
        errors.push("Relationship '".concat(name, "' is missing 'type' property"));
    }
    if (!rel.target && !rel.targets) {
        errors.push("Relationship '".concat(name, "' is missing 'target' or 'targets' property"));
    }
    switch (rel.type) {
        case 'hasOne':
        case 'hasMany':
        case 'belongsTo':
            if (!rel.foreignKey) {
                errors.push("Relationship '".concat(name, "' is missing 'foreignKey' property"));
            }
            break;
        case 'manyToMany':
            if (!rel.through) {
                errors.push("Many-to-many relationship '".concat(name, "' is missing 'through' property"));
            }
            break;
        case 'polymorphic':
            if (!Array.isArray(rel.targets) || rel.targets.length === 0) {
                errors.push("Polymorphic relationship '".concat(name, "' must have at least one target"));
            }
            if (!rel.foreignKey) {
                errors.push("Polymorphic relationship '".concat(name, "' is missing 'foreignKey' property"));
            }
            if (!rel.typeField) {
                errors.push("Polymorphic relationship '".concat(name, "' is missing 'typeField' property"));
            }
            break;
    }
    return {
        valid: errors.length === 0,
        errors: errors,
    };
}
