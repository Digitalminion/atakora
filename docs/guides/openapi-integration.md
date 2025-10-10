# OpenAPI Integration

Learn how to work with OpenAPI specifications in Atakora for type generation, validation, and API documentation.

## Overview

Atakora provides comprehensive OpenAPI integration that enables you to:

- Import existing OpenAPI 3.0/3.1 specifications
- Export REST operations to OpenAPI format
- Generate TypeScript types from schemas
- Validate requests and responses at runtime
- Support Azure-specific extensions (x-ms-*)

## Importing OpenAPI Specifications

### From a File

```typescript
import { OpenApiImporter } from '@atakora/lib/synthesis/openapi';

// From YAML file
const importer = new OpenApiImporter('./api-spec.yaml');
const operations = await importer.import();

// From JSON file
const importer = new OpenApiImporter('./api-spec.json');
const operations = await importer.import();
```

### From a URL

```typescript
// Note: Remote URLs are disabled in Government Cloud
const importer = new OpenApiImporter('https://api.example.com/openapi.json');
const operations = await importer.import();
```

### From an Object

```typescript
const spec: OpenApiDefinition = {
  openapi: '3.1.0',
  info: {
    title: 'My API',
    version: '1.0.0'
  },
  paths: {
    // ... your paths
  }
};

const importer = new OpenApiImporter(spec);
const operations = await importer.import();
```

## Generating TypeScript Types

Generate type-safe TypeScript interfaces from OpenAPI schemas:

```typescript
import { TypeGenerator } from '@atakora/lib/synthesis/openapi';

const generator = new TypeGenerator();
const typeCode = await generator.generate('./api-spec.yaml', {
  output: './generated/types.ts',
  readonly: true,              // Make all properties readonly
  strictNullChecks: true,      // Use strict null checking
  exportType: true,            // Export all types
  includeConstraints: true     // Document constraints in JSDoc
});
```

### Generated Type Examples

#### Basic Object Type

OpenAPI Schema:
```yaml
type: object
required: [id, name]
properties:
  id:
    type: string
    format: uuid
  name:
    type: string
    minLength: 1
    maxLength: 100
  email:
    type: string
    format: email
```

Generated TypeScript:
```typescript
/**
 * User object.
 *
 * Constraints:
 * - name: 1-100 characters
 * - email: Must be valid email format
 */
export interface User {
  /** User ID (UUID format) */
  readonly id: string;

  /**
   * User name.
   *
   * Constraints:
   * - Length: 1-100 characters
   */
  readonly name: string;

  /**
   * User email address.
   *
   * Constraints:
   * - Format: email
   */
  readonly email?: string;
}
```

#### Discriminated Union

OpenAPI Schema:
```yaml
oneOf:
  - type: object
    required: [type, message]
    properties:
      type:
        const: success
      message:
        type: string
      data:
        type: object
  - type: object
    required: [type, error]
    properties:
      type:
        const: error
      error:
        type: string
      code:
        type: string
discriminator:
  propertyName: type
```

Generated TypeScript:
```typescript
type SuccessResponse = {
  readonly type: 'success';
  readonly message: string;
  readonly data?: Record<string, unknown>;
};

type ErrorResponse = {
  readonly type: 'error';
  readonly error: string;
  readonly code?: string;
};

type ApiResponse = SuccessResponse | ErrorResponse;

// Usage with type narrowing
function handleResponse(response: ApiResponse) {
  if (response.type === 'success') {
    // TypeScript knows this is SuccessResponse
    console.log(response.message);
  } else {
    // TypeScript knows this is ErrorResponse
    console.error(response.error);
  }
}
```

#### Generic Paginated Response

```typescript
export interface PaginatedResponse<T> {
  readonly data: readonly T[];
  readonly metadata: {
    readonly totalCount?: number;
    readonly hasNextPage: boolean;
    readonly hasPreviousPage: boolean;
    readonly pageSize: number;
    readonly currentPage: number;
  };
}

// Usage
type UserListResponse = PaginatedResponse<User>;
type ProductListResponse = PaginatedResponse<Product>;
```

## Runtime Validation

Validate requests and responses against OpenAPI schemas:

### Request Validation

```typescript
import { SchemaValidator } from '@atakora/lib/synthesis/openapi';

const validator = new SchemaValidator(schema);

// Validate request
const result = validator.validateRequest(requestData);
if (!result.valid) {
  throw new ValidationError(result.errors);
}
```

### Response Validation

```typescript
import { validateResponse } from '@atakora/lib/synthesis/openapi';

const result = validator.validateResponse(responseData, 200);
if (!result.valid) {
  console.error('Response validation failed', result.errors);
}
```

### Validation Example

```typescript
import { validateRequest } from '@atakora/lib/synthesis/openapi';

const operation: IRestOperation = {
  method: 'POST',
  path: '/users',
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['name', 'email'],
          properties: {
            name: { type: 'string', minLength: 1 },
            email: { type: 'string', format: 'email' }
          }
        }
      }
    }
  }
};

const requestData = {
  name: '',  // Invalid: too short
  email: 'not-an-email'  // Invalid: wrong format
};

const result = validateRequest(operation, requestData);

if (!result.valid) {
  console.error('Validation errors:', result.errors);
  // [
  //   { path: '/name', message: 'String is too short', value: '' },
  //   { path: '/email', message: 'Invalid email format', value: 'not-an-email' }
  // ]
}
```

## Exporting to OpenAPI

Export your REST operations to OpenAPI format:

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

## Azure Extensions Support

### x-ms-enum

Define enhanced enums with descriptions:

OpenAPI:
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

Generated TypeScript:
```typescript
/**
 * SKU name for storage account.
 *
 * Values:
 * - Standard_LRS: Locally redundant storage
 * - Standard_GRS: Geo-redundant storage
 * - Premium_LRS: Premium locally redundant storage
 */
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

Support polymorphic types with proper discrimination:

```typescript
type Account = StorageAccount | BlobStorageAccount;

function processAccount(account: Account) {
  switch (account.kind) {
    case 'Storage':
      // TypeScript knows account is StorageAccount
      break;
    case 'BlobStorage':
      // TypeScript knows account is BlobStorageAccount
      break;
  }
}
```

## CLI Commands

### Generate Types from OpenAPI

```bash
# Generate types from OpenAPI spec
npx atakora openapi generate-types \
  --input ./openapi.yaml \
  --output ./src/generated/api-types.ts \
  --readonly \
  --strict

# Validate OpenAPI spec
npx atakora openapi validate ./openapi.yaml

# Bundle multi-file OpenAPI spec
npx atakora openapi bundle \
  --input ./openapi.yaml \
  --output ./dist/openapi-bundled.json

# Convert operations to OpenAPI
npx atakora openapi export \
  --input ./src/operations \
  --output ./openapi.yaml \
  --version 3.1.0
```

## Configuration Options

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

## Government Cloud Configuration

Configure OpenAPI tools for Azure Government Cloud:

```typescript
import { GOVERNMENT_CLOUD_CONFIG } from '@atakora/lib/synthesis/openapi';

const importer = new OpenApiImporter('./spec.yaml', {
  ...GOVERNMENT_CLOUD_CONFIG,
  // Disable remote reference resolution
  resolveRemote: false,
  // Validate schemas strictly
  strict: true,
  // Only allow local filesystem access
  allowedPaths: ['/approved/directory']
});
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

1. **Reference Resolution**: Disable remote HTTP/HTTPS resolution in production
2. **Filesystem Access**: Validate and whitelist all file paths
3. **ReDoS Protection**: Use timeout limits in pattern matching
4. **Schema Validation**: Validate schemas at build time to prevent injection
5. **Size Limits**: Enforce maximum request/response sizes

## Best Practices

1. **Version Your Specs**: Use semantic versioning for OpenAPI specifications
2. **Document Constraints**: Include all validation rules in schema definitions
3. **Use $ref for Reuse**: Reference common schemas to reduce duplication
4. **Validate Early**: Run validation at build time to catch errors early
5. **Cache Validators**: Reuse compiled validators for better performance
6. **Bundle External Refs**: Pre-bundle specifications with external references

## Next Steps

- Learn about [REST API patterns](./rest-api.md)
- Explore [TypeScript type generation design](../reference/openapi-type-generation.md)
- Review [OpenAPI library evaluation](../design/architecture/openapi-library-evaluation.md)

## Related Documentation

- [REST API Guide](./rest-api.md)
- [ADR-014: REST API Architecture](../design/architecture/adr-014-rest-api-architecture.md)
- [OpenAPI Type Generation Reference](../reference/openapi-type-generation.md)
- [OpenAPI 3.1 Specification](https://spec.openapis.org/oas/v3.1.0)
