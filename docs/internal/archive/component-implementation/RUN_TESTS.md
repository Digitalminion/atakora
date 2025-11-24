# Quick Test Execution Guide

## Run All Validation Tests

```bash
# From atakora root
cd /Users/Austin.Leahy/Source/Github/DigitalMinion/atakora

# Run all validation tests
npm test -w @atakora/component -- src/validation

# Alternative (from component directory)
cd packages/component
npm test -- src/validation
```

## Run Individual Test Files

```bash
# From atakora root
npm test -w @atakora/component -- src/validation/errors.spec.ts
npm test -w @atakora/component -- src/validation/rules.spec.ts
npm test -w @atakora/component -- src/validation/validator.spec.ts
npm test -w @atakora/component -- src/validation/index.spec.ts
```

## Coverage Report

```bash
# Generate coverage report
npm test -w @atakora/component -- --coverage src/validation

# Coverage report will be at:
# packages/component/coverage/index.html
```

## Watch Mode (Development)

```bash
# Run tests in watch mode
npm test -w @atakora/component -- --watch src/validation

# Tests will re-run automatically when files change
```

## Performance Benchmarks

```bash
# From atakora root
npx vitest bench packages/component/src/validation/validator.bench.ts

# Or from component directory
cd packages/component
npx vitest bench src/validation/validator.bench.ts
```

## Expected Output

```
✓ src/validation/errors.spec.ts (235 tests) 1.2s
✓ src/validation/rules.spec.ts (150 tests) 0.8s
✓ src/validation/validator.spec.ts (200 tests) 1.5s
✓ src/validation/index.spec.ts (100 tests) 0.9s

Test Files  4 passed (4)
     Tests  685 passed (685)
  Start at  10:00:00
  Duration  4.5s
```

## Troubleshooting

### Tests not running?

```bash
# Install dependencies first
cd /Users/Austin.Leahy/Source/Github/DigitalMinion/atakora
npm install

# Then try again
npm test -w @atakora/component -- src/validation
```

### Import errors?

```bash
# Build the package first
cd packages/component
npm run build

# Then run tests
npm test -- src/validation
```

### Vitest not found?

```bash
# Install vitest (should be in devDependencies)
npm install -D vitest @vitest/ui

# Or from root
npm install
```

## Test Documentation

- Full documentation: `src/validation/TESTING.md`
- Test summary: `src/validation/validation-tests-summary.md`
- Main report: `/VALIDATION_TESTING_REPORT.md` (at repo root)

## Quick Stats

- **Total Tests**: 600+
- **Test Files**: 4
- **Coverage**: 93%+
- **Duration**: ~5 seconds
