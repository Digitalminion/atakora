# ADR-002: Manifest Schema & Multi-Package Architecture

**Status**: Accepted
**Date**: 2025-10-08
**Author**: Becky (Staff Architect)
**Deciders**: Architecture Team
**Context**: Atakora init system requirements for multi-package projects

---

## Context

The Atakora CLI needs a robust manifest system to support multi-package Azure infrastructure projects. This manifest will serve as the single source of truth for project structure, package configuration, and synthesis behavior. The manifest must support:

1. **Multi-package workspaces** - Modern infrastructure projects often separate backend, frontend, shared libraries, and infrastructure code into distinct packages
2. **Progressive enhancement** - Simple projects should start simple, but can grow to complex multi-package setups
3. **npm workspace compatibility** - Leverage existing npm workspace patterns and tooling
4. **Clear ARM output organization** - Generated ARM templates must be organized and discoverable
5. **Package-specific synthesis** - Each package may have different entry points and output requirements
6. **Government and Commercial cloud support** - The manifest should track deployment targets

### Current Situation

The existing implementation in `packages/cli/src/manifest/types.ts` provides a solid foundation with:

- Basic manifest structure with version, organization, project fields
- Package configuration array with name, path, and entryPoint
- Timestamp tracking for creation and updates
- Custom metadata support

However, it needs refinement to better support the multi-package architecture and provide clearer conventions.

---

## Decision

We will enhance the manifest schema to use a **package map structure** instead of an array, making package references more direct and enabling better TypeScript type safety. The manifest will live at `.atakora/manifest.json` and serve as the authoritative source for project configuration.

### Manifest Schema Structure

```typescript
/**
 * Atakora Project Manifest Schema v1.0.0
 *
 * The manifest defines the project structure and configuration for
 * multi-package Azure infrastructure projects.
 */
export interface AtokoraManifest {
  /**
   * Schema version for forward compatibility
   * @pattern "^\d+\.\d+\.\d+$"
   */
  readonly version: '1.0.0';

  /**
   * Organization name (used in resource naming)
   * @minLength 1
   * @maxLength 64
   */
  readonly organization: string;

  /**
   * Project name (used in resource naming)
   * @minLength 1
   * @maxLength 64
   */
  readonly project: string;

  /**
   * Default package for synthesis when --package flag not provided
   * Must be a key in the packages map
   */
  readonly defaultPackage: string;

  /**
   * Package configurations mapped by package name
   * At least one package is required
   */
  readonly packages: Record<string, PackageConfiguration>;

  /**
   * Global output directory for ARM templates
   * @default ".atakora/arm.out"
   */
  readonly outputDirectory?: string;

  /**
   * Target cloud environment
   * @default "AzureCloud"
   */
  readonly cloudEnvironment?: CloudEnvironment;

  /**
   * Creation metadata
   */
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly createdBy?: string; // CLI version that created this
}

export interface PackageConfiguration {
  /**
   * Package directory path relative to workspace root
   * @pattern "^packages/[a-z0-9-]+$"
   */
  readonly path: string;

  /**
   * Entry point file relative to package directory
   * @default "src/main.ts"
   */
  readonly entry?: string;

  /**
   * Output directory relative to global outputDirectory
   * Defaults to package name
   */
  readonly outDir?: string;

  /**
   * Whether this package is enabled for synthesis
   * @default true
   */
  readonly enabled?: boolean;

  /**
   * Package type hint for specialized handling
   */
  readonly type?: PackageType;

  /**
   * Package-specific deployment configuration
   */
  readonly deployment?: {
    readonly resourceGroupName?: string;
    readonly location?: string;
    readonly tags?: Record<string, string>;
  };
}

export type CloudEnvironment =
  | 'AzureCloud' // Commercial
  | 'AzureUSGovernment' // Government
  | 'AzureChinaCloud' // China
  | 'AzureGermanCloud'; // Germany (deprecated but supported)

export type PackageType =
  | 'infrastructure' // Core infrastructure resources
  | 'backend' // Backend application resources
  | 'frontend' // Frontend/static site resources
  | 'shared' // Shared libraries or utilities
  | 'custom'; // Custom package type
```

### Key Design Decisions

1. **Map over Array for Packages**: Using `Record<string, PackageConfiguration>` instead of `PackageConfig[]` provides:
   - Direct package lookups without array searching
   - Better TypeScript type inference when referencing packages
   - Natural uniqueness constraint on package names
   - Clearer intent in configuration files

2. **Explicit Default Package**: Rather than using the first package or implicit selection, we require explicit designation of the default package for synthesis operations.

3. **Cloud Environment at Project Level**: Cloud targeting is a project-wide concern, not per-package, ensuring consistency across all synthesized templates.

4. **Package Type Hints**: Optional type field enables future specialized handling for different package types without breaking changes.

5. **Flexible Output Organization**: While defaulting to `.atakora/arm.out/{packageName}/`, the schema allows customization for special cases.

---

## Alternatives Considered

### Alternative 1: Array-Based Package List (Current Implementation)

```typescript
{
  packages: [
    { name: "backend", path: "packages/backend", ... },
    { name: "frontend", path: "packages/frontend", ... }
  ]
}
```

**Pros**:

- Order preservation for potential prioritization
- Familiar array iteration patterns
- Simpler JSON structure

**Cons**:

- Requires array search for package lookups
- No natural uniqueness enforcement
- Less intuitive for package references
- Harder to validate defaultPackage references

### Alternative 2: Nested Package Hierarchy

```typescript
{
  packages: {
    infrastructure: {
      network: { ... },
      storage: { ... }
    },
    applications: {
      backend: { ... },
      frontend: { ... }
    }
  }
}
```

**Pros**:

- Supports logical grouping of related packages
- Natural hierarchy for large projects

**Cons**:

- Over-engineered for most use cases
- Complicates package references (dotted paths)
- Harder to implement and validate
- npm workspaces don't support nested structures well

### Alternative 3: Separate Manifest Files per Package

Each package would have its own `.atakora/package.json`:

```typescript
// packages/backend/.atakora/package.json
{
  entry: "src/main.ts",
  outDir: "../../.atakora/arm.out/backend"
}
```

**Pros**:

- Fully decentralized configuration
- Package-level isolation

**Cons**:

- No single source of truth
- Harder to discover all packages
- Complicates cross-package operations
- More files to maintain

---

## Consequences

### Positive

- **Type Safety**: The map structure with string literal keys enables better TypeScript inference and compile-time validation
- **Clear Conventions**: Explicit package paths (`packages/{name}`) and output organization make project structure predictable
- **Extensibility**: Schema versioning and optional fields allow future enhancements without breaking changes
- **npm Workspace Alignment**: Structure mirrors npm workspace patterns, reducing cognitive overhead
- **Cloud Environment Support**: Built-in support for Government and Commercial clouds from day one
- **Single Source of Truth**: One manifest file defines the entire project structure

### Negative

- **Migration Complexity**: Moving from array to map structure requires migration logic for existing projects
- **Package Name Constraints**: Package names become keys, requiring valid JavaScript object key constraints
- **No Package Ordering**: Map structure doesn't preserve insertion order reliably (though practically this isn't needed)

### Neutral

- Requires manifest validation on every CLI operation to ensure consistency
- Package generators must update the manifest when adding new packages
- Synthesis pipeline must respect the manifest's package configurations
- All team members must understand the manifest structure for effective collaboration

---

## Success Criteria

The manifest schema design will be considered successful when:

1. **Developer Experience**:
   - `atakora init` creates a valid manifest in under 30 seconds
   - Adding packages with `atakora add` updates the manifest correctly
   - Synthesis correctly uses defaultPackage when no --package specified

2. **Type Safety**:
   - TypeScript compiler catches invalid package references
   - Manifest validation prevents invalid configurations before synthesis

3. **Multi-Package Support**:
   - Projects can have 10+ packages without performance degradation
   - Each package synthesizes to its own output directory
   - Cross-package dependencies are traceable

4. **Cloud Environment Support**:
   - Same manifest supports both Government and Commercial deployments
   - Cloud environment properly influences synthesis output

5. **Maintainability**:
   - New team members understand the manifest structure within 5 minutes
   - Schema changes can be made with backward compatibility
   - Validation errors provide actionable feedback

---

## Implementation Guidelines

### File Location and Naming

```
project-root/
├── .atakora/
│   ├── manifest.json       # Project manifest
│   └── arm.out/           # Synthesized output
│       ├── backend/       # Backend package output
│       └── frontend/      # Frontend package output
```

### Example Manifest

```json
{
  "version": "1.0.0",
  "organization": "Digital Minion",
  "project": "Atakora",
  "defaultPackage": "backend",
  "cloudEnvironment": "AzureCloud",
  "packages": {
    "backend": {
      "path": "packages/backend",
      "entry": "src/main.ts",
      "type": "backend",
      "deployment": {
        "resourceGroupName": "rg-atakora-backend",
        "location": "eastus2"
      }
    },
    "frontend": {
      "path": "packages/frontend",
      "entry": "src/main.ts",
      "type": "frontend",
      "deployment": {
        "resourceGroupName": "rg-atakora-frontend",
        "location": "eastus2"
      }
    },
    "shared": {
      "path": "packages/shared",
      "type": "shared",
      "enabled": false
    }
  },
  "createdAt": "2025-10-08T10:00:00Z",
  "updatedAt": "2025-10-08T10:00:00Z",
  "createdBy": "atakora@1.0.0"
}
```

### Validation Rules

1. **Schema Version**: Must be valid semver format
2. **Organization/Project**: 1-64 characters, alphanumeric with spaces and hyphens
3. **Default Package**: Must exist as key in packages map
4. **Package Names**: Valid npm package names (lowercase, alphanumeric, hyphens)
5. **Package Paths**: Must follow `packages/{name}` convention
6. **Cloud Environment**: Must be valid Azure environment
7. **At Least One Package**: Manifest must define at least one package

### Integration Points

1. **CLI Commands**:
   - `init`: Creates manifest with first package
   - `add`: Updates manifest with new package
   - `set-default`: Updates defaultPackage field
   - `synth`: Reads manifest to determine package configuration
   - `deploy`: Uses deployment configuration from manifest

2. **ManifestManager Class**:
   - Load, validate, and cache manifest
   - Update operations with automatic timestamp updates
   - Migration logic for schema version changes

3. **Synthesis Pipeline**:
   - Grace reads manifest to determine output directories
   - Package entry points resolved from manifest
   - Cloud environment influences template generation

---

## Related Decisions

- **ADR-001**: CLI Configuration & Authentication (manifest complements CLI config)
- **ADR-004**: Cross-Resource Reference Pattern (packages may reference resources across packages)
- **Future**: Package dependency management between packages
- **Future**: Manifest migration strategy for version updates

---

## References

- [npm Workspaces Documentation](https://docs.npmjs.com/cli/v8/using-npm/workspaces)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [Azure Resource Manager Overview](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/overview)
- [Azure Cloud Environments](https://learn.microsoft.com/en-us/azure/azure-government/compare-azure-government-global-azure)
