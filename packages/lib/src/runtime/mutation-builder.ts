/**
 * Type-safe mutation builder for Atakora schemas.
 *
 * @remarks
 * Provides a fluent API for building mutations (create, update, delete)
 * with Zod validation and authorization checks.
 *
 * @packageDocumentation
 */

import type { z } from 'zod';
import type {
  SchemaDefinition,
  InferSchemaType,
  AuthorizationContext,
  LifecycleHookContext,
} from '../schema/atakora/schema-types';
import { evaluateAuthorizationRule } from '../schema/atakora/authorization';

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
export class MutationBuilder<TSchema extends SchemaDefinition<any>> {
  constructor(
    private schema: TSchema,
    private authContext?: AuthorizationContext
  ) {}

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
  async create(
    data: Partial<InferSchemaType<TSchema>>
  ): Promise<MutationResult<InferSchemaType<TSchema>>> {
    try {
      // Check authorization
      if (this.authContext) {
        const authorized = await this.checkAuthorization('create');
        if (!authorized) {
          return {
            success: false,
            errors: [
              {
                message: 'Unauthorized to create this resource',
                code: 'UNAUTHORIZED',
              },
            ],
          };
        }
      }

      // Run beforeCreate hook
      if (this.schema.hooks?.beforeCreate) {
        const hookContext: LifecycleHookContext<'create'> = {
          operation: 'create',
          auth: this.authContext!,
        };
        data = await this.schema.hooks.beforeCreate(data, hookContext);
      }

      // Validate data
      const validation = await this.validate(data);
      if (!validation.success) {
        return {
          success: false,
          errors: validation.errors,
        };
      }

      // Custom field validation
      if (this.schema.validation) {
        const customValidation = await this.runCustomValidation(data, 'create');
        if (!customValidation.success) {
          return {
            success: false,
            errors: customValidation.errors,
          };
        }
      }

      // Run afterCreate hook
      if (this.schema.hooks?.afterCreate) {
        const hookContext: LifecycleHookContext<'create'> = {
          operation: 'create',
          auth: this.authContext!,
        };
        await this.schema.hooks.afterCreate(data, hookContext);
      }

      // Placeholder for actual creation
      return {
        success: true,
        data: data as InferSchemaType<TSchema>,
      };
    } catch (error) {
      return {
        success: false,
        errors: [
          {
            message: error instanceof Error ? error.message : 'Unknown error',
            code: 'INTERNAL_ERROR',
          },
        ],
      };
    }
  }

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
  async update(
    id: string,
    data: Partial<InferSchemaType<TSchema>>
  ): Promise<MutationResult<InferSchemaType<TSchema>>> {
    try {
      // Check authorization
      if (this.authContext) {
        const authorized = await this.checkAuthorization('update', { id });
        if (!authorized) {
          return {
            success: false,
            errors: [
              {
                message: 'Unauthorized to update this resource',
                code: 'UNAUTHORIZED',
              },
            ],
          };
        }
      }

      // Placeholder: Fetch existing record
      const existing = { id };

      // Run beforeUpdate hook
      if (this.schema.hooks?.beforeUpdate) {
        const hookContext: LifecycleHookContext<'update'> = {
          operation: 'update',
          auth: this.authContext!,
          existing,
        };
        data = await this.schema.hooks.beforeUpdate(data, hookContext);
      }

      // Validate data (partial validation for updates)
      const validation = await this.validate(data, true);
      if (!validation.success) {
        return {
          success: false,
          errors: validation.errors,
        };
      }

      // Custom field validation
      if (this.schema.validation) {
        const customValidation = await this.runCustomValidation(data, 'update', existing);
        if (!customValidation.success) {
          return {
            success: false,
            errors: customValidation.errors,
          };
        }
      }

      // Run afterUpdate hook
      if (this.schema.hooks?.afterUpdate) {
        const hookContext: LifecycleHookContext<'update'> = {
          operation: 'update',
          auth: this.authContext!,
          existing,
        };
        await this.schema.hooks.afterUpdate(data, hookContext);
      }

      // Placeholder for actual update
      return {
        success: true,
        data: { ...existing, ...data } as any as InferSchemaType<TSchema>,
      };
    } catch (error) {
      return {
        success: false,
        errors: [
          {
            message: error instanceof Error ? error.message : 'Unknown error',
            code: 'INTERNAL_ERROR',
          },
        ],
      };
    }
  }

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
  async delete(id: string): Promise<MutationResult<{ id: string }>> {
    try {
      // Check authorization
      if (this.authContext) {
        const authorized = await this.checkAuthorization('delete', { id });
        if (!authorized) {
          return {
            success: false,
            errors: [
              {
                message: 'Unauthorized to delete this resource',
                code: 'UNAUTHORIZED',
              },
            ],
          };
        }
      }

      // Placeholder: Fetch existing record
      const existing = { id };

      // Run beforeDelete hook
      if (this.schema.hooks?.beforeDelete) {
        const hookContext: LifecycleHookContext<'delete'> = {
          operation: 'delete',
          auth: this.authContext!,
          existing,
        };
        await this.schema.hooks.beforeDelete(existing, hookContext);
      }

      // Run afterDelete hook
      if (this.schema.hooks?.afterDelete) {
        const hookContext: LifecycleHookContext<'delete'> = {
          operation: 'delete',
          auth: this.authContext!,
          existing,
        };
        await this.schema.hooks.afterDelete(existing, hookContext);
      }

      // Placeholder for actual deletion
      return {
        success: true,
        data: { id },
      };
    } catch (error) {
      return {
        success: false,
        errors: [
          {
            message: error instanceof Error ? error.message : 'Unknown error',
            code: 'INTERNAL_ERROR',
          },
        ],
      };
    }
  }

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
  toGraphQLCreate(data: Partial<InferSchemaType<TSchema>>): GraphQLMutation {
    const entityName = this.schema.name;
    const operationName = `create${entityName}`;

    const mutation = `
      mutation ${operationName}($input: Create${entityName}Input!) {
        ${operationName.charAt(0).toLowerCase() + operationName.slice(1)}(input: $input) {
          ${this.buildFieldSelection()}
        }
      }
    `.trim();

    return {
      mutation,
      variables: { input: data },
    };
  }

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
  toGraphQLUpdate(id: string, data: Partial<InferSchemaType<TSchema>>): GraphQLMutation {
    const entityName = this.schema.name;
    const operationName = `update${entityName}`;

    const mutation = `
      mutation ${operationName}($id: ID!, $input: Update${entityName}Input!) {
        ${operationName.charAt(0).toLowerCase() + operationName.slice(1)}(id: $id, input: $input) {
          ${this.buildFieldSelection()}
        }
      }
    `.trim();

    return {
      mutation,
      variables: { id, input: data },
    };
  }

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
  toGraphQLDelete(id: string): GraphQLMutation {
    const entityName = this.schema.name;
    const operationName = `delete${entityName}`;

    const mutation = `
      mutation ${operationName}($id: ID!) {
        ${operationName.charAt(0).toLowerCase() + operationName.slice(1)}(id: $id) {
          id
        }
      }
    `.trim();

    return {
      mutation,
      variables: { id },
    };
  }

  /**
   * Set authorization context.
   *
   * @param context - Authorization context
   * @returns Mutation builder for chaining
   */
  withAuth(context: AuthorizationContext): MutationBuilder<TSchema> {
    return new MutationBuilder(this.schema, context);
  }

  /**
   * Validate data against schema.
   */
  private async validate(
    data: Partial<InferSchemaType<TSchema>>,
    partial = false
  ): Promise<{ success: boolean; errors?: MutationError[] }> {
    try {
      const schema = partial ? this.schema.fields.partial() : this.schema.fields;
      await (schema as z.ZodObject<any>).parseAsync(data);
      return { success: true };
    } catch (error) {
      if (error instanceof Error && 'errors' in error) {
        const zodErrors = (error as any).errors as Array<{
          path: (string | number)[];
          message: string;
          code: string;
        }>;
        return {
          success: false,
          errors: zodErrors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
        };
      }
      return {
        success: false,
        errors: [
          {
            message: error instanceof Error ? error.message : 'Validation failed',
            code: 'VALIDATION_ERROR',
          },
        ],
      };
    }
  }

  /**
   * Run custom validation rules.
   */
  private async runCustomValidation(
    data: Partial<InferSchemaType<TSchema>>,
    operation: 'create' | 'update',
    existing?: any
  ): Promise<{ success: boolean; errors?: MutationError[] }> {
    const errors: MutationError[] = [];

    if (!this.schema.validation) {
      return { success: true };
    }

    for (const [field, validator] of Object.entries(this.schema.validation)) {
      if (field in data) {
        const value = (data as any)[field];
        const result = await validator(value, data, {
          field,
          operation,
          existing,
        });

        if (!result.valid) {
          errors.push({
            field,
            message: result.message || 'Validation failed',
            code: result.code || 'CUSTOM_VALIDATION_ERROR',
          });
        }
      }
    }

    return {
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Check authorization for an operation.
   */
  private async checkAuthorization(
    operation: 'create' | 'read' | 'update' | 'delete',
    record?: any
  ): Promise<boolean> {
    if (!this.authContext) {
      return true;
    }

    const rule = this.schema.authorization?.[operation];
    if (!rule) {
      return true; // No rule means allowed
    }

    return evaluateAuthorizationRule(rule, this.authContext, record);
  }

  /**
   * Build field selection for GraphQL response.
   */
  private buildFieldSelection(): string {
    const shape = this.schema.fields.shape;
    const fields = Object.keys(shape);
    return fields.join('\n');
  }
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
export function createMutationBuilder<TSchema extends SchemaDefinition<any>>(
  schema: TSchema,
  authContext?: AuthorizationContext
): MutationBuilder<TSchema> {
  return new MutationBuilder(schema, authContext);
}
