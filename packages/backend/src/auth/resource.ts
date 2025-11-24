/**
 * Authentication Configuration
 *
 * Configures authentication and authorization for the backend.
 */

import { defineAuth, auth } from '@atakora/component/auth';
import { days, hours, minutes } from '@atakora/component/common';

const isProd = process.env.NODE_ENV === 'production';

export const authentication = defineAuth({
  // Primary authentication via Entra ID
  Primary: auth
    .entra()
    .tenant(process.env.AZURE_TENANT_ID!)
    .clientId(process.env.AZURE_CLIENT_ID!)
    .audience(process.env.AZURE_CLIENT_ID!)
    .issuer(`https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`)
    .validateTokens(async (token, context) => {
      // Custom token validation logic
      // TODO: Implement token validation
      return {
        valid: true,
        userId: 'user-id',
        email: 'user@example.com',
        claims: {},
      };
    })
    .mapRoles((claims) => {
      // Map Entra ID roles/groups to application roles
      const roles = claims.roles || [];
      const appRoles: string[] = [];

      if (roles.includes('Admin')) appRoles.push('admin');
      if (roles.includes('Analyst')) appRoles.push('analyst', 'user');
      if (roles.includes('User')) appRoles.push('user');

      return appRoles;
    })
    // MFA temporarily disabled for synthesis testing
    // .mfa((mfa) =>
    //   mfa
    //     .require(isProd ? ['admin'] : ['admin'])  // Always require admin in dev too
    //     .challenge('totp')
    //     .gracePeriod(hours(1))
    // )
    .session((session) => session.duration(hours(8)).sliding(true)),

  // API Keys for service-to-service auth
  ApiKeys: auth
    .apiKeys()
    .enable()
    .rotateEvery(days(90))
    .keys([
      {
        id: 'service-account-1',
        secret: process.env.API_KEY_SERVICE_1 || 'dev-key-change-in-production',
        roles: ['service', 'readonly'],
      },
    ]),
});
