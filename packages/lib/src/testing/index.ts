/**
 * Testing utilities for validation and ARM template testing.
 *
 * @packageDocumentation
 */

// Test helpers
export {
  KnownValidationErrorCode,
  createInvalidDelegationSubnet,
  createValidDelegationSubnet,
  createSubnetWithMisplacedAddressPrefix,
  createLiteralNsgReference,
  createValidNsgReference,
  createNetworkLockedStorageAccount,
  createNetworkLockedOpenAIService,
  InvalidResourceBuilder,
  expectValidationError,
  expectNoValidationError,
} from './validation-test-helpers';

// Custom matchers
export { armTemplateMatchers, setupArmMatchers } from './arm-template-matchers';

// Deployment simulator
export { DeploymentSimulator, type DeploymentSimulationResult } from './deployment-simulator';

// Function testing utilities
export {
  FunctionTestUtils,
  expectFunctionToThrow,
  expectResponseStatus,
  expectResponseHeaders,
  type AzureFunctionContext,
  type Logger,
  type HttpRequest,
  type HttpResponse,
  type TimerInfo,
  type HttpHandler,
  type TimerHandler,
  type QueueHandler,
  type TriggerHandler,
} from './function-testing';

// Mock bindings
export {
  MockBindingStore,
  MockBlobStorage,
  MockQueueStorage,
  MockTableStorage,
  MockCosmosDb,
  createMockBindings,
  type BindingConfig,
  type BindingDirection,
  type HttpTriggerBinding,
  type TimerTriggerBinding,
  type QueueTriggerBinding,
  type BlobBinding,
  type TableBinding,
  type CosmosDbBinding,
  type ServiceBusBinding,
  type EventHubBinding,
} from './mock-bindings';
