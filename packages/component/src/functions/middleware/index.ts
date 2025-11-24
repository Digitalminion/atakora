/**
 * Function Middleware Module
 *
 * Exports middleware for Azure Function handlers including:
 * - Authentication middleware
 * - Authorization middleware
 * - Token extraction utilities
 *
 * @packageDocumentation
 */

export {
  // Middleware creation
  createAuthMiddleware,
  requireAuthentication,
  requireRoles,
  optionalAuthentication,

  // Token extraction
  extractToken,

  // Types
  type TokenExtractionConfig,
  type AuthorizationConfig,
  type AuthMiddlewareConfig,
  type AuthenticatedContext,
  type AuthenticatedHandler,
  type AuthErrorResponse,

  // Errors
  AuthenticationError,
  AuthorizationError,
} from './auth-middleware';
