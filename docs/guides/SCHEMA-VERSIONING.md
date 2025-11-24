# Schema Versioning and Migration System

## Overview

The Schema Versioning and Migration System enables safe schema evolution over time. It provides:

- **Semantic Versioning**: Track schema changes with version numbers
- **Migration Support**: Transform data between schema versions
- **Breaking Change Detection**: Identify changes that break compatibility
- **Field Deprecation**: Gradually phase out fields
- **Automatic Migration Generation**: Create migrations from schema diffs
- **Rollback Capability**: Revert migrations if needed

## Quick Start

### Basic Versioned Schema

```typescript
import { defineSchema, a, c } from '@atakora/component';

export const schema = defineSchema(
  {
    schema: a.schema({
      User: c.model({
        id: a.id(),
        email: a.string().required().email(),
        name: a.string().required(),
      }),
    }),
  },
  {
    version: '1.0.0',
    description: 'Initial schema version',
  }
);
```

### Schema with Migrations

```typescript
export const schema = defineSchema(
  {
    schema: a.schema({
      User: c.model({
        id: a.id(),
        fullName: a.string().required(), // Renamed from 'name'
        email: a.string().required(),
        phone: a.string().deprecated('Use contactInfo.phone instead', '3.0.0'),
      }),
    }),
  },
  {
    version: '2.0.0',
    migrations: [
      {
        from: '1.0.0',
        to: '2.0.0',
        changes: [{ type: 'renameField', model: 'User', from: 'name', to: 'fullName' }],
        transform: (data) => ({
          ...data,
          fullName: data.name,
          name: undefined,
        }),
      },
    ],
  }
);
```

## Core Concepts

### 1. Semantic Versioning

Schemas use semantic versioning (MAJOR.MINOR.PATCH):

- **MAJOR**: Breaking changes (removing fields, incompatible type changes)
- **MINOR**: New features (adding fields, new models)
- **PATCH**: Bug fixes, deprecations

```typescript
import { bumpVersion, compareVersions } from '@atakora/component/schema/versioning';

const newVersion = bumpVersion('1.2.3', 'minor'); // '1.3.0'
const comparison = compareVersions('1.0.0', '2.0.0'); // LESS
```

### 2. Field Deprecation

Mark fields as deprecated to prepare for removal:

```typescript
const schema = a.schema({
  User: c.model({
    id: a.id(),
    // Simple deprecation
    oldField: a.string().deprecated('Use newField instead'),

    // With removal version
    legacyField: a.string().deprecated('Will be removed', '3.0.0'),

    // With replacement path
    email: a.string().deprecated({
      reason: 'Use contactInfo.email instead',
      replacement: 'contactInfo.email',
      removeVersion: '3.0.0',
    }),
  }),
});
```

### 3. Migration Types

#### Field Migrations

```typescript
{
  type: 'renameField',
  model: 'User',
  from: 'name',
  to: 'fullName',
}

{
  type: 'changeFieldType',
  model: 'User',
  field: 'age',
  from: 'string',
  to: 'number',
  transform: (value) => parseInt(value, 10),
}

{
  type: 'addField',
  model: 'User',
  field: 'createdAt',
  defaultValue: () => new Date().toISOString(),
}

{
  type: 'removeField',
  model: 'User',
  field: 'temporaryField',
}
```

#### Model Migrations

```typescript
{
  type: 'renameModel',
  from: 'Users',
  to: 'User',
}

{
  type: 'mergeModels',
  from: ['UserProfile', 'UserSettings'],
  to: 'User',
  transform: (profile, settings) => ({
    ...profile,
    settings: settings,
  }),
}
```

## Migration Strategies

### 1. Automatic Migration

Let the system handle simple migrations:

```typescript
import { generateMigration } from '@atakora/component/schema/versioning';

const migration = generateMigration(oldSchema, newSchema);
// Automatically detects:
// - Field additions/removals
// - Field renames (heuristic-based)
// - Type changes
// - Model changes
```

### 2. Manual Migration

Define complex transformations manually:

```typescript
const migration: Migration = {
  from: '1.0.0',
  to: '2.0.0',
  changes: [
    {
      type: 'custom',
      description: 'Split name into first and last',
      transform: (data) => {
        const [firstName, ...lastParts] = (data.name || '').split(' ');
        return {
          ...data,
          firstName,
          lastName: lastParts.join(' '),
          name: undefined,
        };
      },
    },
  ],
};
```

### 3. Staged Migration

Gradually migrate data over time:

```typescript
const migration: Migration = {
  from: '1.0.0',
  to: '2.0.0',
  strategy: 'lazy', // 'eager' | 'lazy' | 'background'
  changes: [...],
  // Lazy: Migrate on read
  // Eager: Migrate all at once
  // Background: Migrate asynchronously
};
```

## Breaking Change Detection

The system automatically detects breaking changes:

```typescript
import { detectBreakingChanges } from '@atakora/component/schema/versioning';

const changes = detectBreakingChanges(oldSchema, newSchema);
// Returns:
// [
//   { type: 'field_removed', model: 'User', field: 'email' },
//   { type: 'field_type_changed', model: 'Post', field: 'count', from: 'number', to: 'string' },
//   { type: 'required_field_added', model: 'Product', field: 'price' }
// ]
```

## Migration Execution

### CLI Commands

```bash
# Generate migration
atakora schema migrate --from 1.0.0 --to 2.0.0

# Apply migration
atakora schema apply-migration --version 2.0.0

# Rollback migration
atakora schema rollback --to 1.0.0

# Validate migration
atakora schema validate-migration --file migration-2.0.0.ts
```

### Programmatic API

```typescript
import { MigrationRunner } from '@atakora/component/schema/versioning';

const runner = new MigrationRunner({
  schema: currentSchema,
  migrations: [...],
  database: cosmosClient,
});

// Run migration
await runner.migrate('2.0.0');

// Rollback
await runner.rollback('1.0.0');

// Get status
const status = await runner.getStatus();
// { currentVersion: '1.5.0', availableVersions: ['2.0.0', '2.1.0'] }
```

## Best Practices

### 1. Version Planning

- **Plan major versions** for breaking changes
- **Use minor versions** for new features
- **Use patch versions** for fixes and deprecations
- **Document all changes** in CHANGELOG

### 2. Deprecation Process

1. **Announce deprecation** with clear timeline
2. **Provide migration path** in deprecation message
3. **Support both old and new** during transition
4. **Remove in major version** after grace period

### 3. Testing Migrations

```typescript
import { testMigration } from '@atakora/component/schema/versioning';

describe('User schema migration', () => {
  it('should migrate from 1.0.0 to 2.0.0', async () => {
    const testData = {
      id: '123',
      name: 'John Doe',
      email: 'john@example.com',
    };

    const result = await testMigration(migration, testData);

    expect(result).toEqual({
      id: '123',
      fullName: 'John Doe',
      email: 'john@example.com',
    });
  });
});
```

### 4. Backward Compatibility

```typescript
// Support reading both old and new fields
const User = c.model({
  id: a.id(),
  // New field
  fullName: a.string().required(),
  // Keep old field for compatibility
  name: a.string().computed((data) => data.fullName).deprecated('Use fullName'),
});
```

## Advanced Features

### 1. Schema Registry

Track all schema versions:

```typescript
import { SchemaRegistry } from '@atakora/component/schema/versioning';

const registry = new SchemaRegistry();

registry.register('1.0.0', schemaV1);
registry.register('2.0.0', schemaV2);

const schema = registry.get('1.0.0');
const latest = registry.getLatest();
const history = registry.getHistory();
```

### 2. Migration Validation

Validate migrations before applying:

```typescript
import { validateMigration } from '@atakora/component/schema/versioning';

const validation = await validateMigration(migration, {
  sampleSize: 100, // Test on sample data
  strict: true, // Fail on any error
});

if (validation.errors.length > 0) {
  console.error('Migration validation failed:', validation.errors);
}
```

### 3. Schema Diff Visualization

```typescript
import { diffSchemas } from '@atakora/component/schema/versioning';

const diff = diffSchemas(oldSchema, newSchema);
// Returns structured diff for visualization
```

## Error Handling

```typescript
try {
  await runner.migrate('2.0.0');
} catch (error) {
  if (error instanceof MigrationError) {
    console.error('Migration failed:', error.message);
    console.error('Failed at:', error.failedChange);
    console.error('Affected records:', error.affectedRecords);

    // Attempt rollback
    await runner.rollback(error.previousVersion);
  }
}
```

## Performance Considerations

### Large-Scale Migrations

```typescript
const migration: Migration = {
  from: '1.0.0',
  to: '2.0.0',
  options: {
    batchSize: 100, // Process in batches
    parallel: true, // Run in parallel where possible
    timeout: 3600000, // 1 hour timeout
    checkpoint: true, // Enable checkpointing for resume
  },
  changes: [...],
};
```

### Progress Tracking

```typescript
runner.on('progress', (event) => {
  console.log(`Migration progress: ${event.processed}/${event.total}`);
});

runner.on('error', (error) => {
  console.error('Migration error:', error);
});

runner.on('complete', (summary) => {
  console.log('Migration complete:', summary);
});
```

## Integration with Backend

```typescript
import { defineBackend, defineSchema } from '@atakora/component';

const backend = defineBackend({
  schema: defineSchema(
    { ... },
    {
      version: '2.0.0',
      migrations: [...],
      versioningStrategy: {
        headerName: 'X-Schema-Version',
        queryParam: 'schema_version',
        defaultVersion: 'latest',
      },
    }
  ),
});
```

## Related Documentation

- [Schema Definition Guide](/docs/guides/schema-definition.md)
- [Field Types API Reference](/docs/reference/schema/field-types.md)
- [Migration CLI Reference](/docs/reference/cli/schema-migrate.md)
- [Schema Testing Guide](/docs/contributing/technical/testing/schema-testing.md)