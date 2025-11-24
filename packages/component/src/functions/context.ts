/**
 * Function Execution Context
 *
 * @remarks
 * Implementation of function execution context that provides access to
 * database, storage, user information, and utilities.
 *
 * @packageDocumentation
 */

import type {
  FunctionContext,
  ExecutionContext,
  UserContext,
  DatabaseClient,
  StorageClient,
  ServiceRegistry,
  FunctionUtils,
  Logger,
  ModelOperations,
  BlobOperations,
  UploadOptions,
} from './types';
import type { BackendObject } from '../backend/types';
import { trace, context as otelContext, SpanStatusCode, type Span } from '@opentelemetry/api';
import { useAzureMonitor } from '@azure/monitor-opentelemetry';
import { createBlobOperations as createBlobOps } from './storage-client';
import {
  createModelOperations as createCosmosModelOperations,
  CosmosConnectionPool,
} from './database-client';
import {
  createServiceRegistry as createServiceRegistryImpl,
  createEmptyServiceRegistry,
} from './service-registry';

// ============================================================================
// Application Insights Configuration
// ============================================================================

/**
 * Application Insights configuration options
 *
 * @internal
 */
interface AppInsightsConfig {
  /**
   * Application Insights connection string
   */
  connectionString?: string;

  /**
   * Instrumentation key (legacy, prefer connectionString)
   */
  instrumentationKey?: string;

  /**
   * Sampling rate (0.0 to 1.0)
   * @defaultValue 1.0 (100% sampling)
   */
  samplingRate?: number;

  /**
   * Enable telemetry in development
   * @defaultValue false
   */
  enableInDevelopment?: boolean;

  /**
   * Cloud role name for distributed tracing
   */
  cloudRoleName?: string;
}

/**
 * Global Application Insights state
 *
 * @internal
 */
let appInsightsInitialized = false;
let appInsightsEnabled = false;

/**
 * Initialize Application Insights
 *
 * @remarks
 * This should be called once at application startup.
 * Subsequent calls are no-ops.
 *
 * @param config - Application Insights configuration
 *
 * @internal
 */
export function initializeApplicationInsights(config?: AppInsightsConfig): void {
  if (appInsightsInitialized) {
    return;
  }

  appInsightsInitialized = true;

  // Check if telemetry is enabled
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
  const enableInDev = config?.enableInDevelopment ?? false;

  if (isDevelopment && !enableInDev) {
    appInsightsEnabled = false;
    return;
  }

  // Get connection string from config or environment
  const connectionString =
    config?.connectionString || process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

  if (!connectionString) {
    console.warn('Application Insights connection string not configured. Telemetry disabled.');
    appInsightsEnabled = false;
    return;
  }

  try {
    // Initialize Azure Monitor OpenTelemetry
    useAzureMonitor({
      azureMonitorExporterOptions: {
        connectionString,
      },
      samplingRatio: config?.samplingRate ?? 1.0,
    });

    appInsightsEnabled = true;
  } catch (error) {
    console.error('Failed to initialize Application Insights:', error);
    appInsightsEnabled = false;
  }
}

/**
 * Check if Application Insights is enabled
 *
 * @internal
 */
export function isAppInsightsEnabled(): boolean {
  return appInsightsEnabled;
}

/**
 * Reset Application Insights state (for testing only)
 *
 * @internal
 */
export function resetApplicationInsights(): void {
  appInsightsInitialized = false;
  appInsightsEnabled = false;
}

// ============================================================================
// Context Creation
// ============================================================================

/**
 * Create function execution context
 *
 * @remarks
 * Creates a FunctionContext from execution metadata, user context, and backend configuration.
 * This is called internally by the function runtime.
 *
 * Services are injected from the backend configuration if provided.
 *
 * @param executionContext - Execution metadata from runtime
 * @param userContext - User context from authentication
 * @param backend - Backend object (optional, for service injection)
 * @returns Function execution context
 *
 * @internal
 */
export function createFunctionContext<TServices extends Record<string, any> = {}>(
  executionContext: ExecutionContext,
  userContext: UserContext,
  backend?: BackendObject<any, any, TServices>
): FunctionContext {
  // Create logger first so it can be used by service registry
  const logger = createLogger(executionContext);

  return {
    database: createDatabaseClient(executionContext),
    storage: createStorageClient(executionContext),
    user: userContext,
    utils: createUtils(),
    services: backend
      ? createServiceRegistryImpl<TServices>(
          backend._serviceFactories,
          executionContext,
          backend.settings,
          backend.environment,
          logger
        )
      : createEmptyServiceRegistry(),
    log: logger,
    bindingData: executionContext.backend?.bindingData,
    executionId: executionContext.executionId,
    executionTime: executionContext.executionTime,
    invocationId: executionContext.invocationId,
  };
}

// ============================================================================
// Database Client Implementation
// ============================================================================

/**
 * Create database client
 *
 * @remarks
 * Creates a Proxy-based database client that provides typed CRUD operations
 * for all models defined in the schema. Uses Cosmos DB connection pooling
 * for optimal performance across function invocations.
 *
 * @param executionContext - Execution context
 * @returns Database client
 *
 * @internal
 */
function createDatabaseClient(executionContext: ExecutionContext): DatabaseClient {
  // Cache for model operations to avoid recreating
  const cache: Record<string, ModelOperations<any>> = {};

  // Create proxy that intercepts model access
  return new Proxy({} as DatabaseClient, {
    get(target, modelName: string) {
      // Cache model operations to avoid recreating
      if (!cache[modelName]) {
        cache[modelName] = createCosmosModelOperations(modelName, executionContext);
      }
      return cache[modelName];
    },
  });
}

// ============================================================================
// Storage Client Implementation
// ============================================================================

/**
 * Create storage client
 *
 * @param executionContext - Execution context
 * @returns Storage client
 *
 * @internal
 */
function createStorageClient(executionContext: ExecutionContext): StorageClient {
  return {
    blobs: createBlobOps(executionContext),
  };
}

// ============================================================================
// Logger Implementation
// ============================================================================

/**
 * Structured log data
 *
 * @internal
 */
interface LogData {
  /**
   * Custom properties to attach to the log
   */
  properties?: Record<string, any>;

  /**
   * Measurements/metrics to attach to the log
   */
  measurements?: Record<string, number>;

  /**
   * Exception/error object
   */
  exception?: Error;
}

/**
 * Parse log data arguments
 *
 * @param data - Variable arguments that may contain properties, measurements, or errors
 * @returns Structured log data
 *
 * @internal
 */
function parseLogData(...data: any[]): LogData {
  const result: LogData = {
    properties: {},
    measurements: {},
  };

  for (const item of data) {
    if (item instanceof Error) {
      result.exception = item;
    } else if (typeof item === 'object' && item !== null) {
      // Separate numeric values as measurements
      for (const [key, value] of Object.entries(item)) {
        if (typeof value === 'number') {
          result.measurements![key] = value;
        } else {
          result.properties![key] = value;
        }
      }
    }
  }

  return result;
}

/**
 * Create logger
 *
 * @remarks
 * Creates a logger that integrates with Azure Application Insights using OpenTelemetry.
 * Provides structured logging with correlation IDs, custom properties, and exception tracking.
 *
 * Features:
 * - Automatic correlation with execution context
 * - Structured logging with custom properties
 * - Exception tracking with stack traces
 * - Performance metrics (measurements)
 * - Sampling support for high-volume scenarios
 * - Console fallback when App Insights is disabled
 *
 * @param executionContext - Execution context
 * @returns Logger
 *
 * @internal
 */
function createLogger(executionContext: ExecutionContext): Logger {
  const tracer = trace.getTracer('atakora-functions');
  const executionId = executionContext.executionId;
  const invocationId = executionContext.invocationId;

  /**
   * Log a message with optional structured data
   *
   * @param severity - Log severity level
   * @param message - Log message
   * @param data - Optional structured data (properties, measurements, errors)
   */
  const logWithTelemetry = (severity: string, message: string, ...data: any[]): void => {
    const logData = parseLogData(...data);
    const timestamp = new Date().toISOString();

    // Always log to console for local debugging
    const consoleMessage = `[${timestamp}] [${executionId}] ${severity}: ${message}`;
    const consoleMethod = severity === 'ERROR' ? 'error' : severity === 'WARN' ? 'warn' : 'log';
    console[consoleMethod](consoleMessage, ...data);

    // If Application Insights is enabled, send telemetry
    if (appInsightsEnabled) {
      try {
        // Create a span for the log event
        const span = tracer.startSpan(`log.${severity.toLowerCase()}`, {
          attributes: {
            'log.severity': severity,
            'log.message': message,
            'execution.id': executionId,
            'invocation.id': invocationId,
            ...logData.properties,
            ...logData.measurements,
          },
        });

        // Record exception if present
        if (logData.exception) {
          span.recordException(logData.exception);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: logData.exception.message,
          });
        }

        // End the span immediately (logging is instantaneous)
        span.end();
      } catch (error) {
        // Fail silently to avoid breaking application flow
        console.error('Failed to send telemetry:', error);
      }
    }
  };

  /**
   * Default log function (info level)
   */
  const log = (message: string, ...data: any[]) => {
    logWithTelemetry('INFO', message, ...data);
  };

  /**
   * Log informational message
   */
  log.info = (message: string, ...data: any[]) => {
    logWithTelemetry('INFO', message, ...data);
  };

  /**
   * Log warning message
   */
  log.warn = (message: string, ...data: any[]) => {
    logWithTelemetry('WARN', message, ...data);
  };

  /**
   * Log error message with optional exception
   */
  log.error = (message: string, error?: Error, ...data: any[]) => {
    const allData = error ? [error, ...data] : data;
    logWithTelemetry('ERROR', message, ...allData);
  };

  /**
   * Log verbose/debug message
   */
  log.verbose = (message: string, ...data: any[]) => {
    logWithTelemetry('VERBOSE', message, ...data);
  };

  return log as Logger;
}

// ============================================================================
// Utilities Implementation
// ============================================================================

/**
 * Create utilities
 *
 * @returns Function utilities
 *
 * @internal
 */
function createUtils(): FunctionUtils {
  return {
    generateId(prefix?: string): string {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 9);
      const id = `${timestamp}${random}`;
      return prefix ? `${prefix}_${id}` : id;
    },

    now(): number {
      return Date.now();
    },

    formatDate(date: Date): string {
      return date.toISOString();
    },
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create default user context for unauthenticated requests
 *
 * @returns Anonymous user context
 *
 * @internal
 */
export function createAnonymousUserContext(): UserContext {
  return {
    id: 'anonymous',
    email: 'anonymous@example.com',
    roles: [],
  };
}

/**
 * Create user context from authentication token
 *
 * @param token - Authentication token (JWT or API key)
 * @returns User context
 *
 * @remarks
 * Parses JWT tokens and extracts user information from standard and Azure-specific claims.
 * Supports multiple token formats:
 * - JWT tokens (decoded payload object)
 * - Pre-parsed token objects with claims
 * - API key tokens with custom claims
 *
 * Extracts information in order of preference:
 * - User ID: sub, oid, userId
 * - Email: email, upn, preferred_username
 * - Roles: roles, groups (converted to string array)
 * - Name: name, preferred_username, email
 *
 * @internal
 */
export function createUserContextFromToken(token: any): UserContext {
  // Handle null/undefined tokens - return anonymous user
  if (!token || typeof token !== 'object') {
    return {
      id: 'anonymous',
      email: 'anonymous@unknown.com',
      roles: [],
      name: 'Anonymous User',
      claims: {},
    };
  }

  // Extract user ID from multiple possible claim fields
  const userId = extractUserIdFromClaims(token);

  // Extract email from multiple possible claim fields
  const email = extractEmailFromClaims(token);

  // Extract roles from multiple possible claim fields
  const roles = extractRolesFromClaims(token);

  // Extract display name from multiple possible claim fields
  const name = extractNameFromClaims(token);

  return {
    id: userId || 'unknown',
    email: email || 'unknown@example.com',
    roles,
    name,
    claims: token,
  };
}

/**
 * Extract user ID from token claims
 *
 * @param claims - Token claims object
 * @returns User ID string, or undefined if not found
 *
 * @internal
 */
function extractUserIdFromClaims(claims: Record<string, any>): string | undefined {
  // Try standard JWT subject claim
  if (claims.sub && typeof claims.sub === 'string' && claims.sub.trim()) {
    return claims.sub.trim();
  }

  // Try Azure AD object ID
  if (claims.oid && typeof claims.oid === 'string' && claims.oid.trim()) {
    return claims.oid.trim();
  }

  // Try custom userId claim
  if (claims.userId && typeof claims.userId === 'string' && claims.userId.trim()) {
    return claims.userId.trim();
  }

  // Try appid for service principal tokens
  if (claims.appid && typeof claims.appid === 'string' && claims.appid.trim()) {
    return claims.appid.trim();
  }

  return undefined;
}

/**
 * Extract email from token claims
 *
 * @param claims - Token claims object
 * @returns Email string, or undefined if not found
 *
 * @internal
 */
function extractEmailFromClaims(claims: Record<string, any>): string | undefined {
  // Try standard email claim
  if (claims.email && typeof claims.email === 'string' && claims.email.trim()) {
    return claims.email.trim();
  }

  // Try Azure AD User Principal Name
  if (claims.upn && typeof claims.upn === 'string' && claims.upn.trim()) {
    return claims.upn.trim();
  }

  // Try OIDC preferred username
  if (claims.preferred_username && typeof claims.preferred_username === 'string' && claims.preferred_username.trim()) {
    return claims.preferred_username.trim();
  }

  // Try unique_name (older Azure AD tokens)
  if (claims.unique_name && typeof claims.unique_name === 'string' && claims.unique_name.trim()) {
    return claims.unique_name.trim();
  }

  return undefined;
}

/**
 * Extract roles from token claims
 *
 * @param claims - Token claims object
 * @returns Array of role strings
 *
 * @internal
 */
function extractRolesFromClaims(claims: Record<string, any>): string[] {
  const roles: string[] = [];

  // Try standard roles claim
  if (Array.isArray(claims.roles)) {
    for (const role of claims.roles) {
      if (typeof role === 'string' && role.trim()) {
        roles.push(role.trim());
      }
    }
  }

  // Try groups claim (Azure AD)
  if (Array.isArray(claims.groups)) {
    for (const group of claims.groups) {
      // Groups can be UUIDs or names
      if (typeof group === 'string' && group.trim()) {
        roles.push(group.trim());
      } else if (group && typeof group === 'object' && group.displayName) {
        // Handle group objects with displayName
        roles.push(group.displayName);
      }
    }
  }

  // Try wids claim (Well-Known IDs for directory roles)
  if (Array.isArray(claims.wids)) {
    for (const wid of claims.wids) {
      if (typeof wid === 'string' && wid.trim()) {
        roles.push(`wid:${wid.trim()}`);
      }
    }
  }

  // Remove duplicates while preserving order
  return [...new Set(roles)];
}

/**
 * Extract display name from token claims
 *
 * @param claims - Token claims object
 * @returns Display name string, or undefined if not found
 *
 * @internal
 */
function extractNameFromClaims(claims: Record<string, any>): string | undefined {
  // Try name claim
  if (claims.name && typeof claims.name === 'string' && claims.name.trim()) {
    return claims.name.trim();
  }

  // Try preferred username
  if (claims.preferred_username && typeof claims.preferred_username === 'string' && claims.preferred_username.trim()) {
    return claims.preferred_username.trim();
  }

  // Try given_name + family_name
  if (claims.given_name || claims.family_name) {
    const parts = [];
    if (claims.given_name && typeof claims.given_name === 'string') {
      parts.push(claims.given_name.trim());
    }
    if (claims.family_name && typeof claims.family_name === 'string') {
      parts.push(claims.family_name.trim());
    }
    if (parts.length > 0) {
      return parts.join(' ');
    }
  }

  // Try email as fallback
  if (claims.email && typeof claims.email === 'string' && claims.email.trim()) {
    return claims.email.trim();
  }

  return undefined;
}

/**
 * Create execution context
 *
 * @param invocationId - Azure Functions invocation ID
 * @returns Execution context
 *
 * @internal
 */
export function createExecutionContext(invocationId: string): ExecutionContext {
  return {
    executionId: generateExecutionId(),
    executionTime: Date.now(),
    invocationId,
  };
}

/**
 * Generate unique execution ID
 *
 * @returns Execution ID
 *
 * @internal
 */
function generateExecutionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `exec_${timestamp}_${random}`;
}
