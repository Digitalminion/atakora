# Azure Functions Synthesis Pipeline Integration

## Overview

This document details how Azure Functions will integrate with Atakora's existing synthesis pipeline, introducing a new Build phase while maintaining the integrity of the current four-phase architecture.

## Current Synthesis Pipeline

The existing pipeline has four well-defined phases:

```
Prepare → Transform → Validate → Assembly
```

## Enhanced Pipeline with Discovery and Build Phases

We introduce two new phases: **Discovery** (before Prepare) and **Build** (between Prepare and Transform):

```
Discovery → Prepare → Build → Transform → Validate → Assembly
```

### Phase Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                         SYNTHESIS PIPELINE                            │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────┐     ┌────────┐     ┌───────────┐                      │
│  │ Prepare │────▶│  Build │────▶│ Transform │                      │
│  └─────────┘     └────────┘     └───────────┘                      │
│       │               │               │                              │
│       ▼               ▼               ▼                              │
│  ┌──────────┐    ┌──────────┐   ┌──────────┐                      │
│  │Constructs│    │ Function │   │   ARM    │                      │
│  │  Tree    │    │ Artifacts│   │ Resources│                      │
│  └──────────┘    └──────────┘   └──────────┘                      │
│                        │               │                              │
│                        └───────┬───────┘                              │
│                                ▼                                      │
│                        ┌──────────────┐     ┌──────────┐            │
│                        │   Validate   │────▶│ Assembly │            │
│                        └──────────────┘     └──────────┘            │
│                                │                   │                  │
│                                ▼                   ▼                  │
│                        ┌──────────────┐     ┌──────────┐            │
│                        │ Validation   │     │   ARM    │            │
│                        │   Results    │     │ Templates│            │
│                        └──────────────┘     └──────────┘            │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

## Phase 0: Discovery (NEW)

The Discovery phase runs before Prepare and automatically discovers function definitions:

```typescript
class FunctionDiscoveryPhase implements ISynthesisPhase {
  private readonly functionsPath: string;
  private readonly resourceLoader: ResourceLoader;

  async execute(context: SynthesisContext): Promise<DiscoveryResult> {
    // Step 1: Scan functions directory
    const functionDirs = await this.scanFunctionsDirectory();

    // Step 2: Load resource.ts files
    const functionConfigs = await this.loadFunctionConfigurations(functionDirs);

    // Step 3: Validate configurations
    await this.validateConfigurations(functionConfigs);

    // Step 4: Build function registry
    const registry = this.buildFunctionRegistry(functionConfigs);

    // Step 5: Store in context for Prepare phase
    context.setDiscoveredFunctions(registry);

    return {
      functionsDiscovered: registry.size,
      registry
    };
  }

  private async scanFunctionsDirectory(): Promise<FunctionDirectory[]> {
    const dirs: FunctionDirectory[] = [];
    const basePath = path.resolve(this.functionsPath);

    // Scan for directories containing both handler.ts and resource.ts
    const entries = await fs.readdir(basePath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const functionPath = path.join(basePath, entry.name);
        const hasHandler = await fs.pathExists(path.join(functionPath, 'handler.ts'));
        const hasResource = await fs.pathExists(path.join(functionPath, 'resource.ts'));

        if (hasHandler && hasResource) {
          dirs.push({
            name: entry.name,
            path: functionPath,
            handlerPath: path.join(functionPath, 'handler.ts'),
            resourcePath: path.join(functionPath, 'resource.ts')
          });
        }
      }
    }

    return dirs;
  }

  private async loadFunctionConfigurations(
    dirs: FunctionDirectory[]
  ): Promise<FunctionConfiguration[]> {
    const configs: FunctionConfiguration[] = [];

    for (const dir of dirs) {
      try {
        // Dynamically import resource.ts
        const module = await import(dir.resourcePath);
        const config = module.default || module;

        // Validate it's a proper function definition
        if (config.type !== 'AzureFunction' || !config.config) {
          throw new Error(`Invalid function definition in ${dir.resourcePath}`);
        }

        configs.push({
          directory: dir,
          definition: config as FunctionDefinition,
          metadata: {
            discoveredAt: Date.now(),
            functionName: dir.name,
            hasTypedEnvironment: !!config.config.environment
          }
        });
      } catch (error) {
        throw new DiscoveryError(
          `Failed to load function configuration from ${dir.resourcePath}`,
          dir.name,
          error
        );
      }
    }

    return configs;
  }

  private buildFunctionRegistry(
    configs: FunctionConfiguration[]
  ): Map<string, FunctionConfiguration> {
    const registry = new Map<string, FunctionConfiguration>();

    for (const config of configs) {
      const key = config.metadata.functionName;

      if (registry.has(key)) {
        throw new Error(`Duplicate function name: ${key}`);
      }

      registry.set(key, config);
    }

    return registry;
  }
}

// Types for Discovery phase
interface FunctionDirectory {
  readonly name: string;
  readonly path: string;
  readonly handlerPath: string;
  readonly resourcePath: string;
}

interface FunctionConfiguration {
  readonly directory: FunctionDirectory;
  readonly definition: FunctionDefinition;
  readonly metadata: FunctionMetadata;
}

interface FunctionMetadata {
  readonly discoveredAt: number;
  readonly functionName: string;
  readonly hasTypedEnvironment: boolean;
}

interface DiscoveryResult {
  readonly functionsDiscovered: number;
  readonly registry: Map<string, FunctionConfiguration>;
}
```

### Environment Variable Resolution

The Discovery phase also sets up environment variable interpolation:

```typescript
class EnvironmentResolver {
  private readonly placeholderPattern = /\$\{([^}]+)\}/g;

  resolveEnvironment(
    functionConfig: FunctionConfiguration,
    appEnvironment: Record<string, string | IResourceReference>
  ): Record<string, string> {
    const resolved: Record<string, string> = {};
    const functionEnv = functionConfig.definition.config.environment || {};

    for (const [key, value] of Object.entries(functionEnv)) {
      if (typeof value === 'string') {
        // Check if it's a placeholder
        const matches = value.match(this.placeholderPattern);

        if (matches) {
          // Replace placeholders with actual values from app.ts
          let resolvedValue = value;

          for (const match of matches) {
            const placeholderKey = match.slice(2, -1); // Remove ${ and }

            if (!(placeholderKey in appEnvironment)) {
              throw new Error(
                `Environment variable ${placeholderKey} not provided in app.ts for function ${functionConfig.metadata.functionName}`
              );
            }

            const replacement = appEnvironment[placeholderKey];
            resolvedValue = resolvedValue.replace(
              match,
              typeof replacement === 'string'
                ? replacement
                : replacement.toString()
            );
          }

          resolved[key] = resolvedValue;
        } else {
          // Literal value from resource.ts
          resolved[key] = value;
        }
      }
    }

    // Add any additional environment variables from app.ts
    for (const [key, value] of Object.entries(appEnvironment)) {
      if (!(key in resolved)) {
        resolved[key] = typeof value === 'string'
          ? value
          : value.toString();
      }
    }

    return resolved;
  }
}
```

### Dependency Tracking

The Discovery phase also builds a dependency graph:

```typescript
class DependencyTracker {
  private readonly graph: Map<string, Set<string>> = new Map();

  trackDependencies(
    functionConfig: FunctionConfiguration,
    resources: Map<string, IResource>
  ): void {
    const functionId = functionConfig.metadata.functionName;
    const dependencies = new Set<string>();

    // Track dependencies from environment variables
    const env = functionConfig.definition.config.environment || {};

    for (const value of Object.values(env)) {
      if (typeof value === 'string' && value.includes('${')) {
        // Extract resource references
        const resourceRefs = this.extractResourceReferences(value);
        resourceRefs.forEach(ref => dependencies.add(ref));
      }
    }

    // Track dependencies from bindings
    const bindings = [
      ...(functionConfig.definition.config.inputBindings || []),
      ...(functionConfig.definition.config.outputBindings || [])
    ];

    for (const binding of bindings) {
      if (binding.connection && typeof binding.connection === 'object') {
        dependencies.add(binding.connection.resourceId);
      }
    }

    this.graph.set(functionId, dependencies);
  }

  private extractResourceReferences(value: string): string[] {
    // Parse ARM template expressions to find resource references
    const refs: string[] = [];
    const pattern = /resourceId\('([^']+)',\s*'([^']+)'\)/g;
    let match;

    while ((match = pattern.exec(value)) !== null) {
      refs.push(`${match[1]}/${match[2]}`);
    }

    return refs;
  }

  getDependencies(functionId: string): string[] {
    return Array.from(this.graph.get(functionId) || []);
  }
}
```

## Phase 1: Prepare (Unchanged)

The Prepare phase remains unchanged but now identifies Azure Function constructs:

```typescript
interface PrepareResult {
  readonly stackInfoMap: Map<string, StackInfo>;
  readonly traversalResult: TraversalResult;
  readonly functionConstructs: AzureFunction[];  // NEW
}

class ResourceCollector {
  collect(constructs: Construct[], stacks: Stack[]): Map<string, StackInfo> {
    // Existing logic...

    // Identify function constructs for build phase
    const functions = constructs.filter(c => c instanceof AzureFunction);
    this.context.setFunctions(functions);

    return stackInfoMap;
  }
}
```

## Phase 2: Build (NEW)

The Build phase handles compilation, bundling, and optimization of function code:

### Build Phase Architecture

```typescript
class FunctionBuildPhase implements ISynthesisPhase {
  private readonly builder: FunctionBuilder;
  private readonly cache: BuildCache;
  private readonly packager: FunctionPackager;

  async execute(context: SynthesisContext): Promise<BuildResult> {
    const functions = context.getFunctions();

    if (functions.length === 0) {
      return { artifacts: new Map() };
    }

    // Step 1: Validate handler paths exist
    await this.validateHandlers(functions);

    // Step 2: Build functions in parallel
    const artifacts = await this.buildFunctions(functions);

    // Step 3: Package based on strategy
    const packages = await this.packageFunctions(artifacts);

    // Step 4: Store in context for Transform phase
    context.setFunctionArtifacts(packages);

    return { artifacts: packages };
  }

  private async validateHandlers(functions: AzureFunction[]): Promise<void> {
    const errors: string[] = [];

    for (const fn of functions) {
      const handlerPath = path.resolve(fn.handler);
      if (!await fs.pathExists(handlerPath)) {
        errors.push(`Handler not found: ${fn.handler} for function ${fn.node.id}`);
      }
    }

    if (errors.length > 0) {
      throw new BuildError(`Function handler validation failed:\n${errors.join('\n')}`);
    }
  }

  private async buildFunctions(
    functions: AzureFunction[]
  ): Promise<Map<string, BuildArtifact>> {
    const artifacts = new Map<string, BuildArtifact>();

    // Build in parallel with concurrency limit
    const pool = new PromisePool(
      functions.map(fn => () => this.buildSingleFunction(fn)),
      { concurrency: 4 }
    );

    const results = await pool.execute();

    results.forEach((artifact, index) => {
      artifacts.set(functions[index].node.id, artifact);
    });

    return artifacts;
  }

  private async buildSingleFunction(fn: AzureFunction): Promise<BuildArtifact> {
    const cacheKey = await this.cache.getCacheKey(fn);

    // Check cache first
    const cached = await this.cache.get(cacheKey);
    if (cached && !this.shouldRebuild(fn, cached)) {
      return cached;
    }

    // Build with esbuild
    const result = await this.builder.build({
      entryPoints: [fn.handler],
      bundle: fn.buildOptions?.bundle ?? true,
      minify: fn.buildOptions?.minify ?? true,
      sourcemap: fn.buildOptions?.sourcemap ?? 'external',
      external: fn.buildOptions?.external ?? [],
      platform: 'node',
      target: fn.buildOptions?.target ?? 'node18',
      format: 'cjs',
      treeShaking: fn.buildOptions?.treeShaking ?? true,
      define: fn.buildOptions?.define,
      loader: fn.buildOptions?.loader,
    });

    const artifact: BuildArtifact = {
      functionId: fn.node.id,
      functionName: fn.functionName,
      bundle: result.outputFiles[0].contents,
      sourceMap: result.outputFiles[1]?.contents,
      metadata: {
        size: result.outputFiles[0].contents.length,
        buildTime: Date.now(),
        hash: await this.computeHash(result.outputFiles[0].contents),
        dependencies: await this.extractDependencies(fn.handler),
      }
    };

    // Cache the result
    await this.cache.set(cacheKey, artifact);

    return artifact;
  }

  private async packageFunctions(
    artifacts: Map<string, BuildArtifact>
  ): Promise<Map<string, FunctionPackage>> {
    const packages = new Map<string, FunctionPackage>();

    for (const [id, artifact] of artifacts) {
      const strategy = this.packager.determineStrategy(artifact);
      const pkg = await this.packager.package(artifact, strategy);
      packages.set(id, pkg);
    }

    return packages;
  }
}
```

### Build Artifacts

```typescript
interface BuildArtifact {
  readonly functionId: string;
  readonly functionName: string;
  readonly bundle: Uint8Array;
  readonly sourceMap?: Uint8Array;
  readonly metadata: BuildMetadata;
}

interface BuildMetadata {
  readonly size: number;
  readonly buildTime: number;
  readonly hash: string;
  readonly dependencies: string[];
  readonly hasNativeModules?: boolean;
  readonly memoryEstimate?: number;
}

interface FunctionPackage {
  readonly artifact: BuildArtifact;
  readonly strategy: PackagingStrategy;
  readonly deployment: DeploymentConfig;
}

interface DeploymentConfig {
  readonly type: 'inline' | 'storage' | 'container' | 'external';
  readonly location?: string;     // Storage URL or container image
  readonly inline?: string;        // Base64 encoded for inline
  readonly sasToken?: string;      // For storage deployments
  readonly integrity?: string;     // SHA256 hash for verification
}
```

### Build Caching

```typescript
class BuildCache {
  private readonly cacheDir: string;
  private readonly ttl: number = 3600000; // 1 hour

  async getCacheKey(fn: AzureFunction): Promise<string> {
    // Compute cache key from:
    // - Handler file content hash
    // - Build options
    // - Package.json dependencies
    // - Node version
    const factors = [
      await this.getFileHash(fn.handler),
      JSON.stringify(fn.buildOptions),
      await this.getDependencyHash(fn.handler),
      process.version
    ];

    return crypto
      .createHash('sha256')
      .update(factors.join('|'))
      .digest('hex');
  }

  async get(key: string): Promise<BuildArtifact | null> {
    const cachePath = path.join(this.cacheDir, `${key}.json`);

    if (!await fs.pathExists(cachePath)) {
      return null;
    }

    const stat = await fs.stat(cachePath);
    const age = Date.now() - stat.mtime.getTime();

    if (age > this.ttl) {
      await fs.remove(cachePath);
      return null;
    }

    return await fs.readJson(cachePath);
  }

  async set(key: string, artifact: BuildArtifact): Promise<void> {
    const cachePath = path.join(this.cacheDir, `${key}.json`);
    await fs.ensureDir(this.cacheDir);
    await fs.writeJson(cachePath, artifact);
  }

  async invalidate(pattern?: string): Promise<void> {
    if (pattern) {
      // Invalidate matching keys
      const files = await fs.readdir(this.cacheDir);
      const matching = files.filter(f => f.includes(pattern));
      await Promise.all(matching.map(f => fs.remove(path.join(this.cacheDir, f))));
    } else {
      // Clear entire cache
      await fs.emptyDir(this.cacheDir);
    }
  }
}
```

### Packaging Strategies

```typescript
class FunctionPackager {
  determineStrategy(artifact: BuildArtifact): PackagingStrategy {
    const sizeKB = artifact.metadata.size / 1024;
    const hasDependencies = artifact.metadata.dependencies.length > 0;
    const hasNativeModules = artifact.metadata.hasNativeModules;

    // Decision tree
    if (sizeKB < 4 && !hasDependencies) {
      return PackagingStrategy.INLINE;
    }

    if (hasNativeModules || sizeKB > 100 * 1024) {
      return PackagingStrategy.CONTAINER;
    }

    if (sizeKB > 50 * 1024) {
      return PackagingStrategy.EXTERNAL;
    }

    return PackagingStrategy.STORAGE;
  }

  async package(
    artifact: BuildArtifact,
    strategy: PackagingStrategy
  ): Promise<FunctionPackage> {
    switch (strategy) {
      case PackagingStrategy.INLINE:
        return this.packageInline(artifact);

      case PackagingStrategy.STORAGE:
        return this.packageToStorage(artifact);

      case PackagingStrategy.CONTAINER:
        return this.packageToContainer(artifact);

      case PackagingStrategy.EXTERNAL:
        return this.packageExternal(artifact);

      default:
        throw new Error(`Unknown packaging strategy: ${strategy}`);
    }
  }

  private async packageInline(artifact: BuildArtifact): Promise<FunctionPackage> {
    const encoded = Buffer.from(artifact.bundle).toString('base64');

    return {
      artifact,
      strategy: PackagingStrategy.INLINE,
      deployment: {
        type: 'inline',
        inline: encoded,
        integrity: await this.computeIntegrity(artifact.bundle)
      }
    };
  }

  private async packageToStorage(artifact: BuildArtifact): Promise<FunctionPackage> {
    // This will be handled during Assembly phase
    // For now, just mark for storage upload
    return {
      artifact,
      strategy: PackagingStrategy.STORAGE,
      deployment: {
        type: 'storage',
        // Location and SAS token will be set in Assembly phase
        integrity: await this.computeIntegrity(artifact.bundle)
      }
    };
  }

  private async packageToContainer(artifact: BuildArtifact): Promise<FunctionPackage> {
    // Generate Dockerfile
    const dockerfile = this.generateDockerfile(artifact);

    return {
      artifact,
      strategy: PackagingStrategy.CONTAINER,
      deployment: {
        type: 'container',
        // Container image URL will be set after build/push
        integrity: await this.computeIntegrity(artifact.bundle)
      }
    };
  }

  private generateDockerfile(artifact: BuildArtifact): string {
    return `
FROM mcr.microsoft.com/azure-functions/node:4-node18

ENV AzureWebJobsScriptRoot=/home/site/wwwroot
ENV AzureFunctionsJobHost__Logging__Console__IsEnabled=true

COPY . /home/site/wwwroot

RUN cd /home/site/wwwroot && npm install --production

CMD ["npm", "start"]
    `;
  }
}
```

## Phase 3: Transform (Enhanced)

The Transform phase now handles function packages:

```typescript
class ResourceTransformer {
  transformAll(resources: Resource[]): ArmResource[] {
    const armResources: ArmResource[] = [];

    for (const resource of resources) {
      if (resource instanceof AzureFunction) {
        // Special handling for functions
        const armFunction = this.transformFunction(resource);
        armResources.push(armFunction);
      } else {
        // Existing transformation logic
        const armResource = this.transformResource(resource);
        armResources.push(armResource);
      }
    }

    return armResources;
  }

  private transformFunction(fn: AzureFunction): ArmResource {
    const context = this.synthContext;
    const functionPackage = context.getFunctionPackage(fn.node.id);

    if (!functionPackage) {
      throw new Error(`No build artifact found for function ${fn.functionName}`);
    }

    // Generate function.json for bindings
    const functionJson = this.generateFunctionJson(fn);

    // Create ARM resource based on packaging strategy
    switch (functionPackage.strategy) {
      case PackagingStrategy.INLINE:
        return this.createInlineFunction(fn, functionPackage, functionJson);

      case PackagingStrategy.STORAGE:
        return this.createStorageFunction(fn, functionPackage, functionJson);

      case PackagingStrategy.CONTAINER:
        return this.createContainerFunction(fn, functionPackage);

      default:
        throw new Error(`Unsupported packaging strategy: ${functionPackage.strategy}`);
    }
  }

  private generateFunctionJson(fn: AzureFunction): any {
    const bindings: any[] = [];

    // Add trigger binding
    bindings.push(this.triggerToBinding(fn.trigger));

    // Add input bindings
    if (fn.inputBindings) {
      bindings.push(...fn.inputBindings.map(b => this.toArmBinding(b)));
    }

    // Add output bindings
    if (fn.outputBindings) {
      bindings.push(...fn.outputBindings.map(b => this.toArmBinding(b)));
    }

    return {
      bindings,
      disabled: false,
      scriptFile: 'index.js'
    };
  }

  private createInlineFunction(
    fn: AzureFunction,
    pkg: FunctionPackage,
    functionJson: any
  ): ArmResource {
    return {
      type: 'Microsoft.Web/sites/functions',
      apiVersion: '2023-01-01',
      name: `[concat(parameters('functionAppName'), '/', '${fn.functionName}')]`,
      properties: {
        config: functionJson,
        files: {
          'index.js': pkg.deployment.inline,
          'function.json': JSON.stringify(functionJson)
        },
        language: 'javascript',
        isDisabled: false
      }
    };
  }

  private createStorageFunction(
    fn: AzureFunction,
    pkg: FunctionPackage,
    functionJson: any
  ): ArmResource {
    // The actual upload happens in Assembly phase
    // Here we just create the ARM resource with package URI
    return {
      type: 'Microsoft.Web/sites/functions',
      apiVersion: '2023-01-01',
      name: `[concat(parameters('functionAppName'), '/', '${fn.functionName}')]`,
      properties: {
        config: functionJson,
        packageUri: '[parameters(\'functionPackageUri\')]',
        language: 'javascript',
        isDisabled: false
      }
    };
  }
}
```

## Phase 4: Validate (Enhanced)

Add function-specific validators:

```typescript
class FunctionValidator implements IValidator {
  async validate(
    resources: Resource[],
    template: ArmTemplate
  ): Promise<ValidationResult> {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    for (const resource of resources) {
      if (resource instanceof AzureFunction) {
        // Validate function-specific constraints
        this.validateFunction(resource, errors, warnings);
      }

      if (resource instanceof FunctionApp) {
        // Validate function app constraints
        this.validateFunctionApp(resource, errors, warnings);
      }
    }

    return { errors, warnings };
  }

  private validateFunction(
    fn: AzureFunction,
    errors: ValidationIssue[],
    warnings: ValidationIssue[]
  ): void {
    // Check function name constraints
    if (fn.functionName.length > 128) {
      errors.push({
        path: `${fn.node.path}.functionName`,
        message: 'Function name must be 128 characters or less',
        suggestion: 'Shorten the function name'
      });
    }

    // Check timeout constraints
    if (fn.timeout && fn.timeout.toMinutes() > 10) {
      warnings.push({
        path: `${fn.node.path}.timeout`,
        message: 'Function timeout exceeds 10 minutes (Consumption plan limit)',
        suggestion: 'Consider using Premium or Dedicated plan for longer timeouts'
      });
    }

    // Check environment variable limits
    const envVarCount = Object.keys(fn.environment || {}).length;
    if (envVarCount > 100) {
      errors.push({
        path: `${fn.node.path}.environment`,
        message: `Too many environment variables (${envVarCount}/100)`,
        suggestion: 'Reduce environment variables or use App Configuration'
      });
    }

    // Validate trigger-specific constraints
    this.validateTrigger(fn.trigger, fn.node.path, errors, warnings);
  }

  private validateTrigger(
    trigger: FunctionTrigger,
    path: string,
    errors: ValidationIssue[],
    warnings: ValidationIssue[]
  ): void {
    switch (trigger.type) {
      case 'http':
        this.validateHttpTrigger(trigger as HttpTrigger, path, errors);
        break;

      case 'timer':
        this.validateTimerTrigger(trigger as TimerTrigger, path, errors);
        break;

      case 'queue':
        this.validateQueueTrigger(trigger as QueueTrigger, path, warnings);
        break;

      // ... other trigger types
    }
  }
}
```

## Phase 5: Assembly (Enhanced)

Handle function package uploads and final assembly:

```typescript
class FileWriter {
  async write(
    outdir: string,
    templates: Map<string, ArmTemplate>,
    prettyPrint: boolean,
    functionPackages?: Map<string, FunctionPackage>
  ): Promise<CloudAssembly> {
    // Ensure output directory exists
    await fs.ensureDir(outdir);

    // Handle function packages requiring storage upload
    if (functionPackages) {
      await this.uploadFunctionPackages(outdir, functionPackages);
    }

    // Write ARM templates (existing logic)
    for (const [stackName, template] of templates) {
      const filePath = path.join(outdir, `${stackName}.json`);
      const content = prettyPrint
        ? JSON.stringify(template, null, 2)
        : JSON.stringify(template);

      await fs.writeFile(filePath, content);
    }

    // Generate manifest
    const manifest = this.generateManifest(templates, functionPackages);
    await fs.writeJson(path.join(outdir, 'manifest.json'), manifest, { spaces: 2 });

    return {
      directory: outdir,
      manifest,
      stacks: Array.from(templates.keys())
    };
  }

  private async uploadFunctionPackages(
    outdir: string,
    packages: Map<string, FunctionPackage>
  ): Promise<void> {
    const functionsDir = path.join(outdir, 'functions');
    await fs.ensureDir(functionsDir);

    for (const [id, pkg] of packages) {
      if (pkg.strategy === PackagingStrategy.STORAGE) {
        // Create ZIP package
        const zipPath = path.join(functionsDir, `${pkg.artifact.functionName}.zip`);
        await this.createFunctionZip(pkg, zipPath);

        // Update package with location
        pkg.deployment.location = zipPath;

        // In production, this would upload to Azure Storage
        // and generate a SAS URL
        // pkg.deployment.sasToken = await this.uploadToStorage(zipPath);
      }
    }
  }

  private async createFunctionZip(
    pkg: FunctionPackage,
    outputPath: string
  ): Promise<void> {
    const zip = new JSZip();

    // Add function code
    zip.file('index.js', pkg.artifact.bundle);

    // Add source map if available
    if (pkg.artifact.sourceMap) {
      zip.file('index.js.map', pkg.artifact.sourceMap);
    }

    // Add function.json (generated during transform)
    // This would be retrieved from context
    const functionJson = this.getFunctionJson(pkg.artifact.functionId);
    zip.file('function.json', JSON.stringify(functionJson, null, 2));

    // Generate ZIP file
    const content = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }
    });

    await fs.writeFile(outputPath, content);
  }
}
```

## Integration with Synthesizer

Update the main Synthesizer class:

```typescript
export class Synthesizer {
  private buildPhase: FunctionBuildPhase;

  constructor() {
    // Existing initialization...
    this.buildPhase = new FunctionBuildPhase();
  }

  async synthesize(app: App, options?: Partial<SynthesisOptions>): Promise<CloudAssembly> {
    const opts = this.resolveOptions(options);

    try {
      // Phase 1: Prepare
      const prepareResult = this.prepare(app);

      // Phase 2: Build (NEW)
      const buildResult = await this.build(prepareResult);

      // Phase 3: Transform
      const { templates, resourcesByStack } = await this.transform(prepareResult, buildResult);

      // Phase 4: Validate
      if (!opts.skipValidation) {
        await this.validate(templates, resourcesByStack, opts.strict ?? false);
      }

      // Phase 5: Assembly
      const assembly = this.assemble(templates, buildResult.packages, opts);

      return assembly;
    } catch (error) {
      throw new Error(`Synthesis failed: ${error.message}`);
    }
  }

  private async build(prepareResult: PrepareResult): Promise<BuildResult> {
    // Execute build phase
    const context = new SynthesisContext(prepareResult);
    return await this.buildPhase.execute(context);
  }

  private async transform(
    prepareResult: PrepareResult,
    buildResult: BuildResult
  ): Promise<TransformResult> {
    // Enhanced transform with build artifacts
    const context = new SynthesisContext(prepareResult);
    context.setFunctionArtifacts(buildResult.artifacts);

    // Continue with existing transform logic...
    return await this.transformPhase.execute(context);
  }

  private assemble(
    templates: Map<string, ArmTemplate>,
    functionPackages: Map<string, FunctionPackage> | undefined,
    options: SynthesisOptions
  ): CloudAssembly {
    // Enhanced assembly with function packages
    return this.fileWriter.write(
      options.outdir,
      templates,
      options.prettyPrint,
      functionPackages
    );
  }
}
```

## Error Handling

Comprehensive error handling throughout the pipeline:

```typescript
class BuildError extends Error {
  constructor(
    message: string,
    public readonly functionId?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'BuildError';
  }
}

class PackagingError extends Error {
  constructor(
    message: string,
    public readonly strategy: PackagingStrategy,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'PackagingError';
  }
}

// Error recovery strategies
class ErrorRecovery {
  static async handleBuildError(error: BuildError, fn: AzureFunction): Promise<void> {
    console.error(`Build failed for function ${fn.functionName}: ${error.message}`);

    // Attempt fallback strategies
    if (error.message.includes('out of memory')) {
      // Try building with reduced optimization
      console.log('Retrying with reduced optimization...');
      // ... retry logic
    }

    if (error.message.includes('module not found')) {
      // Provide helpful error message
      console.error('Missing dependency. Run "npm install" in function directory.');
    }
  }
}
```

## Performance Optimizations

### Parallel Processing

```typescript
class ParallelBuilder {
  private readonly maxConcurrency = os.cpus().length;

  async buildAll(functions: AzureFunction[]): Promise<BuildArtifact[]> {
    const queue = new PQueue({ concurrency: this.maxConcurrency });

    const promises = functions.map(fn =>
      queue.add(() => this.buildWithRetry(fn))
    );

    return await Promise.all(promises);
  }

  private async buildWithRetry(fn: AzureFunction, retries = 3): Promise<BuildArtifact> {
    for (let i = 0; i < retries; i++) {
      try {
        return await this.buildSingleFunction(fn);
      } catch (error) {
        if (i === retries - 1) throw error;
        await this.delay(1000 * Math.pow(2, i)); // Exponential backoff
      }
    }
    throw new Error('Build failed after retries');
  }
}
```

### Incremental Builds

```typescript
class IncrementalBuilder {
  private readonly dependencyGraph: Map<string, Set<string>>;

  async build(changed: string[]): Promise<BuildArtifact[]> {
    // Determine affected functions
    const affected = this.getAffectedFunctions(changed);

    // Build only affected functions
    return await this.builder.buildFunctions(affected);
  }

  private getAffectedFunctions(changed: string[]): AzureFunction[] {
    const affected = new Set<string>();

    for (const file of changed) {
      const dependents = this.dependencyGraph.get(file) || new Set();
      dependents.forEach(d => affected.add(d));
    }

    return Array.from(affected).map(id => this.getFunctionById(id));
  }
}
```

## Monitoring and Telemetry

Track build performance and success rates:

```typescript
interface BuildTelemetry {
  readonly functionId: string;
  readonly buildTime: number;
  readonly bundleSize: number;
  readonly cacheHit: boolean;
  readonly strategy: PackagingStrategy;
  readonly success: boolean;
  readonly error?: string;
}

class TelemetryCollector {
  private readonly events: BuildTelemetry[] = [];

  record(event: BuildTelemetry): void {
    this.events.push(event);

    // Send to Application Insights if configured
    if (this.appInsights) {
      this.appInsights.trackEvent('FunctionBuild', event);
    }
  }

  generateReport(): BuildReport {
    return {
      totalBuilds: this.events.length,
      successRate: this.calculateSuccessRate(),
      averageBuildTime: this.calculateAverageBuildTime(),
      cacheHitRate: this.calculateCacheHitRate(),
      strategyDistribution: this.getStrategyDistribution()
    };
  }
}
```

## Summary

The Build phase integration:

1. **Maintains Pipeline Integrity**: Fits cleanly between Prepare and Transform
2. **Enables Optimization**: Bundling, minification, tree-shaking
3. **Supports Multiple Strategies**: Inline, storage, container, external
4. **Provides Caching**: Fast incremental builds
5. **Handles Errors Gracefully**: Clear messages and recovery strategies
6. **Scales Well**: Parallel processing for multiple functions
7. **Integrates Seamlessly**: Works with existing validation and assembly phases