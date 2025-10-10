/**
 * Type definitions for REST API synthesis
 *
 * @packageDocumentation
 */

import type { ArmResource } from '../types';

/**
 * Options for REST API synthesis
 */
export interface RestApiSynthesisOptions {
  /**
   * Whether to export OpenAPI specification as artifact
   * @default true
   */
  readonly exportOpenApi?: boolean;

  /**
   * OpenAPI version to export
   * @default '3.0.3'
   */
  readonly openApiVersion?: '3.0.3' | '3.1.0';

  /**
   * Whether to validate schemas during synthesis
   * @default true
   */
  readonly validateSchemas?: boolean;

  /**
   * Whether to generate YAML in addition to JSON
   * @default true
   */
  readonly generateYaml?: boolean;

  /**
   * Custom OpenAPI info metadata
   */
  readonly apiInfo?: {
    readonly title?: string;
    readonly description?: string;
    readonly version?: string;
    readonly termsOfService?: string;
    readonly contact?: {
      readonly name?: string;
      readonly email?: string;
      readonly url?: string;
    };
    readonly license?: {
      readonly name?: string;
      readonly url?: string;
    };
  };
}

/**
 * Result of REST API synthesis
 */
export interface RestApiSynthesisResult {
  /**
   * ARM resources generated from REST API operations
   */
  readonly resources: ArmResource[];

  /**
   * Path to generated OpenAPI specification (JSON)
   */
  readonly openApiJsonPath?: string;

  /**
   * Path to generated OpenAPI specification (YAML)
   */
  readonly openApiYamlPath?: string;

  /**
   * Number of operations synthesized
   */
  readonly operationCount: number;

  /**
   * Number of backends created
   */
  readonly backendCount: number;

  /**
   * Number of policies created
   */
  readonly policyCount: number;
}

/**
 * ARM template parameter for path parameters
 */
export interface ArmTemplateParameter {
  readonly name: string;
  readonly description?: string;
  readonly type: string;
  readonly required: boolean;
  readonly defaultValue?: string;
  readonly values?: string[];
}

/**
 * ARM request representation
 */
export interface ArmRequestRepresentation {
  readonly contentType: string;
  readonly schemaId?: string | null;
  readonly typeName?: string | null;
  readonly sample?: string;
}

/**
 * ARM response representation
 */
export interface ArmResponseRepresentation {
  readonly contentType: string;
  readonly schemaId?: string | null;
  readonly typeName?: string | null;
  readonly sample?: string;
}

/**
 * ARM query parameter
 */
export interface ArmQueryParameter {
  readonly name: string;
  readonly description?: string;
  readonly type: string;
  readonly required: boolean;
  readonly defaultValue?: string;
  readonly values?: string[];
}

/**
 * ARM header parameter
 */
export interface ArmHeaderParameter {
  readonly name: string;
  readonly description?: string;
  readonly type: string;
  readonly required: boolean;
  readonly defaultValue?: string;
  readonly values?: string[];
}

/**
 * ARM request definition
 */
export interface ArmOperationRequest {
  readonly description?: string;
  readonly queryParameters?: ArmQueryParameter[];
  readonly headers?: ArmHeaderParameter[];
  readonly representations?: ArmRequestRepresentation[];
}

/**
 * ARM response definition
 */
export interface ArmOperationResponse {
  readonly statusCode: number;
  readonly description: string;
  readonly representations?: ArmResponseRepresentation[];
  readonly headers?: ArmHeaderParameter[];
}

/**
 * ARM operation properties
 */
export interface ArmOperationProperties {
  readonly displayName: string;
  readonly method: string;
  readonly urlTemplate: string;
  readonly description?: string;
  readonly templateParameters?: ArmTemplateParameter[];
  readonly request?: ArmOperationRequest;
  readonly responses: ArmOperationResponse[];
}

/**
 * Backend resource identifier
 */
export interface BackendResourceIdentifier {
  /**
   * Unique backend ID used in ARM resource names
   */
  readonly backendId: string;

  /**
   * ARM resource name for the backend
   */
  readonly armResourceName: string;

  /**
   * Whether this backend has already been synthesized
   */
  readonly synthesized: boolean;
}

/**
 * Synthesis error with actionable context
 */
export class SynthesisError extends Error {
  constructor(
    message: string,
    public readonly context?: {
      readonly suggestion?: string;
      readonly path?: string;
      readonly fix?: string;
    }
  ) {
    super(message);
    this.name = 'SynthesisError';
  }
}

/**
 * JSON Schema type to ARM type mapping
 */
export type JsonSchemaTypeToArm = {
  readonly string: 'string';
  readonly number: 'number';
  readonly integer: 'integer';
  readonly boolean: 'boolean';
  readonly array: 'array';
  readonly object: 'object';
};

/**
 * ARM backend credentials configuration
 */
export interface ArmBackendCredentials {
  readonly header?: Record<string, string>;
  readonly query?: Record<string, string>;
  readonly certificate?: string[];
  readonly authorization?: {
    readonly scheme: string;
    readonly parameter?: string;
  };
}

/**
 * ARM backend TLS configuration
 */
export interface ArmBackendTls {
  readonly validateCertificateChain?: boolean;
  readonly validateCertificateName?: boolean;
}

/**
 * ARM circuit breaker rule
 */
export interface ArmCircuitBreakerRule {
  readonly failureCondition: {
    readonly count: number;
    readonly interval: string;
    readonly statusCodeRanges?: Array<{
      readonly min: number;
      readonly max: number;
    }>;
    readonly errorReasons?: string[];
  };
  readonly tripDuration: string;
}

/**
 * ARM backend properties
 */
export interface ArmBackendProperties {
  readonly title?: string;
  readonly description?: string;
  readonly protocol: 'http' | 'soap';
  readonly url: string;
  readonly resourceId?: string;
  readonly credentials?: ArmBackendCredentials;
  readonly tls?: ArmBackendTls;
  readonly proxy?: {
    readonly url?: string | null;
    readonly username?: string | null;
    readonly password?: string | null;
  };
  readonly circuitBreaker?: {
    readonly rules: ArmCircuitBreakerRule[];
  };
}
