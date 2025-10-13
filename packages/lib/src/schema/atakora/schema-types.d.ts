/**
 * Core types for Atakora data schema DSL.
 *
 * @remarks
 * Type-safe data model definitions using Zod for runtime validation
 * and TypeScript for compile-time type inference.
 *
 * @packageDocumentation
 */
import type { z } from 'zod';
/**
 * Schema definition for a data entity.
 *
 * @typeParam TFields - Zod schema type for fields
 */
export interface SchemaDefinition<TFields extends z.ZodRawShape = z.ZodRawShape> {
    /**
     * Entity name (e.g., 'User', 'Post', 'Comment').
     */
    readonly name: string;
    /**
     * Field definitions using Zod schema.
     */
    readonly fields: z.ZodObject<TFields>;
    /**
     * Authorization rules per operation.
     */
    readonly authorization?: AuthorizationRules;
    /**
     * Database indexes for query optimization.
     */
    readonly indexes?: IndexDefinitions;
    /**
     * Relationships to other entities.
     */
    readonly relationships?: RelationshipDefinitions;
    /**
     * Lifecycle hooks for custom logic.
     */
    readonly hooks?: LifecycleHooks;
    /**
     * Computed fields derived from data.
     */
    readonly computed?: ComputedFields;
    /**
     * Custom validation beyond basic type checking.
     */
    readonly validation?: CustomValidation;
    /**
     * Schema metadata.
     */
    readonly metadata?: SchemaMetadata;
}
/**
 * Schema metadata.
 */
export interface SchemaMetadata {
    /**
     * Schema version for migrations.
     */
    readonly version?: number;
    /**
     * Human-readable description.
     */
    readonly description?: string;
    /**
     * Display name for UI generation.
     */
    readonly displayName?: string;
    /**
     * Plural form of entity name.
     */
    readonly pluralName?: string;
    /**
     * Icon or emoji for UI.
     */
    readonly icon?: string;
    /**
     * Custom tags for categorization.
     */
    readonly tags?: string[];
}
/**
 * Authorization rules for CRUD operations.
 */
export interface AuthorizationRules {
    /**
     * Create operation authorization.
     */
    readonly create?: AuthorizationRule;
    /**
     * Read operation authorization.
     */
    readonly read?: AuthorizationRule;
    /**
     * Update operation authorization.
     */
    readonly update?: AuthorizationRule;
    /**
     * Delete operation authorization.
     */
    readonly delete?: AuthorizationRule;
    /**
     * List/query operation authorization.
     */
    readonly list?: AuthorizationRule;
    /**
     * Field-level authorization rules.
     */
    readonly fields?: Record<string, AuthorizationRule>;
}
/**
 * Authorization rule function or config.
 */
export type AuthorizationRule = AuthorizationRuleFunction | AuthorizationRuleConfig;
/**
 * Authorization rule function.
 */
export type AuthorizationRuleFunction = (context: AuthorizationContext, record?: any) => boolean | Promise<boolean>;
/**
 * Authorization rule configuration.
 */
export interface AuthorizationRuleConfig {
    /**
     * Rule type.
     */
    readonly type: 'public' | 'authenticated' | 'owner' | 'role' | 'group' | 'custom';
    /**
     * Owner field name (for owner-based rules).
     */
    readonly ownerField?: string;
    /**
     * Required role (for role-based rules).
     */
    readonly role?: string;
    /**
     * Required roles (for multi-role rules).
     */
    readonly roles?: string[];
    /**
     * Required group ID (for group-based rules).
     */
    readonly group?: string;
    /**
     * Required group IDs (for multi-group rules).
     */
    readonly groups?: string[];
    /**
     * Custom rule function.
     */
    readonly custom?: AuthorizationRuleFunction;
    /**
     * Combined rules with AND logic.
     */
    readonly and?: AuthorizationRule[];
    /**
     * Combined rules with OR logic.
     */
    readonly or?: AuthorizationRule[];
    /**
     * Negated rule.
     */
    readonly not?: AuthorizationRule;
}
/**
 * Authorization context for rule evaluation.
 */
export interface AuthorizationContext {
    /**
     * Authenticated user information.
     */
    readonly user?: {
        readonly id: string;
        readonly email?: string;
        readonly name?: string;
        readonly roles?: string[];
        readonly groups?: string[];
        readonly claims?: Record<string, any>;
    };
    /**
     * Tenant ID (for multi-tenancy).
     */
    readonly tenantId?: string;
    /**
     * Operation being performed.
     */
    readonly operation: 'create' | 'read' | 'update' | 'delete' | 'list';
    /**
     * Request metadata.
     */
    readonly request?: {
        readonly ip?: string;
        readonly userAgent?: string;
        readonly headers?: Record<string, string>;
    };
    /**
     * Custom context data.
     */
    readonly data?: Record<string, any>;
}
/**
 * Database index definitions.
 */
export type IndexDefinitions = Record<string, IndexDefinition>;
/**
 * Database index definition.
 */
export interface IndexDefinition {
    /**
     * Fields included in the index.
     */
    readonly fields: string[];
    /**
     * Unique constraint.
     */
    readonly unique?: boolean;
    /**
     * Sort order per field.
     */
    readonly order?: Record<string, 'asc' | 'desc'>;
    /**
     * Sparse index (only index documents with the field).
     */
    readonly sparse?: boolean;
    /**
     * Index type (for specialized indexes).
     */
    readonly type?: 'btree' | 'hash' | 'text' | 'geospatial';
}
/**
 * Relationship definitions.
 */
export type RelationshipDefinitions = Record<string, RelationshipDefinition>;
/**
 * Relationship definition.
 */
export type RelationshipDefinition = HasOneRelationship | HasManyRelationship | BelongsToRelationship | ManyToManyRelationship | PolymorphicRelationship;
/**
 * Has-one relationship (1:1).
 */
export interface HasOneRelationship {
    readonly type: 'hasOne';
    readonly target: string;
    readonly foreignKey: string;
    readonly localKey?: string;
    readonly cascade?: CascadeOptions;
}
/**
 * Has-many relationship (1:N).
 */
export interface HasManyRelationship {
    readonly type: 'hasMany';
    readonly target: string;
    readonly foreignKey: string;
    readonly localKey?: string;
    readonly cascade?: CascadeOptions;
}
/**
 * Belongs-to relationship (N:1).
 */
export interface BelongsToRelationship {
    readonly type: 'belongsTo';
    readonly target: string;
    readonly foreignKey: string;
    readonly targetKey?: string;
}
/**
 * Many-to-many relationship (N:M).
 */
export interface ManyToManyRelationship {
    readonly type: 'manyToMany';
    readonly target: string;
    readonly through: string;
    readonly foreignKey?: string;
    readonly targetKey?: string;
    readonly throughFields?: z.ZodRawShape;
}
/**
 * Polymorphic relationship.
 */
export interface PolymorphicRelationship {
    readonly type: 'polymorphic';
    readonly targets: string[];
    readonly foreignKey: string;
    readonly typeField: string;
}
/**
 * Cascade options for relationships.
 */
export interface CascadeOptions {
    /**
     * Cascade on delete.
     */
    readonly onDelete?: 'cascade' | 'set null' | 'restrict';
    /**
     * Cascade on update.
     */
    readonly onUpdate?: 'cascade' | 'set null' | 'restrict';
}
/**
 * Lifecycle hooks for custom logic.
 */
export interface LifecycleHooks {
    /**
     * Before create hook.
     */
    readonly beforeCreate?: LifecycleHook<'create'>;
    /**
     * After create hook.
     */
    readonly afterCreate?: LifecycleHook<'create'>;
    /**
     * Before update hook.
     */
    readonly beforeUpdate?: LifecycleHook<'update'>;
    /**
     * After update hook.
     */
    readonly afterUpdate?: LifecycleHook<'update'>;
    /**
     * Before delete hook.
     */
    readonly beforeDelete?: LifecycleHook<'delete'>;
    /**
     * After delete hook.
     */
    readonly afterDelete?: LifecycleHook<'delete'>;
    /**
     * Before validate hook.
     */
    readonly beforeValidate?: LifecycleHook<'validate'>;
    /**
     * After validate hook.
     */
    readonly afterValidate?: LifecycleHook<'validate'>;
}
/**
 * Lifecycle hook function.
 */
export type LifecycleHook<TOperation extends string> = (data: any, context: LifecycleHookContext<TOperation>) => any | Promise<any>;
/**
 * Lifecycle hook context.
 */
export interface LifecycleHookContext<TOperation extends string> {
    /**
     * Operation being performed.
     */
    readonly operation: TOperation;
    /**
     * Authorization context.
     */
    readonly auth: AuthorizationContext;
    /**
     * Existing record (for update/delete).
     */
    readonly existing?: any;
    /**
     * Custom context data.
     */
    readonly data?: Record<string, any>;
}
/**
 * Computed fields derived from data.
 */
export type ComputedFields = Record<string, ComputedFieldDefinition>;
/**
 * Computed field definition.
 */
export interface ComputedFieldDefinition {
    /**
     * Field type.
     */
    readonly type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
    /**
     * Computation function.
     */
    readonly compute: (record: any, context: ComputedFieldContext) => any | Promise<any>;
    /**
     * Whether to cache the computed value.
     */
    readonly cache?: boolean;
    /**
     * Cache TTL in seconds.
     */
    readonly cacheTtl?: number;
    /**
     * Description for documentation.
     */
    readonly description?: string;
}
/**
 * Computed field context.
 */
export interface ComputedFieldContext {
    /**
     * Related records that have been loaded.
     */
    readonly related?: Record<string, any>;
    /**
     * Custom context data.
     */
    readonly data?: Record<string, any>;
}
/**
 * Custom validation rules.
 */
export type CustomValidation = Record<string, ValidationRule>;
/**
 * Validation rule function.
 */
export type ValidationRule = (value: any, record: any, context: ValidationContext) => ValidationResult | Promise<ValidationResult>;
/**
 * Validation context.
 */
export interface ValidationContext {
    /**
     * Field being validated.
     */
    readonly field: string;
    /**
     * Operation being performed.
     */
    readonly operation: 'create' | 'update';
    /**
     * Existing record (for updates).
     */
    readonly existing?: any;
    /**
     * Custom context data.
     */
    readonly data?: Record<string, any>;
}
/**
 * Validation result.
 */
export interface ValidationResult {
    /**
     * Whether validation passed.
     */
    readonly valid: boolean;
    /**
     * Error message if validation failed.
     */
    readonly message?: string;
    /**
     * Error code for programmatic handling.
     */
    readonly code?: string;
}
/**
 * Infer TypeScript type from schema definition.
 */
export type InferSchemaType<TSchema extends SchemaDefinition<any>> = TSchema extends SchemaDefinition<infer TFields> ? z.infer<z.ZodObject<TFields>> & {
    [K in keyof TSchema['relationships']]?: InferRelationshipType<TSchema['relationships'][K]>;
} & {
    [K in keyof TSchema['computed']]?: InferComputedFieldType<TSchema['computed'][K]>;
} : never;
/**
 * Infer relationship type.
 */
type InferRelationshipType<TRel> = TRel extends HasOneRelationship ? any | undefined : TRel extends HasManyRelationship ? any[] : TRel extends BelongsToRelationship ? any | undefined : TRel extends ManyToManyRelationship ? any[] : TRel extends PolymorphicRelationship ? any | undefined : never;
/**
 * Infer computed field type.
 */
type InferComputedFieldType<TComputed> = TComputed extends ComputedFieldDefinition ? TComputed['type'] extends 'string' ? string : TComputed['type'] extends 'number' ? number : TComputed['type'] extends 'boolean' ? boolean : TComputed['type'] extends 'date' ? Date : TComputed['type'] extends 'array' ? any[] : TComputed['type'] extends 'object' ? Record<string, any> : any : never;
export {};
//# sourceMappingURL=schema-types.d.ts.map