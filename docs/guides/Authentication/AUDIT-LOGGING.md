# Security Audit Logging

## Overview

The authentication system provides comprehensive security audit logging capabilities through the `SecurityAuditor` class. This system enables critical security event tracking, risk scoring, secret redaction, and extensible event handling capabilities for production environments.

## Key Features

### Security Event Types

The auditor supports comprehensive security event tracking:

- `auth.success` - Successful authentication
- `auth.failure` - Failed authentication attempt
- `auth.mfa.required` - MFA requirement triggered
- `auth.mfa.success` - Successful MFA verification
- `auth.mfa.failure` - Failed MFA attempt
- `auth.session.created` - New session established
- `auth.session.expired` - Session timeout
- `auth.session.invalidated` - Session forcefully terminated
- `auth.rate.limited` - Rate limit exceeded
- `auth.suspicious.activity` - Anomalous behavior detected

### Risk Scoring

Automatic risk assessment based on event patterns:

- **Risk levels**: low, medium, high, critical
- **Intelligent scoring factors**:
  - Failure count tracking (per user and IP)
  - Event type severity
  - Recent failure patterns
  - Session invalidation reasons
- **Customizable risk scoring** via configuration options

### Secret Redaction

Automatic detection and redaction of sensitive data:

- JWT tokens
- API keys
- Passwords
- Bearer/Basic auth tokens
- Long random strings
- Smart array handling with individual element processing
- Nested object support with recursive redaction
- Configurable patterns for custom secret detection

### Event Handling

- Multiple handler support - register unlimited handlers
- Async handler support - handles promises properly
- Error isolation - one handler's error doesn't affect others
- Unsubscribe mechanism - clean handler removal
- Event history - stores last 1000 events

## Basic Usage

### Creating an Auditor

```typescript
import { SecurityAuditor } from '@atakora/component/auth';

const auditor = new SecurityAuditor();

// Register event handlers
auditor.onEvent((event) => {
  console.log(`Security event: ${event.type}`, event);
});
```

### Emitting Security Events

```typescript
// Successful authentication
auditor.emit({
  type: 'auth.success',
  userId: user.id,
  provider: 'entra',
  metadata: {
    method: 'oauth',
    ipAddress: request.ip
  },
});

// Failed authentication
auditor.emit({
  type: 'auth.failure',
  provider: 'apiKeys',
  metadata: {
    reason: 'Invalid API key',
    attempts: failureCount,
    ipAddress: request.ip,
  },
});

// Session management
auditor.emit({
  type: 'auth.session.created',
  userId: user.id,
  metadata: {
    sessionId,
    duration: '1h',
    ipAddress: request.ip,
  },
});
```

## Advanced Configurations

### Preset Auditors

```typescript
import { createConsoleAuditor, createHighRiskAuditor, createMultiHandlerAuditor } from '@atakora/component/auth';

// Console logging with appropriate levels
const consoleAuditor = createConsoleAuditor();

// Only captures high/critical risk events
const highRiskAuditor = createHighRiskAuditor((event) => {
  // Send to security team
  alertSecurityTeam(event);
});

// Multiple handlers with different purposes
const multiAuditor = createMultiHandlerAuditor([
  (event) => console.log(event),        // Logging
  (event) => sendToSIEM(event),         // SIEM integration
  (event) => collectMetrics(event),     // Metrics
]);
```

### Custom Event Handlers

```typescript
class AuditedAuthService {
  private auditor: SecurityAuditor;

  constructor() {
    this.auditor = new SecurityAuditor();

    // SIEM integration
    this.auditor.onEvent(async (event) => {
      if (event.riskLevel >= 'high') {
        await siemClient.sendAlert({
          severity: event.riskLevel,
          event: event,
        });
      }
    });

    // Compliance logging
    this.auditor.onEvent(async (event) => {
      await complianceLogger.log({
        timestamp: event.timestamp,
        eventType: event.type,
        userId: event.userId,
        // Secrets already redacted by auditor
        metadata: event.metadata,
      });
    });

    // Real-time monitoring
    this.auditor.onEvent((event) => {
      metricsCollector.increment(`auth.events.${event.type}`);
      if (event.riskLevel === 'critical') {
        metricsCollector.alert('critical_auth_event', event);
      }
    });
  }

  async authenticate(token: string, context: AuthContext) {
    try {
      // Rate limit check
      if (this.isRateLimited(context.ipAddress)) {
        this.auditor.emit({
          type: 'auth.rate.limited',
          metadata: { ipAddress: context.ipAddress },
        });
        throw new RateLimitError();
      }

      // Token validation
      const user = await this.validateToken(token);

      // Success event
      this.auditor.emit({
        type: 'auth.success',
        userId: user.id,
        provider: 'oauth',
        metadata: {
          method: 'bearer_token',
          ipAddress: context.ipAddress,
        },
      });

      return user;
    } catch (error) {
      // Failure event
      this.auditor.emit({
        type: 'auth.failure',
        metadata: {
          reason: error.message,
          ipAddress: context.ipAddress,
          attempts: this.getFailureCount(context.ipAddress),
        },
      });

      // Check for suspicious activity
      if (this.isSuspicious(context)) {
        this.auditor.emit({
          type: 'auth.suspicious.activity',
          metadata: {
            reason: 'Multiple failed attempts from unknown location',
            ipAddress: context.ipAddress,
          },
        });
      }

      throw error;
    }
  }
}
```

## Risk-Based Response Patterns

```typescript
auditor.onEvent((event) => {
  switch (event.riskLevel) {
    case 'critical':
      // Immediate action required
      lockAccount(event.userId);
      blockIPAddress(event.metadata.ipAddress);
      alertSecurityTeam(event);
      break;

    case 'high':
      // Elevated security measures
      requireAdditionalVerification(event.userId);
      notifyUser(event.userId);
      break;

    case 'medium':
      // Monitor closely
      incrementRiskScore(event.userId);
      logToSecurityDashboard(event);
      break;

    case 'low':
      // Standard logging
      logEvent(event);
      break;
  }
});
```

## Integration with Authentication Providers

### Entra ID Provider

```typescript
auditor.emit({
  type: 'auth.success',
  userId: claims.sub,
  provider: 'entra',
  metadata: {
    method: 'oauth',
    tenant: tenantId,
    clientId: clientId,
  },
});
```

### API Keys Provider

```typescript
auditor.emit({
  type: 'auth.failure',
  provider: 'apiKeys',
  metadata: {
    reason: 'Expired API key',
    keyId: apiKeyId,
    expiresAt: keyExpiration,
  },
});
```

## Event History and Analysis

```typescript
// Get recent high-risk events
const highRiskEvents = auditor.getHistory({
  riskLevel: 'high',
  limit: 100,
});

// Get events for specific user
const userEvents = auditor.getHistory({
  filter: (event) => event.userId === 'user-123',
});

// Get events by type
const failureEvents = auditor.getHistory({
  eventTypes: ['auth.failure', 'auth.mfa.failure'],
});

// Clear history (for testing or rotation)
auditor.clearHistory();
```

## Security Guarantees

1. **Secrets Never Logged** - Comprehensive redaction patterns ensure sensitive data is never exposed
2. **All Auth Events Tracked** - Complete coverage of authentication lifecycle
3. **Risk Accurately Scored** - Pattern-based detection with contextual assessment
4. **Production Ready** - Robust error handling, optimized performance, memory efficient

## Performance Considerations

- Event emission is synchronous but lightweight
- Async handlers processed in background
- Limited history (1000 events) prevents memory leaks
- Efficient secret redaction with memoization potential
- Minimal overhead on authentication flow

## Best Practices

1. **Always register handlers before authentication begins**
2. **Use async handlers for external integrations (SIEM, databases)**
3. **Implement risk-based responses for critical events**
4. **Regularly review and tune risk scoring thresholds**
5. **Test secret redaction with your specific metadata patterns**
6. **Monitor handler performance to avoid bottlenecks**
7. **Implement proper error handling in custom handlers**
8. **Use structured metadata for better analysis**

## Next Steps

- Implement SIEM connector integrations
- Create monitoring dashboards for security events
- Define standard alerting rules and thresholds
- Generate compliance reports from audit logs
- Integrate with existing authentication providers