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
