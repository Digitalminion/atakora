/**
 * Resource Factory - Generates L1 construct implementations from ARM schemas.
 *
 * @packageDocumentation
 */

import type {
  SchemaIR,
  ResourceDefinition,
  PropertyDefinition,
  TypeDefinition,
} from './types';

/**
 * Generates complete L1 construct class implementation from ARM schema.
 *
 * @remarks
 * Produces production-ready L1 construct classes that follow the established patterns:
 * - Extends Resource base class
 * - Proper TypeScript typing
 * - Comprehensive JSDoc documentation
 * - Validation logic based on schema constraints
 * - ARM template generation (toArmTemplate method)
 *
 * @example
 * ```typescript
 * const parser = new SchemaParser();
 * const ir = parser.parse('path/to/Microsoft.Storage.json');
 *
 * const factory = new ResourceFactory();
 * const code = factory.generateResource(ir.resources[0], ir);
 *
 * fs.writeFileSync('arm-storage-account.ts', code);
 * ```
 */
export class ResourceFactory {
  /**
   * Generate L1 construct class from resource definition.
   *
   * @param resource - Resource definition from schema
   * @param ir - Full schema IR (for context)
   * @returns Generated TypeScript class code
   */
  public generateResource(resource: ResourceDefinition, ir: SchemaIR): string {
    const lines: string[] = [];

    // Imports
    lines.push(this.generateImports(resource));
    lines.push('');

    // Class JSDoc
    lines.push(this.generateClassDoc(resource, ir));

    // Class declaration
    const className = this.toClassName(resource.name);
    lines.push(`export class ${className} extends Resource {`);

    // Constants
    lines.push(this.generateConstants(resource, ir));
    lines.push('');

    // Properties
    lines.push(this.generateProperties(resource));
    lines.push('');

    // Constructor
    lines.push(this.generateConstructor(resource, className));
    lines.push('');

    // Validation method
    lines.push(this.generateValidationMethod(resource));
    lines.push('');

    // toArmTemplate method
    lines.push(this.generateToArmTemplate(resource));

    lines.push('}');

    return lines.join('\n');
  }

  /**
   * Generate import statements.
   */
  private generateImports(resource: ResourceDefinition): string {
    const lines: string[] = [];

    lines.push(`import { Construct } from '../../core/construct';`);
    lines.push(`import { Resource } from '../../core/resource';`);
    lines.push(`import { DeploymentScope } from '../../core/azure/scopes';`);

    // Determine props interface name
    const propsName = `Arm${this.toPascalCase(resource.name)}Props`;
    lines.push(`import type { ${propsName} } from './types';`);

    return lines.join('\n');
  }

  /**
   * Generate class documentation.
   */
  private generateClassDoc(resource: ResourceDefinition, ir: SchemaIR): string {
    const lines: string[] = [];
    const className = this.toClassName(resource.name);

    lines.push('/**');
    lines.push(` * L1 construct for ${resource.armType}.`);
    lines.push(' *');
    lines.push(' * @remarks');
    lines.push(
      ` * Direct mapping to ${resource.armType} ARM resource.`
    );
    lines.push(
      ' * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.'
    );
    lines.push(' *');
    lines.push(` * **ARM Resource Type**: \`${resource.armType}\``);
    lines.push(` * **API Version**: \`${ir.apiVersion}\``);
    lines.push(' *');

    if (resource.description) {
      lines.push(' * @description');
      lines.push(` * ${resource.description}`);
      lines.push(' *');
    }

    lines.push(
      ` * This is a low-level construct for maximum control. For intent-based API with`
    );
    lines.push(
      ` * auto-naming and defaults, use the L2 construct instead.`
    );
    lines.push(' *');
    lines.push(' * @example');
    lines.push(' * ```typescript');
    lines.push(
      ` * const resource = new ${className}(scope, 'Resource', {`
    );
    lines.push(' *   // props here');
    lines.push(' * });');
    lines.push(' * ```');
    lines.push(' */');

    return lines.join('\n');
  }

  /**
   * Generate class constants.
   */
  private generateConstants(
    resource: ResourceDefinition,
    ir: SchemaIR
  ): string {
    const lines: string[] = [];

    // Determine deployment scope from ARM type
    const scope = this.inferDeploymentScope(resource.armType);

    lines.push('  /**');
    lines.push('   * ARM resource type.');
    lines.push('   */');
    lines.push(
      `  public readonly resourceType: string = '${resource.armType}';`
    );
    lines.push('');
    lines.push('  /**');
    lines.push('   * API version for the resource.');
    lines.push('   */');
    lines.push(`  public readonly apiVersion: string = '${ir.apiVersion}';`);
    lines.push('');
    lines.push('  /**');
    lines.push('   * Deployment scope for this resource.');
    lines.push('   */');
    lines.push(
      `  public readonly scope: DeploymentScope.${scope} = DeploymentScope.${scope};`
    );

    return lines.join('\n');
  }

  /**
   * Generate class properties.
   */
  private generateProperties(resource: ResourceDefinition): string {
    const lines: string[] = [];

    for (const prop of resource.properties) {
      // Skip ARM metadata
      if (['type', 'apiVersion', 'resources'].includes(prop.name)) {
        continue;
      }

      lines.push('  /**');
      if (prop.description) {
        lines.push(`   * ${prop.description}`);
      } else {
        lines.push(`   * ${prop.name}`);
      }

      // Add constraint info
      if (prop.constraints) {
        lines.push('   *');
        lines.push('   * @remarks');

        if (
          prop.constraints.minLength !== undefined ||
          prop.constraints.maxLength !== undefined
        ) {
          const min = prop.constraints.minLength ?? 0;
          const max = prop.constraints.maxLength ?? 'unlimited';
          lines.push(`   * Length: ${min}-${max} characters`);
        }

        if (prop.constraints.pattern) {
          lines.push(`   * Pattern: \`${prop.constraints.pattern}\``);
        }
      }

      lines.push('   */');

      const optional = prop.required ? '' : '?';
      lines.push(
        `  public readonly ${prop.name}${optional}: ${prop.type.tsType};`
      );
      lines.push('');
    }

    // Add resourceId property
    lines.push('  /**');
    lines.push('   * ARM resource ID.');
    lines.push('   */');
    lines.push('  public readonly resourceId: string;');

    return lines.join('\n');
  }

  /**
   * Generate constructor.
   */
  private generateConstructor(
    resource: ResourceDefinition,
    className: string
  ): string {
    const lines: string[] = [];
    const propsName = `Arm${this.toPascalCase(resource.name)}Props`;

    lines.push('  /**');
    lines.push(`   * Creates a new ${className} construct.`);
    lines.push('   *');
    lines.push('   * @param scope - Parent construct');
    lines.push(
      '   * @param id - Unique identifier for this construct within the parent scope'
    );
    lines.push('   * @param props - Resource properties');
    lines.push('   */');
    lines.push(
      `  constructor(scope: Construct, id: string, props: ${propsName}) {`
    );
    lines.push('    super(scope, id);');
    lines.push('');
    lines.push('    // Validate properties');
    lines.push('    this.validateProps(props);');
    lines.push('');
    lines.push('    // Assign properties');

    for (const prop of resource.properties) {
      if (['type', 'apiVersion', 'resources'].includes(prop.name)) {
        continue;
      }

      // Handle nested properties object
      if (prop.name === 'properties' && prop.type.kind === 'object') {
        // Access nested properties
        if (prop.type.properties) {
          for (const nestedProp of prop.type.properties) {
            lines.push(
              `    this.${nestedProp.name} = props.properties?.${nestedProp.name};`
            );
          }
        }
      } else {
        const defaultValue = prop.required ? '' : ' ?? {}';
        if (prop.type.tsType.includes('Record<string, string>')) {
          lines.push(`    this.${prop.name} = props.${prop.name}${defaultValue};`);
        } else {
          lines.push(`    this.${prop.name} = props.${prop.name};`);
        }
      }
    }

    lines.push('');
    lines.push('    // Construct resource ID');

    // Extract resource name property (usually first required property or 'name')
    const nameProp = resource.properties.find(p => p.name === 'name') ||
                     resource.properties.find(p => p.required);
    const nameValue = nameProp ? `this.${nameProp.name}` : 'this.name';

    lines.push(
      `    this.resourceId = \`/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/${resource.armType}/\${${nameValue}}\`;`
    );

    lines.push('  }');

    return lines.join('\n');
  }

  /**
   * Generate validation method.
   */
  private generateValidationMethod(resource: ResourceDefinition): string {
    const lines: string[] = [];
    const propsName = `Arm${this.toPascalCase(resource.name)}Props`;

    lines.push('  /**');
    lines.push('   * Validates resource properties against ARM constraints.');
    lines.push('   *');
    lines.push('   * @param props - Properties to validate');
    lines.push('   * @throws {Error} If validation fails');
    lines.push('   */');
    lines.push(
      `  private validateProps(props: ${propsName}): void {`
    );

    // Generate validations for each property with constraints
    for (const prop of resource.properties) {
      if (!prop.constraints && !prop.required) {
        continue;
      }

      // Required validation
      if (prop.required) {
        lines.push(`    if (!props.${prop.name}) {`);
        lines.push(
          `      throw new Error('${prop.name} is required');`
        );
        lines.push('    }');
        lines.push('');
      }

      // Constraint validations
      if (prop.constraints) {
        const constraints = prop.constraints;

        // String length validation
        if (constraints.minLength !== undefined || constraints.maxLength !== undefined) {
          lines.push(`    if (props.${prop.name}) {`);

          if (constraints.minLength !== undefined) {
            lines.push(
              `      if (props.${prop.name}.length < ${constraints.minLength}) {`
            );
            lines.push(
              `        throw new Error('${prop.name} must be at least ${constraints.minLength} characters');`
            );
            lines.push('      }');
          }

          if (constraints.maxLength !== undefined) {
            lines.push(
              `      if (props.${prop.name}.length > ${constraints.maxLength}) {`
            );
            lines.push(
              `        throw new Error('${prop.name} must be at most ${constraints.maxLength} characters');`
            );
            lines.push('      }');
          }

          lines.push('    }');
          lines.push('');
        }

        // Pattern validation
        if (constraints.pattern) {
          const escapedPattern = constraints.pattern.replace(/\\/g, '\\\\');
          lines.push(`    if (props.${prop.name}) {`);
          lines.push(`      const pattern = /${escapedPattern}/;`);
          lines.push(`      if (!pattern.test(props.${prop.name})) {`);
          lines.push(
            `        throw new Error('${prop.name} must match pattern: ${escapedPattern}');`
          );
          lines.push('      }');
          lines.push('    }');
          lines.push('');
        }

        // Number range validation
        if (constraints.minimum !== undefined || constraints.maximum !== undefined) {
          lines.push(`    if (props.${prop.name} !== undefined) {`);

          if (constraints.minimum !== undefined) {
            lines.push(
              `      if (props.${prop.name} < ${constraints.minimum}) {`
            );
            lines.push(
              `        throw new Error('${prop.name} must be at least ${constraints.minimum}');`
            );
            lines.push('      }');
          }

          if (constraints.maximum !== undefined) {
            lines.push(
              `      if (props.${prop.name} > ${constraints.maximum}) {`
            );
            lines.push(
              `        throw new Error('${prop.name} must be at most ${constraints.maximum}');`
            );
            lines.push('      }');
          }

          lines.push('    }');
          lines.push('');
        }
      }
    }

    lines.push('  }');

    return lines.join('\n');
  }

  /**
   * Generate toArmTemplate method.
   */
  private generateToArmTemplate(resource: ResourceDefinition): string {
    const lines: string[] = [];

    lines.push('  /**');
    lines.push('   * Generates ARM template representation of this resource.');
    lines.push('   *');
    lines.push('   * @returns ARM template resource object');
    lines.push('   */');
    lines.push('  public toArmTemplate(): object {');
    lines.push('    const properties: any = {};');
    lines.push('');

    // Add properties conditionally
    for (const prop of resource.properties) {
      if (['type', 'apiVersion', 'name', 'location', 'tags', 'resources'].includes(prop.name)) {
        continue;
      }

      if (prop.name === 'properties') {
        // Skip the properties wrapper
        continue;
      }

      const required = prop.required;

      if (required) {
        lines.push(`    properties.${prop.name} = this.${prop.name};`);
      } else {
        lines.push(`    if (this.${prop.name} !== undefined) {`);
        lines.push(`      properties.${prop.name} = this.${prop.name};`);
        lines.push('    }');
      }
      lines.push('');
    }

    lines.push('    return {');
    lines.push('      type: this.resourceType,');
    lines.push('      apiVersion: this.apiVersion,');

    // Extract name property
    const nameProp = resource.properties.find(p => p.name === 'name');
    if (nameProp) {
      lines.push(`      name: this.name,`);
    }

    // Check for location property
    const locationProp = resource.properties.find(p => p.name === 'location');
    if (locationProp) {
      lines.push(`      location: this.location,`);
    }

    lines.push(
      '      properties: Object.keys(properties).length > 0 ? properties : undefined,'
    );

    // Check for tags
    const tagsProp = resource.properties.find(p => p.name === 'tags');
    if (tagsProp) {
      lines.push(
        '      tags: Object.keys(this.tags).length > 0 ? this.tags : undefined,'
      );
    }

    lines.push('    };');
    lines.push('  }');

    return lines.join('\n');
  }

  /**
   * Infer deployment scope from ARM resource type.
   */
  private inferDeploymentScope(armType: string): string {
    if (armType.includes('/resourceGroups')) {
      return 'Subscription';
    }
    if (armType.includes('Microsoft.Resources/deployments')) {
      return 'ResourceGroup'; // Can be multiple, default to RG
    }
    return 'ResourceGroup';
  }

  /**
   * Convert resource name to class name.
   */
  private toClassName(name: string): string {
    return `Arm${this.toPascalCase(name)}`;
  }

  /**
   * Convert name to PascalCase.
   */
  private toPascalCase(name: string): string {
    if (/^[A-Z]/.test(name)) {
      return name;
    }

    return name
      .split(/[_\-\/]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }
}
