# Backend Pattern Test Suite

Comprehensive test suite for the Backend Pattern implementation in @atakora/component.

## Overview

This test suite provides complete coverage of the Backend Pattern, including:

- **Unit Tests**: Core Backend class, ProviderRegistry, and utilities
- **Integration Tests**: Provider merging, resource provisioning, and component coordination
- **End-to-End Tests**: Complete scenarios with multiple components sharing resources
- **Performance Benchmarks**: Overhead measurements and scaling tests
- **Resource Limits**: Azure quota validation and limit enforcement
- **Backward Compatibility**: Traditional component usage without backend

## Test Files

### `fixtures.ts`

Reusable test fixtures, mock implementations, and helper functions.

**Key Components:**
- `MockConstruct`: CDK construct mock for testing
- `MockComponent`: Fully functional component implementation for testing
- `MockResourceProvider`: Provider implementation for testing
- Factory functions: `createMockRequirement()`, `createMockComponents()`, etc.
- Performance helpers: `measurePerformance()`, `measurePerformanceAsync()`

**Usage:**
```typescript
import {
  MockComponent,
  createMockComponentDefinition,
  measurePerformance
} from './fixtures';

const component = createMockComponentDefinition('user-api');
const { result, duration } = measurePerformance(() => {
  // Your test code
});
```

### `backend.test.ts`

Unit tests for the Backend class orchestration.

**Coverage:**
- Backend construction and configuration
- Component registration and validation
- Requirement collection and merging
- Resource provisioning workflow
- Component initialization
- Error handling and edge cases

**Key Test Cases:**
- Single and multiple component registration
- Duplicate component ID detection
- Provider validation
- Resource deduplication
- Complex component scenarios (10+ components)

**Run:**
```bash
npm test -- __tests__/backend/backend.test.ts
```

### `registry.test.ts`

Unit tests for the ProviderRegistry system.

**Coverage:**
- Provider registration and unregistration
- Provider discovery by type
- Requirement validation
- Type support checking
- Multi-provider scenarios

**Key Test Cases:**
- Provider indexing by supported types
- findProvider() with multiple matching providers
- validateRequirements() with missing types
- Registry state management across operations
- Performance with 100+ providers

**Run:**
```bash
npm test -- __tests__/backend/registry.test.ts
```

### `providers.test.ts`

Integration tests for all resource providers.

**Coverage:**

#### CosmosProvider
- Database and container merging
- Consistency level validation
- Partition key conflict detection
- Azure resource limits (25 databases, 100 containers)
- Capability merging

#### FunctionsProvider
- Runtime compatibility checking
- SKU selection (maximum strategy)
- Environment variable namespacing
- CORS settings merging

#### StorageProvider
- Container, queue, and table merging
- SKU validation
- Resource deduplication

**Key Test Cases:**
- Compatible requirement merging
- Incompatible configuration rejection
- Resource limit enforcement
- Provider-specific validation rules

**Run:**
```bash
npm test -- __tests__/backend/providers.test.ts
```

### `integration.test.ts`

End-to-end integration tests for complete scenarios.

**Coverage:**

#### Resource Sharing
- Multiple components sharing Cosmos DB
- Multiple components sharing Functions App
- Multiple components sharing Storage Account
- Simultaneous sharing of all resource types

#### defineBackend() API
- Typed backend creation
- Type-safe component access
- 15+ component efficiency test
- Error handling

#### Backward Compatibility
- Traditional component usage
- Backend-managed context detection
- Dual-mode component support

#### Resource Limits
- Cosmos DB 25-database limit
- Practical component count (20+)
- Storage container limits (500+)

#### Performance Benchmarks
- Overhead measurement (< 5% target)
- Linear scaling validation
- Initialization performance (< 100ms per component)

#### Complex Scenarios
- CRUD APIs sharing database
- Mixed component types
- Validation across all components
- Resource accessibility

**Run:**
```bash
npm test -- __tests__/backend/integration.test.ts
```

## Running Tests

### All Tests
```bash
npm test
```

### Backend Tests Only
```bash
npm run test:backend
```

### With Coverage
```bash
npm run test:coverage
```

### Watch Mode
```bash
npm run test:watch
```

### UI Mode (Interactive)
```bash
npm run test:ui
```

### Specific Test File
```bash
npm test -- __tests__/backend/backend.test.ts
```

### Specific Test Case
```bash
npm test -- -t "should share Cosmos DB across multiple components"
```

## Coverage Requirements

The test suite enforces these coverage thresholds:

- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 75%
- **Statements**: 80%

### Viewing Coverage

After running `npm run test:coverage`, open:
```
packages/component/coverage/index.html
```

## CI/CD Integration

Tests run automatically on:
- Every push to main/develop
- Every pull request
- Multiple OS (Ubuntu, Windows, macOS)
- Multiple Node versions (18.x, 20.x)

See `.github/workflows/component-tests.yml` for configuration.

### CI Jobs

1. **test**: Runs full test suite with coverage on all platforms
2. **backend-tests**: Focused Backend Pattern tests
3. **quality-checks**: TypeScript, linting, bundle size
4. **security-audit**: npm audit and Snyk scanning

## Test Quality Standards

### Test Organization
- Clear describe/it structure
- Descriptive test names following "should [behavior] when [condition]" pattern
- Proper setup/teardown with beforeEach/afterEach
- Isolated tests (no shared mutable state)

### Test Coverage
- All public APIs tested
- Error paths tested
- Edge cases covered
- Performance characteristics validated

### Test Performance
- Fast execution (< 10 seconds for full suite)
- No external dependencies
- Parallel execution where possible
- Proper timeout configuration

## Debugging Tests

### Enable Debug Output
```bash
DEBUG=atakora:* npm test
```

### Run Single Test
```bash
npm test -- -t "specific test name"
```

### Use Debugger
Add `debugger` statement and run:
```bash
node --inspect-brk ./node_modules/vitest/vitest.mjs run
```

### Check Test Output
```bash
npm test -- --reporter=verbose
```

## Adding New Tests

### 1. Use Existing Fixtures
```typescript
import { MockComponent, createMockComponents } from './fixtures';

const components = createMockComponents(5);
```

### 2. Follow Naming Conventions
```typescript
describe('FeatureName', () => {
  describe('methodName', () => {
    it('should [expected behavior] when [condition]', () => {
      // Test implementation
    });
  });
});
```

### 3. Use Performance Helpers
```typescript
import { measurePerformance } from './fixtures';

const { result, duration } = measurePerformance(() => {
  // Code to measure
});

expect(duration).toBeLessThan(100);
```

### 4. Test Both Success and Failure
```typescript
it('should succeed with valid input', () => {
  expect(() => validOperation()).not.toThrow();
});

it('should throw with invalid input', () => {
  expect(() => invalidOperation()).toThrow('expected error');
});
```

## Common Testing Patterns

### Testing Resource Sharing
```typescript
const backend = new Backend(scope, 'Test', config);

// Add multiple components requiring same resource
backend.addComponent(component1);
backend.addComponent(component2);

backend.initialize(scope);

// Verify single resource created
const resource = backend.getResource('cosmos', 'shared');
expect(resource).toBeDefined();
```

### Testing Configuration Merging
```typescript
const req1 = { resourceType: 'cosmos', config: { /* ... */ } };
const req2 = { resourceType: 'cosmos', config: { /* ... */ } };

const merged = provider.mergeRequirements([req1, req2]);

expect(merged.config).toMatchObject({ /* expected merged config */ });
```

### Testing Performance
```typescript
const { duration } = measurePerformance(() => {
  backend.initialize(scope);
});

expect(duration).toBeLessThan(100);
```

### Testing Validation
```typescript
const result = backend.validate();

expect(result.valid).toBe(true);
expect(result.errors).toBeUndefined();
```

## Troubleshooting

### Tests Fail on Windows
- Ensure path separators are correct
- Use `path.join()` instead of string concatenation
- Check line ending settings (CRLF vs LF)

### Coverage Below Threshold
```bash
npm run test:coverage -- --coverage.enabled
# Check uncovered lines in coverage/index.html
```

### Tests Timeout
- Increase timeout in vitest.config.ts
- Check for infinite loops or unresolved promises
- Use `--bail` flag to stop on first failure

### Mock Issues
- Ensure mocks are reset between tests
- Use `vi.clearAllMocks()` in beforeEach
- Check mock implementation matches interface

## Best Practices

1. **Keep Tests Fast**: Mock external dependencies
2. **Test Behavior, Not Implementation**: Focus on outcomes
3. **Use Descriptive Names**: Make failures self-explanatory
4. **Isolate Tests**: Each test should run independently
5. **Test Edge Cases**: Not just happy paths
6. **Maintain Test Quality**: Treat tests as production code
7. **Update Tests with Code**: Keep tests synchronized with implementation

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Azure CDK Testing Guide](../../../docs/testing.md)
- [Backend Pattern Documentation](../../src/backend/README.md)

## Support

For questions or issues with the test suite:
1. Check this README
2. Review test file comments
3. Check CI/CD logs
4. Contact the team
