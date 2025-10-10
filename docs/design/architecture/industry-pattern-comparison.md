# Industry Pattern Comparison: Package API Boundaries

This document compares Atakora's approach to internal packages and public APIs with established industry patterns.

## Executive Summary

Atakora's decision to make `@atakora/lib` internal-only while exposing all public APIs through `@atakora/cdk` aligns with proven patterns from AWS CDK, Angular, and .NET. This approach provides clear API boundaries, better encapsulation, and improved developer experience.

## Pattern Analysis

### AWS CDK v2

**Structure:**
```
aws-cdk-lib/              # Single public package
├── core/                 # Framework classes (App, Stack, Construct)
├── aws-s3/              # S3 resources
├── aws-ec2/             # EC2 resources
└── aws-lambda/          # Lambda resources

@aws-cdk/               # Internal packages (not for direct use)
├── cloud-assembly-schema/
├── cx-api/
└── region-info/
```

**User Import Pattern:**
```typescript
// Everything from one package
import { App, Stack } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
```

**Key Lessons:**
- Single package eliminates version conflicts
- Internal packages hidden from users
- Namespace organization within single package
- Tree-shakable through module exports

### Angular

**Structure:**
```
@angular/core            # Core framework
@angular/common          # Common utilities
@angular/platform-browser # Browser-specific

@angular/compiler        # Internal (not imported by users)
@angular/compiler-cli    # Internal build tool
```

**User Import Pattern:**
```typescript
// Public packages only
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

// Never import from internal packages
// import { something } from '@angular/compiler'; // ❌
```

**Key Lessons:**
- Clear distinction between public and internal packages
- Internal packages support tooling but aren't user-facing
- Public packages re-export what users need

### React

**Structure:**
```
react/                   # Main package
├── index.js            # Public API
├── cjs/                # Internal builds
└── internals/          # Internal implementation

react-dom/              # Renderer package
react-reconciler/       # Internal package
```

**User Import Pattern:**
```typescript
// Public API only
import React from 'react';
import ReactDOM from 'react-dom';

// Internal packages not accessible
// import Reconciler from 'react-reconciler'; // Not for users
```

**Key Lessons:**
- Main package exposes curated public API
- Internal implementation hidden
- Separate packages for different concerns

### .NET Framework

**Structure:**
```
System/                  # Public assemblies
├── System.dll
├── System.Core.dll
└── System.Web.dll

System.Private/          # Internal assemblies
├── System.Private.CoreLib.dll
└── System.Private.Xml.dll
```

**User Import Pattern:**
```csharp
// Public namespaces only
using System;
using System.Collections.Generic;
using System.Web;

// Internal assemblies not referenced
// using System.Private.CoreLib; // Not accessible
```

**Key Lessons:**
- "Private" in name signals internal use
- Public assemblies expose safe API surface
- Internal changes don't break user code

### Vue.js

**Structure:**
```
vue/                     # Main package with all public APIs
├── dist/
│   ├── vue.runtime.esm-bundler.js
│   └── vue.global.js
└── packages/            # Internal during build
    ├── compiler-core/
    ├── reactivity/
    └── runtime-core/
```

**User Import Pattern:**
```typescript
// Single package import
import { createApp, ref, computed } from 'vue';

// Internal packages not published separately
// import { baseCompile } from '@vue/compiler-core'; // Not available
```

**Key Lessons:**
- Monorepo with single published package
- Internal packages exist for development only
- Users see single, cohesive API

## Atakora's Approach

### Current Structure (Problematic)
```
@atakora/lib/           # Framework (users import from here)
@atakora/cdk/           # Resources (users also import from here)
@atakora/cli/           # Tooling

// Users must know what comes from where
import { App } from '@atakora/lib';
import { VirtualNetworks } from '@atakora/cdk/network';
```

### New Structure (Aligned with Industry)
```
@atakora/cdk/           # Single public API surface
├── index.ts           # Framework re-exports
├── network/           # Network resources
├── storage/           # Storage resources
└── compute/           # Compute resources

@atakora/lib/           # Internal framework (not for users)
@atakora/cli/           # Tooling (uses lib internally)
```

**User Import Pattern:**
```typescript
// Framework from CDK root
import { App, Stack } from '@atakora/cdk';

// Resources from namespaces
import { VirtualNetworks } from '@atakora/cdk/network';
```

## Comparison Matrix

| Aspect | AWS CDK v2 | Angular | React | .NET | Atakora (New) |
|--------|------------|---------|--------|------|---------------|
| **Public Packages** | 1 (aws-cdk-lib) | Multiple (@angular/*) | 2 (react, react-dom) | Multiple (System.*) | 1 (@atakora/cdk) |
| **Internal Packages** | Hidden | Marked internal | Not published | Private.* naming | @atakora/lib |
| **Import Pattern** | Single package | Category packages | Minimal surface | Namespaces | Single package |
| **Version Management** | Single version | Synchronized | Synchronized | Framework version | Single version |
| **Tree-shaking** | ✅ Via modules | ✅ Via modules | ✅ Via bundler | N/A (.NET) | ✅ Via modules |
| **API Stability** | Public API stable | Public API stable | Public API stable | Public API stable | Public API stable |
| **Encapsulation** | ✅ Strong | ✅ Strong | ✅ Strong | ✅ Strong | ✅ Strong |

## Benefits of Industry-Aligned Approach

### 1. Clear API Boundaries
- Users know exactly what's public API
- Internal changes don't break user code
- Framework can evolve without breaking changes

### 2. Simplified Dependency Management
- Single version to track
- No version conflicts between packages
- Easier updates and maintenance

### 3. Better Developer Experience
- Single installation command
- Consistent import patterns
- Better IDE support and autocomplete

### 4. Improved Maintainability
- Freedom to refactor internals
- Clear separation of concerns
- Easier to deprecate and evolve APIs

## Anti-Patterns to Avoid

### 1. Exposing Internal APIs (Java's sun.* packages)
```java
// Bad: Using internal APIs
import sun.misc.Unsafe; // Internal, not guaranteed stable
```

### 2. Multiple Public Packages with Version Skew (AWS CDK v1)
```json
// Bad: Version conflicts
{
  "@aws-cdk/core": "1.60.0",
  "@aws-cdk/aws-s3": "1.61.0", // Version mismatch!
  "@aws-cdk/aws-ec2": "1.59.0"
}
```

### 3. Unclear Boundaries (Early Node.js ecosystem)
```javascript
// Bad: Reaching into internals
const internal = require('some-package/lib/internal/helper');
```

### 4. Re-exporting Everything (Barrel exports)
```typescript
// Bad: Destroys tree-shaking
export * from './internal';
export * from './helpers';
export * from './utils';
```

## Implementation Guidelines

Based on industry patterns, Atakora should:

1. **Name Internal Packages Clearly**
   - Consider renaming to `@atakora/internal-lib` or `@atakora/framework-internal`
   - Add clear warnings in package description

2. **Curate Public API Surface**
   - Only re-export what users need
   - Hide internal utilities and helpers
   - Provide stable, documented APIs

3. **Version as Single Unit**
   - CDK and lib versions should be synchronized
   - Use workspace versioning in monorepo
   - Single version for users to track

4. **Document Import Patterns**
   - Clear examples in documentation
   - Linting rules to enforce patterns
   - Migration tools for updates

5. **Plan for Evolution**
   - Deprecation strategy for old patterns
   - Clear migration paths
   - Semantic versioning commitment

## Conclusion

Atakora's decision to make `@atakora/lib` internal-only while exposing public APIs through `@atakora/cdk` follows established industry best practices. This pattern has been proven successful by:

- **AWS CDK v2**: Single package with namespace exports
- **Angular**: Clear public/internal package boundaries
- **React**: Minimal public API surface
- **.NET**: Private assemblies for internals
- **Vue.js**: Single package from monorepo

By adopting this pattern, Atakora provides:
- ✅ Clear API boundaries
- ✅ Better encapsulation
- ✅ Simplified versioning
- ✅ Improved developer experience
- ✅ Future flexibility

This architectural decision positions Atakora to scale effectively while maintaining a stable, user-friendly API.