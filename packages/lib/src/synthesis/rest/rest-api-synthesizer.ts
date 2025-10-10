/**
 * REST API Synthesizer - Main orchestrator for REST API synthesis
 *
 * @packageDocumentation
 */

import type { ArmResource } from '../types';
import type { IRestOperation } from '@atakora/cdk/src/api/rest';
import type {
  RestApiSynthesisOptions,
  RestApiSynthesisResult,
} from './types';
import { OperationSynthesizer } from './operation-synthesizer';
import { BackendSynthesizer } from './backend-synthesizer';

/**
 * Synthesizes REST API constructs to Azure API Management ARM resources.
 *
 * Responsibilities:
 * - Coordinate synthesis of API, operations, backends, and policies
 * - Manage resource dependencies and naming
 * - Generate OpenAPI specifications during synthesis
 * - Integrate with validation pipeline
 *
 * @example
 * ```typescript
 * const synthesizer = new RestApiSynthesizer('my-api', operations, {
 *   exportOpenApi: true,
 *   openApiVersion: '3.0.3'
 * });
 *
 * const result = synthesizer.synthesize('apim-service', 'apim-resource-id');
 * // Returns { resources, openApiJsonPath, operationCount, ... }
 * ```
 */
export class RestApiSynthesizer {
  private readonly backendSynthesizer: BackendSynthesizer;
  private readonly operations: IRestOperation[];

  constructor(
    private readonly apiName: string,
    operations: Iterable<IRestOperation>,
    private readonly options: RestApiSynthesisOptions = {}
  ) {
    this.operations = Array.from(operations);
    this.backendSynthesizer = new BackendSynthesizer();

    // Register backends from operations
    this.registerBackends();
  }

  /**
   * Main synthesis entry point
   *
   * @param apiManagementServiceName - Name of the API Management service
   * @param apiResourceId - ARM resource ID of the parent API
   * @param outputDir - Directory for OpenAPI artifacts (optional)
   * @returns Synthesis result with ARM resources and metadata
   */
  public synthesize(
    apiManagementServiceName: string,
    apiResourceId: string,
    outputDir?: string
  ): RestApiSynthesisResult {
    const resources: ArmResource[] = [];

    // 1. Synthesize all operations
    let operationCount = 0;
    let policyCount = 0;

    for (const operation of this.operations) {
      const opSynthesizer = new OperationSynthesizer(operation, this.apiName);
      const opResources = opSynthesizer.synthesize(
        apiManagementServiceName,
        apiResourceId
      );

      resources.push(...opResources);
      operationCount++;

      // Count policies (operation resource + optional policy resource)
      if (opResources.length > 1) {
        policyCount++;
      }
    }

    // 2. Synthesize backends
    const backendResources = this.backendSynthesizer.synthesize(
      apiManagementServiceName,
      apiResourceId
    );
    resources.push(...backendResources);

    // 3. Generate OpenAPI spec as artifact (if enabled)
    let openApiJsonPath: string | undefined;
    let openApiYamlPath: string | undefined;

    if (this.options.exportOpenApi !== false && outputDir) {
      // OpenAPI generation will be implemented in next task
      // For now, just prepare the paths
      openApiJsonPath = `${outputDir}/${this.apiName}-openapi.json`;
      if (this.options.generateYaml !== false) {
        openApiYamlPath = `${outputDir}/${this.apiName}-openapi.yaml`;
      }
    }

    return {
      resources,
      openApiJsonPath,
      openApiYamlPath,
      operationCount,
      backendCount: this.backendSynthesizer.getBackendCount(),
      policyCount,
    };
  }

  /**
   * Register all backends from operations
   */
  private registerBackends(): void {
    for (const operation of this.operations) {
      if (operation.backend) {
        const backendId = this.getBackendId(operation);

        // Only register if not already registered
        if (!this.backendSynthesizer.hasBackend(backendId)) {
          this.backendSynthesizer.registerBackend(backendId, operation.backend as any);
        }
      }
    }
  }

  /**
   * Get backend ID from operation
   */
  private getBackendId(operation: IRestOperation): string {
    if (!operation.backend) {
      throw new Error(`Operation ${operation.operationId} has no backend configured`);
    }

    // Generate backend ID based on backend type
    const backend = operation.backend;

    switch (backend.type) {
      case 'azureFunction':
        return `function-${backend.functionName || 'default'}`;
      case 'appService':
        return `webapp-${backend.appService.name}`;
      case 'containerApp':
        return `container-${backend.containerApp.name}`;
      case 'httpEndpoint':
        // Create unique ID from URL
        const urlHash = this.hashString(backend.url);
        return `http-${urlHash}`;
      default:
        return `backend-${operation.operationId || 'default'}`;
    }
  }

  /**
   * Simple hash function for backend URLs
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36).substring(0, 8);
  }

  /**
   * Get operation count
   */
  public getOperationCount(): number {
    return this.operations.length;
  }

  /**
   * Get backend count
   */
  public getBackendCount(): number {
    return this.backendSynthesizer.getBackendCount();
  }

  /**
   * Validate all operations before synthesis
   */
  public validate(): void {
    // Validate each operation has unique operationId
    const operationIds = new Set<string>();

    for (const operation of this.operations) {
      const opId = operation.operationId || `${operation.method}_${operation.path}`;

      if (operationIds.has(opId)) {
        throw new Error(`Duplicate operation ID: ${opId}`);
      }

      operationIds.add(opId);
    }

    // Validate backend references
    for (const operation of this.operations) {
      if (operation.backend) {
        const backendId = this.getBackendId(operation);
        if (!this.backendSynthesizer.hasBackend(backendId)) {
          throw new Error(
            `Operation '${operation.operationId}' references unknown backend '${backendId}'`
          );
        }
      }
    }
  }
}
