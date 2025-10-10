# @atakora/cdk

Azure resource constructs for Atakora - organized by Microsoft.* namespaces.

## Overview

The `@atakora/cdk` package contains Azure resource implementations organized by Microsoft resource provider namespaces. Resources are accessible through tree-shakable, namespace-organized imports that mirror Azure's ARM structure.

## Installation

```bash
npm install @atakora/cdk
```

## Requirements

- Node.js: 14.0.0 or higher
- TypeScript: 4.5.0 or higher (for full subpath export type support)
- npm: 7.0.0 or higher
- `@atakora/lib`: Core framework (automatically installed)

## Quick Start

```typescript
import { App, ResourceGroupStack } from '@atakora/lib';
import { VirtualNetworks, NetworkSecurityGroups } from '@atakora/cdk/network';
import { StorageAccounts } from '@atakora/cdk/storage';
import { Sites, ServerFarms } from '@atakora/cdk/web';

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
```

## Available Namespaces

| Namespace | Microsoft Provider | Key Resources |
|-----------|-------------------|---------------|
| `@atakora/cdk/network` | Microsoft.Network | Virtual Networks, Subnets, NSGs, Public IPs, Private Endpoints |
| `@atakora/cdk/storage` | Microsoft.Storage | Storage Accounts |
| `@atakora/cdk/compute` | Microsoft.Compute | Virtual Machines |
| `@atakora/cdk/web` | Microsoft.Web | App Services, App Service Plans |
| `@atakora/cdk/keyvault` | Microsoft.KeyVault | Key Vaults |
| `@atakora/cdk/sql` | Microsoft.Sql | SQL Servers, Databases |
| `@atakora/cdk/insights` | Microsoft.Insights | Application Insights, Alerts |
| `@atakora/cdk/operationalinsights` | Microsoft.OperationalInsights | Log Analytics Workspaces |
| `@atakora/cdk/documentdb` | Microsoft.DocumentDB | Cosmos DB |
| `@atakora/cdk/cognitiveservices` | Microsoft.CognitiveServices | OpenAI Services |
| `@atakora/cdk/search` | Microsoft.Search | AI Search Services |
| `@atakora/cdk/apimanagement` | Microsoft.ApiManagement | API Management |
| `@atakora/cdk/resources` | Microsoft.Resources | Resource Groups |

## Documentation

For complete documentation, see:

- [CDK Package Guide](../../docs/usage/guides/cdk-package-guide.md)
- [Resource Examples](../../docs/usage/examples/)
- [API Reference](../../docs/reference/api/cdk/)
- [Migration Guide](../../docs/usage/guides/migration/cdk-migration-summary.md)
- [Architecture (ADR-003)](../../docs/design/architecture/adr-003-cdk-package-architecture.md)

## Development

### Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

Coverage requirements: 80% lines/functions/statements, 75% branches

### Quality Tools

```bash
npm run bundle:analyze  # Analyze bundle sizes
npm run circular:check  # Detect circular dependencies
npm run build          # Production build
```

## Architecture Principles

1. **Namespace Organization**: Resources grouped by Microsoft.* provider
2. **Subpath Exports**: Tree-shakable imports via package.json exports
3. **Flat Structure**: No subcategories within namespaces (until 30+ resources)
4. **Clear Boundaries**: Resources in CDK, framework in lib
5. **Type Safety**: Full TypeScript support with strict mode

See [ADR-003](../../docs/design/architecture/adr-003-cdk-package-architecture.md) for complete architectural details.

## Contributing

When contributing resources:

1. Follow the established namespace structure
2. Add comprehensive tests for new resources
3. Document public APIs with TSDoc
4. Verify bundle size impact with `npm run bundle:analyze`
5. Check for circular dependencies with `npm run circular:check`

See [Contributing Guide](../../docs/contributor/CONTRIBUTING.md) for detailed guidelines.

## License

ISC
