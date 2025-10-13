/**
 * Comprehensive error catalog for Atakora validation errors.
 *
 * Every validation error in the system is defined here with:
 * - Unique error code
 * - Clear title and message
 * - Detailed description
 * - Code example showing correct usage
 * - Actionable suggestion for fixing
 * - Link to documentation
 * - Severity level
 *
 * @module error-catalog
 */
/**
 * Error severity levels
 */
export declare enum ErrorSeverity {
    /** Critical error that blocks synthesis */
    ERROR = "error",
    /** Warning that should be addressed but doesn't block */
    WARNING = "warning",
    /** Informational message */
    INFO = "info"
}
/**
 * Error category for organization
 */
export declare enum ErrorCategory {
    ARM_STRUCTURE = "ARM Structure",
    DEPLOYMENT = "Deployment",
    NETWORKING = "Networking",
    SECURITY = "Security",
    TYPE_SAFETY = "Type Safety",
    SCHEMA = "Schema"
}
/**
 * Error definition structure
 */
export interface ErrorDefinition {
    /** Unique error code (e.g., "ARM001") */
    code: string;
    /** Category this error belongs to */
    category: ErrorCategory;
    /** Short title for the error */
    title: string;
    /** Error message template (supports {placeholders}) */
    message: string;
    /** Detailed explanation of what went wrong */
    description: string;
    /** Code example showing correct usage */
    example: string;
    /** Actionable suggestion for fixing the error */
    suggestion: string;
    /** Link to documentation for this error */
    relatedDocs: string;
    /** Severity level */
    severity: ErrorSeverity;
}
/**
 * Comprehensive error catalog
 *
 * Organized by error code for easy lookup
 */
export declare const ErrorCatalog: {
    readonly ARM001: {
        readonly code: "ARM001";
        readonly category: ErrorCategory.ARM_STRUCTURE;
        readonly title: "Invalid Delegation Structure";
        readonly message: "Delegation structure requires properties wrapper";
        readonly description: "ARM requires delegation objects to be wrapped in a properties field. The serviceName must be inside properties: { serviceName: \"...\" }. This is an ARM-specific requirement that applies to subnet delegations.";
        readonly example: "{\n  name: 'webapp-delegation',\n  properties: {\n    serviceName: 'Microsoft.Web/serverFarms'\n  }\n}";
        readonly suggestion: "Wrap your delegation serviceName in a properties object";
        readonly relatedDocs: "/docs/guides/common-validation-errors.md#arm001";
        readonly severity: ErrorSeverity.ERROR;
    };
    readonly ARM002: {
        readonly code: "ARM002";
        readonly category: ErrorCategory.ARM_STRUCTURE;
        readonly title: "Subnet Address Prefix Incorrect";
        readonly message: "Subnet addressPrefix must be inside properties object";
        readonly description: "ARM subnet structure requires addressPrefix to be nested inside the properties field, not at the root level of the subnet object. This is part of ARM's resource property pattern.";
        readonly example: "{\n  name: 'MySubnet',\n  properties: {\n    addressPrefix: '10.0.1.0/24'\n  }\n}";
        readonly suggestion: "Move addressPrefix into the properties object";
        readonly relatedDocs: "/docs/guides/common-validation-errors.md#arm002";
        readonly severity: ErrorSeverity.ERROR;
    };
    readonly ARM003: {
        readonly code: "ARM003";
        readonly category: ErrorCategory.ARM_STRUCTURE;
        readonly title: "Invalid Resource Reference";
        readonly message: "Resource reference must use ARM expression syntax";
        readonly description: "Resource references in ARM templates must use ARM expression syntax with resourceId() function, not literal strings. Literal strings don't establish proper dependencies and won't resolve correctly during deployment.";
        readonly example: "{\n  networkSecurityGroup: {\n    id: \"[resourceId('Microsoft.Network/networkSecurityGroups', 'MyNSG')]\"\n  }\n}";
        readonly suggestion: "Use resourceId() ARM expression instead of literal string. Pass the construct directly or use ResourceReference.fromId() for existing resources.";
        readonly relatedDocs: "/docs/guides/common-validation-errors.md#arm003";
        readonly severity: ErrorSeverity.ERROR;
    };
    readonly ARM004: {
        readonly code: "ARM004";
        readonly category: ErrorCategory.DEPLOYMENT;
        readonly title: "Network Access Lockdown Before Deployment";
        readonly message: "Network access locked down before deployment prevents provisioning";
        readonly description: "The resource has publicNetworkAccess set to 'Disabled' in the deployment template. Azure Resource Manager needs network access to provision resources. Setting publicNetworkAccess to 'Disabled' before deployment prevents ARM from completing provisioning, causing timeouts or failures.";
        readonly example: "// Deploy with access enabled\nconst storage = new StorageAccount(stack, 'Storage', {\n  publicNetworkAccess: 'Enabled', // Allow during deployment\n});\n\n// Lock down post-deployment using policy or template update";
        readonly suggestion: "Set publicNetworkAccess to 'Enabled' for initial deployment, then lock down using Azure Policy or a second deployment after the resource is fully provisioned.";
        readonly relatedDocs: "/docs/guides/common-validation-errors.md#arm004";
        readonly severity: ErrorSeverity.ERROR;
    };
    readonly NET001: {
        readonly code: "NET001";
        readonly category: ErrorCategory.NETWORKING;
        readonly title: "Subnet CIDR Outside VNet Range";
        readonly message: "Subnet CIDR {subnetCidr} is not within VNet range {vnetCidr}";
        readonly description: "The subnet's addressPrefix (CIDR range) falls outside the VNet's addressSpace. All subnets must be within their parent VNet's address range. Check your CIDR calculations.";
        readonly example: "const vnet = new VirtualNetwork(stack, 'VNet', {\n  addressSpace: ['10.0.0.0/16'],\n});\n\nconst subnet = new Subnet(vnet, 'AppSubnet', {\n  addressPrefix: '10.0.1.0/24', // Within VNet range\n});";
        readonly suggestion: "Ensure the subnet CIDR is within the VNet address space. For VNet 10.0.0.0/16, subnets must be 10.0.x.x/y where y >= 16.";
        readonly relatedDocs: "/docs/guides/common-validation-errors.md#net001";
        readonly severity: ErrorSeverity.ERROR;
    };
    readonly NET002: {
        readonly code: "NET002";
        readonly category: ErrorCategory.NETWORKING;
        readonly title: "Overlapping Subnet Address Spaces";
        readonly message: "Subnet address spaces overlap: {subnet1} and {subnet2}";
        readonly description: "Two or more subnets have overlapping CIDR ranges. Each subnet must have a unique, non-overlapping address space within the VNet. Overlapping subnets cause deployment failures.";
        readonly example: "const subnet1 = new Subnet(vnet, 'Subnet1', {\n  addressPrefix: '10.0.1.0/24',\n});\n\nconst subnet2 = new Subnet(vnet, 'Subnet2', {\n  addressPrefix: '10.0.2.0/24', // No overlap\n});";
        readonly suggestion: "Assign non-overlapping CIDR ranges to each subnet. Use a subnet planning tool or calculator to avoid overlaps.";
        readonly relatedDocs: "/docs/guides/common-validation-errors.md#net002";
        readonly severity: ErrorSeverity.ERROR;
    };
    readonly SEC001: {
        readonly code: "SEC001";
        readonly category: ErrorCategory.SECURITY;
        readonly title: "NSG Rule Priority Conflict";
        readonly message: "NSG rule priority conflict: rules {rule1} and {rule2} both have priority {priority}";
        readonly description: "Two or more NSG rules have the same priority value. Each security rule in a Network Security Group must have a unique priority between 100 and 4096. Lower numbers have higher priority.";
        readonly example: "const nsg = new NetworkSecurityGroup(stack, 'NSG', {\n  securityRules: [\n    { name: 'AllowHTTPS', priority: 100, ... },\n    { name: 'AllowHTTP', priority: 110, ... }, // Unique priority\n  ],\n});";
        readonly suggestion: "Assign unique priorities to each NSG rule. Leave gaps (10-100) between priorities to allow for future rules.";
        readonly relatedDocs: "/docs/guides/common-validation-errors.md#sec001";
        readonly severity: ErrorSeverity.ERROR;
    };
    readonly TYPE001: {
        readonly code: "TYPE001";
        readonly category: ErrorCategory.TYPE_SAFETY;
        readonly title: "Invalid Property Type";
        readonly message: "Property {property} has invalid type {actual}, expected {expected}";
        readonly description: "A property value doesn't match the expected type. This is caught at compile-time by TypeScript but reported here for runtime scenarios.";
        readonly example: "const vnet = new VirtualNetwork(stack, 'VNet', {\n  addressSpace: ['10.0.0.0/16'], // Array of strings\n});";
        readonly suggestion: "Check the property type definition and ensure your value matches. Use TypeScript for compile-time validation.";
        readonly relatedDocs: "/docs/guides/validation-architecture.md#layer-1-compile-time-type-safety";
        readonly severity: ErrorSeverity.ERROR;
    };
    readonly SCHEMA001: {
        readonly code: "SCHEMA001";
        readonly category: ErrorCategory.SCHEMA;
        readonly title: "Schema Validation Failed";
        readonly message: "Resource {resource} failed schema validation: {details}";
        readonly description: "The generated ARM resource doesn't match Azure's schema requirements. This could be due to missing required fields, invalid values, or incorrect structure.";
        readonly example: "// Ensure all required fields are provided and match schema";
        readonly suggestion: "Check the Azure ARM schema documentation for the resource type and API version. Ensure all required properties are set.";
        readonly relatedDocs: "/docs/guides/validation-architecture.md#layer-5-schema-compliance-synthesis-time";
        readonly severity: ErrorSeverity.ERROR;
    };
};
/**
 * Type representing all valid error codes
 */
export type ErrorCode = keyof typeof ErrorCatalog;
/**
 * Validation error class with error catalog integration
 */
export declare class ValidationError extends Error {
    readonly code: string;
    readonly category: ErrorCategory;
    readonly title: string;
    readonly description: string;
    readonly example: string;
    readonly suggestion: string;
    readonly relatedDocs: string;
    readonly severity: ErrorSeverity;
    readonly context?: Record<string, string>;
    constructor(errorCode: ErrorCode, context?: Record<string, string>);
    /**
     * Format error for display
     */
    format(): string;
    /**
     * Get error as JSON
     */
    toJSON(): object;
}
/**
 * Type-safe error creation helper
 *
 * @example
 * throw createValidationError('ARM001');
 * throw createValidationError('NET001', { subnetCidr: '192.168.1.0/24', vnetCidr: '10.0.0.0/16' });
 */
export declare function createValidationError(code: ErrorCode, context?: Record<string, string>): ValidationError;
/**
 * Get error definition without throwing
 */
export declare function getErrorDefinition(code: ErrorCode): ErrorDefinition;
/**
 * Get all errors in a category
 */
export declare function getErrorsByCategory(category: ErrorCategory): ErrorDefinition[];
/**
 * Search errors by keyword
 */
export declare function searchErrors(keyword: string): ErrorDefinition[];
/**
 * Export error definitions for documentation generation
 */
export declare function getAllErrors(): ErrorDefinition[];
//# sourceMappingURL=error-catalog.d.ts.map