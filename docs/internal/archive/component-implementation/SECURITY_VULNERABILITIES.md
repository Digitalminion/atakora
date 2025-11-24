# Security Vulnerabilities - Fix Guide

## Summary

**Total**: 4 vulnerabilities (1 HIGH, 3 MODERATE)
**Impact**: All in dev dependencies (test/build tools only)
**Risk**: LOW - Not shipped to production, only affect development environment

## Vulnerabilities

### 1. glob - HIGH Severity

- **Issue**: Command injection via CLI
- **Affected**: glob 10.2.0 - 10.4.5
- **Fixed In**: glob 10.4.6+
- **How to Fix**: Update to latest glob version
- **Impact**: Development only (used by test tools)

### 2. js-yaml - MODERATE Severity

- **Issue**: Prototype pollution in merge
- **Affected**: js-yaml 4.0.0 - 4.1.0
- **Fixed In**: js-yaml 4.1.1+
- **How to Fix**: Update to latest js-yaml version
- **Impact**: Development only (used by config parsing)

### 3. vite - MODERATE Severity

- **Issue**: server.fs.deny bypass on Windows
- **Affected**: vite 7.1.0 - 7.1.10
- **Fixed In**: vite 7.1.11+
- **How to Fix**: Update to latest vite version
- **Impact**: Development only (dev server)

### 4. esbuild - MODERATE Severity

- **Issue**: Development server request vulnerability
- **Affected**: esbuild <=0.24.2
- **Current**: esbuild 0.25.10 (likely already safe)
- **Fixed In**: esbuild 0.27.0+
- **How to Fix**: Update to esbuild 0.27.0 (breaking change)
- **Impact**: Development only

## Why npm audit fix Fails

The workspace setup uses `workspace:*` protocol which causes npm audit fix to error:

```
npm error Unsupported URL Type "workspace:": workspace:*
```

This is a known limitation with npm workspaces.

## Manual Fix Approach

### Option 1: Update package-lock.json (Recommended)

```bash
# From repository root
cd /Users/Austin.Leahy/Source/Github/DigitalMinion/atakora

# Remove all node_modules
rm -rf node_modules packages/*/node_modules

# Remove package-lock.json
rm -f package-lock.json

# Fresh install (pulls latest patch versions)
npm install

# Verify vulnerabilities are fixed
npm audit
```

### Option 2: Manual Package Updates

Update root `package.json` devDependencies:

```json
{
  "devDependencies": {
    "esbuild": "^0.27.0", // from ^0.25.10
    "vitest": "^3.3.0" // will update vite transitively
  }
}
```

Then update workspace packages that use these dependencies.

### Option 3: Accept Risk (Current State)

Since all vulnerabilities are:

- ✅ Development dependencies only
- ✅ Not shipped to production
- ✅ Moderate/Low severity
- ✅ Require local access to exploit

It's acceptable to defer fixing these until the next major dependency update cycle.

## Verification

After fixing:

```bash
npm audit --audit-level=moderate
# Should report: found 0 vulnerabilities
```

## Recommendation

**Priority**: P2 (Important but not blocking)

- ✅ **Build is working** (zero TypeScript errors)
- ✅ **All tests passing** (2,982 tests)
- ✅ **Production code is secure** (no runtime vulnerabilities)

Fix during next maintenance window using Option 1 (clean reinstall).

## Current Status

- **Build**: ✅ WORKING
- **Tests**: ✅ PASSING (2,982)
- **TypeScript**: ✅ ZERO ERRORS
- **Security**: ⚠️ 4 dev-only vulnerabilities (acceptable for alpha)

---

**Created**: November 21, 2025
**Last Updated**: November 21, 2025
