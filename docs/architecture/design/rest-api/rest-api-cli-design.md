# REST API CLI Command Design

> **Note**: This design document was previously located in `packages/lib/src/synthesis/rest/CLI-DESIGN.md`.

## Overview

This document defines the CLI command structure and user experience for REST API operations in Atakora. The CLI provides intuitive commands for creating, managing, and exporting REST APIs built with RestApiStack.

## Design Principles

1. **Consistency**: Follow existing Atakora CLI patterns (init, synth, deploy, diff)
2. **Discoverability**: Commands should be self-documenting with clear help text
3. **Progressive Enhancement**: Simple commands for common tasks, flags for advanced scenarios
4. **Integration**: Seamlessly integrate with synthesis and deployment workflows
5. **Developer Experience**: Clear error messages, helpful suggestions, visual feedback

## Command Structure

```
atakora api <command> [options]
```

### Subcommands
- `create` - Create new REST API in project
- `add-operation` - Add operation to existing API
- `export` - Export OpenAPI specification
- `validate` - Validate API definition
- `import` - Import OpenAPI spec

## Command Specifications

### 1. atakora api create

Creates a new REST API construct in the project.

**Usage**:
```bash
atakora api create [options]
```

**Options**:
```
-n, --name <name>           API name (required)
-p, --path <path>           API base path (default: /api/v1)
-t, --type <type>           API type: rest|graphql|soap (default: rest)
-s, --stack <stack>         Target stack file (default: current)
-o, --openapi <file>        Import from OpenAPI spec file
--service-url <url>         Backend service URL
--interactive               Interactive mode with prompts
```

**Examples**:
```bash
# Create REST API with interactive prompts
atakora api create --name UserAPI --interactive

# Create REST API from OpenAPI spec
atakora api create --name PetStore --openapi ./petstore.yaml

# Create REST API with explicit configuration
atakora api create \
  --name ProductAPI \
  --path /api/products \
  --service-url https://products.internal.com \
  --stack packages/backend/bin/app.ts
```

**Generated Code Example**:
```typescript
// packages/backend/lib/user-api-stack.ts
import { RestApiStack, get, post, put, del } from '@atakora/lib';
import { Construct } from 'constructs';

export class UserApiStack extends RestApiStack {
  constructor(scope: Construct, id: string) {
    super(scope, id, {
      apiName: 'User API',
      path: 'users',
      serviceUrl: 'https://api.example.com',

      // Define operations
      operations: [
        get('/users')
          .operationId('listUsers')
          .summary('List all users')
          .queryParams({
            limit: { type: 'integer', default: 10 },
            offset: { type: 'integer', default: 0 }
          })
          .responses({
            200: {
              description: 'User list',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/User' }
                  }
                }
              }
            }
          })
          .build(),
      ]
    });
  }
}
```

### 2. atakora api add-operation

Adds a new operation to an existing REST API.

**Usage**:
```bash
atakora api add-operation [options]
```

**Options**:
```
-a, --api <name>            API name (required)
-m, --method <method>       HTTP method: GET|POST|PUT|DELETE|PATCH
-p, --path <path>           URL path (e.g., /users/{id})
--operation-id <id>         Operation ID
--summary <text>            Operation summary
--description <text>        Operation description
--backend <type>            Backend type: function|appservice|http
--interactive               Interactive mode
```

**Examples**:
```bash
# Add operation interactively
atakora api add-operation --api UserAPI --interactive

# Add GET operation
atakora api add-operation \
  --api UserAPI \
  --method GET \
  --path /users/{userId} \
  --operation-id getUser \
  --summary "Get user by ID"

# Add POST operation with backend
atakora api add-operation \
  --api UserAPI \
  --method POST \
  --path /users \
  --backend function \
  --summary "Create new user"
```

### 3. atakora api export

Exports OpenAPI specification from synthesized templates.

**Usage**:
```bash
atakora api export [options]
```

**Options**:
```
-a, --api <name>            API name (required)
-o, --output <file>         Output file (default: openapi.json)
-f, --format <format>       Output format: json|yaml (default: json)
--version <version>         OpenAPI version: 3.0|3.1 (default: 3.0)
--include-examples          Include example values
--validate                  Validate spec before export
```

**Examples**:
```bash
# Export to JSON
atakora api export --api UserAPI --output user-api.json

# Export to YAML with validation
atakora api export \
  --api UserAPI \
  --format yaml \
  --validate \
  --output api-spec.yaml

# Export with examples for documentation
atakora api export \
  --api ProductAPI \
  --include-examples \
  --output docs/api-spec.json
```

### 4. atakora api validate

Validates REST API definition without synthesis.

**Usage**:
```bash
atakora api validate [options]
```

**Options**:
```
-a, --api <name>            API name
--all                       Validate all APIs
--strict                    Strict validation mode
--openapi                   Validate OpenAPI compliance
```

**Examples**:
```bash
# Validate specific API
atakora api validate --api UserAPI

# Validate all APIs with strict mode
atakora api validate --all --strict

# Validate OpenAPI compliance
atakora api validate --api ProductAPI --openapi
```

### 5. atakora api import

Imports OpenAPI specification into RestApiStack code.

**Usage**:
```bash
atakora api import <file> [options]
```

**Options**:
```
-n, --name <name>           API name
-s, --stack <file>          Target stack file
--update                    Update existing API
--generate-types            Generate TypeScript types
```

**Examples**:
```bash
# Import new API
atakora api import petstore.yaml --name PetStore

# Update existing API
atakora api import updated-spec.json --name UserAPI --update

# Import with type generation
atakora api import api-spec.yaml --name ProductAPI --generate-types
```

## Enhanced Synth Command

Add REST API-specific options to existing `atakora synth`:

```bash
# Synthesize with OpenAPI export
atakora synth --export-openapi

# Synthesize specific API only
atakora synth --api UserAPI

# Synthesize with OpenAPI validation
atakora synth --validate-openapi
```

## Complete Command Tree

```
atakora
├── init                     # Initialize project
├── add                      # Add infrastructure package
├── set-default              # Set default package
├── config                   # Manage Azure config
│   ├── login
│   ├── select
│   ├── show
│   └── validate
├── synth                    # Synthesize templates
│   ├── --export-openapi     # NEW: Export OpenAPI specs
│   ├── --api <name>         # NEW: Synthesize specific API
│   └── --validate-openapi   # NEW: Validate OpenAPI
├── deploy                   # Deploy to Azure
├── diff                     # Preview changes
└── api                      # NEW: REST API commands
    ├── create               # Create new API
    ├── add-operation        # Add operation
    ├── export               # Export OpenAPI
    ├── validate             # Validate API
    └── import               # Import OpenAPI
```

## Interactive Mode UX

### API Creation Flow

```
$ atakora api create --interactive

? API Name: User Management API
? Base Path: (/api/v1) /users
? Backend Service URL: https://api.example.com
? Import from OpenAPI spec? (y/N) N
? Add first operation now? (Y/n) Y

? Operation Method: (Use arrow keys)
❯ GET
  POST
  PUT
  DELETE
  PATCH

? Operation Path: /users/{userId}
? Operation ID: (getUserById)
? Summary: Get user by ID

✓ REST API created: User Management API
✓ Operation added: getUserById

Next Steps:
  1. Review generated code: packages/backend/lib/user-management-api-stack.ts
  2. Add more operations: atakora api add-operation --api UserManagementAPI
  3. Synthesize templates: atakora synth
  4. Deploy to Azure: atakora deploy
```

### Operation Addition Flow

```
$ atakora api add-operation --api UserAPI --interactive

? Operation Method: POST
? Path: /users
? Operation ID: (createUser)
? Summary: Create a new user
? Description: Creates a new user account with the provided information

? Add request body? (Y/n) Y
? Request content type: (Use space to select)
❯◉ application/json
 ◯ application/xml
 ◯ text/plain

? Add path parameters? (y/N) N
? Add query parameters? (y/N) N

? Add responses? (Y/n) Y
? Response status code: 201
? Response description: User created successfully
? Response content type: application/json

? Add another response? (y/N) y
? Response status code: 400
? Response description: Invalid user data

? Configure backend? (Y/n) Y
? Backend type: (Use arrow keys)
❯ Azure Function
  App Service
  HTTP Endpoint

? Function App: (Use arrow keys)
❯ UserFunctionApp
  AuthFunctionApp

? Function Name: CreateUser

✓ Operation added: createUser
```

## Error Handling

### Clear Error Messages

```typescript
// Example: Missing API
if (!apiStack) {
  console.error(chalk.red(`✗ API '${options.api}' not found`));
  console.log(chalk.yellow('\nAvailable APIs:'));
  for (const api of availableApis) {
    console.log(`  • ${chalk.cyan(api.name)}`);
  }
  console.log(chalk.gray('\nUse --api <name> to specify an API'));
  process.exit(1);
}

// Example: Invalid OpenAPI spec
if (validationErrors.length > 0) {
  console.error(chalk.red('✗ OpenAPI validation failed'));
  console.log(chalk.yellow('\nValidation Errors:'));
  for (const error of validationErrors) {
    console.log(`  ${chalk.red('•')} ${error.path}: ${error.message}`);
    if (error.suggestion) {
      console.log(`    ${chalk.gray('Suggestion:')} ${error.suggestion}`);
    }
  }
  process.exit(1);
}
```

## Output Formatting

### Success Output

```
✓ REST API created: User Management API

API Details:
  Name:         User Management API
  Path:         /users
  Operations:   3
  Backend:      Azure Functions
  File:         packages/backend/lib/user-api-stack.ts

Operations:
  • GET    /users           listUsers
  • GET    /users/{id}      getUserById
  • POST   /users           createUser

Next Steps:
  1. Review generated code: packages/backend/lib/user-api-stack.ts
  2. Synthesize templates: atakora synth --export-openapi
  3. Deploy to Azure: atakora deploy
```

### Export Output

```
✓ OpenAPI spec exported

Export Details:
  API:          User Management API
  Format:       YAML
  Version:      OpenAPI 3.0.3
  Operations:   12
  Schemas:      5
  Output:       user-api-spec.yaml
  Size:         14.2 KB

Validation:
  ✓ Schema valid
  ✓ All operations valid
  ✓ No security warnings

Next Steps:
  • Generate client: openapi-generator-cli generate -i user-api-spec.yaml
  • Test in Swagger: swagger-ui-watcher user-api-spec.yaml
  • Share with team: git add user-api-spec.yaml
```

## Testing Strategy

### Unit Tests

```typescript
describe('api create command', () => {
  it('should create API with valid options', async () => {
    const result = await runCommand([
      'api', 'create',
      '--name', 'TestAPI',
      '--path', '/test',
      '--service-url', 'https://test.com'
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('REST API created');
  });

  it('should fail without required name', async () => {
    const result = await runCommand(['api', 'create']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('API name is required');
  });
});
```

### Integration Tests

```typescript
describe('api workflow', () => {
  it('should complete full API creation flow', async () => {
    // Create API
    await runCommand([
      'api', 'create',
      '--name', 'UserAPI',
      '--path', '/users'
    ]);

    // Add operation
    await runCommand([
      'api', 'add-operation',
      '--api', 'UserAPI',
      '--method', 'GET',
      '--path', '/users/{id}'
    ]);

    // Synthesize with OpenAPI export
    await runCommand(['synth', '--export-openapi']);

    // Export OpenAPI
    const result = await runCommand([
      'api', 'export',
      '--api', 'UserAPI',
      '--output', 'test-spec.json'
    ]);

    expect(fs.existsSync('test-spec.json')).toBe(true);
    const spec = JSON.parse(fs.readFileSync('test-spec.json', 'utf-8'));
    expect(spec.openapi).toBe('3.0.3');
    expect(spec.paths['/users/{id}'].get).toBeDefined();
  });
});
```

## Future Enhancements

### 1. API Testing Command
```bash
atakora api test --api UserAPI --local
```
Starts local dev server and runs API tests.

### 2. Mock Server Command
```bash
atakora api mock --api UserAPI --port 3000
```
Starts mock server from OpenAPI spec.

### 3. Documentation Generation
```bash
atakora api docs --api UserAPI --output ./docs
```
Generates API documentation from OpenAPI spec.

### 4. Client SDK Generation
```bash
atakora api generate-client \
  --api UserAPI \
  --language typescript \
  --output ./sdk
```
Generates type-safe client SDK.

### 5. Watch Mode
```bash
atakora api watch --api UserAPI
```
Watches for changes and auto-regenerates OpenAPI spec.

## References

- Existing CLI implementation: `packages/cli/src/cli.ts`
- Existing synth command: `packages/cli/src/commands/synth/index.ts`
- Commander.js documentation: https://github.com/tj/commander.js
- Ora spinner: https://github.com/sindresorhus/ora
- Chalk styling: https://github.com/chalk/chalk

---

**Document Type**: Design Specification
**Last Updated**: 2025-10-10
**Status**: Planning Complete
