/**
 * Operation Synthesizer - Converts IRestOperation to ARM operation resources
 *
 * @packageDocumentation
 */

import type { ArmResource } from '../types';
import type {
  IRestOperation,
  ParameterSchema,
  ResponseDefinition,
  ContentTypeDefinition,
} from '../../apimanagement/rest';
import type {
  ArmOperationProperties,
  ArmTemplateParameter,
  ArmOperationRequest,
  ArmOperationResponse,
  ArmQueryParameter,
  ArmHeaderParameter,
  ArmRequestRepresentation,
  ArmResponseRepresentation,
  SynthesisError,
} from './types';

/**
 * Synthesizes a single REST operation to ARM resources.
 *
 * Converts IRestOperation to:
 * - Microsoft.ApiManagement/service/apis/operations resource
 * - Microsoft.ApiManagement/service/apis/operations/policies (if policies or backend defined)
 *
 * @example
 * ```typescript
 * const synthesizer = new OperationSynthesizer(operation, 'my-api');
 * const resources = synthesizer.synthesize('apim-service');
 * // Returns [operationResource, policyResource?]
 * ```
 */
export class OperationSynthesizer {
  constructor(
    private readonly operation: IRestOperation,
    private readonly apiName: string
  ) {}

  /**
   * Synthesize operation to ARM resources
   *
   * @param apiManagementServiceName - Name of the API Management service
   * @param apiResourceId - ARM resource ID of the parent API
   * @returns Array of ARM resources (operation + optional policy)
   */
  public synthesize(
    apiManagementServiceName: string,
    apiResourceId: string
  ): ArmResource[] {
    const resources: ArmResource[] = [];

    // Generate operation ID if not provided
    const operationId =
      this.operation.operationId ||
      this.generateOperationId(this.operation.method, this.operation.path);

    // Validate operation
    this.validateOperation();

    // Create operation resource
    const operationResource = this.createOperationResource(
      apiManagementServiceName,
      operationId,
      apiResourceId
    );
    resources.push(operationResource);

    // Create policy resource if policies or backend defined
    if (this.operation.policies || this.operation.backend) {
      const policyResource = this.createPolicyResource(
        apiManagementServiceName,
        operationId,
        operationResource.name as string
      );
      resources.push(policyResource);
    }

    return resources;
  }

  /**
   * Create ARM operation resource
   */
  private createOperationResource(
    apiManagementServiceName: string,
    operationId: string,
    apiResourceId: string
  ): ArmResource {
    const properties: ArmOperationProperties = {
      displayName: this.operation.summary || this.operation.operationId || operationId,
      method: this.operation.method,
      urlTemplate: this.operation.path,
      description: this.operation.description,
      templateParameters: this.synthesizePathParameters(),
      request: this.synthesizeRequest(),
      responses: this.synthesizeResponses(),
    };

    return {
      type: 'Microsoft.ApiManagement/service/apis/operations',
      apiVersion: '2021-08-01',
      name: `[concat(parameters('apiManagementServiceName'), '/', '${this.apiName}', '/', '${operationId}')]`,
      properties,
      dependsOn: [apiResourceId],
    };
  }

  /**
   * Create ARM policy resource
   */
  private createPolicyResource(
    apiManagementServiceName: string,
    operationId: string,
    operationResourceName: string
  ): ArmResource {
    // Policy XML generation will be delegated to PolicySynthesizer
    // For now, create a basic structure with backend reference if present
    let policyXml = '<policies>\n  <inbound>\n    <base />\n';

    if (this.operation.backend) {
      const backendId = this.getBackendId(this.operation.backend);
      policyXml += `    <set-backend-service backend-id="${backendId}" />\n`;
    }

    // Add custom inbound policies
    if (this.operation.policies?.inbound) {
      // Placeholder - will be implemented by PolicySynthesizer
      policyXml += '    <!-- Custom inbound policies -->\n';
    }

    policyXml += '  </inbound>\n';
    policyXml += '  <backend>\n    <base />\n  </backend>\n';
    policyXml += '  <outbound>\n    <base />\n';

    // Add custom outbound policies
    if (this.operation.policies?.outbound) {
      // Placeholder - will be implemented by PolicySynthesizer
      policyXml += '    <!-- Custom outbound policies -->\n';
    }

    policyXml += '  </outbound>\n';
    policyXml += '  <on-error>\n    <base />\n  </on-error>\n';
    policyXml += '</policies>';

    return {
      type: 'Microsoft.ApiManagement/service/apis/operations/policies',
      apiVersion: '2021-08-01',
      name: `[concat(parameters('apiManagementServiceName'), '/', '${this.apiName}', '/', '${operationId}', '/policy')]`,
      properties: {
        value: policyXml,
        format: 'xml',
      },
      dependsOn: [operationResourceName],
    };
  }

  /**
   * Synthesize path parameters from operation
   */
  private synthesizePathParameters(): ArmTemplateParameter[] | undefined {
    if (!this.operation.pathParameters?.schema.properties) {
      return undefined;
    }

    const pathParamsInUrl = this.extractPathParamsFromUrl(this.operation.path);
    const parameters: ArmTemplateParameter[] = [];

    for (const paramName of pathParamsInUrl) {
      const paramSchema = this.operation.pathParameters.schema.properties[paramName];

      if (!paramSchema) {
        throw this.createSynthesisError(
          `Path parameter '${paramName}' in URL template '${this.operation.path}' is not defined in pathParameters`,
          {
            path: `operations.${this.operation.operationId}.pathParameters`,
            suggestion: `Add a schema definition for parameter '${paramName}'`,
          }
        );
      }

      parameters.push(this.convertParameterSchemaToArm(paramName, paramSchema, true));
    }

    return parameters.length > 0 ? parameters : undefined;
  }

  /**
   * Synthesize request definition
   */
  private synthesizeRequest(): ArmOperationRequest | undefined {
    const request: any = {
      description: this.operation.requestBody?.description,
    };

    // Query parameters
    if (this.operation.queryParameters?.schema.properties) {
      request.queryParameters = this.synthesizeQueryParameters();
    }

    // Header parameters
    if (this.operation.headerParameters?.schema.properties) {
      request.headers = this.synthesizeHeaderParameters();
    }

    // Request body representations
    if (this.operation.requestBody?.content) {
      request.representations = this.synthesizeRequestBodyRepresentations(
        this.operation.requestBody.content
      );
    }

    // Return undefined if empty
    if (
      !request.queryParameters &&
      !request.headers &&
      !request.representations &&
      !request.description
    ) {
      return undefined;
    }

    return request as ArmOperationRequest;
  }

  /**
   * Synthesize query parameters
   */
  private synthesizeQueryParameters(): ArmQueryParameter[] {
    const parameters: ArmQueryParameter[] = [];
    const schema = this.operation.queryParameters!.schema;

    if (!schema.properties) {
      return parameters;
    }

    const required = schema.required || [];

    for (const [name, paramSchema] of Object.entries(schema.properties)) {
      const armParam = this.convertParameterSchemaToArm(
        name,
        paramSchema,
        required.includes(name)
      );
      parameters.push(armParam);
    }

    return parameters;
  }

  /**
   * Synthesize header parameters
   */
  private synthesizeHeaderParameters(): ArmHeaderParameter[] {
    const parameters: ArmHeaderParameter[] = [];
    const schema = this.operation.headerParameters!.schema;

    if (!schema.properties) {
      return parameters;
    }

    const required = schema.required || [];

    for (const [name, paramSchema] of Object.entries(schema.properties)) {
      const armParam = this.convertParameterSchemaToArm(
        name,
        paramSchema,
        required.includes(name)
      );
      parameters.push(armParam);
    }

    return parameters;
  }

  /**
   * Synthesize request body representations
   */
  private synthesizeRequestBodyRepresentations(
    content: ContentTypeDefinition
  ): ArmRequestRepresentation[] {
    const representations: ArmRequestRepresentation[] = [];

    for (const [contentType, mediaType] of Object.entries(content)) {
      if (!mediaType) continue;

      const representation: any = {
        contentType,
        schemaId: null,
        typeName: null,
      };

      // Extract sample from examples if available
      if (mediaType.examples) {
        const firstExample = Object.values(mediaType.examples)[0];
        if (firstExample?.value) {
          representation.sample = JSON.stringify(firstExample.value);
        }
      }

      representations.push(representation as ArmRequestRepresentation);
    }

    return representations;
  }

  /**
   * Synthesize responses
   */
  private synthesizeResponses(): ArmOperationResponse[] {
    const responses: ArmOperationResponse[] = [];

    // Ensure at least one response exists (ARM requirement)
    if (!this.operation.responses || Object.keys(this.operation.responses).length === 0) {
      return [
        {
          statusCode: 200,
          description: 'Success',
          representations: [],
          headers: [],
        },
      ];
    }

    for (const [statusCode, responseSchema] of Object.entries(this.operation.responses)) {
      if (statusCode === 'default' || !responseSchema) continue;

      const armResponse: ArmOperationResponse = {
        statusCode: parseInt(statusCode, 10),
        description: responseSchema.description || `Response ${statusCode}`,
        representations: responseSchema.content
          ? this.synthesizeResponseRepresentations(responseSchema.content)
          : [],
        headers: responseSchema.headers
          ? this.synthesizeResponseHeaders(responseSchema.headers)
          : [],
      };

      responses.push(armResponse);
    }

    return responses.length > 0
      ? responses
      : [
          {
            statusCode: 200,
            description: 'Success',
            representations: [],
            headers: [],
          },
        ];
  }

  /**
   * Synthesize response representations
   */
  private synthesizeResponseRepresentations(
    content: ContentTypeDefinition
  ): ArmResponseRepresentation[] {
    const representations: ArmResponseRepresentation[] = [];

    for (const [contentType, mediaType] of Object.entries(content)) {
      if (!mediaType) continue;

      const representation: any = {
        contentType,
        schemaId: null,
        typeName: null,
      };

      // Extract sample from examples if available
      if (mediaType.examples) {
        const firstExample = Object.values(mediaType.examples)[0];
        if (firstExample?.value) {
          representation.sample = JSON.stringify(firstExample.value);
        }
      }

      representations.push(representation as ArmResponseRepresentation);
    }

    return representations;
  }

  /**
   * Synthesize response headers
   */
  private synthesizeResponseHeaders(
    headers: Record<string, any>
  ): ArmHeaderParameter[] {
    const armHeaders: ArmHeaderParameter[] = [];

    for (const [name, headerDef] of Object.entries(headers)) {
      if (!headerDef?.schema) continue;

      armHeaders.push(
        this.convertParameterSchemaToArm(name, headerDef.schema, headerDef.required || false)
      );
    }

    return armHeaders;
  }

  /**
   * Convert parameter schema to ARM parameter format
   */
  private convertParameterSchemaToArm(
    name: string,
    schema: ParameterSchema,
    required: boolean
  ): ArmTemplateParameter {
    const armParam: any = {
      name,
      description: schema.description || '',
      type: this.mapJsonSchemaTypeToArm(schema.type),
      required,
    };

    // Add default value if present
    if (schema.default !== undefined) {
      armParam.defaultValue = String(schema.default);
    }

    // Add enum values if present
    if (schema.enum && schema.enum.length > 0) {
      armParam.values = schema.enum.map((v) => String(v));
    }

    return armParam as ArmTemplateParameter;
  }

  /**
   * Map JSON Schema type to ARM type
   */
  private mapJsonSchemaTypeToArm(
    type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object'
  ): string {
    const typeMap: Record<string, string> = {
      string: 'string',
      number: 'number',
      integer: 'integer',
      boolean: 'boolean',
      array: 'array',
      object: 'object',
    };

    return typeMap[type] || 'string';
  }

  /**
   * Extract path parameters from URL template
   */
  private extractPathParamsFromUrl(path: string): string[] {
    const paramRegex = /{([^}]+)}/g;
    const params: string[] = [];
    let match;

    while ((match = paramRegex.exec(path)) !== null) {
      params.push(match[1]);
    }

    return params;
  }

  /**
   * Generate operation ID from method and path
   */
  private generateOperationId(method: string, path: string): string {
    const sanitizedPath = path
      .replace(/^\//, '') // Remove leading slash
      .replace(/\//g, '_') // Replace slashes with underscores
      .replace(/[{}]/g, '') // Remove braces
      .replace(/[^a-zA-Z0-9_]/g, '_'); // Replace invalid chars

    return `${method.toLowerCase()}_${sanitizedPath}`;
  }

  /**
   * Get backend ID from backend configuration
   */
  private getBackendId(backend: any): string {
    // This will be properly implemented when BackendSynthesizer is integrated
    // For now, return a simple ID
    if (backend.type === 'azureFunction') {
      return `backend-${backend.functionName || 'function'}`;
    }
    if (backend.type === 'appService') {
      return `backend-webapp`;
    }
    if (backend.type === 'httpEndpoint') {
      return `backend-http`;
    }
    return 'backend-default';
  }

  /**
   * Validate operation before synthesis
   */
  private validateOperation(): void {
    // Validate path parameter consistency
    const pathParamsInUrl = this.extractPathParamsFromUrl(this.operation.path);
    const definedParams = Object.keys(
      this.operation.pathParameters?.schema.properties || {}
    );

    for (const param of pathParamsInUrl) {
      if (!definedParams.includes(param)) {
        throw this.createSynthesisError(
          `Path parameter '${param}' in URL template '${this.operation.path}' is not defined in pathParameters`,
          {
            path: `operations.${this.operation.operationId}.pathParameters`,
            suggestion: `Add a schema definition for parameter '${param}'`,
          }
        );
      }
    }

    // Validate path uses {param} syntax (not :param or <param>)
    if (this.operation.path.includes(':') || this.operation.path.includes('<')) {
      throw this.createSynthesisError(
        `Invalid URL template in operation '${this.operation.operationId}': ${this.operation.path}`,
        {
          suggestion: 'Use {paramName} syntax for path parameters',
          path: `operations.${this.operation.operationId}.path`,
          fix: 'Example: /users/{userId} instead of /users/:userId',
        }
      );
    }
  }

  /**
   * Create a synthesis error with context
   */
  private createSynthesisError(
    message: string,
    context?: {
      suggestion?: string;
      path?: string;
      fix?: string;
    }
  ): Error {
    const error = new Error(message);
    error.name = 'SynthesisError';
    (error as any).context = context;
    return error;
  }
}
