import { Construct } from './construct';
import { ValidationResult } from './validation';

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
  public abstract validateArmStructure(): ValidationResult;

  /**
   * Transforms this resource to ARM template JSON representation.
   *
   * @remarks
   * **Called during synthesis** to generate the ARM template.
   *
   * This method must return a valid ARM resource object that can be serialized to JSON
   * and deployed to Azure.
   *
   * **IMPORTANT**: `validateArmStructure()` is called BEFORE this method during synthesis.
   * Any validation errors will prevent deployment.
   *
   * **Implementation Guidelines**:
   * - Return type-safe ARM resource object
   * - Include all required ARM properties (type, apiVersion, name, location)
   * - Transform nested structures to ARM format
   * - Generate ARM expressions for resource references
   * - Include dependsOn array for explicit dependencies
   *
   * @returns ARM template resource object
   *
   * @example
   * ```typescript
   * public toArmTemplate(): ArmResource {
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
   *           addressPrefix: subnet.addressPrefix,
   *           delegations: subnet.delegations?.map(d => ({
   *             name: d.name,
   *             properties: { serviceName: d.serviceName }
   *           }))
   *         }
   *       }))
   *     }
   *   };
   * }
   * ```
   */
  public abstract toArmTemplate(): ArmResource;
}
