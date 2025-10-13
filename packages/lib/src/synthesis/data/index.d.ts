/**
 * Data synthesis exports.
 *
 * @remarks
 * Synthesizers for transforming Atakora schemas into Azure data infrastructure.
 *
 * @packageDocumentation
 */
export { synthesizeCosmosContainer, validateContainerConfig, IndexingMode, IndexKind, DataType, type CosmosContainerConfig, type IndexingPolicy, type UniqueKeyPolicy, type UniqueKey, type IncludedPath, type ExcludedPath, } from './cosmos-synthesizer';
export { synthesizeEventTopics, validateEventSynthesis, EventType, type TopicConfig, type SubscriptionConfig, type SqlFilter, type EventSynthesisResult, } from './event-synthesizer';
export { synthesizeResolvers, validateResolverSynthesis, generateResolverCode, ResolverOperation, type ResolverConfig, type ResolverSynthesisResult, } from './resolver-synthesizer';
export { DataStackSynthesizer, validateDataStackManifest, type DataStackManifest, type DataStackSynthesisOptions, type DependencyGraph, type DependencyNode, } from './data-stack-synthesizer';
//# sourceMappingURL=index.d.ts.map