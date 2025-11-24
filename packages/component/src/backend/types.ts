/**
 * Core Type Definitions for Backend Assembly System
 *
 * This file contains the foundational type definitions that enable
 * the backend assembly pattern, bringing together schema and authentication
 * into a unified, type-safe backend configuration.
 *
 * @module @atakora/component/backend/types
 */

import type { SchemaObject, SchemaDefinitionInput } from '../schema/types';
import type { AuthObject, AuthDefinition } from '../auth/types';

// Re-export types that are part of the public API
export type { AuthDefinition, SchemaDefinitionInput };

// ============================================================================
// Environment Types
// ============================================================================

/**
 * Deployment environment
 *
 * @remarks
 * Different environments have different default configurations:
 * - development: Serverless, minimal resources, no networking
 * - staging: Production-like but scaled down
 * - production: HA, multi-region, full monitoring
 */
export type Environment = 'development' | 'staging' | 'production';

// ============================================================================
// Backend Settings
// ============================================================================

/**
 * Backend settings configuration
 *
 * @remarks
 * Core settings that define the backend's infrastructure parameters.
 * Most settings are optional with sensible defaults per environment.
 */
export interface BackendSettings {
  /**
   * Application name
   *
   * @remarks
   * Used for resource naming and identification.
   * Required field.
   */
  readonly name: string;

  /**
   * Deployment environment
   *
   * @remarks
   * Determines default configurations for infrastructure resources.
   * If not provided, detected from process.env.NODE_ENV or process.env.ENVIRONMENT.
   * Accepts Environment type or string (will be normalized).
   *
   * @example
   * ```typescript
   * settings: { name: 'my-app', environment: 'production' }
   * ```
   */
  readonly environment?: Environment | string;

  /**
   * Azure region for deployment
   *
   * @remarks
   * Defaults to process.env.AZURE_REGION or 'eastus'
   *
   * @example
   * ```typescript
   * settings: { name: 'my-app', region: 'westus2' }
   * ```
   */
  readonly region?: string;

  /**
   * Organization name for resource naming
   *
   * @remarks
   * Used by the naming library to generate Azure-compliant resource names.
   * Should be a short identifier (2-4 chars recommended).
   *
   * @example
   * ```typescript
   * settings: { name: 'my-app', organization: 'dm' } // Digital Minion
   * ```
   */
  readonly organization?: string;

  /**
   * Instance identifier for resource naming
   *
   * @remarks
   * Used when multiple instances of the same backend exist (e.g., '01', '02').
   * Defaults to '01' if not provided.
   *
   * @example
   * ```typescript
   * settings: { name: 'my-app', instance: '02' }
   * ```
   */
  readonly instance?: string;

  /**
   * Geography code for resource naming
   *
   * @remarks
   * Short code for the region (e.g., 'eus' for East US, 'wus2' for West US 2).
   * If not provided, automatically derived from region.
   *
   * @example
   * ```typescript
   * settings: { name: 'my-app', geography: 'eus' }
   * ```
   */
  readonly geography?: string;

  /**
   * Resource group name
   *
   * @remarks
   * Defaults to `${name}-rg`
   */
  readonly resourceGroup?: string;

  /**
   * Tags to apply to all resources
   *
   * @remarks
   * These tags will be applied to all Azure resources created by the backend.
   *
   * @example
   * ```typescript
   * tags: {
   *   environment: 'production',
   *   team: 'platform',
   *   costCenter: 'eng-001'
   * }
   * ```
   */
  readonly tags?: Record<string, string>;

  /**
   * Secrets configuration
   *
   * @remarks
   * Defines required and optional secrets for the backend.
   * Secrets are stored in Azure Key Vault and injected as environment variables.
   *
   * @example
   * ```typescript
   * secrets: {
   *   AZURE_TENANT_ID: { required: true },
   *   SLACK_WEBHOOK_URL: { required: false },
   * }
   * ```
   */
  readonly secrets?: Record<string, { required: boolean }>;

  /**
   * Governance and compliance configuration
   *
   * @remarks
   * Defines compliance frameworks, policies, and audit settings.
   *
   * @example
   * ```typescript
   * governance: {
   *   complianceFrameworks: ['SOC2', 'ISO27001'],
   *   policies: {
   *     'require-https': { effect: 'Deny' },
   *   },
   *   auditLogs: {
   *     enabled: true,
   *     retention: 365,
   *   },
   * }
   * ```
   */
  readonly governance?: {
    complianceFrameworks?: string[];
    policies?: Record<string, { effect: 'Deny' | 'Audit' | 'Disabled' }>;
    auditLogs?: {
      enabled: boolean;
      retention: number;
    };
  };

  /**
   * Feature flags to enable/disable optional capabilities
   *
   * @remarks
   * Features are enabled/disabled based on environment defaults.
   * These flags allow explicit override.
   */
  readonly features?: {
    /**
     * Enable monitoring (App Insights, Log Analytics)
     * @default true in production/staging, false in development
     */
    monitoring?: boolean;

    /**
     * Enable networking (VNet, WAF, DDoS)
     * @default true in production, false in development/staging
     */
    networking?: boolean;

    /**
     * Enable performance features (CDN, Cache, Rate Limiting)
     * @default true in production, false in development/staging
     */
    performance?: boolean;
  };
}

/**
 * Resolved backend settings with all defaults applied
 *
 * @remarks
 * After processing BackendSettings through environment defaults,
 * all optional fields are resolved to concrete values.
 */
export interface ResolvedBackendSettings {
  readonly name: string;
  readonly region: string;
  readonly organization?: string;
  readonly instance?: string;
  readonly geography?: string;
  readonly resourceGroup: string;
  readonly tags: Record<string, string>;
  readonly secrets?: Record<string, { required: boolean }>;
  readonly governance?: {
    complianceFrameworks?: string[];
    policies?: Record<string, { effect: 'Deny' | 'Audit' | 'Disabled' }>;
    auditLogs?: {
      enabled: boolean;
      retention: number;
    };
  };
  readonly features: {
    monitoring: boolean;
    networking: boolean;
    performance: boolean;
  };
}

// ============================================================================
// Backend Configuration
// ============================================================================

/**
 * Configuration for defining a backend
 *
 * @typeParam TSchema - Schema definition type for type inference
 * @typeParam TAuth - Authentication definition type for type inference
 * @typeParam TServices - Service registry type for type inference
 *
 * @remarks
 * This is the input to defineBackend(). It brings together:
 * - Schema (from Phase 1)
 * - Authentication (from Phase 2)
 * - Settings (infrastructure configuration)
 * - Services (custom service injection)
 * - Optional environment override
 */
export interface BackendConfig<
  TSchema extends { schema: Record<string, any> } = SchemaDefinitionInput,
  TAuth extends AuthDefinition = AuthDefinition,
  TServices extends Record<string, any> = {},
> {
  /**
   * Schema definition from Phase 1
   *
   * @remarks
   * Created using defineSchema() from the schema package
   */
  readonly schema: SchemaObject<TSchema>;

  /**
   * Authentication configuration from Phase 2
   *
   * @remarks
   * Created using defineAuth() from the auth package.
   * Optional - if not provided, backend has no authentication.
   */
  readonly authentication?: AuthObject<TAuth>;

  /**
   * Backend settings
   *
   * @remarks
   * At minimum, must provide a name. Other settings have environment defaults.
   */
  readonly settings: BackendSettings;

  /**
   * Optional environment override
   *
   * @remarks
   * If not provided, environment is detected from process.env.NODE_ENV
   * or process.env.ENVIRONMENT.
   */
  readonly environment?: Environment;

  /**
   * Service registry
   *
   * @remarks
   * Services are defined as factory functions that receive execution context.
   * Services can be per-request (transient) or singletons (use singleton() wrapper).
   *
   * Services are available via context.services in function handlers.
   *
   * @example
   * ```typescript
   * services: {
   *   reportGenerator: (context) => new ReportGeneratorService({
   *     storageAccount: context.env.STORAGE_ACCOUNT!,
   *   }),
   *   dataValidator: singleton(() => new DataValidatorService()),
   * }
   * ```
   *
   * @optional
   */
  readonly services?: TServices;
}

// ============================================================================
// Backend Metadata
// ============================================================================

/**
 * Metadata about the backend configuration
 *
 * @remarks
 * Used for debugging, introspection, and tooling support
 */
export interface BackendMetadata {
  /**
   * Backend assembly API version
   */
  readonly version: string;

  /**
   * Timestamp when backend was created
   */
  readonly createdAt: Date;

  /**
   * Detected or specified environment
   */
  readonly environment: Environment;

  /**
   * Number of models in schema
   */
  readonly modelCount: number;

  /**
   * Whether authentication is configured
   */
  readonly hasAuthentication: boolean;

  /**
   * Enabled features
   */
  readonly enabledFeatures: string[];
}

// ============================================================================
// Attachment Point Types (Placeholder)
// ============================================================================

/**
 * Attachment point for customizing resource configurations
 *
 * @typeParam T - Configuration type for this attachment point
 *
 * @remarks
 * Allows progressive enhancement - start with defaults, customize what you need.
 * Full implementation will be provided by Devon-Backend-2 in Task 2.
 */
export interface AttachmentPoint<T> {
  /**
   * Attach a custom configuration
   */
  attach(config: T): void;

  /**
   * Check if configuration is attached
   */
  isAttached(): boolean;

  /**
   * Get current configuration (default or attached)
   */
  getConfig(): T;

  /**
   * Reset to default configuration
   */
  reset(): void;

  /** @internal */
  _default: T;

  /** @internal */
  _attached?: T;

  /** @internal */
  _path: string;
}

// ============================================================================
// Backend Object Structure
// ============================================================================

/**
 * Backend object returned by defineBackend()
 *
 * @typeParam TSchema - Schema definition type for type inference
 * @typeParam TAuth - Authentication definition type for type inference
 * @typeParam TServices - Service registry type for type inference
 *
 * @remarks
 * The BackendObject is the central configuration object that:
 * - Preserves original inputs (schema, authentication, settings)
 * - Provides attachment points for infrastructure customization
 * - Stores service factories for runtime injection
 * - Maintains metadata and internal state
 *
 * This structure will be fully populated by other Devon agents:
 * - Devon-Backend-2: Attachment point implementation
 * - Devon-Backend-3-5: Default configurations per environment
 */
export interface BackendObject<
  TSchema extends { schema: Record<string, any> } = SchemaDefinitionInput,
  TAuth extends AuthDefinition = AuthDefinition,
  TServices extends Record<string, any> = {},
> {
  // ============================================================================
  // Original Inputs
  // ============================================================================

  /**
   * Schema definition
   */
  readonly schema: SchemaObject<TSchema>;

  /**
   * Authentication configuration
   */
  readonly authentication?: AuthObject<TAuth>;

  /**
   * Resolved backend settings
   */
  readonly settings: ResolvedBackendSettings;

  /**
   * Detected or specified environment
   */
  readonly environment: Environment;

  // ============================================================================
  // Infrastructure Attachment Points
  // ============================================================================

  /**
   * Storage resources
   *
   * @remarks
   * Placeholder for Task 2 (Attachment Point System)
   * Will contain:
   * - storage.account: Storage account configuration
   * - storage.database: CosmosDB configuration
   * - storage.blobs: Blob storage configuration
   */
  readonly storage: {
    account: AttachmentPoint<any>;
    database: AttachmentPoint<any>;
    blobs: AttachmentPoint<any>;
  };

  /**
   * Compute resources
   *
   * @remarks
   * Placeholder for Task 2 (Attachment Point System)
   * Will contain:
   * - compute.functionApp: Azure Functions configuration
   */
  readonly compute: {
    functionApp: AttachmentPoint<any>;
  };

  /**
   * Network resources (optional, production only by default)
   *
   * @remarks
   * Placeholder for Task 2 (Attachment Point System)
   * Will contain:
   * - network.vnet: Virtual Network configuration
   * - network.primary: Primary network configuration
   * - network.firewall: Firewall configuration
   * - network.waf: Web Application Firewall configuration
   * - network.ddos: DDoS Protection configuration
   */
  readonly network?: {
    vnet: AttachmentPoint<any>;
    primary: AttachmentPoint<any>;
    firewall: AttachmentPoint<any>;
    waf: AttachmentPoint<any>;
    ddos: AttachmentPoint<any>;
  };

  /**
   * Monitoring resources (optional, disabled in development by default)
   *
   * @remarks
   * Placeholder for Task 2 (Attachment Point System)
   * Will contain:
   * - monitoring.appInsights: Application Insights configuration
   * - monitoring.insights: Application Insights configuration (alias)
   * - monitoring.logAnalytics: Log Analytics Workspace configuration
   * - monitoring.logs: Log Analytics Workspace configuration (alias)
   * - monitoring.alerts: Alert rules configuration
   * - monitoring.diagnostics: Diagnostic settings configuration
   * - monitoring.metrics: Custom metrics configuration
   * - monitoring.tracing: Distributed tracing configuration
   * - monitoring.queryPacks: Query pack configuration
   */
  readonly monitoring?: {
    appInsights: AttachmentPoint<any>;
    insights: AttachmentPoint<any>;
    logAnalytics: AttachmentPoint<any>;
    logs: AttachmentPoint<any>;
    alerts: AttachmentPoint<any>;
    diagnostics: AttachmentPoint<any>;
    metrics: AttachmentPoint<any>;
    tracing: AttachmentPoint<any>;
    queryPacks: AttachmentPoint<any>;
  };

  /**
   * Performance resources (optional, disabled in development by default)
   *
   * @remarks
   * Placeholder for Task 2 (Attachment Point System)
   * Will contain:
   * - performance.cdn: CDN configuration
   * - performance.cache: Redis cache configuration
   * - performance.rateLimit: Rate limiting configuration
   * - performance.compression: Compression configuration
   */
  readonly performance?: {
    cdn: AttachmentPoint<any>;
    cache: AttachmentPoint<any>;
    rateLimit: AttachmentPoint<any>;
    compression: AttachmentPoint<any>;
  };

  // ============================================================================
  // Schema-Specific Attachment Points
  // ============================================================================

  /**
   * Model-specific attachment points
   *
   * @remarks
   * Dynamically created based on schema models.
   * Each model gets appropriate attachment points:
   * - CRUD models: container attachment
   * - Event models: queue and processor attachments
   * - Function models: handler attachment
   *
   * Placeholder for Task 8 (Schema Attachment Points)
   */
  readonly models: Record<string, any>;

  // ============================================================================
  // Metadata and Internal State
  // ============================================================================

  /**
   * Backend metadata
   */
  readonly _metadata: BackendMetadata;

  /**
   * Internal attachment storage
   *
   * @internal
   */
  _attachments: Map<string, any>;

  /**
   * Default configurations per environment
   *
   * @internal
   */
  _defaults: any;

  /**
   * Service factory registry
   *
   * @remarks
   * Maps service names to factory functions.
   * Used internally to create service instances per request.
   *
   * @internal
   */
  _serviceFactories: Map<string, any>;
}
