# Package Dependency Rules

**Version**: 1.0
**Date**: 2025-11-24
**Status**: ENFORCED

## Quick Reference

| Package | Can Import From | Cannot Import From | Purpose |
|---------|-----------------|-------------------|---------|
| @atakora/lib | *(none)* | cdk, component, cli | Base layer: types, schemas, synthesis infrastructure |
| @atakora/cdk | lib | component, cli | Construct layer: L1/L2 Azure resources |
| @atakora/component | lib, cdk | cli | Application layer: backend framework, schema DSL |
| @atakora/cli | lib, cdk, component | *(none)* | CLI layer: commands, deployment tools |

## Visual Dependency Flow

```
Dependency Flow (Bottom-Up, Unidirectional)

┌────────────────────────────────────────────────┐
│                 @atakora/cli                   │  CLI Layer
│  - Commands, deployment, scaffolding           │  (can import: lib, cdk, component)
└────────────────────────────────────────────────┘
                      ↑
                      │ imports from
                      │
┌────────────────────────────────────────────────┐
│              @atakora/component                │  Application Layer
│  - Backend framework, schema DSL               │  (can import: lib, cdk)
│  - defineBackend, defineSchema, defineAuth     │
│  - Backend synthesis implementation            │
└────────────────────────────────────────────────┘
                      ↑
                      │ imports from
                      │
┌────────────────────────────────────────────────┐
│                @atakora/cdk                    │  Construct Layer
│  - L1/L2 Azure resource constructs             │  (can import: lib)
│  - VirtualNetwork, StorageAccount, etc.        │
│  - Resource-specific abstractions              │
└────────────────────────────────────────────────┘
                      ↑
                      │ imports from
                      │
┌────────────────────────────────────────────────┐
│                @atakora/lib                    │  Base Layer
│  - Core types and interfaces                   │  (can import: NOTHING)
│  - ARM template types and synthesis infra      │
│  - Naming conventions, validation              │
│  - Schema types (not DSL implementations)      │
└────────────────────────────────────────────────┘
```

## Detailed Rules

### @atakora/lib (Base Layer)

**Role**: Foundation for all other packages

**MUST**:
- Provide core types and interfaces
- Define ARM template structure
- Provide synthesis infrastructure (types, validators, writers)
- Define naming conventions
- Remain dependency-free (no @atakora imports)

**MUST NOT**:
- Import from any other @atakora package
- Contain application-specific logic
- Know about backend framework semantics
- Depend on Azure SDK packages (except for types)

**Examples**:
```typescript
// ✓ GOOD - Pure types
export interface ArmTemplate {
  $schema: string;
  contentVersion: string;
  resources: ArmResource[];
}

// ✓ GOOD - Infrastructure interface
export interface SynthesisAdapter<TInput, TOutput> {
  synthesize(input: TInput, options?: SynthesisOptions): Promise<TOutput>;
}

// ✗ BAD - Imports from component
import { BackendSynthesizer } from '@atakora/component/synthesis';

// ✗ BAD - Application-specific logic
export class BackendAdapter {
  // This should be in component package!
}
```

---

### @atakora/cdk (Construct Layer)

**Role**: Azure resource abstractions

**MUST**:
- Import from @atakora/lib for core types
- Provide L1 (low-level) and L2 (high-level) constructs
- Map to Azure resource types (Microsoft.*)
- Use lib's naming conventions

**MUST NOT**:
- Import from component or cli packages
- Contain backend framework logic
- Define schema DSL implementations

**Examples**:
```typescript
// ✓ GOOD - Imports from lib
import { Resource, ArmResourceProps } from '@atakora/lib';

// ✓ GOOD - Azure resource construct
export class VirtualNetwork extends Resource {
  constructor(scope: Construct, id: string, props: VirtualNetworkProps) {
    // Implementation
  }
}

// ✗ BAD - Imports from component
import { defineBackend } from '@atakora/component';

// ✗ BAD - Knows about backend semantics
export class BackendInfrastructure extends Resource {
  // This should be in component package!
}
```

---

### @atakora/component (Application Layer)

**Role**: High-level backend framework

**MUST**:
- Import from @atakora/lib for core types
- Import from @atakora/cdk for resource constructs
- Provide schema DSL (defineSchema, a, c, e, f)
- Provide backend assembly (defineBackend)
- Implement backend synthesis (BackendAdapter, BackendSynthesizer)

**MUST NOT**:
- Import from cli package
- Duplicate types from lib (import them instead)

**Examples**:
```typescript
// ✓ GOOD - Imports from lib
import { SynthesisAdapter, CloudAssemblyV2 } from '@atakora/lib/synthesis';

// ✓ GOOD - Imports from cdk
import { DocumentDBAccount } from '@atakora/cdk/documentdb';

// ✓ GOOD - Backend synthesis implementation
export class BackendAdapter implements SynthesisAdapter<BackendObject, CloudAssemblyV2> {
  async synthesize(backend: BackendObject, options?: SynthesisOptions) {
    // Uses component's BackendSynthesizer
  }
}

// ✗ BAD - Imports from cli
import { DeployCommand } from '@atakora/cli/commands';
```

---

### @atakora/cli (CLI Layer)

**Role**: User-facing commands and deployment

**MUST**:
- Import from lib, cdk, and component as needed
- Provide CLI commands (deploy, init, synth, etc.)
- Orchestrate deployment workflows

**MUST NOT**:
- Export core types (import from lib instead)
- Implement resource constructs (use cdk instead)
- Implement backend logic (use component instead)

**Examples**:
```typescript
// ✓ GOOD - Imports from all packages
import { Synthesizer } from '@atakora/lib/synthesis';
import { VirtualNetwork } from '@atakora/cdk/network';
import { defineBackend } from '@atakora/component';

// ✓ GOOD - CLI command
export class DeployCommand {
  async execute() {
    const backend = defineBackend({ /* ... */ });
    const synthesizer = new Synthesizer();
    // Orchestrate deployment
  }
}

// ✗ BAD - Defines types that should be in lib
export interface ArmTemplate {
  // Should import from @atakora/lib!
}
```

## Decision Tree: "Where Should This Code Live?"

```
START: I have code to write...

1. Does it define core types/interfaces used by multiple packages?
   YES → Put it in @atakora/lib
   NO  → Go to 2

2. Does it map to an Azure resource type (Microsoft.*)?
   YES → Put it in @atakora/cdk
   NO  → Go to 3

3. Does it understand backend/schema semantics?
   YES → Put it in @atakora/component
   NO  → Go to 4

4. Is it a CLI command or deployment workflow?
   YES → Put it in @atakora/cli
   NO  → ESCALATE: Unclear package ownership

5. Final check: Does it import from a "higher" package?
   YES → WRONG PACKAGE! Move to higher layer
   NO  → Correct placement
```

## Examples by Category

### Core Types → @atakora/lib

```typescript
// Synthesis types
export interface SynthesisOptions { /* ... */ }
export interface CloudAssemblyV2 { /* ... */ }

// ARM template types
export interface ArmTemplate { /* ... */ }
export interface ArmResource { /* ... */ }

// Naming types
export interface NamingContext { /* ... */ }
```

### Azure Resources → @atakora/cdk

```typescript
// L1 constructs (direct ARM mapping)
export class ArmVirtualNetwork extends Resource { /* ... */ }

// L2 constructs (convenience wrappers)
export class VirtualNetwork extends ArmVirtualNetwork { /* ... */ }

// Resource-specific types
export interface VirtualNetworkProps { /* ... */ }
```

### Backend Framework → @atakora/component

```typescript
// Schema DSL
export function defineSchema(config: SchemaConfig) { /* ... */ }
export const a = { string: () => /* ... */, number: () => /* ... */ };
export const c = { model: () => /* ... */ };

// Backend assembly
export function defineBackend(config: BackendConfig) { /* ... */ }

// Backend synthesis
export class BackendAdapter implements SynthesisAdapter { /* ... */ }
```

### CLI Commands → @atakora/cli

```typescript
// Commands
export class DeployCommand { /* ... */ }
export class InitCommand { /* ... */ }

// Deployment orchestration
export class DeploymentOrchestrator { /* ... */ }
```

## Enforcement

### Automated Checks (CI/CD)

```yaml
# .github/workflows/ci.yml
- name: Check circular dependencies
  run: |
    npx madge --circular packages/lib/src
    npx madge --circular packages/cdk/src
    npx madge --circular packages/component/src
    npx madge --circular packages/cli/src
```

### Lint Rules

```javascript
// packages/lib/.eslintrc.js
module.exports = {
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        '@atakora/cdk*',
        '@atakora/component*',
        '@atakora/cli*'
      ]
    }]
  }
};

// packages/cdk/.eslintrc.js
module.exports = {
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        '@atakora/component*',
        '@atakora/cli*'
      ]
    }]
  }
};

// packages/component/.eslintrc.js
module.exports = {
  rules: {
    'no-restricted-imports': ['error', {
      patterns: ['@atakora/cli*']
    }]
  }
};
```

### Pre-commit Hooks

```bash
# .husky/pre-commit
#!/bin/sh

# Check lib package boundaries
if git diff --cached --name-only | grep "packages/lib/src"; then
  if grep -r "@atakora/\(cdk\|component\|cli\)" packages/lib/src/; then
    echo "ERROR: lib package cannot import from cdk, component, or cli"
    exit 1
  fi
fi

# Check cdk package boundaries
if git diff --cached --name-only | grep "packages/cdk/src"; then
  if grep -r "@atakora/\(component\|cli\)" packages/cdk/src/; then
    echo "ERROR: cdk package cannot import from component or cli"
    exit 1
  fi
fi

# Check component package boundaries
if git diff --cached --name-only | grep "packages/component/src"; then
  if grep -r "@atakora/cli" packages/component/src/; then
    echo "ERROR: component package cannot import from cli"
    exit 1
  fi
fi
```

## Common Mistakes

### Mistake 1: Putting synthesis implementation in lib

```typescript
// ✗ BAD - In @atakora/lib
import { BackendSynthesizer } from '@atakora/component/synthesis';

export class BackendAdapter {
  private synthesizer = new BackendSynthesizer(); // CIRCULAR DEPENDENCY!
}

// ✓ GOOD - In @atakora/component
import { SynthesisAdapter } from '@atakora/lib/synthesis';

export class BackendAdapter implements SynthesisAdapter {
  // Implementation uses component-level code
}
```

### Mistake 2: Duplicating types instead of importing

```typescript
// ✗ BAD - In @atakora/component
export interface CloudAssemblyV2 {
  // Duplicated from lib!
}

// ✓ GOOD - In @atakora/component
import { CloudAssemblyV2 } from '@atakora/lib/synthesis';
```

### Mistake 3: Convenience imports that create dependencies

```typescript
// ✗ BAD - In @atakora/lib
export { defineBackend } from '@atakora/component'; // Re-export creates dependency!

// ✓ GOOD - Users import directly from component
import { defineBackend } from '@atakora/component';
```

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-24 | Initial version based on ADR-021 audit findings |

## Related Documentation

- [ADR-021: Circular Dependency Audit](./adr-021-circular-dependency-audit.md)
- [Circular Dependency Audit Summary](./circular-dependency-audit-summary.md)
- [ADR-020: Component Auth System](./adr-020-component-auth-system.md)
