# REST API Testing Strategy

> **Note**: This documentation has been consolidated from test infrastructure files previously located in `packages/cdk/__tests__/api/rest/`.

## Overview

This document outlines the comprehensive testing strategy for the REST API implementation. The test infrastructure supports unit tests, integration tests, and end-to-end validation of REST API constructs and their synthesis to ARM templates.

## Test Infrastructure Status

**Current Status**: Test infrastructure is complete and templated with `.todo()` markers awaiting interface completion.

**Blocked On**:
- `IRestOperation` interface completion
- `RestOperationBuilder` implementation
- `OpenApiImporter` and `OpenApiExporter` implementation
- `RestApiStack` construct

## Directory Structure

```
packages/cdk/__tests__/api/rest/
├── utils.ts                           # Test utilities and mock helpers
├── unit/                              # Unit tests
│   ├── operation.test.ts             # IRestOperation interface tests
│   └── builder.test.ts               # RestOperationBuilder tests
├── integration/                       # Integration tests
│   ├── stack.test.ts                 # RestApiStack synthesis tests
│   └── openapi.test.ts               # OpenAPI import/export tests
└── fixtures/                          # Test fixtures
    ├── sample-operations.ts          # Sample REST operations
    ├── sample-openapi.json           # OpenAPI 3.0.3 spec
    ├── sample-openapi-3.1.json       # OpenAPI 3.1.0 spec
    ├── invalid-openapi.json          # Invalid spec for error testing
    └── mock-resources.ts             # Mock Azure resources
```

## Test Coverage Goals

- **Unit Tests**: 100% coverage on public APIs
- **Integration Tests**: 85% coverage on stack synthesis
- **Type Safety**: Compile-time validation of all types
- **OpenAPI**: Full 3.0.x and 3.1.0 support validation
- **Backend Integration**: All Azure backend types tested
- **Security**: Authentication and authorization validation

## Running Tests

### Run All REST API Tests
```bash
npm test -- __tests__/api/rest
```

### Run Unit Tests Only
```bash
npm test -- __tests__/api/rest/unit
```

### Run Integration Tests Only
```bash
npm test -- __tests__/api/rest/integration
```

### Run with Coverage
```bash
npm test -- --coverage __tests__/api/rest
```

### Watch Mode
```bash
npm test -- --watch __tests__/api/rest
```

## Test Utilities

### Mock Resources
```typescript
import {
  mockApiManagementService,
  mockFunctionApp,
  mockAppService,
  mockContainerApp,
} from './utils';

const apim = mockApiManagementService();
const functionApp = mockFunctionApp({ name: 'my-func' });
```

### Operation Builders
```typescript
import {
  createSampleOperation,
  createGetOperation,
  createPostOperation,
  createAuthenticatedOperation,
  createPaginatedOperation,
} from './utils';

const getOp = createGetOperation('/users/{id}');
const authOp = createAuthenticatedOperation();
```

### Assertion Helpers
```typescript
import {
  expectValidOperation,
  expectValidOpenApiSpec,
  expectValidArmTemplate,
} from './utils';

expectValidOperation(operation);
expectValidOpenApiSpec(spec);
expectValidArmTemplate(template);
```

### Performance Testing
```typescript
import {
  measureExecutionTime,
  expectExecutionTime,
  measureMemoryUsage,
} from './utils';

const { result, duration } = await measureExecutionTime(() => {
  return buildOperation();
});

await expectExecutionTime(() => synthesize(), 100); // < 100ms
```

## Unit Test Coverage

### Core Operation Tests
- IRestOperation interface structure validation
- HTTP method enum validation
- Path/query/header parameter type inference
- Request body type inference
- Response type inference
- JSON Schema validation
- Error response (RFC 7807) structure validation

### Builder Pattern Tests
- Basic operation construction
- Metadata configuration
- Parameter type inference
- Backend configuration
- Security requirements
- Policy configuration
- Fluent method chaining
- Build validation
- Helper functions (get, post, put, patch, del)

### Helper Function Tests
- Versioning (path, header, query, content-negotiation)
- Pagination (offset, cursor, page-based)
- Filtering (RSQL, OData, MongoDB, simple)
- Sorting (multi-field, direction validation)
- Field Selection (projection)
- Caching (ETag, Last-Modified, conditional requests)
- Authentication (OAuth, OIDC, Azure AD, API Key, Certificates)
- Authorization (RBAC, ABAC)
- Rate Limiting (fixed/sliding window, token/leaky bucket)
- Validation (content-type, size, schema, parameters)
- Error Handling (RFC 7807 Problem Details)
- Observability (W3C Trace Context, correlation IDs)

## Integration Tests

### Stack Synthesis Tests
- Basic REST API stack creation
- Operation registration
- Multiple operations registration
- Backend integration
- Policy application
- ARM template generation
- Resource property validation
- Versioned API creation
- Paginated endpoint creation
- Authenticated endpoint creation
- Rate-limited endpoint creation

### OpenAPI Integration Tests

#### Import Tests
- Import OpenAPI 3.0.0/3.0.3/3.1.0 specifications
- Import from JSON/YAML/URL
- Parameter conversion (path, query, header)
- Request/response body conversion
- $ref resolution
- Components schema resolution
- Security scheme conversion
- Validation error handling

#### Export Tests
- Export to OpenAPI 3.0.3/3.1.0
- Operation grouping by path
- Parameter/request/response conversion
- Schema extraction to components
- Security scheme extraction

## Performance Targets

- **Single operation synthesis**: < 100ms
- **10 operations synthesis**: < 500ms
- **100 operations synthesis**: < 5s
- **OpenAPI import (1000 ops)**: < 10s
- **Memory footprint**: < 50MB for typical stack

## Security Test Cases

### Authentication Tests
- OAuth 2.0 token validation
- Azure AD token validation (Commercial and Government clouds)
- API Key validation (header, query)
- Client certificate validation
- JWT claims validation
- Token expiration handling
- Invalid token rejection

### Authorization Tests
- RBAC with single/multiple roles
- ABAC with conditions
- Forbidden access (403)
- Unauthorized access (401)

### Input Validation Tests
- XSS prevention
- SQL injection prevention
- Request size limit enforcement
- Content-Type validation
- Schema validation
- Parameter type/format validation

## Test Templates

All tests are currently templated with `it.todo()` markers. Once interfaces are implemented:

1. Replace `it.todo()` with `it()`
2. Update imports to use actual CDK types
3. Implement test logic based on templates
4. Remove placeholder type definitions from utils.ts

Example conversion:
```typescript
// Before (template)
it.todo('should create GET operation builder');

// After (implementation)
it('should create GET operation builder', () => {
  const builder = get('/users');
  expect(builder).toBeInstanceOf(RestOperationBuilder);
  expect(builder.build().method).toBe('GET');
});
```

## Validation Checklist

Before marking tests as complete:

- [ ] All `.todo()` markers removed
- [ ] Actual CDK types imported
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Coverage thresholds met (80%+)
- [ ] Type safety validated
- [ ] Performance benchmarks met
- [ ] Edge cases covered
- [ ] Error scenarios tested
- [ ] Documentation updated

## CI/CD Integration

These tests are configured to run in the CI/CD pipeline:

- **PR Checks**: All unit tests must pass
- **Coverage**: Must meet 80% threshold
- **Integration Tests**: Run on main branch
- **Performance Tests**: Run nightly

## Success Metrics

### Coverage Metrics
- **Unit Test Coverage**: ≥ 95%
- **Integration Test Coverage**: ≥ 85%
- **Type Coverage**: 100%
- **Documentation Coverage**: 100% of public APIs

### Quality Metrics
- **Test Pass Rate**: 100%
- **Flaky Test Rate**: < 1%
- **Test Execution Time**: < 30s for unit tests, < 2min for integration tests
- **Code Review Coverage**: 100% of test code reviewed

### Performance Metrics
- **Synthesis Time**: < 100ms per operation
- **Memory Usage**: < 50MB for typical stack
- **Bundle Size Impact**: < 10KB added to @atakora/cdk

## Test Report Template

When running full test suites, use this structure for reporting:

### Executive Summary
- Total Tests
- Pass Rate
- Coverage Percentage
- Build Time
- Test Duration

### Status by Phase
Track test results across implementation phases:
- Phase 1: Core Interfaces
- Phase 2: OpenAPI Support
- Phase 3: Builder Pattern
- Phase 4: Stack Integration
- Phase 5: Synthesis Pipeline
- Phase 6: Advanced Features

### Performance Metrics
- Operation Creation Time
- OpenAPI Import/Export Time
- Synthesis Time
- Large-Scale Test Results

### Security Testing Results
- Input Sanitization
- $ref Resolution Security
- Secrets Protection
- Government Cloud Compatibility

### Type Safety Validation
- Generic Type Inference
- Readonly Properties
- Builder Pattern Type Safety
- Schema Validation

## Next Steps

1. Wait for interface completion
2. Convert templates to actual tests
3. Achieve coverage targets
4. Performance validation
5. Security audit

## References

- Test infrastructure: `packages/cdk/__tests__/api/rest/`
- Vitest configuration: `packages/cdk/vitest.config.ts`
- Coverage requirements: See CI/CD configuration
- Related ADRs: ADR-014 (Core Architecture), ADR-015 (Advanced Features)

---

**Last Updated**: 2025-10-10
**Status**: Infrastructure complete, awaiting interface implementation
