/**
 * ARM Expression Validator
 *
 * Validates ARM template expressions to prevent deployment failures caused by:
 * - Improperly formatted resourceId() expressions
 * - Literal strings where ARM expressions are required
 * - Missing brackets around ARM expressions
 * - Invalid parameter/variable references
 *
 * This validator catches issues that would only surface during deployment,
 * providing early feedback with actionable fix suggestions.
 */

import { ArmTemplate, ValidationResult } from '../types';
import { BaseValidator } from './validator-registry';
import {
  isArmExpression,
  isResourceIdExpression,
  isParameterReference,
  isVariableReference,
  isValidArmSubnet,
  isValidArmSubnetDelegation,
} from '../transform/types';

/**
 * ARM expression patterns
 */
const ARM_EXPRESSION_PATTERNS = {
  // Valid ARM expression (starts with [ and ends with ])
  armExpression: /^\[.+\]$/,

  // Valid resourceId call with proper quotes
  resourceIdSimple: /^\[resourceId\(['"]\w+(?:\.\w+)*\/\w+['"]\s*,\s*['"].+['"]\)\]$/,

  // Parameter reference
  parameterRef: /^\[parameters\(['"][^'"]+['"]\)\]$/,

  // Variable reference
  variableRef: /^\[variables\(['"][^'"]+['"]\)\]$/,

  // Subscription/tenant/resourceGroup functions
  contextFunctions: /^\[(subscription|tenant|resourceGroup)\(\)\.[\w]+\]$/,

  // Literal Azure resource ID (starts with /subscriptions/)
  literalResourceId: /^\/subscriptions\/[a-f0-9-]+\/resourceGroups\/.+/i,

  // Literal strings that look like they should be ARM expressions
  suspiciousLiteral: /^(resourceId|parameters|variables|concat|subscription|resourceGroup)\(/,
};

/**
 * Expected ARM expression locations
 */
interface ArmExpressionContext {
  path: string;
  value: unknown;
  expectedType: 'resourceId' | 'parameter' | 'variable' | 'expression' | 'any';
  resourceType?: string;
}

/**
 * Validates ARM template expressions for correctness
 *
 * Prevents common mistakes that cause deployment failures:
 * - Using literal resource IDs instead of resourceId() expressions
 * - Missing brackets around ARM expressions
 * - Incorrectly formatted resourceId() calls
 * - Invalid property nesting (missing properties wrappers)
 */
export class ArmExpressionValidator extends BaseValidator {
  readonly name = 'ArmExpressionValidator';

  validate(template: ArmTemplate, stackName: string): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Validate each resource
    for (const resource of template.resources) {
      const resourcePath = `${stackName}/resources/${resource.name}`;

      // Validate resource dependencies
      if (resource.dependsOn && Array.isArray(resource.dependsOn)) {
        for (let i = 0; i < resource.dependsOn.length; i++) {
          const dependency = resource.dependsOn[i];
          const depPath = `${resourcePath}/dependsOn[${i}]`;

          if (typeof dependency === 'string') {
            this.validateDependency(dependency, depPath, errors, warnings);
          }
        }
      }

      // Validate resource properties based on type
      if (resource.type === 'Microsoft.Network/virtualNetworks') {
        this.validateVirtualNetwork(resource, resourcePath, errors, warnings);
      } else if (resource.type === 'Microsoft.Network/networkSecurityGroups') {
        this.validateNetworkSecurityGroup(resource, resourcePath, errors, warnings);
      } else if (resource.type === 'Microsoft.Storage/storageAccounts') {
        this.validateStorageAccount(resource, resourcePath, errors, warnings);
      }

      // Generic property validation
      if (resource.properties && typeof resource.properties === 'object') {
        this.validateProperties(
          resource.properties,
          `${resourcePath}/properties`,
          resource.type,
          errors,
          warnings
        );
      }

      // Validate location if it's a string (could be ARM expression)
      if (resource.location && typeof resource.location === 'string') {
        this.validateLocationExpression(resource.location, `${resourcePath}/location`, warnings);
      }
    }

    // Validate parameters
    if (template.parameters) {
      for (const [paramName, param] of Object.entries(template.parameters)) {
        if (param.defaultValue && typeof param.defaultValue === 'string') {
          this.validateParameterDefault(
            param.defaultValue,
            `${stackName}/parameters/${paramName}/defaultValue`,
            warnings
          );
        }
      }
    }

    // Validate outputs
    if (template.outputs) {
      for (const [outputName, output] of Object.entries(template.outputs)) {
        if (typeof output.value === 'string') {
          this.validateOutputValue(
            output.value,
            `${stackName}/outputs/${outputName}/value`,
            errors,
            warnings
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate a dependency reference
   */
  private validateDependency(
    dependency: string,
    path: string,
    errors: any[],
    warnings: any[]
  ): void {
    // Dependencies should be ARM expressions (usually resourceId())
    if (!isArmExpression(dependency)) {
      if (ARM_EXPRESSION_PATTERNS.literalResourceId.test(dependency)) {
        errors.push(
          this.createError(
            `Dependency uses literal resource ID instead of ARM expression`,
            path,
            'LITERAL_RESOURCE_ID_IN_DEPENDENCY',
            `Use resourceId() function instead: [resourceId('resourceType', 'resourceName')]`
          )
        );
      } else if (ARM_EXPRESSION_PATTERNS.suspiciousLiteral.test(dependency)) {
        errors.push(
          this.createError(
            `Dependency appears to be missing brackets around ARM expression`,
            path,
            'MISSING_EXPRESSION_BRACKETS',
            `Wrap the expression in brackets: [${dependency}]`
          )
        );
      } else {
        warnings.push(
          this.createWarning(
            `Dependency is not an ARM expression - this may cause deployment issues`,
            path,
            'NON_EXPRESSION_DEPENDENCY',
            `Expected an ARM expression like: [resourceId('Microsoft.Network/virtualNetworks', 'vnetName')]`
          )
        );
      }
    } else if (!isResourceIdExpression(dependency) && !isVariableReference(dependency)) {
      // It's an ARM expression but not resourceId or variable - this is unusual but might be valid
      warnings.push(
        this.createWarning(
          `Dependency uses uncommon ARM expression format`,
          path,
          'UNCOMMON_DEPENDENCY_FORMAT',
          `Consider using resourceId() for clarity: [resourceId('resourceType', 'resourceName')]`
        )
      );
    }
  }

  /**
   * Validate Virtual Network resource
   */
  private validateVirtualNetwork(
    resource: any,
    path: string,
    errors: any[],
    warnings: any[]
  ): void {
    const props = resource.properties;
    if (!props || typeof props !== 'object') {
      return;
    }

    // Validate subnets if inline
    if (Array.isArray(props.subnets)) {
      for (let i = 0; i < props.subnets.length; i++) {
        const subnet = props.subnets[i];
        const subnetPath = `${path}/properties/subnets[${i}]`;

        // Check if subnet has name
        if (!subnet || typeof subnet !== 'object') {
          errors.push(
            this.createError(`Subnet at index ${i} is invalid`, subnetPath, 'INVALID_SUBNET')
          );
          continue;
        }

        if (typeof subnet.name !== 'string' || subnet.name.length === 0) {
          errors.push(
            this.createError(
              `Subnet at index ${i} is missing name property`,
              subnetPath,
              'MISSING_SUBNET_NAME'
            )
          );
          continue;
        }

        // CRITICAL: Validate subnet has properties wrapper
        if (!subnet.properties || typeof subnet.properties !== 'object') {
          errors.push(
            this.createError(
              `Subnet '${subnet.name}' is missing required properties wrapper`,
              subnetPath,
              'MISSING_SUBNET_PROPERTIES_WRAPPER',
              `Subnet must have structure: { name: "...", properties: { addressPrefix: "..." } }`
            )
          );
          continue;
        }

        // Validate subnet properties
        const subnetProps = subnet.properties as any;

        // Validate addressPrefix is present
        if (
          typeof subnetProps.addressPrefix !== 'string' ||
          subnetProps.addressPrefix.length === 0
        ) {
          errors.push(
            this.createError(
              `Subnet '${subnet.name}' is missing addressPrefix in properties`,
              `${subnetPath}/properties`,
              'MISSING_ADDRESS_PREFIX'
            )
          );
        }

        // Validate delegations if present
        if (Array.isArray(subnetProps.delegations)) {
          for (let j = 0; j < subnetProps.delegations.length; j++) {
            const delegation = subnetProps.delegations[j];
            const delegationPath = `${subnetPath}/properties/delegations[${j}]`;

            // CRITICAL: Validate delegation structure
            if (!isValidArmSubnetDelegation(delegation)) {
              errors.push(
                this.createError(
                  `Delegation '${delegation.name || j}' is missing required properties wrapper`,
                  delegationPath,
                  'MISSING_DELEGATION_PROPERTIES_WRAPPER',
                  `Delegation must have structure: { name: "...", properties: { serviceName: "..." } }`
                )
              );
            }
          }
        }

        // Validate NSG reference if present
        if (subnetProps.networkSecurityGroup) {
          this.validateNsgReference(
            subnetProps.networkSecurityGroup,
            `${subnetPath}/properties/networkSecurityGroup`,
            errors,
            warnings
          );
        }

        // Validate route table reference if present
        if (subnetProps.routeTable) {
          this.validateResourceReference(
            subnetProps.routeTable,
            `${subnetPath}/properties/routeTable`,
            'Microsoft.Network/routeTables',
            errors,
            warnings
          );
        }

        // Validate NAT gateway reference if present
        if (subnetProps.natGateway) {
          this.validateResourceReference(
            subnetProps.natGateway,
            `${subnetPath}/properties/natGateway`,
            'Microsoft.Network/natGateways',
            errors,
            warnings
          );
        }
      }
    }
  }

  /**
   * Validate Network Security Group resource
   */
  private validateNetworkSecurityGroup(
    resource: any,
    path: string,
    errors: any[],
    warnings: any[]
  ): void {
    const props = resource.properties;
    if (!props || typeof props !== 'object') {
      return;
    }

    // Validate security rules
    if (Array.isArray(props.securityRules)) {
      for (let i = 0; i < props.securityRules.length; i++) {
        const rule = props.securityRules[i];
        const rulePath = `${path}/properties/securityRules[${i}]`;

        // Check if rule has properties wrapper
        if (!rule.properties || typeof rule.properties !== 'object') {
          errors.push(
            this.createError(
              `Security rule '${rule.name || i}' is missing required properties wrapper`,
              rulePath,
              'MISSING_RULE_PROPERTIES_WRAPPER',
              `Rule must have structure: { name: "...", properties: { protocol: "...", ... } }`
            )
          );
        }
      }
    }
  }

  /**
   * Validate Storage Account resource
   */
  private validateStorageAccount(
    resource: any,
    path: string,
    errors: any[],
    warnings: any[]
  ): void {
    const props = resource.properties;
    if (!props || typeof props !== 'object') {
      return;
    }

    // Validate network ACLs
    if (props.networkAcls && typeof props.networkAcls === 'object') {
      const aclsPath = `${path}/properties/networkAcls`;

      // Validate virtual network rules
      if (Array.isArray(props.networkAcls.virtualNetworkRules)) {
        for (let i = 0; i < props.networkAcls.virtualNetworkRules.length; i++) {
          const rule = props.networkAcls.virtualNetworkRules[i];
          this.validateResourceReference(
            rule,
            `${aclsPath}/virtualNetworkRules[${i}]`,
            'Microsoft.Network/virtualNetworks/subnets',
            errors,
            warnings
          );
        }
      }
    }
  }

  /**
   * Validate NSG reference
   */
  private validateNsgReference(nsgRef: any, path: string, errors: any[], warnings: any[]): void {
    if (!nsgRef || typeof nsgRef !== 'object') {
      return;
    }

    if (!nsgRef.id || typeof nsgRef.id !== 'string') {
      errors.push(
        this.createError(`NSG reference is missing 'id' property`, path, 'MISSING_NSG_ID')
      );
      return;
    }

    const id = nsgRef.id;

    // CRITICAL: NSG ID must be an ARM expression, not a literal string
    if (!isArmExpression(id)) {
      if (ARM_EXPRESSION_PATTERNS.literalResourceId.test(id)) {
        errors.push(
          this.createError(
            `NSG reference uses literal resource ID instead of ARM expression`,
            `${path}/id`,
            'LITERAL_NSG_REFERENCE',
            `Use resourceId() function: { id: "[resourceId('Microsoft.Network/networkSecurityGroups', 'nsgName')]" }`
          )
        );
      } else {
        errors.push(
          this.createError(
            `NSG reference must be an ARM expression`,
            `${path}/id`,
            'INVALID_NSG_REFERENCE',
            `Expected: { id: "[resourceId('Microsoft.Network/networkSecurityGroups', 'nsgName')]" }`
          )
        );
      }
    }
  }

  /**
   * Validate generic resource reference
   */
  private validateResourceReference(
    ref: any,
    path: string,
    expectedType: string,
    errors: any[],
    warnings: any[]
  ): void {
    if (!ref || typeof ref !== 'object') {
      return;
    }

    if (!ref.id || typeof ref.id !== 'string') {
      errors.push(
        this.createError(`Resource reference is missing 'id' property`, path, 'MISSING_RESOURCE_ID')
      );
      return;
    }

    const id = ref.id;

    if (!isArmExpression(id)) {
      if (ARM_EXPRESSION_PATTERNS.literalResourceId.test(id)) {
        errors.push(
          this.createError(
            `Resource reference uses literal resource ID instead of ARM expression`,
            `${path}/id`,
            'LITERAL_RESOURCE_REFERENCE',
            `Use resourceId() function: { id: "[resourceId('${expectedType}', 'resourceName')]" }`
          )
        );
      } else {
        errors.push(
          this.createError(
            `Resource reference must be an ARM expression`,
            `${path}/id`,
            'INVALID_RESOURCE_REFERENCE',
            `Expected: { id: "[resourceId('${expectedType}', 'resourceName')]" }`
          )
        );
      }
    }
  }

  /**
   * Validate properties recursively
   */
  private validateProperties(
    props: any,
    path: string,
    resourceType: string,
    errors: any[],
    warnings: any[]
  ): void {
    if (!props || typeof props !== 'object') {
      return;
    }

    for (const [key, value] of Object.entries(props)) {
      const propPath = `${path}/${key}`;

      if (typeof value === 'string') {
        // Check for suspicious literal strings
        if (ARM_EXPRESSION_PATTERNS.suspiciousLiteral.test(value)) {
          errors.push(
            this.createError(
              `Property appears to be missing brackets around ARM expression`,
              propPath,
              'MISSING_EXPRESSION_BRACKETS',
              `Wrap the expression in brackets: [${value}]`
            )
          );
        } else if (ARM_EXPRESSION_PATTERNS.literalResourceId.test(value)) {
          warnings.push(
            this.createWarning(
              `Property uses literal resource ID - consider using resourceId() expression`,
              propPath,
              'LITERAL_RESOURCE_ID',
              `Use: [resourceId('resourceType', 'resourceName')]`
            )
          );
        }
      } else if (Array.isArray(value)) {
        // Recursively validate array items
        for (let i = 0; i < value.length; i++) {
          if (typeof value[i] === 'object' && value[i] !== null) {
            this.validateProperties(value[i], `${propPath}[${i}]`, resourceType, errors, warnings);
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        // Recursively validate nested objects
        this.validateProperties(value, propPath, resourceType, errors, warnings);
      }
    }
  }

  /**
   * Validate location expression
   */
  private validateLocationExpression(location: string, path: string, warnings: any[]): void {
    // Location can be a literal region name or an ARM expression
    // If it looks like an ARM function but missing brackets, warn
    if (ARM_EXPRESSION_PATTERNS.suspiciousLiteral.test(location)) {
      warnings.push(
        this.createWarning(
          `Location appears to be missing brackets around ARM expression`,
          path,
          'MISSING_EXPRESSION_BRACKETS',
          `Wrap the expression in brackets: [${location}]`
        )
      );
    }
  }

  /**
   * Validate parameter default value
   */
  private validateParameterDefault(defaultValue: string, path: string, warnings: any[]): void {
    // Parameter defaults can reference other parameters or variables
    if (ARM_EXPRESSION_PATTERNS.suspiciousLiteral.test(defaultValue)) {
      warnings.push(
        this.createWarning(
          `Parameter default value appears to be missing brackets around ARM expression`,
          path,
          'MISSING_EXPRESSION_BRACKETS',
          `Wrap the expression in brackets: [${defaultValue}]`
        )
      );
    }
  }

  /**
   * Validate output value
   */
  private validateOutputValue(value: string, path: string, errors: any[], warnings: any[]): void {
    // Outputs typically use ARM expressions
    if (ARM_EXPRESSION_PATTERNS.suspiciousLiteral.test(value)) {
      errors.push(
        this.createError(
          `Output value appears to be missing brackets around ARM expression`,
          path,
          'MISSING_EXPRESSION_BRACKETS',
          `Wrap the expression in brackets: [${value}]`
        )
      );
    }
  }
}
