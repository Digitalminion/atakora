import { Construct, Resource, DeploymentScope } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { IService } from '../core/types';
import type {
  ArmLoggerProps,
  LoggerProps,
  IServiceLogger,
  LoggerType,
  LoggerCredentials,
} from './types';

/**
 * L1 construct for API Management Logger.
 *
 * @remarks
 * Direct mapping to Microsoft.ApiManagement/service/loggers ARM resource.
 * This is a child resource of API Management service.
 *
 * **ARM Resource Type**: `Microsoft.ApiManagement/service/loggers`
 * **API Version**: `2024-05-01`
 * **Deployment Scope**: ResourceGroup (as child resource)
 *
 * **Logger Types**:
 * - **Application Insights**: Send logs to Azure Application Insights
 * - **Azure Event Hub**: Send logs to Azure Event Hub
 * - **Azure Monitor**: Send logs to Azure Monitor
 *
 * @example
 * ```typescript
 * const logger = new ArmLogger(apimService, 'AppInsightsLogger', {
 *   apiManagementService: apimService,
 *   loggerName: 'appinsights-logger',
 *   properties: {
 *     loggerType: LoggerType.APPLICATION_INSIGHTS,
 *     description: 'Application Insights logger for API Management',
 *     credentials: {
 *       instrumentationKey: appInsights.instrumentationKey
 *     },
 *     resourceId: appInsights.resourceId,
 *     isBuffered: true
 *   }
 * });
 * ```
 */
export class ArmLogger extends Resource {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.ApiManagement/service/loggers';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2024-05-01';

  /**
   * Deployment scope.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * Parent API Management service.
   */
  public readonly apiManagementService: IService;

  /**
   * Logger name.
   */
  public readonly loggerName: string;

  /**
   * Resource name (same as loggerName).
   */
  public readonly name: string;

  /**
   * Logger type.
   */
  public readonly loggerType: LoggerType;

  /**
   * Logger description.
   */
  public readonly description?: string;

  /**
   * Logger credentials.
   */
  public readonly credentials: LoggerCredentials;

  /**
   * Whether records are buffered.
   */
  public readonly isBuffered?: boolean;

  /**
   * Azure Resource Id of the logger resource.
   */
  public readonly resourceIdRef?: string;

  /**
   * ARM resource ID.
   */
  public readonly resourceId: string;

  /**
   * Logger ID (alias for resourceId).
   */
  public readonly loggerId: string;

  constructor(scope: Construct, id: string, props: ArmLoggerProps) {
    super(scope, id);

    this.validateProps(props);

    this.apiManagementService = props.apiManagementService;
    this.loggerName = props.loggerName;
    this.name = props.loggerName;
    this.loggerType = props.properties.loggerType;
    this.description = props.properties.description;
    this.credentials = props.properties.credentials;
    this.isBuffered = props.properties.isBuffered;
    this.resourceIdRef = props.properties.resourceId;

    this.resourceId = `${this.apiManagementService.apiManagementId}/loggers/${this.loggerName}`;
    this.loggerId = this.resourceId;
  }

  protected validateProps(props: ArmLoggerProps): void {
    if (!props.loggerName || props.loggerName.trim() === '') {
      throw new Error('Logger name cannot be empty');
    }

    if (props.loggerName.length > 256) {
      throw new Error('Logger name cannot exceed 256 characters');
    }

    if (!props.properties.loggerType) {
      throw new Error('Logger type is required');
    }

    if (!props.properties.credentials) {
      throw new Error('Logger credentials are required');
    }

    // Validate credentials based on logger type
    if (props.properties.loggerType === 'applicationInsights') {
      const creds = props.properties.credentials as any;
      if (!creds.instrumentationKey) {
        throw new Error('Instrumentation key is required for Application Insights logger');
      }
    } else if (props.properties.loggerType === 'azureEventHub') {
      const creds = props.properties.credentials as any;
      if (!creds.connectionString || !creds.name) {
        throw new Error('Connection string and name are required for Event Hub logger');
      }
    } else if (props.properties.loggerType === 'azureMonitor') {
      const creds = props.properties.credentials as any;
      if (!creds.workspaceId) {
        throw new Error('Workspace ID is required for Azure Monitor logger');
      }
    }
  }

  public toArmTemplate(): ArmResource {
    const properties: any = {
      loggerType: this.loggerType,
      credentials: this.credentials,
    };

    if (this.description) {
      properties.description = this.description;
    }

    if (this.isBuffered !== undefined) {
      properties.isBuffered = this.isBuffered;
    }

    if (this.resourceIdRef) {
      properties.resourceId = this.resourceIdRef;
    }

    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: `${this.apiManagementService.serviceName}/${this.loggerName}`,
      properties,
      dependsOn: [this.apiManagementService.apiManagementId],
    } as ArmResource;
  }
}

/**
 * L2 construct for API Management Logger.
 *
 * @remarks
 * Intent-based API with sensible defaults.
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
export class Logger extends Construct implements IServiceLogger {
  private readonly armLogger: ArmLogger;

  public readonly loggerName: string;
  public readonly loggerType: LoggerType;
  public readonly loggerId: string;

  constructor(scope: Construct, id: string, props: LoggerProps) {
    super(scope, id);

    this.loggerName = props.loggerName ?? this.sanitizeLoggerName(id);
    this.loggerType = props.loggerType;

    // Build credentials based on logger type
    const credentials = this.buildCredentials(props);

    this.armLogger = new ArmLogger(scope, `${id}-Resource`, {
      apiManagementService: props.apiManagementService,
      loggerName: this.loggerName,
      properties: {
        loggerType: props.loggerType,
        description: props.description,
        credentials,
        isBuffered: props.isBuffered ?? true,
        resourceId: props.resourceId,
      },
    });

    this.loggerId = this.armLogger.loggerId;
  }

  private sanitizeLoggerName(id: string): string {
    return id.toLowerCase().replace(/[^a-z0-9-.]/g, '-');
  }

  private buildCredentials(props: LoggerProps): LoggerCredentials {
    switch (props.loggerType) {
      case 'applicationInsights':
        if (!props.instrumentationKey) {
          throw new Error('instrumentationKey is required for Application Insights logger');
        }
        return {
          instrumentationKey: props.instrumentationKey,
        };

      case 'azureEventHub':
        if (!props.eventHubConnectionString || !props.eventHubName) {
          throw new Error(
            'eventHubConnectionString and eventHubName are required for Event Hub logger'
          );
        }
        return {
          connectionString: props.eventHubConnectionString,
          name: props.eventHubName,
        };

      case 'azureMonitor':
        if (!props.azureMonitorWorkspaceId) {
          throw new Error('azureMonitorWorkspaceId is required for Azure Monitor logger');
        }
        return {
          workspaceId: props.azureMonitorWorkspaceId,
        };

      default:
        throw new Error(`Unsupported logger type: ${props.loggerType}`);
    }
  }
}
