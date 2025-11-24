# Migration Guides

[Getting Started](../../getting-started/README.md) > [Guides](../README.md) > **Migration**

---

This section provides guidance for migrating to new versions of Atakora and upgrading your infrastructure code to take advantage of new features and improvements.

## Available Guides

### [Migrating to @atakora/cdk Package](./MIGRATING-TO-CDK-PACKAGE.md)

Comprehensive guide for migrating from the monolithic `@atakora/lib` package to the new modular `@atakora/cdk` package structure. This guide covers:

- Why the migration is beneficial
- What changed in the new architecture
- Step-by-step migration instructions
- Updating imports across your codebase
- Breaking changes and how to handle them
- Backward compatibility strategy
- Testing your migration
- Common migration issues and solutions

**Who should read this**: Anyone currently using `@atakora/lib` who wants to migrate to the new package structure.

### [CDK-Only Imports Migration](./MIGRATION-TO-CDK-IMPORTS.md)

Critical migration required for v1.1.0+ - all framework classes must now be imported from `@atakora/cdk` rather than `@atakora/lib`.

- Breaking change requirements
- Quick migration steps
- Import pattern updates
- Automated migration tools
- Troubleshooting guide

**Who should read this**: All users upgrading to Atakora v1.1.0 or later.

### [Backend Pattern Migration](./BACKEND-PATTERN-MIGRATION.md)

Guide for migrating from traditional component patterns to the new Backend Pattern for resource sharing and cost optimization.

- Cost benefits and resource sharing
- Step-by-step migration process
- Component-specific migrations
- Testing strategies
- Rollback procedures

**Who should read this**: Teams looking to optimize infrastructure costs through resource sharing.

### [Unified Events Migration](./UNIFIED-EVENTS-MIGRATION.md)

Migrate from scattered event infrastructure to the unified events namespace.

- Consolidate queue processors, event topics, and service bus
- Single import for all event types
- Progressive enhancement patterns
- Preset configurations
- Advanced monitoring features

**Who should read this**: Anyone using Storage Queues, Event Grid, or Service Bus.

### [Azure RBAC Grant Pattern](./RBAC-MIGRATION.md)

Migrate from manual Azure role assignments to the declarative RBAC Grant Pattern.

- Type-safe permission management
- Simplified role assignments
- Built-in role definitions
- Cross-resource permissions
- Audit and compliance features

**Who should read this**: Teams managing complex Azure permissions and role assignments.

### [REST API Migration](./REST-API-MIGRATION.md)

Comprehensive guide for migrating REST APIs from various platforms to Atakora.

- Azure API Management Portal migration
- Azure Functions Proxies migration
- Express.js to Atakora
- OpenAPI specification import
- Automation scripts and tools

**Who should read this**: Teams migrating existing APIs to Atakora infrastructure-as-code.

## Migration Philosophy

Atakora follows semantic versioning and provides clear migration paths for breaking changes:

### Semantic Versioning

- **Patch releases** (1.0.x): Bug fixes, no breaking changes
- **Minor releases** (1.x.0): New features, backward compatible
- **Major releases** (x.0.0): Breaking changes, migration required

### Migration Support

For major version upgrades:

1. **Deprecation warnings**: Features marked deprecated in previous minor release
2. **Migration guides**: Detailed documentation for all breaking changes
3. **Automated tools**: Scripts to help automate common migration tasks
4. **Support period**: Old versions supported for 6 months after new major release

## Planning Your Migration

### Assessment

Before migrating:

1. **Review changelog**: Understand what changed
2. **Read migration guide**: Understand migration steps
3. **Check compatibility**: Ensure your dependencies support new version
4. **Plan testing**: Allocate time for thorough testing
5. **Backup**: Create backup of current infrastructure state

### Testing Strategy

1. **Create test branch**: Don't migrate main branch directly
2. **Migrate one package**: Start with smallest/simplest package
3. **Run tests**: Verify unit and integration tests pass
4. **Deploy to dev**: Test in development environment
5. **Validate**: Ensure infrastructure works as expected
6. **Iterate**: Migrate remaining packages

### Rollback Plan

Always have a rollback strategy:

```bash
# Backup current package-lock.json
cp package-lock.json package-lock.json.backup

# Backup current infrastructure state
atakora export > infrastructure-backup.json

# After migration, if issues occur:
git checkout -- package.json package-lock.json
npm install
atakora import < infrastructure-backup.json
```

## Migration Tools

### Automated Import Updates

Use codemod tools to automate import updates:

```bash
# Install jscodeshift
npm install -g jscodeshift

# Run codemod to update imports
jscodeshift -t scripts/codemods/update-imports.js src/

# Review changes
git diff
```

### Deprecation Scanner

Find deprecated API usage:

```bash
# Scan codebase for deprecated APIs
atakora scan-deprecations

# Output:
# Found 5 uses of deprecated APIs:
# - Stack.addResource() is deprecated, use Stack.addChild()
#   src/stacks/webapp.ts:25
# - StorageAccount.enableHttps is deprecated, use properties.supportsHttpsTrafficOnly
#   src/stacks/storage.ts:15
```

## Getting Help

If you encounter issues during migration:

1. **Check migration guide**: Answers to common problems
2. **Review examples**: See [migrated example projects](../../examples/README.md)
3. **Search issues**: Check GitHub issues for similar problems
4. **Ask for help**: Create GitHub issue or discussion

## Version Support Policy

| Version | Status      | Support Ends | Notes              |
| ------- | ----------- | ------------ | ------------------ |
| 2.x     | Current     | -            | Latest features    |
| 1.x     | Maintenance | 2025-06-01   | Critical bugs only |
| 0.x     | Unsupported | 2024-01-01   | Migrate to 1.x+    |

## Next Steps

- **[Migrating to @atakora/cdk](./MIGRATING-TO-CDK-PACKAGE.md)**: Start with the CDK migration guide
- **[Testing Infrastructure](../Workflows/TESTING-INFRASTRUCTURE.md)**: Test your migrated code
- **[Examples](../../examples/README.md)**: Reference migrated example projects

---

**Feedback**: Found an issue or have a suggestion? [Open an issue](https://github.com/your-org/atakora/issues) on GitHub.
