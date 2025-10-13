import { App } from '../core/app';
import { CloudAssembly, SynthesisOptions } from './types';
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
export declare class Synthesizer {
    private validatorRegistry;
    private validationPipeline;
    constructor();
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
    synthesize(app: App, options?: Partial<SynthesisOptions>): Promise<CloudAssembly>;
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
    private prepare;
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
    private transform;
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
    private validate;
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
    private assemble;
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
    addValidator(validator: any): void;
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
    clearValidators(): void;
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
    private getSchemaForScope;
}
//# sourceMappingURL=synthesizer.d.ts.map