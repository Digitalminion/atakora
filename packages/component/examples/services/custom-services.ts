/**
 * Custom Services Example
 *
 * @remarks
 * This example demonstrates how to define custom services and use them
 * in function handlers.
 */

import {
  defineBackend,
  defineSchema,
  defineAuth,
  a,
  c,
  f,
  auth,
  singleton,
  type ServiceFactory,
  type ServiceFactoryContext,
  defineFunctions,
  configureFunction,
  type FunctionHandler,
} from '@atakora/component';
import {
  type EmailService,
  type EmailMessage,
  type EmailSendResult,
  type CacheService,
  InMemoryCacheService,
  MockEmailService,
} from '@atakora/component/functions';

// ============================================================================
// Custom Service Implementations
// ============================================================================

/**
 * Report Generator Service
 *
 * Generates PDF reports from dataset data.
 */
class ReportGeneratorService {
  constructor(
    private readonly config: {
      storageAccount: string;
      aiEndpoint: string;
    }
  ) {}

  async generate(dataset: any): Promise<string> {
    // In production, this would:
    // 1. Fetch dataset from database
    // 2. Generate PDF using AI service
    // 3. Upload to blob storage
    // 4. Return blob URL

    console.log('Generating report for dataset:', dataset.id);
    console.log('Using storage account:', this.config.storageAccount);
    console.log('Using AI endpoint:', this.config.aiEndpoint);

    // Mock report URL
    return `https://${this.config.storageAccount}.blob.core.windows.net/reports/report-${dataset.id}.pdf`;
  }
}

/**
 * Data Validator Service
 *
 * Validates uploaded datasets against business rules.
 */
class DataValidatorService {
  async validate(data: any, rules: any): Promise<{ valid: boolean; errors: string[] }> {
    // In production, this would validate against business rules
    console.log('Validating data with rules:', Object.keys(rules));

    const errors: string[] = [];

    // Example validation
    if (!data || typeof data !== 'object') {
      errors.push('Data must be an object');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * AI Search Service
 *
 * Provides semantic search capabilities using Azure AI Search.
 */
class AISearchService {
  constructor(
    private readonly config: {
      endpoint: string;
      key: string;
    }
  ) {}

  query(searchText: string) {
    return {
      filter: (filter: string) => ({
        execute: async () => {
          console.log('Executing AI search:', { searchText, filter });
          console.log('Using endpoint:', this.config.endpoint);

          // Mock search results
          return [
            { id: '1', title: 'Result 1', score: 0.95 },
            { id: '2', title: 'Result 2', score: 0.87 },
          ];
        },
      }),
    };
  }
}

// ============================================================================
// Schema Definition
// ============================================================================

const schema = defineSchema({
  schema: a.schema({
    /**
     * Dataset model
     */
    Dataset: c
      .model({
        id: a.id(),
        name: a.string().required(),
        data: a.json(),
        uploadedAt: a.datetime().required(),
        uploadedBy: a.string().required(),
      })
      .authorization((allow) => [allow.authenticated().read(), allow.owner('uploadedBy')]),

    /**
     * Report model
     */
    Report: c
      .model({
        id: a.id(),
        datasetId: a.ref('Dataset').required(),
        reportUrl: a.string().required(),
        generatedAt: a.datetime().required(),
        generatedBy: a.string().required(),
      })
      .authorization((allow) => [allow.authenticated().read(), allow.owner('generatedBy')]),

    /**
     * Generate Report function
     */
    GenerateReport: f
      .model({
        input: a.object({
          datasetId: a.string().required(),
        }),
        output: a.object({
          reportUrl: a.string().required(),
          status: a.string().required(),
        }),
      })
      .authorization((allow) => [allow.authenticated()]),

    /**
     * Validate Dataset function
     */
    ValidateDataset: f
      .model({
        input: a.object({
          datasetId: a.string().required(),
          rules: a.json(),
        }),
        output: a.object({
          valid: a.boolean().required(),
          errors: a.array(a.string()),
        }),
      })
      .authorization((allow) => [allow.authenticated()]),

    /**
     * Search Datasets function
     */
    SearchDatasets: f
      .model({
        input: a.object({
          query: a.string().required(),
          filter: a.string(),
        }),
        output: a.object({
          results: a.array(
            a.object({
              id: a.string(),
              title: a.string(),
              score: a.number(),
            })
          ),
        }),
      })
      .authorization((allow) => [allow.authenticated()]),
  }),
});

// ============================================================================
// Authentication Configuration
// ============================================================================

const authentication = defineAuth({
  Primary: auth
    .entra()
    .tenant(process.env.AZURE_TENANT_ID || 'test-tenant')
    .clientId(process.env.AZURE_CLIENT_ID || 'test-client')
    .primary(),
});

// ============================================================================
// Backend with Services
// ============================================================================

/**
 * Backend with custom services
 *
 * Services are defined as factory functions that receive execution context.
 * They can be per-request (default) or singletons (use singleton() wrapper).
 */
export const backend = defineBackend({
  schema,
  authentication,
  settings: {
    name: 'report-generator-app',
    region: 'eastus',
  },

  /**
   * Service registry
   *
   * Services are injected into function context and available via context.services
   */
  services: {
    /**
     * Report generator - per-request instance
     *
     * Creates a new service instance for each function invocation.
     * Has access to environment variables and backend settings.
     */
    reportGenerator: (context: ServiceFactoryContext) =>
      new ReportGeneratorService({
        storageAccount: context.env.STORAGE_ACCOUNT || 'teststorage',
        aiEndpoint: context.env.AI_ENDPOINT || 'https://ai.example.com',
      }),

    /**
     * Data validator - singleton instance
     *
     * Shared across all function invocations.
     * Use singleton() for stateless services that can be reused.
     */
    dataValidator: singleton(() => new DataValidatorService()),

    /**
     * AI search - singleton with configuration
     *
     * Singleton services can also accept configuration from environment.
     */
    aiSearch: singleton(
      () =>
        new AISearchService({
          endpoint: process.env.AZURE_SEARCH_ENDPOINT || 'https://search.example.com',
          key: process.env.AZURE_SEARCH_KEY || 'test-key',
        })
    ),

    /**
     * Email service - environment-specific
     *
     * Different implementation based on environment.
     * Use mock service in development, real service in production.
     */
    email: (context: ServiceFactoryContext): EmailService => {
      if (context.environment === 'production') {
        // In production, use real email service (e.g., SendGrid)
        // return new SendGridEmailService({ apiKey: context.env.SENDGRID_API_KEY! });

        // For this example, we still use mock
        return new MockEmailService({ logMessages: true });
      } else {
        // In development, use mock email service
        return new MockEmailService({ logMessages: true });
      }
    },

    /**
     * Cache service - singleton
     *
     * In-memory cache for development.
     * In production, use Redis or Azure Cache for Redis.
     */
    cache: singleton(() => new InMemoryCacheService({ defaultTtl: 300000 })),
  },
});

// Infer service types from backend
type Services = (typeof backend)['_serviceFactories'] extends Map<string, ServiceFactory<infer T>>
  ? T
  : never;

// ============================================================================
// Function Handlers Using Services
// ============================================================================

/**
 * Generate Report handler
 *
 * Uses the reportGenerator service to create PDF reports.
 */
const generateReportHandler: FunctionHandler = async (context, input: { datasetId: string }) => {
  context.log.info('Starting report generation', { datasetId: input.datasetId });

  // Get dataset from database
  const dataset = await context.database.Dataset.get(input.datasetId);

  if (!dataset) {
    throw new Error(`Dataset not found: ${input.datasetId}`);
  }

  // Use report generator service
  const reportUrl = await context.services.reportGenerator.generate(dataset);

  // Save report to database
  const report = await context.database.Report.create({
    datasetId: input.datasetId,
    reportUrl,
    generatedAt: new Date().toISOString(),
    generatedBy: context.user.id,
  });

  // Send email notification using email service
  await context.services.email.send({
    to: context.user.email,
    from: 'noreply@reportgenerator.com',
    subject: 'Report Generated',
    html: `<p>Your report has been generated and is available at: <a href="${reportUrl}">${reportUrl}</a></p>`,
  });

  context.log.info('Report generated successfully', { reportId: report.id });

  return {
    reportUrl,
    status: 'completed',
  };
};

/**
 * Validate Dataset handler
 *
 * Uses the dataValidator service to validate uploaded data.
 */
const validateDatasetHandler: FunctionHandler = async (
  context,
  input: { datasetId: string; rules: any }
) => {
  context.log.info('Validating dataset', { datasetId: input.datasetId });

  // Get dataset from database
  const dataset = await context.database.Dataset.get(input.datasetId);

  if (!dataset) {
    throw new Error(`Dataset not found: ${input.datasetId}`);
  }

  // Use data validator service
  const result = await context.services.dataValidator.validate(dataset.data, input.rules);

  context.log.info('Validation complete', { valid: result.valid, errorCount: result.errors.length });

  return result;
};

/**
 * Search Datasets handler
 *
 * Uses the aiSearch service to perform semantic search.
 */
const searchDatasetsHandler: FunctionHandler = async (
  context,
  input: { query: string; filter?: string }
) => {
  context.log.info('Searching datasets', { query: input.query, filter: input.filter });

  // Check cache first
  const cacheKey = `search:${input.query}:${input.filter || ''}`;
  const cachedResults = await context.services.cache.get(cacheKey);

  if (cachedResults) {
    context.log.info('Returning cached search results');
    return { results: cachedResults };
  }

  // Use AI search service
  let searchQuery = context.services.aiSearch.query(input.query);

  if (input.filter) {
    searchQuery = searchQuery.filter(input.filter);
  }

  const results = await searchQuery.execute();

  // Cache results for 5 minutes
  await context.services.cache.set(cacheKey, results, { ttl: 300000 });

  context.log.info('Search complete', { resultCount: results.length });

  return { results };
};

/**
 * Function configurations
 */
export const functions = defineFunctions({
  GenerateReport: configureFunction('GenerateReport')
    .memory(1024)
    .timeout(60000)
    .withHandler(generateReportHandler),

  ValidateDataset: configureFunction('ValidateDataset')
    .memory(512)
    .timeout(30000)
    .withHandler(validateDatasetHandler),

  SearchDatasets: configureFunction('SearchDatasets')
    .memory(512)
    .timeout(15000)
    .withHandler(searchDatasetsHandler),
});

// ============================================================================
// Testing with Mocked Services
// ============================================================================

/**
 * Example: Testing function with mocked services
 */
export async function testGenerateReport() {
  // Create test backend with mocked services
  const testBackend = defineBackend({
    schema,
    authentication,
    settings: { name: 'test-app' },
    services: {
      // Mock report generator for testing
      reportGenerator: () => ({
        generate: async (dataset: any) => {
          return `https://test-storage.blob.core.windows.net/reports/report-${dataset.id}.pdf`;
        },
      }),

      // Mock email service
      email: () => ({
        send: async (message: EmailMessage) => {
          console.log('Mock email sent:', message);
          return { success: true, messageId: 'mock-123' };
        },
      }),

      // Mock cache
      cache: () => new InMemoryCacheService(),

      // Other services...
      dataValidator: singleton(() => new DataValidatorService()),
      aiSearch: singleton(
        () =>
          new AISearchService({
            endpoint: 'https://test-search.example.com',
            key: 'test-key',
          })
      ),
    },
  });

  // Test would use testBackend to create function context
  console.log('Test backend created with mocked services');
}
