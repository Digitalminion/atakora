/**
 * Azure built-in policy definition IDs.
 *
 * @remarks
 * Registry of commonly-used Azure built-in policies with their GUIDs.
 * Policy GUIDs are consistent across all Azure environments.
 *
 * @packageDocumentation
 */
/**
 * Registry of Azure built-in policy definition IDs.
 *
 * @remarks
 * Provides strongly-typed access to Azure's built-in policies.
 * Each property returns the policy definition resource ID.
 *
 * **Azure Policy Definition Format**:
 * `/providers/Microsoft.Authorization/policyDefinitions/{policyGuid}`
 *
 * @public
 *
 * @example
 * Using with policy assignment:
 * ```typescript
 * import { PolicyAssignment, WellKnownPolicyIds } from '@atakora/cdk';
 *
 * new PolicyAssignment(subscriptionStack, 'RequireHTTPS', {
 *   policyDefinitionId: WellKnownPolicyIds.STORAGE_HTTPS_ONLY,
 *   displayName: 'Require secure transfer for storage accounts'
 * });
 * ```
 */
export declare class WellKnownPolicyIds {
    /**
     * Secure transfer to storage accounts should be enabled.
     *
     * @remarks
     * Audit requirement of Secure transfer in your storage account.
     * Secure transfer is an option that forces your storage account to accept
     * requests only from secure connections (HTTPS).
     *
     * **Effect**: Audit, Deny, Disabled
     * **Category**: Storage
     *
     * **Policy GUID**: `404c3081-a854-4457-ae30-26a93ef643f9`
     */
    static readonly STORAGE_HTTPS_ONLY: string;
    /**
     * Storage accounts should restrict network access.
     *
     * @remarks
     * Network access to storage accounts should be restricted. Configure network rules
     * so only applications from allowed networks can access the storage account.
     *
     * **Effect**: Audit, Deny, Disabled
     * **Category**: Storage
     *
     * **Policy GUID**: `34c877ad-507e-4c82-993e-3452a6e0ad3c`
     */
    static readonly STORAGE_NETWORK_ACCESS_RESTRICTED: string;
    /**
     * Storage accounts should allow access from trusted Microsoft services.
     *
     * @remarks
     * Some Microsoft services that interact with storage accounts operate from networks
     * that can't be granted access through network rules. To help this type of service
     * work as intended, allow the set of trusted Microsoft services to bypass the network rules.
     *
     * **Effect**: Audit, Deny, Disabled
     * **Category**: Storage
     *
     * **Policy GUID**: `c9d007d0-c057-4772-b18c-01693b6f67ff`
     */
    static readonly STORAGE_ALLOW_TRUSTED_SERVICES: string;
    /**
     * Allowed locations.
     *
     * @remarks
     * This policy enables you to restrict the locations your organization can specify
     * when deploying resources. Use to enforce your geo-compliance requirements.
     *
     * **Effect**: Deny
     * **Category**: General
     * **Parameters**: listOfAllowedLocations (array of strings)
     *
     * **Policy GUID**: `e56962a6-4747-49cd-b67b-bf8b01975c4c`
     *
     * @example
     * ```typescript
     * new PolicyAssignment(stack, 'AllowedLocations', {
     *   policyDefinitionId: WellKnownPolicyIds.ALLOWED_LOCATIONS,
     *   displayName: 'Allowed resource locations',
     *   parameters: {
     *     listOfAllowedLocations: {
     *       value: ['eastus', 'eastus2', 'westus2']
     *     }
     *   }
     * });
     * ```
     */
    static readonly ALLOWED_LOCATIONS: string;
    /**
     * Allowed locations for resource groups.
     *
     * @remarks
     * This policy enables you to restrict the locations your organization can create
     * resource groups in. Use to enforce your geo-compliance requirements.
     *
     * **Effect**: Deny
     * **Category**: General
     * **Parameters**: listOfAllowedLocations (array of strings)
     *
     * **Policy GUID**: `e765b5de-1225-4ba3-bd56-1ac6695af988`
     */
    static readonly ALLOWED_RESOURCE_GROUP_LOCATIONS: string;
    /**
     * Require a tag on resources.
     *
     * @remarks
     * Enforces existence of a tag on resources. Does not apply to resource groups.
     *
     * **Effect**: Audit, Deny, Disabled
     * **Category**: Tags
     * **Parameters**: tagName (string)
     *
     * **Policy GUID**: `871b6d14-10aa-478d-b590-94f262ecfa99`
     *
     * @example
     * ```typescript
     * new PolicyAssignment(stack, 'RequireCostCenter', {
     *   policyDefinitionId: WellKnownPolicyIds.REQUIRE_TAG_ON_RESOURCES,
     *   displayName: 'Require cost center tag',
     *   parameters: {
     *     tagName: { value: 'costCenter' }
     *   }
     * });
     * ```
     */
    static readonly REQUIRE_TAG_ON_RESOURCES: string;
    /**
     * Require a tag on resource groups.
     *
     * @remarks
     * Enforces existence of a tag on resource groups.
     *
     * **Effect**: Audit, Deny, Disabled
     * **Category**: Tags
     * **Parameters**: tagName (string)
     *
     * **Policy GUID**: `96670d01-0a4d-4649-9c89-2d3abc0a5025`
     */
    static readonly REQUIRE_TAG_ON_RESOURCE_GROUPS: string;
    /**
     * Inherit a tag from the resource group if missing.
     *
     * @remarks
     * Adds the specified tag with its value from the parent resource group when any
     * resource missing this tag is created or updated. Existing resources can be
     * remediated by triggering a remediation task.
     *
     * **Effect**: Modify
     * **Category**: Tags
     * **Parameters**: tagName (string)
     *
     * **Policy GUID**: `ea3f2387-9b95-492a-a190-fcdc54f7b070`
     */
    static readonly INHERIT_TAG_FROM_RESOURCE_GROUP: string;
    /**
     * Network interfaces should disable IP forwarding.
     *
     * @remarks
     * This policy denies the network interfaces which enabled IP forwarding.
     * The setting of IP forwarding disables Azure's check of the source and
     * destination for a network interface.
     *
     * **Effect**: Audit, Deny, Disabled
     * **Category**: Network
     *
     * **Policy GUID**: `88c0b9da-ce96-4b03-9635-f29a937e2900`
     */
    static readonly NETWORK_INTERFACE_DISABLE_IP_FORWARDING: string;
    /**
     * Network interfaces should not have public IPs.
     *
     * @remarks
     * This policy denies the network interfaces which are configured with any public IP.
     * Public IP addresses allow internet resources to communicate inbound to Azure
     * resources, and Azure resources to communicate outbound to the internet.
     *
     * **Effect**: Audit, Deny, Disabled
     * **Category**: Network
     *
     * **Policy GUID**: `83a86a26-fd1f-447c-b59d-e51f44264114`
     */
    static readonly NETWORK_INTERFACE_NO_PUBLIC_IP: string;
    /**
     * Audit VMs that do not use managed disks.
     *
     * @remarks
     * This policy audits VMs that do not use managed disks.
     *
     * **Effect**: Audit
     * **Category**: Compute
     *
     * **Policy GUID**: `06a78e20-9358-41c9-923c-fb736d382a4d`
     */
    static readonly AUDIT_VM_MANAGED_DISKS: string;
    /**
     * Allowed virtual machine size SKUs.
     *
     * @remarks
     * This policy enables you to specify a set of virtual machine size SKUs that
     * your organization can deploy.
     *
     * **Effect**: Deny
     * **Category**: Compute
     * **Parameters**: listOfAllowedSKUs (array of strings)
     *
     * **Policy GUID**: `cccc23c7-8427-4f53-ad12-b6a63eb452b3`
     *
     * @example
     * ```typescript
     * new PolicyAssignment(stack, 'AllowedVMSKUs', {
     *   policyDefinitionId: WellKnownPolicyIds.ALLOWED_VM_SKUS,
     *   displayName: 'Allowed VM SKUs',
     *   parameters: {
     *     listOfAllowedSKUs: {
     *       value: ['Standard_D2s_v3', 'Standard_D4s_v3', 'Standard_D8s_v3']
     *     }
     *   }
     * });
     * ```
     */
    static readonly ALLOWED_VM_SKUS: string;
    /**
     * Virtual machines should encrypt temp disks, caches, and data flows.
     *
     * @remarks
     * By default, a virtual machine's OS and data disks are encrypted-at-rest using
     * platform-managed keys. Temp disks, data caches and data flowing between compute
     * and storage aren't encrypted. Use Azure Disk Encryption to encrypt all this data.
     *
     * **Effect**: AuditIfNotExists, Disabled
     * **Category**: Compute
     *
     * **Policy GUID**: `0961003e-5a0a-4549-abde-af6a37f2724d`
     */
    static readonly VM_ENCRYPTION_AT_HOST: string;
    /**
     * Audit usage of custom RBAC roles.
     *
     * @remarks
     * Audit built-in roles such as 'Owner, Contributor, Reader' instead of custom
     * RBAC roles, which are error prone. Using custom roles is treated as an exception
     * and requires a rigorous review and threat modeling.
     *
     * **Effect**: Audit, Disabled
     * **Category**: General
     *
     * **Policy GUID**: `a451c1ef-c6ca-483d-87ed-f49761e3ffb5`
     */
    static readonly AUDIT_CUSTOM_RBAC_ROLES: string;
    /**
     * Key Vault should have purge protection enabled.
     *
     * @remarks
     * Malicious deletion of a key vault can lead to permanent data loss. A malicious
     * insider in your organization can potentially delete and purge key vaults. Purge
     * protection protects you from insider attacks by enforcing a mandatory retention
     * period for soft deleted key vaults.
     *
     * **Effect**: Audit, Deny, Disabled
     * **Category**: Key Vault
     *
     * **Policy GUID**: `0b60c0b2-2dc2-4e1c-b5c9-abbed971de53`
     */
    static readonly KEY_VAULT_PURGE_PROTECTION: string;
    /**
     * Key Vault should have soft delete enabled.
     *
     * @remarks
     * Deleting a key vault without soft delete enabled permanently deletes all secrets,
     * keys, and certificates stored in the key vault. Accidental deletion of a key vault
     * can lead to permanent data loss. Soft delete allows you to recover an accidentally
     * deleted key vault for a configurable retention period.
     *
     * **Effect**: Audit, Deny, Disabled
     * **Category**: Key Vault
     *
     * **Policy GUID**: `1e66c121-a66a-4b1f-9b83-0fd99bf0fc2d`
     */
    static readonly KEY_VAULT_SOFT_DELETE: string;
    /**
     * Azure Monitor log profile should collect logs for categories 'write,' 'delete,' and 'action'.
     *
     * @remarks
     * This policy ensures that a log profile collects logs for categories 'write,'
     * 'delete,' and 'action'.
     *
     * **Effect**: AuditIfNotExists, Disabled
     * **Category**: Monitoring
     *
     * **Policy GUID**: `1a4e592a-6a6e-44a5-9814-e36264ca96e7`
     */
    static readonly MONITOR_LOG_PROFILE_CATEGORIES: string;
    /**
     * Helper to construct policy definition resource ID.
     *
     * @param guid - The policy definition GUID
     * @returns Policy definition resource ID
     *
     * @internal
     */
    private static policyId;
}
//# sourceMappingURL=well-known-policy-ids.d.ts.map