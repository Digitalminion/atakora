/**
 * Event Synthesizer - Converts Atakora schemas to Service Bus event topics and subscriptions.
 *
 * @remarks
 * Transforms schema relationships into event-driven architectures:
 * - Generates Service Bus topics for entity mutations
 * - Creates subscriptions for relationship updates
 * - Builds SQL filters based on foreign keys
 *
 * @packageDocumentation
 */
import type { SchemaDefinition } from '../../schema/atakora/schema-types';
import { SchemaRegistry } from '../../schema/atakora/define-schema';
/**
 * Event types for entity mutations.
 */
export declare enum EventType {
    CREATED = "created",
    UPDATED = "updated",
    DELETED = "deleted",
    CUSTOM = "custom"
}
/**
 * Service Bus topic configuration.
 */
export interface TopicConfig {
    /**
     * Topic name.
     */
    readonly topicName: string;
    /**
     * Entity name this topic is for.
     */
    readonly entityName: string;
    /**
     * Event types published to this topic.
     */
    readonly eventTypes: EventType[];
    /**
     * Enable duplicate detection.
     */
    readonly requiresDuplicateDetection?: boolean;
    /**
     * Duplicate detection window in ISO 8601 format.
     */
    readonly duplicateDetectionHistoryTimeWindow?: string;
    /**
     * Enable partitioning.
     */
    readonly enablePartitioning?: boolean;
    /**
     * Default message TTL in ISO 8601 format.
     */
    readonly defaultMessageTimeToLive?: string;
    /**
     * Max size in megabytes.
     */
    readonly maxSizeInMegabytes?: number;
}
/**
 * SQL filter for Service Bus subscription.
 */
export interface SqlFilter {
    /**
     * SQL filter expression.
     */
    readonly sqlExpression: string;
    /**
     * Require SQL preprocessing.
     */
    readonly requiresPreprocessing?: boolean;
}
/**
 * Service Bus subscription configuration.
 */
export interface SubscriptionConfig {
    /**
     * Subscription name.
     */
    readonly subscriptionName: string;
    /**
     * Topic name this subscription is for.
     */
    readonly topicName: string;
    /**
     * SQL filter for subscription.
     */
    readonly filter?: SqlFilter;
    /**
     * Entity name for the subscriber.
     */
    readonly subscriberEntity: string;
    /**
     * Relationship name that triggered this subscription.
     */
    readonly relationshipName: string;
    /**
     * Foreign key field used in the filter.
     */
    readonly foreignKeyField?: string;
    /**
     * Lock duration in ISO 8601 format.
     */
    readonly lockDuration?: string;
    /**
     * Max delivery count before dead-lettering.
     */
    readonly maxDeliveryCount?: number;
    /**
     * Enable dead lettering on message expiration.
     */
    readonly deadLetteringOnMessageExpiration?: boolean;
    /**
     * Enable dead lettering on filter evaluation exceptions.
     */
    readonly deadLetteringOnFilterEvaluationExceptions?: boolean;
}
/**
 * Event synthesis result.
 */
export interface EventSynthesisResult {
    /**
     * Topic configurations.
     */
    readonly topics: TopicConfig[];
    /**
     * Subscription configurations.
     */
    readonly subscriptions: SubscriptionConfig[];
}
/**
 * Synthesize Service Bus topics and subscriptions from schemas.
 *
 * @param schemas - Array of schema definitions
 * @param registry - Optional schema registry for validation
 * @returns Event synthesis result
 *
 * @example
 * ```typescript
 * const result = synthesizeEventTopics([UserSchema, PostSchema, CommentSchema]);
 * // Returns {
 * //   topics: [
 * //     { topicName: 'user-events', entityName: 'User', ... },
 * //     { topicName: 'post-events', entityName: 'Post', ... }
 * //   ],
 * //   subscriptions: [
 * //     { subscriptionName: 'user-posts-sub', topicName: 'post-events', ... }
 * //   ]
 * // }
 * ```
 */
export declare function synthesizeEventTopics(schemas: SchemaDefinition<any>[], registry?: SchemaRegistry): EventSynthesisResult;
/**
 * Validate event synthesis result.
 */
export declare function validateEventSynthesis(result: EventSynthesisResult): {
    valid: boolean;
    errors: string[];
};
//# sourceMappingURL=event-synthesizer.d.ts.map