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
import { getRelationshipsByType, SchemaRegistry } from '../../schema/atakora/define-schema';

/**
 * Event types for entity mutations.
 */
export enum EventType {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  CUSTOM = 'custom',
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
export function synthesizeEventTopics(
  schemas: SchemaDefinition<any>[],
  registry?: SchemaRegistry
): EventSynthesisResult {
  const topics: TopicConfig[] = [];
  const subscriptions: SubscriptionConfig[] = [];

  // Create topic for each schema that has mutation events enabled
  for (const schema of schemas) {
    const topicConfig = buildTopicConfig(schema);
    topics.push(topicConfig);

    // Create subscriptions for relationships
    const relationshipSubs = buildRelationshipSubscriptions(schema, schemas);
    subscriptions.push(...relationshipSubs);
  }

  return {
    topics,
    subscriptions,
  };
}

/**
 * Build topic configuration for a schema.
 */
function buildTopicConfig(schema: SchemaDefinition<any>): TopicConfig {
  const metadata = schema.metadata as any;

  // Determine event types from metadata or default to all CRUD events
  const eventTypes = metadata?.events?.types || [
    EventType.CREATED,
    EventType.UPDATED,
    EventType.DELETED,
  ];

  return {
    topicName: toKebabCase(`${schema.name}-events`),
    entityName: schema.name,
    eventTypes,
    requiresDuplicateDetection: metadata?.events?.requiresDuplicateDetection ?? false,
    duplicateDetectionHistoryTimeWindow:
      metadata?.events?.duplicateDetectionWindow ?? 'PT10M',
    enablePartitioning: metadata?.events?.enablePartitioning ?? true,
    defaultMessageTimeToLive: metadata?.events?.messageTtl ?? 'P14D',
    maxSizeInMegabytes: metadata?.events?.maxSizeInMegabytes ?? 1024,
  };
}

/**
 * Build subscriptions for schema relationships.
 */
function buildRelationshipSubscriptions(
  schema: SchemaDefinition<any>,
  allSchemas: SchemaDefinition<any>[]
): SubscriptionConfig[] {
  const subscriptions: SubscriptionConfig[] = [];

  if (!schema.relationships) {
    return subscriptions;
  }

  // Build map of entity names to schemas
  const schemaMap = new Map(allSchemas.map((s) => [s.name, s]));

  for (const [relName, rel] of Object.entries(schema.relationships)) {
    // Handle hasMany relationships - subscribe to target entity mutations
    if (rel.type === 'hasMany') {
      const targetSchema = schemaMap.get(rel.target);
      if (!targetSchema) continue;

      const subscription = buildHasManySubscription(
        schema,
        targetSchema,
        relName,
        rel.foreignKey
      );
      subscriptions.push(subscription);
    }

    // Handle belongsTo relationships - subscribe to target entity mutations
    if (rel.type === 'belongsTo') {
      const targetSchema = schemaMap.get(rel.target);
      if (!targetSchema) continue;

      const subscription = buildBelongsToSubscription(
        schema,
        targetSchema,
        relName,
        rel.foreignKey
      );
      subscriptions.push(subscription);
    }

    // Handle manyToMany relationships - may need junction table events
    if (rel.type === 'manyToMany') {
      const targetSchema = schemaMap.get(rel.target);
      if (!targetSchema) continue;

      const subscription = buildManyToManySubscription(
        schema,
        targetSchema,
        relName,
        rel.through
      );
      subscriptions.push(subscription);
    }
  }

  return subscriptions;
}

/**
 * Build subscription for hasMany relationship.
 */
function buildHasManySubscription(
  sourceSchema: SchemaDefinition<any>,
  targetSchema: SchemaDefinition<any>,
  relationshipName: string,
  foreignKey: string
): SubscriptionConfig {
  const topicName = toKebabCase(`${targetSchema.name}-events`);
  const subscriptionName = toKebabCase(
    `${sourceSchema.name}-${relationshipName}-subscription`
  );

  // Build SQL filter: foreignKey matches source entity id
  const sqlExpression = `user.${foreignKey} = @sourceEntityId`;

  return {
    subscriptionName,
    topicName,
    filter: {
      sqlExpression,
      requiresPreprocessing: false,
    },
    subscriberEntity: sourceSchema.name,
    relationshipName,
    foreignKeyField: foreignKey,
    lockDuration: 'PT30S',
    maxDeliveryCount: 10,
    deadLetteringOnMessageExpiration: true,
    deadLetteringOnFilterEvaluationExceptions: true,
  };
}

/**
 * Build subscription for belongsTo relationship.
 */
function buildBelongsToSubscription(
  sourceSchema: SchemaDefinition<any>,
  targetSchema: SchemaDefinition<any>,
  relationshipName: string,
  foreignKey: string
): SubscriptionConfig {
  const topicName = toKebabCase(`${targetSchema.name}-events`);
  const subscriptionName = toKebabCase(
    `${sourceSchema.name}-${relationshipName}-subscription`
  );

  // Build SQL filter: target entity id matches foreign key in source
  const sqlExpression = `user.id = @foreignKeyValue`;

  return {
    subscriptionName,
    topicName,
    filter: {
      sqlExpression,
      requiresPreprocessing: false,
    },
    subscriberEntity: sourceSchema.name,
    relationshipName,
    foreignKeyField: foreignKey,
    lockDuration: 'PT30S',
    maxDeliveryCount: 10,
    deadLetteringOnMessageExpiration: true,
    deadLetteringOnFilterEvaluationExceptions: true,
  };
}

/**
 * Build subscription for manyToMany relationship.
 */
function buildManyToManySubscription(
  sourceSchema: SchemaDefinition<any>,
  targetSchema: SchemaDefinition<any>,
  relationshipName: string,
  throughTable: string
): SubscriptionConfig {
  const topicName = toKebabCase(`${throughTable}-events`);
  const subscriptionName = toKebabCase(
    `${sourceSchema.name}-${relationshipName}-subscription`
  );

  // Build SQL filter for junction table events
  const sqlExpression = `user.sourceId = @sourceEntityId OR user.targetId = @sourceEntityId`;

  return {
    subscriptionName,
    topicName,
    filter: {
      sqlExpression,
      requiresPreprocessing: false,
    },
    subscriberEntity: sourceSchema.name,
    relationshipName,
    lockDuration: 'PT30S',
    maxDeliveryCount: 10,
    deadLetteringOnMessageExpiration: true,
    deadLetteringOnFilterEvaluationExceptions: true,
  };
}

/**
 * Convert string to kebab-case for Azure resource naming.
 */
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Validate event synthesis result.
 */
export function validateEventSynthesis(
  result: EventSynthesisResult
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate topics
  for (const topic of result.topics) {
    if (!topic.topicName || topic.topicName.trim() === '') {
      errors.push(`Topic for entity '${topic.entityName}' has no name`);
    }

    if (!/^[a-z0-9][a-z0-9-]{0,258}[a-z0-9]$/.test(topic.topicName)) {
      errors.push(
        `Topic name '${topic.topicName}' must be 3-260 chars, lowercase alphanumeric and hyphens`
      );
    }
  }

  // Validate subscriptions
  for (const sub of result.subscriptions) {
    if (!sub.subscriptionName || sub.subscriptionName.trim() === '') {
      errors.push(`Subscription for relationship '${sub.relationshipName}' has no name`);
    }

    if (!/^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/.test(sub.subscriptionName)) {
      errors.push(
        `Subscription name '${sub.subscriptionName}' must be 3-50 chars, lowercase alphanumeric and hyphens`
      );
    }

    // Validate that topic exists
    const topicExists = result.topics.some((t) => t.topicName === sub.topicName);
    if (!topicExists) {
      errors.push(
        `Subscription '${sub.subscriptionName}' references unknown topic '${sub.topicName}'`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
