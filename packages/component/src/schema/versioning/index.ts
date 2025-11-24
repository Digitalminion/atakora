/**
 * Schema Versioning and Migration System
 *
 * @packageDocumentation
 */

// Export all types
export * from './types';

// Export version management
export {
  // Version parsing and validation
  parseVersion,
  isValidVersion,
  formatVersion,

  // Version comparison
  compareVersions,
  isVersionGreater,
  isVersionLess,
  isVersionEqual,
  isVersionInRange,
  VersionComparison,

  // Version bumping
  bumpVersion,
  nextMajorVersion,
  nextMinorVersion,
  nextPatchVersion,

  // Schema snapshots
  createSchemaSnapshot,
  cloneSchema,

  // Version history
  VersionHistory,

  // Versioned schema management
  VersionedSchemaManager,

  // Utility functions
  sortVersions,
  getLatestVersion,
  getEarliestVersion,
} from './schema-version';

// Export migration system
export {
  // Migration builder
  MigrationBuilder,

  // Migration validation
  validateMigration,

  // Migration execution
  executeMigration,
  buildMigrationChain,
  executeMigrationChain,

  // Rollback
  createRollbackMigration,

  // Migration registry
  MigrationRegistry,
} from './migrations';

// Export migration generator
export {
  // Schema comparison
  compareSchemas,

  // Breaking change analysis
  analyzeBreakingChanges,

  // Migration generation
  generateMigration,
  generateMigrationCode,
} from './migration-generator';
