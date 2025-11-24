/**
 * Schema Migration System Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MigrationBuilder,
  validateMigration,
  executeMigration,
  buildMigrationChain,
  executeMigrationChain,
  createRollbackMigration,
  MigrationRegistry,
} from './migrations';
import type {
  Migration,
  MigrationChain,
  MigrationResult,
  MigrationValidation,
  SchemaChange,
  SemanticVersion,
} from './types';

describe('Migration System', () => {
  describe('MigrationBuilder', () => {
    it('should build a simple migration', () => {
      const migration = new MigrationBuilder()
        .from('1.0.0')
        .to('2.0.0')
        .describe('Major version upgrade')
        .build();

      expect(migration.from).toBe('1.0.0');
      expect(migration.to).toBe('2.0.0');
      expect(migration.description).toBe('Major version upgrade');
      expect(migration.auto).toBe(true);
    });

    it('should add schema changes', () => {
      const changes: SchemaChange[] = [
        { type: 'addField', model: 'User', field: 'email', definition: {} },
        { type: 'renameField', model: 'User', from: 'name', to: 'fullName' },
      ];

      const migration = new MigrationBuilder()
        .from('1.0.0')
        .to('1.1.0')
        .addChanges(changes)
        .build();

      expect(migration.changes).toHaveLength(2);
      expect(migration.changes[0].type).toBe('addField');
      expect(migration.changes[1].type).toBe('renameField');
    });

    it('should set transform and rollback functions', () => {
      const transform = (data: any) => ({ ...data, transformed: true });
      const rollback = (data: any) => ({ ...data, rolledBack: true });

      const migration = new MigrationBuilder()
        .from('1.0.0')
        .to('1.1.0')
        .transform(transform)
        .rollback(rollback)
        .build();

      expect(migration.transform).toBe(transform);
      expect(migration.rollback).toBe(rollback);
    });

    it('should validate version order', () => {
      expect(() => new MigrationBuilder().from('2.0.0').to('1.0.0').build()).toThrow(
        'Migration to version must be greater than from version'
      );
    });

    it('should require both versions', () => {
      expect(() => new MigrationBuilder().from('1.0.0').build()).toThrow(
        'Migration must have both from and to versions'
      );
    });
  });

  describe('Migration Validation', () => {
    it('should validate a valid migration', () => {
      const migration: Migration = {
        from: '1.0.0',
        to: '2.0.0',
        changes: [{ type: 'addField', model: 'User', field: 'email', definition: {} }],
      };

      const validation = validateMigration(migration);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect breaking changes', () => {
      const migration: Migration = {
        from: '1.0.0',
        to: '2.0.0',
        changes: [
          { type: 'removeField', model: 'User', field: 'email' },
          { type: 'changeType', model: 'User', field: 'age', fromType: 'string', toType: 'number' },
        ],
      };

      const validation = validateMigration(migration);
      expect(validation.breaking).toBe(true);
      expect(validation.warnings.length).toBeGreaterThan(0);
    });

    it('should warn about type changes without transform', () => {
      const migration: Migration = {
        from: '1.0.0',
        to: '1.1.0',
        changes: [
          { type: 'changeType', model: 'User', field: 'age', fromType: 'string', toType: 'number' },
        ],
      };

      const validation = validateMigration(migration);
      expect(validation.warnings).toContain(
        'Type changes detected but no transform function provided'
      );
    });

    it('should warn about breaking changes without rollback', () => {
      const migration: Migration = {
        from: '1.0.0',
        to: '2.0.0',
        changes: [{ type: 'removeModel', model: 'OldModel' }],
      };

      const validation = validateMigration(migration);
      expect(validation.breaking).toBe(true);
      expect(validation.warnings).toContain(
        'Breaking changes detected but no rollback function provided'
      );
    });
  });

  describe('Migration Execution', () => {
    it('should execute a simple migration', async () => {
      const migration: Migration = {
        from: '1.0.0',
        to: '1.1.0',
        changes: [
          {
            type: 'addField',
            model: 'User',
            field: 'email',
            definition: {},
            defaultValue: 'test@example.com',
          },
        ],
      };

      const data = { id: '1', name: 'John' };
      const result = await executeMigration(migration, data);

      expect(result.success).toBe(true);
      expect(result.version).toBe('1.1.0');
      expect(result.recordsProcessed).toBe(1);
    });

    it('should apply transform function', async () => {
      const migration: Migration = {
        from: '1.0.0',
        to: '1.1.0',
        changes: [],
        transform: (data: any) => ({ ...data, version: '1.1.0' }),
      };

      const data = { id: '1' };
      const result = await executeMigration(migration, data);

      expect(result.success).toBe(true);
    });

    it('should fail validation', async () => {
      const migration: Migration = {
        from: '1.0.0',
        to: '1.1.0',
        changes: [],
        validate: () => ({
          valid: false,
          errors: ['Invalid data format'],
          warnings: [],
          breaking: false,
        }),
      };

      const result = await executeMigration(migration, {});
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid data format');
    });

    it('should fail verification', async () => {
      const migration: Migration = {
        from: '1.0.0',
        to: '1.1.0',
        changes: [],
        verify: () => false,
      };

      const result = await executeMigration(migration, {});
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Migration verification failed');
    });

    it('should handle arrays of data', async () => {
      const migration: Migration = {
        from: '1.0.0',
        to: '1.1.0',
        changes: [
          { type: 'addField', model: 'User', field: 'active', definition: {}, defaultValue: true },
        ],
      };

      const data = [
        { id: '1', name: 'John' },
        { id: '2', name: 'Jane' },
      ];

      const result = await executeMigration(migration, data);
      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBe(2);
    });

    it('should apply field renames', async () => {
      const migration: Migration = {
        from: '1.0.0',
        to: '1.1.0',
        changes: [{ type: 'renameField', model: 'User', from: 'name', to: 'fullName' }],
      };

      const data = { id: '1', name: 'John Doe' };
      const result = await executeMigration(migration, data);

      expect(result.success).toBe(true);
    });

    it('should remove fields', async () => {
      const migration: Migration = {
        from: '1.0.0',
        to: '1.1.0',
        changes: [{ type: 'removeField', model: 'User', field: 'deprecated', archive: true }],
      };

      const data = { id: '1', name: 'John', deprecated: 'old value' };
      const result = await executeMigration(migration, data);

      expect(result.success).toBe(true);
    });
  });

  describe('Migration Chain', () => {
    const migrations: Migration[] = [
      {
        from: '1.0.0',
        to: '1.1.0',
        changes: [{ type: 'addField', model: 'User', field: 'email', definition: {} }],
      },
      {
        from: '1.1.0',
        to: '1.2.0',
        changes: [{ type: 'addField', model: 'User', field: 'phone', definition: {} }],
      },
      {
        from: '1.2.0',
        to: '2.0.0',
        changes: [{ type: 'renameField', model: 'User', from: 'name', to: 'fullName' }],
      },
    ];

    it('should build a migration chain', () => {
      const chain = buildMigrationChain(migrations, '1.0.0', '2.0.0');

      expect(chain).not.toBeNull();
      expect(chain?.from).toBe('1.0.0');
      expect(chain?.to).toBe('2.0.0');
      expect(chain?.steps).toBe(3);
      expect(chain?.migrations).toHaveLength(3);
    });

    it('should return null if no path exists', () => {
      const chain = buildMigrationChain(migrations, '1.0.0', '3.0.0');
      expect(chain).toBeNull();
    });

    it('should not build backwards chain', () => {
      const chain = buildMigrationChain(migrations, '2.0.0', '1.0.0');
      expect(chain).toBeNull();
    });

    it('should execute a migration chain', async () => {
      const chain: MigrationChain = {
        from: '1.0.0',
        to: '2.0.0',
        migrations,
        steps: 3,
      };

      const data = { id: '1', name: 'John' };
      const result = await executeMigrationChain(chain, data);

      expect(result.success).toBe(true);
      expect(result.version).toBe('2.0.0');
    });

    it('should stop chain on failure', async () => {
      const failingMigrations: Migration[] = [
        ...migrations.slice(0, 1),
        {
          from: '1.1.0',
          to: '1.2.0',
          changes: [],
          validate: () => ({
            valid: false,
            errors: ['Failed'],
            warnings: [],
            breaking: false,
          }),
        },
      ];

      const chain: MigrationChain = {
        from: '1.0.0',
        to: '1.2.0',
        migrations: failingMigrations,
        steps: 2,
      };

      const result = await executeMigrationChain(chain, {});
      expect(result.success).toBe(false);
      expect(result.version).toBe('1.1.0'); // Stopped at successful version
    });
  });

  describe('Rollback', () => {
    it('should create rollback migration', () => {
      const migration: Migration = {
        from: '1.0.0',
        to: '1.1.0',
        changes: [
          { type: 'addField', model: 'User', field: 'email', definition: {} },
          { type: 'renameField', model: 'User', from: 'name', to: 'fullName' },
        ],
        rollback: (data: any) => data,
      };

      const rollback = createRollbackMigration(migration);

      expect(rollback).not.toBeNull();
      expect(rollback?.from).toBe('1.1.0');
      expect(rollback?.to).toBe('1.0.0');
      expect(rollback?.changes).toHaveLength(2);
      expect(rollback?.changes[0].type).toBe('renameField'); // Reversed order
      expect(rollback?.auto).toBe(false); // Rollbacks are manual
    });

    it('should return null if no rollback function', () => {
      const migration: Migration = {
        from: '1.0.0',
        to: '1.1.0',
        changes: [],
      };

      const rollback = createRollbackMigration(migration);
      expect(rollback).toBeNull();
    });
  });

  describe('MigrationRegistry', () => {
    let registry: MigrationRegistry;

    beforeEach(() => {
      registry = new MigrationRegistry();
    });

    it('should register migrations', () => {
      const migration: Migration = {
        from: '1.0.0',
        to: '1.1.0',
        changes: [],
      };

      registry.register(migration);
      expect(registry.get('1.0.0', '1.1.0')).toBe(migration);
    });

    it('should prevent duplicate registrations', () => {
      const migration: Migration = {
        from: '1.0.0',
        to: '1.1.0',
        changes: [],
      };

      registry.register(migration);
      expect(() => registry.register(migration)).toThrow(
        'Migration 1.0.0->1.1.0 already registered'
      );
    });

    it('should find migration paths', () => {
      const migrations: Migration[] = [
        { from: '1.0.0', to: '1.1.0', changes: [] },
        { from: '1.1.0', to: '2.0.0', changes: [] },
      ];

      migrations.forEach((m) => registry.register(m));

      const path = registry.findPath('1.0.0', '2.0.0');
      expect(path).not.toBeNull();
      expect(path?.steps).toBe(2);
    });

    it('should get migrations from a version', () => {
      registry.register({ from: '1.0.0', to: '1.1.0', changes: [] });
      registry.register({ from: '1.0.0', to: '1.2.0', changes: [] });
      registry.register({ from: '2.0.0', to: '2.1.0', changes: [] });

      const from100 = registry.getMigrationsFrom('1.0.0');
      expect(from100).toHaveLength(2);
    });

    it('should get migrations to a version', () => {
      registry.register({ from: '1.0.0', to: '2.0.0', changes: [] });
      registry.register({ from: '1.5.0', to: '2.0.0', changes: [] });
      registry.register({ from: '2.0.0', to: '3.0.0', changes: [] });

      const to200 = registry.getMigrationsTo('2.0.0');
      expect(to200).toHaveLength(2);
    });

    it('should clear all migrations', () => {
      registry.register({ from: '1.0.0', to: '1.1.0', changes: [] });
      registry.register({ from: '1.1.0', to: '2.0.0', changes: [] });

      expect(registry.getAllMigrations()).toHaveLength(2);

      registry.clear();
      expect(registry.getAllMigrations()).toHaveLength(0);
    });
  });
});
