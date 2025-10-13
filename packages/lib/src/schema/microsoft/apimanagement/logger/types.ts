/**
 * API Management Logger Schema Types
 *
 * Zod validation schemas for Logger configuration in Azure API Management.
 *
 * @module @atakora/lib/schema/apimanagement/logger
 */

import { z } from 'zod';
import * as enums from './enums';

/**
 * Logger credentials schema for Application Insights
 */
export const LoggerCredentialsApplicationInsightsSchema = z.object({
  /**
   * Application Insights instrumentation key
   */
  instrumentationKey: z.string()
});

/**
 * Logger credentials schema for Azure Event Hub
 */
export const LoggerCredentialsEventHubSchema = z.object({
  /**
   * Event Hub connection string with Send permission
   */
  connectionString: z.string(),

  /**
   * Event Hub name
   */
  name: z.string()
});

/**
 * Logger credentials schema for Azure Monitor
 */
export const LoggerCredentialsAzureMonitorSchema = z.object({
  /**
   * Azure Monitor workspace ID
   */
  workspaceId: z.string()
});

/**
 * Logger credentials schema (union of all logger types)
 */
export const LoggerCredentialsSchema = z.union([
  LoggerCredentialsApplicationInsightsSchema,
  LoggerCredentialsEventHubSchema,
  LoggerCredentialsAzureMonitorSchema
]);

/**
 * Logger properties schema for API Management service
 *
 * @remarks
 * Represents the properties of a logger in Azure API Management.
 * Loggers are used to send diagnostics data to various destinations.
 *
 * **Supported Logger Types**:
 * - `applicationInsights`: Send logs to Application Insights
 * - `azureEventHub`: Send logs to Azure Event Hub
 * - `azureMonitor`: Send logs to Azure Monitor
 *
 * @example
 * Application Insights logger:
 * ```typescript
 * {
 *   loggerType: 'applicationInsights',
 *   description: 'Application Insights logger for API diagnostics',
 *   credentials: {
 *     instrumentationKey: '{appInsights-instrumentation-key}'
 *   },
 *   isBuffered: true,
 *   resourceId: '/subscriptions/{subId}/resourceGroups/{rg}/providers/Microsoft.Insights/components/{appInsights}'
 * }
 * ```
 */
export const LoggerPropertiesSchema = z.object({
  /**
   * Logger type
   */
  loggerType: enums.LoggerTypeEnum,

  /**
   * Logger description
   */
  description: z.string().optional(),

  /**
   * Logger credentials (specific to logger type)
   */
  credentials: LoggerCredentialsSchema,

  /**
   * Whether records are buffered in the logger before publishing.
   *
   * @remarks
   * Default is assumed to be yes.
   * Buffering can reduce the number of requests to the backend.
   */
  isBuffered: z.boolean().optional(),

  /**
   * Azure Resource Id of the logger resource.
   *
   * @remarks
   * For Application Insights, this is the Application Insights component resource ID.
   * For Event Hub, this is the Event Hub namespace resource ID.
   * For Azure Monitor, this is the Log Analytics workspace resource ID.
   */
  resourceId: z.string().optional()
});

/**
 * Logger resource schema for API Management service
 *
 * @remarks
 * Full ARM resource schema for Microsoft.ApiManagement/service/loggers
 *
 * @example
 * ```typescript
 * {
 *   type: 'Microsoft.ApiManagement/service/loggers',
 *   apiVersion: '2023-03-01-preview',
 *   name: 'applicationinsights',
 *   properties: {
 *     loggerType: 'applicationInsights',
 *     credentials: {
 *       instrumentationKey: '{appInsights-instrumentation-key}'
 *     },
 *     isBuffered: true,
 *     resourceId: '/subscriptions/{subId}/resourceGroups/{rg}/providers/Microsoft.Insights/components/{appInsights}'
 *   }
 * }
 * ```
 */
export const LoggerResourceSchema = z.object({
  /**
   * ARM resource type
   */
  type: z.literal('Microsoft.ApiManagement/service/loggers'),

  /**
   * API version
   */
  apiVersion: z.string(),

  /**
   * Logger identifier
   *
   * @remarks
   * Must be unique in the current API Management service instance.
   * Common names: 'applicationinsights', 'eventhub-logger', 'azuremonitor'
   */
  name: z.string(),

  /**
   * Logger properties
   */
  properties: LoggerPropertiesSchema
});

/**
 * Type exports for logger schemas
 */
export type LoggerCredentialsApplicationInsights = z.infer<typeof LoggerCredentialsApplicationInsightsSchema>;
export type LoggerCredentialsEventHub = z.infer<typeof LoggerCredentialsEventHubSchema>;
export type LoggerCredentialsAzureMonitor = z.infer<typeof LoggerCredentialsAzureMonitorSchema>;
export type LoggerCredentials = z.infer<typeof LoggerCredentialsSchema>;
export type LoggerProperties = z.infer<typeof LoggerPropertiesSchema>;
export type LoggerResource = z.infer<typeof LoggerResourceSchema>;
