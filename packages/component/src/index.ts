/**
 * @atakora/component - Schema-Centric Backend Framework
 *
 * @remarks
 * Schema-first backend framework that automatically generates production-ready
 * Azure infrastructure from data models. Define your schema once, get REST APIs,
 * database, authentication, and full infrastructure automatically.
 *
 * ## Philosophy
 *
 * - **Schema-First**: Data models drive infrastructure provisioning
 * - **Progressive Enhancement**: Start minimal, customize as needed
 * - **Type-Safe**: Full TypeScript inference from schema definitions
 * - **Production-Ready**: Smart defaults for development and production
 *
 * ## Installation
 *
 * ```bash
 * npm install @atakora/component
 * ```
 *
 * ## Quick Start
 *
 * ```typescript
 * import { defineSchema, defineAuth, defineBackend, a, c, auth } from '@atakora/component';
 *
 * // Define your data schema
 * export const schema = defineSchema({
 *   schema: a.schema({
 *     User: c.model({
 *       id: a.id(),
 *       email: a.string().required().email(),
 *       name: a.string().required(),
 *     })
 *       .authorization(allow => [allow.owner('id')])
 *   })
 * });
 *
 * // Configure authentication
 * export const authentication = defineAuth({
 *   Primary: auth.entra()
 *     .tenant(process.env.AZURE_TENANT_ID!)
 *     .clientId(process.env.AZURE_CLIENT_ID!)
 * });
 *
 * // Assemble your backend
 * export const backend = defineBackend({
 *   schema,
 *   authentication,
 *   settings: { name: 'my-app' }
 * });
 * ```
 *
 * ## Architecture
 *
 * This package is being redesigned to support a schema-centric architecture:
 *
 * - **Phase 1** (Current): Core schema system, field types, validation
 * - **Phase 2**: Model builders (CRUD, Event, Function)
 * - **Phase 3**: Authentication system
 * - **Phase 4**: Backend assembly and defaults
 * - **Phase 5+**: Infrastructure builders, attachment pattern, context API
 *
 * @packageDocumentation
 */

// ============================================================================
// VERSION 2.0 - SCHEMA-CENTRIC API
// ============================================================================

/**
 * Package version
 * @public
 */
export const VERSION = '2.0.0-alpha.1';

/**
 * API version for schema system
 * @public
 */
export const API_VERSION = '2.0';

// ============================================================================
// COMMON UTILITIES
// Fluent API helpers (salvaged from v1, fully compatible with v2)
// ============================================================================

export * from './common';

// ============================================================================
// SCHEMA DEFINITION API
// Phase 1: Core schema system (in development)
// ============================================================================

export * from './schema';

// ============================================================================
// VALIDATION SYSTEM
// Phase 1: Runtime validation (in development)
// ============================================================================

export * from './validation';

// ============================================================================
// AUTHENTICATION API
// Phase 3: Auth providers and configuration (planned)
// ============================================================================

export * from './auth';

// ============================================================================
// LEGACY COMPATIBILITY LAYER
// v1 API is deprecated and will be removed in 3.0
// Use the new schema-centric API above
// ============================================================================

/**
 * @deprecated Use the new schema-centric API. Will be removed in v3.0.
 * @legacy
 */
export const LEGACY_MODE = true;

/**
 * @deprecated Import from '@atakora/component/common' instead
 * @legacy
 */
export { duration, threshold, size, network } from './common';

// Note: Legacy component exports (CrudApi, FunctionsApp, etc.) are temporarily
// disabled during the migration to the schema-centric architecture.
// They will be replaced with schema-driven equivalents in upcoming phases.

// For legacy code that depends on these, please pin to @atakora/component@0.0.2
// or use the git tag 'v0-legacy' until migration is complete.
