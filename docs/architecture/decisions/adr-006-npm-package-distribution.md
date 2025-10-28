# ADR-005: npm Package Distribution Strategy

## Context

The Atakora project consists of three npm packages that need to be published and distributed to users:

1. **@atakora/lib** - Internal framework package providing core functionality
2. **@atakora/cdk** - Public-facing CDK package with Azure resource constructs
3. **@atakora/cli** - Command-line tooling for project management

Current challenges and considerations:

- No defined strategy for minification, bundling, or distribution
- TypeScript compilation currently outputs to shared `dist/` folder then copies to package folders
- CDK package has 13+ subpath exports for different Azure namespaces
- CLI package uses `tsx` for runtime TypeScript execution (development mode)
- No `.npmignore` files or explicit `files` field in package.json
- Package sizes are unknown and unbounded
- No clear guidance on what should be shipped vs excluded

Industry context:
- AWS CDK v2 ships unminified JavaScript with source maps for debugging
- Most CDK/IaC tools prioritize debuggability over size optimization
- Tree-shaking is critical for large libraries with many exports
- Dual ESM/CJS support is becoming standard but adds complexity

## Decision

We will adopt a **progressive distribution strategy** that prioritizes debuggability and tree-shaking over aggressive size optimization:

### 1. Build Output Strategy

**No Minification by Default**
- Ship unminified, readable JavaScript for all packages
- Rationale: Infrastructure code needs to be debuggable in production
- Exception: CLI can optionally minify non-critical modules

**Include Source Maps**
- Generate and ship `.js.map` files for all packages
- Enable `declarationMap` for TypeScript declaration maps
- Rationale: Critical for debugging and error reporting

**No Bundling for Libraries**
- Keep file-per-module structure for @atakora/lib and @atakora/cdk
- Preserve directory structure matching source layout
- Rationale: Enables tree-shaking and selective imports

**Selective Bundling for CLI**
- Bundle CLI entry point and commands
- Keep templates as separate files
- Use esbuild for fast, efficient bundling

### 2. Module Format Strategy

**CommonJS as Primary Format**
- Target CommonJS for broadest compatibility
- TypeScript config: `"module": "commonjs", "target": "ES2020"`
- Rationale: Node.js ecosystem standard, avoids dual-package hazard

**ESM Support (Future)**
- Plan for ESM exports in v2.0
- Will require dual-build pipeline
- Deferred to avoid complexity in v1.0

### 3. Package Contents

**What to Include:**
```json
{
  "files": [
    "dist/**/*.js",
    "dist/**/*.d.ts",
    "dist/**/*.js.map",
    "dist/**/*.d.ts.map",
    "README.md",
    "LICENSE",
    "CHANGELOG.md"
  ]
}
```

**What to Exclude:**
- Source TypeScript files (`src/`)
- Test files (`**/*.test.js`, `**/*.spec.js`)
- Development configuration (`.eslintrc`, `vitest.config.ts`)
- Build artifacts (`*.tsbuildinfo`)
- Documentation beyond README

### 4. Package-Specific Configurations

**@atakora/lib (Internal Framework)**
```json
{
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist", "README.md", "LICENSE"],
  "sideEffects": false
}
```

**@atakora/cdk (Public CDK)**
```json
{
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./network": "./dist/network/index.js",
    // ... other subpath exports
  },
  "sideEffects": false,
  "files": ["dist", "README.md", "LICENSE", "CHANGELOG.md"]
}
```

**@atakora/cli (CLI Tool)**
```json
{
  "bin": {
    "atakora": "./bin/atakora.js"
  },
  "files": [
    "bin",
    "dist",
    "templates",
    "README.md",
    "LICENSE"
  ]
}
```

### 5. Build Pipeline

**TypeScript Compilation**
- Use TypeScript compiler (tsc) for type checking and initial compilation
- Generate declarations and source maps
- Output to centralized `dist/` then copy to package folders

**Post-Processing**
- Optional: Run esbuild on CLI for bundling
- No minification step
- Preserve source maps through all transformations

**Validation**
- Check package size before publish
- Verify all exports resolve correctly
- Test installation in isolated environment

## Alternatives Considered

### Alternative 1: Aggressive Minification and Bundling

Bundle everything into single files per package with aggressive minification.

**Pros:**
- Smallest possible package size
- Faster installation
- Single file distribution

**Cons:**
- No debugging capability in production
- No tree-shaking possible
- Source maps become huge or useless
- Violates IaC debugging requirements

**Rejected because:** Infrastructure code must be debuggable when issues arise in production.

### Alternative 2: Full ESM Migration

Ship only ESM modules targeting modern Node.js.

**Pros:**
- Future-proof
- Better tree-shaking
- Native module system

**Cons:**
- Limited compatibility with existing tools
- Requires all consumers to use ESM
- Complex migration path
- Dual-package hazard risks

**Rejected because:** The ecosystem isn't ready; would limit adoption.

### Alternative 3: Webpack Bundling

Use webpack for sophisticated bundling with code splitting.

**Pros:**
- Mature bundling solution
- Advanced optimization options
- Code splitting capabilities

**Cons:**
- Slow build times
- Complex configuration
- Overkill for library packages
- Poor tree-shaking for consumers

**Rejected because:** Adds unnecessary complexity without clear benefits for our use case.

## Consequences

### Positive Consequences

1. **Debuggability**: Users can debug issues in production with full stack traces
2. **Tree-shaking**: Consumers only bundle what they use from @atakora/cdk
3. **Simplicity**: Straightforward build process without complex bundling
4. **Compatibility**: Works with all Node.js environments and build tools
5. **Transparency**: Users can inspect the actual code they're running

### Negative Consequences

1. **Larger Downloads**: Unminified code means larger npm packages
2. **More Files**: Multiple files instead of bundles means more I/O during installation
3. **No Advanced Optimizations**: Missing out on bundler optimizations like dead code elimination
4. **Future Migration**: Moving to ESM later will require careful planning

### Trade-offs Accepted

We explicitly accept larger package sizes in exchange for:
- Better debugging experience
- Simpler build pipeline
- Maximum compatibility
- Tree-shaking capability for consumers

## Success Criteria

1. **Package Sizes** (uncompressed):
   - @atakora/lib: < 500 KB
   - @atakora/cdk: < 2 MB (with all Azure constructs)
   - @atakora/cli: < 1 MB (excluding dependencies)

2. **Performance Metrics**:
   - TypeScript compilation: < 10 seconds
   - Package installation: < 30 seconds on average network
   - Tree-shaking: Consumers can achieve 80% size reduction with selective imports

3. **Quality Indicators**:
   - Source maps correctly map to original TypeScript
   - All subpath exports resolve without errors
   - No runtime errors from missing files
   - Clean npm audit (no vulnerabilities)

4. **Developer Experience**:
   - Stack traces point to original source lines
   - IDE "Go to Definition" works correctly
   - Package can be linked locally for development

## Implementation Priority

1. **Phase 1** (v0.1.0): Basic distribution
   - Add `files` field to package.json
   - Configure source maps
   - Set up size monitoring

2. **Phase 2** (v0.2.0): Optimization
   - Implement CLI bundling with esbuild
   - Add package size tests
   - Create publish automation

3. **Phase 3** (v1.0.0): Polish
   - Add compression analysis
   - Implement size budgets
   - Document upgrade path to ESM

## Related Decisions

- ADR-001: Monorepo Structure - Defines package boundaries
- ADR-002: TypeScript Configuration - Sets compilation targets
- ADR-004: Testing Strategy - Impacts what files to exclude

## References

- [npm package.json files field](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#files)
- [TypeScript Compiler Options](https://www.typescriptlang.org/tsconfig)
- [AWS CDK Package Structure](https://github.com/aws/aws-cdk)
- [Node.js Dual Package Hazard](https://nodejs.org/api/packages.html#dual-package-hazard)