/**
 * Resolver Synthesizer - Generates GraphQL resolvers from Atakora schemas.
 *
 * @remarks
 * Transforms schema definitions into GraphQL resolver configurations:
 * - CRUD resolvers (get, list, create, update, delete)
 * - Relationship resolvers
 * - Computed field resolvers
 * - Authorization middleware integration
 *
 * @packageDocumentation
 */
import type { SchemaDefinition, AuthorizationRule } from '../../schema/atakora/schema-types';
/**
 * Resolver operation type.
 */
export declare enum ResolverOperation {
    GET = "get",
    LIST = "list",
    CREATE = "create",
    UPDATE = "update",
    DELETE = "delete",
    RELATIONSHIP = "relationship",
    COMPUTED = "computed",
    SUBSCRIPTION = "subscription"
}
/**
 * Resolver configuration.
 */
export interface ResolverConfig {
    /**
     * Resolver name (e.g., 'getUser', 'listPosts', 'User.posts').
     */
    readonly resolverName: string;
    /**
     * Entity name this resolver is for.
     */
    readonly entityName: string;
    /**
     * Operation type.
     */
    readonly operation: ResolverOperation;
    /**
     * GraphQL field path (e.g., 'Query.getUser', 'User.posts').
     */
    readonly fieldPath: string;
    /**
     * Function handler name.
     */
    readonly handlerName: string;
    /**
     * Authorization rule (optional).
     */
    readonly authorization?: AuthorizationRule;
    /**
     * Cosmos DB query configuration (for direct DB access).
     */
    readonly cosmosQuery?: {
        readonly query: string;
        readonly parameters?: Record<string, string>;
    };
    /**
     * Relationship configuration (for relationship resolvers).
     */
    readonly relationship?: {
        readonly type: 'hasOne' | 'hasMany' | 'belongsTo' | 'manyToMany';
        readonly targetEntity: string;
        readonly foreignKey: string;
    };
    /**
     * Computed field configuration.
     */
    readonly computed?: {
        readonly returnType: string;
        readonly dependencies?: string[];
    };
    /**
     * Input type name (for mutations).
     */
    readonly inputType?: string;
    /**
     * Return type name.
     */
    readonly returnType: string;
    /**
     * Whether this resolver requires authentication.
     */
    readonly requiresAuth: boolean;
    /**
     * Middleware to apply.
     */
    readonly middleware?: string[];
}
/**
 * Resolver synthesis result.
 */
export interface ResolverSynthesisResult {
    /**
     * Resolver configurations.
     */
    readonly resolvers: ResolverConfig[];
    /**
     * Input types generated for mutations.
     */
    readonly inputTypes: Map<string, any>;
    /**
     * Resolver count by operation.
     */
    readonly stats: {
        readonly get: number;
        readonly list: number;
        readonly create: number;
        readonly update: number;
        readonly delete: number;
        readonly relationship: number;
        readonly computed: number;
        readonly subscription: number;
    };
}
/**
 * Synthesize GraphQL resolvers from schema.
 *
 * @param schema - Schema definition
 * @returns Resolver synthesis result
 *
 * @example
 * ```typescript
 * const result = synthesizeResolvers(UserSchema);
 * // Returns {
 * //   resolvers: [
 * //     { resolverName: 'getUser', operation: 'get', ... },
 * //     { resolverName: 'listUsers', operation: 'list', ... },
 * //     { resolverName: 'createUser', operation: 'create', ... },
 * //     ...
 * //   ],
 * //   inputTypes: Map { ... },
 * //   stats: { get: 1, list: 1, create: 1, ... }
 * // }
 * ```
 */
export declare function synthesizeResolvers(schema: SchemaDefinition<any>): ResolverSynthesisResult;
/**
 * Validate resolver synthesis result.
 */
export declare function validateResolverSynthesis(result: ResolverSynthesisResult): {
    valid: boolean;
    errors: string[];
};
/**
 * Generate resolver function code.
 *
 * @param config - Resolver configuration
 * @returns Function handler code as string
 */
export declare function generateResolverCode(config: ResolverConfig): string;
//# sourceMappingURL=resolver-synthesizer.d.ts.map