/**
 * Type-safe mutation builder for Atakora schemas.
 *
 * @remarks
 * Provides a fluent API for building mutations (create, update, delete)
 * with Zod validation and authorization checks.
 *
 * @packageDocumentation
 */
import type { SchemaDefinition, InferSchemaType, AuthorizationContext } from '../schema/atakora/schema-types';
/**
 * Mutation type.
 */
export type MutationType = 'create' | 'update' | 'delete';
/**
 * Mutation result.
 */
export interface MutationResult<T> {
    success: boolean;
    data?: T;
    errors?: MutationError[];
}
/**
 * Mutation error.
 */
export interface MutationError {
    field?: string;
    message: string;
    code: string;
}
/**
 * GraphQL mutation result.
 */
export interface GraphQLMutation {
    mutation: string;
    variables: Record<string, any>;
}
/**
 * Validation error.
 */
export interface ValidationError {
    path: string[];
    message: string;
    code: string;
}
/**
 * Type-safe mutation builder for a schema.
 */
export declare class MutationBuilder<TSchema extends SchemaDefinition<any>> {
    private schema;
    private authContext?;
    constructor(schema: TSchema, authContext?: AuthorizationContext);
    /**
     * Create a new record.
     *
     * @param data - Record data
     * @returns Mutation result
     *
     * @example
     * ```typescript
     * const result = await userMutation.create({
     *   email: 'user@example.com',
     *   name: 'John Doe',
     *   role: 'user'
     * });
     * ```
     */
    create(data: Partial<InferSchemaType<TSchema>>): Promise<MutationResult<InferSchemaType<TSchema>>>;
    /**
     * Update an existing record.
     *
     * @param id - Record ID
     * @param data - Updated data
     * @returns Mutation result
     *
     * @example
     * ```typescript
     * const result = await userMutation.update('user-123', {
     *   name: 'Jane Doe',
     *   bio: 'Updated bio'
     * });
     * ```
     */
    update(id: string, data: Partial<InferSchemaType<TSchema>>): Promise<MutationResult<InferSchemaType<TSchema>>>;
    /**
     * Delete a record.
     *
     * @param id - Record ID
     * @returns Mutation result
     *
     * @example
     * ```typescript
     * const result = await userMutation.delete('user-123');
     * ```
     */
    delete(id: string): Promise<MutationResult<{
        id: string;
    }>>;
    /**
     * Generate GraphQL mutation for create.
     *
     * @param data - Record data
     * @returns GraphQL mutation
     *
     * @example
     * ```typescript
     * const { mutation, variables } = userMutation.toGraphQLCreate({
     *   email: 'user@example.com',
     *   name: 'John Doe'
     * });
     * ```
     */
    toGraphQLCreate(data: Partial<InferSchemaType<TSchema>>): GraphQLMutation;
    /**
     * Generate GraphQL mutation for update.
     *
     * @param id - Record ID
     * @param data - Updated data
     * @returns GraphQL mutation
     *
     * @example
     * ```typescript
     * const { mutation, variables } = userMutation.toGraphQLUpdate('user-123', {
     *   name: 'Jane Doe'
     * });
     * ```
     */
    toGraphQLUpdate(id: string, data: Partial<InferSchemaType<TSchema>>): GraphQLMutation;
    /**
     * Generate GraphQL mutation for delete.
     *
     * @param id - Record ID
     * @returns GraphQL mutation
     *
     * @example
     * ```typescript
     * const { mutation, variables } = userMutation.toGraphQLDelete('user-123');
     * ```
     */
    toGraphQLDelete(id: string): GraphQLMutation;
    /**
     * Set authorization context.
     *
     * @param context - Authorization context
     * @returns Mutation builder for chaining
     */
    withAuth(context: AuthorizationContext): MutationBuilder<TSchema>;
    /**
     * Validate data against schema.
     */
    private validate;
    /**
     * Run custom validation rules.
     */
    private runCustomValidation;
    /**
     * Check authorization for an operation.
     */
    private checkAuthorization;
    /**
     * Build field selection for GraphQL response.
     */
    private buildFieldSelection;
}
/**
 * Create a mutation builder for a schema.
 *
 * @param schema - Schema definition
 * @param authContext - Optional authorization context
 * @returns Mutation builder instance
 *
 * @example
 * ```typescript
 * const userMutation = createMutationBuilder(UserSchema, authContext);
 *
 * // Create
 * const createResult = await userMutation.create({
 *   email: 'user@example.com',
 *   name: 'John Doe'
 * });
 *
 * // Update
 * const updateResult = await userMutation.update('user-123', {
 *   name: 'Jane Doe'
 * });
 *
 * // Delete
 * const deleteResult = await userMutation.delete('user-123');
 * ```
 */
export declare function createMutationBuilder<TSchema extends SchemaDefinition<any>>(schema: TSchema, authContext?: AuthorizationContext): MutationBuilder<TSchema>;
//# sourceMappingURL=mutation-builder.d.ts.map