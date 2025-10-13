"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventType = void 0;
exports.synthesizeEventTopics = synthesizeEventTopics;
exports.validateEventSynthesis = validateEventSynthesis;
/**
 * Event types for entity mutations.
 */
var EventType;
(function (EventType) {
    EventType["CREATED"] = "created";
    EventType["UPDATED"] = "updated";
    EventType["DELETED"] = "deleted";
    EventType["CUSTOM"] = "custom";
})(EventType || (exports.EventType = EventType = {}));
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
function synthesizeEventTopics(schemas, registry) {
    var topics = [];
    var subscriptions = [];
    // Create topic for each schema that has mutation events enabled
    for (var _i = 0, schemas_1 = schemas; _i < schemas_1.length; _i++) {
        var schema = schemas_1[_i];
        var topicConfig = buildTopicConfig(schema);
        topics.push(topicConfig);
        // Create subscriptions for relationships
        var relationshipSubs = buildRelationshipSubscriptions(schema, schemas);
        subscriptions.push.apply(subscriptions, relationshipSubs);
    }
    return {
        topics: topics,
        subscriptions: subscriptions,
    };
}
/**
 * Build topic configuration for a schema.
 */
function buildTopicConfig(schema) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    var metadata = schema.metadata;
    // Determine event types from metadata or default to all CRUD events
    var eventTypes = ((_a = metadata === null || metadata === void 0 ? void 0 : metadata.events) === null || _a === void 0 ? void 0 : _a.types) || [
        EventType.CREATED,
        EventType.UPDATED,
        EventType.DELETED,
    ];
    return {
        topicName: toKebabCase("".concat(schema.name, "-events")),
        entityName: schema.name,
        eventTypes: eventTypes,
        requiresDuplicateDetection: (_c = (_b = metadata === null || metadata === void 0 ? void 0 : metadata.events) === null || _b === void 0 ? void 0 : _b.requiresDuplicateDetection) !== null && _c !== void 0 ? _c : false,
        duplicateDetectionHistoryTimeWindow: (_e = (_d = metadata === null || metadata === void 0 ? void 0 : metadata.events) === null || _d === void 0 ? void 0 : _d.duplicateDetectionWindow) !== null && _e !== void 0 ? _e : 'PT10M',
        enablePartitioning: (_g = (_f = metadata === null || metadata === void 0 ? void 0 : metadata.events) === null || _f === void 0 ? void 0 : _f.enablePartitioning) !== null && _g !== void 0 ? _g : true,
        defaultMessageTimeToLive: (_j = (_h = metadata === null || metadata === void 0 ? void 0 : metadata.events) === null || _h === void 0 ? void 0 : _h.messageTtl) !== null && _j !== void 0 ? _j : 'P14D',
        maxSizeInMegabytes: (_l = (_k = metadata === null || metadata === void 0 ? void 0 : metadata.events) === null || _k === void 0 ? void 0 : _k.maxSizeInMegabytes) !== null && _l !== void 0 ? _l : 1024,
    };
}
/**
 * Build subscriptions for schema relationships.
 */
function buildRelationshipSubscriptions(schema, allSchemas) {
    var subscriptions = [];
    if (!schema.relationships) {
        return subscriptions;
    }
    // Build map of entity names to schemas
    var schemaMap = new Map(allSchemas.map(function (s) { return [s.name, s]; }));
    for (var _i = 0, _a = Object.entries(schema.relationships); _i < _a.length; _i++) {
        var _b = _a[_i], relName = _b[0], rel = _b[1];
        // Handle hasMany relationships - subscribe to target entity mutations
        if (rel.type === 'hasMany') {
            var targetSchema = schemaMap.get(rel.target);
            if (!targetSchema)
                continue;
            var subscription = buildHasManySubscription(schema, targetSchema, relName, rel.foreignKey);
            subscriptions.push(subscription);
        }
        // Handle belongsTo relationships - subscribe to target entity mutations
        if (rel.type === 'belongsTo') {
            var targetSchema = schemaMap.get(rel.target);
            if (!targetSchema)
                continue;
            var subscription = buildBelongsToSubscription(schema, targetSchema, relName, rel.foreignKey);
            subscriptions.push(subscription);
        }
        // Handle manyToMany relationships - may need junction table events
        if (rel.type === 'manyToMany') {
            var targetSchema = schemaMap.get(rel.target);
            if (!targetSchema)
                continue;
            var subscription = buildManyToManySubscription(schema, targetSchema, relName, rel.through);
            subscriptions.push(subscription);
        }
    }
    return subscriptions;
}
/**
 * Build subscription for hasMany relationship.
 */
function buildHasManySubscription(sourceSchema, targetSchema, relationshipName, foreignKey) {
    var topicName = toKebabCase("".concat(targetSchema.name, "-events"));
    var subscriptionName = toKebabCase("".concat(sourceSchema.name, "-").concat(relationshipName, "-subscription"));
    // Build SQL filter: foreignKey matches source entity id
    var sqlExpression = "user.".concat(foreignKey, " = @sourceEntityId");
    return {
        subscriptionName: subscriptionName,
        topicName: topicName,
        filter: {
            sqlExpression: sqlExpression,
            requiresPreprocessing: false,
        },
        subscriberEntity: sourceSchema.name,
        relationshipName: relationshipName,
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
function buildBelongsToSubscription(sourceSchema, targetSchema, relationshipName, foreignKey) {
    var topicName = toKebabCase("".concat(targetSchema.name, "-events"));
    var subscriptionName = toKebabCase("".concat(sourceSchema.name, "-").concat(relationshipName, "-subscription"));
    // Build SQL filter: target entity id matches foreign key in source
    var sqlExpression = "user.id = @foreignKeyValue";
    return {
        subscriptionName: subscriptionName,
        topicName: topicName,
        filter: {
            sqlExpression: sqlExpression,
            requiresPreprocessing: false,
        },
        subscriberEntity: sourceSchema.name,
        relationshipName: relationshipName,
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
function buildManyToManySubscription(sourceSchema, targetSchema, relationshipName, throughTable) {
    var topicName = toKebabCase("".concat(throughTable, "-events"));
    var subscriptionName = toKebabCase("".concat(sourceSchema.name, "-").concat(relationshipName, "-subscription"));
    // Build SQL filter for junction table events
    var sqlExpression = "user.sourceId = @sourceEntityId OR user.targetId = @sourceEntityId";
    return {
        subscriptionName: subscriptionName,
        topicName: topicName,
        filter: {
            sqlExpression: sqlExpression,
            requiresPreprocessing: false,
        },
        subscriberEntity: sourceSchema.name,
        relationshipName: relationshipName,
        lockDuration: 'PT30S',
        maxDeliveryCount: 10,
        deadLetteringOnMessageExpiration: true,
        deadLetteringOnFilterEvaluationExceptions: true,
    };
}
/**
 * Convert string to kebab-case for Azure resource naming.
 */
function toKebabCase(str) {
    return str
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase();
}
/**
 * Validate event synthesis result.
 */
function validateEventSynthesis(result) {
    var errors = [];
    // Validate topics
    for (var _i = 0, _a = result.topics; _i < _a.length; _i++) {
        var topic = _a[_i];
        if (!topic.topicName || topic.topicName.trim() === '') {
            errors.push("Topic for entity '".concat(topic.entityName, "' has no name"));
        }
        if (!/^[a-z0-9][a-z0-9-]{0,258}[a-z0-9]$/.test(topic.topicName)) {
            errors.push("Topic name '".concat(topic.topicName, "' must be 3-260 chars, lowercase alphanumeric and hyphens"));
        }
    }
    var _loop_1 = function (sub) {
        if (!sub.subscriptionName || sub.subscriptionName.trim() === '') {
            errors.push("Subscription for relationship '".concat(sub.relationshipName, "' has no name"));
        }
        if (!/^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/.test(sub.subscriptionName)) {
            errors.push("Subscription name '".concat(sub.subscriptionName, "' must be 3-50 chars, lowercase alphanumeric and hyphens"));
        }
        // Validate that topic exists
        var topicExists = result.topics.some(function (t) { return t.topicName === sub.topicName; });
        if (!topicExists) {
            errors.push("Subscription '".concat(sub.subscriptionName, "' references unknown topic '").concat(sub.topicName, "'"));
        }
    };
    // Validate subscriptions
    for (var _b = 0, _c = result.subscriptions; _b < _c.length; _b++) {
        var sub = _c[_b];
        _loop_1(sub);
    }
    return {
        valid: errors.length === 0,
        errors: errors,
    };
}
