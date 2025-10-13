/**
 * CRUD data resources
 *
 * @remarks
 * Data-oriented wrappers for CRUD API functionality.
 * Provides entity-based CRUD operations with auto-generated Azure infrastructure.
 *
 * @packageDocumentation
 */

export { CrudResource } from './resource';
export type { CrudResourceProps } from './resource';

// Re-export types from the crud module for convenience
export type {
  CrudSchema,
  CrudFieldSchema,
  CrudOperation,
} from '../../crud';
