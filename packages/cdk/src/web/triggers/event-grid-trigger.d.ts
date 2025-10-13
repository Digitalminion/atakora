/**
 * Event Grid trigger builder utilities for Azure Functions.
 *
 * @packageDocumentation
 */
import type { EventGridTriggerConfig } from '../function-app-types';
/**
 * Builder for creating Event Grid trigger configurations.
 *
 * @remarks
 * Provides a fluent API for building Event Grid trigger configurations.
 *
 * @example
 * ```typescript
 * const trigger = EventGridTrigger.create()
 *   .withTopicFilter('Microsoft.Storage.BlobCreated')
 *   .withSubjectFilter('/blobServices/default/containers/images/')
 *   .build();
 * ```
 */
export declare class EventGridTrigger {
    private topicFilter?;
    private subjectFilter?;
    /**
     * Creates a new Event Grid trigger builder.
     *
     * @returns New EventGridTrigger builder instance
     */
    static create(): EventGridTrigger;
    /**
     * Sets the topic filter.
     *
     * @param topicFilter - Event Grid topic filter
     * @returns This builder for chaining
     *
     * @example
     * ```typescript
     * .withTopicFilter('Microsoft.Storage.BlobCreated')
     * ```
     */
    withTopicFilter(topicFilter: string): this;
    /**
     * Sets the subject filter.
     *
     * @param subjectFilter - Event subject filter
     * @returns This builder for chaining
     *
     * @example
     * ```typescript
     * .withSubjectFilter('/blobServices/default/containers/images/')
     * ```
     */
    withSubjectFilter(subjectFilter: string): this;
    /**
     * Builds the Event Grid trigger configuration.
     *
     * @returns Event Grid trigger configuration object
     */
    build(): EventGridTriggerConfig;
}
/**
 * Helper function to create an Event Grid trigger configuration.
 *
 * @param options - Optional configuration
 * @returns Complete Event Grid trigger configuration
 *
 * @example
 * ```typescript
 * const trigger = eventGridTrigger({
 *   topicFilter: 'Microsoft.Storage.BlobCreated',
 *   subjectFilter: '/blobServices/default/containers/images/'
 * });
 * ```
 */
export declare function eventGridTrigger(options?: {
    topicFilter?: string;
    subjectFilter?: string;
}): EventGridTriggerConfig;
//# sourceMappingURL=event-grid-trigger.d.ts.map