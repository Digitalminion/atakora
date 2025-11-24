/**
 * Backend Synthesis Adapter
 *
 * Bridges component package backend synthesis with lib package ARM template generation.
 * This adapter allows backends defined using @atakora/component to be synthesized
 * into deployable ARM templates using the lib package infrastructure.
 *
 * @module @atakora/component/synthesis/backend-adapter
 */

import type { BackendObject } from '../backend/types';
import { BackendSynthesizer } from './backend-synthesizer';
import { SynthesisPipeline } from './pipeline';
import type {
  SynthesisResult as ComponentSynthesisResult,
  ARMTemplate as ComponentARMTemplate,
  ARMResource as ComponentARMResource,
} from './types';
import type {
  ArmTemplate,
  ArmResource,
  ArmParameter,
  ArmOutput,
  CloudAssemblyV2,
  StackManifestV2,
  SynthesisOptions,
} from '@atakora/lib/synthesis/types';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Backend Adapter
 *
 * Adapts component package backend synthesis to lib package synthesis pipeline.
 *
 * @remarks
 * This adapter serves as the integration point between two synthesis systems:
 *
 * **Component Package** (@atakora/component):
 * - Works with high-level backend definitions (BackendObject)
 * - Analyzes backend structure (models, attachments, features)
 * - Maps backend components to ARM resources
 * - Produces ComponentARMTemplate
 *
 * **Lib Package** (@atakora/lib):
 * - Works with construct trees (App, Stack, Resource)
 * - Provides validation pipeline
 * - Handles template splitting and linked templates
 * - Manages deployment assembly
 *
 * The adapter bridges these systems by:
 * 1. Using component package to synthesize backend → ARM resources
 * 2. Converting component ARM format to lib ARM format
 * 3. Integrating with lib package validation and assembly
 *
 * @example
 * Basic backend synthesis:
 * ```typescript
 * import { defineBackend, defineSchema, a, c } from '@atakora/component';
 * import { BackendAdapter } from '@atakora/lib/synthesis';
 *
 * const backend = defineBackend({
 *   schema: defineSchema({
 *     schema: a.schema({
 *       User: c.model({
 *         id: a.id(),
 *         name: a.string().required(),
 *       }),
 *     }),
 *   }),
 * });
 *
 * const adapter = new BackendAdapter();
 * const assembly = await adapter.synthesize(backend, {
 *   outdir: './arm.out',
 * });
 * ```
 */
export class BackendAdapter {
  private componentPipeline: SynthesisPipeline;

  constructor() {
    this.componentPipeline = new SynthesisPipeline();
  }

  /**
   * Synthesize backend to ARM templates
   *
   * @param backend - Backend object to synthesize
   * @param options - Synthesis options
   * @returns Cloud assembly with synthesized templates
   *
   * @throws {Error} If synthesis fails
   *
   * @remarks
   * This is the main entry point for backend synthesis. It:
   *
   * 1. **Synthesize Backend**: Uses component package pipeline to analyze backend
   *    and generate ARM resources
   * 2. **Convert Format**: Converts component ARM types to lib ARM types
   * 3. **Validate**: Runs lib package validation pipeline (if enabled)
   * 4. **Assemble**: Writes templates to disk and creates cloud assembly
   *
   * The resulting cloud assembly is compatible with lib package deployment tools.
   */
  async synthesize(
    backend: BackendObject,
    options?: Partial<SynthesisOptions>
  ): Promise<CloudAssemblyV2> {
    const opts: SynthesisOptions = {
      outdir: options?.outdir || 'arm.out',
      skipValidation: options?.skipValidation || false,
      prettyPrint: options?.prettyPrint !== false,
      strict: options?.strict || false,
      enableLinkedTemplates: options?.enableLinkedTemplates ?? true,
      maxTemplateSize: options?.maxTemplateSize ?? 3 * 1024 * 1024, // 3MB
    };

    try {
      // Phase 1: Synthesize using component package pipeline
      const componentResult = await this.componentPipeline.synthesize(backend, {
        validate: !opts.skipValidation,
        prettyPrint: opts.prettyPrint,
        environment: backend.environment,
      });

      // Phase 2: Convert component ARM template to lib ARM template
      const libTemplate = this.convertTemplate(componentResult.template);

      // Phase 3: Create stack manifest
      const stackName = this.getStackName(backend);
      const manifest = this.createStackManifest(
        stackName,
        libTemplate,
        componentResult
      );

      // Phase 4: Write templates to disk
      await this.writeTemplates(
        stackName,
        libTemplate,
        manifest,
        componentResult,
        opts
      );

      // Phase 5: Create cloud assembly
      const assembly: CloudAssemblyV2 = {
        version: '2.0.0',
        stacks: {
          [stackName]: manifest,
        },
        directory: opts.outdir,
      };

      return assembly;
    } catch (error) {
      throw new Error(
        `Backend synthesis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Convert component ARM template to lib ARM template
   *
   * @param componentTemplate - ARM template from component package
   * @returns ARM template in lib package format
   *
   * @remarks
   * The two ARM template formats are nearly identical, but have slight differences:
   * - Component uses ComponentARMTemplate type
   * - Lib uses ArmTemplate type (with capital A)
   * - Parameter and output types are compatible
   * - Resource types need conversion for identity/sku fields
   */
  private convertTemplate(componentTemplate: ComponentARMTemplate): ArmTemplate {
    return {
      $schema: componentTemplate.$schema,
      contentVersion: componentTemplate.contentVersion,
      parameters: this.convertParameters(componentTemplate.parameters),
      variables: componentTemplate.variables,
      resources: this.convertResources(componentTemplate.resources),
      outputs: this.convertOutputs(componentTemplate.outputs),
    };
  }

  /**
   * Convert parameters
   */
  private convertParameters(
    params?: Record<string, any>
  ): Record<string, ArmParameter> | undefined {
    if (!params) return undefined;

    const converted: Record<string, ArmParameter> = {};
    for (const [name, param] of Object.entries(params)) {
      converted[name] = {
        type: param.type,
        defaultValue: param.defaultValue,
        allowedValues: param.allowedValues,
        metadata: param.metadata,
      };
    }
    return converted;
  }

  /**
   * Convert resources
   */
  private convertResources(resources: ComponentARMResource[]): ArmResource[] {
    return resources.map((resource) => ({
      type: resource.type,
      apiVersion: resource.apiVersion,
      name: resource.name,
      location: resource.location,
      tags: resource.tags,
      dependsOn: resource.dependsOn,
      properties: resource.properties,
      sku: resource.sku,
      kind: resource.kind,
      identity: resource.identity,
      // Include any nested resources
      ...(resource.resources && { resources: this.convertResources(resource.resources) }),
    }));
  }

  /**
   * Convert outputs
   */
  private convertOutputs(
    outputs?: Record<string, any>
  ): Record<string, ArmOutput> | undefined {
    if (!outputs) return undefined;

    const converted: Record<string, ArmOutput> = {};
    for (const [name, output] of Object.entries(outputs)) {
      converted[name] = {
        type: output.type,
        value: output.value,
        metadata: output.metadata,
      };
    }
    return converted;
  }

  /**
   * Get stack name from backend
   */
  private getStackName(backend: BackendObject): string {
    return backend.settings?.name || 'backend-stack';
  }

  /**
   * Create stack manifest
   */
  private createStackManifest(
    stackName: string,
    template: ArmTemplate,
    componentResult: ComponentSynthesisResult
  ): StackManifestV2 {
    return {
      name: stackName,
      templatePath: `${stackName}.json`,
      resourceCount: componentResult.resourceCount,
      parameterCount: Object.keys(template.parameters || {}).length,
      outputCount: Object.keys(template.outputs || {}).length,
      dependencies: [],
      linkedTemplates: [],
    };
  }

  /**
   * Write templates to disk
   */
  private async writeTemplates(
    stackName: string,
    template: ArmTemplate,
    manifest: StackManifestV2,
    componentResult: ComponentSynthesisResult,
    opts: SynthesisOptions
  ): Promise<void> {
    // Ensure output directory exists
    if (!fs.existsSync(opts.outdir)) {
      fs.mkdirSync(opts.outdir, { recursive: true });
    }

    // Write main template
    const templatePath = path.join(opts.outdir, `${stackName}.json`);
    const templateJson = opts.prettyPrint
      ? JSON.stringify(template, null, 2)
      : JSON.stringify(template);
    fs.writeFileSync(templatePath, templateJson, 'utf-8');

    // Write manifest
    const manifestPath = path.join(opts.outdir, 'manifest.json');
    const assembly: CloudAssemblyV2 = {
      version: '2.0.0',
      stacks: {
        [stackName]: manifest,
      },
      directory: opts.outdir,
    };
    fs.writeFileSync(
      manifestPath,
      JSON.stringify(assembly, null, 2),
      'utf-8'
    );

    // Write metadata
    const metadataPath = path.join(opts.outdir, `${stackName}.metadata.json`);
    const metadata = {
      environment: componentResult.context.environment,
      cloudType: componentResult.context.cloudType,
      region: componentResult.context.region,
      resourceGroup: componentResult.context.resourceGroup,
      resourceCount: componentResult.resourceCount,
      modelCounts: {
        crud: componentResult.analysis.models.crud.length,
        event: componentResult.analysis.models.event.length,
        function: componentResult.analysis.models.function.length,
      },
      synthesizedAt: new Date().toISOString(),
    };
    fs.writeFileSync(
      metadataPath,
      JSON.stringify(metadata, null, 2),
      'utf-8'
    );

    // Write parameters file
    const parametersPath = path.join(opts.outdir, `${stackName}.parameters.json`);
    const parameters = this.generateParametersFile(template);
    fs.writeFileSync(
      parametersPath,
      JSON.stringify(parameters, null, 2),
      'utf-8'
    );
  }

  /**
   * Generate parameters file for ARM deployment
   */
  private generateParametersFile(template: ArmTemplate): any {
    const parameters: Record<string, any> = {};

    if (template.parameters) {
      for (const [name, param] of Object.entries(template.parameters)) {
        parameters[name] = {
          value: param.defaultValue || '',
        };
      }
    }

    return {
      $schema:
        'https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#',
      contentVersion: '1.0.0.0',
      parameters,
    };
  }
}
