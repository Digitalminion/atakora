/**
 * Schema Synthesizer Types
 *
 * Type definitions for the schema synthesis system that orchestrates
 * OpenAPI and GraphQL schema generation from component schemas.
 *
 * @module @atakora/component/synthesis/schema-synthesizer-types
 *
 * @remarks
 * The schema synthesizer provides a unified interface for generating
 * multiple schema formats from a single component schema definition:
 * - OpenAPI 3.0 specifications for REST API documentation
 * - GraphQL SDL for GraphQL API schemas (future)
 * - TypeScript type definitions for client SDKs (future)
 *
 * @example
 * ```typescript
 * import { SchemaSynthesizer } from '@atakora/component/synthesis';
 * import { defineSchema } from '@atakora/component/schema';
 *
 * const schema = defineSchema({
 *   models: {
 *     User: {
 *       fields: {
 *         id: a.id(),
 *         email: a.string().required(),
 *       },
 *     },
 *   },
 * });
 *
 * const synthesizer = new SchemaSynthesizer();
 * const artifacts = await synthesizer.synthesize(context, {
 *   generateOpenApi: true,
 *   generateGraphQL: false,
 *   generateTypeScript: false,
 * });
 *
 * console.log(artifacts.openapi); // OpenAPI 3.0 spec
 * ```
 */

import type { OpenAPISpec } from './openapi-types';
import type { SynthesisContext } from './types';

/**
 * Schema synthesizer interface
 *
 * @remarks
 * Defines the contract for schema synthesis implementations.
 * Implementations should coordinate OpenAPI, GraphQL, and TypeScript
 * generation using specialized generators.
 *
 * The synthesizer orchestrates multiple generation steps and returns
 * a unified artifact collection.
 */
export interface ISchemaSynthesizer {
  /**
   * Synthesize schema artifacts from backend context
   *
   * @param context - Synthesis context with backend configuration
   * @param options - Schema synthesis options
   * @returns Schema artifacts (OpenAPI, GraphQL, TypeScript)
   *
   * @remarks
   * Generates requested schema artifacts based on options.
   * By default, generates OpenAPI specs only.
   *
   * @example
   * ```typescript
   * const synthesizer = new SchemaSynthesizer();
   * const artifacts = await synthesizer.synthesize(context);
   * console.log(artifacts.openapi); // OpenAPI spec
   * ```
   */
  synthesize(
    context: SynthesisContext,
    options?: SchemaSynthesisOptions
  ): Promise<SchemaArtifacts>;
}

/**
 * Schema synthesis artifacts
 *
 * @remarks
 * Collection of generated schema files in different formats.
 * Each artifact is optional and may be null if generation was
 * disabled or not yet implemented.
 *
 * **Current Status:**
 * - OpenAPI: Fully implemented via OpenApiGenerator
 * - GraphQL: Not yet implemented (returns null)
 * - TypeScript: Not yet implemented (returns null)
 */
export interface SchemaArtifacts {
  /**
   * OpenAPI 3.0 specification
   *
   * @remarks
   * Complete OpenAPI spec with paths, components, and schemas.
   * Generated from CRUD models in the component schema.
   * Null if generation was disabled via options.
   *
   * @example
   * ```typescript
   * if (artifacts.openapi) {
   *   await fs.writeFile('openapi.json', JSON.stringify(artifacts.openapi, null, 2));
   * }
   * ```
   */
  readonly openapi: OpenAPISpec | null;

  /**
   * GraphQL schema definition language (SDL)
   *
   * @remarks
   * GraphQL schema string in SDL format.
   * Currently returns null - GraphQL generation is not yet implemented.
   *
   * **Future Implementation:**
   * Will generate GraphQL schema from CRUD models with:
   * - Type definitions for all models
   * - Query operations (get, list)
   * - Mutation operations (create, update, delete)
   * - Subscription operations for real-time updates
   */
  readonly graphql: string | null;

  /**
   * TypeScript type definitions
   *
   * @remarks
   * Generated TypeScript types for client SDKs.
   * Currently returns null - TypeScript generation is not yet implemented.
   *
   * **Future Implementation:**
   * Will generate TypeScript interfaces from models with:
   * - Model interfaces with all fields
   * - Create/update input types
   * - API client type signatures
   * - Validation decorators
   */
  readonly typescript: string | null;
}

/**
 * Schema synthesis options
 *
 * @remarks
 * Configuration for schema generation. Allows selective generation
 * of different schema formats to optimize build time and output size.
 *
 * All options default to their most common values:
 * - OpenAPI: true (enabled by default)
 * - GraphQL: false (not yet implemented)
 * - TypeScript: false (not yet implemented)
 *
 * @example
 * Generate only OpenAPI:
 * ```typescript
 * const artifacts = await synthesizer.synthesize(context, {
 *   generateOpenApi: true,
 *   generateGraphQL: false,
 *   generateTypeScript: false,
 * });
 * ```
 */
export interface SchemaSynthesisOptions {
  /**
   * Generate OpenAPI 3.0 specification
   *
   * @remarks
   * When true, generates complete OpenAPI spec from CRUD models.
   * When false, artifacts.openapi will be null.
   *
   * @defaultValue true
   */
  readonly generateOpenApi?: boolean;

  /**
   * Generate GraphQL schema definition
   *
   * @remarks
   * When true, generates GraphQL SDL from CRUD models.
   * Currently not implemented - always returns null.
   *
   * @defaultValue false
   */
  readonly generateGraphQL?: boolean;

  /**
   * Generate TypeScript type definitions
   *
   * @remarks
   * When true, generates TypeScript interfaces from models.
   * Currently not implemented - always returns null.
   *
   * @defaultValue false
   */
  readonly generateTypeScript?: boolean;

  /**
   * OpenAPI specification version
   *
   * @remarks
   * Specifies which OpenAPI version to generate.
   * Only affects OpenAPI output when generateOpenApi is true.
   *
   * @defaultValue '3.0.3'
   */
  readonly openApiVersion?: '3.0.0' | '3.0.1' | '3.0.2' | '3.0.3';
}
