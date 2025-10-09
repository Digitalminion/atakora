# Testing Guide

**Navigation**: [Docs Home](../README.md) > [Contributing](./README.md) > Testing Guide

---

## Overview

Atakora uses Vitest for testing. All code should have comprehensive unit and integration tests.

## Running Tests

### All Tests

```bash
npm test
```

### Specific Package

```bash
npm test --workspace=packages/lib
```

### Watch Mode

```bash
npm run test --watch
```

### Coverage

```bash
npm run test:coverage
```

## Writing Tests

### Unit Tests

Test individual functions and classes:

```typescript
import { describe, it, expect } from 'vitest';
import { generateResourceName } from '../src/naming';

describe('generateResourceName', () => {
  it('should generate valid resource name', () => {
    const name = generateResourceName(
      'virtualNetwork',
      'MyVNet',
      'production',
      'eastus'
    );

    expect(name).toBe('vnet-myvnet-prod-eastus');
  });

  it('should handle special characters', () => {
    const name = generateResourceName(
      'virtualNetwork',
      'My-VNet',
      'production',
      'eastus'
    );

    expect(name).toBe('vnet-my-vnet-prod-eastus');
  });
});
```

### Integration Tests

Test multiple components together:

```typescript
import { describe, it, expect } from 'vitest';
import { App, Stack } from '../src/core';
import { VirtualNetwork } from '../src/resources/network';

describe('VirtualNetwork Integration', () => {
  it('should synthesize to ARM template', () => {
    const app = new App();
    const stack = new Stack(app, 'test', {
      environment: 'test',
      location: 'eastus'
    });

    new VirtualNetwork(stack, 'VNet', {
      addressSpace: { addressPrefixes: ['10.0.0.0/16'] }
    });

    const result = app.synth();

    expect(result.stacks).toHaveLength(1);
    expect(result.stacks[0].resources).toContainEqual(
      expect.objectContaining({
        type: 'Microsoft.Network/virtualNetworks'
      })
    );
  });
});
```

## Test Organization

### File Structure

```
packages/lib/src/
├── naming/
│   ├── generator.ts
│   └── generator.test.ts      # Tests alongside code
├── core/
│   ├── app.ts
│   └── app.test.ts
```

### Naming Convention

- Test files: `*.test.ts`
- Integration tests: `*.integration.test.ts`
- E2E tests: `*.e2e.test.ts`

## Test Patterns

### Arrange-Act-Assert

```typescript
it('should do something', () => {
  // Arrange
  const input = 'test';

  // Act
  const result = functionUnderTest(input);

  // Assert
  expect(result).toBe('expected');
});
```

### Test Fixtures

```typescript
const createTestStack = () => {
  const app = new App();
  return new Stack(app, 'test', {
    environment: 'test',
    location: 'eastus'
  });
};

it('should use test fixture', () => {
  const stack = createTestStack();
  // ... test code
});
```

## Code Coverage

### Target

- Overall: 80% minimum
- Critical paths: 100%
- New code: 90% minimum

### View Coverage

```bash
npm run test:coverage
open coverage/index.html
```

## See Also

- [Development Setup](./development-setup.md)
- [PR Process](./pr-process.md)

---

**Last Updated**: 2025-10-08
