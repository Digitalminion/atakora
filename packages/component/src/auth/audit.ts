/**
 * Security Audit Logging System
 *
 * @module auth/audit
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Security event types for audit logging
 */
export type SecurityEventType =
  | 'auth.success'
  | 'auth.failure'
  | 'auth.mfa.required'
  | 'auth.mfa.success'
  | 'auth.mfa.failure'
  | 'auth.session.created'
  | 'auth.session.expired'
  | 'auth.session.invalidated'
  | 'auth.rate.limited'
  | 'auth.suspicious.activity';

/**
 * Risk level for security events
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Security event data structure
 */
export interface SecurityEvent {
  type: SecurityEventType;
  timestamp: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  provider?: string;
  metadata?: Record<string, any>;
  risk?: RiskLevel;
}

/**
 * Event handler function type
 */
export type SecurityEventHandler = (event: SecurityEvent) => void | Promise<void>;

/**
 * Options for security auditor
 */
export interface SecurityAuditorOptions {
  /**
   * Enable automatic risk scoring
   * @default true
   */
  autoRiskScoring?: boolean;

  /**
   * Enable secret redaction
   * @default true
   */
  redactSecrets?: boolean;

  /**
   * Custom risk scoring function
   */
  customRiskScorer?: (event: SecurityEvent) => RiskLevel;

  /**
   * Patterns to identify and redact secrets
   */
  secretPatterns?: RegExp[];
}

// ============================================================================
// Security Auditor Implementation
// ============================================================================

/**
 * Security auditor for emitting and handling authentication security events
 */
export class SecurityAuditor {
  private handlers: SecurityEventHandler[] = [];
  private eventHistory: SecurityEvent[] = [];
  private userFailureCounts: Map<string, number> = new Map();
  private ipFailureCounts: Map<string, number> = new Map();
  private readonly options: Required<SecurityAuditorOptions>;

  /**
   * Default patterns for identifying secrets that should be redacted
   */
  private static readonly DEFAULT_SECRET_PATTERNS: RegExp[] = [
    /\b(?:password|passwd|pwd|secret|token|api[_-]?key|apikey|auth|authorization|bearer)\s*[:=]\s*["']?([^"'\s]+)["']?/gi,
    /\b(?:Bearer\s+)([A-Za-z0-9+/=._-]+)/gi,
    /\b(?:Basic\s+)([A-Za-z0-9+/=]+)/gi,
    /\b(?:ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/g, // JWT tokens
  ];

  constructor(options: SecurityAuditorOptions = {}) {
    this.options = {
      autoRiskScoring: options.autoRiskScoring ?? true,
      redactSecrets: options.redactSecrets ?? true,
      customRiskScorer: options.customRiskScorer ?? this.calculateRisk.bind(this),
      secretPatterns: options.secretPatterns ?? SecurityAuditor.DEFAULT_SECRET_PATTERNS,
    };
  }

  /**
   * Emit a security event
   */
  emit(event: Omit<SecurityEvent, 'timestamp'>): void {
    const fullEvent: SecurityEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    // Redact secrets if enabled
    if (this.options.redactSecrets) {
      fullEvent.metadata = this.redactSecretsFromMetadata(fullEvent.metadata);
      if (fullEvent.userId) {
        fullEvent.userId = this.redactIfSecret(fullEvent.userId);
      }
    }

    // Calculate risk score if enabled
    if (this.options.autoRiskScoring && !fullEvent.risk) {
      fullEvent.risk = this.options.customRiskScorer(fullEvent);
    }

    // Track failure counts for risk scoring
    this.trackFailures(fullEvent);

    // Store in history (limited to last 1000 events)
    this.eventHistory.push(fullEvent);
    if (this.eventHistory.length > 1000) {
      this.eventHistory.shift();
    }

    // Notify all handlers
    for (const handler of this.handlers) {
      try {
        const result = handler(fullEvent);
        // Handle async handlers
        if (result instanceof Promise) {
          result.catch((error) => {
            console.error('Async audit handler error:', error);
          });
        }
      } catch (error) {
        console.error('Audit handler error:', error);
      }
    }
  }

  /**
   * Register an event handler
   */
  onEvent(handler: SecurityEventHandler): () => void {
    this.handlers.push(handler);

    // Return unsubscribe function
    return () => {
      const index = this.handlers.indexOf(handler);
      if (index !== -1) {
        this.handlers.splice(index, 1);
      }
    };
  }

  /**
   * Get recent events optionally filtered by risk level
   */
  getRecentEvents(options?: {
    limit?: number;
    minRisk?: RiskLevel;
    type?: SecurityEventType;
  }): SecurityEvent[] {
    let events = [...this.eventHistory].reverse();

    if (options?.minRisk) {
      const riskLevels: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
      const minRiskIndex = riskLevels.indexOf(options.minRisk);
      events = events.filter((e) => {
        const eventRiskIndex = e.risk ? riskLevels.indexOf(e.risk) : -1;
        return eventRiskIndex >= minRiskIndex;
      });
    }

    if (options?.type) {
      events = events.filter((e) => e.type === options.type);
    }

    if (options?.limit) {
      events = events.slice(0, options.limit);
    }

    return events;
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
    this.userFailureCounts.clear();
    this.ipFailureCounts.clear();
  }

  /**
   * Get handler count
   */
  getHandlerCount(): number {
    return this.handlers.length;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Calculate risk level for an event
   */
  private calculateRisk(event: SecurityEvent): RiskLevel {
    // Rate limited events are always high risk
    if (event.type === 'auth.rate.limited') {
      return 'high';
    }

    // Suspicious activity is critical
    if (event.type === 'auth.suspicious.activity') {
      return 'critical';
    }

    // Check failure patterns
    if (event.type === 'auth.failure' || event.type === 'auth.mfa.failure') {
      const userFailures = event.userId ? (this.userFailureCounts.get(event.userId) ?? 0) : 0;
      const ipFailures = event.ip ? (this.ipFailureCounts.get(event.ip) ?? 0) : 0;
      const attempts = Math.max(userFailures, ipFailures, event.metadata?.attempts ?? 0);

      if (attempts > 10) {
        return 'critical';
      } else if (attempts > 5) {
        return 'high';
      } else if (attempts > 3) {
        return 'medium';
      }
    }

    // Session invalidation could be suspicious
    if (event.type === 'auth.session.invalidated') {
      // Check if forced invalidation
      if (event.metadata?.forced) {
        return 'high';
      }
      return 'medium';
    }

    // MFA required events might indicate elevation
    if (event.type === 'auth.mfa.required') {
      // Check if due to suspicious activity
      if (event.metadata?.reason === 'suspicious') {
        return 'high';
      }
      return 'low';
    }

    // Success events are generally low risk
    if (
      event.type === 'auth.success' ||
      event.type === 'auth.mfa.success' ||
      event.type === 'auth.session.created'
    ) {
      // Unless there were many recent failures
      const recentFailures = this.getRecentFailureCount(event);
      if (recentFailures > 5) {
        return 'medium'; // Success after many failures could be suspicious
      }
      return 'low';
    }

    // Default to low risk
    return 'low';
  }

  /**
   * Track failure counts for risk assessment
   */
  private trackFailures(event: SecurityEvent): void {
    if (event.type === 'auth.failure' || event.type === 'auth.mfa.failure') {
      // Track by user
      if (event.userId) {
        const count = this.userFailureCounts.get(event.userId) ?? 0;
        this.userFailureCounts.set(event.userId, count + 1);
      }

      // Track by IP
      if (event.ip) {
        const count = this.ipFailureCounts.get(event.ip) ?? 0;
        this.ipFailureCounts.set(event.ip, count + 1);
      }
    } else if (event.type === 'auth.success' || event.type === 'auth.mfa.success') {
      // Reset counters on success
      if (event.userId) {
        this.userFailureCounts.delete(event.userId);
      }
      if (event.ip) {
        this.ipFailureCounts.delete(event.ip);
      }
    }
  }

  /**
   * Get recent failure count for risk assessment
   */
  private getRecentFailureCount(event: SecurityEvent): number {
    const recentWindow = 5 * 60 * 1000; // 5 minutes
    const now = new Date(event.timestamp).getTime();

    return this.eventHistory.filter((e) => {
      if (e.type !== 'auth.failure' && e.type !== 'auth.mfa.failure') {
        return false;
      }

      const eventTime = new Date(e.timestamp).getTime();
      if (now - eventTime > recentWindow) {
        return false;
      }

      return (event.userId && e.userId === event.userId) || (event.ip && e.ip === event.ip);
    }).length;
  }

  /**
   * Redact secrets from metadata
   */
  private redactSecretsFromMetadata(
    metadata?: Record<string, any>
  ): Record<string, any> | undefined {
    if (!metadata) {
      return metadata;
    }

    const redacted = { ...metadata };

    for (const [key, value] of Object.entries(redacted)) {
      // For secret-like keys, check the value type
      if (this.isSecretKey(key)) {
        // If it's an array with secret-like key name, process elements individually
        // This handles cases like 'tokens' or 'apiKeys' arrays
        if (Array.isArray(value)) {
          redacted[key] = value.map((item) => {
            if (typeof item === 'string') {
              return this.redactIfSecret(item);
            } else if (typeof item === 'object' && item !== null) {
              return this.redactSecretsFromMetadata(item as Record<string, any>);
            }
            return item;
          });
        } else {
          // For non-arrays with secret keys, redact the whole value
          redacted[key] = '[REDACTED]';
        }
        continue;
      }

      // Handle arrays
      if (Array.isArray(value)) {
        redacted[key] = value.map((item) => {
          if (typeof item === 'string') {
            return this.redactIfSecret(item);
          } else if (typeof item === 'object' && item !== null) {
            return this.redactSecretsFromMetadata(item as Record<string, any>);
          }
          return item;
        });
      } else if (typeof value === 'object' && value !== null) {
        // Recursively redact nested objects
        redacted[key] = this.redactSecretsFromMetadata(value as Record<string, any>);
      } else if (typeof value === 'string') {
        redacted[key] = this.redactIfSecret(value);
      }
    }

    return redacted;
  }

  /**
   * Check if a key name suggests it contains a secret
   */
  private isSecretKey(key: string): boolean {
    const secretKeyPatterns = [
      /password/i,
      /secret/i,
      /token/i,
      /api[_-]?key/i,
      /auth/i,
      /bearer/i,
      /credential/i,
      /private[_-]?key/i,
    ];

    return secretKeyPatterns.some((pattern) => pattern.test(key));
  }

  /**
   * Redact a string if it appears to be a secret
   */
  private redactIfSecret(value: string): string {
    // Check if the entire value looks like a token/secret
    const tokenPatterns = [
      /^token\d+_\w+$/i,
      /^sk_\w+$/i,
      /^pk_\w+$/i,
      /^api_key_\w+$/i,
      /^Bearer\s+.+$/i,
      /^Basic\s+.+$/i,
      /^ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
    ];

    for (const pattern of tokenPatterns) {
      if (pattern.test(value)) {
        return '[REDACTED]';
      }
    }

    // Check against secret patterns for partial matches
    for (const pattern of this.options.secretPatterns) {
      if (pattern.test(value)) {
        // Keep some context for debugging but redact the secret part
        return value.replace(pattern, (match, group1) => {
          if (group1) {
            // If there's a capture group, replace just that part
            return match.replace(group1, '[REDACTED]');
          }
          // Otherwise replace the entire match
          return '[REDACTED]';
        });
      }
    }

    return value;
  }
}

// ============================================================================
// Preset Auditor Configurations
// ============================================================================

/**
 * Create an auditor with console logging handler
 */
export function createConsoleAuditor(options?: SecurityAuditorOptions): SecurityAuditor {
  const auditor = new SecurityAuditor(options);

  auditor.onEvent((event) => {
    const level =
      event.risk === 'critical' || event.risk === 'high'
        ? 'error'
        : event.risk === 'medium'
          ? 'warn'
          : 'info';

    console[level](`[AUDIT] ${event.type}`, {
      timestamp: event.timestamp,
      userId: event.userId,
      ip: event.ip,
      risk: event.risk,
      metadata: event.metadata,
    });
  });

  return auditor;
}

/**
 * Create an auditor for high-risk events only
 */
export function createHighRiskAuditor(
  handler: SecurityEventHandler,
  options?: SecurityAuditorOptions
): SecurityAuditor {
  const auditor = new SecurityAuditor(options);

  auditor.onEvent((event) => {
    if (event.risk === 'high' || event.risk === 'critical') {
      handler(event);
    }
  });

  return auditor;
}

/**
 * Create an auditor with multiple handlers
 */
export function createMultiHandlerAuditor(
  handlers: SecurityEventHandler[],
  options?: SecurityAuditorOptions
): SecurityAuditor {
  const auditor = new SecurityAuditor(options);

  handlers.forEach((handler) => auditor.onEvent(handler));

  return auditor;
}
