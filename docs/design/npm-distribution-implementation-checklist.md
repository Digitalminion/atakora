# npm Distribution Implementation Checklist

## Overview

This checklist provides step-by-step tasks for Charlie to implement the npm distribution strategy defined in ADR-005. Tasks are ordered by priority and dependency.

## Phase 1: Foundation Setup (Priority: Critical)

### Configure Package.json Files

- [ ] **@atakora/lib/package.json**
  - [ ] Add `files` field with distribution patterns
  - [ ] Add `sideEffects: false` for tree-shaking
  - [ ] Add `publishConfig` with registry settings
  - [ ] Add `repository` field with monorepo directory
  - [ ] Update `keywords` for npm discoverability
  - [ ] Verify `engines` field specifies Node >=18.0.0

- [ ] **@atakora/cdk/package.json**
  - [ ] Update `exports` field to use object syntax with types/default
  - [ ] Add `files` field excluding tests and dev files
  - [ ] Add `sideEffects: false`
  - [ ] Add `publishConfig` and `repository` fields
  - [ ] Expand `keywords` for better npm search
  - [ ] Ensure all subpath exports are defined

- [ ] **@atakora/cli/package.json**
  - [ ] Add `files` field including bin, dist, and templates
  - [ ] Configure `bin` field correctly
  - [ ] Add `publishConfig` and `repository` fields
  - [ ] Remove tsx from production dependencies
  - [ ] Move Azure SDKs to optional/peer dependencies

### Update TypeScript Configuration

- [ ] **tsconfig.base.json**
  - [ ] Enable `declaration: true`
  - [ ] Enable `declarationMap: true`
  - [ ] Enable `sourceMap: true`
  - [ ] Set `removeComments: false` (keep JSDoc)
  - [ ] Add `inlineSources: true` for better source maps
  - [ ] Set `preserveConstEnums: true`
  - [ ] Configure `newLine: "lf"` for consistency

- [ ] **Per-package tsconfig.json files**
  - [ ] Update `@atakora/lib/tsconfig.json` with correct paths
  - [ ] Update `@atakora/cdk/tsconfig.json` with correct paths
  - [ ] Update `@atakora/cli/tsconfig.json` with correct paths
  - [ ] Verify exclude patterns for test files
  - [ ] Ensure composite project references work

## Phase 2: Build Pipeline (Priority: High)

### Install Build Dependencies

- [ ] **Root package.json devDependencies**
  - [ ] Install `rimraf` for cross-platform cleaning
  - [ ] Install `esbuild` for CLI bundling
  - [ ] Install `@size-limit/preset-small-lib`
  - [ ] Install `@size-limit/file`
  - [ ] Install `source-map-explorer` for analysis

### Create Build Scripts

- [ ] **Root package.json scripts**
  - [ ] Update `build` script with proper sequence
  - [ ] Add `build:clean` script
  - [ ] Add `build:watch` for development
  - [ ] Add `size-check` script
  - [ ] Add `prepublishOnly` hook

- [ ] **Package-specific scripts**
  - [ ] Add clean scripts to each package
  - [ ] Configure size-check in each package
  - [ ] Add build:post for necessary file copying
  - [ ] Setup CLI template copying

### Create Support Scripts

- [ ] **scripts/copy-package-json.js**
  - [ ] Create script to copy package.json to dist
  - [ ] Strip devDependencies and scripts
  - [ ] Adjust paths for published structure

- [ ] **scripts/pre-publish-check.js**
  - [ ] Create comprehensive pre-publish validation
  - [ ] Check for dist folders
  - [ ] Verify no test files in dist
  - [ ] Validate package.json configurations
  - [ ] Run size checks

## Phase 3: Distribution Configuration (Priority: High)

### Create .npmignore Files

- [ ] **Create .npmignore in each package**
  - [ ] Exclude source TypeScript files
  - [ ] Exclude test files and folders
  - [ ] Exclude development configs
  - [ ] Exclude build artifacts (.tsbuildinfo)
  - [ ] Keep only necessary markdown files

### Configure Size Monitoring

- [ ] **Create .size-limit.json in each package**
  - [ ] Configure limits for @atakora/lib (< 500 KB)
  - [ ] Configure limits for @atakora/cdk (< 2 MB)
  - [ ] Configure limits for @atakora/cli (< 1 MB)
  - [ ] Add checks for individual exports

- [ ] **Setup size reporting**
  - [ ] Add size-limit to CI pipeline
  - [ ] Configure size reports in PRs
  - [ ] Create size tracking dashboard

## Phase 4: Testing & Validation (Priority: Critical)

### Local Testing

- [ ] **Build verification**
  - [ ] Run full build: `npm run build`
  - [ ] Verify all dist folders created
  - [ ] Check source maps generated
  - [ ] Confirm declaration files present

- [ ] **Package contents verification**
  - [ ] Run `npm pack` for each package
  - [ ] Extract and inspect tarball contents
  - [ ] Verify only intended files included
  - [ ] Check package sizes against budgets

- [ ] **Installation testing**
  - [ ] Test `npm link` for each package
  - [ ] Create test project and install locally
  - [ ] Verify subpath imports work (@atakora/cdk/network)
  - [ ] Test TypeScript definitions resolve

- [ ] **Functionality testing**
  - [ ] Test CLI commands work after build
  - [ ] Verify CDK constructs compile and run
  - [ ] Check source maps work in debugger
  - [ ] Test tree-shaking with sample app

## Phase 5: CLI Optimization (Priority: Medium)

### Bundle CLI with esbuild

- [ ] **Configure esbuild**
  - [ ] Create esbuild configuration
  - [ ] Set platform: node, target: node18
  - [ ] Configure external dependencies
  - [ ] Setup source map generation

- [ ] **Update CLI bin wrapper**
  - [ ] Modify bin/atakora.js to use compiled JS
  - [ ] Remove tsx dependency from production
  - [ ] Test CLI execution performance

- [ ] **Template handling**
  - [ ] Copy templates to dist during build
  - [ ] Update template paths in code
  - [ ] Test template generation

## Phase 6: Continuous Integration (Priority: High)

### GitHub Actions Setup

- [ ] **Create .github/workflows/size-check.yml**
  - [ ] Run on all PRs
  - [ ] Check size limits
  - [ ] Comment results on PR
  - [ ] Fail if limits exceeded

- [ ] **Update existing workflows**
  - [ ] Add build step to test workflow
  - [ ] Add package validation
  - [ ] Cache node_modules properly

- [ ] **Create publish workflow**
  - [ ] Trigger on release creation
  - [ ] Run all tests and checks
  - [ ] Publish to npm registry
  - [ ] Update GitHub release with package links

## Phase 7: Documentation Updates (Priority: Medium)

### Update Package Documentation

- [ ] **Create/Update README.md files**
  - [ ] @atakora/lib README with usage
  - [ ] @atakora/cdk README with examples
  - [ ] @atakora/cli README with commands

- [ ] **Add CHANGELOG.md**
  - [ ] Setup conventional commits
  - [ ] Configure changelog generation
  - [ ] Document initial release

- [ ] **Update root README**
  - [ ] Add installation instructions
  - [ ] Document package relationships
  - [ ] Include quick start guide

## Phase 8: Optimization (Priority: Low)

### Reduce Package Sizes

- [ ] **Dependency optimization**
  - [ ] Audit all dependencies with `npm ls`
  - [ ] Remove unused dependencies
  - [ ] Find lighter alternatives
  - [ ] Move dev dependencies appropriately

- [ ] **Code optimization**
  - [ ] Run dead code elimination
  - [ ] Remove unnecessary exports
  - [ ] Optimize import statements

- [ ] **Asset optimization**
  - [ ] Minify CLI templates
  - [ ] Compress large JSON schemas
  - [ ] Remove unnecessary files

## Verification Checklist

Before marking complete, verify:

### Build System
- [ ] `npm run build` completes successfully
- [ ] All packages have dist folders with JS files
- [ ] TypeScript declarations are generated
- [ ] Source maps are present and valid

### Package Configuration
- [ ] All package.json files have `files` field
- [ ] All packages have `.npmignore` files
- [ ] Size limits are configured and passing
- [ ] Repository and publishConfig are set

### Distribution Testing
- [ ] `npm pack` produces expected tarballs
- [ ] Package sizes are within budgets
- [ ] `npm link` works for local testing
- [ ] Subpath exports resolve correctly

### Quality Assurance
- [ ] No test files in distribution
- [ ] No development configs shipped
- [ ] Source maps point to correct locations
- [ ] Tree-shaking works for consumers

## Success Criteria

The implementation is complete when:

1. ✅ All three packages build and package successfully
2. ✅ Package sizes are within defined budgets
3. ✅ Source maps work for debugging
4. ✅ Subpath imports work for @atakora/cdk
5. ✅ CLI runs without tsx in production
6. ✅ No test or dev files in published packages
7. ✅ CI/CD pipeline validates all constraints
8. ✅ Local testing via npm link works
9. ✅ Documentation is complete and accurate
10. ✅ Pre-publish checks all pass

## Rollback Plan

If issues arise after implementation:

1. **Immediate:** Revert package.json changes
2. **Build:** Restore original tsconfig settings
3. **Pipeline:** Disable new CI checks temporarily
4. **Recovery:** Use git tags to restore working state

## Support Resources

- [npm package.json documentation](https://docs.npmjs.com/cli/v9/configuring-npm/package-json)
- [TypeScript Compiler Options](https://www.typescriptlang.org/tsconfig)
- [size-limit documentation](https://github.com/ai/size-limit)
- [esbuild documentation](https://esbuild.github.io/)

## Notes for Charlie

### Priority Order
1. Start with package.json configurations (low risk, high value)
2. Update TypeScript configs next (enables proper builds)
3. Test thoroughly before adding CI checks
4. Optimization can be done incrementally

### Risk Areas
- **CLI bundling**: Test extensively, may need adjustments
- **Subpath exports**: Verify in real Node.js project
- **Source maps**: Check they work in VS Code debugger

### Quick Wins
- Adding `files` field immediately reduces package size
- Setting `sideEffects: false` enables tree-shaking
- Removing tsx from production saves 500 KB

Contact Becky (Staff Architect) for any architectural questions or concerns during implementation.