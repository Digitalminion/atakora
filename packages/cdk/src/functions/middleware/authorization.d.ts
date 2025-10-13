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
export type AuthorizationRule<TRecord = any> = (context: AuthorizationContext, record?: TRecord) => AuthorizationResult;
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
export declare class Allow {
    /**
     * Allow public access (no authentication required).
     */
    static public<TRecord = any>(): AuthorizationRule<TRecord>;
    /**
     * Require authentication (any authenticated user).
     */
    static authenticated<TRecord = any>(): AuthorizationRule<TRecord>;
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
    static owner<TRecord = any>(field: keyof TRecord): AuthorizationRule<TRecord>;
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
    static role<TRecord = any>(role: string): AuthorizationRule<TRecord>;
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
    static roles<TRecord = any>(roles: string[]): AuthorizationRule<TRecord>;
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
    static group<TRecord = any>(groupId: string): AuthorizationRule<TRecord>;
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
    static groups<TRecord = any>(groupIds: string[]): AuthorizationRule<TRecord>;
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
    static custom<TRecord = any>(fn: (context: AuthorizationContext, record?: TRecord) => AuthorizationResult): AuthorizationRule<TRecord>;
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
    static if<TRecord = any>(fn: (context: AuthorizationContext, record?: TRecord) => AuthorizationResult): AuthorizationRule<TRecord>;
}
/**
 * Combinable authorization rule.
 */
export declare class AuthRule<TRecord = any> {
    private readonly rule;
    constructor(rule: AuthorizationRule<TRecord>);
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
    and(other: AuthorizationRule<TRecord> | AuthRule<TRecord>): AuthRule<TRecord>;
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
    or(other: AuthorizationRule<TRecord> | AuthRule<TRecord>): AuthRule<TRecord>;
    /**
     * Negate the rule.
     *
     * @example
     * ```typescript
     * Allow.role('guest').not()
     * ```
     */
    not(): AuthRule<TRecord>;
    /**
     * Get the underlying authorization rule.
     */
    toRule(): AuthorizationRule<TRecord>;
}
/**
 * Authorization error.
 */
export declare class AuthorizationError extends Error {
    readonly statusCode: number;
    constructor(message: string, statusCode?: number);
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
export declare function checkAuthorization<TRecord = any>(config: AuthorizationConfig<TRecord>, context: AuthorizationContext, record?: TRecord): Promise<void>;
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
export declare function applyFieldAuthorization<TRecord = any>(record: TRecord, fieldRules: FieldAuthorizationRules<TRecord>, context: AuthorizationContext): Promise<Partial<TRecord>>;
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
export declare function createAuthorizationContext(fnContext: AzureFunctionContext, request: HttpRequest, data?: Record<string, any>): AuthorizationContext;
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
export declare function withAuthorization<TRecord = any>(config: AuthorizationConfig<TRecord>, handler: (context: AzureFunctionContext, req: HttpRequest) => Promise<HttpResponse> | HttpResponse): (context: AzureFunctionContext, req: HttpRequest) => Promise<HttpResponse>;
//# sourceMappingURL=authorization.d.ts.map