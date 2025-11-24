/**
 * Backend Synthesis System
 *
 * Exports the synthesis infrastructure for transforming backend objects
 * into deployable ARM templates and generated code artifacts.
 *
 * @module @atakora/component/synthesis
 *
 * @remarks
 * The synthesis system provides a complete pipeline for transforming backend
 * configurations into production-ready Azure deployments:
 *
 * **Core Components:**
 * - {@link BackendSynthesizer}: Main orchestrator for synthesis
 * - {@link ResourceMapper}: Maps backend models to ARM resources
 * - {@link SynthesisPipeline}: File I/O and deployment pipeline
 *
 * **Type Definitions:**
 * - {@link SynthesisResult}: Complete synthesis output
 * - {@link IBackendSynthesizer}: Synthesizer interface contract
 * - {@link DataResources}: Cosmos DB resource types
 * - {@link ApiResources}: API Management resource types
 * - {@link FunctionResources}: Azure Functions resource types
 * - {@link SynthesisOptions}: Synthesis configuration options
 *
 * @example
 * Basic synthesis:
 * ```typescript
 * import { synthesize } from '@atakora/component/synthesis';
 * import { defineBackend } from '@atakora/component/backend';
 *
 * const backend = defineBackend({
 *   schema: defineSchema({ ... }),
 *   authentication: defineAuth({ ... }),
 *   settings: { name: 'my-app' },
 * });
 *
 * const result = await synthesize(backend);
 * console.log(result.armTemplate);
 * console.log(result.functions.handlers);
 * console.log(result.schemas.openapi);
 * ```
 */

export { BackendSynthesizer, SynthesisOptions } from './backend-synthesizer';
export { BackendAdapter } from './backend-adapter';
export { ResourceMapper } from './resource-mapper';
export { SynthesisPipeline, SynthesisPipelineOptions } from './pipeline';
export { pluralize, singularize } from './pluralization';
export { ResourceNamingUtility, createNamingUtility } from './naming-utils';
export { OpenApiGenerator, generateOpenApiSpec } from './openapi-generator';
export * from './types';
export type {
  OpenAPISpec,
  InfoObject,
  PathsObject,
  PathItemObject,
  OperationObject,
  ComponentsObject,
  SchemaObject as OpenAPISchemaObject,
  ParameterObject,
  RequestBodyObject,
  ResponsesObject,
  ResponseObject,
  MediaTypeObject,
} from './openapi-types';
export * from './schema-mapper-types';

// Schema synthesizer
export {
  SchemaSynthesizer,
  createSchemaSynthesizer,
} from './schema-synthesizer';
export type {
  ISchemaSynthesizer,
  SchemaArtifacts,
  SchemaSynthesisOptions,
} from './schema-synthesizer-types';

// Schema introspection utilities
export {
  SchemaIntrospector,
  createSchemaIntrospector,
  getCrudModels,
  getEventModels,
  getFunctionModels,
  getSchemaStats,
  type ModelInfo as IntrospectedModel,
  type FieldInfo as IntrospectedField,
  type RelationshipInfo,
  type SchemaStats,
} from './schema-introspection';

// Type extraction utilities
export {
  getTypeScriptType,
  generateInterface,
  generateCreateInputType,
  generateUpdateInputType,
  generateModelTypes,
  getPartitionKeyField,
  getRequiredFields,
  getOptionalFields,
  getFieldNames,
  getReadOnlyFields,
  getComputedFields,
  type FieldInfo as ExtractedFieldInfo,
} from './type-extraction';

/**
 * Convenience function to synthesize a backend
 *
 * @param backend - Backend object to synthesize
 * @param options - Synthesis options
 * @returns Synthesis result
 *
 * @example
 * ```typescript
 * import { synthesize } from '@atakora/component/synthesis';
 * import { defineBackend } from '@atakora/component/backend';
 *
 * const backend = defineBackend({ ... });
 * const result = await synthesize(backend);
 * console.log(result.template);
 * ```
 */
export async function synthesize(backend: any, options: any = {}) {
  const { BackendSynthesizer } = await import('./backend-synthesizer');
  const synthesizer = new BackendSynthesizer();
  return synthesizer.synthesize(backend, options);
}

/**
 * Convenience function to synthesize a backend to a file
 *
 * @param backend - Backend object to synthesize
 * @param outputPath - Output file path
 * @param options - Synthesis options
 *
 * @example
 * ```typescript
 * import { synthesizeToFile } from '@atakora/component/synthesis';
 * import { defineBackend } from '@atakora/component/backend';
 *
 * const backend = defineBackend({ ... });
 * await synthesizeToFile(backend, './output/template.json');
 * ```
 */
export async function synthesizeToFile(
  backend: any,
  outputPath: string,
  options: any = {}
) {
  const { SynthesisPipeline } = await import('./pipeline');
  const pipeline = new SynthesisPipeline();
  return pipeline.synthesizeToFile(backend, outputPath, options);
}

/**
 * Convenience function to synthesize a backend to a directory
 *
 * @param backend - Backend object to synthesize
 * @param outputDir - Output directory path
 * @param options - Synthesis options
 *
 * @example
 * ```typescript
 * import { synthesizeToDirectory } from '@atakora/component/synthesis';
 * import { defineBackend } from '@atakora/component/backend';
 *
 * const backend = defineBackend({ ... });
 * await synthesizeToDirectory(backend, './output');
 * // Creates: ./output/template.json, ./output/parameters.json, ./output/deploy.sh
 * ```
 */
export async function synthesizeToDirectory(
  backend: any,
  outputDir: string,
  options: any = {}
) {
  const { SynthesisPipeline } = await import('./pipeline');
  const pipeline = new SynthesisPipeline();
  return pipeline.synthesizeToDirectory(backend, outputDir, options);
}
