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
export class HttpTrigger {
  private route?: string;
  private methods?: HttpMethod[];
  private authLevel?: AuthLevel;
  private webHookType?: string;

  /**
   * Creates a new HTTP trigger builder.
   *
   * @returns New HttpTrigger builder instance
   */
  public static create(): HttpTrigger {
    return new HttpTrigger();
  }

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
  public withRoute(route: string): this {
    this.route = route;
    return this;
  }

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
  public withMethods(methods: HttpMethod[]): this {
    if (methods.length === 0) {
      throw new Error('At least one HTTP method must be specified');
    }
    this.methods = methods;
    return this;
  }

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
  public withMethod(method: HttpMethod): this {
    this.methods = [method];
    return this;
  }

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
  public withAuthLevel(authLevel: AuthLevel): this {
    this.authLevel = authLevel;
    return this;
  }

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
  public anonymous(): this {
    // Import at runtime to avoid circular dependency
    const { AuthLevel } = require('../function-app-types');
    this.authLevel = AuthLevel.ANONYMOUS;
    return this;
  }

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
  public withFunctionAuth(): this {
    // Import at runtime to avoid circular dependency
    const { AuthLevel } = require('../function-app-types');
    this.authLevel = AuthLevel.FUNCTION;
    return this;
  }

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
  public withAdminAuth(): this {
    // Import at runtime to avoid circular dependency
    const { AuthLevel } = require('../function-app-types');
    this.authLevel = AuthLevel.ADMIN;
    return this;
  }

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
  public withWebHook(webHookType: string): this {
    this.webHookType = webHookType;
    return this;
  }

  /**
   * Builds the HTTP trigger configuration.
   *
   * @returns HTTP trigger configuration object
   *
   * @throws {Error} If required properties are missing
   */
  public build(): HttpTriggerConfig {
    return {
      type: 'http',
      route: this.route,
      methods: this.methods,
      authLevel: this.authLevel,
      webHookType: this.webHookType,
    };
  }
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
export function httpTrigger(config: Partial<Omit<HttpTriggerConfig, 'type'>> = {}): HttpTriggerConfig {
  return {
    type: 'http',
    ...config,
  };
}

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
export function anonymousGet(route?: string): HttpTriggerConfig {
  // Import at runtime to avoid circular dependency
  const { AuthLevel, HttpMethod } = require('../function-app-types');
  return {
    type: 'http',
    route,
    methods: [HttpMethod.GET],
    authLevel: AuthLevel.ANONYMOUS,
  };
}

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
export function anonymousPost(route?: string): HttpTriggerConfig {
  // Import at runtime to avoid circular dependency
  const { AuthLevel, HttpMethod } = require('../function-app-types');
  return {
    type: 'http',
    route,
    methods: [HttpMethod.POST],
    authLevel: AuthLevel.ANONYMOUS,
  };
}

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
export function validateRoute(route: string): boolean {
  if (!route || route.trim() === '') {
    return false;
  }

  // Check for invalid patterns
  const invalidPatterns = [
    /\/\//,           // Double slashes
    /^\//,            // Leading slash
    /\/$/,            // Trailing slash
    /[^\w\-\/{}]/,    // Invalid characters (only alphanumeric, hyphens, slashes, braces)
  ];

  return !invalidPatterns.some((pattern) => pattern.test(route));
}

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
export function extractRouteParams(route: string): string[] {
  const paramPattern = /{([^}]+)}/g;
  const params: string[] = [];
  let match;

  while ((match = paramPattern.exec(route)) !== null) {
    params.push(match[1]);
  }

  return params;
}
