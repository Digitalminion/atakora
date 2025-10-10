# OpenAPI Synthesis Library Reference

Technical reference for the OpenAPI synthesis library used in Atakora's REST API implementation.

## Architecture

The OpenAPI synthesis library is located at `packages/lib/src/synthesis/openapi/` and provides:

```
packages/lib/src/synthesis/openapi/
├── importer.ts                        # OpenAPI spec importer
├── exporter.ts                        # OpenAPI spec exporter
├── validator.ts                       # Schema validation
├── type-generator.ts                  # TypeScript type generator
├── ref-resolver.ts                    # $ref resolution
└── azure-extensions.ts                # Azure x-ms-* extensions
```

## Key Features

### 1. OpenAPI Import & Export
- Import OpenAPI 3.0.x and 3.1.0 specifications
- Export REST operations to OpenAPI format
- Support for YAML and JSON formats
- $ref resolution (local and external)

### 2. Type Generation
- Generate TypeScript interfaces from OpenAPI schemas
- Preserve all schema constraints in JSDoc
- Support for discriminated unions (oneOf)
- Handle circular references
- Generic type parameters

### 3. Runtime Validation
- Request body validation
- Response validation
- Parameter validation (path, query, header)
- Custom error messages
- Government cloud compatible

### 4. Azure Extensions
- Support for x-ms-* extensions
- x-ms-enum for enhanced enums
- x-ms-discriminator-value for polymorphic types
- x-ms-examples for test data

## API Reference

### OpenApiImporter

Imports OpenAPI specifications and converts them to REST operations.

```typescript
class OpenApiImporter {
  constructor(spec: string | OpenApiDefinition);

  async import(): Promise<RestOperationCollection>;

  private async loadSpec(path: string): Promise<OpenApiDefinition>;
  private validate(spec: OpenApiDefinition): void;
  private convertPathItem(path: string, pathItem: OpenApiPathItem): IRestOperation[];
  private convertOperation(method: HttpMethod, path: string, operation: OpenApiOperation): IRestOperation;
  private extractPathParameters(parameters: ParameterObject[]): PathParameterDefinition;
  private extractQueryParameters(parameters: ParameterObject[]): QueryParameterDefinition;
  private resolveReference<T>(item: T | ReferenceObject): T;
  private convertParameterSchema(schema: any): ParameterSchema;
  private convertRequestBody(requestBody: RequestBodyObject): RequestBodyDefinition;
  private convertResponses(responses: ResponsesObject): ResponseDefinition;
}
```

**Usage Example:**

```typescript
import { OpenApiImporter } from '@atakora/lib/synthesis/openapi';

// From file
const importer = new OpenApiImporter('./api-spec.yaml');
const operations = await importer.import();

// From URL (disabled in Government cloud)
const importer = new OpenApiImporter('https://api.example.com/openapi.json');
const operations = await importer.import();

// From object
const spec: OpenApiDefinition = { /* ... */ };
const importer = new OpenApiImporter(spec);
const operations = await importer.import();
```

### OpenApiExporter

Exports REST operations to OpenAPI specification format.

```typescript
class OpenApiExporter {
  constructor(
    operations: IRestOperation[],
    info: OpenApiInfo
  );

  export(version: '3.0.3' | '3.1.0' = '3.0.3'): OpenApiDefinition;

  private groupByPath(operations: IRestOperation[]): Map<string, IRestOperation[]>;
  private buildPathItem(operations: IRestOperation[]): OpenApiPathItem;
  private buildOperation(operation: IRestOperation): OpenApiOperation;
  private buildParameters(operation: IRestOperation): ParameterObject[];
  private buildRequestBody(operation: IRestOperation): RequestBodyObject;
  private buildResponses(operation: IRestOperation): ResponsesObject;
  private convertToOpenApiSchema(schema: JsonSchema): any;
}
```

**Usage Example:**

```typescript
import { OpenApiExporter } from '@atakora/lib/synthesis/openapi';

const operations: IRestOperation[] = [/* ... */];

const exporter = new OpenApiExporter(operations, {
  title: 'My API',
  version: '1.0.0',
  description: 'REST API for my application'
});

const spec = exporter.export('3.1.0');

// Write to file
await fs.writeFile('./openapi.yaml', yaml.stringify(spec));
```

### TypeGenerator

Generates TypeScript types from OpenAPI schemas.

```typescript
class TypeGenerator {
  constructor(analyzer: SchemaAnalyzer);

  generate(spec: OpenApiDefinition): string;

  private generateType(name: string, schema: JsonSchema, isCircular: boolean): string;
  private generateTSDoc(name: string, schema: JsonSchema): string;
  private generateTypeDeclaration(name: string, schema: JsonSchema, isCircular: boolean): string;
  private generateObjectType(name: string, schema: JsonSchema, isCircular: boolean): string;
  private generateArrayType(name: string, schema: JsonSchema): string;
  private generateOneOfType(name: string, schema: JsonSchema): string;
  private generateAnyOfType(name: string, schema: JsonSchema): string;
  private generateAllOfType(name: string, schema: JsonSchema): string;
  private generateInlineType(schema: JsonSchema): string;
  private mapPrimitiveType(type: string): string;
  private generatePropertyDoc(name: string, schema: JsonSchema): string;
  private getRefName(ref: string): string;
}
```

**Usage Example:**

```typescript
import { TypeGenerator } from '@atakora/lib/synthesis/openapi';

const generator = new TypeGenerator();
const typeCode = await generator.generate('./api-spec.yaml', {
  output: './generated/types.ts',
  readonly: true,
  strictNullChecks: true,
  exportType: true,
  includeConstraints: true
});
```

### SchemaValidator

Validates data against OpenAPI schemas at runtime.

```typescript
class SchemaValidator {
  constructor(schema: JsonSchema);

  validate(data: unknown): ValidationResult;
  validateRequest(data: unknown): ValidationResult;
  validateResponse(data: unknown, statusCode: number): ValidationResult;

  private compileSchema(schema: JsonSchema): ValidatorFunction;
  private formatErrors(errors: ValidationError[]): string[];
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  path: string;
  message: string;
  value: unknown;
}
```

**Usage Example:**

```typescript
import { SchemaValidator } from '@atakora/lib/synthesis/openapi';

const validator = new SchemaValidator(schema);

// Validate request
const result = validator.validateRequest(requestData);
if (!result.valid) {
  throw new ValidationError(result.errors);
}

// Validate response
const result = validator.validateResponse(responseData, 200);
if (!result.valid) {
  console.error('Response validation failed', result.errors);
}
```

### SchemaAnalyzer

Analyzes OpenAPI schemas to determine generation order and detect circular references.

```typescript
class SchemaAnalyzer {
  private schemas: Map<string, JsonSchema>;
  private dependencies: Map<string, Set<string>>;

  analyze(spec: OpenApiDefinition): SchemaAnalysisResult;

  private extractSchemas(schemas?: Record<string, JsonSchema>): void;
  private analyzeDependencies(): void;
  private extractReferences(schema: JsonSchema): Set<string>;
  private getRefName(ref: string): string;
  private detectCircularReferences(): Set<string>;
  private topologicalSort(): string[];
}

interface SchemaAnalysisResult {
  schemas: Map<string, JsonSchema>;
  dependencies: Map<string, Set<string>>;
  circularRefs: Set<string>;
  generationOrder: string[];
}
```

### ReferenceResolver

Resolves $ref references in OpenAPI specifications.

```typescript
class ReferenceResolver {
  constructor(private readonly spec: OpenApiDefinition);

  resolve<T>(ref: string): T;
  resolveAll(schema: JsonSchema): JsonSchema;

  private resolveLocalRef(ref: string): any;
  private resolveExternalRef(ref: string): Promise<any>;
  private isLocalRef(ref: string): boolean;
  private isExternalRef(ref: string): boolean;
}
```

## Configuration

### Government Cloud Configuration

```typescript
export const GOVERNMENT_CLOUD_CONFIG = {
  // Disable remote reference resolution
  resolveRemote: false,
  // Validate schemas strictly
  strict: true,
  // Only allow local filesystem access
  allowedPaths: ['/approved/directory'],
  // Disable HTTP/HTTPS imports
  allowRemoteImport: false,
  // Enable security validation
  validateSecurity: true
};
```

**Usage:**

```typescript
import { GOVERNMENT_CLOUD_CONFIG } from '@atakora/lib/synthesis/openapi';

const importer = new OpenApiImporter('./spec.yaml', {
  ...GOVERNMENT_CLOUD_CONFIG
});
```

### Type Generator Options

```typescript
interface TypeGeneratorOptions {
  // Output file path
  output?: string;

  // Make all properties readonly
  readonly?: boolean;

  // Use strict null checking
  strictNullChecks?: boolean;

  // Export all types
  exportType?: boolean;

  // Include constraint documentation in JSDoc
  includeConstraints?: boolean;

  // Generate enums for x-ms-enum
  generateEnums?: boolean;

  // Prefix for generated types
  typePrefix?: string;

  // Suffix for generated types
  typeSuffix?: string;

  // Custom type mappings
  typeMappings?: Record<string, string>;
}
```

### Validation Options

```typescript
interface ValidationOptions {
  // Validate request body
  validateRequest?: boolean;

  // Validate response body
  validateResponse?: boolean;

  // Validate content type
  validateContentType?: boolean;

  // Maximum request size (bytes)
  maxRequestSize?: number;

  // Allowed content types
  allowedContentTypes?: string[];

  // Strict mode (fail on additional properties)
  strictMode?: boolean;

  // Custom error messages
  errorMessages?: Record<string, string>;
}
```

## Azure Extensions

### x-ms-enum

Enhanced enum support with descriptions and metadata.

```typescript
interface XMsEnum {
  name: string;
  modelAsString?: boolean;
  values?: Array<{
    value: string;
    description?: string;
    name?: string;
  }>;
}
```

**OpenAPI Example:**

```yaml
type: string
enum: [Standard_LRS, Standard_GRS, Premium_LRS]
x-ms-enum:
  name: SkuName
  modelAsString: false
  values:
    - value: Standard_LRS
      description: Locally redundant storage
    - value: Standard_GRS
      description: Geo-redundant storage
    - value: Premium_LRS
      description: Premium locally redundant storage
```

**Generated TypeScript:**

```typescript
export enum SkuName {
  /** Locally redundant storage */
  StandardLRS = 'Standard_LRS',

  /** Geo-redundant storage */
  StandardGRS = 'Standard_GRS',

  /** Premium locally redundant storage */
  PremiumLRS = 'Premium_LRS'
}
```

### x-ms-discriminator-value

Polymorphic type discrimination support.

```typescript
interface XMsDiscriminatorValue {
  propertyName: string;
  mapping?: Record<string, string>;
}
```

### x-ms-examples

Test data and examples for operations.

```typescript
interface XMsExamples {
  [exampleName: string]: {
    parameters?: Record<string, any>;
    responses?: Record<string, any>;
  };
}
```

## Performance Considerations

### Type Generation
- Small spec (50 paths): ~200ms
- Medium spec (200 paths): ~800ms
- Large spec (1000 paths): ~4s

**Recommendation**: Run type generation at build time, not runtime.

### Validation
- Simple schema: ~0.1ms per validation
- Complex schema: ~0.5ms per validation
- Large array (1000 items): ~50ms

**Recommendation**: Cache compiled validators for reuse.

### Reference Resolution
- Small spec (10 refs): ~50ms
- Medium spec (100 refs): ~300ms
- Large spec (500 refs): ~2s

**Recommendation**: Pre-bundle specs with external references.

## Security Considerations

1. **Reference Resolution**:
   - Disable remote HTTP/HTTPS resolution in production
   - Validate all file paths before access
   - Whitelist allowed directories

2. **Filesystem Access**:
   - Only allow access to approved directories
   - Validate paths to prevent directory traversal
   - Use absolute paths only

3. **ReDoS Protection**:
   - Use timeout limits in pattern matching
   - Validate regex patterns before compilation
   - Limit pattern complexity

4. **Schema Validation**:
   - Validate schemas at build time
   - Prevent injection attacks
   - Sanitize user input

5. **Size Limits**:
   - Enforce maximum request/response sizes
   - Limit schema complexity
   - Set parsing timeouts

## Dependencies

### Runtime Dependencies
- `ajv` (^8.12.0) - JSON Schema validation
- `ajv-formats` (^2.1.1) - Format validators for ajv

### Development Dependencies
- `openapi-typescript` (^6.7.0) - Type generation
- `openapi-types` (^12.1.3) - OpenAPI type definitions
- `@apidevtools/json-schema-ref-parser` (^11.0.0) - Reference resolution

## Testing

### Unit Tests

```typescript
describe('TypeGenerator', () => {
  it('should generate interface for object schema', async () => {
    const schema: JsonSchema = {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string' },
        age: { type: 'number' }
      }
    };

    const generator = new TypeGenerator();
    const result = await generator.generateType('User', schema);

    expect(result).toContain('export interface User');
    expect(result).toContain('readonly name: string');
    expect(result).toContain('readonly age?: number');
  });
});
```

### Integration Tests

```typescript
describe('OpenAPI Integration', () => {
  it('should import and export OpenAPI spec', async () => {
    const spec: OpenApiDefinition = {
      openapi: '3.1.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/users': {
          get: {
            operationId: 'listUsers',
            responses: {
              200: { description: 'Success' }
            }
          }
        }
      }
    };

    const importer = new OpenApiImporter(spec);
    const operations = await importer.import();

    const exporter = new OpenApiExporter(operations.operations, spec.info);
    const exported = exporter.export('3.1.0');

    expect(exported.paths['/users'].get).toBeDefined();
  });
});
```

## Best Practices

1. **Pre-bundle External References**: Bundle all external $refs at build time
2. **Cache Compiled Validators**: Reuse validators across requests
3. **Validate at Build Time**: Catch schema errors during development
4. **Use Strict Mode**: Enable strict validation in production
5. **Document Constraints**: Include all validation rules in schemas
6. **Version Your Specs**: Use semantic versioning for API specifications
7. **Test Generated Types**: Verify TypeScript compilation of generated code

## Related Documentation

- [OpenAPI Integration Guide](../guides/openapi-integration.md)
- [OpenAPI Type Generation Reference](./openapi-type-generation.md)
- [REST API Guide](../guides/rest-api.md)
- [ADR-014: REST API Architecture](../design/architecture/adr-014-rest-api-architecture.md)
