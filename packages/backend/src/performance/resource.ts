/**
 * Performance Configuration
 *
 * Configures caching, CDN, and rate limiting.
 */

import { definePerformance, perf } from '@atakora/component/performance';

const isProd = process.env.NODE_ENV === 'production';

export const performance = definePerformance({
  // CDN for static assets
  CDN: perf.cdn()
    .enable(isProd)
    .provider('Azure')
    .cacheControl('public, max-age=31536000')
    .origin('function-app', origin =>
      origin
        .host(process.env.FUNCTION_APP_HOSTNAME!)
        .http(80)
        .https(443)
    )
    .rule('static-assets', rule =>
      rule
        .order(1)
        .match(match =>
          match
            .path()
            .beginsWith(['/assets/', '/static/'])
        )
        .cacheExpiration('1.00:00:00') // 1 day
    )
    .rule('api-no-cache', rule =>
      rule
        .order(2)
        .match(match =>
          match
            .path()
            .beginsWith(['/api/'])
        )
        .bypass()
    )
    .compression(comp =>
      comp
        .enable()
        .mimeTypes([
          'text/html',
          'text/css',
          'application/javascript',
          'application/json',
          'text/plain',
        ])
    ),

  // Redis cache
  Cache: perf.redis()
    .enable(true)
    .when(isProd, cache =>
      cache
        .sku('Standard', 1) // C1
        .disablePublicAccess()
        .subnet(process.env.REDIS_SUBNET_ID!)
        .backup(backup =>
          backup
            .rdb()
            .frequency(60)
            .maxSnapshots(1)
        )
        .patching(patch =>
          patch
            .dayOfWeek('Sunday')
            .startHour(2)
            .window(5)
        )
    )
    .when(!isProd, cache =>
      cache.provider('memory')
    )
    .policy(policy =>
      policy
        .defaultTtl(300) // 5 minutes
        .ttlFor('users', 600) // 10 minutes
        .ttlFor('projects', 300) // 5 minutes
        .ttlFor('datasets', 180) // 3 minutes
        .ttlFor('reports', 3600) // 1 hour
        .invalidateOnWrite()
        .invalidatePattern('user:*', ['POST /api/users', 'PUT /api/users/:id', 'DELETE /api/users/:id'])
        .invalidatePattern('project:*', ['POST /api/projects', 'PUT /api/projects/:id'])
    ),

  // Rate limiting
  RateLimit: perf.rateLimiter()
    .enable()
    .global(limit =>
      limit
        .requests(1000)
        .window('1m')
        .burst(1500)
    )
    .perUser(limit =>
      limit
        .requests(100)
        .window('1m')
        .burst(150)
    )
    .perIp(limit =>
      limit
        .requests(200)
        .window('1m')
        .burst(250)
    )
    .endpoint('POST /api/functions/generate-report', limit =>
      limit
        .requests(5)
        .window('1m')
        .burst(10)
    )
    .endpoint('POST /api/functions/transform-data', limit =>
      limit
        .requests(10)
        .window('1m')
        .burst(15)
    )
    .endpoint('POST /api/events/*', limit =>
      limit
        .requests(50)
        .window('1m')
        .burst(75)
    )
    .endpoint('POST /api/*', limit =>
      limit
        .requests(50)
        .window('1m')
        .burst(75)
    )
    .endpoint('PUT /api/*', limit =>
      limit
        .requests(50)
        .window('1m')
        .burst(75)
    )
    .endpoint('DELETE /api/*', limit =>
      limit
        .requests(30)
        .window('1m')
        .burst(45)
    )
    .headers(headers =>
      headers
        .include()
        .limit('X-RateLimit-Limit')
        .remaining('X-RateLimit-Remaining')
        .reset('X-RateLimit-Reset')
    )
    .onExceeded(exceeded =>
      exceeded
        .statusCode(429)
        .message('Rate limit exceeded. Please retry after {reset} seconds.')
        .retryAfterHeader()
    ),

  // Response compression
  Compression: perf.compression()
    .enable()
    .level(isProd ? 6 : 1)
    .threshold(1024) // bytes
    .connectionPool(pool =>
      pool
        .maxConnections(isProd ? 100 : 10)
        .maxIdleTime(30000)
        .keepAlive()
        .keepAliveDelay(10000)
    ),
});
