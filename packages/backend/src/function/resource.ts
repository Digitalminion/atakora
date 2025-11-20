/**
 * Function Customizations
 *
 * Functions are defined in schema/resource.ts using f.model().
 * This file provides customizations beyond the defaults.
 *
 * DEFAULT BEHAVIOR (without customization):
 * - POST /api/functions/{function-name} endpoint
 * - Azure Function with HTTP trigger
 * - Input/output schema validation
 * - Basic handler that echoes input
 * - 256MB memory, 30s timeout
 * - Standard Application Insights monitoring
 *
 * Use configureFunction() to override defaults:
 * - Custom handlers (business logic)
 * - Performance tuning (memory, timeout)
 * - Additional bindings (storage, queues, etc.)
 * - Environment variables
 * - Monitoring and alerts
 */

import {
  defineFunctions,
  configureFunction,
  minutes,
  greaterThan,
} from '@atakora/component/functions';

export const func = defineFunctions({
  /**
   * GenerateReport Function
   *
   * Long-running function that generates PDF/Excel reports.
   * Requires more memory and extended timeout.
   */
  GenerateReport: configureFunction('GenerateReport')
    // Performance settings for report generation
    .memory(1024) // 1GB for PDF rendering
    .timeout(minutes(10)) // Reports can take several minutes

    // Custom handler implementation
    .withHandler(async (context, input) => {
      const { datasetId, reportType, format, includeCharts, customFilters } = input;

      // Fetch dataset
      const dataset = await context.database.datasets.get(datasetId);
      if (!dataset) {
        throw new Error(`Dataset ${datasetId} not found`);
      }

      // Generate unique report ID
      const reportId = context.utils.generateId('rpt');

      // Start async report generation
      const generator = context.services.reportGenerator;
      const reportUrl = await generator.generate({
        dataset,
        type: reportType,
        format,
        charts: includeCharts,
        filters: customFilters,
      });

      // Set expiration (7 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Store report metadata
      await context.database.reports.create({
        id: reportId,
        datasetId,
        reportType,
        format,
        url: reportUrl,
        expiresAt,
        generatedBy: context.user.id,
        generatedAt: new Date(),
      });

      return {
        reportId,
        reportUrl,
        status: 'completed',
        expiresAt,
        metadata: {
          pages: generator.pageCount,
          fileSize: generator.fileSize,
        },
      };
    })

    // Output bindings
    .bindings({
      // Store report files in blob storage
      storage: {
        type: 'blob',
        container: 'reports',
        path: `{reportId}.${format}`,
      },
      // Queue for cleanup after expiration
      queue: {
        type: 'queue',
        name: 'report-cleanup',
        message: { reportId: '{reportId}', expiresAt: '{expiresAt}' },
      },
    })

    // Environment configuration
    .env({
      REPORT_STORAGE_ACCOUNT: 'required',
      MAX_REPORT_SIZE_MB: '100',
      ENABLE_WATERMARKS: 'true',
    })

    // Monitoring
    .monitoring(alerts =>
      alerts
        .onExecutionTime(greaterThan(minutes(8)))
        .warn()
        .withEmail('platform-team@company.com')

        .onFailureRate(greaterThan(0.05))
        .error()
    )

    .withMetrics()
    .withTracing(),

  /**
   * ValidateData Function
   *
   * Fast synchronous validation with moderate memory.
   */
  ValidateData: configureFunction('ValidateData')
    .memory(512)
    .timeout(minutes(2))

    .withHandler(async (context, input) => {
      const { datasetId, validationRules, strictMode } = input;

      // Load dataset
      const dataset = await context.database.datasets.get(datasetId);
      const data = await context.storage.blobs.download(dataset.fileUrl);

      // Initialize validator
      const validator = context.services.dataValidator;
      validator.setRules(validationRules);
      validator.setStrictMode(strictMode);

      // Validate
      const result = await validator.validate(data);

      // Return structured results
      return {
        isValid: result.isValid,
        errors: result.errors.map(err => ({
          row: err.rowNumber,
          column: err.columnName,
          message: err.message,
          severity: err.severity,
        })),
        warnings: result.warnings,
        summary: {
          totalRows: result.totalRows,
          validRows: result.validRows,
          invalidRows: result.invalidRows,
        },
      };
    })

    .monitoring(alerts =>
      alerts
        .onExecutionTime(greaterThan(minutes(1)))
        .warn()
    )

    .withMetrics(),

  /**
   * TransformData Function
   *
   * Heavy data transformation requiring high memory and CPU.
   */
  TransformData: configureFunction('TransformData')
    .memory(2048) // 2GB for large datasets
    .timeout(minutes(15))

    .withHandler(async (context, input) => {
      const { datasetId, transformations, outputFormat } = input;

      // Load source dataset
      const dataset = await context.database.datasets.get(datasetId);
      const sourceData = await context.storage.blobs.download(dataset.fileUrl);

      // Apply transformations
      const transformer = context.services.dataTransformer;
      let transformedData = sourceData;
      let transformsApplied = 0;

      for (const transform of transformations) {
        transformedData = await transformer.apply(
          transformedData,
          transform.type,
          transform.config
        );
        transformsApplied++;
      }

      // Generate output dataset
      const transformedDatasetId = context.utils.generateId('ds');
      const outputUrl = await context.storage.blobs.upload(
        `transformed/${transformedDatasetId}.${outputFormat}`,
        transformedData,
        { contentType: getMimeType(outputFormat) }
      );

      // Create dataset record
      await context.database.datasets.create({
        id: transformedDatasetId,
        name: `${dataset.name} (transformed)`,
        projectId: dataset.projectId,
        uploadedBy: context.user.id,
        fileUrl: outputUrl,
        fileSizeBytes: transformedData.length,
        status: 'completed',
        metadata: {
          sourceDatasetId: datasetId,
          transformations,
        },
      });

      return {
        transformedDatasetId,
        outputUrl,
        rowsProcessed: transformedData.rowCount,
        transformsApplied,
        duration: context.executionTime,
      };
    })

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

    .monitoring(alerts =>
      alerts
        .onExecutionTime(greaterThan(minutes(12)))
        .warn()

        .onMemoryUsage(greaterThan(1800))
        .warn()

        .onFailureRate(greaterThan(0.02))
        .critical()
        .withEmail('data-platform@company.com')
    )

    .withMetrics()
    .withTracing(),

  /**
   * SearchData Function
   *
   * AI-powered search with Azure AI Search integration.
   * Moderate resource requirements.
   */
  SearchData: configureFunction('SearchData')
    .memory(512)
    .timeout(minutes(1))

    .withHandler(async (context, input) => {
      const { query, filters, pagination, sortBy } = input;

      // Build search query
      const searchService = context.services.aiSearch;
      const searchQuery = searchService
        .query(query)
        .filter(filters.projectId ? `projectId eq '${filters.projectId}'` : null)
        .filter(filters.status ? `status in (${filters.status.join(',')})` : null)
        .filter(
          filters.dateRange
            ? `createdAt ge ${filters.dateRange.from} and createdAt le ${filters.dateRange.to}`
            : null
        )
        .page(pagination.page, pagination.pageSize)
        .orderBy(sortBy === 'relevance' ? '@search.score desc' : `${sortBy} desc`);

      // Execute search
      const results = await searchQuery.execute();

      // Return formatted results
      return {
        results: results.items.map(item => ({
          id: item.id,
          name: item.name,
          score: item['@search.score'],
          highlights: item['@search.highlights'],
        })),
        total: results.count,
        page: pagination.page,
        pageSize: pagination.pageSize,
        aggregations: results.facets,
      };
    })

    .env({
      AZURE_SEARCH_ENDPOINT: 'required',
      AZURE_SEARCH_KEY: 'required',
      SEARCH_INDEX_NAME: 'datasets',
    })

    .monitoring(alerts =>
      alerts
        .onExecutionTime(greaterThan(minutes(0.5)))
        .warn()

        .onFailureRate(greaterThan(0.01))
        .error()
    )

    .withMetrics(),

  /**
   * ProcessUpload Function
   *
   * No customization - uses all defaults.
   * This demonstrates that functions work without any configuration.
   *
   * Auto-generated:
   * - POST /api/functions/process-upload
   * - 256MB memory, 30s timeout
   * - Basic handler that validates input schema
   */
  // ProcessUpload: (no configuration needed)
});

/**
 * Helper function for MIME type mapping
 */
function getMimeType(format: string): string {
  const mimeTypes: Record<string, string> = {
    csv: 'text/csv',
    json: 'application/json',
    parquet: 'application/octet-stream',
    pdf: 'application/pdf',
    excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  return mimeTypes[format] || 'application/octet-stream';
}

/**
 * What this configuration provides:
 *
 * 1. Custom Business Logic
 *    - Full TypeScript implementation
 *    - Access to databases, storage, external services
 *    - Type-safe input/output based on schema
 *
 * 2. Performance Tuning
 *    - Memory allocation per function
 *    - Timeout configuration
 *    - Parallelism controls
 *
 * 3. Resource Bindings
 *    - Blob storage connections
 *    - Queue outputs
 *    - Event Grid publishing
 *    - Service Bus topics
 *
 * 4. Environment Configuration
 *    - Required vs optional variables
 *    - Default values
 *    - Secret references
 *
 * 5. Monitoring & Observability
 *    - Execution time alerts
 *    - Memory usage alerts
 *    - Failure rate monitoring
 *    - Custom metrics
 *    - Distributed tracing
 *
 * Functions without customization use sensible defaults and still work perfectly.
 */
