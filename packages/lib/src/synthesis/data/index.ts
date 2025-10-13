/**
 * Data synthesis exports.
 *
 * @remarks
 * Synthesizers for transforming Atakora schemas into Azure data infrastructure.
 *
 * @packageDocumentation
 */

// Cosmos DB Synthesizer
export {
  synthesizeCosmosContainer,
  validateContainerConfig,
  IndexingMode,
  IndexKind,
  DataType,
  type CosmosContainerConfig,
  type IndexingPolicy,
  type UniqueKeyPolicy,
  type UniqueKey,
  type IncludedPath,
  type ExcludedPath,
} from './cosmos-synthesizer';

// Event Synthesizer
export {
  synthesizeEventTopics,
  validateEventSynthesis,
  EventType,
  type TopicConfig,
  type SubscriptionConfig,
  type SqlFilter,
  type EventSynthesisResult,
} from './event-synthesizer';

// Resolver Synthesizer
export {
  synthesizeResolvers,
  validateResolverSynthesis,
  generateResolverCode,
  ResolverOperation,
  type ResolverConfig,
  type ResolverSynthesisResult,
} from './resolver-synthesizer';

// Data Stack Synthesizer
export {
  DataStackSynthesizer,
  validateDataStackManifest,
  type DataStackManifest,
  type DataStackSynthesisOptions,
  type DependencyGraph,
  type DependencyNode,
} from './data-stack-synthesizer';
