/**
 * Schema Synthesizer
 *
 * Orchestrates OpenAPI and GraphQL schema generation from component schemas.
 * Main implementation of the schema synthesis pipeline that coordinates
 * specialized generators for different schema formats.
 *
 * @module @atakora/component/synthesis/schema-synthesizer
 *
 * @remarks
 * The SchemaSynthesizer is the central orchestrator for transforming
 * component schemas into multiple output formats:
 *
 * **Current Capabilities:**
 * - OpenAPI 3.0 specification generation (fully implemented)
 * - GraphQL SDL generation (planned)
 * - TypeScript type definition generation (planned)
 *
 * **Architecture:**
 * The synthesizer delegates to specialized generators:
 * - {@link OpenApiGenerator} for OpenAPI specs
 * - GraphQLGenerator for GraphQL schemas (future)
 * - TypeScriptGenerator for TS types (future)
 *
 * **Integration:**
 * Used by BackendSynthesizer in Phase 6 of the synthesis pipeline
 * to generate schema artifacts alongside ARM templates and function code.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { SchemaSynthesizer } from '@atakora/component/synthesis';
 * import { defineSchema } from '@atakora/component/schema';
 * import { a } from '@atakora/component/schema/field-types';
 *
 * const schema = defineSchema({
 *   models: {
 *     User: {
 *       fields: {
 *         id: a.id(),
 *         email: a.string().required(),
 *         name: a.string(),
 *       },
 *     },
 *   },
 * });
 *
 * const context = {
 *   backend: { schema },
 *   naming: {
 *     organization: 'myorg',
 *     project: 'myapp',
 *     environment: 'dev',
 *     geography: 'eus',
 *     instance: '01',
 *   },
 * };
 *
 * const synthesizer = new SchemaSynthesizer();
 * const artifacts = await synthesizer.synthesize(context);
 *
 * console.log(artifacts.openapi); // OpenAPI 3.0 spec
 * console.log(artifacts.graphql);    // null (not yet implemented)
 * console.log(artifacts.typescript); // null (not yet implemented)
 * ```
 *
 * @example
 * Selective generation:
 * ```typescript
 * // Generate only OpenAPI, skip GraphQL and TypeScript
 * const artifacts = await synthesizer.synthesize(context, {
 *   generateOpenApi: true,
 *   generateGraphQL: false,
 *   generateTypeScript: false,
 * });
 * ```
 */

import type {
  ISchemaSynthesizer,
  SchemaArtifacts,
  SchemaSynthesisOptions,
} from './schema-synthesizer-types';
import { OpenApiGenerator } from './openapi-generator';
import { SchemaIntrospector } from './schema-introspection';
import type { SynthesisContext, OpenAPISpec } from './types';

/**
 * Schema Synthesizer Implementation
 *
 * @remarks
 * Coordinates schema generation across multiple formats using specialized
 * generators. Implements the {@link ISchemaSynthesizer} interface.
 *
 * **Design Principles:**
 * - Single Responsibility: Orchestrates but doesn't implement generation logic
 * - Delegation: Uses specialized generators for each format
 * - Progressive Enhancement: Returns null for unimplemented generators
 * - Type Safety: Strongly typed interfaces and return values
 *
 * **Generation Pipeline:**
 * 1. Extract schema from synthesis context
 * 2. Check options for enabled generators
 * 3. Delegate to OpenApiGenerator if enabled
 * 4. Delegate to GraphQLGenerator if enabled (future)
 * 5. Delegate to TypeScriptGenerator if enabled (future)
 * 6. Return unified artifact collection
 *
 * @implements {ISchemaSynthesizer}
 *
 * @example
 * ```typescript
 * const synthesizer = new SchemaSynthesizer();
 * const artifacts = await synthesizer.synthesize(context);
 *
 * // Check what was generated
 * if (artifacts.openapi) {
 *   console.log('Generated OpenAPI spec');
 *   console.log('Paths:', Object.keys(artifacts.openapi.paths));
 * }
 * ```
 */
export class SchemaSynthesizer implements ISchemaSynthesizer {
  private readonly openApiGenerator: OpenApiGenerator;
  private readonly introspector: SchemaIntrospector;

  /**
   * Create a new SchemaSynthesizer
   *
   * @remarks
   * Initializes specialized generators for each schema format.
   * Generators are created eagerly to ensure consistency and
   * enable potential configuration in future versions.
   */
  constructor() {
    this.openApiGenerator = new OpenApiGenerator();
    this.introspector = new SchemaIntrospector();
  }

  /**
   * Synthesize schema artifacts from synthesis context
   *
   * @param context - Synthesis context containing backend configuration
   * @param options - Schema synthesis options (optional)
   * @returns Schema artifacts with generated schemas
   *
   * @remarks
   * Orchestrates the complete schema generation pipeline:
   *
   * **Phase 1: Extract Schema**
   * - Get schema from context.backend.schema
   * - Validate schema is present
   *
   * **Phase 2: OpenAPI Generation**
   * - Check if generateOpenApi is enabled (default: true)
   * - Delegate to OpenApiGenerator.mapSchema()
   * - Store result in artifacts.openapi
   *
   * **Phase 3: GraphQL Generation (Future)**
   * - Check if generateGraphQL is enabled
   * - Delegate to GraphQLGenerator (not yet implemented)
   * - Store result in artifacts.graphql
   *
   * **Phase 4: TypeScript Generation (Future)**
   * - Check if generateTypeScript is enabled
   * - Delegate to TypeScriptGenerator (not yet implemented)
   * - Store result in artifacts.typescript
   *
   * **Error Handling:**
   * If any generator fails, the error is propagated to the caller.
   * The BackendSynthesizer will catch and wrap the error with
   * additional context about the synthesis phase.
   *
   * @throws {Error} If schema is missing or invalid
   * @throws {Error} If generation fails for any enabled format
   *
   * @example
   * Default generation (OpenAPI only):
   * ```typescript
   * const artifacts = await synthesizer.synthesize(context);
   * expect(artifacts.openapi).toBeDefined();
   * expect(artifacts.graphql).toBeNull();
   * expect(artifacts.typescript).toBeNull();
   * ```
   *
   * @example
   * Disable OpenAPI generation:
   * ```typescript
   * const artifacts = await synthesizer.synthesize(context, {
   *   generateOpenApi: false,
   * });
   * expect(artifacts.openapi).toBeNull();
   * ```
   */
  async synthesize(
    context: SynthesisContext,
    options?: SchemaSynthesisOptions
  ): Promise<SchemaArtifacts> {
    // Validate schema exists
    if (!context.backend?.schema) {
      throw new Error(
        'Schema synthesis failed: context.backend.schema is missing or invalid'
      );
    }

    // Extract schema from backend
    const schema = context.backend.schema;

    // ========================================================================
    // Phase 1: OpenAPI Generation
    // ========================================================================

    // Generate OpenAPI spec if requested (default: true)
    const shouldGenerateOpenApi = options?.generateOpenApi !== false;

    let openapi: OpenAPISpec | null = null;
    if (shouldGenerateOpenApi) {
      try {
        openapi = this.openApiGenerator.mapSchema(schema);
      } catch (error) {
        throw new Error(
          `OpenAPI generation failed: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }

    // ========================================================================
    // Phase 2: GraphQL Generation (Future Implementation)
    // ========================================================================

    // GraphQL generation is not yet implemented
    // When implemented, this will:
    // 1. Check options.generateGraphQL
    // 2. Use introspector to get CRUD models
    // 3. Generate GraphQL type definitions
    // 4. Generate Query operations (get, list)
    // 5. Generate Mutation operations (create, update, delete)
    // 6. Generate Subscription operations (future)
    // 7. Return SDL string

    let graphql: string | null = null;
    if (options?.generateGraphQL) {
      // TODO: Implement GraphQLGenerator
      // const graphqlGenerator = new GraphQLGenerator();
      // graphql = graphqlGenerator.generate(schema);

      // For now, return null even if requested
      graphql = null;
    }

    // ========================================================================
    // Phase 3: TypeScript Generation (Future Implementation)
    // ========================================================================

    // TypeScript generation is not yet implemented
    // When implemented, this will:
    // 1. Check options.generateTypeScript
    // 2. Use introspector to get all models
    // 3. Generate TypeScript interfaces for each model
    // 4. Generate CreateInput and UpdateInput types
    // 5. Generate API client method signatures
    // 6. Return TypeScript code string

    let typescript: string | null = null;
    if (options?.generateTypeScript) {
      // TODO: Implement TypeScriptGenerator
      // const tsGenerator = new TypeScriptGenerator();
      // typescript = tsGenerator.generate(schema);

      // For now, return null even if requested
      typescript = null;
    }

    // Return immutable artifacts
    return {
      openapi,
      graphql,
      typescript,
    };
  }

  /**
   * Get schema statistics
   *
   * @param context - Synthesis context
   * @returns Schema statistics
   *
   * @remarks
   * Utility method to inspect schema structure.
   * Useful for debugging and progress reporting.
   *
   * @example
   * ```typescript
   * const synthesizer = new SchemaSynthesizer();
   * const stats = synthesizer.getSchemaStats(context);
   * console.log(`Found ${stats.totalModels} models`);
   * console.log(`CRUD: ${stats.crudModels}, Event: ${stats.eventModels}`);
   * ```
   */
  getSchemaStats(context: SynthesisContext): {
    readonly totalModels: number;
    readonly crudModels: number;
    readonly eventModels: number;
    readonly functionModels: number;
  } {
    const schema = context.backend.schema;
    const stats = this.introspector.getSchemaStats(schema);

    return {
      totalModels: stats.totalModels,
      crudModels: stats.crudModels,
      eventModels: stats.eventModels,
      functionModels: stats.functionModels,
    };
  }
}

/**
 * Convenience function to create a schema synthesizer
 *
 * @returns New SchemaSynthesizer instance
 *
 * @example
 * ```typescript
 * import { createSchemaSynthesizer } from '@atakora/component/synthesis';
 *
 * const synthesizer = createSchemaSynthesizer();
 * const artifacts = await synthesizer.synthesize(context);
 * ```
 */
export function createSchemaSynthesizer(): SchemaSynthesizer {
  return new SchemaSynthesizer();
}
