/**
 * Network Configuration
 *
 * Configures networking, security, and access control.
 */

import { defineNetwork, network } from '@atakora/component/network';

const isProd = process.env.NODE_ENV === 'production';

export const networking = defineNetwork({
  // Primary VNet configuration
  Primary: network
    .vnet()
    .access((access) =>
      access
        .forcePrivate(isProd)
        .allowIPs(
          isProd
            ? ['10.0.0.0/8', '203.0.113.0/24'] // Corporate VPN, Office
            : ['*']
        )
        .serviceEndpoints(['Microsoft.Storage', 'Microsoft.Sql', 'Microsoft.KeyVault'])
    )
    .cors((cors) =>
      cors
        .enable()
        .allowOrigins([
          process.env.FRONTEND_URL!,
          'https://app.company.com',
          ...(isProd ? [] : ['http://localhost:3000', 'http://localhost:5173']),
        ])
        .allowMethods(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
        .allowHeaders(['Content-Type', 'Authorization', 'X-Request-ID'])
        .allowCredentials()
        .maxAge(3600)
    )
    .tls(
      (tls) => tls.minVersion('1.2').cipherSuites('modern').requireHttps().hsts(31536000) // 1 year
    )
    .when(isProd, (net) =>
      net.privateLink((link) =>
        link.enable().services(['functionApp', 'storage', 'cosmosdb', 'keyVault'])
      )
    )
    .dns((dns) =>
      dns.when(isProd, (d) => d.customDomains(['api.company.com', 'data.company.com'])).dnsSec(true)
    ),

  // Web Application Firewall
  Firewall: network
    .waf()
    .enable(isProd)
    .mode('Prevention')
    .ruleSet('OWASP_3.2')
    .customRule((rule) =>
      rule.name('RateLimitAPI').priority(100).rateLimit('1m', 100).action('Block')
    )
    .customRule((rule) =>
      rule
        .name('BlockMaliciousUserAgents')
        .priority(200)
        .match((match) =>
          match
            .variable('RequestHeaders')
            .selector('User-Agent')
            .operator('Contains')
            .values(['bot', 'crawler', 'spider'])
        )
        .action('Block')
    ),

  // DDoS Protection
  DDoS: network.ddos().enable(isProd).mode('VirtualNetworkInherited'),
});
