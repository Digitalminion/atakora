/**
 * Authorization middleware for Azure Functions.
 *
 * @remarks
 * Provides declarative authorization rules for function handlers.
 * Supports owner-based, role-based, group-based, and custom authorization.
 *
 * @packageDocumentation
 */

import type { AzureFunctionContext, HttpRequest, HttpResponse, Principal } from '../types';

/**
 * Authorization context passed to authorization rules.
 */
export interface AuthorizationContext {
  /**
   * Authenticated user/principal.
   */
  readonly user?: Principal;

  /**
   * HTTP request.
   */
  readonly request: HttpRequest;

  /**
   * Function context.
   */
  readonly context: AzureFunctionContext;

  /**
   * Tenant ID (from claims).
   */
  readonly tenantId?: string;

  /**
   * Custom context data.
   */
  readonly data?: Record<string, any>;
}

/**
 * Authorization rule result.
 */
export type AuthorizationResult = boolean | Promise<boolean>;

/**
 * Authorization rule function.
 */
export type AuthorizationRule<TRecord = any> = (
  context: AuthorizationContext,
  record?: TRecord
) => AuthorizationResult;

/**
 * Field-level authorization rules.
 */
export type FieldAuthorizationRules<TRecord = any> = {
  [K in keyof TRecord]?: AuthorizationRule<TRecord>;
};

/**
 * Authorization configuration for an operation.
 */
export interface AuthorizationConfig<TRecord = any> {
  /**
   * Operation-level authorization rule.
   */
  readonly rule: AuthorizationRule<TRecord>;

  /**
   * Field-level authorization rules (optional).
   */
  readonly fieldRules?: FieldAuthorizationRules<TRecord>;

  /**
   * Custom error message.
   */
  readonly errorMessage?: string;

  /**
   * Custom error status code.
   */
  readonly errorStatusCode?: number;
}

/**
 * Authorization rules for CRUD operations.
 */
export interface CrudAuthorizationRules<TRecord = any> {
  /**
   * Create operation authorization.
   */
  readonly create?: AuthorizationConfig<TRecord>;

  /**
   * Read operation authorization.
   */
  readonly read?: AuthorizationConfig<TRecord>;

  /**
   * Update operation authorization.
   */
  readonly update?: AuthorizationConfig<TRecord>;

  /**
   * Delete operation authorization.
   */
  readonly delete?: AuthorizationConfig<TRecord>;

  /**
   * List operation authorization.
   */
  readonly list?: AuthorizationConfig<TRecord>;
}

/**
 * Built-in authorization rule builders.
 */
export class Allow {
  /**
   * Allow public access (no authentication required).
   */
  static public<TRecord = any>(): AuthorizationRule<TRecord> {
    return () => true;
  }

  /**
   * Require authentication (any authenticated user).
   */
  static authenticated<TRecord = any>(): AuthorizationRule<TRecord> {
    return (context: AuthorizationContext) => {
      return !!context.user;
    };
  }

  /**
   * Owner-based authorization (user owns the record).
   *
   * @param field - Field name containing the owner ID
   *
   * @example
   * ```typescript
   * Allow.owner('userId')
   * ```
   */
  static owner<TRecord = any>(field: keyof TRecord): AuthorizationRule<TRecord> {
    return (context: AuthorizationContext, record?: TRecord) => {
      if (!context.user || !record) {
        return false;
      }
      return record[field] === context.user.id;
    };
  }

  /**
   * Role-based authorization (user has specific role).
   *
   * @param role - Required role
   *
   * @example
   * ```typescript
   * Allow.role('admin')
   * ```
   */
  static role<TRecord = any>(role: string): AuthorizationRule<TRecord> {
    return (context: AuthorizationContext) => {
      if (!context.user?.roles) {
        return false;
      }
      return context.user.roles.includes(role);
    };
  }

  /**
   * Role-based authorization (user has any of the specified roles).
   *
   * @param roles - Array of acceptable roles
   *
   * @example
   * ```typescript
   * Allow.roles(['admin', 'moderator'])
   * ```
   */
  static roles<TRecord = any>(roles: string[]): AuthorizationRule<TRecord> {
    return (context: AuthorizationContext) => {
      if (!context.user?.roles) {
        return false;
      }
      return roles.some(role => context.user!.roles!.includes(role));
    };
  }

  /**
   * Group-based authorization (user is member of specific group).
   *
   * @param groupId - Azure AD group ID
   *
   * @example
   * ```typescript
   * Allow.group('admin-group-id')
   * ```
   */
  static group<TRecord = any>(groupId: string): AuthorizationRule<TRecord> {
    return (context: AuthorizationContext) => {
      if (!context.user?.claims) {
        return false;
      }
      const groups = context.user.claims['groups'] as string[] | undefined;
      return groups?.includes(groupId) ?? false;
    };
  }

  /**
   * Group-based authorization (user is member of any specified group).
   *
   * @param groupIds - Array of Azure AD group IDs
   *
   * @example
   * ```typescript
   * Allow.groups(['admin-group', 'moderator-group'])
   * ```
   */
  static groups<TRecord = any>(groupIds: string[]): AuthorizationRule<TRecord> {
    return (context: AuthorizationContext) => {
      if (!context.user?.claims) {
        return false;
      }
      const groups = context.user.claims['groups'] as string[] | undefined;
      if (!groups) {
        return false;
      }
      return groupIds.some(groupId => groups.includes(groupId));
    };
  }

  /**
   * Custom authorization logic.
   *
   * @param fn - Custom authorization function
   *
   * @example
   * ```typescript
   * Allow.custom((context, record) => {
   *   return record.status === 'active' && context.user?.roles?.includes('editor');
   * })
   * ```
   */
  static custom<TRecord = any>(
    fn: (context: AuthorizationContext, record?: TRecord) => AuthorizationResult
  ): AuthorizationRule<TRecord> {
    return fn;
  }

  /**
   * Conditional authorization based on a condition.
   *
   * @param fn - Condition function
   *
   * @example
   * ```typescript
   * Allow.if((context, record) => record.isPublic || record.ownerId === context.user?.id)
   * ```
   */
  static if<TRecord = any>(
    fn: (context: AuthorizationContext, record?: TRecord) => AuthorizationResult
  ): AuthorizationRule<TRecord> {
    return fn;
  }
}

/**
 * Combinable authorization rule.
 */
export class AuthRule<TRecord = any> {
  constructor(private readonly rule: AuthorizationRule<TRecord>) {}

  /**
   * Combine with another rule using AND logic.
   *
   * @param other - Other authorization rule
   *
   * @example
   * ```typescript
   * Allow.authenticated().and(Allow.role('admin'))
   * ```
   */
  and(other: AuthorizationRule<TRecord> | AuthRule<TRecord>): AuthRule<TRecord> {
    const otherRule = other instanceof AuthRule ? other.rule : other;
    return new AuthRule<TRecord>(async (context, record) => {
      const result1 = await this.rule(context, record);
      if (!result1) return false;
      return await otherRule(context, record);
    });
  }

  /**
   * Combine with another rule using OR logic.
   *
   * @param other - Other authorization rule
   *
   * @example
   * ```typescript
   * Allow.owner('userId').or(Allow.role('admin'))
   * ```
   */
  or(other: AuthorizationRule<TRecord> | AuthRule<TRecord>): AuthRule<TRecord> {
    const otherRule = other instanceof AuthRule ? other.rule : other;
    return new AuthRule<TRecord>(async (context, record) => {
      const result1 = await this.rule(context, record);
      if (result1) return true;
      return await otherRule(context, record);
    });
  }

  /**
   * Negate the rule.
   *
   * @example
   * ```typescript
   * Allow.role('guest').not()
   * ```
   */
  not(): AuthRule<TRecord> {
    return new AuthRule<TRecord>(async (context, record) => {
      const result = await this.rule(context, record);
      return !result;
    });
  }

  /**
   * Get the underlying authorization rule.
   */
  toRule(): AuthorizationRule<TRecord> {
    return this.rule;
  }
}

// Extend Allow methods to return AuthRule for chaining
const originalAllow = { ...Allow };
Object.keys(originalAllow).forEach(key => {
  const method = (originalAllow as any)[key];
  if (typeof method === 'function') {
    (Allow as any)[key] = (...args: any[]) => {
      const rule = method(...args);
      return new AuthRule(rule);
    };
  }
});

/**
 * Authorization error.
 */
export class AuthorizationError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 403
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Check authorization for an operation.
 *
 * @param config - Authorization configuration
 * @param context - Authorization context
 * @param record - Record being accessed (optional)
 * @throws {AuthorizationError} If authorization fails
 *
 * @example
 * ```typescript
 * await checkAuthorization(
 *   {
 *     rule: Allow.authenticated().and(Allow.owner('userId')),
 *     errorMessage: 'You can only access your own records'
 *   },
 *   context,
 *   record
 * );
 * ```
 */
export async function checkAuthorization<TRecord = any>(
  config: AuthorizationConfig<TRecord>,
  context: AuthorizationContext,
  record?: TRecord
): Promise<void> {
  const rule = config.rule instanceof AuthRule ? config.rule.toRule() : config.rule;
  const authorized = await rule(context, record);

  if (!authorized) {
    throw new AuthorizationError(
      config.errorMessage ?? 'Access denied',
      config.errorStatusCode ?? 403
    );
  }
}

/**
 * Apply field-level authorization to a record.
 *
 * @param record - Record to filter
 * @param fieldRules - Field-level authorization rules
 * @param context - Authorization context
 * @returns Filtered record with unauthorized fields removed
 *
 * @example
 * ```typescript
 * const filtered = await applyFieldAuthorization(
 *   user,
 *   {
 *     email: Allow.owner('id').or(Allow.role('admin')),
 *     ssn: Allow.role('admin')
 *   },
 *   context
 * );
 * ```
 */
export async function applyFieldAuthorization<TRecord = any>(
  record: TRecord,
  fieldRules: FieldAuthorizationRules<TRecord>,
  context: AuthorizationContext
): Promise<Partial<TRecord>> {
  const filtered: any = { ...record };

  for (const [field, rule] of Object.entries(fieldRules)) {
    if (rule) {
      // Type assertion since Object.entries loses the type information
      const typedRule = rule as AuthorizationRule<TRecord> | AuthRule<TRecord>;
      const authRule: AuthorizationRule<TRecord> = typedRule instanceof AuthRule ? typedRule.toRule() : typedRule;
      const authorized = await authRule(context, record);

      if (!authorized) {
        delete filtered[field];
      }
    }
  }

  return filtered;
}

/**
 * Create an authorization context from function context and request.
 *
 * @param fnContext - Azure Function context
 * @param request - HTTP request
 * @param data - Optional custom data
 * @returns Authorization context
 *
 * @example
 * ```typescript
 * const authContext = createAuthorizationContext(context, req, {
 *   tenantId: 'my-tenant-id'
 * });
 * ```
 */
export function createAuthorizationContext(
  fnContext: AzureFunctionContext,
  request: HttpRequest,
  data?: Record<string, any>
): AuthorizationContext {
  return {
    user: request.user,
    request,
    context: fnContext,
    tenantId: request.user?.claims?.['tid'] as string | undefined,
    data,
  };
}

/**
 * Authorization middleware wrapper for HTTP handlers.
 *
 * @param config - Authorization configuration
 * @param handler - HTTP handler function
 * @returns Wrapped handler with authorization
 *
 * @example
 * ```typescript
 * export const handler = withAuthorization(
 *   {
 *     rule: Allow.authenticated(),
 *     errorMessage: 'Authentication required'
 *   },
 *   async (context, req) => {
 *     return {
 *       status: 200,
 *       body: { message: 'Authorized!' }
 *     };
 *   }
 * );
 * ```
 */
export function withAuthorization<TRecord = any>(
  config: AuthorizationConfig<TRecord>,
  handler: (context: AzureFunctionContext, req: HttpRequest) => Promise<HttpResponse> | HttpResponse
): (context: AzureFunctionContext, req: HttpRequest) => Promise<HttpResponse> {
  return async (fnContext: AzureFunctionContext, request: HttpRequest): Promise<HttpResponse> => {
    try {
      const authContext = createAuthorizationContext(fnContext, request);
      await checkAuthorization(config, authContext);
      return await handler(fnContext, request);
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return {
          status: error.statusCode,
          body: {
            error: error.message,
            code: 'AUTHORIZATION_FAILED',
          },
        };
      }
      throw error;
    }
  };
}
