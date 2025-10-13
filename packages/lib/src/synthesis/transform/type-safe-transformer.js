"use strict";
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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkResourceTransformer = exports.TransformationError = void 0;
var arm_network_types_1 = require("./arm-network-types");
/**
 * Error thrown when transformation fails validation
 */
var TransformationError = /** @class */ (function (_super) {
    __extends(TransformationError, _super);
    function TransformationError(message, details, path) {
        var _this = _super.call(this, message) || this;
        _this.details = details;
        _this.path = path;
        _this.name = 'TransformationError';
        return _this;
    }
    return TransformationError;
}(Error));
exports.TransformationError = TransformationError;
/**
 * Type-safe transformer for network resources
 *
 * @remarks
 * Replaces all `any` types with strongly-typed transformations.
 * Provides compile-time safety and runtime validation.
 */
var NetworkResourceTransformer = /** @class */ (function () {
    function NetworkResourceTransformer() {
    }
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
    NetworkResourceTransformer.prototype.transformSubnets = function (subnets) {
        var _this = this;
        return subnets.map(function (subnet, index) {
            try {
                var armSubnet = _this.transformSingleSubnet(subnet);
                // Runtime validation with type guard
                if (!(0, arm_network_types_1.isValidArmSubnet)(armSubnet)) {
                    throw new TransformationError("Invalid ARM subnet structure for subnet at index ".concat(index), _this.getSubnetValidationErrors(armSubnet), "subnets[".concat(index, "]"));
                }
                return armSubnet;
            }
            catch (error) {
                if (error instanceof TransformationError) {
                    throw error;
                }
                throw new TransformationError("Failed to transform subnet at index ".concat(index), error instanceof Error ? error.message : String(error), "subnets[".concat(index, "]"));
            }
        });
    };
    /**
     * Transform a single subnet from construct format to ARM format
     */
    NetworkResourceTransformer.prototype.transformSingleSubnet = function (subnet) {
        // Extract name and other properties
        var name = subnet.name, addressPrefix = subnet.addressPrefix, delegations = subnet.delegations, networkSecurityGroup = subnet.networkSecurityGroup, serviceEndpoints = subnet.serviceEndpoints, rest = __rest(subnet, ["name", "addressPrefix", "delegations", "networkSecurityGroup", "serviceEndpoints"]);
        // Validate required fields
        if (!name || typeof name !== 'string') {
            throw new TransformationError('Subnet name is required and must be a string', "Received: ".concat(typeof name), 'subnet.name');
        }
        if (!addressPrefix || typeof addressPrefix !== 'string') {
            throw new TransformationError("Subnet '".concat(name, "' is missing addressPrefix"), 'addressPrefix must be a string in CIDR notation (e.g., "10.0.1.0/24")', "subnet.".concat(name, ".addressPrefix"));
        }
        // Build subnet properties
        var properties = {
            addressPrefix: addressPrefix,
        };
        // Transform delegations if present
        if (delegations && Array.isArray(delegations)) {
            properties.delegations = this.transformDelegations(delegations, name);
        }
        // Add network security group reference if present
        if (networkSecurityGroup) {
            properties.networkSecurityGroup = this.transformSubresourceReference(networkSecurityGroup, "subnet.".concat(name, ".networkSecurityGroup"));
        }
        // Add service endpoints if present
        if (serviceEndpoints && Array.isArray(serviceEndpoints)) {
            properties.serviceEndpoints = this.transformServiceEndpoints(serviceEndpoints, name);
        }
        // Add any additional properties (routeTable, natGateway, etc.)
        if ('routeTable' in rest && rest.routeTable) {
            properties.routeTable = this.transformSubresourceReference(rest.routeTable, "subnet.".concat(name, ".routeTable"));
        }
        if ('natGateway' in rest && rest.natGateway) {
            properties.natGateway = this.transformSubresourceReference(rest.natGateway, "subnet.".concat(name, ".natGateway"));
        }
        if ('privateEndpointNetworkPolicies' in rest) {
            properties.privateEndpointNetworkPolicies = rest.privateEndpointNetworkPolicies;
        }
        if ('privateLinkServiceNetworkPolicies' in rest) {
            properties.privateLinkServiceNetworkPolicies = rest.privateLinkServiceNetworkPolicies;
        }
        return {
            name: name,
            properties: properties,
        };
    };
    /**
     * Transform delegations to ARM format
     *
     * @remarks
     * Converts from construct format: { name, serviceName }
     * To ARM format: { name, properties: { serviceName } }
     *
     * ARM requires the properties wrapper even though it only contains serviceName.
     */
    NetworkResourceTransformer.prototype.transformDelegations = function (delegations, subnetName) {
        return delegations.map(function (delegation, index) {
            // Handle both formats: { name, serviceName } and { name, properties: { serviceName } }
            var serviceName;
            var delegationName;
            if ('name' in delegation) {
                delegationName = delegation.name;
            }
            // Check if serviceName is at top level (construct format)
            if ('serviceName' in delegation && typeof delegation.serviceName === 'string') {
                serviceName = delegation.serviceName;
            }
            // Or if it's in properties wrapper (already ARM format)
            else if ('properties' in delegation &&
                delegation.properties &&
                typeof delegation.properties === 'object') {
                var props = delegation.properties;
                if ('serviceName' in props && typeof props.serviceName === 'string') {
                    serviceName = props.serviceName;
                }
            }
            if (!delegationName) {
                throw new TransformationError("Delegation at index ".concat(index, " in subnet '").concat(subnetName, "' missing name"), 'Each delegation must have a name property', "subnet.".concat(subnetName, ".delegations[").concat(index, "].name"));
            }
            if (!serviceName) {
                throw new TransformationError("Delegation '".concat(delegationName, "' in subnet '").concat(subnetName, "' missing serviceName"), 'Delegation must have serviceName (e.g., "Microsoft.Web/serverFarms")', "subnet.".concat(subnetName, ".delegations[").concat(index, "].serviceName"));
            }
            var armDelegation = {
                name: delegationName,
                properties: {
                    serviceName: serviceName,
                },
            };
            // Runtime validation
            if (!(0, arm_network_types_1.isValidArmSubnetDelegation)(armDelegation)) {
                throw new TransformationError("Invalid ARM delegation structure for '".concat(delegationName, "' in subnet '").concat(subnetName, "'"), 'Delegation must have format: { name: string, properties: { serviceName: string } }', "subnet.".concat(subnetName, ".delegations[").concat(index, "]"));
            }
            return armDelegation;
        });
    };
    /**
     * Transform subresource reference (NSG, route table, NAT gateway)
     */
    NetworkResourceTransformer.prototype.transformSubresourceReference = function (ref, path) {
        if (typeof ref === 'string') {
            return { id: ref };
        }
        if (typeof ref === 'object' && ref !== null && 'id' in ref && typeof ref.id === 'string') {
            return { id: ref.id };
        }
        throw new TransformationError('Invalid subresource reference', 'Must be either a string (resource ID) or an object with an "id" property', path);
    };
    /**
     * Transform service endpoints
     */
    NetworkResourceTransformer.prototype.transformServiceEndpoints = function (endpoints, subnetName) {
        return endpoints.map(function (endpoint, index) {
            if (typeof endpoint === 'string') {
                return { service: endpoint };
            }
            if (typeof endpoint === 'object' && endpoint !== null && 'service' in endpoint) {
                var result = {
                    service: endpoint.service,
                };
                if ('locations' in endpoint && Array.isArray(endpoint.locations)) {
                    result.locations = endpoint.locations;
                }
                return result;
            }
            throw new TransformationError("Invalid service endpoint at index ".concat(index, " in subnet '").concat(subnetName, "'"), 'Must be either a string (service name) or an object with a "service" property', "subnet.".concat(subnetName, ".serviceEndpoints[").concat(index, "]"));
        });
    };
    /**
     * Transform virtual network properties
     */
    NetworkResourceTransformer.prototype.transformVirtualNetworkProperties = function (input) {
        var properties = {
            addressSpace: {
                addressPrefixes: input.addressSpace.addressPrefixes,
            },
        };
        // Transform subnets if present
        if (input.subnets && input.subnets.length > 0) {
            properties.subnets = this.transformSubnets(input.subnets);
        }
        // Add DHCP options if present
        if (input.dhcpOptions) {
            properties.dhcpOptions = {
                dnsServers: input.dhcpOptions.dnsServers,
            };
        }
        // Add optional boolean flags (only if true, to match ARM template conventions)
        if (input.enableDdosProtection === true) {
            properties.enableDdosProtection = true;
        }
        if (input.enableVmProtection === true) {
            properties.enableVmProtection = true;
        }
        return properties;
    };
    /**
     * Get validation error details for a subnet
     */
    NetworkResourceTransformer.prototype.getSubnetValidationErrors = function (subnet) {
        var errors = [];
        if (typeof subnet !== 'object' || subnet === null) {
            return 'Subnet must be an object';
        }
        var s = subnet;
        if (!s.name || typeof s.name !== 'string') {
            errors.push('Missing or invalid "name" property');
        }
        if (!s.properties || typeof s.properties !== 'object') {
            errors.push('Missing or invalid "properties" object');
        }
        else {
            if (!s.properties.addressPrefix || typeof s.properties.addressPrefix !== 'string') {
                errors.push('Missing or invalid "properties.addressPrefix"');
            }
        }
        return errors.join('; ');
    };
    return NetworkResourceTransformer;
}());
exports.NetworkResourceTransformer = NetworkResourceTransformer;
