import { Construct } from '@atakora/cdk';
import { IGrantable, IGrantResult } from '@atakora/lib';
import type { VaultsProps, IVault, KeyVaultSku } from './vault-types';
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
 * - AuthR secure defaults: RBAC enabled, soft delete enabled, public network disabled
 * - Environment-aware SKU: premium for prod, standard for nonprod
 *
 * **ARM Resource Type**: `Microsoft.KeyVault/vaults`
 * **API Version**: `2024-11-01`
 * **Deployment Scope**: ResourceGroup
 *
 * @example
 * Minimal usage (auto-generates everything):
 * ```typescript
 * import { Vaults } from '@atakora/cdk/keyvault';
 *
 * const vault = new Vaults(resourceGroup, 'Secrets', {
 *   tenantId: '12345678-1234-1234-1234-123456789abc'
 * });
 * ```
 *
 * @example
 * With custom properties:
 * ```typescript
 * import { Vaults, KeyVaultSkuName } from '@atakora/cdk/keyvault';
 *
 * const vault = new Vaults(resourceGroup, 'Secrets', {
 *   tenantId: '12345678-1234-1234-1234-123456789abc',
 *   sku: KeyVaultSkuName.PREMIUM,
 *   enablePurgeProtection: true,
 *   tags: { purpose: 'application-secrets' }
 * });
 * ```
 */
export declare class Vaults extends Construct implements IVault {
    /**
     * Counter for generating unique grant IDs
     */
    private grantCounter;
    /**
     * Underlying L1 construct.
     */
    private readonly armVault;
    /**
     * Parent resource group.
     */
    private readonly parentResourceGroup;
    /**
     * Name of the Key Vault.
     */
    readonly vaultName: string;
    /**
     * Location of the Key Vault.
     */
    readonly location: string;
    /**
     * Tenant ID for the Key Vault.
     */
    readonly tenantId: string;
    /**
     * SKU configuration.
     */
    readonly sku: KeyVaultSku;
    /**
     * Resource group name where the Key Vault is deployed.
     */
    readonly resourceGroupName: string;
    /**
     * Resource ID of the Key Vault.
     */
    readonly vaultId: string;
    /**
     * ARM resource ID (required for GrantableResource).
     */
    readonly resourceId: string;
    /**
     * Tags applied to the Key Vault (merged with parent tags).
     */
    readonly tags: Record<string, string>;
    /**
     * Creates a new Vaults construct.
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
     * import { Vaults, KeyVaultSkuName } from '@atakora/cdk/keyvault';
     *
     * const vault = new Vaults(resourceGroup, 'AppSecrets', {
     *   tenantId: '12345678-1234-1234-1234-123456789abc',
     *   sku: KeyVaultSkuName.PREMIUM,
     *   enablePurgeProtection: true
     * });
     * ```
     */
    constructor(scope: Construct, id: string, props?: VaultsProps);
    /**
     * Gets the parent ResourceGroup from the construct tree.
     *
     * @param scope - Parent construct
     * @returns The resource group interface
     * @throws {Error} If parent is not or doesn't contain a ResourceGroup
     */
    private getParentResourceGroup;
    /**
     * Checks if a construct implements IResourceGroup interface using duck typing.
     *
     * @param construct - Construct to check
     * @returns True if construct has ResourceGroup properties
     */
    private isResourceGroup;
    /**
     * Gets tags from parent construct hierarchy.
     *
     * @param scope - Parent construct
     * @returns Tags object (empty if no tags found)
     */
    private getParentTags;
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
     * - Example: kv-authr-03-a1b2c3d4
     */
    private resolveVaultName;
    /**
     * Resolves tenant ID from props or stack.
     *
     * @param props - Key Vault properties
     * @returns Tenant ID
     * @throws {Error} If tenant ID not provided and not available in stack
     */
    private resolveTenantId;
    /**
     * Resolves SKU based on environment.
     *
     * @param props - Key Vault properties
     * @returns SKU name
     */
    private resolveSku;
    /**
     * Checks if current environment is production.
     *
     * @returns True if prod environment
     */
    private isProdEnvironment;
    /**
     * Gets the SubscriptionStack from the construct tree.
     *
     * @returns SubscriptionStack or undefined if not found
     */
    private getSubscriptionStack;
    /**
     * Converts construct ID to purpose identifier for naming.
     *
     * @param id - Construct ID
     * @returns Purpose string for naming
     */
    private constructIdToPurpose;
    /**
     * Grant read access to Key Vault secrets.
     *
     * @remarks
     * Provides read-only access to secret values using Azure RBAC.
     * The grantee can read secret values, list secrets, and read secret metadata.
     *
     * **Permissions**:
     * - Read secret values
     * - List secrets
     * - Read secret metadata
     *
     * **Common Use Cases**:
     * - Applications reading configuration
     * - Services accessing credentials
     * - Automated processes
     *
     * @param grantable - Identity to grant permissions to
     * @returns Grant result with the created role assignment
     *
     * @example
     * Grant a VM read access to secrets:
     * ```typescript
     * const vm = new VirtualMachine(stack, 'VM', {});
     * const vault = new Vaults(resourceGroup, 'Secrets', {
     *   tenantId: '12345678-1234-1234-1234-123456789abc'
     * });
     *
     * vault.grantSecretsRead(vm);
     * ```
     */
    grantSecretsRead(grantable: IGrantable): IGrantResult;
    /**
     * Grant full access to Key Vault secrets (read, write, delete).
     *
     * @remarks
     * Full secret management permissions including creating, updating, and deleting secrets.
     *
     * **Permissions**:
     * - All grantSecretsRead permissions
     * - Create and update secrets
     * - Delete secrets
     * - Manage secret versions
     *
     * **Common Use Cases**:
     * - Secret rotation systems
     * - DevOps tools
     * - Administrative tasks
     *
     * @param grantable - Identity to grant permissions to
     * @returns Grant result with the created role assignment
     *
     * @example
     * Grant a Function App full access to secrets:
     * ```typescript
     * const functionApp = new FunctionApp(stack, 'Functions', {});
     * vault.grantSecretsFullAccess(functionApp);
     * ```
     */
    grantSecretsFullAccess(grantable: IGrantable): IGrantResult;
    /**
     * Grant cryptographic operations using keys.
     *
     * @remarks
     * Permission to perform cryptographic operations with keys without managing them.
     *
     * **Permissions**:
     * - Encrypt data
     * - Decrypt data
     * - Sign data
     * - Verify signatures
     * - Wrap keys
     * - Unwrap keys
     *
     * **Common Use Cases**:
     * - Encryption services
     * - Digital signature systems
     * - Key wrapping scenarios
     *
     * @param grantable - Identity to grant permissions to
     * @returns Grant result with the created role assignment
     *
     * @example
     * Grant an application encryption permissions:
     * ```typescript
     * const app = new WebApp(stack, 'App', {});
     * vault.grantCryptoUse(app);
     * ```
     */
    grantCryptoUse(grantable: IGrantable): IGrantResult;
    /**
     * Grant full access to cryptographic keys (create, delete, manage).
     *
     * @remarks
     * Full key management permissions including lifecycle operations.
     *
     * **Permissions**:
     * - All grantCryptoUse permissions
     * - Create keys
     * - Import keys
     * - Delete keys
     * - Manage key versions
     * - Rotate keys
     *
     * **Common Use Cases**:
     * - Key administrators
     * - Cryptographic infrastructure management
     * - Key lifecycle management
     *
     * @param grantable - Identity to grant permissions to
     * @returns Grant result with the created role assignment
     *
     * @example
     * Grant key management permissions:
     * ```typescript
     * const keyAdmin = UserAssignedIdentity.fromId(stack, 'KeyAdmin', 'identity-id');
     * vault.grantCryptoFullAccess(keyAdmin);
     * ```
     */
    grantCryptoFullAccess(grantable: IGrantable): IGrantResult;
    /**
     * Grant read access to certificates.
     *
     * @remarks
     * Read-only access to certificates without modification permissions.
     *
     * **Permissions**:
     * - Read certificate data
     * - List certificates
     * - Read certificate metadata
     *
     * **Common Use Cases**:
     * - Certificate validation
     * - Monitoring and alerts
     * - Compliance scanning
     *
     * @param grantable - Identity to grant permissions to
     * @returns Grant result with the created role assignment
     *
     * @example
     * Grant certificate read access:
     * ```typescript
     * const monitor = new VirtualMachine(stack, 'Monitor', {});
     * vault.grantCertificatesRead(monitor);
     * ```
     */
    grantCertificatesRead(grantable: IGrantable): IGrantResult;
    /**
     * Grant full access to certificates (create, delete, manage).
     *
     * @remarks
     * Full certificate management including lifecycle operations.
     *
     * **Permissions**:
     * - All grantCertificatesRead permissions
     * - Create certificates
     * - Import certificates
     * - Delete certificates
     * - Manage certificate policies
     *
     * **Common Use Cases**:
     * - Certificate administrators
     * - Automated certificate management
     * - Certificate lifecycle management
     *
     * @param grantable - Identity to grant permissions to
     * @returns Grant result with the created role assignment
     *
     * @example
     * Grant certificate management permissions:
     * ```typescript
     * const certManager = new FunctionApp(stack, 'CertManager', {});
     * vault.grantCertificatesFullAccess(certManager);
     * ```
     */
    grantCertificatesFullAccess(grantable: IGrantable): IGrantResult;
    /**
     * Grant full administrator access to Key Vault.
     *
     * @remarks
     * Administrative access to all Key Vault objects including secrets, keys, and certificates.
     * Use sparingly and only for administrative scenarios.
     *
     * **Permissions**:
     * - All read permissions
     * - Create, update, delete secrets, keys, and certificates
     * - Manage access policies (when using RBAC)
     *
     * **Common Use Cases**:
     * - Key Vault administrators
     * - Full management scenarios
     * - Migration and setup
     *
     * **Security Consideration**:
     * This grants full access to all Key Vault data. Assign carefully and only when necessary.
     *
     * @param grantable - Identity to grant permissions to
     * @returns Grant result with the created role assignment
     *
     * @example
     * Grant administrator access:
     * ```typescript
     * const admin = UserAssignedIdentity.fromId(stack, 'Admin', 'admin-identity-id');
     * vault.grantAdministrator(admin);
     * ```
     */
    grantAdministrator(grantable: IGrantable): IGrantResult;
    /**
     * Internal helper to create role assignments for grant methods.
     * Uses composition pattern instead of extending GrantableResource.
     */
    protected grant(grantable: IGrantable, roleDefinitionId: string, description?: string): IGrantResult;
}
//# sourceMappingURL=vaults.d.ts.map