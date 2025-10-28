# Build Configuration Guide for npm Distribution

## Overview

This guide provides specific configurations needed to prepare Atakora packages for npm publication, following the decisions in ADR-005.

## Package.json Configurations

### @atakora/lib Configuration

```json
{
  "name": "@atakora/lib",
  "version": "0.0.1",
  "description": "Core library for Atakora - Internal framework utilities",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": [
    "dist/**/*.js",
    "dist/**/*.d.ts",
    "dist/**/*.js.map",
    "dist/**/*.d.ts.map",
    "!dist/**/*.test.*",
    "!dist/**/__tests__",
    "README.md",
    "LICENSE"
  ],
  "sideEffects": false,
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/atakora.git",
    "directory": "packages/lib"
  },
  "keywords": ["azure", "arm", "infrastructure", "internal"],
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### @atakora/cdk Configuration

```json
{
  "name": "@atakora/cdk",
  "version": "0.0.1",
  "description": "Azure CDK constructs for type-safe ARM template generation",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./network": {
      "types": "./dist/network/index.d.ts",
      "default": "./dist/network/index.js"
    },
    "./storage": {
      "types": "./dist/storage/index.d.ts",
      "default": "./dist/storage/index.js"
    },
    "./compute": {
      "types": "./dist/compute/index.d.ts",
      "default": "./dist/compute/index.js"
    },
    "./web": {
      "types": "./dist/web/index.d.ts",
      "default": "./dist/web/index.js"
    },
    "./keyvault": {
      "types": "./dist/keyvault/index.d.ts",
      "default": "./dist/keyvault/index.js"
    },
    "./sql": {
      "types": "./dist/sql/index.d.ts",
      "default": "./dist/sql/index.js"
    },
    "./insights": {
      "types": "./dist/insights/index.d.ts",
      "default": "./dist/insights/index.js"
    },
    "./operationalinsights": {
      "types": "./dist/operationalinsights/index.d.ts",
      "default": "./dist/operationalinsights/index.js"
    },
    "./documentdb": {
      "types": "./dist/documentdb/index.d.ts",
      "default": "./dist/documentdb/index.js"
    },
    "./cognitiveservices": {
      "types": "./dist/cognitiveservices/index.d.ts",
      "default": "./dist/cognitiveservices/index.js"
    },
    "./search": {
      "types": "./dist/search/index.d.ts",
      "default": "./dist/search/index.js"
    },
    "./apimanagement": {
      "types": "./dist/apimanagement/index.d.ts",
      "default": "./dist/apimanagement/index.js"
    },
    "./resources": {
      "types": "./dist/resources/index.d.ts",
      "default": "./dist/resources/index.js"
    }
  },
  "files": [
    "dist/**/*.js",
    "dist/**/*.d.ts",
    "dist/**/*.js.map",
    "dist/**/*.d.ts.map",
    "!dist/**/*.test.*",
    "!dist/**/__tests__",
    "README.md",
    "LICENSE",
    "CHANGELOG.md"
  ],
  "sideEffects": false,
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/atakora.git",
    "directory": "packages/cdk"
  },
  "keywords": [
    "azure",
    "arm",
    "bicep",
    "cdk",
    "infrastructure",
    "infrastructure-as-code",
    "iac",
    "cloud",
    "typescript"
  ],
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### @atakora/cli Configuration

```json
{
  "name": "@atakora/cli",
  "version": "0.0.1",
  "description": "CLI for Atakora - Azure Infrastructure as TypeScript",
  "bin": {
    "atakora": "./bin/atakora.js"
  },
  "files": [
    "bin/**/*",
    "dist/**/*.js",
    "dist/**/*.d.ts",
    "dist/**/*.js.map",
    "dist/**/*.d.ts.map",
    "templates/**/*",
    "!dist/**/*.test.*",
    "!dist/**/__tests__",
    "README.md",
    "LICENSE"
  ],
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/atakora.git",
    "directory": "packages/cli"
  },
  "keywords": [
    "cli",
    "azure",
    "arm",
    "infrastructure",
    "scaffolding",
    "generator"
  ],
  "engines": {
    "node": ">=18.0.0"
  }
}
```

## TypeScript Configurations

### Shared tsconfig.base.json Updates

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "removeComments": false,
    "preserveConstEnums": true,
    "inlineSources": true,
    "newLine": "lf"
  }
}
```

### Package-Specific tsconfig.json Updates

For each package, ensure these settings:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "tsBuildInfoFile": "./dist/.tsbuildinfo",
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/__tests__/**/*"
  ]
}
```

## Build Scripts Configuration

### Root package.json Scripts

```json
{
  "scripts": {
    "build": "npm run build:clean && npm run build:compile && npm run build:post",
    "build:clean": "npm run clean --workspaces --if-present",
    "build:compile": "tsc --build",
    "build:post": "npm run build:post --workspaces --if-present",
    "build:watch": "tsc --build --watch",
    "prepublishOnly": "npm run build && npm run test && npm run size-check",
    "size-check": "npm run size-check --workspaces --if-present"
  }
}
```

### Per-Package Build Scripts

**@atakora/lib:**
```json
{
  "scripts": {
    "build": "tsc --build",
    "build:post": "node ../../scripts/copy-package-json.js",
    "clean": "rimraf dist *.tsbuildinfo",
    "size-check": "size-limit",
    "prepublishOnly": "npm run build"
  }
}
```

**@atakora/cdk:**
```json
{
  "scripts": {
    "build": "tsc --build",
    "build:post": "node ../../scripts/copy-package-json.js",
    "clean": "rimraf dist *.tsbuildinfo",
    "size-check": "size-limit",
    "prepublishOnly": "npm run build"
  }
}
```

**@atakora/cli:**
```json
{
  "scripts": {
    "build": "tsc --build && npm run build:bundle",
    "build:bundle": "esbuild src/cli.ts --bundle --platform=node --target=node18 --external:* --outfile=dist/cli-bundle.js",
    "build:post": "cp -r src/templates dist/templates",
    "clean": "rimraf dist *.tsbuildinfo",
    "size-check": "size-limit",
    "prepublishOnly": "npm run build"
  }
}
```

## .npmignore Files

Create `.npmignore` in each package root:

```gitignore
# Source files
src/
*.ts
!*.d.ts

# Test files
**/*.test.*
**/*.spec.*
**/__tests__/
coverage/
.nyc_output/

# Development files
.eslintrc*
.prettierrc*
vitest.config.*
jest.config.*
tsconfig.json
tsconfig.*.json

# Build artifacts
*.tsbuildinfo
*.log

# Documentation
docs/
*.md
!README.md
!LICENSE
!CHANGELOG.md

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
```

## Size Monitoring Configuration

### Install size-limit

```bash
npm install --save-dev @size-limit/preset-small-lib @size-limit/file
```

### Per-Package .size-limit.json

**@atakora/lib:**
```json
[
  {
    "path": "dist/**/*.js",
    "limit": "500 KB",
    "name": "@atakora/lib"
  }
]
```

**@atakora/cdk:**
```json
[
  {
    "path": "dist/index.js",
    "limit": "50 KB",
    "name": "Main export"
  },
  {
    "path": "dist/**/*.js",
    "limit": "2 MB",
    "name": "Total package"
  }
]
```

**@atakora/cli:**
```json
[
  {
    "path": "dist/**/*.js",
    "limit": "1 MB",
    "name": "@atakora/cli"
  }
]
```

## Build Tool Installation

### Required Development Dependencies

Add to root package.json:

```json
{
  "devDependencies": {
    "esbuild": "^0.19.0",
    "rimraf": "^5.0.0",
    "@size-limit/preset-small-lib": "^11.0.0",
    "@size-limit/file": "^11.0.0"
  }
}
```

## Pre-publish Checklist Script

Create `scripts/pre-publish-check.js`:

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const packages = ['lib', 'cdk', 'cli'];
const checks = [];

console.log('🔍 Running pre-publish checks...\n');

// Check 1: Ensure all packages have dist folders
for (const pkg of packages) {
  const distPath = path.join(__dirname, '..', 'packages', pkg, 'dist');
  if (!fs.existsSync(distPath)) {
    checks.push(`❌ Missing dist folder for @atakora/${pkg}`);
  } else {
    checks.push(`✅ Dist folder exists for @atakora/${pkg}`);
  }
}

// Check 2: Verify package.json files field
for (const pkg of packages) {
  const packageJsonPath = path.join(__dirname, '..', 'packages', pkg, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

  if (!packageJson.files) {
    checks.push(`❌ Missing 'files' field in @atakora/${pkg}/package.json`);
  } else {
    checks.push(`✅ 'files' field present in @atakora/${pkg}`);
  }
}

// Check 3: Run size checks
try {
  execSync('npm run size-check', { stdio: 'inherit' });
  checks.push('✅ Size checks passed');
} catch (error) {
  checks.push('❌ Size checks failed');
}

// Check 4: Verify no test files in dist
for (const pkg of packages) {
  const distPath = path.join(__dirname, '..', 'packages', pkg, 'dist');
  if (fs.existsSync(distPath)) {
    const testFiles = execSync(`find ${distPath} -name "*.test.js" -o -name "*.spec.js" 2>/dev/null || true`)
      .toString()
      .trim();

    if (testFiles) {
      checks.push(`❌ Test files found in @atakora/${pkg}/dist`);
    } else {
      checks.push(`✅ No test files in @atakora/${pkg}/dist`);
    }
  }
}

// Print results
console.log('\n📋 Pre-publish Check Results:\n');
checks.forEach(check => console.log(`  ${check}`));

const failures = checks.filter(c => c.startsWith('❌')).length;
if (failures > 0) {
  console.log(`\n⚠️  ${failures} checks failed. Please fix before publishing.`);
  process.exit(1);
} else {
  console.log('\n✅ All checks passed! Ready to publish.');
}
```

## Publishing Workflow

### Manual Publishing Steps

1. **Version Bump:**
   ```bash
   npm version patch --workspaces
   # or
   npm version minor --workspaces
   ```

2. **Build All Packages:**
   ```bash
   npm run build
   ```

3. **Run Tests:**
   ```bash
   npm test
   ```

4. **Check Sizes:**
   ```bash
   npm run size-check
   ```

5. **Dry Run:**
   ```bash
   npm publish --dry-run --workspaces
   ```

6. **Publish:**
   ```bash
   npm publish --workspaces
   ```

### GitHub Actions Workflow

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to npm

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: npm ci

      - name: Build packages
        run: npm run build

      - name: Run tests
        run: npm test

      - name: Check sizes
        run: npm run size-check

      - name: Publish packages
        run: npm publish --workspaces
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Troubleshooting Guide

### Common Issues and Solutions

1. **Large Package Size:**
   - Check for accidentally included node_modules
   - Verify .npmignore is working
   - Run `npm pack` to see what's included

2. **Missing Type Definitions:**
   - Ensure `declaration: true` in tsconfig.json
   - Check that .d.ts files are in the files field

3. **Source Maps Not Working:**
   - Verify `sourceMap: true` and `inlineSources: true`
   - Check that .js.map files are included

4. **Subpath Exports Not Resolving:**
   - Test with `npm link` locally
   - Verify paths in exports field match dist structure

5. **Build Failing:**
   - Clear all dist folders and .tsbuildinfo files
   - Run `npm run clean` then `npm run build`

## Verification Commands

```bash
# Check what files will be published
npm pack --dry-run --workspace=@atakora/cdk

# Analyze package contents
npm pack --workspace=@atakora/cdk
tar -tzf atakora-cdk-*.tgz | head -20

# Test local installation
npm link --workspace=@atakora/cdk
cd /tmp && npm init -y && npm link @atakora/cdk

# Check bundle size
npx size-limit --workspace=@atakora/cdk
```