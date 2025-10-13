/**
 * Type-safe transformation utilities for converting construct properties to ARM resources
 *
 * @remarks
 * This module provides strongly-typed transformers that replace the use of `any` types
 * in resource transformation. All transformations are validated at both compile-time
 * and runtime to ensure correct ARM template structure.
 *
 * @packageDocumentation
 */
import { ArmSubnet, ArmVirtualNetworkProperties } from './arm-network-types';
/**
 * Error thrown when transformation fails validation
 */
export declare class TransformationError extends Error {
    readonly details?: string;
    readonly path?: string;
    constructor(message: string, details?: string, path?: string);
}
/**
 * Type-safe transformer for network resources
 *
 * @remarks
 * Replaces all `any` types with strongly-typed transformations.
 * Provides compile-time safety and runtime validation.
 */
export declare class NetworkResourceTransformer {
    /**
     * Transform inline subnet props to ARM subnet format
     *
     * @remarks
     * Converts from construct format: { name, addressPrefix, delegations, ... }
     * To ARM format: { name, properties: { addressPrefix, delegations, ... } }
     *
     * @param subnets - Subnet configurations from construct
     * @returns ARM-formatted subnet array
     * @throws {TransformationError} If subnet structure is invalid
     */
    transformSubnets(subnets: InlineSubnetInput[]): ArmSubnet[];
    /**
     * Transform a single subnet from construct format to ARM format
     */
    private transformSingleSubnet;
    /**
     * Transform delegations to ARM format
     *
     * @remarks
     * Converts from construct format: { name, serviceName }
     * To ARM format: { name, properties: { serviceName } }
     *
     * ARM requires the properties wrapper even though it only contains serviceName.
     */
    private transformDelegations;
    /**
     * Transform subresource reference (NSG, route table, NAT gateway)
     */
    private transformSubresourceReference;
    /**
     * Transform service endpoints
     */
    private transformServiceEndpoints;
    /**
     * Transform virtual network properties
     */
    transformVirtualNetworkProperties(input: VirtualNetworkPropertiesInput): ArmVirtualNetworkProperties;
    /**
     * Get validation error details for a subnet
     */
    private getSubnetValidationErrors;
}
/**
 * Input types for transformation (construct format)
 */
interface InlineSubnetInput {
    name: string;
    addressPrefix: string;
    delegations?: DelegationInput[];
    networkSecurityGroup?: SubresourceReferenceInput;
    serviceEndpoints?: ServiceEndpointInput[];
    routeTable?: SubresourceReferenceInput;
    natGateway?: SubresourceReferenceInput;
    privateEndpointNetworkPolicies?: 'Enabled' | 'Disabled';
    privateLinkServiceNetworkPolicies?: 'Enabled' | 'Disabled';
    [key: string]: any;
}
interface DelegationInput {
    name: string;
    serviceName?: string;
    properties?: {
        serviceName?: string;
    };
}
type SubresourceReferenceInput = string | {
    id: string;
};
type ServiceEndpointInput = string | {
    service: string;
    locations?: string[];
};
interface VirtualNetworkPropertiesInput {
    addressSpace: {
        addressPrefixes: string[];
    };
    subnets?: InlineSubnetInput[];
    dhcpOptions?: {
        dnsServers: string[];
    };
    enableDdosProtection?: boolean;
    enableVmProtection?: boolean;
}
export {};
//# sourceMappingURL=type-safe-transformer.d.ts.map