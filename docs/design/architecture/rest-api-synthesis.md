# REST API Synthesis Architecture

> **Note**: This documentation consolidates design documents previously located in `packages/lib/src/synthesis/rest/`.

## Overview

This document defines the synthesis architecture for converting RestApiStack constructs into deployable Azure API Management ARM templates. The synthesis process transforms high-level REST operation definitions into Azure API Management resources while maintaining type safety and developer experience.

## Synthesis Pipeline Integration

### Current Synthesis Architecture

The existing synthesis pipeline follows a four-phase model:

1. **Prepare Phase**: Traverse construct tree and collect resources by stack
2. **Transform Phase**: Convert resources to ARM JSON via `toArmTemplate()` method
3. **Validate Phase**: Run validation pipeline on generated templates
4. **Assembly Phase**: Write templates to disk and create manifest

### RestApiStack Integration Points

```typescript
// RestApiStack must implement the standard synthesis interface
class RestApiStack extends ApiStackBase {
  // Called during Transform phase
  public toArmTemplate(): ArmResource[] {
    return this.synthesizeApiManagementResources();
  }

  private synthesizeApiManagementResources(): ArmResource[] {
    // 1. Synthesize API resource
    // 2. Synthesize operations for each IRestOperation
    // 3. Synthesize backends
    // 4. Synthesize policies
    return [...apiResources, ...operationResources, ...backendResources];
  }
}
```

## Synthesis Flow Diagram

```
RestApiStack.toArmTemplate()
    │
    ├─> Synthesize API Resource
    │   └─> Microsoft.ApiManagement/service/apis
    │
    ├─> Discover REST Operations
    │   ├─> From props.operations array
    │   └─> From imported OpenAPI spec
    │
    ├─> For each IRestOperation:
    │   ├─> Synthesize Operation Resource
    │   │   └─> Microsoft.ApiManagement/service/apis/operations
    │   │
    │   ├─> Synthesize Parameters
    │   │   ├─> Path parameters → templateParameters
    │   │   ├─> Query parameters → request.queryParameters
    │   │   └─> Header parameters → request.headers
    │   │
    │   ├─> Synthesize Request Body
    │   │   └─> request.representations (content types)
    │   │
    │   ├─> Synthesize Responses
    │   │   └─> responses[statusCode].representations
    │   │
    │   ├─> Synthesize Backend (if configured)
    │   │   ├─> Azure Function → backend-service + policy
    │   │   ├─> App Service → backend-service + policy
    │   │   └─> HTTP Endpoint → set-backend-service policy
    │   │
    │   └─> Synthesize Operation Policies
    │       └─> Microsoft.ApiManagement/service/apis/operations/policies
    │
    ├─> Generate OpenAPI Spec (optional)
    │   ├─> Export operations to OpenAPI 3.0/3.1
    │   ├─> Write to assembly artifacts
    │   └─> Reference in ARM template outputs
    │
    └─> Return ARM Resources Array
```

## Core Components

### 1. RestApiSynthesizer

Central orchestrator for REST API synthesis.

**Responsibilities**:
- Coordinate synthesis of API, operations, backends, and policies
- Manage resource dependencies and naming
- Generate OpenAPI specifications during synthesis
- Integrate with validation pipeline

**Key Methods**:
```typescript
export class RestApiSynthesizer {
  synthesize(): ArmResource[]
  private synthesizeApi(): ArmResource
  private synthesizeOperation(operation: IRestOperation): ArmResource[]
  private synthesizeBackends(): ArmResource[]
  private generateOpenApiArtifact(): void
}
```

### 2. OperationSynthesizer

Handles individual operation synthesis.

**Responsibilities**:
- Convert IRestOperation to ARM operation resource
- Synthesize parameters (path, query, header)
- Convert request/response bodies
- Generate operation policies

**Key Methods**:
```typescript
export class OperationSynthesizer {
  synthesize(): ArmResource[]
  private createOperationResource(): ArmResource
  private synthesizePathParameters(): TemplateParameter[]
  private synthesizeRequest(): OperationRequest
  private synthesizeResponses(): OperationResponse[]
  private createPolicyResource(operationName: string): ArmResource
}
```

### 3. BackendSynthesizer

Synthesizes backend service resources.

**Supported Backends**:
- Azure Functions
- App Service
- Container Apps
- HTTP Endpoints

**Key Methods**:
```typescript
export class BackendSynthesizer {
  synthesize(): ArmResource[]
  private synthesizeBackend(backendId: string, config: BackendConfiguration): ArmResource
  private synthesizeAzureFunctionBackend(backendId: string, config: AzureFunctionBackend): ArmResource
  private synthesizeAppServiceBackend(backendId: string, config: AppServiceBackend): ArmResource
  private synthesizeHttpBackend(backendId: string, config: HttpEndpointBackend): ArmResource
}
```

### 4. OpenApiArtifactGenerator

Generates OpenAPI specs during synthesis.

**Responsibilities**:
- Export operations to OpenAPI 3.0/3.1 format
- Write specs to assembly directory
- Support both JSON and YAML formats
- Integrate with validation pipeline

**Key Methods**:
```typescript
export class OpenApiArtifactGenerator {
  generate(): string
  generateToAssembly(outputDir: string): string[]
  copyToProjectDocs(sourcePath: string, docsDir: string): void
}
```

## ARM Mapping Reference

### IRestOperation to ARM Operation

Complete field-by-field mapping documentation:

| IRestOperation Field | ARM Field | Transformation |
|---------------------|-----------|----------------|
| `method` | `properties.method` | Direct copy (GET, POST, etc.) |
| `path` | `properties.urlTemplate` | Direct copy (must use {param} syntax) |
| `operationId` | ARM resource name component | Sanitize for ARM naming rules |
| `summary` | `properties.displayName` | Direct copy, fallback to operationId |
| `description` | `properties.description` | Direct copy |
| `pathParameters` | `properties.templateParameters` | JSON Schema to ARM parameters |
| `queryParameters` | `properties.request.queryParameters` | JSON Schema to ARM parameters |
| `headerParameters` | `properties.request.headers` | JSON Schema to ARM parameters |
| `requestBody` | `properties.request.representations` | Content-type mapping |
| `responses` | `properties.responses` | Status code and content-type mapping |
| `backend` | Separate backend resource | Backend synthesizer |
| `policies` | Separate policy resource | Policy synthesizer |

### Backend Configuration Mapping

#### Azure Function Backend
```typescript
// Input
backend: {
  type: 'azureFunction',
  functionApp: userFunctionApp,
  functionName: 'GetUser',
  authLevel: 'function',
  timeout: 30
}

// Output: Backend Resource + Policy Resource
```

#### App Service Backend
```typescript
// Input
backend: {
  type: 'appService',
  appService: webAppConstruct,
  relativePath: '/api/v1',
  timeout: 60
}

// Output: Backend Resource + Policy Resource
```

#### HTTP Endpoint Backend
```typescript
// Input
backend: {
  type: 'httpEndpoint',
  url: 'https://api.external.com/v1',
  credentials: {
    type: 'apiKey',
    apiKey: '[parameters(\'externalApiKey\')]',
    header: 'X-API-Key'
  }
}

// Output: Backend Resource + Policy Resource
```

### Type Conversion Rules

| JSON Schema Type | ARM Type | Notes |
|-----------------|----------|-------|
| `string` | `string` | Direct mapping |
| `number` | `number` | Direct mapping |
| `integer` | `integer` | Preserve integer distinction |
| `boolean` | `boolean` | Direct mapping |
| `array` | `array` | Direct mapping |
| `object` | `object` | For complex parameters |
| `null` | Not supported | Use `nullable: true` instead |

## OpenAPI Generation Strategy

### Generation Timing

**Decision**: Generate during synthesis phase (not pre or post).

**Rationale**:
- Full construct tree available
- Consistent with ARM generation
- Single command workflow
- Access to runtime values

### Output Strategy

**Decision**: Dual output (assembly + optional docs).

#### 1. Assembly Directory (Primary)
```
.atakora/arm.out/
└── <package-name>/
    ├── manifest.json
    ├── Foundation.json
    ├── UserAPI-openapi.json      ← Synthesis artifact
    └── UserAPI-openapi.yaml      ← Synthesis artifact (YAML)
```

**Purpose**: Deployment artifact, version controlled with ARM templates

#### 2. Project Documentation Directory (Optional)
```
docs/api/
├── user-api.json          ← Stable API spec
├── product-api.yaml       ← Stable API spec
└── README.md              ← API documentation
```

**Purpose**: Documentation, SDK generation, API testing, source control

### Validation Strategy

**Two-Phase Validation**:

1. **Build-Time Validation** (TypeScript)
   - Type consistency checking
   - Required fields validation
   - Schema structure validation
   - Type inference correctness

2. **Synthesis-Time Validation** (OpenAPI)
   - OpenAPI schema compliance
   - Operation ID uniqueness
   - Path parameter consistency
   - Reference resolution
   - HTTP status code validity

### Caching Strategy

Smart caching with invalidation to avoid regenerating unchanged specs.

**Cache Invalidation Triggers**:
- Operations added, modified, or removed
- Backend configurations changed
- Policy definitions changed
- API metadata changed
- Spec file manually deleted
- Force flag used: `atakora synth --force`

## CLI Integration

### Enhanced Synth Command

```bash
# Synthesize with OpenAPI export
atakora synth --export-openapi

# Synthesize specific API only
atakora synth --api UserAPI

# Synthesize with OpenAPI validation
atakora synth --validate-openapi
```

### API Management Commands

```bash
# Create new REST API
atakora api create --name UserAPI --interactive

# Add operation to API
atakora api add-operation --api UserAPI --method GET --path /users/{id}

# Export OpenAPI spec
atakora api export --api UserAPI --output docs/api/user-api.json

# Validate API definition
atakora api validate --api UserAPI --strict

# Import OpenAPI spec
atakora api import petstore.yaml --name PetStore
```

## Performance Considerations

### Synthesis Speed Targets
- **Single operation**: < 100ms
- **10 operations**: < 500ms
- **100 operations**: < 5s
- **OpenAPI import (1000 ops)**: < 10s

### Optimization Strategies
- Backend deduplication (O(1) lookup via Map)
- Lazy backend synthesis (only synthesize if referenced)
- Parallel OpenAPI generation for multiple APIs
- Incremental generation (only regenerate changed APIs)
- Streaming for large specs (avoid loading entirely in memory)

## Error Handling

### Synthesis Errors

Clear error messages with actionable suggestions:

```typescript
throw new SynthesisError(
  `Operation '${operation.operationId}' references unknown backend '${operation.backend.id}'`,
  {
    suggestion: 'Ensure the backend is registered with the API stack',
    path: `operations.${operation.operationId}.backend`,
    fix: `stack.addBackend('${operation.backend.id}', backendConfig)`
  }
);
```

### Validation Errors

Comprehensive error reporting with context and suggestions:

```typescript
const validationErrors = validator.validate(spec);

if (validationErrors.length > 0) {
  console.error(chalk.red('OpenAPI validation failed'));
  for (const error of validationErrors) {
    console.log(`  ${chalk.red('•')} ${error.path}: ${error.message}`);
    if (error.suggestion) {
      console.log(`    ${chalk.gray('Suggestion:')} ${error.suggestion}`);
    }
  }
}
```

## Security Considerations

- Secrets via ARM parameters (not hardcoded)
- Function keys via `listKeys()` expressions
- TLS certificate validation enabled by default
- No sensitive data in output templates
- Support for managed identity credentials

## Government Cloud Compatibility

- No hardcoded endpoints
- Standard ARM expressions only
- Compatible with Azure Government regions
- No dependencies on commercial-only services

## Implementation Status

**Phase 3**: Core synthesis components implemented (2025-10-10)

**Completed**:
- Type definitions (`types.ts`)
- Operation synthesizer (`operation-synthesizer.ts`)
- Backend synthesizer (`backend-synthesizer.ts`)
- REST API synthesizer (`rest-api-synthesizer.ts`)
- Module exports (`index.ts`)

**Pending**:
- RestApiStack construct integration
- PolicySynthesizer implementation
- OpenAPI integration with type generator
- Comprehensive testing
- CLI command implementation

## Testing Strategy

### Unit Tests
- Synthesizer component tests
- ARM resource validation
- Type conversion validation
- Error handling validation

### Integration Tests
- End-to-end synthesis
- ARM template deployment validation
- OpenAPI spec validation
- Performance benchmarking

## References

- Implementation summary: `docs/design/architecture/rest-api-implementation-summary.md`
- ARM mapping details: `docs/design/architecture/rest-api-arm-mapping.md`
- OpenAPI generation: `docs/design/architecture/rest-api-openapi-generation.md`
- CLI design: `docs/design/architecture/rest-api-cli-design.md`
- Azure API Management ARM schema: https://learn.microsoft.com/en-us/azure/templates/microsoft.apimanagement
- OpenAPI Specification: https://spec.openapis.org/oas/v3.0.3

---

**Last Updated**: 2025-10-10
**Phase**: 3 (RestApiStack Synthesis Integration)
**Status**: Core components implemented, integration pending
