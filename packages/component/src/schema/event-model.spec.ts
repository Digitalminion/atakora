/**
 * Event Model Builder Tests
 *
 * Comprehensive tests for event model creation, configuration, and validation.
 */

import { describe, it, expect } from 'vitest';
import { e, EventModelBuilder } from './event-model';
import { a } from './field-types';
import type { EventModelConfig } from './types';

// ============================================================================
// Basic Event Model Creation
// ============================================================================

describe('EventModelBuilder - Basic Creation', () => {
  it('should create an event model with payload fields', () => {
    const DataUploaded = e.model({
      datasetId: a.string().required(),
      fileUrl: a.string().url().required(),
      uploadedAt: a.datetime().required(),
    });

    expect(DataUploaded).toBeInstanceOf(EventModelBuilder);
    expect(DataUploaded._config.type).toBe('event');
    expect(DataUploaded._config.fields).toBeDefined();
  });

  it('should process field configurations correctly', () => {
    const UserRegistered = e.model({
      userId: a.id(),
      email: a.string().required().email(),
      timestamp: a.datetime().required(),
    });

    const config = UserRegistered._build();

    expect(config.fields.userId.type).toBe('id');
    expect(config.fields.email.type).toBe('string');
    expect(config.fields.email.required).toBe(true);
    expect(config.fields.timestamp.type).toBe('datetime');
  });

  it('should handle events with minimal fields', () => {
    const SimpleEvent = e.model({
      id: a.id(),
    });

    const config = SimpleEvent._build();
    expect(Object.keys(config.fields)).toHaveLength(1);
  });

  it('should handle events with complex payload', () => {
    const OrderPlaced = e.model({
      orderId: a.id(),
      customerId: a.string().required(),
      items: a.array(
        a.object({
          productId: a.string().required(),
          quantity: a.number().integer().min(1).required(),
          price: a.number().min(0).required(),
        })
      ),
      totalAmount: a.number().min(0).required(),
      metadata: a.json(),
      placedAt: a.datetime().required(),
    });

    const config = OrderPlaced._build();

    expect(config.fields.items.type).toBe('array');
    expect(config.fields.metadata.type).toBe('json');
    expect(config.fields.totalAmount.type).toBe('number');
  });
});

// ============================================================================
// Event Configuration
// ============================================================================

describe('EventModelBuilder - Configuration', () => {
  it('should specify event type for code generation', () => {
    const TestEvent = e.model({
      id: a.id(),
    });

    const config = TestEvent._build();
    expect(config.type).toBe('event');
  });

  it('should preserve field configuration', () => {
    const EmailSent = e.model({
      recipientEmail: a.string().email().required(),
      subject: a.string().required(),
      sentAt: a.datetime().required(),
    });

    const config = EmailSent._build();

    expect(config.fields.recipientEmail.validations).toBeDefined();
    expect(config.fields.subject.required).toBe(true);
  });
});

// ============================================================================
// Auto-Generation Specifications
// ============================================================================

describe('EventModelBuilder - Auto-Generation Specs', () => {
  it('should generate event model for queue processing', () => {
    const PaymentProcessed = e.model({
      paymentId: a.id(),
      amount: a.number().min(0).required(),
      currency: a.string().required(),
      status: a.enum(['pending', 'completed', 'failed']).required(),
    });

    const config = PaymentProcessed._build();

    // Verify type is set for code generation
    expect(config.type).toBe('event');

    // Verify all fields are preserved for generation
    expect(Object.keys(config.fields)).toHaveLength(4);
  });

  it('should preserve all field metadata for endpoint generation', () => {
    const NotificationSent = e.model({
      userId: a.id(),
      message: a.string().required(),
      channel: a.enum(['email', 'sms', 'push']).required(),
      sentAt: a.datetime().required(),
    });

    const config = NotificationSent._build();

    // All fields should be available for POST endpoint validation
    expect(config.fields.userId).toBeDefined();
    expect(config.fields.message).toBeDefined();
    expect(config.fields.channel).toBeDefined();
    expect(config.fields.sentAt).toBeDefined();
  });
});

// ============================================================================
// Complex Event Scenarios
// ============================================================================

describe('EventModelBuilder - Complex Scenarios', () => {
  it('should handle file upload event with metadata', () => {
    const FileUploaded = e.model({
      fileId: a.id(),
      fileName: a.string().required(),
      fileSize: a.number().integer().min(0).required(),
      mimeType: a.string().required(),
      uploaderId: a.string().required(),
      metadata: a.json(),
      tags: a.array(a.string()).default([]),
      uploadedAt: a.datetime().required(),
    });

    const config = FileUploaded._build();

    expect(Object.keys(config.fields)).toHaveLength(8);
    expect(config.fields.fileSize.integer).toBe(true);
    expect(config.fields.tags.default).toEqual([]);
  });

  it('should handle data transformation event', () => {
    const DataTransformed = e.model({
      jobId: a.id(),
      sourceDatasetId: a.string().required(),
      targetDatasetId: a.string().required(),
      transformationType: a.enum(['filter', 'aggregate', 'join']).required(),
      parameters: a.json(),
      status: a.enum(['queued', 'processing', 'completed', 'failed']).required(),
      startedAt: a.datetime(),
      completedAt: a.datetime(),
    });

    const config = DataTransformed._build();

    expect(config.fields.transformationType.type).toBe('enum');
    expect(config.fields.status.type).toBe('enum');
    expect(config.fields.parameters.type).toBe('json');
  });

  it('should handle user activity tracking event', () => {
    const UserActivity = e.model({
      activityId: a.id(),
      userId: a.string().required(),
      action: a.string().required(),
      resource: a.string().required(),
      resourceId: a.string(),
      ipAddress: a.string(),
      userAgent: a.string(),
      metadata: a.json(),
      timestamp: a.datetime().required(),
    });

    const config = UserActivity._build();

    expect(Object.keys(config.fields)).toHaveLength(9);
    expect(config.fields.userId.required).toBe(true);
    expect(config.fields.ipAddress.required).toBe(false);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('EventModelBuilder - Edge Cases', () => {
  it('should handle event with only id', () => {
    const MinimalEvent = e.model({
      id: a.id(),
    });

    const config = MinimalEvent._build();
    expect(Object.keys(config.fields)).toHaveLength(1);
  });

  it('should handle event with nested objects', () => {
    const ComplexEvent = e.model({
      id: a.id(),
      nested: a.object({
        field1: a.string(),
        field2: a.number(),
      }),
    });

    const config = ComplexEvent._build();
    expect(config.fields.nested.type).toBe('object');
  });

  it('should handle event with array of nested objects', () => {
    const BatchEvent = e.model({
      batchId: a.id(),
      records: a.array(
        a.object({
          id: a.string().required(),
          data: a.json(),
        })
      ),
    });

    const config = BatchEvent._build();
    expect(config.fields.records.type).toBe('array');
  });

  it('should handle event with binary data', () => {
    const BinaryEvent = e.model({
      id: a.id(),
      data: a.binary().maxSize(10 * 1024 * 1024), // 10MB
    });

    const config = BinaryEvent._build();
    expect(config.fields.data.type).toBe('binary');
    expect(config.fields.data.maxSizeBytes).toBe(10 * 1024 * 1024);
  });

  it('should build independent configurations', () => {
    const Event1 = e.model({ id: a.id(), type: a.string().default('type1') });
    const Event2 = e.model({ id: a.id(), type: a.string().default('type2') });

    const config1 = Event1._build();
    const config2 = Event2._build();

    expect(config1.fields.type.default).toBe('type1');
    expect(config2.fields.type.default).toBe('type2');
  });

  it('should not mutate original configuration on build', () => {
    const Event = e.model({
      id: a.id(),
      data: a.string(),
    });

    const config1 = Event._build();
    const config2 = Event._build();

    expect(config1).not.toBe(config2);
    expect(config1).toEqual(config2);
  });
});

// ============================================================================
// Real-World Event Examples
// ============================================================================

describe('EventModelBuilder - Real-World Examples', () => {
  it('should model e-commerce order events', () => {
    const OrderShipped = e.model({
      orderId: a.string().required(),
      customerId: a.string().required(),
      trackingNumber: a.string().required(),
      carrier: a.string().required(),
      estimatedDelivery: a.datetime(),
      shippedAt: a.datetime().required(),
    });

    const config = OrderShipped._build();
    expect(config.type).toBe('event');
    expect(Object.keys(config.fields)).toHaveLength(6);
  });

  it('should model analytics events', () => {
    const PageView = e.model({
      sessionId: a.string().required(),
      userId: a.string(),
      pageUrl: a.string().url().required(),
      referrer: a.string().url(),
      duration: a.number().integer().min(0),
      timestamp: a.datetime().required(),
    });

    const config = PageView._build();
    expect(config.fields.pageUrl.validations.some((v) => v.type === 'url')).toBe(true);
  });

  it('should model system events', () => {
    const SystemError = e.model({
      errorId: a.id(),
      service: a.string().required(),
      errorCode: a.string().required(),
      message: a.string().required(),
      stackTrace: a.string(),
      severity: a.enum(['low', 'medium', 'high', 'critical']).required(),
      metadata: a.json(),
      occurredAt: a.datetime().required(),
    });

    const config = SystemError._build();
    expect(config.fields.severity.values).toEqual(['low', 'medium', 'high', 'critical']);
  });

  it('should model notification events', () => {
    const NotificationScheduled = e.model({
      notificationId: a.id(),
      recipientId: a.string().required(),
      channel: a.enum(['email', 'sms', 'push', 'webhook']).required(),
      template: a.string().required(),
      variables: a.json(),
      scheduledFor: a.datetime().required(),
      priority: a.enum(['low', 'normal', 'high']).default('normal'),
    });

    const config = NotificationScheduled._build();
    expect(config.fields.priority.default).toBe('normal');
  });

  it('should model data pipeline events', () => {
    const DatasetProcessed = e.model({
      jobId: a.id(),
      datasetId: a.string().required(),
      recordsProcessed: a.number().integer().min(0).required(),
      recordsFailed: a.number().integer().min(0).default(0),
      processingTime: a.number().min(0).required(),
      status: a.enum(['success', 'partial', 'failed']).required(),
      errors: a.array(a.string()).default([]),
      completedAt: a.datetime().required(),
    });

    const config = DatasetProcessed._build();
    expect(config.fields.recordsFailed.default).toBe(0);
    expect(config.fields.errors.default).toEqual([]);
  });
});

// ============================================================================
// Type Safety
// ============================================================================

describe('EventModelBuilder - Type Inference', () => {
  it('should infer correct config type', () => {
    const Event = e.model({
      id: a.id(),
      data: a.string(),
    });

    const config: EventModelConfig = Event._build();
    expect(config.type).toBe('event');
  });

  it('should expose readonly _config property', () => {
    const Event = e.model({
      id: a.id(),
    });

    expect(Event._config).toBeDefined();
    expect(Event._config.type).toBe('event');
    expect(Event._config.fields).toBeDefined();
  });
});

// ============================================================================
// Event Model Factory
// ============================================================================

describe('e namespace - Event Model Factory', () => {
  it('should provide model factory method', () => {
    expect(e.model).toBeDefined();
    expect(typeof e.model).toBe('function');
  });

  it('should create EventModelBuilder instances', () => {
    const Event = e.model({ id: a.id() });
    expect(Event).toBeInstanceOf(EventModelBuilder);
  });
});
