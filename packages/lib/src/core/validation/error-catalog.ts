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
export enum ErrorSeverity {
  /** Critical error that blocks synthesis */
  ERROR = 'error',
  /** Warning that should be addressed but doesn't block */
  WARNING = 'warning',
  /** Informational message */
  INFO = 'info',
}

/**
 * Error category for organization
 */
export enum ErrorCategory {
  ARM_STRUCTURE = 'ARM Structure',
  DEPLOYMENT = 'Deployment',
  NETWORKING = 'Networking',
  SECURITY = 'Security',
  TYPE_SAFETY = 'Type Safety',
  SCHEMA = 'Schema',
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
export const ErrorCatalog = {
  //
  // ARM Structure Errors (ARM001-ARM099)
  //

  ARM001: {
    code: 'ARM001',
    category: ErrorCategory.ARM_STRUCTURE,
    title: 'Invalid Delegation Structure',
    message: 'Delegation structure requires properties wrapper',
    description: `ARM requires delegation objects to be wrapped in a properties field. The serviceName must be inside properties: { serviceName: "..." }. This is an ARM-specific requirement that applies to subnet delegations.`,
    example: `{
  name: 'webapp-delegation',
  properties: {
    serviceName: 'Microsoft.Web/serverFarms'
  }
}`,
    suggestion: 'Wrap your delegation serviceName in a properties object',
    relatedDocs: '/docs/guides/common-validation-errors.md#arm001',
    severity: ErrorSeverity.ERROR,
  },

  ARM002: {
    code: 'ARM002',
    category: ErrorCategory.ARM_STRUCTURE,
    title: 'Subnet Address Prefix Incorrect',
    message: 'Subnet addressPrefix must be inside properties object',
    description: `ARM subnet structure requires addressPrefix to be nested inside the properties field, not at the root level of the subnet object. This is part of ARM's resource property pattern.`,
    example: `{
  name: 'MySubnet',
  properties: {
    addressPrefix: '10.0.1.0/24'
  }
}`,
    suggestion: 'Move addressPrefix into the properties object',
    relatedDocs: '/docs/guides/common-validation-errors.md#arm002',
    severity: ErrorSeverity.ERROR,
  },

  ARM003: {
    code: 'ARM003',
    category: ErrorCategory.ARM_STRUCTURE,
    title: 'Invalid Resource Reference',
    message: 'Resource reference must use ARM expression syntax',
    description: `Resource references in ARM templates must use ARM expression syntax with resourceId() function, not literal strings. Literal strings don't establish proper dependencies and won't resolve correctly during deployment.`,
    example: `{
  networkSecurityGroup: {
    id: "[resourceId('Microsoft.Network/networkSecurityGroups', 'MyNSG')]"
  }
}`,
    suggestion: `Use resourceId() ARM expression instead of literal string. Pass the construct directly or use ResourceReference.fromId() for existing resources.`,
    relatedDocs: '/docs/guides/common-validation-errors.md#arm003',
    severity: ErrorSeverity.ERROR,
  },

  //
  // Deployment Errors (ARM004-ARM099)
  //

  ARM004: {
    code: 'ARM004',
    category: ErrorCategory.DEPLOYMENT,
    title: 'Network Access Lockdown Before Deployment',
    message: 'Network access locked down before deployment prevents provisioning',
    description: `The resource has publicNetworkAccess set to 'Disabled' in the deployment template. Azure Resource Manager needs network access to provision resources. Setting publicNetworkAccess to 'Disabled' before deployment prevents ARM from completing provisioning, causing timeouts or failures.`,
    example: `// Deploy with access enabled
const storage = new StorageAccount(stack, 'Storage', {
  publicNetworkAccess: 'Enabled', // Allow during deployment
});

// Lock down post-deployment using policy or template update`,
    suggestion: `Set publicNetworkAccess to 'Enabled' for initial deployment, then lock down using Azure Policy or a second deployment after the resource is fully provisioned.`,
    relatedDocs: '/docs/guides/common-validation-errors.md#arm004',
    severity: ErrorSeverity.ERROR,
  },

  //
  // Networking Errors (NET001-NET099)
  //

  NET001: {
    code: 'NET001',
    category: ErrorCategory.NETWORKING,
    title: 'Subnet CIDR Outside VNet Range',
    message: 'Subnet CIDR {subnetCidr} is not within VNet range {vnetCidr}',
    description: `The subnet's addressPrefix (CIDR range) falls outside the VNet's addressSpace. All subnets must be within their parent VNet's address range. Check your CIDR calculations.`,
    example: `const vnet = new VirtualNetwork(stack, 'VNet', {
  addressSpace: ['10.0.0.0/16'],
});

const subnet = new Subnet(vnet, 'AppSubnet', {
  addressPrefix: '10.0.1.0/24', // Within VNet range
});`,
    suggestion:
      'Ensure the subnet CIDR is within the VNet address space. For VNet 10.0.0.0/16, subnets must be 10.0.x.x/y where y >= 16.',
    relatedDocs: '/docs/guides/common-validation-errors.md#net001',
    severity: ErrorSeverity.ERROR,
  },

  NET002: {
    code: 'NET002',
    category: ErrorCategory.NETWORKING,
    title: 'Overlapping Subnet Address Spaces',
    message: 'Subnet address spaces overlap: {subnet1} and {subnet2}',
    description: `Two or more subnets have overlapping CIDR ranges. Each subnet must have a unique, non-overlapping address space within the VNet. Overlapping subnets cause deployment failures.`,
    example: `const subnet1 = new Subnet(vnet, 'Subnet1', {
  addressPrefix: '10.0.1.0/24',
});

const subnet2 = new Subnet(vnet, 'Subnet2', {
  addressPrefix: '10.0.2.0/24', // No overlap
});`,
    suggestion:
      'Assign non-overlapping CIDR ranges to each subnet. Use a subnet planning tool or calculator to avoid overlaps.',
    relatedDocs: '/docs/guides/common-validation-errors.md#net002',
    severity: ErrorSeverity.ERROR,
  },

  //
  // Security Errors (SEC001-SEC099)
  //

  SEC001: {
    code: 'SEC001',
    category: ErrorCategory.SECURITY,
    title: 'NSG Rule Priority Conflict',
    message: 'NSG rule priority conflict: rules {rule1} and {rule2} both have priority {priority}',
    description: `Two or more NSG rules have the same priority value. Each security rule in a Network Security Group must have a unique priority between 100 and 4096. Lower numbers have higher priority.`,
    example: `const nsg = new NetworkSecurityGroup(stack, 'NSG', {
  securityRules: [
    { name: 'AllowHTTPS', priority: 100, ... },
    { name: 'AllowHTTP', priority: 110, ... }, // Unique priority
  ],
});`,
    suggestion:
      'Assign unique priorities to each NSG rule. Leave gaps (10-100) between priorities to allow for future rules.',
    relatedDocs: '/docs/guides/common-validation-errors.md#sec001',
    severity: ErrorSeverity.ERROR,
  },

  //
  // Type Safety Errors (TYPE001-TYPE099)
  //

  TYPE001: {
    code: 'TYPE001',
    category: ErrorCategory.TYPE_SAFETY,
    title: 'Invalid Property Type',
    message: 'Property {property} has invalid type {actual}, expected {expected}',
    description: `A property value doesn't match the expected type. This is caught at compile-time by TypeScript but reported here for runtime scenarios.`,
    example: `const vnet = new VirtualNetwork(stack, 'VNet', {
  addressSpace: ['10.0.0.0/16'], // Array of strings
});`,
    suggestion:
      'Check the property type definition and ensure your value matches. Use TypeScript for compile-time validation.',
    relatedDocs: '/docs/guides/validation-architecture.md#layer-1-compile-time-type-safety',
    severity: ErrorSeverity.ERROR,
  },

  //
  // Schema Errors (SCHEMA001-SCHEMA099)
  //

  SCHEMA001: {
    code: 'SCHEMA001',
    category: ErrorCategory.SCHEMA,
    title: 'Schema Validation Failed',
    message: 'Resource {resource} failed schema validation: {details}',
    description: `The generated ARM resource doesn't match Azure's schema requirements. This could be due to missing required fields, invalid values, or incorrect structure.`,
    example: `// Ensure all required fields are provided and match schema`,
    suggestion:
      'Check the Azure ARM schema documentation for the resource type and API version. Ensure all required properties are set.',
    relatedDocs: '/docs/guides/validation-architecture.md#layer-5-schema-compliance-synthesis-time',
    severity: ErrorSeverity.ERROR,
  },
} as const;

/**
 * Type representing all valid error codes
 */
export type ErrorCode = keyof typeof ErrorCatalog;

/**
 * Validation error class with error catalog integration
 */
export class ValidationError extends Error {
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly title: string;
  public readonly description: string;
  public readonly example: string;
  public readonly suggestion: string;
  public readonly relatedDocs: string;
  public readonly severity: ErrorSeverity;
  public readonly context?: Record<string, string>;

  constructor(errorCode: ErrorCode, context?: Record<string, string>) {
    const errorDef = ErrorCatalog[errorCode];
    const message = interpolate(errorDef.message, context);

    super(message);

    this.name = 'ValidationError';
    this.code = errorDef.code;
    this.category = errorDef.category;
    this.title = errorDef.title;
    this.message = message;
    this.description = errorDef.description;
    this.example = errorDef.example;
    this.suggestion = interpolate(errorDef.suggestion, context);
    this.relatedDocs = errorDef.relatedDocs;
    this.severity = errorDef.severity;
    this.context = context;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  /**
   * Format error for display
   */
  public format(): string {
    const lines = [`ValidationError [${this.code}]: ${this.title}`, `  ${this.message}`];

    if (this.context) {
      lines.push('');
      lines.push('Context:');
      Object.entries(this.context).forEach(([key, value]) => {
        lines.push(`  ${key}: ${value}`);
      });
    }

    lines.push('');
    lines.push('Suggestion:');
    lines.push(`  ${this.suggestion}`);

    lines.push('');
    lines.push('Documentation:');
    lines.push(`  ${this.relatedDocs}`);

    if (this.example) {
      lines.push('');
      lines.push('Example:');
      this.example.split('\n').forEach((line) => {
        lines.push(`  ${line}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Get error as JSON
   */
  public toJSON(): object {
    return {
      code: this.code,
      category: this.category,
      title: this.title,
      message: this.message,
      description: this.description,
      suggestion: this.suggestion,
      relatedDocs: this.relatedDocs,
      severity: this.severity,
      context: this.context,
      example: this.example,
    };
  }
}

/**
 * Interpolate placeholders in strings with context values
 *
 * Example: interpolate("Value {x} is invalid", { x: "foo" }) -> "Value foo is invalid"
 */
function interpolate(template: string, context?: Record<string, string>): string {
  if (!context) return template;

  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return context[key] !== undefined ? context[key] : match;
  });
}

/**
 * Type-safe error creation helper
 *
 * @example
 * throw createValidationError('ARM001');
 * throw createValidationError('NET001', { subnetCidr: '192.168.1.0/24', vnetCidr: '10.0.0.0/16' });
 */
export function createValidationError(
  code: ErrorCode,
  context?: Record<string, string>
): ValidationError {
  return new ValidationError(code, context);
}

/**
 * Get error definition without throwing
 */
export function getErrorDefinition(code: ErrorCode): ErrorDefinition {
  return ErrorCatalog[code];
}

/**
 * Get all errors in a category
 */
export function getErrorsByCategory(category: ErrorCategory): ErrorDefinition[] {
  return Object.values(ErrorCatalog).filter((error) => error.category === category);
}

/**
 * Search errors by keyword
 */
export function searchErrors(keyword: string): ErrorDefinition[] {
  const lowerKeyword = keyword.toLowerCase();
  return Object.values(ErrorCatalog).filter((error) => {
    return (
      error.code.toLowerCase().includes(lowerKeyword) ||
      error.title.toLowerCase().includes(lowerKeyword) ||
      error.description.toLowerCase().includes(lowerKeyword) ||
      error.message.toLowerCase().includes(lowerKeyword)
    );
  });
}

/**
 * Export error definitions for documentation generation
 */
export function getAllErrors(): ErrorDefinition[] {
  return Object.values(ErrorCatalog);
}
