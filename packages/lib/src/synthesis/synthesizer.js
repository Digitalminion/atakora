"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Synthesizer = void 0;
var tree_traverser_1 = require("./prepare/tree-traverser");
var resource_collector_1 = require("./prepare/resource-collector");
var resource_transformer_1 = require("./transform/resource-transformer");
var dependency_resolver_1 = require("./transform/dependency-resolver");
var file_writer_1 = require("./assembly/file-writer");
var validator_registry_1 = require("./validate/validator-registry");
var validation_pipeline_1 = require("./validate/validation-pipeline");
var schema_validator_1 = require("./validate/schema-validator");
var naming_validator_1 = require("./validate/naming-validator");
var limit_validator_1 = require("./validate/limit-validator");
var arm_resource_validator_1 = require("./validate/arm-resource-validator");
var scopes_1 = require("../core/azure/scopes");
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
var Synthesizer = /** @class */ (function () {
    function Synthesizer() {
        // Initialize validators
        this.validatorRegistry = new validator_registry_1.ValidatorRegistry();
        this.validatorRegistry.register(new schema_validator_1.SchemaValidator());
        this.validatorRegistry.register(new naming_validator_1.NamingValidator());
        this.validatorRegistry.register(new limit_validator_1.LimitValidator());
        this.validatorRegistry.register(new arm_resource_validator_1.ArmResourceValidator());
        // Initialize validation pipeline with registry
        this.validationPipeline = new validation_pipeline_1.ValidationPipeline(this.validatorRegistry);
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
    Synthesizer.prototype.synthesize = function (app, options) {
        return __awaiter(this, void 0, void 0, function () {
            var opts, prepareResult, _a, templates, resourcesByStack, assembly, error_1;
            var _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        opts = {
                            outdir: (options === null || options === void 0 ? void 0 : options.outdir) || app.outdir,
                            skipValidation: (options === null || options === void 0 ? void 0 : options.skipValidation) || false,
                            prettyPrint: (options === null || options === void 0 ? void 0 : options.prettyPrint) !== false,
                            strict: (options === null || options === void 0 ? void 0 : options.strict) || false,
                        };
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 5, , 6]);
                        prepareResult = this.prepare(app);
                        return [4 /*yield*/, this.transform(prepareResult)];
                    case 2:
                        _a = _c.sent(), templates = _a.templates, resourcesByStack = _a.resourcesByStack;
                        if (!!opts.skipValidation) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.validate(templates, resourcesByStack, (_b = opts.strict) !== null && _b !== void 0 ? _b : false)];
                    case 3:
                        _c.sent();
                        _c.label = 4;
                    case 4:
                        assembly = this.assemble(templates, opts);
                        return [2 /*return*/, assembly];
                    case 5:
                        error_1 = _c.sent();
                        throw new Error("Synthesis failed: ".concat(error_1 instanceof Error ? error_1.message : 'Unknown error'));
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
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
    Synthesizer.prototype.prepare = function (app) {
        // Traverse construct tree
        var traverser = new tree_traverser_1.TreeTraverser();
        var traversalResult = traverser.traverse(app);
        // Collect resources by stack
        var collector = new resource_collector_1.ResourceCollector();
        var stackInfoMap = collector.collect(traversalResult.constructs, traversalResult.stacks);
        // Validate resource organization
        collector.validateResources(stackInfoMap);
        return { stackInfoMap: stackInfoMap, traversalResult: traversalResult };
    };
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
    Synthesizer.prototype.transform = function (prepareResult) {
        return __awaiter(this, void 0, void 0, function () {
            var stackInfoMap, templates, resourcesByStack, transformer, dependencyResolver, _i, _a, _b, stackId, stackInfo, armResources, resourcesWithDeps, sortedResources, schema, template;
            return __generator(this, function (_c) {
                stackInfoMap = prepareResult.stackInfoMap;
                templates = new Map();
                resourcesByStack = new Map();
                transformer = new resource_transformer_1.ResourceTransformer();
                dependencyResolver = new dependency_resolver_1.DependencyResolver();
                for (_i = 0, _a = stackInfoMap.entries(); _i < _a.length; _i++) {
                    _b = _a[_i], stackId = _b[0], stackInfo = _b[1];
                    // Store resources for validation
                    resourcesByStack.set(stackInfo.name, stackInfo.resources);
                    armResources = transformer.transformAll(stackInfo.resources);
                    resourcesWithDeps = dependencyResolver.resolve(armResources, stackInfo.resources);
                    sortedResources = dependencyResolver.topologicalSort(resourcesWithDeps);
                    schema = this.getSchemaForScope(stackInfo.scope);
                    template = {
                        $schema: schema,
                        contentVersion: '1.0.0.0',
                        resources: sortedResources,
                        parameters: {},
                        outputs: {},
                    };
                    templates.set(stackInfo.name, template);
                }
                return [2 /*return*/, { templates: templates, resourcesByStack: resourcesByStack }];
            });
        });
    };
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
    Synthesizer.prototype.validate = function (templates, resourcesByStack, strict) {
        return __awaiter(this, void 0, void 0, function () {
            var allErrors, allWarnings, _i, _a, _b, stackName, template, resources, result, _c, allWarnings_1, warning, errorMessages;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        allErrors = [];
                        allWarnings = [];
                        _i = 0, _a = templates.entries();
                        _d.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                        _b = _a[_i], stackName = _b[0], template = _b[1];
                        resources = resourcesByStack.get(stackName) || [];
                        return [4 /*yield*/, this.validationPipeline.validate(resources, template, stackName, {
                                strict: strict,
                                level: strict ? validation_pipeline_1.ValidationLevel.STRICT : validation_pipeline_1.ValidationLevel.NORMAL,
                            })];
                    case 2:
                        result = _d.sent();
                        allErrors.push.apply(allErrors, result.errors);
                        allWarnings.push.apply(allWarnings, result.warnings);
                        _d.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4:
                        // Display warnings
                        if (allWarnings.length > 0) {
                            console.warn("\nValidation warnings (".concat(allWarnings.length, "):"));
                            for (_c = 0, allWarnings_1 = allWarnings; _c < allWarnings_1.length; _c++) {
                                warning = allWarnings_1[_c];
                                console.warn("  ".concat(warning.severity.toUpperCase(), ": ").concat(warning.message));
                                if (warning.path) {
                                    console.warn("    at: ".concat(warning.path));
                                }
                                if (warning.suggestion) {
                                    console.warn("    suggestion: ".concat(warning.suggestion));
                                }
                            }
                        }
                        // Handle errors
                        if (allErrors.length > 0 || (strict && allWarnings.length > 0)) {
                            errorMessages = __spreadArray(__spreadArray([], allErrors.map(function (e) { return "".concat(e.path, ": ").concat(e.message); }), true), (strict ? allWarnings.map(function (w) { return "".concat(w.path, ": ").concat(w.message); }) : []), true);
                            throw new Error("Validation failed with ".concat(allErrors.length, " error(s)").concat(strict ? " and ".concat(allWarnings.length, " warning(s) (strict mode)") : '', ":\n") +
                                errorMessages.map(function (msg) { return "  - ".concat(msg); }).join('\n'));
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
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
    Synthesizer.prototype.assemble = function (templates, options) {
        var writer = new file_writer_1.FileWriter();
        var assembly = writer.write(options.outdir, templates, options.prettyPrint);
        return assembly;
    };
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
    Synthesizer.prototype.addValidator = function (validator) {
        this.validatorRegistry.register(validator);
    };
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
    Synthesizer.prototype.clearValidators = function () {
        this.validatorRegistry.clear();
    };
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
    Synthesizer.prototype.getSchemaForScope = function (scope) {
        switch (scope) {
            case scopes_1.DeploymentScope.Subscription:
                return 'https://schema.management.azure.com/schemas/2018-05-01/subscriptionDeploymentTemplate.json#';
            case scopes_1.DeploymentScope.ResourceGroup:
                return 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#';
            case scopes_1.DeploymentScope.ManagementGroup:
                return 'https://schema.management.azure.com/schemas/2019-08-01/managementGroupDeploymentTemplate.json#';
            case scopes_1.DeploymentScope.Tenant:
                return 'https://schema.management.azure.com/schemas/2019-08-01/tenantDeploymentTemplate.json#';
            default:
                // Default to resource group scope
                return 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#';
        }
    };
    return Synthesizer;
}());
exports.Synthesizer = Synthesizer;
