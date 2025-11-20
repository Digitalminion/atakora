/**
 * Authentication Configuration
 *
 * Configures authentication and authorization for the backend.
 */

import { defineAuth, auth } from '@atakora/component/auth';

const isProd = process.env.NODE_ENV === 'production';

export const authentication = defineAuth({
  // Primary authentication via Entra ID
  Primary: auth.entra()
    .tenant(process.env.AZURE_TENANT_ID!)
    .allowTenants(process.env.AZURE_TENANT_ID!)
    .clientId(process.env.AZURE_CLIENT_ID!)
    .validateTokens(token =>
      token
        .audience(process.env.AZURE_CLIENT_ID!)
        .issuer(`https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`)
        .validateLifetime()
        .clockSkew(300) // 5 minutes
    )
    .mapRoles(roles =>
      roles
        .fromClaim('roles')
        .map('Admin', ['admin'])
        .map('Analyst', ['analyst', 'user'])
        .map('User', ['user'])
    )
    .authorization(authz =>
      authz
        .requireByDefault()
        .publicEndpoints(['/api/health', '/api/version'])
        .adminEndpoints(['/api/users', '/api/admin/*'])
    )
    .mfa(mfa =>
      mfa
        .required(isProd)
        .providers(['authenticator', 'sms'])
    )
    .session(session =>
      session
        .duration('8h')
        .sliding(true)
        .renewBefore('30m')
    ),

  // API Keys for service-to-service auth
  ApiKeys: auth.apiKeys()
    .enable()
    .rotateEvery(90) // days
    .requireHttps(),
});
