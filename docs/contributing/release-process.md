# Release Process

**Navigation**: [Docs Home](../README.md) > [Contributing](./README.md) > Release Process

---

## Overview

Atakora follows semantic versioning and automated releases via CI/CD.

## Version Numbers

Format: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

## Release Workflow

### 1. Prepare Release

```bash
# Update version
npm version major|minor|patch

# Update CHANGELOG.md
# Add release notes
```

### 2. Create Release PR

```bash
git checkout -b release/v1.2.3
git push origin release/v1.2.3
```

### 3. Review and Merge

Team reviews release PR and merges to main.

### 4. Tag Release

```bash
git tag v1.2.3
git push origin v1.2.3
```

### 5. Automated Publication

CI/CD automatically:
1. Builds packages
2. Runs tests
3. Publishes to npm
4. Creates GitHub release

## See Also

- [Contributing Guide](./README.md)
- [PR Process](./pr-process.md)

---

**Last Updated**: 2025-10-08
