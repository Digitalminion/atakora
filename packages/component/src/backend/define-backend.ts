/**
 * Backend Assembly Function
 *
 * This file implements the defineBackend() function that brings together
 * schema and authentication into a unified backend configuration.
 *
 * @module @atakora/component/backend/define-backend
 */

import type { SchemaObject, SchemaDefinitionInput } from '../schema/types';
import type { AuthObject, AuthDefinition } from '../auth/types';
import type {
  BackendConfig,
  BackendObject,
  BackendSettings,
  ResolvedBackendSettings,
  BackendMetadata,
  Environment,
  AttachmentPoint,
} from './types';
import { createAttachmentPoint, type BackendObjectRef } from './attachment-point';
import type { ServiceFactory } from '../functions/service-registry-types';
import { ResourceNameGenerator } from '@atakora/lib';

// ============================================================================
// Constants
// ============================================================================

const BACKEND_API_VERSION = '1.0.0';
const DEFAULT_REGION = 'eastus';

// ============================================================================
// Environment Detection
// ============================================================================

/**
 * Normalize environment string to Environment type
 *
 * @param env - Environment string or Environment type
 * @returns Normalized environment or undefined if invalid
 */
function normalizeEnvironment(env: string | Environment | undefined): Environment | undefined {
  if (!env) return undefined;

  switch (env.toLowerCase()) {
    case 'production':
    case 'prod':
      return 'production';

    case 'staging':
    case 'stage':
    case 'test':
      return 'staging';

    case 'development':
    case 'dev':
    case 'local':
      return 'development';

    default:
      return undefined;
  }
}

/**
 * Detect deployment environment from process.env
 *
 * @remarks
 * Checks NODE_ENV and ENVIRONMENT environment variables.
 * Defaults to 'development' if not set.
 *
 * Environment mapping:
 * - 'production' | 'prod' → 'production'
 * - 'staging' | 'stage' | 'test' → 'staging'
 * - 'development' | 'dev' | 'local' | undefined → 'development'
 *
 * @returns Detected environment
 */
function detectEnvironment(): Environment {
  const env = process.env.NODE_ENV || process.env.ENVIRONMENT;
  return normalizeEnvironment(env) || 'development';
}

// ============================================================================
// Region to Geography Code Mapping
// ============================================================================

/**
 * Convert Azure region to short geography code
 *
 * @param region - Azure region (e.g., 'eastus', 'westus2')
 * @returns Short geography code (e.g., 'eus', 'wus2')
 */
function regionToGeographyCode(region: string): string {
  const mapping: Record<string, string> = {
    eastus: 'eus',
    eastus2: 'eus2',
    westus: 'wus',
    westus2: 'wus2',
    westus3: 'wus3',
    centralus: 'cus',
    northcentralus: 'ncus',
    southcentralus: 'scus',
    westcentralus: 'wcus',
    canadacentral: 'cac',
    canadaeast: 'cae',
    brazilsouth: 'brs',
    northeurope: 'neu',
    westeurope: 'weu',
    uksouth: 'uks',
    ukwest: 'ukw',
    francecentral: 'frc',
    francesouth: 'frs',
    germanywestcentral: 'dewc',
    norwayeast: 'noe',
    switzerlandnorth: 'chn',
    swedencentral: 'sec',
    eastasia: 'eas',
    southeastasia: 'seas',
    australiaeast: 'aue',
    australiasoutheast: 'ause',
    japaneast: 'jpe',
    japanwest: 'jpw',
    koreacentral: 'krc',
    koreasouth: 'krs',
    southindia: 'ins',
    centralindia: 'inc',
    westindia: 'inw',
    uaenorth: 'uaen',
    southafricanorth: 'san',
    // Government Cloud
    usgovvirginia: 'usgv',
    usgovarizona: 'usga',
    usgovtexas: 'usgt',
    usdodeast: 'usde',
    usdodcentral: 'usdc',
  };

  const code = mapping[region.toLowerCase()];
  if (code) return code;

  // Fallback: create acronym from region name
  return region
    .toLowerCase()
    .replace(/[^a-z]+/g, ' ')
    .split(' ')
    .map((word) => word[0])
    .join('')
    .substring(0, 4);
}

/**
 * Normalize environment for resource naming
 *
 * @param environment - Environment string
 * @returns Short environment code (e.g., 'dev', 'stg', 'prod')
 */
function normalizeEnvironmentForNaming(environment: Environment): string {
  switch (environment) {
    case 'production':
      return 'prod';
    case 'staging':
      return 'stg';
    case 'development':
      return 'dev';
    default:
      return environment;
  }
}

// ============================================================================
// Settings Resolution
// ============================================================================

/**
 * Resolve backend settings with environment defaults
 *
 * @param settings - User-provided settings
 * @param environment - Detected or overridden environment
 * @returns Resolved settings with all defaults applied
 */
function resolveSettings(
  settings: BackendSettings,
  environment: Environment
): ResolvedBackendSettings {
  // Validate required fields
  if (!settings.name || settings.name.trim() === '') {
    throw new Error('Backend settings.name is required and cannot be empty');
  }

  // Validate name format (alphanumeric, hyphens, underscores only)
  if (!/^[a-zA-Z0-9-_]+$/.test(settings.name)) {
    throw new Error(
      'Backend settings.name must contain only alphanumeric characters, hyphens, and underscores'
    );
  }

  // Get environment-specific feature defaults
  const featureDefaults = getEnvironmentFeatureDefaults(environment);

  // Resolve region and geography for naming
  const region = settings.region || process.env.AZURE_REGION || DEFAULT_REGION;
  const geography = settings.geography || regionToGeographyCode(region);
  const organization = settings.organization || 'org';
  const instance = settings.instance || '01';

  // Generate resource group name using naming library
  let resourceGroup = settings.resourceGroup;
  if (!resourceGroup) {
    const nameGenerator = new ResourceNameGenerator();
    resourceGroup = nameGenerator.generateName({
      resourceType: 'rg',
      organization,
      project: settings.name,
      environment: normalizeEnvironmentForNaming(environment),
      geography,
      instance,
    });
  }

  return {
    name: settings.name,
    region,
    organization: settings.organization,
    instance: settings.instance,
    geography: settings.geography,
    resourceGroup,
    tags: {
      environment,
      ...settings.tags,
    },
    secrets: settings.secrets,
    governance: settings.governance,
    features: {
      monitoring: settings.features?.monitoring ?? featureDefaults.monitoring,
      networking: settings.features?.networking ?? featureDefaults.networking,
      performance: settings.features?.performance ?? featureDefaults.performance,
    },
  };
}

/**
 * Get default feature flags for environment
 *
 * @param environment - Target environment
 * @returns Default feature flags
 */
function getEnvironmentFeatureDefaults(environment: Environment): {
  monitoring: boolean;
  networking: boolean;
  performance: boolean;
} {
  switch (environment) {
    case 'production':
      return {
        monitoring: true,
        networking: true,
        performance: true,
      };

    case 'staging':
      return {
        monitoring: true,
        networking: true,
        performance: false,
      };

    case 'development':
    default:
      return {
        monitoring: false,
        networking: false,
        performance: false,
      };
  }
}

// ============================================================================
// Metadata Creation
// ============================================================================

/**
 * Create backend metadata
 *
 * @param schema - Schema object
 * @param authentication - Authentication object (optional)
 * @param environment - Detected environment
 * @param features - Resolved feature flags
 * @returns Backend metadata
 */
function createMetadata<TSchema extends SchemaDefinitionInput, TAuth extends AuthDefinition>(
  schema: SchemaObject<TSchema>,
  authentication: AuthObject<TAuth> | undefined,
  environment: Environment,
  features: ResolvedBackendSettings['features']
): BackendMetadata {
  const enabledFeatures: string[] = [];

  if (features.monitoring) enabledFeatures.push('monitoring');
  if (features.networking) enabledFeatures.push('networking');
  if (features.performance) enabledFeatures.push('performance');

  return {
    version: BACKEND_API_VERSION,
    createdAt: new Date(),
    environment,
    modelCount: Object.keys(schema.models).length,
    hasAuthentication: authentication !== undefined,
    enabledFeatures,
  };
}

// ============================================================================
// Attachment Point Helper
// ============================================================================

/**
 * Create an attachment point bound to a backend object
 *
 * @remarks
 * This helper wraps createAttachmentPoint with the backend reference.
 * Simplifies attachment point creation throughout the backend definition.
 *
 * @param backend - Backend object reference
 * @param path - Attachment point path (for debugging)
 * @param defaultConfig - Default configuration
 * @returns Attachment point bound to the backend
 */
function createBackendAttachmentPoint<T>(
  backend: BackendObjectRef,
  path: string,
  defaultConfig: T
): AttachmentPoint<T> {
  return createAttachmentPoint(backend, path, defaultConfig);
}

// ============================================================================
// Main defineBackend Function
// ============================================================================

/**
 * Define a backend by combining schema, authentication, settings, and services
 *
 * @typeParam TSchema - Schema definition type for type inference
 * @typeParam TAuth - Authentication definition type for type inference
 * @typeParam TServices - Service registry type for type inference
 *
 * @param config - Backend configuration
 * @returns Backend object with type-safe access to schema, auth, and services
 *
 * @remarks
 * This is the main entry point for creating a backend. It:
 * 1. Detects or uses the specified environment
 * 2. Resolves settings with environment defaults
 * 3. Creates attachment points for infrastructure customization
 * 4. Registers service factories for dependency injection
 * 5. Returns a type-safe backend object
 *
 * @example
 * ```typescript
 * // Minimal backend
 * const backend = defineBackend({
 *   schema,
 *   authentication,
 *   settings: { name: 'my-app' }
 * });
 *
 * // With services
 * const backendWithServices = defineBackend({
 *   schema,
 *   authentication,
 *   settings: { name: 'my-app' },
 *   services: {
 *     reportGenerator: (context) => new ReportGeneratorService(),
 *     dataValidator: singleton(() => new DataValidatorService()),
 *   }
 * });
 * ```
 */
export function defineBackend<
  TSchema extends { schema: Record<string, any> },
  TAuth extends AuthDefinition,
  TServices extends Record<string, any> = {},
>(config: BackendConfig<TSchema, TAuth, TServices>): BackendObject<TSchema, TAuth, TServices> {
  // Validate input
  if (!config.schema) {
    throw new Error('Backend config.schema is required');
  }

  if (!config.settings) {
    throw new Error('Backend config.settings is required');
  }

  // Detect or use specified environment
  // Check both config.environment and config.settings.environment
  const environmentInput = config.environment || config.settings.environment;
  const environment = normalizeEnvironment(environmentInput) || detectEnvironment();

  // Resolve settings with defaults
  const resolvedSettings = resolveSettings(config.settings, environment);

  // Create metadata
  const metadata = createMetadata(
    config.schema,
    config.authentication,
    environment,
    resolvedSettings.features
  );

  // Create attachment storage
  const attachments = new Map<string, any>();

  // Create service factory registry
  const serviceFactories = new Map<string, ServiceFactory<any>>();
  if (config.services) {
    for (const [name, factory] of Object.entries(config.services)) {
      serviceFactories.set(name, factory as ServiceFactory<any>);
    }
  }

  // Create backend reference for attachment points
  // This is a minimal reference object that satisfies BackendObjectRef
  const backendRef: BackendObjectRef = {
    _attachments: attachments,
  };

  // Create infrastructure attachment points with real implementation
  const storage = {
    account: createBackendAttachmentPoint(backendRef, 'storage.account', {}),
    database: createBackendAttachmentPoint(backendRef, 'storage.database', {}),
    blobs: createBackendAttachmentPoint(backendRef, 'storage.blobs', {}),
  };

  const compute = {
    functionApp: createBackendAttachmentPoint(backendRef, 'compute.functionApp', {}),
  };

  // Optional components based on feature flags
  const network = resolvedSettings.features.networking
    ? {
        vnet: createBackendAttachmentPoint(backendRef, 'network.vnet', {}),
        primary: createBackendAttachmentPoint(backendRef, 'network.primary', {}),
        firewall: createBackendAttachmentPoint(backendRef, 'network.firewall', {}),
        waf: createBackendAttachmentPoint(backendRef, 'network.waf', {}),
        ddos: createBackendAttachmentPoint(backendRef, 'network.ddos', {}),
      }
    : undefined;

  const monitoring = resolvedSettings.features.monitoring
    ? {
        appInsights: createBackendAttachmentPoint(backendRef, 'monitoring.appInsights', {}),
        insights: createBackendAttachmentPoint(backendRef, 'monitoring.insights', {}),
        logAnalytics: createBackendAttachmentPoint(backendRef, 'monitoring.logAnalytics', {}),
        logs: createBackendAttachmentPoint(backendRef, 'monitoring.logs', {}),
        alerts: createBackendAttachmentPoint(backendRef, 'monitoring.alerts', {}),
        diagnostics: createBackendAttachmentPoint(backendRef, 'monitoring.diagnostics', {}),
        metrics: createBackendAttachmentPoint(backendRef, 'monitoring.metrics', {}),
        tracing: createBackendAttachmentPoint(backendRef, 'monitoring.tracing', {}),
        queryPacks: createBackendAttachmentPoint(backendRef, 'monitoring.queryPacks', {}),
      }
    : undefined;

  const performance = resolvedSettings.features.performance
    ? {
        cdn: createBackendAttachmentPoint(backendRef, 'performance.cdn', {}),
        cache: createBackendAttachmentPoint(backendRef, 'performance.cache', {}),
        rateLimit: createBackendAttachmentPoint(backendRef, 'performance.rateLimit', {}),
        compression: createBackendAttachmentPoint(backendRef, 'performance.compression', {}),
      }
    : undefined;

  // Schema-specific attachment points (placeholder for Task 8)
  const models: Record<string, any> = {};
  for (const modelName of Object.keys(config.schema.models)) {
    models[modelName] = {
      // Will be populated by Devon-Backend-2 in Task 8
      _placeholder: true,
    };
  }

  // Expose schema models directly on schema object for easy access
  // This enables: backend.schema.User, backend.schema.DataUploaded, etc.
  const schemaWithModels = Object.assign({}, config.schema);
  for (const [modelName, modelBuilder] of Object.entries(config.schema.models)) {
    (schemaWithModels as any)[modelName] = {
      ...modelBuilder,
      // Add attachment points for model-specific customizations
      queue: createBackendAttachmentPoint(backendRef, `schema.${modelName}.queue`, {}),
      function: createBackendAttachmentPoint(backendRef, `schema.${modelName}.function`, {}),
      container: createBackendAttachmentPoint(backendRef, `schema.${modelName}.container`, {}),
      // Type inference helpers
      $inferType: undefined as any,
      $inferCreateInput: undefined as any,
      $inferUpdateInput: undefined as any,
      $inferInput: undefined as any,
      $inferOutput: undefined as any,
    };
  }

  // Construct backend object
  const backend: BackendObject<TSchema, TAuth, TServices> = {
    // Original inputs - use enhanced schema with model accessors
    schema: schemaWithModels as any,
    authentication: config.authentication,
    settings: resolvedSettings,
    environment,

    // Infrastructure attachment points
    storage,
    compute,
    network,
    monitoring,
    performance,

    // Schema-specific attachment points
    models,

    // Metadata and internal state
    _metadata: metadata,
    _attachments: attachments,
    _defaults: {
      // Will be populated by Devon-Backend-3, 4, 5 in Tasks 4-6
    },
    _serviceFactories: serviceFactories,
  };

  return backend;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if an object is a BackendObject
 *
 * @param obj - Object to check
 * @returns True if object is a BackendObject
 */
export function isBackendObject(obj: any): obj is BackendObject {
  return Boolean(
    obj &&
      typeof obj === 'object' &&
      '_metadata' in obj &&
      obj._metadata?.version === BACKEND_API_VERSION &&
      'schema' in obj &&
      'settings' in obj &&
      'environment' in obj
  );
}

/**
 * Get backend metadata
 *
 * @param backend - Backend object
 * @returns Backend metadata
 */
export function getBackendMetadata<
  TSchema extends { schema: Record<string, any> },
  TAuth extends AuthDefinition,
>(backend: BackendObject<TSchema, TAuth>): BackendMetadata {
  return backend._metadata;
}

/**
 * Get enabled features for a backend
 *
 * @param backend - Backend object
 * @returns Array of enabled feature names
 */
export function getEnabledFeatures<
  TSchema extends { schema: Record<string, any> },
  TAuth extends AuthDefinition,
>(backend: BackendObject<TSchema, TAuth>): string[] {
  return backend._metadata.enabledFeatures;
}

/**
 * Check if a specific feature is enabled
 *
 * @param backend - Backend object
 * @param feature - Feature name
 * @returns True if feature is enabled
 */
export function isFeatureEnabled<
  TSchema extends { schema: Record<string, any> },
  TAuth extends AuthDefinition,
>(
  backend: BackendObject<TSchema, TAuth>,
  feature: 'monitoring' | 'networking' | 'performance'
): boolean {
  return backend.settings.features[feature];
}
