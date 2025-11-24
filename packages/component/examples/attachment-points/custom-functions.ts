/**
 * Example: Custom Function App Configuration
 *
 * Demonstrates customizing Azure Function App infrastructure
 * for different performance and scaling requirements.
 */

import { defineBackend, defineSchema, defineAuth } from '@atakora/component';
import { compute } from '@atakora/component/builders';
import { a, c, f, auth } from '@atakora/component';

const schema = defineSchema({
  schema: a.schema({
    User: c.model({
      id: a.id(),
      email: a.string().email()
    }),
    GenerateReport: f.model({
      input: a.object({
        userId: a.string(),
        reportType: a.enum(['pdf', 'excel'])
      }),
      output: a.object({
        reportUrl: a.string().url(),
        generatedAt: a.datetime()
      })
    })
  })
});

const authentication = defineAuth({
  Primary: auth.jwt().issuer('https://auth.example.com')
});

const backend = defineBackend({
  schema,
  authentication,
  settings: { name: 'report-platform' }
});

// Development: Consumption plan (pay-per-execution)
if (backend.environment === 'development') {
  backend.compute.functionApp.attach(
    compute.functionApp()
      .name('report-platform-dev')
      .plan('Consumption')
      .runtime('node', '20')
      .appSettings({
        NODE_ENV: 'development',
        LOG_LEVEL: 'debug'
      })
  );
}

// Production: Premium plan with pre-warmed instances
if (backend.environment === 'production') {
  backend.compute.functionApp.attach(
    compute.functionApp()
      .name('report-platform-prod')
      .plan('Premium')
      .sku('EP2')  // Medium tier
      .runtime('node', '20')
      .alwaysOn(true)
      .preWarmedInstances(5)
      .maxInstances(20)
      .appSettings({
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
        ENABLE_ORYX_BUILD: 'true',
        WEBSITE_NODE_DEFAULT_VERSION: '~20'
      })
  );
}

// Model-specific function customization
backend.schema.GenerateReport.function.attach(
  compute.function()
    .name('generate-report')
    .timeout(600)  // 10 minutes for report generation
    .memory(4096)  // 4GB for PDF/Excel generation
    .bindings([
      {
        type: 'blobInput',
        name: 'template',
        path: 'templates/{reportType}.xlsx',
        connection: 'StorageConnection'
      },
      {
        type: 'blobOutput',
        name: 'report',
        path: 'reports/{userId}/{timestamp}.pdf',
        connection: 'StorageConnection'
      }
    ])
);

export { backend };
