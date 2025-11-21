/**
 * Event Model Builder
 *
 * Builds event models for asynchronous processing with queues.
 */

import type { EventModelConfig } from './types';
import { processFields } from './utils';

// ============================================================================
// Event Model Builder
// ============================================================================

/**
 * Event model builder
 *
 * Creates an event-driven async processing pipeline.
 *
 * Auto-generates:
 * - POST /api/events/{event-name} endpoint
 * - Azure Storage Queue
 * - Queue processor function
 * - TypeScript types for event payload
 *
 * @example
 * ```typescript
 * DataUploaded: e.model({
 *   datasetId: a.string().required(),
 *   fileUrl: a.string().url().required(),
 *   uploadedAt: a.datetime().required(),
 * })
 * ```
 */
export class EventModelBuilder<T = any> {
  public readonly _config: EventModelConfig<T>;

  constructor(fields: T) {
    this._config = {
      type: 'event',
      fields: processFields(fields),
    };
  }

  /**
   * @internal
   * Build final configuration
   */
  _build(): EventModelConfig<T> {
    return { ...this._config };
  }
}

// ============================================================================
// Event Model Factory (e namespace)
// ============================================================================

/**
 * Event model factory
 *
 * Creates event-driven async processing pipelines.
 *
 * @example
 * ```typescript
 * import { e, a } from '@atakora/component';
 *
 * const DataUploaded = e.model({
 *   datasetId: a.string().required(),
 *   fileUrl: a.string().url().required(),
 *   uploadedAt: a.datetime().required(),
 * });
 * ```
 */
export const e = {
  /**
   * Create an event model
   *
   * @param fields - Object defining event payload fields
   * @returns Event model builder
   */
  model: <T>(fields: T) => new EventModelBuilder(fields),
};
