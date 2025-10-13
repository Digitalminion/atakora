import { Resource } from '../../core/resource';
import { ArmResource } from '../types';
/**
 * Transforms construct resources to ARM JSON format
 */
export declare class ResourceTransformer {
    /**
     * Transform a Resource construct to ARM JSON
     *
     * @param resource - Resource construct to transform
     * @returns ARM resource JSON
     */
    transform(resource: Resource): ArmResource;
    /**
     * Transform multiple resources
     */
    transformAll(resources: Resource[]): ArmResource[];
    /**
     * Extract API version from resource
     */
    private extractApiVersion;
    /**
     * Extract properties from resource
     */
    private extractProperties;
    /**
     * Extract SKU from resource
     */
    private extractSku;
    /**
     * Extract kind from resource
     */
    private extractKind;
    /**
     * Extract identity from resource
     */
    private extractIdentity;
    /**
     * Remove undefined values from an object recursively
     */
    private cleanUndefined;
    /**
     * Replace placeholder tokens with ARM template expressions
     *
     * @remarks
     * Replaces the following placeholders:
     * - {subscriptionId} → [subscription().subscriptionId]
     * - {resourceGroupName} → [resourceGroup().name]
     * - 00000000-0000-0000-0000-000000000000 → [subscription().tenantId] (for Key Vault tenantId)
     *
     * IMPORTANT: Does NOT replace tokens inside ARM expressions (strings starting with '[')
     *
     * @param obj - ARM resource object to process
     * @returns ARM resource with tokens replaced
     */
    private replaceTokens;
    /**
     * Replace tokens in a string value
     *
     * @param str - String to process
     * @returns String with tokens replaced
     */
    private replaceStringTokens;
    /**
     * Generate resource ID for ARM template reference
     */
    static generateResourceId(resource: ArmResource): string;
}
//# sourceMappingURL=resource-transformer.d.ts.map