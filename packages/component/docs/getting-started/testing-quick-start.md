# Testing Quick Start Guide

## Installation

```bash
cd packages/component
npm install
```

## Running Tests

### Basic Commands

```bash
# Run all tests (single run)
npm test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Run tests with UI (visual interface)
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

### Specific Test Files

```bash
# Run single test file
npx vitest run src/common/builder.spec.ts

# Run all common utility tests
npx vitest run src/common/*.spec.ts

# Run tests matching pattern
npx vitest run --grep "BaseBuilder"
```

## Viewing Coverage

```bash
# Generate coverage report
npm run test:coverage

# Open HTML coverage report
open coverage/index.html
```

## Test File Locations

All test files are inline with source code:

```
src/common/
├── builder.ts
├── builder.spec.ts       ← Tests for BaseBuilder
├── duration.ts
├── duration.spec.ts      ← Tests for Duration utilities
├── threshold.ts
├── threshold.spec.ts     ← Tests for Threshold builders
├── size.ts
├── size.spec.ts          ← Tests for Size utilities
├── network.ts
└── network.spec.ts       ← Tests for Network utilities
```

## Writing New Tests

### Test File Template

```typescript
import { describe, it, expect } from 'vitest';
import { YourModule } from './your-module';

describe('YourModule', () => {
  describe('featureName', () => {
    it('should behavior when condition', () => {
      // Arrange
      const input = /* ... */;

      // Act
      const result = /* ... */;

      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

### Common Patterns

#### Test Method Chaining

```typescript
it('should chain methods', () => {
  const result = builder.method1('value1').method2('value2').build();

  expect(result).toEqual(expected);
});
```

#### Test Error Throwing

```typescript
it('should throw on invalid input', () => {
  expect(() => {
    doSomething('invalid');
  }).toThrow('Expected error message');
});
```

#### Test Conversions

```typescript
it('should convert between units', () => {
  const value = megabytes(1);

  expect(value.toKilobytes()).toBe(1024);
  expect(value.toBytes()).toBe(1048576);
});
```

## Coverage Targets

| Metric     | Target | Common Utils Status |
| ---------- | ------ | ------------------- |
| Lines      | >80%   | ✅ >95%             |
| Functions  | >80%   | ✅ >95%             |
| Branches   | >75%   | ✅ >95%             |
| Statements | >80%   | ✅ >95%             |

## Performance Benchmarks

Tests should execute quickly:

- Individual test suite: <1 second
- All common utility tests: <5 seconds
- Performance tests: <100ms for 10,000 operations

## Troubleshooting

### Tests not running?

```bash
# Reinstall dependencies
npm install

# Clear cache
npx vitest run --clearCache
```

### Coverage not generating?

```bash
# Ensure coverage package is installed
npm install --save-dev @vitest/coverage-v8

# Run with coverage flag
npm run test:coverage
```

### Import errors?

Check `vitest.config.ts` for correct alias configuration:

```typescript
resolve: {
  alias: {
    '@atakora/component': path.resolve(__dirname, './src'),
  },
}
```

## VS Code Integration

### Recommended Extensions

- **Vitest** (`vitest.explorer`) - Run tests from sidebar
- **Error Lens** - Inline error display
- **Coverage Gutters** - Show coverage in editor

### Run Tests from VS Code

1. Install Vitest extension
2. Click "Testing" icon in sidebar
3. Run individual tests or full suites

## CI/CD Integration

Tests are ready for CI/CD:

```yaml
# Example GitHub Actions
- name: Run tests
  run: npm test

- name: Generate coverage
  run: npm run test:coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

## Next Steps

After common utilities tests pass:

1. Review coverage report
2. Address any gaps <90%
3. Move to Phase 2: Schema system tests
4. Continue TDD approach for new features

---

**Questions?** See `TEST_INFRASTRUCTURE_SUMMARY.md` for detailed documentation.
