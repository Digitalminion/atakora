"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceTransformer = void 0;
/**
 * Transforms construct resources to ARM JSON format
 */
var ResourceTransformer = /** @class */ (function () {
    function ResourceTransformer() {
    }
    /**
     * Transform a Resource construct to ARM JSON
     *
     * @param resource - Resource construct to transform
     * @returns ARM resource JSON
     */
    ResourceTransformer.prototype.transform = function (resource) {
        // Check if resource has toArmTemplate method
        if (typeof resource.toArmTemplate === 'function') {
            var armTemplate = resource.toArmTemplate();
            var cleaned = this.cleanUndefined(armTemplate);
            return this.replaceTokens(cleaned);
        }
        // Fallback: Extract ARM properties manually from resource
        var armResource = {
            type: resource.resourceType,
            apiVersion: this.extractApiVersion(resource),
            name: resource.name,
        };
        // Add optional properties
        if (resource.location) {
            armResource.location = resource.location;
        }
        if (resource.tags && Object.keys(resource.tags).length > 0) {
            armResource.tags = resource.tags;
        }
        // Extract properties from the resource
        var properties = this.extractProperties(resource);
        if (properties && Object.keys(properties).length > 0) {
            armResource.properties = properties;
        }
        // Extract SKU if present
        var sku = this.extractSku(resource);
        if (sku) {
            armResource.sku = sku;
        }
        // Extract kind if present
        var kind = this.extractKind(resource);
        if (kind) {
            armResource.kind = kind;
        }
        // Extract identity if present
        var identity = this.extractIdentity(resource);
        if (identity) {
            armResource.identity = identity;
        }
        // Clean up undefined values and replace tokens
        return this.replaceTokens(this.cleanUndefined(armResource));
    };
    /**
     * Transform multiple resources
     */
    ResourceTransformer.prototype.transformAll = function (resources) {
        var _this = this;
        return resources.map(function (resource) { return _this.transform(resource); });
    };
    /**
     * Extract API version from resource
     */
    ResourceTransformer.prototype.extractApiVersion = function (resource) {
        // Check if resource has apiVersion property
        var apiVersion = resource.apiVersion;
        if (apiVersion) {
            return apiVersion;
        }
        // Default API versions by resource type
        var defaultVersions = {
            'Microsoft.Storage/storageAccounts': '2023-01-01',
            'Microsoft.Network/virtualNetworks': '2023-04-01',
            'Microsoft.Compute/virtualMachines': '2023-03-01',
            'Microsoft.Resources/resourceGroups': '2021-04-01',
            'Microsoft.KeyVault/vaults': '2023-02-01',
        };
        var defaultVersion = defaultVersions[resource.resourceType];
        if (defaultVersion) {
            return defaultVersion;
        }
        // Fallback to a recent date-based version
        return '2023-01-01';
    };
    /**
     * Extract properties from resource
     */
    ResourceTransformer.prototype.extractProperties = function (resource) {
        var properties = resource.properties;
        if (!properties) {
            return undefined;
        }
        return this.cleanUndefined(properties);
    };
    /**
     * Extract SKU from resource
     */
    ResourceTransformer.prototype.extractSku = function (resource) {
        return resource.sku;
    };
    /**
     * Extract kind from resource
     */
    ResourceTransformer.prototype.extractKind = function (resource) {
        return resource.kind;
    };
    /**
     * Extract identity from resource
     */
    ResourceTransformer.prototype.extractIdentity = function (resource) {
        return resource.identity;
    };
    /**
     * Remove undefined values from an object recursively
     */
    ResourceTransformer.prototype.cleanUndefined = function (obj) {
        var _this = this;
        var cleaned = {};
        for (var _i = 0, _a = Object.entries(obj); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], value = _b[1];
            if (value === undefined) {
                continue;
            }
            if (value === null) {
                cleaned[key] = value;
                continue;
            }
            if (Array.isArray(value)) {
                cleaned[key] = value.map(function (item) {
                    return typeof item === 'object' && item !== null ? _this.cleanUndefined(item) : item;
                });
                continue;
            }
            if (typeof value === 'object') {
                var cleanedValue = this.cleanUndefined(value);
                // Preserve 'properties' field even if empty (required by ARM schema)
                if (key === 'properties' || Object.keys(cleanedValue).length > 0) {
                    cleaned[key] = cleanedValue;
                }
                continue;
            }
            cleaned[key] = value;
        }
        return cleaned;
    };
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
    ResourceTransformer.prototype.replaceTokens = function (obj) {
        var _this = this;
        var result = {};
        for (var _i = 0, _a = Object.entries(obj); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], value = _b[1];
            // Skip dependsOn arrays - these should be ARM expressions already
            if (key === 'dependsOn' && Array.isArray(value)) {
                result[key] = value;
                continue;
            }
            if (typeof value === 'string') {
                // Don't replace tokens in ARM expressions (strings starting with '[')
                if (value.startsWith('[')) {
                    result[key] = value;
                    continue;
                }
                var replacedValue = value;
                // Replace {subscriptionId} with ARM expression
                replacedValue = replacedValue.replace(/\{subscriptionId\}/g, '[subscription().subscriptionId]');
                // Replace {resourceGroupName} with ARM expression
                replacedValue = replacedValue.replace(/\{resourceGroupName\}/g, '[resourceGroup().name]');
                // Special case: Replace placeholder tenantId with ARM expression
                // This is specifically for Key Vault and similar resources
                if (key === 'tenantId' && value === '00000000-0000-0000-0000-000000000000') {
                    replacedValue = '[subscription().tenantId]';
                }
                result[key] = replacedValue;
            }
            else if (Array.isArray(value)) {
                result[key] = value.map(function (item) {
                    return typeof item === 'object' && item !== null
                        ? _this.replaceTokens(item)
                        : typeof item === 'string'
                            ? _this.replaceStringTokens(item)
                            : item;
                });
            }
            else if (typeof value === 'object' && value !== null) {
                result[key] = this.replaceTokens(value);
            }
            else {
                result[key] = value;
            }
        }
        return result;
    };
    /**
     * Replace tokens in a string value
     *
     * @param str - String to process
     * @returns String with tokens replaced
     */
    ResourceTransformer.prototype.replaceStringTokens = function (str) {
        // Don't replace tokens in ARM expressions (strings starting with '[')
        if (str.startsWith('[')) {
            return str;
        }
        var result = str;
        // Replace {subscriptionId} with ARM expression
        result = result.replace(/\{subscriptionId\}/g, '[subscription().subscriptionId]');
        // Replace {resourceGroupName} with ARM expression
        result = result.replace(/\{resourceGroupName\}/g, '[resourceGroup().name]');
        return result;
    };
    /**
     * Generate resource ID for ARM template reference
     */
    ResourceTransformer.generateResourceId = function (resource) {
        return "[resourceId('".concat(resource.type, "', '").concat(resource.name, "')]");
    };
    return ResourceTransformer;
}());
exports.ResourceTransformer = ResourceTransformer;
