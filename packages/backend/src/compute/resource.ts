/**
 * Compute Configuration
 *
 * Configures Azure Function App and compute resources.
 */

import { defineCompute, compute } from '@atakora/component/compute';

const isProd = process.env.NODE_ENV === 'production';

export const functions = defineCompute({
  // Primary Function App
  FunctionApp: compute.functionApp()
    .plan(isProd ? 'Premium' : 'Consumption')
    .when(isProd, a => a.sku('EP1'))
    .runtime('node', '20')
    .alwaysOn(isProd)
    .scale(scale =>
      scale
        .max(isProd ? 20 : 10)
        .when(isProd, s =>
          s
            .min(2)
            .rule('cpu-scale', rule =>
              rule
                .metric('CpuPercentage')
                .threshold(70)
                .scaleBy(2)
            )
            .rule('memory-scale', rule =>
              rule
                .metric('MemoryPercentage')
                .threshold(80)
                .scaleBy(2)
            )
            .rule('http-queue-scale', rule =>
              rule
                .metric('HttpQueueLength')
                .threshold(100)
                .scaleBy(1)
            )
        )
    )
    .performance(perf =>
      perf
        .http2(isProd)
        .timeout(isProd ? 600 : 230)
        .maxConcurrentRequests(isProd ? 100 : 10)
        .httpLogging(!isProd)
        .detailedErrors(!isProd)
    )
    .when(isProd, a =>
      a.healthCheck(health =>
        health
          .path('/api/health')
          .interval(30)
      )
    )
    .deployment(deploy =>
      deploy
        .runFromPackage()
        .when(isProd, d =>
          d
            .slot('staging')
            .stickySettings(['ENVIRONMENT', 'NODE_ENV'])
        )
    )
    .when(isProd, a =>
      a.vnet(vnet =>
        vnet
          .enable()
          .subnet(process.env.FUNCTION_SUBNET_ID!)
          .routeAll()
      )
    ),
});
