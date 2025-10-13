# CRUD Function Templates

This directory contains TypeScript source code for CRUD Azure Functions that are compiled and converted into template strings at build time.

## Architecture

Instead of writing function code as string templates (which lack IDE support, type checking, and debugging), we:

1. **Write real TypeScript** in `crud-*/index.ts` files with full IDE support
2. **Use replacement tokens** like `ATAKORA_ENTITY_NAME` for dynamic values
3. **Compile to JavaScript** using the TypeScript compiler
4. **Generate template functions** that return the compiled code as strings with token replacement

## Directory Structure

```
scripts/
├── build-templates.js       # Build script that compiles templates
├── tsconfig.json            # TypeScript configuration for templates
├── crud-create/             # CREATE operation template
│   ├── package.json
│   └── index.ts
├── crud-read/               # READ operation template
│   ├── package.json
│   └── index.ts
├── crud-update/             # UPDATE operation template
│   ├── package.json
│   └── index.ts
├── crud-delete/             # DELETE operation template
│   ├── package.json
│   └── index.ts
└── crud-list/               # LIST operation template
    ├── package.json
    └── index.ts
```

## Replacement Tokens

Use these tokens in your TypeScript code. They will be replaced at runtime when generating functions:

- `ATAKORA_ENTITY_NAME` - Entity name (e.g., "User", "Product")
- `ATAKORA_ENTITY_NAME_LOWER` - Entity name lowercase (e.g., "user", "product")
- `ATAKORA_ENTITY_NAME_PLURAL` - Entity plural (e.g., "Users", "Products")
- `ATAKORA_ENTITY_NAME_PLURAL_LOWER` - Entity plural lowercase (e.g., "users", "products")
- `ATAKORA_DATABASE_NAME` - Cosmos DB database name
- `ATAKORA_CONTAINER_NAME` - Cosmos DB container name
- `ATAKORA_PARTITION_KEY` - Partition key field name (without leading slash)
- `ATAKORA_SCHEMA_JSON` - JSON string of schema definition

## How It Works

### 1. Writing Templates

Edit the TypeScript files in `crud-*/index.ts`:

```typescript
// @ts-nocheck
import { CosmosClient } from '@azure/cosmos';
import { app } from '@azure/functions';

const database = cosmosClient.database('ATAKORA_DATABASE_NAME');
const container = database.container('ATAKORA_CONTAINER_NAME');

app.http('create-ATAKORA_ENTITY_NAME_LOWER', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    // Your function logic here
    // Use ATAKORA_* tokens where dynamic values are needed
  }
});
```

**Note**: Use `// @ts-nocheck` at the top to disable type checking for replacement tokens.

### 2. Building Templates

Run the build script:

```bash
npm run templates
```

Or build as part of the regular build process (runs automatically):

```bash
npm run build  # Runs prebuild hook which generates templates
```

### 3. Generated Output

The build script generates TypeScript files in `src/crud/functions/`:

```typescript
// src/crud/functions/crud-create.ts
export function generatecreate(config: GeneratecreateConfig): string {
  let code = `...compiled JavaScript code...`;

  code = code.replace(/ATAKORA_ENTITY_NAME/g, config.entity_name);
  code = code.replace(/ATAKORA_DATABASE_NAME/g, config.database_name);
  // ... more replacements

  return code;
}
```

### 4. Using Generated Templates

Import and use the generated functions:

```typescript
import { generatecreate } from './functions';

const code = generatecreate({
  entity_name: 'User',
  entity_name_lower: 'user',
  database_name: 'users-db',
  container_name: 'users',
  partition_key: 'id',
  schemaJson: JSON.stringify(schema),
});

// code now contains ready-to-deploy JavaScript
```

## Benefits

### ✅ Full IDE Support
- IntelliSense and autocomplete
- Error highlighting
- Go-to-definition
- Refactoring tools

### ✅ Type Safety
- Catch errors at compile time
- Type checking for Azure Functions SDK
- No runtime surprises

### ✅ Debuggable
- Set breakpoints in TypeScript
- Step through code logic
- Test functions before templating

### ✅ Production Ready
- Compiled and minified JavaScript
- No runtime compilation overhead
- Pre-validated code structure

### ✅ Maintainable
- Clear separation of concerns
- Easy to update function logic
- Consistent patterns across operations

## Development Workflow

1. **Edit Template**: Modify `crud-*/index.ts` files
2. **Test Locally**: Optionally test the function in isolation
3. **Build Templates**: Run `npm run templates`
4. **Build Package**: Run `npm run build`
5. **Deploy**: Generated code is ready for ARM template deployment

## Adding New Templates

To add a new template:

1. Create a new directory: `scripts/crud-{operation}/`
2. Add `package.json` with dependencies
3. Create `index.ts` with your TypeScript code
4. Use `ATAKORA_*` tokens for dynamic values
5. Update `build-templates.js` to include the new template
6. Run `npm run templates` to generate the template function

## Troubleshooting

### TypeScript Errors

If you get TypeScript errors when building templates:

- Make sure `// @ts-nocheck` is at the top of the file
- Verify all imports are correct
- Check that replacement tokens are used correctly

### Missing Generated Files

If generated files are missing in `src/crud/functions/`:

- Run `npm run templates` manually
- Check for errors in the build script output
- Verify all template directories are listed in `build-templates.js`

### Token Replacement Not Working

If tokens aren't being replaced correctly:

- Ensure token names match exactly (case-sensitive)
- Check that the config object has the correct properties
- Verify the template uses the exact token format: `ATAKORA_*`
