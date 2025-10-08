/**
 * Type definitions for Atakora project manifest
 *
 * The manifest defines project-level configuration including organization,
 * project metadata, and package management for multi-package workspaces.
 *
 * @see docs/design/architecture/adr-002-manifest-schema.md
 * @see docs/design/architecture/project-structure-spec.md
 */

/**
 * Target Azure cloud environment
 */
export type CloudEnvironment =
  | 'AzureCloud' // Commercial
  | 'AzureUSGovernment' // Government
  | 'AzureChinaCloud' // China
  | 'AzureGermanCloud'; // Germany (deprecated but supported)

/**
 * Package type hint for specialized handling
 */
export type PackageType =
  | 'infrastructure' // Core infrastructure resources
  | 'backend' // Backend application resources
  | 'frontend' // Frontend/static site resources
  | 'shared' // Shared libraries or utilities
  | 'data' // Data layer resources
  | 'integration' // External service integrations
  | 'monitoring' // Observability resources
  | 'custom'; // Custom package type

/**
 * Package-specific deployment configuration
 */
export interface PackageDeploymentConfig {
  /**
   * Target resource group name
   */
  readonly resourceGroupName?: string;

  /**
   * Azure location for resources
   */
  readonly location?: string;

  /**
   * Resource tags to apply
   */
  readonly tags?: Record<string, string>;

  /**
   * Deployment parameters
   */
  readonly parameters?: Record<string, unknown>;
}

/**
 * Configuration for a single package in the workspace
 */
export interface PackageConfiguration {
  /**
   * Package directory path relative to workspace root
   * @pattern ^packages/[a-z0-9-]+$
   * @example "packages/backend"
   */
  readonly path: string;

  /**
   * Entry point file relative to package directory
   * @default "src/main.ts"
   * @example "src/main.ts" | "bin/app.ts"
   */
  readonly entry?: string;

  /**
   * Output directory relative to global outputDirectory
   * Defaults to package name
   * @example "backend" | "infrastructure/network"
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
  readonly deployment?: PackageDeploymentConfig;

  /**
   * Custom metadata for the package
   */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Atakora Project Manifest
 *
 * The manifest is the single source of truth for project structure
 * and configuration. It defines packages, their relationships, and
 * synthesis/deployment settings.
 *
 * Stored in `.atakora/manifest.json` at workspace root
 */
export interface AtokoraManifest {
  /**
   * Manifest schema version for forward compatibility
   * @pattern ^\d+\.\d+\.\d+$
   * @example "1.0.0"
   */
  readonly version: string;

  /**
   * Organization name (used in resource naming)
   * @minLength 1
   * @maxLength 64
   * @example "Digital Minion"
   */
  readonly organization: string;

  /**
   * Project name (used in resource naming)
   * @minLength 1
   * @maxLength 64
   * @example "Atakora"
   */
  readonly project: string;

  /**
   * Default package for synthesis when --package flag not provided
   * Must be a key in the packages map
   * @example "backend"
   */
  readonly defaultPackage: string;

  /**
   * Package configurations mapped by package name
   * At least one package is required
   *
   * Using a map structure provides:
   * - Direct package lookups
   * - Natural uniqueness constraint
   * - Better TypeScript inference
   *
   * @example
   * {
   *   "backend": { "path": "packages/backend", "entry": "src/main.ts" },
   *   "frontend": { "path": "packages/frontend", "entry": "src/main.ts" }
   * }
   */
  readonly packages: Record<string, PackageConfiguration>;

  /**
   * Global output directory for ARM templates
   * @default ".atakora/arm.out"
   * @example ".atakora/arm.out" | "dist/arm"
   */
  readonly outputDirectory?: string;

  /**
   * Target cloud environment
   * @default "AzureCloud"
   */
  readonly cloudEnvironment?: CloudEnvironment;

  /**
   * Creation timestamp in ISO 8601 format
   * @example "2025-10-08T10:00:00Z"
   */
  readonly createdAt: string;

  /**
   * Last updated timestamp in ISO 8601 format
   * @example "2025-10-08T10:00:00Z"
   */
  readonly updatedAt: string;

  /**
   * CLI version that created this manifest
   * @example "atakora@1.0.0"
   */
  readonly createdBy?: string;

  /**
   * Custom project-level metadata
   */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Legacy manifest format for backward compatibility
 * @deprecated Use AtokoraManifest instead
 */
export interface LegacyManifest {
  readonly version: string;
  readonly organization: string;
  readonly project: string;
  readonly defaultPackage?: string;
  readonly packages: ReadonlyArray<{
    readonly name: string;
    readonly path: string;
    readonly entryPoint?: string;
    readonly enabled?: boolean;
    readonly metadata?: Record<string, unknown>;
  }>;
  readonly outputDirectory?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Options for creating a new manifest
 */
export interface CreateManifestOptions {
  /**
   * Organization name
   */
  readonly organization: string;

  /**
   * Project name
   */
  readonly project: string;

  /**
   * Name of the first package to create
   */
  readonly firstPackageName: string;

  /**
   * Global output directory
   * @default ".atakora/arm.out"
   */
  readonly outputDirectory?: string;

  /**
   * Target cloud environment
   * @default "AzureCloud"
   */
  readonly cloudEnvironment?: CloudEnvironment;

  /**
   * Type of the first package
   * @default "backend"
   */
  readonly firstPackageType?: PackageType;
}

/**
 * Options for adding a package to manifest
 */
export interface AddPackageOptions {
  /**
   * Package name (must be valid npm package name)
   */
  readonly name: string;

  /**
   * Entry point file relative to package directory
   * @default "src/main.ts"
   */
  readonly entry?: string;

  /**
   * Package type hint
   */
  readonly type?: PackageType;

  /**
   * Whether this package is enabled for synthesis
   * @default true
   */
  readonly enabled?: boolean;

  /**
   * Set this package as the default
   * @default false
   */
  readonly setAsDefault?: boolean;

  /**
   * Deployment configuration
   */
  readonly deployment?: PackageDeploymentConfig;
}

/**
 * Options for updating package configuration
 */
export interface UpdatePackageOptions {
  /**
   * New entry point
   */
  readonly entry?: string;

  /**
   * New enabled state
   */
  readonly enabled?: boolean;

  /**
   * New package type
   */
  readonly type?: PackageType;

  /**
   * New deployment configuration
   */
  readonly deployment?: PackageDeploymentConfig;

  /**
   * Additional metadata to merge
   */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Validation result for manifest operations
 */
export interface ValidationResult {
  /**
   * Whether the validation passed
   */
  readonly valid: boolean;

  /**
   * Error message if validation failed
   */
  readonly error?: string;

  /**
   * Validation warnings (non-fatal)
   */
  readonly warnings?: string[];
}

/**
 * Manifest migration result
 */
export interface MigrationResult {
  /**
   * Whether migration was needed
   */
  readonly migrated: boolean;

  /**
   * Previous version before migration
   */
  readonly fromVersion?: string;

  /**
   * New version after migration
   */
  readonly toVersion?: string;

  /**
   * Changes made during migration
   */
  readonly changes?: string[];
}

// Type guards

/**
 * Check if a manifest uses the modern format
 */
export function isModernManifest(manifest: unknown): manifest is AtokoraManifest {
  const m = manifest as any;
  return (
    m &&
    typeof m === 'object' &&
    typeof m.version === 'string' &&
    typeof m.packages === 'object' &&
    !Array.isArray(m.packages)
  );
}

/**
 * Check if a manifest uses the legacy format
 */
export function isLegacyManifest(manifest: unknown): manifest is LegacyManifest {
  const m = manifest as any;
  return m && typeof m === 'object' && typeof m.version === 'string' && Array.isArray(m.packages);
}

// Export legacy types for backward compatibility
export type Manifest = AtokoraManifest | LegacyManifest;
export type PackageConfig = PackageConfiguration;
