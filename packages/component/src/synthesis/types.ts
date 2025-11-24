/**
 * Type Definitions for Backend Synthesis
 *
 * This module provides the core type definitions for the synthesis orchestration layer,
 * which transforms backend configurations into deployable Azure ARM templates and
 * generated code artifacts.
 *
 * @module @atakora/component/synthesis/types
 */

import type { BackendObject, Environment } from '../backend/types';

// Import CDK construct interfaces for proper typing
import type { IConstruct } from '@atakora/lib';

// Re-export data synthesizer types for convenience
export type {
  DataSynthesizer,
  SchemaObject,
  CosmosConfiguration,
  ContainerConfiguration,
  IndexingPolicy,
} from './data-synthesizer-types';
export type { DataResources } from './data-synthesizer-types';

// Re-export OpenAPI types for schema generation
export type {
  OpenAPISpec,
  PathsObject,
  PathItemObject,
  OperationObject,
  SchemaObject as OpenAPISchemaObject,
  ComponentsObject,
  RequestBodyObject,
  ResponsesObject,
  ResponseObject,
  ParameterObject,
  SecuritySchemeObject,
  SecurityRequirementObject,
  InfoObject,
  ServerObject,
  TagObject,
} from './openapi-types';

// Re-export API synthesizer types for convenience
export type {
  ApiSynthesizer,
  ApiResources,
  ApiConfiguration,
  ApiOperation,
  PolicyConfiguration,
  RateLimitPolicy,
  AuthenticationPolicy,
  CorsPolicy,
  IpFilterPolicy,
  CachingPolicy,
  BackendDataResources,
} from './api-synthesizer-types';

// Re-export function synthesizer types for convenience
export type {
  FunctionSynthesizer,
  FunctionConfiguration,
  FunctionDefinition,
  FunctionTemplate,
  HttpTriggerConfig,
  CosmosBindingConfig,
} from './function-synthesizer-types';
export type { FunctionResources } from './function-synthesizer-types';

// Re-export schema mapper types for OpenAPI generation
export type {
  SchemaToOpenApiMapper,
  FieldMapper,
  ModelMapper,
  PathGenerator,
  ComponentSchemaDefinition,
  FieldTypeMapping,
  ConstraintMapping,
} from './schema-mapper-types';

// ============================================================================
// ARM Template Types
// ============================================================================

/**
 * ARM template structure
 */
export interface ARMTemplate {
  $schema: string;
  contentVersion: string;
  parameters?: Record<string, ARMParameter>;
  variables?: Record<string, any>;
  resources: ARMResource[];
  outputs?: Record<string, ARMOutput>;
}

/**
 * ARM parameter
 */
export interface ARMParameter {
  type: 'string' | 'secureString' | 'int' | 'bool' | 'object' | 'array';
  defaultValue?: any;
  allowedValues?: any[];
  metadata?: {
    description?: string;
  };
}

/**
 * ARM output
 */
export interface ARMOutput {
  type: 'string' | 'int' | 'bool' | 'object' | 'array';
  value: any;
}

/**
 * ARM resource
 */
export interface ARMResource {
  type: string;
  apiVersion: string;
  name: string;
  location?: string;
  tags?: Record<string, string>;
  properties?: Record<string, any>;
  dependsOn?: string[];
  sku?: {
    name: string;
    tier?: string;
    capacity?: number;
  };
  kind?: string;
  identity?: {
    type: 'SystemAssigned' | 'UserAssigned' | 'SystemAssigned,UserAssigned';
    userAssignedIdentities?: Record<string, any>;
  };
  resources?: ARMResource[];
}

// ============================================================================
// Synthesis Types
// ============================================================================

/**
 * Synthesis result
 *
 * @remarks
 * Complete output of the synthesis process including ARM templates,
 * generated function code, schema files, and metadata.
 *
 * This is the primary return value from {@link IBackendSynthesizer.synthesize}.
 *
 * @example
 * ```typescript
 * const synthesizer = new BackendSynthesizer();
 * const result = await synthesizer.synthesize(backend);
 *
 * // Access ARM template
 * console.log(result.armTemplate);
 *
 * // Access generated functions
 * console.log(result.functions.handlers);
 *
 * // Access OpenAPI schema
 * console.log(result.schemas.openapi);
 *
 * // Check metadata
 * console.log(result.metadata.resourceCount);
 * ```
 */
export interface SynthesisResult {
  /**
   * Generated ARM template
   *
   * @remarks
   * Complete Azure Resource Manager template ready for deployment.
   * Includes all infrastructure resources: Cosmos DB, Functions, Storage,
   * Networking, Monitoring, etc.
   *
   * Can be deployed using Azure CLI, PowerShell, or Azure Portal.
   *
   * @example
   * ```typescript
   * // Deploy via Azure CLI
   * await fs.writeFile('template.json', JSON.stringify(result.armTemplate, null, 2));
   * // az deployment group create --resource-group myapp-rg --template-file template.json
   * ```
   */
  armTemplate: ARMTemplate;

  /**
   * Generated function code package
   *
   * @remarks
   * TypeScript code for Azure Functions including handlers,
   * shared utilities, and configuration files.
   *
   * Ready to be deployed to the Function App specified in the ARM template.
   *
   * @example
   * ```typescript
   * // Write function handlers to disk
   * for (const [name, code] of Object.entries(result.functions.handlers)) {
   *   await fs.writeFile(`src/functions/${name}.ts`, code);
   * }
   * ```
   */
  functions: FunctionPackage;

  /**
   * Generated schema files
   *
   * @remarks
   * Schema artifacts for API documentation and client generation.
   * Includes OpenAPI spec, GraphQL schema, and JSON schemas.
   *
   * @example
   * ```typescript
   * // Write OpenAPI spec
   * if (result.schemas.openapi) {
   *   await fs.writeFile('openapi.json', result.schemas.openapi);
   * }
   * ```
   */
  schemas: SchemaFiles;

  /**
   * Synthesis metadata
   *
   * @remarks
   * Information about the synthesis process including counts,
   * timestamps, and warnings.
   *
   * Useful for debugging and auditing.
   */
  metadata: SynthesisMetadata;

  // ============================================================================
  // Deprecated properties (maintained for backward compatibility)
  // ============================================================================

  /**
   * Generated ARM template
   *
   * @deprecated Use {@link armTemplate} instead
   * @remarks Maintained for backward compatibility with existing code
   */
  template: ARMTemplate;

  /**
   * Synthesis context
   *
   * @deprecated Access via {@link metadata} instead
   * @remarks Maintained for backward compatibility with existing code
   */
  context: SynthesisContext;

  /**
   * Backend analysis
   *
   * @deprecated Access via {@link metadata} instead
   * @remarks Maintained for backward compatibility with existing code
   */
  analysis: BackendAnalysis;

  /**
   * Number of resources generated
   *
   * @deprecated Access via {@link metadata.resourceCount} instead
   * @remarks Maintained for backward compatibility with existing code
   */
  resourceCount: number;
}

/**
 * Synthesis context
 */
export interface SynthesisContext {
  /**
   * Backend being synthesized
   */
  backend: BackendObject;

  /**
   * Backend analysis
   */
  analysis: BackendAnalysis;

  /**
   * Environment
   */
  environment: Environment;

  /**
   * Cloud type
   */
  cloudType: 'commercial' | 'government';

  /**
   * Azure region
   */
  region: string;

  /**
   * Resource group name
   */
  resourceGroup: string;

  /**
   * Resource tags
   */
  tags: Record<string, string>;

  /**
   * Naming configuration for Azure resources
   */
  naming: {
    /** Organization identifier (e.g., 'digitalminion', 'dm') */
    organization: string;
    /** Project/app name */
    project: string;
    /** Environment (dev, staging, prod) */
    environment: string;
    /** Geography code (e.g., 'eus', 'wus2') */
    geography: string;
    /** Instance number (e.g., '01', '02') */
    instance: string;
  };

  /**
   * Enabled features
   */
  features: {
    monitoring: boolean;
    networking: boolean;
    performance: boolean;
  };
}

/**
 * Backend analysis
 */
export interface BackendAnalysis {
  /**
   * Discovered models by type
   */
  models: {
    crud: ModelInfo[];
    event: ModelInfo[];
    function: ModelInfo[];
  };

  /**
   * Discovered attachments by category
   */
  attachments: {
    storage: AttachmentInfo[];
    compute: AttachmentInfo[];
    networking: AttachmentInfo[];
    monitoring: AttachmentInfo[];
    performance: AttachmentInfo[];
  };

  /**
   * Feature flags
   */
  features: {
    monitoring: boolean;
    networking: boolean;
    performance: boolean;
  };

  /**
   * Resource dependencies
   */
  dependencies: Map<string, string[]>;
}

/**
 * Model information
 */
export interface ModelInfo {
  name: string;
  type: 'crud' | 'event' | 'function';
  definition: any;
}

/**
 * Attachment information
 */
export interface AttachmentInfo {
  path: string;
  category: 'storage' | 'compute' | 'networking' | 'monitoring' | 'performance';
  config: any;
}

// ============================================================================
// Resource Configuration Types
// ============================================================================

/**
 * Cosmos DB configuration
 */
export interface CosmosDBConfig {
  accountName?: string;
  databaseName?: string;
  consistencyLevel?: 'Eventual' | 'Session' | 'BoundedStaleness' | 'Strong' | 'ConsistentPrefix';
  throughput?: number;
  maxThroughput?: number;
  enableAutoscale?: boolean;
  enableMultiRegion?: boolean;
  locations?: string[];
  enableAnalyticalStorage?: boolean;
}

/**
 * Function App configuration
 */
export interface FunctionAppConfig {
  name?: string;
  runtime?: 'node' | 'python' | 'dotnet' | 'java';
  runtimeVersion?: string;
  sku?: 'Y1' | 'EP1' | 'EP2' | 'EP3';
  alwaysOn?: boolean;
  cors?: {
    allowedOrigins: string[];
    supportCredentials?: boolean;
  };
  appSettings?: Record<string, string>;
}

/**
 * Storage Account configuration
 */
export interface StorageAccountConfig {
  name?: string;
  sku?: 'Standard_LRS' | 'Standard_GRS' | 'Standard_RAGRS' | 'Premium_LRS';
  kind?: 'StorageV2' | 'BlobStorage';
  accessTier?: 'Hot' | 'Cool';
  enableHttpsOnly?: boolean;
  enableBlobPublicAccess?: boolean;
}

/**
 * Application Insights configuration
 */
export interface AppInsightsConfig {
  name?: string;
  applicationType?: 'web' | 'other';
  retentionInDays?: number;
  samplingPercentage?: number;
  disableIpMasking?: boolean;
}

/**
 * Virtual Network configuration
 */
export interface VNetConfig {
  name?: string;
  addressPrefix?: string;
  subnets?: Array<{
    name: string;
    addressPrefix: string;
    serviceEndpoints?: string[];
  }>;
  enableDdosProtection?: boolean;
}

// ============================================================================
// Synthesis Orchestration Interfaces
// ============================================================================

/**
 * Options for backend synthesis
 *
 * @remarks
 * Controls synthesis behavior including output format, validation, and environment overrides.
 */
export interface SynthesisOptions {
  /**
   * Output directory for generated templates and artifacts
   *
   * @remarks
   * If not specified, synthesis returns results in-memory only.
   */
  outputDir?: string;

  /**
   * Whether to validate template after generation
   *
   * @default true
   *
   * @remarks
   * Enables ARM template schema validation and Azure naming convention checks.
   */
  validate?: boolean;

  /**
   * Whether to pretty-print generated JSON files
   *
   * @default true
   *
   * @remarks
   * When true, JSON output is formatted with 2-space indentation for readability.
   */
  prettyPrint?: boolean;

  /**
   * Environment override for synthesis
   *
   * @remarks
   * If not specified, uses the environment from the backend configuration.
   * This allows generating production templates from a development environment.
   */
  environment?: Environment;
}

/**
 * Backend Synthesizer Interface
 *
 * @remarks
 * Defines the contract for backend synthesis orchestration. Implementations
 * are responsible for:
 * - Analyzing backend structure (models, attachments, features)
 * - Creating synthesis context (naming, dependencies, environment)
 * - Orchestrating resource synthesis (data, API, compute)
 * - Generating ARM templates
 * - Producing function code packages
 * - Creating schema artifacts (OpenAPI, GraphQL)
 *
 * The synthesizer coordinates multiple specialized synthesizers:
 * - DataSynthesizer: Cosmos DB resources
 * - ApiSynthesizer: API Management resources
 * - FunctionSynthesizer: Azure Functions resources
 *
 * @example
 * Basic synthesis:
 * ```typescript
 * const synthesizer = new BackendSynthesizer();
 * const result = await synthesizer.synthesize(backend);
 * console.log(result.template);
 * ```
 *
 * @example
 * Synthesis with options:
 * ```typescript
 * const result = await synthesizer.synthesize(backend, {
 *   outputDir: './output',
 *   validate: true,
 *   environment: 'production',
 * });
 * ```
 */
export interface IBackendSynthesizer {
  /**
   * Synthesize backend to deployable artifacts
   *
   * @param backend - Backend object to synthesize
   * @param options - Synthesis options
   * @returns Synthesis result with ARM template, function code, and schemas
   *
   * @throws {Error} If synthesis fails at any phase
   *
   * @remarks
   * Orchestrates the complete synthesis pipeline:
   * 1. Analyze backend structure
   * 2. Create synthesis context
   * 3. Validate attachments
   * 4. Synthesize resources (data, API, compute)
   * 5. Generate ARM template
   * 6. Generate function code packages
   * 7. Generate schema files
   * 8. Validate outputs
   */
  synthesize(
    backend: BackendObject,
    options?: SynthesisOptions
  ): Promise<SynthesisResult>;
}

// ============================================================================
// Specialized Resource Types
// ============================================================================

/**
 * Data layer resources (legacy ARM resource format)
 *
 * @deprecated Use DataResources from data-synthesizer-types.ts instead
 *
 * @remarks
 * This interface represents the legacy ARM resource format for data resources.
 * It is maintained for backward compatibility with existing code.
 *
 * New code should use the DataResources type from data-synthesizer-types.ts,
 * which uses CDK constructs instead of raw ARM resources.
 *
 * @example
 * ```typescript
 * const dataResources: DataResources = {
 *   cosmosAccount: {
 *     type: 'Microsoft.DocumentDB/databaseAccounts',
 *     name: 'myapp-cosmos-prod-eus-01',
 *     // ... ARM properties
 *   },
 *   database: {
 *     type: 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases',
 *     name: 'myapp-cosmos-prod-eus-01/myapp',
 *     // ... ARM properties
 *   },
 *   containers: [
 *     {
 *       type: 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers',
 *       name: 'myapp-cosmos-prod-eus-01/myapp/users',
 *       // ... ARM properties
 *     }
 *   ]
 * };
 * ```
 */
export interface LegacyDataResources {
  /**
   * Cosmos DB account resource
   *
   * @remarks
   * Top-level database account that hosts all databases and containers.
   * Configured with consistency level, replication, and failover settings.
   */
  cosmosAccount: ARMResource;

  /**
   * Cosmos DB database resource
   *
   * @remarks
   * Logical database container within the Cosmos DB account.
   * Configured with throughput settings (manual or autoscale).
   */
  database: ARMResource;

  /**
   * Cosmos DB container resources
   *
   * @remarks
   * One container per CRUD model in the schema.
   * Each container has its own partition key and indexing policy.
   */
  containers: ARMResource[];
}

// ApiResources is now defined in api-synthesizer-types.ts and re-exported above
// This placeholder has been replaced with the full implementation

/**
 * Compute layer resources (legacy ARM resource format)
 *
 * @deprecated Use FunctionResources from function-synthesizer-types.ts instead
 *
 * @remarks
 * This interface represents the legacy ARM resource format for function resources.
 * It is maintained for backward compatibility with existing code.
 *
 * New code should use the FunctionResources type from function-synthesizer-types.ts,
 * which uses CDK constructs (ISite, IServerFarm) instead of raw ARM resources.
 *
 * **Migration Guide:**
 * - Replace `ARMResource` with CDK construct interfaces
 * - Use `ISite` for functionApp (from @atakora/cdk/web)
 * - Use `IServerFarm` for appServicePlan (from @atakora/cdk/web)
 * - Use `FunctionDefinition[]` for functions (from function-synthesizer-types.ts)
 *
 * @example
 * Old (deprecated):
 * ```typescript
 * const functionResources: FunctionResources = {
 *   functionApp: { type: 'Microsoft.Web/sites', ... },
 *   appServicePlan: { type: 'Microsoft.Web/serverfarms', ... },
 *   functions: [{ name: 'create-user', ... }]
 * };
 * ```
 *
 * New (recommended):
 * ```typescript
 * import { FunctionResources } from './function-synthesizer-types';
 *
 * const functionResources: FunctionResources = {
 *   functionApp: functionAppSite,  // ISite construct
 *   appServicePlan: plan,           // IServerFarm construct
 *   functions: [functionDef]        // FunctionDefinition[]
 * };
 * ```
 */
export interface LegacyFunctionResources {
  /**
   * Function App resource (legacy ARM format)
   *
   * @deprecated Use ISite from @atakora/cdk/web instead
   */
  functionApp: ARMResource;

  /**
   * App Service Plan resource (legacy ARM format)
   *
   * @deprecated Use IServerFarm from @atakora/cdk/web instead
   */
  appServicePlan: ARMResource;

  /**
   * Individual function configurations (legacy format)
   *
   * @deprecated Use FunctionDefinition[] from function-synthesizer-types.ts instead
   */
  functions: FunctionMetadata[];
}

/**
 * Function metadata (legacy format)
 *
 * @deprecated Use FunctionDefinition from function-synthesizer-types.ts instead
 *
 * @remarks
 * This interface represents the legacy format for function metadata.
 * It is maintained for backward compatibility with existing code.
 *
 * New code should use the FunctionDefinition type from function-synthesizer-types.ts,
 * which provides a richer type system with proper configuration types.
 *
 * **Migration Guide:**
 * - Replace `FunctionMetadata` with `FunctionDefinition`
 * - Use typed `type` field instead of `trigger` string
 * - Use `HttpTriggerConfig` instead of loose method/route properties
 * - Use `CosmosBindingConfig` for Cosmos DB integration
 * - Use `FunctionTemplate` for code generation
 */
export interface FunctionMetadata {
  /**
   * Function name (URL path component)
   */
  name: string;

  /**
   * Handler file path
   *
   * @example 'src/functions/create-user.handler'
   */
  handler: string;

  /**
   * Trigger type
   *
   * @remarks
   * - http: HTTP triggered function (API endpoints)
   * - queue: Queue triggered function (event processing)
   * - timer: Timer triggered function (scheduled jobs)
   */
  trigger: 'http' | 'queue' | 'timer';

  /**
   * HTTP method for HTTP triggered functions
   */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

  /**
   * URL route for HTTP triggered functions
   */
  route?: string;

  /**
   * Function bindings configuration
   *
   * @remarks
   * Additional input/output bindings (Cosmos DB, Service Bus, etc.)
   */
  bindings?: Array<{
    type: string;
    direction: 'in' | 'out';
    name: string;
    [key: string]: any;
  }>;
}

/**
 * Function code package
 *
 * @remarks
 * Generated TypeScript code for Azure Functions deployment.
 * Includes function handlers, shared utilities, and package.json.
 */
export interface FunctionPackage {
  /**
   * Generated function handler files
   *
   * @remarks
   * Maps function name to TypeScript handler code.
   *
   * @example
   * ```typescript
   * {
   *   'create-user': 'export const handler = async (context, req) => { ... }',
   *   'get-user': 'export const handler = async (context, req) => { ... }',
   * }
   * ```
   */
  handlers: Record<string, string>;

  /**
   * Generated shared utilities
   *
   * @remarks
   * Common code shared across functions (validation, auth, database clients).
   */
  shared: Record<string, string>;

  /**
   * Generated package.json
   *
   * @remarks
   * Includes runtime dependencies and build configuration.
   */
  packageJson: string;

  /**
   * Generated tsconfig.json
   *
   * @remarks
   * TypeScript compiler configuration for function code.
   */
  tsConfig: string;
}

/**
 * Schema files
 *
 * @remarks
 * Generated schema artifacts for API documentation and client generation.
 */
export interface SchemaFiles {
  /**
   * OpenAPI 3.0 specification
   *
   * @remarks
   * Generated from schema models and function models.
   * Used for API documentation and client SDK generation.
   */
  openapi?: string;

  /**
   * GraphQL schema definition
   *
   * @remarks
   * Generated from CRUD models if GraphQL is enabled.
   */
  graphql?: string;

  /**
   * JSON Schema definitions
   *
   * @remarks
   * Generated for each model for validation and documentation.
   */
  jsonSchemas?: Record<string, string>;
}

/**
 * Synthesis metadata
 *
 * @remarks
 * Information about the synthesis process and generated artifacts.
 * Used for debugging, auditing, and tooling integration.
 */
export interface SynthesisMetadata {
  /**
   * Synthesis timestamp
   */
  synthesizedAt: Date;

  /**
   * Synthesis version (component package version)
   */
  version: string;

  /**
   * Backend name
   */
  backendName: string;

  /**
   * Target environment
   */
  environment: Environment;

  /**
   * Target Azure region
   */
  region: string;

  /**
   * Number of resources generated
   */
  resourceCount: number;

  /**
   * Number of functions generated
   */
  functionCount: number;

  /**
   * Number of models synthesized
   */
  modelCount: number;

  /**
   * Enabled features
   */
  features: {
    monitoring: boolean;
    networking: boolean;
    performance: boolean;
  };

  /**
   * Synthesis warnings
   *
   * @remarks
   * Non-fatal issues encountered during synthesis.
   */
  warnings?: string[];
}
