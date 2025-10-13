"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateScopedName = generateScopedName;
exports.validateScopedParams = validateScopedParams;
var scopes_1 = require("../core/azure/scopes");
var conventions_1 = require("./conventions");
/**
 * Generate resource name based on deployment scope.
 *
 * @param params - Scoped naming parameters
 * @param conventions - Optional naming conventions (uses defaults if not provided)
 * @returns Generated resource name appropriate for the scope
 *
 * @remarks
 * Different scopes have different naming patterns:
 * - **Tenant**: `{prefix}-{purpose}`
 * - **ManagementGroup**: `{prefix}-{org}-{purpose}`
 * - **Subscription**: `{prefix}-{purpose}-{org}-{project}-{env}-{geo}-{instance}`
 * - **ResourceGroup**: Same as Subscription
 *
 * @example
 * Subscription scope:
 * ```typescript
 * const name = generateScopedName({
 *   scope: DeploymentScope.Subscription,
 *   resourceType: 'rg',
 *   organization: 'digital-minion',
 *   project: 'authr',
 *   purpose: 'data',
 *   environment: 'nonprod',
 *   geography: 'eastus',
 *   instance: '01'
 * });
 * // Result: "rg-data-digital-minion-authr-nonprod-eastus-01"
 * ```
 *
 * @example
 * Management Group scope:
 * ```typescript
 * const name = generateScopedName({
 *   scope: DeploymentScope.ManagementGroup,
 *   resourceType: 'mg',
 *   organization: 'digital-minion',
 *   purpose: 'platform'
 * });
 * // Result: "mg-digital-minion-platform"
 * ```
 */
function generateScopedName(params, conventions) {
    var _a, _b;
    var conv = conventions !== null && conventions !== void 0 ? conventions : conventions_1.DEFAULT_CONVENTIONS;
    // Validate parameters for scope
    var validation = validateScopedParams(params);
    if (!validation.isValid) {
        throw new Error("Invalid scoped naming parameters: ".concat(validation.errors.join(', ')));
    }
    // Get resource pattern
    var pattern = (_a = conv.patterns[params.resourceType]) !== null && _a !== void 0 ? _a : params.resourceType;
    // Import DeploymentScope enum to use in switch
    // Build name based on scope
    var components = [pattern];
    switch (params.scope) {
        case scopes_1.DeploymentScope.Tenant:
            // Tenant: {prefix}-{purpose}
            if (params.purpose) {
                components.push(params.purpose);
            }
            break;
        case scopes_1.DeploymentScope.ManagementGroup:
            // ManagementGroup: {prefix}-{org}-{purpose}
            if (params.organization) {
                components.push(params.organization);
            }
            if (params.purpose) {
                components.push(params.purpose);
            }
            break;
        case scopes_1.DeploymentScope.Subscription:
        case scopes_1.DeploymentScope.ResourceGroup:
            // Subscription/ResourceGroup: Full naming convention
            // {prefix}-{purpose}-{org}-{project}-{env}-{geo}-{instance}
            if (params.purpose)
                components.push(params.purpose);
            if (params.organization)
                components.push(params.organization);
            if (params.project)
                components.push(params.project);
            if (params.environment)
                components.push(params.environment);
            if (params.geography)
                components.push(params.geography);
            if (params.instance)
                components.push(params.instance);
            break;
    }
    // Add additional suffix if provided
    if (params.additionalSuffix) {
        components.push(params.additionalSuffix);
    }
    // Join with separator
    var name = components.join(conv.separator);
    // Apply resource-specific transformations
    var specialRules = (0, conventions_1.getSpecialCaseRules)(params.resourceType);
    if (specialRules) {
        if (specialRules.removeHyphens) {
            name = name.replace(/-/g, '');
        }
        if (specialRules.forceLowercase) {
            name = name.toLowerCase();
        }
    }
    // Apply length limits
    var maxLength = (_b = conv.maxLengths[params.resourceType]) !== null && _b !== void 0 ? _b : conv.maxLength;
    if (name.length > maxLength) {
        name = name.substring(0, maxLength);
    }
    return name;
}
/**
 * Validate that required naming parameters are present for scope.
 *
 * @param params - Scoped naming parameters
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = validateScopedParams({
 *   scope: DeploymentScope.Subscription,
 *   resourceType: 'rg',
 *   organization: 'digital-minion',
 *   project: 'authr'
 *   // Missing: environment, geography, instance
 * });
 * // result.isValid === false
 * // result.errors === ['Missing required parameter: environment', ...]
 * ```
 */
function validateScopedParams(params) {
    var _a;
    var errors = [];
    var warnings = [];
    // Import DeploymentScope enum
    // Check resourceType
    if (!params.resourceType || params.resourceType.trim().length === 0) {
        errors.push('resourceType is required');
    }
    // Scope-specific validation
    switch (params.scope) {
        case scopes_1.DeploymentScope.Tenant:
            // Tenant: No additional required params
            break;
        case scopes_1.DeploymentScope.ManagementGroup:
            // ManagementGroup: Requires organization
            if (!params.organization) {
                errors.push('organization is required for ManagementGroup scope');
            }
            break;
        case scopes_1.DeploymentScope.Subscription:
        case scopes_1.DeploymentScope.ResourceGroup:
            // Subscription/ResourceGroup: Requires full naming context
            var requiredParams = [
                'organization',
                'project',
                'environment',
                'geography',
                'instance',
            ];
            for (var _i = 0, requiredParams_1 = requiredParams; _i < requiredParams_1.length; _i++) {
                var param = requiredParams_1[_i];
                if (!params[param] || ((_a = params[param]) === null || _a === void 0 ? void 0 : _a.trim().length) === 0) {
                    errors.push("".concat(param, " is required for ").concat(params.scope === scopes_1.DeploymentScope.Subscription ? 'Subscription' : 'ResourceGroup', " scope"));
                }
            }
            break;
    }
    return {
        isValid: errors.length === 0,
        errors: Object.freeze(errors),
        warnings: Object.freeze(warnings),
    };
}
