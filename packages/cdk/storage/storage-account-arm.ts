import { Construct, Resource, DeploymentScope } from '@atakora/lib';
import type { ArmResource } from '@atakora/lib';
import { ValidationResult, ValidationResultBuilder } from '@atakora/lib';
import type {
  ArmStorageAccountsProps,
  StorageAccountSku,
  StorageAccountKind,
  AccessTier,
  TlsVersion,
  PublicNetworkAccess,
  NetworkAcls,
} from './storage-account-types';

/**
 * L1 construct for Azure Storage Account.
 *
 * @remarks
 * Direct mapping to Microsoft.Storage/storageAccounts ARM resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.Storage/storageAccounts`
 * **API Version**: `2025-01-01`
 * **Deployment Scope**: ResourceGroup
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * auto-naming and defaults, use the {@link StorageAccounts} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmStorageAccounts, StorageAccountSkuName, StorageAccountKind } from '@atakora/cdk/storage';
 *
 * const storage = new ArmStorageAccounts(resourceGroup, 'Storage', {
 *   storageAccountName: 'stgauthr001',
 *   location: 'eastus',
 *   sku: { name: StorageAccountSkuName.STANDARD_LRS },
 *   kind: StorageAccountKind.STORAGE_V2
 * });
 * ```
 */
export class ArmStorageAccounts extends Resource {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.Storage/storageAccounts';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2025-01-01';

  /**
   * Deployment scope for storage accounts.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * Name of the storage account.
   */
  public readonly storageAccountName: string;

  /**
   * Resource name (same as storageAccountName).
   */
  public readonly name: string;

  /**
   * Azure region where the storage account is located.
   */
  public readonly location: string;

  /**
   * SKU configuration.
   */
  public readonly sku: StorageAccountSku;

  /**
   * Storage account kind.
   */
  public readonly kind: StorageAccountKind;

  /**
   * Access tier.
   */
  public readonly accessTier?: AccessTier;

  /**
   * Minimum TLS version.
   */
  public readonly minimumTlsVersion?: TlsVersion;

  /**
   * Allow blob public access.
   */
  public readonly allowBlobPublicAccess?: boolean;

  /**
   * Supports HTTPS traffic only.
   */
  public readonly supportsHttpsTrafficOnly?: boolean;

  /**
   * Public network access setting.
   */
  public readonly publicNetworkAccess?: PublicNetworkAccess;

  /**
   * Network ACL configuration.
   */
  public readonly networkAcls?: NetworkAcls;

  /**
   * Tags applied to the storage account.
   */
  public readonly tags: Record<string, string>;

  /**
   * ARM resource ID.
   *
   * @remarks
   * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Storage/storageAccounts/{storageAccountName}`
   */
  public readonly resourceId: string;

  /**
   * Storage account resource ID (alias for resourceId).
   */
  public readonly storageAccountId: string;

  /**
   * Creates a new ArmStorageAccounts construct.
   *
   * @param scope - Parent construct (typically a ResourceGroup)
   * @param id - Unique identifier for this construct within the parent scope
   * @param props - Storage account properties
   *
   * @throws {Error} If storageAccountName is invalid
   * @throws {Error} If location is empty
   * @throws {Error} If SKU or kind is not provided
   */
  constructor(scope: Construct, id: string, props: ArmStorageAccountsProps) {
    super(scope, id);

    // Validate required properties
    this.validateProps(props);

    // Set properties
    this.storageAccountName = props.storageAccountName;
    this.name = props.storageAccountName;
    this.location = props.location;
    this.sku = props.sku;
    this.kind = props.kind;
    this.accessTier = props.properties?.accessTier;
    this.minimumTlsVersion = props.properties?.minimumTlsVersion;
    this.allowBlobPublicAccess = props.properties?.allowBlobPublicAccess;
    this.supportsHttpsTrafficOnly = props.properties?.supportsHttpsTrafficOnly;
    this.publicNetworkAccess = props.properties?.publicNetworkAccess;
    this.networkAcls = props.properties?.networkAcls;
    this.tags = props.tags ?? {};

    // Construct resource ID
    this.resourceId = `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Storage/storageAccounts/${this.storageAccountName}`;
    this.storageAccountId = this.resourceId;
  }

  /**
   * Validates storage account properties against ARM constraints.
   *
   * @param props - Properties to validate
   * @throws {Error} If validation fails
   */
  protected validateProps(props: ArmStorageAccountsProps): void {
    // Validate storage account name
    if (!props.storageAccountName || props.storageAccountName.trim() === '') {
      throw new Error('Storage account name cannot be empty');
    }

    if (props.storageAccountName.length < 3 || props.storageAccountName.length > 24) {
      throw new Error(
        `Storage account name must be 3-24 characters (got ${props.storageAccountName.length})`
      );
    }

    // Validate name pattern: ^[a-z0-9]+$ (lowercase alphanumeric only, no hyphens)
    const namePattern = /^[a-z0-9]+$/;
    if (!namePattern.test(props.storageAccountName)) {
      throw new Error(
        `Storage account name must contain only lowercase letters and numbers (got: ${props.storageAccountName})`
      );
    }

    // Validate location
    if (!props.location || props.location.trim() === '') {
      throw new Error('Location cannot be empty');
    }

    // Validate SKU
    if (!props.sku || !props.sku.name) {
      throw new Error('SKU must be provided');
    }

    // Validate kind
    if (!props.kind) {
      throw new Error('Kind must be provided');
    }
  }

  /**
   * Validates ARM template structure before transformation.
   *
   * @remarks
   * This validates the ARM-specific structure requirements that must be met
   * after the toArmTemplate transformation.
   *
   * @returns Validation result with any errors or warnings
   */
  public validateArmStructure(): ValidationResult {
    const builder = new ValidationResultBuilder();

    // Generate ARM template to validate structure
    const armTemplate = this.toArmTemplate() as any;

    // Validate required fields are present
    if (!armTemplate.type) {
      builder.addError(
        'ARM template missing type field',
        'The type field is required for all ARM resources',
        'Ensure toArmTemplate() includes type field',
        'armTemplate.type'
      );
    }

    if (!armTemplate.apiVersion) {
      builder.addError(
        'ARM template missing apiVersion field',
        'The apiVersion field is required for all ARM resources',
        'Ensure toArmTemplate() includes apiVersion field',
        'armTemplate.apiVersion'
      );
    }

    if (!armTemplate.name) {
      builder.addError(
        'ARM template missing name field',
        'The name field is required for all ARM resources',
        'Ensure toArmTemplate() includes name field',
        'armTemplate.name'
      );
    }

    // Validate storage account specific structure
    if (armTemplate.sku && !armTemplate.sku.name) {
      builder.addError(
        'SKU missing name property',
        'The sku object must include a name property',
        'Ensure sku contains { name: "..." }',
        'armTemplate.sku.name'
      );
    }

    return builder.build();
  }

  /**
   * Generates ARM template representation of this resource.
   *
   * @remarks
   * Called during synthesis to produce the ARM template JSON.
   *
   * @returns ARM template resource object
   */
  public toArmTemplate(): ArmResource {
    const properties: any = {};

    // Add optional properties
    if (this.accessTier) {
      properties.accessTier = this.accessTier;
    }

    if (this.minimumTlsVersion) {
      properties.minimumTlsVersion = this.minimumTlsVersion;
    }

    if (this.allowBlobPublicAccess !== undefined) {
      properties.allowBlobPublicAccess = this.allowBlobPublicAccess;
    }

    if (this.supportsHttpsTrafficOnly !== undefined) {
      properties.supportsHttpsTrafficOnly = this.supportsHttpsTrafficOnly;
    }

    if (this.publicNetworkAccess) {
      properties.publicNetworkAccess = this.publicNetworkAccess;
    }

    if (this.networkAcls) {
      properties.networkAcls = {
        ...(this.networkAcls.bypass && { bypass: this.networkAcls.bypass }),
        defaultAction: this.networkAcls.defaultAction,
        ...(this.networkAcls.ipRules && { ipRules: this.networkAcls.ipRules }),
        ...(this.networkAcls.virtualNetworkRules && {
          virtualNetworkRules: this.networkAcls.virtualNetworkRules,
        }),
      };
    }

    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.storageAccountName,
      location: this.location,
      sku: {
        name: this.sku.name,
      },
      kind: this.kind,
      properties: Object.keys(properties).length > 0 ? properties : undefined,
      tags: Object.keys(this.tags).length > 0 ? this.tags : undefined,
    } as ArmResource;
  }
}
