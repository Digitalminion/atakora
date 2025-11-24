# Documentation Structure & Enhancement Plan

**Status**: Proposed
**Date**: 2025-10-08
**Assigned**: Ella (Documentation Engineer)

---

## Current State Analysis

### Existing Documentation

```
docs/
├── adr/                          # Architecture Decision Records (scattered)
├── design/
│   └── architecture/            # ADRs and design docs (duplicated)
├── guides/
│   ├── README.md               # Navigation hub
│   ├── getting-started.md      # ✅ Good
│   ├── multi-package-projects.md
│   ├── validation-architecture.md
│   └── common-validation-errors.md
├── reference/
│   ├── cli-commands.md         # ✅ Good
│   ├── error-codes.md
│   └── manifest-schema.md
├── ADDING_RESOURCES.md         # Should be in guides/
├── ARCHITECTURE.md             # Should be consolidated
├── CI_CD_GUIDE.md              # Should be in guides/
└── NAMING_CONVENTIONS.md       # Should be in reference/
```

### Problems Identified

1. **No clear hierarchy** - Files scattered at root level
2. **No navigation structure** - Missing breadcrumbs, table of contents
3. **Duplicate locations** - ADRs in both `/adr/` and `/design/architecture/`
4. **Incomplete sections** - Many "Coming soon" placeholders
5. **No visual polish** - Plain markdown, no diagrams or formatting consistency
6. **Missing critical docs** - API reference, architecture overview, tutorials
7. **No search/indexing** - Hard to discover content

---

## Reference Examples: Best-in-Class Documentation

### 1. **AWS CDK Documentation**

- **Link**: https://docs.aws.amazon.com/cdk/v2/guide/home.html
- **Structure**:
  - Getting Started (quick wins)
  - Concepts (progressive learning)
  - API Reference (by service namespace)
  - Examples & Tutorials
  - Migration Guides
  - Troubleshooting
- **What to Learn**:
  - ✅ Progressive complexity (beginner → advanced)
  - ✅ Namespace-organized API docs
  - ✅ Clear code examples in every guide
  - ✅ Consistent navigation sidebar

### 2. **Stripe API Documentation**

- **Link**: https://docs.stripe.com/
- **Structure**:
  - Quick Start
  - Product Guides (by feature)
  - API Reference (auto-generated from code)
  - SDKs & Libraries
  - Webhooks & Events
  - Testing Tools
- **What to Learn**:
  - ✅ Interactive code examples
  - ✅ Language-specific tabs (TypeScript/JavaScript)
  - ✅ Beautiful visual design
  - ✅ Search-first navigation
  - ✅ Version picker

### 3. **React Documentation (react.dev)**

- **Link**: https://react.dev/
- **Structure**:
  - Learn React (tutorial-based)
  - API Reference
  - Community Resources
  - Blog (updates & releases)
- **What to Learn**:
  - ✅ Tutorial-first approach
  - ✅ Interactive sandboxes
  - ✅ "Deep Dives" for complex topics
  - ✅ Clear breadcrumbs on every page
  - ✅ Next/Previous navigation

### 4. **Kubernetes Documentation**

- **Link**: https://kubernetes.io/docs/
- **Structure**:
  - Getting Started
  - Concepts (architecture fundamentals)
  - Tasks (how-to guides)
  - Tutorials (end-to-end scenarios)
  - Reference (API, CLI, Config)
  - Contribute
- **What to Learn**:
  - ✅ Separation: Concepts vs Tasks vs Tutorials
  - ✅ Multi-language support
  - ✅ Clear versioning
  - ✅ Glossary of terms

### 5. **Terraform Documentation**

- **Link**: https://developer.hashicorp.com/terraform/docs
- **Structure**:
  - Intro & Getting Started
  - Language (HCL syntax)
  - CLI Reference
  - Providers (by cloud)
  - Modules & Registry
  - Cloud Integration
- **What to Learn**:
  - ✅ Provider-based organization
  - ✅ Extensive examples
  - ✅ Clear CLI command reference
  - ✅ Migration guides between versions

---

## Proposed Documentation Structure

### New Directory Layout

```
docs/
├── README.md                    # 🆕 Main landing page with quick links
│
├── getting-started/             # 🆕 Beginner-friendly intro
│   ├── README.md               # Navigation hub
│   ├── installation.md         # Install CLI, prerequisites
│   ├── quickstart.md           # 5-minute walkthrough
│   ├── your-first-stack.md     # Deploy first infrastructure
│   └── next-steps.md           # Where to go after quickstart
│
├── guides/                      # How-to guides & tutorials
│   ├── README.md               # ✅ Keep (enhance navigation)
│   ├── fundamentals/           # 🆕 Core concepts
│   │   ├── app-and-stacks.md
│   │   ├── resources.md
│   │   ├── synthesis.md
│   │   └── deployment.md
│   │
│   ├── tutorials/              # 🆕 End-to-end scenarios
│   │   ├── web-app-with-database.md
│   │   ├── multi-region-setup.md
│   │   ├── ci-cd-pipeline.md
│   │   └── government-cloud-deployment.md
│   │
│   ├── workflows/              # 🆕 Common tasks
│   │   ├── adding-resources.md        # ← Move from root
│   │   ├── testing-infrastructure.md
│   │   ├── organizing-projects.md     # ← Multi-package guide
│   │   ├── managing-secrets.md
│   │   └── deploying-environments.md
│   │
│   ├── validation/             # 🆕 Consolidate validation docs
│   │   ├── overview.md                # ← validation-architecture.md
│   │   ├── common-errors.md           # ✅ Keep
│   │   └── writing-custom-validators.md
│   │
│   └── migration/              # 🆕 Version migration guides
│       └── migrating-to-cdk-package.md  # From Ella's existing task
│
├── reference/                   # Technical reference docs
│   ├── README.md               # 🆕 Reference hub
│   │
│   ├── cli/                    # 🆕 CLI reference
│   │   ├── README.md          # CLI overview
│   │   ├── init.md            # Each command gets own page
│   │   ├── add.md
│   │   ├── synth.md
│   │   ├── deploy.md
│   │   ├── diff.md
│   │   ├── config.md
│   │   └── set-default.md
│   │
│   ├── api/                    # 🆕 API documentation
│   │   ├── README.md          # API overview
│   │   ├── core/              # @atakora/lib exports
│   │   │   ├── app.md
│   │   │   ├── stack.md
│   │   │   ├── resource.md
│   │   │   └── ...
│   │   │
│   │   └── cdk/               # @atakora/cdk exports (after migration)
│   │       ├── network.md     # All Microsoft.Network resources
│   │       ├── storage.md
│   │       ├── web.md
│   │       └── ...
│   │
│   ├── manifest-schema.md      # ✅ Keep (enhance)
│   ├── error-codes.md          # ✅ Keep (enhance)
│   ├── naming-conventions.md   # ← Move from root
│   └── arm-template-output.md  # 🆕 ARM template structure reference
│
├── architecture/                # 🆕 Consolidate all architecture docs
│   ├── README.md               # Architecture overview
│   ├── decisions/              # ADRs (merge adr/ and design/architecture/)
│   │   ├── README.md          # ADR index
│   │   ├── adr-001-validation-architecture.md
│   │   ├── adr-002-manifest-schema.md
│   │   ├── adr-003-cdk-package-architecture.md
│   │   └── template.md        # 🆕 ADR template for future decisions
│   │
│   ├── design/                 # Design documents
│   │   ├── project-structure-spec.md
│   │   ├── validation-integration-plan.md
│   │   └── ...
│   │
│   └── diagrams/               # 🆕 Architecture diagrams
│       ├── system-overview.svg
│       ├── synthesis-pipeline.svg
│       └── deployment-flow.svg
│
├── contributing/                # 🆕 Contribution guides
│   ├── README.md               # How to contribute
│   ├── code-of-conduct.md
│   ├── development-setup.md
│   ├── testing-guide.md
│   ├── pr-process.md
│   └── release-process.md
│
├── examples/                    # 🆕 Complete example projects
│   ├── README.md               # Examples index
│   ├── simple-web-app/
│   │   ├── README.md
│   │   └── main.ts
│   ├── multi-region-app/
│   └── government-cloud/
│
└── troubleshooting/             # 🆕 Problem-solving guides
    ├── README.md
    ├── Common-Issues.md
    ├── Debugging-Synthesis.md
    ├── Deployment-Failures.md
    └── CI-CD-Problems.md
```

---

## Documentation Enhancement Features

### 1. Navigation & Discoverability

**Every page should have**:

```markdown
---
title: Page Title
description: Brief description for SEO
breadcrumbs: Home > Guides > Tutorials > This Page
previous: ../previous-page.md
next: ../next-page.md
---

# Page Title

<!-- Breadcrumb navigation -->

[Home](/) > [Guides](/guides) > [Tutorials](/guides/tutorials) > This Page

<!-- Quick links box -->

> **Quick Links**
>
> - [Related Guide 1](./related.md)
> - [API Reference](/reference/api/core.md)
> - [Example Project](/examples/simple-web-app)

<!-- Content here -->

---

## Next Steps

Continue to: [Next Topic](./next-page.md)

**Related Reading**:

- [Related Topic 1](./related1.md)
- [Related Topic 2](./related2.md)
```

### 2. Consistent Formatting Standards

**Code Examples**:

- Always include imports
- Show complete working examples
- Use realistic names (not "foo", "bar")
- Add comments explaining key concepts
- Include both TypeScript and JavaScript tabs where applicable

**Example**:

````markdown
```typescript
// Import core framework
import { App, ResourceGroupStack } from '@atakora/lib';

// Import Azure resources
import { VirtualNetworks } from '@atakora/cdk/network';
import { StorageAccounts } from '@atakora/cdk/storage';

// Create app and stack
const app = new App();
const stack = new ResourceGroupStack(app, 'WebApp', {
  resourceGroupName: 'rg-webapp-prod',
  location: 'eastus2',
});

// Define infrastructure
const vnet = new VirtualNetworks(stack, 'VNet', {
  virtualNetworkName: 'vnet-webapp',
  addressSpace: { addressPrefixes: ['10.0.0.0/16'] },
});

const storage = new StorageAccounts(stack, 'Storage', {
  accountName: 'stwebappprod',
});

// Synthesize ARM templates
app.synth();
```
````

**Callouts & Admonitions**:

```markdown
> ✅ **Best Practice**: Always validate templates before deployment

> ⚠️ **Warning**: Government cloud requires different authentication

> 💡 **Tip**: Use `--validate-only` to check templates without deploying

> ⛔ **Important**: This is a breaking change in v2.0.0

> 📝 **Note**: This feature requires CLI version 1.2.0 or higher
```

**Diagrams**:

- Use Mermaid for simple flowcharts
- SVG for complex architecture diagrams
- Screenshots for UI/CLI output

### 3. Search & Index

Create `docs/GLOSSARY.md`:

```markdown
# Glossary

## A

**App**: The root construct containing all stacks

**ARM**: Azure Resource Manager, Azure's deployment framework

## C

**CDK**: Cloud Development Kit - write infrastructure as code

**Construct**: Reusable infrastructure component
```

Create `docs/INDEX.md`:

```markdown
# Documentation Index

Alphabetical index of all documentation pages with descriptions.
```

### 4. Version Indicators

For features in specific versions:

```markdown
> **Available in**: v1.2.0+

> **Deprecated in**: v1.5.0 (use [new method](./new.md) instead)

> **Removed in**: v2.0.0
```

---

## Documentation Tasks for Ella

### Phase 1: Foundation & Structure (Week 1)

**Priority: High**

1. **Create main landing page** (`docs/README.md`)
   - Hero section with project description
   - Quick links to getting started, guides, reference
   - Feature highlights
   - Installation command
   - Example code snippet

2. **Restructure directories** (file moves)
   - Create new directory structure
   - Move existing files to new locations
   - Update all internal links
   - Create navigation READMEs for each section

3. **Implement navigation system**
   - Add breadcrumbs to all existing pages
   - Add previous/next links
   - Create section landing pages (README.md in each directory)
   - Build cross-reference "Related Reading" sections

### Phase 2: Getting Started Experience (Week 2)

**Priority: High**

4. **Write getting-started guide**
   - Installation & prerequisites
   - 5-minute quickstart
   - Your first stack (complete tutorial)
   - Next steps guide

5. **Create foundational concept guides**
   - App and Stacks explained
   - Resources and constructs
   - Synthesis process
   - Deployment workflow

### Phase 3: Comprehensive Guides (Weeks 3-4)

**Priority: Medium**

6. **Write end-to-end tutorials**
   - Web app with database
   - Multi-region setup
   - CI/CD integration
   - Government cloud deployment

7. **Write workflow guides**
   - Adding resources (migrate from root)
   - Testing infrastructure
   - Organizing projects
   - Managing secrets
   - Multi-environment deployments

8. **Enhance validation documentation**
   - Consolidate validation docs
   - Add troubleshooting scenarios
   - Custom validator guide

### Phase 4: Reference Documentation (Weeks 5-6)

**Priority: Medium**

9. **Create detailed CLI reference**
   - Individual page per command
   - All flags and options
   - Complete examples
   - Common use cases

10. **Generate API documentation**
    - Document all @atakora/lib exports
    - Document @atakora/cdk namespaces (after migration)
    - Class reference with examples
    - Method signatures with TypeScript types

11. **Enhance existing reference docs**
    - Expand manifest schema docs
    - Enhance error code reference with solutions
    - Document naming conventions with examples
    - Create ARM template output reference

### Phase 5: Architecture & Contributing (Week 7)

**Priority: Low**

12. **Consolidate architecture documentation**
    - Create architecture overview
    - Organize ADRs with index
    - Create ADR template
    - Move design docs to architecture section

13. **Write contribution guides**
    - Development setup
    - Testing guide
    - PR process
    - Release process

14. **Create troubleshooting section**
    - Common issues & solutions
    - Debugging synthesis
    - Deployment failures
    - CI/CD problems

### Phase 6: Examples & Polish (Week 8)

**Priority: Low**

15. **Create example projects**
    - Simple web app
    - Multi-region application
    - Government cloud setup
    - README for each with explanation

16. **Add visual polish**
    - Create architecture diagrams (Mermaid or SVG)
    - Add consistent formatting
    - Create glossary
    - Build comprehensive index

17. **Final review & quality check**
    - Verify all links work
    - Check code examples compile
    - Ensure consistent formatting
    - Spell check and grammar review

---

## Success Metrics

Documentation will be considered world-class when:

1. **Discoverability**: New users find what they need in <2 minutes
2. **Completeness**: <5% "Coming soon" placeholders
3. **Navigation**: Every page has breadcrumbs + next/previous links
4. **Code Quality**: 100% of code examples are tested and working
5. **Visual Appeal**: Consistent formatting, diagrams, callouts throughout
6. **Searchability**: Glossary + index cover all major concepts
7. **Up-to-date**: Version indicators show when features were added/deprecated

---

## References for Ella

### Documentation to Study

1. **AWS CDK**: https://docs.aws.amazon.com/cdk/v2/guide/home.html
   - Study: Progressive learning path, API organization

2. **Stripe API**: https://docs.stripe.com/
   - Study: Visual design, interactive examples, search

3. **React (react.dev)**: https://react.dev/
   - Study: Tutorial-first approach, breadcrumbs, deep dives

4. **Kubernetes**: https://kubernetes.io/docs/
   - Study: Concepts vs Tasks vs Tutorials separation

5. **Terraform**: https://developer.hashicorp.com/terraform/docs
   - Study: Provider organization, CLI reference

### Documentation Tools

- **Mermaid**: For flowcharts and diagrams (https://mermaid.js.org/)
- **Markdown**: GitHub-flavored markdown
- **Prettier**: For consistent formatting
- **Vale**: For style checking (optional)

### Writing Style Guide

- Use active voice ("Create a stack" not "A stack is created")
- Be concise and direct
- Include real-world examples
- Explain the "why" not just the "how"
- Use consistent terminology (check glossary)
- Add code comments to explain concepts
- Link to related documentation
