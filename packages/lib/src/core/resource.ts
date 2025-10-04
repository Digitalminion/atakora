import { Construct } from './construct';

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
 * Base class for all ARM resources.
 *
 * @remarks
 * All Azure resources extend this class, which provides:
 * - Resource type identification
 * - Resource ID tracking
 * - Name management
 * - Common ARM properties (location, tags)
 *
 * Subclasses must implement:
 * - `resourceType`: ARM resource type (e.g., "Microsoft.Storage/storageAccounts")
 * - `resourceId`: Fully qualified Azure resource ID
 * - `name`: Resource name
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
 *     this.name = props.accountName;
 *     this.resourceId = `${subscriptionId}/resourceGroups/${rgName}/providers/Microsoft.Storage/storageAccounts/${this.name}`;
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
}
