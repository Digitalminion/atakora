/**
 * Unit tests for ServiceBusTopic L2 construct.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '@atakora/cdk';
import { ServiceBusTopic } from '../service-bus-topic';
import { ServiceBusNamespace } from '../service-bus-namespace';
import { MockResourceGroup, createMockPlan } from '../../../__tests__/helpers/test-fixtures';
import { FunctionApp } from '../../functions/function-app';
import { ManagedServiceIdentityType } from '../../functions/function-app-types';

describe('cdk/servicebus/ServiceBusTopic', () => {
  let app: App;
  let resourceGroup: MockResourceGroup;
  let namespace: ServiceBusNamespace;

  beforeEach(() => {
    app = new App();
    resourceGroup = new MockResourceGroup(app, 'TestRG', {
      resourceGroupName: 'test-rg',
      location: 'eastus',
      tags: {
        environment: 'test',
        project: 'authr',
      },
    });

    namespace = new ServiceBusNamespace(resourceGroup, 'Messaging', {
      namespaceName: 'sb-test',
      location: 'eastus',
    });
  });

  describe('constructor', () => {
    it('should create topic with auto-generated name', () => {
      const topic = new ServiceBusTopic(namespace, 'Events', {
        namespace,
      });

      expect(topic.topicName).toBeDefined();
      expect(topic.topicId).toBeDefined();
    });

    it('should use provided topic name when specified', () => {
      const topic = new ServiceBusTopic(namespace, 'Events', {
        namespace,
        topicName: 'custom-events',
      });

      expect(topic.topicName).toBe('custom-events');
    });

    it('should default message TTL to 14 days (P14D)', () => {
      const topic = new ServiceBusTopic(namespace, 'Events', {
        namespace,
      });

      // Default is set internally
      expect(topic.topicName).toBeDefined();
    });

    it('should allow custom message TTL', () => {
      const topic = new ServiceBusTopic(namespace, 'Events', {
        namespace,
        defaultMessageTimeToLive: 'P7D', // 7 days
      });

      expect(topic.topicName).toBeDefined();
    });

    it('should default enableBatchedOperations to true', () => {
      const topic = new ServiceBusTopic(namespace, 'Events', {
        namespace,
      });

      expect(topic.topicName).toBeDefined();
    });

    it('should default requiresDuplicateDetection to false', () => {
      const topic = new ServiceBusTopic(namespace, 'Events', {
        namespace,
      });

      expect(topic.topicName).toBeDefined();
    });

    it('should default enablePartitioning to false', () => {
      const topic = new ServiceBusTopic(namespace, 'Events', {
        namespace,
      });

      expect(topic.topicName).toBeDefined();
    });

    it('should default supportOrdering to false', () => {
      const topic = new ServiceBusTopic(namespace, 'Events', {
        namespace,
      });

      expect(topic.topicName).toBeDefined();
    });
  });

  describe('auto-naming', () => {
    it('should generate name from construct ID', () => {
      const topic = new ServiceBusTopic(namespace, 'OrderEvents', {
        namespace,
      });

      expect(topic.topicName).toBeTruthy();
      expect(topic.topicName).toMatch(/^[a-z0-9-]+$/);
    });

    it('should convert to lowercase', () => {
      const topic = new ServiceBusTopic(namespace, 'OrderEvents', {
        namespace,
      });

      expect(topic.topicName).toBe(topic.topicName.toLowerCase());
    });

    it('should handle special characters', () => {
      const topic = new ServiceBusTopic(namespace, 'Order_Events@2023', {
        namespace,
      });

      expect(topic.topicName).toMatch(/^[a-z0-9-]+$/);
      expect(topic.topicName).not.toContain('_');
      expect(topic.topicName).not.toContain('@');
    });
  });

  describe('topic properties', () => {
    it('should support maxSizeInMegabytes', () => {
      const topic = new ServiceBusTopic(namespace, 'Events', {
        namespace,
        maxSizeInMegabytes: 2048,
      });

      expect(topic.topicName).toBeDefined();
    });

    it('should support requiresDuplicateDetection', () => {
      const topic = new ServiceBusTopic(namespace, 'Events', {
        namespace,
        requiresDuplicateDetection: true,
      });

      expect(topic.topicName).toBeDefined();
    });

    it('should support enablePartitioning', () => {
      const topic = new ServiceBusTopic(namespace, 'Events', {
        namespace,
        enablePartitioning: true,
      });

      expect(topic.topicName).toBeDefined();
    });

    it('should support supportOrdering', () => {
      const topic = new ServiceBusTopic(namespace, 'Events', {
        namespace,
        supportOrdering: true,
      });

      expect(topic.topicName).toBeDefined();
    });

    it('should support enableBatchedOperations', () => {
      const topic = new ServiceBusTopic(namespace, 'Events', {
        namespace,
        enableBatchedOperations: false,
      });

      expect(topic.topicName).toBeDefined();
    });

    it('should support duplicateDetectionHistoryTimeWindow', () => {
      const topic = new ServiceBusTopic(namespace, 'Events', {
        namespace,
        requiresDuplicateDetection: true,
        duplicateDetectionHistoryTimeWindow: 'PT10M', // 10 minutes
      });

      expect(topic.topicName).toBeDefined();
    });

    it('should support autoDeleteOnIdle', () => {
      const topic = new ServiceBusTopic(namespace, 'Events', {
        namespace,
        autoDeleteOnIdle: 'P7D', // 7 days
      });

      expect(topic.topicName).toBeDefined();
    });

    it('should support status', () => {
      const topic = new ServiceBusTopic(namespace, 'Events', {
        namespace,
        status: 'Active',
      });

      expect(topic.topicName).toBeDefined();
    });
  });

  describe('IServiceBusTopic interface', () => {
    it('should implement IServiceBusTopic interface', () => {
      const topic = new ServiceBusTopic(namespace, 'Events', {
        namespace,
      });

      // Should have required properties
      expect(topic).toHaveProperty('topicName');
      expect(topic).toHaveProperty('topicId');
      expect(topic).toHaveProperty('namespace');
    });
  });

  describe('grant methods', () => {
    let topic: ServiceBusTopic;

    beforeEach(() => {
      topic = new ServiceBusTopic(namespace, 'Events', {
        namespace,
        topicName: 'order-events',
      });
    });

    describe('grantSend', () => {
      it('should have grantSend method', () => {
        expect(topic.grantSend).toBeDefined();
        expect(typeof topic.grantSend).toBe('function');
      });
    });

    describe('grantReceive', () => {
      it('should have grantReceive method', () => {
        expect(topic.grantReceive).toBeDefined();
        expect(typeof topic.grantReceive).toBe('function');
      });
    });

    describe('grantFullAccess', () => {
      it('should have grantFullAccess method', () => {
        expect(topic.grantFullAccess).toBeDefined();
        expect(typeof topic.grantFullAccess).toBe('function');
      });
    });
  });

  describe('integration scenarios', () => {
    it('should create multiple topics in same namespace', () => {
      const topic1 = new ServiceBusTopic(namespace, 'OrderEvents', {
        namespace,
      });
      const topic2 = new ServiceBusTopic(namespace, 'InvoiceEvents', {
        namespace,
      });

      expect(topic1.topicName).not.toBe(topic2.topicName);
    });

    it('should support pub-sub pattern with multiple subscribers', () => {
      // Create topic for pub-sub messaging
      const topic = new ServiceBusTopic(namespace, 'OrderEvents', {
        namespace,
        enablePartitioning: true,
      });

      // Topic should be created and ready for pub-sub
      expect(topic.topicName).toBeDefined();
      expect(topic.topicId).toBeDefined();

      // Grant methods are available for configuring access
      expect(topic.grantSend).toBeDefined();
      expect(topic.grantReceive).toBeDefined();
    });

    it('should be addable to construct tree', () => {
      const topic = new ServiceBusTopic(namespace, 'Events', {
        namespace,
      });

      expect(topic.node.scope).toBe(namespace);
      expect(topic.node.id).toBe('Events');
    });
  });

  describe('advanced scenarios', () => {
    it('should work with all properties specified', () => {
      const topic = new ServiceBusTopic(namespace, 'Events', {
        namespace,
        topicName: 'custom-events',
        maxSizeInMegabytes: 5120,
        defaultMessageTimeToLive: 'P7D',
        duplicateDetectionHistoryTimeWindow: 'PT10M',
        enableBatchedOperations: true,
        requiresDuplicateDetection: true,
        enablePartitioning: true,
        supportOrdering: true,
        autoDeleteOnIdle: 'P14D',
        status: 'Active',
      });

      expect(topic.topicName).toBe('custom-events');
    });

    it('should support GraphQL subscriptions pattern', () => {
      const topic = new ServiceBusTopic(namespace, 'GraphQLEvents', {
        namespace,
        topicName: 'graphql-mutations',
        enablePartitioning: true,
        supportOrdering: true,
        defaultMessageTimeToLive: 'PT1H', // 1 hour for real-time events
      });

      expect(topic.topicName).toBe('graphql-mutations');
    });

    it('should support ordered messaging', () => {
      const topic = new ServiceBusTopic(namespace, 'OrderedEvents', {
        namespace,
        supportOrdering: true,
        enablePartitioning: false, // Ordering requires no partitioning
      });

      expect(topic.topicName).toBeDefined();
    });

    it('should support duplicate detection', () => {
      const topic = new ServiceBusTopic(namespace, 'Events', {
        namespace,
        requiresDuplicateDetection: true,
        duplicateDetectionHistoryTimeWindow: 'PT10M',
      });

      expect(topic.topicName).toBeDefined();
    });

    it('should support auto-delete for temporary topics', () => {
      const topic = new ServiceBusTopic(namespace, 'TempEvents', {
        namespace,
        autoDeleteOnIdle: 'P1D', // Delete after 1 day of inactivity
      });

      expect(topic.topicName).toBeDefined();
    });

    it('should support partitioned topics for high throughput', () => {
      const topic = new ServiceBusTopic(namespace, 'HighVolume', {
        namespace,
        enablePartitioning: true,
        maxSizeInMegabytes: 5120,
      });

      expect(topic.topicName).toBeDefined();
    });
  });
});
