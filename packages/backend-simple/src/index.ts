/**
 * Backend Assembly
 *
 * This is the main entry point for your Atakora backend.
 *
 * MINIMAL SETUP: Just schema + authentication + settings.
 * All infrastructure uses intelligent defaults based on environment.
 */

import { defineBackend } from '@atakora/component';
import { schema } from './schema/resource';
import { authentication } from './auth/resource';

/**
 * Define Backend
 *
 * This is all you need! Everything else is handled by defaults:
 * - Cosmos DB (Serverless in dev, Autoscale in prod)
 * - Function App (Consumption in dev, Premium in prod)
 * - Storage (queues, blobs)
 * - Application Insights
 * - Key Vault
 * - Managed Identity
 */
export const backend = defineBackend({
  schema,
  authentication,
  settings: {
    name: 'my-app',
    environment: process.env.NODE_ENV || 'development',
    region: process.env.AZURE_REGION || 'eastus',
  },
});

/**
 * WHAT GETS DEPLOYED:
 *
 * Development (NODE_ENV=development):
 * - Cosmos DB: Serverless mode (~$0-10/month)
 * - Function App: Consumption plan (free tier available)
 * - Storage: Standard LRS
 * - Application Insights: Basic sampling
 *
 * Production (NODE_ENV=production):
 * - Cosmos DB: Autoscale 400-4000 RU/s (~$240/month)
 * - Function App: Premium EP1, 2 instances (~$320/month)
 * - Storage: Standard GRS
 * - Application Insights: Full sampling + alerts
 *
 * See docs/reference/backend/design/ for complete defaults.
 */

/**
 * CUSTOMIZATION (add when defaults don't fit):
 *
 * To add custom event processors:
 *
 * import { event } from './event/resource';
 * backend.schema.DataUploaded.queue.attach(event.DataUploaded);
 *
 * To add custom function handlers:
 *
 * import { func } from './function/resource';
 * backend.schema.GenerateReport.function.attach(func.GenerateReport);
 *
 * To customize infrastructure:
 *
 * import { networking } from './network/resource';
 * import { data } from './storage/resource';
 * import { functions } from './compute/resource';
 * import { monitoring } from './log/resource';
 * import { performance } from './performance/resource';
 *
 * backend.network.primary.attach(networking.Primary);
 * backend.storage.database.attach(data.Database);
 * backend.compute.functionApp.attach(functions.FunctionApp);
 * backend.monitoring.insights.attach(monitoring.AppInsights);
 * backend.performance.cache.attach(performance.Cache);
 *
 * See ../backend/ package for examples of all customizations.
 */

/**
 * EXPORTED TYPES:
 *
 * The backend export includes all auto-generated types:
 */

// CRUD models
export type User = typeof backend.schema.User.$inferType;
export type CreateUserInput = typeof backend.schema.User.$inferCreateInput;
export type UpdateUserInput = typeof backend.schema.User.$inferUpdateInput;

export type Project = typeof backend.schema.Project.$inferType;
export type CreateProjectInput = typeof backend.schema.Project.$inferCreateInput;
export type UpdateProjectInput = typeof backend.schema.Project.$inferUpdateInput;

// Event models
export type DataUploadedEvent = typeof backend.schema.DataUploaded.$inferType;
export type ValidationRequestedEvent = typeof backend.schema.ValidationRequested.$inferType;

// Function models
export type GenerateReportInput = typeof backend.schema.GenerateReport.$inferInput;
export type GenerateReportOutput = typeof backend.schema.GenerateReport.$inferOutput;

export type SearchDataInput = typeof backend.schema.SearchData.$inferInput;
export type SearchDataOutput = typeof backend.schema.SearchData.$inferOutput;

/**
 * DEPLOYMENT:
 *
 * Development:
 * npx atakora deploy --environment development
 *
 * Production:
 * npx atakora deploy --environment production
 *
 * ENVIRONMENT VARIABLES (.env):
 *
 * # Required
 * AZURE_TENANT_ID=your-tenant-id
 * AZURE_CLIENT_ID=your-client-id
 * NODE_ENV=development
 *
 * # Optional
 * AZURE_REGION=eastus
 */
