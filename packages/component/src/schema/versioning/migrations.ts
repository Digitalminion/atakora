/**
 * Schema Migration System
 *
 * Implements migration execution, validation, and rollback capabilities.
 * Supports migration chains for multi-step version upgrades.
 */

import type {
  Migration,
  MigrationChain,
  MigrationResult,
  MigrationValidation,
  DataTransformer,
  SchemaChange,
  SemanticVersion,
} from './types';
import { compareVersions, isVersionGreater, VersionComparison } from './schema-version';

// ============================================================================
// Migration Builder
// ============================================================================

/**
 * Fluent API for building migrations
 */
export class MigrationBuilder {
  private migration: Partial<Migration> = {
    changes: [],
    auto: true,
    createdAt: new Date().toISOString(),
  };

  /**
   * Set source version
   */
  from(version: SemanticVersion): this {
    this.migration.from = version;
    return this;
  }

  /**
   * Set target version
   */
  to(version: SemanticVersion): this {
    this.migration.to = version;
    return this;
  }

  /**
   * Add a schema change
   */
  addChange(change: SchemaChange): this {
    this.migration.changes = this.migration.changes || [];
    this.migration.changes.push(change);
    return this;
  }

  /**
   * Add multiple schema changes
   */
  addChanges(changes: SchemaChange[]): this {
    this.migration.changes = this.migration.changes || [];
    this.migration.changes.push(...changes);
    return this;
  }

  /**
   * Set data transformation function
   */
  transform(fn: DataTransformer): this {
    this.migration.transform = fn;
    return this;
  }

  /**
   * Set validation function
   */
  validate(fn: (data: any) => MigrationValidation): this {
    this.migration.validate = fn;
    return this;
  }

  /**
   * Set verification function
   */
  verify(fn: (data: any) => boolean): this {
    this.migration.verify = fn;
    return this;
  }

  /**
   * Set rollback function
   */
  rollback(fn: DataTransformer): this {
    this.migration.rollback = fn;
    return this;
  }

  /**
   * Set description
   */
  describe(description: string): this {
    this.migration.description = description;
    return this;
  }

  /**
   * Set auto-apply flag
   */
  setAuto(auto: boolean): this {
    this.migration.auto = auto;
    return this;
  }

  /**
   * Build the migration
   */
  build(): Migration {
    if (!this.migration.from || !this.migration.to) {
      throw new Error('Migration must have both from and to versions');
    }

    if (compareVersions(this.migration.from, this.migration.to) !== VersionComparison.LESS) {
      throw new Error('Migration to version must be greater than from version');
    }

    return this.migration as Migration;
  }
}

// ============================================================================
// Migration Validation
// ============================================================================

/**
 * Validate a migration definition
 */
export function validateMigration(migration: Migration): MigrationValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  let breaking = false;

  // Check version format
  if (!migration.from || !migration.to) {
    errors.push('Migration must have both from and to versions');
  }

  // Check version order
  if (migration.from && migration.to) {
    if (!isVersionGreater(migration.to, migration.from)) {
      errors.push('To version must be greater than from version');
    }
  }

  // Check for breaking changes
  for (const change of migration.changes) {
    if (change.type === 'removeField' && !change.archive) {
      breaking = true;
      warnings.push(`Removing field ${change.field} without archiving is a breaking change`);
    }

    if (change.type === 'changeType') {
      breaking = true;
      warnings.push(`Changing type of field ${change.field} is a breaking change`);
    }

    if (change.type === 'removeModel' && !change.archive) {
      breaking = true;
      warnings.push(`Removing model ${change.model} without archiving is a breaking change`);
    }
  }

  // Check for transform function if type changes exist
  const hasTypeChanges = migration.changes.some((c) => c.type === 'changeType');
  if (hasTypeChanges && !migration.transform) {
    warnings.push('Type changes detected but no transform function provided');
  }

  // Check for rollback function if breaking changes exist
  if (breaking && !migration.rollback) {
    warnings.push('Breaking changes detected but no rollback function provided');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    breaking,
  };
}

// ============================================================================
// Migration Execution
// ============================================================================

/**
 * Execute a single migration on data
 */
export async function executeMigration(migration: Migration, data: any): Promise<MigrationResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Validate migration
    if (migration.validate) {
      const validation = migration.validate(data);
      if (!validation.valid) {
        return {
          success: false,
          version: migration.from,
          errors: validation.errors,
          warnings: validation.warnings,
          canRollback: false,
        };
      }
      warnings.push(...validation.warnings);
    }

    // Apply transformation
    let migratedData = data;
    if (migration.transform) {
      migratedData = await Promise.resolve(migration.transform(data));
    }

    // Apply schema changes
    migratedData = applySchemaChanges(migratedData, migration.changes);

    // Verify migration
    if (migration.verify) {
      const verified = await Promise.resolve(migration.verify(migratedData));
      if (!verified) {
        errors.push('Migration verification failed');
        return {
          success: false,
          version: migration.from,
          errors,
          warnings,
          canRollback: !!migration.rollback,
        };
      }
    }

    return {
      success: true,
      version: migration.to,
      recordsProcessed: Array.isArray(data) ? data.length : 1,
      warnings: warnings.length > 0 ? warnings : undefined,
      duration: Date.now() - startTime,
      canRollback: !!migration.rollback,
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown migration error');
    return {
      success: false,
      version: migration.from,
      errors,
      warnings,
      canRollback: !!migration.rollback,
    };
  }
}

/**
 * Apply schema changes to data
 */
function applySchemaChanges(data: any, changes: SchemaChange[]): any {
  let result = data;

  for (const change of changes) {
    switch (change.type) {
      case 'addField':
        result = applyAddField(result, change);
        break;
      case 'removeField':
        result = applyRemoveField(result, change);
        break;
      case 'renameField':
        result = applyRenameField(result, change);
        break;
      case 'changeType':
        result = applyChangeType(result, change);
        break;
      // Model-level changes don't affect data directly
      case 'addModel':
      case 'removeModel':
      case 'renameModel':
      case 'deprecateField':
        break;
    }
  }

  return result;
}

function applyAddField(data: any, change: any): any {
  if (Array.isArray(data)) {
    return data.map((item) => ({
      ...item,
      [change.field]: change.defaultValue ?? null,
    }));
  }
  return {
    ...data,
    [change.field]: change.defaultValue ?? null,
  };
}

function applyRemoveField(data: any, change: any): any {
  if (Array.isArray(data)) {
    return data.map((item) => {
      const { [change.field]: removed, ...rest } = item;
      return rest;
    });
  }
  const { [change.field]: removed, ...rest } = data;
  return rest;
}

function applyRenameField(data: any, change: any): any {
  if (Array.isArray(data)) {
    return data.map((item) => {
      const { [change.from]: value, ...rest } = item;
      return { ...rest, [change.to]: value };
    });
  }
  const { [change.from]: value, ...rest } = data;
  return { ...rest, [change.to]: value };
}

function applyChangeType(data: any, change: any): any {
  if (!change.transform) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => ({
      ...item,
      [change.field]: change.transform(item[change.field]),
    }));
  }
  return {
    ...data,
    [change.field]: change.transform(data[change.field]),
  };
}

// ============================================================================
// Migration Chain
// ============================================================================

/**
 * Build a migration chain between two versions
 */
export function buildMigrationChain(
  migrations: Migration[],
  from: SemanticVersion,
  to: SemanticVersion
): MigrationChain | null {
  // Sort migrations by version
  const sorted = [...migrations].sort((a, b) => compareVersions(a.from, b.from));

  // Find path from source to target
  const chain: Migration[] = [];
  let currentVersion = from;

  while (currentVersion !== to) {
    const nextMigration = sorted.find((m) => m.from === currentVersion);

    if (!nextMigration) {
      // No direct migration found, cannot build chain
      return null;
    }

    chain.push(nextMigration);
    currentVersion = nextMigration.to;

    // Check if we've reached the target
    if (currentVersion === to) {
      break;
    }

    // Check if we've overshot
    if (isVersionGreater(currentVersion, to)) {
      // Cannot migrate backwards
      return null;
    }
  }

  return {
    from,
    to,
    migrations: chain,
    steps: chain.length,
  };
}

/**
 * Execute a migration chain
 */
export async function executeMigrationChain(
  chain: MigrationChain,
  data: any
): Promise<MigrationResult> {
  const startTime = Date.now();
  let currentData = data;
  let currentVersion = chain.from;
  const errors: string[] = [];
  const warnings: string[] = [];
  let totalRecordsProcessed = 0;
  let canRollback = true;

  for (const migration of chain.migrations) {
    const result = await executeMigration(migration, currentData);

    if (!result.success) {
      return {
        success: false,
        version: currentVersion,
        recordsProcessed: totalRecordsProcessed,
        errors: [...errors, ...(result.errors || [])],
        warnings: [...warnings, ...(result.warnings || [])],
        duration: Date.now() - startTime,
        canRollback,
      };
    }

    currentVersion = result.version;
    totalRecordsProcessed += result.recordsProcessed || 0;
    canRollback = canRollback && result.canRollback;

    if (result.warnings) {
      warnings.push(...result.warnings);
    }

    // Update data for next migration
    // In real implementation, this would be handled by the migration
    currentData = currentData; // Placeholder
  }

  return {
    success: true,
    version: chain.to,
    recordsProcessed: totalRecordsProcessed,
    warnings: warnings.length > 0 ? warnings : undefined,
    duration: Date.now() - startTime,
    canRollback,
  };
}

// ============================================================================
// Rollback
// ============================================================================

/**
 * Create a rollback migration from an executed migration
 */
export function createRollbackMigration(migration: Migration): Migration | null {
  if (!migration.rollback) {
    return null;
  }

  return {
    from: migration.to,
    to: migration.from,
    changes: reverseChanges(migration.changes),
    transform: migration.rollback,
    description: `Rollback of: ${migration.description || 'unnamed migration'}`,
    createdAt: new Date().toISOString(),
    auto: false, // Rollbacks should be manual
  };
}

/**
 * Reverse schema changes for rollback
 */
function reverseChanges(changes: SchemaChange[]): SchemaChange[] {
  return changes
    .map((change) => {
      switch (change.type) {
        case 'addField':
          return {
            type: 'removeField' as const,
            model: change.model,
            field: change.field,
            archive: true,
          } as SchemaChange;
        case 'removeField':
          return {
            type: 'addField' as const,
            model: change.model,
            field: change.field,
            definition: null as any, // Would need to be stored
            defaultValue: null,
          } as SchemaChange;
        case 'renameField':
          return {
            type: 'renameField' as const,
            model: change.model,
            from: change.to,
            to: change.from,
          } as SchemaChange;
        case 'addModel':
          return {
            type: 'removeModel' as const,
            model: change.model,
            archive: true,
          } as SchemaChange;
        case 'removeModel':
          return {
            type: 'addModel' as const,
            model: change.model,
            definition: null as any, // Would need to be stored
          } as SchemaChange;
        case 'renameModel':
          return {
            type: 'renameModel' as const,
            from: change.to,
            to: change.from,
          } as SchemaChange;
        default:
          return change;
      }
    })
    .reverse(); // Apply in reverse order
}

// ============================================================================
// Migration Registry
// ============================================================================

/**
 * Registry for managing migrations
 */
export class MigrationRegistry {
  private migrations: Map<string, Migration> = new Map();

  /**
   * Register a migration
   */
  register(migration: Migration): void {
    const key = `${migration.from}->${migration.to}`;
    if (this.migrations.has(key)) {
      throw new Error(`Migration ${key} already registered`);
    }
    this.migrations.set(key, migration);
  }

  /**
   * Get a migration by version pair
   */
  get(from: SemanticVersion, to: SemanticVersion): Migration | null {
    const key = `${from}->${to}`;
    return this.migrations.get(key) || null;
  }

  /**
   * Find migration path between versions
   */
  findPath(from: SemanticVersion, to: SemanticVersion): MigrationChain | null {
    return buildMigrationChain(Array.from(this.migrations.values()), from, to);
  }

  /**
   * Get all migrations
   */
  getAllMigrations(): Migration[] {
    return Array.from(this.migrations.values());
  }

  /**
   * Get migrations from a specific version
   */
  getMigrationsFrom(version: SemanticVersion): Migration[] {
    return this.getAllMigrations().filter((m) => m.from === version);
  }

  /**
   * Get migrations to a specific version
   */
  getMigrationsTo(version: SemanticVersion): Migration[] {
    return this.getAllMigrations().filter((m) => m.to === version);
  }

  /**
   * Clear all migrations
   */
  clear(): void {
    this.migrations.clear();
  }
}
