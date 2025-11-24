# Reference Documentation

Complete technical reference for Atakora's APIs, schemas, CLI commands, and configuration options.

## Quick Navigation

### 📦 [API Reference](./api/README.md)
Complete API documentation for all Atakora packages and constructs:
- **[CDK APIs](./api/cdk/)** - Azure resource constructs (`@atakora/cdk`)
- **[Core APIs](./api/core/README.md)** - Core constructs and base classes (`@atakora/lib`)
- **[REST API Reference](./api/REST-API-REFERENCE.md)** - REST API patterns and synthesis

### 🔧 [CLI Reference](./cli/README.md)
Command-line interface documentation:
- **[Commands Overview](./cli/COMMANDS.md)** - Quick command reference
- **[Init](./cli/INIT.md)** - Initialize new projects
- **[Synth](./cli/SYNTH.md)** - Synthesize ARM templates
- **[Deploy](./cli/DEPLOY.md)** - Deploy to Azure
- **[Function](./cli/FUNCTION.md)** - Manage Azure Functions

### 🎯 [Backend Reference](./backend/README.md)
Schema-centric backend framework:
- **[Schema Definition](./backend/SCHEMA.md)** - Define data models
- **[Authentication](./backend/AUTHENTICATION.md)** - Security configuration
- **[Attach Pattern](./backend/ATTACH-PATTERN.md)** - Customize infrastructure
- **[Resource Provisioning](./backend/RESOURCE-PROVISIONING.md)** - What gets created

### 📋 [Schemas](./Schemas/README.md)
Schema and type system documentation:
- **[Field Types](./Schemas/FIELD-TYPES.md)** - Available field types and validators
- **[Manifest Schema](./Schemas/MANIFEST-SCHEMA.md)** - Project manifest structure

### ⚙️ [Configuration](./Configuration/README.md)
System configuration and conventions:
- **[Authentication Setup](./Configuration/AUTHENTICATION.md)** - Azure authentication
- **[Error Codes](./Configuration/ERROR-CODES.md)** - Error code reference
- **[Naming Conventions](./Configuration/NAMING-CONVENTIONS.md)** - Resource naming rules

### 📝 [Templates](./Templates/README.md)
Template generation and output:
- **[ARM Template Output](./Templates/ARM-TEMPLATE-OUTPUT.md)** - Understanding generated templates
- **[CLI Templates](./Templates/CLI-TEMPLATES.md)** - Code generation templates

### 🔌 [Integration](./Integration/README.md)
External system integration:
- **[Azure Functions Handlers](./Integration/AZURE-FUNCTIONS-HANDLERS.md)** - Function types
- **[OpenAPI Synthesis](./Integration/OPENAPI-SYNTHESIS.md)** - Generate from OpenAPI
- **[OpenAPI Type Generation](./Integration/OPENAPI-TYPE-GENERATION.md)** - TypeScript from OpenAPI

## Reference by Package

### @atakora/lib (Core Library)

Core constructs and utilities:

```typescript
import { App, Stack, Construct, Resource } from '@atakora/lib';
```

- **[App](./api/core/README.md#app)** - Application root
- **[Stack](./api/core/README.md#stack)** - Deployment unit
- **[Construct](./api/core/README.md#construct)** - Base building block
- **[Resource](./api/core/README.md#resource)** - Azure resource base

### @atakora/cdk (Resource Constructs)

Azure resource constructs organized by service:

```typescript
import { VirtualNetwork } from '@atakora/cdk/network';
import { StorageAccount } from '@atakora/cdk/storage';
import { FunctionApp } from '@atakora/cdk/web';
```

**Core Infrastructure:**
- [`/resources`](./api/cdk/RESOURCES.md) - Resource Groups
- [`/managedidentity`](./api/cdk/MANAGED-IDENTITY.md) - Managed Identities
- [`/authorization`](./api/cdk/AUTHORIZATION.md) - RBAC

**Networking:**
- [`/network`](./api/cdk/NETWORK.md) - VNet, Subnet, NSG, Private Endpoints

**Storage & Data:**
- [`/storage`](./api/cdk/STORAGE.md) - Storage Accounts, Blobs, Queues
- [`/sql`](./api/cdk/SQL.md) - Azure SQL
- [`/documentdb`](./api/cdk/DOCUMENT-DB.md) - Cosmos DB

**Compute:**
- [`/web`](./api/cdk/WEB.md) - App Services, Function Apps

**Security:**
- [`/keyvault`](./api/cdk/KEY-VAULT.md) - Key Vault

**Monitoring:**
- [`/insights`](./api/cdk/INSIGHTS.md) - Application Insights
- [`/operationalinsights`](./api/cdk/OPERATIONAL-INSIGHTS.md) - Log Analytics

**Integration:**
- [`/apimanagement`](./api/cdk/API-MANAGEMENT.md) - API Management
- [`/cognitiveservices`](./api/cdk/COGNITIVE-SERVICES.md) - AI Services

### @atakora/component (Backend Framework)

High-level backend abstractions:

```typescript
import { defineBackend, defineSchema } from '@atakora/component';
import { c, e, f, a } from '@atakora/component';
```

- **[defineBackend](./backend/README.md)** - Backend definition
- **[defineSchema](./backend/SCHEMA.md)** - Schema definition
- **[Field Types](./Schemas/FIELD-TYPES.md)** - Type system

### @atakora/cli (Command Line)

CLI commands for project management:

```bash
atakora init         # Initialize project
atakora synth        # Generate templates
atakora deploy       # Deploy to Azure
```

- **[Complete Command List](./cli/COMMANDS.md)** - All CLI commands
- **[Command Details](./cli/README.md)** - Detailed documentation

## Common Tasks

### Find API Documentation

1. **By Service**: Navigate to [`/api/cdk/`](./api/cdk/) and find your service
2. **By Package**: Check package-specific sections
3. **By Search**: Use your IDE's search in `/docs/reference/`

### Look Up Error Codes

See [Error Codes Reference](./Configuration/ERROR-CODES.md) for all error codes and solutions.

### Understand Templates

- **Generated Output**: [ARM Template Output](./Templates/ARM-TEMPLATE-OUTPUT.md)
- **Template Structure**: [Templates Overview](./Templates/README.md)

### Configure Authentication

- **Setup Guide**: [Authentication Configuration](./Configuration/AUTHENTICATION.md)
- **CLI Config**: [Config Command](./cli/CONFIG.md)

## API Stability

### Stability Markers

- ✅ **Stable** - Production ready, follows semver
- ⚠️ **Beta** - Feature complete, API may change
- 🚧 **Experimental** - Under development
- ❌ **Deprecated** - Will be removed

### Version Policy

Atakora follows [Semantic Versioning](https://semver.org/):

- **Major** (1.0.0 → 2.0.0): Breaking changes
- **Minor** (1.0.0 → 1.1.0): New features, backward compatible
- **Patch** (1.0.0 → 1.0.1): Bug fixes, backward compatible

## Quick Examples

### Basic Infrastructure

```typescript
import { App, Stack } from '@atakora/lib';
import { ResourceGroup } from '@atakora/cdk/resources';
import { StorageAccount } from '@atakora/cdk/storage';

const app = new App();
const stack = new Stack(app, 'my-stack');

const rg = new ResourceGroup(stack, 'RG', {
  location: 'eastus'
});

const storage = new StorageAccount(stack, 'Storage', {
  resourceGroup: rg
});

app.synth();
```

### Backend with Schema

```typescript
import { defineBackend, defineSchema } from '@atakora/component';
import { c, a } from '@atakora/component';

const schema = defineSchema({
  User: c.model({
    id: a.id(),
    email: a.string().email().required(),
    name: a.string().required()
  })
});

export const backend = defineBackend({
  schema,
  authentication: { provider: 'entra' },
  settings: { name: 'my-app' }
});
```

## Contributing

Help improve this reference documentation:

1. **Report Issues**: [GitHub Issues](https://github.com/atakora/atakora/issues)
2. **Fix Errors**: Submit PRs with corrections
3. **Add Examples**: Contribute working examples
4. **Suggest Topics**: Request missing documentation

See [Contributing Guide](../contributing/README.md) for details.

---

**Version**: 1.0.0 | **Last Updated**: 2025-11-24