# ARM Schema Code Generation

This directory contains tools for generating TypeScript types and L1 constructs from Azure ARM schemas.

## Overview

The codegen tools automate the creation of:

- **TypeScript type definitions** from ARM JSON schemas
- **L1 construct implementations** (low-level ARM resource wrappers)
- **Validation logic** based on schema constraints
- **Continuous schema synchronization** to keep types up-to-date

## Tools

### 1. Type Generator (`cli.ts`)

Generates TypeScript interfaces from ARM schema files.

```bash
# Generate types from a schema
npm run codegen:types <schema-path> [output-path]

# Example
npm run codegen:types ../azure-resource-manager-schemas-main/schemas/2024-07-01/Microsoft.Storage.json
```

**Output**: TypeScript interfaces in `packages/lib/src/generated/types/`

### 2. Resource Factory (`resource-factory.ts`)

Generates complete L1 construct implementations from ARM schemas.

```bash
# List resources in a schema
npm run codegen:resource <schema-path>

# Generate a specific resource
npm run codegen:resource <schema-path> <resource-index> [output-dir]

# Example
npm run codegen:resource ../azure-resource-manager-schemas-main/schemas/2024-07-01/Microsoft.Storage.json 0
```

**Output**: L1 construct class in `packages/lib/src/resources/<resource-name>/`

**Features**:

- Auto-generates constructor parameter mapping
- Creates property assignments with proper types
- Generates ARM resource type and apiVersion constants
- Includes validation logic based on schema constraints
- Creates `toArmTemplate()` method for synthesis

### 3. Validation Generator (`validation-generator.ts`)

Generates runtime validation functions from schemas.

```bash
npm run codegen:validate <schema-path> [output-path]
```

**Output**: Validation functions in `packages/lib/src/generated/validation/`

### 4. Schema Sync Pipeline (`schema-sync.ts`)

Automated pipeline for continuous schema updates.

```bash
# Run schema sync manually
npm run codegen:sync [schemas-dir] [pattern...]

# Examples
npm run codegen:sync ../azure-resource-manager-schemas-main/schemas
npm run codegen:sync ../azure-resource-manager-schemas-main/schemas Microsoft.Storage Microsoft.Network
```

**What it does**:

1. Scans for ARM schema files
2. Generates TypeScript types for each schema
3. Generates validation code
4. Creates a summary report

**Automated execution**: The schema sync runs daily via GitHub Actions (`.github/workflows/schema-sync.yml`)

## Continuous Schema Sync

The schema sync pipeline runs automatically:

- **Daily at 2 AM UTC** - Checks for schema updates
- **Manual trigger** - Can be run on-demand from GitHub Actions
- **On codegen changes** - Runs when codegen tools are modified

### Workflow

1. Clone latest Azure ARM schemas
2. Build codegen tools
3. Run schema sync
4. Run tests on generated code
5. Create Pull Request if changes detected

### Pull Request Contents

- Updated TypeScript types
- Updated validation code
- Test results
- Auto-generated documentation

## Directory Structure

```
codegen/
├── README.md                      # This file
├── types.ts                       # Type definitions for IR
├── schema-parser.ts              # ARM schema parser
├── type-generator.ts             # TypeScript type generator
├── validation-generator.ts       # Validation code generator
├── resource-factory.ts           # L1 construct generator
├── schema-sync.ts               # Schema sync pipeline
├── cli.ts                        # Type generation CLI
├── cli-generate-resource.ts     # Resource generation CLI
└── cli-validate.ts              # Validation generation CLI
```

## Generated Code Structure

```
generated/
├── types/
│   ├── Microsoft.Storage.ts
│   ├── Microsoft.Network.NRP.ts
│   └── ...
└── validation/
    ├── Microsoft.Storage.validators.ts
    ├── Microsoft.Network.NRP.validators.ts
    └── ...
```

## Development Workflow

### Adding Support for a New Resource

1. **Find the schema**:

   ```bash
   npm run codegen:resource ../azure-resource-manager-schemas-main/schemas/2024-07-01/Microsoft.Compute.json
   ```

2. **Generate the L1 construct**:

   ```bash
   npm run codegen:resource ../azure-resource-manager-schemas-main/schemas/2024-07-01/Microsoft.Compute.json 0
   ```

3. **Create types file**: Manually create `types.ts` with enums and complex types

4. **Create L2 construct**: Build the high-level, intent-based construct

5. **Add tests**: Create comprehensive test coverage

6. **Update exports**: Add to `index.ts`

### Updating Schemas

Schemas are automatically updated daily. For manual updates:

1. **Clone latest schemas**:

   ```bash
   git clone https://github.com/Azure/azure-resource-manager-schemas.git ../azure-resource-manager-schemas-main
   ```

2. **Run schema sync**:

   ```bash
   npm run codegen:sync
   ```

3. **Review changes**:

   ```bash
   git diff packages/lib/src/generated/
   ```

4. **Run tests**:
   ```bash
   npm test
   ```

## Schema Parser

The schema parser (`schema-parser.ts`) converts ARM JSON schemas into an intermediate representation (IR):

```typescript
interface SchemaIR {
  provider: string; // e.g., "Microsoft.Storage"
  apiVersion: string; // e.g., "2023-01-01"
  resources: ResourceDefinition[];
  definitions: Map<string, TypeDefinition>;
  metadata: SchemaMetadata;
}
```

### Supported Schema Features

- ✅ Resource definitions
- ✅ Property types (primitives, objects, arrays)
- ✅ References (`$ref`)
- ✅ Union types (`oneOf`)
- ✅ Enums
- ✅ Constraints (min/max length, pattern, ranges)
- ✅ Required properties
- ✅ Nested objects
- ✅ Additional properties (Record types)

## Type Generator

Generates clean TypeScript interfaces:

```typescript
/**
 * Properties for Microsoft.Storage/storageAccounts (L1 construct).
 *
 * **ARM Resource Type**: `Microsoft.Storage/storageAccounts`
 * **API Version**: `2023-01-01`
 */
export interface ArmStorageAccountProps {
  /**
   * Storage account name
   *
   * @remarks
   * Length: 3-24 characters
   * Pattern: `^[a-z0-9]+$`
   */
  readonly name: string;

  // ... more properties
}
```

## Resource Factory

Generates complete L1 construct implementations:

```typescript
export class ArmStorageAccount extends Resource {
  public readonly resourceType = 'Microsoft.Storage/storageAccounts';
  public readonly apiVersion = '2023-01-01';

  constructor(scope: Construct, id: string, props: ArmStorageAccountProps) {
    super(scope, id);
    this.validateProps(props);
    // ... property assignments
  }

  private validateProps(props: ArmStorageAccountProps): void {
    // ... validation logic from schema
  }

  public toArmTemplate(): object {
    // ... ARM template generation
  }
}
```

## Validation Generator

Generates runtime validation using Ajv:

```typescript
import Ajv from 'ajv';

export const storageAccountSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      minLength: 3,
      maxLength: 24,
      pattern: '^[a-z0-9]+$',
    },
    // ... more properties
  },
  required: ['name', 'location', 'sku'],
};

export function validateStorageAccount(data: unknown): boolean {
  const ajv = new Ajv();
  const validate = ajv.compile(storageAccountSchema);
  return validate(data);
}
```

## Troubleshooting

### Schema parsing fails

- Verify schema file exists and is valid JSON
- Check schema follows ARM schema format
- Look for unsupported schema features

### Generated code has errors

- Ensure TypeScript is up to date
- Check for missing type imports
- Verify schema constraints are valid

### Sync pipeline fails

- Check Azure schemas repository is accessible
- Verify GitHub Actions has proper permissions
- Review error logs in workflow run

## Future Enhancements

- [ ] Support for ARM template expressions
- [ ] Generate L2 constructs automatically
- [ ] Schema diff detection (only regenerate changed resources)
- [ ] Support for custom schema extensions
- [ ] Integration with ARM template validation
- [ ] Generate OpenAPI specs from schemas

## Related Documentation

- [ARM Schema Repository](https://github.com/Azure/azure-resource-manager-schemas)
- [ARM Template Reference](https://learn.microsoft.com/en-us/azure/templates/)
- [JSON Schema](https://json-schema.org/)

---

**Maintained by**: Felix (Schema & Validation Engineer)
**Last updated**: 2025-10-04
