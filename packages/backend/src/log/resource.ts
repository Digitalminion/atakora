/**
 * Logging and Monitoring Configuration
 *
 * Configures Application Insights, Log Analytics, and alerting.
 */

import { defineMonitoring, logs, insights } from '@atakora/component/monitoring';

const isProd = process.env.NODE_ENV === 'production';

export const monitoring = defineMonitoring({
  // Application Insights instance
  AppInsights: insights.instance()
    .enable()
    .sampling(isProd ? 50 : 100)
    .adaptiveSampling(isProd)
    .liveMetrics()
    .trackDependencies()
    .trackPerformance()
    .when(isProd, i =>
      i.dailyQuota(100)
    ),

  // Log Analytics workspace (production only)
  ...isProd && {
    LogAnalytics: logs.workspace()
      .enable()
      .retention(90)
      .sku('PerGB2018')
      .dailyQuota(50)
      .dataSources([
        'Azure Activity',
        'Azure Diagnostics',
        'Custom Logs',
        'Performance Counters',
        'Windows Event Logs',
      ]),
  },

  // Alert configuration
  Alerts: logs.alerts()
    .contacts(contacts =>
      contacts
        .email(process.env.ALERT_EMAIL || 'ops@company.com')
        .when(process.env.ALERT_SMS, c =>
          c.sms(process.env.ALERT_SMS!)
        )
        .when(process.env.ALERT_WEBHOOK, c =>
          c.webhook(process.env.ALERT_WEBHOOK!)
        )
    )
    .actionGroup('critical', group =>
      group
        .email(['oncall@company.com'])
        .when(process.env.ONCALL_SMS, g =>
          g.sms([process.env.ONCALL_SMS!])
        )
        .when(process.env.PAGERDUTY_WEBHOOK, g =>
          g.webhook(process.env.PAGERDUTY_WEBHOOK!)
        )
    )
    .actionGroup('warning', group =>
      group.email(['ops@company.com'])
    )
    .actionGroup('info', group =>
      group.email(['team@company.com'])
    )
    .rule('High Error Rate', rule =>
      rule
        .severity('Critical')
        .frequency('5m')
        .condition('requests/failed > 5%')
        .action('critical')
    )
    .rule('High Response Time', rule =>
      rule
        .severity('Warning')
        .frequency('5m')
        .condition('requests/duration P95 > 2000ms')
        .action('warning')
    )
    .rule('Function Failures', rule =>
      rule
        .severity('Error')
        .frequency('5m')
        .condition('functions/failed > 10')
        .action('critical')
    )
    .rule('Database Throttling', rule =>
      rule
        .severity('Warning')
        .frequency('5m')
        .condition('cosmosdb/throttled > 5')
        .action('warning')
    )
    .rule('Storage Availability', rule =>
      rule
        .severity('Critical')
        .frequency('5m')
        .condition('storage/availability < 99.9%')
        .action('critical')
    ),

  // Diagnostics configuration
  Diagnostics: logs.diagnostics()
    .logs(l =>
      l
        .enable('FunctionAppLogs')
        .enable('HttpLogs')
        .enable('AppServiceConsoleLogs')
        .enable('AppServiceAuditLogs')
        .enable('AppServiceIPSecAuditLogs')
        .enable('AppServicePlatformLogs')
    )
    .metrics(m =>
      m.enableAll()
    )
    .retention(isProd ? 90 : 30),

  // Custom metrics
  CustomMetrics: logs.metrics()
    .counter('business.orders.created')
    .gauge('business.orders.value')
    .histogram('business.processing.duration')
    .gauge('business.queue.depth'),

  // Distributed tracing
  Tracing: logs.tracing()
    .enable()
    .samplingRate(isProd ? 0.1 : 1.0)
    .exporters(['ApplicationInsights', 'Console'])
    .limits(limits =>
      limits
        .maxAttributes(128)
        .maxEvents(128)
        .maxLinks(128)
    ),

  // Query packs
  PerformanceQueries: logs.queryPack()
    .query('Top 10 Slowest Requests')
    .query('Failed Requests by Endpoint')
    .query('Database Query Performance'),

  ErrorQueries: logs.queryPack()
    .query('Recent Exceptions')
    .query('Error Rate by Function')
    .query('Failed Dependencies'),

  UsageQueries: logs.queryPack()
    .query('Requests by User')
    .query('Most Used Endpoints')
    .query('Geographic Distribution'),
});
