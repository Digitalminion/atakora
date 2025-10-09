# Development Setup

**Navigation**: [Docs Home](../README.md) > [Contributing](./README.md) > Development Setup

---

## Prerequisites

### Required

- **Node.js**: 18.x or later
- **npm**: 9.x or later
- **Git**: 2.x or later

### Recommended

- **VS Code**: Latest version
- **Azure CLI**: For testing deployments
- **TypeScript**: Global installation

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/Digital-Minion/atakora.git
cd atakora
```

### 2. Install Dependencies

```bash
npm install
```

This installs dependencies for all packages in the monorepo.

### 3. Build Packages

```bash
npm run build
```

Builds all packages in correct dependency order.

### 4. Run Tests

```bash
npm test
```

Ensures everything works correctly.

## IDE Configuration

### VS Code

Recommended extensions:
- ESLint
- Prettier
- TypeScript
- Azure Account

Recommended settings (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

## Development Workflow

### Building

```bash
# Build all packages
npm run build

# Build specific package
npm run build --workspace=packages/lib

# Watch mode
npm run build --watch
```

### Testing

```bash
# Run all tests
npm test

# Run specific package tests
npm test --workspace=packages/lib

# Watch mode
npm run test --watch

# Coverage
npm run test:coverage
```

### Linting

```bash
# Lint all packages
npm run lint

# Fix linting issues
npm run lint:fix
```

### Formatting

```bash
# Format all files
npm run format
```

## Monorepo Structure

```
packages/
├── lib/               # @atakora/lib
├── cdk/               # @atakora/cdk
└── cli/               # @atakora/cli
```

### Workspace Commands

```bash
# Run command in specific workspace
npm run <script> --workspace=packages/lib

# Run command in all workspaces
npm run <script> --workspaces
```

## Testing Locally

### Link Packages

```bash
# In atakora directory
npm link

# In test project
npm link @atakora/lib @atakora/cdk @atakora/cli
```

### Use Local CLI

```bash
# In atakora/packages/cli
npm link

# Now 'atakora' uses local version
atakora --version
```

## Troubleshooting

### Build Failures

```bash
# Clean and rebuild
npm run clean
npm install
npm run build
```

### Type Errors

```bash
# Rebuild TypeScript
npm run build --workspace=packages/lib
```

### Test Failures

```bash
# Run tests with verbose output
npm test -- --reporter=verbose
```

## See Also

- [Testing Guide](./testing-guide.md)
- [PR Process](./pr-process.md)
- [Contributing Guide](./README.md)

---

**Last Updated**: 2025-10-08
