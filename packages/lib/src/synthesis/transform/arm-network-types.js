"use strict";
/**
 * Strongly-typed ARM template definitions for Microsoft.Network resources
 *
 * @remarks
 * These types ensure compile-time safety when transforming constructs to ARM JSON.
 * All types map 1:1 to the Azure ARM API schema to prevent runtime errors.
 *
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidArmSubnet = isValidArmSubnet;
exports.isValidArmSubnetDelegation = isValidArmSubnetDelegation;
exports.isValidArmVirtualNetworkProperties = isValidArmVirtualNetworkProperties;
/**
 * Type guard to validate ArmSubnet structure
 */
function isValidArmSubnet(subnet) {
    if (typeof subnet !== 'object' || subnet === null) {
        return false;
    }
    var s = subnet;
    // Must have name and properties
    if (typeof s.name !== 'string' || !s.name) {
        return false;
    }
    if (typeof s.properties !== 'object' || s.properties === null) {
        return false;
    }
    // Properties must have addressPrefix
    if (typeof s.properties.addressPrefix !== 'string' || !s.properties.addressPrefix) {
        return false;
    }
    return true;
}
/**
 * Type guard to validate ArmSubnetDelegation structure
 */
function isValidArmSubnetDelegation(delegation) {
    if (typeof delegation !== 'object' || delegation === null) {
        return false;
    }
    var d = delegation;
    // Must have name and properties wrapper
    if (typeof d.name !== 'string' || !d.name) {
        return false;
    }
    if (typeof d.properties !== 'object' || d.properties === null) {
        return false;
    }
    // Properties must have serviceName
    if (typeof d.properties.serviceName !== 'string' || !d.properties.serviceName) {
        return false;
    }
    return true;
}
/**
 * Type guard to validate ArmVirtualNetworkProperties structure
 */
function isValidArmVirtualNetworkProperties(props) {
    if (typeof props !== 'object' || props === null) {
        return false;
    }
    var p = props;
    // Must have addressSpace
    if (typeof p.addressSpace !== 'object' || p.addressSpace === null) {
        return false;
    }
    // addressSpace must have addressPrefixes array
    if (!Array.isArray(p.addressSpace.addressPrefixes) ||
        p.addressSpace.addressPrefixes.length === 0) {
        return false;
    }
    // All addressPrefixes must be strings
    if (!p.addressSpace.addressPrefixes.every(function (prefix) { return typeof prefix === 'string'; })) {
        return false;
    }
    // If subnets exist, validate them
    if (p.subnets !== undefined) {
        if (!Array.isArray(p.subnets)) {
            return false;
        }
        if (!p.subnets.every(function (subnet) { return isValidArmSubnet(subnet); })) {
            return false;
        }
    }
    return true;
}
