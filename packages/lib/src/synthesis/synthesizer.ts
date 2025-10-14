import { App } from '../core/app';
import { CloudAssembly, SynthesisOptions, ArmTemplate, CloudAssemblyV2, StackManifestV2, FunctionPackage, ResourceMetadata, TemplateAssignments, TemplateMetadata, ArmResource } from './types';
import { TreeTraverser } from './prepare/tree-traverser';
import { ResourceCollector } from './prepare/resource-collector';
import { ResourceTransformer } from './transform/resource-transformer';
import { DependencyResolver } from './transform/dependency-resolver';
import { FileWriter } from './assembly/file-writer';
import { ValidatorRegistry } from './validate/validator-registry';
import { ValidationPipeline, ValidationLevel } from './validate/validation-pipeline';
import { SchemaValidator } from './validate/schema-validator';
import { NamingValidator } from './validate/naming-validator';
import { LimitValidator } from './validate/limit-validator';
import { ArmResourceValidator } from './validate/arm-resource-validator';
import { DeploymentScope } from '../core/azure/scopes';
import { Resource } from '../core/resource';
import { TemplateSplitter, LinkedTemplateSet } from './assembly/template-splitter';
import { FunctionPackager, FunctionAppMetadata } from './assembly/function-packager';
import { SynthesisContext } from './context/synthesis-context';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Main orchestrator for the synthesis pipeline.
 *
 * @remarks
 * The Synthesizer orchestrates the complete synthesis process that transforms
 * the construct tree into deployable ARM templates. It coordinates four sequential phases:
 *
 * **Phase 1: Prepare** - Traverses the construct tree and collects resources by stack.
 * Uses {@link TreeTraverser} to walk the tree in depth-first order and {@link ResourceCollector}
 * to group resources by their containing stack.
 *
 * **Phase 2: Transform** - Converts high-level resource definitions to ARM JSON and resolves
 * dependencies. Uses {@link ResourceTransformer} to call `toArmTemplate()` on each resource
 * and {@link DependencyResolver} to build the dependency graph and sort resources topologically.
 *
 * **Phase 3: Validate** - Runs validation rules against the generated ARM templates using
 * the {@link ValidationPipeline}. This includes schema validation, naming convention checks,
 * and Azure limit enforcement.
 *
 * **Phase 4: Assembly** - Writes the final ARM templates to disk using {@link FileWriter}
 * and generates a cloud assembly manifest.
 *
 * The synthesizer is designed to fail fast with clear error messages when issues are detected
 * in any phase. Validation errors include actionable suggestions for fixing the problem.
 *
 * @example
 * Basic synthesis:
 * ```typescript
 * const app = new App();
 * const stack = new SubscriptionStack(app, 'MyStack', {
 *   subscription: Subscription.fromId('...'),
 *   geography: Geography.fromValue('eastus'),
 *   organization: new Organization('contoso'),
 *   project: new Project('webapp'),
 *   environment: Environment.PROD,
 *   instance: Instance.fromNumber(1)
 * });
 *
 * // Add resources to stack
 * const vnet = new VirtualNetwork(stack, 'VNet', { ... });
 *
 * // Synthesize to ARM templates
 * const synthesizer = new Synthesizer();
 * const assembly = await synthesizer.synthesize(app);
 * ```
 *
 * @example
 * Custom synthesis options:
 * ```typescript
 * const assembly = await synthesizer.synthesize(app, {
 *   outdir: './custom-output',
 *   skipValidation: false,
 *   prettyPrint: true,
 *   strict: true  // Treat warnings as errors
 * });
 * ```
 *
 * @see {@link ValidationPipeline} for validation architecture
 * @see docs/architecture/decisions/adr-002-synthesis-pipeline.md for design rationale
 */
export class Synthesizer {
  private validatorRegistry: ValidatorRegistry;
  private validationPipeline: ValidationPipeline;

  constructor() {
    // Initialize validators
    this.validatorRegistry = new ValidatorRegistry();
    this.validatorRegistry.register(new SchemaValidator());
    this.validatorRegistry.register(new NamingValidator());
    this.validatorRegistry.register(new LimitValidator());
    this.validatorRegistry.register(new ArmResourceValidator());

    // Initialize validation pipeline with registry
    this.validationPipeline = new ValidationPipeline(this.validatorRegistry);
  }

  /**
   * Synthesizes an app to ARM templates.
   *
   * @param app - App to synthesize (root of construct tree)
   * @param options - Synthesis options
   * @returns Cloud assembly containing generated templates and manifest
   *
   * @throws {Error} If synthesis fails at any phase (prepare, transform, validate, or assembly)
   *
   * @remarks
   * This is the main entry point for synthesis. It orchestrates all four phases:
   *
   * 1. **Prepare**: Traverses construct tree and collects resources by stack
   * 2. **Transform**: Converts resources to ARM JSON and resolves dependencies
   * 3. **Validate**: Runs validation pipeline (unless skipValidation is true)
   * 4. **Assembly**: Writes templates to disk and creates manifest
   *
   * **Error Handling**: If any phase fails, synthesis stops immediately with a clear
   * error message indicating which phase failed and why. Validation errors include
   * suggestions for fixing the issue.
   *
   * **Output**: Templates are written to the output directory specified in options
   * (defaults to `arm.out`). Each stack gets its own template file named `{stackName}.json`.
   *
   * @example
   * Default synthesis:
   * ```typescript
   * const synthesizer = new Synthesizer();
   * const assembly = await synthesizer.synthesize(app);
   * // Templates written to ./arm.out/
   * ```
   *
   * @example
   * Custom options:
   * ```typescript
   * const assembly = await synthesizer.synthesize(app, {
   *   outdir: './build/templates',  // Custom output directory
   *   skipValidation: false,         // Run validation (default)
   *   prettyPrint: true,             // Pretty-print JSON (default)
   *   strict: true                   // Treat warnings as errors
   * });
   * ```
   *
   * @example
   * Skip validation for faster iteration during development:
   * ```typescript
   * const assembly = await synthesizer.synthesize(app, {
   *   skipValidation: true  // Not recommended for production
   * });
   * ```
   */
  async synthesize(app: App, options?: Partial<SynthesisOptions>): Promise<CloudAssemblyV2> {
    const opts: SynthesisOptions = {
      outdir: options?.outdir || app.outdir,
      skipValidation: options?.skipValidation || false,
      prettyPrint: options?.prettyPrint !== false,
      strict: options?.strict || false,
      enableLinkedTemplates: options?.enableLinkedTemplates ?? true,
      maxTemplateSize: options?.maxTemplateSize ?? 3 * 1024 * 1024, // 3MB default
    };

    try {
      // Phase 1: Prepare - Traverse tree and collect resources
      const prepareResult = this.prepare(app);

      // Phase 2: Transform - Convert to ARM JSON and resolve dependencies
      const { templates, resourcesByStack } = await this.transform(prepareResult);

      // Phase 2.5: Split & Package - Split large templates and package functions
      const { splitTemplates, functionPackages } = await this.splitAndPackage(
        templates,
        resourcesByStack,
        prepareResult,
        opts
      );

      // Phase 3: Validate - Check ARM templates (root templates only for now)
      if (!opts.skipValidation) {
        // Extract root templates for validation
        const rootTemplates = new Map<string, ArmTemplate>();
        for (const [stackName, splitResult] of splitTemplates) {
          rootTemplates.set(stackName, splitResult.root);
        }
        await this.validate(rootTemplates, resourcesByStack, opts.strict ?? false);
      }

      // Phase 4: Assembly - Write templates and packages to disk
      const assembly = await this.assembleV2(splitTemplates, functionPackages, opts);

      return assembly;
    } catch (error) {
      throw new Error(
        `Synthesis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Phase 1: Prepare - Traverse tree and collect resources.
   *
   * @param app - Root app construct
   * @returns Prepare result with stack info map and traversal result
   *
   * @remarks
   * This phase walks the construct tree to discover all constructs and resources:
   *
   * 1. **Traverse**: Uses {@link TreeTraverser} to walk the tree in depth-first order,
   *    collecting all constructs and identifying stacks
   * 2. **Collect**: Uses {@link ResourceCollector} to group resources by their containing stack
   * 3. **Validate**: Checks that resources are properly organized (e.g., subscription-scoped
   *    resources are not in resource group stacks)
   *
   * @throws {Error} If resources are improperly organized or tree structure is invalid
   *
   * @internal
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
   * Phase 2: Transform - Convert to ARM JSON and resolve dependencies.
   *
   * @param prepareResult - Result from prepare phase
   * @returns ARM templates and resources grouped by stack
   *
   * @remarks
   * This phase transforms high-level resource definitions to ARM JSON:
   *
   * 1. **Transform**: Calls `toArmTemplate()` on each resource using {@link ResourceTransformer}
   * 2. **Resolve Dependencies**: Builds dependency graph and adds `dependsOn` arrays using {@link DependencyResolver}
   * 3. **Sort**: Topologically sorts resources to ensure proper deployment order
   * 4. **Assemble Template**: Creates complete ARM template with schema, resources, parameters, and outputs
   *
   * Each stack gets its own ARM template with the appropriate schema based on deployment scope
   * (subscription vs resource group).
   *
   * @throws {Error} If resource transformation fails or circular dependencies are detected
   *
   * @internal
   */
  private async transform(prepareResult: any): Promise<{
    templates: Map<string, ArmTemplate>;
    resourcesByStack: Map<string, Resource[]>;
  }> {
    const { stackInfoMap } = prepareResult;
    const templates = new Map<string, ArmTemplate>();
    const resourcesByStack = new Map<string, Resource[]>();

    const transformer = new ResourceTransformer();
    const dependencyResolver = new DependencyResolver();

    for (const [stackId, stackInfo] of stackInfoMap.entries()) {
      // Store resources for validation
      resourcesByStack.set(stackInfo.name, stackInfo.resources);

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

    return { templates, resourcesByStack };
  }

  /**
   * Phase 3: Validate - Check ARM templates using validation pipeline.
   *
   * @param templates - Generated ARM templates by stack
   * @param resourcesByStack - Original resource constructs by stack
   * @param strict - If true, treat warnings as errors
   *
   * @throws {Error} If validation errors are found (or warnings in strict mode)
   *
   * @remarks
   * This phase runs the validation pipeline on generated ARM templates:
   *
   * 1. **Run Validators**: Executes all registered validators ({@link SchemaValidator},
   *    {@link NamingValidator}, {@link LimitValidator}, etc.)
   * 2. **Collect Issues**: Gathers all errors and warnings across all stacks
   * 3. **Display Warnings**: Prints warnings to console with suggestions
   * 4. **Enforce Errors**: Throws if errors exist (or warnings in strict mode)
   *
   * **Validation Levels**:
   * - **Normal Mode**: Errors block synthesis, warnings are displayed but don't block
   * - **Strict Mode**: Both errors and warnings block synthesis
   *
   * All validation issues include:
   * - Clear error message
   * - Property path where issue occurred
   * - Actionable suggestion for fixing
   *
   * @internal
   */
  private async validate(
    templates: Map<string, ArmTemplate>,
    resourcesByStack: Map<string, Resource[]>,
    strict: boolean
  ): Promise<void> {
    const allErrors = [];
    const allWarnings = [];

    for (const [stackName, template] of templates.entries()) {
      const resources = resourcesByStack.get(stackName) || [];

      // Run validation pipeline
      const result = await this.validationPipeline.validate(resources, template, stackName, {
        strict,
        level: strict ? ValidationLevel.STRICT : ValidationLevel.NORMAL,
      });

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
   * Phase 4: Assembly - Write templates to disk.
   *
   * @param templates - ARM templates to write
   * @param options - Synthesis options (outdir, prettyPrint)
   * @returns Cloud assembly with manifest
   *
   * @remarks
   * This phase writes ARM templates to disk and generates a manifest:
   *
   * 1. **Write Templates**: Writes each stack's template to `{outdir}/{stackName}.json`
   * 2. **Generate Manifest**: Creates `manifest.json` with stack metadata and file locations
   * 3. **Pretty Print**: Optionally formats JSON with indentation for readability
   *
   * The cloud assembly structure:
   * ```
   * arm.out/
   *   manifest.json         # Assembly metadata
   *   Foundation.json       # Stack templates
   *   Data.json
   * ```
   *
   * @internal
   */
  private assemble(templates: Map<string, ArmTemplate>, options: SynthesisOptions): CloudAssembly {
    const writer = new FileWriter();
    const assembly = writer.write(options.outdir, templates, options.prettyPrint);

    return assembly;
  }

  /**
   * Adds a custom validator to the validation pipeline.
   *
   * @param validator - Validator instance implementing the validator interface
   *
   * @remarks
   * Custom validators can add domain-specific validation rules beyond the
   * built-in validators. Validators are executed in the order they're registered.
   *
   * @example
   * ```typescript
   * class MyCustomValidator {
   *   async validate(resources, template, stackName, options) {
   *     // Custom validation logic
   *     return { errors: [], warnings: [] };
   *   }
   * }
   *
   * const synthesizer = new Synthesizer();
   * synthesizer.addValidator(new MyCustomValidator());
   * ```
   */
  addValidator(validator: any): void {
    this.validatorRegistry.register(validator);
  }

  /**
   * Clears all registered validators.
   *
   * @remarks
   * Removes all validators including the built-in ones. Use this if you want
   * complete control over validation or to disable all validation.
   *
   * **Warning**: Clearing validators removes important checks. Only use this
   * if you're implementing custom validation from scratch.
   */
  clearValidators(): void {
    this.validatorRegistry.clear();
  }

  /**
   * Gets the ARM template schema URL for a deployment scope.
   *
   * @param scope - Deployment scope (Subscription, ResourceGroup, ManagementGroup, or Tenant)
   * @returns ARM template schema URL
   *
   * @remarks
   * Each deployment scope in Azure has its own ARM template schema with different
   * allowed resource types and structures. This method maps deployment scopes to
   * the official Microsoft schema URLs.
   *
   * Schema URLs by scope:
   * - **Subscription**: subscriptionDeploymentTemplate.json
   * - **ResourceGroup**: deploymentTemplate.json (most common)
   * - **ManagementGroup**: managementGroupDeploymentTemplate.json
   * - **Tenant**: tenantDeploymentTemplate.json
   *
   * @see {@link https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/template-syntax}
   *
   * @internal
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

  /**
   * Phase 2.5: Split & Package - Split large templates and package functions
   *
   * @param templates - ARM templates by stack
   * @param resourcesByStack - Resources by stack
   * @param prepareResult - Prepare phase result
   * @param options - Synthesis options
   * @returns Split templates and function packages
   *
   * @internal
   */
  private async splitAndPackage(
    templates: Map<string, ArmTemplate>,
    resourcesByStack: Map<string, Resource[]>,
    prepareResult: any,
    options: SynthesisOptions
  ): Promise<{
    splitTemplates: Map<string, LinkedTemplateSet>;
    functionPackages: Map<string, FunctionPackage[]>;
  }> {
    const splitTemplates = new Map<string, LinkedTemplateSet>();
    const functionPackages = new Map<string, FunctionPackage[]>();

    for (const [stackName, template] of templates) {
      const resources = resourcesByStack.get(stackName) || [];

      // Extract function metadata from InlineFunction resources
      const functionApps = this.extractFunctionApps(resources);

      // Package functions if any exist
      if (functionApps.length > 0 && options.enableLinkedTemplates) {
        const packager = new FunctionPackager({
          outputDir: path.join(options.outdir, 'packages'),
        });

        const packages: FunctionPackage[] = [];
        for (const functionApp of functionApps) {
          const pkg = await packager.package(functionApp);
          packages.push(pkg);
        }

        functionPackages.set(stackName, packages);
      }

      // Split template if it's too large or linked templates are enabled
      if (options.enableLinkedTemplates) {
        const splitter = new TemplateSplitter({
          stackName,
          maxTemplateSize: options.maxTemplateSize,
        });

        const splitResult = splitter.split(template);
        splitTemplates.set(stackName, splitResult);
      } else {
        // No splitting - use template as-is with empty linked set
        splitTemplates.set(stackName, {
          root: template,
          linked: new Map(),
          dependencies: new Map(),
          deploymentOrder: [],
        });
      }
    }

    return { splitTemplates, functionPackages };
  }

  /**
   * Extract function apps and their functions from resources
   *
   * @param resources - Resources to extract from
   * @returns Function app metadata
   *
   * @internal
   */
  private extractFunctionApps(resources: Resource[]): FunctionAppMetadata[] {
    const functionAppMap = new Map<string, FunctionAppMetadata>();

    for (const resource of resources) {
      // Check if resource has function metadata (set by InlineFunction in package mode)
      const metadata = (resource.node as any).metadata;
      if (metadata && metadata.functionMetadata) {
        const funcMeta = metadata.functionMetadata;

        // Find parent function app name
        // Look for functionAppName in the resource hierarchy
        const functionAppName = this.findFunctionAppName(resource);

        if (functionAppName) {
          // Get or create function app entry
          if (!functionAppMap.has(functionAppName)) {
            functionAppMap.set(functionAppName, {
              functionAppName,
              functions: [],
            });
          }

          // Add function to app
          const functionApp = functionAppMap.get(functionAppName)!;
          functionApp.functions.push(funcMeta);
        }
      }
    }

    return Array.from(functionAppMap.values());
  }

  /**
   * Find function app name from resource hierarchy
   *
   * @param resource - Resource to search from
   * @returns Function app name or null
   *
   * @internal
   */
  private findFunctionAppName(resource: Resource): string | null {
    // Check if resource has functionAppName property (InlineFunction stores this)
    if ((resource as any).functionAppName) {
      return (resource as any).functionAppName;
    }

    // Walk up to find FunctionApp
    let current: any = resource.node.scope;
    while (current) {
      if (current.functionAppName) {
        return current.functionAppName;
      }
      current = current.node?.scope;
    }

    return null;
  }

  /**
   * Phase 4: Assembly V2 - Write templates and packages to disk
   *
   * @param splitTemplates - Split templates by stack
   * @param functionPackages - Function packages by stack
   * @param options - Synthesis options
   * @returns Cloud assembly V2
   *
   * @internal
   */
  private async assembleV2(
    splitTemplates: Map<string, LinkedTemplateSet>,
    functionPackages: Map<string, FunctionPackage[]>,
    options: SynthesisOptions
  ): Promise<CloudAssemblyV2> {
    const outdir = options.outdir;
    const prettyPrint = options.prettyPrint ?? true;

    // Ensure output directory exists
    if (!fs.existsSync(outdir)) {
      fs.mkdirSync(outdir, { recursive: true });
    }

    // Ensure packages directory exists
    const packagesDir = path.join(outdir, 'packages');
    if (!fs.existsSync(packagesDir)) {
      fs.mkdirSync(packagesDir, { recursive: true });
    }

    const stackManifests: Record<string, StackManifestV2> = {};

    // Write templates and create manifests
    for (const [stackName, splitResult] of splitTemplates) {
      const linkedTemplatePaths: string[] = [];

      // Write root template
      const rootTemplatePath = path.join(outdir, `${stackName}.json`);
      this.writeJsonFile(rootTemplatePath, splitResult.root, prettyPrint);

      // Write linked templates
      for (const [linkedName, linkedTemplate] of splitResult.linked) {
        const linkedPath = path.join(outdir, `${linkedName}.json`);
        this.writeJsonFile(linkedPath, linkedTemplate, prettyPrint);
        linkedTemplatePaths.push(`${linkedName}.json`);
      }

      // Get function packages for this stack
      const packages = functionPackages.get(stackName) || [];

      // Create stack manifest
      const totalResourceCount =
        splitResult.root.resources.length +
        Array.from(splitResult.linked.values()).reduce(
          (sum, t) => sum + t.resources.length,
          0
        );

      stackManifests[stackName] = {
        name: stackName,
        templatePath: `${stackName}.json`,
        linkedTemplates: linkedTemplatePaths,
        resourceCount: totalResourceCount,
        parameterCount: Object.keys(splitResult.root.parameters || {}).length,
        outputCount: Object.keys(splitResult.root.outputs || {}).length,
        dependencies: [],
        artifacts: {
          functionPackages: packages.map((pkg) => ({
            packagePath: path.relative(outdir, pkg.packagePath),
            functionAppName: pkg.functionAppName,
            functions: pkg.functions,
            size: pkg.size,
            hash: pkg.hash,
            structure: pkg.structure,
          })),
        },
      };
    }

    // Create cloud assembly v2
    const assembly: CloudAssemblyV2 = {
      version: '2.0.0',
      stacks: stackManifests,
      directory: path.resolve(outdir),
    };

    // Write manifest
    const manifestPath = path.join(outdir, 'manifest.json');
    this.writeJsonFile(manifestPath, assembly, prettyPrint);

    return assembly;
  }

  /**
   * Write JSON file with proper formatting
   *
   * @internal
   */
  private writeJsonFile(filePath: string, data: any, prettyPrint: boolean): void {
    const json = prettyPrint ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    fs.writeFileSync(filePath, json, { mode: 0o644, encoding: 'utf-8' });
  }
}
