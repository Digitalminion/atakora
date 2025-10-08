import { App } from '../core/app';
import { CloudAssembly, SynthesisOptions, ArmTemplate } from './types';
import { TreeTraverser } from './prepare/tree-traverser';
import { ResourceCollector } from './prepare/resource-collector';
import { ResourceTransformer } from './transform/resource-transformer';
import { DependencyResolver } from './transform/dependency-resolver';
import { FileWriter } from './assembly/file-writer';
import { ValidatorRegistry } from './validate/validator-registry';
import { SchemaValidator } from './validate/schema-validator';
import { NamingValidator } from './validate/naming-validator';
import { LimitValidator } from './validate/limit-validator';
import { DeploymentScope } from '../core/azure/scopes';

/**
 * Main orchestrator for the synthesis pipeline
 *
 * Coordinates the 3-phase synthesis process:
 * 1. Prepare - Traverse tree and collect resources
 * 2. Transform - Convert to ARM JSON and resolve dependencies
 * 3. Validate - Check ARM templates
 * 4. Assembly - Write templates to disk
 */
export class Synthesizer {
  private validatorRegistry: ValidatorRegistry;

  constructor() {
    // Initialize validators
    this.validatorRegistry = new ValidatorRegistry();
    this.validatorRegistry.register(new SchemaValidator());
    this.validatorRegistry.register(new NamingValidator());
    this.validatorRegistry.register(new LimitValidator());
  }

  /**
   * Synthesize an app to ARM templates
   *
   * @param app - App to synthesize
   * @param options - Synthesis options
   * @returns Cloud assembly with manifest
   */
  async synthesize(app: App, options?: Partial<SynthesisOptions>): Promise<CloudAssembly> {
    const opts: SynthesisOptions = {
      outdir: options?.outdir || app.outdir,
      skipValidation: options?.skipValidation || false,
      prettyPrint: options?.prettyPrint !== false,
      strict: options?.strict || false,
    };

    try {
      // Phase 1: Prepare - Traverse tree and collect resources
      const prepareResult = this.prepare(app);

      // Phase 2: Transform - Convert to ARM JSON and resolve dependencies
      const templates = await this.transform(prepareResult);

      // Phase 3: Validate - Check ARM templates
      if (!opts.skipValidation) {
        await this.validate(templates, opts.strict ?? false);
      }

      // Phase 4: Assembly - Write templates to disk
      const assembly = this.assemble(templates, opts);

      return assembly;
    } catch (error) {
      throw new Error(
        `Synthesis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Phase 1: Prepare - Traverse tree and collect resources
   */
  private prepare(app: App) {
    // Traverse construct tree
    const traverser = new TreeTraverser();
    const traversalResult = traverser.traverse(app);

    // Collect resources by stack
    const collector = new ResourceCollector();
    const stackInfoMap = collector.collect(traversalResult.constructs, traversalResult.stacks);

    // Validate resource organization
    collector.validateResources(stackInfoMap);

    return { stackInfoMap, traversalResult };
  }

  /**
   * Phase 2: Transform - Convert to ARM JSON and resolve dependencies
   */
  private async transform(prepareResult: any): Promise<Map<string, ArmTemplate>> {
    const { stackInfoMap } = prepareResult;
    const templates = new Map<string, ArmTemplate>();

    const transformer = new ResourceTransformer();
    const dependencyResolver = new DependencyResolver();

    for (const [stackId, stackInfo] of stackInfoMap.entries()) {
      // Transform resources to ARM JSON
      const armResources = transformer.transformAll(stackInfo.resources);

      // Resolve dependencies
      const resourcesWithDeps = dependencyResolver.resolve(armResources, stackInfo.resources);

      // Sort resources topologically
      const sortedResources = dependencyResolver.topologicalSort(resourcesWithDeps);

      // Determine schema based on deployment scope
      const schema = this.getSchemaForScope(stackInfo.scope);

      // Create ARM template
      const template: ArmTemplate = {
        $schema: schema,
        contentVersion: '1.0.0.0',
        resources: sortedResources,
        parameters: {},
        outputs: {},
      };

      templates.set(stackInfo.name, template);
    }

    return templates;
  }

  /**
   * Phase 3: Validate - Check ARM templates
   */
  private async validate(templates: Map<string, ArmTemplate>, strict: boolean): Promise<void> {
    const allErrors = [];
    const allWarnings = [];

    for (const [stackName, template] of templates.entries()) {
      const result = await this.validatorRegistry.validateAll(template, stackName);

      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
    }

    // Display warnings
    if (allWarnings.length > 0) {
      console.warn(`\nValidation warnings (${allWarnings.length}):`);
      for (const warning of allWarnings) {
        console.warn(`  ${warning.severity.toUpperCase()}: ${warning.message}`);
        if (warning.path) {
          console.warn(`    at: ${warning.path}`);
        }
        if (warning.suggestion) {
          console.warn(`    suggestion: ${warning.suggestion}`);
        }
      }
    }

    // Handle errors
    if (allErrors.length > 0 || (strict && allWarnings.length > 0)) {
      const errorMessages = [
        ...allErrors.map((e) => `${e.path}: ${e.message}`),
        ...(strict ? allWarnings.map((w) => `${w.path}: ${w.message}`) : []),
      ];

      throw new Error(
        `Validation failed with ${allErrors.length} error(s)${strict ? ` and ${allWarnings.length} warning(s) (strict mode)` : ''}:\n` +
          errorMessages.map((msg) => `  - ${msg}`).join('\n')
      );
    }
  }

  /**
   * Phase 4: Assembly - Write templates to disk
   */
  private assemble(templates: Map<string, ArmTemplate>, options: SynthesisOptions): CloudAssembly {
    const writer = new FileWriter();
    const assembly = writer.write(options.outdir, templates, options.prettyPrint);

    return assembly;
  }

  /**
   * Add a custom validator
   */
  addValidator(validator: any): void {
    this.validatorRegistry.register(validator);
  }

  /**
   * Clear all validators
   */
  clearValidators(): void {
    this.validatorRegistry.clear();
  }

  /**
   * Get the ARM template schema URL for the deployment scope.
   */
  private getSchemaForScope(scope: DeploymentScope): string {
    switch (scope) {
      case DeploymentScope.Subscription:
        return 'https://schema.management.azure.com/schemas/2018-05-01/subscriptionDeploymentTemplate.json#';
      case DeploymentScope.ResourceGroup:
        return 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#';
      case DeploymentScope.ManagementGroup:
        return 'https://schema.management.azure.com/schemas/2019-08-01/managementGroupDeploymentTemplate.json#';
      case DeploymentScope.Tenant:
        return 'https://schema.management.azure.com/schemas/2019-08-01/tenantDeploymentTemplate.json#';
      default:
        // Default to resource group scope
        return 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#';
    }
  }
}
