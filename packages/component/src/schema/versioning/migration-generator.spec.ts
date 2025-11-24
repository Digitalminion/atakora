/**
 * Migration Generator Tests
 */

import { describe, it, expect } from 'vitest';
import {
  compareSchemas,
  analyzeBreakingChanges,
  generateMigration,
  generateMigrationCode,
} from './migration-generator';
import type { SchemaComparison, BreakingChangeAnalysis, Migration, SchemaChange } from './types';
import { BreakingChangeType } from './types';

describe('Migration Generator', () => {
  describe('Schema Comparison', () => {
    it('should detect added models', () => {
      const oldSchema = {
        models: {
          User: { fields: { id: { type: 'id' }, name: { type: 'string' } } },
        },
      };

      const newSchema = {
        models: {
          User: { fields: { id: { type: 'id' }, name: { type: 'string' } } },
          Post: { fields: { id: { type: 'id' }, title: { type: 'string' } } },
        },
      };

      const comparison = compareSchemas(oldSchema, newSchema, '1.0.0', '1.1.0');

      expect(comparison.changes).toHaveLength(1);
      expect(comparison.changes[0].type).toBe('addModel');
      expect((comparison.changes[0] as any).model).toBe('Post');
      expect(comparison.breaking).toBe(false);
    });

    it('should detect removed models', () => {
      const oldSchema = {
        models: {
          User: { fields: { id: { type: 'id' } } },
          Post: { fields: { id: { type: 'id' } } },
        },
      };

      const newSchema = {
        models: {
          User: { fields: { id: { type: 'id' } } },
        },
      };

      const comparison = compareSchemas(oldSchema, newSchema, '1.0.0', '2.0.0');

      expect(comparison.changes).toHaveLength(1);
      expect(comparison.changes[0].type).toBe('removeModel');
      expect((comparison.changes[0] as any).model).toBe('Post');
      expect(comparison.breaking).toBe(true);
    });

    it('should detect added fields', () => {
      const oldSchema = {
        models: {
          User: { fields: { id: { type: 'id' } } },
        },
      };

      const newSchema = {
        models: {
          User: {
            fields: {
              id: { type: 'id' },
              email: { type: 'string', required: false },
            },
          },
        },
      };

      const comparison = compareSchemas(oldSchema, newSchema, '1.0.0', '1.1.0');

      const addFieldChanges = comparison.changes.filter((c) => c.type === 'addField');
      expect(addFieldChanges).toHaveLength(1);
      expect((addFieldChanges[0] as any).field).toBe('email');
      expect(comparison.breaking).toBe(false);
    });

    it('should detect removed fields', () => {
      const oldSchema = {
        models: {
          User: {
            fields: {
              id: { type: 'id' },
              email: { type: 'string' },
            },
          },
        },
      };

      const newSchema = {
        models: {
          User: { fields: { id: { type: 'id' } } },
        },
      };

      const comparison = compareSchemas(oldSchema, newSchema, '1.0.0', '2.0.0');

      const removeFieldChanges = comparison.changes.filter((c) => c.type === 'removeField');
      expect(removeFieldChanges).toHaveLength(1);
      expect((removeFieldChanges[0] as any).field).toBe('email');
    });

    it('should detect field renames', () => {
      const oldSchema = {
        models: {
          User: {
            fields: {
              id: { type: 'id' },
              name: { type: 'string' },
            },
          },
        },
      };

      const newSchema = {
        models: {
          User: {
            fields: {
              id: { type: 'id' },
              fullName: { type: 'string' },
            },
          },
        },
      };

      const comparison = compareSchemas(oldSchema, newSchema, '1.0.0', '1.1.0');

      const renameChanges = comparison.changes.filter((c) => c.type === 'renameField');
      expect(renameChanges).toHaveLength(1);
      expect((renameChanges[0] as any).from).toBe('name');
      expect((renameChanges[0] as any).to).toBe('fullName');
    });

    it('should detect type changes', () => {
      const oldSchema = {
        models: {
          User: {
            fields: {
              id: { type: 'id' },
              age: { type: 'string' },
            },
          },
        },
      };

      const newSchema = {
        models: {
          User: {
            fields: {
              id: { type: 'id' },
              age: { type: 'number' },
            },
          },
        },
      };

      const comparison = compareSchemas(oldSchema, newSchema, '1.0.0', '2.0.0');

      const typeChanges = comparison.changes.filter((c) => c.type === 'changeType');
      expect(typeChanges).toHaveLength(1);
      expect((typeChanges[0] as any).field).toBe('age');
      expect((typeChanges[0] as any).fromType).toBe('string');
      expect((typeChanges[0] as any).toType).toBe('number');
      expect(comparison.breaking).toBe(true);
    });

    it('should detect field deprecation', () => {
      const oldSchema = {
        models: {
          User: {
            fields: {
              id: { type: 'id' },
              oldField: { type: 'string' },
            },
          },
        },
      };

      const newSchema = {
        models: {
          User: {
            fields: {
              id: { type: 'id' },
              oldField: {
                type: 'string',
                deprecated: true,
                deprecationMessage: 'Use newField instead',
              },
            },
          },
        },
      };

      const comparison = compareSchemas(oldSchema, newSchema, '1.0.0', '1.1.0');

      const deprecateChanges = comparison.changes.filter((c) => c.type === 'deprecateField');
      expect(deprecateChanges).toHaveLength(1);
      expect((deprecateChanges[0] as any).field).toBe('oldField');
      expect((deprecateChanges[0] as any).message).toBe('Use newField instead');
    });
  });

  describe('Breaking Change Analysis', () => {
    it('should identify field removal as breaking', () => {
      const changes: SchemaChange[] = [{ type: 'removeField', model: 'User', field: 'email' }];

      const analysis = analyzeBreakingChanges(changes);

      expect(analysis.hasBreakingChanges).toBe(true);
      expect(analysis.breakingChanges).toHaveLength(1);
      expect(analysis.breakingChanges[0].type).toBe(BreakingChangeType.FIELD_REMOVED);
      expect(analysis.recommendedVersionBump).toBe('major');
    });

    it('should identify required field without default as breaking', () => {
      const changes: SchemaChange[] = [
        {
          type: 'addField',
          model: 'User',
          field: 'email',
          definition: { required: true },
        },
      ];

      const analysis = analyzeBreakingChanges(changes);

      expect(analysis.hasBreakingChanges).toBe(true);
      expect(analysis.breakingChanges).toHaveLength(1);
      expect(analysis.breakingChanges[0].type).toBe(BreakingChangeType.REQUIRED_FIELD_ADDED);
    });

    it('should not consider required field with default as breaking', () => {
      const changes: SchemaChange[] = [
        {
          type: 'addField',
          model: 'User',
          field: 'status',
          definition: { required: true },
          defaultValue: 'active',
        },
      ];

      const analysis = analyzeBreakingChanges(changes);

      expect(analysis.hasBreakingChanges).toBe(false);
      expect(analysis.safeChanges).toHaveLength(1);
      expect(analysis.recommendedVersionBump).toBe('minor');
    });

    it('should identify incompatible type changes as breaking', () => {
      const changes: SchemaChange[] = [
        {
          type: 'changeType',
          model: 'User',
          field: 'age',
          fromType: 'string',
          toType: 'number',
        },
      ];

      const analysis = analyzeBreakingChanges(changes);

      expect(analysis.hasBreakingChanges).toBe(true);
      expect(analysis.breakingChanges[0].type).toBe(BreakingChangeType.INCOMPATIBLE_TYPE_CHANGE);
    });

    it('should recommend patch for non-breaking changes', () => {
      const changes: SchemaChange[] = [
        { type: 'deprecateField', model: 'User', field: 'oldField', message: 'Deprecated' },
      ];

      const analysis = analyzeBreakingChanges(changes);

      expect(analysis.hasBreakingChanges).toBe(false);
      expect(analysis.recommendedVersionBump).toBe('patch');
    });

    it('should recommend minor for feature additions', () => {
      const changes: SchemaChange[] = [
        { type: 'addModel', model: 'Post', definition: {} },
        {
          type: 'addField',
          model: 'User',
          field: 'nickname',
          definition: { required: false },
        },
      ];

      const analysis = analyzeBreakingChanges(changes);

      expect(analysis.hasBreakingChanges).toBe(false);
      expect(analysis.recommendedVersionBump).toBe('minor');
    });
  });

  describe('Migration Generation', () => {
    it('should generate a migration from comparison', () => {
      const comparison: SchemaComparison = {
        from: '1.0.0',
        to: '1.1.0',
        changes: [{ type: 'addField', model: 'User', field: 'email', definition: {} }],
        breaking: false,
      };

      const migration = generateMigration(comparison, {
        description: 'Add email field',
        autoApply: true,
      });

      expect(migration.from).toBe('1.0.0');
      expect(migration.to).toBe('1.1.0');
      expect(migration.description).toBe('Add email field');
      expect(migration.auto).toBe(true);
      expect(migration.changes).toHaveLength(1);
    });

    it('should generate transform function for field renames', () => {
      const comparison: SchemaComparison = {
        from: '1.0.0',
        to: '1.1.0',
        changes: [{ type: 'renameField', model: 'User', from: 'name', to: 'fullName' }],
        breaking: false,
      };

      const migration = generateMigration(comparison);

      expect(migration.transform).toBeDefined();

      // Test the transform function
      const testData = { id: '1', name: 'John Doe' };
      const transformed = migration.transform!(testData);
      expect(transformed).toEqual({ id: '1', fullName: 'John Doe' });
    });

    it('should generate transform for multiple changes', () => {
      const comparison: SchemaComparison = {
        from: '1.0.0',
        to: '2.0.0',
        changes: [
          { type: 'renameField', model: 'User', from: 'name', to: 'fullName' },
          { type: 'addField', model: 'User', field: 'active', definition: {}, defaultValue: true },
        ],
        breaking: false,
      };

      const migration = generateMigration(comparison);
      const testData = { id: '1', name: 'John' };
      const transformed = migration.transform!(testData);

      expect(transformed).toEqual({
        id: '1',
        fullName: 'John',
        active: true,
      });
    });

    it('should handle array data in transform', () => {
      const comparison: SchemaComparison = {
        from: '1.0.0',
        to: '1.1.0',
        changes: [
          {
            type: 'addField',
            model: 'User',
            field: 'status',
            definition: {},
            defaultValue: 'active',
          },
        ],
        breaking: false,
      };

      const migration = generateMigration(comparison);
      const testData = [
        { id: '1', name: 'John' },
        { id: '2', name: 'Jane' },
      ];
      const transformed = migration.transform!(testData);

      expect(transformed).toEqual([
        { id: '1', name: 'John', status: 'active' },
        { id: '2', name: 'Jane', status: 'active' },
      ]);
    });

    it('should generate rollback function when requested', () => {
      const comparison: SchemaComparison = {
        from: '1.0.0',
        to: '1.1.0',
        changes: [{ type: 'addField', model: 'User', field: 'email', definition: {} }],
        breaking: false,
      };

      const migration = generateMigration(comparison, { includeRollback: true });

      expect(migration.rollback).toBeDefined();
    });

    it('should set auto to false for breaking migrations', () => {
      const comparison: SchemaComparison = {
        from: '1.0.0',
        to: '2.0.0',
        changes: [{ type: 'removeField', model: 'User', field: 'important' }],
        breaking: true,
      };

      const migration = generateMigration(comparison);

      expect(migration.auto).toBe(false);
    });
  });

  describe('Migration Code Generation', () => {
    it('should generate TypeScript migration code', () => {
      const migration: Migration = {
        from: '1.0.0',
        to: '1.1.0',
        description: 'Add email field to User',
        auto: true,
        changes: [{ type: 'addField', model: 'User', field: 'email', definition: {} }],
      };

      const code = generateMigrationCode(migration);

      expect(code).toContain('import { Migration }');
      expect(code).toContain('export const migration_1_0_0_to_1_1_0');
      expect(code).toContain("from: '1.0.0'");
      expect(code).toContain("to: '1.1.0'");
      expect(code).toContain("description: 'Add email field to User'");
      expect(code).toContain('auto: true');
      expect(code).toContain('"type": "addField"');
    });

    it('should include transform function placeholder', () => {
      const migration: Migration = {
        from: '1.0.0',
        to: '1.1.0',
        changes: [],
        transform: () => ({}),
      };

      const code = generateMigrationCode(migration);

      expect(code).toContain('transform: (data) => {');
      expect(code).toContain('// TODO: Implement data transformation');
    });

    it('should include rollback function placeholder', () => {
      const migration: Migration = {
        from: '1.0.0',
        to: '1.1.0',
        changes: [],
        rollback: () => ({}),
      };

      const code = generateMigrationCode(migration);

      expect(code).toContain('rollback: (data) => {');
      expect(code).toContain('// TODO: Implement rollback transformation');
    });

    it('should handle complex changes in generated code', () => {
      const migration: Migration = {
        from: '1.0.0',
        to: '2.0.0',
        changes: [
          { type: 'renameField', model: 'User', from: 'name', to: 'fullName' },
          { type: 'removeField', model: 'User', field: 'deprecated', archive: true },
          { type: 'changeType', model: 'User', field: 'age', fromType: 'string', toType: 'number' },
        ],
      };

      const code = generateMigrationCode(migration);

      expect(code).toContain('"type": "renameField"');
      expect(code).toContain('"from": "name"');
      expect(code).toContain('"to": "fullName"');
      expect(code).toContain('"type": "removeField"');
      expect(code).toContain('"archive": true');
      expect(code).toContain('"type": "changeType"');
    });
  });
});
