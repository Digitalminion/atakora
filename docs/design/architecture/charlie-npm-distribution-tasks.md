# Charlie's NPM Distribution Implementation Tasks

## Overview
Based on ADR-005 (NPM Package Distribution Strategy), Charlie needs to implement the build configuration changes to optimize our npm packages for distribution.

## High Priority Tasks (Complete First)

### 1. Configure npm package files field for all packages [Task: 1211611440972533]
- Add `files` field to package.json for @atakora/lib, @atakora/cdk, @atakora/cli
- Follow ADR-005 specifications:
  - Include: dist/, README.md, LICENSE, package.json
  - Exclude: tests, configs, source files, examples
- This optimizes package size for npm distribution

### 2. Configure sideEffects for tree-shaking support [Task: 1211611495020251]
- Add `"sideEffects": false` to package.json for all packages
- Enables consumers to tree-shake unused code
- Allows bundlers like webpack and rollup to eliminate dead code

### 3. Test npm packages locally with npm pack [Task: 1211611595019395]
- Use `npm pack` to test package outputs
- Verify only necessary files are included
- Check actual bundle sizes against budgets:
  - @atakora/lib < 500KB
  - @atakora/cdk < 2MB
  - @atakora/cli < 1MB
- Document actual sizes in test report

## Medium Priority Task

### 4. Set up size-limit monitoring in CI pipeline [Task: 1211611448533360]
- Implement package size monitoring using size-limit or similar tool
- Configure size budgets per ADR-005
- Set up GitHub Actions to fail if packages exceed budgets
- Add size badges to README files
- Generate size reports on PRs

## Implementation Checklist

Use this checklist to track your progress:

### Package.json Updates
- [ ] Add `files` field to @atakora/lib/package.json
- [ ] Add `files` field to @atakora/cdk/package.json
- [ ] Add `files` field to @atakora/cli/package.json
- [ ] Add `sideEffects: false` to @atakora/lib/package.json
- [ ] Add `sideEffects: false` to @atakora/cdk/package.json
- [ ] Add `sideEffects: false` to @atakora/cli/package.json

### Testing
- [ ] Run `npm pack` in packages/lib
- [ ] Run `npm pack` in packages/cdk
- [ ] Run `npm pack` in packages/cli
- [ ] Verify tarball contents (extract and inspect)
- [ ] Document actual package sizes
- [ ] Verify sizes meet budgets

### CI/CD Setup (if time permits)
- [ ] Add size-limit package to devDependencies
- [ ] Configure .size-limit.json with budgets
- [ ] Add size check to GitHub Actions workflow
- [ ] Add size badges to README files

## Reference Documents

- **ADR-005**: `docs/design/architecture/adr-005-npm-distribution-strategy.md`
- **Build Configuration Guide**: `docs/design/architecture/build-configuration-guide.md`
- **Implementation Checklist**: `docs/design/architecture/npm-distribution-implementation-checklist.md`

## How to Complete Tasks

1. Check your task list:
   ```bash
   npx dm list --agent charlie -i
   ```

2. Get task details:
   ```bash
   npx dm task get <taskId>
   ```

3. Add progress comments:
   ```bash
   npx dm comment add <taskId> "Completed files field configuration for all packages"
   ```

4. Mark tasks complete:
   ```bash
   npx dm task complete <taskId>
   ```

## Success Criteria

Your implementation is successful when:
1. All three packages have proper `files` configuration
2. All three packages have `sideEffects: false`
3. `npm pack` produces packages under size budgets
4. No test files, source maps, or config files in tarballs
5. Packages can be installed and imported correctly

Good luck, Charlie! Focus on the high-priority tasks first (1-3) as they directly impact our npm distribution strategy.