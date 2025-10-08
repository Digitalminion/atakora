import { Construct } from '../../core/construct';
import type { IResourceGroup } from '../resource-group/types';
import { ArmKeyVault } from './arm-key-vault';
import type {
  KeyVaultProps,
  IKeyVault,
  KeyVaultSkuName,
  KeyVaultSku,
  PublicNetworkAccess,
} from './types';

/**
 * L2 construct for Azure Key Vault.
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-naming.
 * Provides developer-friendly experience with minimal required configuration.
 *
 * **Features**:
 * - Auto-generates Key Vault name following naming conventions
 * - Defaults location to parent resource group's location
 * - Merges tags with parent tags
 * - ColorAI secure defaults: RBAC enabled, soft delete enabled, public network disabled
 * - Environment-aware SKU: premium for prod, standard for nonprod
 *
 * **ARM Resource Type**: `Microsoft.KeyVault/vaults`
 * **API Version**: `2024-11-01`
 * **Deployment Scope**: ResourceGroup
 *
 * @example
 * Minimal usage (auto-generates everything):
 * ```typescript
 * import { KeyVault } from '@atakora/lib';
 *
 * const vault = new KeyVault(resourceGroup, 'Secrets', {
 *   tenantId: '12345678-1234-1234-1234-123456789abc'
 * });
 * ```
 *
 * @example
 * With custom properties:
 * ```typescript
 * const vault = new KeyVault(resourceGroup, 'Secrets', {
 *   tenantId: '12345678-1234-1234-1234-123456789abc',
 *   sku: KeyVaultSkuName.PREMIUM,
 *   enablePurgeProtection: true,
 *   tags: { purpose: 'application-secrets' }
 * });
 * ```
 */
export class KeyVault extends Construct implements IKeyVault {
  /**
   * Underlying L1 construct.
   */
  private readonly armKeyVault: ArmKeyVault;

  /**
   * Parent resource group.
   */
  private readonly parentResourceGroup: IResourceGroup;

  /**
   * Name of the Key Vault.
   */
  public readonly vaultName: string;

  /**
   * Location of the Key Vault.
   */
  public readonly location: string;

  /**
   * Tenant ID for the Key Vault.
   */
  public readonly tenantId: string;

  /**
   * SKU configuration.
   */
  public readonly sku: KeyVaultSku;

  /**
   * Resource group name where the Key Vault is deployed.
   */
  public readonly resourceGroupName: string;

  /**
   * Resource ID of the Key Vault.
   */
  public readonly vaultId: string;

  /**
   * Tags applied to the Key Vault (merged with parent tags).
   */
  public readonly tags: Record<string, string>;

  /**
   * Creates a new KeyVault construct.
   *
   * @param scope - Parent construct (must be or contain a ResourceGroup)
   * @param id - Unique identifier for this construct
   * @param props - Optional Key Vault properties (tenantId required if not available in stack)
   *
   * @throws {Error} If scope does not contain a ResourceGroup
   * @throws {Error} If tenantId not provided and not available in stack
   *
   * @example
   * ```typescript
   * const vault = new KeyVault(resourceGroup, 'AppSecrets', {
   *   tenantId: '12345678-1234-1234-1234-123456789abc',
   *   sku: KeyVaultSkuName.PREMIUM,
   *   enablePurgeProtection: true
   * });
   * ```
   */
  constructor(scope: Construct, id: string, props?: KeyVaultProps) {
    super(scope, id);

    // Get parent resource group
    this.parentResourceGroup = this.getParentResourceGroup(scope);

    // Auto-generate or use provided vault name
    this.vaultName = this.resolveVaultName(id, props);

    // Default location to resource group's location or use provided
    this.location = props?.location ?? this.parentResourceGroup.location;

    // Set resource group name
    this.resourceGroupName = this.parentResourceGroup.resourceGroupName;

    // Resolve tenant ID (from props, stack, or error)
    this.tenantId = this.resolveTenantId(props);

    // Determine SKU based on environment (premium for prod, standard for nonprod)
    const skuName = this.resolveSku(props);
    this.sku = {
      family: 'A',
      name: skuName,
    };

    // Merge tags with parent
    this.tags = {
      ...this.getParentTags(scope),
      ...props?.tags,
    };

    // Purge protection should always be enabled to comply with Azure Policy
    // Azure Policy "Key vaults should have deletion protection enabled" requires this
    const enablePurgeProtection =
      props?.enablePurgeProtection !== undefined ? props.enablePurgeProtection : true;

    // Create underlying L1 resource
    this.armKeyVault = new ArmKeyVault(scope, `${id}-Resource`, {
      vaultName: this.vaultName,
      location: this.location,
      tenantId: this.tenantId,
      sku: this.sku,
      properties: {
        // ColorAI defaults: RBAC enabled (not access policies)
        enableRbacAuthorization: props?.enableRbacAuthorization ?? true,
        // Soft delete enabled (90 days retention)
        enableSoftDelete: props?.enableSoftDelete ?? true,
        softDeleteRetentionInDays: props?.softDeleteRetentionInDays ?? 90,
        // Purge protection (prod only by default)
        enablePurgeProtection,
        // Public network access disabled
        publicNetworkAccess: props?.publicNetworkAccess ?? ('disabled' as PublicNetworkAccess),
        // Network ACLs if provided
        networkAcls: props?.networkAcls,
      },
      tags: this.tags,
    });

    // Get resource ID from L1
    this.vaultId = this.armKeyVault.vaultId;
  }

  /**
   * Gets the parent ResourceGroup from the construct tree.
   *
   * @param scope - Parent construct
   * @returns The resource group interface
   * @throws {Error} If parent is not or doesn't contain a ResourceGroup
   */
  private getParentResourceGroup(scope: Construct): IResourceGroup {
    // Walk up the construct tree to find ResourceGroup
    let current: Construct | undefined = scope;

    while (current) {
      // Check if current implements IResourceGroup interface
      if (this.isResourceGroup(current)) {
        return current as IResourceGroup;
      }
      current = current.node.scope;
    }

    throw new Error(
      'KeyVault must be created within or under a ResourceGroup. ' +
        'Ensure the parent scope is a ResourceGroup or has one in its hierarchy.'
    );
  }

  /**
   * Checks if a construct implements IResourceGroup interface using duck typing.
   *
   * @param construct - Construct to check
   * @returns True if construct has ResourceGroup properties
   */
  private isResourceGroup(construct: any): construct is IResourceGroup {
    return (
      construct &&
      typeof construct.resourceGroupName === 'string' &&
      typeof construct.location === 'string'
    );
  }

  /**
   * Gets tags from parent construct hierarchy.
   *
   * @param scope - Parent construct
   * @returns Tags object (empty if no tags found)
   */
  private getParentTags(scope: Construct): Record<string, string> {
    // Try to get tags from parent
    const parent = scope as any;
    if (parent && typeof parent.tags === 'object') {
      return parent.tags;
    }
    return {};
  }

  /**
   * Resolves the Key Vault name from props or auto-generates it.
   *
   * @param id - Construct ID
   * @param props - Key Vault properties
   * @returns Resolved vault name
   *
   * @remarks
   * Key Vault names must be:
   * - 3-24 characters
   * - Alphanumeric and hyphens
   * - Globally unique across Azure
   *
   * New naming convention for global uniqueness:
   * - Format: kv-<project>-<instance>-<8-char-hash>
   * - Hash is generated from full resource name to ensure uniqueness
   * - Example: kv-colorai-03-a1b2c3d4
   */
  private resolveVaultName(id: string, props?: KeyVaultProps): string {
    // If name provided explicitly, use it
    if (props?.vaultName) {
      return props.vaultName;
    }

    // Auto-generate name using parent's naming context
    const subscriptionStack = this.getSubscriptionStack();
    if (subscriptionStack) {
      const purpose = this.constructIdToPurpose(id);

      // New format: kv-<project>-<instance>-<8-char-hash>
      // Use NamingService for truly unique hash per synthesis
      const project = subscriptionStack.project.resourceName;
      const instance = subscriptionStack.instance.resourceName;
      const hash = subscriptionStack.namingService.getResourceHash(8);

      const generatedName = `kv-${project}-${instance}-${hash}`;

      // Ensure it fits within 24 characters
      if (generatedName.length > 24) {
        // Truncate project name if needed
        const maxProjectLen = 24 - 13; // 24 - (3 + 1 + 2 + 1 + 1 + 8 + 1) = 11
        const truncatedProject = project.substring(0, maxProjectLen);
        return `kv-${truncatedProject}-${instance}-${hash}`.substring(0, 24);
      }

      return generatedName;
    }

    // Fallback: construct a basic name from ID
    let fallbackName = `kv-${id.toLowerCase()}`;
    fallbackName = fallbackName.substring(0, 24);

    // Remove trailing hyphen if present
    if (fallbackName.endsWith('-')) {
      fallbackName = fallbackName.substring(0, 23);
    }

    return fallbackName;
  }

  /**
   * Resolves tenant ID from props or stack.
   *
   * @param props - Key Vault properties
   * @returns Tenant ID
   * @throws {Error} If tenant ID not provided and not available in stack
   */
  private resolveTenantId(props?: KeyVaultProps): string {
    // If provided explicitly, use it
    if (props?.tenantId) {
      return props.tenantId;
    }

    // Try to get from SubscriptionStack
    const subscriptionStack = this.getSubscriptionStack();
    if (subscriptionStack && subscriptionStack.tenantId) {
      return subscriptionStack.tenantId;
    }

    // Error: tenant ID is required
    throw new Error(
      'Tenant ID must be provided either via props.tenantId or SubscriptionStack.tenantId'
    );
  }

  /**
   * Resolves SKU based on environment.
   *
   * @param props - Key Vault properties
   * @returns SKU name
   */
  private resolveSku(props?: KeyVaultProps): KeyVaultSkuName {
    // If provided explicitly, use it
    if (props?.sku) {
      return props.sku;
    }

    // Default based on environment
    const isProd = this.isProdEnvironment();
    return isProd ? ('premium' as KeyVaultSkuName) : ('standard' as KeyVaultSkuName);
  }

  /**
   * Checks if current environment is production.
   *
   * @returns True if prod environment
   */
  private isProdEnvironment(): boolean {
    const subscriptionStack = this.getSubscriptionStack();
    if (subscriptionStack && subscriptionStack.environment) {
      const env = subscriptionStack.environment;
      // Check if environment is 'prod' (case insensitive)
      return env.toString().toLowerCase() === 'prod';
    }
    return false;
  }

  /**
   * Gets the SubscriptionStack from the construct tree.
   *
   * @returns SubscriptionStack or undefined if not found
   */
  private getSubscriptionStack(): any {
    let current: Construct | undefined = this.node.scope;

    while (current) {
      // Check if current is a SubscriptionStack using duck typing
      if (
        current &&
        typeof (current as any).generateResourceName === 'function' &&
        typeof (current as any).subscriptionId === 'string'
      ) {
        return current;
      }
      current = current.node.scope;
    }

    return undefined;
  }

  /**
   * Converts construct ID to purpose identifier for naming.
   *
   * @param id - Construct ID
   * @returns Purpose string for naming
   */
  private constructIdToPurpose(id: string): string {
    return id.toLowerCase();
  }
}
