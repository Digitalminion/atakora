import { Construct } from './construct';
import { ValidationResult, ValidationResultBuilder } from './validation';
import type { ResourceMetadata } from '../synthesis/types';
import type { SynthesisContext } from '../synthesis/context/synthesis-context';

/**
 * Base properties for all ARM resources.
 */
export interface ResourceProps {
  /**
   * Azure location/region for this resource.
   * If not specified, inherits from parent stack.
   */
  readonly location?: string;

  /**
   * Resource tags.
   */
  readonly tags?: Record<string, string>;
}

/**
 * ARM resource representation for templates.
 */
export interface ArmResource {
  /**
   * ARM resource type (e.g., "Microsoft.Network/virtualNetworks").
   */
  readonly type: string;

  /**
   * API version for the resource.
   */
  readonly apiVersion: string;

  /**
   * Resource name.
   */
  readonly name: string;

  /**
   * Azure location/region.
   */
  readonly location?: string;

  /**
   * Resource tags.
   */
  readonly tags?: Record<string, string>;

  /**
   * Resource properties (specific to each resource type).
   */
  readonly properties?: unknown;

  /**
   * Resource dependencies (ARM resourceId expressions).
   */
  readonly dependsOn?: string[];
}

/**
 * Base class for all ARM resources.
 *
 * @remarks
 * All Azure resources extend this class, which provides:
 * - Resource type identification
 * - Resource ID tracking
 * - Name management
 * - Common ARM properties (location, tags)
 * - Validation framework integration
 *
 * Subclasses must implement:
 * - `resourceType`: ARM resource type (e.g., "Microsoft.Storage/storageAccounts")
 * - `resourceId`: Fully qualified Azure resource ID
 * - `name`: Resource name
 * - `validateProps()`: Validate constructor properties
 * - `validateArmStructure()`: Validate ARM template structure before transformation
 * - `toArmTemplate()`: Transform to ARM template representation
 *
 * **Validation Lifecycle**:
 * 1. Constructor calls `validateProps()` - validates input properties
 * 2. Synthesis calls `validateArmStructure()` - validates ARM structure before template generation
 * 3. Synthesis calls `toArmTemplate()` - generates ARM template JSON
 *
 * @example
 * ```typescript
 * export class StorageAccount extends Resource {
 *   readonly resourceType = 'Microsoft.Storage/storageAccounts';
 *   readonly resourceId: string;
 *   readonly name: string;
 *
 *   constructor(scope: Construct, id: string, props: StorageAccountProps) {
 *     super(scope, id, props);
 *     this.validateProps(props);  // MUST be called in constructor
 *     this.name = props.accountName;
 *     this.resourceId = `${subscriptionId}/resourceGroups/${rgName}/providers/Microsoft.Storage/storageAccounts/${this.name}`;
 *   }
 *
 *   protected validateProps(props: StorageAccountProps): void {
 *     if (!props.accountName) {
 *       throw new ValidationError('Account name is required');
 *     }
 *   }
 *
 *   public validateArmStructure(): ValidationResult {
 *     const builder = new ValidationResultBuilder();
 *     // Validate ARM-specific constraints
 *     return builder.build();
 *   }
 *
 *   public toArmTemplate(): ArmResource {
 *     return {
 *       type: this.resourceType,
 *       apiVersion: '2023-01-01',
 *       name: this.name,
 *       location: this.location,
 *       properties: { ... }
 *     };
 *   }
 * }
 * ```
 */
export abstract class Resource extends Construct {
  /**
   * ARM resource type (e.g., "Microsoft.Storage/storageAccounts").
   *
   * @example "Microsoft.Storage/storageAccounts"
   * @example "Microsoft.Network/virtualNetworks"
   */
  abstract readonly resourceType: string;

  /**
   * Azure resource ID (fully qualified).
   *
   * @example "/subscriptions/12345/resourceGroups/my-rg/providers/Microsoft.Storage/storageAccounts/myaccount"
   */
  abstract readonly resourceId: string;

  /**
   * Resource name.
   *
   * @example "my-storage-account"
   * @example "my-vnet"
   */
  abstract readonly name: string;

  /**
   * Azure location/region for this resource.
   */
  readonly location?: string;

  /**
   * Resource tags.
   */
  readonly tags?: Record<string, string>;

  /**
   * Creates a new Resource instance.
   *
   * @param scope - Parent construct (usually a Stack)
   * @param id - Construct ID (must be unique within scope)
   * @param props - Resource properties
   */
  constructor(scope: Construct, id: string, props?: ResourceProps) {
    super(scope, id);
    this.location = props?.location;
    this.tags = props?.tags;
  }

  /**
   * Validates constructor properties against business rules and constraints.
   *
   * @remarks
   * **MUST be called in constructor** after `super()` but before setting properties.
   *
   * This method validates:
   * - Required properties are present
   * - Property values are within valid ranges
   * - Business rules are satisfied
   * - Input data structure is correct
   *
   * This is separate from `validateArmStructure()` which validates the ARM template structure.
   *
   * **Implementation Guidelines**:
   * - Throw `ValidationError` for validation failures
   * - Provide clear, actionable error messages
   * - Include suggestions for fixing the issue
   * - Validate all required properties
   * - Check property value constraints
   *
   * @param props - Properties to validate
   * @throws {ValidationError} If validation fails
   *
   * @example
   * ```typescript
   * protected validateProps(props: StorageAccountProps): void {
   *   if (!props.accountName || props.accountName.trim() === '') {
   *     throw new ValidationError(
   *       'Storage account name cannot be empty',
   *       'Account names are required for all storage accounts',
   *       'Provide a valid account name'
   *     );
   *   }
   * }
   * ```
   */
  protected abstract validateProps(props: ResourceProps | unknown): void;

  /**
   * Validates ARM template structure before transformation.
   *
   * @remarks
   * **Called automatically during synthesis** before `toArmTemplate()`.
   *
   * This method validates:
   * - ARM-specific structure requirements
   * - Nested resource configurations
   * - Cross-resource dependencies
   * - ARM API version compatibility
   * - Deployment-time constraints
   *
   * Unlike `validateProps()`, this returns a `ValidationResult` instead of throwing,
   * allowing synthesis to collect all validation issues across resources.
   *
   * **Implementation Guidelines**:
   * - Use `ValidationResultBuilder` to collect issues
   * - Validate ARM template structure requirements
   * - Check nested resource configurations (e.g., inline subnets in VNet)
   * - Validate delegation structures match ARM format
   * - Ensure property nesting is correct for ARM API
   *
   * **Common Validations**:
   * - Delegation properties wrapper (e.g., `{ name, properties: { serviceName } }`)
   * - Subnet address prefixes within VNet CIDR
   * - No overlapping subnet ranges
   * - NSG reference format (ARM expression vs literal string)
   * - Service endpoint validity
   *
   * **Default Implementation**:
   * The base implementation returns a valid result (no errors). Resources should
   * override this method to add resource-specific ARM structure validation.
   *
   * @returns Validation result with any errors or warnings
   *
   * @example
   * ```typescript
   * public validateArmStructure(): ValidationResult {
   *   const builder = new ValidationResultBuilder();
   *
   *   // Validate inline subnets
   *   if (this.subnets) {
   *     for (const subnet of this.subnets) {
   *       if (subnet.delegations) {
   *         for (const delegation of subnet.delegations) {
   *           if (!delegation.properties || !delegation.properties.serviceName) {
   *             builder.addError(
   *               'Delegation missing properties wrapper',
   *               `Delegation in subnet ${subnet.name} must wrap serviceName in properties`,
   *               'Use format: { name: "delegation", properties: { serviceName: "Microsoft.Web/serverFarms" } }'
   *             );
   *           }
   *         }
   *       }
   *     }
   *   }
   *
   *   return builder.build();
   * }
   * ```
   */
  public validateArmStructure(): ValidationResult {
    // Default implementation: no validation errors
    // Resources should override this method for custom validation
    const builder = new ValidationResultBuilder();
    return builder.build();
  }

  /**
   * Generates lightweight metadata for template assignment decisions.
   *
   * @remarks
   * **Phase 1 of Context-Aware Synthesis Pipeline**
   *
   * This method is called BEFORE ARM template generation to collect metadata
   * that informs template splitting and assignment decisions. It should be:
   * - **Fast**: No expensive operations or ARM generation
   * - **Lightweight**: Only essential information for template assignment
   * - **Context-free**: No knowledge of template assignments needed
   *
   * The metadata is used by the template splitter to:
   * - Decide which resources go in which templates
   * - Estimate template sizes to avoid 4MB limit
   * - Identify dependency relationships
   * - Detect co-location requirements
   *
   * **Implementation Guidelines**:
   * - Return ResourceMetadata with accurate dependency list
   * - Estimate size conservatively (overestimate is better than underestimate)
   * - Use templatePreference to hint at desired placement
   * - Include requiresSameTemplate for parent-child resources
   * - Add metadata hints for large inline content
   *
   * **Synthesis Pipeline Flow**:
   * 1. **Phase 1**: All resources call `toMetadata()` → ResourceMetadata[]
   * 2. **Phase 2**: TemplateSplitter assigns resources → TemplateAssignments
   * 3. **Phase 3**: Resources call `toArmTemplate(context)` → ARM JSON
   *
   * @returns ResourceMetadata object describing this resource
   *
   * @see ResourceMetadata for metadata structure
   * @see docs/design/architecture/adr-018-synthesis-pipeline-refactoring.md
   *
   * @example Basic resource metadata
   * ```typescript
   * public toMetadata(): ResourceMetadata {
   *   return {
   *     id: this.node.id,
   *     type: this.resourceType,
   *     name: this.name,
   *     dependencies: [], // No dependencies
   *     sizeEstimate: 1200, // Estimated ARM JSON size
   *     templatePreference: 'foundation'
   *   };
   * }
   * ```
   *
   * @example Resource with dependencies and co-location
   * ```typescript
   * public toMetadata(): ResourceMetadata {
   *   return {
   *     id: this.node.id,
   *     type: this.resourceType,
   *     name: this.name,
   *     dependencies: [
   *       this.storageAccount.node.id,
   *       this.appServicePlan.node.id
   *     ],
   *     sizeEstimate: 2500,
   *     requiresSameTemplate: [
   *       `${this.node.id}/config/appsettings`
   *     ],
   *     templatePreference: 'compute',
   *     metadata: {
   *       hasLargeInlineContent: this.codeSize > 10000
   *     }
   *   };
   * }
   * ```
   */
  public abstract toMetadata(): ResourceMetadata;

  /**
   * Transforms this resource to ARM template JSON representation.
   *
   * @remarks
   * **Phase 3 of Context-Aware Synthesis Pipeline**
   *
   * This method is called during synthesis to generate the ARM template JSON.
   * In the new context-aware pipeline, it receives an optional SynthesisContext
   * that provides information about template assignments and enables correct
   * cross-template reference generation.
   *
   * **Context-Aware ARM Generation** (when context is provided):
   * - Use `context.isInSameTemplate(resourceId)` to check co-location
   * - Use `context.getResourceReference(resourceId)` for same-template refs
   * - Use `context.getCrossTemplateReference(resourceId)` for cross-template refs
   * - This ensures correct ARM expressions regardless of template splitting
   *
   * **Backwards Compatibility** (when context is undefined):
   * - Generate ARM as before (assumes single template)
   * - Use direct resourceId() expressions for dependencies
   * - No cross-template reference handling
   *
   * **IMPORTANT**: `validateArmStructure()` is called BEFORE this method during synthesis.
   * Any validation errors will prevent deployment.
   *
   * **Implementation Guidelines**:
   * - Return type-safe ARM resource object
   * - Include all required ARM properties (type, apiVersion, name, location)
   * - Transform nested structures to ARM format
   * - Generate ARM expressions for resource references using context if available
   * - Include dependsOn array for explicit dependencies (only same-template)
   * - Use context methods to generate correct references
   *
   * @param context - Optional synthesis context for cross-template reference generation
   * @returns ARM template resource object
   *
   * @see SynthesisContext for context-aware reference generation
   * @see docs/design/architecture/adr-018-synthesis-pipeline-refactoring.md
   *
   * @example Context-aware ARM generation
   * ```typescript
   * public toArmTemplate(context?: SynthesisContext): ArmResource {
   *   // Generate storage connection string reference
   *   const storageRef = context
   *     ? context.isInSameTemplate(this.storageAccount.node.id)
   *       ? context.getResourceReference(this.storageAccount.node.id)
   *       : context.getCrossTemplateReference(this.storageAccount.node.id, 'id')
   *     : `[resourceId('Microsoft.Storage/storageAccounts', '${this.storageAccount.name}')]`;
   *
   *   return {
   *     type: 'Microsoft.Web/sites',
   *     apiVersion: '2023-01-01',
   *     name: this.name,
   *     location: this.location,
   *     properties: {
   *       serverFarmId: this.appServicePlan.resourceId,
   *       siteConfig: {
   *         appSettings: [
   *           {
   *             name: 'StorageAccountId',
   *             value: storageRef
   *           }
   *         ]
   *       }
   *     },
   *     dependsOn: context?.isInSameTemplate(this.appServicePlan.node.id)
   *       ? [this.appServicePlan.resourceId]
   *       : undefined
   *   };
   * }
   * ```
   *
   * @example Backwards compatible (no context)
   * ```typescript
   * public toArmTemplate(context?: SynthesisContext): ArmResource {
   *   return {
   *     type: 'Microsoft.Network/virtualNetworks',
   *     apiVersion: '2024-07-01',
   *     name: this.virtualNetworkName,
   *     location: this.location,
   *     tags: this.tags,
   *     properties: {
   *       addressSpace: this.addressSpace,
   *       subnets: this.subnets?.map(subnet => ({
   *         name: subnet.name,
   *         properties: {
   *           addressPrefix: subnet.addressPrefix
   *         }
   *       }))
   *     }
   *   };
   * }
   * ```
   */
  public abstract toArmTemplate(context?: SynthesisContext): ArmResource;
}
