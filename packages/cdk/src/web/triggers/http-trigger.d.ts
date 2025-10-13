/**
 * HTTP trigger builder utilities for Azure Functions.
 *
 * @packageDocumentation
 */
import type { HttpTriggerConfig, HttpMethod, AuthLevel } from '../function-app-types';
/**
 * Builder for creating HTTP trigger configurations.
 *
 * @remarks
 * Provides a fluent API for building HTTP trigger configurations with validation.
 *
 * @example
 * ```typescript
 * const trigger = HttpTrigger.create()
 *   .withRoute('api/users/{userId}')
 *   .withMethods([HttpMethod.GET, HttpMethod.POST])
 *   .withAuthLevel(AuthLevel.FUNCTION)
 *   .build();
 * ```
 */
export declare class HttpTrigger {
    private route?;
    private methods?;
    private authLevel?;
    private webHookType?;
    /**
     * Creates a new HTTP trigger builder.
     *
     * @returns New HttpTrigger builder instance
     */
    static create(): HttpTrigger;
    /**
     * Sets the API route template.
     *
     * @param route - API route template (e.g., 'api/users/{userId}')
     * @returns This builder for chaining
     *
     * @example
     * ```typescript
     * .withRoute('api/users/{userId}')
     * ```
     */
    withRoute(route: string): this;
    /**
     * Sets the allowed HTTP methods.
     *
     * @param methods - Array of allowed HTTP methods
     * @returns This builder for chaining
     *
     * @example
     * ```typescript
     * .withMethods([HttpMethod.GET, HttpMethod.POST])
     * ```
     */
    withMethods(methods: HttpMethod[]): this;
    /**
     * Sets a single HTTP method.
     *
     * @param method - HTTP method
     * @returns This builder for chaining
     *
     * @example
     * ```typescript
     * .withMethod(HttpMethod.GET)
     * ```
     */
    withMethod(method: HttpMethod): this;
    /**
     * Sets the authentication level.
     *
     * @param authLevel - Authentication level
     * @returns This builder for chaining
     *
     * @example
     * ```typescript
     * .withAuthLevel(AuthLevel.FUNCTION)
     * ```
     */
    withAuthLevel(authLevel: AuthLevel): this;
    /**
     * Makes the trigger anonymous (no authentication required).
     *
     * @returns This builder for chaining
     *
     * @example
     * ```typescript
     * .anonymous()
     * ```
     */
    anonymous(): this;
    /**
     * Requires function-level authentication.
     *
     * @returns This builder for chaining
     *
     * @example
     * ```typescript
     * .withFunctionAuth()
     * ```
     */
    withFunctionAuth(): this;
    /**
     * Requires admin-level authentication.
     *
     * @returns This builder for chaining
     *
     * @example
     * ```typescript
     * .withAdminAuth()
     * ```
     */
    withAdminAuth(): this;
    /**
     * Sets the webhook type.
     *
     * @param webHookType - Webhook type
     * @returns This builder for chaining
     *
     * @example
     * ```typescript
     * .withWebHook('github')
     * ```
     */
    withWebHook(webHookType: string): this;
    /**
     * Builds the HTTP trigger configuration.
     *
     * @returns HTTP trigger configuration object
     *
     * @throws {Error} If required properties are missing
     */
    build(): HttpTriggerConfig;
}
/**
 * Helper function to create an HTTP trigger configuration.
 *
 * @param config - Partial HTTP trigger configuration
 * @returns Complete HTTP trigger configuration
 *
 * @example
 * ```typescript
 * const trigger = httpTrigger({
 *   route: 'api/users/{userId}',
 *   methods: [HttpMethod.GET],
 *   authLevel: AuthLevel.FUNCTION
 * });
 * ```
 */
export declare function httpTrigger(config?: Partial<Omit<HttpTriggerConfig, 'type'>>): HttpTriggerConfig;
/**
 * Creates an anonymous HTTP GET trigger.
 *
 * @param route - Optional route template
 * @returns HTTP trigger configuration
 *
 * @example
 * ```typescript
 * const trigger = anonymousGet('api/health');
 * ```
 */
export declare function anonymousGet(route?: string): HttpTriggerConfig;
/**
 * Creates an anonymous HTTP POST trigger.
 *
 * @param route - Optional route template
 * @returns HTTP trigger configuration
 *
 * @example
 * ```typescript
 * const trigger = anonymousPost('api/webhook');
 * ```
 */
export declare function anonymousPost(route?: string): HttpTriggerConfig;
/**
 * Validates an HTTP trigger route template.
 *
 * @param route - Route template to validate
 * @returns True if valid, false otherwise
 *
 * @example
 * ```typescript
 * const valid = validateRoute('api/users/{userId}'); // true
 * const invalid = validateRoute('api//users'); // false
 * ```
 */
export declare function validateRoute(route: string): boolean;
/**
 * Extracts route parameters from a route template.
 *
 * @param route - Route template
 * @returns Array of parameter names
 *
 * @example
 * ```typescript
 * const params = extractRouteParams('api/users/{userId}/posts/{postId}');
 * // Returns: ['userId', 'postId']
 * ```
 */
export declare function extractRouteParams(route: string): string[];
//# sourceMappingURL=http-trigger.d.ts.map