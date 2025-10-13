/**
 * Type definitions for API Management Logger constructs.
 *
 * @packageDocumentation
 */

import { schema } from '@atakora/lib';
import type { IService } from '../core/types';

/**
 * Logger type for API Management.
 */
export const LoggerType = schema.apimanagement.LoggerType;
export type LoggerType = typeof LoggerType[keyof typeof LoggerType];

/**
 * Logger credentials for Application Insights.
 */
export interface LoggerCredentialsApplicationInsights {
  /**
   * Application Insights instrumentation key.
   */
  readonly instrumentationKey: string;
}

/**
 * Logger credentials for Azure Event Hub.
 */
export interface LoggerCredentialsEventHub {
  /**
   * Event Hub connection string with Send permission.
   */
  readonly connectionString: string;

  /**
   * Event Hub name.
   */
  readonly name: string;
}

/**
 * Logger credentials for Azure Monitor.
 */
export interface LoggerCredentialsAzureMonitor {
  /**
   * Azure Monitor workspace ID.
   */
  readonly workspaceId: string;
}

/**
 * Logger credentials (union of all logger types).
 */
export type LoggerCredentials =
  | LoggerCredentialsApplicationInsights
  | LoggerCredentialsEventHub
  | LoggerCredentialsAzureMonitor;

/**
 * Properties for ArmLogger (L1 construct).
 *
 * @remarks
 * Direct mapping to Microsoft.ApiManagement/service/loggers ARM resource.
 * All properties are explicit with no defaults or auto-generation.
 *
 * ARM API Version: 2024-05-01
 *
 * @example
 * ```typescript
 * const props: ArmLoggerProps = {
 *   apiManagementService: apimService,
 *   loggerName: 'appinsights-logger',
 *   properties: {
 *     loggerType: LoggerType.APPLICATION_INSIGHTS,
 *     description: 'Application Insights logger for APIM',
 *     credentials: {
 *       instrumentationKey: appInsights.instrumentationKey
 *     },
 *     resourceId: appInsights.resourceId,
 *     isBuffered: true
 *   }
 * };
 * ```
 */
export interface ArmLoggerProps {
  /**
   * Parent API Management service.
   */
  readonly apiManagementService: IService;

  /**
   * Logger identifier.
   *
   * @remarks
   * - Must be 1-256 characters
   * - Alphanumeric, hyphens, and periods only
   * - Pattern: ^[a-zA-Z0-9][a-zA-Z0-9-.]{0,254}[a-zA-Z0-9]$
   */
  readonly loggerName: string;

  /**
   * Logger properties.
   */
  readonly properties: {
    /**
     * Logger type.
     */
    readonly loggerType: LoggerType;

    /**
     * Logger description.
     */
    readonly description?: string;

    /**
     * Logger credentials (specific to logger type).
     */
    readonly credentials: LoggerCredentials;

    /**
     * Whether records are buffered in the logger before publishing.
     *
     * @remarks
     * Defaults to true.
     * Buffering improves performance but may delay log availability.
     */
    readonly isBuffered?: boolean;

    /**
     * Azure Resource Id of the logger resource.
     *
     * @remarks
     * Required for Application Insights and Azure Monitor loggers.
     * Optional for Event Hub loggers.
     */
    readonly resourceId?: string;
  };
}

/**
 * Properties for Logger (L2 construct).
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 * Designed for developer productivity with minimal required properties.
 *
 * @example
 * ```typescript
 * // Application Insights logger
 * const logger = new Logger(apimService, 'AppInsightsLogger', {
 *   apiManagementService: apimService,
 *   loggerType: LoggerType.APPLICATION_INSIGHTS,
 *   instrumentationKey: appInsights.instrumentationKey,
 *   resourceId: appInsights.resourceId
 * });
 *
 * // Event Hub logger
 * const logger = new Logger(apimService, 'EventHubLogger', {
 *   apiManagementService: apimService,
 *   loggerType: LoggerType.AZURE_EVENT_HUB,
 *   eventHubConnectionString: eventHub.connectionString,
 *   eventHubName: eventHub.name
 * });
 * ```
 */
export interface LoggerProps {
  /**
   * Parent API Management service.
   */
  readonly apiManagementService: IService;

  /**
   * Logger identifier.
   *
   * @remarks
   * If not provided, will be derived from construct ID.
   */
  readonly loggerName?: string;

  /**
   * Logger type.
   */
  readonly loggerType: LoggerType;

  /**
   * Logger description.
   */
  readonly description?: string;

  /**
   * Whether records are buffered in the logger before publishing.
   *
   * @remarks
   * Defaults to true.
   */
  readonly isBuffered?: boolean;

  /**
   * Azure Resource Id of the logger resource.
   *
   * @remarks
   * Required for Application Insights and Azure Monitor loggers.
   */
  readonly resourceId?: string;

  /**
   * Application Insights instrumentation key.
   *
   * @remarks
   * Required when loggerType is APPLICATION_INSIGHTS.
   */
  readonly instrumentationKey?: string;

  /**
   * Event Hub connection string with Send permission.
   *
   * @remarks
   * Required when loggerType is AZURE_EVENT_HUB.
   */
  readonly eventHubConnectionString?: string;

  /**
   * Event Hub name.
   *
   * @remarks
   * Required when loggerType is AZURE_EVENT_HUB.
   */
  readonly eventHubName?: string;

  /**
   * Azure Monitor workspace ID.
   *
   * @remarks
   * Required when loggerType is AZURE_MONITOR.
   */
  readonly azureMonitorWorkspaceId?: string;
}

/**
 * Interface for API Management Logger reference.
 */
export interface IServiceLogger {
  /**
   * Logger name.
   */
  readonly loggerName: string;

  /**
   * Logger type.
   */
  readonly loggerType: LoggerType;

  /**
   * Resource ID.
   */
  readonly loggerId: string;
}
