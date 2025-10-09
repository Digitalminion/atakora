# @atakora/cdk

Azure resource constructs for Atakora - organized by Microsoft.* namespaces.

## Overview

The `@atakora/cdk` package contains Azure resource implementations organized by Microsoft resource provider namespaces. This package uses subpath exports to enable tree-shakable, namespace-organized imports that mirror Azure's ARM resource structure.

## Installation

```bash
npm install @atakora/cdk
```

## Requirements

### Minimum Versions

- **Node.js**: 14.0.0 or higher
- **npm**: 7.0.0 or higher
- **TypeScript**: 4.5.0 or higher (for full subpath export type support)

### Dependencies

- `@atakora/lib`: Core framework (automatically installed as dependency)

## Usage

Import Azure resources from their respective namespaces:

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

// Create resources
const vnet = new VirtualNetworks(stack, 'VNet', {
  virtualNetworkName: 'vnet-myapp',
  addressSpace: { addressPrefixes: ['10.0.0.0/16'] },
});
```

## Available Namespaces

The following namespaces are available for import:

| Namespace | Microsoft Provider | Resources |
|-----------|-------------------|-----------|
| `@atakora/cdk/network` | Microsoft.Network | Virtual Networks, Subnets, NSGs, etc. |
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

## Package Structure

```
packages/cdk/
├── network/             # Microsoft.Network resources
│   └── index.ts
├── storage/             # Microsoft.Storage resources
│   └── index.ts
├── web/                 # Microsoft.Web resources
│   └── index.ts
├── keyvault/            # Microsoft.KeyVault resources
│   └── index.ts
├── sql/                 # Microsoft.Sql resources
│   └── index.ts
├── insights/            # Microsoft.Insights resources
│   └── index.ts
├── operationalinsights/ # Microsoft.OperationalInsights resources
│   └── index.ts
├── documentdb/          # Microsoft.DocumentDB resources
│   └── index.ts
├── cognitiveservices/   # Microsoft.CognitiveServices resources
│   └── index.ts
├── search/              # Microsoft.Search resources
│   └── index.ts
├── apimanagement/       # Microsoft.ApiManagement resources
│   └── index.ts
├── compute/             # Microsoft.Compute resources
│   └── index.ts
└── resources/           # Microsoft.Resources
    └── index.ts
```

## Week 0 Tooling Infrastructure

The CDK package includes comprehensive quality tooling for development and testing:

### Bundle Size Monitoring

Monitor and validate bundle sizes to ensure tree-shaking efficiency:

```bash
npm run bundle:analyze
```

**Bundle Size Targets:**
- Single namespace usage: <100KB minified
- Tree-shake efficiency: >70% code elimination
- Full CDK bundle: <500KB minified

### Circular Dependency Detection

Detect circular dependencies that can impact tree-shaking:

```bash
npm run circular:check
```

The package enforces a circular dependency prevention strategy:
1. Use dependency injection for cross-namespace references
2. Define shared interfaces in `@atakora/lib`
3. Use lazy resolution via ARM expressions
4. Automated detection in CI pipeline

### Testing Infrastructure

Comprehensive test suite with coverage requirements:

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

**Coverage Requirements:**
- Lines: 80%
- Functions: 80%
- Branches: 75%
- Statements: 80%

### Build Performance

Optimized build configuration for development efficiency:

```bash
npm run build  # Production build
```

**Build Performance Targets:**
- Cold build: <30s for full CDK
- Incremental build: <5s for single file change
- Namespace isolation verified via build cache analysis

## Development Workflow

### Adding New Resources

When adding new Azure resources to a namespace:

1. Create resource file in appropriate namespace directory
2. Export resource class and props from namespace `index.ts`
3. Add tests in `__tests__` directory
4. Verify bundle size impact
5. Check for circular dependencies
6. Ensure coverage thresholds are met

### Cross-Namespace References

When resources need to reference resources from other namespaces:

1. **Preferred**: Use dependency injection via constructor props
2. **Alternative**: Define shared interfaces in `@atakora/lib`
3. **Last Resort**: Use ARM expressions for lazy resolution

Example:
```typescript
// Good: Dependency injection
class PrivateEndpoint {
  constructor(scope: Construct, id: string, props: {
    subnetId: string;  // Accept resource ID, not direct reference
  }) { }
}

// Usage
const endpoint = new PrivateEndpoint(stack, 'PE', {
  subnetId: subnet.resourceId,  // Pass ID, not object
});
```

## TypeScript Configuration

The package uses composite project references for optimal build performance:

- Extends `../../tsconfig.base.json`
- Outputs to `./dist`
- References `@atakora/lib` for core framework
- Enables declaration maps for debugging
- Configured for tree-shaking optimization

## IDE Support

### VSCode

The package exports configuration enables full IntelliSense support:

1. TypeScript will suggest available namespaces
2. Autocomplete works for all exported resources
3. Type checking validates import paths
4. Go-to-definition works across packages

### Import Path Validation

ESLint rules enforce correct import patterns:

```typescript
// Good: Import from namespace
import { VirtualNetworks } from '@atakora/cdk/network';

// Bad: Direct file imports
import { VirtualNetworks } from '@atakora/cdk/network/virtual-network';
```

## Migration from @atakora/lib

If migrating from the legacy `@atakora/lib` resource exports:

1. Update imports to use new namespace paths
2. Use deprecated re-exports for gradual migration
3. Run automated codemod for bulk updates (coming in Week 0)
4. Update to new ARM-style plural class names

See [Migration Guide](../../docs/guides/cdk-migration-guide.md) for details.

## Architecture

This package follows the architecture defined in [ADR-003: CDK Package Architecture](../../docs/design/architecture/adr-003-cdk-package-architecture.md).

Key architectural principles:

1. **Namespace Organization**: Resources grouped by Microsoft.* provider
2. **Subpath Exports**: Tree-shakable imports via package.json exports
3. **Flat Structure**: No subcategories within namespaces (until 30+ resources)
4. **Clear Boundaries**: Resources in CDK, framework in lib
5. **Type Safety**: Full TypeScript support with strict mode

## Quality Standards

All code in this package must meet the following standards:

### Type Safety
- Strict TypeScript mode enabled
- No `any` types without explicit justification
- Comprehensive JSDoc/TSDoc for public APIs
- Proper type exports in package.json

### Testing
- Minimum 80% code coverage
- Unit tests for all public APIs
- Integration tests for synthesis pipeline
- Bundle size validation tests

### Code Quality
- ESLint with no warnings
- Prettier formatting enforced
- Consistent naming conventions
- Clear error messages with actionable guidance

## Contributing

When contributing to this package:

1. Follow the established namespace structure
2. Add comprehensive tests for new resources
3. Document public APIs with TSDoc
4. Verify bundle size impact
5. Check for circular dependencies
6. Ensure build performance isn't degraded

## Support

For issues, questions, or contributions:

- GitHub Issues: [atakora/issues](https://github.com/atakora/atakora/issues)
- Documentation: [docs/](../../docs/)
- Architecture Decisions: [docs/design/architecture/](../../docs/design/architecture/)

## License

ISC
