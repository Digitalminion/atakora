# Migration Guides

[Getting Started](../../getting-started/README.md) > [Guides](../README.md) > **Migration**

---

This section provides guidance for migrating to new versions of Atakora and upgrading your infrastructure code to take advantage of new features and improvements.

## Available Guides

### [Migrating to @atakora/cdk Package](./migrating-to-cdk-package.md)

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

| Version | Status | Support Ends | Notes |
|---------|--------|--------------|-------|
| 2.x | Current | - | Latest features |
| 1.x | Maintenance | 2025-06-01 | Critical bugs only |
| 0.x | Unsupported | 2024-01-01 | Migrate to 1.x+ |

## Next Steps

- **[Migrating to @atakora/cdk](./migrating-to-cdk-package.md)**: Start with the CDK migration guide
- **[Testing Infrastructure](../workflows/testing-infrastructure.md)**: Test your migrated code
- **[Examples](../../examples/README.md)**: Reference migrated example projects

---

**Feedback**: Found an issue or have a suggestion? [Open an issue](https://github.com/your-org/atakora/issues) on GitHub.
