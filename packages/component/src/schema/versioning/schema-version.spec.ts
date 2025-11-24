/**
 * Schema Version Management Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseVersion,
  isValidVersion,
  formatVersion,
  compareVersions,
  isVersionGreater,
  isVersionLess,
  isVersionEqual,
  isVersionInRange,
  bumpVersion,
  nextMajorVersion,
  nextMinorVersion,
  nextPatchVersion,
  createSchemaSnapshot,
  VersionHistory,
  VersionedSchemaManager,
  sortVersions,
  getLatestVersion,
  getEarliestVersion,
  VersionComparison,
} from './schema-version';
import type { SemanticVersion, VersionRange } from './types';

describe('Schema Version Management', () => {
  describe('Version Parsing and Validation', () => {
    it('should parse valid semantic versions', () => {
      expect(parseVersion('1.0.0')).toEqual({ major: 1, minor: 0, patch: 0 });
      expect(parseVersion('2.3.4')).toEqual({ major: 2, minor: 3, patch: 4 });
      expect(parseVersion('10.20.30')).toEqual({ major: 10, minor: 20, patch: 30 });
    });

    it('should return null for invalid versions', () => {
      expect(parseVersion('1.0')).toBeNull();
      expect(parseVersion('1.0.0.0')).toBeNull();
      expect(parseVersion('v1.0.0')).toBeNull();
      expect(parseVersion('1.0.0-alpha')).toBeNull();
    });

    it('should validate semantic version strings', () => {
      expect(isValidVersion('1.0.0')).toBe(true);
      expect(isValidVersion('0.0.0')).toBe(true);
      expect(isValidVersion('99.99.99')).toBe(true);
      expect(isValidVersion('1.0')).toBe(false);
      expect(isValidVersion('not-a-version')).toBe(false);
    });

    it('should format version components', () => {
      expect(formatVersion(1, 2, 3)).toBe('1.2.3');
      expect(formatVersion(0, 0, 0)).toBe('0.0.0');
      expect(formatVersion(10, 20, 30)).toBe('10.20.30');
    });
  });

  describe('Version Comparison', () => {
    it('should compare versions correctly', () => {
      expect(compareVersions('1.0.0' as SemanticVersion, '1.0.0' as SemanticVersion)).toBe(
        VersionComparison.EQUAL
      );
      expect(compareVersions('2.0.0' as SemanticVersion, '1.0.0' as SemanticVersion)).toBe(
        VersionComparison.GREATER
      );
      expect(compareVersions('1.0.0' as SemanticVersion, '2.0.0' as SemanticVersion)).toBe(
        VersionComparison.LESS
      );
      expect(compareVersions('1.1.0' as SemanticVersion, '1.0.0' as SemanticVersion)).toBe(
        VersionComparison.GREATER
      );
      expect(compareVersions('1.0.1' as SemanticVersion, '1.0.0' as SemanticVersion)).toBe(
        VersionComparison.GREATER
      );
    });

    it('should check if version is greater', () => {
      expect(isVersionGreater('2.0.0' as SemanticVersion, '1.0.0' as SemanticVersion)).toBe(true);
      expect(isVersionGreater('1.0.0' as SemanticVersion, '2.0.0' as SemanticVersion)).toBe(false);
      expect(isVersionGreater('1.0.0' as SemanticVersion, '1.0.0' as SemanticVersion)).toBe(false);
    });

    it('should check if version is less', () => {
      expect(isVersionLess('1.0.0' as SemanticVersion, '2.0.0' as SemanticVersion)).toBe(true);
      expect(isVersionLess('2.0.0' as SemanticVersion, '1.0.0' as SemanticVersion)).toBe(false);
      expect(isVersionLess('1.0.0' as SemanticVersion, '1.0.0' as SemanticVersion)).toBe(false);
    });

    it('should check if versions are equal', () => {
      expect(isVersionEqual('1.0.0' as SemanticVersion, '1.0.0' as SemanticVersion)).toBe(true);
      expect(isVersionEqual('1.0.0' as SemanticVersion, '1.0.1' as SemanticVersion)).toBe(false);
    });
  });

  describe('Version Ranges', () => {
    it('should check if version is in range with exact match', () => {
      const range: VersionRange = { exact: '1.0.0' };
      expect(isVersionInRange('1.0.0' as SemanticVersion, range)).toBe(true);
      expect(isVersionInRange('1.0.1' as SemanticVersion, range)).toBe(false);
    });

    it('should check if version is in range with min/max', () => {
      const range: VersionRange = { min: '1.0.0', max: '2.0.0' };
      expect(isVersionInRange('1.0.0' as SemanticVersion, range)).toBe(true);
      expect(isVersionInRange('1.5.0' as SemanticVersion, range)).toBe(true);
      expect(isVersionInRange('2.0.0' as SemanticVersion, range)).toBe(true);
      expect(isVersionInRange('0.9.0' as SemanticVersion, range)).toBe(false);
      expect(isVersionInRange('2.1.0' as SemanticVersion, range)).toBe(false);
    });

    it('should check if version matches pattern', () => {
      const range: VersionRange = { pattern: '1.x.x' };
      expect(isVersionInRange('1.0.0' as SemanticVersion, range)).toBe(true);
      expect(isVersionInRange('1.9.9' as SemanticVersion, range)).toBe(true);
      expect(isVersionInRange('2.0.0' as SemanticVersion, range)).toBe(false);
    });
  });

  describe('Version Bumping', () => {
    it('should bump major version', () => {
      expect(bumpVersion('1.2.3' as SemanticVersion, 'major')).toBe('2.0.0');
      expect(nextMajorVersion('1.2.3' as SemanticVersion)).toBe('2.0.0');
    });

    it('should bump minor version', () => {
      expect(bumpVersion('1.2.3' as SemanticVersion, 'minor')).toBe('1.3.0');
      expect(nextMinorVersion('1.2.3' as SemanticVersion)).toBe('1.3.0');
    });

    it('should bump patch version', () => {
      expect(bumpVersion('1.2.3' as SemanticVersion, 'patch')).toBe('1.2.4');
      expect(nextPatchVersion('1.2.3' as SemanticVersion)).toBe('1.2.4');
    });

    it('should throw error for invalid version', () => {
      expect(() => bumpVersion('invalid' as SemanticVersion, 'major')).toThrow();
    });
  });

  describe('Schema Snapshot', () => {
    it('should create a schema snapshot', () => {
      const schema = { models: {} };
      const snapshot = createSchemaSnapshot(schema, '1.0.0', 'Initial version');

      expect(snapshot.version).toBe('1.0.0');
      expect(snapshot.description).toBe('Initial version');
      expect(snapshot.createdAt).toBeDefined();
      expect(snapshot.breaking).toBe(false);
    });
  });

  describe('Version History', () => {
    let history: VersionHistory;

    beforeEach(() => {
      history = new VersionHistory();
    });

    it('should add versions to history', () => {
      const v1 = createSchemaSnapshot({}, '1.0.0', 'Version 1');
      const v2 = createSchemaSnapshot({}, '1.1.0', 'Version 2');

      history.addVersion(v1);
      history.addVersion(v2);

      expect(history.getAllVersions()).toHaveLength(2);
      expect(history.hasVersion('1.0.0')).toBe(true);
      expect(history.hasVersion('1.1.0')).toBe(true);
    });

    it('should prevent duplicate versions', () => {
      const v1 = createSchemaSnapshot({}, '1.0.0', 'Version 1');
      history.addVersion(v1);

      expect(() => history.addVersion(v1)).toThrow('Version 1.0.0 already exists');
    });

    it('should require new version to be greater than latest', () => {
      const v2 = createSchemaSnapshot({}, '2.0.0', 'Version 2');
      const v1 = createSchemaSnapshot({}, '1.0.0', 'Version 1');

      history.addVersion(v2);
      expect(() => history.addVersion(v1)).toThrow();
    });

    it('should get latest version', () => {
      const v1 = createSchemaSnapshot({}, '1.0.0', 'Version 1');
      const v2 = createSchemaSnapshot({}, '1.5.0', 'Version 1.5');
      const v3 = createSchemaSnapshot({}, '2.0.0', 'Version 2');

      history.addVersion(v1);
      history.addVersion(v2);
      history.addVersion(v3);

      const latest = history.getLatest();
      expect(latest?.version).toBe('2.0.0');
    });

    it('should get version path', () => {
      const v1 = createSchemaSnapshot({}, '1.0.0', 'Version 1');
      const v2 = createSchemaSnapshot({}, '1.1.0', 'Version 2');
      const v3 = createSchemaSnapshot({}, '2.0.0', 'Version 3');

      history.addVersion(v1);
      history.addVersion(v2);
      history.addVersion(v3);

      const path = history.getVersionPath('1.0.0', '2.0.0');
      expect(path).toHaveLength(3);
      expect(path[0].version).toBe('1.0.0');
      expect(path[2].version).toBe('2.0.0');
    });

    it('should get versions in range', () => {
      history.addVersion(createSchemaSnapshot({}, '1.0.0', 'v1'));
      history.addVersion(createSchemaSnapshot({}, '1.5.0', 'v1.5'));
      history.addVersion(createSchemaSnapshot({}, '2.0.0', 'v2'));
      history.addVersion(createSchemaSnapshot({}, '2.5.0', 'v2.5'));

      const range: VersionRange = { min: '1.5.0', max: '2.0.0' };
      const versions = history.getVersionsInRange(range);

      expect(versions).toHaveLength(2);
      expect(versions[0].version).toBe('1.5.0');
      expect(versions[1].version).toBe('2.0.0');
    });

    it('should export and import from JSON', () => {
      const v1 = createSchemaSnapshot({}, '1.0.0', 'Version 1');
      const v2 = createSchemaSnapshot({}, '2.0.0', 'Version 2');

      history.addVersion(v1);
      history.addVersion(v2);

      const json = history.toJSON();
      const imported = VersionHistory.fromJSON(json);

      expect(imported.getAllVersions()).toHaveLength(2);
      expect(imported.hasVersion('1.0.0')).toBe(true);
      expect(imported.hasVersion('2.0.0')).toBe(true);
    });
  });

  describe('VersionedSchemaManager', () => {
    let manager: VersionedSchemaManager;

    beforeEach(() => {
      manager = new VersionedSchemaManager('1.0.0');
    });

    it('should initialize with version', () => {
      expect(manager.getCurrentVersion()).toBe('1.0.0');
    });

    it('should set and get schema', () => {
      const schema = { models: { User: {} } };
      manager.setSchema(schema, '1.1.0', 'Added User model');

      expect(manager.getCurrentVersion()).toBe('1.1.0');
      expect(manager.getCurrentSchema()).toEqual(schema);
    });

    it('should maintain schema history', () => {
      const schema1 = { models: { User: {} } };
      const schema2 = { models: { User: {}, Post: {} } };

      manager.setSchema(schema1, '1.0.0', 'Initial');
      manager.setSchema(schema2, '1.1.0', 'Added Post');

      const history = manager.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].version).toBe('1.0.0');
      expect(history[1].version).toBe('1.1.0');
    });

    it('should register and retrieve migrations', () => {
      const migration = {
        from: '1.0.0' as SemanticVersion,
        to: '1.1.0' as SemanticVersion,
        changes: [],
      };

      manager.registerMigration('1.0.0', '1.1.0', migration);
      expect(manager.hasMigration('1.0.0', '1.1.0')).toBe(true);
      expect(manager.getMigration('1.0.0', '1.1.0')).toEqual(migration);
    });

    it('should create versioned schema object', () => {
      const schema = { models: { User: {} } };
      manager.setSchema(schema, '1.0.0', 'Initial');

      const versioned = manager.toVersionedSchema();
      expect(versioned.version).toBe('1.0.0');
      expect(versioned.schema).toEqual(schema);
      expect(versioned.history).toHaveLength(1);
    });

    it('should load from versioned schema', () => {
      const versioned = {
        version: '2.0.0' as SemanticVersion,
        schema: { models: { User: {} } },
        history: [createSchemaSnapshot({}, '1.0.0'), createSchemaSnapshot({}, '2.0.0')],
        migrations: [
          { from: '1.0.0' as SemanticVersion, to: '2.0.0' as SemanticVersion, changes: [] },
        ],
      };

      const loaded = VersionedSchemaManager.fromVersionedSchema(versioned);
      expect(loaded.getCurrentVersion()).toBe('2.0.0');
      expect(loaded.getCurrentSchema()).toEqual(versioned.schema);
      expect(loaded.getHistory()).toHaveLength(2);
      expect(loaded.hasMigration('1.0.0', '2.0.0')).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    it('should sort versions', () => {
      const versions: SemanticVersion[] = ['2.0.0', '1.0.0', '1.5.0', '1.0.1'];
      const sorted = sortVersions(versions);

      expect(sorted).toEqual(['1.0.0', '1.0.1', '1.5.0', '2.0.0']);
    });

    it('should get latest version from list', () => {
      const versions: SemanticVersion[] = ['1.0.0', '2.0.0', '1.5.0'];
      expect(getLatestVersion(versions)).toBe('2.0.0');
      expect(getLatestVersion([])).toBeNull();
    });

    it('should get earliest version from list', () => {
      const versions: SemanticVersion[] = ['2.0.0', '1.0.0', '1.5.0'];
      expect(getEarliestVersion(versions)).toBe('1.0.0');
      expect(getEarliestVersion([])).toBeNull();
    });
  });
});
