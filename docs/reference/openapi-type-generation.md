# OpenAPI Type Generation Reference

Technical reference for TypeScript type generation from OpenAPI schemas in Atakora.

## Overview

This document describes the type generation strategy for creating TypeScript types from OpenAPI schemas. The implementation focuses on type safety, developer experience, completeness, performance, and maintainability.

## Type Generation Goals

1. **Type Safety**: Generate types that catch errors at compile time
2. **Developer Experience**: Provide excellent IntelliSense and autocomplete
3. **Completeness**: Capture all schema constraints in TypeScript types
4. **Performance**: Fast type generation with reasonable compilation times
5. **Maintainability**: Generated code should be readable and debuggable

## Schema to Interface Conversion

### Basic Types

**String Type with Constraints:**

OpenAPI Schema:
```json
{
  "type": "string",
  "minLength": 3,
  "maxLength": 24,
  "pattern": "^[a-z0-9]+$"
}
```

Generated TypeScript:
```typescript
/**
 * Constraints:
 * - Length: 3-24 characters
 * - Pattern: ^[a-z0-9]+$
 */
type StorageAccountName = string;
```

**Design Note**: While TypeScript cannot enforce minLength/maxLength/pattern at compile time, constraints are documented in JSDoc for:
1. Developer awareness via IntelliSense
2. Runtime validation generation
3. Code review visibility

### Object Types

OpenAPI Schema:
```json
{
  "type": "object",
  "required": ["name", "sku"],
  "properties": {
    "name": { "type": "string" },
    "sku": { "type": "string" },
    "location": { "type": "string" }
  }
}
```

Generated TypeScript:
```typescript
export interface StorageAccount {
  readonly name: string;
  readonly sku: string;
  readonly location?: string;
}
```

**Design Decisions**:
- All properties are `readonly` for immutability
- Required properties have no `?` modifier
- Optional properties use `?:` syntax

### Array Types

OpenAPI Schema:
```json
{
  "type": "array",
  "items": { "$ref": "#/components/schemas/User" },
  "minItems": 1,
  "maxItems": 100,
  "uniqueItems": true
}
```

Generated TypeScript:
```typescript
/**
 * Array of users.
 *
 * Constraints:
 * - Minimum items: 1
 * - Maximum items: 100
 * - Items must be unique
 */
type UserList = readonly User[];
```

### Enum Types

OpenAPI Schema:
```json
{
  "type": "string",
  "enum": ["Standard_LRS", "Standard_GRS", "Premium_LRS"]
}
```

Generated TypeScript (Union Type - Default):
```typescript
type SkuName = 'Standard_LRS' | 'Standard_GRS' | 'Premium_LRS';
```

Generated TypeScript (Enum - with x-ms-enum):
```typescript
export enum SkuName {
  StandardLRS = 'Standard_LRS',
  StandardGRS = 'Standard_GRS',
  PremiumLRS = 'Premium_LRS'
}
```

**Preference**: Union types by default for better type narrowing, enums only when OpenAPI spec has `x-ms-enum` extension.

## Advanced Type Patterns

### oneOf - Discriminated Unions

OpenAPI Schema:
```json
{
  "oneOf": [
    {
      "type": "object",
      "required": ["type", "path"],
      "properties": {
        "type": { "const": "file" },
        "path": { "type": "string" }
      }
    },
    {
      "type": "object",
      "required": ["type", "url"],
      "properties": {
        "type": { "const": "url" },
        "url": { "type": "string" }
      }
    }
  ],
  "discriminator": {
    "propertyName": "type"
  }
}
```

Generated TypeScript:
```typescript
type FileSource = {
  readonly type: 'file';
  readonly path: string;
};

type UrlSource = {
  readonly type: 'url';
  readonly url: string;
};

type Source = FileSource | UrlSource;

// TypeScript can narrow based on discriminator
function processSource(source: Source) {
  if (source.type === 'file') {
    // TypeScript knows source is FileSource
    console.log(source.path);
  } else {
    // TypeScript knows source is UrlSource
    console.log(source.url);
  }
}
```

### anyOf - Union Types

OpenAPI Schema:
```json
{
  "anyOf": [
    { "type": "string" },
    { "type": "number" },
    { "$ref": "#/components/schemas/CustomValue" }
  ]
}
```

Generated TypeScript:
```typescript
type FlexibleValue = string | number | CustomValue;
```

### allOf - Type Intersection

OpenAPI Schema:
```json
{
  "allOf": [
    { "$ref": "#/components/schemas/BaseResource" },
    { "$ref": "#/components/schemas/Taggable" },
    {
      "type": "object",
      "properties": {
        "specificProp": { "type": "string" }
      }
    }
  ]
}
```

Generated TypeScript:
```typescript
export interface Resource extends BaseResource, Taggable {
  readonly specificProp?: string;
}
```

### Nullable Types

OpenAPI 3.0 Schema:
```json
{
  "type": "string",
  "nullable": true
}
```

OpenAPI 3.1 Schema (Preferred):
```json
{
  "type": ["string", "null"]
}
```

Generated TypeScript (Both Cases):
```typescript
type NullableString = string | null;
```

## Reference Resolution

### Local References

OpenAPI Schema:
```json
{
  "properties": {
    "user": { "$ref": "#/components/schemas/User" }
  }
}
```

Generated TypeScript:
```typescript
export interface Response {
  readonly user?: User;  // Reference resolved to User interface
}
```

### Circular References

OpenAPI Schema:
```json
{
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "children": {
      "type": "array",
      "items": { "$ref": "#/components/schemas/TreeNode" }
    }
  }
}
```

Generated TypeScript:
```typescript
export interface TreeNode {
  readonly name?: string;
  readonly children?: readonly TreeNode[];  // Circular reference supported
}
```

### External References

OpenAPI Schema:
```json
{
  "$ref": "./common.yaml#/components/schemas/Address"
}
```

**Strategy**: Pre-bundle external refs at build time

Generated TypeScript:
```typescript
export interface Address {
  // Definition from external file, inlined
}
```

## Generic Type Parameters

### Paginated Response Pattern

```typescript
// Generic paginated response
export interface PaginatedResponse<T> {
  readonly data: readonly T[];
  readonly metadata: {
    readonly totalCount?: number;
    readonly hasNextPage: boolean;
    readonly hasPreviousPage: boolean;
    readonly pageSize: number;
  };
}

// Usage
type UserListResponse = PaginatedResponse<User>;
type ProductListResponse = PaginatedResponse<Product>;
```

### Error Response Pattern

```typescript
// Generic error response with RFC 7807 Problem Details
export interface ProblemDetails<T extends Record<string, unknown> = Record<string, unknown>> {
  readonly type?: string;
  readonly title: string;
  readonly status: number;
  readonly detail?: string;
  readonly instance?: string;
  readonly [key: string]: unknown;  // Extension properties
}

// Usage with typed extensions
interface ValidationProblemDetails extends ProblemDetails {
  readonly errors: readonly ValidationError[];
}
```

## Constraint Documentation

### TSDoc Generation

```typescript
/**
 * Storage account properties.
 *
 * @remarks
 * This interface represents an Azure Storage Account with all required
 * and optional configuration properties.
 *
 * API Version: 2023-01-01
 *
 * @example
 * ```typescript
 * const account: StorageAccountProps = {
 *   accountName: 'mystorageaccount',
 *   sku: { name: 'Standard_LRS' },
 *   location: 'eastus'
 * };
 * ```
 */
export interface StorageAccountProps {
  /**
   * Storage account name.
   *
   * @remarks
   * The account name must be globally unique across all Azure storage accounts.
   * It can only contain lowercase letters and numbers.
   *
   * Constraints:
   * - Length: 3-24 characters
   * - Pattern: ^[a-z0-9]+$
   * - Must be globally unique
   *
   * @example 'mystorageaccount123'
   */
  readonly accountName: string;

  /**
   * SKU configuration for the storage account.
   *
   * @remarks
   * Determines the replication strategy and performance tier.
   */
  readonly sku: StorageAccountSku;

  /**
   * Azure region location.
   *
   * Constraints:
   * - Must be a valid Azure region
   *
   * @example 'eastus'
   */
  readonly location: string;
}
```

### Constraint Extraction

```typescript
// Constraint metadata interface
export interface SchemaConstraints {
  // String constraints
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;

  // Number constraints
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: boolean;
  exclusiveMaximum?: boolean;
  multipleOf?: number;

  // Array constraints
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;

  // Object constraints
  minProperties?: number;
  maxProperties?: number;
  required?: readonly string[];

  // Additional metadata
  description?: string;
  example?: unknown;
  deprecated?: boolean;
}

// Extract constraints from schema for runtime validation
export function extractConstraints(schema: JsonSchema): SchemaConstraints {
  return {
    minLength: schema.minLength,
    maxLength: schema.maxLength,
    pattern: schema.pattern,
    format: schema.format,
    minimum: schema.minimum,
    maximum: schema.maximum,
    exclusiveMinimum: schema.exclusiveMinimum,
    exclusiveMaximum: schema.exclusiveMaximum,
    multipleOf: schema.multipleOf,
    minItems: schema.minItems,
    maxItems: schema.maxItems,
    uniqueItems: schema.uniqueItems,
    minProperties: schema.minProperties,
    maxProperties: schema.maxProperties,
    required: schema.required,
    description: schema.description,
    example: schema.example,
    deprecated: schema.deprecated
  };
}
```

## Type Generation Architecture

### Phase 1: Schema Analysis

The `SchemaAnalyzer` class handles schema extraction and dependency analysis:

1. **Extract Schemas**: Collect all schemas from components
2. **Analyze Dependencies**: Build dependency graph from $ref relationships
3. **Detect Circular References**: Identify self-referencing schemas
4. **Determine Order**: Topological sort for generation order

### Phase 2: Type Generation

The `TypeGenerator` class converts schemas to TypeScript:

1. **Generate Header**: Add file header and linting directives
2. **Process in Order**: Generate types following dependency order
3. **Handle Circularity**: Use interfaces for circular references
4. **Add Documentation**: Generate TSDoc from schema metadata

## Type Mapping

### Primitive Type Mapping

| OpenAPI Type | TypeScript Type |
|--------------|-----------------|
| string       | string          |
| number       | number          |
| integer      | number          |
| boolean      | boolean         |
| null         | null            |
| array        | readonly T[]    |
| object       | interface/type  |

### Format Mapping

| OpenAPI Format | TypeScript Type | Notes |
|----------------|-----------------|-------|
| date           | string          | ISO 8601 date |
| date-time      | string          | ISO 8601 datetime |
| uuid           | string          | UUID format |
| email          | string          | Email format |
| uri            | string          | URI format |
| binary         | Blob            | Binary data |
| int32          | number          | 32-bit integer |
| int64          | number          | 64-bit integer |
| float          | number          | Float |
| double         | number          | Double |

## CLI Integration

```typescript
// packages/cli/src/commands/generate-types.ts
export async function generateTypes(options: GenerateTypesOptions): Promise<void> {
  const { input, output } = options;

  // 1. Load OpenAPI spec
  const spec = await loadOpenApiSpec(input);

  // 2. Analyze schema
  const analyzer = new SchemaAnalyzer();
  const analysis = analyzer.analyze(spec);

  // 3. Generate types
  const generator = new TypeGenerator(analyzer);
  const typeCode = generator.generate(spec);

  // 4. Write to file
  await fs.writeFile(output, typeCode, 'utf-8');

  console.log(`✓ Generated types: ${output}`);
}

// Usage
// npx atakora generate types --input openapi.yaml --output types.ts
```

## Testing Strategy

Type generation is tested at multiple levels:

1. **Unit Tests**: Individual schema conversion
2. **Integration Tests**: Full OpenAPI spec processing
3. **Snapshot Tests**: Generated code validation
4. **Type Tests**: TypeScript compilation validation

Example test:
```typescript
describe('TypeGenerator', () => {
  it('should generate interface for object schema', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' }
      },
      required: ['name']
    };

    const result = generator.generateType('User', schema, false);

    expect(result).toContain('export interface User');
    expect(result).toContain('readonly name: string');
    expect(result).toContain('readonly age?: number');
  });

  it('should handle circular references', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        children: {
          type: 'array',
          items: { $ref: '#/components/schemas/TreeNode' }
        }
      }
    };

    const result = generator.generateType('TreeNode', schema, true);

    expect(result).toContain('export interface TreeNode');
    expect(result).toContain('readonly children?: readonly TreeNode[]');
  });
});
```

## Performance Benchmarks

### Type Generation Performance
- Small spec (50 schemas): ~200ms
- Medium spec (200 schemas): ~800ms
- Large spec (1000 schemas): ~4s

### Validation Performance
- Simple schema: ~0.1ms per validation
- Complex schema: ~0.5ms per validation
- Large array (1000 items): ~50ms

### Reference Resolution Performance
- Small spec (10 refs): ~50ms
- Medium spec (100 refs): ~300ms
- Large spec (500 refs): ~2s

## Best Practices

1. **Run at Build Time**: Type generation should be a build step, not runtime
2. **Cache Validators**: Reuse compiled validators for better performance
3. **Bundle External Refs**: Pre-bundle specs with external references
4. **Version Generated Code**: Track generated types in version control
5. **Document Custom Types**: Add JSDoc to generated interfaces
6. **Validate Schemas**: Validate OpenAPI schemas before generation

## Related Documentation

- [OpenAPI Integration Guide](../guides/openapi-integration.md)
- [REST API Guide](../guides/rest-api.md)
- [ADR-014: REST API Architecture](../design/architecture/adr-014-rest-api-architecture.md)
- [OpenAPI Library Evaluation](../design/architecture/openapi-library-evaluation.md)
