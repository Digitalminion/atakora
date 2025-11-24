/**
 * Synthesis Pipeline
 *
 * Orchestrates the complete synthesis flow from backend to ARM templates.
 *
 * @module @atakora/component/synthesis/pipeline
 */

import { BackendSynthesizer } from './backend-synthesizer';
import type { BackendObject } from '../backend/types';
import type { SynthesisResult, ARMTemplate } from './types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Synthesis Pipeline
 *
 * High-level orchestrator for backend synthesis.
 *
 * Pipeline flow:
 * backend → validate → extract schema → map resources → generate ARM → output
 *
 * @example
 * Basic synthesis:
 * ```typescript
 * const pipeline = new SynthesisPipeline();
 * const result = await pipeline.synthesize(backend);
 * ```
 *
 * @example
 * Synthesis with file output:
 * ```typescript
 * const pipeline = new SynthesisPipeline();
 * await pipeline.synthesizeToFile(backend, './output/template.json');
 * ```
 */
export class SynthesisPipeline {
  private synthesizer: BackendSynthesizer;

  constructor() {
    this.synthesizer = new BackendSynthesizer();
  }

  /**
   * Synthesize backend to ARM template
   *
   * @param backend - Backend object to synthesize
   * @param options - Synthesis options
   * @returns Synthesis result
   */
  async synthesize(
    backend: BackendObject,
    options: SynthesisPipelineOptions = {}
  ): Promise<SynthesisResult> {
    // Validate backend before synthesis
    if (options.validate !== false) {
      this.validateBackend(backend);
    }

    // Run synthesis
    const result = await this.synthesizer.synthesize(backend, {
      validate: options.validate,
      prettyPrint: options.prettyPrint,
      environment: options.environment,
    });

    return result;
  }

  /**
   * Synthesize backend and write to file
   *
   * @param backend - Backend object to synthesize
   * @param outputPath - Output file path
   * @param options - Synthesis options
   */
  async synthesizeToFile(
    backend: BackendObject,
    outputPath: string,
    options: SynthesisPipelineOptions = {}
  ): Promise<void> {
    // Synthesize
    const result = await this.synthesize(backend, options);

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write template to file
    const json = options.prettyPrint !== false
      ? JSON.stringify(result.template, null, 2)
      : JSON.stringify(result.template);

    fs.writeFileSync(outputPath, json, 'utf-8');

    // Write metadata file if requested
    if (options.writeMetadata) {
      const metadataPath = outputPath.replace(/\.json$/, '.metadata.json');
      const metadata = {
        environment: result.context.environment,
        cloudType: result.context.cloudType,
        region: result.context.region,
        resourceGroup: result.context.resourceGroup,
        resourceCount: result.resourceCount,
        modelCounts: {
          crud: result.analysis.models.crud.length,
          event: result.analysis.models.event.length,
          function: result.analysis.models.function.length,
        },
        synthesizedAt: new Date().toISOString(),
      };

      fs.writeFileSync(
        metadataPath,
        JSON.stringify(metadata, null, 2),
        'utf-8'
      );
    }
  }

  /**
   * Synthesize backend to directory with multiple files
   *
   * @param backend - Backend object to synthesize
   * @param outputDir - Output directory
   * @param options - Synthesis options
   */
  async synthesizeToDirectory(
    backend: BackendObject,
    outputDir: string,
    options: SynthesisPipelineOptions = {}
  ): Promise<void> {
    // Synthesize
    const result = await this.synthesize(backend, options);

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write main template
    const templatePath = path.join(outputDir, 'template.json');
    await this.synthesizeToFile(backend, templatePath, {
      ...options,
      writeMetadata: true,
    });

    // Write parameters file
    const parametersPath = path.join(outputDir, 'parameters.json');
    const parameters = this.generateParametersFile(result.template);
    fs.writeFileSync(
      parametersPath,
      JSON.stringify(parameters, null, 2),
      'utf-8'
    );

    // Write deployment script
    const deployScriptPath = path.join(outputDir, 'deploy.sh');
    const deployScript = this.generateDeploymentScript(result);
    fs.writeFileSync(deployScriptPath, deployScript, 'utf-8');
    fs.chmodSync(deployScriptPath, 0o755);
  }

  /**
   * Validate backend structure
   *
   * @param backend - Backend to validate
   */
  private validateBackend(backend: BackendObject): void {
    // Validate required fields
    if (!backend.schema) {
      throw new Error('Backend must have a schema');
    }

    if (!backend.settings) {
      throw new Error('Backend must have settings');
    }

    if (!backend.settings.name) {
      throw new Error('Backend settings must have a name');
    }

    // Validate environment
    const validEnvironments = ['development', 'staging', 'production'];
    if (!validEnvironments.includes(backend.environment)) {
      throw new Error(
        `Invalid environment: ${backend.environment}. Must be one of: ${validEnvironments.join(', ')}`
      );
    }
  }

  /**
   * Generate parameters file for ARM deployment
   *
   * @param template - ARM template
   * @returns Parameters file structure
   */
  private generateParametersFile(template: ARMTemplate): any {
    const parameters: Record<string, any> = {};

    // Extract parameters from template
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

  /**
   * Generate deployment script
   *
   * @param result - Synthesis result
   * @returns Deployment script content
   */
  private generateDeploymentScript(result: SynthesisResult): string {
    const { context } = result;

    return `#!/bin/bash
# Auto-generated deployment script

set -e

# Configuration
RESOURCE_GROUP="${context.resourceGroup}"
LOCATION="${context.region}"
TEMPLATE_FILE="template.json"
PARAMETERS_FILE="parameters.json"

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
NC='\\033[0m' # No Color

echo -e "\${GREEN}Starting deployment...\${NC}"
echo "Resource Group: \${RESOURCE_GROUP}"
echo "Location: \${LOCATION}"
echo ""

# Create resource group if it doesn't exist
echo -e "\${YELLOW}Creating resource group...\${NC}"
az group create \\
  --name "\${RESOURCE_GROUP}" \\
  --location "\${LOCATION}" \\
  --output table

echo ""

# Validate template
echo -e "\${YELLOW}Validating template...\${NC}"
az deployment group validate \\
  --resource-group "\${RESOURCE_GROUP}" \\
  --template-file "\${TEMPLATE_FILE}" \\
  --parameters "\${PARAMETERS_FILE}" \\
  --output table

echo ""

# Deploy template
echo -e "\${YELLOW}Deploying template...\${NC}"
az deployment group create \\
  --resource-group "\${RESOURCE_GROUP}" \\
  --template-file "\${TEMPLATE_FILE}" \\
  --parameters "\${PARAMETERS_FILE}" \\
  --output table

echo ""
echo -e "\${GREEN}Deployment complete!\${NC}"
`;
  }
}

/**
 * Synthesis pipeline options
 */
export interface SynthesisPipelineOptions {
  /**
   * Whether to validate backend and template
   * @default true
   */
  validate?: boolean;

  /**
   * Whether to pretty-print JSON output
   * @default true
   */
  prettyPrint?: boolean;

  /**
   * Environment override
   */
  environment?: 'development' | 'staging' | 'production';

  /**
   * Whether to write metadata file
   * @default false
   */
  writeMetadata?: boolean;
}
