/**
 * Core synthesis types and interfaces for ARM template generation
 */

/**
 * ARM template structure
 */
export interface ArmTemplate {
  $schema: string;
  contentVersion: string;
  parameters?: Record<string, ArmParameter>;
  variables?: Record<string, any>;
  resources: ArmResource[];
  outputs?: Record<string, ArmOutput>;
}

/**
 * ARM resource definition
 */
export interface ArmResource {
  type: string;
  apiVersion: string;
  name: string;
  location?: string;
  tags?: Record<string, string>;
  dependsOn?: string[];
  properties?: Record<string, any>;
  sku?: {
    name: string;
    tier?: string;
    capacity?: number;
  };
  kind?: string;
  identity?: {
    type: string;
    userAssignedIdentities?: Record<string, any>;
  };
  [key: string]: any;
}

/**
 * ARM parameter definition
 */
export interface ArmParameter {
  type: 'string' | 'int' | 'bool' | 'object' | 'array' | 'secureString' | 'secureObject';
  defaultValue?: any;
  allowedValues?: any[];
  minValue?: number;
  maxValue?: number;
  minLength?: number;
  maxLength?: number;
  metadata?: {
    description?: string;
  };
}

/**
 * ARM output definition
 */
export interface ArmOutput {
  type: 'string' | 'int' | 'bool' | 'object' | 'array';
  value: any;
  metadata?: {
    description?: string;
  };
}

/**
 * Stack manifest containing stack metadata
 */
export interface StackManifest {
  name: string;
  templatePath: string;
  resourceCount: number;
  parameterCount: number;
  outputCount: number;
  dependencies: string[];
}

/**
 * Cloud assembly containing all synthesized artifacts
 */
export interface CloudAssembly {
  version: string;
  stacks: Record<string, StackManifest>;
  directory: string;
}

/**
 * Synthesis options
 */
export interface SynthesisOptions {
  /**
   * Output directory for synthesized templates
   */
  outdir: string;

  /**
   * Skip validation during synthesis
   */
  skipValidation?: boolean;

  /**
   * Pretty-print JSON output
   */
  prettyPrint?: boolean;

  /**
   * Treat warnings as errors
   */
  strict?: boolean;

  /**
   * Enable linked templates (always true in v2).
   * Linked templates split large ARM templates across multiple files.
   *
   * @default true
   */
  enableLinkedTemplates?: boolean;

  /**
   * Maximum template size before splitting.
   * Azure ARM template limit is 4MB, but we use 3MB default to leave buffer.
   *
   * Constraints:
   * - Must be less than 4MB (Azure's hard limit)
   * - Recommended: 2.5-3.5MB for safety margin
   *
   * @default 3145728 (3MB)
   * @example 3145728 // 3MB in bytes
   */
  maxTemplateSize?: number;
}

/**
 * Validation severity levels
 */
export enum ValidationSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

/**
 * Validation error details
 */
export interface ValidationError {
  severity: ValidationSeverity;
  message: string;
  path?: string;
  code?: string;
  suggestion?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// ============================================================================
// Context-Aware Synthesis: Resource Metadata
// ============================================================================

/**
 * Lightweight metadata for resource template assignment decisions.
 *
 * This interface represents the first phase of context-aware synthesis, where
 * resources provide metadata WITHOUT generating full ARM templates. The metadata
 * is used to make intelligent template assignment decisions before ARM generation.
 *
 * Design Philosophy:
 * - Lightweight: Only essential information for template splitting
 * - Fast: No expensive ARM JSON generation during metadata collection
 * - Context-free: Metadata collection happens before template assignment
 * - Extensible: Metadata object allows resource-specific hints
 *
 * Usage in Synthesis Pipeline:
 * 1. Phase 1: Resources generate metadata via `toMetadata()`
 * 2. Phase 2: TemplateSplitter uses metadata to assign templates
 * 3. Phase 3: Resources generate ARM with context via `toArmTemplate(context)`
 *
 * @see ADR-018: Context-Aware Synthesis Pipeline Refactoring
 * @see docs/design/architecture/synthesis-refactor-implementation-spec.md
 *
 * @example Basic resource metadata
 * ```typescript
 * const metadata: ResourceMetadata = {
 *   id: 'storageAccount1',
 *   type: 'Microsoft.Storage/storageAccounts',
 *   name: 'mystorageaccount',
 *   dependencies: [],
 *   sizeEstimate: 1500,
 *   templatePreference: 'foundation'
 * };
 * ```
 *
 * @example Function App with dependencies and co-location requirements
 * ```typescript
 * const metadata: ResourceMetadata = {
 *   id: 'functionApp1',
 *   type: 'Microsoft.Web/sites',
 *   name: 'my-function-app',
 *   dependencies: ['storageAccount1', 'appInsights1'],
 *   sizeEstimate: 2500,
 *   requiresSameTemplate: ['functionApp1/config/appsettings'],
 *   templatePreference: 'compute',
 *   metadata: {
 *     hasLargeInlineContent: true,
 *     isHighlyReferenced: true
 *   }
 * };
 * ```
 */
export interface ResourceMetadata {
  /**
   * Unique identifier for this resource instance within the deployment.
   *
   * This ID is used throughout the synthesis pipeline to:
   * - Track resource relationships and dependencies
   * - Map resources to assigned templates
   * - Generate cross-template references
   * - Correlate metadata with ARM resources
   *
   * Format: Typically the construct ID or a combination of construct path components.
   * Must be unique across the entire deployment.
   *
   * @example "storageAccount1"
   * @example "functionApp-production"
   * @example "cosmosDb-users"
   */
  readonly id: string;

  /**
   * ARM resource type identifier.
   *
   * This is the fully qualified Azure resource type as it appears in ARM templates.
   * Used for:
   * - Resource type-based grouping strategies
   * - Tier assignment (foundation, compute, application, configuration)
   * - Affinity group determination
   * - ARM template validation
   *
   * Format: {Provider}/{ResourceType}[/{SubResourceType}]
   *
   * @example "Microsoft.Storage/storageAccounts"
   * @example "Microsoft.Web/sites"
   * @example "Microsoft.Web/sites/functions"
   * @example "Microsoft.DocumentDB/databaseAccounts"
   */
  readonly type: string;

  /**
   * Resource name as it will appear in the ARM template.
   *
   * This is the actual Azure resource name (not the construct ID).
   * Must conform to Azure naming conventions for the resource type.
   * Used for:
   * - ARM resource name generation
   * - resourceId() function calls
   * - Output name generation
   * - Debugging and logging
   *
   * Naming constraints vary by resource type. Common rules:
   * - Lowercase letters, numbers, hyphens
   * - Must start with letter
   * - Length limits (typically 3-24 or 3-63 characters)
   * - Globally unique for some types (Storage, Cosmos DB)
   *
   * @example "mystorageaccount"
   * @example "my-function-app-prod"
   * @example "cosmosdb-users-eastus2"
   */
  readonly name: string;

  /**
   * Array of resource IDs this resource depends on.
   *
   * Represents the dependency graph edges from this resource to others.
   * Used for:
   * - Template splitting decisions (minimize cross-template dependencies)
   * - Deployment ordering (ARM dependsOn)
   * - Identifying must-colocate scenarios
   * - Detecting circular dependencies
   *
   * Dependencies should include:
   * - Resources referenced in properties (e.g., storage account ID in function app settings)
   * - Resources required for deployment (e.g., VNet for subnet injection)
   * - Resources with logical dependencies (e.g., database before application)
   *
   * Format: Array of resource IDs matching the `id` field of other ResourceMetadata objects
   *
   * @example []  // No dependencies (foundation resource)
   * @example ["storageAccount1"]  // Function app depends on storage
   * @example ["vnet1", "subnet1", "nsg1"]  // Multiple infrastructure dependencies
   */
  readonly dependencies: string[];

  /**
   * Estimated size of this resource's ARM JSON representation in bytes.
   *
   * Used for template size-based splitting to stay under Azure's 4MB limit.
   * Estimate should include:
   * - Base resource structure (~500 bytes)
   * - Properties object
   * - Inline code/content (if any)
   * - Nested resources
   * - Name and type strings
   *
   * Estimation strategies:
   * - Simple resources: 500-1500 bytes
   * - Resources with inline content: measure content + 500 base
   * - Complex resources: 2000-5000 bytes
   * - Resources with large arrays: count * item_size + base
   *
   * Note: This is an estimate for planning, not exact measurement.
   * Actual JSON may vary by ±20% after serialization.
   *
   * @example 1200  // Simple storage account
   * @example 50000  // Function app with inline code
   * @example 800  // RBAC role assignment
   */
  readonly sizeEstimate: number;

  /**
   * Array of resource IDs that MUST be deployed in the same template.
   *
   * Defines hard co-location constraints for resources that cannot be split
   * across templates due to:
   * - Parent-child relationships (e.g., Storage Account + Blob Containers)
   * - Tight coupling (e.g., Function App + its config/appsettings)
   * - ARM limitations (e.g., nested resources must stay with parent)
   * - Atomic deployment requirements (e.g., all functions for one app)
   *
   * The template splitter will respect these constraints and keep these
   * resources together even if it means exceeding soft size limits.
   *
   * Format: Array of resource IDs that must be in the same template as this resource
   *
   * @example undefined  // No co-location requirements (most resources)
   * @example ["functionApp1/config/appsettings", "functionApp1/config/connectionstrings"]
   * @example ["storageAccount1/blobServices", "storageAccount1/fileServices"]
   */
  readonly requiresSameTemplate?: string[];

  /**
   * Hint for template placement preference during template splitting.
   *
   * Provides guidance to the template splitter about where this resource
   * should ideally be placed. Used for:
   * - Tier-based grouping (foundation, compute, application, security, data)
   * - Main vs linked template decisions
   * - Deployment ordering optimization
   *
   * Values:
   * - foundation: Base infrastructure (Storage, Cosmos DB, VNets, Key Vault)
   * - compute: Compute resources (Function Apps, App Service Plans)
   * - application: Application layer (Function definitions, API Management)
   * - security: Security resources (Key Vault, RBAC assignments)
   * - data: Data resources (Cosmos DB, SQL Database)
   * - any: No preference, place wherever appropriate
   *
   * Note: This is a hint, not a requirement. The template splitter may override
   * based on size constraints or dependency optimization.
   *
   * @example "foundation"  // Storage account should go in foundation template
   * @example "compute"  // Function app should go in compute template
   * @example "any"  // RBAC assignment can go anywhere
   */
  readonly templatePreference?: 'foundation' | 'compute' | 'application' | 'security' | 'data' | 'any';

  /**
   * Resource-specific metadata for assignment decisions and optimization.
   *
   * Extensible metadata object that allows resources to provide additional
   * information to inform template splitting and deployment decisions.
   *
   * Common metadata fields:
   * - hasLargeInlineContent: Resource contains large inline code/config
   * - isHighlyReferenced: Many other resources depend on this one
   * - assignmentHints: Custom hints for specific splitting strategies
   *
   * This object can be extended by resource types without breaking the interface.
   * The template splitter and other tools can check for known fields and use
   * them to make better decisions.
   *
   * @example undefined  // No special metadata (most resources)
   * @example { hasLargeInlineContent: true }  // Function with large code bundle
   * @example { isHighlyReferenced: true }  // Storage account used by many functions
   * @example { assignmentHints: { preferLinked: true } }  // Custom hint
   */
  readonly metadata?: {
    /**
     * True if this resource generates large inline content (code, config, etc.).
     * Influences template splitting to avoid size limit issues.
     *
     * Examples:
     * - Function apps with inline code (>10KB)
     * - Custom script extensions with large scripts
     * - Resources with embedded JSON/XML configuration
     *
     * @example true  // Function app with 50KB of inline code
     */
    readonly hasLargeInlineContent?: boolean;

    /**
     * True if this resource is frequently referenced by other resources.
     * Influences placement to minimize cross-template references.
     *
     * Examples:
     * - Storage accounts used by multiple function apps
     * - VNets with many subnets
     * - Key Vaults accessed by multiple services
     *
     * @example true  // Storage account referenced by 5 function apps
     */
    readonly isHighlyReferenced?: boolean;

    /**
     * Custom hints for template assignment strategies.
     * Allows resources to influence splitting decisions with custom logic.
     *
     * Format: Free-form key-value pairs interpreted by splitting strategies
     *
     * @example { preferLinked: true, groupWith: "api-resources" }
     */
    readonly assignmentHints?: Record<string, any>;
  };
}

// ============================================================================
// Context-Aware Synthesis: Template Assignments
// ============================================================================
// This section implements the type system for Phase 2 of the synthesis
// refactoring: context-aware template assignments.
//
// The TemplateAssignments type system describes how resources are assigned to
// templates and tracks cross-template dependencies. This is the bridge between
// Phase 1 (ResourceMetadata collection) and Phase 3 (ARM generation with context).
//
// See: docs/design/architecture/adr-018-synthesis-pipeline-refactoring.md
// See: docs/design/architecture/synthesis-refactor-implementation-spec.md

/**
 * Metadata about a template in the assignment.
 * Contains information about the template's size, resources, and dependencies.
 *
 * Used by:
 * - Template assignment phase to track template sizes
 * - SynthesisContext to provide template information during ARM generation
 * - Deployment orchestration to determine deployment order
 *
 * @example
 * ```typescript
 * const metadata: TemplateMetadata = {
 *   fileName: 'Foundation-storage.json',
 *   estimatedSize: 2048000, // 2MB
 *   resourceCount: 12,
 *   isMain: false,
 *   tier: ResourceTier.Foundation,
 *   resources: [
 *     'Microsoft.Storage/storageAccounts/mystorage',
 *     'Microsoft.Storage/storageAccounts/mystorage/blobServices/default'
 *   ],
 *   uri: 'https://statakora.blob.core.windows.net/templates/Foundation-storage.json',
 *   parameters: new Set(['location', 'environmentName']),
 *   outputs: new Set(['storageAccountId', 'storageAccountName', 'storageEndpoint'])
 * };
 * ```
 */
export interface TemplateMetadata {
  /**
   * Template file name.
   * For main template: typically "{StackName}.json"
   * For linked templates: typically "{StackName}-{tier}-{category}.json"
   *
   * @example "Foundation.json"
   * @example "Foundation-storage.json"
   * @example "Application-compute-functions.json"
   */
  readonly fileName: string;

  /**
   * Estimated template size in bytes (UTF-8 encoded JSON).
   * Updated as resources are assigned to the template.
   *
   * Constraints:
   * - Must be less than 4MB (4,194,304 bytes)
   * - Target: 2-3.5MB for safety margin
   *
   * @example 2048000 // 2MB
   */
  readonly estimatedSize: number;

  /**
   * Number of ARM resources in this template.
   * Includes all resource types (storage, compute, config, etc.).
   *
   * @example 12
   */
  readonly resourceCount: number;

  /**
   * Whether this is the main/root template.
   * Main template orchestrates linked templates if they exist.
   *
   * @example true  // Main template
   * @example false // Linked template
   */
  readonly isMain: boolean;

  /**
   * Resource tier this template belongs to.
   * Determines deployment order and grouping strategy.
   * Only applicable for linked templates (undefined for main template).
   *
   * @example ResourceTier.Foundation
   * @example ResourceTier.Compute
   */
  readonly tier?: string;

  /**
   * Resource IDs assigned to this template.
   * Used to track which resources belong to this template.
   *
   * @example [
   *   "Microsoft.Storage/storageAccounts/mystorage",
   *   "Microsoft.Storage/storageAccounts/mystorage/blobServices/default"
   * ]
   */
  readonly resources: readonly string[];

  /**
   * Template URI for linked deployments.
   * Only populated for linked templates during deployment.
   * Format: {storageEndpoint}/{container}/{fileName}{sasToken}
   *
   * @example "https://statakora.blob.core.windows.net/templates/Foundation-storage.json?sv=..."
   */
  readonly uri?: string;

  /**
   * Parameters defined in this template.
   * Used by SynthesisContext to validate parameter references.
   *
   * @example new Set(["location", "environmentName", "storageAccountSku"])
   */
  readonly parameters?: ReadonlySet<string>;

  /**
   * Outputs defined in this template.
   * Used for cross-template references in linked deployments.
   *
   * @example new Set(["storageAccountId", "storageAccountName", "storageEndpoint"])
   */
  readonly outputs?: ReadonlySet<string>;
}

/**
 * Placement information for a single resource.
 * Describes where a resource is assigned and any special considerations.
 *
 * Used by:
 * - Template assignment algorithm to track placement decisions
 * - SynthesisContext to provide resource-specific context during ARM generation
 * - Debugging and diagnostics to understand assignment decisions
 *
 * @example
 * ```typescript
 * const placement: ResourcePlacement = {
 *   resourceId: 'Microsoft.Storage/storageAccounts/mystorage',
 *   templateName: 'Foundation-storage.json',
 *   tier: 'foundation',
 *   assignmentReason: 'foundation-tier-assignment',
 *   colocatedWith: [
 *     'Microsoft.Storage/storageAccounts/mystorage/blobServices/default',
 *     'Microsoft.Storage/storageAccounts/mystorage/blobServices/default/containers/functions'
 *   ],
 *   crossTemplateReferences: [
 *     { targetResource: 'Microsoft.Web/sites/myfunctionapp', referenceType: 'dependsOn' }
 *   ]
 * };
 * ```
 */
export interface ResourcePlacement {
  /**
   * Unique resource identifier.
   * Typically: "{resourceType}/{resourceName}"
   *
   * @example "Microsoft.Storage/storageAccounts/mystorage"
   * @example "Microsoft.Web/sites/myfunctionapp"
   */
  readonly resourceId: string;

  /**
   * Template file name this resource is assigned to.
   *
   * @example "Foundation-storage.json"
   * @example "Application.json"
   */
  readonly templateName: string;

  /**
   * Resource tier (for organizational purposes).
   * Inherited from resource metadata during assignment.
   *
   * @example "foundation"
   * @example "compute"
   */
  readonly tier: string;

  /**
   * Reason this resource was assigned to this template.
   * Used for debugging and understanding assignment decisions.
   *
   * Possible values:
   * - "main-template-only" - No template splitting needed
   * - "foundation-tier-assignment" - Assigned based on tier
   * - "affinity-with-{resourceId}" - Must stay with another resource
   * - "size-constraint-split" - Moved to new template due to size
   * - "dependency-chain-grouping" - Grouped with dependency chain
   *
   * @example "foundation-tier-assignment"
   * @example "affinity-with-Microsoft.Web/sites/myfunctionapp"
   */
  readonly assignmentReason: string;

  /**
   * Resource IDs that must be in the same template as this resource.
   * Represents strong affinity relationships.
   *
   * @example [
   *   "Microsoft.Storage/storageAccounts/mystorage/blobServices/default",
   *   "Microsoft.Storage/storageAccounts/mystorage/blobServices/default/containers/functions"
   * ]
   */
  readonly colocatedWith?: readonly string[];

  /**
   * Cross-template references from this resource.
   * Tracks dependencies on resources in other templates.
   *
   * @example [
   *   { targetResource: "Microsoft.Storage/storageAccounts/mystorage", referenceType: "dependsOn" },
   *   { targetResource: "Microsoft.Web/serverfarms/myplan", referenceType: "reference" }
   * ]
   */
  readonly crossTemplateReferences?: readonly {
    readonly targetResource: string;
    readonly referenceType: 'dependsOn' | 'reference' | 'output';
  }[];
}

/**
 * Type of cross-template dependency relationship.
 * Determines how the dependency is handled during ARM generation.
 *
 * - dependsOn: ARM dependsOn relationship between templates
 * - reference: ARM reference() function to output of another template
 * - output: Resource is exposed as output for use by other templates
 * - parameter: Value passed as parameter between templates
 */
export type CrossTemplateDependencyType = 'dependsOn' | 'reference' | 'output' | 'parameter';

/**
 * Represents a dependency between resources in different templates.
 * Used to generate correct ARM expressions and template dependencies.
 *
 * When resources reference each other across template boundaries:
 * 1. Source template must depend on target template
 * 2. Target resource must be exposed as output
 * 3. Source resource must use reference() to access output
 *
 * @example
 * ```typescript
 * const crossDep: CrossTemplateDependency = {
 *   sourceTemplate: 'Application-functions.json',
 *   targetTemplate: 'Foundation-storage.json',
 *   sourceResource: 'Microsoft.Web/sites/myfunctionapp',
 *   targetResource: 'Microsoft.Storage/storageAccounts/mystorage',
 *   dependencyType: 'reference',
 *   outputName: 'storageAccountId',
 *   expression: 'id'
 * };
 * ```
 */
export interface CrossTemplateDependency {
  /**
   * Source template containing the dependent resource.
   * This template must depend on the target template.
   *
   * @example "Application-functions.json"
   */
  readonly sourceTemplate: string;

  /**
   * Target template containing the dependency.
   * This template must be deployed before the source template.
   *
   * @example "Foundation-storage.json"
   */
  readonly targetTemplate: string;

  /**
   * The resource creating the dependency.
   * This resource references the target resource.
   *
   * @example "Microsoft.Web/sites/myfunctionapp"
   */
  readonly sourceResource: string;

  /**
   * The resource being depended upon.
   * Must be exposed as output in target template.
   *
   * @example "Microsoft.Storage/storageAccounts/mystorage"
   */
  readonly targetResource: string;

  /**
   * Type of dependency relationship.
   * Determines how the reference is expressed in ARM templates.
   *
   * @example "reference" // Use reference() function
   * @example "dependsOn" // ARM dependsOn relationship
   * @example "output"    // Expose as output
   */
  readonly dependencyType: CrossTemplateDependencyType;

  /**
   * Output name in target template for this reference.
   * Generated from target resource name and expression.
   *
   * @example "storageAccountId"
   * @example "storageAccountName"
   * @example "functionAppHostName"
   */
  readonly outputName?: string;

  /**
   * ARM expression being referenced (e.g., 'id', 'properties.endpoint').
   * Used to generate the correct reference() call.
   *
   * @example "id"
   * @example "properties.primaryEndpoints.blob"
   * @example "properties.defaultHostName"
   */
  readonly expression?: string;
}

/**
 * Complete result of the template assignment phase.
 * Maps resources to templates and tracks all cross-template dependencies.
 *
 * This is the central data structure passed between synthesis phases:
 * - Phase 1 (Metadata Collection) produces ResourceMetadata[]
 * - Phase 2 (Template Assignment) produces TemplateAssignments
 * - Phase 3 (ARM Generation) consumes TemplateAssignments
 *
 * @example Single template (no splitting):
 * ```typescript
 * const assignments: TemplateAssignments = {
 *   assignments: new Map([
 *     ['Microsoft.Storage/storageAccounts/mystorage', 'Foundation.json'],
 *     ['Microsoft.Web/sites/myfunctionapp', 'Foundation.json']
 *   ]),
 *   templates: new Map([
 *     ['Foundation.json', {
 *       fileName: 'Foundation.json',
 *       estimatedSize: 5120,
 *       resourceCount: 2,
 *       isMain: true,
 *       resources: ['Microsoft.Storage/storageAccounts/mystorage', 'Microsoft.Web/sites/myfunctionapp']
 *     }]
 *   ]),
 *   crossTemplateDependencies: [],
 *   placements: new Map([
 *     ['Microsoft.Storage/storageAccounts/mystorage', {
 *       resourceId: 'Microsoft.Storage/storageAccounts/mystorage',
 *       templateName: 'Foundation.json',
 *       tier: 'foundation',
 *       assignmentReason: 'main-template-only'
 *     }],
 *     ['Microsoft.Web/sites/myfunctionapp', {
 *       resourceId: 'Microsoft.Web/sites/myfunctionapp',
 *       templateName: 'Foundation.json',
 *       tier: 'compute',
 *       assignmentReason: 'main-template-only'
 *     }]
 *   ])
 * };
 * ```
 *
 * @example Linked templates (with splitting):
 * ```typescript
 * const assignments: TemplateAssignments = {
 *   assignments: new Map([
 *     ['Microsoft.Storage/storageAccounts/mystorage', 'Foundation-storage.json'],
 *     ['Microsoft.Web/sites/myfunctionapp', 'Foundation-compute.json']
 *   ]),
 *   templates: new Map([
 *     ['Foundation.json', {
 *       fileName: 'Foundation.json',
 *       estimatedSize: 2048,
 *       resourceCount: 0,
 *       isMain: true,
 *       resources: []
 *     }],
 *     ['Foundation-storage.json', {
 *       fileName: 'Foundation-storage.json',
 *       estimatedSize: 3072,
 *       resourceCount: 1,
 *       isMain: false,
 *       tier: 'foundation',
 *       resources: ['Microsoft.Storage/storageAccounts/mystorage']
 *     }],
 *     ['Foundation-compute.json', {
 *       fileName: 'Foundation-compute.json',
 *       estimatedSize: 4096,
 *       resourceCount: 1,
 *       isMain: false,
 *       tier: 'compute',
 *       resources: ['Microsoft.Web/sites/myfunctionapp']
 *     }]
 *   ]),
 *   crossTemplateDependencies: [
 *     {
 *       sourceTemplate: 'Foundation-compute.json',
 *       targetTemplate: 'Foundation-storage.json',
 *       sourceResource: 'Microsoft.Web/sites/myfunctionapp',
 *       targetResource: 'Microsoft.Storage/storageAccounts/mystorage',
 *       dependencyType: 'reference',
 *       outputName: 'storageAccountId',
 *       expression: 'id'
 *     }
 *   ],
 *   placements: new Map([
 *     ['Microsoft.Storage/storageAccounts/mystorage', {
 *       resourceId: 'Microsoft.Storage/storageAccounts/mystorage',
 *       templateName: 'Foundation-storage.json',
 *       tier: 'foundation',
 *       assignmentReason: 'foundation-tier-assignment'
 *     }],
 *     ['Microsoft.Web/sites/myfunctionapp', {
 *       resourceId: 'Microsoft.Web/sites/myfunctionapp',
 *       templateName: 'Foundation-compute.json',
 *       tier: 'compute',
 *       assignmentReason: 'compute-tier-assignment',
 *       crossTemplateReferences: [{
 *         targetResource: 'Microsoft.Storage/storageAccounts/mystorage',
 *         referenceType: 'reference'
 *       }]
 *     }]
 *   ])
 * };
 * ```
 */
export interface TemplateAssignments {
  /**
   * Map of resource IDs to assigned template names.
   * Provides O(1) lookup for any resource's template assignment.
   *
   * Key: Resource ID (e.g., "Microsoft.Storage/storageAccounts/mystorage")
   * Value: Template file name (e.g., "Foundation-storage.json")
   *
   * @example
   * ```typescript
   * new Map([
   *   ['Microsoft.Storage/storageAccounts/mystorage', 'Foundation-storage.json'],
   *   ['Microsoft.Web/sites/myfunctionapp', 'Foundation-compute.json']
   * ])
   * ```
   */
  readonly assignments: ReadonlyMap<string, string>;

  /**
   * Metadata for each template in the assignment.
   * Contains size, resource count, and other template information.
   *
   * Key: Template file name
   * Value: Template metadata
   *
   * @example
   * ```typescript
   * new Map([
   *   ['Foundation.json', { fileName: 'Foundation.json', isMain: true, ... }],
   *   ['Foundation-storage.json', { fileName: 'Foundation-storage.json', isMain: false, ... }]
   * ])
   * ```
   */
  readonly templates: ReadonlyMap<string, TemplateMetadata>;

  /**
   * Cross-template dependencies that must be handled during ARM generation.
   * These dependencies require special handling with outputs and reference() functions.
   *
   * @example
   * ```typescript
   * [
   *   {
   *     sourceTemplate: 'Foundation-compute.json',
   *     targetTemplate: 'Foundation-storage.json',
   *     sourceResource: 'Microsoft.Web/sites/myfunctionapp',
   *     targetResource: 'Microsoft.Storage/storageAccounts/mystorage',
   *     dependencyType: 'reference'
   *   }
   * ]
   * ```
   */
  readonly crossTemplateDependencies: readonly CrossTemplateDependency[];

  /**
   * Detailed placement information for each resource.
   * Provides full context about assignment decisions and relationships.
   *
   * Key: Resource ID
   * Value: Resource placement details
   *
   * @example
   * ```typescript
   * new Map([
   *   ['Microsoft.Storage/storageAccounts/mystorage', {
   *     resourceId: 'Microsoft.Storage/storageAccounts/mystorage',
   *     templateName: 'Foundation-storage.json',
   *     tier: 'foundation',
   *     assignmentReason: 'foundation-tier-assignment'
   *   }]
   * ])
   * ```
   */
  readonly placements?: ReadonlyMap<string, ResourcePlacement>;
}

/**
 * Options for template assignment algorithm.
 * Controls how resources are grouped into templates.
 *
 * @example Minimize cross-template references:
 * ```typescript
 * const options: TemplateAssignmentOptions = {
 *   maxTemplateSize: 3 * 1024 * 1024, // 3MB
 *   groupingStrategy: 'minimize-cross-refs',
 *   preferLinkedTemplates: false
 * };
 * ```
 *
 * @example Custom grouping function:
 * ```typescript
 * const options: TemplateAssignmentOptions = {
 *   maxTemplateSize: 3.5 * 1024 * 1024, // 3.5MB
 *   customGrouping: (metadata) => {
 *     const groups = new Map<string, string[]>();
 *     // Custom logic to group resources
 *     return groups;
 *   }
 * };
 * ```
 */
export interface TemplateAssignmentOptions {
  /**
   * Maximum template size in bytes (default: 4MB).
   * Templates exceeding this size will be split into multiple templates.
   *
   * Constraints:
   * - Must be less than 4MB (Azure's hard limit: 4,194,304 bytes)
   * - Recommended: 2.5-3.5MB for safety margin
   *
   * @default 4194304 // 4MB
   * @example 3145728 // 3MB
   * @example 3670016 // 3.5MB
   */
  readonly maxTemplateSize?: number;

  /**
   * Strategy for grouping resources into templates.
   *
   * Strategies:
   * - 'minimize-cross-refs': Minimize cross-template references (default)
   * - 'resource-type': Group by ARM resource type
   * - 'dependency-chain': Group by dependency chains
   *
   * @default "minimize-cross-refs"
   */
  readonly groupingStrategy?: 'minimize-cross-refs' | 'resource-type' | 'dependency-chain';

  /**
   * Whether to use linked templates by default.
   * If true, creates linked templates even for small deployments.
   * If false, only uses linked templates when size exceeds maxTemplateSize.
   *
   * @default false
   */
  readonly preferLinkedTemplates?: boolean;

  /**
   * Custom grouping function for advanced scenarios.
   * When provided, overrides the default grouping strategy.
   *
   * Function signature:
   * - Input: Array of ResourceMetadata objects
   * - Output: Map of template name to array of resource IDs
   *
   * @example
   * ```typescript
   * (metadata: ResourceMetadata[]) => {
   *   const groups = new Map<string, string[]>();
   *   // Implement custom grouping logic
   *   return groups;
   * }
   * ```
   */
  readonly customGrouping?: (metadata: readonly ResourceMetadata[]) => ReadonlyMap<string, readonly string[]>;
}

// ============================================================================
// Linked Templates V2 Types
// ============================================================================

/**
 * Resource deployment tier for organizing template splitting.
 * Resources are split into templates based on their tier and deployment dependencies.
 *
 * Deployment order:
 * 1. Foundation - Base infrastructure (Storage, Cosmos DB, VNets)
 * 2. Compute - Compute resources (Function Apps, App Service Plans)
 * 3. Application - Application layer (Function definitions, API Management)
 * 4. Configuration - Configuration and policies (RBAC, Diagnostics)
 *
 * @see Template Splitting Strategy: docs/design/architecture/template-splitting-strategy.md
 */
export enum ResourceTier {
  /**
   * Foundation resources with no dependencies.
   * Examples: Storage Accounts, Cosmos DB, Virtual Networks, Key Vaults
   */
  Foundation = 'foundation',

  /**
   * Compute resources that depend on foundation.
   * Examples: Function Apps, App Service Plans, Container Instances
   */
  Compute = 'compute',

  /**
   * Application resources that depend on compute.
   * Examples: Function definitions, API Management APIs, CDN
   */
  Application = 'application',

  /**
   * Configuration resources deployed last.
   * Examples: Role Assignments, Diagnostic Settings, Alerts
   */
  Configuration = 'configuration',
}

/**
 * A single linked template created from template splitting.
 * Linked templates allow ARM deployments to exceed the 4MB single template limit.
 *
 * @example
 * ```typescript
 * const linkedTemplate: LinkedTemplate = {
 *   name: 'Foundation-storage',
 *   template: { ... },
 *   size: 2048000, // 2MB
 *   tier: ResourceTier.Foundation
 * };
 * ```
 */
export interface LinkedTemplate {
  /**
   * Template name used for deployment and file naming.
   *
   * Format: `{Tier}-{category}.json`
   *
   * @example "Foundation-storage.json"
   * @example "Compute-functions.json"
   */
  readonly name: string;

  /**
   * Complete ARM template content for this linked template.
   * Contains resources, parameters, variables, and outputs.
   */
  readonly template: ArmTemplate;

  /**
   * Template size in bytes (UTF-8 encoded JSON).
   *
   * Constraints:
   * - Must be less than 4MB (4,194,304 bytes)
   * - Target: 2-3MB for safety margin
   *
   * @example 2048000 // 2MB
   */
  readonly size: number;

  /**
   * Resource tier this template belongs to.
   * Determines deployment order and grouping strategy.
   */
  readonly tier: ResourceTier;
}

/**
 * Result from splitting a large ARM template into multiple linked templates.
 * The root template orchestrates deployment of all linked templates.
 *
 * @see Linked Templates Architecture: docs/design/architecture/linked-templates-architecture.md
 *
 * @example
 * ```typescript
 * const templateSet: LinkedTemplateSet = {
 *   rootTemplate: {
 *     resources: [
 *       { type: 'Microsoft.Resources/deployments', name: 'foundation-storage', ... },
 *       { type: 'Microsoft.Resources/deployments', name: 'compute-functions', ... }
 *     ]
 *   },
 *   linkedTemplates: [
 *     { name: 'foundation-storage', template: {...}, size: 2048000, tier: ResourceTier.Foundation },
 *     { name: 'compute-functions', template: {...}, size: 1536000, tier: ResourceTier.Compute }
 *   ],
 *   totalSize: 3584000,
 *   stackName: 'Foundation'
 * };
 * ```
 */
export interface LinkedTemplateSet {
  /**
   * Root template containing Microsoft.Resources/deployments resources.
   * Each deployment resource references a linked template.
   *
   * The root template:
   * - Orchestrates linked template deployments
   * - Passes parameters between templates
   * - Defines deployment dependencies
   * - Collects outputs from all linked templates
   */
  readonly rootTemplate: ArmTemplate;

  /**
   * Array of linked templates referenced by the root template.
   * Each template is deployed as a separate ARM deployment operation.
   */
  readonly linkedTemplates: readonly LinkedTemplate[];

  /**
   * Total size of all templates combined (in bytes).
   * Includes root template and all linked templates.
   *
   * @example 11534336 // 11MB total across all templates
   */
  readonly totalSize: number;

  /**
   * Original stack name this template set belongs to.
   *
   * @example "Foundation"
   * @example "Application"
   */
  readonly stackName: string;
}

// ============================================================================
// Function Deployment Types
// ============================================================================

/**
 * Package structure metadata describing the contents of a function package.
 * Used for validation and debugging of function deployments.
 *
 * @see Function Deployment Pattern: docs/design/architecture/function-deployment-pattern.md
 */
export interface PackageStructure {
  /**
   * Function app host configuration (host.json).
   * Defines runtime version, extensions, logging configuration.
   *
   * @example
   * ```json
   * {
   *   "version": "2.0",
   *   "extensionBundle": {
   *     "id": "Microsoft.Azure.Functions.ExtensionBundle",
   *     "version": "[3.*, 4.0.0)"
   *   }
   * }
   * ```
   */
  readonly hostJson: object;

  /**
   * Function configuration files by function name.
   * Each function.json defines triggers, bindings, and function metadata.
   *
   * Key: Function name (e.g., "create-user")
   * Value: function.json content
   *
   * @example
   * ```typescript
   * {
   *   "create-user": {
   *     "bindings": [
   *       { "type": "httpTrigger", "direction": "in", "name": "req", "methods": ["POST"] },
   *       { "type": "http", "direction": "out", "name": "res" }
   *     ]
   *   }
   * }
   * ```
   */
  readonly functionJsons: Record<string, object>;

  /**
   * Code files by function name.
   * Each entry represents the primary code file (index.js) for a function.
   *
   * Key: Function name (e.g., "create-user")
   * Value: Path to code file relative to package root
   *
   * @example
   * ```typescript
   * {
   *   "create-user": "create-user/index.js",
   *   "read-user": "read-user/index.js"
   * }
   * ```
   */
  readonly codeFiles: Record<string, string>;
}

/**
 * A packaged Azure Function deployment artifact.
 * Contains all functions for a Function App in a ZIP file ready for "run from package" deployment.
 *
 * Run-from-package benefits:
 * - Removes code from ARM templates (solves size limit)
 * - Faster deployments (no extraction needed)
 * - Atomic updates (all functions update together)
 * - Built-in versioning and rollback capability
 *
 * @example
 * ```typescript
 * const functionPackage: FunctionPackage = {
 *   packagePath: '/tmp/functions-app.zip',
 *   functionAppName: 'my-function-app',
 *   functions: ['create-user', 'read-user', 'update-user', 'delete-user', 'list-users'],
 *   size: 1048576, // 1MB
 *   hash: 'sha256:abc123...',
 *   structure: {
 *     hostJson: { version: '2.0' },
 *     functionJsons: { ... },
 *     codeFiles: { ... }
 *   }
 * };
 * ```
 */
export interface FunctionPackage {
  /**
   * Absolute path to the ZIP package file on disk.
   * This file will be uploaded to Azure Storage during deployment.
   *
   * @example "/tmp/atakora-synth/packages/functions-app-abc123.zip"
   */
  readonly packagePath: string;

  /**
   * Name of the Function App this package belongs to.
   * Used to associate the package with the correct Function App resource.
   *
   * @example "my-crud-api-functions"
   */
  readonly functionAppName: string;

  /**
   * List of function names included in this package.
   * Each function corresponds to a directory in the package with function.json and index.js.
   *
   * @example ["create-user", "read-user", "update-user", "delete-user", "list-users"]
   */
  readonly functions: readonly string[];

  /**
   * Package size in bytes.
   *
   * Constraints:
   * - Azure Functions recommended maximum: 1GB
   * - Typical package: 1-50MB
   * - Large packages (>100MB) may have slower cold starts
   *
   * @example 1048576 // 1MB
   */
  readonly size: number;

  /**
   * SHA-256 hash of the package file for integrity validation.
   * Used to verify package hasn't been corrupted during upload/download.
   *
   * Format: "sha256:{hex-encoded-hash}"
   *
   * @example "sha256:abc123def456789..."
   */
  readonly hash: string;

  /**
   * Package structure metadata describing contents.
   * Used for validation and debugging.
   */
  readonly structure: PackageStructure;
}

/**
 * Artifact metadata for manifest v2.
 * Contains references to all deployment artifacts (function packages, etc.).
 *
 * Future extensibility allows adding new artifact types:
 * - Container images
 * - Static site bundles
 * - Database migration scripts
 * - Configuration files
 */
export interface ArtifactManifest {
  /**
   * Function packages for Azure Functions deployment.
   * Each package contains code for one Function App.
   *
   * @example
   * ```typescript
   * {
   *   functionPackages: [
   *     { packagePath: '...', functionAppName: 'api-functions', ... },
   *     { packagePath: '...', functionAppName: 'worker-functions', ... }
   *   ]
   * }
   * ```
   */
  readonly functionPackages?: readonly FunctionPackage[];

  /**
   * Future artifact types can be added here.
   * Index signature allows extensibility without breaking changes.
   *
   * @example
   * ```typescript
   * {
   *   containerImages?: ContainerImage[];
   *   staticSites?: StaticSiteBundle[];
   *   migrations?: DatabaseMigration[];
   * }
   * ```
   */
  readonly [key: string]: any;
}

// ============================================================================
// Cloud Assembly V2 Types
// ============================================================================

/**
 * Stack manifest for v2.0.0 cloud assembly format.
 * Extended from v1 to include linked template and artifact metadata.
 *
 * Breaking changes from v1:
 * - Added `linkedTemplates` array for multi-template stacks
 * - Added `artifacts` object for function packages and other artifacts
 * - `templatePath` now refers to root template (for linked templates)
 *
 * @example
 * ```typescript
 * const stackManifest: StackManifestV2 = {
 *   name: 'Foundation',
 *   templatePath: 'Foundation-root.json',
 *   linkedTemplates: [
 *     'Foundation-storage.json',
 *     'Foundation-compute.json',
 *     'Foundation-configuration.json'
 *   ],
 *   resourceCount: 47,
 *   parameterCount: 12,
 *   outputCount: 8,
 *   dependencies: [],
 *   artifacts: {
 *     functionPackages: [...]
 *   }
 * };
 * ```
 */
export interface StackManifestV2 {
  /**
   * Stack name (must be unique within assembly).
   *
   * @example "Foundation"
   * @example "Application"
   */
  readonly name: string;

  /**
   * Path to root template file (relative to assembly directory).
   * For linked templates, this is the orchestration template.
   * For single templates, this is the complete template.
   *
   * @example "Foundation-root.json"
   * @example "Application.json"
   */
  readonly templatePath: string;

  /**
   * Paths to linked template files (relative to assembly directory).
   * Empty array or undefined means this is a single-template stack.
   *
   * Linked templates are deployed by the root template via
   * Microsoft.Resources/deployments resources.
   *
   * @example ["Foundation-storage.json", "Foundation-compute.json"]
   */
  readonly linkedTemplates?: readonly string[];

  /**
   * Total resource count across all templates.
   * Includes resources in root template and all linked templates.
   *
   * @example 47
   */
  readonly resourceCount: number;

  /**
   * Number of parameters defined in root template.
   *
   * @example 12
   */
  readonly parameterCount: number;

  /**
   * Number of outputs defined across all templates.
   *
   * @example 8
   */
  readonly outputCount: number;

  /**
   * Stack dependencies (other stacks this stack depends on).
   * Used to determine deployment order.
   *
   * @example ["Foundation"] // Application stack depends on Foundation
   */
  readonly dependencies?: readonly string[];

  /**
   * Artifact metadata (function packages, etc.).
   * Contains references to all deployment artifacts needed by this stack.
   */
  readonly artifacts?: ArtifactManifest;
}

/**
 * Configuration for artifact storage account.
 * Populated by deploy command after provisioning storage.
 * Subsequent deployments reuse this storage account.
 *
 * @example
 * ```typescript
 * const storageConfig: ArtifactStorageConfig = {
 *   accountName: 'statakora7f3e92a1',
 *   resourceGroupName: 'rg-atakora-artifacts',
 *   location: 'eastus2',
 *   containerName: 'arm-templates',
 *   endpoint: 'https://statakora7f3e92a1.blob.core.windows.net/',
 *   provisionedAt: '2025-10-14T04:30:00Z',
 *   lastUsedAt: '2025-10-14T05:15:00Z',
 *   deployments: [
 *     'Foundation-1699564800000',
 *     'Foundation-1699478400000'
 *   ]
 * };
 * ```
 */
export interface ArtifactStorageConfig {
  /**
   * Storage account name.
   * Format: statakora{hash}
   *
   * @example "statakora7f3e92a1"
   */
  readonly accountName: string;

  /**
   * Resource group containing storage account.
   *
   * @example "rg-atakora-artifacts"
   */
  readonly resourceGroupName: string;

  /**
   * Storage account Azure region.
   *
   * @example "eastus2"
   */
  readonly location: string;

  /**
   * Container name for templates.
   * Typically "arm-templates" for all deployments.
   *
   * @example "arm-templates"
   */
  readonly containerName: string;

  /**
   * Storage account blob endpoint URL.
   *
   * @example "https://statakora7f3e92a1.blob.core.windows.net/"
   */
  readonly endpoint: string;

  /**
   * When storage was first provisioned (ISO 8601).
   *
   * @example "2025-10-14T04:30:00Z"
   */
  readonly provisionedAt: string;

  /**
   * When storage was last used for deployment (ISO 8601).
   * Updated after each successful deployment.
   *
   * @example "2025-10-14T05:15:00Z"
   */
  readonly lastUsedAt?: string;

  /**
   * History of deployment IDs using this storage.
   * Limited to last 10 deployments to keep manifest size reasonable.
   *
   * @example ["Foundation-1699564800000", "Foundation-1699478400000"]
   */
  readonly deployments?: readonly string[];
}

/**
 * Cloud assembly v2.0.0 format with linked template support.
 * This is the root manifest file describing all synthesized artifacts.
 *
 * Major changes from v1.0.0:
 * - Stacks can have multiple linked templates
 * - Artifact tracking for function packages
 * - Enhanced metadata for deployment orchestration
 * - Storage account tracking for artifact management
 *
 * File location: `{outdir}/manifest.json`
 *
 * @example
 * ```typescript
 * const assembly: CloudAssemblyV2 = {
 *   version: '2.0.0',
 *   stacks: {
 *     'Foundation': {
 *       name: 'Foundation',
 *       templatePath: 'Foundation-root.json',
 *       linkedTemplates: ['Foundation-storage.json', 'Foundation-compute.json'],
 *       resourceCount: 47,
 *       parameterCount: 12,
 *       outputCount: 8,
 *       artifacts: {
 *         functionPackages: [...]
 *       }
 *     }
 *   },
 *   directory: '/path/to/cdk.out',
 *   artifactStorage: {
 *     accountName: 'statakora7f3e92a1',
 *     resourceGroupName: 'rg-atakora-artifacts',
 *     location: 'eastus2',
 *     containerName: 'arm-templates',
 *     endpoint: 'https://statakora7f3e92a1.blob.core.windows.net/',
 *     provisionedAt: '2025-10-14T04:30:00Z',
 *     lastUsedAt: '2025-10-14T05:15:00Z',
 *     deployments: ['Foundation-1699564800000']
 *   }
 * };
 * ```
 */
export interface CloudAssemblyV2 {
  /**
   * Manifest format version.
   * Must be exactly "2.0.0" for v2 manifests.
   *
   * Version history:
   * - 1.0.0: Original format with single templates
   * - 2.0.0: Added linked templates and artifacts
   */
  readonly version: '2.0.0';

  /**
   * Stack manifests by stack name.
   * Each stack can have multiple linked templates and artifacts.
   *
   * @example
   * ```typescript
   * {
   *   'Foundation': { ... },
   *   'Application': { ... }
   * }
   * ```
   */
  readonly stacks: Record<string, StackManifestV2>;

  /**
   * Absolute path to cloud assembly directory.
   * All template and artifact paths are relative to this directory.
   *
   * @example "/home/user/project/cdk.out"
   */
  readonly directory: string;

  /**
   * Artifact storage configuration (optional).
   * Populated by deploy command after first deployment with linked templates.
   * Subsequent deployments reuse this storage account.
   *
   * When null/undefined: Storage will be provisioned on first deployment
   * When present: Existing storage account will be reused
   */
  artifactStorage?: ArtifactStorageConfig;
}

// ============================================================================
// Helper Types for Template Splitting
// ============================================================================

/**
 * ARM resource dependency node for template splitting analysis.
 * Different from data-stack DependencyNode which tracks schema-level dependencies.
 *
 * Used during template splitting to:
 * - Preserve resource dependencies across templates
 * - Identify resources that must stay together
 * - Determine safe split points
 * - Generate cross-template references
 */
export interface ResourceDependencyNode {
  /**
   * Unique resource identifier within the deployment.
   * Typically the ARM resource ID expression.
   *
   * @example "[resourceId('Microsoft.Storage/storageAccounts', 'mystorageaccount')]"
   */
  readonly resourceId: string;

  /**
   * ARM resource type.
   *
   * @example "Microsoft.Storage/storageAccounts"
   * @example "Microsoft.Web/sites"
   */
  readonly resourceType: string;

  /**
   * Complete ARM resource object.
   * Contains all properties, dependencies, and configuration.
   */
  readonly resource: ArmResource;

  /**
   * Resource IDs this resource depends on.
   * These dependencies must be deployed before this resource.
   *
   * @example ["[resourceId('Microsoft.Storage/storageAccounts', 'mystorageaccount')]"]
   */
  readonly dependsOn: readonly string[];

  /**
   * Resource IDs that depend on this resource.
   * These resources must be deployed after this resource.
   *
   * @example ["[resourceId('Microsoft.Web/sites', 'myfunctionapp')]"]
   */
  readonly dependents: readonly string[];
}

/**
 * ARM resource dependency graph for template splitting.
 * Different from data-stack DependencyGraph which tracks schema-level dependencies.
 *
 * Used by template splitter to analyze and preserve ARM resource dependencies.
 *
 * @example
 * ```typescript
 * const graph: ResourceDependencyGraph = {
 *   nodes: new Map([
 *     ['storage1', { resourceId: '...', resourceType: 'Microsoft.Storage/storageAccounts', ... }],
 *     ['function1', { resourceId: '...', resourceType: 'Microsoft.Web/sites', ... }]
 *   ]),
 *   edges: new Map([
 *     ['function1', ['storage1']] // function1 depends on storage1
 *   ])
 * };
 * ```
 */
export interface ResourceDependencyGraph {
  /**
   * Map of resource ID to dependency node.
   * Provides O(1) lookup of resource information.
   */
  readonly nodes: Map<string, ResourceDependencyNode>;

  /**
   * Map of resource ID to array of dependency IDs.
   * Represents directed edges in the dependency graph.
   *
   * Key: Dependent resource ID
   * Value: Array of resource IDs this resource depends on
   */
  readonly edges: Map<string, readonly string[]>;
}

/**
 * Resource affinity group defining resources that should stay together.
 * Used during template splitting to avoid breaking logical groupings.
 *
 * Affinity reasons:
 * - Parent-child relationships (e.g., Storage Account + Blob Containers)
 * - Tight coupling (e.g., Function App + App Insights)
 * - Deployment atomicity (e.g., all functions for one API)
 *
 * @example
 * ```typescript
 * const affinity: ResourceAffinityGroup = {
 *   primaryType: 'Microsoft.Web/sites',
 *   relatedTypes: [
 *     'Microsoft.Web/sites/functions',
 *     'Microsoft.Web/sites/config'
 *   ],
 *   reason: 'Parent-child relationship: Function App and its functions must be in same template'
 * };
 * ```
 */
export interface ResourceAffinityGroup {
  /**
   * Primary resource type that anchors this affinity group.
   *
   * @example "Microsoft.Web/sites"
   * @example "Microsoft.Storage/storageAccounts"
   */
  readonly primaryType: string;

  /**
   * Related resource types that must stay with primary.
   * These resources should not be split into separate templates.
   *
   * @example ["Microsoft.Web/sites/functions", "Microsoft.Web/sites/config"]
   */
  readonly relatedTypes: readonly string[];

  /**
   * Human-readable explanation of why these resources have affinity.
   * Used for debugging and documentation.
   *
   * @example "Parent-child relationship: Storage Account and Blob Containers must be in same template"
   */
  readonly reason: string;
}
