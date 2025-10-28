# Package Size Budget and Monitoring Strategy

## Executive Summary

This document defines size budgets for Atakora npm packages and establishes monitoring strategies to prevent size regression. Package size directly impacts developer experience through installation time, CI/CD performance, and disk usage.

## Size Budget Targets

### Current Baselines and Targets

| Package | Current (estimated) | Target (v1.0) | Maximum | Critical Threshold |
|---------|-------------------|---------------|----------|-------------------|
| @atakora/lib | ~150 KB | < 500 KB | 750 KB | 1 MB |
| @atakora/cdk | ~800 KB | < 2 MB | 3 MB | 5 MB |
| @atakora/cli | ~300 KB | < 1 MB | 1.5 MB | 2 MB |

### Size Categories

**Minified + Gzipped (Download Size)**
- What users actually download from npm
- Most important metric for user experience
- Measured by: `npm pack --workspace=@atakora/cdk | gzip -c | wc -c`

**Unpacked Size (Disk Usage)**
- Space consumed after installation
- Important for CI/CD environments with caching
- Measured by: `npm pack --workspace=@atakora/cdk && tar -xzf *.tgz && du -sh package/`

**Dependency Tree Size**
- Total size including all dependencies
- Critical for understanding full impact
- Measured by: `npx bundle-phobia @atakora/cdk`

## Per-Package Budget Rationale

### @atakora/lib (Target: < 500 KB)

**Why this size:**
- Core framework with minimal dependencies
- Only includes constructs base class and utilities
- Similar to AWS CDK's core module size

**What contributes to size:**
- TypeScript type definitions (~40%)
- Core construct classes (~30%)
- Utility functions (~20%)
- Source maps (~10%)

**Growth allowance:**
- 3x headroom for future framework features
- Space for additional validation logic
- Room for more sophisticated resource modeling

### @atakora/cdk (Target: < 2 MB)

**Why this size:**
- Contains all Azure resource constructs
- 13+ namespace exports with multiple resources each
- Comparable to terraform-cdk providers

**What contributes to size:**
- Resource construct classes (~60%)
- Type definitions for all Azure resources (~30%)
- Validation schemas (~10%)

**Growth allowance:**
- Expect 100+ resource types at maturity
- Each resource averages 10-20 KB
- Source maps add ~30% overhead

### @atakora/cli (Target: < 1 MB)

**Why this size:**
- Interactive CLI with templates
- Similar to Angular CLI core size
- Includes scaffolding templates

**What contributes to size:**
- CLI commands and logic (~40%)
- Template files (~30%)
- Azure SDK dependencies (~30%)

**Growth allowance:**
- Additional commands and generators
- More sophisticated templates
- Enhanced Azure integrations

## Monitoring Strategy

### Continuous Integration Checks

**size-limit Configuration**

Install and configure in each package:

```json
// .size-limit.json
[
  {
    "name": "Main Export",
    "path": "dist/index.js",
    "limit": "50 KB"
  },
  {
    "name": "Total Package",
    "path": "dist/**/*.js",
    "limit": "2 MB"
  },
  {
    "name": "With Dependencies",
    "path": "dist/index.js",
    "import": "{ * }",
    "limit": "5 MB"
  }
]
```

**GitHub Actions Workflow**

```yaml
name: Size Check

on: [push, pull_request]

jobs:
  size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build

      - name: Check size
        uses: andresz1/size-limit-action@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          skip_step: build
```

### Bundle Analysis Tools

**1. webpack-bundle-analyzer**

For detailed analysis of what's in the bundle:

```bash
npm install --save-dev webpack-bundle-analyzer

# Add to package.json scripts
"analyze": "webpack-bundle-analyzer dist/stats.json"
```

**2. Bundle Phobia Integration**

Check package impact before adding dependencies:

```bash
# Check a dependency's size before installing
npx bundle-phobia axios

# Analyze current package
npx bundle-phobia @atakora/cdk@latest
```

**3. Source Map Explorer**

Visualize what code contributes to bundle size:

```bash
npm install --save-dev source-map-explorer

# Add to package.json scripts
"analyze:sourcemap": "source-map-explorer dist/**/*.js"
```

## Size Optimization Strategies

### Immediate Optimizations (No Quality Impact)

1. **Remove Unused Exports**
   - Audit exports that aren't used
   - Use `ts-prune` to find dead code
   - Estimated savings: 5-10%

2. **Optimize Import Statements**
   - Use specific imports, not barrel exports
   - Tree-shake internal utilities
   - Estimated savings: 10-15%

3. **Lazy Load Large Modules**
   - Dynamic imports for rarely-used features
   - Defer loading expensive validations
   - Estimated savings: 20-30%

### Medium-term Optimizations (Minor Trade-offs)

1. **Selective Source Maps**
   - Only ship source maps for public APIs
   - Use compressed source maps
   - Estimated savings: 25-30%

2. **Schema Compression**
   - Compress validation schemas
   - Load schemas on-demand
   - Estimated savings: 10-15%

3. **Template Optimization**
   - Minify template files
   - Compress with gzip
   - Estimated savings: 40-50% on templates

### Long-term Optimizations (Architectural Changes)

1. **Package Splitting**
   - Separate packages per Azure namespace
   - Optional peer dependencies
   - Estimated savings: 60-70% per package

2. **Code Generation at Runtime**
   - Generate boilerplate on-demand
   - Ship minimal templates
   - Estimated savings: 30-40%

3. **External Schema Loading**
   - Load schemas from CDN
   - Cache locally after first use
   - Estimated savings: 15-20%

## Dependency Management

### Dependency Audit Criteria

Before adding a dependency, evaluate:

1. **Size Impact**
   - Total size with dependencies
   - Number of transitive dependencies
   - Tree-shaking compatibility

2. **Alternatives**
   - Native Node.js alternatives
   - Smaller equivalent packages
   - Custom implementation feasibility

3. **Necessity**
   - Core functionality vs nice-to-have
   - Usage frequency
   - User-facing vs build-time only

### Current Dependencies Analysis

**@atakora/lib Dependencies:**
```json
{
  "constructs": "^10.3.0",    // 50 KB - Required, minimal
  "ajv": "^8.12.0",           // 120 KB - Consider lighter alternative
  "ajv-formats": "^2.1.1"     // 15 KB - Optional, evaluate need
}
```

**@atakora/cli Dependencies:**
```json
{
  "inquirer": "^9.0.0",       // 180 KB - Keep, core CLI UX
  "chalk": "^5.0.0",          // 15 KB - Keep, minimal
  "ora": "^7.0.0",            // 35 KB - Keep, good UX
  "commander": "^12.0.0",     // 50 KB - Keep, standard CLI
  "tsx": "^4.7.0",            // 500 KB - Evaluate for production
  "@azure/identity": "^4.0.0", // 800 KB - Heavy, lazy load
  "@azure/arm-*": "^5.0.0"    // 500 KB each - Lazy load
}
```

### Recommended Dependency Changes

1. **Remove tsx from production**
   - Only needed for development
   - Ship compiled JavaScript instead
   - Savings: 500 KB

2. **Lazy load Azure SDKs**
   - Load only when deployment features used
   - Use dynamic imports
   - Savings: 1.3 MB

3. **Replace ajv with simpler validation**
   - Consider `joi` or custom validation
   - Evaluate if full JSON Schema needed
   - Potential savings: 100 KB

## Reporting and Alerts

### Size Report Format

Generate weekly size reports:

```markdown
## Package Size Report - Week 45, 2024

### Size Trends
| Package | Last Week | This Week | Change | Status |
|---------|-----------|-----------|--------|--------|
| @atakora/lib | 145 KB | 148 KB | +3 KB | ✅ OK |
| @atakora/cdk | 780 KB | 825 KB | +45 KB | ⚠️ Watch |
| @atakora/cli | 290 KB | 285 KB | -5 KB | ✅ Good |

### Largest Contributors
1. @atakora/cdk/network - 125 KB (15%)
2. @atakora/cdk/storage - 98 KB (12%)
3. @atakora/cli/templates - 85 KB (30%)

### Recommendations
- Consider splitting network module
- Review storage construct dependencies
- Optimize CLI templates
```

### Alert Thresholds

**Warning Level (Yellow)**
- Package exceeds 80% of target
- Dependency adds >50 KB
- Week-over-week growth >5%

**Critical Level (Red)**
- Package exceeds target size
- Dependency adds >100 KB
- Month-over-month growth >20%

**Emergency Level (Block Release)**
- Package exceeds maximum size
- Critical threshold breached
- User-reported performance issues

## Success Metrics

### Primary Metrics

1. **Installation Time**
   - Target: < 10 seconds on average connection
   - Measure: Time to `npm install` completion
   - Current: ~15 seconds

2. **CI Cache Size**
   - Target: < 50 MB for all Atakora packages
   - Measure: node_modules size after install
   - Current: ~80 MB

3. **First-run Performance**
   - Target: < 2 seconds to first execution
   - Measure: Time from CLI invocation to response
   - Current: ~3 seconds

### Secondary Metrics

1. **Tree-shaking Effectiveness**
   - Users can reduce bundle by 70% with selective imports
   - Measure via sample applications

2. **Dependency Count**
   - Keep total unique dependencies < 50
   - Minimize dependency tree depth

3. **Update Frequency vs Size**
   - Track if updates increase size
   - Maintain size stability across versions

## Implementation Roadmap

### Phase 1: Measurement (Week 1)
- [ ] Install size-limit in all packages
- [ ] Configure size budgets
- [ ] Add size check to CI
- [ ] Create initial size baseline

### Phase 2: Optimization (Weeks 2-3)
- [ ] Remove development dependencies from production
- [ ] Implement lazy loading for heavy modules
- [ ] Optimize templates and assets
- [ ] Review and reduce dependencies

### Phase 3: Monitoring (Week 4+)
- [ ] Set up automated size reports
- [ ] Configure alerts for threshold breaches
- [ ] Create dashboard for size trends
- [ ] Establish review process for new dependencies

## Tools and Resources

### Recommended Tools

- **[size-limit](https://github.com/ai/size-limit)** - Size checking with CI integration
- **[bundlephobia](https://bundlephobia.com)** - Package size analysis
- **[source-map-explorer](https://github.com/danvk/source-map-explorer)** - Bundle visualization
- **[webpack-bundle-analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer)** - Detailed analysis
- **[depcheck](https://github.com/depcheck/depcheck)** - Find unused dependencies
- **[npm-check](https://github.com/dylang/npm-check)** - Interactive dependency updates

### Scripts for package.json

```json
{
  "scripts": {
    "size": "size-limit",
    "size:why": "size-limit --why",
    "analyze": "source-map-explorer dist/**/*.js",
    "deps:check": "depcheck",
    "deps:audit": "npm audit --production",
    "bundle:phobia": "npx bundle-phobia ."
  }
}
```

## Appendix: Size Comparison with Similar Tools

| Tool | Main Package | Size (minified) | With Dependencies |
|------|--------------|-----------------|-------------------|
| AWS CDK v2 | aws-cdk-lib | 15 MB | 45 MB |
| Terraform CDK | cdktf | 2.5 MB | 12 MB |
| Pulumi | @pulumi/pulumi | 3 MB | 18 MB |
| Serverless Framework | serverless | 8 MB | 35 MB |
| **Atakora (target)** | @atakora/cdk | **2 MB** | **8 MB** |

Our target positions Atakora as one of the lighter IaC tools while maintaining full functionality.