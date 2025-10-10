# Atakora

The Cloud Engineering Experience

Atakora is a type-safe Infrastructure as Code (IaC) framework for Azure that combines the flexibility of ARM templates with the power of TypeScript. Build, validate, and deploy Azure infrastructure with confidence using intent-based constructs and comprehensive validation.

## Quick Start

```bash
# Install the CLI
npm install -g @atakora/cli

# Initialize a new project
atakora init my-azure-project

# Deploy your infrastructure
cd my-azure-project
atakora deploy
```

## Features

- **Type-Safe Infrastructure**: Full TypeScript support with compile-time validation
- **Intent-Based Constructs**: High-level abstractions that handle Azure best practices automatically
- **ARM Template Generation**: Direct synthesis to Azure Resource Manager templates
- **Multi-Stack Management**: Organize infrastructure across subscriptions and resource groups
- **Gov Cloud Support**: First-class support for Azure Government Cloud deployments
- **Validation Framework**: Comprehensive runtime validation before deployment

## Documentation

Full documentation is available in the `docs/` directory:

- [Getting Started Guide](docs/usage/getting-started/) - Installation, first project, and basic examples
- [Usage Guides](docs/usage/guides/) - Design patterns, multi-stack architectures, and best practices
- [API Reference](docs/reference/) - Complete API documentation for all packages
- [Examples](docs/usage/examples/) - Real-world examples and code samples
- [Architecture](docs/design/architecture/) - Architecture decision records and design documents

## Packages

Atakora is organized as a monorepo with the following packages:

- `@atakora/lib` - Core framework, synthesis engine, and validation
- `@atakora/cdk` - Azure resource constructs organized by Microsoft.* namespaces
- `@atakora/cli` - Command-line interface for project management and deployment

## Example

```typescript
import { App, ResourceGroupStack } from '@atakora/lib';
import { VirtualNetworks } from '@atakora/cdk/network';
import { StorageAccounts } from '@atakora/cdk/storage';

const app = new App();
const stack = new ResourceGroupStack(app, 'MyStack', {
  resourceGroupName: 'rg-myapp-prod',
  location: 'eastus',
});

const vnet = new VirtualNetworks(stack, 'VNet', {
  virtualNetworkName: 'vnet-myapp',
  addressSpace: { addressPrefixes: ['10.0.0.0/16'] },
});

const storage = new StorageAccounts(stack, 'Storage', {
  storageAccountName: 'stmyappprod',
  sku: { name: 'Standard_LRS' },
});

app.synth();
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](docs/contributor/CONTRIBUTING.md) for details on:

- Setting up your development environment
- Code standards and quality requirements
- Testing guidelines
- Pull request process

## License

ISC

## Support

- [Documentation](docs/)
- [GitHub Issues](https://github.com/atakora/atakora/issues)
- [Architecture Decision Records](docs/design/architecture/)
