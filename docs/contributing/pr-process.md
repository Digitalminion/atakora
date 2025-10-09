# Pull Request Process

**Navigation**: [Docs Home](../README.md) > [Contributing](./README.md) > PR Process

---

## Overview

This guide explains how to submit pull requests to Atakora.

## Before You Start

1. Check for existing issues
2. Discuss major changes first
3. Fork the repository
4. Create a feature branch

## Creating a Pull Request

### 1. Create Feature Branch

```bash
git checkout -b feature/your-feature-name
```

Branch naming:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation
- `refactor/` - Code refactoring

### 2. Make Changes

Follow [code standards](./README.md#code-standards).

### 3. Test Thoroughly

```bash
npm run build
npm test
npm run lint
```

### 4. Commit Changes

Use conventional commits:

```bash
git commit -m "feat: add virtual network construct"
git commit -m "fix: resolve naming collision"
git commit -m "docs: update API reference"
```

### 5. Push Branch

```bash
git push origin feature/your-feature-name
```

### 6. Open Pull Request

On GitHub:
1. Click "New Pull Request"
2. Select your branch
3. Fill out PR template
4. Submit

## PR Template

```markdown
## Description
Brief description of changes.

## Related Issue
Fixes #123

## Changes
- Added VirtualNetwork construct
- Updated documentation
- Added tests

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

## Review Process

1. **Automated Checks**: CI runs tests and linting
2. **Code Review**: Maintainer reviews code
3. **Feedback**: Address review comments
4. **Approval**: Maintainer approves PR
5. **Merge**: Maintainer merges PR

## See Also

- [Development Setup](./development-setup.md)
- [Testing Guide](./testing-guide.md)
- [Contributing Guide](./README.md)

---

**Last Updated**: 2025-10-08
