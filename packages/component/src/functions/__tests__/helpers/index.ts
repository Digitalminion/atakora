/**
 * Test Helpers Index
 *
 * @remarks
 * Central export point for all test utilities.
 */

// Cosmos DB Test Helper
export {
  CosmosTestHelper,
  COSMOS_EMULATOR_CONFIG,
  createTestDatabaseId,
  createTestDataFactory,
} from './cosmos-test-helper';
export type { TestDatabaseConfig } from './cosmos-test-helper';

// Storage Test Helper
export { StorageTestHelper, AZURITE_CONFIG, createTestContainerName } from './storage-test-helper';
export type { TestStorageConfig } from './storage-test-helper';

// Application Insights Test Helper
export {
  MockInsightsClient,
  TelemetryAssertions,
  createMockInsightsClient,
  createTelemetryAssertions,
  LogLevel,
  TelemetryType,
} from './insights-test-helper';
export type {
  TelemetryItem,
  TraceTelemetry,
  EventTelemetry,
  MetricTelemetry,
  ExceptionTelemetry,
  DependencyTelemetry,
  RequestTelemetry,
  Telemetry,
} from './insights-test-helper';

// Integration Test Helper
export {
  IntegrationTestHelper,
  createIntegrationTestHelper,
  shouldRunIntegrationTests,
  skipIfEmulatorsNotAvailable,
} from './integration-helper';
export type { IntegrationTestConfig, IntegrationTestResources } from './integration-helper';

// Performance Test Helper
export {
  PerformanceTimer,
  PerformanceAssertions,
  calculateStats,
  benchmark,
  formatBenchmarkResult,
  takeMemorySnapshot,
  calculateMemoryDelta,
  formatMemorySnapshot,
} from './performance-helper';
export type {
  PerformanceMeasurement,
  PerformanceStats,
  BenchmarkConfig,
  BenchmarkResult,
  MemorySnapshot,
} from './performance-helper';
