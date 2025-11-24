# Week 2 Testing Guide

Comprehensive testing infrastructure for Week 2 sprint features including service registry, function handlers, and authentication token validation.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Testing Services](#testing-services)
- [Testing with Tokens](#testing-with-tokens)
- [Testing Handlers](#testing-handlers)
- [Mock Usage Examples](#mock-usage-examples)
- [Common Test Patterns](#common-test-patterns)
- [Performance Testing](#performance-testing)
- [Integration Scenarios](#integration-scenarios)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

Week 2 focuses on three core areas:

1. **Service Registry** - Dependency injection for function handlers
2. **Function Handlers** - HTTP request handling and middleware
3. **Auth Token Validation** - JWT and API key validation

This guide provides comprehensive testing infrastructure for all three areas.

## Quick Start

### Installation

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run benchmarks
npm run test:bench
```

### Your First Test

```typescript
import { describe, it, expect } from 'vitest';
import { createMockServices } from '../__tests__/fixtures/services';
import { generateValidToken } from '../__tests__/helpers/token-helpers';
import { createAuthorizedRequest, executeHandler } from '../__tests__/helpers/handler-helpers';

describe('My Feature', () => {
  it('should process authenticated request with services', async () => {
    // Setup
    const services = createMockServices();
    const token = generateValidToken();
    const request = createAuthorizedRequest(token);

    // Handler
    const handler = async (ctx, req) => {
      services.logging.info('Processing request');
      return { status: 200, body: { success: true }, headers: {} };
    };

    // Execute
    const { result } = await executeHandler(handler, request);

    // Assert
    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);
  });
});
```

## Testing Services

### Available Mock Services

The test infrastructure provides five core mock services:

1. **EmailService** - Email sending and tracking
2. **LoggingService** - Structured logging
3. **CacheService** - In-memory caching
4. **QueueService** - Message queuing
5. **NotificationService** - User notifications

### Email Service Testing

```typescript
import { createMockServices, MockEmailService } from '../__tests__/fixtures/services';

describe('Email Service', () => {
  it('should send email successfully', async () => {
    const services = createMockServices();

    const result = await services.email.sendEmail(
      'user@example.com',
      'Welcome',
      'Welcome to our app!'
    );

    expect(result.sent).toBe(true);
    expect(result.messageId).toBeTruthy();

    // Verify email was sent
    const sentEmails = (services.email as MockEmailService).getSentEmails();
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].to).toBe('user@example.com');
  });

  it('should handle email failures', async () => {
    const services = createMockServices();

    // Configure to fail
    (services.email as MockEmailService).setFailureRate(1.0);

    const result = await services.email.sendEmail('user@example.com', 'Test', 'Body');

    expect(result.sent).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('should send bulk emails', async () => {
    const services = createMockServices();

    const recipients = ['user1@example.com', 'user2@example.com', 'user3@example.com'];

    const result = await services.email.sendBulkEmail(recipients, 'Announcement', 'Important news');

    expect(result.totalSent).toBe(3);
    expect(result.totalFailed).toBe(0);
    expect(result.messageIds).toHaveLength(3);
  });
});
```

### Logging Service Testing

```typescript
import { createMockServices, MockLoggingService } from '../__tests__/fixtures/services';

describe('Logging Service', () => {
  it('should log messages', () => {
    const services = createMockServices();

    services.logging.info('Test message', { userId: '123' });
    services.logging.warn('Warning message');
    services.logging.error('Error message', new Error('Test error'));

    const logs = (services.logging as MockLoggingService).getLogs();
    expect(logs).toHaveLength(3);

    const infoLogs = (services.logging as MockLoggingService).getLogsByLevel('info');
    expect(infoLogs).toHaveLength(1);
  });
});
```

### Cache Service Testing

```typescript
import { createMockServices } from '../__tests__/fixtures/services';

describe('Cache Service', () => {
  it('should cache and retrieve values', async () => {
    const services = createMockServices();

    // Set
    await services.cache.set('user:123', { name: 'John Doe' });

    // Get
    const cached = await services.cache.get('user:123');
    expect(cached).toEqual({ name: 'John Doe' });

    // Has
    const exists = await services.cache.has('user:123');
    expect(exists).toBe(true);
  });

  it('should handle TTL expiration', async () => {
    const services = createMockServices();

    // Set with 1 second TTL
    await services.cache.set('temp', { data: 'test' }, 1);

    // Should exist immediately
    let cached = await services.cache.get('temp');
    expect(cached).toBeTruthy();

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 1100));

    // Should be expired
    cached = await services.cache.get('temp');
    expect(cached).toBeNull();
  });
});
```

### Queue Service Testing

```typescript
import { createMockServices } from '../__tests__/fixtures/services';

describe('Queue Service', () => {
  it('should enqueue and dequeue messages', async () => {
    const services = createMockServices();

    // Enqueue
    const messageId = await services.queue.enqueue('jobs', { action: 'process' });
    expect(messageId).toBeTruthy();

    // Check queue length
    const length = await services.queue.getQueueLength('jobs');
    expect(length).toBe(1);

    // Dequeue
    const message = await services.queue.dequeue('jobs');
    expect(message).toBeTruthy();
    expect(message?.payload).toEqual({ action: 'process' });

    // Queue should be empty
    const newLength = await services.queue.getQueueLength('jobs');
    expect(newLength).toBe(0);
  });
});
```

### Notification Service Testing

```typescript
import { createMockServices } from '../__tests__/fixtures/services';

describe('Notification Service', () => {
  it('should send and retrieve notifications', async () => {
    const services = createMockServices();

    // Send notification
    const result = await services.notification.sendNotification('user-123', {
      title: 'New Message',
      message: 'You have a new message',
      type: 'info',
      priority: 'normal',
    });

    expect(result.sent).toBe(true);
    expect(result.notificationId).toBeTruthy();

    // Get notifications
    const notifications = await services.notification.getNotifications('user-123');
    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toBe('New Message');
    expect(notifications[0].read).toBe(false);

    // Mark as read
    await services.notification.markAsRead(result.notificationId);

    const updated = await services.notification.getNotifications('user-123');
    expect(updated[0].read).toBe(true);
  });
});
```

## Testing with Tokens

### JWT Token Generation

```typescript
import {
  generateValidToken,
  generateExpiredToken,
  generateAdminToken,
  generateUserToken,
  generateTokenWithClaims,
} from '../__tests__/helpers/token-helpers';

describe('Token Generation', () => {
  it('should generate valid token', () => {
    const token = generateValidToken();

    expect(token).toBeTruthy();
    expect(token.split('.')).toHaveLength(3);
  });

  it('should generate token for specific user', () => {
    const token = generateUserToken('user-456', 'john@example.com', ['user', 'editor']);

    const claims = parseTokenClaims(token);
    expect(claims?.sub).toBe('user-456');
    expect(claims?.email).toBe('john@example.com');
    expect(claims?.roles).toEqual(['user', 'editor']);
  });

  it('should generate admin token', () => {
    const token = generateAdminToken();

    const claims = parseTokenClaims(token);
    expect(claims?.roles).toContain('admin');
  });

  it('should generate token with custom claims', () => {
    const token = generateTokenWithClaims({
      sub: 'user-789',
      tenantId: 'tenant-123',
      department: 'engineering',
      clearance: 'top-secret',
    });

    const claims = parseTokenClaims(token);
    expect(claims?.tenantId).toBe('tenant-123');
    expect(claims?.department).toBe('engineering');
  });
});
```

### Token Validation

```typescript
import {
  parseTokenClaims,
  isTokenExpired,
  assertValidTokenFormat,
  assertTokenHasClaims,
  assertTokenNotExpired,
} from '../__tests__/helpers/token-helpers';

describe('Token Validation', () => {
  it('should validate token format', () => {
    const token = generateValidToken();

    assertValidTokenFormat(token);
  });

  it('should parse token claims', () => {
    const token = generateValidToken();
    const claims = parseTokenClaims(token);

    expect(claims).toBeTruthy();
    expect(claims?.sub).toBeTruthy();
    expect(claims?.exp).toBeTruthy();
  });

  it('should detect expired tokens', () => {
    const expiredToken = generateExpiredToken();
    const validToken = generateValidToken();

    expect(isTokenExpired(expiredToken)).toBe(true);
    expect(isTokenExpired(validToken)).toBe(false);
  });

  it('should assert token has required claims', () => {
    const token = generateValidToken();

    assertTokenHasClaims(token, ['sub', 'exp', 'iat', 'aud']);
  });
});
```

### Mock Token Validators

```typescript
import {
  createMockAuthEnvironment,
  MockTokenValidatorRealistic,
} from '../__tests__/mocks/auth-mocks';

describe('Token Validation with Mocks', () => {
  it('should validate tokens with realistic validator', async () => {
    const validator = new MockTokenValidatorRealistic();
    const token = generateValidToken();

    // Add to whitelist
    validator.addValidToken(token);

    // Validate
    const result = await validator.validate(token);

    expect(result.valid).toBe(true);
    expect(result.userId).toBeTruthy();
  });

  it('should reject revoked tokens', async () => {
    const validator = new MockTokenValidatorRealistic();
    const token = generateValidToken();

    validator.addValidToken(token);

    // Revoke
    validator.revokeToken(token);

    // Validate
    const result = await validator.validate(token);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('revoked');
  });
});
```

## Testing Handlers

### Basic Handler Testing

```typescript
import {
  createMockHttpRequest,
  createPostRequest,
  createMockFunctionContext,
  executeHandler,
  assertResponseSuccess,
} from '../__tests__/helpers/handler-helpers';

describe('Handler Testing', () => {
  it('should handle GET request', async () => {
    const handler = async (ctx, req) => {
      return {
        status: 200,
        body: { message: 'Hello, World!' },
        headers: {},
      };
    };

    const request = createMockHttpRequest({ method: 'GET' });
    const { result } = await executeHandler(handler, request);

    assertResponseSuccess(result);
    expect(result.body.message).toBe('Hello, World!');
  });

  it('should handle POST request with body', async () => {
    const handler = async (ctx, req) => {
      const { name } = req.body;

      return {
        status: 201,
        body: { message: `Created: ${name}` },
        headers: {},
      };
    };

    const request = createPostRequest('/api/items', { name: 'Test Item' });
    const { result } = await executeHandler(handler, request);

    expect(result.status).toBe(201);
    expect(result.body.message).toBe('Created: Test Item');
  });
});
```

### Authenticated Handler Testing

```typescript
import {
  generateValidToken,
  createAuthorizedRequest,
} from '../__tests__/helpers/token-helpers';
import {
  executeHandler,
  assertResponseSuccess,
  assertUnauthorized,
} from '../__tests__/helpers/handler-helpers';
import { createMockAuthEnvironment } from '../__tests__/mocks/auth-mocks';

describe('Authenticated Handlers', () => {
  it('should allow authenticated requests', async () => {
    const authEnv = createMockAuthEnvironment();
    const token = generateValidToken();
    authEnv.tokenValidator.addValidToken(token);

    const handler = async (ctx, req) => {
      const authHeader = req.headers.Authorization;
      const tokenValue = authHeader?.replace('Bearer ', '');

      if (!tokenValue) {
        return { status: 401, body: { error: 'Missing token' }, headers: {} };
      }

      const validation = await authEnv.tokenValidator.validate(tokenValue);

      if (!validation.valid) {
        return { status: 401, body: { error: 'Invalid token' }, headers: {} };
      }

      return {
        status: 200,
        body: { userId: validation.userId },
        headers: {},
      };
    };

    const request = createAuthorizedRequest(token);
    const { result } = await executeHandler(handler, request);

    assertResponseSuccess(result);
    expect(result.body.userId).toBeTruthy();
  });

  it('should reject unauthenticated requests', async () => {
    const handler = async (ctx, req) => {
      if (!req.headers.Authorization) {
        return { status: 401, body: { error: 'Unauthorized' }, headers: {} };
      }

      return { status: 200, body: { success: true }, headers: {} };
    };

    const request = createMockHttpRequest(); // No auth header
    const { result } = await executeHandler(handler, request);

    assertUnauthorized(result);
  });
});
```

### Handler with Service Injection

```typescript
import { createMockServices } from '../__tests__/fixtures/services';
import { createPostRequest, executeHandler } from '../__tests__/helpers/handler-helpers';

describe('Handlers with Services', () => {
  it('should use injected services', async () => {
    const services = createMockServices();

    const handler = async (ctx, req) => {
      const { userId, message } = req.body;

      // Log
      services.logging.info('Sending notification', { userId });

      // Send notification
      const result = await services.notification.sendNotification(userId, {
        title: 'Alert',
        message,
        type: 'info',
        priority: 'normal',
      });

      return {
        status: 200,
        body: { notificationId: result.notificationId },
        headers: {},
      };
    };

    const request = createPostRequest('/api/notify', {
      userId: 'user-123',
      message: 'Test notification',
    });

    const { result } = await executeHandler(handler, request);

    expect(result.status).toBe(200);
    expect(result.body.notificationId).toBeTruthy();

    // Verify notification was sent
    const notifications = await services.notification.getNotifications('user-123');
    expect(notifications).toHaveLength(1);
  });
});
```

## Mock Usage Examples

### Complete Mock Environment

```typescript
import { createMockAuthEnvironment, setupAdminScenario } from '../__tests__/mocks/auth-mocks';
import { createMockServices } from '../__tests__/fixtures/services';

describe('Complete Mock Environment', () => {
  it('should use all mocks together', async () => {
    // Setup
    const authEnv = createMockAuthEnvironment();
    const services = createMockServices();
    const token = generateAdminToken();
    setupAdminScenario(authEnv, token);

    // Handler
    const handler = async (ctx, req) => {
      // Authenticate
      const authHeader = req.headers.Authorization;
      const tokenValue = authHeader?.replace('Bearer ', '');

      if (!tokenValue) {
        return { status: 401, body: { error: 'Unauthorized' }, headers: {} };
      }

      const validation = await authEnv.tokenValidator.validate(tokenValue);

      if (!validation.valid) {
        return { status: 401, body: { error: 'Invalid token' }, headers: {} };
      }

      // Check admin permission
      const userContext = authEnv.userContextProvider.getUserContextFromToken(tokenValue);
      const hasPermission = authEnv.authorizationProvider.hasPermission(
        userContext!.id,
        'admin:write',
        userContext!.roles
      );

      if (!hasPermission) {
        return { status: 403, body: { error: 'Forbidden' }, headers: {} };
      }

      // Use services
      services.logging.info('Admin action', { userId: validation.userId });
      await services.cache.set(`admin:action:${Date.now()}`, { userId: validation.userId });

      return {
        status: 200,
        body: { success: true },
        headers: {},
      };
    };

    const request = createAuthorizedRequest(token, {
      method: 'POST',
      url: '/api/admin/action',
    });

    const { result } = await executeHandler(handler, request);

    expect(result.status).toBe(200);
  });
});
```

## Common Test Patterns

### Pattern 1: Service + Auth + Handler

```typescript
describe('Common Pattern: Service + Auth + Handler', () => {
  let services;
  let authEnv;

  beforeEach(() => {
    services = createMockServices();
    authEnv = createMockAuthEnvironment();
  });

  afterEach(() => {
    clearAllServices(services);
    clearMockAuthEnvironment(authEnv);
  });

  it('should process authenticated request with services', async () => {
    const token = generateValidToken();
    setupUserScenario(authEnv, token);

    // Your handler here
  });
});
```

### Pattern 2: Error Handling

```typescript
describe('Common Pattern: Error Handling', () => {
  it('should handle service failures gracefully', async () => {
    const services = createMockServices();
    (services.email as MockEmailService).setFailureRate(1.0);

    const handler = async (ctx, req) => {
      try {
        const result = await services.email.sendEmail('user@example.com', 'Test', 'Body');

        if (!result.sent) {
          services.logging.error('Email failed', undefined, { error: result.error });
          return { status: 500, body: { error: 'Email sending failed' }, headers: {} };
        }

        return { status: 200, body: { success: true }, headers: {} };
      } catch (error) {
        services.logging.error('Unexpected error', error);
        return { status: 500, body: { error: 'Internal server error' }, headers: {} };
      }
    };

    const request = createPostRequest('/api/send');
    const { result } = await executeHandler(handler, request);

    expect(result.status).toBe(500);
  });
});
```

### Pattern 3: Performance Testing

```typescript
import { measureHandlerPerformance } from '../__tests__/helpers/handler-helpers';

describe('Common Pattern: Performance Testing', () => {
  it('should complete within performance budget', async () => {
    const handler = async (ctx, req) => {
      // Your handler logic
      return { status: 200, body: { success: true }, headers: {} };
    };

    const request = createMockHttpRequest();

    const { executionTime } = await measureHandlerPerformance(handler, request);

    expect(executionTime).toBeLessThan(100); // 100ms budget
  });
});
```

## Performance Testing

### Running Benchmarks

```bash
# Run all benchmarks
npm run test:bench

# Run specific benchmark
npx vitest bench src/__tests__/performance/week2-benchmarks.bench.ts
```

### Expected Performance

- **Service Resolution**: < 1ms
- **Token Validation**: < 5ms
- **Cache Operations**: < 0.5ms
- **Handler Execution**: < 10ms
- **Full Request Lifecycle**: < 20ms

## Integration Scenarios

The `week2-scenarios.ts` file provides complete end-to-end test scenarios:

1. **Service Injection in Function Handlers**
2. **Token Validation Flow**
3. **Authenticated Request Handling**
4. **Service Composition with Authentication**
5. **Error Handling Flow**

Run all scenarios:

```typescript
import { runAllWeek2Scenarios } from '../__tests__/scenarios/week2-scenarios';

runAllWeek2Scenarios();
```

## Best Practices

### 1. Always Clean Up

```typescript
import { afterEach } from 'vitest';

afterEach(() => {
  clearAllServices(services);
  clearMockAuthEnvironment(authEnv);
});
```

### 2. Use Realistic Scenarios

```typescript
// Good - realistic scenario
const token = generateValidToken();
setupUserScenario(authEnv, token);

// Bad - unrealistic always-valid
const validator = new MockTokenValidatorAlwaysValid();
```

### 3. Test Error Cases

```typescript
it('should handle expired tokens', async () => {
  const token = generateExpiredToken();
  const result = await authEnv.tokenValidator.validate(token);
  expect(result.valid).toBe(false);
});
```

### 4. Test Edge Cases

```typescript
it('should handle empty cache', async () => {
  const cached = await services.cache.get('nonexistent');
  expect(cached).toBeNull();
});

it('should handle queue underflow', async () => {
  const message = await services.queue.dequeue('empty-queue');
  expect(message).toBeNull();
});
```

### 5. Use Type Safety

```typescript
import type { MockHttpRequest, MockHttpResponse } from '../__tests__/helpers/handler-helpers';

async function myHandler(ctx: MockFunctionContext, req: MockHttpRequest): Promise<MockHttpResponse> {
  // Handler implementation
}
```

## Troubleshooting

### Tests Timeout

**Problem**: Tests hang or timeout

**Solution**: Ensure async operations are awaited

```typescript
// Bad
it('should work', () => {
  services.cache.set('key', 'value'); // Missing await
});

// Good
it('should work', async () => {
  await services.cache.set('key', 'value');
});
```

### Mock Not Working

**Problem**: Mock not behaving as expected

**Solution**: Verify mock is configured correctly

```typescript
// Configure mock before use
const validator = new MockTokenValidatorRealistic();
validator.addValidToken(token); // Don't forget this!

const result = await validator.validate(token);
```

### Token Validation Fails

**Problem**: Valid token failing validation

**Solution**: Check token is added to validator whitelist

```typescript
const token = generateValidToken();
authEnv.tokenValidator.addValidToken(token); // Required!

const result = await authEnv.tokenValidator.validate(token);
```

### Service Not Clearing

**Problem**: Service state persists between tests

**Solution**: Use `afterEach` to clear services

```typescript
afterEach(() => {
  clearAllServices(services);
});
```

## Support

For questions or issues:

1. Review this guide
2. Check existing test examples
3. Review integration scenarios in `week2-scenarios.ts`
4. Ask team for help

---

**Last Updated**: 2024-11-22
**Maintainer**: Charlie (Quality Lead)
**Version**: 1.0.0
