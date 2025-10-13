/**
 * Logger Enums
 *
 * Enums for API Management Logger configuration.
 *
 * @module @atakora/lib/schema/apimanagement/logger
 */

import { z } from 'zod';

// ============================================================================
// Logger Enums (TypeScript & Zod)
// ============================================================================

/**
 * Logger type for API Management (TypeScript enum)
 */
export enum LoggerType {
  /**
   * Azure Event Hub logger
   */
  AZURE_EVENT_HUB = 'azureEventHub',

  /**
   * Application Insights logger
   */
  APPLICATION_INSIGHTS = 'applicationInsights',

  /**
   * Azure Monitor logger
   */
  AZURE_MONITOR = 'azureMonitor',
}

/**
 * Logger type enum (Zod schema)
 */
export const LoggerTypeEnum = z.enum([
  'azureEventHub',
  'applicationInsights',
  'azureMonitor'
]);

export type LoggerTypeZod = z.infer<typeof LoggerTypeEnum>;
