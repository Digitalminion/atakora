/**
 * Bindings and Environment Configuration Tests
 *
 * @remarks
 * Tests for output bindings (storage, queue, Event Grid, Service Bus)
 * and environment variable configuration.
 */

import { describe, it, expect } from 'vitest';
import { configureFunction } from './configure-function';
import type {
  BindingConfig,
  StorageBinding,
  QueueBinding,
  EventBinding,
  ServiceBusBinding,
  EnvironmentConfig,
} from './types';

describe('Function Bindings', () => {
  describe('Storage Bindings', () => {
    it('should configure blob storage binding', () => {
      const config = configureFunction('TestFunction')
        .bindings({
          storage: {
            type: 'blob',
            container: 'reports',
            path: '{reportId}.pdf',
          },
        })
        ._build();

      expect(config.bindings).toBeDefined();
      expect(config.bindings?.storage).toEqual({
        type: 'blob',
        container: 'reports',
        path: '{reportId}.pdf',
      });
    });

    it('should support storage binding with connection string', () => {
      const config = configureFunction('TestFunction')
        .bindings({
          storage: {
            type: 'blob',
            container: 'uploads',
            path: 'files/{userId}/{fileId}',
            connection: 'SECONDARY_STORAGE',
          },
        })
        ._build();

      expect(config.bindings?.storage).toEqual({
        type: 'blob',
        container: 'uploads',
        path: 'files/{userId}/{fileId}',
        connection: 'SECONDARY_STORAGE',
      });
    });

    it('should support storage binding with templated path', () => {
      const config = configureFunction('ProcessUpload')
        .bindings({
          storage: {
            type: 'blob',
            container: 'processed',
            path: '{year}/{month}/{day}/{id}.{format}',
          },
        })
        ._build();

      expect(config.bindings?.storage?.path).toBe('{year}/{month}/{day}/{id}.{format}');
    });
  });

  describe('Queue Bindings', () => {
    it('should configure queue binding', () => {
      const config = configureFunction('TestFunction')
        .bindings({
          queue: {
            type: 'queue',
            name: 'processing-queue',
          },
        })
        ._build();

      expect(config.bindings?.queue).toEqual({
        type: 'queue',
        name: 'processing-queue',
      });
    });

    it('should support queue binding with message template', () => {
      const config = configureFunction('TestFunction')
        .bindings({
          queue: {
            type: 'queue',
            name: 'report-cleanup',
            message: { reportId: '{reportId}', expiresAt: '{expiresAt}' },
          },
        })
        ._build();

      expect(config.bindings?.queue).toEqual({
        type: 'queue',
        name: 'report-cleanup',
        message: { reportId: '{reportId}', expiresAt: '{expiresAt}' },
      });
    });

    it('should support queue binding with connection string', () => {
      const config = configureFunction('TestFunction')
        .bindings({
          queue: {
            type: 'queue',
            name: 'priority-queue',
            message: { id: '{id}', priority: 'high' },
            connection: 'QUEUE_STORAGE',
          },
        })
        ._build();

      expect(config.bindings?.queue?.connection).toBe('QUEUE_STORAGE');
    });

    it('should support complex message payloads', () => {
      const config = configureFunction('DataProcessor')
        .bindings({
          queue: {
            type: 'queue',
            name: 'data-processing',
            message: {
              id: '{id}',
              status: 'pending',
              metadata: {
                timestamp: '{timestamp}',
                user: '{userId}',
              },
            },
          },
        })
        ._build();

      expect(config.bindings?.queue?.message).toEqual({
        id: '{id}',
        status: 'pending',
        metadata: {
          timestamp: '{timestamp}',
          user: '{userId}',
        },
      });
    });
  });

  describe('Event Grid Bindings', () => {
    it('should configure Event Grid binding', () => {
      const config = configureFunction('TestFunction')
        .bindings({
          event: {
            type: 'eventGrid',
            topicName: 'data-events',
          },
        })
        ._build();

      expect(config.bindings?.event).toEqual({
        type: 'eventGrid',
        topicName: 'data-events',
      });
    });

    it('should support Event Grid binding with event type', () => {
      const config = configureFunction('TestFunction')
        .bindings({
          event: {
            type: 'eventGrid',
            topicName: 'data-transformed',
            eventType: 'DataTransformation.Completed',
          },
        })
        ._build();

      expect(config.bindings?.event?.eventType).toBe('DataTransformation.Completed');
    });

    it('should support Event Grid binding with subject', () => {
      const config = configureFunction('TestFunction')
        .bindings({
          event: {
            type: 'eventGrid',
            topicName: 'data-events',
            subject: '/datasets/{datasetId}',
          },
        })
        ._build();

      expect(config.bindings?.event?.subject).toBe('/datasets/{datasetId}');
    });

    it('should support Event Grid binding with all options', () => {
      const config = configureFunction('DataPublisher')
        .bindings({
          event: {
            type: 'eventGrid',
            topicName: 'analytics-events',
            eventType: 'Analytics.ReportGenerated',
            subject: '/reports/{reportId}',
          },
        })
        ._build();

      expect(config.bindings?.event).toEqual({
        type: 'eventGrid',
        topicName: 'analytics-events',
        eventType: 'Analytics.ReportGenerated',
        subject: '/reports/{reportId}',
      });
    });
  });

  describe('Service Bus Bindings', () => {
    it('should configure Service Bus queue binding', () => {
      const config = configureFunction('TestFunction')
        .bindings({
          serviceBus: {
            type: 'serviceBus',
            queueName: 'processing-queue',
          },
        })
        ._build();

      expect(config.bindings?.serviceBus).toEqual({
        type: 'serviceBus',
        queueName: 'processing-queue',
      });
    });

    it('should configure Service Bus topic binding', () => {
      const config = configureFunction('TestFunction')
        .bindings({
          serviceBus: {
            type: 'serviceBus',
            topicName: 'data-events',
          },
        })
        ._build();

      expect(config.bindings?.serviceBus).toEqual({
        type: 'serviceBus',
        topicName: 'data-events',
      });
    });

    it('should support Service Bus binding with connection string', () => {
      const config = configureFunction('TestFunction')
        .bindings({
          serviceBus: {
            type: 'serviceBus',
            queueName: 'priority-queue',
            connection: 'SERVICE_BUS_CONNECTION',
          },
        })
        ._build();

      expect(config.bindings?.serviceBus).toEqual({
        type: 'serviceBus',
        queueName: 'priority-queue',
        connection: 'SERVICE_BUS_CONNECTION',
      });
    });
  });

  describe('Multiple Bindings', () => {
    it('should support multiple bindings simultaneously', () => {
      const config = configureFunction('ComplexFunction')
        .bindings({
          storage: {
            type: 'blob',
            container: 'reports',
            path: '{reportId}.pdf',
          },
          queue: {
            type: 'queue',
            name: 'cleanup-queue',
            message: { reportId: '{reportId}' },
          },
          event: {
            type: 'eventGrid',
            topicName: 'report-events',
          },
        })
        ._build();

      expect(config.bindings).toBeDefined();
      expect(config.bindings?.storage).toBeDefined();
      expect(config.bindings?.queue).toBeDefined();
      expect(config.bindings?.event).toBeDefined();
    });

    it('should support all binding types together', () => {
      const config = configureFunction('FullFunction')
        .bindings({
          storage: {
            type: 'blob',
            container: 'data',
            path: '{id}.json',
          },
          queue: {
            type: 'queue',
            name: 'notifications',
          },
          event: {
            type: 'eventGrid',
            topicName: 'events',
          },
          serviceBus: {
            type: 'serviceBus',
            topicName: 'enterprise-events',
          },
        })
        ._build();

      expect(config.bindings?.storage).toBeDefined();
      expect(config.bindings?.queue).toBeDefined();
      expect(config.bindings?.event).toBeDefined();
      expect(config.bindings?.serviceBus).toBeDefined();
    });
  });

  describe('Binding Immutability', () => {
    it('should create immutable binding configuration', () => {
      const bindings: BindingConfig = {
        storage: {
          type: 'blob',
          container: 'test',
          path: 'test.txt',
        },
      };

      const config = configureFunction('TestFunction').bindings(bindings)._build();

      // Modify original
      (bindings as any).storage = null;

      // Config should still have binding
      expect(config.bindings?.storage).toBeDefined();
    });
  });
});

describe('Environment Variables', () => {
  describe('Required Variables', () => {
    it('should configure required environment variable', () => {
      const config = configureFunction('TestFunction')
        .env({
          STORAGE_ACCOUNT: 'required',
        })
        ._build();

      expect(config.environment).toEqual({
        STORAGE_ACCOUNT: 'required',
      });
    });

    it('should support multiple required variables', () => {
      const config = configureFunction('TestFunction')
        .env({
          AZURE_SEARCH_ENDPOINT: 'required',
          AZURE_SEARCH_KEY: 'required',
          DATABASE_CONNECTION: 'required',
        })
        ._build();

      expect(config.environment).toEqual({
        AZURE_SEARCH_ENDPOINT: 'required',
        AZURE_SEARCH_KEY: 'required',
        DATABASE_CONNECTION: 'required',
      });
    });
  });

  describe('Optional Variables with Defaults', () => {
    it('should configure optional environment variables', () => {
      const config = configureFunction('TestFunction')
        .env({
          MAX_FILE_SIZE_MB: '100',
          ENABLE_DEBUG: 'false',
        })
        ._build();

      expect(config.environment).toEqual({
        MAX_FILE_SIZE_MB: '100',
        ENABLE_DEBUG: 'false',
      });
    });

    it('should support various value types as strings', () => {
      const config = configureFunction('TestFunction')
        .env({
          MAX_RETRIES: '3',
          TIMEOUT_MS: '30000',
          ENABLE_FEATURE: 'true',
          API_VERSION: 'v1',
        })
        ._build();

      expect(config.environment?.MAX_RETRIES).toBe('3');
      expect(config.environment?.TIMEOUT_MS).toBe('30000');
      expect(config.environment?.ENABLE_FEATURE).toBe('true');
      expect(config.environment?.API_VERSION).toBe('v1');
    });
  });

  describe('Mixed Required and Optional', () => {
    it('should support mix of required and optional variables', () => {
      const config = configureFunction('TestFunction')
        .env({
          STORAGE_ACCOUNT: 'required',
          MAX_FILE_SIZE_MB: '100',
          API_KEY: 'required',
          ENABLE_WATERMARKS: 'true',
        })
        ._build();

      expect(config.environment).toEqual({
        STORAGE_ACCOUNT: 'required',
        MAX_FILE_SIZE_MB: '100',
        API_KEY: 'required',
        ENABLE_WATERMARKS: 'true',
      });
    });

    it('should match reference implementation pattern', () => {
      const config = configureFunction('GenerateReport')
        .env({
          REPORT_STORAGE_ACCOUNT: 'required',
          MAX_REPORT_SIZE_MB: '100',
          ENABLE_WATERMARKS: 'true',
        })
        ._build();

      expect(config.environment?.REPORT_STORAGE_ACCOUNT).toBe('required');
      expect(config.environment?.MAX_REPORT_SIZE_MB).toBe('100');
      expect(config.environment?.ENABLE_WATERMARKS).toBe('true');
    });
  });

  describe('Environment Variable Naming', () => {
    it('should support various naming conventions', () => {
      const config = configureFunction('TestFunction')
        .env({
          AZURE_STORAGE_ACCOUNT: 'required',
          max_file_size: '100',
          'feature.flags.enabled': 'true',
          'app:setting:value': 'test',
        })
        ._build();

      expect(config.environment).toBeDefined();
      expect(Object.keys(config.environment!).length).toBe(4);
    });
  });

  describe('Environment Immutability', () => {
    it('should preserve environment configuration reference', () => {
      const env: EnvironmentConfig = {
        TEST_VAR: 'value',
      };

      const config = configureFunction('TestFunction').env(env)._build();

      // Environment is stored by reference (shallow copy)
      expect(config.environment).toBe(env);
      expect(config.environment?.TEST_VAR).toBe('value');
    });

    it('should not affect config when chaining multiple env calls', () => {
      const config1 = configureFunction('TestFunction').env({ VAR1: 'value1' })._build();

      const config2 = configureFunction('TestFunction')
        .env({ VAR1: 'value1' })
        .env({ VAR2: 'value2' })
        ._build();

      // Second env() call replaces first
      expect(config1.environment).toEqual({ VAR1: 'value1' });
      expect(config2.environment).toEqual({ VAR2: 'value2' });
    });
  });
});

describe('Complete Configuration', () => {
  it('should support bindings and environment together', () => {
    const config = configureFunction('ProcessUpload')
      .bindings({
        storage: {
          type: 'blob',
          container: 'uploads',
          path: '{userId}/{fileId}',
        },
        queue: {
          type: 'queue',
          name: 'processing-queue',
        },
      })
      .env({
        STORAGE_ACCOUNT: 'required',
        MAX_FILE_SIZE_MB: '100',
      })
      ._build();

    expect(config.bindings).toBeDefined();
    expect(config.environment).toBeDefined();
    expect(config.bindings?.storage?.container).toBe('uploads');
    expect(config.environment?.STORAGE_ACCOUNT).toBe('required');
  });

  it('should match reference backend pattern', () => {
    const config = configureFunction('GenerateReport')
      .memory(1024)
      .timeout(600000)
      .bindings({
        storage: {
          type: 'blob',
          container: 'reports',
          path: '{reportId}.{format}',
        },
        queue: {
          type: 'queue',
          name: 'report-cleanup',
          message: { reportId: '{reportId}', expiresAt: '{expiresAt}' },
        },
      })
      .env({
        REPORT_STORAGE_ACCOUNT: 'required',
        MAX_REPORT_SIZE_MB: '100',
        ENABLE_WATERMARKS: 'true',
      })
      ._build();

    expect(config.name).toBe('GenerateReport');
    expect(config.memory).toBe(1024);
    expect(config.timeout).toBe(600000);
    expect(config.bindings?.storage?.container).toBe('reports');
    expect(config.bindings?.queue?.name).toBe('report-cleanup');
    expect(config.environment?.REPORT_STORAGE_ACCOUNT).toBe('required');
  });

  it('should support full configuration chain', () => {
    const handler = async (context: any, input: any) => {
      return { success: true };
    };

    const config = configureFunction('CompleteFunction')
      .memory(2048)
      .timeout(900000)
      .withHandler(handler)
      .bindings({
        storage: {
          type: 'blob',
          container: 'datasets',
          path: 'transformed/{id}',
        },
        event: {
          type: 'eventGrid',
          topicName: 'data-transformed',
        },
      })
      .env({
        MAX_DATASET_SIZE_MB: '500',
        ENABLE_PARALLEL_PROCESSING: 'true',
      })
      .withMetrics()
      .withTracing()
      ._build();

    expect(config.name).toBe('CompleteFunction');
    expect(config.memory).toBe(2048);
    expect(config.timeout).toBe(900000);
    expect(config.handler).toBe(handler);
    expect(config.bindings?.storage).toBeDefined();
    expect(config.bindings?.event).toBeDefined();
    expect(config.environment?.MAX_DATASET_SIZE_MB).toBe('500');
    expect(config.monitoring?.metrics).toBe(true);
    expect(config.monitoring?.tracing).toBe(true);
  });
});

describe('Type Safety', () => {
  it('should enforce correct binding types', () => {
    const storageBinding: StorageBinding = {
      type: 'blob',
      container: 'test',
      path: 'test.txt',
    };

    const queueBinding: QueueBinding = {
      type: 'queue',
      name: 'test-queue',
    };

    const eventBinding: EventBinding = {
      type: 'eventGrid',
      topicName: 'test-topic',
    };

    const serviceBusBinding: ServiceBusBinding = {
      type: 'serviceBus',
      queueName: 'test-queue',
    };

    expect(storageBinding.type).toBe('blob');
    expect(queueBinding.type).toBe('queue');
    expect(eventBinding.type).toBe('eventGrid');
    expect(serviceBusBinding.type).toBe('serviceBus');
  });

  it('should enforce environment config types', () => {
    const env: EnvironmentConfig = {
      REQUIRED_VAR: 'required',
      OPTIONAL_VAR: 'default-value',
    };

    expect(env.REQUIRED_VAR).toBe('required');
    expect(env.OPTIONAL_VAR).toBe('default-value');
  });
});
