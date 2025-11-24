/**
 * Authentication Configuration
 *
 * This file defines authentication for your backend.
 * Uses Entra ID (Azure AD) for user authentication.
 *
 * MINIMAL SETUP: Just tenant and client ID required.
 * Everything else uses sensible defaults.
 */

import { defineAuth, auth } from '@atakora/component/auth';

export const authentication = defineAuth({
  /**
   * Primary authentication method: Entra ID (Azure AD)
   *
   * Requires:
   * - AZURE_TENANT_ID: Your Azure AD tenant ID
   * - AZURE_CLIENT_ID: Your app registration client ID
   *
   * Automatically provides:
   * - Token validation
   * - User context in all handlers
   * - Role-based authorization
   * - Session management
   */
  Primary: auth.entra().tenant(process.env.AZURE_TENANT_ID!).clientId(process.env.AZURE_CLIENT_ID!),

  /**
   * Optional: API Keys for service-to-service auth
   *
   * Uncomment to enable:
   *
   * ApiKeys: auth.apiKeys()
   *   .enable()
   *   .rotateEvery(90)  // Rotate every 90 days
   *   .requireHttps(),
   */
});

/**
 * CUSTOMIZATION OPTIONS (if defaults don't fit):
 *
 * Role Mapping:
 * .mapRoles(roles => {
 *   const groups = roles.groups || [];
 *   return {
 *     isAdmin: groups.includes('Admin'),
 *     isAnalyst: groups.includes('Analyst'),
 *   };
 * })
 *
 * Multi-Factor Authentication:
 * .authorization(authz =>
 *   authz.requireMfa(process.env.NODE_ENV === 'production')
 * )
 *
 * Session Management:
 * .session(session =>
 *   session
 *     .duration('8h')
 *     .sliding(true)
 *     .renewBefore('30m')
 * )
 *
 * See docs/reference/backend/authentication.md for all options.
 */
