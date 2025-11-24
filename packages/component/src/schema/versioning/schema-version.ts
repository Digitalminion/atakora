/**
 * Schema Version Management
 *
 * Implements version tracking, comparison, and validation for schemas.
 * Provides utilities for semantic versioning and schema snapshots.
 */

import type { SemanticVersion, SchemaVersion, VersionRange, VersionedSchema } from './types';

// ============================================================================
// Version Parsing and Validation
// ============================================================================

/**
 * Parse a semantic version string into components
 */
export function parseVersion(version: string): {
  major: number;
  minor: number;
  patch: number;
} | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    return null;
  }

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

/**
 * Validate a semantic version string
 */
export function isValidVersion(version: string): version is SemanticVersion {
  return parseVersion(version) !== null;
}

/**
 * Format version components into a semantic version string
 */
export function formatVersion(major: number, minor: number, patch: number): SemanticVersion {
  return `${major}.${minor}.${patch}`;
}

// ============================================================================
// Version Comparison
// ============================================================================

/**
 * Version comparison result enum
 */
export enum VersionComparison {
  /** Versions are equal */
  EQUAL = 0,
  /** First version is greater */
  GREATER = 1,
  /** First version is less */
  LESS = -1,
}

/**
 * Compare two semantic versions
 */
export function compareVersions(v1: SemanticVersion, v2: SemanticVersion): VersionComparison {
  const p1 = parseVersion(v1);
  const p2 = parseVersion(v2);

  if (!p1 || !p2) {
    throw new Error(`Invalid version format: ${!p1 ? v1 : v2}`);
  }

  // Compare major
  if (p1.major > p2.major) return VersionComparison.GREATER;
  if (p1.major < p2.major) return VersionComparison.LESS;

  // Compare minor
  if (p1.minor > p2.minor) return VersionComparison.GREATER;
  if (p1.minor < p2.minor) return VersionComparison.LESS;

  // Compare patch
  if (p1.patch > p2.patch) return VersionComparison.GREATER;
  if (p1.patch < p2.patch) return VersionComparison.LESS;

  return VersionComparison.EQUAL;
}

/**
 * Check if version is greater than another
 */
export function isVersionGreater(v1: SemanticVersion, v2: SemanticVersion): boolean {
  return compareVersions(v1, v2) === VersionComparison.GREATER;
}

/**
 * Check if version is less than another
 */
export function isVersionLess(v1: SemanticVersion, v2: SemanticVersion): boolean {
  return compareVersions(v1, v2) === VersionComparison.LESS;
}

/**
 * Check if versions are equal
 */
export function isVersionEqual(v1: SemanticVersion, v2: SemanticVersion): boolean {
  return compareVersions(v1, v2) === VersionComparison.EQUAL;
}

/**
 * Check if version is within a range
 */
export function isVersionInRange(version: SemanticVersion, range: VersionRange): boolean {
  if (range.exact) {
    return isVersionEqual(version, range.exact);
  }

  if (range.min && isVersionLess(version, range.min)) {
    return false;
  }

  if (range.max && isVersionGreater(version, range.max)) {
    return false;
  }

  if (range.pattern) {
    const patternRegex = range.pattern.replace(/\./g, '\\.').replace(/x/gi, '\\d+');
    return new RegExp(`^${patternRegex}$`).test(version);
  }

  return true;
}

// ============================================================================
// Version Bumping
// ============================================================================

/**
 * Bump version based on change type
 */
export function bumpVersion(
  version: SemanticVersion,
  type: 'major' | 'minor' | 'patch'
): SemanticVersion {
  const parsed = parseVersion(version);
  if (!parsed) {
    throw new Error(`Invalid version format: ${version}`);
  }

  switch (type) {
    case 'major':
      return formatVersion(parsed.major + 1, 0, 0);
    case 'minor':
      return formatVersion(parsed.major, parsed.minor + 1, 0);
    case 'patch':
      return formatVersion(parsed.major, parsed.minor, parsed.patch + 1);
    default:
      throw new Error(`Invalid bump type: ${type}`);
  }
}

/**
 * Get next major version
 */
export function nextMajorVersion(version: SemanticVersion): SemanticVersion {
  return bumpVersion(version, 'major');
}

/**
 * Get next minor version
 */
export function nextMinorVersion(version: SemanticVersion): SemanticVersion {
  return bumpVersion(version, 'minor');
}

/**
 * Get next patch version
 */
export function nextPatchVersion(version: SemanticVersion): SemanticVersion {
  return bumpVersion(version, 'patch');
}

// ============================================================================
// Schema Snapshot
// ============================================================================

/**
 * Create a snapshot of the current schema
 */
export function createSchemaSnapshot(
  schema: any,
  version: SemanticVersion,
  description?: string
): SchemaVersion {
  return {
    version,
    createdAt: new Date().toISOString(),
    description,
    breaking: false, // Will be determined by change analysis
  };
}

/**
 * Deep clone a schema for versioning
 */
export function cloneSchema(schema: any): any {
  return JSON.parse(JSON.stringify(schema));
}

// ============================================================================
// Version History Management
// ============================================================================

/**
 * Schema version history manager
 */
export class VersionHistory {
  private versions: SchemaVersion[] = [];

  /**
   * Add a new version to history
   */
  addVersion(version: SchemaVersion): void {
    // Check if version already exists
    if (this.hasVersion(version.version)) {
      throw new Error(`Version ${version.version} already exists in history`);
    }

    // Validate version is greater than latest
    const latest = this.getLatest();
    if (latest && !isVersionGreater(version.version, latest.version)) {
      throw new Error(
        `New version ${version.version} must be greater than latest ${latest.version}`
      );
    }

    this.versions.push(version);
    this.versions.sort((a, b) => compareVersions(a.version, b.version));
  }

  /**
   * Get version by version number
   */
  getVersion(version: SemanticVersion): SchemaVersion | undefined {
    return this.versions.find((v) => v.version === version);
  }

  /**
   * Check if version exists
   */
  hasVersion(version: SemanticVersion): boolean {
    return this.versions.some((v) => v.version === version);
  }

  /**
   * Get latest version
   */
  getLatest(): SchemaVersion | undefined {
    return this.versions[this.versions.length - 1];
  }

  /**
   * Get all versions
   */
  getAllVersions(): SchemaVersion[] {
    return [...this.versions];
  }

  /**
   * Get versions in range
   */
  getVersionsInRange(range: VersionRange): SchemaVersion[] {
    return this.versions.filter((v) => isVersionInRange(v.version, range));
  }

  /**
   * Get version path between two versions
   */
  getVersionPath(from: SemanticVersion, to: SemanticVersion): SchemaVersion[] {
    const fromIndex = this.versions.findIndex((v) => v.version === from);
    const toIndex = this.versions.findIndex((v) => v.version === to);

    if (fromIndex === -1 || toIndex === -1) {
      throw new Error('Version not found in history');
    }

    if (fromIndex > toIndex) {
      throw new Error('Cannot get path from newer to older version');
    }

    return this.versions.slice(fromIndex, toIndex + 1);
  }

  /**
   * Clear version history
   */
  clear(): void {
    this.versions = [];
  }

  /**
   * Export history as JSON
   */
  toJSON(): SchemaVersion[] {
    return this.getAllVersions();
  }

  /**
   * Import history from JSON
   */
  static fromJSON(data: SchemaVersion[]): VersionHistory {
    const history = new VersionHistory();
    for (const version of data) {
      history.addVersion(version);
    }
    return history;
  }
}

// ============================================================================
// Versioned Schema Manager
// ============================================================================

/**
 * Manage versioned schemas
 */
export class VersionedSchemaManager {
  private currentVersion: SemanticVersion;
  private schema: any;
  private history: VersionHistory;
  private migrations: Map<string, any>;

  constructor(initialVersion: SemanticVersion = '1.0.0') {
    this.currentVersion = initialVersion;
    this.schema = null;
    this.history = new VersionHistory();
    this.migrations = new Map();
  }

  /**
   * Set the current schema
   */
  setSchema(schema: any, version?: SemanticVersion, description?: string): void {
    const targetVersion = version || this.currentVersion;

    // Create snapshot
    const snapshot = createSchemaSnapshot(schema, targetVersion, description);
    this.history.addVersion(snapshot);

    // Update current state
    this.currentVersion = targetVersion;
    this.schema = cloneSchema(schema);
  }

  /**
   * Get current schema version
   */
  getCurrentVersion(): SemanticVersion {
    return this.currentVersion;
  }

  /**
   * Get current schema
   */
  getCurrentSchema(): any {
    return cloneSchema(this.schema);
  }

  /**
   * Get schema at specific version
   */
  getSchemaAtVersion(version: SemanticVersion): any | null {
    // This would require storing full schema snapshots
    // For now, return null if not current version
    if (version === this.currentVersion) {
      return this.getCurrentSchema();
    }
    return null;
  }

  /**
   * Register a migration
   */
  registerMigration(from: SemanticVersion, to: SemanticVersion, migration: any): void {
    const key = `${from}->${to}`;
    this.migrations.set(key, migration);
  }

  /**
   * Get migration between versions
   */
  getMigration(from: SemanticVersion, to: SemanticVersion): any | null {
    const key = `${from}->${to}`;
    return this.migrations.get(key) || null;
  }

  /**
   * Check if migration exists
   */
  hasMigration(from: SemanticVersion, to: SemanticVersion): boolean {
    const key = `${from}->${to}`;
    return this.migrations.has(key);
  }

  /**
   * Get version history
   */
  getHistory(): SchemaVersion[] {
    return this.history.getAllVersions();
  }

  /**
   * Create versioned schema object
   */
  toVersionedSchema(): VersionedSchema {
    return {
      version: this.currentVersion,
      schema: this.getCurrentSchema(),
      migrations: Array.from(this.migrations.values()),
      history: this.getHistory(),
    };
  }

  /**
   * Load from versioned schema
   */
  static fromVersionedSchema(versioned: VersionedSchema): VersionedSchemaManager {
    const manager = new VersionedSchemaManager(versioned.version);

    // Set schema
    manager.setSchema(versioned.schema, versioned.version);

    // Load history
    if (versioned.history) {
      manager.history = VersionHistory.fromJSON(versioned.history);
    }

    // Load migrations
    if (versioned.migrations) {
      for (const migration of versioned.migrations) {
        manager.registerMigration(migration.from, migration.to, migration);
      }
    }

    return manager;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Sort versions in ascending order
 */
export function sortVersions(versions: SemanticVersion[]): SemanticVersion[] {
  return [...versions].sort((a, b) => compareVersions(a, b));
}

/**
 * Get latest version from list
 */
export function getLatestVersion(versions: SemanticVersion[]): SemanticVersion | null {
  if (versions.length === 0) return null;
  const sorted = sortVersions(versions);
  return sorted[sorted.length - 1];
}

/**
 * Get earliest version from list
 */
export function getEarliestVersion(versions: SemanticVersion[]): SemanticVersion | null {
  if (versions.length === 0) return null;
  const sorted = sortVersions(versions);
  return sorted[0];
}
