/**
 * Example: Service Composition - Multi-Service Function
 *
 * Demonstrates:
 * - Using multiple services together
 * - Service coordination and orchestration
 * - Error handling across services
 * - Transaction-like patterns
 */

import type { ServiceFactory, FunctionHandler } from '@atakora/component/functions';
import { defineBackend } from '@atakora/component/backend';
import { defineAuth, auth } from '@atakora/component/auth';
import { defineSchema, a, c } from '@atakora/component/schema';

// ============================================================================
// Service Interfaces
// ============================================================================

/**
 * Data validation service
 */
export interface DataValidator {
  validate(data: any, schema: ValidationSchema): Promise<ValidationResult>;
  validateBatch(items: any[], schema: ValidationSchema): Promise<BatchValidationResult>;
}

export interface ValidationSchema {
  type: 'object';
  properties: Record<string, PropertySchema>;
  required?: string[];
}

export interface PropertySchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  min?: number;
  max?: number;
  pattern?: RegExp;
  items?: PropertySchema;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface BatchValidationResult {
  validCount: number;
  invalidCount: number;
  results: Array<{ index: number; isValid: boolean; errors: string[] }>;
}

/**
 * Data transformation service
 */
export interface DataTransformer {
  transform(data: any, transformations: Transformation[]): Promise<any>;
  normalize(data: any): Promise<any>;
  sanitize(data: any): Promise<any>;
}

export interface Transformation {
  field: string;
  operation: 'uppercase' | 'lowercase' | 'trim' | 'format' | 'convert';
  params?: Record<string, any>;
}

/**
 * Notification service
 */
export interface NotificationService {
  notify(type: NotificationType, recipient: string, data: any): Promise<void>;
  notifyBatch(notifications: Notification[]): Promise<void>;
}

export type NotificationType = 'email' | 'sms' | 'push' | 'webhook';

export interface Notification {
  type: NotificationType;
  recipient: string;
  subject?: string;
  message: string;
  data?: Record<string, any>;
}

/**
 * Audit logging service
 */
export interface AuditLogger {
  log(event: AuditEvent): Promise<void>;
  logBatch(events: AuditEvent[]): Promise<void>;
}

export interface AuditEvent {
  action: string;
  resource: string;
  resourceId: string;
  userId: string;
  timestamp: string;
  details?: Record<string, any>;
  outcome: 'success' | 'failure';
}

// ============================================================================
// Service Implementations
// ============================================================================

export class DataValidatorService implements DataValidator {
  async validate(data: any, schema: ValidationSchema): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    for (const field of schema.required || []) {
      if (!(field in data) || data[field] === null || data[field] === undefined) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate each property
    for (const [key, value] of Object.entries(data)) {
      const propSchema = schema.properties[key];

      if (!propSchema) {
        warnings.push(`Unknown field: ${key}`);
        continue;
      }

      // Type validation
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== propSchema.type) {
        errors.push(`Field '${key}' should be ${propSchema.type}, got ${actualType}`);
      }

      // String validation
      if (propSchema.type === 'string' && typeof value === 'string') {
        if (propSchema.min && value.length < propSchema.min) {
          errors.push(`Field '${key}' must be at least ${propSchema.min} characters`);
        }
        if (propSchema.max && value.length > propSchema.max) {
          errors.push(`Field '${key}' must be at most ${propSchema.max} characters`);
        }
        if (propSchema.pattern && !propSchema.pattern.test(value)) {
          errors.push(`Field '${key}' does not match required pattern`);
        }
      }

      // Number validation
      if (propSchema.type === 'number' && typeof value === 'number') {
        if (propSchema.min !== undefined && value < propSchema.min) {
          errors.push(`Field '${key}' must be at least ${propSchema.min}`);
        }
        if (propSchema.max !== undefined && value > propSchema.max) {
          errors.push(`Field '${key}' must be at most ${propSchema.max}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async validateBatch(
    items: any[],
    schema: ValidationSchema
  ): Promise<BatchValidationResult> {
    const results = await Promise.all(
      items.map(async (item, index) => {
        const result = await this.validate(item, schema);
        return {
          index,
          isValid: result.isValid,
          errors: result.errors,
        };
      })
    );

    return {
      validCount: results.filter(r => r.isValid).length,
      invalidCount: results.filter(r => !r.isValid).length,
      results,
    };
  }
}

export class DataTransformerService implements DataTransformer {
  async transform(data: any, transformations: Transformation[]): Promise<any> {
    const result = { ...data };

    for (const transformation of transformations) {
      const value = result[transformation.field];

      if (value === undefined || value === null) {
        continue;
      }

      switch (transformation.operation) {
        case 'uppercase':
          if (typeof value === 'string') {
            result[transformation.field] = value.toUpperCase();
          }
          break;

        case 'lowercase':
          if (typeof value === 'string') {
            result[transformation.field] = value.toLowerCase();
          }
          break;

        case 'trim':
          if (typeof value === 'string') {
            result[transformation.field] = value.trim();
          }
          break;

        case 'format':
          // Custom formatting based on params
          if (transformation.params?.format === 'phone') {
            result[transformation.field] = this.formatPhone(value);
          } else if (transformation.params?.format === 'date') {
            result[transformation.field] = new Date(value).toISOString();
          }
          break;

        case 'convert':
          if (transformation.params?.to === 'number') {
            result[transformation.field] = Number(value);
          } else if (transformation.params?.to === 'string') {
            result[transformation.field] = String(value);
          }
          break;
      }
    }

    return result;
  }

  async normalize(data: any): Promise<any> {
    return this.transform(data, [
      { field: 'email', operation: 'lowercase' },
      { field: 'email', operation: 'trim' },
      { field: 'name', operation: 'trim' },
      { field: 'phone', operation: 'format', params: { format: 'phone' } },
    ]);
  }

  async sanitize(data: any): Promise<any> {
    const sanitized = { ...data };

    // Remove sensitive fields
    delete sanitized.password;
    delete sanitized.ssn;
    delete sanitized.creditCard;

    return sanitized;
  }

  private formatPhone(phone: string): string {
    // Simple US phone formatting
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
  }
}

export class NotificationServiceImpl implements NotificationService {
  async notify(type: NotificationType, recipient: string, data: any): Promise<void> {
    // In real implementation, would dispatch to appropriate channel
    console.log(`[${type}] Notification to ${recipient}:`, data);
  }

  async notifyBatch(notifications: Notification[]): Promise<void> {
    await Promise.all(
      notifications.map(n => this.notify(n.type, n.recipient, { ...n.data, message: n.message }))
    );
  }
}

export class AuditLoggerService implements AuditLogger {
  private logs: AuditEvent[] = [];

  async log(event: AuditEvent): Promise<void> {
    this.logs.push(event);
    console.log('[AUDIT]', event);
  }

  async logBatch(events: AuditEvent[]): Promise<void> {
    this.logs.push(...events);
    events.forEach(event => console.log('[AUDIT]', event));
  }

  // For testing
  getLogs(): AuditEvent[] {
    return [...this.logs];
  }
}

// ============================================================================
// Service Factories
// ============================================================================

export const dataValidatorFactory: ServiceFactory<DataValidator> = () => {
  return new DataValidatorService();
};

export const dataTransformerFactory: ServiceFactory<DataTransformer> = () => {
  return new DataTransformerService();
};

export const notificationServiceFactory: ServiceFactory<NotificationService> = () => {
  return new NotificationServiceImpl();
};

export const auditLoggerFactory: ServiceFactory<AuditLogger> = () => {
  return new AuditLoggerService();
};

// ============================================================================
// Schema
// ============================================================================

const schema = defineSchema({
  schema: a.schema({
    DataImport: c
      .model({
        id: a.id(),
        userId: a.string().required(),
        fileName: a.string().required(),
        status: a.enum(['pending', 'processing', 'completed', 'failed']).required(),
        totalRecords: a.number(),
        validRecords: a.number(),
        invalidRecords: a.number(),
        errors: a.json(),
        createdAt: a.datetime().required(),
        completedAt: a.datetime(),
      })
      .authorization((allow) => [allow.owner('userId'), allow.groups(['admin']).all()]),

    ImportedRecord: c
      .model({
        id: a.id(),
        importId: a.ref('DataImport').required(),
        data: a.json().required(),
        isValid: a.boolean().default(false),
        errors: a.array(a.string()),
      })
      .authorization((allow) => [allow.authenticated().all()]),
  }),
});

// ============================================================================
// Backend
// ============================================================================

const authentication = defineAuth({
  Primary: auth.entra().tenantId('tenant-id').clientId('client-id').audience('api://my-app'),
});

export const backend = defineBackend({
  schema,
  authentication,
  services: {
    dataValidator: dataValidatorFactory,
    dataTransformer: dataTransformerFactory,
    notificationService: notificationServiceFactory,
    auditLogger: auditLoggerFactory,
  },
  settings: {
    name: 'service-composition-example',
    region: 'eastus',
  },
});

// ============================================================================
// Multi-Service Function Handler
// ============================================================================

interface ProcessDataImportInput {
  fileName: string;
  records: Array<Record<string, any>>;
  notifyOnComplete?: boolean;
}

interface ProcessDataImportOutput {
  importId: string;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  status: 'completed' | 'failed';
  errors?: string[];
}

/**
 * Process data import using multiple services
 *
 * Flow:
 * 1. Validate data (DataValidator)
 * 2. Transform valid data (DataTransformer)
 * 3. Store records (Database)
 * 4. Send notification (NotificationService)
 * 5. Log audit event (AuditLogger)
 */
export const processDataImport: FunctionHandler<
  ProcessDataImportInput,
  ProcessDataImportOutput
> = async (context, input) => {
  const startTime = Date.now();

  // Create import record
  const importRecord = await context.database.dataImports.create({
    userId: context.user.id,
    fileName: input.fileName,
    status: 'processing',
    totalRecords: input.records.length,
    createdAt: new Date().toISOString(),
  });

  context.log.info('Starting data import', {
    importId: importRecord.id,
    fileName: input.fileName,
    recordCount: input.records.length,
  });

  try {
    // Step 1: Validate all records
    context.log.info('Validating records');

    const validationSchema: ValidationSchema = {
      type: 'object',
      properties: {
        email: { type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
        name: { type: 'string', min: 2, max: 100 },
        age: { type: 'number', min: 0, max: 150 },
      },
      required: ['email', 'name'],
    };

    const validationResult = await context.services.dataValidator.validateBatch(
      input.records,
      validationSchema
    );

    context.log.info('Validation complete', {
      valid: validationResult.validCount,
      invalid: validationResult.invalidCount,
    });

    // Step 2: Transform valid records
    const transformedRecords = await Promise.all(
      input.records.map(async (record, index) => {
        const validationInfo = validationResult.results[index];

        if (!validationInfo.isValid) {
          // Store invalid record with errors
          await context.database.importedRecords.create({
            importId: importRecord.id,
            data: record,
            isValid: false,
            errors: validationInfo.errors,
          });
          return null;
        }

        // Transform valid record
        const transformed = await context.services.dataTransformer.normalize(record);

        // Store valid record
        await context.database.importedRecords.create({
          importId: importRecord.id,
          data: transformed,
          isValid: true,
        });

        return transformed;
      })
    );

    const validRecords = transformedRecords.filter(r => r !== null);

    // Step 3: Update import record
    await context.database.dataImports.update(importRecord.id, {
      status: 'completed',
      validRecords: validationResult.validCount,
      invalidRecords: validationResult.invalidCount,
      errors:
        validationResult.invalidCount > 0
          ? validationResult.results.filter(r => !r.isValid).map(r => r.errors)
          : undefined,
      completedAt: new Date().toISOString(),
    });

    // Step 4: Send notification
    if (input.notifyOnComplete) {
      await context.services.notificationService.notify('email', context.user.email, {
        subject: 'Data Import Complete',
        message: `Import of ${input.fileName} completed. ${validationResult.validCount} records imported, ${validationResult.invalidCount} failed.`,
        importId: importRecord.id,
        totalRecords: input.records.length,
        validRecords: validationResult.validCount,
        invalidRecords: validationResult.invalidCount,
      });
    }

    // Step 5: Log audit event
    await context.services.auditLogger.log({
      action: 'data.import',
      resource: 'DataImport',
      resourceId: importRecord.id,
      userId: context.user.id,
      timestamp: new Date().toISOString(),
      outcome: 'success',
      details: {
        fileName: input.fileName,
        totalRecords: input.records.length,
        validRecords: validationResult.validCount,
        invalidRecords: validationResult.invalidCount,
        durationMs: Date.now() - startTime,
      },
    });

    context.log.info('Data import completed', {
      importId: importRecord.id,
      duration: Date.now() - startTime,
    });

    return {
      importId: importRecord.id,
      totalRecords: input.records.length,
      validRecords: validationResult.validCount,
      invalidRecords: validationResult.invalidCount,
      status: 'completed',
    };
  } catch (error) {
    // Handle failure
    await context.database.dataImports.update(importRecord.id, {
      status: 'failed',
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      completedAt: new Date().toISOString(),
    });

    // Log failure audit event
    await context.services.auditLogger.log({
      action: 'data.import',
      resource: 'DataImport',
      resourceId: importRecord.id,
      userId: context.user.id,
      timestamp: new Date().toISOString(),
      outcome: 'failure',
      details: {
        fileName: input.fileName,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: Date.now() - startTime,
      },
    });

    context.log.error('Data import failed', error);

    return {
      importId: importRecord.id,
      totalRecords: input.records.length,
      validRecords: 0,
      invalidRecords: input.records.length,
      status: 'failed',
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
};

// ============================================================================
// Testing
// ============================================================================

if (import.meta.vitest) {
  const { describe, it, expect, beforeEach } = import.meta.vitest;
  const { createFunctionContext } = await import('@atakora/component/functions');

  describe('Service Composition', () => {
    let context: any;

    beforeEach(() => {
      context = createFunctionContext({
        services: {
          dataValidator: new DataValidatorService(),
          dataTransformer: new DataTransformerService(),
          notificationService: new NotificationServiceImpl(),
          auditLogger: new AuditLoggerService(),
        },
        user: {
          id: 'user-123',
          email: 'test@example.com',
          roles: [],
        },
      });
    });

    it('should process valid records successfully', async () => {
      const input = {
        fileName: 'test-import.csv',
        records: [
          { email: 'user1@example.com', name: 'User One', age: 25 },
          { email: 'user2@example.com', name: 'User Two', age: 30 },
        ],
        notifyOnComplete: false,
      };

      const result = await processDataImport(context, input);

      expect(result.status).toBe('completed');
      expect(result.validRecords).toBe(2);
      expect(result.invalidRecords).toBe(0);
    });

    it('should handle invalid records', async () => {
      const input = {
        fileName: 'test-import.csv',
        records: [
          { email: 'invalid-email', name: 'User One' }, // Invalid email
          { email: 'user2@example.com' }, // Missing name
        ],
        notifyOnComplete: false,
      };

      const result = await processDataImport(context, input);

      expect(result.status).toBe('completed');
      expect(result.validRecords).toBe(0);
      expect(result.invalidRecords).toBe(2);
    });
  });
}
