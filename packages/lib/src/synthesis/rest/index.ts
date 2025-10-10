/**
 * REST API Synthesis
 *
 * Provides synthesis infrastructure for converting RestApiStack constructs
 * to Azure API Management ARM templates.
 *
 * @packageDocumentation
 */

// Main synthesizer
export { RestApiSynthesizer } from './rest-api-synthesizer';

// Component synthesizers
export { OperationSynthesizer } from './operation-synthesizer';
export { BackendSynthesizer } from './backend-synthesizer';

// Types
export type {
  RestApiSynthesisOptions,
  RestApiSynthesisResult,
  ArmTemplateParameter,
  ArmRequestRepresentation,
  ArmResponseRepresentation,
  ArmQueryParameter,
  ArmHeaderParameter,
  ArmOperationRequest,
  ArmOperationResponse,
  ArmOperationProperties,
  BackendResourceIdentifier,
  ArmBackendCredentials,
  ArmBackendTls,
  ArmCircuitBreakerRule,
  ArmBackendProperties,
} from './types';

export { SynthesisError } from './types';
