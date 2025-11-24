# Phase 2: Bindings & Environment Configuration Examples

This document demonstrates the binding and environment variable configuration capabilities implemented in Phase 2.

## Overview

Phase 2 adds support for:

- **Output Bindings**: Storage (blob), Queue, Event Grid, Service Bus
- **Environment Variables**: Required and optional configurations
- **Connection Strings**: Custom connections for different services

## Binding Types

### 1. Storage Bindings

Store output data in Azure Blob Storage.

```typescript
import { configureFunction } from '@atakora/component/functions';

const uploadFunction = configureFunction('ProcessUpload').bindings({
  storage: {
    type: 'blob',
    container: 'uploads',
    path: '{userId}/{fileId}',
  },
});
```

#### With Custom Connection

```typescript
configureFunction('ArchiveData').bindings({
  storage: {
    type: 'blob',
    container: 'archives',
    path: '{year}/{month}/{id}.json',
    connection: 'ARCHIVE_STORAGE_CONNECTION',
  },
});
```

### 2. Queue Bindings

Send messages to Azure Storage Queues for async processing.

```typescript
configureFunction('GenerateReport').bindings({
  queue: {
    type: 'queue',
    name: 'report-cleanup',
    message: {
      reportId: '{reportId}',
      expiresAt: '{expiresAt}',
    },
  },
});
```

#### Queue Without Message Template

```typescript
configureFunction('TriggerProcessing').bindings({
  queue: {
    type: 'queue',
    name: 'processing-queue',
    // No message template - uses function output
  },
});
```

### 3. Event Grid Bindings

Publish events to Azure Event Grid topics.

```typescript
configureFunction('DataTransformed').bindings({
  event: {
    type: 'eventGrid',
    topicName: 'data-events',
    subject: '/datasets/{datasetId}',
  },
});
```

#### With Event Type

```typescript
configureFunction('ReportCompleted').bindings({
  event: {
    type: 'eventGrid',
    topicName: 'analytics-events',
    eventType: 'Analytics.ReportGenerated',
    subject: '/reports/{reportId}',
  },
});
```

### 4. Service Bus Bindings

Send messages to Azure Service Bus queues or topics.

#### Service Bus Queue

```typescript
configureFunction('OrderProcessor').bindings({
  serviceBus: {
    type: 'serviceBus',
    queueName: 'order-processing',
    connection: 'SERVICE_BUS_CONNECTION',
  },
});
```

#### Service Bus Topic

```typescript
configureFunction('NotificationSender').bindings({
  serviceBus: {
    type: 'serviceBus',
    topicName: 'notifications',
  },
});
```

## Multiple Bindings

Combine multiple bindings for complex workflows.

```typescript
import { configureFunction, minutes } from '@atakora/component/functions';

const reportFunction = configureFunction('GenerateReport')
  .memory(1024)
  .timeout(minutes(10))
  .bindings({
    // Store report file
    storage: {
      type: 'blob',
      container: 'reports',
      path: '{reportId}.{format}',
    },
    // Queue cleanup task
    queue: {
      type: 'queue',
      name: 'report-cleanup',
      message: {
        reportId: '{reportId}',
        expiresAt: '{expiresAt}',
      },
    },
    // Publish event
    event: {
      type: 'eventGrid',
      topicName: 'report-events',
      eventType: 'Report.Generated',
    },
  });
```

## Environment Variables

### Required Variables

Variables marked as `'required'` must be provided at deployment.

```typescript
configureFunction('SearchData').env({
  AZURE_SEARCH_ENDPOINT: 'required',
  AZURE_SEARCH_KEY: 'required',
});
```

### Optional Variables with Defaults

Provide default values for optional configuration.

```typescript
configureFunction('ValidateData').env({
  MAX_FILE_SIZE_MB: '100',
  ENABLE_DEBUG: 'false',
  TIMEOUT_MS: '30000',
});
```

### Mixed Required and Optional

```typescript
configureFunction('ProcessData').env({
  // Required
  STORAGE_ACCOUNT: 'required',
  API_KEY: 'required',

  // Optional with defaults
  MAX_RETRIES: '3',
  BATCH_SIZE: '100',
  ENABLE_LOGGING: 'true',
});
```

## Complete Examples

### Example 1: File Processing Function

```typescript
import { configureFunction, minutes, greaterThan } from '@atakora/component/functions';

const processUpload = configureFunction('ProcessUpload')
  .memory(512)
  .timeout(minutes(5))
  .withHandler(async (context, input) => {
    const { userId, fileId, fileName } = input;

    // Download file from temporary storage
    const fileData = await context.storage.blobs.download(input.tempUrl);

    // Process file
    const processed = await processFile(fileData);

    // Upload to permanent storage
    const permanentUrl = await context.storage.blobs.upload(
      `${userId}/${fileId}/${fileName}`,
      processed
    );

    return {
      fileId,
      status: 'completed',
      url: permanentUrl,
    };
  })
  .bindings({
    storage: {
      type: 'blob',
      container: 'processed-files',
      path: '{userId}/{fileId}/{fileName}',
    },
    queue: {
      type: 'queue',
      name: 'file-notifications',
      message: {
        userId: '{userId}',
        fileId: '{fileId}',
        status: 'completed',
      },
    },
  })
  .env({
    STORAGE_ACCOUNT: 'required',
    MAX_FILE_SIZE_MB: '50',
    ALLOWED_EXTENSIONS: 'pdf,docx,xlsx',
  })
  .monitoring((alerts) => alerts.onExecutionTime(greaterThan(minutes(4))).warn())
  .withMetrics();
```

### Example 2: Data Transformation Pipeline

```typescript
import { configureFunction, minutes, hours } from '@atakora/component/functions';

const transformData = configureFunction('TransformData')
  .memory(2048)
  .timeout(minutes(15))
  .withHandler(async (context, input) => {
    const { datasetId, transformations } = input;

    // Load source data
    const dataset = await context.database.datasets.get(datasetId);
    const sourceData = await context.storage.blobs.download(dataset.fileUrl);

    // Apply transformations
    let transformedData = sourceData;
    for (const transform of transformations) {
      transformedData = await applyTransformation(transformedData, transform);
    }

    // Generate output dataset
    const outputId = context.utils.generateId('ds');
    const outputUrl = await context.storage.blobs.upload(
      `transformed/${outputId}.parquet`,
      transformedData
    );

    return {
      datasetId: outputId,
      outputUrl,
      transformationsApplied: transformations.length,
    };
  })
  .bindings({
    storage: {
      type: 'blob',
      container: 'datasets',
      path: 'transformed/{id}.parquet',
    },
    event: {
      type: 'eventGrid',
      topicName: 'data-transformed',
      eventType: 'Data.TransformationCompleted',
      subject: '/datasets/{id}',
    },
    serviceBus: {
      type: 'serviceBus',
      topicName: 'data-pipeline-events',
    },
  })
  .env({
    MAX_DATASET_SIZE_MB: '500',
    ENABLE_PARALLEL_PROCESSING: 'true',
    TRANSFORMATION_TIMEOUT_MS: '600000',
  })
  .monitoring((alerts) =>
    alerts
      .onExecutionTime(greaterThan(minutes(12)))
      .warn()
      .withEmail('data-platform@company.com')

      .onMemoryUsage(greaterThan(1800))
      .warn()

      .onFailureRate(greaterThan(0.02))
      .error()
  )
  .withMetrics()
  .withTracing();
```

### Example 3: Search Function with External Service

```typescript
import { configureFunction, seconds, greaterThan } from '@atakora/component/functions';

const searchData = configureFunction('SearchData')
  .memory(512)
  .timeout(seconds(30))
  .withHandler(async (context, input) => {
    const { query, filters, pagination } = input;

    // Build search query using Azure AI Search
    const searchService = context.services.aiSearch;
    const results = await searchService
      .query(query)
      .filter(filters)
      .page(pagination.page, pagination.pageSize)
      .execute();

    return {
      results: results.items,
      total: results.count,
      page: pagination.page,
    };
  })
  .env({
    AZURE_SEARCH_ENDPOINT: 'required',
    AZURE_SEARCH_KEY: 'required',
    SEARCH_INDEX_NAME: 'datasets',
    MAX_RESULTS_PER_PAGE: '50',
  })
  .monitoring((alerts) =>
    alerts
      .onExecutionTime(greaterThan(seconds(5)))
      .warn()

      .onFailureRate(greaterThan(0.01))
      .error()
  )
  .withMetrics();
```

## Reference Backend Implementation

The implementation matches the reference backend pattern from `/packages/backend/src/function/resource.ts`:

```typescript
// Reference implementation (lines 94-114)
export const func = defineFunctions({
  GenerateReport: configureFunction('GenerateReport')
    .bindings({
      storage: {
        type: 'blob',
        container: 'reports',
        path: `{reportId}.{format}`,
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
    }),
});
```

## Type Safety

All bindings and environment configurations are fully typed:

```typescript
import type {
  BindingConfig,
  StorageBinding,
  QueueBinding,
  EventBinding,
  ServiceBusBinding,
  EnvironmentConfig,
} from '@atakora/component/functions';

// Type-safe binding configuration
const bindings: BindingConfig = {
  storage: {
    type: 'blob',
    container: 'data',
    path: '{id}.json',
  },
  queue: {
    type: 'queue',
    name: 'notifications',
  },
};

// Type-safe environment configuration
const env: EnvironmentConfig = {
  REQUIRED_VAR: 'required',
  OPTIONAL_VAR: 'default',
};
```

## Summary

Phase 2 implementation provides:

- **4 Binding Types**: Storage, Queue, Event Grid, Service Bus
- **Connection String Support**: All bindings support custom connections
- **Environment Variables**: Required and optional configurations
- **Type Safety**: Full TypeScript support with comprehensive types
- **Builder Pattern**: Fluent, chainable API
- **Test Coverage**: 31 tests covering all binding types and scenarios

All features match the reference backend implementation and follow the established architectural patterns.
